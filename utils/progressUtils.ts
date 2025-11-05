
import { ProgressData, CEFRLevel, ActivityMode } from '../types';

const PROGRESS_KEY = 'userProgress';

export const getProgress = (): ProgressData => {
  try {
    const progressJson = localStorage.getItem(PROGRESS_KEY);
    return progressJson ? JSON.parse(progressJson) : {};
  } catch (error) {
    console.error('Failed to parse user progress:', error);
    return {};
  }
};

export const updateProgress = (level: CEFRLevel, mode: ActivityMode): ProgressData => {
  const progress = getProgress();
  
  if (!progress.stats) {
    progress.stats = {};
  }
  if (!progress.stats[level]) {
    progress.stats[level] = {};
  }
  if (!progress.stats[level]![mode]) {
    progress.stats[level]![mode] = 0;
  }
  progress.stats[level]![mode]! += 1;

  // Streak logic
  const today = new Date().toISOString().split('T')[0];
  if (progress.lastSessionDate) {
      const lastDate = new Date(progress.lastSessionDate);
      const todayDate = new Date(today);
      const diffTime = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
          progress.currentStreak = (progress.currentStreak || 0) + 1;
      } else if (diffDays > 1) {
          progress.currentStreak = 1;
      }
  } else {
      progress.currentStreak = 1;
  }
  progress.lastSessionDate = today;
  progress.longestStreak = Math.max(progress.longestStreak || 0, progress.currentStreak || 0);

  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  return progress;
};
