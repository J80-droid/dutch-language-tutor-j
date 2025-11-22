import { useCallback } from 'react';
import {
    pickConversationTopic,
    type ConversationTopic,
    type TopicsMeta,
    GOAL_INSTRUCTIONS,
    type NewsConversationTopic,
} from '@/services/geminiService';
import type { LearningGoal, Transcript, CEFRLevel } from '@/types';
import type { NewsFeedEntry } from '@/services/newsFeedService';
import { logEvent } from '@/utils/logger';
import type { SessionMetrics } from './useSessionMetrics';
import type { PendingCommand } from './types';

interface ConversationFlowOptions {
    sessionRef: React.MutableRefObject<any>;
    transcripts: Transcript[];
    setTranscripts: React.Dispatch<React.SetStateAction<Transcript[]>>;
    isSessionActive: boolean;
    selectedLevel: CEFRLevel;
    sessionIdRef: React.MutableRefObject<string | null>;
    sessionGoalsRef: React.MutableRefObject<LearningGoal[]>;
    activeTopicRef: React.MutableRefObject<ConversationTopic | null>;
    topicHistoryRef: React.MutableRefObject<ConversationTopic[]>;
    newsConversationRef: React.MutableRefObject<NewsConversationTopic | null>;
    activeNewsEntryRef: React.MutableRefObject<NewsFeedEntry | null>;
    setTopicsMetaState: React.Dispatch<React.SetStateAction<TopicsMeta | null>>;
    setSessionMetrics: React.Dispatch<React.SetStateAction<SessionMetrics>>;
    setCommandFeedback: React.Dispatch<React.SetStateAction<string | null>>;
    setIsCommandPending: React.Dispatch<React.SetStateAction<boolean>>;
    scheduleCommandReset: (duration?: number) => void;
    setPendingCommand: React.Dispatch<React.SetStateAction<PendingCommand>>;
    newsEnabled: boolean;
    getLatestNewsHeadlines: () => NewsFeedEntry[];
    refreshNewsHeadlines: (options?: { force?: boolean }) => Promise<NewsFeedEntry[]>;
    setNewsConversationTopic: React.Dispatch<React.SetStateAction<NewsConversationTopic | null>>;
    selectNewsHeadline: (id: string | null) => void;
    summarizeNewsForLevel: (level: CEFRLevel, entry: NewsFeedEntry) => Promise<NewsConversationTopic>;
}

