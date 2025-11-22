import { useCallback, useRef, useMemo } from 'react';
import { decode, decodeAudioData, encode } from '@/utils/audioUtils';
import { logEvent } from '@/utils/logger';

const PCM_SAMPLE_RATE = 16000;
const PCM_MIME_TYPE = `audio/pcm;rate=${PCM_SAMPLE_RATE}`;
const PCM_WORKLET_ID = 'pcm-encoder-processor';
const PCM_WORKLET_URL = new URL('../audio/PcmEncoderWorklet.js?url', import.meta.url);
const VAD_THRESHOLD = 400; // Drempelwaarde voor spraakdetectie (Int16 amplitude)

type RecordingPlatform = 'desktop' | 'mobile' | 'unknown';

export interface RecordingStartResult {
    platform: RecordingPlatform;
    constraintStage: 'enhanced' | 'reduced' | 'minimal' | 'default';
    fallbackApplied: boolean;
    workletUsed: boolean;
    workletFallbackReason?: string | null;
    requestedConstraints: MediaStreamConstraints;
    appliedConstraints: MediaStreamConstraints;
    trackSettings: MediaTrackSettings | null;
    trackCapabilities: MediaTrackCapabilities | null;
}

export interface RecordingStopResult {
    segmentMs: number;
    stoppedAt: number;
}

interface StartRecordingOptions {
    onChunk: (pcm: { data: string; mimeType: string; isSpeaking: boolean; durationMs: number; rms: number }) => void;
    onStart?: (timestamp: number) => void;
    onStop?: (segmentMs: number, stoppedAt: number) => void;
    onError?: (error: unknown) => void;
}

interface AudioController {
    initializeContexts: () => void;
    cleanup: () => void;
    startRecording: (options: StartRecordingOptions) => Promise<RecordingStartResult>;
    stopRecording: () => RecordingStopResult | null;
    queueModelAudio: (base64Audio: string, playbackRate: number) => Promise<number>;
    stopPlayback: () => void;
}

const isMobilePlatform = (): boolean => {
    if (typeof navigator === 'undefined') {
        return false;
    }
    return /Mobi|Android|iP(ad|hone)/i.test(navigator.userAgent);
};

const AUDIO_CONSTRAINT_STAGES: Array<{
    stage: RecordingStartResult['constraintStage'];
    constraints: MediaStreamConstraints;
}> = [
        {
            stage: 'enhanced',
            constraints: {
                audio: {
                    channelCount: 1,
                    sampleRate: PCM_SAMPLE_RATE,
                    sampleSize: 16,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            },
        },
        {
            stage: 'reduced',
            constraints: {
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            },
        },
        {
            stage: 'minimal',
            constraints: {
                audio: {
                    channelCount: 1,
                },
            },
        },
        {
            stage: 'default',
            constraints: {
                audio: true,
            },
        },
    ];

const createInt16FromFloat = (inputData: Float32Array): Int16Array => {
    const length = inputData.length;
    const int16 = new Int16Array(length);
    for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, inputData[i]));
        int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return int16;
};

const calculateRMS = (samples: Int16Array) => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
};

