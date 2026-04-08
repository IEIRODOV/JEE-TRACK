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
