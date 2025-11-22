import React, { useState, useEffect } from 'react';
import type { ExerciseQuestion } from '@/types/exercise';

interface MemoryGameProps {
    question: ExerciseQuestion;
    answer: string[];
    onChange: (value: string[]) => void;
}

interface Card {
    id: string;
    content: string;
    pairId: string;
    flipped: boolean;
    matched: boolean;
}

export const MemoryGame: React.FC<MemoryGameProps> = ({ question, answer, onChange }) => {
    const [cards, setCards] = useState<Card[]>([]);
    const [flippedCards, setFlippedCards] = useState<string[]>([]);
    const [matchedPairs, setMatchedPairs] = useState<string[]>([]);

    useEffect(() => {
        // Initialize cards from memory pairs
        const pairs = question.memoryPairs || [];
        const newCards: Card[] = [];
        
        pairs.forEach((pair, index) => {
            const pairId = `pair-${index}`;
            newCards.push(
                { id: `card-${index}-1`, content: pair.card1, pairId, flipped: false, matched: false },
                { id: `card-${index}-2`, content: pair.card2, pairId, flipped: false, matched: false }
            );
        });

        // Shuffle cards
        for (let i = newCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
        }

        setCards(newCards);
    }, [question.memoryPairs]);

    useEffect(() => {
        // Check for matches when two cards are flipped
        if (flippedCards.length === 2) {
            const [card1Id, card2Id] = flippedCards;
            const card1 = cards.find(c => c.id === card1Id);
            const card2 = cards.find(c => c.id === card2Id);

            if (card1 && card2 && card1.pairId === card2.pairId) {
                // Match found!
                setMatchedPairs(prev => [...prev, card1.pairId]);
                setCards(prev => prev.map(c => 
                    c.pairId === card1.pairId ? { ...c, matched: true } : c
                ));
                setFlippedCards([]);
                
                // Update answer
                const newAnswer = [...answer];
                const pairIndex = parseInt(card1.pairId.split('-')[1], 10);
                if (!newAnswer[pairIndex]) {
                    newAnswer[pairIndex] = `${card1.content} - ${card2.content}`;
                    onChange(newAnswer);
                }
            } else {
                // No match, flip back after delay
                setTimeout(() => {
                    setCards(prev => prev.map(c => 
                        flippedCards.includes(c.id) ? { ...c, flipped: false } : c
                    ));
                    setFlippedCards([]);
                }, 1000);
            }
        }
    }, [flippedCards, cards, answer, onChange]);

    const handleCardClick = (cardId: string) => {
        const card = cards.find(c => c.id === cardId);
        if (!card || card.flipped || card.matched || flippedCards.length >= 2) {
            return;
        }

        setCards(prev => prev.map(c => 
            c.id === cardId ? { ...c, flipped: true } : c
        ));
        setFlippedCards(prev => [...prev, cardId]);
    };

    return (
        <div style={styles.container}>
            <p style={styles.instruction}>{question.questionText}</p>
            <div style={styles.stats}>
                <span>Gevonden: {matchedPairs.length} / {cards.length / 2}</span>
            </div>
            <div style={styles.grid}>
                {cards.map(card => (
                    <div
                        key={card.id}
                        style={{
                            ...styles.card,
                            ...(card.flipped || card.matched ? styles.cardFlipped : {}),
                            ...(card.matched ? styles.cardMatched : {}),
                        }}
                        onClick={() => handleCardClick(card.id)}
                    >
                        <div style={styles.cardFront}>?</div>
                        <div style={styles.cardBack}>{card.content}</div>
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
        gap: '16px',
    },
    instruction: {
        margin: '0 0 8px 0',
        fontSize: '1rem',
        lineHeight: 1.6,
    },
    stats: {
        fontSize: '0.9rem',
        opacity: 0.8,
        textAlign: 'center',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: '12px',
        maxWidth: '600px',
    },
    card: {
        aspectRatio: '1',
        position: 'relative',
        cursor: 'pointer',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.3s ease',
    },
    cardFlipped: {
        transform: 'rotateY(180deg)',
    },
    cardMatched: {
        opacity: 0.5,
        cursor: 'default',
    },
    cardFront: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '10px',
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        border: '2px solid rgba(59, 130, 246, 0.5)',
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--color-primary)',
    },
    cardBack: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '10px',
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        border: '2px solid rgba(148, 163, 184, 0.4)',
        padding: '12px',
        fontSize: '0.9rem',
        textAlign: 'center',
        wordBreak: 'break-word',
    },
};

