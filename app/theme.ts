'use client'

import type { ColorSystemOptions, SupportedColorScheme, Theme } from '@mui/material/styles'
import { alpha, createColorScheme, createTheme } from '@mui/material/styles'

/**
 * Teme aplikacije. Svaka tema ima svetlu i tamnu varijantu; korisnik bira temu (Profil / meni),
 * a svetlo/tamno se i dalje bira posebno. Sve boje su MUI color scheme-ovi sa CSS varijablama,
 * pa se izabrana tema primenjuje pre prvog iscrtavanja (InitColorSchemeScript) – bez bljeska.
 *
 * Tema se zadaje kompaktno (primarna, sekundarna, pozadine, „mastilo”), a boje teksta,
 * kontrastni tekst i statusne boje se izvode – tako su sve teme međusobno usklađene.
 *
 * Podrazumevana tema koristi imena šema `light` / `dark`; ostale `${id}-light` / `${id}-dark`.
 */

type ColorSet = { light: string; main: string; dark: string; contrastText: string }

/** [svetlija, glavna, tamnija] nijansa jedne boje. */
type Triplet = [light: string, main: string, dark: string]

interface SchemeSpec {
    primary: ColorSet
    secondary: ColorSet
    background: { default: string; paper: string }
    text: { primary: string; secondary: string; disabled: string }
    /** Boja od koje se prave divider / hover / selected (obično tamna u svetloj, svetla u tamnoj temi). */
    ink: string
    success: ColorSet
    warning: ColorSet
    error: ColorSet
    info: ColorSet
}

interface ModeInput {
    primary: Triplet
    secondary: Triplet
    /** [podloga stranice, podloga kartica] */
    bg: [string, string]
    /** Opciono – ako tema ne želi podrazumevanu ćilibar žutu. */
    warning?: Triplet
}

interface ThemeInput {
    id: string
    label: string
    /** Duboka nijansa teme – u svetlom modu boji tekst, linije i hover; u tamnom modu se izvodi iz primarne. */
    ink: string
    light: ModeInput
    dark: ModeInput
}

export interface AppTheme {
    id: string
    label: string
    /** Dve boje za pregled u biraču teme (primarna, sekundarna) – svetla varijanta. */
    swatch: [string, string]
    light: SchemeSpec
    dark: SchemeSpec
}

const LIGHT_STATUS = {
    success: { main: '#2E7D4F', light: '#5CA678', dark: '#1F5836', contrastText: '#FFFFFF' },
    error: { main: '#C0392B', light: '#E07669', dark: '#8E2A1F', contrastText: '#FFFFFF' },
    info: { main: '#3B6E8F', light: '#6C9BB8', dark: '#274C65', contrastText: '#FFFFFF' },
} as const

const DARK_STATUS = {
    success: { main: '#6FC08D', light: '#9BD6B0', dark: '#3E8A5C', contrastText: '#0F2A1A' },
    error: { main: '#EF8A7C', light: '#F5B3A9', dark: '#C0392B', contrastText: '#2B0F0D' },
    info: { main: '#8FBBD6', light: '#B6D3E5', dark: '#5D8FAC', contrastText: '#0E2230' },
} as const

const LIGHT_WARNING: Triplet = ['#DFA04A', '#A5601A', '#7E4715']
const DARK_WARNING: Triplet = ['#EFC58C', '#E0A455', '#B5711D']

/** Linearno meša dve hex boje (`weight` = udeo boje `b`). */
function mix(a: string, b: string, weight: number): string {
    const pa = Number.parseInt(a.slice(1), 16)
    const pb = Number.parseInt(b.slice(1), 16)
    const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - weight) + ((pb >> shift) & 255) * weight)
    return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0').toUpperCase()}`
}

function colorSet([light, main, dark]: Triplet, contrastText: string): ColorSet {
    return { light, main, dark, contrastText }
}

/** Svetli mod: glavne boje su dovoljno tamne za beo tekst; tekst i linije nose blagi ton „mastila”. */
function lightScheme(ink: string, m: ModeInput): SchemeSpec {
    return {
        primary: colorSet(m.primary, '#FFFFFF'),
        secondary: colorSet(m.secondary, '#FFFFFF'),
        background: { default: m.bg[0], paper: m.bg[1] },
        text: {
            primary: mix('#161616', ink, 0.18),
            secondary: mix('#5C5C5C', ink, 0.18),
            disabled: mix('#A2A2A2', ink, 0.12),
        },
        ink,
        warning: colorSet(m.warning ?? LIGHT_WARNING, '#FFFFFF'),
        ...LIGHT_STATUS,
    }
}

