import type { ExerciseData, ExerciseQuestion, QuestionType } from '@/types/exercise';
import { GoogleGenAI, Type } from '@google/genai';
import { logEvent } from '@/utils/logger';

const API_KEY = import.meta.env.VITE_API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Cache voor geëxtraheerde antwoorden
type AnswerCacheEntry = {
    answer: string | string[];
    explanation?: string;
    expiresAt: number;
};

const answerCache = new Map<string, AnswerCacheEntry>();
const ANSWER_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
let geminiCallCount = 0; // Rate limiting: max 1 call per parsing sessie
const MAX_GEMINI_CALLS_PER_SESSION = 1;

/**
 * Extraheer antwoord via Gemini wanneer parsing faalt
 */
async function extractAnswerWithGemini(
    question: Partial<ExerciseQuestion>,
    fullText: string
): Promise<{ answer: string | string[]; explanation?: string } | null> {
    if (!ai) {
        return null;
    }

    // Maak cache key op basis van vraag tekst
    const questionText = question.questionText || '';
    const cacheKey = `${questionText.substring(0, 100)}:${question.type}`;

    // Check cache
    const cached = answerCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        logEvent('exercise_parser', 'Answer served from cache', {
            data: { questionId: question.id },
        });
        return {
            answer: cached.answer,
            explanation: cached.explanation,
        };
    }

    try {
        const prompt = [
            'Je bent een ervaren Nederlandse taaldocent die oefeningen analyseert.',
            'Je krijgt een vraag uit een Nederlandse taaloefening en de volledige oefeningstekst.',
            'Je taak is om het correcte antwoord te bepalen op basis van de vraag en context.',
            '',
            `Vraag: ${questionText}`,
            `Type: ${question.type}`,
            question.options && question.options.length > 0
                ? `Opties: ${question.options.join(', ')}`
                : '',
            '',
            'Volledige oefeningstekst:',
            fullText.substring(0, 3000), // Limiteer lengte
            '',
            'Bepaal het correcte antwoord op basis van:',
            '- De vraag zelf',
            '- De context uit de oefeningstekst',
            '- De opties (als beschikbaar)',
            '- Nederlandse grammatica en woordenschat regels',
            '',
            'Geef het antwoord terug als JSON.',
        ].filter(Boolean).join('\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        answer: {
                            type: Type.STRING,
                            description: 'Correct antwoord (string voor single, comma-separated voor multiple)',
                        },
                        answerArray: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            nullable: true,
                            description: 'Voor multiple choice met meerdere correcte antwoorden',
                        },
                        explanation: {
                            type: Type.STRING,
                            nullable: true,
                        },
                    },
                    required: ['answer'],
                },
                temperature: 0.3,
            },
        });

        const rawText = response.text ?? '';
        const payload = JSON.parse(rawText) as {
            answer?: string;
            answerArray?: string[];
            explanation?: string;
        };

        if (!payload.answer && !payload.answerArray) {
            return null;
        }

        // Bepaal antwoord (array heeft voorrang als beide aanwezig zijn)
        const answer: string | string[] = payload.answerArray && payload.answerArray.length > 0
            ? payload.answerArray
            : (payload.answer || '');
        const explanation = payload.explanation;

        // Cache resultaten
        const expiresAt = Date.now() + ANSWER_CACHE_TTL_MS;
        answerCache.set(cacheKey, {
            answer,
            explanation,
            expiresAt,
        });

        logEvent('exercise_parser', 'Answer extracted via Gemini', {
            data: { questionId: question.id },
        });

        return { answer, explanation };
    } catch (error) {
        logEvent('exercise_parser', 'Gemini answer extraction error', {
            level: 'warn',
            data: {
                questionId: question.id,
                error: error instanceof Error ? error.message : String(error),
            },
        });
        return null;
    }
}

/**
 * Parse markdown tekst naar gestructureerde oefening data
 */
