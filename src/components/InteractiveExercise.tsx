import React, { useState, useEffect } from 'react';
import type { ExerciseData, ExerciseQuestion, UserAnswers } from '@/types/exercise';
import { SwipeExercise } from './SwipeExercise';
import { MemoryGame } from './MemoryGame';
import { JigsawExercise } from './JigsawExercise';
import { DictationExercise } from './DictationExercise';
import { ImageExercise } from './ImageExercise';

interface InteractiveExerciseProps {
    exerciseData: ExerciseData;
    userAnswers: UserAnswers;
    onAnswerChange: (questionId: string, answer: string | string[]) => void;
}

export const InteractiveExercise: React.FC<InteractiveExerciseProps> = ({
    exerciseData,
    userAnswers,
    onAnswerChange,
}) => {
    const renderQuestion = (question: ExerciseQuestion, index: number) => {
        const questionId = question.id;
        const currentAnswer = userAnswers[questionId];

        return (
            <div key={questionId} style={styles.questionContainer}>
                <h4 style={styles.questionTitle}>
                    Vraag {index + 1}:
                </h4>
                <div style={styles.questionContent}>
                    {question.type === 'fill' && (!question.options || question.options.length === 0) && (
                        <FillQuestion
                            question={question}
                            answer={typeof currentAnswer === 'string' ? currentAnswer : ''}
                            onChange={(value) => onAnswerChange(questionId, value)}
                        />
                    )}
                    {question.type === 'multiple-choice' && (
                        <MultipleChoiceQuestion
                            question={question}
                            answer={typeof currentAnswer === 'string' ? currentAnswer : ''}
                            onChange={(value) => onAnswerChange(questionId, value)}
                        />
                    )}
                    {question.type === 'checkbox' && (
                        <CheckboxQuestion
                            question={question}
                            answers={Array.isArray(currentAnswer) ? currentAnswer : []}
                            onChange={(values) => onAnswerChange(questionId, values)}
                        />
                    )}
                    {question.type === 'swipe-sort' && (
                        <SwipeExercise
                            question={question}
                            answer={Array.isArray(currentAnswer) ? currentAnswer : []}
                            onChange={(values) => onAnswerChange(questionId, values)}
                        />
                    )}
                    {question.type === 'memory-match' && (
                        <MemoryGame
                            question={question}
                            answer={Array.isArray(currentAnswer) ? currentAnswer : []}
                            onChange={(values) => onAnswerChange(questionId, values)}
                        />
                    )}
                    {question.type === 'jigsaw' && (
                        <JigsawExercise
                            question={question}
                            answer={Array.isArray(currentAnswer) ? currentAnswer.map(v => typeof v === 'string' ? parseInt(v, 10) : v).filter(v => !isNaN(v)) as number[] : []}
                            onChange={(values) => onAnswerChange(questionId, values.map(String))}
                        />
                    )}
                    {question.type === 'dictation' && (
                        <DictationExercise
                            question={question}
                            answer={typeof currentAnswer === 'string' ? currentAnswer : ''}
                            onChange={(value) => onAnswerChange(questionId, value)}
                        />
                    )}
                    {question.type === 'image-description' && (
                        <ImageExercise
                            question={question}
                            answer={typeof currentAnswer === 'string' ? currentAnswer : ''}
                            onChange={(value) => onAnswerChange(questionId, value)}
                        />
                    )}
                    {question.type === 'transformation' && (
                        <TransformationQuestion
                            question={question}
                            answer={typeof currentAnswer === 'string' ? currentAnswer : ''}
                            onChange={(value) => onAnswerChange(questionId, value)}
                        />
                    )}
                    {question.type === 'word-math' && (
                        <WordMathQuestion
                            question={question}
                            answer={typeof currentAnswer === 'string' ? currentAnswer : ''}
                            onChange={(value) => onAnswerChange(questionId, value)}
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={styles.container}>
            {exerciseData.introduction && (
                <div style={styles.introduction}>
                    {exerciseData.introduction.split('\n').map((line, i) => (
                        <p key={i} style={styles.introText}>{line}</p>
                    ))}
                </div>
            )}
            <div style={styles.questionsContainer}>
                {exerciseData.questions.map((q, index) => renderQuestion(q, index))}
            </div>
        </div>
    );
};

interface FillQuestionProps {
    question: ExerciseQuestion;
    answer: string;
    onChange: (value: string) => void;
}

const FillQuestion: React.FC<FillQuestionProps> = ({ question, answer, onChange }) => {
    // Als er opties zijn, gebruik multiple-choice in plaats van fill
    if (question.options && question.options.length > 0) {
        return null; // Laat de multiple-choice component dit afhandelen
    }
    
    // Vervang [_____] met input veld
    const parts: React.ReactNode[] = [];
    const text = question.questionText;
    const placeholderMatch = text.match(/\[_{3,}\]/);
    
    if (placeholderMatch) {
        const before = text.substring(0, placeholderMatch.index || 0);
        const after = text.substring((placeholderMatch.index || 0) + placeholderMatch[0].length);
        
        parts.push(<span key="before">{before}</span>);
        parts.push(
            <input
                key="input"
                type="text"
                value={answer}
                onChange={(e) => onChange(e.target.value)}
                placeholder="..."
                style={styles.fillInput}
            />
        );
        parts.push(<span key="after">{after}</span>);
    } else {
        parts.push(<span key="text">{text}</span>);
        parts.push(
            <input
                key="input"
                type="text"
                value={answer}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Vul hier je antwoord in"
                style={styles.fillInput}
            />
        );
    }

    return <div style={styles.fillContainer}>{parts}</div>;
};

interface MultipleChoiceQuestionProps {
    question: ExerciseQuestion;
    answer: string;
    onChange: (value: string) => void;
}

const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({ question, answer, onChange }) => {
    // Zorg dat er altijd een vraagtekst is
    const displayText = question.questionText?.trim() || 'Kies het juiste antwoord:';
    
    return (
        <div style={styles.multipleChoiceContainer}>
            <p style={styles.questionText}>{displayText}</p>
            <div style={styles.radioOptions}>
                {question.options?.map((option, index) => (
                    <label
                        key={index}
                        style={{
                            ...styles.radioLabel,
                            ...(answer === option ? styles.radioLabelSelected : {}),
                        }}
                    >
                        <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option}
                            checked={answer === option}
                            onChange={(e) => onChange(e.target.value)}
                            style={styles.radioInput}
                        />
                        <span style={styles.radioText}>{option}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

interface CheckboxQuestionProps {
    question: ExerciseQuestion;
    answers: string[];
    onChange: (values: string[]) => void;
}

const CheckboxQuestion: React.FC<CheckboxQuestionProps> = ({ question, answers, onChange }) => {
    // Zorg dat er altijd een vraagtekst is
    const displayText = question.questionText?.trim() || 'Selecteer alle juiste antwoorden:';
    
    const handleToggle = (option: string) => {
        const newAnswers = answers.includes(option)
            ? answers.filter(a => a !== option)
            : [...answers, option];
        onChange(newAnswers);
    };

    return (
        <div style={styles.checkboxContainer}>
            <p style={styles.questionText}>{displayText}</p>
            <div style={styles.checkboxOptions}>
                {question.options?.map((option, index) => (
                    <label key={index} style={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={answers.includes(option)}
                            onChange={() => handleToggle(option)}
                            style={styles.checkboxInput}
                        />
                        <span style={styles.checkboxText}>{option}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

// Transformation Question Component
interface TransformationQuestionProps {
    question: ExerciseQuestion;
    answer: string;
    onChange: (value: string) => void;
}

const TransformationQuestion: React.FC<TransformationQuestionProps> = ({ question, answer, onChange }) => {
    return (
        <div style={styles.transformationContainer}>
            <p style={styles.questionText}>{question.questionText}</p>
            {question.sourceText && (
                <div style={styles.sourceText}>
                    <strong>Originele tekst ({question.sourceTense}):</strong>
                    <div style={styles.sourceTextContent}>{question.sourceText}</div>
                </div>
            )}
            <div style={styles.transformationInput}>
                <label style={styles.label}>
                    Herschrijf naar {question.targetTense}:
                </label>
                <textarea
                    value={answer}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Typ hier je herschreven tekst..."
                    style={styles.textarea}
                    rows={3}
                />
            </div>
        </div>
    );
};

// Word Math Question Component
interface WordMathQuestionProps {
    question: ExerciseQuestion;
    answer: string;
    onChange: (value: string) => void;
}

const WordMathQuestion: React.FC<WordMathQuestionProps> = ({ question, answer, onChange }) => {
    const parts = question.wordMathParts || [];
    const [answers, setAnswers] = useState<Record<number, string>>({});

    useEffect(() => {
        // Parse answer string into parts
        if (answer) {
            const parsed = answer.split('|');
            const newAnswers: Record<number, string> = {};
            parsed.forEach((val, idx) => {
                if (parts[idx]) {
                    newAnswers[idx] = val;
                }
            });
            setAnswers(newAnswers);
        }
    }, [answer, parts]);

    const handlePartChange = (index: number, value: string) => {
        const newAnswers = { ...answers, [index]: value };
        setAnswers(newAnswers);
        const answerString = parts.map((_, idx) => newAnswers[idx] || '').join('|');
        onChange(answerString);
    };

    return (
        <div style={styles.wordMathContainer}>
            <p style={styles.questionText}>{question.questionText}</p>
            <div style={styles.wordMathGrid}>
                {parts.map((part, index) => (
                    <div key={index} style={styles.wordMathItem}>
                        <div style={styles.wordMathEquation}>
                            <span style={styles.wordMathPart}>{part.part1}</span>
                            <span style={styles.wordMathPlus}> + </span>
                            <span style={styles.wordMathPart}>{part.part2}</span>
                            <span style={styles.wordMathEquals}> = </span>
                        </div>
                        <input
                            type="text"
                            value={answers[index] || ''}
                            onChange={(e) => handlePartChange(index, e.target.value)}
                            placeholder="?"
                            style={styles.wordMathInput}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    introduction: {
        padding: '16px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        marginBottom: '8px',
    },
    introText: {
        margin: '0 0 8px 0',
        lineHeight: 1.6,
    },
    questionsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    questionContainer: {
        padding: '16px',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    questionTitle: {
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        fontWeight: 600,
        color: 'var(--color-text)',
    },
    questionContent: {
        marginLeft: '0',
    },
    questionText: {
        margin: '0 0 12px 0',
        lineHeight: 1.6,
    },
    fillContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px',
        lineHeight: 1.8,
    },
    fillInput: {
        minWidth: '120px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        color: 'var(--color-text)',
        fontSize: '0.95rem',
    },
    multipleChoiceContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    radioOptions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    radioLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
    },
    radioLabelSelected: {
        borderColor: 'rgba(59, 130, 246, 0.6)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    radioInput: {
        width: '20px',
        height: '20px',
        cursor: 'pointer',
        accentColor: 'var(--color-primary)',
        flexShrink: 0,
    },
    radioText: {
        fontSize: '1rem',
        lineHeight: 1.5,
        flex: 1,
    },
    checkboxContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    checkboxOptions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        padding: '10px 12px',
        borderRadius: '8px',
        transition: 'background-color 0.2s ease',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
    },
    checkboxInput: {
        width: '20px',
        height: '20px',
        cursor: 'pointer',
        accentColor: 'var(--color-primary)',
        flexShrink: 0,
    },
    checkboxText: {
        lineHeight: 1.5,
    },
    transformationContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    sourceText: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
    },
    sourceTextContent: {
        marginTop: '8px',
        fontSize: '0.95rem',
        lineHeight: 1.6,
    },
    transformationInput: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '0.95rem',
        fontWeight: 600,
    },
    textarea: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        color: 'var(--color-text)',
        fontSize: '1rem',
        fontFamily: 'inherit',
        resize: 'vertical',
    },
    wordMathContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    wordMathGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    wordMathItem: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
    },
    wordMathEquation: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '1rem',
    },
    wordMathPart: {
        padding: '6px 10px',
        borderRadius: '6px',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fontWeight: 600,
    },
    wordMathPlus: {
        fontSize: '1.2rem',
        opacity: 0.7,
    },
    wordMathEquals: {
        fontSize: '1.2rem',
        opacity: 0.7,
    },
    wordMathInput: {
        flex: 1,
        minWidth: '150px',
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        color: 'var(--color-text)',
        fontSize: '1rem',
        fontWeight: 600,
    },
};

