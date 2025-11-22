<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1bjQy0OjctWd1s9bxqWwwTKeoZyTwlXcx

## Run Locally

**Prerequisites:**  Node.js
1. Install dependencies:
   `npm install`
2. Set the `VITE_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Actueel nieuws als gespreksonderwerp

- Vrije conversatie kan nu gevoed worden door open, gratis RSS-feeds van **NOS**, **NU.nl** en **Wikinews**. De topics worden lokaal gecached (10 minuten) in `localStorage` onder de sleutel `newsFeedCache:v1`.
- De lokale dev-server bevat een ingebouwde proxy op `/api/news-proxy` voor deze drie bronnen. Tijdens `npm run dev` worden nieuwsaanvragen hier automatisch doorheen gestuurd, zodat er geen CORS-fouten optreden. In productie of andere omgevingen kun je `VITE_NEWS_PROXY_URL` instellen (bijv. een eigen Cloudflare Worker) die dezelfde queryparameter `?url=` accepteert.
- In de setup-view vind je de sectie **“Actueel nieuws als onderwerp”**. Schakel het vinkje in om headlines op te halen, kies een item met de radio-buttons en gebruik **“Nieuws vernieuwen”** of **“Cache leegmaken”** om respectievelijk een geforceerde refresh te doen of verouderde data te verwijderen.
- Tijdens het starten van een sessie wordt het gekozen artikel automatisch herschreven naar het ingestelde CEFR-niveau. De tutor opent het gesprek met een korte bronvermelding in de vorm “Bron: … Info kan snel veranderen.” zodat duidelijk is dat het onderwerp tijdsgevoelig is.
- Als een feed niet bereikbaar is, logt de app de fout en valt de sessie terug op de reguliere onderwerpen. Je ziet hiervan een melding in de sessie en in de console (`scope: "news"`).
- Heb je alsnog een aangepaste proxy nodig, stel dan optioneel `VITE_NEWS_PROXY_URL` in. De waarde wordt geprefixt voor iedere feed-aanvraag en moet zelf CORS-headers toevoegen.

## Dynamische gespreksonderwerpen (AI)

- Wanneer er geen nieuwsartikel is geselecteerd, genereert de app nu per sessie een uniek gespreksonderwerp via Gemini op basis van het gekozen CEFR-niveau (A1 t/m C2).
- De prompt gebruikt per niveau de officiële CEFR-beschrijvingen (luisteren, lezen, spreken, schrijven) zodat de openingsvraag, vervolgvragen en woordenschat aansluiten bij het vaardigheidsniveau van de leerling.
- Resultaten worden kort gecached in het geheugen om dubbele API-aanroepen binnen dezelfde sessie te voorkomen. Als de generatie mislukt, valt de app automatisch terug op de bestaande fallback-thema’s of eventuele zelf toegevoegde onderwerpen.
- In de UI zie je bij het statuslabel “Bron: AI gegenereerd” zodra een dynamisch onderwerp actief is.

## Leerdoelen & correctiestrictheid

- In de setup-view kun je nu meerdere leerdoelen tegelijk activeren (bijvoorbeeld **Vloeiendheid** + **Uitspraak**). De tutor combineert de feedback-instructies automatisch.
- De CEFR-beschrijvingen voor elk niveau sturen de feedbackwijze tijdens de sessie. Zo krijgt een A1-leerling zachte herformuleringen, terwijl C2-cursisten nuance en idiomatische nauwkeurigheid verwachten.
- Stel per aspect (grammatica, uitspraak, vloeiendheid, woordenschat, toon) een strictheidsniveau in van 1 (zacht) tot 5 (intens). De instelling wordt meegenomen in de systeemopdracht én in realtime instructies.
- De knop **“Herstel standaard”** zet alle schuiven terug naar het neutrale niveau 3.

## Gamification-overzicht

De app bevat een uitgebreide gamificatie-laag die automatisch je voortgang opslaat in `localStorage`. Belangrijke onderdelen:

- **Dagelijkse & wekelijkse streaks:** houd je oefenritme bij en ontvang herinneringen wanneer een streak bijna verloopt.
- **XP en coach-levels:** verdien XP op basis van sessieduur, activiteitstype, missies en microrewards tijdens live sessies. Nieuwe thema’s worden ontgrendeld naarmate je level stijgt.
- **Dagmissies en seizoensevents:** wisselende uitdagingen met XP-beloningen. Seizoensevents hebben een eigen voortgangsbalk en kunnen extra XP opleveren.
- **Badges & snapshots:** bekijk badges, heatmaps en voortgangssnapshots in het dashboard om trends over tijd te volgen.
- **Minigame Hub:** speel vocabulaire-quizzen op basis van je opgeslagen gesprekken en verzamel extra XP.
- **CEFR-beheersing:** elke oefenmodus is gekoppeld aan CEFR-vaardigheden (luisteren, lezen, spreken-productie/interactie, schrijven). Iedere afgeronde sessie verhoogt de “exposure” voor de relevante descriptoren; in de setup-weergave tonen de niveaukaarten nu een CEFR-mastery percentage met een kernvaardigheidstip.

### Notificaties inschakelen

Voor streak-waarschuwingen wordt de browser `Notification` API gebruikt. Schakel meldingen in wanneer daarom wordt gevraagd.

### Data opschonen

Alle gamificationdata staat in `localStorage` onder de sleutel `gamificationState`. Je kunt dit resetten via de browser-devtools of door `localStorage.clear()` uit te voeren in de console.

## Kwaliteitscontrole

Voer lokaal `npm run lint` uit om TypeScript/ESLint fouten te controleren. Houd er rekening mee dat Windows-paden met speciale tekens een extra escape kunnen vereisen in PowerShell.

- Unit tests draaien: `npm run test -- --run`
- De tests omvatten streak- en XP-simulaties, missie/badge-evaluatie, minigame-logging en notificatiegedrag.
- Integratietests (React Testing Library) zitten onder `src/app/__tests__/`. Deze verifiëren onder andere dat de setup-weergave correct initialiseert en dat de navigatie naar de missiesectie werkt binnen de nieuwe providerstructuur.

### Handmatige testmatrix

- **Actueel nieuws (dev)**: start `npm run dev`, schakel nieuws in de setup in, controleer dat headlines verschijnen zonder CORS-fout en start een sessie op basis van het artikel.
- **Proxy-fallback**: voer in de browser `localStorage.removeItem('newsFeedCache:v1')` uit, trek de netwerkkabel los of blokkeer één feed en controleer dat de UI een nette foutmelding toont en dat een sessie terugvalt op reguliere onderwerpen.
- **Productie-proxy**: stel tijdelijk `VITE_NEWS_PROXY_URL` in (bijv. naar een mock-server) en controleer in de devtools dat verzoeken naar de externe URL via jouw proxy lopen.

## Extra Oefeningen (Hugging Face)

De "Extra oefeningen" sectie bevat 26 tekstgerichte oefeningen die worden gegenereerd door gratis Hugging Face AI-modellen. Deze sectie gebruikt **geen microfoon** en vereist daarom geen Gemini API key.

### Gratis Hugging Face API Key instellen (aanbevolen)

Voor de beste ervaring en onbeperkte variatie in oefeningen, kun je een gratis Hugging Face API token gebruiken:

1. **Account aanmaken**: Ga naar [huggingface.co](https://huggingface.co) en maak een gratis account aan
2. **Token genereren**: 
   - Ga naar je profiel → Settings → [Access Tokens](https://huggingface.co/settings/tokens)
   - Klik op "New token"
   - Geef het token een naam (bijv. "Dutch Tutor")
   - Selecteer "Read" permissions
   - Klik op "Generate token"
3. **Token toevoegen**: Kopieer het token en voeg het toe aan je `.env.local` bestand:
   ```
   VITE_HF_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Werkt het zonder API key?