/** Tamni mod: glavne boje su pastelne, pa kontrastni tekst mora biti tamna nijansa iste boje. */
function darkScheme(m: ModeInput): SchemeSpec {
    const tint = m.primary[1]
    const warning = m.warning ?? DARK_WARNING
    const textPrimary = mix('#F3F0EE', tint, 0.08)
    return {
        primary: colorSet(m.primary, mix(m.primary[1], '#000000', 0.8)),
        secondary: colorSet(m.secondary, mix(m.secondary[1], '#000000', 0.8)),
        background: { default: m.bg[0], paper: m.bg[1] },
        text: {
            primary: textPrimary,
            secondary: mix('#B0B0B0', tint, 0.12),
            disabled: mix('#767676', tint, 0.1),
        },
        ink: textPrimary,
        warning: colorSet(warning, mix(warning[1], '#000000', 0.8)),
        ...DARK_STATUS,
    }
}

function defineTheme(t: ThemeInput): AppTheme {
    return {
        id: t.id,
        label: t.label,
        swatch: [t.light.primary[1], t.light.secondary[1]],
        light: lightScheme(t.ink, t.light),
        dark: darkScheme(t.dark),
    }
}

// Redosled: topli tonovi → zeleni → plavi → ljubičasti → neutralni.
export const APP_THEMES: AppTheme[] = [
    defineTheme({
        id: 'cigla',
        label: 'Cigla',
        ink: '#4F1210',
        light: {
            primary: ['#D96A62', '#A82B24', '#701917'],
            secondary: ['#EDBF73', '#A5601A', '#7E4715'],
            bg: ['#F8F4EF', '#FFFFFF'],
        },
        dark: {
            primary: ['#F3C4C0', '#E89B95', '#D96A62'],
            secondary: ['#F5D9A8', '#EDBF73', '#DFA04A'],
            bg: ['#14100E', '#1E1815'],
            warning: ['#F5D9A8', '#EDBF73', '#DFA04A'],
        },
    }),
    defineTheme({
        id: 'ajvar',
        label: 'Ajvar',
        ink: '#4C1409',
        light: {
            primary: ['#E0775A', '#B8391E', '#812612'],
            secondary: ['#8D6B9C', '#5B3F6D', '#3D2949'],
            bg: ['#FAF3F0', '#FFFFFF'],
        },
        dark: {
            primary: ['#F5BBA9', '#EE9A83', '#DE7358'],
            secondary: ['#D4C1DE', '#B9A0C8', '#957AA7'],
            bg: ['#160F0D', '#1F1614'],
        },
    }),
    defineTheme({
        id: 'bundeva',
        label: 'Bundeva',
        ink: '#4A2408',
        light: {
            primary: ['#E6935A', '#B5520F', '#84400E'],
            secondary: ['#4F9A98', '#1F6B69', '#124746'],
            bg: ['#FAF4EE', '#FFFFFF'],
        },
        dark: {
            primary: ['#F6C7A0', '#F0A76E', '#E08447'],
            secondary: ['#A9DAD8', '#7BC4C1', '#4E9D9A'],
            bg: ['#15100C', '#1F1813'],
        },
    }),
    defineTheme({
        id: 'kajsija',
        label: 'Kajsija',
        ink: '#1B2C40',
        light: {
            primary: ['#7D93AE', '#3F5B7C', '#293D54'],
            secondary: ['#F2B07E', '#A85E1C', '#88501E'],
            bg: ['#F6F4F1', '#FFFFFF'],
        },
        dark: {
            primary: ['#C4D2E4', '#9FB5CF', '#7590AF'],
            secondary: ['#F8D2B0', '#F3B784', '#E09455'],
            bg: ['#12100E', '#1B1815'],
        },
    }),
    defineTheme({
        id: 'med',
        label: 'Med',
        ink: '#3F2A08',
        light: {
            primary: ['#D9A23C', '#946308', '#6B4808'],
            secondary: ['#8F6A50', '#5E3F28', '#3F2A1A'],
            bg: ['#FBF6EC', '#FFFFFF'],
        },
        dark: {
            primary: ['#F6D993', '#EEC466', '#D9A23C'],
            secondary: ['#DFC3AD', '#C9A184', '#A87C5C'],
            bg: ['#151109', '#1F1911'],
        },
    }),
    defineTheme({
        id: 'kafa',
        label: 'Kafa',
        ink: '#3D2413',
        light: {
            primary: ['#8D6A4F', '#5C3A21', '#3D2413'],
            secondary: ['#E0AC6A', '#A0621C', '#83511B'],
            bg: ['#F7F3EE', '#FFFFFF'],
            warning: ['#E0AC6A', '#A0621C', '#83511B'],
        },
        dark: {
            primary: ['#E3CDB9', '#CDAA8B', '#A98363'],
            secondary: ['#F2D3A3', '#E6B56E', '#C98F3E'],
            bg: ['#14100D', '#1E1814'],
            warning: ['#F2D3A3', '#E6B56E', '#C98F3E'],
        },
    }),
    defineTheme({
        id: 'lipa',
        label: 'Lipa',
        ink: '#1E3A10',
        light: {
            primary: ['#8DC26A', '#457A25', '#33601A'],
            secondary: ['#E2B551', '#8F6B0E', '#72570D'],
            bg: ['#F4F8F0', '#FFFFFF'],
        },
        dark: {
            primary: ['#C7E5B3', '#A6D68A', '#7DB95E'],
            secondary: ['#F3D98F', '#E9C65F', '#CFA63A'],
            bg: ['#0F140C', '#181F14'],
        },
    }),
    defineTheme({
        id: 'maslina',
        label: 'Maslina',
        ink: '#2E3510',
        light: {
            primary: ['#8E9A4A', '#5B6B1F', '#3C4713'],
            secondary: ['#D98C6C', '#B5573A', '#7E3A25'],
            bg: ['#F5F5EE', '#FFFFFF'],
        },
        dark: {
            primary: ['#D4DC9C', '#B8C46E', '#8E9A4A'],
            secondary: ['#F2BFA8', '#E39A7E', '#C9714F'],
            bg: ['#121309', '#1B1C12'],
        },
    }),
    defineTheme({
        id: 'suma',
        label: 'Šuma',
        ink: '#10241A',
        light: {
            primary: ['#5E9A7C', '#2F6B4F', '#1D4633'],
            secondary: ['#D6BE6A', '#8A6D1F', '#5F4A12'],
            bg: ['#F3F6F1', '#FFFFFF'],
            warning: ['#C9A94A', '#8A6D1F', '#5F4A12'],
        },
        dark: {
            primary: ['#B7DCC6', '#8CC7A6', '#5E9A7C'],
            secondary: ['#EEDFA6', '#D6BE6A', '#B99B3E'],
            bg: ['#0F1512', '#171F1A'],
            warning: ['#EEDFA6', '#D6BE6A', '#B99B3E'],
        },
    }),
    defineTheme({
        id: 'nana',
        label: 'Nana',
        ink: '#0F3A2E',
        light: {
            primary: ['#5FB89F', '#1C7A61', '#145546'],
            secondary: ['#9C7A66', '#6B4A38', '#492F22'],
            bg: ['#F0F7F4', '#FFFFFF'],
        },
        dark: {
            primary: ['#B4E6D7', '#86D3BE', '#57B09A'],
            secondary: ['#DCC3B4', '#C6A48F', '#A47F68'],
            bg: ['#0E1512', '#171F1B'],
        },
    }),
    defineTheme({
        id: 'tirkiz',
        label: 'Tirkiz',
        ink: '#0B3A39',
        light: {
            primary: ['#4FC1C0', '#137A78', '#0F5B5A'],
            secondary: ['#F08A78', '#C4483A', '#8B2F25'],
            bg: ['#EFF7F7', '#FFFFFF'],
        },
        dark: {
            primary: ['#A9E6E5', '#7AD5D3', '#48B4B2'],
            secondary: ['#F8BDB2', '#F29A8C', '#E06E5F'],
            bg: ['#0C1515', '#151F1F'],
        },
    }),
    defineTheme({
        id: 'more',
        label: 'More',
        ink: '#0F2233',
        light: {
            primary: ['#5B93BE', '#1F5F8B', '#143F5D'],
            secondary: ['#6CC3B5', '#1A7A6C', '#125E53'],
            bg: ['#F1F5F8', '#FFFFFF'],
        },
        dark: {
            primary: ['#BBD6EA', '#8FBBD9', '#5B93BE'],
            secondary: ['#A8E3D9', '#7CCFC1', '#4FA697'],
            bg: ['#0E1418', '#161E24'],
        },
    }),
    defineTheme({
        id: 'nebo',
        label: 'Nebo',
        ink: '#0F2E48',
        light: {
            primary: ['#5FA8DE', '#1F72B0', '#144C78'],
            secondary: ['#D9B98A', '#8A6A36', '#6B5330'],
            bg: ['#F1F6FA', '#FFFFFF'],
        },
        dark: {
            primary: ['#B9DAF2', '#8FC3EA', '#5FA8DE'],
            secondary: ['#EAD5B3', '#D9BE8F', '#B99A62'],
            bg: ['#0D1319', '#151D25'],
        },
    }),
    defineTheme({
        id: 'ponoc',
        label: 'Ponoć',
        ink: '#101B36',
        light: {
            primary: ['#5A6F9E', '#243B6B', '#162545'],
            secondary: ['#E4B04E', '#96690F', '#7F5910'],
            bg: ['#F2F4F8', '#FFFFFF'],
        },
        dark: {
            primary: ['#C0CDEB', '#9AAEDF', '#6F88C4'],
            secondary: ['#F4D48E', '#E9BE63', '#CF9E38'],
            bg: ['#0C1019', '#141A27'],
        },
    }),
    defineTheme({
        id: 'zumbul',
        label: 'Zumbul',
        ink: '#1B2150',
        light: {
            primary: ['#7F8FD6', '#4552A9', '#2D3675'],
            secondary: ['#F0A98A', '#B25433', '#8E4A2F'],
            bg: ['#F3F4FA', '#FFFFFF'],
        },
        dark: {
            primary: ['#C9D0F3', '#A9B3EA', '#7F8FD6'],
            secondary: ['#F8CDB9', '#F2AD90', '#DF8663'],
            bg: ['#0F1018', '#181925'],
        },
    }),
    defineTheme({
        id: 'lavanda',
        label: 'Lavanda',
        ink: '#2C2150',
        light: {
            primary: ['#A48ED2', '#6D56A8', '#4A3878'],
            secondary: ['#93B59A', '#4F7F5E', '#345742'],
            bg: ['#F5F3F9', '#FFFFFF'],
        },
        dark: {
            primary: ['#D9CDF0', '#BCA9E4', '#9A83CF'],
            secondary: ['#C2DCC6', '#9FC7A8', '#73A47F'],
            bg: ['#12101A', '#1B1826'],
        },
    }),
    defineTheme({
        id: 'sljiva',
        label: 'Šljiva',
        ink: '#2A1538',
        light: {
            primary: ['#9B76BB', '#6A3D8F', '#472762'],
            secondary: ['#D98AA8', '#B0446E', '#7C2E4C'],
            bg: ['#F6F3F8', '#FFFFFF'],
        },
        dark: {
            primary: ['#D8C6E8', '#C0A4DA', '#9B76BB'],
            secondary: ['#F1BFD0', '#E39BB6', '#D06F92'],
            bg: ['#130F17', '#1C1622'],
        },
    }),
    defineTheme({
        id: 'malina',
        label: 'Malina',
        ink: '#4A0E27',
        light: {
            primary: ['#D66D93', '#B0275B', '#7A1A3F'],
            secondary: ['#6FA58A', '#2E7057', '#1D4B3A'],
            bg: ['#F9F3F5', '#FFFFFF'],
        },
        dark: {
            primary: ['#F4C0D3', '#EC98B8', '#DC6C95'],
            secondary: ['#B4DCC6', '#8CC9A9', '#5EA684'],
            bg: ['#160E12', '#20161B'],
        },
    }),
    defineTheme({
        id: 'grafit',
        label: 'Grafit',
        ink: '#1C1F23',
        light: {
            primary: ['#7A7F86', '#3B4047', '#22262B'],
            secondary: ['#D49A72', '#A9642F', '#78461F'],
            bg: ['#F4F4F3', '#FFFFFF'],
        },
        dark: {
            primary: ['#DADDE1', '#BFC4CA', '#979DA5'],
            secondary: ['#EDC5A8', '#DDA57F', '#C0834F'],
            bg: ['#111213', '#1A1C1E'],
        },
    }),
]

