// GET /.netlify/functions/availability
// Returns { blocked: [ {from:"YYYY-MM-DD", to:"YYYY-MM-DD"}, ... ] } for the
// front-end date picker. Blocked dates come from two sources:
//   1. Direct bookings we've taken (stored in Netlify Blobs)
//   2. The Airbnb iCal feed (dates already booked on the platform) — env AIRBNB_ICAL_URL
// Fails open: if a source is unavailable it's skipped, so the picker still works.

const ical = require('node-ical');
const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  const blocked = [];

  // 1) Direct bookings
  try {
    const store = getStore('candavy-bookings');
    const { blobs } = await store.list();
    for (const b of blobs) {
      const rec = await store.get(b.key, { type: 'json' });
      if (rec && rec.checkin && rec.checkout) {
        blocked.push({ from: rec.checkin, to: minusOneDay(rec.checkout) });
      }
    }
  } catch (e) { /* store empty / not configured — ignore */ }

  // 2) Airbnb iCal
  const url = process.env.AIRBNB_ICAL_URL;
  if (url) {
    try {
      const data = await ical.async.fromURL(url);
      for (const k in data) {
        const ev = data[k];
        if (ev && ev.type === 'VEVENT' && ev.start && ev.end) {
          blocked.push({ from: ymd(ev.start), to: ymd(addDays(ev.end, -1)) });
        }
      }
    } catch (e) { /* fetch/parse failed — fail open */ }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    body: JSON.stringify({ blocked })
  };
};

function ymd(d) {
  const x = new Date(d);
  return x.getUTCFullYear() + '-' +
    String(x.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(x.getUTCDate()).padStart(2, '0');
}
function addDays(d, n) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
function minusOneDay(str) { return ymd(addDays(new Date(str + 'T00:00:00Z'), -1)); }
