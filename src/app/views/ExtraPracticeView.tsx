import React, { useEffect, useMemo, useState } from 'react';
import { LEARNING_PATHS } from '@/services/learningPaths';
import { getPerformanceData } from '@/services/adaptiveLearning';
import { EXTRA_EXERCISES, type ExtraExercise, type ExtraExerciseId } from '@/data/extraExercises';
import { generateExtraExercise } from '@/services/huggingfaceService';
import { parseExerciseText } from '@/services/exerciseParser';
import { generateFeedback } from '@/services/feedbackService';
import type { CEFRLevel } from '@/types';
import type { ExerciseData, UserAnswers, FeedbackReport } from '@/types/exercise';
import { useSessionState } from '../providers/SessionProvider';
import { useUIState } from '../providers/UIProvider';
import { InteractiveExercise } from '@/components/InteractiveExercise';
import { FeedbackReport as FeedbackReportComponent } from '@/components/FeedbackReport';
import { ExplanationModal } from '@/components/ExplanationModal';
import { ExerciseCategoryView } from '@/components/ExerciseCategoryView';
import { recordPerformance } from '@/services/adaptiveLearning';
import { loadGamificationState, updateStreak, checkBadges, checkAchievements, addPoints, saveGamificationState } from '@/services/gamification';
import { completeStep } from '@/services/learningPaths';

// Eenvoudige markdown renderer voor oefeningen
const renderMarkdown = (text: string): React.ReactNode => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let inList = false;

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        // Lege regel
        if (!trimmed) {
            if (inList && currentList.length > 0) {
                elements.push(
                    <ul key={`list-${index}`} style={{ margin: '8px 0', paddingLeft: '24px', listStyleType: 'disc' }}>
                        {currentList}
                    </ul>
                );
                currentList = [];
                inList = false;
            }
            elements.push(<br key={`br-${index}`} />);
            return;
        }

        // Headers (## of **)
        if (trimmed.startsWith('##') || (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.split('**').length === 3)) {
            if (inList && currentList.length > 0) {
                elements.push(
                    <ul key={`list-${index}`} style={{ margin: '8px 0', paddingLeft: '24px', listStyleType: 'disc' }}>
                        {currentList}
                    </ul>
                );
                currentList = [];
                inList = false;
            }
            let headerText = trimmed.replace(/^##+\s*/, '');
            // Als het een ** header is, verwijder de **
            if (headerText.startsWith('**') && headerText.endsWith('**')) {
                headerText = headerText.slice(2, -2).trim();
            }
            elements.push(
                <h4 key={`h-${index}`} style={{ marginTop: '16px', marginBottom: '8px', fontWeight: 600, fontSize: '1.1rem' }}>
                    {headerText}
                </h4>
            );
            return;
        }

        // Bullet points (- of *)
        if (trimmed.match(/^[-*]\s+/)) {
            inList = true;
            const itemText = trimmed.replace(/^[-*]\s+/, '');
            currentList.push(
                <li key={`li-${index}`} style={{ marginBottom: '4px', lineHeight: 1.6 }}>
                    {renderInlineMarkdown(itemText)}
                </li>
            );
            return;
        }

        // Numbered list
        if (trimmed.match(/^\d+\.\s+/)) {
            if (inList && currentList.length > 0) {
                elements.push(
                    <ul key={`list-${index}`} style={{ margin: '8px 0', paddingLeft: '24px', listStyleType: 'disc' }}>
                        {currentList}
                    </ul>
                );
                currentList = [];
            }
            inList = true;
            const itemText = trimmed.replace(/^\d+\.\s+/, '');
            currentList.push(
                <li key={`li-${index}`} style={{ marginBottom: '4px', lineHeight: 1.6 }}>
                    {renderInlineMarkdown(itemText)}
                </li>
            );
            return;
        }

        // Regular paragraph
        if (inList && currentList.length > 0) {
            elements.push(
                <ul key={`list-${index}`} style={{ margin: '8px 0', paddingLeft: '24px', listStyleType: 'disc' }}>
                    {currentList}
                </ul>
            );
            currentList = [];
            inList = false;
        }

        elements.push(
            <p key={`p-${index}`} style={{ marginBottom: '8px', lineHeight: 1.6 }}>
                {renderInlineMarkdown(trimmed)}
            </p>
        );
    });

    // Laatste lijst afsluiten
    if (inList && currentList.length > 0) {
        elements.push(
            <ul key={`list-final`} style={{ margin: '8px 0', paddingLeft: '24px', listStyleType: 'disc' }}>
                {currentList}
            </ul>
        );
    }

    return <>{elements}</>;
};