export const DEFAULT_THEME_ID = APP_THEMES[0].id

/** Ime MUI color scheme-a za temu i mod. Podrazumevana tema zadržava `light`/`dark`. */
export function schemeName(themeId: string, mode: 'light' | 'dark'): string {
    return themeId === DEFAULT_THEME_ID ? mode : `${themeId}-${mode}`
}

/** Iz imena šeme (npr. `suma-dark`) vraća id teme. */
export function themeIdFromScheme(scheme: string | undefined | null): string {
    if (!scheme) return DEFAULT_THEME_ID
    const id = scheme.replace(/-(light|dark)$/, '')
    return APP_THEMES.some((t) => t.id === id) ? id : DEFAULT_THEME_ID
}

function palette(spec: SchemeSpec, mode: 'light' | 'dark') {
    const isDark = mode === 'dark'
    return {
        mode,
        primary: spec.primary,
        secondary: spec.secondary,
        success: spec.success,
        warning: spec.warning,
        error: spec.error,
        info: spec.info,
        background: spec.background,
        text: spec.text,
        divider: alpha(spec.ink, isDark ? 0.12 : 0.14),
        action: {
            hover: alpha(spec.ink, isDark ? 0.06 : 0.04),
            selected: alpha(spec.primary.main, isDark ? 0.16 : 0.08),
            focus: alpha(spec.primary.main, isDark ? 0.2 : 0.12),
        },
    }
}

