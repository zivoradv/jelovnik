'use client'

import type { Theme } from '@mui/material/styles'
import { alpha, createTheme } from '@mui/material/styles'

const BRAND = {
    50: '#FDF3F2',
    100: '#FAE3E1',
    200: '#F3C4C0',
    300: '#E89B95',
    400: '#D96A62',
    500: '#C4443B',
    600: '#A82B24',
    700: '#8C1E1A',
    800: '#701917',
    900: '#4F1210',
} as const

const ACCENT = {
    200: '#F5D9A8',
    300: '#EDBF73',
    400: '#DFA04A',
    500: '#C77C22',
    600: '#A5601A',
    700: '#7E4715',
} as const

const SAND = {
    25: '#FCFAF7',
    50: '#F8F4EF',
    100: '#F0E9E1',
    200: '#E3D9CE',
    300: '#CFC2B4',
    400: '#A9998A',
    500: '#827466',
    600: '#655A4F',
    700: '#4A4139',
    800: '#2F2925',
    900: '#1C1815',
} as const

const warmShadow = (y: number, blur: number, a: number) => `0px ${y}px ${blur}px 0px rgba(74, 47, 34, ${a})`

const shadows = [
    'none',
    warmShadow(1, 2, 0.05),
    `${warmShadow(1, 3, 0.06)}, ${warmShadow(2, 8, 0.04)}`,
    `${warmShadow(2, 4, 0.06)}, ${warmShadow(4, 12, 0.05)}`,
    `${warmShadow(2, 6, 0.07)}, ${warmShadow(6, 16, 0.05)}`,
    `${warmShadow(3, 8, 0.08)}, ${warmShadow(8, 20, 0.06)}`,
    `${warmShadow(4, 10, 0.08)}, ${warmShadow(10, 24, 0.06)}`,
    `${warmShadow(4, 12, 0.09)}, ${warmShadow(12, 28, 0.07)}`,
    `${warmShadow(6, 14, 0.09)}, ${warmShadow(14, 32, 0.07)}`,
    ...Array.from({ length: 16 }, (_, i) => `${warmShadow(6 + i, 16 + i * 2, 0.1)}, ${warmShadow(16 + i * 2, 36 + i * 3, 0.08)}`),
] as unknown as Theme['shadows']

const theme = createTheme({
    cssVariables: {
        colorSchemeSelector: 'class',
    },
    colorSchemes: {
        light: {
            palette: {
                primary: {
                    light: BRAND[400],
                    main: BRAND[600],
                    dark: BRAND[800],
                    contrastText: '#FFFFFF',
                },
                secondary: {
                    light: ACCENT[300],
                    main: ACCENT[600],
                    dark: ACCENT[700],
                    contrastText: '#FFFFFF',
                },
                success: { main: '#2E7D4F', light: '#5CA678', dark: '#1F5836' },
                warning: { main: ACCENT[600], light: ACCENT[400], dark: ACCENT[700] },
                error: { main: '#C0392B', light: '#E07669', dark: '#8E2A1F' },
                info: { main: '#3B6E8F', light: '#6C9BB8', dark: '#274C65' },
                background: { default: SAND[50], paper: '#FFFFFF' },
                text: {
                    primary: SAND[900],
                    secondary: SAND[600],
                    disabled: SAND[400],
                },
                divider: SAND[200],
                action: {
                    hover: alpha(BRAND[900], 0.04),
                    selected: alpha(BRAND[600], 0.08),
                    focus: alpha(BRAND[600], 0.12),
                },
            },
        },
        dark: {
            palette: {
                primary: {
                    light: BRAND[200],
                    main: BRAND[300],
                    dark: BRAND[400],
                    contrastText: '#2B0F0D',
                },
                secondary: {
                    light: ACCENT[200],
                    main: ACCENT[300],
                    dark: ACCENT[400],
                    contrastText: '#2A1A08',
                },
                success: { main: '#6FC08D', light: '#9BD6B0', dark: '#3E8A5C' },
                warning: { main: ACCENT[300], light: ACCENT[200], dark: ACCENT[400] },
                error: { main: '#EF8A7C', light: '#F5B3A9', dark: '#C0392B' },
                info: { main: '#8FBBD6', light: '#B6D3E5', dark: '#5D8FAC' },
                background: { default: '#14100E', paper: '#1E1815' },
                text: {
                    primary: '#F5EEE7',
                    secondary: '#B5A69A',
                    disabled: '#7A6C61',
                },
                divider: alpha('#F5EEE7', 0.12),
                action: {
                    hover: alpha('#F5EEE7', 0.06),
                    selected: alpha(BRAND[300], 0.16),
                    focus: alpha(BRAND[300], 0.2),
                },
            },
        },
    },

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
                    transition: t.transitions.create(['border-color', 'box-shadow', 'transform', 'background-color'], { duration: 180 }),
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
                        boxShadow: `0 0 0 3px ${alpha(BRAND[500], 0.16)}`,
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
                    backgroundColor: alpha(SAND[900], 0.94),
                    ...t.applyStyles('dark', {
                        backgroundColor: alpha(SAND[700], 0.96),
                    }),
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

export { ACCENT, BRAND, SAND }
export default theme
