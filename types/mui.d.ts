import '@mui/material/styles'

declare module '@mui/material/styles' {
    interface CssThemeVariables {
        enabled: true
    }

    /** Teme aplikacije (app/theme.ts): svaka ima svetlu i tamnu šemu; podrazumevana koristi `light` / `dark`. */
    interface ColorSchemeOverrides {
        'suma-light': true
        'suma-dark': true
        'more-light': true
        'more-dark': true
        'sljiva-light': true
        'sljiva-dark': true
        'kafa-light': true
        'kafa-dark': true
    }
}
