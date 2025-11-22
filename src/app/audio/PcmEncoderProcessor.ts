const clampSample = (sample: number): number => {
    return Math.max(-1, Math.min(1, sample));
};

const floatToInt16 = (input: Float32Array): Int16Array => {
    const buffer = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const value = clampSample(input[i]);
        buffer[i] = value < 0 ? value * 0x8000 : value * 0x7fff;
    }
    return buffer;
};

class PcmEncoderProcessor extends AudioWorkletProcessor {
    process(inputs: Float32Array[][]): boolean {
        const input = inputs[0];
        if (!input || input.length === 0) {
            return true;
        }

        const channelData = input[0];
        if (!channelData) {
            return true;
        }

        try {
            const int16 = floatToInt16(channelData);
            this.port.postMessage({ type: 'chunk', buffer: int16.buffer }, [int16.buffer]);
        } catch (error) {
            this.port.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : String(error),
            });
        }

        return true;
    }
}

registerProcessor('pcm-encoder-processor', PcmEncoderProcessor);

export {};


