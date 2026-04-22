let audioContext: AudioContext | null = null;
let tickBuffer: AudioBuffer | null = null;

const loadSound = async () => {
  if (typeof window === 'undefined') return;
  
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (!tickBuffer) {
    try {
      const response = await fetch('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      const arrayBuffer = await response.arrayBuffer();
      tickBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error('Failed to load tick sound from URL, using synthesis fallback:', e);
    }
  }
};

// Synthesized tick sound as a reliable fallback
const playSynthesizedTick = (ctx: AudioContext) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);

  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.05);
};

// Synthesized check sound for checklist
const playSynthesizedCheck = (ctx: AudioContext) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(400, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1);
};

if (typeof window !== 'undefined') {
  loadSound();
}

// Synthesized F1 car sound
const playSynthesizedF1 = (ctx: AudioContext) => {
  const duration = 2.0;
  const now = ctx.currentTime;

  // Main engine sound (sawtooth for richness)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'sawtooth';
  osc2.type = 'square'; // Add some square wave for grit

  // Doppler effect simulation: high pitch to low pitch
  osc1.frequency.setValueAtTime(1000, now);
  osc1.frequency.exponentialRampToValueAtTime(150, now + duration);
  
  osc2.frequency.setValueAtTime(1010, now); // Slightly detuned
  osc2.frequency.exponentialRampToValueAtTime(155, now + duration);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3000, now);
  filter.frequency.exponentialRampToValueAtTime(400, now + duration);

  // Volume envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1); // Quick fade in
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
};

// Synthesized Tank sound
const playSynthesizedTank = (ctx: AudioContext) => {
  const duration = 2.5;
  const now = ctx.currentTime;

  // 1. The "Boom" (Firing)
  const boomOsc = ctx.createOscillator();
  const boomGain = ctx.createGain();
  const clickOsc = ctx.createOscillator(); // Initial "crack"
  const clickGain = ctx.createGain();
  
  boomOsc.type = 'triangle';
  boomOsc.frequency.setValueAtTime(180, now);
  boomOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
  
  boomGain.gain.setValueAtTime(1.0, now);
  boomGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

  clickOsc.type = 'square';
  clickOsc.frequency.setValueAtTime(800, now);
  clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
  clickGain.gain.setValueAtTime(0.3, now);
  clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
  
  boomOsc.connect(boomGain);
  boomGain.connect(ctx.destination);
  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);
  
  boomOsc.start(now);
  clickOsc.start(now);
  boomOsc.stop(now + 0.6);
  clickOsc.stop(now + 0.05);

  // 2. The Rumble (Engine)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const noise = ctx.createBufferSource();

  // Create some low-frequency noise for the rumble
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;

  osc1.type = 'sawtooth';
  osc2.type = 'sine';

  osc1.frequency.setValueAtTime(40, now);
  osc1.frequency.linearRampToValueAtTime(35, now + duration);
  
  osc2.frequency.setValueAtTime(60, now);
  osc2.frequency.linearRampToValueAtTime(55, now + duration);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(100, now + duration);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.4, now + 0.2);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc1.connect(filter);
  osc2.connect(filter);
  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  noise.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
  noise.stop(now + duration);
};

// Synthesized Fighter Jet sound
const playSynthesizedJet = (ctx: AudioContext) => {
  const duration = 3.0;
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  // White noise for the jet exhaust
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(120, now);
  osc1.frequency.exponentialRampToValueAtTime(80, now + duration);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(500, now + duration);
  filter.Q.value = 1.0;

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.6, now + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc1.connect(filter);
  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  noise.start(now);
  osc1.stop(now + duration);
  noise.stop(now + duration);
};

// Synthesized Mechanical Lever sound
const playSynthesizedMechanical = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const duration = 0.4;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'sawtooth';
  osc2.type = 'square';
  
  osc1.frequency.setValueAtTime(80, now);
  osc1.frequency.exponentialRampToValueAtTime(40, now + duration);
  
  osc2.frequency.setValueAtTime(120, now);
  osc2.frequency.exponentialRampToValueAtTime(60, now + duration);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, now);
  filter.frequency.exponentialRampToValueAtTime(100, now + duration);

  gainNode.gain.setValueAtTime(0.4, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
};

// Synthesized Authorization sound (Enhanced Among Us style)
const playSynthesizedAuth = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const duration = 0.8;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'square';
  // Sequence of notes resembling Among Us task completion/authorization
  const sequence = [
    { freq: 261, time: 0 },    // C4
    { freq: 392, time: 0.1 },  // G4
    { freq: 523, time: 0.2 },  // C5
    { freq: 392, time: 0.3 },  // G4
    { freq: 659, time: 0.4 },  // E5
  ];

  sequence.forEach(s => {
    osc.frequency.setValueAtTime(s.freq, now + s.time);
  });

  gainNode.gain.setValueAtTime(0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
};

export const playMechanicalSound = async () => {
  if (typeof window === 'undefined') return;
  if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioContext.state === 'suspended') await audioContext.resume();
  playSynthesizedMechanical(audioContext);
};

const oscillatorSetFrequency = (osc: OscillatorNode, freq: number, time: number) => {
  osc.frequency.setValueAtTime(freq, time);
};

export const playAuthSound = async () => {
  if (typeof window === 'undefined') return;
  if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioContext.state === 'suspended') await audioContext.resume();
  playSynthesizedAuth(audioContext);
};

export const playTankSound = async () => {
  if (typeof window === 'undefined') return;
  if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioContext.state === 'suspended') await audioContext.resume();
  playSynthesizedTank(audioContext);
};

export const playJetSound = async () => {
  if (typeof window === 'undefined') return;
  if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioContext.state === 'suspended') await audioContext.resume();
  playSynthesizedJet(audioContext);
};

export const playF1Sound = async () => {
  if (typeof window === 'undefined') return;

  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  playSynthesizedF1(audioContext);
};

export const playCheckSound = async () => {
  if (typeof window === 'undefined') return;

  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  playSynthesizedCheck(audioContext);
};

export const playTickSound = async () => {
  if (typeof window === 'undefined') return;

  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (tickBuffer && audioContext) {
    const source = audioContext.createBufferSource();
    source.buffer = tickBuffer;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3; 
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);
  } else {
    if (audioContext) {
      playSynthesizedTick(audioContext);
    }
  }
};
