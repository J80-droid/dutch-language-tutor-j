
import React, { useEffect, useState } from 'react';
import { getWordDefinition } from '../services/geminiService';
import styles from './WordDefinitionModal.module.css';

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
    if (error) return <p className={styles.error}>{error}</p>;
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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.header}>{word}</h3>
        <div className={styles.content}>{renderContent()}</div>
        <button type="button" onClick={onClose} className={styles.closeButton}>
          Sluiten
        </button>
      </div>
    </div>
  );
};

export default WordDefinitionModal;