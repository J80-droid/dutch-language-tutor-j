import React from 'react';
import { UIProvider } from './UIProvider';
import { GamificationProvider } from '@/hooks/useGamificationState';
import { SessionStateProvider } from '../state/session/SessionStateProvider';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <UIProvider>
            <GamificationProvider>
                <SessionStateProvider>{children}</SessionStateProvider>
            </GamificationProvider>
        </UIProvider>
    );
};

