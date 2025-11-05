
import React, { useEffect, useState } from 'react';
import { getWordDefinition } from '../services/geminiService';

interface Props {
  word: string;
  onClose: () => void;
}

const WordDefinitionModal: React.FC<Props> = ({ word, onClose }) => {
  const [definition, setDefinition] = useState<{ translation: string; example: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!word) return;

    const fetchDefinition = async () => {
      setIsLoading(true);
      setError(null);
      setDefinition(null);
      try {
        const def = await getWordDefinition(word);
        if (def.translation && def.translation.toLowerCase().includes('error')) {
          setError(def.example || 'Kon de definitie niet ophalen.');
        } else {
          setDefinition(def);
        }
      } catch (err) {
        setError('Er is een onverwachte fout opgetreden.');
        console.error(err);
      }
      setIsLoading(false);
    };

    fetchDefinition();
  }, [word]);

  if (!word) return null;

  const renderContent = () => {
    if (isLoading) return <p>Laden...</p>;
    if (error) return <p style={{ color: '#d9534f' }}>{error}</p>;
    if (definition) {
      return (
        <>
          <p><strong>Vertaling:</strong> {definition.translation}</p>
          <p><strong>Voorbeeld:</strong> <em>{definition.example}</em></p>
        </>
      );
    }
    return <p>Geen definitie gevonden.</p>;
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.header}>{word}</h3>
        <div style={styles.content}>{renderContent()}</div>
        <button onClick={onClose} style={styles.closeButton}>Sluiten</button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--color-secondary-bg)',
    padding: '25px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  },
  header: {
    marginTop: 0,
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px',
    textTransform: 'capitalize',
  },
  content: {
    minHeight: '50px',
  },
  closeButton: {
    padding: '10px 20px',
    fontSize: '1em',
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-secondary)',
    color: 'var(--color-text)',
    float: 'right',
    marginTop: '10px'
  },
};

export default WordDefinitionModal;