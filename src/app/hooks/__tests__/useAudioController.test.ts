import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioController } from '../../hooks/useAudioController';

class FakeScriptProcessor {
    public connect = vi.fn();
    public disconnect = vi.fn();
    public onaudioprocess: ((event: any) => void) | null = null;

    triggerChunk() {
        this.onaudioprocess?.({
            inputBuffer: {
                getChannelData: () => new Float32Array([0.25, -0.5]),
            },
        });
    }
}

class FakeMediaStreamSource {
    public connect = vi.fn();
    public disconnect = vi.fn();
}

class FakeAudioContext {
    public destination = {};
    public state = 'suspended';
    createMediaStreamSource() {
        return new FakeMediaStreamSource();
    }
    createScriptProcessor() {
        return new FakeScriptProcessor();
    }
    createGain() {
        return {
            connect: vi.fn(),
        };
    }
    resume() {
        this.state = 'running';
        return Promise.resolve();
    }
    close() {
        this.state = 'closed';
        return Promise.resolve();
    }
}

describe('useAudioController', () => {
    const originalNavigator = global.navigator;
    let scriptProcessor: FakeScriptProcessor | null = null;
    let mediaStreamSource: FakeMediaStreamSource | null = null;

    beforeEach(() => {
        scriptProcessor = null;
        mediaStreamSource = null;

        const AudioContextStub = class extends FakeAudioContext {
            override createMediaStreamSource(stream: MediaStream) {
                mediaStreamSource = super.createMediaStreamSource(stream);
                return mediaStreamSource!;
            }
            override createScriptProcessor() {
                scriptProcessor = super.createScriptProcessor();
                return scriptProcessor!;
            }
        };

        vi.stubGlobal('AudioContext', AudioContextStub);
        (global as any).webkitAudioContext = AudioContextStub;

        const fakeAudioTrack = {
            stop: vi.fn(),
            readyState: 'live',
            addEventListener: vi.fn(), // ADDED: mock addEventListener
            removeEventListener: vi.fn(), // ADDED: mock removeEventListener
            getSettings: vi.fn(() => ({
                noiseSuppression: true,
                echoCancellation: true,
                autoGainControl: true,
            })),
            getCapabilities: vi.fn(() => ({
                noiseSuppression: true,
                echoCancellation: true,
                autoGainControl: true,
            })),
        } as unknown as MediaStreamTrack;

        const fakeStream = {
            getTracks: () => [fakeAudioTrack],
            getAudioTracks: () => [fakeAudioTrack],
        } as unknown as MediaStream;

        vi.stubGlobal('navigator', {
            ...originalNavigator,
            mediaDevices: {
                getUserMedia: vi.fn().mockResolvedValue(fakeStream),
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('forward audio chunks while recording', async () => {
        const { result } = renderHook(() => useAudioController());
        const chunkSpy = vi.fn();
        const startSpy = vi.fn();
        const stopSpy = vi.fn();

        act(() => {
            result.current.initializeContexts();
        });

        let summary;
        await act(async () => {
            summary = await result.current.startRecording({
                onChunk: chunkSpy,
                onStart: startSpy,
                onStop: stopSpy,
            });
        });

        expect(startSpy).toHaveBeenCalledTimes(1);
        expect(mediaStreamSource?.connect).toHaveBeenCalledTimes(1);
        expect(scriptProcessor?.connect).toHaveBeenCalledTimes(1);

        act(() => {
            scriptProcessor?.triggerChunk();
        });

        expect(chunkSpy).toHaveBeenCalledTimes(1);
        expect(chunkSpy.mock.calls[0][0]).toMatchObject({
            mimeType: 'audio/pcm;rate=16000',
        });

        expect(summary).toMatchObject({
            constraintStage: 'enhanced',
            fallbackApplied: false,
            workletUsed: false,
            platform: 'desktop',
        });

        const stopResult = result.current.stopRecording();
        expect(stopResult?.segmentMs).toBeGreaterThanOrEqual(0);
        expect(stopResult?.stoppedAt).toBeGreaterThan(0);
        expect(stopSpy).toHaveBeenCalledTimes(1);
        const [reportedSegment, reportedStoppedAt] = stopSpy.mock.calls[0];
        expect(reportedSegment).toBeGreaterThanOrEqual(0);
        expect(reportedStoppedAt).toBeGreaterThan(0);
    });

    it('geeft 0 terug wanneer contexten ontbreken bij het toevoegen van modelaudio', async () => {
        const { result } = renderHook(() => useAudioController());
        await expect(result.current.queueModelAudio('abc', 1)).resolves.toBe(0);
    });
});
