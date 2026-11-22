# Sachit & Simran — Royal Wedding Invitation

An animated, scroll-driven wedding invitation built as a **static single-page React app**.

The guest opens an invitation card, watches the palace gates swing open, is carried
through the courtyard, and then the page becomes one continuous scroll story:
**welcome → the couple → the quote → the countdown → the engagement → the wedding →
closing → the finale**. Day/Night can be toggled at any moment and the whole scene
recolours in place without ever disturbing the scroll position.

There is **no backend, no database, no API and no secrets**. The build output is a
folder of static files.

---

## Requirements

| | |
|---|---|
| **Node.js** | **20 or newer** (build tooling only — nothing runs on a server) |
| Tested on | Node 22.23.4, npm 10.9.9 |
| OS | Windows, macOS, Linux — no native modules, no compiler needed |
| Network | needed on first paint, because the fonts come from Google Fonts |

---

## Quick start

```bash
npm install          # dependencies (no native builds)
npm run dev          # dev server on http://localhost:5173
```

Open **http://localhost:5173**.

To check the real production output locally:

```bash
npm run build        # writes dist/
npm run preview      # serves dist/ on http://localhost:4173
```

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload (port 5173, override with `WEB_PORT`) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` exactly as a static host would |
| `npm run lint` | `oxlint` over the whole source |

---

## Deployment — static hosting only

The site is a static frontend and deploys to any static host.

**Vercel**

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

**Any other static host** (Netlify, Cloudflare Pages, GitHub Pages, S3 + CDN, nginx):
publish the contents of `dist/`. No redirects, rewrites or server rules are required —
the app has a single HTML entry point and does not use client-side routing.

Because the app makes no API calls, there is nothing to configure, no environment
variables to set, and nothing that can go down independently of the static assets.

---

## Project structure

```
.
├── index.html               # single HTML entry point
├── vite.config.js           # Vite + React + Tailwind; no proxy, no server
├── package.json
├── public/
│   └── assets/
│       ├── audio/           # the soundtrack
│       ├── couple/          # bride & groom day/night plates
│       ├── finale/          # varmala + fireworks films and stills
│       ├── scene1..scene6/  # entrance, courtyard, welcome, story, countdown
│       └── venues/          # venue plates and the Rudrakshaa film
└── src/
    ├── main.jsx
    ├── App.jsx              # two phases: entrance, then the scroll document
    ├── index.css            # design tokens, keyframes, reduced-motion guards
    ├── components/
    │   ├── EntranceJourney.jsx    # invitation card, palace gate, courtyard
    │   ├── InvitationScroll.jsx   # the seven invitation sections
    │   ├── FinaleSection.jsx      # the night finale
    │   ├── SectionHeader.jsx      # fixed header
    │   ├── GlobalControls.jsx     # day/night + sound toggles
    │   ├── GoldenThread.jsx       # the scroll-linked golden thread
    │   ├── AmbientMusic.jsx       # the single soundtrack
    │   └── Monogram.jsx
    └── lib/
        ├── countdown.js     # wedding date + live timer hook
        ├── film.js          # watchFilm(): "has this film finished?" helper
        ├── musicController.js
        ├── useMusic.js
        ├── useOrientation.js
        └── videoSwap.js     # playSafely / ensurePlaying / theme-swap handoff
```

---

## The two phases

**Phase A — `EntranceJourney`.** Sealed invitation card, then the palace gates film,
then the courtyard film. The visitor has no scrollbar during this phase. All films
live in one component so nothing unmounts between the gate and the courtyard.

**Phase B — `InvitationScroll`.** Seven real `<section>` elements in normal document
flow. Because they are real sections the browser scrolls them physically, so the
outgoing chapter leaves through the top and the incoming one rises from below. There
is no sticky stage and no slideshow crossfade between chapters.

**The hand-off.** When the courtyard film ends the entrance does *not* unmount and does
not fade out. It freezes on its final frame, fully opaque, as a fixed layer; the scroll
document — whose bottom layer is that same final frame — fades in on top of it. Both
layers show identical pixels during the dissolve, so the screen never goes dark.

---

## Sections

| # | Section | Contents |
|---|---|---|
| 1 | `#welcome` | Welcome plate, day/night pair |
| 2 | `#couple` | The bride and the groom, with parents' and grandparents' names |
| 3 | `#story` | The elephant welcome film — played once, never scrubbed |
| 4 | `#countdown` | Countdown film, then the live timer medallion |
| 5 | `#engagement` | Sterling Banquet, 10 December 2026 |
| 6 | `#wedding` | Rudrakshaa Banquet, 12 December 2026 |
| 7 | closing | The five family names |

Then `FinaleSection` — the night finale, a flush sibling in the same document flow.

---

## Day / Night

One toggle in `GlobalControls` drives the whole journey. Sections that have both
plates mount both and cross-fade between them, so the change is a compositor-only
opacity transition: nothing re-downloads, nothing re-decodes, and the two plates on
the couple cards move on exactly the same clock.

The films that have a day and a night cut use `swapThemeVideo`, which freezes the
outgoing playhead, seeks the incoming film to that exact timestamp, waits for the seek
to land, starts it, and only then mutes the old layer — so a mid-scene toggle
continues from the same frame instead of restarting the scene.

The finale is **night only** by design. That is a statement about the artwork, not a
condition on the toggle: there is no Day variant and no toggle inside it.

---

## Responsive behaviour

- **Portrait is the primary target.** Nobody is asked to rotate a phone; there is no
  orientation gate and no `screen.orientation.lock()`.
- The couple section is one column on phones (a 2-up grid crushed the portraits) and
  two columns from `md` up.
- Films that cannot survive a portrait crop have **native portrait cuts** rather than
  being cropped out of a landscape master. `InvitationScroll` chooses the cut by
  viewport orientation and remounts the film when orientation changes.
- `useOrientation` survives only to re-measure `ScrollTrigger` on rotation, so the
  golden thread and the reveals stay locked to the real scroll position.

---

## Motion and accessibility

- `prefers-reduced-motion` is honoured throughout: the decorative layers (motes,
  shimmer, parallax, reveals) are suppressed, while the **films still play**, because
  the footage is content rather than decoration. Parked-at-the-end is not a reduced
  alternative, it is a disabled chapter.
- Films are `muted` + `playsInline` and play **once**, never scrubbed by scroll and
  never auto-looped.
- Animation is confined to `transform` and `opacity`, so no animation triggers layout.

---

## Notes for future maintainers

- **Do not scrub the story film from scroll progress.** An earlier version drove the
  playhead from scroll, which asked the guest to perform the animation; someone who
  scrolled quickly could skip the scene entirely and never know.
- **Do not add a scroll-blocking hold** over a playing film. It was removed because it
  stopped the page dead — forward scroll did nothing, so later chapters became
  unreachable. The "Continue" affordance is presentational only.
- **Both couple plates stay mounted.** Swapping a single `<img src>` made the portraits
  blink as the new image decoded.
