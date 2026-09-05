// POST /.netlify/functions/create-checkout
// Body: { checkin:"YYYY-MM-DD", checkout:"YYYY-MM-DD", guests:"6" }
// Validates the request against the OPEN_WINDOWS rules and booked dates,
// computes the authoritative price server-side (never trust the client),
// creates a Stripe Checkout session, and returns { url }.
//
// Requires env var STRIPE_SECRET_KEY. Until set the function returns 503 and
// the page falls back to a WhatsApp enquiry.

const Stripe = require('stripe');
const ical = require('node-ical');
const { getStore } = require('@netlify/blobs');
const { OPEN_WINDOWS } = require('./lib/rules');

// Pricing — keep in sync with the display values in candavy.html.
const NIGHTLY_RATE = Number(process.env.CANDAVY_NIGHTLY_RATE || 2400); // €/night
const CLEANING_FEE = Number(process.env.CANDAVY_CLEANING_FEE || 300);  // € flat
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
  if (nights < 1) return json(400, { message: 'Invalid dates' });

  // Must fall inside a single open window and satisfy its rules.
  const rule = validateWindow(checkin, checkout, nights);
  if (rule.error) return json(400, { message: rule.error });

  // Not already booked
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

// Returns { error } if the stay breaks the window rules, else {}.
function validateWindow(checkin, checkout, nights) {
  const w = OPEN_WINDOWS.find(function (win) {
    return checkin >= win.from && checkout <= win.to;
  });
  if (!w) return { error: 'Those dates are not available.' };
  if (nights < w.minNights) return { error: 'Minimum ' + w.minNights + ' nights for these dates.' };
  if (w.saturdayOnly) {
    if (dow(checkin) !== 6 || dow(checkout) !== 6) {
      return { error: 'These dates are Saturday-to-Saturday only.' };
    }
  }
  return {};
}

async function hasConflict(checkin, checkout) {
  const start = new Date(checkin + 'T00:00:00Z');
  const end   = new Date(checkout + 'T00:00:00Z');
  const ranges = [];

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

  return ranges.some(function (r) { return start < r[1] && end > r[0]; });
}

function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function nightsBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}
function dow(s) { return new Date(s + 'T00:00:00Z').getUTCDay(); }
function json(code, obj) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
