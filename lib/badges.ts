export interface UserStats {
    days: number
    portions: number
    customCount: number
    posnoCount: number
    maxPortionsInDay: number
    streak: number
    favorite: { name: string; count: number } | null
    earlyBird: boolean
    nightOwl: boolean
}

export interface Badge {
    id: string
    emoji: string
    title: string
    description: string
    earned: boolean
}

export function computeBadges(s: UserStats): Badge[] {
    const fav = s.favorite
    return [
        {
            id: 'prvi-zalogaj',
            emoji: '🥄',
            title: 'Prvi zalogaj',
            description: 'Prva porudžbina. Svi smo negde počeli.',
            earned: s.days >= 1,
        },
        {
            id: 'verni-gost',
            emoji: '🍽️',
            title: 'Verni gost',
            description: 'Naručio 10 različitih dana.',
            earned: s.days >= 10,
        },
        {
            id: 'redovan',
            emoji: '📅',
            title: 'Redovan',
            description: '5 radnih dana zaredom bez propuštenog ručka.',
            earned: s.streak >= 5,
        },
        {
            id: 'majstor',
            emoji: '👨‍🍳',
            title: fav && fav.count >= 5 ? `${fav.name} majstor` : 'Majstor jednog jela',
            description: fav && fav.count >= 5 ? `Isto jelo ${fav.count} puta. Zna se šta voliš.` : 'Naruči isto jelo 5 puta.',
            earned: !!fav && fav.count >= 5,
        },
        {
            id: 'najgladniji',
            emoji: '🐗',
            title: 'Najgladniji',
            description: '3 ili više porcija u jednom danu.',
            earned: s.maxPortionsInDay >= 3,
        },
        {
            id: 'posna-dusa',
            emoji: '🥬',
            title: 'Posna duša',
            description: '5 posnih jela. Telo je hram.',
            earned: s.posnoCount >= 5,
        },
        {
            id: 'virtuoz',
            emoji: '🎨',
            title: 'Virtuoz',
            description: '3 sopstvene porudžbine. Meni ti je samo predlog.',
            earned: s.customCount >= 3,
        },
        {
            id: 'rana-ptica',
            emoji: '🐓',
            title: 'Rana ptica',
            description: 'Porudžbina pre 8 ujutru.',
            earned: s.earlyBird,
        },
        {
            id: 'nocna-smena',
            emoji: '🦉',
            title: 'Noćna smena',
            description: 'Porudžbina posle 22h. Neko nije mogao da zaspi.',
            earned: s.nightOwl,
        },
        {
            id: 'stotka',
            emoji: '💯',
            title: 'Stotka',
            description: '100 porcija ukupno. Ozbiljna kilometraža.',
            earned: s.portions >= 100,
        },
    ]
}
