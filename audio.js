// Lightweight Web Audio API Synthesizer for Bloody Roar: Sudeshans
// Includes Human martial-arts vocalizations and distinct Beast animal calls

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

  function playNoiseBurst(duration, filterFreq, gainVal, type = 'lowpass', delay = 0) {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime + delay;
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
    filter.frequency.setValueAtTime(filterFreq, now);

    const gain = c.createGain();
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(now);
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

  // Formant-filtered human martial-arts vocalization (kiai / grunt)
  function playHumanVoice(kind = 'attack') {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;

    const osc = c.createOscillator();
    osc.type = 'sawtooth';

    const f1 = c.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 4.5;

    const f2 = c.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 5.5;

    const gain = c.createGain();

    let dur = 0.11;
    if (kind === 'attack') {
      // Sharp "Hah!"
      osc.frequency.setValueAtTime(165, now);
      osc.frequency.exponentialRampToValueAtTime(125, now + 0.11);
      f1.frequency.setValueAtTime(750, now);
      f2.frequency.setValueAtTime(1250, now);
      gain.gain.setValueAtTime(0.16, now);
    } else if (kind === 'heavy') {
      // Strong "Hyaa!"
      dur = 0.18;
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(135, now + 0.18);
      f1.frequency.setValueAtTime(820, now);
      f2.frequency.setValueAtTime(1550, now);
      gain.gain.setValueAtTime(0.2, now);
    } else if (kind === 'hit') {
      // Winded "Ugh!"
      dur = 0.14;
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(82, now + 0.14);
      f1.frequency.setValueAtTime(520, now);
      f2.frequency.setValueAtTime(980, now);
      gain.gain.setValueAtTime(0.18, now);
    } else {
      // Jump "Hup!"
      dur = 0.09;
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(215, now + 0.09);
      f1.frequency.setValueAtTime(600, now);
      f2.frequency.setValueAtTime(1150, now);
      gain.gain.setValueAtTime(0.12, now);
    }

    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(gain);
    f2.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + dur);
  }

  // Distinct synthesized animal sounds for each of the 6 Beast forms
  function playBeastSound(beastId, shortCall = false) {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    const scale = shortCall ? 0.55 : 1.0;

    if (beastId === 'munna') {
      // Goat: Vibrato bleat ("Maaa!")
      const dur = 0.42 * scale;
      const osc = c.createOscillator();
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      const filter = c.createBiquadFilter();
      const gain = c.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(275, now + dur);

      lfo.type = 'sine';
      lfo.frequency.value = 24;
      lfoGain.gain.value = 26;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      filter.type = 'bandpass';
      filter.frequency.value = 950;
      filter.Q.value = 2.2;

      gain.gain.setValueAtTime(0.24 * scale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + dur);
      osc.stop(now + dur);
    } else if (beastId === 'nirbhaya') {
      // Ant: Rapid insectoid mandible clicks + chitinous buzz
      const clicks = shortCall ? 3 : 6;
      for (let i = 0; i < clicks; i++) {
        playNoiseBurst(0.025, 2800 + (i % 2) * 900, 0.18, 'bandpass', i * 0.045);
        playTone(1350 + i * 120, 420, 0.035, 'square', 0.1, i * 0.045);
      }
    } else if (beastId === 'dinesh') {
      // Ganesha: Resonant spiritual horn + deep elephant trumpet
      const dur = 0.52 * scale;
      playTone(130, 195, dur, 'sawtooth', 0.18 * scale, 0);
      playTone(260, 480, dur * 0.7, 'triangle', 0.16 * scale, 0.06);
      playTone(480, 340, dur * 0.45, 'sawtooth', 0.14 * scale, dur * 0.5);
    } else if (beastId === 'sumit') {
      // Mouse: Sharp high-pitched rodent squeaks
      const squeaks = shortCall ? 2 : 3;
      for (let i = 0; i < squeaks; i++) {
        const t = i * 0.085;
        playTone(1850, 2750, 0.045, 'sine', 0.16, t);
        playTone(2750, 1550, 0.035, 'triangle', 0.12, t + 0.035);
      }
    } else if (beastId === 'vickey') {
      // Cat: Predatory panther snarl / yowl + hiss
      const dur = 0.38 * scale;
      playTone(540, 290, dur, 'sawtooth', 0.18 * scale, 0);
      playTone(620, 360, dur * 0.8, 'triangle', 0.12 * scale, 0.04);
      playNoiseBurst(0.24 * scale, 3200, 0.16 * scale, 'highpass', 0.05);
    } else if (beastId === 'adheesh') {
      // Elephant: Booming brassy trumpet + sub-bass stomp
      const dur = 0.58 * scale;
      playTone(180, 580, dur * 0.45, 'sawtooth', 0.24 * scale, 0);
      playTone(580, 410, dur * 0.55, 'sawtooth', 0.22 * scale, dur * 0.4);
      playTone(95, 48, 0.28 * scale, 'triangle', 0.22 * scale, 0);
    }
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
    playJump(isBeast = false, beastId = '') {
      playTone(190, 420, 0.14, 'sine', 0.12);
      if (isBeast) playBeastSound(beastId, true);
      else playHumanVoice('jump');
    },
    playPunch() {
      playNoiseBurst(0.07, 1600, 0.16, 'bandpass');
      playTone(280, 110, 0.06, 'triangle', 0.1);
    },
    playKick() {
      playNoiseBurst(0.11, 1100, 0.22, 'bandpass');
      playTone(220, 75, 0.11, 'sawtooth', 0.13);
    },
    playAttackVoice(beastId, isBeast, heavy = false) {
      if (isBeast) {
        playBeastSound(beastId, true);
      } else {
        playHumanVoice(heavy ? 'heavy' : 'attack');
      }
    },
    playHitVoice(beastId, isBeast) {
      if (isBeast) {
        playBeastSound(beastId, true);
      } else {
        playHumanVoice('hit');
      }
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
    playTransform(beastId = 'munna') {
      playNoiseBurst(0.35, 950, 0.24, 'bandpass');
      playTone(110, 320, 0.22, 'sawtooth', 0.16);
      playBeastSound(beastId, false);
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
