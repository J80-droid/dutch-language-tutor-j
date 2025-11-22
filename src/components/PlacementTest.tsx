import React, { useState, useEffect } from 'react';
import type { PlacementTestQuestion, PlacementTestState, PlacementTestResult } from '@/services/placementTest';
import { generatePlacementQuestionsAsync, calculatePlacementResult, savePlacementResult } from '@/services/placementTest';
import styles from './PlacementTest.module.css';
import { cefrDescriptors } from '@/data/cefrDescriptors';
import type { CEFRLevel } from '@/types';
import confetti from 'canvas-confetti';

interface PlacementTestProps {
    onComplete: (result: PlacementTestResult) => void;
    onCancel?: () => void;
}

export const PlacementTest: React.FC<PlacementTestProps> = ({ onComplete, onCancel }) => {
    const [state, setState] = useState<PlacementTestState | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<PlacementTestResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingNextLevel, setLoadingNextLevel] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        // Fake progress animation during loading
        if (loading || loadingNextLevel) {
            const interval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 90) return prev; // Hold at 90% until ready
                    // Slower progress as it gets higher
                    const increment = prev < 50 ? 5 : prev < 80 ? 2 : 1;
                    return prev + increment;
                });
            }, 200);
            return () => clearInterval(interval);
        }
    }, [loading, loadingNextLevel]);

    // Confetti effect when loading next level
    useEffect(() => {
        if (loadingNextLevel) {
            const duration = 3000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => {
                return Math.random() * (max - min) + min;
            };

            const interval: any = setInterval(() => {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                // since particles fall down, start a bit higher than random
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [loadingNextLevel]);

    useEffect(() => {
        // Start test met async vraag generatie (First batch: A1)
        const initializeTest = async () => {
            try {
                setLoading(true);
                setLoadingProgress(0);
                const questions = await generatePlacementQuestionsAsync('A1', {}, 10);
                setLoadingProgress(100);
                // Short delay to show 100%
                setTimeout(() => {
                    setState({
                        currentQuestionIndex: 0,
                        answers: {},
                        questions,
                        startedAt: Date.now(),
                        currentLevelTesting: 'A1',
                    });
                    setLoading(false);
                }, 500);
            } catch (error) {
                console.error('Failed to initialize placement test:', error);
                setLoading(false);
            }
        };
        initializeTest();
    }, []);

    const finishTest = (questions: PlacementTestQuestion[], answers: Record<string, string | string[]>) => {
        const testResult = calculatePlacementResult(questions, answers);
        setResult(testResult);
        savePlacementResult(testResult);
        setShowResult(true);
    };

    const handleAnswer = async (answer: string | string[]) => {
        if (!state) return;

        const currentQuestion = state.questions[state.currentQuestionIndex];
        const newAnswers = {
            ...state.answers,
            [currentQuestion.id]: answer,
        };

        // Check if we need to evaluate batch
        const isEndOfBatch = (state.currentQuestionIndex + 1) % 10 === 0;
        const newIndex = state.currentQuestionIndex + 1;

        if (isEndOfBatch) {
             // Calculate score for this specific batch (last 10 questions)
             const batchStartIndex = state.currentQuestionIndex - 9;
             const batchQuestions = state.questions.slice(batchStartIndex, state.currentQuestionIndex + 1);
             
             let batchCorrect = 0;
             batchQuestions.forEach(q => {
                 const ans = newAnswers[q.id];
                 const isCorrect = Array.isArray(q.correctAnswer)
                    ? Array.isArray(ans) && 
                      ans.length === q.correctAnswer.length &&
                      ans.every((val, idx) => val === q.correctAnswer[idx])
                    : ans === q.correctAnswer;
                 if (isCorrect) batchCorrect++;
             });

             const passedBatch = batchCorrect >= 8; // 80% threshold
             
             // Determine next level
             const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
             const currentLevel = state.currentLevelTesting;
             const currentLevelIndex = levels.indexOf(currentLevel);
             
             if (passedBatch && currentLevelIndex < levels.length - 1) {
                 const nextLevel = levels[currentLevelIndex + 1];
                 
                 // Load next level
                 setLoadingNextLevel(true);
                 setLoadingProgress(0);
                 
                 try {
                     const newQuestions = await generatePlacementQuestionsAsync(nextLevel, newAnswers, 10);
                     setLoadingProgress(100);
                     
                     setTimeout(() => {
                         setState(prev => {
                             if (!prev) return null;
                             return {
                                 ...prev,
                                 questions: [...prev.questions, ...newQuestions],
                                 answers: newAnswers,
                                 currentQuestionIndex: newIndex,
                                 currentLevelTesting: nextLevel
                             };
                         });
                         setLoadingNextLevel(false);
                     }, 500);
                     return; // Stop here, state update will handle render
                 } catch (e) {
                     console.error("Failed to load next level, finishing test", e);
                     // If loading fails, just finish with what we have
                     setLoadingNextLevel(false);
                     finishTest(state.questions, newAnswers);
                     return;
                 }
             }
        }
        
        // Normal flow: Next question or Finish
        if (newIndex >= state.questions.length) {
            finishTest(state.questions, newAnswers);
        } else {
            setState({
                ...state,
                currentQuestionIndex: newIndex,
                answers: newAnswers,
            });
        }
    };

    const handleComplete = () => {
        if (result) {
            onComplete(result);
        }
    };

    if (loading || loadingNextLevel || !state) {
        const loadingText = loadingNextLevel 
            ? `Je hebt niveau ${state?.currentLevelTesting} gehaald! Volgend niveau laden...` 
            : "Test wordt voorbereid...";

        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <div className={styles.loadingText}>{loadingText}</div>
                <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${loadingProgress}%` }} />
                </div>
                <div className={styles.loadingSubtext}>{loadingProgress}% - Dit duurt enkele seconden</div>
            </div>
        );
    }

    const getQuestionTypeLabel = (type: string) => {
        switch (type) {
            case 'grammar': return 'Grammatica';
            case 'vocabulary': return 'Woordenschat';
            case 'reading': return 'Begrijpend Lezen';
            default: return type;
        }
    };

    if (showResult && result) {
        const levelDescriptor = cefrDescriptors[result.level];

        return (
            <div className={styles.container}>
                <h2 className={styles.title}>Resultaat Instaptoets</h2>
                <div className={styles.resultCard}>
                    <div className={styles.levelBadge}>
                        <div className={styles.levelLabel}>Je niveau:</div>
                        <div className={styles.levelValue}>{result.level}</div>
                        <div className={styles.levelDescription}>
                            {levelDescriptor.label} - {levelDescriptor.description}
                        </div>
                    </div>
                    
                    <div className={styles.descriptors}>
                        <h4>Wat betekent dit niveau?</h4>
                        <div className={styles.descriptorItem}>
                            <strong>Lezen:</strong> {levelDescriptor.skills.reading}
                        </div>
                        <div className={styles.descriptorItem}>
                            <strong>Luisteren:</strong> {levelDescriptor.skills.listening}
                        </div>
                        <div className={styles.descriptorItem}>
                            <strong>Spreken:</strong> {levelDescriptor.skills.speakingInteraction}
                        </div>
                    </div>

                    <div className={styles.scores}>
                        <div className={styles.scoreItem}>
                            <span>Totale score:</span>
                            <strong>{result.score}%</strong>
                        </div>
                        <div className={styles.scoreItem}>
                            <span>Grammatica:</span>
                            <strong>{result.grammarScore}%</strong>
                        </div>
                        <div className={styles.scoreItem}>
                            <span>Woordenschat:</span>
                            <strong>{result.vocabularyScore}%</strong>
                        </div>
                        <div className={styles.scoreItem}>
                            <span>Begrijpend Lezen:</span>
                            <strong>{result.readingScore}%</strong>
                        </div>
                    </div>
                    {result.recommendations.length > 0 && (
                        <div className={styles.recommendations}>
                            <h4>Aanbevelingen:</h4>
                            <ul>
                                {result.recommendations.map((rec, idx) => (
                                    <li key={idx}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleComplete}
                        className={styles.completeButton}
                    >
                        Beginnen met leren op niveau {result.level}
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = state.questions[state.currentQuestionIndex];
    const batchProgress = ((state.currentQuestionIndex % 10) + 1) / 10 * 100;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Instaptoets - Niveau {state.currentLevelTesting}</h2>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className={styles.cancelButton}
                    >
                        Annuleren
                    </button>
                )}
            </div>

            <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${batchProgress}%` }} />
            </div>
            <div className={styles.progressText}>
                Vraag {(state.currentQuestionIndex % 10) + 1} van 10 (Totaal: {state.currentQuestionIndex + 1})
            </div>

            <div className={styles.questionCard}>
                <div className={styles.questionType}>{getQuestionTypeLabel(currentQuestion.type)}</div>
                <div className={styles.questionText}>{currentQuestion.question}</div>

                {currentQuestion.options ? (
                    <div className={styles.options}>
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleAnswer(option)}
                                className={styles.optionButton}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                ) : (
                    <input
                        type="text"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAnswer(e.currentTarget.value);
                            }
                        }}
                        placeholder="Typ je antwoord..."
                        className={styles.textInput}
                    />
                )}
            </div>
        </div>
    );
};
