import React from 'react';
import { ActivityMode, ACTIVITY_CATEGORIES } from '../types';

interface Props {
  selectedMode: ActivityMode;
  onSelectMode: (mode: ActivityMode) => void;
}

const ActivitySelector: React.FC<Props> = ({ selectedMode, onSelectMode }) => {
  return (
    <div style={styles.container}>
      <h3 style={styles.mainLabel}>Activiteit</h3>
      {ACTIVITY_CATEGORIES.map((category) => (
        <div key={category.categoryName} style={styles.category}>
          <h4 style={styles.categoryName}>{category.categoryName}</h4>
          <div style={styles.buttonsContainer}>
            {category.activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => onSelectMode(activity.id)}
                style={{
                  ...styles.button,
                  ...(selectedMode === activity.id ? styles.selectedButton : {}),
                }}
              >
                <span style={styles.activityName}>{activity.name}</span>
                <span style={styles.activityDescription}>{activity.description}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%'
  },
  mainLabel: { 
      margin: '0 0 10px 0', 
      fontSize: '1em', 
      textAlign: 'left' 
  },
  category: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  categoryName: {
    margin: 0,
    paddingBottom: '5px',
    borderBottom: '1px solid var(--color-border)',
    textAlign: 'left',
    fontSize: '0.9em',
    color: 'var(--color-primary)'
  },
  buttonsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  button: {
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 15px',
    fontSize: '1em',
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-secondary)',
    color: 'var(--color-text)',
    textAlign: 'left',
    width: '100%',
  },
  selectedButton: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-primary-text)',
    borderColor: 'var(--color-primary)',
  },
  activityName: {
    fontWeight: 'bold',
  },
  activityDescription: {
    fontSize: '0.9em',
    opacity: 0.8,
    marginTop: '4px',
  },
};

export default ActivitySelector;
