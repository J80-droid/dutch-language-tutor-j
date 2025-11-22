import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityMode, ACTIVITY_CATEGORIES } from '../types';
import type { NewsFeedEntry } from '@/services/newsFeedService';
import styles from './ActivitySelector.module.css';

interface NewsSectionProps {
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  headlines: NewsFeedEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  selectedHeadlineId: string | null;
  onSelectHeadline: (id: string | null) => void;
  selectedHeadline: NewsFeedEntry | null;
  onRefresh: (options?: { force?: boolean }) => Promise<void>;
  onStartSessionFromHeadline: (headline: NewsFeedEntry) => void;
}

interface Props {
  selectedMode: ActivityMode;
  onSelectMode: (mode: ActivityMode) => void;
  newsSection?: NewsSectionProps;
}

type ActivityCardTheme = {
  background: string;
  border: string;
  text: string;
  shadow: string;
};

type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

const ACTIVITY_CARD_THEMES: Record<ActivityMode, ActivityCardTheme> = {
  conversation: {
    background: 'linear-gradient(145deg, rgba(37, 99, 235, 0.25), rgba(14, 165, 233, 0.12))',
    border: 'rgba(37, 99, 235, 0.45)',
    text: '#f1f5f9',
    shadow: 'rgba(37, 99, 235, 0.22)',
  },
  vocabulary: {
    background: 'linear-gradient(145deg, rgba(15, 118, 110, 0.28), rgba(13, 148, 136, 0.12))',
    border: 'rgba(13, 148, 136, 0.45)',
    text: '#ecfeff',
    shadow: 'rgba(13, 148, 136, 0.22)',
  },
  grammar: {
    background: 'linear-gradient(145deg, rgba(124, 58, 237, 0.26), rgba(99, 102, 241, 0.12))',
    border: 'rgba(124, 58, 237, 0.45)',
    text: '#f5f3ff',
    shadow: 'rgba(99, 102, 241, 0.22)',
  },
  culture: {
    background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.28), rgba(245, 158, 11, 0.12))',
    border: 'rgba(245, 158, 11, 0.45)',
    text: '#fff7ed',
    shadow: 'rgba(249, 115, 22, 0.22)',
  },
  'job-interview': {
    background: 'linear-gradient(145deg, rgba(109, 40, 217, 0.26), rgba(139, 92, 246, 0.12))',
    border: 'rgba(139, 92, 246, 0.45)',
    text: '#faf5ff',
    shadow: 'rgba(109, 40, 217, 0.22)',
  },
  'making-complaint': {
    background: 'linear-gradient(145deg, rgba(244, 63, 94, 0.26), rgba(225, 29, 72, 0.12))',
    border: 'rgba(244, 63, 94, 0.45)',
    text: '#fff1f2',
    shadow: 'rgba(244, 63, 94, 0.22)',
  },
  'expressing-opinion': {
    background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.26), rgba(101, 163, 13, 0.12))',
    border: 'rgba(34, 197, 94, 0.45)',
    text: '#f7fee7',
    shadow: 'rgba(34, 197, 94, 0.22)',
  },
  'giving-instructions': {
    background: 'linear-gradient(145deg, rgba(14, 165, 233, 0.26), rgba(16, 185, 129, 0.12))',
    border: 'rgba(16, 185, 129, 0.45)',
    text: '#ecfeff',
    shadow: 'rgba(14, 165, 233, 0.22)',
  },
  'listen-summarize': {
    background: 'linear-gradient(145deg, rgba(56, 189, 248, 0.26), rgba(99, 102, 241, 0.12))',
    border: 'rgba(99, 102, 241, 0.45)',
    text: '#eef2ff',
    shadow: 'rgba(99, 102, 241, 0.22)',
  },
  'tongue-twisters': {
    background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.26), rgba(249, 115, 22, 0.12))',
    border: 'rgba(236, 72, 153, 0.45)',
    text: '#fff1f2',
    shadow: 'rgba(236, 72, 153, 0.22)',
  },
  'sentence-puzzle': {
    background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.26), rgba(147, 51, 234, 0.12))',
    border: 'rgba(147, 51, 234, 0.45)',
    text: '#fdf4ff',
    shadow: 'rgba(147, 51, 234, 0.22)',
  },
  'extra-practice': {
    background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.24), rgba(30, 64, 175, 0.14))',
    border: 'rgba(59, 130, 246, 0.48)',
    text: '#eef2ff',
    shadow: 'rgba(37, 99, 235, 0.22)',
  },
  'creative-improvisation': {
    background: 'linear-gradient(145deg, rgba(244, 114, 182, 0.28), rgba(217, 70, 239, 0.12))',
    border: 'rgba(217, 70, 239, 0.48)',
    text: '#fdf2f8',
    shadow: 'rgba(217, 70, 239, 0.26)',
  },
  'creative-story-relay': {
    background: 'linear-gradient(145deg, rgba(56, 189, 248, 0.28), rgba(168, 85, 247, 0.14))',
    border: 'rgba(168, 85, 247, 0.5)',
    text: '#eef2ff',
    shadow: 'rgba(168, 85, 247, 0.24)',
  },
  'creative-escape-room': {
    background: 'linear-gradient(145deg, rgba(14, 165, 233, 0.26), rgba(234, 179, 8, 0.14))',
    border: 'rgba(14, 165, 233, 0.48)',
    text: '#f0f9ff',
    shadow: 'rgba(14, 165, 233, 0.24)',
  },
  'creative-emotion-barometer': {
    background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.28), rgba(59, 130, 246, 0.14))',
    border: 'rgba(236, 72, 153, 0.48)',
    text: '#fff1f2',
    shadow: 'rgba(236, 72, 153, 0.24)',
  },
  'creative-keyword-wheel': {
    background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.26), rgba(250, 204, 21, 0.14))',
    border: 'rgba(16, 185, 129, 0.48)',
    text: '#ecfdf5',
    shadow: 'rgba(16, 185, 129, 0.24)',
  },
  'proverbs-sayings': {
    background: 'linear-gradient(145deg, rgba(250, 204, 21, 0.26), rgba(249, 115, 22, 0.12))',
    border: 'rgba(250, 204, 21, 0.45)',
    text: '#fefce8',
    shadow: 'rgba(250, 204, 21, 0.22)',
  },
};

