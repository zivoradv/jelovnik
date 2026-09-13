function pick<T>(items: readonly T[], seed: number): T {
    return items[Math.abs(seed) % items.length]
}

export function randomOf<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)]
}

const MORNING = [
    'Dobro jutro, {name}! Kafa prvo, pa jelovnik.',
    'Jutro, {name}. Stomak se već javio?',
    'Jutro, {name}. Kuvarica tek pali šporet.',
    'Howdy cowboy.',
] as const

const NOON = [
    '{name}, vreme ručka! Nadamo se da si juče naručio.',
    'Podne je, {name}. Ako nisi naručio, sad je kasno — ali za sutra nije.',
    'DESI, {name}! Zar ne bi trebalo da si u kuhinji?',
] as const

const AFTERNOON = [
    'Poz, {name}. Sutra je novi dan, a takodje je i prekosutra.',
    'Sve sto mozes danas ostavi za sutra. - neka stara poslovica, nzm gde sam je cuo',
    'Zdravo, {name}. Danas je dan, a sutra je... novi dan.',
    'Volim osmeh tvoj bas dobro ti stoji - Tose Proeski',
    'Cao, {name}. Si znao da je jednom kauboj usao u restoran i pitao ko je Cile a ko Mile? Upucao je obojicu jer kod njega nema cile mile. lol. A takodje nema ni hasa ako ga ne narucis!! Tako da mozda bi valjalo da pogledas listu dole?',
] as const

const EVENING = [
    'Dobro veče, {name}. Naruči za sutra pre nego što zaboravis.',
    '{name}, veče je jbg. Bas volis ovu aplikaciju?',
    'Kasno je, {name}, ali jelovnik ne spava.',
] as const

const NIGHT = ['Još si budan, {name}? Kuvarica spava, ali meni ne.', '{name}, baas volis ovu aplikaciju?'] as const

const DAY_TAGLINES: Record<number, readonly string[]> = {
    1: ['Ponedeljak. kafica, cigarica, dr..uzenje?'],
    2: ['Utorak. Utorkom bas ne mogu.'],
    3: ['Sreda je. Pola puta do vikenda, ceo put do ručka.'],
    4: ['Četvrtak je skoro petak. Skoro.'],
    5: ['PETAK. Zna se šta se jede petkom.'],
    6: ['Subota, a ti gledaš jelovnik? Respect.'],
    0: ['Nedelja. Aha znaci sada volimo ponedeljke? Posto uzimamo has i to, mislim, has je nesto cemu se radujemo? Pauziracu se sad ovde.'],
}

export function greeting(name: string, now = new Date()): { title: string; tagline: string } {
    const h = now.getHours()
    const seed = now.getDate() + now.getMonth() * 31
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
    if (qty >= 99) return '99. Maksimum. Legenda.'
    if (qty >= 50) return 'Kuvarica je već obaveštena. I malo uplašena.'
    if (qty >= 10) return 'Ovo više nije ručak, ovo je ketering.'
    if (qty >= 5) return `${qty} porcija? Hraniš celu kancelariju?`
    if (qty >= 3) return 'Gladan dan, a?'
    return null
}

const CUSTOM_REACTIONS: [RegExp, string][] = [
    [/pic[ae]|pizza/i, 'Pica? Ambiciozno. Držimo palčeve.'],
    [/burek/i, 'Burek — ozbiljan izbor za ozbiljne ljude.'],
    [/salat/i, 'Salata. Neko pazi na liniju. Poštujemo.'],
    [/^\s*ni[šs]ta\s*$/i, 'Ništa? To se ne naručuje, to se doživljava.'],
    [/pivo|rakij|vino/i, 'To ćemo se praviti da nismo videli.'],
    [/kaf[aeu]/i, 'Kafa ide uz sve, ali nije ručak.'],
    [/sarm/i, 'Sarma van petka? Buntovnik.'],
    [/su[šs]i|sushi/i, 'Suši iz domaće kuhinje. Hrabro.'],
    [/[čc]evap/i, 'Ćevapi. Klasik. Nema rasprave.'],
    [/sladoled|tort|kola[čc]/i, 'Prvo ručak, pa slatko. Ili ne, tvoj dan.'],
]

export function customTextReaction(text: string): string | null {
    const t = text.trim()
    if (t.length < 3) return null
    return CUSTOM_REACTIONS.find(([re]) => re.test(t))?.[1] ?? null
}

export function debtRoast(unpaidTotal: number, unpaidCount: number): string {
    if (unpaidTotal <= 0) return 'Čist si kao suza. Kuvarica te voli.'
    if (unpaidCount >= 7) return `${unpaidCount} neplaćenih dana? Rekord sprata je u opasnosti.`
    if (unpaidTotal < 1000) return 'Sitnica. Ali sitnice se pamte.'
    if (unpaidTotal < 3000) return 'Polako raste. Kao testo.'
    if (unpaidTotal < 6000) return 'Ovo je već ozbiljna tepsija.'
    return 'Druže… ovo više nije dug, ovo je kredit. Kuvarica čeka.'
}

export const KONAMI_MESSAGE = '↑↑↓↓←→←→BA — Šef kuhinje ti otključava tajni meni: dupla porcija. Samo u snovima.'

export const NOT_FOUND_MESSAGES = [
    'Ova stranica je pojedena.',
    'Ovde nema ničega. Kao u frižideru u petak uveče.',
    'Stranica je otišla na pauzu za ručak i nije se vratila.',
] as const
