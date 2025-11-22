import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CEFRLevel,
  CEFR_LEVELS,
  CreativeActivityMode,
  CreativeActivityConfigMap,
  CreativeWorkshopState,
  CreativeImprovSetup,
  CreativeStoryRelaySetup,
  CreativeEscapeRoomSetup,
  CreativeEmotionBarometerSetup,
  CreativeKeywordWheelSetup,
  CreativeDifficulty,
  ACTIVITY_MODE_TRANSLATIONS,
} from '../types';
import { generateCreativeSetup } from '../services/geminiService';

type CreativeConfig = CreativeActivityConfigMap[CreativeActivityMode];

interface CreativeWorkshopModalProps {
  mode: CreativeActivityMode;
  level: CEFRLevel;
  isOpen: boolean;
  initialState?: CreativeWorkshopState | null;
  onClose: () => void;
  onConfirm: (state: CreativeWorkshopState) => void;
}

const difficultyOptions: CreativeDifficulty[] = ['makkelijk', 'gemiddeld', 'uitdagend'];
const palette = ['#38bdf8', '#a855f7', '#f97316', '#22d3ee', '#facc15', '#f472b6', '#34d399', '#f87171'];

const clampNumber = (value: number, min: number, max?: number) => {
  if (Number.isNaN(value)) return min;
  if (max !== undefined) {
    return Math.min(Math.max(value, min), max);
  }
  return Math.max(value, min);
};

const getDefaultConfig = (mode: CreativeActivityMode, level: CEFRLevel): CreativeConfig => {
  const base = {
    level,
    participants: 2,
    difficulty: 'makkelijk' as CreativeDifficulty,
    durationMinutes: 15,
    includeWarmup: true,
  };

  switch (mode) {
    case 'creative-improvisation':
      return { ...base, rounds: 3, includeProps: true };
    case 'creative-story-relay':
      return { ...base, storyLength: 'midden', allowTwists: true };
    case 'creative-escape-room':
      return { ...base, puzzleCount: 3, allowHints: true };
    case 'creative-emotion-barometer':
      return { ...base, emotionCount: 4, sentenceSource: 'ai' };
    case 'creative-keyword-wheel':
      return { ...base, spins: 4, includeMiniChallenges: true };
    default:
      return base as CreativeConfig;
  }
};