De app probeert eerst zonder API key te werken met publieke modellen, maar dit is beperkt:
- Sommige modellen vereisen authenticatie
- Rate limits zijn strenger zonder token
- Minder betrouwbare beschikbaarheid

**Aanbeveling**: Gebruik een gratis Hugging Face token voor optimale prestaties en onbeperkte variatie.

### Variatie mechanismen

Elke keer dat je een oefening genereert, wordt automatisch:
- Een willekeurig context topic gekozen passend bij je CEFR-niveau (A1 t/m C2)
- Een unieke variatie seed toegevoegd voor verschillende output
- De temperature parameter gevarieerd (tussen 0.6 en 0.8) voor natuurlijke variatie
- Verschillende voorbeelden en scenario's gegenereerd

Dit zorgt ervoor dat je **oneindig veel variatie** krijgt, zelfs voor dezelfde oefening op hetzelfde niveau!

### Context topics per niveau

De app gebruikt automatisch verschillende context topics per CEFR-niveau:
- **A1**: dagelijkse routine, familie, boodschappen, vrije tijd, het weer, etc.
- **A2**: werk en studie, reizen, hobby's, gezondheid, winkelen, etc.
- **B1**: nieuws en actualiteit, cultuur, milieu, technologie, onderwijs, etc.
- **B2**: politiek, economie, wetenschap, literatuur, filosofie, etc.
- **C1**: abstracte concepten, ethiek, complexe maatschappelijke kwesties, etc.
- **C2**: gespecialiseerde vakgebieden, nuance en subtiliteit, complexe argumentatie, etc.

### Troubleshooting

- **"Geen beschikbaar gratis model gevonden"**: Voeg `VITE_HF_API_KEY` toe aan je `.env.local` voor betere resultaten
- **"Model loading"**: Sommige modellen hebben tijd nodig om te laden. De app probeert automatisch opnieuw na 2-3 seconden
- **Rate limiting**: Als je te veel requests doet, wacht even en probeer het opnieuw. Een gratis Hugging Face token helpt hierbij