// Ugrađene šeme (light/dark) MUI sam propušta kroz createColorScheme; prilagođene mora da dobije već gotove.
const colorSchemes = Object.fromEntries(
    APP_THEMES.flatMap((t) => [
        [schemeName(t.id, 'light'), createColorScheme({ palette: palette(t.light, 'light') })],
        [schemeName(t.id, 'dark'), createColorScheme({ palette: palette(t.dark, 'dark') })],
    ]),
) as Record<SupportedColorScheme, ColorSystemOptions>

const softShadow = (y: number, blur: number, a: number) => `0px ${y}px ${blur}px 0px rgba(28, 22, 18, ${a})`

const shadows = [
    'none',
    softShadow(1, 2, 0.05),
    `${softShadow(1, 3, 0.06)}, ${softShadow(2, 8, 0.04)}`,
    `${softShadow(2, 4, 0.06)}, ${softShadow(4, 12, 0.05)}`,
    `${softShadow(2, 6, 0.07)}, ${softShadow(6, 16, 0.05)}`,
    `${softShadow(3, 8, 0.08)}, ${softShadow(8, 20, 0.06)}`,
    `${softShadow(4, 10, 0.08)}, ${softShadow(10, 24, 0.06)}`,
    `${softShadow(4, 12, 0.09)}, ${softShadow(12, 28, 0.07)}`,
    `${softShadow(6, 14, 0.09)}, ${softShadow(14, 32, 0.07)}`,
    ...Array.from({ length: 16 }, (_, i) => `${softShadow(6 + i, 16 + i * 2, 0.1)}, ${softShadow(16 + i * 2, 36 + i * 3, 0.08)}`),
] as unknown as Theme['shadows']

