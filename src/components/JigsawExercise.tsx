import React, { useState } from 'react';
import type { ExerciseQuestion } from '@/types/exercise';

interface JigsawExerciseProps {
    question: ExerciseQuestion;
    answer: number[];
    onChange: (value: number[]) => void;
}

export const JigsawExercise: React.FC<JigsawExerciseProps> = ({ question, answer, onChange }) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Extract pieces from question text if not already set
    const extractPiecesFromText = (text: string): string[] => {
        const colonIndex = text.indexOf(':');
        if (colonIndex > -1) {
            const piecesText = text.substring(colonIndex + 1).trim();
            return piecesText.split(',').map(p => p.trim()).filter(p => p.length > 0);
        }
        return [];
    };

    let pieces = question.jigsawPieces || [];
    
    // Fallback: probeer pieces te extraheren uit questionText als ze niet zijn ingesteld
    if (pieces.length === 0 && question.questionText) {
        pieces = extractPiecesFromText(question.questionText);
    }
    
    // Als nog steeds geen pieces, gebruik een fallback
    if (pieces.length === 0) {
        pieces = ['ik', 'ben', 'naar', 'de', 'winkel', 'gegaan']; // Fallback voorbeeld
    }

    const correctOrder = question.jigsawCorrectOrder || Array.from({ length: pieces.length }, (_, i) => i);
    
    // Initialize answer with current order if empty
    const currentOrder = answer.length === pieces.length ? answer : Array.from({ length: pieces.length }, (_, i) => i);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== dropIndex) {
            const newOrder = [...currentOrder];
            const [removed] = newOrder.splice(draggedIndex, 1);
            newOrder.splice(dropIndex, 0, removed);
            onChange(newOrder);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleMove = (fromIndex: number, direction: 'left' | 'right') => {
        const newOrder = [...currentOrder];
        const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
        
        if (toIndex >= 0 && toIndex < newOrder.length) {
            [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
            onChange(newOrder);
        }
    };

    return (
        <div style={styles.container}>
            <p style={styles.instruction}>{question.questionText}</p>
            <div style={styles.piecesContainer}>
                {currentOrder.map((pieceIndex, displayIndex) => {
                    const piece = pieces[pieceIndex];
                    return (
                        <div
                            key={`${pieceIndex}-${displayIndex}`}
                            style={{
                                ...styles.piece,
                                ...(draggedIndex === displayIndex ? styles.pieceDragging : {}),
                                ...(dragOverIndex === displayIndex ? styles.pieceDragOver : {}),
                            }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, displayIndex)}
                            onDragOver={(e) => handleDragOver(e, displayIndex)}
                            onDrop={(e) => handleDrop(e, displayIndex)}
                            onDragEnd={handleDragEnd}
                        >
                            <span style={styles.pieceText}>{piece}</span>
                            <div style={styles.pieceControls}>
                                <button
                                    type="button"
                                    onClick={() => handleMove(displayIndex, 'left')}
                                    disabled={displayIndex === 0}
                                    style={{
                                        ...styles.moveButton,
                                        ...(displayIndex === 0 ? styles.moveButtonDisabled : {}),
                                    }}
                                >
                                    ←
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMove(displayIndex, 'right')}
                                    disabled={displayIndex === currentOrder.length - 1}
                                    style={{
                                        ...styles.moveButton,
                                        ...(displayIndex === currentOrder.length - 1 ? styles.moveButtonDisabled : {}),
                                    }}
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div style={styles.hint}>
                Sleep de woorden om ze te verplaatsen, of gebruik de pijltjes om ze te verschuiven.
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    instruction: {
        margin: '0 0 12px 0',
        fontSize: '1rem',
        lineHeight: 1.6,
    },
    piecesContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        minHeight: '80px',
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    piece: {
        padding: '10px 14px',
        borderRadius: '8px',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        border: '2px solid rgba(59, 130, 246, 0.4)',
        cursor: 'move',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    pieceDragging: {
        opacity: 0.5,
        transform: 'scale(0.95)',
    },
    pieceDragOver: {
        borderColor: 'rgba(34, 197, 94, 0.6)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    pieceText: {
        fontSize: '0.95rem',
        fontWeight: 500,
    },
    pieceControls: {
        display: 'flex',
        gap: '4px',
    },
    moveButton: {
        padding: '4px 8px',
        borderRadius: '4px',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '0.8rem',
        transition: 'background-color 0.2s ease',
    },
    moveButtonDisabled: {
        opacity: 0.3,
        cursor: 'not-allowed',
    },
    hint: {
        fontSize: '0.85rem',
        opacity: 0.7,
        fontStyle: 'italic',
    },
};