const truncateText = (text: string, maxLength = 200) => {
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength - 3)}...`;
};

const formatKeywordList = (keywords: string[]) => {
    if (!keywords.length) {
        return 'geen specifieke trefwoorden';
    }
    if (keywords.length === 1) {
        return keywords[0];
    }
    const head = keywords.slice(0, -1).join(', ');
    return `${head} en ${keywords[keywords.length - 1]}`;
};

export const useConversationFlow = ({
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
    setSessionMetrics,
    setCommandFeedback,
    setIsCommandPending,
    scheduleCommandReset,
    setPendingCommand,
    newsEnabled,
    getLatestNewsHeadlines,
    refreshNewsHeadlines,
    setNewsConversationTopic,
    selectNewsHeadline,
    summarizeNewsForLevel,
}: ConversationFlowOptions) => {
    const requestFollowUp = useCallback(() => {
        if (!isSessionActive || !sessionRef.current) {
            setTranscripts(prev => [...prev, { speaker: 'system', text: 'Geen actieve sessie om een vervolg te vragen.' }]);
            return;
        }
        setIsCommandPending(true);

        const session = sessionRef.current;
        const lastUserTurn = [...transcripts].reverse().find(t => t.speaker === 'user' && t.text.trim().length > 0);
        const snippet = lastUserTurn ? truncateText(lastUserTurn.text.trim(), 200) : '';
        const topicLabel = activeTopicRef.current?.theme ?? 'het huidige onderwerp';
        const activeGoals = sessionGoalsRef.current.length ? sessionGoalsRef.current : ['fluency'];
        const primaryGoal = activeGoals[0];
        const goalInstruction = GOAL_INSTRUCTIONS[primaryGoal] ?? '';
        const instruction = snippet
            ? `SYSTEEMINSTRUCTIE: Stel onmiddellijk een verdiepende vervolgvraag gebaseerd op dit antwoord van de leerling: "${snippet}". Houd rekening met het leerdoel: ${goalInstruction}`
            : `SYSTEEMINSTRUCTIE: Stel onmiddellijk een verdiepende vervolgvraag die aansluit bij ${topicLabel}. Houd rekening met het leerdoel: ${goalInstruction}`;

        try {
            session.sendRealtimeInput({ text: instruction });
            logEvent('session', 'Follow-up requested', {
                data: {
                    sessionId: sessionIdRef.current,
                    goals: activeGoals,
                    topic: activeTopicRef.current?.theme,
                    snippetLength: snippet.length,
                },
            });
            setTranscripts(prev => [...prev, { speaker: 'system', text: 'Tutor gevraagd om door te vragen.' }]);
            setCommandFeedback('Tutor gevraagd om een vervolgvraag te stellen.');
            scheduleCommandReset(2200);
        } catch (error) {
            console.error('Failed to request follow-up:', error);
            setIsCommandPending(false);
            setCommandFeedback('Kon de tutor niet instrueren. Probeer het opnieuw.');
            logEvent('session', 'Follow-up request failed', {
                level: 'error',
                data: {
                    sessionId: sessionIdRef.current,
                    message: error instanceof Error ? error.message : String(error),
                },
            });
        }
    }, [
        activeTopicRef,
        isSessionActive,
        scheduleCommandReset,
        sessionGoalsRef,
        sessionRef,
        setCommandFeedback,
        setIsCommandPending,
        setTranscripts,
        transcripts,
        sessionIdRef,
    ]);

    const requestNewTopic = useCallback(async () => {
        if (!isSessionActive || !sessionRef.current) {
            setTranscripts(prev => [...prev, { speaker: 'system', text: 'Geen actieve sessie om een nieuw onderwerp te starten.' }]);
            return;
        }
        setIsCommandPending(true);
        setPendingCommand('new-topic');

        const session = sessionRef.current;
        const activeGoals = sessionGoalsRef.current.length ? sessionGoalsRef.current : ['fluency'];
        const primaryGoal = activeGoals[0];
        const goalInstruction = GOAL_INSTRUCTIONS[primaryGoal] ?? '';

        let fallbackNotice: string | null = null;

        if (newsEnabled && newsConversationRef.current) {
            const resolveNextNewsEntry = async (): Promise<NewsFeedEntry | null> => {
                let headlines = getLatestNewsHeadlines();
                if (headlines.length === 0) {
                    const refreshed = await refreshNewsHeadlines({ force: true });
                    if (refreshed.length > 0) {
                        headlines = refreshed;
                    } else {
                        headlines = getLatestNewsHeadlines();
                    }
                }
                if (headlines.length === 0) {
                    return null;
                }
                const currentId = activeNewsEntryRef.current?.id ?? null;
                if (!currentId) {
                    return headlines[0];
                }
                const currentIndex = headlines.findIndex(item => item.id === currentId);
                if (currentIndex === -1) {
                    return headlines[0];
                }
                let nextIndex = currentIndex + 1;
                if (nextIndex >= headlines.length) {
                    const refreshed = await refreshNewsHeadlines({ force: true });
                    const refreshedHeadlines = refreshed.length > 0 ? refreshed : getLatestNewsHeadlines();
                    if (refreshedHeadlines.length === 0) {
                        return null;
                    }
                    headlines = refreshedHeadlines;
                    nextIndex = 0;
                }
                let candidate = headlines[nextIndex] ?? null;
                if (candidate && currentId && candidate.id === currentId) {
                    const alternative = headlines.find(item => item.id !== currentId);
                    candidate = alternative ?? null;
                }
                return candidate;
            };

            try {
                const nextEntry = await resolveNextNewsEntry();
                if (nextEntry) {
                    const newsTopic = await summarizeNewsForLevel(selectedLevel, nextEntry);
                    newsConversationRef.current = newsTopic;
                    activeNewsEntryRef.current = nextEntry;
                    setNewsConversationTopic(newsTopic);
                    selectNewsHeadline(nextEntry.id);
                    const meta: TopicsMeta = {
                        source: 'news',
                        timestamp: Date.now(),
                        statusCode: null,
                        error: null,
                    };
                    setTopicsMetaState(meta);
                    activeTopicRef.current = newsTopic;
                    if (!topicHistoryRef.current.some(topic => topic.theme === newsTopic.theme)) {
                        topicHistoryRef.current = [...topicHistoryRef.current, newsTopic];
                    }
                    setSessionMetrics(prev => {
                        if (!prev.sessionId) {
                            return prev;
                        }
                        const alreadyLogged = prev.topicHistory.some(topic => topic.theme === newsTopic.theme);
                        const updatedHistory = alreadyLogged ? prev.topicHistory : [...prev.topicHistory, newsTopic];
                        return {
                            ...prev,
                            currentTopic: newsTopic,
                            topicHistory: updatedHistory,
                        };
                    });
                    const keywordText = newsTopic.keywords.length
                        ? `Belangrijke trefwoorden: ${formatKeywordList(newsTopic.keywords)}.`
                        : '';
                    const instructionParts = [
                        `SYSTEEMINSTRUCTIE: Wissel naar het actuele nieuwsartikel "${newsTopic.headline}".`,
                        `Vat het kort samen en benoem: ${newsTopic.sourceNote}.`,
                        'Stel daarna een open vraag over dit nieuws en nodig de leerling uit om zijn mening te geven.',
                        keywordText,
                        goalInstruction ? `Houd rekening met het leerdoel: ${goalInstruction}` : '',
                    ].filter(Boolean);
                    session.sendRealtimeInput({ text: instructionParts.join(' ') });
                    logEvent('news', 'News topic switch requested', {
                        data: {
                            sessionId: sessionIdRef.current,
                            headline: newsTopic.headline,
                            source: newsTopic.sourceName,
                        },
                    });
                    setTranscripts(prev => [
                        ...prev,
                        { speaker: 'system', text: `Tutor gevraagd om over het nieuws "${newsTopic.headline}" te praten.` },
                    ]);
                    setCommandFeedback(`Nieuw nieuwsartikel: ${newsTopic.headline}.`);
                    scheduleCommandReset(2800);
                    return;
                }
                fallbackNotice = 'Geen ander nieuwsartikel beschikbaar. Er wordt overgeschakeld op een algemeen onderwerp.';
                logEvent('news', 'News topic switch unavailable', {
                    level: 'warn',
                    data: {
                        sessionId: sessionIdRef.current,
                        reason: 'no-next-article',
                    },
                });
            } catch (error) {
                console.error('Failed to switch to next news item:', error);
                logEvent('news', 'News topic switch failed', {
                    level: 'error',
                    data: {
                        sessionId: sessionIdRef.current,
                        message: error instanceof Error ? error.message : String(error),
                    },
                });
                fallbackNotice = 'Kon geen nieuw nieuwsartikel laden. Er wordt overgeschakeld op een algemeen onderwerp.';
            }
        }

        if (newsEnabled && newsConversationRef.current) {
            setTranscripts(prev => [
                ...prev,
                ...(fallbackNotice ? [{ speaker: 'system', text: fallbackNotice }] : []),
                {
                    speaker: 'system',
                    text:
                        'Geen nieuw nieuwsartikel beschikbaar. Blijf praten over het huidige nieuws totdat er een nieuwe headline wordt opgehaald.',
                },
            ]);
            setCommandFeedback('Geen extra nieuws beschikbaar; ga verder met het huidige artikel.');
            setIsCommandPending(false);
            setPendingCommand(null);
            return;
        }

        const excludeThemes = topicHistoryRef.current.map(topic => topic.theme);
        const { topic: newTopic, meta: newMeta } = await pickConversationTopic(selectedLevel, excludeThemes);
        setTopicsMetaState(newMeta ?? null);
        if (newMeta?.source === 'fallback') {
            logEvent('topics', 'Topic switch fallback', {
                level: 'warn',
                data: {
                    message: newMeta.error,
                    statusCode: newMeta.statusCode,
                    level: selectedLevel,
                    theme: newTopic.theme,
                },
            });
            fallbackNotice =
                fallbackNotice ?? 'Kon geen nieuw dynamisch onderwerp ophalen, er wordt teruggevallen op een standaardthema.';
        }

        activeTopicRef.current = newTopic;
        if (!topicHistoryRef.current.some(topic => topic.theme === newTopic.theme)) {
            topicHistoryRef.current = [...topicHistoryRef.current, newTopic];
        }

        setSessionMetrics(prev => {
            if (!prev.sessionId) {
                return prev;
            }
            const alreadyLogged = prev.topicHistory.some(topic => topic.theme === newTopic.theme);
            const updatedHistory = alreadyLogged ? prev.topicHistory : [...prev.topicHistory, newTopic];
            return {
                ...prev,
                currentTopic: newTopic,
                topicHistory: updatedHistory,
            };
        });

        const keywordText = newTopic.keywords.length ? `Belangrijke trefwoorden: ${formatKeywordList(newTopic.keywords)}.` : '';
        const instruction = `SYSTEEMINSTRUCTIE: Wissel naar een nieuw gespreksonderwerp. Introduceer het thema "${newTopic.theme}" (${newTopic.difficulty}). ${keywordText} Leg kort uit waarom dit relevant is voor de leerling en stel daarna een open vraag. Houd rekening met het leerdoel: ${goalInstruction}`;

        try {
            session.sendRealtimeInput({ text: instruction });
            logEvent('session', 'Topic switch requested', {
                data: {
                    sessionId: sessionIdRef.current,
                    goals: activeGoals,
                    newTopic: newTopic.theme,
                    difficulty: newTopic.difficulty,
                },
            });
            setTranscripts(prev => [
                ...prev,
                ...(fallbackNotice ? [{ speaker: 'system', text: fallbackNotice }] : []),
                { speaker: 'system', text: `Tutor gevraagd om over "${newTopic.theme}" te praten.` },
            ]);
            setCommandFeedback(
                fallbackNotice ? `Overgeschakeld naar standaardonderwerp: ${newTopic.theme}.` : `Nieuw onderwerp aangevraagd: ${newTopic.theme}.`,
            );
            scheduleCommandReset(2600);
        } catch (error) {
            console.error('Failed to request new topic:', error);
            setIsCommandPending(false);
            setPendingCommand(null);
            setCommandFeedback('Kon het nieuwe onderwerp niet doorgeven. Probeer het opnieuw.');
            logEvent('session', 'Topic switch request failed', {
                level: 'error',
                data: {
                    sessionId: sessionIdRef.current,
                    message: error instanceof Error ? error.message : String(error),
                },
            });
        }
    }, [
        activeNewsEntryRef,
        activeTopicRef,
        getLatestNewsHeadlines,
        isSessionActive,
        newsConversationRef,
        newsEnabled,
        refreshNewsHeadlines,
        scheduleCommandReset,
        selectedLevel,
        selectNewsHeadline,
        sessionGoalsRef,
        sessionIdRef,
        sessionRef,
        setCommandFeedback,
        setIsCommandPending,
        setNewsConversationTopic,
        setPendingCommand,
        setSessionMetrics,
        setTopicsMetaState,
        setTranscripts,
        summarizeNewsForLevel,
        topicHistoryRef,
    ]);

    const requestGoalFeedback = useCallback(() => {
        if (!isSessionActive || !sessionRef.current) {
            setTranscripts(prev => [...prev, { speaker: 'system', text: 'Geen actieve sessie om feedback op te vragen.' }]);
            return;
        }
        setIsCommandPending(true);
        setPendingCommand('goal-feedback');

        const session = sessionRef.current;
        const activeGoals = sessionGoalsRef.current.length ? sessionGoalsRef.current : ['fluency'];
        const primaryGoal = activeGoals[0];
        const goalInstruction = GOAL_INSTRUCTIONS[primaryGoal] ?? '';
        const prompt =
            `SYSTEEMINSTRUCTIE: Geef een korte tussentijdse feedback op het gesprek tot nu toe. ` +
            `Focus specifiek op het leerdoel: ${goalInstruction}. ` +
            'Benoem minstens één compliment en één concrete tip, gevolgd door een korte vervolgstap voor de leerling.';

        try {
            session.sendRealtimeInput({ text: prompt });
            logEvent('session', 'Mid-session feedback requested', {
                data: {
                    sessionId: sessionIdRef.current,
                    goals: activeGoals,
                    topic: activeTopicRef.current?.theme,
                },
            });
            setTranscripts(prev => [...prev, { speaker: 'system', text: 'Tutor gevraagd om tussentijdse feedback.' }]);
            setCommandFeedback('Tutor werkt aan tussentijdse feedback.');
            scheduleCommandReset(2600);
        } catch (error) {
            console.error('Failed to request goal feedback:', error);
            setIsCommandPending(false);
            setPendingCommand(null);
            setCommandFeedback('Kon de feedback niet opvragen. Probeer het opnieuw.');
        }
    }, [
        activeTopicRef,
        isSessionActive,
        scheduleCommandReset,
        sessionGoalsRef,
        sessionRef,
        setCommandFeedback,
        setIsCommandPending,
        setPendingCommand,
        setTranscripts,
        sessionIdRef,
    ]);

    return {
        requestFollowUp,
        requestNewTopic,
        requestGoalFeedback,
    };
};

