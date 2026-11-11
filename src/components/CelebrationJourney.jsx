import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Calendar, Clock, MapPin, Heart, Navigation, ChevronDown } from 'lucide-react';
import Monogram from './Monogram';
import { useCountdown } from '../lib/countdown';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * PART THREE — the countdown, then the two celebrations.
 *
 * A SECOND scroll track that continues where <ScrollStory /> ends. Three acts
 * on one sticky 100dvh stage:
 *
 *   A  Countdown  — looping celebration film, live timer in the gold medallion
 *   B  Engagement — Sterling Banquet, day/night plates, 10 Dec, 6:00 pm
 *   C  Wedding    — Rudrakshaa Banquet, one film that turns to night by itself
 *
 * THE HAND-OFF FROM PART TWO
 * --------------------------
 * Both tracks are plain sticky sections in normal document flow, so the browser
 * does the transition natively: as the story track's sticky stage unpins it
 * scrolls up, and this track's sticky stage is already sitting directly beneath
 * it, so it rises into the viewport in the same motion. For every pixel of that
 * overlap the two halves are contiguous — `top` of the incoming stage equals
 * `bottom` of the outgoing one — so the canvas can never be uncovered.
 *
 * Act A's base plate is `seam-day.jpg` / `seam-night.jpg`: the literal final
 * frame of each story film, pulled from the films themselves. Whatever the
 * story film was painting as it left, this picks up in the same palette.
 *
 * ACTS B AND C
 * ------------
 * These come in the way the brief asked: the outgoing act drifts up and dims,
 * the incoming one rises from below and fades in ("previous screen scroll up,
 * new screen incoming from down"). The outgoing act stays fully opaque
 * underneath until the incoming one covers it, so no gap opens mid-slide.
 */

const SEAM_DAY = '/assets/scene6/seam-day.jpg';
const SEAM_NIGHT = '/assets/scene6/seam-night.jpg';
const COUNTDOWN_FILM = '/assets/scene6/countdown-loop.mp4';
const COUNTDOWN_POSTER = '/assets/scene6/countdown-poster.jpg';
const STERLING_DAY = '/assets/venues/sterling-day.jpg';
const STERLING_NIGHT = '/assets/venues/sterling-night.jpg';
const WEDDING_FILM = '/assets/venues/rudrakshaa.mp4';
const WEDDING_POSTER = '/assets/venues/rudrakshaa-poster.jpg';

// Resolved from the two maps.app.goo.gl links supplied with the brief.
const ENGAGEMENT_MAP = 'https://maps.app.goo.gl/z6CP5aXyaLV4JvZ38';
const WEDDING_MAP = 'https://maps.app.goo.gl/6gzA6t5nxyrjVTcp9';

function Backdrop({ day, night, isNight }) {
  return (
    <div className="absolute inset-0">
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[900ms] ease-out ${
          isNight ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url('${day}')` }}
      />
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[900ms] ease-out ${
          isNight ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `url('${night}')` }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- ACT A ---- */

/**
 * The live timer.
 *
 * Its own component so the 1s tick re-renders only this subtree — the GSAP
 * timeline that animates the stage above it never re-runs.
 *
 * "..." ellipsis never appears: every unit is padded to two digits.
 */
function CountdownDial() {
  const { label, target, days, hours, mins, secs } = useCountdown();

  const units = [
    { key: 'd', label: 'Days', value: days },
    { key: 'h', label: 'Hours', value: hours },
    { key: 'm', label: 'Mins', value: mins },
    { key: 's', label: 'Secs', value: secs },
  ];

  return (
    <div className="relative aspect-square w-full">
      {/* Ornamental rings. Decorative only — the numbers sit on top. */}
      <div className="absolute inset-0 rounded-full border border-[#d4af37]/60 shadow-[0_0_50px_rgba(212,175,55,0.3),inset_0_0_36px_rgba(212,175,55,0.12)]" />
      <div className="absolute inset-[4.5%] rounded-full border border-[#d4af37]/25" />
      <div className="absolute inset-[9%] rounded-full bg-[radial-gradient(circle_at_50%_36%,rgba(12,21,38,0.86)_0%,rgba(4,7,17,0.95)_100%)] backdrop-blur-[2px]" />

      {/* Four diamond studs at the cardinal points of the outer ring. */}
      <span className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#dfba5c]/85" aria-hidden="true" />
      <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-[#dfba5c]/85" aria-hidden="true" />
      <span className="absolute top-1/2 left-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#dfba5c]/85" aria-hidden="true" />
      <span className="absolute top-1/2 right-0 h-2 w-2 -translate-y-1/2 translate-x-1/2 rotate-45 bg-[#dfba5c]/85" aria-hidden="true" />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-[9%] text-center"
        role="timer"
        aria-label={`${label}. ${days} days, ${hours} hours, ${mins} minutes until ${target}.`}
      >
        <p className="font-cinzel text-[clamp(0.38rem,1.55vmin,0.6rem)] leading-tight uppercase tracking-[0.24em] text-[#dfba5c] drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
          {label}
        </p>

        <div className="mt-[clamp(0.2rem,1vmin,0.5rem)] flex items-start justify-center gap-[clamp(0.15rem,1.1vmin,0.55rem)]">
          {units.map((u) => (
            <div key={u.key} className="flex flex-col items-center">
              <span className="font-royal text-[clamp(0.95rem,4.6vmin,1.9rem)] leading-none font-bold text-[#fff9e6] tabular-nums drop-shadow-[0_2px_10px_rgba(255,215,120,0.45)]">
                {String(u.value).padStart(2, '0')}
              </span>
              <span className="font-sans-clean mt-[0.15rem] text-[clamp(0.3rem,1.05vmin,0.46rem)] uppercase tracking-[0.16em] text-[#d8b878]">
                {u.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-[clamp(0.22rem,1.2vmin,0.6rem)] h-px w-3/5 bg-gradient-to-r from-transparent via-[#d4af37]/65 to-transparent" />

        <p className="font-sans-clean mt-[clamp(0.2rem,0.9vmin,0.45rem)] text-[clamp(0.33rem,1.05vmin,0.5rem)] uppercase tracking-[0.18em] text-[#f7d58a]/85">
          {target}
        </p>
      </div>
    </div>
  );
}

function CountdownAct({ isNight, videoRef }) {
  return (
    <div className="cd-layer absolute inset-0 z-10">
      {/* The story film's true last frame — identical pixels to where the
          previous track stops, so the hand-off reads as one shot. */}
      <Backdrop day={SEAM_DAY} night={SEAM_NIGHT} isNight={isNight} />

      <video
        ref={videoRef}
        className="cd-video absolute inset-0 h-full w-full object-cover opacity-0"
        src={COUNTDOWN_FILM}
        poster={COUNTDOWN_POSTER}
        loop
        muted
        playsInline
        preload="auto"
        autoPlay
        disablePictureInPicture
        aria-hidden="true"
      />

      <div
        className="cd-scrim absolute inset-0 opacity-0"
        style={{
          background: isNight
            ? 'radial-gradient(circle at 50% 40%, rgba(4,7,17,0.28) 10%, rgba(4,7,17,0.70) 62%, rgba(2,4,10,0.93) 100%)'
            : 'radial-gradient(circle at 50% 40%, rgba(4,7,17,0.20) 10%, rgba(4,7,17,0.60) 62%, rgba(2,4,10,0.90) 100%)',
        }}
      />

      {/*
        The supplied film already carries an empty ornate medallion near the top
        of frame. Its interior is only ~11% of the frame width — too small for a
        legible four-unit timer — so the live dial is deliberately larger and
        centred over it: it REPLACES the baked-in medallion instead of competing
        with it.

        The wrapper below reproduces object-cover geometry exactly (a box of the
        film's own 16:9 aspect, scaled to cover), so the dial keeps its position
        over that medallion at every viewport, including phones where the film
        is cropped hard at the sides.
      */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 'max(100%, calc(100dvh * 16 / 9))',
            height: 'max(100%, calc(100vw * 9 / 16))',
          }}
        >
          {/* The centring transform lives on THIS wrapper, never on .cd-dial.
              GSAP animates `.cd-dial` with `y`/`scale`, which it applies as an
              inline `transform`; that would wipe out the -translate-x/y-1/2
              utilities and drop the dial half its own size off the medallion. */}
          <div
            className="absolute top-[24.5%] left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: 'clamp(12.5rem, 27%, 26rem)' }}
          >
            <div className="cd-dial opacity-0">
              <CountdownDial />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- ACT B ---- */

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/45 bg-[#d4af37]/10 text-[#dfba5c]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 text-left">
        <p className="font-sans-clean text-[clamp(0.38rem,1.1vmin,0.53rem)] uppercase tracking-[0.22em] text-[#dfba5c]">
          {label}
        </p>
        <p className="font-serif-body text-[clamp(0.7rem,1.85vmin,1rem)] leading-snug text-[#f7f2e7]">
          {value}
        </p>
      </div>
    </div>
  );
}

function MapButton({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group font-sans-clean inline-flex items-center gap-2 rounded-full border border-[#d4af37]/60 bg-[#0b1022]/85 px-4 py-2 text-[clamp(0.44rem,1.15vmin,0.58rem)] uppercase tracking-[0.2em] text-[#f3e5ab] shadow-[0_6px_22px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-all duration-300 hover:border-[#dfba5c] hover:bg-[#121a30]/90 hover:shadow-[0_8px_28px_rgba(212,175,55,0.3)] active:scale-95"
    >
      <Navigation className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      {children}
    </a>
  );
}

function EngagementAct({ isNight }) {
  return (
    <div className="st-layer absolute inset-0 z-20 opacity-0">
      <Backdrop day={STERLING_DAY} night={STERLING_NIGHT} isNight={isNight} />

      {/* Heavy at the base so the card always reads; light at the top so the
          flower arch keeps its glow. */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#04070f]/94 via-[#04070f]/55 to-[#04070f]/22" />
      <div
        className="absolute inset-0"
        style={{
          background: isNight
            ? 'radial-gradient(circle at 50% 26%, rgba(6,10,22,0.1) 0%, rgba(3,6,14,0.6) 100%)'
            : 'radial-gradient(circle at 50% 26%, rgba(10,7,3,0.02) 0%, rgba(3,6,14,0.5) 100%)',
        }}
      />

      <div className="st-content absolute inset-0 z-20 flex items-center justify-center px-4 pt-14 pb-6">
        <div className="w-full max-w-3xl text-center">
          <p className="font-cinzel text-[clamp(0.42rem,1.45vmin,0.68rem)] uppercase tracking-[0.4em] text-[#dfba5c] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            The Engagement
          </p>

          <h2 className="font-cinzel mt-2 bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] bg-clip-text text-[clamp(1.05rem,min(5.2dvh,6.2vw),2.9rem)] leading-tight font-semibold tracking-[0.08em] text-transparent drop-shadow-[0_4px_22px_rgba(0,0,0,0.95)]">
            Sterling Banquet
          </h2>

          <div className="mx-auto mt-3 flex max-w-[13rem] items-center justify-center gap-3 text-[#d4af37]">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-[#d4af37]" />
            <Heart className="h-3.5 w-3.5 fill-[#d4af37]/30" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/70 to-[#d4af37]" />
          </div>

          <div className="mx-auto mt-[clamp(0.7rem,2.8dvh,1.6rem)] grid w-full max-w-lg grid-cols-1 gap-3 rounded-2xl border border-[#d4af37]/45 bg-[#080d1a]/72 p-[clamp(0.8rem,2.4dvh,1.45rem)] text-left shadow-[0_22px_60px_rgba(0,0,0,0.8),inset_0_0_26px_rgba(212,175,55,0.07)] backdrop-blur-md sm:grid-cols-2">
            <InfoRow icon={Calendar} label="Date" value="Thursday, 10 December 2026" />
            <InfoRow icon={Clock} label="Time" value="06:00 PM onwards" />
            <div className="sm:col-span-2">
              <InfoRow
                icon={MapPin}
                label="Venue"
                value="Sterling Banquet, Ghaziabad, Uttar Pradesh 201001"
              />
            </div>
          </div>

          <div className="mt-[clamp(0.65rem,2.2dvh,1.2rem)] flex justify-center">
            <MapButton href={ENGAGEMENT_MAP}>View On The Map</MapButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- ACT C ---- */

/**
 * One film, no Day/Night toggle. The supplied clip turns from daylight to night
 * on its own, so the theme pill has nothing to do here — the footage IS the
 * transition.
 *
 * The source is portrait (520x1274 after the chip was cropped off), so it is
 * presented as a contained panel rather than stretched full-bleed: `cover` on a
 * landscape viewport would throw away ~75% of the frame and cut the RUDRAKSHA
 * sign off. A blurred copy of its own first frame fills the surrounding canvas,
 * so the panel never sits on a flat void.
 *
 * Two edits to the supplied file, both deliberate:
 *   - the baked-in day/night chip on the left edge is cropped away
 *   - trimmed to 7.8s, because the source cuts to black with an end-card logo
 *     at 8.0s
 */
function WeddingAct({ videoRef }) {
  return (
    <div className="ru-layer absolute inset-0 z-30 opacity-0">
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-2xl"
        style={{ backgroundImage: `url('${WEDDING_POSTER}')` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#04070f]/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04070f]/95 via-transparent to-[#04070f]/85" />

      <div className="relative z-20 flex h-full w-full flex-col items-center justify-center gap-[clamp(0.6rem,2.2dvh,1.5rem)] px-4 pt-14 pb-5 sm:px-8 md:flex-row md:gap-[clamp(1.2rem,3.6vw,3rem)]">
        <video
          ref={videoRef}
          className="h-[38dvh] w-auto max-w-full rounded-sm border border-[#d4af37]/55 object-contain shadow-[0_22px_60px_rgba(0,0,0,0.85),0_0_26px_rgba(212,175,55,0.2)] md:h-[74dvh]"
          src={WEDDING_FILM}
          poster={WEDDING_POSTER}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
        />

        <div className="ru-content w-full max-w-md text-center md:text-left">
          <p className="font-cinzel text-[clamp(0.42rem,1.45vmin,0.68rem)] uppercase tracking-[0.4em] text-[#dfba5c] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            The Wedding
          </p>

          <h2 className="font-cinzel mt-2 bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] bg-clip-text text-[clamp(0.95rem,min(4.6dvh,5.8vw),2.5rem)] leading-tight font-semibold tracking-[0.07em] text-transparent drop-shadow-[0_4px_22px_rgba(0,0,0,0.95)]">
            Rudrakshaa Banquet
          </h2>

          <div className="mx-auto mt-2.5 flex max-w-[12rem] items-center justify-center gap-3 text-[#d4af37] md:mx-0">
            <span className="h-px w-9 bg-gradient-to-r from-transparent to-[#d4af37]" />
            <Heart className="h-3.5 w-3.5 fill-[#d4af37]/30" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]" />
          </div>

          <div className="mt-[clamp(0.55rem,2dvh,1.15rem)] grid grid-cols-1 gap-2.5 rounded-2xl border border-[#d4af37]/45 bg-[#080d1a]/72 p-[clamp(0.7rem,1.9dvh,1.15rem)] text-left shadow-[0_22px_60px_rgba(0,0,0,0.8),inset_0_0_26px_rgba(212,175,55,0.07)] backdrop-blur-md">
            <InfoRow icon={Calendar} label="Date" value="Saturday, 12 December 2026" />
            <InfoRow icon={Clock} label="Time" value="08:00 PM onwards" />
            <InfoRow
              icon={MapPin}
              label="Venue"
              value="Rudrakshaa Banquet, Vaishali, Ghaziabad 201001"
            />
          </div>

          <div className="mt-[clamp(0.55rem,1.9dvh,1rem)] flex justify-center md:justify-start">
            <MapButton href={WEDDING_MAP}>View On The Map</MapButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- MAIN ----- */

export default function CelebrationJourney({ isNight }) {
  const trackRef = useRef(null);
  const countdownVideoRef = useRef(null);
  const weddingVideoRef = useRef(null);
  const weddingArmedRef = useRef(false);

  // Respect the reduced-motion setting for the one thing that moves on its own:
  // the looping background film. Everything else here is scroll-driven.
  useEffect(() => {
    const v = countdownVideoRef.current;
    if (!v) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      v.pause();
      v.currentTime = 0;
    } else {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }, []);

  useGSAP(
    () => {
      if (!trackRef.current) return;

      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Reduced motion: the slides become plain dissolves, no travel.
      const drift = reduceMotion ? 0 : 1;
      const weddingEl = weddingVideoRef.current;

      // The wedding film plays itself once its act is on screen. The 0.75/0.66
      // thresholds are deliberately different (hysteresis) so a one-pixel
      // jitter at the boundary cannot restart the clip.
      const driveWedding = (progress) => {
        if (!weddingEl) return;
        if (progress > 0.75 && !weddingArmedRef.current) {
          weddingArmedRef.current = true;
          try {
            weddingEl.currentTime = 0;
            const pr = weddingEl.play();
            if (pr && typeof pr.catch === 'function') pr.catch(() => {});
          } catch {
            /* autoplay may be refused; the poster still shows the venue */
          }
        } else if (progress < 0.66 && weddingArmedRef.current) {
          weddingArmedRef.current = false;
          try {
            weddingEl.pause();
          } catch {
            /* nothing to do */
          }
        }
      };

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: reduceMotion ? true : 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => driveWedding(self.progress),
        },
      });

      // ACT A — the celebration film dissolves in over the story film's last frame.
      tl.to('.cd-video', { opacity: 1, duration: 0.13 }, 0.05);
      tl.to('.cd-scrim', { opacity: 1, duration: 0.13 }, 0.05);
      tl.fromTo(
        '.cd-dial',
        { opacity: 0, y: 24 * drift, scale: drift ? 0.95 : 1 },
        { opacity: 1, y: 0, scale: 1, duration: 0.14, ease: 'power2.out' },
        0.1,
      );
      tl.to('.cd-hint', { opacity: 0, duration: 0.05 }, 0.1);

      // ACT B — rises from below while act A drifts up.
      tl.to('.cd-layer', { yPercent: -12 * drift, duration: 0.17 }, 0.45);
      tl.fromTo(
        '.st-layer',
        { yPercent: 100 * drift, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.17, ease: 'power2.out' },
        0.45,
      );
      tl.fromTo(
        '.st-content',
        { opacity: 0, y: 40 * drift },
        { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' },
        0.51,
      );

      // ACT C — same hand-off again.
      tl.to('.st-layer', { yPercent: -12 * drift, duration: 0.17 }, 0.71);
      tl.fromTo(
        '.ru-layer',
        { yPercent: 100 * drift, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.17, ease: 'power2.out' },
        0.71,
      );
      tl.fromTo(
        '.ru-content',
        { opacity: 0, y: 40 * drift },
        { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' },
        0.77,
      );
    },
    { scope: trackRef },
  );

  return (
    <div
      ref={trackRef}
      id="celebration-journey"
      className="relative w-full bg-[#050812]"
      style={{ height: '360vh' }}
    >
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden text-[#f7f2e7] select-none font-serif-body">
        <CountdownAct isNight={isNight} videoRef={countdownVideoRef} />
        <EngagementAct isNight={isNight} />
        <WeddingAct videoRef={weddingVideoRef} />

        {/* Shared grade + royal frame — identical to the scroll story so the two
            tracks read as one continuous document. */}
        <div
          className="pointer-events-none absolute inset-0 z-40"
          style={{
            background: isNight
              ? 'radial-gradient(circle at center, rgba(5,9,20,0.42) 20%, rgba(4,7,16,0.28) 60%, rgba(2,4,10,0.76) 100%)'
              : 'radial-gradient(circle at center, rgba(4,7,17,0.02) 45%, rgba(4,7,17,0.28) 82%, rgba(2,4,10,0.76) 100%)',
          }}
        />
        <div className="pointer-events-none absolute inset-3 z-40 rounded-sm border border-[#d4af37]/35 sm:inset-6">
          <div className="absolute -top-1.5 -left-1.5 h-4 w-4 border-t-2 border-l-2 border-[#d4af37]" />
          <div className="absolute -top-1.5 -right-1.5 h-4 w-4 border-t-2 border-r-2 border-[#d4af37]" />
          <div className="absolute -bottom-1.5 -left-1.5 h-4 w-4 border-b-2 border-l-2 border-[#d4af37]" />
          <div className="absolute -right-1.5 -bottom-1.5 h-4 w-4 border-r-2 border-b-2 border-[#d4af37]" />
          <div className="absolute inset-1.5 rounded-sm border border-[#d4af37]/15" />
        </div>

        <header className="pointer-events-none absolute top-6 left-6 z-50 flex items-center gap-3 sm:top-10 sm:left-12">
          <Monogram className="h-auto w-[22px] shrink-0 drop-shadow-[0_2px_10px_rgba(212,175,55,0.45)] sm:w-7" />
          <div className="text-left">
            <p className="font-cinzel mb-1 text-[8px] leading-none tracking-[0.3em] uppercase text-[#dfba5c] sm:text-[9px]">
              Royal Wedding
            </p>
            <h2 className="font-royal text-[11px] leading-none font-medium tracking-[0.16em] uppercase text-[#fdfaf3] sm:text-xs">
              Simran &amp; Sachit
            </h2>
          </div>
        </header>

        <div className="cd-hint pointer-events-none absolute inset-x-0 bottom-5 z-50 flex justify-center">
          <div className="font-sans-clean flex animate-bounce items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-[#dfba5c] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            <span>Scroll</span>
            <ChevronDown className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
