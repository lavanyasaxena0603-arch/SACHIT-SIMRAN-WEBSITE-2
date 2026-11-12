# Simran & Sachit — Royal Wedding Invitation

An animated, scroll-driven wedding invitation built as a single-page React app.

The guest opens an invitation card, watches the palace gates swing open, is carried
through the courtyard, and then the page becomes one continuous scroll story:
**welcome → the couple → the quote**. Day/Night can be toggled at any moment and the
whole scene recolours in place without ever disturbing the scroll position.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build into dist/
npm run preview    # serve the built dist/
npm run lint       # oxlint
```

Requires Node 18+ (Node 20+ recommended). Fonts load from Google Fonts at runtime, so
the page needs a network connection on first paint.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Animation | GSAP 3 + ScrollTrigger, via `@gsap/react`'s `useGSAP` |
| Icons | lucide-react |
| Linting | oxlint |

No other animation or UI libraries are used.

---

## How the page is structured

There are exactly **two moments**, and they are stitched together so the screen never
goes dark between them.

### Moment 1 — `src/components/EntranceJourney.jsx`

A phase machine:

```
'invitation'  →  invitation card, palace still image behind it
'gate'        →  gate film plays (once, no loop)
'courtyard'   →  courtyard film plays over the gate's frozen last frame
```

Both films play **once** and advance on `onEnded` — there is no looping and no
autoplay-on-scroll here. All four videos (day/night × gate/courtyard) are mounted from
the first paint, so the courtyard is already buffered while the gate film is still
playing. Switching between them is a layer swap, never a mount — that is what removes
the black frame that used to appear between the two scenes.

### Moment 2 — `src/components/ScrollStory.jsx`

One 480vh track with one sticky `100dvh` stage. Four stacked layers, all mounted from
the first paint:

```
z-0  court-layer    the courtyard film's real last frame (day + night)
z-1  welcome-layer  the welcome courtyard, dissolving in on mount
z-2  palace-layer   the palace behind the couple
z-3  story-layer    the scrubbed story film
```

A single GSAP ScrollTrigger timeline drives everything: act A leaves, backdrop A→B
blends, act B arrives and leaves, backdrop B→C blends, and finally the story film is
seeked by the timeline.

Because the bottom layer is the courtyard film's actual final frame — extracted at the
same 1280×720 — the first pixels of the scroll stage are identical to the last pixels of
the film. `App.jsx` fades the scroll stage **in over** the frozen entrance rather than
fading the entrance out, so there is no moment where the only opaque layer is gone.

### The hand-off — `src/App.jsx`

```
'entrance' → only the entrance
'handoff'  → entrance frozen underneath, scroll stage fading in above it
'story'    → only the scroll stage
```

---

## The Elephant Welcome — a self-playing interlude

Chapter 3 (`#story`) used to be **scrubbed**: a 240vh track drove the film's playhead
from scroll progress. The elephants only walked while the visitor kept scrolling, and
the quotation only finished appearing if they scrolled far enough. That asks the guest
to *perform* the animation, and anyone who scrolls briskly can pass the scene without
ever seeing the complete composition — without knowing they missed it.

It is now a **self-playing cinematic interlude**:

```
scroll in once -> the film starts on its own and plays in real time
              -> the final composition is held
              -> the next gesture continues the journey
```

The section is exactly `100dvh` and the film is **played, never scrubbed**. Nothing is
tied to scroll progress any more, so "an accidental scroll cannot skip or partially
reveal the scene" is true by construction rather than something policed gesture by
gesture. The film is `muted` + `playsInline` (the only combination browsers autoplay
without asking), the active layer is chosen by theme, and only one layer ever plays.

### The hold

A short hold covers the play window so an absent-minded swipe cannot carry the visitor
past a scene still unfolding. It is **one-way and always escapable**, because this
chapter must never become a trap:

