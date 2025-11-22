import React, { useState } from 'react';
import type { ExerciseQuestion } from '@/types/exercise';

interface ImageExerciseProps {
    question: ExerciseQuestion;
    answer: string;
    onChange: (value: string) => void;
}

export const ImageExercise: React.FC<ImageExerciseProps> = ({ question, answer, onChange }) => {
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <div style={styles.container}>
            <p style={styles.instruction}>{question.questionText}</p>
            
            {question.imageUrl && !imageError ? (
                <div style={styles.imageContainer}>
                    <img
                        src={question.imageUrl}
                        alt={question.imageDescription || 'Oefening afbeelding'}
                        onError={handleImageError}
                        style={styles.image}
                    />
                </div>
            ) : (
                <div style={styles.imagePlaceholder}>
                    {imageError ? 'Afbeelding kon niet worden geladen' : 'Geen afbeelding beschikbaar'}
                </div>
            )}

            {question.imageDescription && (
                <div style={styles.imageDescription}>
                    <strong>Beschrijving:</strong> {question.imageDescription}
                </div>
            )}

            <div style={styles.inputContainer}>
                <label style={styles.label}>
                    {question.type === 'image-description' 
                        ? 'Beschrijf wat je ziet:' 
                        : 'Beantwoord de vraag:'}
                </label>
                <textarea
                    value={answer}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Typ je antwoord hier..."
                    style={styles.textarea}
                    rows={4}
                />
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
    imageContainer: {
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    image: {
        width: '100%',
        height: 'auto',
        display: 'block',
    },
    imagePlaceholder: {
        width: '100%',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        border: '1px dashed rgba(148, 163, 184, 0.3)',
        color: 'rgba(148, 163, 184, 0.6)',
        fontSize: '0.9rem',
    },
    imageDescription: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
    },
    inputContainer: {
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
        minHeight: '100px',
    },
};