export const CreativeWorkshopModal: React.FC<CreativeWorkshopModalProps> = ({
  mode,
  level,
  isOpen,
  initialState,
  onClose,
  onConfirm,
}) => {
  const [config, setConfig] = useState<CreativeConfig>(() => getDefaultConfig(mode, level));
  const [workshopState, setWorkshopState] = useState<CreativeWorkshopState | null>(initialState ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wheelSelection, setWheelSelection] = useState<string | null>(null);
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let cancelled = false;
    const canReuseInitial =
      initialState &&
      initialState.mode === mode &&
      initialState.config.level === level &&
      initialState.setup;

    const baseConfig = canReuseInitial ? initialState!.config : getDefaultConfig(mode, level);
    setConfig(baseConfig);
    setError(null);
    setWheelSelection(null);

    if (canReuseInitial) {
      setWorkshopState(initialState!);
      setIsDirty(false);
      setIsGenerating(false);
      return () => {
        cancelled = true;
      };
    }

    setWorkshopState(null);
    setIsDirty(false);
    setIsGenerating(true);
    generateCreativeSetup(mode, baseConfig)
      .then((state) => {
        if (cancelled) return;
        setWorkshopState(state);
        setIsGenerating(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(`Kon creatieve setup niet genereren: ${err instanceof Error ? err.message : err}`);
        setIsGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, level, initialState]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setIsMobileLayout(false);
      return;
    }

    const query = window.matchMedia('(max-width: 720px)');
    const applyMatch = (matches: boolean) => setIsMobileLayout(matches);
    applyMatch(query.matches);

    const listener = (event: MediaQueryListEvent) => applyMatch(event.matches);

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', listener);
      return () => query.removeEventListener('change', listener);
    }

    if (typeof query.addListener === 'function') {
      query.addListener(listener);
      return () => query.removeListener(listener);
    }

    return;
  }, []);

  const modeLabel = useMemo(() => ACTIVITY_MODE_TRANSLATIONS[mode] ?? mode, [mode]);

  const updateConfig = (partial: Partial<CreativeConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial } as CreativeConfig));
    setIsDirty(true);
  };

  const handleGenerate = async (forceRefresh = false) => {
    setIsGenerating(true);
    setError(null);
    setWheelSelection(null);
    try {
      const state = await generateCreativeSetup(mode, config, { forceRefresh });
      setWorkshopState(state);
      setIsDirty(false);
    } catch (err) {
      setError(`Kon creatieve setup niet genereren: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = () => {
    if (!workshopState || !workshopState.setup || isDirty) {
      return;
    }
    onConfirm({ ...workshopState, config });
  };

  const handleSpin = (setup: CreativeKeywordWheelSetup | null) => {
    if (!setup?.slices.length) {
      setWheelSelection(null);
      return;
    }
    const slice = setup.slices[Math.floor(Math.random() * setup.slices.length)];
    const challenge = slice.challenge ? ` · Challenge: ${slice.challenge}` : '';
    setWheelSelection(`${slice.label}: ${slice.keywords.join(', ')}${challenge}`);
  };

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const sectionStyle = isMobileLayout ? { ...styles.section, ...styles.sectionMobile } : styles.section;
  const baseGridStyle = isMobileLayout ? { ...styles.baseGrid, ...styles.baseGridMobile } : styles.baseGrid;
  const bodyStyle = isMobileLayout ? { ...styles.body, ...styles.bodyMobile } : styles.body;
  const leftColumnStyle = isMobileLayout ? { ...styles.leftColumn, ...styles.leftColumnMobile } : styles.leftColumn;
  const rightColumnStyle = isMobileLayout ? { ...styles.rightColumn, ...styles.rightColumnMobile } : styles.rightColumn;
  const footerStyle = isMobileLayout ? { ...styles.footer, ...styles.footerMobile } : styles.footer;
  const secondaryButtonStyle = isMobileLayout ? { ...styles.secondaryButton, ...styles.footerButtonMobile } : styles.secondaryButton;
  const primaryButtonStyle = isMobileLayout ? { ...styles.primaryButton, ...styles.footerButtonMobile } : styles.primaryButton;

  return createPortal(
    <div
      style={{ ...styles.overlay, ...(isMobileLayout ? styles.overlayMobile : {}) }}
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div
        style={{ ...styles.modal, ...(isMobileLayout ? styles.modalMobile : {}) }}
        onClick={(event) => event.stopPropagation()}
      >
        <header style={styles.header}>
          <div>
            <h2 style={styles.title}>{modeLabel}</h2>
            <p style={styles.subtitle}>Stel de sessie kort in en bekijk meteen een AI-voorstel.</p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeButton}>
            Sluiten
          </button>
        </header>

        <section style={bodyStyle}>
          <div style={leftColumnStyle}>
            <div style={sectionStyle}>
              <h4 style={styles.sectionTitle}>Basisinstellingen</h4>
              <div style={baseGridStyle}>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>CEFR-niveau</span>
                  <select
                    value={config.level}
                    onChange={(event) => updateConfig({ level: event.target.value as CEFRLevel })}
                    style={styles.input}
                  >
                    {CEFR_LEVELS.map((cef) => (
                      <option key={cef} value={cef}>
                        {cef}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Deelnemers</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={config.participants ?? 2}
                    onChange={(event) =>
                      updateConfig({ participants: clampNumber(parseInt(event.target.value, 10), 1, 12) })
                    }
                    style={styles.input}
                  />
                </label>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Moeilijkheid</span>
                  <select
                    value={config.difficulty ?? 'makkelijk'}
                    onChange={(event) => updateConfig({ difficulty: event.target.value as CreativeDifficulty })}
                    style={styles.input}
                  >
                    {difficultyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Duur (min)</span>
                  <input
                    type="number"
                    min={5}
                    max={90}
                    value={config.durationMinutes ?? 15}
                    onChange={(event) =>
                      updateConfig({ durationMinutes: clampNumber(parseInt(event.target.value, 10), 5, 90) })
                    }
                    style={styles.input}
                  />
                </label>
                <label style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={config.includeWarmup ?? true}
                    onChange={(event) => updateConfig({ includeWarmup: event.target.checked })}
                  />
                  <span style={styles.fieldLabel}>Inclusief warming-up</span>
                </label>
              </div>
            </div>

            <ModeSpecificControls mode={mode} config={config} onChange={updateConfig} isMobile={isMobileLayout} />

            {error && <div style={styles.errorBox}>{error}</div>}
            {isDirty && (
              <div style={styles.noticeBox}>
                Instellingen gewijzigd. Genereer opnieuw om het voorbeeld bij te werken.
              </div>
            )}
          </div>

          <div style={rightColumnStyle}>
            <PreviewPanel
              mode={mode}
              state={workshopState}
              config={config}
              isGenerating={isGenerating}
              wheelSelection={wheelSelection}
              onSpin={() => handleSpin(workshopState?.setup as CreativeKeywordWheelSetup | null)}
              isMobile={isMobileLayout}
            />
          </div>
        </section>

        <footer style={footerStyle}>
          <button type="button" style={secondaryButtonStyle} onClick={onClose}>
            Annuleren
          </button>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
          >
            {isGenerating ? 'Bezig…' : 'Genereer opnieuw'}
          </button>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => handleGenerate(true)}
            disabled={isGenerating || !workshopState}
          >
            Nieuwe variant
          </button>
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={handleConfirm}
            disabled={!workshopState || !workshopState.setup || isDirty || isGenerating}
          >
            Start sessie
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default CreativeWorkshopModal;

interface ModeSpecificControlsProps {
  mode: CreativeActivityMode;
  config: CreativeConfig;
  onChange: (partial: Partial<CreativeConfig>) => void;
  isMobile: boolean;
}

const ModeSpecificControls: React.FC<ModeSpecificControlsProps> = ({ mode, config, onChange, isMobile }) => {
  const sectionStyle = isMobile ? { ...styles.section, ...styles.sectionMobile } : styles.section;
  const gridStyle = isMobile ? { ...styles.baseGrid, ...styles.baseGridMobile } : styles.baseGrid;

  switch (mode) {
    case 'creative-improvisation':
      return (
        <div style={sectionStyle}>
          <h4 style={styles.sectionTitle}>Improvisatierondes</h4>
          <div style={gridStyle}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Rondes</span>
              <input
                type="number"
                min={1}
                max={8}
                value={(config as CreativeActivityConfigMap['creative-improvisation']).rounds}
                onChange={(event) =>
                  onChange({
                    rounds: clampNumber(parseInt(event.target.value, 10), 1, 8),
                  } as Partial<CreativeConfig>)
                }
                style={styles.input}
              />
            </label>
            <label style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={(config as CreativeActivityConfigMap['creative-improvisation']).includeProps}
                onChange={(event) =>
                  onChange({
                    includeProps: event.target.checked,
                  } as Partial<CreativeConfig>)
                }
              />
              <span style={styles.fieldLabel}>Props & twists gebruiken</span>
            </label>
          </div>
        </div>
      );
    case 'creative-story-relay':
      return (
        <div style={sectionStyle}>
          <h4 style={styles.sectionTitle}>Verhalenestafette</h4>
          <div style={gridStyle}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Verhaallengte</span>
              <select
                value={(config as CreativeActivityConfigMap['creative-story-relay']).storyLength}
                onChange={(event) =>
                  onChange({
                    storyLength: event.target.value as CreativeActivityConfigMap['creative-story-relay']['storyLength'],
                  } as Partial<CreativeConfig>)
                }
                style={styles.input}
              >
                <option value="kort">Kort</option>
                <option value="midden">Gemiddeld</option>
                <option value="lang">Lang</option>
              </select>
            </label>
            <label style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={(config as CreativeActivityConfigMap['creative-story-relay']).allowTwists}
                onChange={(event) =>
                  onChange({
                    allowTwists: event.target.checked,
                  } as Partial<CreativeConfig>)
                }
              />
              <span style={styles.fieldLabel}>Plot-twists toestaan</span>
            </label>
          </div>
        </div>
      );
    case 'creative-escape-room':
      return (
        <div style={sectionStyle}>
          <h4 style={styles.sectionTitle}>Escape-taalspel</h4>
          <div style={gridStyle}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Aantal puzzels</span>
              <input
                type="number"
                min={2}
                max={6}
                value={(config as CreativeActivityConfigMap['creative-escape-room']).puzzleCount}
                onChange={(event) =>
                  onChange({
                    puzzleCount: clampNumber(parseInt(event.target.value, 10), 2, 6),
                  } as Partial<CreativeConfig>)
                }
                style={styles.input}
              />
            </label>
            <label style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={(config as CreativeActivityConfigMap['creative-escape-room']).allowHints}
                onChange={(event) =>
                  onChange({
                    allowHints: event.target.checked,
                  } as Partial<CreativeConfig>)
                }
              />
              <span style={styles.fieldLabel}>Hints toestaan</span>
            </label>
          </div>
        </div>
      );
    case 'creative-emotion-barometer':
      return (
        <div style={sectionStyle}>
          <h4 style={styles.sectionTitle}>Emotiebarometer</h4>
          <div style={gridStyle}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Aantal emoties</span>
              <input
                type="number"
                min={3}
                max={10}
                value={(config as CreativeActivityConfigMap['creative-emotion-barometer']).emotionCount}
                onChange={(event) =>
                  onChange({
                    emotionCount: clampNumber(parseInt(event.target.value, 10), 3, 10),
                  } as Partial<CreativeConfig>)
                }
                style={styles.input}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Bron van zinnen</span>
              <select
                value={(config as CreativeActivityConfigMap['creative-emotion-barometer']).sentenceSource}
                onChange={(event) =>
                  onChange({
                    sentenceSource: event.target.value as CreativeActivityConfigMap['creative-emotion-barometer']['sentenceSource'],
                  } as Partial<CreativeConfig>)
                }
                style={styles.input}
              >
                <option value="ai">AI-voorbeelden</option>
                <option value="custom">Eigen input</option>
              </select>
            </label>
          </div>
        </div>
      );
    case 'creative-keyword-wheel':
      return (
        <div style={sectionStyle}>
          <h4 style={styles.sectionTitle}>Geluksrad</h4>
          <div style={gridStyle}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Aantal spins</span>
              <input
                type="number"
                min={2}
                max={8}
                value={(config as CreativeActivityConfigMap['creative-keyword-wheel']).spins}
                onChange={(event) =>
                  onChange({
                    spins: clampNumber(parseInt(event.target.value, 10), 2, 8),
                  } as Partial<CreativeConfig>)
                }
                style={styles.input}
              />
            </label>
            <label style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={(config as CreativeActivityConfigMap['creative-keyword-wheel']).includeMiniChallenges}
                onChange={(event) =>
                  onChange({
                    includeMiniChallenges: event.target.checked,
                  } as Partial<CreativeConfig>)
                }
              />
              <span style={styles.fieldLabel}>Mini-challenges toevoegen</span>
            </label>
          </div>
        </div>
      );
    default:
      return null;
  }
};

interface PreviewPanelProps {
  mode: CreativeActivityMode;
  state: CreativeWorkshopState | null;
  config: CreativeConfig;
  isGenerating: boolean;
  wheelSelection: string | null;
  onSpin: () => void;
  isMobile: boolean;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ mode, state, config, isGenerating, wheelSelection, onSpin, isMobile }) => {
  const previewBoxStyle = isMobile ? { ...styles.previewBox, ...styles.previewBoxMobile } : styles.previewBox;

  if (isGenerating) {
    return <div style={previewBoxStyle}>Creatieve setup wordt gegenereerd…</div>;
  }
  if (!state?.setup) {
    return <div style={previewBoxStyle}>Genereer een setup om een voorbeeld te zien.</div>;
  }

  switch (mode) {
    case 'creative-improvisation':
      return <ImprovPreview setup={state.setup as CreativeImprovSetup} rounds={(config as any).rounds ?? 3} isMobile={isMobile} />;
    case 'creative-story-relay':
      return (
        <StoryPreview
          setup={state.setup as CreativeStoryRelaySetup}
          allowTwists={(config as any).allowTwists ?? true}
          isMobile={isMobile}
        />
      );
    case 'creative-escape-room':
      return (
        <EscapePreview
          setup={state.setup as CreativeEscapeRoomSetup}
          allowHints={(config as any).allowHints ?? true}
          isMobile={isMobile}
        />
      );
    case 'creative-emotion-barometer':
      return (
        <EmotionPreview
          setup={state.setup as CreativeEmotionBarometerSetup}
          emotionCount={(config as any).emotionCount ?? 4}
          isMobile={isMobile}
        />
      );
    case 'creative-keyword-wheel':
      return (
        <KeywordPreview
          setup={state.setup as CreativeKeywordWheelSetup}
          includeMiniChallenges={(config as any).includeMiniChallenges ?? true}
          wheelSelection={wheelSelection}
          onSpin={onSpin}
          isMobile={isMobile}
        />
      );
    default:
      return <div style={previewBoxStyle}>Geen voorbeeld beschikbaar.</div>;
  }
};

const ImprovPreview: React.FC<{ setup: CreativeImprovSetup; rounds: number; isMobile: boolean }> = ({ setup, rounds, isMobile }) => {
  const containerStyle = isMobile ? { ...styles.previewGrid, ...styles.previewGridMobile } : styles.previewGrid;
  const cardGridStyle = isMobile ? { ...styles.cardGrid, ...styles.cardGridMobile } : styles.cardGrid;
  return (
    <div style={containerStyle}>
      <section>
        <h5 style={styles.previewTitle}>Warm-ups</h5>
        <ul style={styles.list}>
          {setup.warmUps.slice(0, 3).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <h5 style={styles.previewTitle}>Rolkaarten</h5>
        <div style={cardGridStyle}>
          {setup.roleCards.slice(0, rounds).map((card, index) => (
            <div key={index} style={styles.card}>
              <strong>{card.role}</strong>
              <span>Emotie: {card.emotion}</span>
              <span>Locatie: {card.location}</span>
              {card.prop && <span>Prop: {card.prop}</span>}
              {card.twist && <span>Twist: {card.twist}</span>}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h5 style={styles.previewTitle}>Reflectievragen</h5>
        <ul style={styles.list}>
          {setup.reflectionPrompts.slice(0, 3).map((prompt, index) => (
            <li key={index}>{prompt}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

const StoryPreview: React.FC<{ setup: CreativeStoryRelaySetup; allowTwists: boolean; isMobile: boolean }> = ({ setup, allowTwists, isMobile }) => {
  const containerStyle = isMobile ? { ...styles.previewGrid, ...styles.previewGridMobile } : styles.previewGrid;
  return (
    <div style={containerStyle}>
      <section>
        <h5 style={styles.previewTitle}>Opening</h5>
        <p style={styles.paragraph}>{setup.openingLine}</p>
      </section>
      <section>
        <h5 style={styles.previewTitle}>Plotstappen</h5>
        <ol style={styles.list}>
          {setup.narrativeBeats.map((beat, index) => (
            <li key={index}>{beat}</li>
          ))}
        </ol>
      </section>
      {allowTwists && (
        <section>
          <h5 style={styles.previewTitle}>Twist-kaarten</h5>
          <div style={styles.badgeRow}>
            {setup.twistCards.slice(0, 6).map((twist, index) => (
              <span key={index} style={styles.badge}>
                {twist}
              </span>
            ))}
          </div>
        </section>
      )}
      <section>
        <h5 style={styles.previewTitle}>Afronden</h5>
        <ul style={styles.list}>
          {setup.wrapUpPrompts.slice(0, 3).map((prompt, index) => (
            <li key={index}>{prompt}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

const EscapePreview: React.FC<{ setup: CreativeEscapeRoomSetup; allowHints: boolean; isMobile: boolean }> = ({ setup, allowHints, isMobile }) => {
  const containerStyle = isMobile ? { ...styles.previewGrid, ...styles.previewGridMobile } : styles.previewGrid;
  return (
    <div style={containerStyle}>
      <section>
        <h5 style={styles.previewTitle}>Scenario</h5>
        <p style={styles.paragraph}>{setup.scenario}</p>
      </section>
      <section>
        <h5 style={styles.previewTitle}>Puzzellijn</h5>
        <ol style={styles.list}>
          {setup.puzzles.map((puzzle, index) => (
            <li key={index}>
              <strong>{puzzle.languageFocus}:</strong> {puzzle.clue}
              {allowHints && puzzle.hint ? <em> · Hint: {puzzle.hint}</em> : null}
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h5 style={styles.previewTitle}>Finale</h5>
        <p style={styles.paragraph}>{setup.finale}</p>
      </section>
      {setup.supportTips.length > 0 && (
        <section>
          <h5 style={styles.previewTitle}>Ondersteuning</h5>
          <ul style={styles.list}>
            {setup.supportTips.slice(0, 3).map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

const EmotionPreview: React.FC<{ setup: CreativeEmotionBarometerSetup; emotionCount: number; isMobile: boolean }> = ({
  setup,
  emotionCount,
  isMobile,
}) => {
  const containerStyle = isMobile ? { ...styles.previewGrid, ...styles.previewGridMobile } : styles.previewGrid;
  const tableStyle = isMobile ? { ...styles.table, ...styles.tableMobile } : styles.table;
  return (
    <div style={containerStyle}>
      <section>
        <h5 style={styles.previewTitle}>Neutrale zinnen</h5>
        <ul style={styles.list}>
          {setup.neutralSentences.slice(0, 3).map((sentence, index) => (
            <li key={index}>{sentence}</li>
          ))}
        </ul>
      </section>
      <section>
        <h5 style={styles.previewTitle}>Emotiekaarten</h5>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th>Emotie</th>
              <th>Stem</th>
              <th>Lichaam</th>
              <th>Extra</th>
            </tr>
          </thead>
          <tbody>
            {setup.emotionCards.slice(0, emotionCount).map((card, index) => (
              <tr key={index}>
                <td>{card.emotion}</td>
                <td>{card.vocalStyle}</td>
                <td>{card.bodyLanguage}</td>
                <td>{card.escalation ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h5 style={styles.previewTitle}>Reflectie</h5>
        <ul style={styles.list}>
          {setup.reflectionQuestions.slice(0, 3).map((question, index) => (
            <li key={index}>{question}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

const KeywordPreview: React.FC<{
  setup: CreativeKeywordWheelSetup;
  includeMiniChallenges: boolean;
  wheelSelection: string | null;
  onSpin: () => void;
  isMobile: boolean;
}> = ({ setup, includeMiniChallenges, wheelSelection, onSpin, isMobile }) => {
  const containerStyle = isMobile ? { ...styles.previewGrid, ...styles.previewGridMobile } : styles.previewGrid;
  const spinButtonStyle = isMobile ? { ...styles.spinButton, ...styles.footerButtonMobile } : styles.spinButton;
  return (
    <div style={containerStyle}>
      <section>
        <h5 style={styles.previewTitle}>Segmenten</h5>
        <ul style={styles.list}>
          {setup.slices.map((slice, index) => (
            <li key={index}>
              <strong>{slice.label}:</strong> {slice.keywords.join(', ')}
              {includeMiniChallenges && slice.challenge ? <em> · {slice.challenge}</em> : null}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h5 style={styles.previewTitle}>Geluksrad</h5>
        <button type="button" style={spinButtonStyle} onClick={onSpin}>
          Draai het rad
        </button>
        {wheelSelection && (
          <div style={styles.wheelResult}>
            <strong>Resultaat</strong>
            <span>{wheelSelection}</span>
          </div>
        )}
      </section>
      <section>
        <h5 style={styles.previewTitle}>Opdrachten</h5>
        <ul style={styles.list}>
          {setup.followUpTasks.slice(0, 3).map((task, index) => (
            <li key={index}>{task}</li>
          ))}
        </ul>
      </section>
    </div>
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
  overlayMobile: {
    alignItems: 'flex-start',
    padding: '16px 12px',
    overflowY: 'auto',
  },
  modal: {
    width: 'min(1080px, 95vw)',
    maxHeight: '92vh',
    borderRadius: '24px',
    border: '1px solid rgba(148, 163, 184, 0.28)',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    color: 'var(--color-text)',
    display: 'flex',
    flexDirection: 'column',
  },
  modalMobile: {
    width: '100%',
    maxHeight: 'none',
    minHeight: 'calc(100vh - 24px)',
    borderRadius: '20px',
    paddingBottom: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '24px 28px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
  },
  title: {
    margin: 0,
    fontSize: '1.4em',
    fontWeight: 700,
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: '0.95em',
    opacity: 0.75,
  },
  closeButton: {
    border: '1px solid rgba(148, 163, 184, 0.4)',
    borderRadius: '999px',
    padding: '8px 16px',
    background: 'transparent',
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  body: {
    display: 'flex',
    gap: '24px',
    padding: '24px 28px',
    overflowY: 'auto',
    flex: 1,
  },
  bodyMobile: {
    flexDirection: 'column',
    padding: '18px 20px',
  },
  leftColumn: {
    flex: '0 0 360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  leftColumnMobile: {
    flex: '1 1 auto',
    width: '100%',
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
  },
  rightColumnMobile: {
    width: '100%',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px 18px',
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.24)',
    background: 'linear-gradient(155deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.78))',
    boxShadow: '0 18px 36px rgba(15, 23, 42, 0.35)',
  },
  sectionMobile: {
    padding: '14px 16px',
    gap: '10px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '0.82em',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    opacity: 0.7,
  },
  baseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
  },
  baseGridMobile: {
    gridTemplateColumns: '1fr',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.9em',
  },
  fieldLabel: {
    fontWeight: 600,
    opacity: 0.75,
  },
  input: {
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.32)',
    background: 'rgba(15, 23, 42, 0.65)',
    color: 'var(--color-text)',
    padding: '10px 12px',
  },
  errorBox: {
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    background: 'rgba(248, 113, 113, 0.12)',
    color: '#fecdd3',
    fontSize: '0.85em',
  },
  noticeBox: {
    padding: '12px',
    borderRadius: '12px',
    border: '1px dashed rgba(59, 130, 246, 0.5)',
    background: 'rgba(59, 130, 246, 0.12)',
    color: '#bfdbfe',
    fontSize: '0.85em',
  },
  footer: {
    padding: '20px 28px',
    borderTop: '1px solid rgba(148, 163, 184, 0.2)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  footerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: '18px 20px',
    gap: '10px',
  },
  primaryButton: {
    padding: '10px 22px',
    borderRadius: '999px',
    border: 'none',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(34, 197, 94, 0.9))',
    color: '#052e16',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 18px 36px rgba(16, 185, 129, 0.32)',
  },
  secondaryButton: {
    padding: '10px 20px',
    borderRadius: '999px',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    background: 'transparent',
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  footerButtonMobile: {
    width: '100%',
    justifyContent: 'center',
  },
  previewBox: {
    padding: '24px',
    borderRadius: '18px',
    background: 'rgba(30, 41, 59, 0.55)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    minHeight: '260px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  previewBoxMobile: {
    padding: '18px',
    minHeight: '180px',
  },
  previewGrid: {
    display: 'grid',
    gap: '16px',
  },
  previewGridMobile: {
    gap: '12px',
  },
  previewTitle: {
    margin: '0 0 6px',
    fontSize: '0.9em',
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  paragraph: {
    margin: 0,
    fontSize: '0.92em',
    lineHeight: 1.45,
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    fontSize: '0.9em',
    lineHeight: 1.45,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
  },
  cardGridMobile: {
    gridTemplateColumns: '1fr',
  },
  card: {
    borderRadius: '14px',
    padding: '12px',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    background: 'rgba(59, 130, 246, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '0.85em',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'rgba(59, 130, 246, 0.18)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    fontSize: '0.75em',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85em',
  },
  tableMobile: {
    fontSize: '0.8em',
  },
  spinButton: {
    padding: '8px 16px',
    borderRadius: '999px',
    border: 'none',
    background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.95), rgba(248, 113, 113, 0.95))',
    color: '#3f1f01',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 12px 24px rgba(248, 113, 113, 0.35)',
  },
  wheelResult: {
    marginTop: '12px',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.28)',
    background: 'rgba(148, 163, 184, 0.18)',
    fontSize: '0.85em',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    textAlign: 'left',
  },
};