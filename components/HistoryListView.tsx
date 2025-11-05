import React from 'react';
import { SavedConversation } from '../types';
import { TrashIcon } from './Icons';

interface Props {
  history: SavedConversation[];
  onSelectConversation: (conversation: SavedConversation) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

const HistoryListView: React.FC<Props> = ({ history, onSelectConversation, onDeleteItem, onClearAll }) => {

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>Gespreksgeschiedenis</h2>
        {history.length > 0 && (
          <button onClick={onClearAll} style={styles.clearAllButton}>
            <TrashIcon /> Alles Wissen
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <p>Nog geen opgeslagen gesprekken.</p>
      ) : (
        <ul style={styles.list}>
          {history.map((conv) => (
            <li key={conv.id} style={styles.listItem}>
              <div onClick={() => onSelectConversation(conv)} style={styles.itemContent}>
                <div style={styles.itemHeader}>
                  <span style={styles.itemDate}>{conv.date}</span>
                  <span style={styles.itemLevel}>{conv.level}</span>
                </div>
                <div style={styles.itemActivity}>{conv.activity}</div>
              </div>
              <button onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(conv.id);
                }} 
                style={styles.deleteButton} 
                title="Verwijder gesprek"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
  },
  clearAllButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#4a0404',
    border: '1px solid #dc2626',
    color: '#fca5a5',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '0.9em',
    fontWeight: 'bold',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--color-secondary-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '15px',
    transition: 'background-color 0.2s',
  },
  itemContent: {
    flexGrow: 1,
    cursor: 'pointer',
    marginRight: '10px',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
  },
  itemDate: {
    fontSize: '0.9em',
    opacity: 0.8,
  },
  itemLevel: {
    fontWeight: 'bold',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-primary-text)',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.8em',
  },
  itemActivity: {
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
};

export default HistoryListView;