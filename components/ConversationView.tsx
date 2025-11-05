import React, { useEffect, useRef } from 'react';
import { Transcript } from '../types';

interface Props {
  transcripts: Transcript[];
  onWordSelect?: (word: string) => void;
}

const ConversationView: React.FC<Props> = ({ transcripts, onWordSelect }) => {
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    const handleWordClick = (word: string) => {
        const cleanedWord = word.replace(/[.,!?]/g, '').toLowerCase();
        if (cleanedWord && onWordSelect) {
            onWordSelect(cleanedWord);
        }
    };

    const renderText = (text: string) => {
        return text.split(' ').map((word, i) => (
            <span key={i} onClick={() => handleWordClick(word)} style={onWordSelect ? {cursor: 'pointer'} : {}}>
                {word}{' '}
            </span>
        ));
    };

    return (
        <div style={styles.container}>
            {transcripts.map((t, index) => (
                <div key={index} style={styles.transcriptLine}>
                    {t.speaker === 'system' ? (
                         <div style={styles.systemMessage}>
                            {t.text}
                            {t.text.includes('Sessie starten') && (
                                <div style={styles.progressBarContainer}>
                                    <div style={styles.progressBar}></div>
                                </div>
                            )}
                         </div>
                    ) : (
                        <div style={{...styles.bubble, ...(t.speaker === 'user' ? styles.userBubble : styles.modelBubble)}}>
                            <span style={styles.speaker}>{t.speaker === 'user' ? 'Jij' : 'Tutor'}:</span>
                            <p style={styles.text}>{renderText(t.text)}</p>
                            {t.sources && t.sources.length > 0 && (
                                <div style={styles.sourcesContainer}>
                                    <h4 style={styles.sourcesHeader}>Bronnen:</h4>
                                    <ul style={styles.sourcesList}>
                                        {t.sources.map((source, idx) => (
                                            <li key={idx}>
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" style={styles.sourceLink}>
                                                    {source.title || source.uri}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
            <div ref={endOfMessagesRef} />
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '15px' },
    transcriptLine: { display: 'flex', flexDirection: 'column' },
    bubble: { padding: '10px 15px', borderRadius: '15px', maxWidth: '80%' },
    userBubble: { backgroundColor: 'var(--color-user-bg)', alignSelf: 'flex-end', borderBottomRightRadius: '2px' },
    modelBubble: { backgroundColor: 'var(--color-model-bg)', alignSelf: 'flex-start', borderBottomLeftRadius: '2px' },
    speaker: { fontWeight: 'bold', fontSize: '0.8em', opacity: 0.8 },
    text: { margin: '5px 0 0 0' },
    systemMessage: { fontStyle: 'italic', textAlign: 'center', color: '#888', width: '100%' },
    progressBarContainer: {
        width: '50%',
        margin: '10px auto 0 auto',
        height: '4px',
        backgroundColor: 'var(--color-border)',
        borderRadius: '2px',
        overflow: 'hidden',
        position: 'relative',
    },
    progressBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        transform: 'translateX(-100%)',
        backgroundImage: `linear-gradient(90deg, transparent, var(--color-primary), transparent)`,
        animation: 'shimmer 1.5s infinite linear',
    },
    sourcesContainer: {
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
    },
    sourcesHeader: {
        margin: '0 0 5px 0',
        fontSize: '0.8em',
        fontWeight: 'bold',
        opacity: 0.8,
    },
    sourcesList: {
        listStyle: 'decimal',
        margin: '0 0 0 20px',
        padding: 0,
        fontSize: '0.8em',
    },
    sourceLink: {
        color: 'var(--color-primary)',
        textDecoration: 'underline',
    },
};

export default ConversationView;