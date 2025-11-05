
import React from 'react';
import { SessionSummary } from '../types';

interface Props {
  summary: SessionSummary | null;
  isLoading: boolean;
  onStartNewSession: () => void;
  onExport: () => void;
}

const SummaryView: React.FC<Props> = ({ summary, isLoading, onStartNewSession, onExport }) => {
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loader}></div>
        <p>Je sessieverslag wordt gegenereerd...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={styles.container}>
        <h2>Geen Samenvatting Beschikbaar</h2>
        <p>Er was een probleem bij het genereren van het verslag voor je sessie.</p>
        <button onClick={onStartNewSession} style={styles.button}>Start Nieuwe Sessie</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Sessieverslag</h2>
      
      <div style={styles.section}>
          <h3 style={styles.subHeader}>Leerpunten</h3>
          <p>{summary.learningPoints}</p>
      </div>

      {summary.newVocabulary && summary.newVocabulary.length > 0 && (
        <div style={styles.section}>
            <h3 style={styles.subHeader}>Nieuwe Woordenschat</h3>
            <ul style={styles.vocabList}>
                {summary.newVocabulary.map((item, index) => (
                    <li key={index} style={styles.vocabItem}>
                        <strong>{item.word}</strong>: {item.translation}
                        <br />
                        <small><em>{item.example}</em></small>
                    </li>
                ))}
            </ul>
            <button onClick={onExport} style={{...styles.button, ...styles.secondaryButton}}>Exporteer Woordenlijst</button>
        </div>
      )}

      <div style={styles.section}>
          <h3 style={styles.subHeader}>Suggesties voor de Volgende Keer</h3>
          <p>{summary.suggestions}</p>
      </div>
      
      <button onClick={onStartNewSession} style={styles.button}>
        Start Nieuwe Sessie
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { textAlign: 'center', maxWidth: '600px', margin: '0 auto' },
    header: { marginBottom: '20px' },
    section: {
        backgroundColor: 'var(--color-secondary-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        textAlign: 'left',
    },
    subHeader: { marginTop: 0, borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '10px' },
    vocabList: { listStyle: 'none', padding: 0 },
    vocabItem: { marginBottom: '10px' },
    button: {
        padding: '15px 30px',
        fontSize: '1.1em',
        cursor: 'pointer',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-primary-text)',
        fontWeight: 'bold',
    },
    secondaryButton: {
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-text)',
        padding: '10px 20px',
        fontSize: '1em',
        marginTop: '10px',
    },
    loader: {
        border: '4px solid #f3f3f3',
        borderTop: '4px solid var(--color-primary)',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
        margin: '20px auto',
    },
};

// Add keyframes for loader animation to the document head
const styleSheet = document.styleSheets[0];
if (styleSheet) {
    try {
        styleSheet.insertRule(`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `, styleSheet.cssRules.length);
    } catch (e) {
        console.error("Could not insert keyframes rule:", e);
    }
}


export default SummaryView;