import React from 'react';
import { createPortal } from 'react-dom';

interface ExplanationModalProps {
    isOpen: boolean;
    explanation: string;
    title: string;
    onClose: () => void;
}

export const ExplanationModal: React.FC<ExplanationModalProps> = ({
    isOpen,
    explanation,
    title,
    onClose,
}) => {
    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return createPortal(
        <div
            style={styles.overlay}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="explanation-title"
        >
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <header style={styles.header}>
                    <h2 id="explanation-title" style={styles.title}>
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        style={styles.closeButton}
                        aria-label="Sluiten"
                    >
                        ×
                    </button>
                </header>
                <div style={styles.content}>
                    {explanation.split('\n').map((paragraph, index) => (
                        paragraph.trim() ? (
                            <p key={index} style={styles.paragraph}>
                                {paragraph}
                            </p>
                        ) : (
                            <br key={index} />
                        )
                    ))}
                </div>
                <footer style={styles.footer}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={styles.closeButtonFooter}
                    >
                        Sluiten
                    </button>
                </footer>
            </div>
        </div>,
        document.body,
    );
};

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(8, 15, 28, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 1100,
        backdropFilter: 'blur(18px)',
    },
    modal: {
        width: 'min(600px, 95vw)',
        maxHeight: '85vh',
        borderRadius: '20px',
        border: '1px solid rgba(148, 163, 184, 0.28)',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        color: 'var(--color-text)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 28px 60px rgba(15, 23, 42, 0.55)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 28px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
    },
    title: {
        margin: 0,
        fontSize: '1.4rem',
        fontWeight: 700,
    },
    closeButton: {
        background: 'transparent',
        border: 'none',
        color: 'var(--color-text)',
        fontSize: '2rem',
        lineHeight: 1,
        cursor: 'pointer',
        padding: '0',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        transition: 'background-color 0.2s ease',
        opacity: 0.7,
    },
    content: {
        padding: '24px 28px',
        overflowY: 'auto',
        flex: 1,
        lineHeight: 1.7,
    },
    paragraph: {
        margin: '0 0 12px 0',
    },
    footer: {
        padding: '20px 28px',
        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
        display: 'flex',
        justifyContent: 'flex-end',
    },
    closeButtonFooter: {
        padding: '10px 22px',
        borderRadius: '999px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        background: 'transparent',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: 600,
        transition: 'background-color 0.2s ease, transform 0.1s ease',
    },
};

