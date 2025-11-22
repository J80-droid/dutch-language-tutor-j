import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Dispatch, SetStateAction } from 'react';
import GoalSelector from './GoalSelector';
import type { LearningGoal } from '@/types';
import styles from './GoalSelectionModal.module.css';

interface GoalSelectionModalProps {
    open: boolean;
    selectedGoals: LearningGoal[];
    onGoalsChange: Dispatch<SetStateAction<LearningGoal[]>>;
    onConfirm: () => void;
    onCancel: () => void;
}

const GoalSelectionModal: React.FC<GoalSelectionModalProps> = ({
    open,
    selectedGoals,
    onGoalsChange,
    onConfirm,
    onCancel,
}) => {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onCancel();
            }
        },
        [onCancel],
    );

    useEffect(() => {
        if (!open) {
            return;
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown, open]);

    if (!open || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className={styles.backdrop} role="presentation">
            <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="goal-selector-title">
                <header className={styles.header}>
                    <h2 id="goal-selector-title" className={styles.title}>
                        Leerdoelen aanpassen
                    </h2>
                    <p className={styles.subtitle}>Vink minimaal één doel aan. Je kunt dit altijd weer wijzigen.</p>
                </header>
                <GoalSelector selectedGoals={selectedGoals} onUpdateGoals={onGoalsChange} minSelections={1} />
                <footer className={styles.actions}>
                    <button type="button" className={`${styles.actionButton} ${styles.cancel}`} onClick={onCancel}>
                        Annuleer
                    </button>
                    <button
                        type="button"
                        className={`${styles.actionButton} ${styles.confirm}`}
                        onClick={onConfirm}
                        disabled={selectedGoals.length === 0}
                    >
                        Opslaan
                    </button>
                </footer>
            </div>
        </div>,
        document.body,
    );
};

export default GoalSelectionModal;


