import type { CEFRLevel, CEFRSkill } from '@/types';

export type CEFRDescriptors = Record<
  CEFRLevel,
  {
    label: string; // e.g., "Doorbraak", "Tussenstap"
    description: string; // Korte samenvatting
    skills: Record<CEFRSkill, string>;
  }
>;

export const cefrDescriptors: CEFRDescriptors = {
  A1: {
    label: 'Doorbraak',
    description: 'Basiskennis van de taal, bekende dagelijkse uitdrukkingen en eenvoudige zinnen.',
    skills: {
      listening:
        'Kan vertrouwde woorden en basiszinnen begrijpen over zichzelf, familie en directe omgeving wanneer langzaam en duidelijk wordt gesproken.',
      reading:
        'Kan vertrouwde namen, woorden en zeer eenvoudige zinnen begrijpen, bijvoorbeeld op posters, mededelingen en in catalogi.',
      speakingProduction:
        'Kan eenvoudige uitdrukkingen en zinnen gebruiken om woonomgeving en bekende mensen te beschrijven.',
      speakingInteraction:
        'Kan deelnemen aan een eenvoudig gesprek wanneer de gesprekspartner langzaam spreekt, herhaalt en helpt; kan eenvoudige vragen stellen en beantwoorden over directe behoeften of vertrouwde onderwerpen.',
      writing:
        'Kan een korte eenvoudige ansichtkaart schrijven en persoonlijke gegevens invullen op formulieren (naam, nationaliteit, adres, ...).',
    },
  },
  A2: {
    label: 'Tussenstap',
    description: 'Bekend met veelgebruikte uitdrukkingen en kan gesprekken voeren over alledaagse zaken.',
    skills: {
      listening:
        'Kan zinnen en frequente woorden begrijpen over persoonlijke onderwerpen (familie, winkelen, omgeving, werk) en de hoofdpunten volgen van korte, duidelijke boodschappen en aankondigingen.',
      reading:
        'Kan zeer korte eenvoudige teksten lezen, voorspelbare informatie vinden in advertenties, folders, menu’s en dienstregelingen en korte persoonlijke brieven begrijpen.',
      speakingProduction:
        'Kan uitdrukkingen en zinnen gebruiken om in eenvoudige bewoordingen familie, andere mensen, leefomstandigheden, opleiding en huidige of recente baan te beschrijven.',
      speakingInteraction:
        'Kan communiceren over alledaagse taken die een eenvoudige uitwisseling van informatie vereisen; kan zeer korte sociale gesprekken voeren maar heeft hulp nodig om het gesprek gaande te houden.',
      writing:
        'Kan korte eenvoudige notities en boodschappen schrijven en een zeer eenvoudige persoonlijke brief opstellen (bijvoorbeeld iemand bedanken).',
    },
  },
  B1: {
    label: 'Drempel',
    description: 'Kan eigen mening geven en kan ervaringen, gebeurtenissen, dromen en verwachtingen beschrijven.',
    skills: {
      listening:
        'Kan hoofdpunten begrijpen van duidelijk uitgesproken standaardtaal over vertrouwde onderwerpen op werk, school en vrije tijd; kan veel radio- of tv-programma’s volgen wanneer langzaam en duidelijk wordt gesproken.',
      reading:
        'Kan teksten begrijpen die voornamelijk bestaan uit hoogfrequente, alledaagse of werkgerelateerde taal en de beschrijving van gebeurtenissen, gevoelens en wensen in persoonlijke brieven.',
      speakingProduction:
        'Kan uitingen verbinden om ervaringen, gebeurtenissen, dromen, verwachtingen en ambities te beschrijven; kan kort redenen en verklaringen geven en een verhaal of plot navertellen.',
      speakingInteraction:
        'Kan de meeste situaties aan tijdens reizen in gebieden waar de taal wordt gesproken; kan onvoorbereid deelnemen aan gesprekken over vertrouwde onderwerpen of onderwerpen van persoonlijk belang.',
      writing:
        'Kan een eenvoudige samenhangende tekst schrijven over vertrouwde of persoonlijk belangrijke onderwerpen en persoonlijke brieven waarin ervaringen en indrukken worden beschreven.',
    },
  },
  B2: {
    label: 'Uitzicht',
    description: 'Kan de hoofdlijnen van complexe teksten begrijpen, kan duidelijke, gedetailleerde tekst produceren en kan spontaan aan een gesprek deelnemen.',
    skills: {
      listening:
        'Kan langere betogen en lezingen begrijpen en complexe redeneringen volgen over vertrouwde onderwerpen; begrijpt de meeste nieuws- en actualiteitenprogramma’s en het grootste deel van films in standaardtaal.',
      reading:
        'Kan artikelen en verslagen lezen over actuele problemen waarin schrijvers standpunten innemen en kan eigentijds literair proza begrijpen.',
      speakingProduction:
        'Kan duidelijke, gedetailleerde beschrijvingen geven over uiteenlopende onderwerpen binnen het interessegebied en standpunten toelichten met voor- en nadelen van verschillende opties.',
      speakingInteraction:
        'Kan vloeiend en spontaan deelnemen aan gesprekken met moedertaalsprekers; kan actief deelnemen aan discussies en standpunten uitleggen en ondersteunen.',
      writing:
        'Kan duidelijke, gedetailleerde teksten schrijven over uiteenlopende onderwerpen, informatie structureren en argumenten voor of tegen een standpunt geven; kan brieven schrijven met persoonlijk belang.',
    },
  },
  C1: {
    label: 'Effectieve operationele vaardigheid',
    description: 'Kan zichzelf vloeiend uitdrukken en kan de taal flexibel en efficiënt gebruiken voor sociale, academische en professionele doeleinden.',
    skills: {
      listening:
        'Kan langere betogen begrijpen, ook wanneer structuur impliciet is; kan zonder veel inspanning tv-programma’s en films volgen.',
      reading:
        'Kan lange en complexe feitelijke en literaire teksten begrijpen, diverse stijlen waarderen en gespecialiseerde artikelen of technische instructies begrijpen, zelfs buiten het eigen vakgebied.',
      speakingProduction:
        'Kan duidelijke, gedetailleerde beschrijvingen geven van complexe onderwerpen, subthema’s integreren, specifieke standpunten ontwikkelen en afronden met passende conclusies.',
      speakingInteraction:
        'Kan zich vloeiend en spontaan uitdrukken zonder merkbaar naar woorden te zoeken; gebruikt de taal flexibel en effectief voor sociale en professionele doelen en formuleert ideeën precies.',
      writing:
        'Kan zich in een duidelijke, goed gestructureerde tekst uitdrukken, uitgebreid standpunten uiteenzetten en schrijven in een stijl die is aangepast aan de doelpubliek.',
    },
  },
  C2: {
    label: 'Beheersing',
    description: 'Kan zonder moeite alles begrijpen wat hij/zij hoort of leest en kan zichzelf spontaan, zeer vloeiend, precies en genuanceerd uitdrukken, ook in meer complexe situaties.',
    skills: {
      listening:
        'Kan moeiteloos alle vormen van gesproken taal begrijpen, ook in snel moedertaaltempo, mits er kort tijd is om aan het accent te wennen.',
      reading:
        'Kan moeiteloos vrijwel alle vormen van geschreven taal lezen, inclusief abstracte en complexe teksten zoals handleidingen, specialistische artikelen en literaire werken.',
      speakingProduction:
        'Kan een duidelijke, goedlopende beschrijving of redenering presenteren met een passende stijl en logische structuur zodat hoofdpunten goed overkomen.',
      speakingInteraction:
        'Kan zonder moeite deelnemen aan elke discussie, is vertrouwd met idiomatische uitdrukkingen en spreektaal, kan nuances precies weergeven en zich herpakken wanneer nodig.',
      writing:
        'Kan vloeiende teksten in een gepaste stijl schrijven, complexe brieven, verslagen of artikelen structureren en samenvattingen en kritieken op professionele of literaire werken produceren.',
    },
  },
};