// Render inline markdown (bold, invulvelden, etc.)
const renderInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    // Pattern voor **bold**
    const boldPattern = /\*\*(.+?)\*\*/g;
    // Pattern voor [_____] invulvelden
    const fillPattern = /\[_{3,}\]/g;
    // Pattern voor [ ] checkboxes
    const checkboxPattern = /\[\s*\]/g;

    const matches: Array<{ type: 'bold' | 'fill' | 'checkbox'; start: number; end: number; content?: string }> = [];

    let match;
    while ((match = boldPattern.exec(text)) !== null) {
        matches.push({ type: 'bold', start: match.index, end: match.index + match[0].length, content: match[1] });
    }
    while ((match = fillPattern.exec(text)) !== null) {
        matches.push({ type: 'fill', start: match.index, end: match.index + match[0].length });
    }
    while ((match = checkboxPattern.exec(text)) !== null) {
        matches.push({ type: 'checkbox', start: match.index, end: match.index + match[0].length });
    }

    matches.sort((a, b) => a.start - b.start);

    matches.forEach((m, idx) => {
        // Voeg tekst voor de match toe
        if (m.start > currentIndex) {
            const beforeText = text.substring(currentIndex, m.start);
            if (beforeText) {
                parts.push(beforeText);
            }
        }

        // Voeg de match toe
        if (m.type === 'bold' && m.content) {
            parts.push(
                <strong key={`bold-${idx}`} style={{ fontWeight: 600 }}>
                    {m.content}
                </strong>
            );
        } else if (m.type === 'fill') {
            parts.push(
                <span
                    key={`fill-${idx}`}
                    style={{
                        display: 'inline-block',
                        minWidth: '80px',
                        borderBottom: '2px solid rgba(59, 130, 246, 0.6)',
                        margin: '0 4px',
                        padding: '2px 4px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '4px',
                    }}
                >
                    {' '}
                </span>
            );
        } else if (m.type === 'checkbox') {
            parts.push(
                <span
                    key={`checkbox-${idx}`}
                    style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(148, 163, 184, 0.6)',
                        borderRadius: '3px',
                        margin: '0 4px',
                        verticalAlign: 'middle',
                    }}
                />
            );
        }

        currentIndex = m.end;
    });

    // Voeg resterende tekst toe
    if (currentIndex < text.length) {
        parts.push(text.substring(currentIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
};

const STORAGE_KEY = 'extraPracticeResults';

// Hook voor responsive design
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768;
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isMobile;
};

type StoredExerciseResult = {
    exerciseId: ExtraExerciseId;
    text: string;
    exerciseData?: ExerciseData; // Nieuwe gestructureerde data
    level: CEFRLevel;
    updatedAt: string;
};

type StoredResultMap = Record<ExtraExerciseId, StoredExerciseResult>;

const styles: Record<string, React.CSSProperties> = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '16px',
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    headerText: {
        maxWidth: '100%',
    },
    backButton: {
        alignSelf: 'flex-start',
        backgroundColor: 'transparent',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        borderRadius: '999px',
        color: 'var(--color-text)',
        padding: '8px 16px',
        cursor: 'pointer',
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
        fontSize: '0.9rem',
        whiteSpace: 'nowrap',
    },
    layout: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    list: {
        flex: '1 1 320px',
        width: '100%',
        minWidth: 0,
        backgroundColor: 'var(--color-secondary-bg)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 16px 32px rgba(15, 23, 42, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: '50vh',
        overflowY: 'auto',
    },
    listItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '12px',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'rgba(148, 163, 184, 0.25)',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, border-color 0.2s ease',
        textAlign: 'left',
        width: '100%',
    },
    listItemActive: {
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-primary)',
        boxShadow: '0 12px 24px rgba(37, 99, 235, 0.25)',
        transform: 'translateY(-2px)',
    },
    focusBadge: {
        alignSelf: 'flex-start',
        borderRadius: '999px',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        padding: '2px 10px',
        fontSize: '0.75rem',
        opacity: 0.8,
    },
    detail: {
        flex: '2 1 480px',
        width: '100%',
        minWidth: 0,
        backgroundColor: 'var(--color-secondary-bg)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 16px 32px rgba(15, 23, 42, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    metaRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        flexDirection: 'column',
    },
    primaryButton: {
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.85), rgba(14, 165, 233, 0.85))',
        border: 'none',
        color: 'var(--color-primary-text)',
        padding: '10px 18px',
        borderRadius: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        justifyContent: 'center',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        color: 'var(--color-text)',
        padding: '10px 18px',
        borderRadius: '12px',
        cursor: 'pointer',
        width: '100%',
    },
    statusRow: {
        fontSize: '0.85rem',
        opacity: 0.75,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    errorBox: {
        borderRadius: '12px',
        border: '1px solid rgba(248, 113, 113, 0.45)',
        background: 'rgba(248, 113, 113, 0.12)',
        padding: '12px',
        color: 'rgba(248, 113, 113, 1)',
    },
    outputContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderRadius: '14px',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        padding: '16px',
        minHeight: '220px',
        overflow: 'auto',
        lineHeight: 1.55,
    },
    emptyOutput: {
        opacity: 0.7,
        fontStyle: 'italic',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
    },
    progressBarContainer: {
        width: '100%',
        height: '8px',
        backgroundColor: 'rgba(148, 163, 184, 0.15)',
        borderRadius: '999px',
        overflow: 'hidden',
        position: 'relative',
    },
    progressBarFill: {
        height: '100%',
        background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.9), rgba(14, 165, 233, 0.9))',
        borderRadius: '999px',
        transition: 'width 0.3s ease-out',
        position: 'relative',
        overflow: 'hidden',
    },
    progressBarShimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
        animation: 'shimmer 2s infinite',
    },
    progressText: {
        fontSize: '0.85rem',
        opacity: 0.8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    spinner: {
        display: 'inline-block',
        width: '16px',
        height: '16px',
        border: '2px solid rgba(148, 163, 184, 0.3)',
        borderTopColor: 'rgba(59, 130, 246, 1)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    explanationButton: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.4)',
        backgroundColor: 'transparent',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 600,
        transition: 'background-color 0.2s ease',
    },
    actionButtons: {
        display: 'flex',
        gap: '12px',
        marginTop: '24px',
        flexWrap: 'wrap',
    },
    checkButton: {
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.85), rgba(22, 163, 74, 0.85))',
        border: 'none',
        color: 'var(--color-primary-text)',
        padding: '12px 24px',
        borderRadius: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '1rem',
        transition: 'transform 0.1s ease, box-shadow 0.2s ease',
    },
};

