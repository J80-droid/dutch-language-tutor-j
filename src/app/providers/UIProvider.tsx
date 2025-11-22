import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { applyTheme, getInitialTheme } from '@/utils/themeUtils';
import type { Theme } from '@/types';
import type { AppView, UIContextValue } from '../state/ui/types';

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [view, setView] = useState<AppView>('setup');
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const setTheme = useMemo(
        () => (next: Theme) => {
            setThemeState(next);
        },
        [],
    );

    const value = useMemo<UIContextValue>(
        () => ({
            view,
            setView,
            theme,
            setTheme,
        }),
        [setTheme, theme, view],
    );

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUIState = (): UIContextValue => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUIState moet binnen een UIProvider gebruikt worden.');
    }
    return context;
};

