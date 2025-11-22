/**
 * Generates a silent audio buffer in PCM16 format
 * @param durationMs Duration in milliseconds (default 150ms)
 * @param sampleRate Sample rate in Hz (default 16000 to match Gemini Live API)
 * @returns ArrayBuffer containing silent PCM16 audio data
 */
export function generateSilentAudio(durationMs: number = 150, sampleRate: number = 16000): ArrayBuffer {
    const numSamples = Math.floor((durationMs / 1000) * sampleRate);
    const buffer = new ArrayBuffer(numSamples * 2); // 2 bytes per sample (PCM16)
    const view = new Int16Array(buffer);

    // Fill with zeros (silence)
    view.fill(0);

    return buffer;
}

/**
 * Converts ArrayBuffer to base64 string
 * @param buffer ArrayBuffer to convert
 * @returns Base64 encoded string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
