import { describe, expect, it, afterEach, vi } from 'vitest';

import { pickCulturePrompt, listCulturePrompts } from '../culturePrompts';

describe('culturePrompts dataset', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('selecteert een prompt voor het gevraagde niveau', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const selection = pickCulturePrompt('A1', 'fluency');

        expect(selection.prompt.levels).toContain('A1');
        expect(selection.prompt.miniTasks).toContain(selection.selectedMiniTask);
        expect(selection.goalAdaptation).toBeDefined();
    });

    it('zorgt ervoor dat alternatieve mini-opdrachten beschikbaar blijven', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.6);
        const selection = pickCulturePrompt('B1');

        expect(selection.selectedMiniTask).not.toBe('');
        expect(Array.isArray(selection.alternativeMiniTasks)).toBe(true);
        expect(selection.alternativeMiniTasks.every(task => task !== selection.selectedMiniTask)).toBe(true);
    });

    it('heeft altijd minstens één cultureel item beschikbaar', () => {
        expect(listCulturePrompts().length).toBeGreaterThan(0);
    });
});

