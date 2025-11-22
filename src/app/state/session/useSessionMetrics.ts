import { useCallback, useRef, useState } from 'react';
import type { ConversationTopic } from '../../../services/geminiService';
import type { LearningGoal } from '../../../types';

export interface SessionMetrics {
    sessionId: string | null;
    startTimestamp: number | null;
    durationMs: number;
    userTurns: number;
    modelTurns: number;
    interruptions: number;
    lastAudioStop: number | null;
    totalRecordingMs: number;
    totalUserTalkMs: number;
    totalTutorTalkMs: number;
    goal: LearningGoal | null;
    currentTopic: ConversationTopic | null;
    topicHistory: ConversationTopic[];
}

export const createEmptyMetrics = (): SessionMetrics => ({
    sessionId: null,
    startTimestamp: null,
    durationMs: 0,
    userTurns: 0,
    modelTurns: 0,
    interruptions: 0,
    lastAudioStop: null,
    totalRecordingMs: 0,
    totalUserTalkMs: 0,
    totalTutorTalkMs: 0,
    goal: null,
    currentTopic: null,
    topicHistory: [],
});

export const useSessionMetrics = () => {
    const [metrics, setMetrics] = useState<SessionMetrics>(createEmptyMetrics());
    const timerRef = useRef<number | null>(null);

    const stopTimer = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    return {
        metrics,
        setMetrics,
        stopTimer,
        timerRef,
    };
};

