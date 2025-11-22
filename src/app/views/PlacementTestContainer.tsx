import React from 'react';
import { PlacementTest } from '@/components/PlacementTest';
import type { PlacementTestResult } from '@/services/placementTest';
import { useUIState } from '../providers/UIProvider';
import { useSessionState } from '../providers/SessionProvider';

export const PlacementTestContainer: React.FC = () => {
    const { setView } = useUIState();
    const { setSelectedLevel } = useSessionState();

    const handleComplete = (result: PlacementTestResult) => {
        // Update user level op basis van placement test resultaat
        setSelectedLevel(result.level);
        setView('setup');
    };

    const handleCancel = () => {
        setView('setup');
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <PlacementTest onComplete={handleComplete} onCancel={handleCancel} />
        </div>
    );
};