export const useAudioController = (): AudioController => {
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const workletGainNodeRef = useRef<GainNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputGainNodeRef = useRef<GainNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const recordingStartedAtRef = useRef<number | null>(null);
    const onStopCallbackRef = useRef<StartRecordingOptions['onStop'] | null>(null);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const nextStartTimeRef = useRef(0);
    const workletModuleLoadedRef = useRef(false);
    const lastWorkletFallbackReasonRef = useRef<string | null>(null);

    const initializeContexts = useCallback(() => {
        if (!inputAudioContextRef.current) {
            inputAudioContextRef.current = new (window.AudioContext ||
                (window as any).webkitAudioContext)({ sampleRate: 16000 });
        }
        if (!outputAudioContextRef.current) {
            outputAudioContextRef.current = new (window.AudioContext ||
                (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const gainNode = outputAudioContextRef.current.createGain();
            gainNode.connect(outputAudioContextRef.current.destination);
            outputGainNodeRef.current = gainNode;
        }
    }, []);

    const cleanup = useCallback(() => {
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.port.onmessage = null;
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current = null;
        }
        if (workletGainNodeRef.current) {
            workletGainNodeRef.current.disconnect();
            workletGainNodeRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        onStopCallbackRef.current = null;
        lastWorkletFallbackReasonRef.current = null;
    }, []);

    const startRecording = useCallback(
        async ({ onChunk, onStart, onStop, onError }: StartRecordingOptions) => {
            try {
                if (!inputAudioContextRef.current) {
                    throw new Error('Input audio context is niet geïnitialiseerd.');
                }
                
                // CRITICAL: Resume audio context if suspended (browser autoplay policy)
                if (inputAudioContextRef.current.state === 'suspended') {
                    await inputAudioContextRef.current.resume();
                }
                
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('Microfoon niet beschikbaar op dit apparaat.');
                }

                // Check microphone permission status
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                    
                    if (permissionStatus.state === 'denied') {
                        throw new Error('Microfoon permissie is geweigerd. Controleer je browser instellingen en geef toegang tot de microfoon.');
                    }
                    
                    // Monitor permission changes
                    permissionStatus.onchange = () => {
                        if (permissionStatus.state === 'denied') {
                            console.warn('⚠️ Microfoon permissie is geweigerd!');
                        }
                    };
                } catch (permError) {
                    // Permissions API might not be supported, continue anyway
                }

                let stream: MediaStream | null = null;
                let appliedStage: RecordingStartResult['constraintStage'] = 'default';
                let appliedConstraints: MediaStreamConstraints = { audio: true };
                let lastError: unknown = null;

                for (const attempt of AUDIO_CONSTRAINT_STAGES) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia(attempt.constraints);
                        appliedStage = attempt.stage;
                        appliedConstraints = attempt.constraints;
                        break;
                    } catch (error) {
                        lastError = error;
                        
                        // Provide helpful error messages
                        if (error instanceof Error) {
                            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                                throw new Error('Microfoon permissie geweigerd. Klik op het slotje in de adresbalk en geef toegang tot de microfoon.');
                            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                                throw new Error('Geen microfoon gevonden. Controleer of er een microfoon is aangesloten.');
                            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                                throw new Error('Microfoon wordt al gebruikt door een andere applicatie. Sluit andere apps die de microfoon gebruiken.');
                            }
                        }
                    }
                }

                if (!stream) {
                    // Provide user-friendly error message
                    if (lastError instanceof Error) {
                        throw lastError;
                    }
                    throw new Error('Kon geen microfoonstream openen. Controleer je microfoon instellingen.');
                }

                const startedAt = Date.now();
                recordingStartedAtRef.current = startedAt;
                onStart?.(startedAt);
                onStopCallbackRef.current = onStop ?? null;

                mediaStreamRef.current = stream;
                
                // CRITICAL: Ensure audio context is running BEFORE creating source
                // This prevents the stream from being stopped by browser autoplay policy
                if (inputAudioContextRef.current.state === 'suspended') {
                    await inputAudioContextRef.current.resume();
                }
                
                // Verify stream is still active before creating source
                const audioTrack = stream.getAudioTracks()[0];
                if (!audioTrack || audioTrack.readyState !== 'live') {
                    throw new Error('Audio stream is niet actief.');
                }
                
                // Monitor track state changes (only log warnings)
                audioTrack.addEventListener('ended', () => {
                    console.warn('⚠️ Microfoon track ended! Dit kan betekenen dat de stream is gestopt.');
                });
                audioTrack.addEventListener('mute', () => {
                    console.warn('⚠️ Microfoon track muted!');
                });
                
                mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);

                // Verify that mediaStreamSourceRef was created successfully
                if (!mediaStreamSourceRef.current) {
                    throw new Error('Kon media stream source niet aanmaken.');
                }

                const emitChunk = (samples: Int16Array) => {
                    if (!onChunk) {
                        return;
                    }
                    
                    try {
                        const rms = calculateRMS(samples);
                        const isSpeaking = rms > VAD_THRESHOLD;
                        const durationMs = (samples.length / PCM_SAMPLE_RATE) * 1000;

                        const chunk = {
                            data: encode(new Uint8Array(samples.buffer.slice(0))),
                            mimeType: PCM_MIME_TYPE,
                            isSpeaking,
                            durationMs,
                            rms,
                        };
                        onChunk(chunk);
                    } catch (error) {
                        console.error('❌ Error in emitChunk:', error);
                    }
                };

                // Helper function to check if stream is active (without re-acquiring)
                const isStreamActive = (): boolean => {
                    const stream = mediaStreamRef.current;
                    if (!stream || stream.getAudioTracks().length === 0) {
                        return false;
                    }
                    const track = stream.getAudioTracks()[0];
                    const isLive = track.readyState === 'live';
                    
                    // Log state voor debugging
                    if (!isLive) {
                        console.warn('⚠️ Stream track state:', {
                            readyState: track.readyState,
                            enabled: track.enabled,
                            muted: track.muted,
                        });
                    }
                    
                    return isLive;
                };
                
                // Helper function to ensure stream is active, re-acquire if needed
                const ensureStreamActive = async (): Promise<MediaStream> => {
                    // First check if stream is already active
                    if (isStreamActive()) {
                        return mediaStreamRef.current!;
                    }
                    
                    // Stream is not active, re-acquire it
                    console.warn('⚠️ Stream niet actief, opnieuw verkrijgen...');
                    console.warn('⚠️ Huidige stream state:', {
                        hasStream: !!mediaStreamRef.current,
                        trackCount: mediaStreamRef.current?.getAudioTracks().length ?? 0,
                        trackState: mediaStreamRef.current?.getAudioTracks()[0]?.readyState ?? 'none',
                    });
                    
                    let newStream: MediaStream | null = null;
                    let lastStreamError: unknown = null;
                    
                    for (const attempt of AUDIO_CONSTRAINT_STAGES) {
                        try {
                            newStream = await navigator.mediaDevices.getUserMedia(attempt.constraints);
                            break;
                        } catch (error) {
                            lastStreamError = error;
                            console.warn(`❌ Kon stream niet verkrijgen met ${attempt.stage} constraints:`, error);
                        }
                    }
                    
                    if (!newStream) {
                        throw lastStreamError ?? new Error('Kon microfoonstream niet opnieuw verkrijgen.');
                    }
                    
                    // Stop old stream if it exists (but log it first)
                    if (mediaStreamRef.current) {
                        mediaStreamRef.current.getTracks().forEach(track => {
                            track.stop();
                        });
                    }
                    
                    // Update refs with new stream
                    mediaStreamRef.current = newStream;
                    
                    // Recreate source with new stream
                    if (mediaStreamSourceRef.current) {
                        mediaStreamSourceRef.current.disconnect();
                    }
                    mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(newStream);
                    
                    if (!mediaStreamSourceRef.current) {
                        throw new Error('Kon media stream source niet opnieuw aanmaken.');
                    }
                    
                    return newStream;
                };

                let workletUsed = false;
                lastWorkletFallbackReasonRef.current = null;

                if (
                    typeof inputAudioContextRef.current.audioWorklet !== 'undefined' &&
                    typeof AudioWorkletNode !== 'undefined'
                ) {
                    try {
                        // CRITICAL: Ensure audio context is running BEFORE any async operations
                        // This prevents the stream from being stopped by browser autoplay policy
                        if (inputAudioContextRef.current.state === 'suspended') {
                            await inputAudioContextRef.current.resume();
                        }
                        
                        // Verify stream is active before proceeding (but don't re-acquire unnecessarily)
                        if (!isStreamActive()) {
                            console.warn('⚠️ Stream niet actief bij start worklet setup, opnieuw verkrijgen...');
                            await ensureStreamActive();
                        }
                        
                        // CRITICAL: Keep audio context running during module loading
                        // Monitor and resume if suspended during async operation
                        const keepContextActive = setInterval(() => {
                            if (inputAudioContextRef.current?.state === 'suspended') {
                                console.warn('⚠️ Audio context werd suspended tijdens module laden, resuming...');
                                inputAudioContextRef.current.resume().catch(err => {
                                    console.error('❌ Kon audio context niet resumen:', err);
                                });
                            }
                        }, 100);
                        
                        if (!workletModuleLoadedRef.current) {
                            const moduleUrl = PCM_WORKLET_URL.href;
                            
                            // Ensure stream stays active during loading
                            const streamBeforeLoad = mediaStreamRef.current;
                            const trackBeforeLoad = streamBeforeLoad?.getAudioTracks()[0];
                            
                            await inputAudioContextRef.current.audioWorklet.addModule(moduleUrl);
                            workletModuleLoadedRef.current = true;
                            
                            // Clear the monitoring interval
                            clearInterval(keepContextActive);
                            
                            // Check if stream was lost during async operation
                            const streamAfterLoad = mediaStreamRef.current;
                            const trackAfterLoad = streamAfterLoad?.getAudioTracks()[0];
                            
                            if (!isStreamActive()) {
                                console.warn('⚠️ Stream niet meer actief na module laden:', {
                                    hadStreamBefore: !!streamBeforeLoad,
                                    hasStreamAfter: !!streamAfterLoad,
                                    trackIdBefore: trackBeforeLoad?.id,
                                    trackIdAfter: trackAfterLoad?.id,
                                    trackStateAfter: trackAfterLoad?.readyState,
                                });
                                await ensureStreamActive();
                            }
                        } else {
                            clearInterval(keepContextActive);
                        }
                        
                        // Verify source exists and stream is active
                        if (!mediaStreamSourceRef.current || !isStreamActive()) {
                            console.warn('⚠️ Source ontbreekt of stream niet actief, opnieuw verkrijgen...');
                            await ensureStreamActive();
                        }
                        
                        // CRITICAL: Ensure audio context is running BEFORE creating worklet
                        if (inputAudioContextRef.current.state === 'suspended') {
                            await inputAudioContextRef.current.resume();
                        }

                        const workletNode = new AudioWorkletNode(inputAudioContextRef.current, PCM_WORKLET_ID, {
                            outputChannelCount: [1],
                        });
                        
                        // Monitor audio context state (only log warnings)
                        inputAudioContextRef.current.addEventListener('statechange', () => {
                            if (inputAudioContextRef.current?.state === 'suspended') {
                                console.warn('⚠️ AudioContext became suspended! This will stop audio processing.');
                            }
                        });
                        
                        workletNode.port.onmessage = event => {
                            const payload = event.data;
                            if (!payload) {
                                return;
                            }

                            if (typeof payload === 'object' && 'type' in payload) {
                                const message = payload as { type: string; buffer?: ArrayBuffer; message?: string };
                                
                                if (message.type === 'chunk' && message.buffer) {
                                    emitChunk(new Int16Array(message.buffer));
                                } else if (message.type === 'error' && message.message) {
                                    console.error('❌ AudioWorklet error:', message.message);
                                    lastWorkletFallbackReasonRef.current = message.message;
                                    logEvent('audio', 'AudioWorklet runtime error', {
                                        level: 'warn',
                                        data: { message: message.message },
                                    });
                                }
                                return;
                            }

                            if (payload instanceof ArrayBuffer) {
                                emitChunk(new Int16Array(payload));
                            }
                        };

                        const silentGain = inputAudioContextRef.current.createGain();
                        silentGain.gain.value = 0;

                        // Verify mediaStreamSourceRef is still valid and stream is active
                        if (!mediaStreamSourceRef.current) {
                            throw new Error('Media stream source is niet geïnitialiseerd.');
                        }
                        
                        // Verify stream is still active before connecting
                        if (!mediaStreamRef.current || 
                            mediaStreamRef.current.getAudioTracks().length === 0 || 
                            mediaStreamRef.current.getAudioTracks()[0].readyState !== 'live') {
                            throw new Error('Audio stream is niet meer actief.');
                        }

                        // CRITICAL: Ensure audio context is running before connecting
                        if (inputAudioContextRef.current.state === 'suspended') {
                            await inputAudioContextRef.current.resume();
                        }
                        
                        mediaStreamSourceRef.current.connect(workletNode);
                        workletNode.connect(silentGain);
                        silentGain.connect(inputAudioContextRef.current.destination);

                        audioWorkletNodeRef.current = workletNode;
                        workletGainNodeRef.current = silentGain;
                        workletUsed = true;
                        
                    } catch (error) {
                        console.warn('AudioWorklet module kon niet geladen worden:', error);
                        lastWorkletFallbackReasonRef.current =
                            error instanceof Error ? error.message : 'unknown-error-loading-worklet';
                        logEvent('audio', 'AudioWorklet niet geladen, fallback geactiveerd', {
                            level: 'warn',
                            data: {
                                reason: lastWorkletFallbackReasonRef.current,
                            },
                        });
                        audioWorkletNodeRef.current = null;
                        workletGainNodeRef.current = null;
                    }
                } else {
                    lastWorkletFallbackReasonRef.current = 'unsupported';
                    logEvent('audio', 'AudioWorklet niet ondersteund, gebruik ScriptProcessor fallback', {
                        level: 'warn',
                    });
                }

                if (!workletUsed) {
                    // Verify stream is active before using ScriptProcessor (but don't re-acquire unnecessarily)
                    if (!isStreamActive() || !mediaStreamSourceRef.current) {
                        console.warn('⚠️ Stream niet actief voor ScriptProcessor, opnieuw verkrijgen...');
                        await ensureStreamActive();
                    }
                    
                    // CRITICAL: Ensure audio context is running
                    if (inputAudioContextRef.current.state === 'suspended') {
                        await inputAudioContextRef.current.resume();
                    }

                    scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current.onaudioprocess = event => {
                        const inputData = event.inputBuffer.getChannelData(0);
                        emitChunk(createInt16FromFloat(inputData));
                    };

                    if (!mediaStreamSourceRef.current) {
                        throw new Error('Media stream source is niet geïnitialiseerd voor ScriptProcessor.');
                    }
                    
                    mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                }

                const track = stream.getAudioTracks()[0];
                const trackSettings = typeof track?.getSettings === 'function' ? track.getSettings() : null;
                const trackCapabilities = typeof track?.getCapabilities === 'function' ? track.getCapabilities() : null;
                const fallbackApplied = appliedStage !== 'enhanced';
                const platform: RecordingPlatform = isMobilePlatform() ? 'mobile' : 'desktop';

                return {
                    platform,
                    constraintStage: appliedStage,
                    fallbackApplied,
                    workletUsed,
                    workletFallbackReason: workletUsed ? null : lastWorkletFallbackReasonRef.current,
                    requestedConstraints: AUDIO_CONSTRAINT_STAGES[0].constraints,
                    appliedConstraints,
                    trackSettings,
                    trackCapabilities,
                };
            } catch (error) {
                recordingStartedAtRef.current = null;
                cleanup();
                onError?.(error);
                throw error;
            }
        },
        [cleanup],
    );

    const stopRecording = useCallback(() => {
        if (recordingStartedAtRef.current !== null) {
            const stoppedAt = Date.now();
            const segmentMs = stoppedAt - recordingStartedAtRef.current;
            recordingStartedAtRef.current = null;
            onStopCallbackRef.current?.(segmentMs, stoppedAt);
            onStopCallbackRef.current = null;
            cleanup();
            return { segmentMs, stoppedAt };
        }
        cleanup();
        return null;
    }, [cleanup]);

    const stopPlayback = useCallback(() => {
        sourcesRef.current.forEach(source => {
            source.stop();
        });
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }, []);

    const queueModelAudio = useCallback(
        async (base64Audio: string, playbackRate: number) => {
            if (!outputAudioContextRef.current || !outputGainNodeRef.current) {
                return 0;
            }
            try {
                const safePlaybackRate = playbackRate > 0 ? playbackRate : 1;

                if (outputAudioContextRef.current.state === 'suspended') {
                    await outputAudioContextRef.current.resume();
                }

                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);

                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.playbackRate.value = safePlaybackRate;
                source.connect(outputGainNodeRef.current);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                const playbackDurationSeconds = audioBuffer.duration / safePlaybackRate;
                nextStartTimeRef.current += playbackDurationSeconds;
                sourcesRef.current.add(source);

                return playbackDurationSeconds * 1000;
            } catch (error) {
                console.error('Kon modelaudio niet toevoegen aan wachtrij:', error);
                return 0;
            }
        },
        [],
    );

    return useMemo(() => ({
        initializeContexts,
        cleanup,
        startRecording,
        stopRecording,
        queueModelAudio,
        stopPlayback,
    }), [
        initializeContexts,
        cleanup,
        startRecording,
        stopRecording,
        queueModelAudio,
        stopPlayback,
    ]);
};

export type { StartRecordingOptions, AudioController };

