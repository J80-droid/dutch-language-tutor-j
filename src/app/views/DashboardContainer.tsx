import React from 'react';
import DashboardView from '@/components/DashboardView';
import { AdaptiveDashboard } from '@/components/AdaptiveDashboard';
import { useSessionState } from '../providers/SessionProvider';
import { useGamificationData, useBadgeService } from '@/hooks/useGamificationState';
import { useUIState } from '../providers/UIProvider';

export const DashboardContainer: React.FC = () => {
    const { progress, history, selectedLevel } = useSessionState();
    const { data } = useGamificationData();
    const { badgeCatalog } = useBadgeService();
    const { setView } = useUIState();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
            <DashboardView
                progress={progress}
                history={history}
                streaks={data.streaks}
                badges={badgeCatalog}
            />
            <div style={{ marginTop: '24px' }}>
                <AdaptiveDashboard 
                    userLevel={selectedLevel} 
                    onSelectExercise={(exerciseId) => {
                        setView('extra-practice');
                        // Navigatie naar specifieke oefening zou hier kunnen worden toegevoegd
                    }} 
                />
            </div>
        </div>
    );
};


