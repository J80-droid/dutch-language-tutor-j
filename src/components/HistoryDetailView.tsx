

import React from 'react';
import { SavedConversation, LEARNING_GOAL_METADATA } from '../types';
import ConversationView from './ConversationView';

interface Props {
  conversation: SavedConversation;
  onWordSelect?: (word: string) => void;
}

const formatDuration = (ms: number) => {
  if (!ms || ms <= 0) {
    return '0:00';
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatNewsDate = (iso?: string | null) => {
  if (!iso) {
    return null;
  }
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

const HistoryDetailView: React.FC<Props> = ({ conversation, onWordSelect }) => {
  const goalLabel = conversation.goal ? LEARNING_GOAL_METADATA[conversation.goal]?.label ?? conversation.goal : null;
  const metrics = conversation.metrics;
  const userShare = metrics ? Math.round(metrics.userTalkShare * 100) : null;
  const tutorShare = metrics ? Math.max(0, 100 - (userShare ?? 0)) : null;
  const newsDateLabel = formatNewsDate(conversation.news?.publishedAt);

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>Gespreksdetails</h2>
        <div style={styles.details}>
            <span><strong>Datum:</strong> {conversation.date}</span>
            <span><strong>Niveau:</strong> {conversation.level}</span>
            <span style={{textTransform: 'capitalize'}}><strong>Activiteit:</strong> {conversation.activity}</span>
            {goalLabel && <span><strong>Leerdoel:</strong> {goalLabel}</span>}
        </div>
      </div>
      {conversation.news && (
        <div style={styles.newsCard}>
          <h3 style={styles.newsTitle}>Nieuwscontext</h3>
          <p style={styles.newsHeadline}>
            {conversation.news.articleUrl ? (
              <a href={conversation.news.articleUrl} target="_blank" rel="noreferrer">
                {conversation.news.headline}
              </a>
            ) : (
              conversation.news.headline
            )}
          </p>
          <p style={styles.newsMeta}>
            Bron: {conversation.news.source}
            {newsDateLabel ? ` • ${newsDateLabel}` : ''}
          </p>
          {conversation.news.summary && <p style={styles.newsSummary}>{conversation.news.summary}</p>}
          <p style={styles.newsNote}>{conversation.news.sourceNote}</p>
        </div>
      )}
      {metrics && (
        <div style={styles.metricsCard}>
          <div style={styles.metricsRow}>
            <div style={styles.metricColumn}>
              <span style={styles.metricLabel}>Sessieduur</span>
              <span style={styles.metricValue}>{formatDuration(metrics.totalDurationMs)}</span>
            </div>
            <div style={styles.metricColumn}>
              <span style={styles.metricLabel}>Jij</span>
              <span style={styles.metricValue}>{userShare}%</span>
            </div>
            <div style={styles.metricColumn}>
              <span style={styles.metricLabel}>Tutor</span>
              <span style={styles.metricValue}>{tutorShare}%</span>
            </div>
          </div>
          {metrics.topicHistory && metrics.topicHistory.length > 0 && (
            <div style={styles.metricTags}>
              {metrics.topicHistory.map((topic) => (
                <span key={topic} style={styles.metricTag}>{topic}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {conversation.closingReflection && (
        <div style={styles.reflectionCard}>
          <h3 style={styles.reflectionTitle}>Afsluitende feedback</h3>
          <p style={styles.reflectionText}>{conversation.closingReflection}</p>
        </div>
      )}
      <ConversationView transcripts={conversation.transcripts} onWordSelect={onWordSelect} />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '1px solid var(--color-border)',
  },
  title: { margin: '0 0 10px 0' },
  details: {
    display: 'flex',
    gap: '12px 20px',
    opacity: 0.8,
    flexWrap: 'wrap',
  },
  metricsCard: {
    marginBottom: '20px',
    padding: '18px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-secondary-bg)',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metricsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  },
  metricColumn: {
    flex: '1 1 120px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metricLabel: {
    fontSize: '0.8em',
    opacity: 0.75,
  },
  metricValue: {
    fontSize: '1.2em',
    fontWeight: 600,
  },
  metricTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  metricTag: {
    borderRadius: '999px',
    padding: '6px 12px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: 'var(--color-primary-text)',
    fontSize: '0.75em',
    letterSpacing: '0.02em',
  },
  newsCard: {
    marginBottom: '20px',
    padding: '18px',
    borderRadius: '12px',
    backgroundColor: 'rgba(30, 64, 175, 0.25)',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  newsTitle: {
    margin: 0,
    fontSize: '1.05em',
  },
  newsHeadline: {
    margin: 0,
    fontSize: '0.95em',
    fontWeight: 600,
  },
  newsMeta: {
    margin: 0,
    fontSize: '0.85em',
    opacity: 0.75,
  },
  newsSummary: {
    margin: 0,
    lineHeight: 1.45,
  },
  newsNote: {
    margin: 0,
    fontSize: '0.85em',
    opacity: 0.8,
  },
  reflectionCard: {
    marginBottom: '20px',
    padding: '18px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-secondary)',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.2)',
  },
  reflectionTitle: {
    margin: '0 0 10px 0',
  },
  reflectionText: {
    margin: 0,
    lineHeight: 1.5,
  },
};

export default HistoryDetailView;