| Escape | Behaviour |
|---|---|
| Scroll **up** | Releases immediately — anyone may leave at any time |
| **Continue** pill | On screen for the whole hold, jumps to the last frame |
| Failsafe timer | Releases at `duration + 3s`, so a stalled film cannot strand anyone |
| Autoplay refused | Hold never engages; a **Play The Scene** control appears instead |

Technically the hold cancels forward `wheel` / `touchmove` / `ArrowDown`/`Space` at the
source and clamps forward scroll back to the section's top. Upward movement is never
intercepted. A `clamping` flag stops the guard mistaking its own correction for the
visitor moving.

### Day / Night during playback

`swapThemeVideo` freezes the outgoing playhead, seeks the incoming film to that exact
timestamp, **waits for the seek to land**, starts it, and only then mutes the old layer —
so toggling continues from the same frame. Measured drift on a mid-playback switch:
**+1.84s of ordinary playback time**, with no restart and no jump to an unrelated frame.
If the scene has already finished, the incoming layer parks on *its* final frame so the
crossfade holds the same completed composition.

### Reduced motion

No autoplay and no hold at all: the film is parked on its last frame, which carries the
complete quotation and full decoration. Verified `t = 9.95 / 10.00`, `paused: true`, and
scrolling completely unaffected. Same information, no animation.

---

## Day / Night

One global toggle, rendered once by `GlobalControls` above every scene. `isNight` lives
in `App.jsx` and is threaded down as a prop.

Backgrounds crossfade with plain CSS opacity, so toggling the theme **cannot** touch the
scroll timeline or a video playhead. For the films, `src/lib/videoSwap.js` handles the
swap in a specific order:

1. freeze the outgoing playhead (pause first),
2. read its timestamp,
3. seek the incoming video to that exact timestamp and wait for the seek to land,
4. start the incoming video,
5. retune the outgoing one's audio last.

Doing it in that order is what stopped the footage from visibly jumping ~1s backwards on
every mode change.

---

## Orientation (mobile)

The films are one approved 16:9 composition. A 390x844 portrait window shows only
**26%** of a 1280x720 frame with `object-cover` — 74% of the picture is cropped away.
Rotated to 844x390 the same frame loses 18% of its height and the whole scene reads.
That measurement is the entire reason for this feature; no video file was re-encoded,
cropped, zoomed or replaced.

Two treatments, deliberately different:

| Stage | Component | Blocking? |
|---|---|---|
| Entrance (Phase A) | `OrientationGate` | Full-screen, **always dismissible** |
| Invitation (Phase B) | `RotateHint` | A small pill, never blocks scrolling |

`Rotation is encouraged, not compulsory.` The gate is dismissed by "Continue in
Portrait", by the X, or simply by rotating. Once `everLandscape` is true — the phone has
been held sideways once this session — **neither** appears again, so a guest is never
re-prompted mid-story.

**A compulsory lock is not achievable on the web.** `screen.orientation.lock()` requires
fullscreen *and* a user gesture, and iOS Safari does not implement it at all. So the gate
offers "Enter Landscape", which requests fullscreen and then locks from inside that
gesture — on Android that genuinely rotates the screen; on iOS it resolves harmlessly and
the guest rotates by hand. Nothing is requested from a sensor: no gyroscope, no motion
permission, no popup. Detection uses `screen.orientation.type` with a
`innerWidth > innerHeight` fallback, coalesced into one read per frame.

### Continuity across a rotation

Every chapter is sized in `dvh`, so rotating rescales the whole document. Keeping the raw
`scrollY` therefore does **not** keep the scene (measured drift: 2049 -> 4425, a different
chapter). `src/lib/scrollAnchor.js` records the visitor's *place in the story* — which
chapter is under the top of the viewport plus how far into it, as a 0..1 ratio — and
`useOrientationContinuity` restores it in the same frame, after a `ScrollTrigger.refresh()`,
with the `.rotation-settling` class suppressing CSS transitions so nothing tweens from old
geometry to new. Only a genuine aspect flip triggers it; a height-only change (URL bar,
on-screen keyboard under the RSVP) is left alone. Verified: same chapter, ratio 0.1418 ->
0.1408, golden thread dash offset 285 -> 285.

