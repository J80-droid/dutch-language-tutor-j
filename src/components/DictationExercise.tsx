import React, { useState, useRef, useEffect } from 'react';
import type { ExerciseQuestion } from '@/types/exercise';

interface DictationExerciseProps {
    question: ExerciseQuestion;
    answer: string;
    onChange: (value: string) => void;
}

export const DictationExercise: React.FC<DictationExerciseProps> = ({ question, answer, onChange }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playCount, setPlayCount] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setSynthesis(window.speechSynthesis);
        }
    }, []);

    const handlePlay = () => {
        const text = question.dictationText || question.questionText;
        
        if (question.dictationAudioUrl && audioRef.current) {
            // Use audio file if available
            audioRef.current.play();
            setIsPlaying(true);
            audioRef.current.onended = () => setIsPlaying(false);
        } else if (synthesis && text) {
            // Use text-to-speech
            synthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'nl-NL';
            utterance.rate = 0.8; // Slower for dictation
            utterance.onend = () => setIsPlaying(false);
            synthesis.speak(utterance);
            setIsPlaying(true);
            setPlayCount(prev => prev + 1);
        }
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (synthesis) {
            synthesis.cancel();
        }
        setIsPlaying(false);
    };

    return (
        <div style={styles.container}>
            <p style={styles.instruction}>{question.questionText}</p>
            
            {question.dictationAudioUrl && (
                <audio
                    ref={audioRef}
                    src={question.dictationAudioUrl}
                    onEnded={() => setIsPlaying(false)}
                />
            )}

            <div style={styles.audioControls}>
                <button
                    type="button"
                    onClick={isPlaying ? handleStop : handlePlay}
                    style={{
                        ...styles.playButton,
                        ...(isPlaying ? styles.playButtonActive : {}),
                    }}
                >
                    {isPlaying ? '⏸ Stop' : '▶ Afspelen'}
                </button>
                {playCount > 0 && (
                    <span style={styles.playCount}>
                        {playCount}x afgespeeld
                    </span>
                )}
            </div>

            <textarea
                value={answer}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Typ hier wat je hoort..."
                style={styles.textarea}
                rows={4}
            />

            <div style={styles.hint}>
                Tip: Luister eerst goed voordat je begint te typen. Je kunt de audio meerdere keren afspelen.
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
    audioControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    playButton: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 600,
        transition: 'background-color 0.2s ease',
    },
    playButtonActive: {
        backgroundColor: 'rgba(248, 113, 113, 0.2)',
        borderColor: 'rgba(248, 113, 113, 0.4)',
    },
    playCount: {
        fontSize: '0.85rem',
        opacity: 0.7,
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
    hint: {
        fontSize: '0.85rem',
        opacity: 0.7,
        fontStyle: 'italic',
    },
};

