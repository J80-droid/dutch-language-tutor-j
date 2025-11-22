import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CEFR_LEVELS, CEFRLevel } from '../types';
import {
    loadConversationTopics,
    getTopicsMeta,
    saveCustomTopics,
    clearCustomTopics,
    resetTopicsCache,
    getFallbackTopics,
    ConversationTopic,
    TopicsMeta,
} from '../services/geminiService';

type Notice = { type: 'info' | 'success' | 'error'; message: string };

type TopicFormState = {
    theme: string;
    starter: string;
    followUps: string;
    keywords: string;
    difficulty: ConversationTopic['difficulty'];
    culturalNotes: string;
};

const DEFAULT_FORM: TopicFormState = {
    theme: '',
    starter: '',
    followUps: '',
    keywords: '',
    difficulty: 'intro',
    culturalNotes: '',
};

const DIFFICULTY_OPTIONS: Array<{ value: ConversationTopic['difficulty']; label: string }> = [
    { value: 'intro', label: 'Intro (A1 instap)' },
    { value: 'basic', label: 'Basis (A1/A2)' },
    { value: 'intermediate', label: 'Gevorderd (B1/B2)' },
    { value: 'advanced', label: 'Verdiepend (C1/C2)' },
];

const ADMIN_SESSION_KEY = 'topics-admin-authorized';

const cloneTopics = (topics: Record<CEFRLevel, ConversationTopic[]>): Record<CEFRLevel, ConversationTopic[]> =>
    JSON.parse(JSON.stringify(topics));

