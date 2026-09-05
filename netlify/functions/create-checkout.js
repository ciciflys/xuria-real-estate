// POST /.netlify/functions/create-checkout
// Body: { checkin:"YYYY-MM-DD", checkout:"YYYY-MM-DD", guests:"2" }
// Validates the request, RE-CHECKS availability server-side, computes the
// authoritative price (never trust the client), creates a Stripe Checkout
// session, and returns { url } for the browser to redirect to.
//
// Requires env var STRIPE_SECRET_KEY. Until it is set the function returns 503
// and the page falls back to a WhatsApp enquiry.

const Stripe = require('stripe');
const ical = require('node-ical');
const { getStore } = require('@netlify/blobs');

// Pricing — keep in sync with the display values in candavy.html.
// OWNER: adjust here, or override with Netlify env vars.
const NIGHTLY_RATE = Number(process.env.CANDAVY_NIGHTLY_RATE || 2400); // €/night
const CLEANING_FEE = Number(process.env.CANDAVY_CLEANING_FEE || 300);  // € flat (from the listing)
const MIN_NIGHTS   = Number(process.env.CANDAVY_MIN_NIGHTS   || 7);    // Saturday-to-Saturday = 7-night min
const CURRENCY     = 'eur';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { message: 'Method not allowed' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { message: 'Online booking is not yet configured.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return json(400, { message: 'Bad request' }); }

  const { checkin, checkout, guests } = body;
  if (!isDate(checkin) || !isDate(checkout)) return json(400, { message: 'Invalid dates' });

  const nights = nightsBetween(checkin, checkout);
  if (nights < MIN_NIGHTS) return json(400, { message: `Minimum ${MIN_NIGHTS} nights` });

  // Server-side availability re-check
  if (await hasConflict(checkin, checkout)) {
    return json(409, { message: 'Those dates are no longer available.' });
  }

  const amountCents = (nights * NIGHTLY_RATE + CLEANING_FEE) * 100;

  const stripe = Stripe(key);
  const origin = event.headers.origin ||
    ('https://' + (event.headers.host || 'xuriare.com'));

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: amountCents,
          product_data: {
            name: 'Can Davy — ' + nights + ' nights',
            description: checkin + ' → ' + checkout + ' · ' + (guests || '?') + ' guests'
          }
        }
      }],
      metadata: { checkin, checkout, guests: String(guests || '') },
      success_url: origin + '/candavy?booked=1',
      cancel_url:  origin + '/candavy#book'
    });
    return json(200, { url: session.url });
  } catch (e) {
    return json(500, { message: 'Could not start checkout. Please try again.' });
  }
};

async function hasConflict(checkin, checkout) {
  const start = new Date(checkin + 'T00:00:00Z');
  const end   = new Date(checkout + 'T00:00:00Z');
  const ranges = [];

  // direct bookings
  try {
    const store = getStore('candavy-bookings');
    const { blobs } = await store.list();
    for (const b of blobs) {
      const r = await store.get(b.key, { type: 'json' });
      if (r && r.checkin && r.checkout) {
        ranges.push([new Date(r.checkin + 'T00:00:00Z'), new Date(r.checkout + 'T00:00:00Z')]);
      }
    }
  } catch (e) {}

  // airbnb ical
  const url = process.env.AIRBNB_ICAL_URL;
  if (url) {
    try {
      const data = await ical.async.fromURL(url);
      for (const k in data) {
        const ev = data[k];
        if (ev && ev.type === 'VEVENT' && ev.start && ev.end) {
          ranges.push([new Date(ev.start), new Date(ev.end)]);
        }
      }
    } catch (e) {}
  }

  // overlap test ([start,end) vs [s,e))
  return ranges.some(function (r) { return start < r[1] && end > r[0]; });
}

function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function nightsBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}
function json(code, obj) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