// CSS keyframes voor animaties (alleen eenmaal toevoegen)
if (typeof document !== 'undefined' && !document.getElementById('extra-practice-animations')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'extra-practice-animations';
    styleSheet.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
    `;
    document.head.appendChild(styleSheet);
}

const loadStoredResults = (): StoredResultMap => {
    if (typeof window === 'undefined') {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw) as StoredResultMap;
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
        return {};
    } catch {
        return {};
    }
};

const persistResults = (results: StoredResultMap) => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch {
        // negeer opslagfouten (quota, privé modus)
    }
};

const ExtraPracticeView: React.FC = () => {
    const { selectedLevel, currentGoals } = useSessionState();
    const { setView } = useUIState();
    const isMobile = useIsMobile();
    const [results, setResults] = useState<StoredResultMap>({});
    const [activeId, setActiveId] = useState<ExtraExerciseId>(EXTRA_EXERCISES[0]?.id ?? 'idioms-context');
    const [loadingId, setLoadingId] = useState<ExtraExerciseId | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackReport, setFeedbackReport] = useState<FeedbackReport | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [showCategoryView, setShowCategoryView] = useState(false);

    useEffect(() => {
        const loaded = loadStoredResults();
        // Parse oude tekst-gebaseerde resultaten naar gestructureerde data indien nodig
        const updated: StoredResultMap = {};
        Object.keys(loaded).forEach(key => {
            const result = loaded[key as ExtraExerciseId];
            if (result) {
                if (result.text && !result.exerciseData) {
                    const exerciseData = parseExerciseText(result.text);
                    if (exerciseData) {
                        updated[key as ExtraExerciseId] = {
                            ...result,
                            exerciseData,
                        };
                    } else {
                        updated[key as ExtraExerciseId] = result;
                    }
                } else {
                    updated[key as ExtraExerciseId] = result;
                }
            }
        });
        setResults(updated);
    }, []);

    useEffect(() => {
        persistResults(results);
    }, [results]);

    // Auto-scroll naar detail sectie wanneer oefening wordt geselecteerd
    useEffect(() => {
        if (activeId) {
            setTimeout(() => {
                const detailSection = document.querySelector('[data-exercise-detail]');
                if (detailSection) {
                    detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    // Fallback: scroll naar boven van de pagina
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 100);
        }
    }, [activeId]);

    const activeExercise = useMemo<ExtraExercise | undefined>(
        () => EXTRA_EXERCISES.find(exercise => exercise.id === activeId) ?? EXTRA_EXERCISES[0],
        [activeId],
    );

    const activeResult = activeExercise ? results[activeExercise.id] : undefined;

    const primaryGoalLabel = currentGoals[0] ?? 'fluency';

    const handleSelect = async (exerciseId: ExtraExerciseId) => {
        setActiveId(exerciseId);
        setError(null);
        setShowFeedback(false);
        setUserAnswers({});
        setFeedbackReport(null);

        // Auto-genereren als oefening nog niet bestaat
        const existingResult = results[exerciseId];
        if (!existingResult) {
            await handleGenerate(exerciseId);
        }
    };

    // Progress simulatie tijdens genereren
    useEffect(() => {
        if (!loadingId) {
            setProgress(0);
            return;
        }

        let intervalId: NodeJS.Timeout;
        let timeoutId: NodeJS.Timeout;
        let currentProgress = 0;

        // Simuleer progress: start snel, dan langzamer naar 90%
        const updateProgress = () => {
            if (currentProgress < 90) {
                // Versnel progress in het begin, vertraag naarmate we dichter bij 90% komen
                const increment = currentProgress < 30 ? 3 : currentProgress < 60 ? 2 : 1;
                currentProgress = Math.min(currentProgress + increment, 90);
                setProgress(currentProgress);
            }
        };

        // Update elke 200ms
        intervalId = setInterval(updateProgress, 200);

        // Cleanup
        return () => {
            if (intervalId) clearInterval(intervalId);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [loadingId]);

    const handleGenerate = async (exerciseId: ExtraExerciseId) => {
        const exercise = EXTRA_EXERCISES.find(item => item.id === exerciseId);
        if (!exercise) {
            return;
        }
        setActiveId(exerciseId);
        setLoadingId(exerciseId);
        setError(null);
        setProgress(0);

        try {
            // Gebruik exercise.focus als context topic, of laat de service een random topic kiezen
            // Door undefined te passen, kiest de service automatisch een random topic voor variatie
            const text = await generateExtraExercise({
                exercise,
                learnerLevel: selectedLevel,
                learnerGoal: primaryGoalLabel,
                // Laat contextTopic undefined voor maximale variatie (service kiest random topic)
                // Of gebruik exercise.focus als je altijd hetzelfde topic wilt
                contextTopic: undefined,
            });

            // Zet progress naar 100% wanneer klaar
            setProgress(100);

            // Wacht kort zodat gebruiker de 100% kan zien
            await new Promise(resolve => setTimeout(resolve, 300));

            // Parse tekst naar gestructureerde data
            const exerciseData = parseExerciseText(text);

            setResults(prev => ({
                ...prev,
                [exerciseId]: {
                    exerciseId,
                    text,
                    exerciseData: exerciseData || undefined,
                    level: selectedLevel,
                    updatedAt: new Date().toISOString(),
                },
            }));

            // Reset user answers voor nieuwe oefening
            setUserAnswers({});
            setShowFeedback(false);
            setFeedbackReport(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        } finally {
            setLoadingId(null);
            setProgress(0);
        }
    };

    const handleAnswerChange = (questionId: string, answer: string | string[]) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: answer,
        }));
        // Reset feedback als gebruiker antwoord wijzigt
        if (showFeedback) {
            setShowFeedback(false);
            setFeedbackReport(null);
        }
    };

    const handleCheckAnswers = () => {
        if (!activeResult?.exerciseData || !activeId) return;

        const feedback = generateFeedback(activeResult.exerciseData, userAnswers);
        setFeedbackReport(feedback);
        setShowFeedback(true);

        // Performance tracking
        recordPerformance(activeId, feedback.score, feedback.totalQuestions);

        // Gamification tracking
        const gamificationState = loadGamificationState();
        const updatedState = updateStreak(gamificationState);

        // Voeg XP toe op basis van score (max 100 XP per oefening)
        const xpEarned = Math.round((feedback.score / 100) * 100);
        const stateWithXP = addPoints(updatedState, xpEarned);

        // Check badges en achievements
        const badgeResult = checkBadges(stateWithXP);

        // Tel aantal voltooide oefeningen uit performance data
        let totalExercisesCompleted = 0;
        if (typeof window !== 'undefined') {
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith('performance_')) {
                        totalExercisesCompleted++;
                    }
                }
            } catch (error) {
                console.error('Error counting exercises:', error);
            }
        }

        const achievementResult = checkAchievements(badgeResult.state, totalExercisesCompleted, feedback.score);

        saveGamificationState(achievementResult.state);

        // Learning path progress tracking
        if (typeof window !== 'undefined') {
            try {
                LEARNING_PATHS.forEach((path: any) => {
                    path.steps.forEach((step: any) => {
                        if (step.exerciseIds.includes(activeId) && !step.completed) {
                            const allCompleted = step.exerciseIds.every((exId: string) => {
                                const perfData = getPerformanceData(exId);
                                return perfData && perfData.averageScore >= 70;
                            });
                            if (allCompleted) {
                                completeStep(path.id, step.id);
                            }
                        }
                    });
                });
            } catch (error) {
                console.error('Error updating learning path progress:', error);
            }
        }
    };

    const handleRetry = () => {
        setUserAnswers({});
        setShowFeedback(false);
        setFeedbackReport(null);
    };

    const allQuestionsAnswered = () => {
        if (!activeResult?.exerciseData) return false;
        return activeResult.exerciseData.questions.every(q => {
            const answer = userAnswers[q.id];
            if (q.type === 'checkbox') {
                return Array.isArray(answer) && answer.length > 0;
            }
            return typeof answer === 'string' && answer.trim().length > 0;
        });
    };

    const renderStatusLabel = () => {
        if (loadingId === activeId) {
            return 'Oefening genereren…';
        }
        if (activeResult) {
            const updatedLabel = new Date(activeResult.updatedAt).toLocaleString('nl-NL', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            return `Laatste update: ${updatedLabel}`;
        }
        return 'Nog geen resultaten voor deze oefening.';
    };

    const responsiveStyles = useMemo(() => ({
        page: {
            ...styles.page,
            padding: isMobile ? '16px' : '24px',
        },
        header: {
            ...styles.header,
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: isMobile ? 'flex-start' : 'space-between',
            alignItems: isMobile ? 'flex-start' : 'flex-start',
        },
        headerText: {
            ...styles.headerText,
            maxWidth: isMobile ? '100%' : '720px',
        },
        layout: {
            ...styles.layout,
            flexDirection: isMobile ? 'column' : 'row',
        },
        list: {
            ...styles.list,
            maxHeight: isMobile ? '50vh' : '70vh',
        },
        detail: {
            ...styles.detail,
            padding: isMobile ? '16px' : '20px',
        },
        metaRow: {
            ...styles.metaRow,
            flexDirection: isMobile ? 'column' : 'row',
        },
        primaryButton: {
            ...styles.primaryButton,
            width: isMobile ? '100%' : 'auto',
        },
        secondaryButton: {
            ...styles.secondaryButton,
            width: isMobile ? '100%' : 'auto',
        },
    }), [isMobile]);

    return (
        <div style={responsiveStyles.page}>
            <div style={responsiveStyles.header}>
                <div style={responsiveStyles.headerText}>
                    <h2 style={{ fontWeight: 'bold' }}>Extra oefeningen</h2>
                    <p>
                        Ontdek 46 tekstgerichte opdrachten die je zonder microfoon kunt uitvoeren. Elke oefening past zich automatisch
                        aan jouw niveau ({selectedLevel}) aan.
                        Elke keer dat je een oefening genereert, krijg je een unieke versie met verschillende voorbeelden en contexten.
                    </p>
                </div>
                <button type="button" style={styles.backButton} onClick={() => setView('setup')}>
                    ← Terug naar activiteiten
                </button>
            </div>

            <div style={responsiveStyles.layout}>
                <aside style={responsiveStyles.list}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setShowCategoryView(!showCategoryView)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(148, 163, 184, 0.4)',
                                backgroundColor: showCategoryView ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                color: 'var(--color-text)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                transition: 'background-color 0.2s ease',
                            }}
                        >
                            {showCategoryView ? '📋 Lijst' : '🔍 Filters'}
                        </button>
                    </div>

                    {showCategoryView ? (
                        <ExerciseCategoryView
                            onSelectExercise={handleSelect}
                            selectedExerciseId={activeId}
                        />
                    ) : (
                        EXTRA_EXERCISES.map(exercise => {
                            const isActive = exercise.id === activeId;
                            return (
                                <button
                                    key={exercise.id}
                                    type="button"
                                    style={{
                                        ...styles.listItem,
                                        ...(isActive ? styles.listItemActive : {}),
                                    }}
                                    onClick={() => handleSelect(exercise.id)}
                                    disabled={loadingId === exercise.id}
                                >
                                    <strong style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
                                        {exercise.title}
                                    </strong>
                                    <span style={styles.focusBadge}>{exercise.focus}</span>
                                    {results[exercise.id] && (
                                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                            Laatste versie: {new Date(results[exercise.id].updatedAt).toLocaleDateString('nl-NL')}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </aside>

                <section style={responsiveStyles.detail} data-exercise-detail>
                    {activeExercise ? (
                        <>
                            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <h3>{activeExercise.title}</h3>
                                    <p style={{ opacity: 0.8, marginTop: '4px' }}>{activeExercise.focus}</p>
                                </div>
                                {activeResult?.exerciseData && (
                                    <button
                                        type="button"
                                        onClick={() => setShowExplanation(true)}
                                        style={styles.explanationButton}
                                    >
                                        Uitleg
                                    </button>
                                )}
                            </header>

                            {loadingId === activeExercise.id && (
                                <div style={styles.loadingContainer}>
                                    <div style={styles.progressBarContainer}>
                                        <div style={{ ...styles.progressBarFill, width: `${progress}%` }}>
                                            <div style={styles.progressBarShimmer} />
                                        </div>
                                    </div>
                                    <div style={styles.progressText}>
                                        <span>{renderStatusLabel()}</span>
                                        <span style={{ fontWeight: 600 }}>{Math.round(progress)}%</span>
                                    </div>
                                </div>
                            )}

                            {error && <div style={styles.errorBox}>{error}</div>}

                            {activeResult?.exerciseData ? (
                                <>
                                    {!showFeedback ? (
                                        <>
                                            <InteractiveExercise
                                                exerciseData={activeResult.exerciseData}
                                                userAnswers={userAnswers}
                                                onAnswerChange={handleAnswerChange}
                                            />
                                            <div style={styles.actionButtons}>
                                                <button
                                                    type="button"
                                                    onClick={handleCheckAnswers}
                                                    disabled={!allQuestionsAnswered()}
                                                    style={{
                                                        ...styles.checkButton,
                                                        opacity: allQuestionsAnswered() ? 1 : 0.5,
                                                        cursor: allQuestionsAnswered() ? 'pointer' : 'not-allowed',
                                                    }}
                                                >
                                                    Antwoorden nakijken
                                                </button>
                                                <button
                                                    type="button"
                                                    style={responsiveStyles.secondaryButton}
                                                    onClick={() => handleGenerate(activeExercise.id)}
                                                    disabled={loadingId === activeExercise.id}
                                                >
                                                    Opnieuw genereren
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        feedbackReport && (
                                            <>
                                                <FeedbackReportComponent
                                                    feedback={feedbackReport}
                                                    onRetry={handleRetry}
                                                />
                                                <button
                                                    type="button"
                                                    style={responsiveStyles.secondaryButton}
                                                    onClick={() => handleGenerate(activeExercise.id)}
                                                    disabled={loadingId === activeExercise.id}
                                                >
                                                    Opnieuw genereren
                                                </button>
                                            </>
                                        )
                                    )}
                                </>
                            ) : activeResult ? (
                                // Fallback voor oude tekst-gebaseerde oefeningen
                                <div style={styles.outputContainer}>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>
                                        {renderMarkdown(activeResult.text)}
                                    </div>
                                    <button
                                        type="button"
                                        style={responsiveStyles.secondaryButton}
                                        onClick={() => handleGenerate(activeExercise.id)}
                                        disabled={loadingId === activeExercise.id}
                                    >
                                        Opnieuw genereren
                                    </button>
                                </div>
                            ) : (
                                <div style={styles.outputContainer}>
                                    <span style={styles.emptyOutput}>
                                        {loadingId === activeExercise.id
                                            ? 'Oefening wordt gegenereerd...'
                                            : 'Klik op een oefening in de lijst om te beginnen.'}
                                    </span>
                                </div>
                            )}

                            {activeResult?.exerciseData && (
                                <ExplanationModal
                                    isOpen={showExplanation}
                                    explanation={activeResult.exerciseData.explanation}
                                    title={`Uitleg: ${activeExercise.title}`}
                                    onClose={() => setShowExplanation(false)}
                                />
                            )}
                        </>
                    ) : (
                        <p style={styles.emptyOutput}>Selecteer een oefening in de lijst om te beginnen.</p>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ExtraPracticeView;