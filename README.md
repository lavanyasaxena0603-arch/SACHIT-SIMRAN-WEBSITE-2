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
