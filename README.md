# Dr. Amogh G — Website + Patient Insights Admin (v5)

A static site (plain HTML/CSS/JS, no build step) plus a small admin app for managing
Patient Insights, backed by a real, already-connected Supabase project.

## Supabase — already set up, live, and connected

A Supabase project (`dr-amogh-website`, region `ap-south-1`) has already been created
for this site, with the schema applied and the two existing patient stories seeded and
published. `js/supabase-config.js` already has its real URL and anon key in it — there
is nothing left to configure there.

**One manual step remains — creating Dr. Amogh's login:**
Supabase dashboard → Authentication → Users → **Add user** → enter his email and a
password. That's the only account this site needs. While there, also turn **off**
"Enable email signups" under Authentication → Providers, so no one else can self-register.

The anon key in the config file is safe to have in frontend code by design — it can only
do what the Row Level Security policies in `supabase/schema.sql` allow (public visitors
can read published stories only; a logged-in user has full access). No service-role key
is anywhere in this project.

## Deploying the website (Cloudflare)

This part still needs you to do it manually — pushing code to GitHub and connecting a
Cloudflare Pages project aren't things that can be done on your behalf here.

1. **GitHub:**
   ```bash
   git init && git add . && git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. **Cloudflare Pages:** Workers & Pages → Create → Pages → Connect to Git → pick the
   repo. Framework preset: **None**. Build command: **empty**. Build output directory: **/**.
   Save and Deploy — you get a free `*.pages.dev` link immediately, redeployed on every push.
3. **Custom domain later:** Pages project → Custom domains → Set up a custom domain.

## What's inside

```
index.html, stories.html        Public site (unchanged design/animations)
css/, js/                       Public site styles/scripts
js/supabase-config.js           Supabase connection (already filled in)
js/patient-insights-db.js       Shared data-access layer (public reads + admin writes)
supabase/schema.sql             The schema/RLS/seed that has already been applied

