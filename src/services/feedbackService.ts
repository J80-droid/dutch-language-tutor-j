import type { ExerciseData, UserAnswers, FeedbackReport, QuestionFeedback } from '@/types/exercise';

/**
 * Genereer feedback rapport op basis van gebruikersantwoorden
 */
export function generateFeedback(
    exerciseData: ExerciseData,
    userAnswers: UserAnswers
): FeedbackReport {
    const questionFeedback: QuestionFeedback[] = [];
    let correctCount = 0;

    exerciseData.questions.forEach((question) => {
        const userAnswer = userAnswers[question.id];
        const correctAnswer = question.correctAnswer;

        let isCorrect = false;

        if (question.type === 'checkbox') {
            // Voor checkboxes: vergelijk arrays (order doesn't matter)
            const userArray = Array.isArray(userAnswer) ? userAnswer.sort() : [];
            const correctArray = Array.isArray(correctAnswer) ? correctAnswer.sort() : [];
            isCorrect = 
                userArray.length === correctArray.length &&
                userArray.every((val, idx) => val === correctArray[idx]);
        } else if (question.type === 'swipe-sort') {
            // Voor swipe-sort: vergelijk arrays van targets
            const userArray = Array.isArray(userAnswer) ? userAnswer : [];
            const correctArray = Array.isArray(correctAnswer) ? correctAnswer : [];
            if (question.swipeItems && userArray.length === correctArray.length) {
                isCorrect = question.swipeItems.every((item, idx) => {
                    const userTarget = userArray[idx];
                    const correctTarget = item.correctTarget || correctArray[idx];
                    return userTarget === correctTarget;
                });
            } else {
                isCorrect = false;
            }
        } else if (question.type === 'memory-match') {
            // Voor memory: check of alle paren correct gematcht zijn
            const userArray = Array.isArray(userAnswer) ? userAnswer : [];
            const correctArray = Array.isArray(correctAnswer) ? correctAnswer : [];
            isCorrect = userArray.length === correctArray.length &&
                userArray.every((val, idx) => val === correctArray[idx]);
        } else if (question.type === 'jigsaw') {
            // Voor jigsaw: vergelijk order arrays
            const userOrder = Array.isArray(userAnswer) 
                ? userAnswer.map(v => typeof v === 'string' ? parseInt(v, 10) : v).filter(v => !isNaN(v))
                : [];
            const correctOrder = question.jigsawCorrectOrder || [];
            isCorrect = userOrder.length === correctOrder.length &&
                userOrder.every((val, idx) => val === correctOrder[idx]);
        } else if (question.type === 'dictation') {
            // Voor dictation: fuzzy string matching (allow kleine verschillen)
            const userStr = typeof userAnswer === 'string' ? userAnswer.trim().toLowerCase() : '';
            const correctStr = typeof correctAnswer === 'string' 
                ? correctAnswer.trim().toLowerCase() 
                : String(correctAnswer).trim().toLowerCase();
            // Remove punctuation for comparison
            const userClean = userStr.replace(/[.,!?;:]/g, '');
            const correctClean = correctStr.replace(/[.,!?;:]/g, '');
            isCorrect = userClean === correctClean;
        } else if (question.type === 'word-math') {
            // Voor word-math: vergelijk samengestelde woorden
            const userStr = typeof userAnswer === 'string' ? userAnswer.trim().toLowerCase() : '';
            const correctStr = typeof correctAnswer === 'string' 
                ? correctAnswer.trim().toLowerCase() 
                : String(correctAnswer).trim().toLowerCase();
            // Split by | and compare each part
            const userParts = userStr.split('|').map(p => p.trim());
            const correctParts = correctStr.split('|').map(p => p.trim());
            isCorrect = userParts.length === correctParts.length &&
                userParts.every((val, idx) => val === correctParts[idx]);
        } else {
            // Voor fill, multiple-choice, transformation, image-description: string vergelijking (case-insensitive, trimmed)
            const userStr = typeof userAnswer === 'string' ? userAnswer.trim().toLowerCase() : '';
            const correctStr = typeof correctAnswer === 'string' 
                ? correctAnswer.trim().toLowerCase() 
                : String(correctAnswer).trim().toLowerCase();
            isCorrect = userStr === correctStr;
        }

        if (isCorrect) {
            correctCount++;
        }

        questionFeedback.push({
            questionId: question.id,
            isCorrect,
            userAnswer: userAnswer || (question.type === 'checkbox' ? [] : ''),
            correctAnswer,
            explanation: question.explanation || `Het correcte antwoord is: ${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}`,
        });
    });

    const totalQuestions = exerciseData.questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Genereer algemene feedback op basis van score
    let generalFeedback = '';
    const tips: string[] = [];

    if (score >= 90) {
        generalFeedback = 'Uitstekend werk! Je beheerst dit onderwerp goed.';
        tips.push('Probeer de oefening nog een keer om je kennis te versterken.');
    } else if (score >= 80) {
        generalFeedback = 'Goed gedaan! Je hebt een goed begrip van dit onderwerp.';
        tips.push('Bekijk de vragen die je fout had en probeer de uitleg te begrijpen.');
        tips.push('Oefen nog een keer om je score te verbeteren.');
    } else if (score >= 60) {
        generalFeedback = 'Niet slecht, maar er is nog ruimte voor verbetering.';
        tips.push('Lees de uitleg aandachtig door.');
        tips.push('Bekijk de correcte antwoorden en probeer te begrijpen waarom ze correct zijn.');
        tips.push('Oefen nog een keer om je kennis te versterken.');
    } else {
        generalFeedback = 'Dit onderwerp heeft nog wat extra aandacht nodig.';
        tips.push('Lees de uitleg sectie goed door voordat je opnieuw begint.');
        tips.push('Neem de tijd om de correcte antwoorden en uitleg te bestuderen.');
        tips.push('Probeer de oefening opnieuw wanneer je je zekerder voelt.');
    }

    return {
        score,
        totalQuestions,
        correctAnswers: correctCount,
        questionFeedback,
        generalFeedback,
        tips,
    };
}

