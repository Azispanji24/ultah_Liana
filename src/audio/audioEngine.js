import { birthdayConfig } from '../config/birthdayConfig.js';

/**
 * AudioEngine — Romantic BGM ("Photograph — Ed Sheeran") + Studio Web Audio SFX
 *
 * Strictly obeys browser autoplay rules: audio only initializes after an explicit
 * user gesture (such as clicking "OPEN YOUR LETTER" or the music toggle).
 *
 * 3-Tier BGM Strategy:
 *  1. Local audio file (`bahan/audio/photograph.mp3`) if present on disk.
 *  2. YouTube IFrame API stream of Ed Sheeran — "Photograph" (official / acoustic fallback).
 *  3. Lush Web Audio API romantic piano & warm pad arrangement in E major ("Photograph" progression)
 *     if offline or YouTube embedding is blocked.
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.synthBgmGain = null;

    this.initialized = false;
    this.isPlaying = false;
    this.isMuted = false;
    this.volume = birthdayConfig.audio.bgm.defaultVolume ?? 0.42;

    this.bgmMode = 'idle'; // 'local' | 'youtube' | 'synth' | 'idle'
    this.localAudio = null;
    this.ytPlayer = null;
    this.ytReady = false;
    this.ytApiRequested = false;
    this.ytFallbackTimer = null;
    this.ytTriedFallbackId = false;

    this.synthTimer = null;
    this.synthStep = 0;

    this.lastSfxTime = new Map();
    this.listeners = new Set();

    // Pre-request YouTube IFrame API script silently so player is ready on click
    this._prepareYouTubeApi();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }

  getState() {
    return {
      initialized: this.initialized,
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.volume,
      bgmMode: this.bgmMode,
      trackTitle: birthdayConfig.audio.bgm.title,
      trackArtist: birthdayConfig.audio.bgm.artist,
    };
  }

  _emit() {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }

  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.masterGain);

      this.synthBgmGain = this.ctx.createGain();
      this.synthBgmGain.gain.value = 0.0001;
      this.synthBgmGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _prepareYouTubeApi() {
    if (this.ytApiRequested || typeof window === 'undefined') return;
    if (window.location.protocol === 'file:') return; // YouTube embed requires http/https origin
    this.ytApiRequested = true;

    const mountPlayer = () => {
      const container = document.getElementById('yt-bgm-player');
      if (!container || !window.YT || !window.YT.Player || this.ytPlayer) return;

      try {
        this.ytPlayer = new window.YT.Player('yt-bgm-player', {
          height: '1',
          width: '1',
          videoId: birthdayConfig.audio.bgm.youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            loop: 1,
            playlist: birthdayConfig.audio.bgm.youtubeVideoId,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              this.ytReady = true;
              if (this.initialized && this.isPlaying && this.bgmMode === 'youtube') {
                this._startYouTubePlayback();
              }
            },
            onStateChange: (ev) => {
              if (ev.data === window.YT.PlayerState.PLAYING) {
                clearTimeout(this.ytFallbackTimer);
                this._stopSynthBgm();
                this.bgmMode = 'youtube';
                this.isPlaying = true;
                this._fadeYouTubeVolume(this.isMuted ? 0 : Math.round(this.volume * 100), 2200);
                this._emit();
              } else if (ev.data === window.YT.PlayerState.ENDED) {
                try {
                  this.ytPlayer.seekTo(0);
                  this.ytPlayer.playVideo();
                } catch {}
              }
            },
            onError: () => {
              if (!this.ytTriedFallbackId && birthdayConfig.audio.bgm.youtubeFallbackId) {
                this.ytTriedFallbackId = true;
                try {
                  this.ytPlayer.loadVideoById({
                    videoId: birthdayConfig.audio.bgm.youtubeFallbackId,
                  });
                  return;
                } catch {}
              }
              if (this.isPlaying) {
                this._startSynthBgm();
              }
            },
          },
        });
      } catch {
        // Will cleanly fall back to synth
      }
    };

    if (window.YT && window.YT.Player) {
      mountPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev();
        mountPlayer();
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {};
      document.head.appendChild(tag);
    }
  }

  /**
   * Call on first explicit user interaction (e.g., clicking "OPEN YOUR LETTER").
   * Safe to call multiple times; never restarts already-playing music.
   */
  async startExperienceAudio() {
    this._ensureContext();
    if (this.initialized) {
      if (!this.isPlaying && !this.isMuted) {
        this.playBgm();
      }
      return;
    }

    this.initialized = true;
    this.isPlaying = true;
    this._emit();

    // Tier 1: Check if local MP3 exists
    const localAvailable = await this._checkLocalBgm();
    if (localAvailable) {
      this._startLocalBgm();
      return;
    }

    // Tier 2: Try YouTube IFrame stream ("Photograph — Ed Sheeran")
    if (window.location.protocol !== 'file:') {
      this.bgmMode = 'youtube';
      this._emit();

      if (this.ytReady && this.ytPlayer) {
        this._startYouTubePlayback();
      }

      // If YouTube hasn't begun playing within 4.2s (offline / blocked embed), gracefully start romantic piano arrangement
      clearTimeout(this.ytFallbackTimer);
      this.ytFallbackTimer = setTimeout(() => {
        if (!this.isPlaying) return;
        let state = -1;
        try {
          state = this.ytPlayer?.getPlayerState?.() ?? -1;
        } catch {}
        if (state !== 1) {
          this._startSynthBgm();
        }
      }, 4200);
      return;
    }

    // Tier 3: Direct offline / file:// fallback
    this._startSynthBgm();
  }

  async _checkLocalBgm() {
    const src = birthdayConfig.audio.bgm.localSrc;
    if (!src || window.location.protocol === 'file:') return false;
    try {
      const res = await fetch(src, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  _startLocalBgm() {
    this.bgmMode = 'local';
    if (!this.localAudio) {
      this.localAudio = new Audio(birthdayConfig.audio.bgm.localSrc);
      this.localAudio.loop = true;
      this.localAudio.volume = 0;
    }
    this.localAudio
      .play()
      .then(() => {
        this._fadeLocalVolume(this.isMuted ? 0 : this.volume, 2200);
        this.isPlaying = true;
        this._emit();
      })
      .catch(() => {
        this._startSynthBgm();
      });
  }

  _startYouTubePlayback() {
    if (!this.ytPlayer || !this.ytReady) return;
    try {
      this.ytPlayer.unMute();
      this.ytPlayer.setVolume(0);
      this.ytPlayer.playVideo();
    } catch {
      this._startSynthBgm();
    }
  }

  _fadeYouTubeVolume(targetVol, durationMs = 1800) {
    if (!this.ytPlayer || !this.ytReady) return;
    const steps = 18;
    const interval = durationMs / steps;
    let current = 0;
    try {
      current = this.ytPlayer.getVolume() || 0;
    } catch {}
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const t = step / steps;
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(current + (targetVol - current) * eased);
      try {
        this.ytPlayer.setVolume(val);
      } catch {}
      if (step >= steps) clearInterval(timer);
    }, interval);
  }

  _fadeLocalVolume(targetVol, durationMs = 1800) {
    if (!this.localAudio) return;
    const steps = 20;
    const start = this.localAudio.volume;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const t = step / steps;
      this.localAudio.volume = Math.max(0, Math.min(1, start + (targetVol - start) * t));
      if (step >= steps) clearInterval(timer);
    }, durationMs / steps);
  }

  /**
   * Warm acoustic-piano inspired arrangement of Ed Sheeran's "Photograph" progression:
   * E major -> C# minor -> B major -> A major (108 BPM, intimate felt-piano tone)
   */
  _startSynthBgm() {
    const ctx = this._ensureContext();
    if (!ctx) return;
    if (this.synthTimer) return;

    this.bgmMode = 'synth';
    const targetGain = this.isMuted ? 0.0001 : this.volume * 0.34;
    this.synthBgmGain.gain.cancelScheduledValues(ctx.currentTime);
    this.synthBgmGain.gain.setValueAtTime(Math.max(0.0001, this.synthBgmGain.gain.value), ctx.currentTime);
    this.synthBgmGain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 2.0);

    // Notes in Hz (E major key: E, C#m, B, A)
    const chords = [
      // E major: E3, B3, E4, G#4 + gentle top melody
      { bass: 164.81, arp: [246.94, 329.63, 415.3, 329.63, 493.88, 415.3, 329.63, 246.94] },
      // C# minor: C#3, G#3, C#4, E4
      { bass: 138.59, arp: [207.65, 277.18, 329.63, 277.18, 415.3, 329.63, 277.18, 207.65] },
      // B major: B2, F#3, B3, D#4
      { bass: 123.47, arp: [185.0, 246.94, 311.13, 246.94, 369.99, 311.13, 246.94, 185.0] },
      // A add9: A2, E3, A3, B3, C#4
      { bass: 110.0, arp: [164.81, 220.0, 277.18, 246.94, 329.63, 277.18, 220.0, 164.81] },
    ];

    const playPianoNote = (freq, duration, velocity = 0.25, delay = 0) => {
      if (!this.ctx || !this.synthBgmGain) return;
      const now = this.ctx.currentTime + delay;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.value = 0.14;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(2400, freq * 4.5), now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 1.4), now + duration);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(velocity, now + 0.025);
      env.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      osc1.connect(filter);
      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);
      filter.connect(env);
      env.connect(this.synthBgmGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.05);
      osc2.stop(now + duration + 0.05);
    };

    const tick = () => {
      if (!this.isPlaying || this.bgmMode !== 'synth') return;
      const chordIdx = Math.floor(this.synthStep / 8) % chords.length;
      const noteIdx = this.synthStep % 8;
      const chord = chords[chordIdx];

      if (noteIdx === 0) {
        playPianoNote(chord.bass, 2.8, 0.34);
        playPianoNote(chord.bass * 2, 2.4, 0.14, 0.04);
      }
      playPianoNote(chord.arp[noteIdx], 1.45, noteIdx % 2 === 0 ? 0.22 : 0.15);

      this.synthStep++;
    };

    tick();
    this.synthTimer = setInterval(tick, 410);
    this._emit();
  }

  _stopSynthBgm() {
    if (this.synthTimer) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
    if (this.ctx && this.synthBgmGain) {
      this.synthBgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.synthBgmGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);
    }
  }

  playBgm() {
    if (!this.initialized) {
      this.startExperienceAudio();
      return;
    }
    this._ensureContext();
    this.isPlaying = true;
    if (this.bgmMode === 'local' && this.localAudio) {
      this.localAudio.play().catch(() => {});
    } else if (this.bgmMode === 'youtube' && this.ytPlayer && this.ytReady) {
      try {
        this.ytPlayer.playVideo();
      } catch {}
    } else {
      this._startSynthBgm();
    }
    this._emit();
  }

  pauseBgm() {
    this.isPlaying = false;
    clearTimeout(this.ytFallbackTimer);
    if (this.bgmMode === 'local' && this.localAudio) {
      this.localAudio.pause();
    } else if (this.bgmMode === 'youtube' && this.ytPlayer && this.ytReady) {
      try {
        this.ytPlayer.pauseVideo();
      } catch {}
    } else if (this.bgmMode === 'synth') {
      this._stopSynthBgm();
    }
    this._emit();
  }

  togglePlay() {
    if (!this.initialized) {
      this.startExperienceAudio();
      return;
    }
    if (this.isPlaying) {
      this.pauseBgm();
    } else {
      this.playBgm();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this._applyVolume();
    this._emit();
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val)));
    if (this.volume > 0 && this.isMuted) {
      this.isMuted = false;
    }
    this._applyVolume();
    this._emit();
  }

  _applyVolume() {
    const effective = this.isMuted ? 0 : this.volume;
    if (this.localAudio) {
      this.localAudio.volume = effective;
    }
    if (this.ytPlayer && this.ytReady) {
      try {
        if (this.isMuted) this.ytPlayer.mute();
        else {
          this.ytPlayer.unMute();
          this.ytPlayer.setVolume(Math.round(effective * 100));
        }
      } catch {}
    }
    if (this.ctx && this.synthBgmGain) {
      this.synthBgmGain.gain.setTargetAtTime(
        Math.max(0.0001, effective * 0.34),
        this.ctx.currentTime,
        0.08
      );
    }
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.55 * (0.4 + effective * 0.6), this.ctx.currentTime, 0.05);
    }
  }

  // =========================================================================
  // STUDIO WEB AUDIO SOUND EFFECTS (Zero-latency, subtle, organic, throttled)
  // =========================================================================

  _canPlaySfx(name, minGapMs = 120) {
    if (this.isMuted) return false;
    const now = performance.now();
    const last = this.lastSfxTime.get(name) || 0;
    if (now - last < minGapMs) return false;
    this.lastSfxTime.set(name, now);
    return true;
  }

  _createNoiseBuffer(duration = 0.8) {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Soft pink noise filter for warm organic paper/breath textures
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.14) * 0.5;
    }
    return buffer;
  }

  _playBellTone(freq, delay, duration, peak = 0.12) {
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const env = ctx.createGain();
    const hGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(freq * 2, now);
    hGain.gain.value = 0.18;

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.018);
    env.gain.exponentialRampToValueAtTime(0.0004, now + duration);

    osc.connect(env);
    harmonic.connect(hGain);
    hGain.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    harmonic.start(now);
    osc.stop(now + duration + 0.05);
    harmonic.stop(now + duration + 0.05);
  }

  /** 1. Envelope wax seal break + parchment unfold + golden chime */
  playEnvelopeOpen() {
    if (!this._canPlaySfx('envelopeOpen', 400)) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Soft paper slide noise
    const noise = ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.75);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1200, now);
    bp.frequency.exponentialRampToValueAtTime(2600, now + 0.35);
    bp.Q.value = 1.4;

    const nEnv = ctx.createGain();
    nEnv.gain.setValueAtTime(0.001, now);
    nEnv.gain.linearRampToValueAtTime(0.24, now + 0.08);
    nEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    noise.connect(bp);
    bp.connect(nEnv);
    nEnv.connect(this.sfxGain);
    noise.start(now);

    // Warm ascending romantic E-major arpeggio
    const notes = [329.63, 415.3, 493.88, 659.25, 830.61];
    notes.forEach((f, idx) => this._playBellTone(f, 0.14 + idx * 0.09, 1.35, 0.09));
  }

  /** 2. Soft cinematic scene transition swell */
  playSoftTransition() {
    if (!this._canPlaySfx('softTransition', 350)) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(360, now);
    lp.frequency.exponentialRampToValueAtTime(1100, now + 0.28);
    lp.frequency.exponentialRampToValueAtTime(280, now + 0.58);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.11, now + 0.2);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    noise.connect(lp);
    lp.connect(env);
    env.connect(this.sfxGain);
    noise.start(now);

    this._playBellTone(493.88, 0.08, 0.9, 0.055);
  }

  /** 3. Magical sparkle sound (reason cards, subtle reveals) */
  playSparkle(pitchShift = 0) {
    if (!this._canPlaySfx('sparkle', 90)) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const mult = Math.pow(2, pitchShift / 12);
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((f, i) => this._playBellTone(f * mult, i * 0.055, 0.72, 0.07));
  }

  /** 4. Photo gallery click / lightbox interaction */
  playGalleryClick() {
    if (!this._canPlaySfx('galleryClick', 100)) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.12);
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 1800;
    hp.Q.value = 1.8;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.14, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(hp);
    hp.connect(env);
    env.connect(this.sfxGain);
    noise.start(now);

    this._playBellTone(587.33, 0.01, 0.32, 0.045);
  }

  /** 5. Letter opening / turning parchment page */
  playLetterOpen() {
    if (!this._canPlaySfx('letterOpen', 220)) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.45);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(950, now);
    bp.frequency.linearRampToValueAtTime(1950, now + 0.3);
    bp.Q.value = 1.1;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.18, now + 0.09);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    noise.connect(bp);
    bp.connect(env);
    env.connect(this.sfxGain);
    noise.start(now);

    this._playBellTone(329.63, 0.06, 1.1, 0.065);
    this._playBellTone(493.88, 0.16, 1.1, 0.055);
  }

  /** 6. Birthday celebration chimes & warm shimmer */
  playCelebration() {
    if (!this._canPlaySfx('celebration', 500)) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const chord = [329.63, 415.3, 493.88, 659.25, 739.99, 830.61, 987.77, 1318.51];
    chord.forEach((f, i) => {
      this._playBellTone(f, i * 0.075, 1.8, 0.085);
    });
  }

  /** 7. Soft breath/wind candle blow + magical wish twinkle */
  playCandleBlow() {
    if (!this._canPlaySfx('candleBlow', 600)) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(1.35);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(620, now);
    bp.frequency.exponentialRampToValueAtTime(1450, now + 0.35);
    bp.frequency.exponentialRampToValueAtTime(380, now + 1.25);
    bp.Q.value = 0.9;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.32, now + 0.22);
    env.gain.exponentialRampToValueAtTime(0.001, now + 1.28);

    noise.connect(bp);
    bp.connect(env);
    env.connect(this.sfxGain);
    noise.start(now);

    // Warm wish-granted chime right after candles extinguish
    const wishChime = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    wishChime.forEach((f, i) => this._playBellTone(f, 0.65 + i * 0.11, 1.9, 0.085));
  }
}

export const audioEngine = new AudioEngine();
