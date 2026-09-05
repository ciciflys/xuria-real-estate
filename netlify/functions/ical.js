// GET /candavy/calendar.ics  (mapped to /.netlify/functions/ical by netlify.toml)
// Publishes the direct bookings as an iCal feed. Import this URL into Airbnb
// (Listing → Availability → Sync calendars → Import calendar) so that a direct
// booking automatically blocks those dates on Airbnb too.

const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  let events = '';
  try {
    const store = getStore('candavy-bookings');
    const { blobs } = await store.list();
    for (const b of blobs) {
      const r = await store.get(b.key, { type: 'json' });
      if (r && r.checkin && r.checkout) {
        events += [
          'BEGIN:VEVENT',
          'UID:' + b.key + '@candavy',
          'DTSTAMP:' + stamp(),
          'DTSTART;VALUE=DATE:' + r.checkin.replace(/-/g, ''),
          'DTEND;VALUE=DATE:' + r.checkout.replace(/-/g, ''),
          'SUMMARY:Booked — direct',
          'END:VEVENT'
        ].join('\r\n') + '\r\n';
      }
    }
  } catch (e) { /* store empty / not configured */ }

  const cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Can Davy//Direct Bookings//EN',
    'CALSCALE:GREGORIAN'
  ].join('\r\n') + '\r\n' + events + 'END:VCALENDAR\r\n';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    },
    body: cal
  };
};

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
