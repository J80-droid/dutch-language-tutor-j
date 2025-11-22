import type { CEFRLevel } from '@/types';

export interface ExtraExercise {
    id: string;
    title: string;
    focus: string;
    prompt: string;
}

export const EXTRA_EXERCISES: readonly ExtraExercise[] = [
    {
        id: 'idioms-context',
        title: 'Idiomen & uitdrukkingen leren',
        focus: 'Uitdrukkingen met context',
        prompt: 'Introduceer vijf veelgebruikte Nederlandse idiomen. Geef telkens een korte uitleg, een voorbeeldzin en een mini-opdracht waarin de leerling het idioom in eigen woorden toepast.',
    },
    {
        id: 'phrasal-verbs',
        title: 'Scheidbare werkwoorden oefenen',
        focus: 'Scheidbare en onscheidbare werkwoorden',
        prompt: 'Geef een overzicht van vijf scheidbare en vijf onscheidbare werkwoorden. Leg de splitsing uit, voeg voorbeeldzinnen toe en laat de leerling de juiste vormen invullen.',
    },
    {
        id: 'plural-forms',
        title: 'Meervoudsvormen oefenen',
        focus: 'Meervoudsvormen',
        prompt: 'Bied een korte uitleg over de belangrijkste regels voor meervouden en laat de leerling tien zelfstandige naamwoorden omzetten naar het juiste meervoud in contextzinnen.',
    },
    {
        id: 'diminutives',
        title: 'Verkleinwoorden oefenen',
        focus: 'Verkleinwoorden (-je, -tje, -pje)',
        prompt: 'Leg de regels rond verkleinwoorden uit en geef een oefening waarin de leerling verkleinwoorden vormt en in korte dialogen inzet.',
    },
    {
        id: 'prepositions',
        title: 'Voorzetsels oefenen',
        focus: 'Voorzetsels (op, in, bij, etc.)',
        prompt: 'Maak een tabel met veelvoorkomende voorzetsels en hun gebruik. Voeg invuloefeningen en foutenanalyse toe waarbij de leerling het juiste voorzetsel kiest.',
    },
    {
        id: 'question-formation',
        title: 'Vraagvorming',
        focus: 'Vragen stellen (wie, wat, waar)',
        prompt: 'Vat de regels voor vraagvorming samen en maak een oefening waarin de leerling beweringen herschrijft naar open vragen en passende vervolgvragen formuleert.',
    },
    {
        id: 'negation',
        title: 'Ontkenning oefenen',
        focus: 'Ontkenning (niet vs geen)',
        prompt: 'Vergelijk het gebruik van "niet" en "geen" met uitleg en voorbeeldzinnen. Laat de leerling zinnen corrigeren en zelf ontkennende varianten maken.',
    },
    {
        id: 'modal-verbs',
        title: 'Hulpwerkwoorden oefenen',
        focus: 'Hulpwerkwoorden (kunnen, moeten, willen)',
        prompt: 'Maak een compacte uitleg over modale werkwoorden en laat de leerling korte scenario\'s herschrijven met verschillende modaliteiten en beleefdheidsnuances.',
    },
    {
        id: 'minimal-pairs',
        title: 'Minimale paren uitspraak',
        focus: 'Minimale paren (vis/vies)',
        prompt: 'Geef een lijst met minimale paren, beschrijf het klankverschil en ontwerp luister-/leesopdrachten waarbij de leerling betekenisverschillen benoemt.',
    },
    {
        id: 'cloze-test',
        title: 'Gatenteksten',
        focus: 'Teksten met gaten invullen',
        prompt: 'Genereer een korte tekst met tien gaten gericht op woordenschat en grammatica. Voorzie een woordbank en een nabespreking met oplossleutels.',
    },
    {
        id: 'dialogue-completion',
        title: 'Dialogen aanvullen',
        focus: 'Dialogen aanvullen',
        prompt: 'Maak een dialoog van acht beurten waarin meerdere plekken leeg zijn gelaten. Geef aanwijzingen zodat de leerling passende replieken kan schrijven.',
    },
    {
        id: 'error-correction',
        title: 'Fouten vinden in context',
        focus: 'Fouten in teksten vinden',
        prompt: 'Schrijf een korte e-mail of tekst met tien veelvoorkomende fouten. Laat de leerling de fouten markeren en correct herschrijven met uitleg.',
    },
    {
        id: 'register-switching',
        title: 'Formeel vs informeel Nederlands',
        focus: 'Formeel / informeel Nederlands',
        prompt: 'Vergelijk formele en informele uitdrukkingen. Laat de leerling zinnen omzetten tussen registers en toon aan welke signalen het register bepalen.',
    },
    {
        id: 'conditionals',
        title: 'Voorwaardelijke zinnen',
        focus: 'Voorwaardelijke zinnen',
        prompt: 'Leg de bouw van voorwaardelijke zinnen uit (als + bijzin, inversie) en maak opdrachten waarin de leerling scenario\'s herschrijft met verschillende condities.',
    },
    {
        id: 'passive-voice',
        title: 'Lijdende vorm oefenen',
        focus: 'Lijdende vorm',
        prompt: 'Geef een overzicht van de lijdende vorm in de belangrijkste tijden. Laat de leerling actieve zinnen omzetten naar de passieve vorm in context.',
    },
    {
        id: 'relative-clauses',
        title: 'Bijzinnen',
        focus: 'Bijzinnen (die, dat, waar)',
        prompt: 'Introduceer betrekkelijke voornaamwoorden en laat de leerling twee zinnen samenvoegen tot één zin met een correcte bijzin.',
    },
    {
        id: 'listening-comprehension',
        title: 'Luistervaardigheid met vragen',
        focus: 'Audio met vragen',
        prompt: 'Ontwerp een luisterscript (te lezen) en drie begripsvragen. Voorzie ook een korte woordenschatlijst en een opdracht om het verhaal samen te vatten.',
    },
    {
        id: 'synonyms-antonyms',
        title: 'Synoniemen & antoniemen (gevorderd)',
        focus: 'Geavanceerde synoniemen',
        prompt: 'Maak een lijst met uitdagende woorden en hun synoniemen/antoniemen. Geef oefeningen waarin de leerling de juiste nuance kiest in contextzinnen.',
    },
    {
        id: 'word-formation',
        title: 'Woordvorming',
        focus: 'Voor- en achtervoegsels',
        prompt: 'Leg veelvoorkomende voor- en achtervoegsels uit en laat de leerling nieuwe woorden vormen en in zinnen gebruiken.',
    },
    {
        id: 'conversation-starters',
        title: 'Gespreksopeners & reacties',
        focus: 'Gespreksopeningen',
        prompt: 'Lever een lijst met gespreksopeners en voorbeeldreacties. Laat de leerling gepaste vervolgvraagjes formuleren voor sociale en professionele situaties.',
    },
    {
        id: 'collocations',
        title: 'Woordcombinaties oefenen',
        focus: 'Woordcombinaties',
        prompt: 'Introduceer tien veelgebruikte collocaties. Combineer matching-oefeningen met schrijfopdrachten waarin de collocaties natuurlijk worden toegepast.',
    },
    {
        id: 'pronunciation-feedback',
        title: 'Directe uitspraakfeedback',
        focus: 'Directe uitspraakfeedback',
        prompt: 'Simuleer een uitspraaksessie: bied voorbeeldzinnen, beschrijf typische fouten en laat de leerling de uitspraak analyseren en verbeteren via zelfreflectie.',
    },
    {
        id: 'voice-comparison',
        title: 'Stem vergelijken & analyseren',
        focus: 'Vergelijken met native speaker',
        prompt: 'Geef een transcript van een native speaker en laat de leerling benoemen welke elementen van intonatie, ritme en klemtoon opvallen. Voeg reflectievragen toe.',
    },
    {
        id: 'debate-argumentation',
        title: 'Debatteren & argumenteren',
        focus: 'Debatteren met AI',
        prompt: 'Presenteer een stelling en geef argumenten pro/contra. Laat de leerling eigen standpunten uitwerken met signaalwoorden en schrijf een korte repliek.',
    },
    {
        id: 'accent-reduction',
        title: 'Accent reductie training',
        focus: 'Accent reductie',
        prompt: 'Benoem typische uitspraakuitdagingen voor Spaanstalige leerders en geef doelgerichte oefeningen voor klinkers, medeklinkers en intonatie.',
    },
    {
        id: 'cultural-context',
        title: 'Culturele context oefeningen',
        focus: 'Culturele context',
        prompt: 'Beschrijf een cultuurfragment en stel vragen over gewoonten, beleefdheid en waarden. Laat de leerling parallellen trekken met de eigen cultuur.',
    },
    {
        id: 'de-het-swipe',
        title: 'De/Het Swipe & Sort',
        focus: 'Lidwoorden snel herkennen',
        prompt: 'Maak een oefening waarbij de leerling woorden naar "de" of "het" moet sorteren. Geef 10 woorden die de leerling moet categoriseren door te swipen of te slepen.',
    },
    {
        id: 'de-het-memory',
        title: 'De/Het Memory spel',
        focus: 'Lidwoorden memoriseren',
        prompt: 'Maak een memory spel met 10 paren: elk woord (bijv. "huis") moet gematcht worden met het juiste lidwoord ("het").',
    },
    {
        id: 'de-het-contextual',
        title: 'De/Het contextueel kiezen',
        focus: 'Lidwoorden in context',
        prompt: 'Maak 10 zinnen met gaten waar de leerling "de" of "het" moet invullen. Focus op contextuele hints die helpen bepalen welk lidwoord correct is.',
    },
    {
        id: 'sentence-jigsaw',
        title: 'Zinspuzzel (Woordvolgorde)',
        focus: 'Zinsbouw en woordvolgorde',
        prompt: 'Geef 10 zinnen die uit elkaar gehaald zijn in losse woorden of zinsdelen. De leerling moet deze in de juiste volgorde slepen om correcte zinnen te vormen.',
    },
    {
        id: 'inversion-practice',
        title: 'Inversie oefeningen',
        focus: 'Inversie na tijds-/plaatsbepaling',
        prompt: 'Maak 10 oefeningen waarbij de leerling zinnen moet herschrijven met inversie. Focus op zinnen die beginnen met tijds- of plaatsbepalingen (bijv. "Gisteren heb ik gewerkt").',
    },
    {
        id: 'subordinate-clause-sov',
        title: 'Bijzin SOV constructie',
        focus: 'Bijzinnen en werkwoord eindpositie',
        prompt: 'Maak 10 oefeningen waarbij de leerling bijzinnen moet bouwen waarbij het werkwoord naar het einde gaat. Bijvoorbeeld: "Ik denk dat hij ziek is."',
    },
    {
        id: 'perfectum-practice',
        title: 'Perfectum oefenen',
        focus: 'Perfectum (hebben vs zijn)',
        prompt: 'Maak 10 oefeningen waarbij de leerling moet kiezen tussen "hebben" en "zijn" voor het perfectum. Leg uit wanneer welke hulpwerkwoord gebruikt wordt.',
    },
    {
        id: 'imperfectum-practice',
        title: 'Imperfectum vs Perfectum',
        focus: 'Verleden tijd keuze',
        prompt: 'Maak 10 oefeningen waarbij de leerling moet kiezen tussen imperfectum (verhaal) en perfectum (resultaat). Geef contextuele hints.',
    },
    {
        id: 'adjective-declension',
        title: 'Adjectiefverbuiging (de \'e\')',
        focus: 'Bijvoeglijk naamwoord verbuiging',
        prompt: 'Maak 10 oefeningen waarbij de leerling moet bepalen of een bijvoeglijk naamwoord een "-e" krijgt of niet. Focus op het verschil tussen "een mooi huis" en "het mooie huis".',
    },
    {
        id: 'er-word-practice',
        title: 'Het woord \'er\' oefenen',
        focus: 'De vier functies van \'er\'',
        prompt: 'Maak 10 oefeningen die de vier functies van "er" testen: locatie ("er is"), kwantiteit ("er zijn twee"), passief ("er wordt gezegd"), en existentieel gebruik.',
    },
    {
        id: 'compound-words',
        title: 'Samenstellingen (Word Math)',
        focus: 'Samenstellingen vormen',
        prompt: 'Maak 10 oefeningen waarbij de leerling twee woorden moet combineren tot een samenstelling. Bijvoorbeeld: "tafel" + "poot" = "tafelpoot". Let op tussen-n/-s regels.',
    },
    {
        id: 'dictation',
        title: 'Dictee oefeningen',
        focus: 'Luisteren en spellen',
        prompt: 'Genereer 10 korte zinnen (max 10 woorden per zin) die de leerling moet typen na het beluisteren. Focus op moeilijke spelling (ei/ij, au/ou) en grammatica.',
    },
    {
        id: 'image-description',
        title: 'Visuele context beschrijving',
        focus: 'Beschrijven met afbeeldingen',
        prompt: 'Beschrijf 10 scenario\'s met afbeeldingen waarbij de leerling vragen moet beantwoorden of beschrijvingen moet maken. Focus op voorzetsels, lidwoorden en woordvolgorde.',
    },
    {
        id: 'spot-difference',
        title: 'Spot the difference',
        focus: 'Verschillen beschrijven',
        prompt: 'Geef 10 scenario\'s met twee bijna identieke afbeeldingen waarbij de leerling de verschillen moet beschrijven. Stimuleer productief taalgebruik.',
    },
    {
        id: 'modal-particles',
        title: 'Modale partikels',
        focus: 'Toch, wel, eens, maar',
        prompt: 'Maak 10 oefeningen waarbij de leerling het juiste modale partikel moet kiezen om gevoel uit te drukken (twijfel, geruststelling, irritatie, etc.).',
    },
    {
        id: 'speech-acts',
        title: 'Spreekhandelingen',
        focus: 'Doen met taal',
        prompt: 'Maak 10 scenario-gebaseerde oefeningen waarbij de leerling moet bepalen wat de juiste spreekhandeling is (klacht indienen, verzoek doen, waarschuwen, etc.).',
    },
    {
        id: 'social-scripts',
        title: 'Sociale scripts',
        focus: 'Culturele taalrituelen',
        prompt: 'Maak 10 oefeningen over sociale situaties: wat zeg je als iemand niest, op een verjaardag, bij een winkel, bij verlies/overlijden, etc.',
    },
    {
        id: 'spelling-rules',
        title: 'Spelling regels',
        focus: 'ei/ij, au/ou, g/ch, v/f, z/s',
        prompt: 'Maak 10 oefeningen waarbij de leerling moet kiezen tussen moeilijke spellingparen: ei vs ij, au vs ou, g vs ch, v vs f, z vs s.',
    },
    {
        id: 'numbers-time-date',
        title: 'Getallen, tijd en datum',
        focus: 'Cijfers, klok en kalender',
        prompt: 'Maak 10 oefeningen over grote getallen lezen, kloktijden ("kwart voor", "vijf over half"), en datumnotatie en uitspraak ("11 november" vs "de 11e").',
    },
    {
        id: 'punctuation',
        title: 'Interpunctie',
        focus: 'Leestekens correct gebruiken',
        prompt: 'Maak 10 oefeningen waarbij de leerling leestekens moet plaatsen: komma\'s, trema\'s (zee-eend), koppeltekens (auto-ongeluk), en aanhalingstekens.',
    },
];

export type ExtraExerciseId = (typeof EXTRA_EXERCISES)[number]['id'];

export type ExtraExerciseResolver = (params: {
    exercise: ExtraExercise;
    level: CEFRLevel;
    topic: string;
}) => string;
