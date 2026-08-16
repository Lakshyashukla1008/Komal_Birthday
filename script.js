/* =====================================================================
   BIRTHDAY WEBSITE — SCRIPT
   Vanilla JS only. Organised into small, focused controllers:
     - SceneManager   : cross-fades between the three <section class="scene">
     - Starfield       : scene 1 ambient canvas (stars + drifting particles)
     - AudioEngine     : background music + synthesized countdown beep
     - Countdown       : scene 2 "3, 2, 1" beats (zoom/glow/pulse/shake/flash)
     - Fireworks       : scene 3 realistic rocket + explosion particle system
     - Confetti        : scene 3 falling confetti
     - Decorations     : scene 3 balloons + sparkles (DOM, CSS-driven)
   Every animation loop is started only while its scene is active, and
   stopped the moment the scene is left, to keep things at 60fps on phones.
   ===================================================================== */

'use strict';

/* ---------------------------------------------------------------------
   Utility helpers
   --------------------------------------------------------------------- */
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Shared palette so every effect (fireworks, confetti, sparkles) pulls
// from the same premium gold / pink / purple / white family.
const PALETTE = ['#e8c069', '#f5dfa3', '#ff6fa0', '#ffa8c6', '#9b5de5', '#c084fc', '#f7f2ff'];

/* =====================================================================
   SCENE MANAGER
   ===================================================================== */
class SceneManager {
  constructor() {
    this.scenes = {
      welcome:   document.getElementById('scene-welcome'),
      countdown: document.getElementById('scene-countdown'),
      reveal:    document.getElementById('scene-reveal'),
    };
    this.current = 'welcome';
  }

  /**
   * Cross-fades from the current scene to `name`.
   * `onMidway` fires once the outgoing scene has fully faded out visually
   * (roughly half the CSS fade duration) so the next scene's effects can
   * be prepared just before it becomes visible.
   */
  goTo(name, { onMidway } = {}) {
    const from = this.scenes[this.current];
    const to = this.scenes[name];
    if (!to || to === from) return;

    from.classList.remove('is-active');

    const fadeMs = 900; // matches --fade-duration in CSS
    window.setTimeout(() => {
      if (typeof onMidway === 'function') onMidway();
      to.classList.add('is-active');
    }, fadeMs * 0.35);

    this.current = name;
  }
}

/* =====================================================================
   STARFIELD  (Scene 1 background)
   Slow twinkling stars + a handful of soft floating particles.
   ===================================================================== */
