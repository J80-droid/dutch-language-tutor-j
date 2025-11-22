/**
 * Spaced Repetition System (SRS) implementatie
 * Gebaseerd op SM-2 algoritme variant
 */

export interface SRSItem {
    id: string;
    word: string;
    translation?: string;
    example?: string;
    easeFactor: number; // Start bij 2.5
    interval: number; // Dagen tot volgende review
    repetitionCount: number; // Aantal keer correct beantwoord
    nextReviewDate: number; // Timestamp
    lastReviewDate?: number; // Timestamp
    createdAt: number; // Timestamp
}

export interface SRSReviewResult {
    item: SRSItem;
    quality: number; // 0-5 (0=vergeten, 5=perfect)
    newInterval: number;
    newEaseFactor: number;
    newRepetitionCount: number;
}

const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

/**
 * Update SRS item na review
 */
export function updateSRSItem(item: SRSItem, quality: number): SRSReviewResult {
    // Quality: 0=vergeten, 1=heel moeilijk, 2=moeilijk, 3=goed, 4=gemakkelijk, 5=perfect
    
    let newEaseFactor = item.easeFactor;
    let newRepetitionCount = item.repetitionCount;
    let newInterval = item.interval;

    if (quality < 3) {
        // Vergeten of moeilijk - reset
        newRepetitionCount = 0;
        newInterval = 1;
        newEaseFactor = Math.max(MIN_EASE_FACTOR, item.easeFactor - 0.2);
    } else {
        // Correct beantwoord
        newRepetitionCount = item.repetitionCount + 1;
        
        // Bereken nieuwe ease factor
        newEaseFactor = item.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);
        
        // Bereken nieuwe interval
        if (newRepetitionCount === 1) {
            newInterval = 1;
        } else if (newRepetitionCount === 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(item.interval * newEaseFactor);
        }
    }

    const now = Date.now();
    const updatedItem: SRSItem = {
        ...item,
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitionCount: newRepetitionCount,
        nextReviewDate: now + (newInterval * 24 * 60 * 60 * 1000),
        lastReviewDate: now,
    };

    return {
        item: updatedItem,
        quality,
        newInterval,
        newEaseFactor,
        newRepetitionCount,
    };
}

/**
 * Maak nieuw SRS item
 */
export function createSRSItem(word: string, translation?: string, example?: string): SRSItem {
    const now = Date.now();
    return {
        id: `srs-${now}-${Math.random().toString(36).substring(2, 9)}`,
        word,
        translation,
        example,
        easeFactor: INITIAL_EASE_FACTOR,
        interval: 1,
        repetitionCount: 0,
        nextReviewDate: now,
        createdAt: now,
    };
}

/**
 * Haal items op die gereviewd moeten worden
 */
export function getItemsForReview(items: SRSItem[]): SRSItem[] {
    const now = Date.now();
    return items
        .filter(item => item.nextReviewDate <= now)
        .sort((a, b) => a.nextReviewDate - b.nextReviewDate);
}

/**
 * Sla SRS items op in localStorage
 */
export function saveSRSItems(items: SRSItem[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem('srs_items', JSON.stringify(items));
    } catch (error) {
        console.error('Failed to save SRS items:', error);
    }
}

/**
 * Laad SRS items uit localStorage
 */
export function loadSRSItems(): SRSItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem('srs_items');
        if (!stored) return [];
        return JSON.parse(stored) as SRSItem[];
    } catch (error) {
        console.error('Failed to load SRS items:', error);
        return [];
    }
}