export async function parseExerciseText(text: string): Promise<ExerciseData | null> {
    // Reset Gemini call count voor nieuwe parsing sessie
    geminiCallCount = 0;
    try {
        const lines = text.split('\n').map(line => line.trim());

        // Extract introductie (alles tot eerste vraag)
        let introEndIndex = lines.findIndex(line =>
            line.match(/^(\*\*)?(Vraag|Opdracht)\s*\d+[:.]/i) ||
            line.match(/^\d+\./)
        );

        if (introEndIndex === -1) {
            // Fallback: zoek naar eerste nummering
            introEndIndex = lines.findIndex(line => line.match(/^\d+\./));
        }

        const introduction = introEndIndex > 0
            ? lines.slice(0, introEndIndex).filter(l => l && !l.startsWith('**Inleiding**')).join('\n').trim()
            : '';

        // Extract vragen
        const questions: ExerciseQuestion[] = [];
        let currentQuestion: Partial<ExerciseQuestion> | null = null;
        let questionNumber = 0;
        let inAnswersSection = false;
        let inExplanationSection = false;
        const answersMap: Map<number, { answer: string | string[]; explanation?: string }> = new Map();
        let explanation = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detecteer "Controleer je antwoorden" sectie
            if (line.match(/^\*\*Controleer\s+je\s+antwoorden\*\*/i) ||
                line.match(/^Controleer\s+je\s+antwoorden/i)) {
                inAnswersSection = true;
                inExplanationSection = false;
                continue;
            }

            // Detecteer "Uitleg" sectie
            if (line.match(/^\*\*Uitleg\*\*/i) || line.match(/^Uitleg[:.]/i)) {
                inAnswersSection = false;
                inExplanationSection = true;
                // Skip de header regel zelf
                continue;
            }

            if (inExplanationSection) {
                // Stop alleen bij nieuwe sectie (Reflectie, Conclusie, Einde), niet bij lege regels
                if (line.match(/^\*\*(Reflectie|Conclusie|Einde|Samenvatting)/i)) {
                    inExplanationSection = false;
                    continue;
                }
                // Voeg alle tekst toe die niet een nieuwe sectie header is
                if (line && !line.match(/^\*\*/)) {
                    explanation += (explanation ? '\n' : '') + line;
                } else if (line.match(/^\*\*/) && !line.match(/^\*\*Uitleg\*\*/i)) {
                    // Nieuwe sectie gevonden, stop met uitleg
                    inExplanationSection = false;
                }
                continue;
            }

            // Parse antwoorden sectie
            if (inAnswersSection) {
                const answerMatch = line.match(/^(\d+)\.\s*(.+)/);
                if (answerMatch) {
                    const qNum = parseInt(answerMatch[1], 10);
                    const answerText = answerMatch[2].trim();

                    let answer: string | string[] = '';
                    let expl: string | undefined = undefined;

                    // Probeer verschillende formaten:
                    // 1. Format met [ ]: "1. [naar]" of "1. Ik ga [naar] naar de winkel."
                    const bracketMatch = answerText.match(/\[([^\]]+)\]/);
                    if (bracketMatch) {
                        const bracketAnswer = bracketMatch[1].trim();
                        answer = bracketAnswer.includes(',')
                            ? bracketAnswer.split(',').map(a => a.trim())
                            : bracketAnswer;
                    }
                    // 2. Format met "Optie A: tekst" of "A: tekst"
                    else {
                        const optionMatch = answerText.match(/(?:Optie\s+)?([A-Z]):\s*(.+)/i);
                        if (optionMatch) {
                            answer = optionMatch[2].trim();
                        }
                        // 3. Format: alleen de tekst (alles na het nummer, maar skip "Uitleg:" aan het begin)
                        else {
                            // Als de regel begint met "Uitleg:", skip deze regel en zoek verder
                            if (answerText.match(/^Uitleg[:.]/i)) {
                                // Skip deze regel, uitleg wordt hieronder opgehaald
                            } else {
                                // Neem alles na het nummer als antwoord (maar stop bij "Uitleg:")
                                const beforeUitleg = answerText.split(/Uitleg[:.]/i)[0].trim();
                                if (beforeUitleg) {
                                    answer = beforeUitleg;
                                } else {
                                    // Als er alleen "Uitleg:" is, gebruik de volledige tekst als fallback
                                    answer = answerText;
                                }
                            }
                        }
                    }

                    // Zoek uitleg (verbeterde versie die meerdere formaten ondersteunt)
                    const explanationMatch = answerText.match(/Uitleg[:.]\s*(.+)/i);
                    if (explanationMatch) {
                        expl = explanationMatch[1].trim();
                    } else {
                        // Zoek op volgende regels (max 6 regels voor betere coverage)
                        for (let j = i + 1; j < Math.min(i + 7, lines.length); j++) {
                            const nextLine = lines[j];
                            if (nextLine && nextLine.match(/^Uitleg[:.]/i)) {
                                expl = nextLine.replace(/^Uitleg[:.]\s*/i, '').trim();
                                // Voeg volgende regels toe tot we een nieuwe vraag of sectie tegenkomen
                                for (let k = j + 1; k < Math.min(j + 4, lines.length); k++) {
                                    if (lines[k] && !lines[k].match(/^\d+\./) && !lines[k].match(/^\*\*/) && lines[k].trim()) {
                                        expl += ' ' + lines[k].trim();
                                    } else {
                                        break;
                                    }
                                }
                                break;
                            } else if (nextLine && (nextLine.match(/^\d+\./) || (nextLine.match(/^\*\*/) && !nextLine.match(/^\*\*Uitleg\*\*/i)))) {
                                // Stop als we een nieuwe vraag of sectie tegenkomen
                                break;
                            } else if (nextLine && nextLine.trim() && !nextLine.match(/^Uitleg/i) && !nextLine.match(/^\d+\./)) {
                                // Als de volgende regel tekst bevat maar geen nieuwe vraag is, kan het uitleg zijn
                                if (!expl) {
                                    expl = nextLine.trim();
                                } else {
                                    expl += ' ' + nextLine.trim();
                                }
                            }
                        }
                    }

                    // Fallback voor uitleg
                    if (!expl) {
                        expl = `Het correcte antwoord is: ${Array.isArray(answer) ? answer.join(', ') : answer}`;
                    }

                    // Zorg dat we altijd een antwoord hebben (als we geen antwoord hebben gevonden, gebruik de volledige tekst)
                    if (!answer || (typeof answer === 'string' && answer.trim() === '') || (Array.isArray(answer) && answer.length === 0)) {
                        // Probeer nog een keer te extraheren zonder "Uitleg:" deel
                        const cleanText = answerText.replace(/Uitleg[:.]\s*.+$/i, '').trim();
                        if (cleanText && cleanText.length > 0) {
                            answer = cleanText;
                        } else {
                            // Laatste fallback: gebruik de volledige tekst (maar skip "Uitleg:" aan het begin)
                            const withoutUitleg = answerText.replace(/^Uitleg[:.]\s*/i, '').trim();
                            if (withoutUitleg && withoutUitleg.length > 0) {
                                answer = withoutUitleg;
                            } else {
                                // Als alles faalt, gebruik een placeholder die aangeeft dat het antwoord niet gevonden kon worden
                                answer = '[Antwoord niet gevonden in gegenereerde tekst]';
                            }
                        }
                    }

                    // Sla het antwoord ALTIJD op, zelfs als het leeg is (dan kunnen we later een betere fallback gebruiken)
                    answersMap.set(qNum, {
                        answer: Array.isArray(answer) ? answer : answer.trim(),
                        explanation: expl
                    });
                }
                continue;
            }

            // Detecteer nieuwe vraag
            const questionMatch = line.match(/^(\*\*)?(Vraag|Opdracht)\s*(\d+)[:.]/i) ||
                line.match(/^(\d+)\./);

            if (questionMatch) {
                // Sla vorige vraag op als die bestaat
                if (currentQuestion && currentQuestion.id) {
                    // Zorg dat de vraagtekst niet leeg is voordat we opslaan
                    if (!currentQuestion.questionText || currentQuestion.questionText.trim() === '') {
                        currentQuestion.questionText = `Vraag ${questionNumber}`;
                    }

                    // Als er opties zijn, zorg dat het type correct is
                    if (currentQuestion.options && currentQuestion.options.length > 0) {
                        // Als type nog niet is ingesteld op een specifiek type, gebruik multiple-choice
                        const specificTypes: QuestionType[] = ['swipe-sort', 'memory-match', 'jigsaw', 'dictation', 'image-description', 'transformation', 'word-math'];
                        if (!specificTypes.includes(currentQuestion.type as QuestionType)) {
                            currentQuestion.type = 'multiple-choice';
                        }
                    } else {
                        // Als er geen opties zijn en type is 'multiple-choice', verander naar 'fill' (tenzij specifiek type gedetecteerd)
                        const specificTypes: QuestionType[] = ['swipe-sort', 'memory-match', 'jigsaw', 'dictation', 'image-description', 'transformation', 'word-math'];
                        // Alleen verander naar 'fill' als het geen specifiek type is
                        if (currentQuestion.type === 'multiple-choice' && !specificTypes.includes(currentQuestion.type as QuestionType)) {
                            currentQuestion.type = 'fill';
                        }
                    }

                    questions.push(currentQuestion as ExerciseQuestion);
                }

                questionNumber = parseInt(questionMatch[questionMatch.length - 1] || questionMatch[1], 10);
                currentQuestion = {
                    id: `q${questionNumber}`,
                    type: 'multiple-choice' as QuestionType, // Default naar multiple-choice, wordt later aangepast indien nodig
                    questionText: '', // Start leeg, wordt gevuld met volgende regels
                    correctAnswer: '',
                    options: [], // Start met lege opties array
                };
                // Skip de vraag header regel zelf, maar voeg de rest toe
                continue;
            }

            // Voeg tekst toe aan huidige vraag
            if (currentQuestion && line) {
                const questionTextLower = (currentQuestion.questionText + ' ' + line).toLowerCase();

                // Detecteer vraag type op basis van keywords en formaten

                // EERST: Check op slash-gescheiden opties in de vraagtekst (bijv. "auto/auto/auto's" of "mooi/mooie")
                // Dit moet multiple-choice worden, niet fill-in-the-blank
                // Patronen: "auto/auto/auto's", "[ ] auto/auto/auto's", "mooi/mooie", etc.
                const slashPattern = /(?:\[([^\]]*)\]\s*)?([\w\s'-]+)\/([\w\s'-]+)(?:\/([\w\s'-]+))?(?:\/([\w\s'-]+))?/;
                const slashMatch = line.match(slashPattern);

                if (slashMatch && !currentQuestion.options) {
                    // Extract opties uit slash-gescheiden format
                    const options: string[] = [];
                    // Start vanaf index 2 (na de bracket match en eerste woord)
                    for (let i = 2; i < slashMatch.length; i++) {
                        if (slashMatch[i] && slashMatch[i].trim() && slashMatch[i].trim().length > 0) {
                            const opt = slashMatch[i].trim();
                            // Filter out common words that shouldn't be options
                            if (!['de', 'het', 'een', 'het', 'in', 'op', 'bij', 'naar'].includes(opt.toLowerCase())) {
                                options.push(opt);
                            }
                        }
                    }

                    // Verwijder duplicaten en filter lege opties
                    const uniqueOptions = [...new Set(options)].filter(opt => opt.length > 0);

                    // Alleen als we 2-5 unieke opties hebben (niet te veel, niet te weinig)
                    if (uniqueOptions.length >= 2 && uniqueOptions.length <= 5) {
                        currentQuestion.options = uniqueOptions;
                        currentQuestion.type = 'multiple-choice';

                        // Verwijder de slash-optie tekst uit questionText en vervang door instructie
                        // Behoud de rest van de vraagtekst
                        const beforeSlash = line.substring(0, slashMatch.index || 0);
                        const afterSlash = line.substring((slashMatch.index || 0) + slashMatch[0].length);
                        const cleanLine = (beforeSlash.trim() + ' Kies het juiste antwoord:' + (afterSlash ? ' ' + afterSlash.trim() : '')).trim();

                        if (!currentQuestion.questionText || currentQuestion.questionText.trim() === '') {
                            currentQuestion.questionText = cleanLine;
                        } else {
                            currentQuestion.questionText += ' ' + cleanLine;
                        }
                        continue; // Skip verdere verwerking van deze regel
                    }
                }

                if (line.includes('[_____]')) {
                    currentQuestion.type = 'fill';

                    // Bepaal type: als er meerdere opties zijn en instructie zegt "Selecteer alle", dan checkbox
                    if (questionTextLower.includes('selecteer alle') ||
                        questionTextLower.includes('meerdere')) {
                        currentQuestion.type = 'checkbox';
                    } else {
                        currentQuestion.type = 'multiple-choice';
                    }
                    // Voeg de optie NIET toe aan questionText, alleen de optie zelf
                } else if (questionTextLower.includes('swipe') || questionTextLower.includes('sorteer') ||
                    (questionTextLower.includes('de/het') && questionTextLower.includes('sorteer'))) {
                    // Swipe-sort voor de/het - overschrijf type als dit een swipe oefening is
                    currentQuestion.type = 'swipe-sort';
                    currentQuestion.swipeTargets = ['de', 'het'];
                    // Probeer woorden te extraheren uit de tekst
                    const words = line.match(/\b\w+\b/g) || [];
                    if (words.length > 0 && !currentQuestion.swipeItems) {
                        currentQuestion.swipeItems = words.slice(0, 10).map(word => ({
                            word,
                            correctTarget: '', // Wordt later ingevuld vanuit antwoorden
                        }));
                    }
                    currentQuestion.questionText += (currentQuestion.questionText ? ' ' : '') + line;
                } else if ((questionTextLower.includes('memory') || questionTextLower.includes('match')) &&
                    !questionTextLower.includes('multiple choice') && !questionTextLower.includes('kies')) {
                    // Memory match - overschrijf type als dit een memory oefening is
                    currentQuestion.type = 'memory-match';
                    currentQuestion.questionText += (currentQuestion.questionText ? ' ' : '') + line;
                    // Memory pairs worden later geparsed uit antwoorden sectie
                } else if ((questionTextLower.includes('jigsaw') || questionTextLower.includes('puzzel') ||
                    questionTextLower.includes('zet in volgorde') || questionTextLower.includes('volgorde') ||
                    questionTextLower.includes('slepen')) &&
                    !questionTextLower.includes('multiple choice') && !questionTextLower.includes('kies')) {
                    // Jigsaw / sentence builder - overschrijf type als dit een jigsaw oefening is
                    currentQuestion.type = 'jigsaw';

                    // Extract woorden/zinsdelen - zoek naar patroon "Zet in volgorde: woord1, woord2, ..."
                    let pieces: string[] = [];

                    // Probeer eerst te vinden na een dubbele punt
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > -1) {
                        const piecesText = line.substring(colonIndex + 1).trim();
                        pieces = piecesText.split(',').map(p => p.trim()).filter(p => p.length > 0);
                    } else {
                        // Fallback: split op komma's
                        pieces = line.split(',').map(p => p.trim()).filter(p => p.length > 0);
                    }

                    // Als we nog geen pieces hebben, probeer uit de volledige vraag tekst
                    if (pieces.length === 0 && currentQuestion.questionText) {
                        const fullText = (currentQuestion.questionText + ' ' + line).toLowerCase();
                        const colonMatch = fullText.match(/[:]\s*([^:]+)/);
                        if (colonMatch) {
                            pieces = colonMatch[1].split(',').map(p => p.trim()).filter(p => p.length > 0);
                        }
                    }

                    if (pieces.length > 0 && !currentQuestion.jigsawPieces) {
                        currentQuestion.jigsawPieces = pieces;
                        currentQuestion.jigsawCorrectOrder = Array.from({ length: pieces.length }, (_, i) => i);
                    }

                    currentQuestion.questionText += (currentQuestion.questionText ? ' ' : '') + line;
                } else if ((questionTextLower.includes('dictee') || questionTextLower.includes('luister') ||
                    questionTextLower.includes('typ wat je hoort')) &&
                    !questionTextLower.includes('multiple choice') && !questionTextLower.includes('kies')) {
                    // Dictation - overschrijf type als dit een dictee oefening is
                    currentQuestion.type = 'dictation';
                    currentQuestion.questionText += (currentQuestion.questionText ? ' ' : '') + line;
                } else if ((line.match(/https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i) ||
                    (questionTextLower.includes('afbeelding') || questionTextLower.includes('beeld'))) &&
                    !questionTextLower.includes('multiple choice') && !questionTextLower.includes('kies')) {
                    // Image description - alleen als het geen multiple choice is
                    currentQuestion.type = 'image-description';
                    const imageMatch = line.match(/(https?:\/\/.+\.(jpg|jpeg|png|gif|webp))/i);
                    if (imageMatch) {
                        currentQuestion.imageUrl = imageMatch[1];
                    }
                    currentQuestion.questionText += (currentQuestion.questionText ? ' ' : '') + line;
                } else if ((questionTextLower.includes('herschrijf') || questionTextLower.includes('transformeer') ||
                    questionTextLower.includes('perfectum') || questionTextLower.includes('imperfectum')) &&
                    !questionTextLower.includes('multiple choice') && !questionTextLower.includes('kies')) {
                    // Transformation - alleen als het geen multiple choice is
                    currentQuestion.type = 'transformation';
                    if (questionTextLower.includes('perfectum')) {
                        currentQuestion.targetTense = 'perfectum';
                    } else if (questionTextLower.includes('imperfectum')) {
                        currentQuestion.targetTense = 'imperfectum';
                    }
                    currentQuestion.questionText += (currentQuestion.questionText ? ' ' : '') + line;
                } else if ((questionTextLower.includes('samenstelling') || questionTextLower.includes('combineer') ||
                    questionTextLower.includes('word math') || (line.includes('+') && line.includes('='))) &&
                    !questionTextLower.includes('multiple choice') && !questionTextLower.includes('kies')) {
                    // Word math / compound words - alleen als het geen multiple choice is
                    currentQuestion.type = 'word-math';
                    const mathMatch = line.match(/(\w+)\s*\+\s*(\w+)\s*=\s*(\w+)/i);
                    if (mathMatch && !currentQuestion.wordMathParts) {
                        currentQuestion.wordMathParts = [{
                            part1: mathMatch[1],
                            part2: mathMatch[2],
                            result: mathMatch[3],
                        }];
                    }
                    currentQuestion.questionText += (currentQuestion.questionText ? ' ' : '') + line;
                } else if (!line.startsWith('**') && !line.match(/^-\s*\[\s*\]/)) {
                    // Gewone tekst voor vraag - voeg ALTIJD toe als het niet een optie of header is
                    // Dit omvat instructies zoals "Kies het juiste antwoord:" of "Selecteer alle juiste antwoorden:"
                    const trimmedLine = line.trim();

                    // Check of deze regel opties bevat in de tekst zelf (bijv. "Optie A: vlees Optie B: vlees Optie C: vlees")
                    // Dit gebeurt wanneer de LLM opties in één regel zet in plaats van aparte regels
                    if (trimmedLine && !currentQuestion.options) {
                        const optionPattern = /(?:Optie\s+)?([A-Z]):\s*([^A-Z]+?)(?=(?:Optie\s+)?[A-Z]:|$)/gi;
                        const optionMatches = Array.from(trimmedLine.matchAll(optionPattern));

                        if (optionMatches.length >= 2) {
                            // Extract opties uit de tekst
                            const extractedOptions: string[] = [];
                            optionMatches.forEach(match => {
                                if (match[2]) {
                                    const optText = match[2].trim().replace(/[,-]$/, '').trim();
                                    if (optText && optText.length > 0) {
                                        extractedOptions.push(optText);
                                    }
                                }
                            });

                            if (extractedOptions.length >= 2 && extractedOptions.length <= 5) {
                                currentQuestion.options = extractedOptions;
                                currentQuestion.type = 'multiple-choice';

                                // Verwijder de opties uit de vraagtekst en vervang door instructie
                                const beforeOptions = trimmedLine.substring(0, optionMatches[0].index || 0).trim();
                                const instruction = beforeOptions || 'Kies het juiste antwoord:';

                                if (!currentQuestion.questionText || currentQuestion.questionText.trim() === '') {
                                    currentQuestion.questionText = instruction;
                                } else if (!currentQuestion.questionText.includes(instruction)) {
                                    currentQuestion.questionText += ' ' + instruction;
                                }
                                continue; // Skip verdere verwerking van deze regel
                            }
                        }
                    }

                    // Clean up bullet points (e.g. "- Word" -> "Word")
                    // FIX: Removed unnecessary escape character before hyphen
                    const cleanLine = line.replace(/^[-•*]\s*/, '').trim();

                    if (cleanLine) {
                        // Als questionText leeg is, voeg altijd toe
                        if (!currentQuestion.questionText || currentQuestion.questionText.trim() === '') {
                            currentQuestion.questionText = cleanLine;
                        }
                        // Voeg toe als het niet al voorkomt (voorkom duplicaten)
                        else if (!currentQuestion.questionText.includes(cleanLine)) {
                            currentQuestion.questionText += ' ' + cleanLine;
                        }
                        // Als het al voorkomt maar questionText is kort, voeg het toch toe (mogelijk een andere formulering)
                        else if (currentQuestion.questionText.length < 50) {
                            currentQuestion.questionText += ' ' + cleanLine;
                        }
                    }
                }
            }
        }

        // Sla laatste vraag op
        if (currentQuestion && currentQuestion.id) {
            // Zorg dat de vraagtekst niet leeg is
            if (!currentQuestion.questionText || currentQuestion.questionText.trim() === '') {
                currentQuestion.questionText = `Vraag ${questionNumber}`;
            }

            // Laatste check: als er opties in de vraagtekst staan maar niet geparsed zijn, probeer ze nu te extraheren
            if (!currentQuestion.options || currentQuestion.options.length === 0) {
                const fullQuestionText = currentQuestion.questionText;
                const optionPattern = /(?:Optie\s+)?([A-Z]):\s*([^A-Z]+?)(?=(?:Optie\s+)?[A-Z]:|$)/gi;
                const optionMatches = Array.from(fullQuestionText.matchAll(optionPattern));

                if (optionMatches.length >= 2) {
                    const extractedOptions: string[] = [];
                    optionMatches.forEach(match => {
                        if (match[2]) {
                            const optText = match[2].trim().replace(/[,-]$/, '').trim();
                            if (optText && optText.length > 0 && optText.length < 100) { // Filter te lange teksten
                                extractedOptions.push(optText);
                            }
                        }
                    });

                    if (extractedOptions.length >= 2 && extractedOptions.length <= 5) {
                        currentQuestion.options = extractedOptions;
                        currentQuestion.type = 'multiple-choice';

                        // Verwijder opties uit questionText
                        const beforeFirstOption = fullQuestionText.substring(0, optionMatches[0].index || 0).trim();
                        currentQuestion.questionText = beforeFirstOption || 'Kies het juiste antwoord:';
                    }
                }
            }

            // Als er opties zijn, zorg dat het type correct is
            if (currentQuestion.options && currentQuestion.options.length > 0) {
                // Als type nog niet is ingesteld op een specifiek type, gebruik multiple-choice
                const specificTypes: QuestionType[] = ['swipe-sort', 'memory-match', 'jigsaw', 'dictation', 'image-description', 'transformation', 'word-math'];
                if (!specificTypes.includes(currentQuestion.type as QuestionType)) {
                    currentQuestion.type = 'multiple-choice';
                }
            } else {
                // Als er geen opties zijn en type is 'multiple-choice', verander naar 'fill' (tenzij specifiek type gedetecteerd)
                const specificTypes: QuestionType[] = ['swipe-sort', 'memory-match', 'jigsaw', 'dictation', 'image-description', 'transformation', 'word-math'];
                // Alleen verander naar 'fill' als het geen specifiek type is
                if (currentQuestion.type === 'multiple-choice' && !specificTypes.includes(currentQuestion.type as QuestionType)) {
                    currentQuestion.type = 'fill';
                }
            }

            questions.push(currentQuestion as ExerciseQuestion);
        }

        // Debug: controleer hoeveel vragen gevonden zijn
        if (questions.length !== 10) {
            console.warn(`Gevonden ${questions.length} vragen, verwacht 10. Antwoorden map heeft ${answersMap.size} entries.`);
        }

        // Voeg correcte antwoorden toe aan vragen
        for (const [index, q] of questions.entries()) {
            const answerData = answersMap.get(index + 1);
            if (answerData && answerData.answer && answerData.answer !== '[Antwoord niet gevonden in gegenereerde tekst]') {
                q.correctAnswer = answerData.answer;
                // Zorg dat uitleg altijd wordt toegevoegd, met fallback
                q.explanation = answerData.explanation || `Het correcte antwoord is: ${Array.isArray(answerData.answer) ? answerData.answer.join(', ') : answerData.answer}`;
            } else {
                // Fallback als er geen antwoord data is - probeer te vinden via vraag nummer uit ID
                const qNumFromId = parseInt(q.id.replace('q', ''), 10);
                const answerDataById = answersMap.get(qNumFromId);
                if (answerDataById && answerDataById.answer && answerDataById.answer !== '[Antwoord niet gevonden in gegenereerde tekst]') {
                    q.correctAnswer = answerDataById.answer;
                    q.explanation = answerDataById.explanation || `Het correcte antwoord is: ${Array.isArray(answerDataById.answer) ? answerDataById.answer.join(', ') : answerDataById.answer}`;
                } else {
                    // Probeer antwoord uit de vraag zelf te halen (bijv. eerste optie voor multiple choice)
                    let fallbackAnswer: string | string[] = '';
                    if (q.type === 'multiple-choice' && q.options && q.options.length > 0) {
                        // Voor multiple choice: gebruik eerste optie als fallback (niet ideaal, maar beter dan niets)
                        fallbackAnswer = q.options[0];
                    } else if (q.type === 'checkbox' && q.options && q.options.length > 0) {
                        // Voor checkbox: gebruik eerste optie als fallback
                        fallbackAnswer = [q.options[0]];
                    }

                    // Als we nog steeds geen antwoord hebben, probeer Gemini extractie
                    if (!fallbackAnswer || (typeof fallbackAnswer === 'string' && fallbackAnswer.trim() === '')) {
                        // Reset call count voor nieuwe parsing sessie
                        if (geminiCallCount >= MAX_GEMINI_CALLS_PER_SESSION) {
                            fallbackAnswer = 'Antwoord niet beschikbaar';
                        } else {
                            try {
                                const extracted = await extractAnswerWithGemini(q, text);
                                if (extracted && extracted.answer) {
                                    fallbackAnswer = extracted.answer;
                                    q.explanation = extracted.explanation || q.explanation || `Het correcte antwoord is: ${Array.isArray(extracted.answer) ? extracted.answer.join(', ') : extracted.answer}.`;
                                    geminiCallCount++;
                                } else {
                                    fallbackAnswer = 'Antwoord niet beschikbaar';
                                }
                            } catch (error) {
                                logEvent('exercise_parser', 'Gemini answer extraction failed', {
                                    level: 'warn',
                                    data: {
                                        questionId: q.id,
                                        error: error instanceof Error ? error.message : String(error),
                                    },
                                });
                                fallbackAnswer = 'Antwoord niet beschikbaar';
                            }
                        }
                    }

                    // Als we nog steeds geen antwoord hebben, gebruik placeholder
                    if (!fallbackAnswer || (typeof fallbackAnswer === 'string' && fallbackAnswer.trim() === '')) {
                        fallbackAnswer = 'Antwoord niet beschikbaar';
                    }

                    q.correctAnswer = fallbackAnswer;
                    if (!q.explanation || q.explanation.includes('kon niet worden gevonden')) {
                        q.explanation = `Het correcte antwoord is: ${Array.isArray(fallbackAnswer) ? fallbackAnswer.join(', ') : fallbackAnswer}. Let op: dit antwoord kon niet worden gevonden in de gegenereerde tekst. Probeer de oefening opnieuw te genereren voor een volledig antwoord.`;
                    }
                }
            }
        }

        // Zorg dat we precies 10 vragen hebben (vul aan of trim)
        const finalQuestions = questions.slice(0, 10);

        // Als we minder dan 10 vragen hebben, probeer meer te vinden in de tekst
        if (finalQuestions.length < 10) {
            // Zoek naar vragen die mogelijk gemist zijn
            const allQuestionMatches = text.match(/(?:Vraag|Opdracht)\s*\d+/gi);
            if (allQuestionMatches && allQuestionMatches.length > finalQuestions.length) {
                console.warn(`Gevonden ${allQuestionMatches.length} vraag referenties maar alleen ${finalQuestions.length} geparsed`);
            }

            // Vul aan met placeholder vragen die duidelijk zijn als placeholder
            while (finalQuestions.length < 10) {
                const qNum = finalQuestions.length + 1;
                finalQuestions.push({
                    id: `q${qNum}`,
                    type: 'multiple-choice',
                    questionText: `Vraag ${qNum}: Kies het juiste antwoord`,
                    correctAnswer: '',
                    options: ['Optie A', 'Optie B', 'Optie C'],
                    explanation: `Vraag ${qNum} kon niet worden geparsed. Probeer de oefening opnieuw te genereren.`,
                });
            }
        }

        // Zorg dat uitleg altijd een waarde heeft
        const finalExplanation = explanation.trim() || introduction.trim() || 'Geen specifieke uitleg beschikbaar. Bekijk de correcte antwoorden hieronder voor meer informatie.';

        return {
            introduction: introduction || 'Welkom bij deze oefening!',
            explanation: finalExplanation,
            questions: finalQuestions,
        };
    } catch (error) {
        console.error('Error parsing exercise:', error);
        return null;
    }
}