class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.particles = [];
    this.running = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this._resize = this._resize.bind(this);
    this._tick = this._tick.bind(this);

    this._resize();
    window.addEventListener('resize', this._resize);
  }

  _resize() {
    const { canvas } = this;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * this.dpr;
    canvas.height = h * this.dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = w;
    this.height = h;
    this._populate();
  }

  _populate() {
    const starCount = Math.round((this.width * this.height) / 5500);
    this.stars = Array.from({ length: clamp(starCount, 60, 160) }, () => ({
      x: rand(0, this.width),
      y: rand(0, this.height),
      r: rand(0.4, 1.6),
      baseAlpha: rand(0.25, 0.9),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.4, 1.1), // twinkle speed
    }));

    this.particles = Array.from({ length: 22 }, () => ({
      x: rand(0, this.width),
      y: rand(0, this.height),
      r: rand(1, 2.6),
      color: pick(['rgba(232,192,105,', 'rgba(155,93,229,', 'rgba(255,111,160,']),
      driftX: rand(-0.06, 0.06),
      driftY: rand(-0.12, -0.03), // very slow upward drift
      alpha: rand(0.15, 0.5),
    }));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
  }

  _tick(now) {
    if (!this.running) return;
    const dt = Math.min(now - this._last, 50);
    this._last = now;
    this._draw(now, dt);
    requestAnimationFrame(this._tick);
  }

  _draw(now, dt) {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    // Twinkling stars
    for (const s of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(now * 0.001 * s.speed + s.phase);
      const alpha = s.baseAlpha * (0.4 + 0.6 * twinkle);
      ctx.beginPath();
      ctx.fillStyle = `rgba(247, 242, 255, ${alpha.toFixed(3)})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Slow floating glow particles
    for (const p of this.particles) {
      p.x += p.driftX * (dt / 16);
      p.y += p.driftY * (dt / 16);
      if (p.y < -10) p.y = height + 10;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      gradient.addColorStop(0, p.color + p.alpha + ')');
      gradient.addColorStop(1, p.color + '0)');
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* =====================================================================
   AUDIO ENGINE
   Background <audio> element for music, plus sound effects for the
   countdown beep/whoosh, firework booms, and balloon chime.

   Effects are loaded from small mp3 files if present:
     whoosh.mp3          — countdown zoom-in whoosh
     boom.mp3            — firework explosion boom/crackle
     balloon-chime.mp3   — soft chime when balloons start floating

   If a file is missing or fails to load, each effect silently falls
   back to a synthesized Web Audio version, so the site never breaks
   or goes silent just because a file wasn't supplied.
   ===================================================================== */
class AudioEngine {
  constructor() {
    this.music = document.getElementById('bg-music');
    this.welcomeMusic = document.getElementById('welcome-music');
    this.ctx = null; // created lazily (some browsers require a user gesture)
    this.buffers = {}; // decoded AudioBuffers keyed by effect name
    this._welcomeMusicStarted = false;
    this._effectFiles = {
      whoosh: 'whoosh.mp3',
      boom: 'boom.mp3',
      chime: 'balloon-chime.mp3',
      whistle: 'firework-whistle.mp3',
    };
  }

  _ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /**
   * Fetches + decodes each optional effect file. Safe to call immediately
   * on page load — fetching/decoding doesn't require a user gesture, only
   * starting playback does. Missing files are simply skipped.
   */
  async loadEffects() {
    const ctx = this._ensureContext();
    await Promise.all(
      Object.entries(this._effectFiles).map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const arrayBuffer = await res.arrayBuffer();
          this.buffers[key] = await ctx.decodeAudioData(arrayBuffer);
        } catch (err) {
          // File missing or blocked — fine, fallback synth will be used.
        }
      })
    );
  }

  /**
   * Attempts to start the peaceful welcome-screen music as early as
   * possible. Called once on page load (may be silently blocked by the
   * browser's autoplay policy) and again on the very first touch/click
   * anywhere on the page, so — where autoplay is blocked — it still
   * starts the instant a finger touches the screen, just ahead of the
   * tap's own "Begin" action.
   */
  tryStartWelcomeMusic() {
    if (this._welcomeMusicStarted || !this.welcomeMusic) return;
    this.welcomeMusic.volume = 0.45;
    const p = this.welcomeMusic.play();
    if (p && typeof p.then === 'function') {
      p.then(() => { this._welcomeMusicStarted = true; }).catch(() => {
        // Blocked (no user gesture yet) — the interaction-based retry will catch it.
      });
    } else {
      this._welcomeMusicStarted = true;
    }
  }

  /** Smoothly fades the welcome music out and stops it once "Begin" is tapped. */
  stopWelcomeMusic(fadeMs = 600) {
    const el = this.welcomeMusic;
    if (!el || el.paused) return;
    const startVolume = el.volume;
    const startTime = performance.now();

    const step = (now) => {
      const t = clamp((now - startTime) / fadeMs, 0, 1);
      el.volume = startVolume * (1 - t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.pause();
        el.currentTime = 0;
      }
    };
    requestAnimationFrame(step);
  }

  /** Call on the very first user tap. */
  unlockAndPlayMusic() {
    this._ensureContext();
    if (this.music) {
      this.music.volume = 0.55;
      const p = this.music.play();
      // Some browsers reject the promise if the file is missing/blocked;
      // fail silently so the experience still proceeds.
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }

  /** Smoothly lowers the main background music (e.g. while the surprise video plays). */
  duckMusic(targetVolume = 0.12, fadeMs = 400) {
    const el = this.music;
    if (!el) return;
    this._preDuckVolume = el.volume;
    this._animateVolume(el, targetVolume, fadeMs);
  }

  /** Restores the main background music to its previous volume. */
  restoreMusic(fadeMs = 400) {
    const el = this.music;
    if (!el) return;
    const target = this._preDuckVolume != null ? this._preDuckVolume : 0.55;
    this._animateVolume(el, target, fadeMs);
  }

  _animateVolume(el, target, durationMs) {
    const start = el.volume;
    const startTime = performance.now();
    const step = (now) => {
      const t = clamp((now - startTime) / durationMs, 0, 1);
      el.volume = start + (target - start) * t;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Plays a decoded buffer with its own gain + optional slight pitch variance. */
  _playBuffer(key, { volume = 0.6, rateJitter = 0 } = {}) {
    const ctx = this._ensureContext();
    const buffer = this.buffers[key];
    if (!buffer) return false;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = 1 + rand(-rateJitter, rateJitter);
    gain.gain.value = volume;

    source.connect(gain).connect(ctx.destination);
    source.start();
    return true;
  }

  /** Builds a short burst of white noise, used by the synthesized fallbacks. */
  _createNoiseBuffer(duration) {
    const ctx = this._ensureContext();
    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Short cinematic countdown "beep" — a quick sine ping with a fast decay. */
  playBeep(frequency = 880) {
    const ctx = this._ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  /** Countdown zoom-in "whoosh" — plays whoosh.mp3 if provided, else synthesizes one. */
  playWhoosh() {
    if (this._playBuffer('whoosh', { volume: 0.55, rateJitter: 0.05 })) return;

    const ctx = this._ensureContext();
    const noise = ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.35);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.34);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.36);
  }

  /** Firework launch "whistle" — plays firework-whistle.mp3 if provided, else a rising tone sweep. */
  playFireworkWhistle({ volume = 0.4 } = {}) {
    if (this._playBuffer('whistle', { volume, rateJitter: 0.06 })) return;

    const ctx = this._ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 1.1);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume * 0.4, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.25);
  }

  /** Firework "boom + crackle" — plays boom.mp3 if provided, else synthesizes one. */
  playBoom({ volume = 0.5 } = {}) {
    if (this._playBuffer('boom', { volume, rateJitter: 0.08 })) return;

    const ctx = this._ensureContext();

    // Low thump
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.35);
    oscGain.gain.setValueAtTime(volume * 0.8, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);

    // Crackle (short filtered noise burst)
    const noise = ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.35, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.46);
  }

  /** Soft balloon chime — plays balloon-chime.mp3 if provided, else a gentle arpeggio. */
  playBalloonChime() {
    if (this._playBuffer('chime', { volume: 0.4 })) return;

    const ctx = this._ensureContext();
    [523.25, 659.25, 784.0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.14;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.15);
    });
  }

  /** Bright ascending "flash" chime for the finale white flash. */
  playFinaleChime() {
    const ctx = this._ensureContext();
    [660, 880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
  }
}

/* =====================================================================
   COUNTDOWN  (Scene 2)
   Handles the 3 → 2 → 1 sequence: zoom-in with glow, a brief hold pulse,
   a screen shake + quick flash + beep on every beat, then a big white
   flash + chime once "1" disappears, before handing off to Scene 3.
   ===================================================================== */
class Countdown {
  constructor({ numberEl, appEl, flashEl, audio, onComplete }) {
    this.numberEl = numberEl;
    this.appEl = appEl;
    this.flashEl = flashEl;
    this.audio = audio;
    this.onComplete = onComplete;
    this.sequence = [3, 2, 1];
  }

  start() {
    this._runBeat(0);
  }

  _runBeat(index) {
    if (index >= this.sequence.length) {
      this._finale();
      return;
    }

    const value = this.sequence[index];
    const el = this.numberEl;

    // Reset element state, then trigger the "zoom in + glow" entrance.
    el.textContent = String(value);
    el.className = 'countdown-number';
    // Force reflow so the animation restarts cleanly on repeated beats.
    void el.offsetWidth;
    el.classList.add('is-beat');

    // Punch: shake + flash + whoosh + beep, timed with the zoom's peak impact.
    this._shake();
    this._quickFlash();
    this.audio.playWhoosh();
    this.audio.playBeep(880 - index * 90);

    // After the entrance finishes, settle into a slow breathing hold.
    window.setTimeout(() => {
      el.classList.remove('is-beat');
      el.classList.add('is-holding');
    }, 550);

    // Hold for a beat, then animate out and move to the next number.
    window.setTimeout(() => {
      el.classList.remove('is-holding');
      el.classList.add('is-out');
      window.setTimeout(() => this._runBeat(index + 1), 320);
    }, 1250);
  }

  _shake() {
    this.appEl.classList.remove('is-shaking');
    void this.appEl.offsetWidth;
    this.appEl.classList.add('is-shaking');
    window.setTimeout(() => this.appEl.classList.remove('is-shaking'), 280);
  }

  _quickFlash() {
    this.flashEl.classList.remove('is-flashing');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('is-flashing');
    window.setTimeout(() => this.flashEl.classList.remove('is-flashing'), 280);
  }

  _finale() {
    this.numberEl.textContent = '';
    this.flashEl.classList.add('is-flashing-big');
    this.audio.playFinaleChime();

    window.setTimeout(() => {
      this.flashEl.classList.remove('is-flashing-big');
      if (typeof this.onComplete === 'function') this.onComplete();
    }, 650);
  }
}

/* =====================================================================
   FIREWORKS  (Scene 3)
   Realistic rocket-launch + multi-particle burst simulation with gravity,
   drag, trails, twinkle and a secondary "crackle" burst — not flat dots.
   ===================================================================== */
class Fireworks {
  constructor(canvas, audio) {
    this.canvas = canvas;
    this.audio = audio;
    this.ctx = canvas.getContext('2d');
    this.rockets = [];
    this.particles = [];
    this.running = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this._resize = this._resize.bind(this);
    this._tick = this._tick.bind(this);

    this._resize();
    window.addEventListener('resize', this._resize);
  }

  _resize() {
    const { canvas } = this;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * this.dpr;
    canvas.height = h * this.dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = w;
    this.height = h;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._nextLaunch = 0;
    requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    this.rockets = [];
    this.particles = [];
  }

  /** Launches one rocket from near the bottom toward a random target height. */
  _launchRocket(now) {
    const startX = rand(this.width * 0.15, this.width * 0.85);
    const targetY = rand(this.height * 0.18, this.height * 0.45);
    const color = pick(PALETTE);

    if (this.audio) this.audio.playFireworkWhistle({ volume: rand(0.3, 0.42) });

    this.rockets.push({
      x: startX,
      y: this.height + 10,
      targetY,
      vx: rand(-0.3, 0.3),
      vy: rand(-9.5, -8),
      color,
      trail: [],
    });
  }

  /** Explodes a rocket into a realistic radial particle burst. */
  _explode(rocket) {
    if (this.audio) this.audio.playBoom({ volume: rand(0.32, 0.5) });

    const count = randInt(46, 70);
    const baseHue = rocket.color;
    const isMultiColor = Math.random() < 0.5;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + rand(-0.06, 0.06);
      const speed = rand(1.6, 4.6);
      this.particles.push({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: isMultiColor ? pick(PALETTE) : baseHue,
        life: 1,
        decay: rand(0.010, 0.018),
        size: rand(1.4, 2.6),
        gravity: 0.045,
        drag: 0.985,
        spark: Math.random() < 0.35, // some particles get a bright twinkle
      });
    }

    // Secondary "crackle" — a few particles pop again after a short delay.
    if (Math.random() < 0.6) {
      window.setTimeout(() => {
        if (!this.running) return;
        for (let i = 0; i < randInt(10, 16); i++) {
          const angle = rand(0, Math.PI * 2);
          const speed = rand(0.6, 2.2);
          this.particles.push({
            x: rocket.x + rand(-14, 14),
            y: rocket.y + rand(-14, 14),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: pick(PALETTE),
            life: 1,
            decay: rand(0.02, 0.035),
            size: rand(1, 1.8),
            gravity: 0.03,
            drag: 0.98,
            spark: true,
          });
        }
      }, rand(180, 320));
    }
  }

  _tick(now) {
    if (!this.running) return;
    const dt = Math.min(now - this._last, 50);
    this._last = now;

    // Launch a new rocket every ~900–1700ms.
    if (now >= this._nextLaunch) {
      this._launchRocket(now);
      this._nextLaunch = now + rand(900, 1700);
    }

    this._update(dt);
    this._draw();
    requestAnimationFrame(this._tick);
  }

  _update(dt) {
    const step = dt / 16;

    // Rockets: rise, leave a fading trail, explode near their target height.
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.trail.push({ x: r.x, y: r.y, life: 1 });
      if (r.trail.length > 10) r.trail.shift();
      for (const t of r.trail) t.life -= 0.09;

      r.x += r.vx * step;
      r.y += r.vy * step;
      r.vy += 0.02 * step; // gentle deceleration on the way up

      if (r.y <= r.targetY || r.vy > -0.6) {
        this._explode(r);
        this.rockets.splice(i, 1);
      }
    }

    // Explosion particles: gravity, drag, fade out.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.life -= p.decay * step;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  _draw() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    // Rocket trails
    for (const r of this.rockets) {
      for (const t of r.trail) {
        if (t.life <= 0) continue;
        ctx.beginPath();
        ctx.fillStyle = this._withAlpha(r.color, t.life * 0.5);
        ctx.arc(t.x, t.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Rocket head glow
      ctx.beginPath();
      ctx.fillStyle = this._withAlpha(r.color, 0.9);
      ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Explosion particles with soft glow; occasional twinkle on "spark" ones
    for (const p of this.particles) {
      const twinkle = p.spark ? 0.6 + 0.4 * Math.sin(p.life * 40) : 1;
      const alpha = clamp(p.life, 0, 1) * twinkle;

      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
      glow.addColorStop(0, this._withAlpha(p.color, alpha));
      glow.addColorStop(1, this._withAlpha(p.color, 0));
      ctx.beginPath();
      ctx.fillStyle = glow;
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = this._withAlpha(p.color, alpha);
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  _withAlpha(hex, alpha) {
    // hex like #e8c069 -> rgba(...)
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
  }
}

/* =====================================================================
   CONFETTI  (Scene 3)
   Falling rectangles with rotation + gentle horizontal sway, drawn on
   their own canvas layer above the fireworks.
   ===================================================================== */
class Confetti {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pieces = [];
    this.running = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this._resize = this._resize.bind(this);
    this._tick = this._tick.bind(this);

    this._resize();
    window.addEventListener('resize', this._resize);
  }

  _resize() {
    const { canvas } = this;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * this.dpr;
    canvas.height = h * this.dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = w;
    this.height = h;
  }

  _spawn(count) {
    for (let i = 0; i < count; i++) {
      this.pieces.push({
        x: rand(0, this.width),
        y: rand(-this.height, 0),
        w: rand(5, 9),
        h: rand(9, 15),
        color: pick(PALETTE),
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.06, 0.06),
        vy: rand(1.2, 2.6),
        swaySpeed: rand(0.6, 1.4),
        swayAmp: rand(10, 30),
        phase: rand(0, Math.PI * 2),
        baseX: 0,
      });
    }
    for (const p of this.pieces) p.baseX = p.x;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.pieces = [];
    this._spawn(90);
    this._last = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    this.pieces = [];
  }

  _tick(now) {
    if (!this.running) return;
    const dt = Math.min(now - this._last, 50);
    this._last = now;
    this._update(now, dt);
    this._draw();
    requestAnimationFrame(this._tick);
  }

  _update(now, dt) {
    const step = dt / 16;
    for (const p of this.pieces) {
      p.y += p.vy * step;
      p.rot += p.rotSpeed * step;
      p.x = p.baseX + Math.sin(now * 0.001 * p.swaySpeed + p.phase) * p.swayAmp;

      if (p.y > this.height + 20) {
        p.y = -20;
        p.baseX = rand(0, this.width);
      }
    }
  }

  _draw() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);
    for (const p of this.pieces) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }
}

/* =====================================================================
   DECORATIONS  (Scene 3)
   Rising balloons + twinkling sparkles, implemented as lightweight DOM
   nodes so their looping animation is handled entirely by CSS.
   ===================================================================== */
class Decorations {
  constructor(balloonsLayer, sparklesLayer, audio) {
    this.balloonsLayer = balloonsLayer;
    this.sparklesLayer = sparklesLayer;
    this.audio = audio;
    this._built = false;
  }

  build() {
    if (this._built) return;
    this._built = true;
    this._buildBalloons();
    this._buildSparkles();
    if (this.audio) this.audio.playBalloonChime();
  }

  _buildBalloons() {
    const colors = [
      ['#ffb3cf', '#ff6fa0'], // pink
      ['#e9d8ff', '#9b5de5'], // purple
      ['#fbe6a8', '#e8c069'], // gold
      ['#ffffff', '#d8cdf0'], // white/lilac
    ];
    const count = 10;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const [light, dark] = pick(colors);
      const el = document.createElement('div');
      el.className = 'balloon';
      el.style.setProperty('--x', `${rand(4, 92)}vw`);
      el.style.setProperty('--size', `${rand(38, 60)}px`);
      el.style.setProperty('--duration', `${rand(11, 19)}s`);
      el.style.setProperty('--delay', `${rand(0, 8)}s`);
      el.style.setProperty('--balloon-light', light);
      el.style.setProperty('--balloon-dark', dark);
      frag.appendChild(el);
    }
    this.balloonsLayer.appendChild(frag);
  }

  _buildSparkles() {
    const count = 40;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'sparkle';
      el.style.setProperty('--x', `${rand(0, 100)}vw`);
      el.style.setProperty('--y', `${rand(0, 100)}vh`);
      el.style.setProperty('--size', `${rand(2, 5)}px`);
      el.style.setProperty('--duration', `${rand(1.8, 4)}s`);
      el.style.setProperty('--delay', `${rand(0, 4)}s`);
      el.style.setProperty('--sparkle-color', pick(PALETTE));
      frag.appendChild(el);
    }
    this.sparklesLayer.appendChild(frag);
  }
}

/* =====================================================================
   VIDEO SURPRISE  (Scene 3 — "Dabaiye na" button)
   Opens a full-screen modal with the surprise video, ducks the main
   background music while it plays, restores it on close, and reveals a
   "Badhaiyaan" caption once the video finishes.
   ===================================================================== */
class VideoSurprise {
  constructor({ triggerBtn, modal, closeBtn, video, caption, audio }) {
    this.triggerBtn = triggerBtn;
    this.modal = modal;
    this.closeBtn = closeBtn;
    this.video = video;
    this.caption = caption;
    this.audio = audio;

    this.triggerBtn.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    // Tapping the dimmed backdrop (but not the video itself) also closes it.
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
    this.video.addEventListener('ended', () => this.caption.classList.add('is-visible'));
  }

  open() {
    this.caption.classList.remove('is-visible');
    this.modal.classList.add('is-open');
    this.modal.setAttribute('aria-hidden', 'false');
    this.audio.duckMusic();

    this.video.currentTime = 0;
    const p = this.video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  close() {
    this.modal.classList.remove('is-open');
    this.modal.setAttribute('aria-hidden', 'true');
    this.video.pause();
    this.audio.restoreMusic();
  }
}

/* =====================================================================
   APP BOOTSTRAPh
   ===================================================================== */
(function initApp() {
  const appEl = document.getElementById('app');

  // The site "opens" at this moment (IST). Before it, tapping "Begin" shows
  // the lock-message instead of advancing. Uses an explicit +05:30 offset
  // so it unlocks at the right time regardless of the visitor's own
  // device timezone.
  const UNLOCK_AT = new Date('2026-08-18T00:00:00+05:30').getTime();
  const isLocked = () => Date.now() < UNLOCK_AT;

  const lockMessageEl = document.getElementById('lock-message');
  let lockMessageTimer = null;

  function showLockMessage() {
    if (lockMessageTimer) window.clearTimeout(lockMessageTimer);
    lockMessageEl.classList.remove('is-visible');
    void lockMessageEl.offsetWidth; // restart the pop animation if tapped again
    lockMessageEl.classList.add('is-visible');
    lockMessageTimer = window.setTimeout(() => {
      lockMessageEl.classList.remove('is-visible');
    }, 2600);
  }

  const sceneManager = new SceneManager();
  const audio = new AudioEngine();
  audio.loadEffects(); // fetch whoosh/boom/chime/whistle mp3s now if present; safe pre-gesture

  // Try to start the peaceful welcome music immediately (works in some
  // browsers). Where autoplay is blocked, this fires again on the very
  // first touch/click anywhere on the page — ahead of that same tap's
  // "Begin" handler — so it still starts the instant the screen is touched.
  audio.tryStartWelcomeMusic();
  ['touchstart', 'mousedown'].forEach((evt) => {
    window.addEventListener(evt, () => audio.tryStartWelcomeMusic(), { once: true, passive: true });
  });

  const starfield = new Starfield(document.getElementById('starfield-canvas'));
  starfield.start(); // ambient scene 1 effect runs as soon as the page loads

  const fireworks = new Fireworks(document.getElementById('fireworks-canvas'), audio);
  const confetti = new Confetti(document.getElementById('confetti-canvas'));
  const decorations = new Decorations(
    document.getElementById('balloons-layer'),
    document.getElementById('sparkles-layer'),
    audio
  );

  const countdown = new Countdown({
    numberEl: document.getElementById('countdown-number'),
    appEl,
    flashEl: document.getElementById('flash-overlay'),
    audio,
    onComplete: () => {
      sceneManager.goTo('reveal', {
        onMidway: () => {
          decorations.build();
          fireworks.start();
          confetti.start();
        },
      });
    },
  });

  const videoSurprise = new VideoSurprise({
    triggerBtn: document.getElementById('video-trigger-btn'),
    modal: document.getElementById('video-modal'),
    closeBtn: document.getElementById('video-close-btn'),
    video: document.getElementById('surprise-video'),
    caption: document.getElementById('video-end-caption'),
    audio,
  });

  let hasBegun = false;

  function begin() {
    if (hasBegun) return;

    if (isLocked()) {
      showLockMessage();
      return;
    }
    hasBegun = true;

    audio.stopWelcomeMusic();
    audio.unlockAndPlayMusic();

    document.getElementById('scene-welcome').classList.add('is-leaving');
    sceneManager.goTo('countdown', {
      onMidway: () => {
        starfield.stop();
        countdown.start();
      },
    });
  }

  // "Tap Anywhere To Begin" — the whole welcome scene is tappable, not
  // just the button, per the brief.
  document.getElementById('scene-welcome').addEventListener('click', begin);
  document.getElementById('begin-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    begin();
  });

  // Also allow keyboard activation (Enter/Space) for accessibility.
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !hasBegun) begin();
  });
})();
