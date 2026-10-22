// Web Audio API Synthesizer for high-fidelity poker sound effects
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function vibrate(pattern = [30]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // ignore
    }
  }
}

// Crisp ceramic chip clink
export function playChipSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Primary clink
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(2400, now);
  osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.05);

  // Secondary rattle
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(1800, now + 0.02);
  osc2.frequency.exponentialRampToValueAtTime(900, now + 0.07);
  gain2.gain.setValueAtTime(0.3, now + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.02);
  osc2.stop(now + 0.08);

  vibrate([20]);
}

// Two quick felt knocks (Check action)
export function playCheckSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  [0, 0.12].forEach((delay) => {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  });

  vibrate([25, 50, 25]);
}

// Subtle card slide swoosh (Fold action)
export function playFoldSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);

  vibrate([15]);
}

// Chime when your turn arrives!
export function playTurnSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  [
    { freq: 523.25, time: 0 },    // C5
    { freq: 659.25, time: 0.1 },  // E5
    { freq: 783.99, time: 0.2 },  // G5
  ].forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + time);
    gain.gain.setValueAtTime(0.3, now + time);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + time);
    osc.stop(now + time + 0.35);
  });

  vibrate([50, 50, 70]);
}

// Victorious winner fanfare
export function playWinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [
    { freq: 523.25, time: 0 },    // C5
    { freq: 659.25, time: 0.12 }, // E5
    { freq: 783.99, time: 0.24 }, // G5
    { freq: 1046.5, time: 0.38 }, // C6
  ];

  notes.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + time);
    gain.gain.setValueAtTime(0.4, now + time);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + time);
    osc.stop(now + time + 0.6);
  });

  vibrate([80, 50, 80, 50, 150]);
}

// Dramatic All-In sound
export function playAllInSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);

  vibrate([100, 50, 150]);
}
