let audioContext: AudioContext | null = null;
let tickBuffer: AudioBuffer | null = null;

const loadSound = async () => {
  if (typeof window === 'undefined') return;
  
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (!tickBuffer) {
    try {
      // Using a more reliable CDN or local asset if possible, but synthesis is the ultimate fallback
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
  // High frequency short burst for a "tick"
  oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);

  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.05);
};

// Pre-load the sound
if (typeof window !== 'undefined') {
  loadSound();
}

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
    // If buffer isn't ready or failed to load, use synthesized sound
    if (audioContext) {
      playSynthesizedTick(audioContext);
    }
  }
};