const TopicManagerView: React.FC = () => {
    const [topics, setTopics] = useState<Record<CEFRLevel, ConversationTopic[]>>(() => cloneTopics(getFallbackTopics()));
    const [meta, setMeta] = useState<TopicsMeta | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');
    const [formState, setFormState] = useState<TopicFormState>(DEFAULT_FORM);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [authorized, setAuthorized] = useState<boolean>(false);

    const password = (import.meta.env.VITE_TOPICS_ADMIN_PASSWORD as string | undefined) ?? '';

    useEffect(() => {
        if (!password) {
            setAuthorized(true);
            return;
        }
        if (!authorized) {
            if (typeof window === 'undefined') {
                return;
            }
            const already = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
            if (already === 'true') {
                setAuthorized(true);
                return;
            }
            const input = window.prompt('Voer het beheerderswachtwoord in om onderwerpen te beheren:');
            if (input === password) {
                window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
                setAuthorized(true);
            } else {
                setNotice({ type: 'error', message: 'Ongeldig wachtwoord. Geen toegang tot topicbeheer.' });
            }
        }
    }, [authorized, password]);

    const refreshTopics = useCallback(async () => {
        setIsLoading(true);
        try {
            resetTopicsCache();
            const loaded = await loadConversationTopics();
            setTopics(cloneTopics(loaded));
            setMeta(getTopicsMeta());
            setNotice(prev => (prev && prev.type === 'success') ? prev : { type: 'info', message: 'Onderwerpen geladen.' });
        } catch (error) {
            console.error('Kon onderwerpen niet laden:', error);
            setTopics(cloneTopics(getFallbackTopics()));
            setMeta({
                source: 'fallback',
                timestamp: Date.now(),
                statusCode: undefined,
                error: error instanceof Error ? error.message : String(error),
            });
            setNotice({ type: 'error', message: 'Kon dynamische onderwerpen niet laden. Fallback wordt gebruikt.' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authorized) {
            refreshTopics();
        }
    }, [authorized, refreshTopics]);

    const levelTopics = useMemo(() => topics[selectedLevel] ?? [], [topics, selectedLevel]);

    const handleChange = (field: keyof TopicFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = event.target.value;
        setFormState(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const resetForm = () => {
        setFormState(DEFAULT_FORM);
        setEditIndex(null);
    };

    const handleEdit = (index: number) => {
        const topic = levelTopics[index];
        setFormState({
            theme: topic.theme,
            starter: topic.starter,
            followUps: topic.followUps.join('\n'),
            keywords: topic.keywords.join(', '),
            difficulty: topic.difficulty,
            culturalNotes: topic.culturalNotes ?? '',
        });
        setEditIndex(index);
    };

    const handleDelete = (index: number) => {
        if (!window.confirm('Weet je zeker dat je dit onderwerp wilt verwijderen?')) {
            return;
        }
        setTopics(prev => {
            const list = [...(prev[selectedLevel] ?? [])];
            list.splice(index, 1);
            return {
                ...prev,
                [selectedLevel]: list,
            };
        });
        setNotice({ type: 'info', message: 'Onderwerp verwijderd. Vergeet niet op Opslaan te klikken.' });
        if (editIndex === index) {
            resetForm();
        }
    };

    const handleAddOrUpdate = (event: React.FormEvent) => {
        event.preventDefault();
        const trimmedTheme = formState.theme.trim();
        const trimmedStarter = formState.starter.trim();
        if (!trimmedTheme || !trimmedStarter) {
            setNotice({ type: 'error', message: 'Thema en starter zijn verplicht.' });
            return;
        }

        const followUps = formState.followUps
            .split('\n')
            .map(item => item.trim())
            .filter(Boolean);
        if (!followUps.length) {
            setNotice({ type: 'error', message: 'Voeg minimaal één vervolgvraag toe.' });
            return;
        }

        const keywords = formState.keywords
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);

        const duplicate = levelTopics.some((topic, idx) =>
            topic.theme.toLowerCase() === trimmedTheme.toLowerCase() && idx !== editIndex
        );
        if (duplicate) {
            setNotice({ type: 'error', message: `Het onderwerp "${trimmedTheme}" bestaat al voor niveau ${selectedLevel}.` });
            return;
        }

        const newTopic: ConversationTopic = {
            theme: trimmedTheme,
            starter: trimmedStarter,
            followUps,
            keywords,
            difficulty: formState.difficulty,
            ...(formState.culturalNotes.trim() ? { culturalNotes: formState.culturalNotes.trim() } : {}),
        };

        setTopics(prev => {
            const list = [...(prev[selectedLevel] ?? [])];
            if (editIndex !== null) {
                list[editIndex] = newTopic;
            } else {
                list.push(newTopic);
            }
            return {
                ...prev,
                [selectedLevel]: list,
            };
        });

        setNotice({ type: 'info', message: 'Onderwerp opgeslagen in concept. Klik op Opslaan om te publiceren.' });
        resetForm();
    };

    const handleSaveAll = () => {
        try {
            const saved = saveCustomTopics(topics);
            setTopics(cloneTopics(saved));
            setMeta(getTopicsMeta());
            setNotice({ type: 'success', message: 'Onderwerpen opgeslagen in je browser. Sessies gebruiken nu deze lijst.' });
        } catch (error) {
            console.error('Opslaan mislukt:', error);
            setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Opslaan mislukt.' });
        }
    };

    const handleResetToRemote = async () => {
        if (!window.confirm('Alle aangepaste onderwerpen verwijderen en opnieuw laden?')) {
            return;
        }
        clearCustomTopics();
        await refreshTopics();
        setNotice({ type: 'success', message: 'Aangepaste onderwerpen verwijderd. Standaardlijst opnieuw geladen.' });
    };

    const handleUseFallback = () => {
        setTopics(cloneTopics(getFallbackTopics()));
        setMeta({
            source: 'fallback',
            timestamp: Date.now(),
            statusCode: null,
            error: 'Fallback handmatig geselecteerd.',
        });
        setNotice({ type: 'info', message: 'Fallback-onderwerpen geladen. Opslaan om deze als custom lijst te gebruiken.' });
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const saved = saveCustomTopics(parsed);
            setTopics(cloneTopics(saved));
            setMeta(getTopicsMeta());
            setNotice({ type: 'success', message: 'Onderwerpen geïmporteerd en opgeslagen.' });
        } catch (error) {
            console.error('Import mislukt:', error);
            setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Import mislukt.' });
        } finally {
            event.target.value = '';
        }
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(topics, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `topics-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const formatMeta = (currentMeta: TopicsMeta | null): string => {
        if (!currentMeta) {
            return 'Bron: onbekend';
        }
        const sourceLabel =
            currentMeta.source === 'local'
                ? 'Custom (browser)'
                : currentMeta.source === 'remote'
                ? 'Remote JSON'
                : currentMeta.source === 'news'
                ? 'Actueel nieuws'
                : currentMeta.source === 'ai'
                ? 'AI gegenereerd'
                : 'Fallback';
        const timestamp = new Date(currentMeta.timestamp).toLocaleString();
        const status = currentMeta.statusCode ? ` • HTTP ${currentMeta.statusCode}` : '';
        const error = currentMeta.error ? ` • Laatste fout: ${currentMeta.error}` : '';
        return `Bron: ${sourceLabel} • Laatste update: ${timestamp}${status}${error}`;
    };

    if (!authorized) {
        return (
            <div style={styles.container}>
                <h2 style={styles.heading}>Topicbeheer</h2>
                <p style={styles.errorText}>Geen toegang tot deze pagina.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <h2 style={styles.heading}>Topicbeheer</h2>
                    <p style={styles.meta}>{formatMeta(meta)}</p>
                </div>
                <div style={styles.actions}>
                    <label style={styles.uploadLabel}>
                        Importeren
                        <input type="file" accept="application/json" onChange={handleImport} style={styles.fileInput} />
                    </label>
                    <button type="button" style={styles.secondaryButton} onClick={handleExport}>
                        Exporteren
                    </button>
                    <button type="button" style={styles.secondaryButton} onClick={refreshTopics}>
                        Opnieuw laden
                    </button>
                    <button type="button" style={styles.secondaryButton} onClick={handleUseFallback}>
                        Gebruik fallback
                    </button>
                    <button type="button" style={styles.dangerButton} onClick={handleResetToRemote}>
                        Verwijder custom lijst
                    </button>
                </div>
            </header>

            {notice && (
                <div
                    role="status"
                    style={{
                        ...styles.notice,
                        ...(notice.type === 'success'
                            ? styles.noticeSuccess
                            : notice.type === 'error'
                            ? styles.noticeError
                            : styles.noticeInfo),
                    }}
                >
                    {notice.message}
                </div>
            )}

            <section style={styles.content}>
                <aside style={styles.sidebar}>
                    <h3 style={styles.sectionTitle}>Niveau</h3>
                    <div style={styles.levelList}>
                        {CEFR_LEVELS.map(level => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => {
                                    setSelectedLevel(level);
                                    resetForm();
                                }}
                                style={{
                                    ...styles.levelButton,
                                    ...(selectedLevel === level ? styles.levelButtonActive : {}),
                                }}
                            >
                                {level}
                                <span style={styles.levelCount}>{topics[level]?.length ?? 0}</span>
                            </button>
                        ))}
                    </div>
                    <button type="button" style={styles.primaryButton} onClick={handleSaveAll}>
                        Opslaan in browser
                    </button>
                </aside>

                <main style={styles.main}>
                    <section style={styles.card}>
                        <h3 style={styles.sectionTitle}>{editIndex !== null ? 'Onderwerp bewerken' : 'Nieuw onderwerp'}</h3>
                        <form onSubmit={handleAddOrUpdate} style={styles.form}>
                            <label style={styles.formLabel}>
                                Thema
                                <input
                                    type="text"
                                    value={formState.theme}
                                    onChange={handleChange('theme')}
                                    style={styles.input}
                                    placeholder="Bijv. Dagelijkse routine"
                                />
                            </label>

                            <label style={styles.formLabel}>
                                Startvraag
                                <textarea
                                    value={formState.starter}
                                    onChange={handleChange('starter')}
                                    style={{ ...styles.input, minHeight: 70 }}
                                    placeholder="Start het gesprek met..."
                                />
                            </label>

                            <label style={styles.formLabel}>
                                Vervolgvragen (één per regel)
                                <textarea
                                    value={formState.followUps}
                                    onChange={handleChange('followUps')}
                                    style={{ ...styles.input, minHeight: 90 }}
                                    placeholder="Waar ga je meestal heen in het weekend?
Wat vind je daar leuk aan?"
                                />
                            </label>

                            <label style={styles.formLabel}>
                                Sleutelwoorden (komma gescheiden)
                                <input
                                    type="text"
                                    value={formState.keywords}
                                    onChange={handleChange('keywords')}
                                    style={styles.input}
                                    placeholder="weekend, vrienden, hobby"
                                />
                            </label>

                            <label style={styles.formLabel}>
                                Moeilijkheid
                                <select value={formState.difficulty} onChange={handleChange('difficulty')} style={styles.input}>
                                    {DIFFICULTY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label style={styles.formLabel}>
                                Culturele notitie (optioneel)
                                <input
                                    type="text"
                                    value={formState.culturalNotes}
                                    onChange={handleChange('culturalNotes')}
                                    style={styles.input}
                                    placeholder="Bijv. Verschil tussen Nederlandse en Spaanse ochtendrituelen"
                                />
                            </label>

                            <div style={styles.formActions}>
                                <button type="submit" style={styles.primaryButton}>
                                    {editIndex !== null ? 'Bijwerken' : 'Toevoegen'}
                                </button>
                                {editIndex !== null && (
                                    <button type="button" style={styles.secondaryButton} onClick={resetForm}>
                                        Annuleren
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    <section style={styles.card}>
                        <div style={styles.listHeader}>
                            <h3 style={styles.sectionTitle}>Onderwerpen voor {selectedLevel}</h3>
                            <span style={styles.listCount}>{levelTopics.length} onderwerpen</span>
                        </div>
                        {isLoading ? (
                            <p style={styles.infoText}>Bezig met laden…</p>
                        ) : levelTopics.length === 0 ? (
                            <p style={styles.infoText}>Nog geen onderwerpen voor dit niveau. Voeg er eentje toe!</p>
                        ) : (
                            <ul style={styles.topicList}>
                                {levelTopics.map((topic, index) => (
                                    <li key={`${topic.theme}-${index}`} style={styles.topicItem}>
                                        <div>
                                            <h4 style={styles.topicTitle}>{topic.theme}</h4>
                                            <div style={styles.topicMeta}>
                                                <span style={styles.tag}>{topic.difficulty}</span>
                                                {topic.culturalNotes && (
                                                    <span style={styles.tagSecondary}>Cultureel: {topic.culturalNotes}</span>
                                                )}
                                            </div>
                                            <p style={styles.topicStarter}>{topic.starter}</p>
                                            <details style={styles.details}>
                                                <summary>Vervolgvragen</summary>
                                                <ol style={styles.followUpList}>
                                                    {topic.followUps.map((followUp, idx) => (
                                                        <li key={idx}>{followUp}</li>
                                                    ))}
                                                </ol>
                                            </details>
                                            {topic.keywords.length > 0 && (
                                                <p style={styles.topicKeywords}>
                                                    Sleutelwoorden: {topic.keywords.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <div style={styles.topicActions}>
                                            <button type="button" style={styles.secondaryButton} onClick={() => handleEdit(index)}>
                                                Bewerken
                                            </button>
                                            <button type="button" style={styles.dangerButton} onClick={() => handleDelete(index)}>
                                                Verwijderen
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </main>
            </section>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: '16px',
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    heading: {
        margin: 0,
        fontSize: '1.8rem',
    },
    meta: {
        margin: 0,
        fontSize: '0.9rem',
        opacity: 0.75,
    },
    actions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
    uploadLabel: {
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '10px 16px',
        borderRadius: '999px',
        backgroundColor: 'var(--color-secondary)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontWeight: 600,
    },
    fileInput: {
        position: 'absolute',
        left: 0,
        top: 0,
        opacity: 0,
        width: '100%',
        height: '100%',
        cursor: 'pointer',
    },
    primaryButton: {
        padding: '10px 18px',
        borderRadius: '999px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-primary-text)',
        cursor: 'pointer',
        fontWeight: 600,
    },
    secondaryButton: {
        padding: '10px 18px',
        borderRadius: '999px',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontWeight: 600,
    },
    dangerButton: {
        padding: '10px 18px',
        borderRadius: '999px',
        border: '1px solid rgba(239, 68, 68, 0.5)',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#ef4444',
        cursor: 'pointer',
        fontWeight: 600,
    },
    notice: {
        padding: '12px 16px',
        borderRadius: '10px',
        fontSize: '0.95rem',
    },
    noticeSuccess: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        color: '#22c55e',
    },
    noticeError: {
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        color: '#ef4444',
    },
    noticeInfo: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        color: '#3b82f6',
    },
    content: {
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: '20px',
        alignItems: 'flex-start',
    },
    sidebar: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: 'var(--color-secondary-bg)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
    },
    sectionTitle: {
        margin: '0 0 8px 0',
        fontSize: '1.05rem',
    },
    levelList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    levelButton: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontWeight: 500,
    },
    levelButtonActive: {
        borderColor: 'var(--color-primary)',
        boxShadow: '0 6px 18px rgba(59, 130, 246, 0.25)',
    },
    levelCount: {
        fontSize: '0.85rem',
        opacity: 0.7,
    },
    main: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    card: {
        backgroundColor: 'var(--color-secondary-bg)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    form: {
        display: 'grid',
        gap: '12px',
    },
    formLabel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '0.95rem',
    },
    input: {
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        padding: '10px',
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-text)',
    },
    formActions: {
        display: 'flex',
        gap: '10px',
        marginTop: '4px',
    },
    listHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    listCount: {
        fontSize: '0.85rem',
        opacity: 0.7,
    },
    infoText: {
        opacity: 0.7,
    },
    topicList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        listStyle: 'none',
        padding: 0,
        margin: 0,
    },
    topicItem: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '16px',
        borderRadius: '10px',
        backgroundColor: 'var(--color-secondary)',
        border: '1px solid var(--color-border)',
        flexWrap: 'wrap',
    },
    topicTitle: {
        margin: '0 0 6px 0',
    },
    topicMeta: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '8px',
    },
    tag: {
        padding: '4px 8px',
        borderRadius: '999px',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        color: '#3b82f6',
        fontSize: '0.75rem',
        letterSpacing: '0.02em',
    },
    tagSecondary: {
        padding: '4px 8px',
        borderRadius: '999px',
        backgroundColor: 'rgba(14, 165, 233, 0.12)',
        color: '#0ea5e9',
        fontSize: '0.75rem',
        letterSpacing: '0.02em',
    },
    topicStarter: {
        margin: '0 0 8px 0',
        fontStyle: 'italic',
    },
    details: {
        marginBottom: '8px',
    },
    followUpList: {
        margin: '6px 0 0 16px',
    },
    topicKeywords: {
        margin: 0,
        fontSize: '0.85rem',
        opacity: 0.7,
    },
    topicActions: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    errorText: {
        color: '#ef4444',
    },
};

export default TopicManagerView;