const theme = createTheme({
    cssVariables: {
        colorSchemeSelector: 'class',
    },
    colorSchemes,

    shape: { borderRadius: 14 },
    shadows,

    typography: {
        fontFamily: 'var(--font-sans), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        h1: {
            fontFamily: 'var(--font-display), Georgia, serif',
            fontWeight: 600,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontFamily: 'var(--font-display), Georgia, serif',
            fontWeight: 600,
            letterSpacing: '-0.02em',
        },
        h3: {
            fontFamily: 'var(--font-display), Georgia, serif',
            fontWeight: 600,
            letterSpacing: '-0.015em',
        },
        h4: {
            fontFamily: 'var(--font-display), Georgia, serif',
            fontWeight: 600,
            letterSpacing: '-0.015em',
            fontSize: 'clamp(1.6rem, 1.3rem + 1.4vw, 2.125rem)',
        },
        h5: {
            fontFamily: 'var(--font-display), Georgia, serif',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            fontSize: 'clamp(1.3rem, 1.15rem + 0.7vw, 1.5rem)',
        },
        h6: {
            fontFamily: 'var(--font-display), Georgia, serif',
            fontWeight: 600,
        },
        subtitle1: { fontWeight: 600 },
        subtitle2: { fontWeight: 600, letterSpacing: '0.01em' },
        body1: { lineHeight: 1.6 },
        body2: { lineHeight: 1.55 },
        button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
        overline: { fontWeight: 700, letterSpacing: '0.09em' },
    },

    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility',
                },
            },
        },

        MuiPaper: {
            styleOverrides: { root: { backgroundImage: 'none' } },
        },

        MuiCard: {
            defaultProps: { variant: 'outlined' },
            styleOverrides: {
                root: ({ theme: t }) => ({
                    borderColor: t.vars.palette.divider,
                    transition: t.transitions.create(['border-color', 'box-shadow', 'background-color'], { duration: 180 }),
                }),
            },
        },

        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: ({ theme: t }) => ({
                    borderRadius: 999,
                    paddingInline: 18,
                    transition: t.transitions.create(['background-color', 'box-shadow', 'transform', 'border-color'], { duration: 160 }),
                    '&:active': { transform: 'translateY(1px)' },
                }),
                sizeLarge: { paddingBlock: 11, fontSize: '1rem' },
                contained: ({ theme: t }) => ({
                    boxShadow: t.shadows[2],
                    '&:hover': { boxShadow: t.shadows[4] },
                }),
                outlined: { borderWidth: 1.5, '&:hover': { borderWidth: 1.5 } },
            },
        },

        MuiIconButton: {
            styleOverrides: {
                root: ({ theme: t }) => ({
                    transition: t.transitions.create(['background-color', 'color'], {
                        duration: 150,
                    }),
                }),
            },
        },

        MuiChip: {
            styleOverrides: {
                root: { fontWeight: 600 },
                sizeSmall: { height: 23, fontSize: '0.75rem' },
                outlined: { borderWidth: 1.5 },
            },
        },

        MuiOutlinedInput: {
            styleOverrides: {
                root: ({ theme: t }) => ({
                    borderRadius: 12,
                    backgroundColor: t.vars.palette.background.paper,
                    transition: t.transitions.create(['border-color', 'box-shadow'], {
                        duration: 150,
                    }),
                    '&.Mui-focused': {
                        boxShadow: `0 0 0 3px rgba(${t.vars.palette.primary.mainChannel} / 0.16)`,
                    },
                }),
            },
        },

        MuiAlert: {
            defaultProps: { variant: 'outlined' },
            styleOverrides: {
                root: { borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
                standard: { borderWidth: 0 },
            },
        },

        MuiAppBar: {
            styleOverrides: { root: { backgroundImage: 'none' } },
        },

        MuiToggleButton: {
            styleOverrides: {
                root: { textTransform: 'none', fontWeight: 600 },
            },
        },

        MuiTabs: {
            styleOverrides: {
                root: { minHeight: 44 },
                indicator: { height: 3, borderRadius: 3 },
            },
        },

        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    minHeight: 44,
                },
            },
        },

        MuiDialog: {
            styleOverrides: {
                paper: ({ theme: t }) => ({
                    borderRadius: 18,
                    boxShadow: t.shadows[8],
                }),
            },
        },

        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontFamily: 'var(--font-display), Georgia, serif',
                    fontWeight: 600,
                },
            },
        },

        MuiTooltip: {
            styleOverrides: {
                tooltip: ({ theme: t }) => ({
                    borderRadius: 8,
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    padding: '6px 10px',
                    // obrnute boje teksta i pozadine – radi u svakoj temi i modu
                    backgroundColor: `rgba(${t.vars.palette.text.primaryChannel} / 0.94)`,
                    color: t.vars.palette.background.paper,
                }),
                arrow: ({ theme: t }) => ({
                    color: `rgba(${t.vars.palette.text.primaryChannel} / 0.94)`,
                }),
            },
        },

        MuiDivider: {
            styleOverrides: {
                root: ({ theme: t }) => ({ borderColor: t.vars.palette.divider }),
            },
        },

        MuiSnackbarContent: {
            styleOverrides: { root: { borderRadius: 12 } },
        },

        MuiLinearProgress: {
            styleOverrides: { root: { borderRadius: 999, height: 6 } },
        },

        MuiSkeleton: {
            defaultProps: { animation: 'wave' },
            styleOverrides: { root: { borderRadius: 10 } },
        },
    },
})

export default theme
