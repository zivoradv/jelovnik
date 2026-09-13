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
    '{name}, vreme ručka! Nadamo se da si juče naručio.',
    'Podne je, {name}. Ako nisi naručio, sad je kasno - ali za sutra nije.',
    'Ručak je sad, {name}. Ako gledaš ovo umesto da jedeš, aplikacija ti je zanimljivija od hrane. Hvala. Bas cenite developere??',
    'Podne, {name}. Da te pitam nešto, jesi naručio? Ne moraš da odgovoriš, ja već znam.',
    '{name}, high noon. Cigarica posle ručka??',
    'Mozda da skuvas kafu za developera??',
] as const

const AFTERNOON = [
    'Poz, {name}. Sutra je novi dan, a takođe je i prekosutra.',
    'Sve što možeš danas ostavi za sutra. - neka stara poslovica, nzm gde sam je čuo',
    'Zdravo, {name}. Danas je dan, a sutra je... novi dan.',
    'Volim osmeh tvoj baš dobro ti stoji - Toše Proeski',
    'Ćao, {name}. Si znao da je jednom kauboj ušao u restoran i pitao ko je Cile a ko Mile? Upucao je obojicu jer kod njega nema cile mile. lol. A takođe nema ni haša ako ga ne naručiš!! Tako da možda bi valjalo da pogledaš listu dole?',
    'Chuck Norris bi pojeo sve sa ovog menija',
    'Popodne, {name}. Kafa broj tri i dilema broj jedan: šta sutra?',
    '{name}, ovo je zlatni sat. a kad smo kod zlatnog sata?? Si ti cuo vic o zlatnoj zabi?',
    'Ako se neko naljuti na neku foru znajte da developer NIT JE LUK JEO NIT MIRISAO, kontas kao ovo je jelovnik a luk ide u hranu pa kao',
    'Ne pitaj šta jelovnik može da uradi za tebe, pitaj šta ti možeš da naručiš sa jelovnika. - JFK, otprilike',
    'Ćao {name}. Ako čitaš ovo, znači da ti je dosadno. Ako ti je dosadno, naruči. Ako si naručio, naruči za prekosutra.',
    'Bio jednom jedan {name} koji nije naručio ručak.',
    'Jel znas da se otvorio KFC u BIGU???',
] as const

const EVENING = [
    'Dobro veče, {name}. Naruči za sutra pre nego što zaboraviš.',
    '{name}, veče je jbg. Baš voliš ovu aplikaciju?',
    'Kasno je, {name}, ali jelovnik ne spava.',
    'Veče, {name}. Netflix može da čeka. Kuvarica ne može.',
    'Dobro veče. Znaš onu izreku „ko se uveče smeje, ujutru je naručio”? Ne znaš jer sam je sad izmislio. Ali je tačna.',
    '{name}, večernje vesti: sutra se jede. Više o tome u nastavku, tj. dole.',
] as const

const NIGHT = [
    'Još si budan, {name}? Kuvarica spava, ali meni ne.',
    '{name}, baaš voliš ovu aplikaciju?',
    '{name}, tri je ujutru. Ne osuđujem. Samo beležim.',
    'Noć je, {name}. Ovo je ili posvećenost ili nesanica. U oba slučaja - naruči.',
    'Kuvarica sanja sarmu. Ti sanjaš jelovnik. Nešto se poklapa.',
    '{name}, gde si bio u ovo doba? Ne moraš da kažeš, pitanje je retoričko, ali stomak pita.',
    'Jedini ko je sada budan pored tebe je ovaj server. Pozdravlja te.',
] as const

const DAY_TAGLINES: Record<number, readonly string[]> = {
    1: ['Ponedeljak. kafica, cigarica, dr..uzenje?'],
    2: ['Utorak. Utorkom bas ne mogu.'],
    3: ['Sreda je. Pola puta do vikenda, ceo put do ručka.'],
    4: ['Četvrtak je skoro petak. Skoro.'],
    5: ['PETAK. Zna se šta se jede petkom.'],
    6: ['Subota, a ti gledaš jelovnik? Respect.'],
    0: ['Nedelja. Aha znaci sada volimo ponedeljke? Posto uzimamo has i to, mislim, has je nesto cemu se radujemo? Pauziracu se sad ovde.'],
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
    if (qty >= 99) return '99. Maksimum. Legenda.'
    if (qty >= 50) return 'Kuvarica je već obaveštena. I malo uplašena.'
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
