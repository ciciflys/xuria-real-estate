// Manually-managed availability for Can Davy — a whitelist of OPEN windows.
// Everything NOT inside one of these windows is unavailable. Booked dates
// (Airbnb iCal + paid direct bookings) further block dates inside a window.
//
// Each window:
//   from, to      inclusive date range that is selectable (to = last checkout day), "YYYY-MM-DD"
//   minNights     minimum nights for a stay in this window
//   saturdayOnly  true  → check-in AND check-out must both be Saturdays (weekly, Sat-to-Sat)
//                 false → any check-in day
//
// Both availability.js (the date picker) and create-checkout.js (server-side
// enforcement at payment) read this list — single source of truth.

module.exports.OPEN_WINDOWS = [
  // 2026 — only two short windows open; flexible check-in, 4-night minimum.
  { from: '2026-09-21', to: '2026-09-28', minNights: 4, saturdayOnly: false }, // Sep 21–28
  { from: '2026-10-25', to: '2026-11-01', minNights: 4, saturdayOnly: false }, // last week of October

  // 2027 — last two weeks of July + all of August. Saturday-to-Saturday, 7-night minimum.
  { from: '2027-07-17', to: '2027-09-04', minNights: 7, saturdayOnly: true }
];
