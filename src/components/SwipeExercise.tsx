import React, { useState } from 'react';
import type { ExerciseQuestion } from '@/types/exercise';

interface SwipeExerciseProps {
    question: ExerciseQuestion;
    answer: string[];
    onChange: (value: string[]) => void;
}

export const SwipeExercise: React.FC<SwipeExerciseProps> = ({ question, answer, onChange }) => {
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

    const targets = question.swipeTargets || ['de', 'het'];
    const items = question.swipeItems || [];
    
    // Initialize answer state
    const currentAnswers: Record<string, string> = {};
    answer.forEach((item, index) => {
        if (items[index]) {
            currentAnswers[items[index].word] = item;
        }
    });

    const handleDragStart = (e: React.DragEvent, word: string) => {
        setDraggedItem(word);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, target: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverTarget(target);
    };

    const handleDrop = (e: React.DragEvent, target: string) => {
        e.preventDefault();
        if (draggedItem) {
            const newAnswers = { ...currentAnswers, [draggedItem]: target };
            const answerArray = items.map(item => newAnswers[item.word] || '');
            onChange(answerArray);
        }
        setDraggedItem(null);
        setDragOverTarget(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverTarget(null);
    };

    const handleClick = (word: string, target: string) => {
        const newAnswers = { ...currentAnswers, [word]: target };
        const answerArray = items.map(item => newAnswers[item.word] || '');
        onChange(answerArray);
    };

    const getWordsForTarget = (target: string) => {
        return items.filter(item => currentAnswers[item.word] === target);
    };

    return (
        <div style={styles.container}>
            <p style={styles.instruction}>{question.questionText}</p>
            
            <div style={styles.targetsContainer}>
                {targets.map(target => (
                    <div
                        key={target}
                        style={{
                            ...styles.target,
                            ...(dragOverTarget === target ? styles.targetDragOver : {}),
                        }}
                        onDragOver={(e) => handleDragOver(e, target)}
                        onDrop={(e) => handleDrop(e, target)}
                    >
                        <div style={styles.targetLabel}>{target.toUpperCase()}</div>
                        <div style={styles.targetWords}>
                            {getWordsForTarget(target).map(item => (
                                <div
                                    key={item.word}
                                    style={styles.wordChip}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.word)}
                                    onDragEnd={handleDragEnd}
                                >
                                    {item.word}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.itemsContainer}>
                <div style={styles.itemsLabel}>Sleep de woorden naar de juiste kolom:</div>
                <div style={styles.itemsGrid}>
                    {items.map((item, index) => {
                        const isPlaced = currentAnswers[item.word];
                        if (isPlaced) return null;
                        
                        return (
                            <div
                                key={index}
                                style={{
                                    ...styles.wordCard,
                                    ...(draggedItem === item.word ? styles.wordCardDragging : {}),
                                }}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.word)}
                                onDragEnd={handleDragEnd}
                            >
                                {item.word}
                                <div style={styles.quickButtons}>
                                    {targets.map(target => (
                                        <button
                                            key={target}
                                            type="button"
                                            onClick={() => handleClick(item.word, target)}
                                            style={styles.quickButton}
                                        >
                                            {target}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    instruction: {
        margin: '0 0 12px 0',
        fontSize: '1rem',
        lineHeight: 1.6,
    },
    targetsContainer: {
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
    },
    target: {
        flex: 1,
        minHeight: '200px',
        padding: '16px',
        borderRadius: '12px',
        border: '2px dashed rgba(148, 163, 184, 0.4)',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
    },
    targetDragOver: {
        borderColor: 'rgba(59, 130, 246, 0.6)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    targetLabel: {
        fontSize: '1.2rem',
        fontWeight: 700,
        textAlign: 'center',
        marginBottom: '12px',
        color: 'var(--color-primary)',
    },
    targetWords: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        minHeight: '150px',
    },
    wordChip: {
        padding: '8px 12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        cursor: 'move',
        fontSize: '0.9rem',
    },
    itemsContainer: {
        marginTop: '20px',
    },
    itemsLabel: {
        marginBottom: '12px',
        fontSize: '0.9rem',
        opacity: 0.8,
    },
    itemsGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
    },
    wordCard: {
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        cursor: 'grab',
        fontSize: '1rem',
        fontWeight: 500,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    wordCardDragging: {
        opacity: 0.5,
        cursor: 'grabbing',
    },
    quickButtons: {
        display: 'flex',
        gap: '6px',
        marginTop: '4px',
    },
    quickButton: {
        padding: '4px 8px',
        borderRadius: '6px',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '0.8rem',
        transition: 'background-color 0.2s ease',
    },
};

