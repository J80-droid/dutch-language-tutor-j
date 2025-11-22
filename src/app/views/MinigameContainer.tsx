import React from 'react';
import MinigameHub from '@/components/MinigameHub';
import { useSessionState } from '../providers/SessionProvider';

export const MinigameContainer: React.FC = () => {
    const { history, handleMinigameComplete } = useSessionState();

    return <MinigameHub history={history} onComplete={handleMinigameComplete} />;
};