admin/login.html                Doctor sign-in
admin/index.html                Dashboard: search, filter, publish/unpublish/archive/delete
admin/editor.html               Guided 6-step Patient Insight editor + live preview
admin/css/admin.css             Admin styling (built on the public site's own tokens)
admin/js/                       admin-auth.js, dashboard.js, editor.js
```

## The admin app

Open `admin/login.html`, sign in with the account you create in Supabase, and you land
on the dashboard: published/draft/archived counts, search, filters, and every story as a
row with Edit / Preview / Duplicate / Publish-Unpublish / Archive / Delete.

**"+ Add Patient Insight"** opens a 6-step guided editor — the doctor never sees a raw
form:
1. **The story** — title, topic, short label, introduction (every field has real
   placeholder guidance, not "enter text here")
2. **The patient's words** — a conversation builder with topic-aware suggested
   questions (click to add), or "+ Add my own question"; reorder with up/down arrows,
   edit or delete freely
3. **You might relate to this** — a repeatable list of short, recognizable points
4. **What you can do** — practical next steps, same repeatable-list pattern
5. **When to seek urgent care** — kept visually and structurally separate; can't be
   published without an explicit "I've reviewed this" checkbox if filled in
6. **Privacy & publishing** — five required confirmations (consent, identifiers
   removed, privacy reviewed, no identifying details, medical accuracy reviewed) plus a
   live "before you publish" checklist. Publish is disabled until everything required is
   checked.

Draft saves happen automatically a couple of seconds after typing stops (small
"Saving…" / "Saved" indicator in the top bar), and there's a "Save draft" button for an
explicit save any time. Preview renders the story exactly as the public page will show
it, with no admin chrome.

The public site (`stories.html`) reads only **published** stories from Supabase and
merges them in alongside the two existing ones — drafts and archived stories are never
exposed. If Supabase is ever briefly unreachable, the site falls back to showing just
the original two stories rather than breaking.

## Database

One table, `patient_insights` (see `supabase/schema.sql` for the full definition):
title/intro/topic, a `dialogue` jsonb array of `{q, a}` pairs (supports any number of
questions, in order), `relate_points` / `action_points` as string arrays, `urgent` text,
the five privacy/review booleans, `status` (draft/published/archived), and timestamps.
Row Level Security: anyone can read published rows; only a logged-in user can read/write
everything. This is a single-doctor site, so any authenticated account is treated as the
admin.

## Editing content directly (without the admin, if ever needed)

- **Colors / fonts:** CSS variables at the top of `css/main.css`, plus the hero-specific
  `--hero-*` variables at the top of `css/hero.css`.
- **Doctor details / phone / hospital:** written directly into `index.html` /
  `stories.html` (search for `Arogya Hospital` or `7406886226`).

## Before showing this to a real patient

Only the two seeded stories (fatigue, headache) are real content. Anything created via
the admin must be genuinely anonymized and shared with the patient's consent — the
privacy checklist enforces the confirmations, not the actual truth of them. The urgent-
care checkbox exists for the same reason: Dr. Amogh should read and approve that text
himself before it goes live.

---

## v6 update — Areas of Care, Online Consultation, and booking system

### 1. What was changed
- **Hero hooks rewritten**: "Sometimes, someone else's story sounds familiar." / "You
  read it and think, 'I've felt that too.'" (no third hook added, no "Explore Patient
  Insights" hero CTA).
- **Mobile hero coat scale increased** (46vh &rarr; 58vh) so the rotation reads clearly
  on phones, with hook/identity positions adjusted to still avoid overlap.
- **Floating WhatsApp/Call button added** — hidden until the hero has fully scrolled
  past (reuses the existing nav dark/light IntersectionObserver, no new scroll listener).
- **"What brings you here?"** (4 generic cards) **replaced** with an **Areas of Care**
  accordion: 5 categories, patient-friendly description visible by default, medical
  terminology only on expand, explicit "not the complete list" footnote. Category 02
  links to both existing Patient Insight stories (fatigue, headache) since both fit.
- **About/General Medicine copy** adjusted to emphasize breadth, per the brief's wording.
- **Patient Insights section headline changed** so it develops the hero's idea rather
  than repeating the exact sentence, with a short "every patient comes with a different
  story" transition line.
- **New Online Consultation section**: fixed 15 min / &#8377;1,200, non-emergency notice,
  and a 4-step booking widget (date &rarr; slot &rarr; details &rarr; review &rarr; submit).
- **New admin pages**: Appointments (search/filter, status + payment-status controls)
  and Consultation Availability (weekly schedule editor, ad-hoc date/time blocking with
  reopen). Existing Patient Insights admin unchanged, now sharing a small tabs bar to
  switch between the three sections.
- Nav/footer links updated to include Care and Consult.

### 2. What was deliberately preserved
- The entire Patient Insights system: both existing stories (exact content), the
  editor's 6 steps, autosave/draft/preview/publish/unpublish/archive/duplicate/delete,
  privacy checklist, and its Supabase table/RLS — **nothing in `patient_insights` was
  touched**.
- Hero coat rotation, timing, and desktop behavior.
- Visual language (fonts, colors, spacing, card/border style) — no new component styles
  outside the established tokens.
- Final CTA copy ("Your health deserves to be understood.").

### 3. Database/schema changes
Three new tables plus one view, additive only (see `supabase/schema.sql`):
- `availability_weekly` — one row per weekday, seeded with the 10am&ndash;7pm default,
  fully editable from the admin.
- `availability_blocks` — ad-hoc date/time blocks (whole day if both times are blank).
- `appointments` — patient name/phone/optional email, date, time, duration (default 15),
  fee (default 1200), `status` (requested/confirmed/completed/cancelled), `payment_status`
  (pending/paid). Duration and fee are columns, not hard-coded, so they can change later
  without a migration.
- `taken_slots` — a view exposing only date+time of non-cancelled appointments (zero
  patient details), so the public page can compute free slots safely.
- **Double-booking prevention is a database constraint**, not just a frontend check: a
  partial unique index on `(appointment_date, start_time) where status <> 'cancelled'`.
  Verified directly against the live database with a concurrent-insert test — the second
  insert correctly fails with a `23505` error, which the booking widget catches and turns
  into "that time was just taken, please choose another."

### 4. Security/RLS changes
- `availability_weekly` / `availability_blocks`: public read, authenticated-only write.
- `appointments`: **public can only INSERT** (create a request) — never read, update, or
  delete. Only an authenticated session can see or manage appointment records, so a
  patient can never see anyone else's (or even their own, after submitting) booking
  details through the database.
- `taken_slots` view created with `security_invoker = true` so it respects the querying
  user's own RLS rather than bypassing it (caught and fixed via Supabase's own security
  advisor).
- No service-role key anywhere in the project; the anon key in `js/supabase-config.js`
  is safe to expose by design and is constrained entirely by the policies above.
- One account-level item outside this project's code: Supabase's "leaked password
  protection" is off by default on new projects — worth turning on under Authentication
  settings, but that's a dashboard toggle, not something in this repo.

### 5. Testing performed
- Public site at 360/390/430px: zero horizontal overflow on hero, Areas of Care
  (collapsed and with an item expanded), and the Online Consultation section.
- Hero hook positioning re-checked against the larger mobile coat across the rotation —
  no overlap.
- Floating contact control confirmed hidden at the top of the page and shown once
  scrolled past the hero, at all three widths.
- Admin (dashboard, editor, Appointments, Availability) at 360/390/430px: zero overflow.
- Full booking flow tested end-to-end (via a mocked Supabase client, since this
  environment can't reach the live network): set Monday to closed in Availability &rarr;
  confirmed the public page shows zero slots for the next Monday and a full day of slots
  for Tuesday &rarr; completed a booking &rarr; confirmed the success screen says
  "submitted" and never "confirmed" &rarr; confirmed the WhatsApp link is built from the
  actual submitted date/time/name/phone &rarr; confirmed the booking appears correctly in
  the admin Appointments list.
- Patient Insights regression check: both existing stories still load on the public
  site; a full create-through-publish pass in the admin editor still works exactly as
  before.
- Full JS syntax check, HTML tag-balance check, CSS brace-balance check, and an asset/id
  cross-reference check across every file touched.

### 6. Items that still need Dr. Amogh's approval
- **Areas of Care scope**: the five categories and their expanded examples are placeholder
  content from the brief, not verified against his actual practice. He should review and
  edit (via a future content pass, or directly in `index.html` for now — this isn't yet
  wired to the admin) before this is treated as accurate.
- **Urgent-care / emergency boundary wording** on the Online Consultation section.
- **The default weekly schedule (10am&ndash;7pm every day)** — confirm this matches his
  actual availability before real patients start booking; it's fully editable in
  Consultation Availability whenever he's ready.
- **WhatsApp number used for both the floating button and booking handoff** is the one
  already on the site (7406886226) — confirm this is the correct number to receive
  consultation requests on.

---

## v6.1 — corrections

- **Booking "something went wrong" fixed.** The booking was being saved, but the code then asked the
  database to send the new row back, and patients (correctly) aren't allowed to read appointment rows,
  so it looked like a failure and WhatsApp never opened. It now just checks for an error. The
  double-booking check still works (a taken slot still returns "that time was just taken").
- **Hero animation rebuilt for smoothness:** 89 frames (was 60), each cropped tight and locked to the
  same position/size (the video wobbled ~8px and ~2% in size), drawn on a canvas with easing so phone
  scroll bursts glide. Stable mobile viewport height (`svh`).
- **Phone coat size** now follows the reference screenshot (~54% of screen height). Root cause of the
  earlier "still small": the old frames were widescreen, so phones were limited by screen *width* and
  the height settings did nothing. Frames are now portrait crops. The coat lifts and shrinks slightly
  when the name appears so they never overlap.
- **Third hook added** ("Good care starts with understanding what you're going through."), and all
  three hooks use an accent colour + larger size on the key phrase.
- **Fee/duration** no longer look like buttons; **WhatsApp and Call** buttons are identical in size, the
  WhatsApp button has its logo and opens with a short pre-typed message.
- **Appointments admin:** grouped under date sub-headings (today/upcoming first, then earlier), large
  time on each booking, labelled "Update status" and "Payment" controls, blank space removed.