### Safe areas

`index.html` sets `viewport-fit=cover`, and `.safe-left` / `.safe-right` /
`.safe-left-edge` / `.safe-pad-x` add `env(safe-area-inset-*)` to the *existing* offsets via
`calc(base + inset)`. `env()` is `0px` on desktop, in portrait and on any device without a
cutout, so every approved position is unchanged there; only a landscape notched phone gains
anything, where the camera cutout would otherwise sit on the monogram, the sound controls
and the golden thread rail.

---

## RSVP

`src/components/RsvpSection.jsx`, after the seven chapters, in the same normal document
flow. Built on the supplied Mughal artwork (the warm ivory `#F7EBDD` of the arch, the
antique gold `#A87932` of the latticework). Optimised independently for desktop, tablet
and portrait phone — **rotation is never required to answer**.

**Day and night artwork.** Both layers are mounted and crossfade in place, exactly like
the chapter backdrops above, so toggling the theme here cannot reflow the section or move
the form being filled in:

| Mode | Artwork | WebP | PNG |
|---|---|---|---|
| Day | `invitation-background.*` (warm parchment arch) | 502 KB | 3.5 MB |
| Night | `night-background.*` (celestial indigo, moon, lanterns, songbirds) | 605 KB | 3.7 MB |

Each is a real `<img>` in a `<picture>` with `loading="lazy"` + `decoding="async"`, so the
browser takes the WebP rather than the PNG and only fetches it when the guest reaches the
section. The scrims are paired, not averaged: the light parchment needs a heavier warm
wash to hold the gold type, while the deep indigo needs far less so the moon and lanterns
stay legible behind the letter.

Validation is real (name >= 2 chars, attendance required, and when accepting, 1-10 guests
plus at least one chosen event). Declining collapses the guest count and event pickers to
`max-h-0 / opacity-0 / pointer-events-none` and clears them, so a stale count can never be
submitted with a decline.

**Honesty contract** (`src/lib/rsvp.js`) — this project has no backend, so the form must
never imply otherwise:

| `VITE_RSVP_ENDPOINT` | Behaviour | What the guest is told |
|---|---|---|
| set | real JSON `POST`, success only on 2xx | "Your response has reached Simran & Sachit." |
| unset (current) | saved to `localStorage` | "Saved on this device..." + "not yet connected to a response server" |
| request fails | nothing saved | the real error, and the form stays editable |

To make responses actually arrive, set `VITE_RSVP_ENDPOINT` at build time to any endpoint
accepting a JSON POST (a Worker, Formspree, an Apps Script web app). No other change needed.

---

## Sizing

Act content is sized with `clamp(min, N dvh, max)` — driven by viewport **height**, not
fixed pixels. Fixed sizes cannot shrink, so on a short or wide window they overflow the
`100dvh` stage and `items-center` crops the block in both directions. Keep new act
content on the same pattern.

---

## Reduced motion

`prefers-reduced-motion: reduce` does **not** get a separate render branch. A separate
branch used to mount the story film without ever seeking it, parking it on frame 0 —
which has the elephants and the flourish but no quote and no petals. Both modes now share
one stage; reduced motion only drops the decorative drift and the scrub easing lag.

Videos never autoplay or loop on scroll: the single scroll-scrubbed film is user-driven.

---

## The monogram

`src/components/Monogram.jsx` — an arched mehrab mark: a rounded arch with a fine inner
trace, two interlocking serif `S` letterforms, lotus blooms on stems rooted on the base
line, and a keystone diamond at the apex.

It is drawn entirely as SVG `<path>` geometry — never SVG `<text>` — so it cannot reflow
or fall back to another font mid-load, and it looks identical at every size. Gradient ids
are per-instance via `useId()`, so several monograms can coexist on one page.

It appears in three places: the entrance header, the scroll-stage header, and the
invitation-card seal.

---

## Project layout

