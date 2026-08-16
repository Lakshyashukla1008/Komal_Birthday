# Komal's Birthday Site — Scenes 1–3

## Files
- `index.html` — structure for all three scenes
- `style.css` — dark luxury theme + every animation (fades, glow, shake, flash, fireworks/balloon/sparkle styling)
- `script.js` — scene switching, starfield, countdown logic, fireworks/confetti particle engines, balloons & sparkles, audio

## Before you deploy
These files are already included, trimmed and synced from your uploads:

| File | Status | Used for |
|---|---|---|
| `whoosh.mp3` | ✅ included | Countdown zoom-in whoosh (3‑2‑1) |
| `firework-whistle.mp3` | ✅ included | Plays the instant a rocket launches, so the rising whistle tracks its ascent |
| `boom.mp3` | ✅ included | Plays the instant a rocket explodes, timed to the visual burst |
| `balloon-chime.mp3` | ✅ included | A single balloon "pop" as Scene 3 opens |
| `peaceful.mp3` | ✅ included | Soft ambient piano on the welcome screen, before "Begin" is tapped |
| `music.mp3` | ❌ still needed | Main background track — starts once "Begin" is tapped, loops through scenes 2 & 3 |

Add your own `music.mp3` next to `index.html` and everything is complete. If any file is ever renamed or removed, `script.js` automatically falls back to a synthesized Web Audio version of the sound effects — the site never goes silent or breaks. The countdown "beep" and the finale flash "chime" are always synthesized and need no file.

### Unlock date/time lock 🔒
The site is locked until **18 August 2026, 12:00 AM IST**. If someone taps "Begin" before that moment, they see a gift emoji and a message asking them to wait, instead of advancing. The peaceful piano keeps playing either way. Once the clock passes that moment (checked fresh on every tap, so it also works if the page was left open through midnight), tapping proceeds normally into the countdown and reveal.

To change the date/time, edit this line near the top of `script.js`'s `initApp` function:
```js
const UNLOCK_AT = new Date('2026-08-18T00:00:00+05:30').getTime();
```
The `+05:30` is the IST offset — it makes the unlock moment the same real-world instant no matter what timezone the visitor's phone is set to. Change the date/time as needed, keeping that same format.

### A note on the welcome-screen music and autoplay
Mobile browsers (iOS Safari, Chrome on Android) block **any** audio from playing before the person has touched the screen at all — this is a platform restriction, not something a website can override. So `peaceful.mp3` is wired up to:
1. Try to autoplay the instant the page loads (this actually works on many desktop browsers).
2. If that's blocked, start the moment the screen is first touched anywhere — a beat *before* that same tap's "Begin" action runs — so it plays as early as the platform allows.
3. Fade out smoothly over ~0.6s the moment "Begin" is tapped, right as the main `music.mp3` fades in.

In practice this means: on desktop it plays right away; on most phones it plays for the brief moment between the very first touch and the tap completing. If you want a guaranteed few seconds of peaceful music before any interaction, the only reliable way is a visible "🔊 tap to start" affordance — happy to add that if you'd like it instead.

### How the firework audio was synced
Your firework file (`worldlikeall-fiery-whistle-firework-missile-explodes...mp3`) actually contained a whole sequence of several whistle→boom cycles back to back. It was split into two short clips:
- `firework-whistle.mp3` — the rising whistle, fired the moment a rocket launches
- `boom.mp3` — the boom + crackle, fired the exact frame the rocket explodes

This way the sound leads into each burst instead of firing all at once. Your balloon-pop file also contained 8 repeated pops in one 13s clip; only the first, clean pop was kept for `balloon-chime.mp3`.

## Run locally
Any static server works, e.g.:
```
npx serve .
```
Opening `index.html` directly by double-click also works in most browsers, though some (older Safari) are stricter about audio without a server — GitHub Pages avoids that entirely.

## Deploy to GitHub Pages
1. Push these files to a repo (root, or a `/docs` folder).
2. Repo Settings → Pages → set the source branch/folder.
3. Visit the published URL on your phone.

## What's built so far
Scene 1 (Welcome) → Scene 2 (3‑2‑1 Countdown) → Scene 3 (Grand Reveal with fireworks, confetti, balloons, sparkles, light rays). Below the reveal, tapping "Dabaiye na" opens `surprise-video.mp4` in a full-screen modal — the background music ducks while it plays and restores on close, and a "🎉 Badhaiyaan!" caption fades in once the video finishes. Per the brief, the photo slideshow scene is **not** included yet — that's next.
