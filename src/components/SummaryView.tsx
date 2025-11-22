
import React from 'react';
import {
  SessionSummary,
  Theme,
  MissionProgress,
  BadgeProgress,
  SeasonalEventProgress,
  GoalFeedbackIssueSeverity,
} from '../types';
import type { NewsConversationTopic } from '@/services/geminiService';
import { XPLevelProgress, XPUpdateResult } from '../utils/gamificationUtils';
import styles from './SummaryView.module.css';

interface Props {
  summary: SessionSummary | null;
  isLoading: boolean;
  progress: { value: number; label: string };
  onStartNewSession: () => void;
  onExport: () => void;
  closingReflection?: string | null;
  xpResult?: XPUpdateResult | null;
  bonusXP?: number;
  levelProgress: XPLevelProgress;
  nextThemeUnlock?: { theme: Theme; requiredLevel: number } | null;
  completedMissions?: MissionProgress[];
  seasonalCompletions?: SeasonalEventProgress[];
  newBadges?: BadgeProgress[];
  newsTopic?: NewsConversationTopic | null;
}

const SummaryView: React.FC<Props> = ({
  summary,
  isLoading,
  progress,
  onStartNewSession,
  onExport,
  closingReflection,
  xpResult,
  bonusXP = 0,
  levelProgress,
  nextThemeUnlock,
  completedMissions,
  seasonalCompletions,
  newBadges,
  newsTopic,
}) => {
  const severityLabelMap: Record<GoalFeedbackIssueSeverity, string> = {
    laag: 'Laag',
    middel: 'Middel',
    hoog: 'Hoog',
  };
  const severityClassMap: Record<GoalFeedbackIssueSeverity, string> = {
    laag: styles.goalFeedbackSeverityLow,
    middel: styles.goalFeedbackSeverityMedium,
    hoog: styles.goalFeedbackSeverityHigh,
  };
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loaderCard}>
          <div className={styles.loader} />
          <p className={styles.loaderLabel}>{progress.label}</p>
          <div className={styles.loaderTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.value * 100)}>
            <span className={styles.loaderFill} style={{ width: `${Math.min(progress.value * 100, 100)}%` }} />
          </div>
          <span className={styles.loaderPercent}>{Math.round(progress.value * 100)}%</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={styles.container}>
        <h2>Geen Samenvatting Beschikbaar</h2>
        <p>Er was een probleem bij het genereren van het verslag voor je sessie.</p>
        <button type="button" onClick={onStartNewSession} className={styles.button}>
          Start Nieuwe Sessie
        </button>
      </div>
    );
  }

  const effectiveXP = xpResult ?? {
    amount: 0,
    total: levelProgress.totalXp,
    previousLevel: levelProgress.level,
    newLevel: levelProgress.level,
    xpIntoLevel: levelProgress.xpIntoLevel,
    xpForNextLevel: levelProgress.xpForNextLevel,
    progress: levelProgress.progress,
  };
  const totalEarnedXP = (xpResult?.amount ?? 0) + bonusXP;
  const displayProgress = effectiveXP.progress;
  const displayLevel = effectiveXP.newLevel;
  const formatThemeName = (theme?: Theme) => theme ? theme.replace(/-/g, ' ') : '';
  const leveledUp = xpResult ? xpResult.newLevel > xpResult.previousLevel : false;

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>Sessieverslag</h2>
      
      {closingReflection && (
        <div className={styles.section}>
          <h3 className={styles.subHeader}>Afsluiting</h3>
          <p>{closingReflection}</p>
        </div>
      )}

      {newsTopic && (
        <div className={`${styles.section} ${styles.newsSection}`}>
          <h3 className={styles.subHeader}>Nieuwscontext</h3>
          <p className={styles.newsHeadline}>
            {newsTopic.articleUrl ? (
              <a href={newsTopic.articleUrl} target="_blank" rel="noreferrer">
                {newsTopic.headline}
              </a>
            ) : (
              newsTopic.headline
            )}
          </p>
          <p className={styles.newsMeta}>
            Bron: {newsTopic.sourceName}
            {newsTopic.publishedAt
              ? ` • ${new Date(newsTopic.publishedAt).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}`
              : ''}
          </p>
          <p className={styles.newsSummary}>{newsTopic.summaryText}</p>
          <p className={styles.newsNote}>{newsTopic.sourceNote}</p>
        </div>
      )}

      <div className={styles.section}>
          <h3 className={styles.subHeader}>Leerpunten</h3>
          <p>{summary.learningPoints}</p>
      </div>

      {summary.newVocabulary && summary.newVocabulary.length > 0 && (
        <div className={styles.section}>
            <h3 className={styles.subHeader}>Nieuwe Woordenschat</h3>
            <ul className={styles.vocabList}>
                {summary.newVocabulary.map((item, index) => (
                    <li key={index} className={styles.vocabItem}>
                        <strong>{item.word}</strong>: {item.translation}
                        <br />
                        <small><em>{item.example}</em></small>
                    </li>
                ))}
            </ul>
            <button
              type="button"
              onClick={onExport}
              className={`${styles.button} ${styles.secondaryButton}`}
            >
              Exporteer Woordenlijst
            </button>
        </div>
      )}

      <div className={styles.section}>
          <h3 className={styles.subHeader}>Beloningen & XP</h3>
          <p>XP uit sessie: <strong>{xpResult?.amount ?? 0}</strong></p>
          {bonusXP > 0 && <p>Streakbonus: <strong>{bonusXP}</strong></p>}
          <p>Totaal verdiend: <strong>{totalEarnedXP}</strong> XP</p>
          <div className={styles.levelProgressTrack}>
              <div
                className={styles.levelProgressFill}
                style={{ width: `${Math.min(displayProgress * 100, 100)}%` }}
              />
          </div>
          <div className={styles.levelMetaRow}>
              <span>Coach level {displayLevel}</span>
              <span>{Math.round(displayProgress * 100)}% naar level {displayLevel + 1}</span>
          </div>
          {nextThemeUnlock ? (
            <div className={styles.levelMetaRow}>
                <span>Volgende thema: {formatThemeName(nextThemeUnlock.theme)} · level {nextThemeUnlock.requiredLevel}</span>
            </div>
          ) : (
            <div className={styles.levelMetaRow}>
                <span>Alle thema’s zijn ontgrendeld!</span>
            </div>
          )}
          {leveledUp && (
              <div className={styles.levelUpCallout}>
                  🎉 Je bent een level gestegen! Nieuwe rang: level {effectiveXP.newLevel}.
              </div>
          )}
      </div>

      {summary.goalFeedback && summary.goalFeedback.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.subHeader}>Leerdoelgerichte Feedback</h3>
          <ul className={styles.goalFeedbackList}>
            {summary.goalFeedback.map((feedback, index) => {
              const effectiveKey = `${feedback.goal}-${index}`;
              return (
                <li key={effectiveKey} className={styles.goalFeedbackItem}>
                  <div className={styles.goalFeedbackHeader}>
                    <span className={styles.goalFeedbackLabel}>{feedback.label ?? feedback.goal}</span>
                    <span className={styles.goalFeedbackScore}>
                      {feedback.score}/5 · {feedback.scoreLabel}
                    </span>
                  </div>
                  <p className={styles.goalFeedbackSummary}>{feedback.summary}</p>
                  {feedback.strictnessNote ? (
                    <p className={styles.goalFeedbackStrictness}>{feedback.strictnessNote}</p>
                  ) : null}
                  {feedback.issues && feedback.issues.length > 0 ? (
                    <ul className={styles.goalFeedbackIssues}>
                      {feedback.issues.map((issue, issueIndex) => {
                        const severityKey = issue.severity as GoalFeedbackIssueSeverity | undefined;
                        const severityLabel = severityKey ? severityLabelMap[severityKey] : undefined;
                        const severityClass = severityKey ? severityClassMap[severityKey] : undefined;
                        return (
                          <li key={issueIndex} className={styles.goalFeedbackIssue}>
                            <div className={styles.goalFeedbackIssueHeader}>
                              {severityLabel ? (
                                <span
                                  className={
                                    severityClass
                                      ? `${styles.goalFeedbackSeverity} ${severityClass}`
                                      : styles.goalFeedbackSeverity
                                  }
                                >
                                  {severityLabel}
                                </span>
                              ) : null}
                              <span>{issue.note}</span>
                            </div>
                            {issue.quote ? (
                              <blockquote className={styles.goalFeedbackQuote}>{issue.quote}</blockquote>
                            ) : null}
                            {issue.correction ? (
                              <p className={styles.goalFeedbackCorrection}>
                                <strong>Verbetering:</strong> {issue.correction}
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {completedMissions && completedMissions.length > 0 && (
        <div className={styles.section}>
            <h3 className={styles.subHeader}>Voltooide missies</h3>
            <ul className={styles.missionList}>
              {completedMissions.map(mission => (
                <li key={mission.id} className={styles.missionItem}>
                  <strong>{mission.title}</strong>
                  <div>{mission.description}</div>
                  {mission.reward?.xp ? <span>Beloning: {mission.reward.xp} XP</span> : null}
                </li>
              ))}
            </ul>
        </div>
      )}
      {seasonalCompletions && seasonalCompletions.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.subHeader}>Seizoensevent updates</h3>
          <ul className={styles.missionList}>
            {seasonalCompletions.map(event => (
              <li key={event.id} className={styles.missionItem}>
                <strong>{event.name}</strong>
                <div>{event.description}</div>
                {event.rewards?.xp ? <span>Seizoensbeloning: {event.rewards.xp} XP</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      {newBadges && newBadges.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.subHeader}>Nieuwe badges</h3>
          <ul className={styles.badgeList}>
            {newBadges.map(badge => (
              <li key={badge.id} className={styles.badgeListItem}>
                <strong>{badge.name}</strong>
                <div>{badge.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.section}>
          <h3 className={styles.subHeader}>Suggesties voor de Volgende Keer</h3>
          <p>{summary.suggestions}</p>
      </div>
      
      <button type="button" onClick={onStartNewSession} className={styles.button}>
        Start Nieuwe Sessie
      </button>
    </div>
  );
};

export default SummaryView;