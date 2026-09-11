/**
 * Ribe FAQ-robot — helt offline (ingen AI-API, ingen mailserver).
 * Svarar på vanliga frågor om samfälligheten och sparar kontaktmeddelanden i localStorage.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ribeChatOfflineMessages';
  var NUDGE_KEY = 'ribeChatNudgeDismissed';

  var CATEGORIES = [
    { id: 'tvatt', label: 'Tvättstuga', emoji: '🧺' },
    { id: 'garage', label: 'Garage & nyckel', emoji: '🚗' },
    { id: 'parkering', label: 'Parkering', emoji: '🅿️' },
    { id: 'avgift', label: 'Avgift', emoji: '💳' },
    { id: 'sopor', label: 'Sopor & återvinning', emoji: '♻️' },
    { id: 'bredband', label: 'Bredband & TV', emoji: '📡' },
    { id: 'varme', label: 'Värme & vatten', emoji: '🔥' },
    { id: 'elbil', label: 'Elbilsladdning', emoji: '⚡' },
    { id: 'sno', label: 'Snöröjning', emoji: '❄️' },
    { id: 'styrelsen', label: 'Kontakta styrelsen', emoji: '✉️' },
    { id: 'agarbyte', label: 'Ägarbyte', emoji: '🏠' },
    { id: 'ovrigt', label: 'Övrigt', emoji: 'ℹ️' }
  ];

  /**
   * Kunskapsbas: keywords matchas mot fri text (svenska).
   * link = sektion-id på index.html (valfritt).
   */
  var FAQS = [
    {
      id: 'tvatt-plats',
      category: 'tvatt',
      title: 'Var finns tvättstugorna?',
      keywords: ['tvättstuga', 'tvattstuga', 'tvätt', 'tvatt', 'träfflokal', 'trafflokal', 'lokal', 'ribegatan 50', 'ribegatan 77', 'ribegatan 216'],
      answer:
        'Vi har tre gemensamma tvättstugor/träfflokaler på Ribegatan 50, 77 och 216.\n\n' +
        'Alla hushåll har nyckel till entrén. Bokning sker med hushållets bokningsbricka.',
      link: 'tvattstuga',
      followUps: ['Hur bokar jag tvätt?', 'Vad kostar tvättpass?', 'Borttappad bricka']
    },
    {
      id: 'tvatt-bokning',
      category: 'tvatt',
      title: 'Hur bokar jag tvätt?',
      keywords: ['boka tvätt', 'bokning', 'bokningslista', 'tvättpass', 'tvattpass', 'pass'],
      answer:
        'Du bokar tvättpass på bokningslistan på anslagstavlan.\n\n' +
        '• Passlängd: 2½ timmar\n' +
        '• Tider: kl. 07–22\n' +
        '• Det går bra att boka flera pass i rad\n\n' +
        'I lokalen finns två tvättmaskiner, torktumlare, centrifug, torkskåp och mangel. Städa efter dig.',
      link: 'tvattstuga',
      followUps: ['Vad kostar tvättpass?', 'Träfflokal regler', 'Borttappad bricka']
    },
    {
      id: 'tvatt-pris',
      category: 'tvatt',
      title: 'Vad kostar tvättpass?',
      keywords: ['kostar tvätt', 'pris tvätt', 'avgift tvätt', '40', 'tvättavgift'],
      answer:
        'Avgift för tvättpass är 40 kr/pass.\n\n' +
        'Debitering sker kvartalsvis via Fastighetsägarna Stockholm AB.\n\n' +
        'Träff/hobbylokal kostar 200 kr/pass (07–22).',
      link: 'tvattstuga',
      followUps: ['Hur bokar jag tvätt?', 'Träfflokal regler']
    },
    {
      id: 'tvatt-bricka',
      category: 'tvatt',
      title: 'Borttappad bokningsbricka',
      keywords: ['bricka', 'bokningsbricka', 'borttappad bricka', 'ny bricka', 'tappat bricka'],
      answer:
        'Bokning av tvättstuga och träfflokal görs med hushållets bokningsbricka.\n\n' +
        'Borttappad bricka medför debitering för att få en ny. Kontakta styrelsen för ersättningsbricka.',
      followUps: ['Kontakta styrelsen', 'Hur bokar jag tvätt?'],
      showContact: true
    },
    {
      id: 'traff-regler',
      category: 'tvatt',
      title: 'Träfflokal – regler',
      keywords: ['träfflokal', 'trafflokal', 'hobbylokal', 'fest', 'övernatta', 'overnatta', 'rökning', 'rokning'],
      answer:
        'Ordningsregler för träfflokalerna (50, 77, 216):\n\n' +
        '• Barn får inte nyttja lokalen utan vuxen\n' +
        '• Ingen störande ljud efter kl. 22\n' +
        '• Ej bokningsbar/användning 00–07\n' +
        '• Rökning förbjuden\n' +
        '• Övernattning absolut förbjuden\n' +
        '• Städa, släck ljus/spis, lås efter dig\n\n' +
        'Avgift: 200 kr/pass (07–22).',
      link: 'tvattstuga',
      followUps: ['Vad kostar tvättpass?', 'Kontakta styrelsen']
    },
    {
      id: 'garage-allmant',
      category: 'garage',
      title: 'Garage – allmän info',
      keywords: ['garage', 'bilplats', 'motorvärmare', 'motorvarmare', 'eluttag garage'],
      answer:
        'Samfälligheten äger två garage. Varje hushåll disponerar en bilplats.\n\n' +
        '• Eluttag för motorvärmare: max 1100 W\n' +
        '• Tidur: högst 3 timmars inkoppling\n' +
        '• Ej upplag (brandfara) – däck får förvaras vid platsen\n\n' +
        'Felanmälan: garageansvarig (uppgifter i garaget och på hemsidan).',
      link: 'garage',
      followUps: ['Extra garageplats', 'Garagenyckel / kort', 'Laddning elbil']
    },
    {
      id: 'garage-extra',
      category: 'garage',
      title: 'Extra garageplats',
      keywords: ['extra garage', 'extra plats', 'hyra garage', 'kölista', 'kolista', 'uthyrning garage', 'garageplats'],
      answer:
        'Vill du ha extra garageplats?\n\n' +
        '1. Anmäl intresse till styrelsen (formulär, e-post eller brevlådan Ribegatan 77)\n' +
        '2. Tilldelning sker via kölista\n' +
        '3. Debitering läggs på avgiftsfakturan\n\n' +
        'Boende kan också hyra ut sin egen plats till annan boende – då sköter ni debitering själva.',
      link: 'extragarage',
      followUps: ['Kontakta styrelsen', 'Garagenyckel / kort'],
      showContact: true
    },
    {
      id: 'garage-nyckel',
      category: 'garage',
      title: 'Garagenyckel / kort',
      keywords: [
        'garagekort',
        'garage kort',
        'garagenyckel',
        'garage nyckel',
        'nyckel garage',
        'fjärrkontroll',
        'fjarrkontroll',
        'passerkort',
        'extra nyckel',
        'tappat nyckel',
        'borttappad nyckel'
      ],
      answer:
        'Vid ägarbyte lämnar säljaren över:\n' +
        '• Garagenyckel till garagehuset\n' +
        '• Fjärrkontroll\n' +
        '• Områdeslokalnyckel\n' +
        '• Bokningsbricka för tvätt/träfflokal\n\n' +
        'Garagenyckeln passar också till Molok-sopbehållarna.\n\n' +
        'Behöver du ersättningsnyckel, fjärrkontroll eller bricka? Kontakta styrelsen (nyckelansvarig).',
      followUps: ['Extra garageplats', 'Sopor / Molok', 'Kontakta styrelsen'],
      showContact: true
    },
    {
      id: 'parkering-besok',
      category: 'parkering',
      title: 'Besöksparkering',
      keywords: ['parkering', 'besöksparkering', 'besoksparkering', 'gästparkering', 'gastparkering', 'apcoa', 'flow', 'zon'],
      answer:
        'Besöksparkering sköts via APCOA FLOW-appen.\n\n' +
        '• Zon: APCOA FLOW 3897 – RIBE SFF BESÖKSPARKERING, STOCKHOLM\n' +
        '• Debitering per timme eller 24-timmarsperiod (se appen)\n' +
        '• Serviceavgift kan tillkomma\n\n' +
        'Skylt med instruktion finns vid besöksparkeringen.\n' +
        'På huvudgatan Ribegatan gäller kommunens regler.',
      link: 'besoksparkering',
      followUps: ['Felparkering / Apcoa', 'Garage – allmän info']
    },
    {
      id: 'parkering-fel',
      category: 'parkering',
      title: 'Felparkering / Apcoa',
      keywords: ['felparkering', 'felanmälan parkering', 'apcoa', '0771', 'bevakning'],
      answer:
        'Apcoa sköter parkeringsbevakning av besöksplatser och vägar inom området.\n\n' +
        'Felanmälan: 0771-401020\n\n' +
        'Nummer finns också på skyltar vid besöksparkeringen.',
      link: 'parkeringsbolag',
      followUps: ['Besöksparkering', 'Kontakta styrelsen']
    },
    {
      id: 'biltrafik',
      category: 'parkering',
      title: 'Biltrafik i området',
      keywords: ['biltrafik', 'gångväg', 'gangvag', 'hastighet', '30 km', 'lastning'],
      answer:
        'Undvik bil på gångvägar. Kort stopp för lastning: max ca 5 minuter enligt områdesregler.\n\n' +
        'Ribegatan/Jyllandsgatan: 30 km/h.',
      followUps: ['Besöksparkering', 'Garage – allmän info']
    },
    {
      id: 'avgift-allmant',
      category: 'avgift',
      title: 'Samfällighetsavgift',
      keywords: ['avgift', 'månadsavgift', 'manadsavgift', 'faktura', 'avi', 'betala', 'redisa', 'autogiro', 'e-faktura'],
      answer:
        'Avgiften betalas månadsvis i förskott (sista bankdag).\n\n' +
        'Den kan innehålla samfällighetsavgift, preliminär värme/vatten samt laddstation vid behov.\n\n' +
        '• E-faktura/autogiro: medlem@redisa.se\n' +
        '• Pappersavi via Redisa: 50 kr aviseringsavgift\n' +
        '• Frågor om avier: Redisa 010-491 02 73 (uppge Ribe Samfällighet)',
      link: 'avgift',
      followUps: ['Värme & vatten', 'Kontakta styrelsen']
    },
    {
      id: 'sopor-molok',
      category: 'sopor',
      title: 'Sopor / Molok',
      keywords: ['sopor', 'sophämtning', 'sophamtning', 'molok', 'sopbehållare', 'sopbehallare', 'hushållssopor', 'hushallssopor'],
      answer:
        'Hushållssopor läggs i Molok-behållare längs Ribegatan (vid garagen).\n\n' +
        '• Lås: din garagenyckel passar\n' +
        '• Tömning: ca 1 gång/vecka\n' +
        '• Utebliven tömning: 08-508 465 40\n\n' +
        'Endast hushållssopor i Molok. Förpackningar → återvinningsstation.\n' +
        'Bruna kärl är för matavfall – lägg inte vanlig sopa där.',
      followUps: ['Återvinning', 'Garagenyckel / kort', 'Matavfall']
    },
    {
      id: 'sopor-mat',
      category: 'sopor',
      title: 'Matavfall',
      keywords: ['matavfall', 'bruna kärl', 'bruna karl', 'kompost', 'mat'],
      answer:
        'Bruna matavfallskärl står vid soporna.\n\n' +
        'Lägg inte vanlig hushållssopa i matavfallet.\n' +
        'Korgar/påsar kan fås via styrelsen vid behov.',
      followUps: ['Sopor / Molok', 'Kontakta styrelsen']
    },
    {
      id: 'atervinning',
      category: 'sopor',
      title: 'Återvinning',
      keywords: ['återvinning', 'atervinning', 'förpackning', 'forpackning', 'glas', 'tidning', 'grovsopor', 'jyllandsgatan'],
      answer:
        'Återvinningsstation finns vid Jyllandsgatan (hållplats 517).\n\n' +
        'Där kan du lämna bl.a. batterier, hårdplast, tidningar, papper, metall samt ofärgat/färgat glas.\n\n' +
        'Grovsopor: husägarens ansvar till kommunens anläggningar. Sophämtning debiteras på vikt.',
      followUps: ['Sopor / Molok', 'Kontakta styrelsen']
    },
    {
      id: 'bredband',
      category: 'bredband',
      title: 'Bredband',
      keywords: ['bredband', 'internet', 'wifi', 'wi-fi', 'com hem', 'comhem', 'modem', '50 mb'],
      answer:
        'Gruppavtal med Com Hem ingår i samfällighetsavgiften (basnivå, t.ex. 50 Mb).\n\n' +
        'Anslutning via TV-uttag. Kostnadsfritt modem med Wi‑Fi ingår enligt avtalet.\n' +
        'Kontakta Com Hem och ange att ni har gruppavtal. Uppgradering: betala mellanskillnad själv.',
      link: 'bredband',
      followUps: ['Kabel-TV', 'Kontakta styrelsen']
    },
    {
      id: 'tv',
      category: 'bredband',
      title: 'Kabel-TV / parabol',
      keywords: ['tv', 'kabel-tv', 'kabeltv', 'parabol', 'com hem', 'felanmälan tv'],
      answer:
        'Com Hem-basutbud ingår i avgiften.\n\n' +
        'Parabol får inte kopplas in i kabelnätet (risk för störningar – kan debiteras husägare).\n' +
        'Parabol endast på egen egendom, inte på samfällighetens bodar.\n\n' +
        'Felanmälan Com Hem: 0771-550000 eller comhem.se',
      link: 'tv',
      followUps: ['Bredband', 'Kontakta styrelsen']
    },
    {
      id: 'varme',
      category: 'varme',
      title: 'Värme & vatten',
      keywords: ['värme', 'varme', 'vatten', 'techem', 'mätare', 'matare', 'fjärrvärme', 'fjarrvarme', 'radiator'],
      answer:
        'Värme/vatten mäts via Techem (fjärravläsning).\n\n' +
        '• Portal: tenantportal.techem.se\n' +
        '• Techem kundservice: 010-202 28 00 (vard. 9–13)\n' +
        '• Värme avstängd vid ute > ca 17 °C; start när < ca 14 °C i 6 h\n\n' +
        'Rör inte strypningar i mätarskåp utan godkännande – de balanserar hela systemet.',
      link: 'varme',
      followUps: ['Samfällighetsavgift', 'Kontakta styrelsen']
    },
    {
      id: 'elbil',
      category: 'elbil',
      title: 'Laddning elbil',
      keywords: ['elbil', 'laddning', 'laddare', 'laddbox', 'laddstation', '16a', 'kwh'],
      answer:
        'Vid installation av elbils laddare:\n\n' +
        '1. Kontakta styrelsen för godkännande (rätt laddare för anläggningen)\n' +
        '2. Installation av föreningens godkända elektriker\n' +
        '3. Ladduttag max 16A, Typ2 m.m.\n\n' +
        'Effekt mäts årligen (31 aug). Preliminär månadsavgift justeras mot faktisk förbrukning.',
      link: 'laddning-elbil',
      followUps: ['Kontakta styrelsen', 'Garage – allmän info'],
      showContact: true
    },
    {
      id: 'sno',
      category: 'sno',
      title: 'Snöröjning',
      keywords: ['snö', 'sno', 'snöröjning', 'snorojning', 'halka', 'sand', 'vinter'],
      answer:
        'Inom samfälligheten: Raines Maskin & Entreprenad.\n' +
        'Ribegatan (kommunens gata): Stockholms Gatukontor.\n\n' +
        'Röjning/halka vid ca 5–10 cm snö – ej under pågående snöfall.\n\n' +
        'Boende förväntas komplettera (entré, bodar, sandlådor finns). Kontakta styrelsen vid frågor.',
      link: 'snorojning',
      followUps: ['Kontakta styrelsen']
    },
    {
      id: 'styrelsen',
      category: 'styrelsen',
      title: 'Kontakta styrelsen',
      keywords: [
        'styrelse',
        'styrelsen',
        'kontakt',
        'mail',
        'e-post',
        'epost',
        'email',
        'mailadress',
        'mejladress',
        'e-postadress',
        'epostadress',
        'brevlåda',
        'brevlada',
        'mejla',
        'skicka mail',
        'skicka mejl'
      ],
      answer: '',
      openContact: true,
      followUps: []
    },
    {
      id: 'agarbyte',
      category: 'agarbyte',
      title: 'Ägarbyte',
      keywords: ['ägarbyte', 'agarbyte', 'sälja', 'salja', 'köpa', 'kopa', 'flytta', 'mäklare', 'maklare', 'tillträde'],
      answer:
        'Vid ägarbyte: meddela styrelsen namn + personnummer, tillträdesdag och köpehandling.\n\n' +
        'Blankett finns under Blanketter & dokument på hemsidan.\n\n' +
        'Avgifter följer fastigheten – ny ägare ansvarar för obetalda avgifter.\n' +
        'Säljaren lämnar över garagenyckel, fjärrkontroll, områdeslokalnyckel och bokningsbricka.',
      link: 'arkiv',
      followUps: ['Garagenyckel / kort', 'Kontakta styrelsen'],
      showContact: true
    },
    {
      id: 'bygglov',
      category: 'ovrigt',
      title: 'Bygglov',
      keywords: ['bygglov', 'altan', 'friggebod', 'byggnation', 'ombyggnad'],
      answer:
        'Bygglov/bygganmälan följer Stockholms stads regler.\n\n' +
        'Exempel: altan över 1,2 m kan kräva lov; friggebod har mått/avståndsregler.\n' +
        'Kontrollera alltid aktuella regler hos Stockholms stad innan du bygger.',
      link: 'bygglov',
      followUps: ['Kontakta styrelsen']
    },
    {
      id: 'formaner',
      category: 'ovrigt',
      title: 'Förmåner',
      keywords: ['förmån', 'forman', 'rabatt', 'fastighetsägarna', 'fredells'],
      answer:
        'Medlemskap i Fastighetsägarna ger rabatter hos vissa leverantörer.\n' +
        'Medlemsnummer (enligt hemsidan): 11546.\n\n' +
        'Se sektionen Förmåner för mer information.',
      link: 'formaner',
      followUps: ['Kontakta styrelsen']
    },
    {
      id: 'kalender-nasta',
      category: 'ovrigt',
      title: 'När är nästa möte?',
      keywords: [
        'nästa möte',
        'nasta mote',
        'möte',
        'mote',
        'årsstämma',
        'arsstamma',
        'årstämma',
        'arstamma',
        'stämma',
        'stamma',
        'kalender',
        'när är',
        'nar ar',
        'kommande',
        'arbetsdag',
        'städdag',
        'staddag',
        'vårstäddag',
        'höststäddag'
      ],
      answer:
        'Se kalendern på hemsidan för aktuella datum.\n\n' +
        'Fråga gärna: ”När är nästa möte?” så läser jag kalendern direkt.',
      link: 'kalender',
      followUps: ['När är nästa möte?', 'Motion till årsstämman']
    },
    {
      id: 'motion',
      category: 'ovrigt',
      title: 'Motion till årsstämman',
      keywords: ['motion', 'motioner', 'årsstämma motion', '30 september', 'lämna motion'],
      answer:
        'Motioner till årsstämman ska vara styrelsen tillhanda senast 30 september.\n\n' +
        'Ordinarie årsstämma hålls under november–december enligt stadgarna. Kallelse skickas senast 14 dagar före.',
      link: 'foreningen',
      followUps: ['När är nästa möte?', 'Kontakta styrelsen'],
      showContact: true
    },
    {
      id: 'boappa',
      category: 'ovrigt',
      title: 'boAppa',
      keywords: ['boappa', 'bo appa', 'protokoll', 'ribe-info', 'ribeinfo', 'kallelse'],
      answer:
        'Föreningen använder boAppa för information som inte ligger öppet på hemsidan, t.ex. styrelseprotokoll, årsstämmoprotokoll, Ribe-info och kallelse till årsstämma.\n\n' +
        'Ansök som medlem: https://boappa.se/ribe-samf-kista',
      link: 'allmant',
      followUps: ['När är nästa möte?', 'Kontakta styrelsen']
    },
    {
      id: 'redisa',
      category: 'avgift',
      title: 'Redisa / ekonomisk förvaltare',
      keywords: ['redisa', 'ekonomisk förvaltare', 'avier', 'e-faktura', 'autogiro', 'medlem@redisa'],
      answer:
        'Ekonomisk förvaltare är Redisa (avier, redovisning).\n\n' +
        '• Kontakt: medlem@redisa.se\n' +
        '• Tel vid frågor om avier: 010-491 02 73 (uppge Ribe Samfällighet)\n' +
        '• Pappersavi: 50 kr per aviseringstillfälle\n' +
        '• Autogiro: anmäl till Redisa när det är registrerat i banken',
      link: 'ekonomisk-forvaltare',
      followUps: ['Samfällighetsavgift', 'Ägarbyte']
    },
    {
      id: 'techem',
      category: 'varme',
      title: 'Techem / värmemätning',
      keywords: ['techem', 'tenantportal', 'värmemätning', 'fjärravläsning', 'kundservice techem'],
      answer:
        'Värme/vatten mäts via Techem med fjärravläsning.\n\n' +
        '• Portal: tenantportal.techem.se\n' +
        '• Kundservice: 010-202 28 00 (vardagar 9–13)\n' +
        '• E-post: kundservice@techem.se',
      link: 'varme',
      followUps: ['Värme & vatten', 'Samfällighetsavgift']
    },
    {
      id: 'apcoa-anmalan',
      category: 'parkering',
      title: 'Anmäl felparkering till APCOA',
      keywords: ['felparkering', 'anmäla parkering', 'apcoa anmälan', 'okynnes', '0771-401020'],
      answer:
        'Vid felparkering i området:\n\n' +
        '1. Anteckna registreringsnummer och exakt adress\n' +
        '2. Ring APCOA 0771-401020\n' +
        '3. Välj alternativ 1 i knappvalet\n' +
        '4. Lämna uppgifterna om fordonet',
      link: 'parkeringsbolag',
      followUps: ['Besöksparkering', 'Kontakta styrelsen']
    },
    {
      id: 'indelning',
      category: 'ovrigt',
      title: 'Områdesindelning',
      keywords: ['område', 'indelning', 'områdesansvarig', 'omradesansvarig', 'område 1', 'område 2', 'område 3'],
      answer:
        'Kvarteret är indelat i tre områden:\n\n' +
        '• Område 1: Ribegatan 6–118 (jämna nummer)\n' +
        '• Område 2: Ribegatan 120–238 (jämna nummer)\n' +
        '• Område 3: Ribegatan 3–99 (ojämna nummer)\n\n' +
        'Varje område har områdesansvarig som fördelar arbete på arbets-/städdagar.',
      link: 'indelning',
      followUps: ['När är nästa möte?', 'Kontakta styrelsen']
    },
    {
      id: 'facebook',
      category: 'ovrigt',
      title: 'Facebook-gruppen',
      keywords: [
        'facebook',
        'facebookgrupp',
        'facebook grupp',
        'fb',
        'fb grupp',
        'fb-grupp',
        'gruppen',
        'vart är facebook',
        'var är facebook',
        'länk facebook',
        'grannsamribe'
      ],
      answer:
        'Grannsamverkans Facebook-grupp för Ribebor finns här:\n\n' +
        'https://www.facebook.com/groups/GrannsamRibe\n\n' +
        'Alternativ länk: https://www.facebook.com/groups/268894909946188/\n\n' +
        'Alla Ribebor är välkomna. Där delas händelser i området, polisinfo och månadsbrev.',
      link: 'grannsamverkan',
      followUps: ['Grannsamverkan', 'Kontakta styrelsen']
    },
    {
      id: 'grannsamverkan',
      category: 'ovrigt',
      title: 'Grannsamverkan',
      keywords: ['grannsamverkan', 'kontaktombud', 'trygghet'],
      answer:
        'Grannsamverkan förebygger brott och ökar tryggheten. Det finns sex kontaktombud i området.\n\n' +
        'Facebook-grupp: https://www.facebook.com/groups/GrannsamRibe',
      link: 'grannsamverkan',
      followUps: ['Facebook-gruppen', 'Kontakta styrelsen']
    },
    {
      id: 'hjartstartare',
      category: 'ovrigt',
      title: 'Hjärtstartare',
      keywords: ['hjärtstartare', 'hjartstartare', 'defibrillator', 'aed', 'akut'],
      answer:
        'Det finns hjärtstartare i området (ansvar finns i styrelsen).\n\n' +
        'Vid akut sjukdom: ring 112. Fråga gärna styrelsen var närmaste hjärtstartare sitter.',
      followUps: ['Kontakta styrelsen']
    }
  ];

  var MAIN_ACTIONS = [
    { label: 'Kalender & nästa möte', q: 'När är nästa möte?' },
    { label: 'Tvättstuga & träfflokal', q: 'tvättstuga' },
    { label: 'Garage & nyckel', q: 'garage' },
    { label: 'Parkering', q: 'besöksparkering' },
    { label: 'Avgift', q: 'samfällighetsavgift' },
    { label: 'Sopor & återvinning', q: 'sopor' },
    { label: 'Kontakta styrelsen', q: '__contact__', primary: true }
  ];

  var siteIndex = null;
  var MONTH_MAP = {
    jan: 1, januari: 1,
    feb: 2, februari: 2,
    mar: 3, mars: 3,
    apr: 4, april: 4,
    maj: 5,
    jun: 6, juni: 6,
    jul: 7, juli: 7,
    aug: 8, augusti: 8,
    sep: 9, sept: 9, september: 9,
    okt: 10, oktober: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };

  function cleanText(str) {
    return String(str || '')
      .replace(/\s+/g, ' ')
      .replace(/\u00a0/g, ' ')
      .trim();
  }

  function snippetText(text, maxLen) {
    var t = cleanText(text);
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen - 1).replace(/\s+\S*$/, '') + '…';
  }

  function parseLooseDate(text, fallbackYear) {
    var n = normalize(text);
    var year = fallbackYear || new Date().getFullYear();
    var yMatch = n.match(/\b(20\d{2})\b/);
    if (yMatch) year = parseInt(yMatch[1], 10);

    // "28 november" / "3 dec"
    var m1 = n.match(/\b(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|okt|nov|dec)\b/);
    if (m1) {
      return { day: parseInt(m1[1], 10), month: MONTH_MAP[m1[2]], year: year };
    }
    // "november 28"
    var m2 = n.match(/\b(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|okt|nov|dec)\s+(\d{1,2})\b/);
    if (m2) {
      return { day: parseInt(m2[2], 10), month: MONTH_MAP[m2[1]], year: year };
    }
    return null;
  }

  function toDateObj(parts) {
    if (!parts || !parts.day || !parts.month || !parts.year) return null;
    return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  }

  function formatSvDate(d) {
    try {
      return d.toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function extractCalendarEvents() {
    var events = [];
    var root = document.getElementById('kalender');
    if (!root) return events;

    var year = new Date().getFullYear();
    var yearMatch = cleanText(root.textContent).match(/20\d{2}/g);
    if (yearMatch && yearMatch.length) {
      year = parseInt(yearMatch[yearMatch.length - 1], 10);
    }

    root.querySelectorAll('h4').forEach(function (titleEl) {
      var title = cleanText(titleEl.textContent);
      if (!title || title.length > 80) return;
      if (events.some(function (e) { return e.title === title; })) return;

      var row = titleEl.parentElement;
      while (row && row !== root && !(row.querySelector && row.querySelector('span') && row.contains(titleEl))) {
        row = row.parentElement;
      }
      if (!row || row === root) row = titleEl.parentElement && titleEl.parentElement.parentElement;
      if (!row) return;

      var spans = row.querySelectorAll('span');
      var monthText = spans[0] ? cleanText(spans[0].textContent) : '';
      var dayText = spans[1] ? cleanText(spans[1].textContent) : '';
      var restText = spans[2] ? cleanText(spans[2].textContent) : '';

      var timeText = '';
      var maybeTime = cleanText(row.textContent).match(/\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/);
      if (maybeTime) timeText = maybeTime[0];

      var yFromRest = restText.match(/20\d{2}/);
      var useYear = yFromRest ? parseInt(yFromRest[0], 10) : year;
      var month = MONTH_MAP[normalize(monthText)];
      var day = parseInt(dayText, 10);
      if (!month || !day) return;

      var date = new Date(useYear, month - 1, day, 12, 0, 0, 0);
      events.push({
        title: title,
        date: date,
        time: timeText,
        source: 'kalender',
        link: 'kalender',
        text: title + ' ' + formatSvDate(date) + (timeText ? ' ' + timeText : '')
      });
    });

    return events;
  }

  function extractImportantDates() {
    var items = [];
    document.querySelectorAll('.date-card').forEach(function (card) {
      var dateEl = card.querySelector('h4');
      var nameEl = card.querySelector('p');
      if (!dateEl || !nameEl) return;
      var dateText = cleanText(dateEl.textContent);
      var name = cleanText(nameEl.textContent);
      if (!name) return;
      var parsed = parseLooseDate(dateText, new Date().getFullYear());
      var date = toDateObj(parsed);
      items.push({
        title: name,
        dateText: dateText,
        date: date,
        source: 'viktiga-datum',
        link: 'home',
        text: name + ' — ' + dateText
      });
    });
    return items;
  }

  function buildSiteIndex() {
    var chunks = [];
    var seen = {};

    function addChunk(item) {
      var key = (item.link || '') + '|' + normalize(item.title).slice(0, 40) + '|' + normalize(item.text).slice(0, 80);
      if (seen[key]) return;
      seen[key] = true;
      item.norm = normalize(item.title + ' ' + item.text);
      chunks.push(item);
    }

    // Calendar + important dates
    extractCalendarEvents().forEach(function (ev) {
      addChunk({
        type: 'event',
        title: ev.title,
        text: ev.text + '. Finns i kalendern på hemsidan.',
        link: 'kalender',
        date: ev.date,
        time: ev.time,
        boost: 8
      });
    });

    extractImportantDates().forEach(function (ev) {
      addChunk({
        type: 'event',
        title: ev.title,
        text: ev.text + ' (viktiga datum för verksamhetsåret).',
        link: 'home',
        date: ev.date,
        boost: 6
      });
    });

    // All main page sections / blocks with ids
    var nodes = document.querySelectorAll(
      'section[id], #kalender, #welcome, #allmant-preview, #bilder-galleri, #byggstart, #bygge-lekplats, #sjalvbyggeriet'
    );

    nodes.forEach(function (node) {
      if (!node || node.closest('#ribe-chatbot-root')) return;
      var id = node.id || '';
      if (!id || id.indexOf('statute-') === 0) return;
      if (id === 'ribeChatMessages' || id === 'ribeChatMenu') return;

      var heading =
        (node.querySelector('h2, h3, .section-header h2') &&
          cleanText(node.querySelector('h2, h3, .section-header h2').textContent)) ||
        id;

      var clone = node.cloneNode(true);
      // Remove nested large sections to avoid giant duplicates where possible
      clone.querySelectorAll('script, style, noscript, nav, #ribe-chatbot-root').forEach(function (el) {
        el.remove();
      });

      var full = cleanText(clone.innerText || clone.textContent || '');
      if (full.length < 40) return;

      // Split into paragraph-ish chunks for better matching
      var parts = full
        .split(/\n+/)
        .map(cleanText)
        .filter(function (p) {
          return p.length >= 40 && p.length < 900;
        });

      if (!parts.length) {
        addChunk({
          type: 'section',
          title: heading,
          text: snippetText(full, 420),
          link: id,
          boost: 2
        });
        return;
      }

      // Cap chunks per section to keep index lean
      parts.slice(0, 12).forEach(function (p, idx) {
        addChunk({
          type: 'section',
          title: heading + (idx ? '' : ''),
          text: p,
          link: id,
          boost: idx === 0 ? 3 : 1
        });
      });
    });

    // Guide cards titles/meta (quick topics)
    document.querySelectorAll('.guide-card').forEach(function (card) {
      var title = cleanText((card.querySelector('.guide-card__title') || {}).textContent || '');
      var meta = cleanText((card.querySelector('.guide-card__meta') || {}).textContent || '');
      var href = card.getAttribute('href') || '';
      var link = href.indexOf('#') === 0 ? href.slice(1) : '';
      if (!title) return;
      addChunk({
        type: 'topic',
        title: title,
        text: meta || title,
        link: link || undefined,
        boost: 4
      });
    });

    // Externa länkar på sidan (Facebook, boAppa, m.m.)
    document.querySelectorAll('a[href^="http"]').forEach(function (a) {
      if (a.closest('#ribe-chatbot-root')) return;
      var href = a.getAttribute('href') || '';
      if (!href || href.indexOf('localhost') !== -1) return;
      var label = cleanText(a.getAttribute('aria-label') || a.textContent || href);
      var section = a.closest('section[id], #kalender, #allmant-preview');
      var sectionId = section && section.id ? section.id : undefined;
      var kind = 'länk';
      if (/facebook\.com/i.test(href)) kind = 'Facebook';
      else if (/boappa\.se/i.test(href)) kind = 'boAppa';
      else if (/techem/i.test(href)) kind = 'Techem';
      else if (/mailto:/i.test(href)) return;

      addChunk({
        type: 'link',
        title: kind + ': ' + (label.length > 60 ? kind : label),
        text: label + ' — ' + href,
        url: href,
        link: sectionId,
        boost: /facebook|boappa/i.test(href) ? 12 : 5
      });
    });

    siteIndex = chunks;
    return chunks;
  }

  function ensureSiteIndex() {
    if (!siteIndex || !siteIndex.length) buildSiteIndex();
    return siteIndex || [];
  }

  function scoreSiteChunk(chunk, queryNorm, tokens) {
    var score = chunk.boost || 0;
    var hay = chunk.norm || '';
    if (!hay) return 0;

    if (hay.indexOf(queryNorm) !== -1) score += 40;

    tokens.forEach(function (t) {
      if (t.length < 3) return;
      if (hay.indexOf(t) !== -1) score += 6;
      if (normalize(chunk.title).indexOf(t) !== -1) score += 8;
    });

    // Meeting/calendar intent boost
    if (/(mote|stamma|arsstamma|kalender|datum|nar|nasta|kommande|arbetsdag|staddag)/.test(queryNorm)) {
      if (chunk.type === 'event') score += 25;
      if (/(stamma|arsstamma|arbetsdag|staddag|kalender|motion)/.test(hay)) score += 10;
    }

    // Link intent boost (facebook, boappa, etc.)
    if (/(facebook|fb|boappa|lank|grupp)/.test(queryNorm)) {
      if (chunk.type === 'link') score += 30;
      if (/facebook/.test(queryNorm) && /facebook/.test(hay)) score += 40;
      if (/boappa/.test(queryNorm) && /boappa/.test(hay)) score += 40;
    }

    return score;
  }

  function searchSite(query, limit) {
    var q = normalize(query);
    if (!q) return [];
    var tokens = q.split(' ').filter(function (t) {
      return t.length > 2;
    });
    var ranked = ensureSiteIndex()
      .map(function (chunk) {
        return { chunk: chunk, score: scoreSiteChunk(chunk, q, tokens) };
      })
      .filter(function (x) {
        return x.score >= 14;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });
    return ranked.slice(0, limit || 4);
  }

  function getUpcomingEvents() {
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var events = extractCalendarEvents().concat(
      extractImportantDates().filter(function (e) {
        return e.date;
      })
    );

    // Prefer calendar entries; merge titles that only differ by year ("Årsstämma" / "Årsstämma 2026")
    var byKey = {};
    events.forEach(function (ev) {
      if (!ev.date) return;
      var key = normalize(ev.title).replace(/\b20\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
      var existing = byKey[key];
      if (!existing) {
        byKey[key] = ev;
        return;
      }
      // Prefer kalender-source and richer time info
      if (ev.source === 'kalender' && existing.source !== 'kalender') {
        byKey[key] = ev;
      } else if (ev.source === existing.source) {
        if ((ev.time && !existing.time) || ev.date.getTime() === existing.date.getTime()) {
          if (ev.time && !existing.time) byKey[key] = ev;
        }
      }
    });

    return Object.keys(byKey)
      .map(function (k) {
        return byKey[k];
      })
      .filter(function (ev) {
        return ev.date && ev.date >= now;
      })
      .sort(function (a, b) {
        return a.date - b.date;
      });
  }

  function eventKind(titleNorm) {
    if (/(arsstamma|arstamma|stamma)/.test(titleNorm) && !/motion/.test(titleNorm)) return 'stamma';
    if (/(staddag|varstaddag|hoststaddag)/.test(titleNorm)) return 'staddag';
    if (/arbetsdag/.test(titleNorm)) return 'arbetsdag';
    if (/motion|sista dag/.test(titleNorm)) return 'motion';
    return 'other';
  }

  function matchEventsToQuery(events, queryNorm) {
    var wantsStamma = /(arsstamma|arstamma|stamma)/.test(queryNorm) && !/motion/.test(queryNorm);
    var wantsStaddag = /(staddag|stadag|vardag|hoststadda)/.test(queryNorm);
    var wantsArbetsdag = /arbetsdag/.test(queryNorm);

    if (wantsStamma) {
      return events.filter(function (ev) {
        return eventKind(normalize(ev.title)) === 'stamma';
      });
    }
    if (wantsStaddag) {
      return events.filter(function (ev) {
        return eventKind(normalize(ev.title)) === 'staddag';
      });
    }
    if (wantsArbetsdag) {
      return events.filter(function (ev) {
        return eventKind(normalize(ev.title)) === 'arbetsdag';
      });
    }

    // Soft title overlap
    return events.filter(function (ev) {
      var t = normalize(ev.title).replace(/\b20\d{2}\b/g, '').trim();
      if (!t) return false;
      if (queryNorm.indexOf(t) !== -1) return true;
      return t.split(' ').some(function (w) {
        return w.length > 4 && queryNorm.indexOf(w) !== -1;
      });
    });
  }

  function goToKalender() {
    var id = 'kalender';
    var el = document.getElementById(id);
    if (window.revealSection) {
      try {
        window.revealSection('#' + id);
      } catch (e) {}
    }
    // Kalendern ligger under grannsamverkan/välkommen – se till att den syns
    var section = el && el.closest('section');
    if (section) {
      section.classList.remove('hidden-section');
      section.classList.add('show-section');
    }
    if (el) {
      setTimeout(function () {
        var top = el.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: top, behavior: 'smooth' });
        try {
          history.pushState(null, null, '#kalender');
        } catch (e2) {}
      }, 60);
      return true;
    }
    window.location.hash = 'kalender';
    return false;
  }

  function answerCalendarQuestion(query) {
    var n = normalize(query);
    var upcoming = getUpcomingEvents();
    if (!upcoming.length) return null;

    // "visa/öppna kalender" → scrolla till kalendern på sidan (hanteras separat)
    if (/^(visa|oppna|öppna)?\s*(hela\s+)?kalendern?$/.test(n) || n === 'visa kalender' || n === 'oppna kalender' || n === 'öppna kalendern') {
      return { gotoKalender: true };
    }

    var isCalIntent = /(kalender|datum|arsstamma|arstamma|stamma|arbetsdag|staddag|mote|nasta|kommande|nar ar|nar sker|nar halls)/.test(n);
    if (!isCalIntent) return null;

    var wantsMeeting =
      /(mote|stamma|arsstamma|arstamma|staddag|arbetsdag|nasta mote|nasta stamma)/.test(n) &&
      !/(motion|lamna motion)/.test(n);

    var meetingLike = upcoming.filter(function (ev) {
      var kind = eventKind(normalize(ev.title));
      return kind === 'stamma' || kind === 'staddag' || kind === 'arbetsdag' || ev.source === 'kalender';
    });

    var specific = matchEventsToQuery(upcoming, n);
    var pool = specific.length ? specific : wantsMeeting && meetingLike.length ? meetingLike : upcoming;
    if (!pool.length) pool = upcoming;

    var focus = pool;
    var next = focus[0];
    var lines = [];
    var askingSpecific = specific.length > 0;

    if (askingSpecific) {
      var label =
        eventKind(normalize(next.title)) === 'stamma'
          ? 'Nästa årsstämma'
          : 'Nästa: ' + escapeHtml(next.title);
      if (eventKind(normalize(next.title)) === 'stamma') {
        lines.push(
          '<strong>Nästa årsstämma:</strong><br>' +
            escapeHtml(next.title) +
            '<br>' +
            formatSvDate(next.date) +
            (next.time ? '<br>Tid: ' + escapeHtml(next.time) : '')
        );
      } else {
        lines.push(
          '<strong>' +
            label +
            '</strong><br>' +
            formatSvDate(next.date) +
            (next.time ? '<br>Tid: ' + escapeHtml(next.time) : '')
        );
      }
    } else if (wantsMeeting || /(nasta mote|nasta stamma|nar ar nasta)/.test(n)) {
      lines.push(
        '<strong>Nästa i kalendern:</strong> ' +
          escapeHtml(next.title) +
          '<br>' +
          formatSvDate(next.date) +
          (next.time ? '<br>Tid: ' + escapeHtml(next.time) : '')
      );
      if (focus.length > 1) {
        lines.push('<br><strong>Fler kommande händelser:</strong>');
        focus.slice(1, 5).forEach(function (ev, idx) {
          lines.push(
            idx +
              2 +
              '. <strong>' +
              escapeHtml(ev.title) +
              '</strong> — ' +
              formatSvDate(ev.date) +
              (ev.time ? ' · ' + escapeHtml(ev.time) : '')
          );
        });
      }
    } else {
      lines.push('<strong>Kommande händelser från hemsidan:</strong>');
      focus.slice(0, 6).forEach(function (ev, idx) {
        lines.push(
          idx +
            1 +
            '. <strong>' +
            escapeHtml(ev.title) +
            '</strong> — ' +
            formatSvDate(ev.date) +
            (ev.time ? ' · ' + escapeHtml(ev.time) : '')
        );
      });
    }

    lines.push('<br><a href="#kalender" data-section="kalender">Öppna kalendern →</a>');

    return {
      html: lines.join('<br>'),
      actions: [
        { label: 'Visa hela kalendern', q: '__goto_kalender__' },
        { label: 'Motion till årsstämman', q: 'motion årsstämma' },
        { label: '← Tillbaka till menyn', q: '__menu__', secondary: true }
      ]
    };
  }

  function replyFromSiteHits(hits) {
    if (!hits.length) return null;
    var top = hits[0].chunk;
    var html =
      '<strong>' +
      escapeHtml(top.title) +
      '</strong><br><br>';

    if (top.type === 'link' && top.url) {
      html +=
        escapeHtml(snippetText(top.text.replace(top.url, '').replace(/\s*—\s*$/, ''), 220)) +
        '<br><br><a href="' +
        escapeHtml(top.url) +
        '" target="_blank" rel="noopener noreferrer">' +
        (/facebook\.com/i.test(top.url)
          ? 'Öppna Facebook-gruppen'
          : /boappa\.se/i.test(top.url)
            ? 'Öppna boAppa'
            : 'Öppna länk') +
        '</a>';
    } else {
      html += escapeHtml(snippetText(redactPrivateContacts(top.text), 380));
      var linkHit = hits.find(function (h) {
        return h.chunk.type === 'link' && h.chunk.url;
      });
      if (linkHit) {
        html +=
          '<br><br><a href="' +
          escapeHtml(linkHit.chunk.url) +
          '" target="_blank" rel="noopener noreferrer">' +
          (/facebook\.com/i.test(linkHit.chunk.url) ? 'Öppna Facebook-gruppen' : 'Öppna länk') +
          '</a>';
      }
    }

    if (top.link) {
      html +=
        '<br><br><a href="#' +
        escapeHtml(top.link) +
        '" data-section="' +
        escapeHtml(top.link) +
        '">Läs mer på sidan →</a>';
    }

    var actions = hits.slice(1, 4).map(function (h) {
      return { label: snippetText(h.chunk.title, 42), q: h.chunk.title };
    });
    actions.push({ label: '← Tillbaka till menyn', q: '__menu__', secondary: true });

    return { html: html, actions: actions };
  }

  var ICONS = {
    chat:
      '<svg class="icon-chat" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>',
    close:
      '<svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.71L12 12.01 5.7 5.7 4.29 7.11 10.59 13.4 4.29 19.7 5.7 21.11 12 14.82l6.3 6.29 1.41-1.41-6.29-6.3 6.29-6.29z"/></svg>',
    chevron:
      '<svg class="icon-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
    send:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    more:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>',
    bot:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a2 2 0 012 2v1h3a3 3 0 013 3v2h1a1 1 0 110 2h-1v2a3 3 0 01-3 3h-3v1a2 2 0 11-4 0v-1H8a3 3 0 01-3-3v-2H4a1 1 0 110-2h1V8a3 3 0 013-3h3V4a2 2 0 012-2zm-3 8a1.25 1.25 0 100 2.5A1.25 1.25 0 009 10zm6 0a1.25 1.25 0 100 2.5A1.25 1.25 0 0015 10z"/></svg>'
  };

  function normalize(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9@.\såäö]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function scoreFaq(faq, queryNorm) {
    var score = 0;
    var titleNorm = normalize(faq.title);
    if (titleNorm === queryNorm) score += 100;
    if (titleNorm.indexOf(queryNorm) !== -1 || queryNorm.indexOf(titleNorm) !== -1) score += 40;

    faq.keywords.forEach(function (kw) {
      var k = normalize(kw);
      if (!k) return;
      if (queryNorm === k) score += 50;
      else if (queryNorm.indexOf(k) !== -1) score += 20 + Math.min(k.length, 12);
      else if (k.indexOf(queryNorm) !== -1 && queryNorm.length > 3) score += 10;
    });

    // Token overlap
    var tokens = queryNorm.split(' ').filter(function (t) {
      return t.length > 2;
    });
    tokens.forEach(function (t) {
      faq.keywords.forEach(function (kw) {
        if (normalize(kw).indexOf(t) !== -1) score += 4;
      });
      if (titleNorm.indexOf(t) !== -1) score += 3;
    });

    return score;
  }

  function findBestFaqs(query, limit) {
    var q = normalize(query);
    if (!q) return [];
    var ranked = FAQS.map(function (faq) {
      return { faq: faq, score: scoreFaq(faq, q) };
    })
      .filter(function (x) {
        return x.score >= 12;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });
    return ranked.slice(0, limit || 3);
  }

  function faqsByCategory(catId) {
    return FAQS.filter(function (f) {
      return f.category === catId;
    });
  }

  function findByTitle(title) {
    var n = normalize(title);
    for (var i = 0; i < FAQS.length; i++) {
      if (normalize(FAQS[i].title) === n) return FAQS[i];
    }
    // soft match
    var best = findBestFaqs(title, 1);
    return best.length ? best[0].faq : null;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function linkifyAnswer(text) {
    var safe = escapeHtml(redactPrivateContacts(text));
    return safe
      .replace(
        /(medlem@redisa\.se)/g,
        '<a href="mailto:$1">$1</a>'
      )
      .replace(
        /(kundservice@techem\.se)/g,
        '<a href="mailto:$1">$1</a>'
      )
      .replace(
        /(https?:\/\/[^\s<]+)/g,
        function (url) {
          var label = url;
          if (/facebook\.com\/groups/i.test(url)) label = 'Öppna Facebook-gruppen';
          else if (/boappa\.se/i.test(url)) label = 'Öppna boAppa';
          else if (/tenantportal\.techem\.se/i.test(url)) label = 'Öppna Techem-portalen';
          return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
        }
      )
      .replace(
        /(tenantportal\.techem\.se)/g,
        '<a href="https://$1" target="_blank" rel="noopener noreferrer">Öppna Techem-portalen</a>'
      )
      .replace(
        /(boappa\.se\/ribe-samf-kista)/g,
        '<a href="https://$1" target="_blank" rel="noopener noreferrer">Öppna boAppa</a>'
      );
  }

  function redactPrivateContacts(text) {
    return String(text || '')
      .replace(/styrelsen\s*@\s*ribegatan\.se/gi, 'kontaktformuläret')
      .replace(/styrelsen\[kanelbulle\]ribegatan\.se/gi, 'kontaktformuläret')
      .replace(/mailto:\s*styrelsen@ribegatan\.se/gi, '#')
      .replace(/E-?post\s*:\s*kontaktformuläret/gi, 'Kontakt: via formuläret i chatten');
  }

  function timeLabel() {
    try {
      return new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function RibeChatbot() {
    this.root = null;
    this.panel = null;
    this.messagesEl = null;
    this.input = null;
    this.launcher = null;
    this.badge = null;
    this.nudge = null;
    this.menu = null;
    this.isOpen = false;
    this.unread = 0;
    this.typingTimer = null;
    this.lastTimestampMin = '';
  }

  RibeChatbot.prototype.mount = function () {
    if (document.getElementById('ribe-chatbot-root')) return;

    var nudgeHidden = localStorage.getItem(NUDGE_KEY) === '1';
    var root = document.createElement('div');
    root.id = 'ribe-chatbot-root';
    root.innerHTML =
      '<div class="ribe-chat-panel" role="dialog" aria-label="Ribe FAQ-hjälp" aria-modal="false">' +
      '  <div class="ribe-chat-header">' +
      '    <div class="ribe-chat-brand">' +
      '      <div class="ribe-chat-logo"><img src="logo-removebg-preview.png" alt="Ribegatan" width="34" height="34">' +
      ICONS.bot +
      '</div>' +
      '      <div class="ribe-chat-brand-text">' +
      '        <div class="ribe-chat-title">Välkommen til Ribegatan.se</div>' +
      '        <div class="ribe-chat-sub">Offline Hjälp</div>' +
      '      </div>' +
      '    </div>' +
      '    <button type="button" class="ribe-chat-menu-btn" data-action="menu" aria-label="Meny" aria-expanded="false">' +
      ICONS.more +
      '</button>' +
      '    <div class="ribe-chat-menu" id="ribeChatMenu" hidden>' +
      '      <button type="button" data-action="reset">Börja om</button>' +
      '      <button type="button" data-action="close">Minimera</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="ribe-chat-messages" id="ribeChatMessages" aria-live="polite"></div>' +
      '  <div class="ribe-chat-composer">' +
      '    <form class="ribe-chat-form" id="ribeChatForm">' +
      '      <textarea class="ribe-chat-input" id="ribeChatInput" rows="1" placeholder="Skriv ett meddelande" autocomplete="off"></textarea>' +
      '      <button type="submit" class="ribe-chat-send" aria-label="Skicka">' +
      ICONS.send +
      '</button>' +
      '    </form>' +
      '  </div>' +
      '</div>' +
      '<div class="ribe-chat-dock">' +
      '  <div class="ribe-chat-nudge' +
      (nudgeHidden ? ' is-hidden' : '') +
      '" id="ribeChatNudge">' +
      '    <button type="button" class="ribe-chat-nudge-dismiss" aria-label="Dölj tips" data-action="dismiss-nudge">' +
      ICONS.close +
      '</button>' +
      '    <span class="ribe-chat-nudge-text">Behöver du hjälp?</span>' +
      '  </div>' +
      '  <button type="button" class="ribe-chat-launcher" aria-label="Öppna Ribe-hjälpen" aria-expanded="false">' +
      ICONS.chat +
      ICONS.chevron +
      '    <span class="ribe-chat-badge" hidden>1</span>' +
      '  </button>' +
      '</div>';

    document.body.appendChild(root);
    this.root = root;
    this.panel = root.querySelector('.ribe-chat-panel');
    this.messagesEl = root.querySelector('#ribeChatMessages');
    this.input = root.querySelector('#ribeChatInput');
    this.launcher = root.querySelector('.ribe-chat-launcher');
    this.badge = root.querySelector('.ribe-chat-badge');
    this.nudge = root.querySelector('#ribeChatNudge');
    this.menu = root.querySelector('#ribeChatMenu');

    // Logo: visa SVG om bild saknas
    var logoBox = root.querySelector('.ribe-chat-logo');
    var logoImg = root.querySelector('.ribe-chat-logo img');
    if (logoBox && logoImg) {
      logoImg.addEventListener('error', function () {
        logoBox.classList.add('is-fallback');
      });
    }

    this.bindEvents();
    buildSiteIndex();
    this.startConversation();
    // Chatten ska alltid starta minimerad — användaren öppnar själv
    this.close();
  };

  RibeChatbot.prototype.bindEvents = function () {
    var self = this;

    this.launcher.addEventListener('click', function () {
      if (self.isOpen) self.close();
      else self.open();
    });

    this.root.addEventListener('click', function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      var actionEl = t.closest('[data-action]');
      if (!actionEl || !self.root.contains(actionEl)) return;
      var action = actionEl.getAttribute('data-action');
      if (action === 'close') {
        self.closeMenu();
        self.close();
      } else if (action === 'reset') {
        self.closeMenu();
        self.startConversation(true);
      } else if (action === 'menu') {
        self.toggleMenu();
      } else if (action === 'dismiss-nudge') {
        e.stopPropagation();
        self.dismissNudge();
      }
    });

    this.panel.querySelector('#ribeChatForm').addEventListener('submit', function (e) {
      e.preventDefault();
      self.handleUserText(self.input.value);
    });

    this.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        self.handleUserText(self.input.value);
      }
    });

    this.input.addEventListener('input', function () {
      self.input.style.height = 'auto';
      self.input.style.height = Math.min(self.input.scrollHeight, 88) + 'px';
    });

    this.messagesEl.addEventListener('click', function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;

      var actionBtn = t.closest('.ribe-chat-action, .ribe-chat-chip');
      if (actionBtn) {
        var q = actionBtn.getAttribute('data-q');
        var cat = actionBtn.getAttribute('data-cat');
        if (cat) {
          self.showCategory(cat);
          return;
        }
        if (q === '__contact__') self.showContactForm();
        else if (q === '__menu__') self.showMainMenu();
        else if (q === '__goto_kalender__') {
          self.addUserMessage('Visa hela kalendern');
          goToKalender();
          self.showTyping(function () {
            self.addBotMessage('Jag öppnar kalendern på sidan. Du kan också fråga t.ex. ”När är nästa årsstämma?”', {
              actions: [
                { label: 'När är nästa årsstämma?', q: 'När är nästa årsstämma?' },
                { label: '← Tillbaka till menyn', q: '__menu__', secondary: true }
              ]
            });
          });
        } else if (q) self.handleUserText(q);
        return;
      }

      var link = t.closest('[data-section]');
      if (link) {
        var id = link.getAttribute('data-section');
        if (id === 'kalender') {
          goToKalender();
          return;
        }
        if (id) {
          if (window.revealSection) {
            try {
              window.revealSection('#' + id);
            } catch (err) {}
          }
          var el = document.getElementById(id);
          if (el) {
            setTimeout(function () {
              var top = el.getBoundingClientRect().top + window.pageYOffset - 90;
              window.scrollTo({ top: top, behavior: 'smooth' });
            }, 50);
          } else {
            window.location.hash = id;
          }
        }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.isOpen) {
        if (self.menu && self.menu.classList.contains('is-open')) self.closeMenu();
        else self.close();
      }
    });

    document.addEventListener('click', function (e) {
      if (!self.menu || !self.menu.classList.contains('is-open')) return;
      if (!(e.target instanceof Element)) return;
      if (!e.target.closest('.ribe-chat-menu') && !e.target.closest('[data-action="menu"]')) {
        self.closeMenu();
      }
    });
  };

  RibeChatbot.prototype.toggleMenu = function () {
    if (!this.menu) return;
    var open = !this.menu.classList.contains('is-open');
    this.menu.hidden = !open;
    this.menu.classList.toggle('is-open', open);
    var btn = this.root.querySelector('[data-action="menu"]');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  RibeChatbot.prototype.closeMenu = function () {
    if (!this.menu) return;
    this.menu.hidden = true;
    this.menu.classList.remove('is-open');
    var btn = this.root.querySelector('[data-action="menu"]');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  };

  RibeChatbot.prototype.dismissNudge = function () {
    if (this.nudge) this.nudge.classList.add('is-hidden');
    try {
      localStorage.setItem(NUDGE_KEY, '1');
    } catch (e) {}
  };

  RibeChatbot.prototype.open = function () {
    this.isOpen = true;
    this.root.classList.add('is-open');
    this.panel.classList.add('is-open');
    this.launcher.classList.add('is-open');
    this.launcher.setAttribute('aria-expanded', 'true');
    this.launcher.setAttribute('aria-label', 'Minimera Ribe-hjälpen');
    this.unread = 0;
    this.updateBadge();
    var self = this;
    setTimeout(function () {
      self.input.focus();
    }, 50);
  };

  RibeChatbot.prototype.close = function () {
    this.isOpen = false;
    if (this.root) this.root.classList.remove('is-open');
    if (this.panel) this.panel.classList.remove('is-open');
    if (this.launcher) {
      this.launcher.classList.remove('is-open');
      this.launcher.setAttribute('aria-expanded', 'false');
      this.launcher.setAttribute('aria-label', 'Öppna Ribe-hjälpen');
    }
    this.closeMenu();
  };

  RibeChatbot.prototype.updateBadge = function () {
    if (this.unread > 0 && !this.isOpen) {
      this.badge.hidden = false;
      this.badge.textContent = String(this.unread);
    } else {
      this.badge.hidden = true;
    }
  };

  RibeChatbot.prototype.clearMessages = function () {
    this.messagesEl.innerHTML = '';
    this.lastTimestampMin = '';
  };

  RibeChatbot.prototype.scrollToBottom = function () {
    var el = this.messagesEl;
    requestAnimationFrame(function () {
      el.scrollTop = el.scrollHeight;
    });
  };

  RibeChatbot.prototype.maybeAddTimestamp = function () {
    var label = timeLabel();
    if (!label || label === this.lastTimestampMin) return;
    this.lastTimestampMin = label;
    var ts = document.createElement('div');
    ts.className = 'ribe-chat-timestamp';
    ts.textContent = label;
    this.messagesEl.appendChild(ts);
  };

  RibeChatbot.prototype.addUserMessage = function (text) {
    this.maybeAddTimestamp();
    var row = document.createElement('div');
    row.className = 'ribe-chat-row user';
    row.innerHTML = '<div class="ribe-chat-bubble">' + escapeHtml(text) + '</div>';
    this.messagesEl.appendChild(row);
    this.scrollToBottom();
  };

  RibeChatbot.prototype.addBotMessage = function (htmlContent, options) {
    options = options || {};
    this.maybeAddTimestamp();

    var row = document.createElement('div');
    row.className = 'ribe-chat-row bot';

    var avatar = document.createElement('div');
    avatar.className = 'ribe-chat-msg-avatar';
    avatar.innerHTML = ICONS.bot;
    avatar.setAttribute('aria-hidden', 'true');

    var stack = document.createElement('div');
    stack.className = 'ribe-chat-msg-stack';

    var name = document.createElement('div');
    name.className = 'ribe-chat-agent-name';
    name.textContent = 'Ribe-hjälpen';

    var bubble = document.createElement('div');
    bubble.className = 'ribe-chat-bubble';
    bubble.innerHTML = htmlContent;

    stack.appendChild(name);
    stack.appendChild(bubble);

    var actions = options.actions || [];
    if (options.categories) {
      actions = MAIN_ACTIONS.slice();
    }

    if (actions.length) {
      var list = document.createElement('div');
      list.className = 'ribe-chat-actions';
      actions.forEach(function (item) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
          'ribe-chat-action' +
          (item.secondary ? ' secondary' : '') +
          (item.primary ? ' is-primary' : '');
        if (item.cat) btn.setAttribute('data-cat', item.cat);
        if (item.q) btn.setAttribute('data-q', item.q);
        btn.textContent = item.label;
        list.appendChild(btn);
      });
      bubble.appendChild(list);
    }

    if (options.chips && options.chips.length) {
      var sug = document.createElement('div');
      sug.className = 'ribe-chat-suggestions';
      options.chips.forEach(function (chip) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ribe-chat-chip';
        btn.setAttribute('data-q', chip.q);
        btn.textContent = chip.label;
        sug.appendChild(btn);
      });
      stack.appendChild(sug);
    }

    if (options.showContactForm) {
      stack.appendChild(this.buildContactForm());
    }

    row.appendChild(avatar);
    row.appendChild(stack);
    this.messagesEl.appendChild(row);
    this.scrollToBottom();

    if (!this.isOpen && !options.silentUnread) {
      this.unread += 1;
      this.updateBadge();
    }
  };

  RibeChatbot.prototype.showTyping = function (cb) {
    var self = this;
    var row = document.createElement('div');
    row.className = 'ribe-chat-row bot';
    row.id = 'ribeTypingRow';
    row.innerHTML =
      '<div class="ribe-chat-msg-avatar" aria-hidden="true">' +
      ICONS.bot +
      '</div><div class="ribe-chat-msg-stack"><div class="ribe-chat-typing" aria-label="Skriver"><span></span><span></span><span></span></div></div>';
    this.messagesEl.appendChild(row);
    this.scrollToBottom();

    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(function () {
      var t = document.getElementById('ribeTypingRow');
      if (t) t.remove();
      cb();
    }, 400 + Math.random() * 280);
  };

  RibeChatbot.prototype.startConversation = function () {
    this.clearMessages();
    var welcome =
      'Välkommen! 👋<br><br>' +
      'Jag hjälper dig med vanliga frågor om Ribe.<br>' +
      'Välj nedan eller skriv din fråga.';

    this.addBotMessage(welcome, { categories: true, silentUnread: true });
  };

  RibeChatbot.prototype.showMainMenu = function () {
    this.addUserMessage('Visa alla ämnen');
    var self = this;
    this.showTyping(function () {
      self.addBotMessage('Vad vill du ha hjälp med?', { categories: true });
    });
  };

  RibeChatbot.prototype.showCategory = function (catId) {
    var cat = CATEGORIES.find(function (c) {
      return c.id === catId;
    });
    if (!cat) return;

    this.addUserMessage(cat.label);
    var items = faqsByCategory(catId);
    var self = this;

    this.showTyping(function () {
      if (catId === 'styrelsen') {
        self.showContactForm(true);
        return;
      }

      var actions = items.map(function (f) {
        return { label: f.title, q: f.title };
      });
      actions.push({ label: '← Tillbaka till menyn', q: '__menu__', secondary: true });

      self.addBotMessage('Inom <strong>' + escapeHtml(cat.label) + '</strong> kan jag hjälpa dig med:', {
        actions: actions
      });
    });
  };

  RibeChatbot.prototype.handleUserText = function (raw) {
    var text = String(raw || '').trim();
    if (!text) return;

    this.input.value = '';
    this.input.style.height = 'auto';
    this.addUserMessage(text);

    var n = normalize(text);
    var self = this;

    if (
      n === 'meny' ||
      n === 'menu' ||
      n === 'amnen' ||
      n === 'ämnen' ||
      n.indexOf('visa alla') !== -1 ||
      n === '__menu__'
    ) {
      this.showTyping(function () {
        self.addBotMessage('Välj ett ämne:', { categories: true });
      });
      return;
    }

    if (
      n.indexOf('skicka meddelande') !== -1 ||
      (n.indexOf('kontakta') !== -1 && (n.indexOf('mail') !== -1 || n.indexOf('styrelse') !== -1)) ||
      n === 'mail' ||
      n === 'mejla' ||
      n === '__contact__' ||
      n.indexOf('skriv till styrelsen') !== -1 ||
      n.indexOf('mailadress') !== -1 ||
      n.indexOf('mejladress') !== -1 ||
      n.indexOf('e-postadress') !== -1 ||
      n.indexOf('epostadress') !== -1 ||
      n.indexOf('e post') !== -1 ||
      n.indexOf('epost') !== -1 ||
      n === 'email' ||
      n.indexOf('email') !== -1 ||
      /(vad ar|vart ar|var ar|ge mig|har ni).*(mail|mejl|epost|e-post)/.test(n)
    ) {
      this.showTyping(function () {
        self.showContactForm(true);
      });
      return;
    }

    if (/^(hej|hello|hi|tjena|hallå|halla)\b/.test(n) || n === 'hjälp' || n === 'hjalp') {
      this.showTyping(function () {
        self.addBotMessage('Hej! Vad vill du ha hjälp med?', { categories: true });
      });
      return;
    }

    this.showTyping(function () {
      // 0) Direkta länkfrågor (facebook, boappa, …)
      if (/(facebook|fb[\s-]?grupp|facebookgrupp)/.test(n)) {
        var fb = findByTitle('Facebook-gruppen');
        if (fb) {
          self.replyWithFaq(fb);
          return;
        }
      }
      if (/boappa/.test(n)) {
        var ba = findByTitle('boAppa');
        if (ba) {
          self.replyWithFaq(ba);
          return;
        }
      }

      // 1) Kalender / möten / datum
      var cal = answerCalendarQuestion(text);
      if (cal) {
        if (cal.gotoKalender) {
          goToKalender();
          self.addBotMessage('Här är kalendern på sidan. Scrolla gärna ner om du inte ser den direkt.', {
            actions: [
              { label: 'När är nästa årsstämma?', q: 'När är nästa årsstämma?' },
              { label: '← Tillbaka till menyn', q: '__menu__', secondary: true }
            ]
          });
          return;
        }
        self.addBotMessage(cal.html, { actions: cal.actions });
        return;
      }

      // 2) Manuell FAQ (vanliga ämnen)
      var matches = findBestFaqs(text, 3);
      var faqStrong = matches.length && matches[0].score >= 28;

      // 3) Sök i hela sidans innehåll
      var siteHits = searchSite(text, 5);
      var siteStrong = siteHits.length && siteHits[0].score >= 22;

      if (faqStrong && (!siteStrong || matches[0].score >= siteHits[0].score + 6)) {
        if (matches.length > 1 && matches[0].score - matches[1].score < 8) {
          self.addBotMessage('Menade du något av detta?', {
            actions: matches
              .map(function (m) {
                return { label: m.faq.title, q: m.faq.title };
              })
              .concat([{ label: '← Tillbaka till menyn', q: '__menu__', secondary: true }])
          });
          return;
        }
        self.replyWithFaq(matches[0].faq);
        return;
      }

      if (siteStrong) {
        var siteReply = replyFromSiteHits(siteHits);
        if (siteReply) {
          self.addBotMessage(siteReply.html, { actions: siteReply.actions });
          return;
        }
      }

      if (matches.length) {
        self.replyWithFaq(matches[0].faq);
        return;
      }

      self.addBotMessage(
        'Jag hittade inget säkert svar i sidans innehåll. Prova ett annat ord, öppna kalendern, eller skicka ett meddelande till styrelsen.',
        {
          actions: [
            { label: 'Kalender & nästa möte', q: 'När är nästa möte?' },
            { label: 'Visa meny', q: '__menu__' },
            { label: 'Skicka meddelande', q: '__contact__' }
          ]
        }
      );
    });
  };

  RibeChatbot.prototype.replyWithFaq = function (faq) {
    if (!faq) return;

    if (faq.openContact || faq.id === 'styrelsen') {
      this.showContactForm(true);
      return;
    }

    var html = '<strong>' + escapeHtml(faq.title) + '</strong><br><br>' + linkifyAnswer(faq.answer);

    if (faq.link) {
      html +=
        '<br><br><a href="#' +
        escapeHtml(faq.link) +
        '" data-section="' +
        escapeHtml(faq.link) +
        '">Läs mer på sidan →</a>';
    }

    var actions = (faq.followUps || []).map(function (label) {
      var ln = normalize(label);
      if (
        ln.indexOf('skicka meddelande') !== -1 ||
        ln === 'kontakta styrelsen' ||
        ln.indexOf('kontakta styrelsen') !== -1
      ) {
        return { label: label, q: '__contact__' };
      }
      return { label: label, q: label };
    });

    if (faq.showContact) {
      actions.unshift({ label: 'Skicka meddelande', q: '__contact__' });
    }
    actions.push({ label: '← Tillbaka till menyn', q: '__menu__', secondary: true });

    this.addBotMessage(html, { actions: actions });
  };

  RibeChatbot.prototype.buildContactForm = function () {
    var wrap = document.createElement('form');
    wrap.className = 'ribe-chat-mail-form';
    wrap.setAttribute('novalidate', 'novalidate');
    wrap.innerHTML =
      '<p class="ribe-chat-mail-note">Fyll i formuläret så når meddelandet styrelsen. Du kan även bifoga en bild.</p>' +
      '<label>Ditt namn<input name="name" required placeholder="För- och efternamn" autocomplete="name"></label>' +
      '<label>Din e-post<input name="email" type="email" required placeholder="namn@exempel.se" autocomplete="email"></label>' +
      '<label>Meddelande<textarea name="message" rows="4" required placeholder="Skriv ditt meddelande…"></textarea></label>' +
      '<label class="ribe-chat-file-label">Bifoga bild (valfritt)' +
      '<input class="ribe-chat-file-input" name="image" type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.gif">' +
      '</label>' +
      '<div class="ribe-chat-file-preview" hidden></div>' +
      '<div class="ribe-chat-mail-actions">' +
      '  <button type="button" class="ribe-chat-mail-cancel">Avbryt</button>' +
      '  <button type="submit" class="ribe-chat-mail-submit">Skicka</button>' +
      '</div>' +
      '<p class="ribe-chat-mail-offline">Offline-läge: sparas lokalt i webbläsaren (skickas inte på riktigt ännu).</p>';

    var self = this;
    var fileInput = wrap.querySelector('input[name="image"]');
    var preview = wrap.querySelector('.ribe-chat-file-preview');
    var pendingImage = null;

    fileInput.addEventListener('change', function () {
      pendingImage = null;
      preview.hidden = true;
      preview.innerHTML = '';
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;

      if (!/^image\//.test(file.type)) {
        preview.hidden = false;
        preview.innerHTML = '<span class="ribe-chat-file-error">Välj en bildfil (JPG, PNG, WEBP eller GIF).</span>';
        fileInput.value = '';
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        preview.hidden = false;
        preview.innerHTML = '<span class="ribe-chat-file-error">Bilden är för stor (max 4 MB i offline-läge).</span>';
        fileInput.value = '';
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        pendingImage = {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: String(reader.result || '')
        };
        preview.hidden = false;
        preview.innerHTML =
          '<img src="' +
          pendingImage.dataUrl +
          '" alt="Förhandsvisning">' +
          '<span>' +
          escapeHtml(file.name) +
          ' (' +
          Math.round(file.size / 1024) +
          ' KB)</span>' +
          '<button type="button" class="ribe-chat-file-remove">Ta bort</button>';
        preview.querySelector('.ribe-chat-file-remove').addEventListener('click', function () {
          pendingImage = null;
          fileInput.value = '';
          preview.hidden = true;
          preview.innerHTML = '';
        });
      };
      reader.readAsDataURL(file);
    });

    wrap.querySelector('.ribe-chat-mail-cancel').addEventListener('click', function () {
      wrap.remove();
      self.addBotMessage('Okej, avbrutet. Fråga gärna något annat!', {
        actions: [{ label: 'Visa meny', q: '__menu__' }]
      });
    });

    wrap.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(wrap);
      var payload = {
        name: String(fd.get('name') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        message: String(fd.get('message') || '').trim(),
        createdAt: new Date().toISOString(),
        mode: 'offline-local',
        image: pendingImage
          ? {
              name: pendingImage.name,
              type: pendingImage.type,
              size: pendingImage.size,
              dataUrl: pendingImage.dataUrl
            }
          : null
      };

      if (!payload.name || !payload.email || !payload.message) {
        self.addBotMessage('Fyll i namn, e-post och meddelande innan du skickar.');
        return;
      }

      try {
        var list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(list)) list = [];
        list.push(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (err) {
        self.addBotMessage(
          'Kunde inte spara lokalt. Om du bifogat en stor bild, prova en mindre fil eller ta bort bilden.'
        );
        return;
      }

      wrap.remove();
      var okHtml =
        'Tack ' +
        escapeHtml(payload.name) +
        '! Ditt meddelande är mottaget i chatten.<br><br>' +
        (payload.image
          ? 'Bild bifogad: <strong>' + escapeHtml(payload.image.name) + '</strong><br><br>'
          : '') +
        '<em>Offline-läge:</em> sparat lokalt för test. När sajten är online skickas det via kontaktformuläret till styrelsen.';

      self.addBotMessage(okHtml, {
        actions: [
          { label: 'Tillbaka till menyn', q: '__menu__', secondary: true },
          { label: 'Skicka ett till', q: '__contact__' }
        ]
      });
    });

    return wrap;
  };

  RibeChatbot.prototype.showContactForm = function () {
    var html =
      'Du kontaktar styrelsen via formuläret nedan. Fyll i namn, din e-post och meddelande. Du kan också bifoga en bild.';
    this.addBotMessage(html, { showContactForm: true });
  };

  function init() {
    var bot = new RibeChatbot();
    bot.mount();
    // Exponera för manuell test i konsolen
    window.RibeChatbot = bot;
    window.ribeChatGetOfflineMessages = function () {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch (e) {
        return [];
      }
    };
    window.ribeChatRebuildIndex = function () {
      return buildSiteIndex().length;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
