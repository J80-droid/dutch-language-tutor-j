import React from 'react';
import { SessionProvider } from '../../providers/SessionProvider';
import { useSessionController } from './useSessionController';

export const SessionStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const value = useSessionController();
    return <SessionProvider value={value}>{children}</SessionProvider>;
};

