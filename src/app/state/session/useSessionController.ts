import { useCallback, useEffect, useRef, useState, useMemo, type Dispatch, type SetStateAction } from 'react';
import { useUIState } from '../../providers/UIProvider';
import { useAudioController } from '../../hooks/useAudioController';
import { useSessionMetrics, createEmptyMetrics } from './useSessionMetrics';
import { useConversationFlow } from './useConversationFlow';
import {
    connectToLiveSession,
    pickConversationTopic,
    summarizeNewsForLevel,
    getSessionSummary,
    type LiveSession,
    type LiveServerMessage,
    type ConversationTopic,
    type NewsConversationTopic,
    type TopicsMeta,
} from '@/services/geminiService';
import { fetchNewsHeadlines, type NewsFeedEntry } from '@/services/newsFeedService';
import type {
    ActivityMode,
    CEFRLevel,
    CreativeActivityMode,
    CreativeWorkshopState,
    FeedbackStrictnessSettings,
    LearningGoal,
    Transcript,
    FeedbackAspect,
    StrictnessLevel,
    SavedConversation,
    ProgressData,
} from '@/types';
import type { SessionContextValue, SessionLaunchState, PendingCommand, AudioStatusMessage } from './types';
import { DEFAULT_ACTIVITY_GOALS, GOAL_ENABLED_ACTIVITIES } from './values';
import { logEvent } from '@/utils/logger';
import { updateProgress } from '@/utils/progressUtils';
import type { XPUpdateResult } from '@/utils/gamificationUtils';
import { saveConversation, getHistory } from '@/utils/historyUtils';
import { getProgress } from '@/utils/progressUtils';
import { loadGamificationData, getLevelProgressInfo, type XPLevelProgress } from '@/utils/gamificationUtils';

const DEFAULT_LAUNCH_STATE: SessionLaunchState = {
    active: false,
    progress: 0,
    label: '',
    sublabel: null,
    error: null,
};

const updateLaunchProgress = (
    setLaunchState: Dispatch<SetStateAction<SessionLaunchState>>,
    progress: number,
    label: string,
    sublabel: string | null = null,
) => {
    setLaunchState(prev => ({
        ...prev,
        progress: Math.min(1, Math.max(0, progress)),
        label,
        sublabel,
        error: null,
    }));
};

const updateLaunchError = (
    setLaunchState: Dispatch<SetStateAction<SessionLaunchState>>,
    error: string,
) => {
    setLaunchState(prev => ({
        ...prev,
        error,
        active: true,
    }));
};

