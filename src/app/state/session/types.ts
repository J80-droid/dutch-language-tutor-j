import type { Dispatch, SetStateAction } from 'react';
import type {
    ActivityMode,
    CEFRLevel,
    CreativeActivityMode,
    CreativeWorkshopState,
    FeedbackAspect,
    FeedbackStrictnessSettings,
    LearningGoal,
    MinigameResult,
    MissionProgress,
    ProgressData,
    SavedConversation,
    SessionSummary,
    StrictnessLevel,
    TopicsMeta,
    Transcript,
    XPUpdateResult,
    BadgeProgress,
} from '@/types';
import type { ConversationTopic, NewsConversationTopic } from '@/services/geminiService';
import type { NewsFeedEntry } from '@/services/newsFeedService';
import type { XPLevelProgress } from '@/utils/gamificationUtils';
import type { SessionMetrics } from './useSessionMetrics';

export type PendingCommand = 'new-topic' | 'goal-feedback' | null;

export interface SessionLaunchState {
    active: boolean;
    progress: number;
    label: string;
    sublabel: string | null;
    error: string | null;
}

export interface SessionContextValue {
    // Setup
    selectedLevel: CEFRLevel;
    setSelectedLevel: (level: CEFRLevel) => void;
    selectedMode: ActivityMode;
    setSelectedMode: (mode: ActivityMode) => void;
    selectedGoals: LearningGoal[];
    setSelectedGoals: Dispatch<SetStateAction<LearningGoal[]>>;
    creativeWorkshops: Partial<Record<CreativeActivityMode, CreativeWorkshopState>>;
    setCreativeWorkshopState: (state: CreativeWorkshopState) => void;
    pendingCreativeMode: CreativeActivityMode | null;
    setPendingCreativeMode: (mode: CreativeActivityMode | null) => void;
    isCreativeModalOpen: boolean;
    openCreativeModal: (mode: CreativeActivityMode) => void;
    closeCreativeModal: () => void;
    currentGoals: LearningGoal[];
    effectiveGoalsForMode: (mode: ActivityMode) => LearningGoal[];
    feedbackStrictness: FeedbackStrictnessSettings;
    updateFeedbackStrictness: (aspect: FeedbackAspect, level: StrictnessLevel) => void;
    resetFeedbackStrictness: () => void;
    newsEnabled: boolean;
    setNewsEnabled: (enabled: boolean) => void;
    newsHeadlines: NewsFeedEntry[];
    newsLoading: boolean;
    newsError: string | null;
    newsLastUpdated: number | null;
    selectedNewsId: string | null;
    selectedNewsHeadline: NewsFeedEntry | null;
    selectNewsHeadline: (id: string | null) => void;
    refreshNewsHeadlines: (options?: { force?: boolean }) => Promise<void>;
    newsConversationTopic: NewsConversationTopic | null;
    activeNewsHeadline: NewsFeedEntry | null;

    // Session controls
    isSessionActive: boolean;
    isRecording: boolean;
    audioStatus: AudioStatusMessage | null;
    playbackRate: number;
    setPlaybackRate: Dispatch<SetStateAction<number>>;
    transcripts: Transcript[];
    toggleRecording: () => Promise<void>;
    startSession: (options?: {
        mode?: ActivityMode;
        goals?: LearningGoal[];
        strictness?: FeedbackStrictnessSettings;
        creative?: CreativeWorkshopState | null;
        newsHeadline?: NewsFeedEntry | null;
    }) => Promise<void>;
    endSession: () => Promise<void>;
    handleRequestFollowUp: () => void;
    handleRequestNewTopic: () => Promise<void>;
    handleRequestGoalChange: () => void;
    handleRequestGoalFeedback: () => void;
    commandFeedback: string | null;
    topicsMetaState: TopicsMeta | null;
    sessionMetrics: SessionMetrics;
    commandPending: boolean;
    talkStats: {
        userShare: number;
        tutorShare: number;
        userWidth: number;
        tutorWidth: number;
        hasData: boolean;
        fallbackNotice: string | null;
    };
    pendingCommand: PendingCommand;
    sessionLaunchState: SessionLaunchState;
    isSessionReady: boolean; // True wanneer sessie klaar is maar gebruiker nog niet heeft geklikt
    summaryProgress: {
        value: number;
        label: string;
    };
    goalSelectionState: {
        open: boolean;
        pendingGoals: LearningGoal[];
    };
    updatePendingGoals: Dispatch<SetStateAction<LearningGoal[]>>;
    confirmGoalSelection: () => void;
    cancelGoalSelection: () => void;

    // Session summaries
    summary: SessionSummary | null;
    isSummaryLoading: boolean;
    closingReflection: string | null;
    lastXPResult: XPUpdateResult | null;
    bonusXP: number;
    completedMissions: MissionProgress[];
    newBadges: BadgeProgress[];
    handleStartNewSession: () => void;

    // History
    history: SavedConversation[];
    progress: ProgressData;
    refreshProgress: () => void;
    levelProgress: XPLevelProgress;
    selectedConversation: SavedConversation | null;
    selectConversation: (conversation: SavedConversation | null) => void;
    deleteConversationById: (id: string) => void;
    clearHistory: () => void;

    // Topics & creative
    activeTopic: ConversationTopic | null;

    // Word modal
    selectedWord: string | null;
    setSelectedWord: (word: string | null) => void;
    handleWordSelect: (word: string) => void;

    // History helpers
    openConversation: (conversation: SavedConversation) => void;
    exportSessionVocabulary: () => void;

    // Minigames
    registerMinigameResult: (result: MinigameResult) => void;
    handleMinigameComplete: (result: { conversationId: string; title: string; correct: number; total: number }) => void;
}

export interface AudioStatusMessage {
    message: string;
    level: 'info' | 'warn' | 'error';
    timestamp: number;
}

