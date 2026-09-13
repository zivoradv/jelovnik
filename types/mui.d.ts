import '@mui/material/styles';

/**
 * Tema koristi CSS promenljive (`createTheme({ cssVariables: ... })`),
 * pa ovim TypeScript-u javljamo da `theme.vars` postoji.
 * Bez ovoga `theme.vars` prijavljuje grešku u `sx` funkcijama.
 */
declare module '@mui/material/styles' {
  interface CssThemeVariables {
    enabled: true;
  }
}
