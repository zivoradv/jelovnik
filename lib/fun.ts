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
    'Jutro, {name}. Ko rano rani, dve porcije grabi. Zapravo ne.',
    'Ustao si pre kuvarice, {name}.',
    'Jutro. Ako si došao ovde pre kafe, imamo problem. Ili imaš ti. Uglavnom, neko ima.',
    'Dobro jutro, {name}. Znaš onu: „doručak je najvažniji obrok dana”? Ovde nema doručka. Naruči ručak. OSIM U SLUCAJU DA NARUCIS DVA HASA?! YOU WOULDNT RIHGT?',
    '{name}, jutro. Sanjao sam da si naručio dve sarme.',
    'Rise and shine, {name}. Šporet se greje, valjda.',
    'Developer voli kafu',
    'NIKAD NE KLIKCI JELOVNIK VISE OD 10 PUTA U 3AM, SCARY (PHOTO) (VIDEO)',
] as const

const NOON = [
    'Podne je, {name}.',
    'Ručak je sad, {name}. Ako gledaš ovo umesto da jedeš, aplikacija ti je zanimljivija od hrane. Hvala.',
    '{name}, high noon. Cigarica posle ručka??',
    'Mozda da skuvas kafu za developera??',
    'NIKAD NE KLIKCI JELOVNIK VISE OD 10 PUTA U 3AM, SCARY (PHOTO) (VIDEO)',
] as const

const AFTERNOON = [
    'Poz, {name}. Sutra je novi dan, a takođe je i prekosutra.',
    'Zdravo, {name}. Danas je dan, a sutra je... novi dan.',
    'Volim osmeh tvoj baš dobro ti stoji - Toše Proeski',
    'Ćao, {name}. Si znao da je jednom kauboj ušao u restoran i pitao ko je Cile a ko Mile? Upucao je obojicu jer kod njega nema cile mile. lol. A takođe nema ni haša ako ga ne naručiš!! Tako da možda bi valjalo da pogledaš listu dole?',
    'Chuck Norris bi pojeo sve sa ovog menija',
    '{name}, ovo je zlatno vrijeme narucivanja hasa. a kad smo kod zlatnog vrijemena?? Si cuo vic o zlatnoj zabi?',
    'Ako se neko naljuti na neku foru znajte da developer NIT JE LUK JEO NIT MIRISAO, kontas kao ovo je jelovnik a luk ide u hranu pa kao',
    'Jel znas da se otvorio KFC u BIGU???',
    'NIKAD NE KLIKCI JELOVNIK VISE OD 10 PUTA U 3AM, SCARY (PHOTO) (VIDEO)',
] as const

const EVENING = [
    'Dobro veče.',
    'Veče je jbg. Baš voliš ovu aplikaciju?',
    'Večernje vesti: sutra se jede. Više o tome u nastavku, tj. dole.',
    'NIKAD NE KLIKCI JELOVNIK VISE OD 10 PUTA U 3AM, SCARY (PHOTO) (VIDEO)',
] as const

const NIGHT = [
    '{name}, baaš voliš ovu aplikaciju?',
    '{name}, tri je ujutru covjece.',
    'Poz, {name}.',
    'Kuvarica sanja sarmu. Ti sanjaš jelovnik. Nešto se poklapa.',
    'Jedini ko je sada budan pored tebe je ovaj server.',
    'NIKAD NE KLIKCI JELOVNIK VISE OD 10 PUTA U 3AM, SCARY (PHOTO) (VIDEO)',
] as const

const DAY_TAGLINES: Record<number, readonly string[]> = {
    1: ['Ponedeljak. kafica, cigarica, dr..uzenje?', 'Ponedeljak, pa utorak, pa sreda...'],
    2: ['Utorak. Utorkom bas ne mogu.'],
    3: ['Sreda je. Pola puta do vikenda.'],
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

const CUSTOM_REACTIONS: [RegExp, string][] = [
    [/pic[ae]|pizza/i, 'Pica? Ambiciozno. Držimo palčeve.'],
    [/burek/i, 'Burek - ozbiljan izbor za ozbiljne ljude.'],
    [/salat/i, 'Salata. Neko pazi na liniju. Respek.'],
    [/^\s*ni[šs]ta\s*$/i, 'Ništa? To se ne naručuje >:C'],
    [/pivo|rakij|vino/i, 'To ćemo se praviti da nismo videli.'],
    [/kaf[aeu]/i, 'aaa stara dobra kafica, mozda da probas u kuhinji to? kafa nije rucak tho'],
    [/sarm/i, 'Sarma van petka? Buntovnik.'],
    [/su[šs]i|sushi/i, 'Suši iz domaće kuhinje, pa da.'],
    [/[čc]evap/i, 'Ćevapi. Klasika, volim..'],
    [/sladoled|tort|kola[čc]/i, 'Prvo ručak, pa slatko. Ili ne, tvoj dan.'],
    [/djuvec/i, `NEDOSTAJE MI DJUVEC KOD CURETA </3`],
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

export const KONAMI_MESSAGE = '↑↑↓↓←→←→BA - Šef kuhinje ti otključava tajni meni: dupla porcija. Samo u snovima.'

export const NOT_FOUND_MESSAGES = [
    'Ova stranica je pojedena.',
    'Ovde nema ničega. Kao u frižideru u petak uveče.',
    'Stranica je otišla na pauzu za ručak i nije se vratila.',
] as const

export const CONSOLE_BANNER = [
    'ako čitaš ovo, ili si radoznao ili tražiš kako da naručiš duplu porciju. Ne može.',
    'font-size:18px;font-weight:700;color:#A82B24',
    'font-size:12px;color:#827466',
] as const

export const CONSOLE_PS = [
    '%cP.S. Živorad ima admina za ovu aplikaciju. Budi fin prema njemu - on zna šta si naručio.',
    'font-size:12px;font-style:italic;color:#C77C22',
] as const