export const useSessionController = (): SessionContextValue => {
    const { setView } = useUIState();
    const audioController = useAudioController();
    const { metrics, setMetrics, stopTimer, timerRef } = useSessionMetrics();

    // Setup state
    const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');
    const [selectedMode, setSelectedMode] = useState<ActivityMode>('conversation');
    const [selectedGoals, setSelectedGoals] = useState<LearningGoal[]>(['fluency']);
    const [creativeWorkshops, setCreativeWorkshops] = useState<Partial<Record<CreativeActivityMode, CreativeWorkshopState>>>({});
    const [pendingCreativeMode, setPendingCreativeMode] = useState<CreativeActivityMode | null>(null);
    const [isCreativeModalOpen, setIsCreativeModalOpen] = useState(false);
    const [feedbackStrictness, setFeedbackStrictness] = useState<FeedbackStrictnessSettings>({
        grammar: 3,
        pronunciation: 3,
        fluency: 3,
        vocabulary: 3,
        tone: 3,
    });
    const [newsEnabled, setNewsEnabled] = useState(false);
    const [newsHeadlines, setNewsHeadlines] = useState<NewsFeedEntry[]>([]);
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState<string | null>(null);
    const [newsLastUpdated, setNewsLastUpdated] = useState<number | null>(null);
    const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
    const [newsConversationTopic, setNewsConversationTopic] = useState<NewsConversationTopic | null>(null);
    const [activeNewsHeadline, setActiveNewsHeadline] = useState<NewsFeedEntry | null>(null);
    const [userTalkTime, setUserTalkTime] = useState(0);
    const [tutorTalkTime, setTutorTalkTime] = useState(0);
    // const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null); -- Removed in favor of VAD
    // const [tick, setTick] = useState(0); -- Removed in favor of VAD

    // Session state
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [audioStatus, setAudioStatus] = useState<AudioStatusMessage | null>(null);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [sessionLaunchState, setSessionLaunchState] = useState<SessionLaunchState>(DEFAULT_LAUNCH_STATE);
    const [isSessionReady, setIsSessionReady] = useState(false);
    const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
    const [topicsMetaState, setTopicsMetaState] = useState<TopicsMeta | null>(null);
    const [commandPending, setCommandPending] = useState(false);
    const [pendingCommand, setPendingCommand] = useState<PendingCommand>(null);
    const [summaryProgress, setSummaryProgress] = useState({ value: 0, label: '' });
    const [goalSelectionState, setGoalSelectionState] = useState({ open: false, pendingGoals: [] as LearningGoal[] });
    const [summary, setSummary] = useState<any>(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [closingReflection, setClosingReflection] = useState<string | null>(null);
    const [lastXPResult, setLastXPResult] = useState<XPUpdateResult | null>(null);
    const [bonusXP, setBonusXP] = useState(0);
    const [completedMissions, setCompletedMissions] = useState<any[]>([]);
    const [newBadges, setNewBadges] = useState<any[]>([]);
    const [history, setHistory] = useState<SavedConversation[]>([]);
    const [progress, setProgress] = useState<ProgressData>(getProgress());
    const [levelProgress, setLevelProgress] = useState<XPLevelProgress>(() => {
        const data = loadGamificationData();
        return getLevelProgressInfo(data.xp);
    });
    const [selectedConversation, setSelectedConversation] = useState<SavedConversation | null>(null);
    const [activeTopic, setActiveTopic] = useState<ConversationTopic | null>(null);
    const [selectedWord, setSelectedWord] = useState<string | null>(null);

    // Refs
    const sessionRef = useRef<LiveSession | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const sessionGoalsRef = useRef<LearningGoal[]>([]);
    const activeTopicRef = useRef<ConversationTopic | null>(null);
    const topicHistoryRef = useRef<ConversationTopic[]>([]);
    const newsConversationRef = useRef<NewsConversationTopic | null>(null);
    const activeNewsEntryRef = useRef<NewsFeedEntry | null>(null);
    const commandResetTimeoutRef = useRef<number | null>(null);
    const lastTutorMessageRef = useRef<number | null>(null);
    const previousNewsEnabledRef = useRef<boolean>(false);
    const messageCountRef = useRef(0);

    // Initialize audio contexts
    useEffect(() => {
        audioController.initializeContexts();
        return () => {
            audioController.cleanup();
        };
    }, [audioController]);

    // Load history on mount
    useEffect(() => {
        setHistory(getHistory());
    }, []);

    const refreshProgress = useCallback(() => {
        setProgress(getProgress());
        const data = loadGamificationData();
        setLevelProgress(getLevelProgressInfo(data.xp));
    }, []);

    const resetSessionLaunchState = useCallback(() => {
        setSessionLaunchState(DEFAULT_LAUNCH_STATE);
    }, []);

    const resetFeedbackStrictness = useCallback(() => {
        setFeedbackStrictness({
            grammar: 3,
            pronunciation: 3,
            fluency: 3,
            vocabulary: 3,
            tone: 3,
        });
    }, []);

    const updateFeedbackStrictness = useCallback((aspect: FeedbackAspect, level: StrictnessLevel) => {
        setFeedbackStrictness(prev => ({ ...prev, [aspect]: level }));
    }, []);

    const effectiveGoalsForMode = useCallback((mode: ActivityMode): LearningGoal[] => {
        if (GOAL_ENABLED_ACTIVITIES.includes(mode)) {
            return selectedGoals.length > 0 ? selectedGoals : [DEFAULT_ACTIVITY_GOALS[mode] ?? 'fluency'];
        }
        return [DEFAULT_ACTIVITY_GOALS[mode] ?? 'fluency'];
    }, [selectedGoals]);

    const currentGoals = useMemo(() => effectiveGoalsForMode(selectedMode), [selectedMode, effectiveGoalsForMode]);

    const openCreativeModal = useCallback((mode: CreativeActivityMode) => {
        setPendingCreativeMode(mode);
        setIsCreativeModalOpen(true);
    }, []);

    const closeCreativeModal = useCallback(() => {
        setIsCreativeModalOpen(false);
        setPendingCreativeMode(null);
    }, []);

    const setCreativeWorkshopState = useCallback((state: CreativeWorkshopState) => {
        if (pendingCreativeMode) {
            setCreativeWorkshops(prev => ({ ...prev, [pendingCreativeMode]: state }));
        }
    }, [pendingCreativeMode]);

    const getLatestNewsHeadlines = useCallback((): NewsFeedEntry[] => {
        return newsHeadlines;
    }, [newsHeadlines]);

    const refreshNewsHeadlines = useCallback(async (options?: { force?: boolean }) => {
        setNewsLoading(true);
        setNewsError(null);
        try {
            const entries = await fetchNewsHeadlines(options?.force);
            setNewsHeadlines(entries);
            setNewsLastUpdated(Date.now());
            return entries;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Onbekende fout';
            setNewsError(message);
            logEvent('news', 'Headlines fetch failed', { level: 'error', data: { message } });
            return [];
        } finally {
            setNewsLoading(false);
        }
    }, []);

    const selectNewsHeadline = useCallback((id: string | null) => {
        setSelectedNewsId(id);
        if (id) {
            const headline = newsHeadlines.find(h => h.id === id);
            setActiveNewsHeadline(headline ?? null);
        } else {
            setActiveNewsHeadline(null);
        }
    }, [newsHeadlines]);

    const summarizeNewsForLevelWrapper = useCallback(async (level: CEFRLevel, entry: NewsFeedEntry): Promise<NewsConversationTopic> => {
        return summarizeNewsForLevel(level, entry);
    }, []);

    const scheduleCommandReset = useCallback((duration = 2000) => {
        if (commandResetTimeoutRef.current) {
            window.clearTimeout(commandResetTimeoutRef.current);
        }
        commandResetTimeoutRef.current = window.setTimeout(() => {
            setCommandPending(false);
            setCommandFeedback(null);
            setPendingCommand(null);
            commandResetTimeoutRef.current = null;
        }, duration);
    }, []);

    const { requestFollowUp, requestNewTopic, requestGoalFeedback } = useConversationFlow({
        sessionRef,
        transcripts,
        setTranscripts,
        isSessionActive,
        selectedLevel,
        sessionIdRef,
        sessionGoalsRef,
        activeTopicRef,
        topicHistoryRef,
        newsConversationRef,
        activeNewsEntryRef,
        setTopicsMetaState,
        setSessionMetrics: setMetrics,
        setCommandFeedback,
        setIsCommandPending: setCommandPending,
        scheduleCommandReset,
        setPendingCommand,
        newsEnabled,
        getLatestNewsHeadlines,
        refreshNewsHeadlines,
        setNewsConversationTopic,
        selectNewsHeadline,
        summarizeNewsForLevel: summarizeNewsForLevelWrapper,
    });

    const registerTutorTalk = useCallback((durationMs: number) => {
        setTutorTalkTime(prev => prev + durationMs);
        lastTutorMessageRef.current = Date.now();
    }, []);

    const registerUserTalk = useCallback((durationMs: number) => {
        // te veel spam voor per-chunk
        setUserTalkTime(prev => prev + durationMs);
    }, []);

    // Timer removed - we now update live based on VAD chunks
    /*
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording && recordingStartTime) {
            interval = setInterval(() => {
                setTick(t => t + 1);
            }, 100); // Update every 100ms for smooth progress
        }
        return () => clearInterval(interval);
    }, [isRecording, recordingStartTime]);
    */

    const talkStats = useMemo(() => {
        // We use userTalkTime directly now, as it is updated live via VAD
        const totalUserTime = userTalkTime; 
        const total = totalUserTime + tutorTalkTime;
        
        if (total === 0) {
            return {
                userShare: 0,
                tutorShare: 0,
                userWidth: 50,
                tutorWidth: 50,
                hasData: false,
                fallbackNotice: null,
            };
        }
        const userShare = totalUserTime / total;
        const tutorShare = tutorTalkTime / total;
        return {
            userShare,
            tutorShare,
            userWidth: Math.max(5, Math.min(95, userShare * 100)),
            tutorWidth: Math.max(5, Math.min(95, tutorShare * 100)),
            hasData: true,
            fallbackNotice: null,
        };
    }, [userTalkTime, tutorTalkTime]);

    const startSession = useCallback(async (options?: {
        mode?: ActivityMode;
        goals?: LearningGoal[];
        strictness?: FeedbackStrictnessSettings;
        creative?: CreativeWorkshopState | null;
        newsHeadline?: NewsFeedEntry | null;
    }) => {
        try {
            // Reset state
            setIsSessionActive(false);
            setIsRecording(false);
            setIsSessionReady(false);
            setTranscripts([]);
            setCommandFeedback(null);
            setCommandPending(false);
            setPendingCommand(null);
            setUserTalkTime(0);
            setTutorTalkTime(0);
            lastTutorMessageRef.current = null;
            messageCountRef.current = 0;

            const mode = options?.mode ?? selectedMode;
            const goals = options?.goals ?? effectiveGoalsForMode(mode);
            const strictness = options?.strictness ?? feedbackStrictness;
            const creative = options?.creative ?? null;
            const newsHeadline = options?.newsHeadline ?? activeNewsHeadline;

            sessionGoalsRef.current = goals;
            setSelectedMode(mode);

            // Start launch overlay
            setSessionLaunchState({
                active: true,
                progress: 0,
                label: 'Sessie starten...',
                sublabel: null,
                error: null,
            });

            // Fase 1: Verbinden (0-25%)
            updateLaunchProgress(setSessionLaunchState, 0.1, 'Verbinden met tutor...', 'Even geduld...');
            
            let topic: ConversationTopic | null = null;
            let newsTopic: NewsConversationTopic | null = null;
            let topicMeta: TopicsMeta | null = null;

            // Fase 2: Onderwerp voorbereiden (25-50%)
            updateLaunchProgress(setSessionLaunchState, 0.3, 'Onderwerp voorbereiden...', 'Gespreksonderwerp wordt geladen...');
            
            if (mode === 'conversation') {
                if (newsHeadline) {
                    try {
                        newsTopic = await summarizeNewsForLevel(selectedLevel, newsHeadline);
                        newsConversationRef.current = newsTopic;
                        activeNewsEntryRef.current = newsHeadline;
                        setNewsConversationTopic(newsTopic);
                        topic = newsTopic;
                        topicMeta = { source: 'news', timestamp: Date.now(), statusCode: null, error: null };
                    } catch (error) {
                        logEvent('news', 'News summarization failed', {
                            level: 'warn',
                            data: { message: error instanceof Error ? error.message : String(error) },
                        });
                    }
                }
                
                if (!topic) {
                    try {
                        const result = await pickConversationTopic(selectedLevel, []);
                        topic = result.topic;
                        topicMeta = result.meta;
                    } catch (error) {
                        logEvent('topics', 'Topic selection failed', {
                            level: 'warn',
                            data: { message: error instanceof Error ? error.message : String(error) },
                        });
                    }
                }
            }

            activeTopicRef.current = topic;
            setActiveTopic(topic);
            setTopicsMetaState(topicMeta);

            // Fase 3: Configureren (50-75%)
            updateLaunchProgress(setSessionLaunchState, 0.6, 'Sessie configureren...', 'Bijna klaar...');

            const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            sessionIdRef.current = sessionId;

            setMetrics({
                ...createEmptyMetrics(),
                sessionId,
                startTimestamp: Date.now(),
                goal: goals[0] ?? 'fluency',
                currentTopic: topic,
            });

            // Connect to live session
            const session = await connectToLiveSession(
                selectedLevel,
                mode,
                goals,
                strictness,
                {
                    topic: topic ?? undefined,
                    creative: creative ?? undefined,
                },
                (message: LiveServerMessage) => {
                    // Helper function to check if text is reasoning/thinking (should be filtered out)
                    const isReasoningText = (text: string): boolean => {
                        if (!text || typeof text !== 'string') return false;
                        
                        const trimmed = text.trim();
                        
                        // First check: Any text starting with "**" followed by a capital letter is likely reasoning
                        // This catches patterns like "**Initiating", "**Defining", "**Considering", etc.
                        if (/^\*\*[A-Z]/.test(trimmed)) {
                            return true;
                        }
                        
                        // Check for common reasoning/thinking markers
                        const reasoningPatterns = [
                            /^I'm starting the/i,  // "I'm starting the Dutch conversation..."
                            /^I'm now formulating/i,
                            /^I've shifted my focus/i,
                            /^I've formulated/i,
                            /^I'm building on/i,
                            /^The goal is/i,
                            /^I will start/i,
                            /^I'll begin/i,
                            /^I'll use/i,
                            /^I'll explain/i,  // "I'll explain the news article..."
                            /^The focus is/i,
                            /^I'm crafting/i,
                            /^I'm building/i,
                            /^Then, I'll initiate/i,
                            /^My initial question will be/i,  // "My initial question will be..."
                            /^I'll be patient/i,  // "I'll be patient and friendly..."
                        ];
                        
                        return reasoningPatterns.some(pattern => pattern.test(trimmed));
                    };
                    
                    // Track collected text from this message to combine intelligently
                    const collectedTexts: string[] = [];
                    
                    // Helper function to add text to transcripts (with deduplication)
                    const addTextToTranscripts = (text: string) => {
                        if (!text || !text.trim()) {
                            return;
                        }
                        
                        // Filter out reasoning text
                        if (isReasoningText(text)) {
                            return;
                        }
                        
                        // Check if this text is already in collectedTexts (avoid duplicates within same message)
                        const normalizedText = text.trim();
                        if (collectedTexts.some(t => t.trim() === normalizedText)) {
                            return;
                        }
                        
                        collectedTexts.push(normalizedText);
                    };
                    
                    // Helper function to process parts (text and audio)
                    // Note: We ALWAYS process audio, and collect ALL text (from both outputTranscription and parts)
                    // Multiple text parts are combined into a single transcript entry
                    const processParts = (parts: any[]) => {
                        if (!Array.isArray(parts)) {
                            return;
                        }
                        
                        for (const part of parts) {
                            // Skip parts marked as "thought" - these are internal reasoning, not spoken text
                            if (part.thought === true) {
                                continue;
                            }
                            
                            // Process text (always collect, we'll deduplicate later)
                            if (part.text) {
                                addTextToTranscripts(part.text);
                            }
                            
                            // ALWAYS process audio, regardless of text filtering
                            if (part.inlineData?.mimeType?.startsWith('audio/')) {
                                const audioData = part.inlineData.data;
                                audioController.queueModelAudio(audioData, playbackRate).then(durationMs => {
                                    registerTutorTalk(durationMs);
                                });
                            }
                        }
                    };

                    // Helper function to update user transcript smartly
                    const updateUserTranscript = (text: string) => {
                        const textToAdd = text.trim();
                        if (!textToAdd) return;

                        setTranscripts(prev => {
                            const last = prev[prev.length - 1];
                            if (last && last.speaker === 'user') {
                                if (last.text === textToAdd) return prev;
                                if (textToAdd.startsWith(last.text)) {
                                    return [...prev.slice(0, -1), { ...last, text: textToAdd }];
                                }
                                const separator = (/[.,!?]/.test(textToAdd[0]) || last.text.endsWith(' ')) ? '' : ' ';
                                return [...prev.slice(0, -1), { ...last, text: last.text + separator + textToAdd }];
                            }
                            return [...prev, { speaker: 'user', text: textToAdd }];
                        });
                    };
                    
                    // Increment message count
                    messageCountRef.current++;
                    const messageCount = messageCountRef.current;
                    
                    // Handle modelTurn at top level (type assertion needed as LiveServerMessage structure may vary)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const messageAny = message as any;
                    
                    // Log alleen transcriptie-gerelateerde berichten (voor debugging)
                    const hasOutputTranscription = messageAny.outputTranscription || 
                        messageAny.serverContent?.outputTranscription ||
                        messageAny.serverContent?.modelTurn?.outputTranscription ||
                        messageAny.serverContent?.modelTurn?.modelResponse?.outputTranscription;
                    const hasInputTranscription = messageAny.inputTranscription ||
                        messageAny.userTurn?.inputTranscription ||
                        messageAny.serverContent?.inputTranscription ||
                        messageAny.serverContent?.userTurn?.inputTranscription;
                    const hasParts = messageAny.modelTurn?.parts || 
                        messageAny.serverContent?.modelTurn?.parts ||
                        messageAny.serverContent?.modelTurn?.modelResponse?.parts;
                    
                    if (hasOutputTranscription || hasInputTranscription || (hasParts && messageCount <= 10)) {
                        const outputTranscriptionValue = hasOutputTranscription ? 
                            (messageAny.outputTranscription || messageAny.serverContent?.outputTranscription) : null;
                        const inputTranscriptionValue = hasInputTranscription ? 
                            (messageAny.inputTranscription || messageAny.userTurn?.inputTranscription || messageAny.serverContent?.inputTranscription) : null;
                    }
                    
                    // Check for outputTranscription at top level (not just in serverContent)
                    if (messageAny.outputTranscription) {
                        const transcription = messageAny.outputTranscription as any;
                        let transcriptionText: string | null = null;
                        
                        // Try multiple extraction methods
                        if (typeof transcription === 'string') {
                            transcriptionText = transcription;
                        } else if (transcription.text) {
                            transcriptionText = transcription.text;
                        } else if (transcription.transcript) {
                            transcriptionText = transcription.transcript;
                        } else if (transcription.content) {
                            transcriptionText = transcription.content;
                        } else if (transcription.transcription) {
                            transcriptionText = transcription.transcription;
                        } else if (transcription.textChunk) {
                            transcriptionText = transcription.textChunk;
                        } else if (Array.isArray(transcription)) {
                            // Sometimes transcription is an array of text chunks
                            transcriptionText = transcription.map((t: any) => 
                                typeof t === 'string' ? t : (t.text || t.transcript || t.content || '')
                            ).filter(Boolean).join(' ');
                        }
                        
                        // Debug: log if we couldn't extract text
                        if (!transcriptionText && messageCount <= 10) {
                            // console.warn('⚠️ outputTranscription found but could not extract text. Structure:', JSON.stringify(transcription, null, 2));
                        }
                        
                        if (transcriptionText && transcriptionText.trim() && transcriptionText.trim() !== '\n\n') {
                            addTextToTranscripts(transcriptionText);
                        }
                    }
                    
                    // Handle userTurn at top level (user speech transcription)
                    if (messageAny.userTurn) {
                        const userTurn = messageAny.userTurn;
                        
                        // Extract user transcription from userTurn
                        if (userTurn.inputTranscription) {
                            const userTranscription = userTurn.inputTranscription;
                            let userText: string | null = null;
                            
                            if (typeof userTranscription === 'string') {
                                userText = userTranscription;
                            } else if (userTranscription.text) {
                                userText = userTranscription.text;
                            } else if (userTranscription.transcript) {
                                userText = userTranscription.transcript;
                            } else if (userTranscription.content) {
                                userText = userTranscription.content;
                            }
                            
                            if (userText && userText.trim()) {
                                updateUserTranscript(userText);
                            }
                        }
                    }
                    
                    if (messageAny.modelTurn) {
                        const turn = messageAny.modelTurn;
                        
                        // Try multiple locations for parts
                        if (turn.parts) {
                            processParts(turn.parts);
                        } else if (turn.modelResponse?.parts) {
                            processParts(turn.modelResponse.parts);
                        } else if (turn.modelResponse?.candidates?.[0]?.content?.parts) {
                            processParts(turn.modelResponse.candidates[0].content.parts);
                        }
                    }
                    
                    // Handle serverContent
                    if (message.serverContent) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const content = message.serverContent as any;
                        
                        // FIRST: Handle inputTranscription (user speech transcription)
                        // Check serverContent.inputTranscription
                        if (content.inputTranscription) {
                            const userTranscription = content.inputTranscription as any;
                            let userText: string | null = null;
                            
                            if (typeof userTranscription === 'string') {
                                userText = userTranscription;
                            } else if (userTranscription.text) {
                                userText = userTranscription.text;
                            } else if (userTranscription.transcript) {
                                userText = userTranscription.transcript;
                            } else if (userTranscription.content) {
                                userText = userTranscription.content;
                            } else if (userTranscription.transcription) {
                                userText = userTranscription.transcription;
                            }
                            
                            if (userText && userText.trim()) {
                                updateUserTranscript(userText);
                            }
                        }
                        
                        // Check for userTurn with inputTranscription
                        if (content.userTurn) {
                            const userTurn = content.userTurn as any;
                            if (userTurn.inputTranscription) {
                                const userTranscription = userTurn.inputTranscription;
                                let userText: string | null = null;
                                
                                if (typeof userTranscription === 'string') {
                                    userText = userTranscription;
                                } else if (userTranscription.text) {
                                    userText = userTranscription.text;
                                } else if (userTranscription.transcript) {
                                    userText = userTranscription.transcript;
                                } else if (userTranscription.content) {
                                    userText = userTranscription.content;
                                }
                                
                                if (userText && userText.trim()) {
                                    updateUserTranscript(userText);
                                }
                            }
                        }
                        
                        // SECOND: Check for outputTranscription and collect text
                        if (content.outputTranscription) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const transcription = content.outputTranscription as any;
                            
                            // Extract text from transcription (structure may vary)
                            let transcriptionText: string | null = null;
                            
                            // Try multiple extraction methods
                            if (typeof transcription === 'string') {
                                transcriptionText = transcription;
                            } else if (transcription.text) {
                                transcriptionText = transcription.text;
                            } else if (transcription.transcript) {
                                transcriptionText = transcription.transcript;
                            } else if (transcription.content) {
                                transcriptionText = transcription.content;
                            } else if (transcription.transcription) {
                                transcriptionText = transcription.transcription;
                            } else if (transcription.textChunk) {
                                transcriptionText = transcription.textChunk;
                            } else if (Array.isArray(transcription)) {
                                // Sometimes transcription is an array of text chunks
                                transcriptionText = transcription.map((t: any) => 
                                    typeof t === 'string' ? t : (t.text || t.transcript || t.content || '')
                                ).filter(Boolean).join(' ');
                            }
                            
                            // Debug: log if we couldn't extract text
                            if (!transcriptionText && messageCount <= 10) {
                                // console.warn('⚠️ serverContent.outputTranscription found but could not extract text. Structure:', JSON.stringify(transcription, null, 2));
                            }
                            
                            // Collect transcription text (will be filtered and deduplicated by addTextToTranscripts)
                            if (transcriptionText && transcriptionText.trim() && transcriptionText.trim() !== '\n\n') {
                                addTextToTranscripts(transcriptionText);
                            }
                        }
                        
                        // SECOND: Process parts (always process audio, always collect text)
                        if (content.modelTurn) {
                            const turn = content.modelTurn;
                            
                            // Check for outputTranscription in modelTurn
                            if (turn.outputTranscription) {
                                const transcription = turn.outputTranscription as any;
                                let transcriptionText: string | null = null;
                                
                                if (typeof transcription === 'string') {
                                    transcriptionText = transcription;
                                } else if (transcription.text) {
                                    transcriptionText = transcription.text;
                                } else if (transcription.transcript) {
                                    transcriptionText = transcription.transcript;
                                } else if (transcription.content) {
                                    transcriptionText = transcription.content;
                                }
                                
                                if (transcriptionText && transcriptionText.trim() && transcriptionText.trim() !== '\n\n') {
                                    addTextToTranscripts(transcriptionText);
                                }
                            }
                            
                            // Check for outputTranscription in modelResponse
                            if (turn.modelResponse?.outputTranscription) {
                                const transcription = turn.modelResponse.outputTranscription as any;
                                let transcriptionText: string | null = null;
                                
                                if (typeof transcription === 'string') {
                                    transcriptionText = transcription;
                                } else if (transcription.text) {
                                    transcriptionText = transcription.text;
                                } else if (transcription.transcript) {
                                    transcriptionText = transcription.transcript;
                                }
                                
                                if (transcriptionText && transcriptionText.trim()) {
                                    addTextToTranscripts(transcriptionText);
                                }
                            }
                            
                            // Process parts from multiple possible locations
                            let partsProcessed = false;
                            
                            if (turn.parts && Array.isArray(turn.parts)) {
                                processParts(turn.parts);
                                partsProcessed = true;
                            }
                            
                            if (!partsProcessed && turn.modelResponse?.parts && Array.isArray(turn.modelResponse.parts)) {
                                processParts(turn.modelResponse.parts);
                                partsProcessed = true;
                            }
                            
                            if (!partsProcessed && turn.modelResponse?.candidates?.[0]?.content?.parts) {
                                processParts(turn.modelResponse.candidates[0].content.parts);
                                partsProcessed = true;
                            }
                        }
                        
                        // Check for transcriptie-gerelateerde velden in andere keys
                        Object.keys(content).forEach(key => {
                            if (key !== 'modelTurn' && key !== 'outputTranscription' && key !== 'generationComplete' && key !== 'inputTranscription' && key !== 'turnComplete' && key !== 'userTurn') {
                                // Check voor transcriptie-gerelateerde velden
                                if (key.toLowerCase().includes('transcript') || key.toLowerCase().includes('transcription')) {
                                    const transcriptValue = content[key];
                                    if (typeof transcriptValue === 'string' && transcriptValue.trim()) {
                                        addTextToTranscripts(transcriptValue);
                                    } else if (transcriptValue && typeof transcriptValue === 'object') {
                                        const text = transcriptValue.text || transcriptValue.transcript || transcriptValue.content;
                                        if (text && typeof text === 'string' && text.trim()) {
                                            addTextToTranscripts(text);
                                        }
                                    }
                                }
                            }
                        });
                        
                        // IMPORTANT: outputTranscription might come AFTER generationComplete or turnComplete
                        // Store a flag to check for delayed transcriptions
                        if (content.generationComplete === true || content.turnComplete === true) {
                            // The API might send outputTranscription in the NEXT message
                            // We'll check for it in the next message handler call
                        }
                    }
                    
                    // FINAL: Combine all collected text and add/update transcripts
                    // This runs after processing both top-level modelTurn and serverContent
                    
                    
                    if (collectedTexts.length > 0) {
                        // Combine all collected texts, removing duplicates and empty strings
                        const uniqueTexts = Array.from(new Set(collectedTexts.filter(t => t.trim())));
                        const combinedText = uniqueTexts.join(' ').trim();
                        
                        if (combinedText) {
                            setTranscripts(prev => {
                                const lastTranscript = prev[prev.length - 1];
                                
                                // If the last transcript is also from the tutor, append to it instead of creating a new entry
                                // This prevents splitting one sentence into multiple chat bubbles
                                if (lastTranscript?.speaker === 'model') {
                                    // Check if this exact text is already the complete last transcript (exact duplicate)
                                    if (lastTranscript.text.trim() === combinedText.trim()) {
                                        return prev;
                                    }
                                    
                                    // Check if the new text is already fully contained in the last transcript
                                    // Only skip if the last transcript ends with this exact text (to avoid partial matches)
                                    const lastTextNormalized = lastTranscript.text.trim();
                                    const newTextNormalized = combinedText.trim();
                                    if (lastTextNormalized.endsWith(newTextNormalized)) {
                                        return prev;
                                    }
                                    
                                    // Append new text to existing tutor message
                                    const updatedText = (lastTranscript.text + ' ' + combinedText).trim();
                                    return [
                                        ...prev.slice(0, -1),
                                        { speaker: 'model', text: updatedText }
                                    ];
                                }
                                
                                // If last transcript is from user or system, create a new tutor entry
                                return [...prev, { speaker: 'model', text: combinedText }];
                            });
                        } else if (messageCount <= 5) {
                            // console.warn('⚠️ Collected texts but combinedText is empty:', collectedTexts);
                        }
                    } else if (messageCount <= 5 && hasOutputTranscription && !hasParts) {
                        // This is normal - outputTranscription messages often come without parts (they're separate)
                        // Only warn if we expected to collect text but didn't
                    } else if (messageCount <= 5 && hasParts && !hasOutputTranscription) {
                        // Parts with only audio (no text) is normal for audio-only models
                    }
                },
                (error: ErrorEvent) => {
                    console.error('Session error:', error);
                    updateLaunchError(setSessionLaunchState, 'Verbinding met tutor mislukt. Probeer het opnieuw.');
                    logEvent('session', 'Session error', { level: 'error', data: { message: error.message } });
                },
                (event: CloseEvent) => {
                    setIsSessionActive(false);
                    setIsRecording(false);
                    sessionRef.current = null;
                }
            );

            sessionRef.current = session;

            // Fase 4: Klaar (75-100%)
            updateLaunchProgress(setSessionLaunchState, 0.9, 'Klaar! Tutor begint nu...', 'Sessie wordt gestart...');

            // Wait a moment for the session to be fully ready before triggering
            // The sendSilentTrigger already has delays built in, but we add a small one here too
            await new Promise(resolve => setTimeout(resolve, 500));

            // Trigger tutor to start speaking
            await session.sendSilentTrigger();
            
            // Log that we've triggered the tutor
            // console.log('Tutor trigger sent, waiting for response...');

            // Complete launch
            updateLaunchProgress(setSessionLaunchState, 1.0, 'Klaar!', 'Tutor begint nu met praten...');

            // Wait a bit for the overlay to show completion, then hide it
            await new Promise(resolve => setTimeout(resolve, 500));

            setSessionLaunchState(prev => ({ ...prev, active: false }));
            setIsSessionActive(true);
            setIsSessionReady(true); // Set session ready - this will trigger pulse animation

            setView('session');
            
            // Wait a bit more to ensure tutor has started speaking before showing pulse
            await new Promise(resolve => setTimeout(resolve, 1000));
            logEvent('session', 'Session started', { data: { sessionId, mode, level: selectedLevel } });
        } catch (error) {
            console.error('Failed to start session:', error);
            const errorMessage = error instanceof Error ? error.message : 'Onbekende fout bij starten sessie';
            updateLaunchError(setSessionLaunchState, errorMessage);
            logEvent('session', 'Session start failed', { level: 'error', data: { message: errorMessage } });
        }
    }, [selectedLevel, selectedMode, effectiveGoalsForMode, feedbackStrictness, activeNewsHeadline, audioController, playbackRate, registerTutorTalk, setView, setMetrics]);

    const toggleRecording = useCallback(async () => {
        if (!isSessionActive || !sessionRef.current) {
            return;
        }

        if (isRecording) {
            // Stop recording
            audioController.stopRecording();
            // We do NOT add total duration here anymore, because we counted incrementally via VAD
            
            setIsRecording(false);
            // setRecordingStartTime(null); -- Removed
            setIsSessionReady(false); // Stop puls when user starts recording
        } else {
            // Start recording
            setIsSessionReady(false); // Stop puls when user clicks
            try {
                await audioController.startRecording({
                    onChunk: (chunk) => {
                        if (sessionRef.current) {
                            sessionRef.current.sendRealtimeInput({ media: chunk });
                        }
                        // LIVE VAD UPDATE: Only count talk time if user is actually speaking
                        if (chunk.isSpeaking) {
                            registerUserTalk(chunk.durationMs);
                        }
                    },
                    onStart: () => {
                        setIsRecording(true);
                        // setRecordingStartTime(Date.now()); -- Removed
                    },
                    // onStop removed - we handle this manually in toggleRecording/endSession to ensure reliability
                    onError: (error) => {
                        console.error('❌ Recording error:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Opnamefout opgetreden';
                        setAudioStatus({
                            message: errorMessage,
                            level: 'error',
                            timestamp: Date.now(),
                        });
                        setIsRecording(false); // Reset recording state on error
                        // setRecordingStartTime(null); -- Removed
                    },
                });
            } catch (error) {
                console.error('❌ Failed to start recording:', error);
                setIsRecording(false); // Reset recording state on error
                setRecordingStartTime(null);
                const errorMessage = error instanceof Error ? error.message : 'Kon opname niet starten';
                setAudioStatus({
                    message: errorMessage,
                    level: 'error',
                    timestamp: Date.now(),
                });
            }
        }
    }, [isSessionActive, isRecording, audioController, registerUserTalk]);

    const endSession = useCallback(async () => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        
        // Stop recording
        audioController.stopRecording();
        // We do NOT add total duration here anymore, because we counted incrementally via VAD

        audioController.stopPlayback();
        setIsSessionActive(false);
        setIsRecording(false);
        // setRecordingStartTime(null); -- Removed
        setIsSessionReady(false);
        stopTimer();
        
        // Capture current state for summary generation
        const currentTranscripts = transcripts;
        const level = selectedLevel;
        const activity = selectedMode;
        const goals = selectedGoals;
        const strictness = feedbackStrictness;

        if (sessionIdRef.current && currentTranscripts.length > 0) {
            const saved: SavedConversation = {
                id: sessionIdRef.current,
                date: new Date(metrics.startTimestamp ?? Date.now()).toISOString(),
                level: selectedLevel,
                activity: selectedMode,
                transcripts: currentTranscripts,
            };
            saveConversation(saved);
            setHistory(prev => [saved, ...prev]);
            
            // Update progress
            updateProgress(selectedLevel, selectedMode);
            refreshProgress();
        }
        
        setView('summary');

        // Generate summary if we have transcripts
        if (currentTranscripts.length > 0) {
            setSummary(null);
            setIsSummaryLoading(true);
            setSummaryProgress({ value: 0.1, label: 'Transcript analyseren...' });

            try {
                setSummaryProgress({ value: 0.3, label: 'Samenvatting genereren...' });
                // Small delay to allow UI to update
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const summaryData = await getSessionSummary(
                    currentTranscripts,
                    level,
                    activity,
                    goals,
                    strictness
                );
                
                setSummary(summaryData);
                setSummaryProgress({ value: 1.0, label: 'Klaar!' });
            } catch (err) {
                console.error('Failed to generate summary:', err);
                setSummaryProgress({ value: 0, label: 'Fout bij genereren samenvatting' });
            } finally {
                setIsSummaryLoading(false);
            }
        }
    }, [sessionRef, audioController, stopTimer, transcripts, selectedLevel, selectedMode, metrics, setView, refreshProgress, selectedGoals, feedbackStrictness]);

    const handleRequestGoalChange = useCallback(() => {
        setGoalSelectionState({ open: true, pendingGoals: sessionGoalsRef.current });
    }, []);

    const updatePendingGoals = useCallback((action: SetStateAction<LearningGoal[]>) => {
        setGoalSelectionState(prev => ({
            ...prev,
            pendingGoals: typeof action === 'function' ? action(prev.pendingGoals) : action,
        }));
    }, []);

    const confirmGoalSelection = useCallback(() => {
        const newGoals = goalSelectionState.pendingGoals;
        sessionGoalsRef.current = newGoals;
        setSelectedGoals(newGoals);
        setGoalSelectionState({ open: false, pendingGoals: [] });
        if (sessionRef.current && newGoals.length > 0) {
            const goalInstruction = `SYSTEEMINSTRUCTIE: Het leerdoel is gewijzigd naar: ${newGoals.join(', ')}. Pas je feedback hierop aan.`;
            sessionRef.current.sendRealtimeInput({ text: goalInstruction });
        }
    }, [goalSelectionState.pendingGoals]);

    const cancelGoalSelection = useCallback(() => {
        setGoalSelectionState({ open: false, pendingGoals: [] });
    }, []);

    const handleWordSelect = useCallback((word: string) => {
        setSelectedWord(word);
    }, []);

    const finalizeSessionMetrics = useCallback(() => {
        if (timerRef.current) {
            stopTimer();
        }
        const finalDuration = metrics.startTimestamp ? Date.now() - metrics.startTimestamp : 0;
        setMetrics(prev => ({ ...prev, durationMs: finalDuration }));
    }, [metrics.startTimestamp, stopTimer, timerRef]);

    const handleStartNewSession = useCallback(() => {
        setView('setup');
        resetSessionLaunchState();
    }, [setView, resetSessionLaunchState]);

    // Auto-fetch news headlines when news is enabled
    useEffect(() => {
        const wasEnabled = previousNewsEnabledRef.current;
        const isNowEnabled = newsEnabled;
        
        // Als nieuws net is ingeschakeld (van false naar true)
        if (!wasEnabled && isNowEnabled) {
            void refreshNewsHeadlines({ force: true });
        }
        
        // Update ref voor volgende keer
        previousNewsEnabledRef.current = newsEnabled;
    }, [newsEnabled, refreshNewsHeadlines]);

    // Timer for session duration
    useEffect(() => {
        if (isSessionActive && metrics.startTimestamp) {
            const interval = setInterval(() => {
                setMetrics(prev => {
                    if (!prev.startTimestamp) return prev;
                    return { ...prev, durationMs: Date.now() - prev.startTimestamp };
                });
            }, 1000);
            timerRef.current = interval;
            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };
        }
    }, [isSessionActive, metrics.startTimestamp, timerRef]);

    // Debug logging for talk times
    useEffect(() => {
        if (userTalkTime > 0 || tutorTalkTime > 0) {
            // console.log('📊 Talk time updated:', { user: userTalkTime, tutor: tutorTalkTime });
        }
    }, [userTalkTime, tutorTalkTime]);

    return {
        // Setup
        selectedLevel,
        setSelectedLevel,
        selectedMode,
        setSelectedMode,
        selectedGoals,
        setSelectedGoals,
        creativeWorkshops,
        setCreativeWorkshopState,
        pendingCreativeMode,
        setPendingCreativeMode,
        isCreativeModalOpen,
        openCreativeModal,
        closeCreativeModal,
        currentGoals,
        effectiveGoalsForMode,
        feedbackStrictness,
        updateFeedbackStrictness,
        resetFeedbackStrictness,
        newsEnabled,
        setNewsEnabled,
        newsHeadlines,
        newsLoading,
        newsError,
        newsLastUpdated,
        selectedNewsId,
        selectedNewsHeadline: activeNewsHeadline,
        selectNewsHeadline,
        refreshNewsHeadlines,
        newsConversationTopic,
        activeNewsHeadline,
        
        // Session controls
        isSessionActive,
        isRecording,
        audioStatus,
        playbackRate,
        setPlaybackRate,
        transcripts,
        toggleRecording,
        startSession,
        endSession,
        handleRequestFollowUp: requestFollowUp,
        handleRequestNewTopic: requestNewTopic,
        handleRequestGoalChange,
        handleRequestGoalFeedback: requestGoalFeedback,
        commandFeedback,
        topicsMetaState,
        sessionMetrics: metrics,
        commandPending,
        talkStats,
        pendingCommand,
        sessionLaunchState,
        isSessionReady,
        summaryProgress,
        goalSelectionState,
        updatePendingGoals,
        confirmGoalSelection,
        cancelGoalSelection,
        
        // Session summaries
        summary,
        isSummaryLoading,
        closingReflection,
        lastXPResult,
        bonusXP,
        completedMissions,
        newBadges,
        handleStartNewSession,
        
        // History
        history,
        progress,
        refreshProgress,
        levelProgress,
        selectedConversation,
        selectConversation: setSelectedConversation,
        deleteConversationById: (id: string) => {
            setHistory(prev => prev.filter(c => c.id !== id));
        },
        clearHistory: () => {
            setHistory([]);
        },
        
        // Topics & creative
        activeTopic,
        
        // Word modal
        selectedWord,
        setSelectedWord,
        handleWordSelect,
        
        // History helpers
        openConversation: (conversation: SavedConversation) => {
            setSelectedConversation(conversation);
        },
        exportSessionVocabulary: () => {
            // TODO: Implement vocabulary export
        },
        
        // Minigames
        registerMinigameResult: () => {
            // TODO: Implement minigame result registration
        },
        handleMinigameComplete: () => {
            // TODO: Implement minigame completion
        },
    };
};

