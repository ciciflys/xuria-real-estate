// POST /.netlify/functions/webhook  (Stripe webhook endpoint)
// On a completed checkout, records the booking in Netlify Blobs so the dates
// are blocked everywhere (availability check + the iCal feed Airbnb imports).
//
// Requires env vars STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.
// In the Stripe dashboard add a webhook to https://xuriare.com/.netlify/functions/webhook
// for the event "checkout.session.completed" and copy its signing secret into
// STRIPE_WEBHOOK_SECRET (see CANDAVY-SETUP.md).

const Stripe = require('stripe');
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const key   = process.env.STRIPE_SECRET_KEY;
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whsec) return { statusCode: 503, body: 'not configured' };

  const stripe = Stripe(key);
  const sig = event.headers['stripe-signature'];
  let evt;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    evt = stripe.webhooks.constructEvent(raw, sig, whsec);
  } catch (e) {
    return { statusCode: 400, body: 'Webhook signature verification failed' };
  }

  if (evt.type === 'checkout.session.completed') {
    const s = evt.data.object;
    const m = s.metadata || {};
    if (m.checkin && m.checkout) {
      try {
        const store = getStore('candavy-bookings');
        await store.setJSON(s.id, {
          checkin:  m.checkin,
          checkout: m.checkout,
          guests:   m.guests || '',
          name:  (s.customer_details && s.customer_details.name)  || '',
          email: (s.customer_details && s.customer_details.email) || '',
          amount: s.amount_total,
          created: Date.now()
        });
      } catch (e) {
        // If the store write fails, return 500 so Stripe retries the webhook.
        return { statusCode: 500, body: 'store error' };
      }
    }
  }

  return { statusCode: 200, body: 'ok' };
};
