function pick<T>(items: readonly T[], seed: number): T {
    return items[Math.abs(seed) % items.length]
}

export function randomOf<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)]
}

const MORNING = [
    'Jutro, {name}. Kuvarica tek pali šporet.',
    'Howdy cowboy.',
    'Jutro, {name}. Ko rano rani, dve porcije grabi. Zapravo ne.',
    'Ustao si pre kuvarice.',
    'Dobro jutro, {name}. Znaš onu: „doručak je najvažniji obrok dana”? Ovde nema doručka. Naruči ručak. OSIM U SLUCAJU DA NARUCIS DVA HASA?! YOU WOULDNT RIHGT?',
    'Rise and shine, {name}. Šporet se greje, valjda.',
    'Developer voli kafu',
] as const

const NOON = ['Podne je.', 'RUCAK', 'ITS TIME TO D-D-D-DUEL', 'Tip: Postoji Tab za PIVO, klikni.'] as const

const AFTERNOON = [
    'Poz, {name}. Sutra je novi dan, a takođe je i prekosutra.',
    'Zdravo, {name}. Danas je dan, a sutra je... novi dan.',
    'Volim osmeh tvoj baš dobro ti stoji - Toše Proeski',
    'Ćao, {name}. Si znao da je jednom kauboj ušao u restoran i pitao ko je Cile a ko Mile? Upucao je obojicu jer kod njega nema cile mile. lol. A takođe nema ni haša ako ga ne naručiš!! Tako da možda bi valjalo da pogledaš listu dole?',
    'Jel znas da se otvorio KFC u BIGU???',
    'BIG KAHUNA BURGER ili ti ROYAAALE WITH CHEESE',
    'Jel neko za CHESS?',
] as const

const EVENING = [
    'Dobro veče.',
    'Večernje vesti: sutra se jede. Više o tome u nastavku, tj. dole.',
    'Nemoj da gasis TV jel vidis da gledam aktuelnosti (˶˃ ᵕ ˂˶)',
] as const

const NIGHT = ['{name}, tri je ujutru covjece.', 'Poz, {name}.'] as const

const DAY_TAGLINES: Record<number, readonly string[]> = {
    1: ['Ponedeljak, pa utorak, pa sreda...'],
    2: ['Utorak. Utorkom bas ne mogu.'],
    3: ['Sreda.'],
    4: ['Četvrtak je skoro petak. Skoro.'],
    5: ['PETAK. Zna se šta se jede petkom.'],
    6: ['Subota, a ti gledaš jelovnik? Respect.'],
    0: ['Nedelja'],
}

export function greeting(name: string, now = new Date(), shift = 0): { title: string; tagline: string } {
    const h = now.getHours()
    const seed = now.getDate() + now.getMonth() * 31 + shift
    const pool = h < 5 ? NIGHT : h < 10 ? MORNING : h < 14 ? NOON : h < 19 ? AFTERNOON : EVENING
    return {
        title: pick(pool, seed).replace('{name}', name),
        tagline: pick(DAY_TAGLINES[now.getDay()], seed),
    }
}

export const LOADING_MESSAGES = [
    'Pitamo kuvaricu…',
    'Mešamo sataraš…',
    'Brojimo ćufte…',
    'Grejemo šerpe…',
    'Tražimo kašiku…',
    'Salveta je na putu…',
    'Solimo po ukusu…',
    'Čekamo da proključa…',
] as const

export const LOADER_INGREDIENTS = ['🧄', '🧅', '🥕', '🍅', '🌶️', '🥔', '🧂', '🥄'] as const

export const PAGE_LOADING_MESSAGES = [
    'Krademo ti nalog…',
    'Prodajemo tvoje podatke… šalimo se. Ili?',
    'Instaliramo virus… 43%',
    'Šaljemo istoriju tvojih porudžbina mami…',
    'Pitamo Živorada da li smeš da uđeš…',
    'Brojimo dugove. Tvoje.',
    'Grejemo server na tihoj vatri…',
    'Tražimo ko je ostavio prljavu šerpu…',
    'Učitavamo. Ozbiljno, ovaj put stvarno.',
    'Kuvarica traži naočare…',
    'Prevodimo bazu na ćirilicu…',
    'Reciklujemo jučerašnji pasulj…',
    'Ubeđujemo server da je ponedeljak…',
    'Otključavamo tajni meni… nema ga.',
    'Menjamo ti lozinku u „pasulj123”…',
    'Skidamo ceo internet, sačekaj…',
    'Proveravamo da li si stvarno gladan…',
] as const

export const EMPTY_MENU_MESSAGES = [
    'Kuvarica još nije objavila meni. Možda još razmišlja o sarmi.',
    'Prazno kao tepsija posle slave. Probaj kasnije.',
    'Meni je još u glavi kuvarice. Uskoro i ovde.',
] as const

export const SAVE_MESSAGES = [
    'Porudžbina je sačuvana. Prijatno unapred!',
    'Zabeleženo. Kuvarica klima glavom.',
    'Sačuvano. Sad samo da dođe sutra.',
    'Upisano u veliku knjigu ručkova.',
    'Sačuvano. Stomak ti već zahvaljuje.',
] as const

export function quantityReaction(qty: number): string | null {
    if (qty >= 99) return '99. Maksimum. Legendoo.'
    if (qty >= 50) return 'Kuvarica je već obaveštena. I malo uplašena.'
    if (qty >= 15) return 'Okej, sad si preterao druskane.'
    if (qty >= 10) return 'Ovo više nije ručak, ovo je ketering.'
    if (qty >= 5) return `${qty} porcija? Hraniš celu kancelariju?`
    if (qty >= 3) return 'Gladan dan, a?'
    return null
}

export function debtRoast(unpaidTotal: number, unpaidCount: number): string {
    if (unpaidTotal <= 0) return 'Čist si kao suza. Kuvarica te voli.'
    if (unpaidCount >= 7) return `${unpaidCount} neplaćenih dana? Rekord sprata je u opasnosti.`
    if (unpaidTotal < 1000) return 'Sitnica. Ali sitnice se pamte.'
    if (unpaidTotal < 3000) return 'Polako raste. Kao testo.'
    if (unpaidTotal < 6000) return 'Poseti Milu.'
    return 'Druže… ovo više nije dug, ovo je kredit.'
}

export const KONAMI_MESSAGE = 'Ako si stvarno ovo pronasao castim te has...'

export const NOT_FOUND_MESSAGES = [
    'Ova stranica je pojedena.',
    'Ovde nema ničega. Kao u frižideru u petak uveče.',
    'Stranica je otišla na pauzu za ručak i nije se vratila.',
] as const

export const CONSOLE_BANNER = ['ako čitaš ovo, ili si radoznao ili tražiš kako da naručiš duplu porciju. Ne može.'] as const

export const CONSOLE_PS = ['P.S. Živorad ima admina za ovu aplikaciju. Budi fin prema njemu ili?!!!. 🤬', '↑↑↓↓←→←→BA'] as const
