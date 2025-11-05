

import React from 'react';
import { ProgressData, CEFR_LEVELS, ACTIVITY_MODES, ACTIVITY_MODE_TRANSLATIONS } from '../types';

interface Props {
  progress: ProgressData;
}

const DashboardView: React.FC<Props> = ({ progress }) => {
  return (
    <div>
      <h2 style={{textAlign: 'center'}}>Jouw Voortgang</h2>
      <p style={{textAlign: 'center', marginBottom: '20px'}}>Dit rooster toont het aantal sessies dat je hebt voltooid voor elk niveau en type activiteit.</p>
      <div style={styles.gridContainer}>
        <div style={styles.headerCell}></div> {/* Top-left empty cell */}
        {ACTIVITY_MODES.map(mode => (
          <div key={mode} style={styles.headerCell}>{ACTIVITY_MODE_TRANSLATIONS[mode]}</div>
        ))}

        {CEFR_LEVELS.map(level => (
          <React.Fragment key={level}>
            <div style={styles.headerCell}>{level}</div>
            {ACTIVITY_MODES.map(mode => (
              <div key={`${level}-${mode}`} style={styles.cell}>
                {progress.stats?.[level]?.[mode] || 0}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: `auto repeat(${ACTIVITY_MODES.length}, 1fr)`,
    gap: '5px',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '5px',
    backgroundColor: 'var(--color-secondary-bg)',
    maxWidth: '800px',
    margin: '0 auto',
  },
  headerCell: {
    fontWeight: 'bold',
    padding: '10px',
    textAlign: 'center',
  },
  cell: {
    padding: '15px 10px',
    textAlign: 'center',
    backgroundColor: 'var(--color-secondary)',
    borderRadius: '5px',
  },
};

export default DashboardView;