```
.
├── index.html                  # fonts + root mount
├── vite.config.js
├── ecosystem.config.cjs        # PM2 config (script mode, used in the sandbox)
├── public/
│   ├── favicon.svg
│   └── assets/
│       ├── scene1/   palace stills + gate films (day/night)
│       ├── scene2/   courtyard films + their real final frames
│       ├── scene3/   welcome backdrops (day/night)
│       ├── couple/   bride/groom portraits + palace backdrops
│       └── scene5/   story day/night films + their posters
└── src/
    ├── main.jsx
    ├── App.jsx                 # stage machine, isNight, isMuted
    ├── index.css               # theme tokens + font utility classes
    ├── components/
    │   ├── EntranceJourney.jsx # card, gate film, courtyard film
    │   ├── ScrollStory.jsx     # welcome + couple + story, one scroll stage
    │   ├── GlobalControls.jsx  # single Day/Night + mute pair
    │   └── Monogram.jsx        # SVG house mark
    └── lib/
        └── videoSwap.js        # playhead-preserving day/night swap
```

### Design tokens

Kept in `src/index.css` and used throughout:

- Gold `#d4af37` (with `#f3e5ab` light / `#aa771c` dark), navy `#040711` / `#090e1c`
- Font utilities: `.font-cinzel`, `.font-cinzel-dec`, `.font-royal` (Playfair Display),
  `.font-script` (Great Vibes), `.font-serif-body` (Cormorant Garamond),
  `.font-sans-clean` (Montserrat)

---

## Media notes

- `public/assets/scene2/court-end-{day,night}.jpg` are the courtyard films' true final
  frames. Regenerating either film means regenerating these, or the hand-off seam shows.
- The story act is **two real films**, not one film plus a still:

  | File | Theme | Source |
  |---|---|---|
  | `public/assets/scene5/story-day-scrub.mp4`  | Day   | `gemini_generated_video_2cd13983.mp4` |
  | `public/assets/scene5/story-night-scrub.mp4` | Night | `gemini_generated_video_334d89d8.mp4` |

  Both are 1280×720, 24 fps, 240 frames, 10.0 s, and **all-intra** (240/240 keyframes).
  All-intra is not cosmetic: the timeline seek-scrubs `currentTime` on every scroll frame,
  and a normal GOP encode can only seek to the nearest keyframe, which stutters. Regenerate
  with `-g 1 -keyint_min 1 -sc_threshold 0` or the scroll will feel sticky.
- Both films contain the quote's typewriter reveal, the elephants' sway and the falling
  petals **baked into the footage**. `StoryAct` renders no text of its own — the film is the
  single source of that animation, and it must be seeked by the timeline or the frame looks
  empty. Frame 0 intentionally has the courtyard and flourish but no text.
- **One playhead, two films.** Both videos stay mounted from first paint and the same
  scroll timeline seeks both to the same normalised time. Day/Night is therefore a pure
  opacity crossfade on the video elements — the scroll position, the playhead and the drawn
  quote cannot move when the theme is switched.
- `story-poster.jpg` / `story-night-poster.jpg` are frame 0 of their respective films — the
  still shown for the instant before the first seek lands.

---

## Known gaps

- **Details & RSVP section** — not built. Needs the real date, venue, timings, and the
  RSVP destination (phone/WhatsApp or a form).
- **Scene 3 → Scene 4 fade** — currently a backdrop dissolve; an explicit extra crossfade
  was not added.
- `dist/` and `node_modules/` are not in the repository — regenerate with
  `npm install && npm run build`.

---

## RSVP backend, database and WhatsApp notifications

The invitation itself is unchanged. The RSVP form now posts to a real backend that
persists every response and forwards it to WhatsApp through **Meta's official
WhatsApp Business Cloud API**.

### Run it

```bash
npm run build          # build the SPA into dist/
npm start              # Node server on :3000 — serves dist/ AND /api/*
```

`npm start` (`node server/server.mjs`) is the single process: it serves the built
site, the RSVP API and the private admin view.

### Database

