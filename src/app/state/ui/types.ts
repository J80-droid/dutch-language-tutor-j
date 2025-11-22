import type { Theme } from '../../../../types';

export type AppView =
    | 'setup'
    | 'session'
    | 'summary'
    | 'history'
    | 'dashboard'
    | 'missions'
    | 'minigames'
    | 'chat'
    | 'topics'
    | 'extra-practice'
    | 'srs-review'
    | 'placement-test'
    | 'learning-paths'
    | 'writing-exercise'
    | 'speech-exercise'
    | 'gamification'
    | 'profile';

export interface UIContextValue {
    view: AppView;
    setView: (next: AppView) => void;
    theme: Theme;
    setTheme: (next: Theme) => void;
}

