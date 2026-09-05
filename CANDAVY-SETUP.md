# Can Davy — Direct Booking Setup

The `/candavy` page and its serverless functions are built. This is the checklist
to take it from "scaffold" to "taking real payments." Nothing here needs code —
it's account setup + pasting a few keys into Netlify.

---

## 1. Property content (do this anytime — no accounts needed)

Open `candavy.html` and replace everything marked `OWNER:`:

- **Hero photo** → drop the best shot at `images/candavy/hero.jpg`
- **Gallery photos** → `images/candavy/1.jpg` … `5.jpg` (replace the placeholder cells)
- **Description** (the "Your home in Ibiza" paragraph)
- **Facts** (guests, bedrooms, bathrooms, min stay, area) — the `.facts` list
- **Amenities** — the `.amenities` list
- **Nightly rate / cleaning fee / min nights** — the `NIGHTLY_RATE`, `CLEANING_FEE`,
  `MIN_NIGHTS` constants near the bottom of `candavy.html`.
  ⚠️ These same numbers must match the function pricing in step 3 (or set them as
  env vars so there's one source of truth).

Send me the photos + details and I'll wire them in for you.

---

## 2. Stripe account (required to take payment)

1. Create a free account at **https://stripe.com** and activate it (they'll ask for
   your business/payout bank details — that's between you and Stripe; I never see it).
2. In the Stripe Dashboard → **Developers → API keys**, copy:
   - **Secret key** (`sk_live_…`) — server side, keep private
   - (the publishable key isn't needed — Stripe hosts the checkout page)
3. In **Netlify → your site → Site configuration → Environment variables**, add:
   | Key | Value |
   |-----|-------|
   | `STRIPE_SECRET_KEY` | your `sk_live_…` |
   | `CANDAVY_NIGHTLY_RATE` | e.g. `200` |
   | `CANDAVY_CLEANING_FEE` | e.g. `60` |
   | `CANDAVY_MIN_NIGHTS` | e.g. `3` |
4. Redeploy (any push, or "Trigger deploy" in Netlify). The **Reserve & Pay** button
   now creates a real Stripe checkout. Until this is done it gracefully falls back to
   a WhatsApp enquiry — the page is safe to be live in the meantime.

## 3. Stripe webhook (so paid dates get blocked automatically)

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://xuriare.com/.netlify/functions/webhook`
3. Event to send: **`checkout.session.completed`**
4. After creating it, copy the **Signing secret** (`whsec_…`)
5. Add it to Netlify env vars as `STRIPE_WEBHOOK_SECRET`, redeploy.

Now: guest pays → the booking is recorded → those dates are blocked on the site.

---

## 4. Airbnb calendar sync (so you never double-book)

This is two-way iCal sync. **Both directions matter.**

**A. Airbnb → your site** (so Airbnb-booked dates show as unavailable here)
1. Airbnb → your listing → **Availability → Sync calendars → Export calendar**
2. Copy the iCal URL Airbnb gives you
3. Add it to Netlify env vars as `AIRBNB_ICAL_URL`, redeploy.

**B. Your site → Airbnb** (so direct bookings block the dates on Airbnb)
1. Airbnb → your listing → **Availability → Sync calendars → Import calendar**
2. Paste: `https://xuriare.com/candavy/calendar.ics`

⚠️ iCal syncs roughly every few hours, **not instantly** — this is the
double-booking risk you accepted. For a single listing with modest volume it's
usually fine, but if two bookings land in the same sync window on different
channels for overlapping dates, one will need to be sorted out manually.

---

## What's already handled in code

- `candavy.html` — booking page with a real date-range picker (flatpickr) that
  greys out unavailable dates, live price breakdown, and a Reserve button.
- `netlify/functions/availability.js` — merges direct bookings + Airbnb iCal → blocked dates.
- `netlify/functions/create-checkout.js` — validates, re-checks availability, computes the
  authoritative price server-side, creates the Stripe Checkout session.
- `netlify/functions/webhook.js` — records paid bookings to Netlify Blobs.
- `netlify/functions/ical.js` — publishes `/candavy/calendar.ics` for Airbnb to import.
- `netlify.toml` / `package.json` — Netlify functions config + dependencies.

## Testing safely first

Use Stripe **Test mode** keys (`sk_test_…`) and a test webhook while you try it end
to end — card `4242 4242 4242 4242`, any future expiry/CVC. Swap to live keys when
you're happy. Netlify's free tier covers the function usage for this comfortably.
