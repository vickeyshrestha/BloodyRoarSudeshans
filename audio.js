// Lightweight Web Audio API Synthesizer for Bloody Roar: Sudeshans

const SoundFX = (() => {
  let ctx = null;
  let muted = false;

  function ensureContext() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playNoiseBurst(duration, filterFreq, gainVal, type = 'lowpass') {
    const c = ensureContext();
    if (!c) return;
    const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const src = c.createBufferSource();
    src.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(filterFreq, c.currentTime);

    const gain = c.createGain();
    gain.gain.setValueAtTime(gainVal, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start();
  }

  function playTone(freqStart, freqEnd, duration, oscType = 'sawtooth', gainVal = 0.18, delay = 0) {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = oscType;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  return {
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    playMenuSelect() {
      playTone(520, 680, 0.06, 'triangle', 0.12);
    },
    playMenuConfirm() {
      playTone(440, 880, 0.12, 'square', 0.12);
      playTone(660, 1120, 0.14, 'triangle', 0.12, 0.06);
    },
    playJump() {
      playTone(190, 460, 0.14, 'sine', 0.13);
    },
    playPunch() {
      playNoiseBurst(0.07, 1600, 0.16, 'bandpass');
      playTone(280, 110, 0.06, 'triangle', 0.1);
    },
    playKick() {
      playNoiseBurst(0.11, 1100, 0.22, 'bandpass');
      playTone(220, 75, 0.11, 'sawtooth', 0.13);
    },
    playHit(heavy = false) {
      if (heavy) {
        playNoiseBurst(0.16, 750, 0.34, 'lowpass');
        playTone(150, 42, 0.18, 'sawtooth', 0.26);
      } else {
        playNoiseBurst(0.09, 1200, 0.24, 'lowpass');
        playTone(210, 70, 0.1, 'square', 0.16);
      }
    },
    playBlock() {
      playTone(720, 420, 0.08, 'square', 0.14);
      playTone(1080, 640, 0.09, 'triangle', 0.12, 0.02);
    },
    playTransform() {
      playNoiseBurst(0.45, 950, 0.32, 'bandpass');
      playTone(110, 340, 0.22, 'sawtooth', 0.22);
      playTone(340, 85, 0.36, 'sawtooth', 0.24, 0.15);
      playTone(520, 780, 0.28, 'triangle', 0.14, 0.08);
    },
    playRoundStart() {
      playTone(330, 440, 0.12, 'square', 0.12);
      playTone(440, 660, 0.18, 'square', 0.14, 0.12);
    },
    playKO() {
      playNoiseBurst(0.42, 550, 0.35, 'lowpass');
      playTone(440, 110, 0.45, 'sawtooth', 0.22);
      playTone(330, 82, 0.52, 'square', 0.18, 0.12);
    }
  };
})();
