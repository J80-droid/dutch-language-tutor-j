import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useConversationFlow } from '../useConversationFlow';
import { createEmptyMetrics } from '../useSessionMetrics';
import type { Transcript, LearningGoal } from '@/types';
import { GOAL_INSTRUCTIONS } from '@/services/geminiService';
import type { PendingCommand } from '../types';

const createTranscript = (speaker: 'user' | 'model' | 'system', text: string): Transcript => ({
    speaker,
    text,
});

const { pickConversationTopicMock } = vi.hoisted(() => ({
    pickConversationTopicMock: vi.fn(),
}));

vi.mock('@/services/geminiService', async () => {
    const actual = await vi.importActual<typeof import('@/services/geminiService')>('@/services/geminiService');
    return {
        ...actual,
        pickConversationTopic: pickConversationTopicMock,
    };
});

const setupHook = () => {
    const scheduleCommandReset = vi.fn();

    const hook = renderHook(() => {
        const [transcripts, setTranscripts] = React.useState<Transcript[]>([]);
        const [isSessionActive, setIsSessionActive] = React.useState(false);
        const [commandFeedback, setCommandFeedback] = React.useState<string | null>(null);
        const [topicsMetaState, setTopicsMetaState] = React.useState(null);
        const [sessionMetrics, setSessionMetrics] = React.useState(createEmptyMetrics());
        const [commandPending, setCommandPending] = React.useState(false);
        const [, setPendingCommand] = React.useState<PendingCommand>(null);

        const sessionRef = React.useRef<{ sendRealtimeInput: ReturnType<typeof vi.fn> } | null>(null);
        const sessionGoalsRef = React.useRef<LearningGoal[]>(['fluency']);
        const sessionIdRef = React.useRef<string | null>('session-1');
        const activeTopicRef = React.useRef<any>(null);
        const topicHistoryRef = React.useRef<any[]>([]);

        const flow = useConversationFlow({
            sessionRef,
            transcripts,
            setTranscripts,
            isSessionActive,
            selectedLevel: 'A1',
            sessionIdRef,
            sessionGoalsRef,
            activeTopicRef,
            topicHistoryRef,
            setTopicsMetaState,
            setSessionMetrics,
            setCommandFeedback,
            setIsCommandPending: setCommandPending,
            scheduleCommandReset,
            setPendingCommand,
        });

        return {
            flow,
            transcripts,
            setTranscripts,
            setIsSessionActive,
            sessionRef,
            commandFeedback,
            commandPending,
            sessionGoalsRef,
            sessionMetrics,
            setSessionMetrics,
            setCommandFeedback,
            topicsMetaState,
            scheduleCommandReset,
        };
    });

    return { ...hook, scheduleCommandReset };
};

beforeEach(() => {
    pickConversationTopicMock.mockReset();
});

describe('useConversationFlow', () => {
    it('voegt systeemmelding toe wanneer geen sessie actief is', () => {
        const { result } = setupHook();

        act(() => {
            result.current.flow.requestFollowUp();
        });

        expect(result.current.transcripts).toHaveLength(1);
        expect(result.current.transcripts[0]).toEqual(
            createTranscript('system', 'Geen actieve sessie om een vervolg te vragen.'),
        );
    });

    it('stuurt vervolg-instructie door wanneer sessie actief is', () => {
        const { result } = setupHook();
        const sendRealtimeInput = vi.fn();

        act(() => {
            result.current.sessionRef.current = { sendRealtimeInput };
            result.current.sessionGoalsRef.current = ['fluency'];
            result.current.setTranscripts([createTranscript('user', 'Hallo wereld!')]);
            result.current.setIsSessionActive(true);
        });

        act(() => {
            result.current.flow.requestFollowUp();
        });

        expect(sendRealtimeInput).toHaveBeenCalledTimes(1);
        const instruction = sendRealtimeInput.mock.calls[0][0].text as string;
        expect(instruction).toContain(GOAL_INSTRUCTIONS['fluency']);
        expect(result.current.commandFeedback).toMatch(/Tutor gevraagd/);
    });

    it('haalt een nieuw onderwerp op en werkt state bij', async () => {
        pickConversationTopicMock.mockResolvedValue({
            topic: {
                theme: 'Koffiecultuur',
                difficulty: 'makkelijk',
                keywords: ['barista', 'espresso'],
            },
            meta: {
                source: 'remote',
                timestamp: new Date().toISOString(),
            },
        });

        const { result, scheduleCommandReset } = setupHook();

        act(() => {
            result.current.sessionRef.current = { sendRealtimeInput: vi.fn() };
            result.current.setIsSessionActive(true);
            result.current.setSessionMetrics(prev => ({
                ...prev,
                sessionId: 'session-1',
                startTimestamp: Date.now(),
            }));
        });

        await act(async () => {
            await result.current.flow.requestNewTopic();
        });

        await waitFor(() => {
            expect(result.current.sessionMetrics.currentTopic?.theme).toBe('Koffiecultuur');
        });

        expect(result.current.transcripts[result.current.transcripts.length - 1]).toEqual(
            createTranscript('system', 'Tutor gevraagd om over "Koffiecultuur" te praten.'),
        );
        expect(result.current.commandFeedback).toBe('Nieuw onderwerp aangevraagd: Koffiecultuur.');
        expect(scheduleCommandReset).toHaveBeenCalledWith(2600);
    });
});

