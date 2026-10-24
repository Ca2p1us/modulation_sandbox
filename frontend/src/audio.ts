const PLAYBACK_GAIN = 0.7;

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function decodePcmBase64(pcmB64: string): Float32Array {
  const binary = atob(pcmB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}

export function stopPlayback(): void {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      /* already stopped */
    }
    currentSource.disconnect();
    currentSource = null;
  }
  if (currentGain) {
    currentGain.disconnect();
    currentGain = null;
  }
}

export async function playPcm(
  pcm: Float32Array,
  sampleRate: number,
  onEnded: () => void,
): Promise<void> {
  const ctx = getContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  stopPlayback();

  const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
  buffer.getChannelData(0).set(pcm);

  const gain = ctx.createGain();
  gain.gain.value = PLAYBACK_GAIN;
  gain.connect(ctx.destination);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  source.onended = () => {
    if (currentSource === source) {
      currentSource = null;
      currentGain = null;
    }
    onEnded();
  };

  currentSource = source;
  currentGain = gain;
  source.start();
}
