import React, { useMemo, useState } from 'react';
import { SavedConversation } from '../types';

interface MinigameHubProps {
  history: SavedConversation[];
  onComplete: (result: { conversationId: string; title: string; correct: number; total: number }) => void;
}

interface QuizQuestion {
  word: string;
  translation: string;
  options: string[];
}

const MIN_OPTION_COUNT = 3;

const MinigameHub: React.FC<MinigameHubProps> = ({ history, onComplete }) => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<{ question: QuizQuestion; selected: string }[]>([]);

  const conversation = history.find(item => item.id === selectedConversationId) ?? null;

  const questions = useMemo<QuizQuestion[]>(() => {
    if (!conversation?.summary?.newVocabulary || !conversation.summary.newVocabulary.length) {
      return [];
    }
    const vocabulary = conversation.summary.newVocabulary;
    const translationsPool = vocabulary.map(entry => entry.translation);
    return vocabulary.map(entry => {
      const incorrectOptions = translationsPool
        .filter(option => option !== entry.translation)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.max(0, MIN_OPTION_COUNT - 1));
      const options = [...incorrectOptions, entry.translation].sort(() => Math.random() - 0.5);
      return {
        word: entry.word,
        translation: entry.translation,
        options,
      };
    });
  }, [conversation]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setCurrentIndex(0);
    setScore(0);
    setFinished(false);
    setAnswers([]);
  };

  const handleAnswer = (option: string) => {
    const question = questions[currentIndex];
    const correct = question.translation === option;
    setAnswers(prev => [...prev, { question, selected: option }]);
    if (correct) {
      setScore(prev => prev + 1);
    }
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      onComplete({
        conversationId: conversation?.id ?? 'unknown',
        title: conversation?.summary?.learningPoints ?? conversation?.summary?.suggestions ?? 'Woordquiz',
        correct: correct ? score + 1 : score,
        total: questions.length,
      });
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const renderQuiz = () => {
    if (!conversation) {
      return <p style={styles.helpText}>Kies een gesprek met woordenschat om een quiz te spelen.</p>;
    }
    if (!questions.length) {
      return (
        <div style={styles.notice}>
          <p>Deze sessie bevat geen opgeslagen woordenschat. Kies een andere sessie met woordlijst.</p>
        </div>
      );
    }
    if (finished) {
      return (
        <div style={styles.results}>
          <h3>Resultaat</h3>
          <p>
            Je behaalde <strong>{score}</strong> van de {questions.length} vragen.
          </p>
          <ul style={styles.answerList}>
            {answers.map(({ question, selected }, index) => (
              <li key={question.word} style={styles.answerItem}>
                <span>{index + 1}. {question.word}</span>
                <span style={selected === question.translation ? styles.correct : styles.incorrect}>
                  {selected}
                </span>
                {selected !== question.translation && (
                  <small style={styles.correctAnswer}>Correct antwoord: {question.translation}</small>
                )}
              </li>
            ))}
          </ul>
          <button type="button" style={styles.primaryButton} onClick={() => handleSelectConversation(conversation.id)}>
            Speel opnieuw
          </button>
        </div>
      );
    }

    const question = questions[currentIndex];
    return (
      <div style={styles.quizContainer}>
        <div style={styles.quizHeader}>
          <span>Vraag {currentIndex + 1} van {questions.length}</span>
          <span>Score: {score}</span>
        </div>
        <h3 style={styles.question}>{question.word}</h3>
        <div style={styles.optionsGrid}>
          {question.options.map(option => (
            <button
              key={option}
              type="button"
              style={styles.optionButton}
              onClick={() => handleAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Gesprekken</h2>
        <p style={styles.helpText}>Selecteer een sessie met woordenschat om een quiz te starten.</p>
        <ul style={styles.conversationList}>
          {history.map(item => {
            const vocabCount = item.summary?.newVocabulary?.length ?? 0;
            const isDisabled = vocabCount === 0;
            const isActive = item.id === selectedConversationId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  style={{
                    ...styles.conversationButton,
                    ...(isActive ? styles.conversationButtonActive : {}),
                    ...(isDisabled ? styles.conversationButtonDisabled : {}),
                  }}
                  onClick={() => !isDisabled && handleSelectConversation(item.id)}
                  disabled={isDisabled}
                >
                  <div>
                    <strong>{new Date(item.date).toLocaleDateString()}</strong>
                    <div style={styles.conversationMeta}>{item.activity} · {item.level}</div>
                  </div>
                  <span>{vocabCount} woorden</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      <main style={styles.main}>{renderQuiz()}</main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '24px',
    height: '100%',
  },
  sidebar: {
    flexBasis: '320px',
    flexShrink: 0,
    backgroundColor: 'var(--color-secondary-bg)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.25)',
  },
  sidebarTitle: {
    margin: 0,
  },
  helpText: {
    margin: 0,
    opacity: 0.75,
    fontSize: '0.85em',
  },
  conversationList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  conversationButton: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    backgroundColor: 'transparent',
    color: 'var(--color-text)',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
  },
  conversationButtonActive: {
    borderColor: 'var(--color-primary)',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  conversationButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  conversationMeta: {
    fontSize: '0.8em',
    opacity: 0.7,
  },
  main: {
    flex: 1,
    borderRadius: '16px',
    backgroundColor: 'var(--color-secondary-bg)',
    padding: '24px',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    justifyContent: 'center',
  },
  quizContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  quizHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9em',
    opacity: 0.75,
  },
  question: {
    margin: '0',
    textAlign: 'center',
    fontSize: '1.4em',
  },
  optionsGrid: {
    display: 'grid',
    gap: '12px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  optionButton: {
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    backgroundColor: 'transparent',
    color: 'var(--color-text)',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, border-color 0.2s ease',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    textAlign: 'center',
  },
  answerList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  answerItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  correct: {
    color: 'var(--color-primary)',
    fontWeight: 600,
  },
  incorrect: {
    color: 'rgba(248, 113, 113, 1)',
    fontWeight: 600,
  },
  correctAnswer: {
    fontSize: '0.8em',
    opacity: 0.75,
  },
  notice: {
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  primaryButton: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-primary-text)',
    border: 'none',
    borderRadius: '999px',
    padding: '10px 18px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default MinigameHub;

