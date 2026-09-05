// GET /.netlify/functions/availability
// Returns { windows: [...], booked: [ {from,to}, ... ] } for the date picker.
//   windows — the OPEN availability windows (whitelist) with their rules
//   booked  — date ranges already taken (direct bookings + Airbnb iCal), which
//             block dates *inside* an open window
// Fails open: if a booked source is unavailable it's skipped.

const ical = require('node-ical');
const { getStore } = require('@netlify/blobs');
const { OPEN_WINDOWS } = require('./lib/rules');

exports.handler = async () => {
  const booked = [];

  // 1) Direct bookings
  try {
    const store = getStore('candavy-bookings');
    const { blobs } = await store.list();
    for (const b of blobs) {
      const rec = await store.get(b.key, { type: 'json' });
      if (rec && rec.checkin && rec.checkout) {
        booked.push({ from: rec.checkin, to: minusOneDay(rec.checkout) });
      }
    }
  } catch (e) { /* store empty / not configured */ }

  // 2) Airbnb iCal
  const url = process.env.AIRBNB_ICAL_URL;
  if (url) {
    try {
      const data = await ical.async.fromURL(url);
      for (const k in data) {
        const ev = data[k];
        if (ev && ev.type === 'VEVENT' && ev.start && ev.end) {
          booked.push({ from: ymd(ev.start), to: ymd(addDays(ev.end, -1)) });
        }
      }
    } catch (e) { /* fail open */ }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    body: JSON.stringify({ windows: OPEN_WINDOWS, booked })
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
