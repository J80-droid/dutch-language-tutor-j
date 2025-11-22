import type { CEFRLevel } from '@/types';

export interface ExtraExerciseDefinition {
  id: string;
  title: string;
  focus: string;
  description: string;
  promptTemplate: string;
}

export type ExtraExercise = ExtraExerciseDefinition;
export type ExtraExerciseId = string;

const basePrompt = (title: string, focus: string) => `
Je bent een ervaren Nederlandse taaldocent.
Maak een oefening voor het thema "${title}" met focus op ${focus}.
Schrijf de instructies in het Nederlands en pas de inhoud aan CEFR-niveau {{level}}.
Gebruik een duidelijke structuur met kopjes en bullets waar passend.
Vermeld minstens drie deelopdrachten en geef voorbeeldoplossingen of feedbackrichtlijnen.
`;

export const EXTRA_EXERCISES: readonly ExtraExerciseDefinition[] = [
  {
    id: 'idioms-context',
    title: 'Idiom & expression learning',
    focus: 'uitdrukkingen met context',
    description: 'Werk met Nederlandse idiomen in korte contexten en laat cursisten betekenis en gebruik verklaren.',
    promptTemplate: basePrompt('Idiom & expression learning', 'uitdrukkingen met context') + `
Kies vijf idiomen die passen bij niveau {{level}}.
Voor elk idioom: geef een voorbeeldzin, betekenis, en een opdracht waarbij de leerling de uitdrukking in een nieuw voorbeeld gebruikt.
Sluit af met een mini-reflectieopdracht over het gebruik van idiomen in het dagelijks leven.
`,
  },
  {
    id: 'phrasal-verbs',
    title: 'Phrasal verbs practice',
    focus: 'scheidbare en onscheidbare werkwoorden',
    description: 'Introduceer scheidbare en onscheidbare werkwoorden en laat cursisten zinnen bouwen.',
    promptTemplate: basePrompt('Phrasal verbs practice', 'scheidbare en onscheidbare werkwoorden') + `
Selecteer zes werkwoorden die typisch zijn voor het niveau {{level}}.
Voor elk werkwoord: geef uitleg over de scheidbaarheid, een voorbeeldzin en een invuloefening.
Voeg een korte dialoog toe waarin de leerling de werkwoorden correct moet plaatsen.
`,
  },
  {
    id: 'plural-forms',
    title: 'Plural forms practice',
    focus: 'meervoudsvormen',
    description: 'Laat cursisten oefenen met het vormen van het meervoud en uitzonderingen herkennen.',
    promptTemplate: basePrompt('Plural forms practice', 'meervoudsvormen') + `
Maak een tabel met vijf regelmatige en vijf onregelmatige zelfstandige naamwoorden.
Laat de leerling per woord het meervoud bepalen en geef feedbackregels.
Voeg een korte schrijfopdracht toe waarin drie van de woorden in context moeten worden gebruikt.
`,
  },
  {
    id: 'diminutives',
    title: 'Diminutive practice (-je, -tje, -pje)',
    focus: 'verkleinwoorden',
    description: 'Introduceer regels rondom verkleinwoorden en laat leerlingen varianten vormen.',
    promptTemplate: basePrompt('Diminutive practice', 'verkleinwoorden') + `
Kies acht woorden met verschillende verkleinwoord-uitgangen.
Beschrijf de regel per uitgang en geef voorbeeldzinnen.
Werk toe naar een korte beschrijving waarin de leerling verkleinwoorden moet kiezen.
`,
  },
  {
    id: 'prepositions',
    title: 'Preposition practice',
    focus: 'voorzetsels zoals op, in, bij',
    description: 'Oefen betekenis en gebruik van veelvoorkomende voorzetsels in zinnen.',
    promptTemplate: basePrompt('Preposition practice', 'voorzetsels (op, in, bij, etc.)') + `
Maak drie minidialogen waarin telkens drie voorzetsels ontbreken.
Laat de leerling kiezen uit opties en motiveer kort waarom een voorzetsel correct is.
Sluit af met een omschrijfoefening waarin situaties worden gekoppeld aan voorzetselgebruik.
`,
  },
  {
    id: 'question-formation',
    title: 'Question formation',
    focus: 'vragen stellen met wie, wat, waar',
    description: 'Laat cursisten vragen formuleren met verschillende vraagwoorden en inversie.',
    promptTemplate: basePrompt('Question formation', 'vragen stellen (wie, wat, waar)') + `
Geef een stappenplan voor vraagvormen in het Nederlands, inclusief inversie.
Voorzie vijf stellingen die de leerling moet omzetten naar vragen met verschillende vraagwoorden.
Voeg een mini-rollenspel toe waarin twee korte vragenreeksen worden opgesteld.
`,
  },
  {
    id: 'negation',
    title: 'Negation practice (niet vs geen)',
    focus: 'ontkenning',
    description: 'Onderscheid gebruik van “niet” en “geen” in zinnen en laat leerlingen transformeren.',
    promptTemplate: basePrompt('Negation practice', 'ontkenning met niet en geen') + `
Leg de kernregels uit voor "niet" en "geen" met drie voorbeelden per regel.
Geef tien korte zinnen die de leerling moet ontkennen.
Sluit af met een reflectie waarbij de leerling eigen voorbeelden schrijft en uitlegt.
`,
  },
  {
    id: 'modal-verbs',
    title: 'Modal verbs practice',
    focus: 'hulpwerkwoorden kunnen, moeten, willen',
    description: 'Oefen modale werkwoorden in context en laat alternatieven formuleren.',
    promptTemplate: basePrompt('Modal verbs practice', 'modale werkwoorden kunnen, moeten, willen') + `
Ontwerp drie scenario’s (bijv. werk, school, vrije tijd) waarin modale werkwoorden nodig zijn.
Voor elk scenario: geef voorbeeldzinnen, een schrijfopdracht en een herformuleringsopdracht.
`,
  },
  {
    id: 'minimal-pairs',
    title: 'Pronunciation minimal pairs',
    focus: 'minimale paren (vis/vies)',
    description: 'Concentreer op uitspraakverschillen en luister/discriminatie-oefeningen zonder audio.',
    promptTemplate: basePrompt('Pronunciation minimal pairs', 'minimale paren') + `
Maak een tabel met acht minimale paren die relevant zijn voor niveau {{level}}.
Beschrijf articulatietips en laat de leerling minimal pairs in zinnen gebruiken.
Voeg een korte dictee-simulatie toe waarin de leerling moet opschrijven wat hij denkt te horen.
`,
  },
  {
    id: 'cloze-tests',
    title: 'Cloze test exercises',
    focus: 'teksten met gaten invullen',
    description: 'Ontwerp invuloefeningen met thematische tekstfragmenten en feedback.',
    promptTemplate: basePrompt('Cloze test exercises', 'teksten met gaten invullen') + `
Schrijf een korte tekst van ongeveer 150 woorden passend bij niveau {{level}}.
Laat tien woorden weg en geef een woordenbank.
Voeg uitleg toe voor elke oplossing en een vervolgopdracht waarbij de leerling een samenvatting schrijft.
`,
  },
  {
    id: 'dialogue-completion',
    title: 'Dialogue completion',
    focus: 'dialogen aanvullen',
    description: 'Laat cursisten ontbrekende replieken in dialogen schrijven en varianten oefenen.',
    promptTemplate: basePrompt('Dialogue completion', 'dialogen aanvullen') + `
Bedenk twee alledaagse dialogen van zes beurten waarvan telkens de reactie van één spreker ontbreekt.
Geef schrijfkaders of hints voor de ontbrekende delen.
Sluit af met een creatieopdracht waarbij de leerling een nieuwe draai geeft aan de dialoog.
`,
  },
  {
    id: 'error-correction',
    title: 'Error correction in context',
    focus: 'fouten in teksten vinden',
    description: 'Bied teksten met typische fouten aan en laat cursisten verbeteren en uitleggen.',
    promptTemplate: basePrompt('Error correction in context', 'fouten in teksten vinden') + `
Schrijf twee korte paragrafen met elk zes fouten passend bij niveau {{level}} (woordenschat of grammatica).
Laat de leerling fouten markeren, verbeteren en uitleggen waarom.
Voeg een rubriek toe met tips om vergelijkbare fouten te vermijden.
`,
  },
  {
    id: 'formal-informal',
    title: 'Formal vs informal language',
    focus: 'formeel versus informeel Nederlands',
    description: 'Vergelijk registers en laat cursisten zinnen herschrijven in een ander register.',
    promptTemplate: basePrompt('Formal vs informal language', 'formeel/informeel Nederlands') + `
Maak een overzicht van typische formele en informele uitdrukkingen.
Geef tien zinnen die moeten worden herschreven in het tegengestelde register.
Sluit af met een mini-case waarin de leerling een e-mail schrijft in twee registervarianten.
`,
  },
  {
    id: 'conditional-sentences',
    title: 'Conditional sentences',
    focus: 'voorwaardelijke zinnen',
    description: 'Introduceer verschillende soorten voorwaardelijke zinnen en laat varianten maken.',
    promptTemplate: basePrompt('Conditional sentences', 'voorwaardelijke zinnen') + `
Leg de structuur uit van reële, irreële en hypothetische voorwaarden op niveau {{level}}.
Geef voorbeeldzinnen en laat de leerling eigen varianten schrijven.
Voeg een herformuleringsopdracht toe waarin tijd en modaliteit veranderen.
`,
  },
  {
    id: 'passive-voice',
    title: 'Passive voice practice',
    focus: 'lijdende vorm',
    description: 'Oefen het omzetten van actieve naar passieve zinnen en bespreek gebruik.',
    promptTemplate: basePrompt('Passive voice practice', 'de lijdende vorm') + `
Geef een korte uitleg over wanneer de lijdende vorm passend is.
Laat tien actieve zinnen omzetten naar passief en vraag om feedback op toon/register.
Voeg een schrijfkader toe waarin de leerling een nieuwsbericht herschrijft in de lijdende vorm.
`,
  },
  {
    id: 'relative-clauses',
    title: 'Relative clauses',
    focus: 'bijzinnen met die, dat, waar',
    description: 'Laat cursisten relatieve bijzinnen vormen en verbinden.',
    promptTemplate: basePrompt('Relative clauses', 'bijzinnen (die, dat, waar)') + `
Maak een minigrammatica over relatieve voornaamwoorden met voorbeelden.
Ontwerp twee oefeningen: zinnen verbinden en fouten verbeteren.
Laat afsluitend een korte beschrijving schrijven waarin minstens drie relatieve bijzinnen voorkomen.
`,
  },
  {
    id: 'listening-comprehension',
    title: 'Listening comprehension with questions',
    focus: 'luistervaardigheid zonder audio',
    description: 'Simuleer luisteroefeningen door transcript-samenvattingen en vragen te geven.',
    promptTemplate: basePrompt('Listening comprehension with questions', 'audio met vragen (gesimuleerd)') + `
Schrijf een transcript van een kort gesprek (ongeveer 180 woorden).
Formuleer inhouds- en detailvragen.
Voeg een opdracht toe waarin de leerling het gesprek samenvat en belangrijke woorden noteert.
`,
  },
  {
    id: 'synonyms-antonyms',
    title: 'Synonyms & antonyms advanced',
    focus: 'geavanceerde synoniemen en antoniemen',
    description: 'Vergroot woordenschat via synoniemen/antoniemen en nuanceer gebruik.',
    promptTemplate: basePrompt('Synonyms & antonyms advanced', 'geavanceerde synoniemen en antoniemen') + `
Selecteer tien woorden passend bij niveau {{level}} en geef twee synoniemen en één antoniem.
Ontwerp opdrachten waarbij de leerling het beste woord kiest voor een context.
Voeg een schrijfopdracht toe waarbij nuances moeten worden uitgelegd.
`,
  },
  {
    id: 'word-formation',
    title: 'Word formation',
    focus: 'voor- en achtervoegsels',
    description: 'Oefen woordvorming door voor- en achtervoegsels te gebruiken.',
    promptTemplate: basePrompt('Word formation', 'voor- en achtervoegsels') + `
Introduceer vijf productieve voorvoegsels en vijf achtervoegsels die passen bij niveau {{level}}.
Laat leerlingen basiswoorden uitbreiden en betekenisverschillen uitleggen.
Sluit af met een creatief schrijfblok van 120 woorden waarin minstens zes gevormde woorden voorkomen.
`,
  },
  {
    id: 'conversation-starters',
    title: 'Conversation starters & responses',
    focus: 'gespreksopeningen',
    description: 'Bied startzinnen aan en laat cursisten gepaste reacties formuleren.',
    promptTemplate: basePrompt('Conversation starters & responses', 'gespreksopeningen en replieken') + `
Maak twee tabellen: één met informele en één met formele starters.
Laat de leerling per starter twee mogelijke antwoorden schrijven.
Voeg een scenario-opdracht toe waarin een kort gesprek wordt uitgeschreven met passende reacties.
`,
  },
  {
    id: 'collocations',
    title: 'Collocations practice',
    focus: 'woordcombinaties',
    description: 'Oefen vaste combinaties en laat cursisten collocaties herkennen en produceren.',
    promptTemplate: basePrompt('Collocations practice', 'woordcombinaties') + `
Selecteer tien collocaties die relevant zijn voor niveau {{level}}.
Ontwerp matching-, invul- en schrijfopdrachten.
Geef reflectievragen over hoe collocaties verschil maken in natuurlijke taal.
`,
  },
  {
    id: 'real-time-pronunciation',
    title: 'Real-time pronunciation feedback',
    focus: 'uitspraakfeedback zonder microfoon',
    description: 'Stimuleer zelfreflectie op uitspraak via beschrijvende oefeningen.',
    promptTemplate: basePrompt('Real-time pronunciation feedback', 'uitspraakobservatie') + `
Beschrijf vijf zinnen met fonetische tips (klemtoon, klinkers).
Laat de leerling diagnosevragen beantwoorden over eigen uitspraak.
Voeg een evaluatielijst toe waarmee de leerling vooruitgang kan monitoren.
`,
  },
  {
    id: 'voice-comparison',
    title: 'Voice comparison & analysis',
    focus: 'vergelijking met native speaker',
    description: 'Laat cursisten transcripties analyseren en zelfopnames plannen.',
    promptTemplate: basePrompt('Voice comparison & analysis', 'spraakvergelijking') + `
Geef een transcript van een voorbeeldtekst met nadruk op intonatie.
Ontwerp analysevragen over tempo, klemtoon en uitspraak.
Voeg een actieplan toe waarin de leerling eigen verbeterpunten noteert.
`,
  },
  {
    id: 'debate-argumentation',
    title: 'Debate & argumentation practice',
    focus: 'debatteren met argumenten',
    description: 'Bouw argumentatie op met stellingen, tegenargumenten en brugzinnen.',
    promptTemplate: basePrompt('Debate & argumentation practice', 'debatteren met AI') + `
Kies twee actuele stellingen passend bij niveau {{level}}.
Voor elke stelling: geef argumenten, tegenargumenten en functies van signaalwoorden.
Laat de leerling een korte debatopening en -slot schrijven.
`,
  },
  {
    id: 'accent-reduction',
    title: 'Accent reduction training',
    focus: 'accent reductie',
    description: 'Werk aan uitspraak via articulatie-oefeningen en ritmebewustzijn.',
    promptTemplate: basePrompt('Accent reduction training', 'accent reductie') + `
Beschrijf drie kernaspecten (klinkers, ritme, intonatie) met oefeningen.
Laat de leerling minimal pairs en schaduw-oefeningen plannen.
Voeg een zelfevaluatie toe met doelen voor de komende week.
`,
  },
  {
    id: 'cultural-context',
    title: 'Cultural context exercises',
    focus: 'culturele context',
    description: 'Verbind taalgebruik aan culturele situaties en reflecties.',
    promptTemplate: basePrompt('Cultural context exercises', 'culturele context') + `
Ontwerp twee casussen waarin taalkeuze cultureel gevoelig is.
Laat de leerling reageren en uitleggen waarom bepaalde formuleringen passen.
Sluit af met een reflectie over culturele verschillen tussen Nederland en het thuisland van de leerling.
`,
  },
] as const;

export const EXTRA_EXERCISE_IDS = new Set(EXTRA_EXERCISES.map(item => item.id));

export const findExtraExercise = (id: string) =>
  EXTRA_EXERCISES.find(item => item.id === id);

export const buildExercisePrompt = (
  exerciseId: string,
  level: CEFRLevel,
  overrides: { topic?: string; customFocus?: string } = {},
) => {
  const exercise = findExtraExercise(exerciseId);
  if (!exercise) {
    throw new Error(`Onbekende extra oefening: ${exerciseId}`);
  }
  const base = exercise.promptTemplate
    .replace(/{{level}}/g, level);
  const topicNote = overrides.topic
    ? `\nIntegreer waar mogelijk het gekozen onderwerp: "${overrides.topic}".`
    : '';
  const focusNote = overrides.customFocus
    ? `\nLeg extra nadruk op: ${overrides.customFocus}.`
    : '';
  return base + topicNote + focusNote;
};
