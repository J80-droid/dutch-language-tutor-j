import { GoogleGenAI, Type, LiveServerMessage, Modality, Blob } from "@google/genai";
import { CEFRLevel, ActivityMode, Transcript, WordDefinition, SessionSummary } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set. Please set it in your environment.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface LiveSession {
  sendRealtimeInput(input: { media: Blob }): void;
  close(): void;
}


/**
 * Gets a Spanish translation and a Dutch example sentence for a given word.
 */
export const getWordDefinition = async (word: string): Promise<WordDefinition> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Geef een Spaanse vertaling en een Nederlandse voorbeeldzin voor het woord "${word}".`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING, description: "Het originele Nederlandse woord." },
                    translation: { type: Type.STRING, description: "De Spaanse vertaling." },
                    example: { type: Type.STRING, description: "Een Nederlandse voorbeeldzin." },
                },
                required: ["word", "translation", "example"]
            }
        }
    });

    try {
        const json = JSON.parse(response.text);
        return { ...json, word: word }; // Ensure the original word is returned
    } catch (e) {
        console.error("Failed to parse word definition JSON:", e, "Response text:", response.text);
        throw new Error("Could not get word definition.");
    }
};

/**
 * Gets a response from a general-purpose chatbot.
 */
export const getChatbotResponse = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "Je bent een behulpzame chatbot voor een app om Nederlands te leren. Beantwoord vragen bondig en in het Nederlands, tenzij de gebruiker expliciet om een andere taal vraagt.",
        },
    });
    return response.text;
};

/**
 * Generates a summary of a language learning session.
 */
export const getSessionSummary = async (transcripts: Transcript[], level: CEFRLevel, activity: ActivityMode): Promise<SessionSummary> => {
    const conversationHistory = transcripts.map(t => `${t.speaker === 'user' ? 'Student' : 'Tutor'}: ${t.text}`).join('\n');
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Hier is een transcript van een Nederlandse taaloefensessie. De student is een Spaanstalige op CEFR-niveau ${level} en de activiteit was "${activity}".
        Vat de belangrijkste leerpunten voor de student samen (in het Nederlands), identificeer 3-5 nieuwe Nederlandse woorden die ze hebben geleerd (met Spaanse vertaling en de originele Nederlandse voorbeeldzin uit het transcript), en geef concrete suggesties voor een volgende sessie.
        
        Transcript:
        ${conversationHistory}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    learningPoints: { type: Type.STRING, description: "Een samenvatting van de belangrijkste leerpunten in een paragraaf (Nederlands)." },
                    newVocabulary: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                word: { type: Type.STRING, description: "Het nieuwe Nederlandse woord." },
                                translation: { type: Type.STRING, description: "De Spaanse vertaling." },
                                example: { type: Type.STRING, description: "De Nederlandse zin uit het transcript waarin het woord werd gebruikt." }
                            },
                            required: ["word", "translation", "example"]
                        }
                    },
                    suggestions: { type: Type.STRING, description: "Concrete suggesties voor de volgende sessie (Nederlands)." }
                },
                required: ["learningPoints", "newVocabulary", "suggestions"]
            }
        }
    });

    try {
        const json = JSON.parse(response.text);
        return json as SessionSummary;
    } catch (e) {
        console.error("Failed to parse summary JSON:", e, "Response text:", response.text);
        throw new Error("Could not get session summary.");
    }
};


const getSystemInstruction = (level: CEFRLevel, activity: ActivityMode, isIntro: boolean = false): string => {
    const baseInstruction = `Je bent een geduldige en vriendelijke Nederlandse taaltutor. De gebruiker is een Spaanstalige die Nederlands leert op CEFR-niveau ${level}. De oefening van vandaag is "${activity}". Pas je taalgebruik en spreeksnelheid aan op het niveau van de gebruiker. Geef korte, duidelijke feedback.`;

    const activityInstructions: Record<ActivityMode, string> = {
        'conversation': 'Jij bent een vriendelijke gesprekspartner. Begin een open gesprek over een alledaags onderwerp, zoals het weer, hobby\'s of het weekend. Laat de gebruiker het gesprek sturen.',
        'vocabulary': 'Jij bent een woordenschatcoach. Introduceer een nieuw Nederlands woord, geef de Spaanse vertaling en een voorbeeldzin. Vraag de gebruiker dan om zelf een zin met het woord te maken.',
        'grammar': 'Jij bent een grammaticadocent. Vraag de gebruiker welke grammaticaregel ze willen leren. Geef een duidelijke, eenvoudige uitleg met voorbeelden. Stel daarna een vraag om hun begrip te testen.',
        'culture': 'Jij bent een cultuurgids. Deel een interessant en kort weetje over de Nederlandse cultuur, geschiedenis of tradities. Stel daarna een open vraag om een gesprek te starten.',
        'job-interview': 'Jij bent een HR-manager die een sollicitatiegesprek afneemt in het Nederlands. Stel de gebruiker vragen over hun ervaring en motivatie. Wees professioneel maar vriendelijk.',
        'making-complaint': 'Jij bent een medewerker van de klantenservice. De gebruiker heeft een klacht. Vraag naar de details en probeer een oplossing te vinden. Blijf beleefd, ook als de gebruiker gefrustreerd is.',
        'expressing-opinion': 'Jij bent een discussiepartner. Geef de gebruiker een stelling (bijv. "Huisdieren zouden verboden moeten worden in de stad") en vraag naar hun mening. Vraag door en geef tegenargumenten.',
        'giving-instructions': 'Je bent een vriend die niet weet hoe iets moet. Vraag de gebruiker om stapsgewijze instructies voor een taak (bijv. "een ei koken" of "een plant verpotten"). Vraag om opheldering als iets onduidelijk is.',
        'listen-summarize': 'Vertel een kort, eenvoudig verhaal (ongeveer 5-7 zinnen) in het Nederlands. Vraag de gebruiker daarna om het verhaal in hun eigen woorden samen te vatten. Geef feedback op hun samenvatting.',
        'tongue-twisters': 'Geef de gebruiker een klassieke Nederlandse tongbreker (bijv. "De kat krabt de krullen van de trap"). Vraag hen om het na te zeggen. Geef ze er een paar en moedig ze aan.',
        'sentence-puzzle': 'Geef de gebruiker een reeks losse Nederlandse woorden die een zin kunnen vormen. Vraag hen om de woorden in de juiste volgorde te zetten. Begin eenvoudig en maak het geleidelijk moeilijker.',
        'proverbs-sayings': 'Jij bent een Nederlandse taalcoach. Introduceer een Nederlands spreekwoord (bijv. "De appel valt niet ver van de boom"). Leg de betekenis uit en vraag de gebruiker om een situatie te bedenken waarin ze het zouden kunnen gebruiken.'
    };
    
    const action = isIntro ? 'Start de conversatie met een korte, gastvrije verwelkoming en leg daarna duidelijk uit wat je van de gebruiker verwacht tijdens deze oefening.' : 'Wacht tot de gebruiker spreekt.';

    return `${baseInstruction} ${activityInstructions[activity]} ${action}`;
}

/**
 * Generates a spoken introduction using a fast, non-streaming API call.
 */
export const generateIntroduction = async (level: CEFRLevel, activity: ActivityMode): Promise<{text: string, audio: string}> => {
    // 1. Generate the introductory text
    const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Genereer een korte introductie voor deze oefening. Begin met een gastvrije verwelkoming (1 zin) en leg daarna duidelijk uit wat je van de gebruiker verwacht tijdens deze oefening (2-3 zinnen). Wees specifiek en duidelijk over wat de gebruiker moet doen.',
        config: {
             systemInstruction: getSystemInstruction(level, activity, true),
        }
    });
    const introText = textResponse.text;

    // 2. Convert the text to speech
    const audioResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: introText }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
        },
    });
    const introAudio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!introAudio) {
        throw new Error("Could not generate introduction audio.");
    }
    
    return { text: introText, audio: introAudio };
}


/**
 * Establishes a connection to a Gemini Live session for real-time conversation.
 */
export const connectToLiveSession = (
    level: CEFRLevel,
    activity: ActivityMode,
    onMessage: (message: LiveServerMessage) => void,
// FIX: The onError callback for live.connect receives an ErrorEvent, not a generic Event.
    onError: (error: ErrorEvent) => void,
    onClose: (event: CloseEvent) => void
): Promise<LiveSession> => {

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => console.log('Live session opened.'),
            onmessage: onMessage,
            onerror: onError,
            onclose: onClose,
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {}, // Request final transcription results
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: getSystemInstruction(level, activity, false),
        },
    });

    return sessionPromise;
};
