import React, { useMemo } from 'react';
import SummaryView from '@/components/SummaryView';
import { useSessionState } from '../providers/SessionProvider';
import { getNextThemeUnlock } from '@/utils/themeUtils';

export const SummaryContainer: React.FC = () => {
    const {
        summary,
        isSummaryLoading,
        summaryProgress,
        handleStartNewSession,
        exportSessionVocabulary,
        closingReflection,
        lastXPResult,
        bonusXP,
        levelProgress,
        completedMissions,
        newBadges,
        newsConversationTopic,
    } = useSessionState();

    const nextThemeUnlock = useMemo(() => getNextThemeUnlock(levelProgress.level), [levelProgress.level]);

    return (
        <SummaryView
            summary={summary}
            isLoading={isSummaryLoading}
            progress={summaryProgress}
            onStartNewSession={handleStartNewSession}
            onExport={exportSessionVocabulary}
            closingReflection={closingReflection}
            xpResult={lastXPResult}
            bonusXP={bonusXP}
            levelProgress={levelProgress}
            nextThemeUnlock={nextThemeUnlock}
            completedMissions={completedMissions}
            newBadges={newBadges}
            newsTopic={newsConversationTopic}
        />
    );
};


