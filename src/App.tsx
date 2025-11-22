import React from 'react';
import { AppProviders } from './app/providers/AppProviders';
import { AppShell } from './app/layout/AppShell';

const App: React.FC = () => (
    <AppProviders>
        <AppShell />
    </AppProviders>
);

export default App;

