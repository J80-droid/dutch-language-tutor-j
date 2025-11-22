import { CEFRLevel, LearningGoal } from '../../types';

export interface CulturePrompt {
    id: string;
    levels: CEFRLevel[];
    topic: string;
    fact: string;
    followUps: string[];
    miniTasks: string[];
    vocabularyHints?: string[];
    goalAdaptations?: Partial<Record<LearningGoal, string>>;
}

export interface CulturePromptSelection {
    prompt: CulturePrompt;
    selectedMiniTask: string;
    alternativeMiniTasks: string[];
    goalAdaptation?: string;
}

const CULTURE_PROMPTS: CulturePrompt[] = [
    {
        id: 'a1-koningsdag',
        levels: ['A1'],
        topic: 'Koningsdag',
        fact: 'Op 27 april vieren Nederlanders Koningsdag. De straten kleuren oranje en overal zijn vrijmarkten waar mensen hun spullen verkopen.',
        followUps: [
            'Wat vier jij in jouw land dat lijkt op Koningsdag?',
            'Welke dingen zou jij willen verkopen of kopen op een vrijmarkt?',
            'Heb je ooit iets soortgelijks meegemaakt in een ander land?'
        ],
        miniTasks: [
            'Laat de leerling het weetje in eenvoudige woorden samenvatten.',
            'Laat de leerling drie Nederlandse woorden uit het weetje herhalen en in een eigen zin gebruiken.',
            'Vraag de leerling om te vertellen welke kleding of kleuren zij zouden kiezen voor Koningsdag.'
        ],
        vocabularyHints: ['vrijmarkt', 'oranje', 'viering'],
        goalAdaptations: {
            fluency: 'Moedig de leerling aan om uitgebreid te vertellen hoe zij feest vieren en stel doorvragen over details.',
            vocabulary: 'Benadruk woorden zoals "vrijmarkt" en "viering" en laat de leerling nieuwe voorbeelden geven.',
            listening: 'Controleer begrip door te vragen welke datum is genoemd en wat mensen op Koningsdag doen.'
        }
    },
    {
        id: 'a2-fietscultuur',
        levels: ['A2'],
        topic: 'Fietscultuur',
        fact: 'In Nederland fietsen mensen gemiddeld zo’n 1000 kilometer per jaar. Veel steden hebben speciale fietspaden en verkeerslichten alleen voor fietsers.',
        followUps: [
            'Hoe ga jij meestal naar je werk of school?',
            'Wat vind je handig of lastig aan fietsen in drukke steden?',
            'Zou jij vaker fietsen als jouw stad meer fietspaden had? Waarom wel of niet?'
        ],
        miniTasks: [
            'Laat de leerling de voordelen en nadelen van fietsen opsommen.',
            'Laat de leerling een korte route beschrijven die zij met de fiets zouden nemen.',
            'Laat de leerling een tip geven voor veilig fietsen.'
        ],
        vocabularyHints: ['fietspad', 'verkeerslicht', 'voordeel'],
        goalAdaptations: {
            fluency: 'Stimuleer langere antwoorden door vervolgvragen over vervoer en veiligheid te stellen.',
            vocabulary: 'Introduceer woorden als "verkeerslicht" en "veiligheid" en oefen met tegenstellingen zoals "voordeel" en "nadeel".',
            listening: 'Vraag de leerling om belangrijke feiten uit het weetje te herhalen, bijvoorbeeld hoeveel kilometer Nederlanders fietsen.'
        }
    },
    {
        id: 'b1-gezelligheid',
        levels: ['B1'],
        topic: 'Gezelligheid',
        fact: 'Het woord "gezellig" beschrijft een warme, prettige sfeer met vrienden of familie. Het kan gaan om een avond thuis, een cafébezoek of zelfs een vergadering.',
        followUps: [
            'Wanneer vind jij een situatie echt gezellig?',
            'Welke plekken in jouw land voelen het meest gezellig aan en waarom?',
            'Kun je een ongelukkige situatie bedenken waar Nederlanders het toch "gezellig" noemen?'
        ],
        miniTasks: [
            'Laat de leerling het begrip "gezellig" vergelijken met een woord uit hun eigen taal.',
            'Laat de leerling een korte anekdote vertellen over een gezellige herinnering.',
            'Laat de leerling drie elementen noemen die een moment meteen gezellig maken.'
        ],
        vocabularyHints: ['sfeer', 'familie', 'anecdote'],
        goalAdaptations: {
            fluency: 'Laat de leerling een verhaal vertellen waarin ze meerdere beschrijvende woorden gebruiken.',
            vocabulary: 'Bespreek nuances van het woord "gezellig" en laat synoniemen of tegenstellingen formuleren.',
            listening: 'Laat de leerling uitleggen in welke situaties Nederlanders dit woord allemaal gebruiken.'
        }
    },
    {
        id: 'b2-watersnood',
        levels: ['B2'],
        topic: 'Watersnood en deltawerken',
        fact: 'Na de Watersnoodramp van 1953 is het Deltaplan gestart. Met dammen en stormvloedkeringen beschermt Nederland zichzelf tegen overstromingen.',
        followUps: [
            'Welke natuurrampen komen in jouw land voor en hoe bereidt men zich daarop voor?',
            'Wat vind jij van grote infrastructurele projecten als het Deltaplan?',
            'Welke gevolgen heeft klimaatverandering voor landen die onder zeeniveau liggen?'
        ],
        miniTasks: [
            'Laat de leerling een kort nieuwsbericht improviseren over het openen van een stormvloedkering.',
            'Vraag de leerling om een vergelijking te maken tussen het Deltaplan en een project in hun eigen land.',
            'Laat de leerling een advies formuleren voor toeristen die de deltawerken bezoeken.'
        ],
        vocabularyHints: ['stormvloedkering', 'overstroming', 'infrastructuur'],
        goalAdaptations: {
            fluency: 'Moedig de leerling aan om opinies te onderbouwen en voorbeelden te geven.',
            vocabulary: 'Focus op vaktermen zoals "stormvloedkering" en "infrastructuur" en laat ze herhalen.',
            listening: 'Controleer of de leerling de chronologie begrijpt: aanleiding, actie en resultaat.'
        }
    },
    {
        id: 'c1-poldermodel',
        levels: ['C1', 'C2'],
        topic: 'Poldermodel',
        fact: 'Het Nederlandse poldermodel staat voor overleg en consensus zoeken, zelfs als dat lang duurt. Het is zichtbaar in politiek, bedrijfsleven en maatschappelijke organisaties.',
        followUps: [
            'Welke voordelen en nadelen heeft besluitvorming via consensus volgens jou?',
            'Ken jij voorbeelden waarin overleg in jouw land juist werkt of faalt?',
            'Hoe zou het poldermodel omgaan met een dringende, controversiële beslissing?'
        ],
        miniTasks: [
            'Laat de leerling de kern van het poldermodel uitleggen in een paar zinnen voor iemand die het niet kent.',
            'Laat de leerling kritische vragen bedenken die bij een overlegtafel gesteld worden.',
            'Laat de leerling een eigen casus verzinnen waarbij het poldermodel tot een oplossing leidt.'
        ],
        vocabularyHints: ['consensus', 'maatschappelijk', 'controversieel'],
        goalAdaptations: {
            fluency: 'Laat de leerling verschillende perspectieven benoemen en koppelen aan praktijkvoorbeelden.',
            vocabulary: 'Zoom in op academische woorden zoals "consensus" en laat synoniemen en nuance bespreken.',
            listening: 'Check begrip door de leerling te vragen welke sectoren genoemd zijn en waarom overleg daar belangrijk is.'
        }
    }
];

const randomItem = <T,>(items: T[]): T => {
    if (items.length === 0) {
        throw new Error('Cannot pick a random item from an empty array.');
    }
    const index = Math.floor(Math.random() * items.length);
    return items[index];
};

export const pickCulturePrompt = (level: CEFRLevel, goal?: LearningGoal | null): CulturePromptSelection => {
    const levelMatches = CULTURE_PROMPTS.filter(prompt => prompt.levels.includes(level));
    const candidates = levelMatches.length > 0 ? levelMatches : CULTURE_PROMPTS;
    const prompt = randomItem(candidates);
    const selectedMiniTask = randomItem(prompt.miniTasks);
    const alternativeMiniTasks = prompt.miniTasks.filter(task => task !== selectedMiniTask);
    const goalAdaptation = goal ? prompt.goalAdaptations?.[goal] : undefined;

    return {
        prompt,
        selectedMiniTask,
        alternativeMiniTasks,
        goalAdaptation,
    };
};

export const listCulturePrompts = (): readonly CulturePrompt[] => CULTURE_PROMPTS;

