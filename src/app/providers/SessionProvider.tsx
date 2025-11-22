import React, { createContext, useContext } from 'react';
import type { SessionContextValue } from '../state/session/types';

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider: React.FC<{ value: SessionContextValue; children: React.ReactNode }> = ({
    value,
    children,
}) => {
    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSessionState = (): SessionContextValue => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSessionState moet binnen een SessionProvider gebruikt worden.');
    }
    return context;
};

