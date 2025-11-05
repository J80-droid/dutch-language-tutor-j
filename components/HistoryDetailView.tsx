

import React from 'react';
import { SavedConversation } from '../types';
import ConversationView from './ConversationView';

interface Props {
  conversation: SavedConversation;
  onWordSelect?: (word: string) => void;
}

const HistoryDetailView: React.FC<Props> = ({ conversation, onWordSelect }) => {
  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>Gespreksdetails</h2>
        <div style={styles.details}>
            <span><strong>Datum:</strong> {conversation.date}</span>
            <span><strong>Niveau:</strong> {conversation.level}</span>
            <span style={{textTransform: 'capitalize'}}><strong>Activiteit:</strong> {conversation.activity}</span>
        </div>
      </div>
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
  details: { display: 'flex', gap: '20px', opacity: 0.8 },
};

export default HistoryDetailView;