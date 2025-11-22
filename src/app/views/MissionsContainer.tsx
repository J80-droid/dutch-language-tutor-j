import React from 'react';
import MissionsView from '@/components/MissionsView';
import { useMissionService, useSeasonalService } from '@/hooks/useGamificationState';
import { useSessionState } from '../providers/SessionProvider';

export const MissionsContainer: React.FC = () => {
    const { missions, refreshMissions } = useMissionService();
    const { seasonalEvents, refreshSeasonalEvents } = useSeasonalService();
    const { selectedLevel } = useSessionState();

    return (
        <MissionsView
            missions={missions}
            seasonalEvents={seasonalEvents}
            onRefresh={() => refreshMissions(selectedLevel)}
            onRefreshSeasonal={refreshSeasonalEvents}
        />
    );
};

