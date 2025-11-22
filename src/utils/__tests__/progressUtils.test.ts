import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { updateProgress, getProgress, calculateMasterySnapshot } from '../progressUtils';

describe('progressUtils mastery integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('updates mastery exposures based on activity outcomes', () => {
    const { progress } = updateProgress('B1', 'conversation');

    expect(progress.mastery?.B1?.skills.speakingProduction.exposure ?? 0).toBeGreaterThan(0);
    expect(progress.mastery?.A2?.skills.speakingInteraction.exposure ?? 0).toBeGreaterThan(0);
  });

  it('calculates mastery snapshot percentages', () => {
    updateProgress('B1', 'conversation');
    const progress = getProgress();

    const snapshot = calculateMasterySnapshot(progress);
    expect(snapshot.B1?.overall ?? 0).toBeGreaterThan(0);
    expect(snapshot.B1?.skills.speakingProduction ?? 0).toBeGreaterThan(0);
  });
});

