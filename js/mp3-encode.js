// Encode mono PCM to the MP3 profile already used by Forge Faith devotion audio:
// MPEG-1 Layer 3, 128 kbps, 44.1 kHz, mono, Content-Type audio/mpeg.
// The encoder is @breezystack/lamejs 1.2.7 (LGPL-3.0), vendored in js/vendor/.

const MP3_BITRATE = 128;
const BLOCK_SIZE = 1152;

function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * @param {Float32Array} samples Mono PCM in the range -1..1.
 * @param {number} sampleRate 44100, 48000, or 32000.
 * @param {(progress: number) => void} [onProgress] Called with 0..1.
 * @returns {Promise<Blob>} audio/mpeg blob
 */
export async function encodeMonoMp3(samples, sampleRate, onProgress) {
  if (!samples || !samples.length) throw new Error('No audio samples to encode.');
  if (sampleRate !== 44100 && sampleRate !== 48000 && sampleRate !== 32000) {
    throw new Error('Unexpected sample rate ' + sampleRate);
  }

  const { Mp3Encoder } = await import('./vendor/lamejs.js');
  const pcm = new Int16Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    let s = samples[i];
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    if ((i & 0x3ffff) === 0x3ffff) {
      if (onProgress) onProgress(0.15 * (i / samples.length));
      await yieldToBrowser();
    }
  }

  const encoder = new Mp3Encoder(1, sampleRate, MP3_BITRATE);
  const parts = [];
  const blocks = Math.ceil(pcm.length / BLOCK_SIZE);

  for (let block = 0; block < blocks; block++) {
    const start = block * BLOCK_SIZE;
    const encoded = encoder.encodeBuffer(pcm.subarray(start, start + BLOCK_SIZE));
    if (encoded.length) parts.push(Uint8Array.from(encoded));
    if (block % 32 === 31) {
      if (onProgress) onProgress(0.15 + 0.8 * (block / blocks));
      await yieldToBrowser();
    }
  }

  const tail = encoder.flush();
  if (tail.length) parts.push(Uint8Array.from(tail));
  if (onProgress) onProgress(1);

  return new Blob(parts, { type: 'audio/mpeg' });
}
