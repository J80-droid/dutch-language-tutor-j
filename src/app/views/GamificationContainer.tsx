import React from 'react';
import { GamificationDashboard } from '@/components/GamificationDashboard';
import { useUIState } from '../providers/UIProvider';

export const GamificationContainer: React.FC = () => {
    const { setView } = useUIState();

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Gamificatie</h1>
                <button
                    type="button"
                    onClick={() => setView('dashboard')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.4)',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                    }}
                >
                    Terug
                </button>
            </div>
            <GamificationDashboard onClose={() => setView('dashboard')} />
        </div>
    );
};