const getActivityThemeStyles = (mode: ActivityMode, isSelected: boolean): React.CSSProperties => {
  const theme = ACTIVITY_CARD_THEMES[mode];
  if (!theme) return {};

  const themedStyles: React.CSSProperties = {
    background: theme.background,
    color: theme.text,
    borderColor: theme.border,
    boxShadow: `0 12px 28px ${theme.shadow}`,
    filter: 'brightness(0.98)',
  };

  if (isSelected) {
    themedStyles.filter = 'brightness(1.02)';
    themedStyles.transform = 'translateY(-2px)';
    themedStyles.boxShadow = `0 18px 36px ${theme.shadow}`;
  }

  return themedStyles;
};

const ActivitySelector: React.FC<Props> = ({ selectedMode, onSelectMode, newsSection }) => {
  const initialExpanded = useMemo(() => {
    const map: Record<string, boolean> = {};
    ACTIVITY_CATEGORIES.forEach((category) => {
      map[category.categoryName] = false;
    });
    return map;
  }, []);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(initialExpanded);
  const [isNewsExpanded, setIsNewsExpanded] = useState(false);
  const isInitialRenderRef = useRef(true);
  const previousNewsEnabledRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return;
    }
    const containingCategory = ACTIVITY_CATEGORIES.find(category =>
      category.activities.some(activity => activity.id === selectedMode)
    );
    if (containingCategory) {
      setExpandedCategories(prev => ({
        ...prev,
        [containingCategory.categoryName]: true,
      }));
    }
  }, [selectedMode]);

  useEffect(() => {
    if (newsSection == null) {
      return;
    }
    if (previousNewsEnabledRef.current === null) {
      previousNewsEnabledRef.current = newsSection.enabled;
      return;
    }
    if (!previousNewsEnabledRef.current && newsSection.enabled) {
      setIsNewsExpanded(true);
    }
    if (!newsSection.enabled) {
      setIsNewsExpanded(false);
    }
    previousNewsEnabledRef.current = newsSection.enabled;
  }, [newsSection]);

  const newsLastUpdatedLabel = useMemo(() => {
    if (!newsSection?.lastUpdated) {
      return 'Nog niet geladen';
    }
    try {
      return new Date(newsSection.lastUpdated).toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Onbekend';
    }
  }, [newsSection?.lastUpdated]);

  const handleToggleNewsEnabled = () => {
    if (!newsSection) {
      return;
    }
    const nextEnabled = !newsSection.enabled;
    newsSection.onToggleEnabled(nextEnabled);
    if (nextEnabled) {
      setIsNewsExpanded(true);
    }
  };

  const handleSelectNewsHeadline = (id: string) => {
    if (!newsSection) {
      return;
    }
    newsSection.onSelectHeadline(id);
    const headline = newsSection.headlines.find(item => item.id === id);
    if (headline) {
      newsSection.onStartSessionFromHeadline(headline);
    }
  };

  const truncateSummary = (text: string | null | undefined, max = 160) => {
    if (!text) {
      return '';
    }
    if (text.length <= max) {
      return text;
    }
    return `${text.slice(0, max - 1)}…`;
  };

  const renderCategory = (category: ActivityCategory) => {
    const isExpanded = expandedCategories[category.categoryName] ?? false;
    return (
      <div key={category.categoryName} className={styles.category}>
        <button
          type="button"
          onClick={() => handleToggleCategory(category.categoryName)}
          className={`${styles.categoryToggle} ${isExpanded ? styles.categoryToggleExpanded : ''}`}
          aria-expanded={isExpanded}
        >
          <span className={styles.categoryName}>{category.categoryName}</span>
          <span className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}>▾</span>
        </button>
        <div
          className={`${styles.buttonsContainer} ${isExpanded ? styles.buttonsExpanded : styles.buttonsCollapsed}`}
          style={{ maxHeight: isExpanded ? '1000px' : 0 }}
        >
          {isExpanded &&
            category.activities.map(activity => (
              <button
                key={activity.id}
                onClick={() => onSelectMode(activity.id)}
                className={styles.activityButton}
                style={getActivityThemeStyles(activity.id, selectedMode === activity.id)}
              >
                <span className={styles.activityName}>{activity.name}</span>
                <span className={styles.activityDescription}>{activity.description}</span>
              </button>
            ))}
        </div>
      </div>
    );
  };

  const renderNewsAccordion = () => {
    if (!newsSection) {
      return null;
    }
    const maxHeight = isNewsExpanded ? 900 : 0;
    return (
      <div key="news-category" className={styles.category}>
        <button
          type="button"
          onClick={() => setIsNewsExpanded(prev => !prev)}
          className={`${styles.categoryToggle} ${isNewsExpanded ? styles.categoryToggleExpanded : ''}`}
          aria-expanded={isNewsExpanded}
        >
          <span className={styles.categoryName}>Actueel nieuws</span>
          <span className={`${styles.chevron} ${isNewsExpanded ? styles.chevronExpanded : ''}`}>▾</span>
        </button>
        <div
          className={`${styles.buttonsContainer} ${styles.newsContainer} ${
            isNewsExpanded ? styles.buttonsExpanded : styles.buttonsCollapsed
          }`}
          style={{ maxHeight }}
        >
          <div className={styles.newsHeader}>
            <div>
              <h4 className={styles.newsTitleHeading}>Actueel nieuws als onderwerp</h4>
              <p className={styles.newsSubtitle}>Kies een recent nieuwsbericht om het gesprek te starten.</p>
            </div>
            <label className={styles.newsToggle}>
              <input
                type="checkbox"
                checked={newsSection.enabled}
                onChange={handleToggleNewsEnabled}
                aria-label={newsSection.enabled ? 'Nieuws uitschakelen' : 'Nieuws inschakelen'}
              />
              <span className={styles.newsToggleTrack}>
                <span className={styles.newsToggleThumb} />
              </span>
              <span className={styles.newsToggleLabel}>{newsSection.enabled ? 'Aan' : 'Uit'}</span>
            </label>
          </div>

          {newsSection.enabled ? (
            <>
              <div className={styles.newsActions}>
                <button
                  type="button"
                  className={styles.newsButtonPrimary}
                  onClick={() => {
                    void newsSection.onRefresh({ force: true });
                  }}
                  disabled={newsSection.loading}
                >
                  Nieuws vernieuwen
                </button>
                <span className={styles.newsTimestamp}>Laatste update: {newsLastUpdatedLabel}</span>
              </div>
              {newsSection.error && <div className={styles.newsError}>{newsSection.error}</div>}
              {newsSection.loading && <p className={styles.newsLoading}>Nieuws laden…</p>}
              {!newsSection.loading && newsSection.headlines.length === 0 && !newsSection.error && (
                <p className={styles.newsEmpty}>Er zijn momenteel geen headlines beschikbaar.</p>
              )}
              {!newsSection.loading && newsSection.headlines.length > 0 && (
                <ul className={styles.newsList}>
                  {newsSection.headlines.slice(0, 5).map(item => {
                    const isSelected = newsSection.selectedHeadlineId === item.id;
                    return (
                      <li
                        key={item.id}
                        className={`${styles.newsItem} ${isSelected ? styles.newsItemSelected : ''}`}
                      >
                        <label className={styles.newsOption}>
                          <input
                            type="radio"
                            name="newsHeadline"
                            value={item.id}
                            checked={isSelected}
                            onChange={() => handleSelectNewsHeadline(item.id)}
                          />
                          <div className={styles.newsDetails}>
                            <div className={styles.newsTitleRow}>
                              <span className={styles.newsHeadlineTitle}>{item.title}</span>
                            </div>
                            <div className={styles.newsMetaCompact}>
                              <span>{item.sourceName}</span>
                              {item.publishedAt && (
                                <>
                                  <span aria-hidden="true">•</span>
                                  <span>{new Date(item.publishedAt).toLocaleDateString('nl-NL')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {newsSection.selectedHeadline && (
                <div className={styles.newsSelectionHint}>
                  Geselecteerd nieuws: <strong>{newsSection.selectedHeadline.title}</strong>
                </div>
              )}
            </>
          ) : (
            <div className={styles.newsDisabled}>
              Schakel het nieuws bovenaan in om actuele artikelen te gebruiken als gespreksonderwerp.
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleToggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  return (
    <div className={styles.container} aria-labelledby="activities-heading">
      {ACTIVITY_CATEGORIES.map((category, index) => (
        <React.Fragment key={category.categoryName}>
          {renderCategory(category)}
          {newsSection && index === 0 && renderNewsAccordion()}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ActivitySelector;