Persistent **SQLite** via Node 22's built-in `node:sqlite` — no native modules, no
external service. The file is `data/rsvp.sqlite` (WAL mode, `synchronous=FULL`) and
is git-ignored. Survives refreshes, restarts and redeploys.

> **Backup:** copy `data/rsvp.sqlite` (and `rsvp.sqlite-wal` if present). That one
> file is the entire register.

Columns: `id, guest_name, phone_number, phone_e164, email, attendance_status,
guest_count, event_selection, event_keys, event_labels, meal_preference,
special_requests, submitted_at, submitted_at_ist, submitted_utc, submitted_day,
notification_status, notification_attempts, notification_error, notified_at,
next_attempt_at, client_token, dedupe_key, ip_hash, user_agent`. A second table,
`notification_log`, records every send attempt.

### Where to put the WhatsApp number

`.env` in the project root (never committed):

```ini
WHATSAPP_RECIPIENT_NUMBER=919810833429   # already set: +91 98108 33429
```

The backend normalises it and **only ever sends to this number** — never to the
guest. It is a server-side variable and never reaches the browser bundle (asserted
by the test suite).

### Credentials required

```ini
WHATSAPP_ACCESS_TOKEN=        # Meta system-user / permanent token
WHATSAPP_PHONE_NUMBER_ID=     # the SENDING number's ID (not the recipient's)
WHATSAPP_BUSINESS_ACCOUNT_ID= # optional, informational
ADMIN_PASSWORD=               # gates /admin  (already set for this preview)
SESSION_SECRET=               # optional; auto-generated if absent
```

See `.env.example` for the annotated template. Add the same keys as environment
variables in your host's dashboard for production.

### Meta setup and template approval

1. Create a **Meta Business** account and a **WhatsApp Business Account (WABA)**.
2. Add a phone number → note its **Phone number ID** → use it as
   `WHATSAPP_PHONE_NUMBER_ID`.
3. Create a **permanent** system-user token with `whatsapp_business_messaging`.
4. Business verification is **not** required to message your own test numbers, but
   is required to raise limits and message arbitrary numbers in production.
5. Free-form text only works inside the **24-hour customer service window**. Outside
   it, Meta rejects with error `131047` and an **approved template** is mandatory.
   Create a **UTILITY** template whose body is `💌 NEW WEDDING RSVP RECEIVED`
   followed by `{{1}}`; set `WHATSAPP_TEMPLATE_NAME` and the backend switches to
   template mode automatically (the whole formatted message becomes `{{1}}`).

### Notification format

Exactly the specified layout: heading, guest name, mobile, email, attendance,
total guests, events, meal, special requests, RSVP ID, IST timestamp, the
`-------------------------` rule and the closing line. Both **Accepts** and
**Declines** are sent.

### Reliability contract

Save first, notify second. The RSVP is committed with
`notification_status='pending'` **before** the guest sees success, so a Meta
outage can never lose a response. Statuses move `pending → sent` or
`pending → failed` (permanent: auth, bad request, window closed) and transient
failures retry on a backoff of 30s → 1m → 2m → 5m → 10m → 30m → 1h → 2h.
An atomic conditional `UPDATE` claims each row, so retries and concurrent
workers can never double-send. Safer to under-send than to lie: the site never
claims a WhatsApp message was delivered.

### Admin view

`http://localhost:3000/admin` — password-gated (signed HttpOnly session cookie).
Shows totals, confirmed attendees, accompanying guests, accepts/declines split,
search by name or mobile, per-response detail, notification status with manual
retry, and a CSV export. Not publicly accessible; no guest data is exposed on the
public site.

### Tests

```bash
npm run test:rsvp      # 112 assertions, all seven mandatory scenarios
```

Covers accept, decline, multiple guests, special requests, invalid input, a
WhatsApp outage followed by recovery (no duplicate send), and duplicate-submission
prevention — plus honeypot/bot filtering, CSV BOM, path traversal, Range serving
for iOS video and restart persistence. WhatsApp is exercised end-to-end against a
mock Graph endpoint: the real code path runs, but the mock cannot prove Meta will
accept a token.
