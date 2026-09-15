'use client'

import CheckIcon from '@mui/icons-material/Check'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import { type SupportedColorScheme, useColorScheme } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useFun } from '../fun-context'
import { APP_THEMES, type AppTheme, schemeName, themeIdFromScheme } from '../theme'

/**
 * Vraća id izabrane teme i funkciju za promenu; svetlo/tamno ostaje kako je podešeno.
 * `themeId` je na serveru uvek podrazumevani – koristi ga samo u UI koji se renderuje posle mount-a (popover, profil).
 */
export function useAppTheme(): { themeId: string; setThemeId: (id: string) => void } {
    const { lightColorScheme, setColorScheme } = useColorScheme()
    return {
        themeId: themeIdFromScheme(lightColorScheme),
        setThemeId: (id) =>
            setColorScheme({
                light: schemeName(id, 'light') as SupportedColorScheme,
                dark: schemeName(id, 'dark') as SupportedColorScheme,
            }),
    }
}

function Swatch({ theme, size = 34 }: { theme: AppTheme; size?: number }) {
    return (
        <Box
            aria-hidden
            sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${theme.swatch[0]} 50%, ${theme.swatch[1]} 50%)`,
                boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.12)',
            }}
        />
    )
}

/** Mreža tema – koristi se i u popover-u u zaglavlju i na stranici profila. */
export function ThemeList({ onPick }: { onPick?: () => void }) {
    const { themeId, setThemeId } = useAppTheme()
    const { toast } = useFun()

    function pick(t: AppTheme) {
        if (t.id !== themeId) {
            setThemeId(t.id)
            toast(`Tema „${t.label}”`)
        }
        onPick?.()
    }

    return (
        <Box
            role="radiogroup"
            aria-label="Tema"
            sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
                gap: 0.75,
            }}
        >
            {APP_THEMES.map((t) => {
                const active = t.id === themeId
                return (
                    <ButtonBase
                        key={t.id}
                        role="radio"
                        aria-checked={active}
                        onClick={() => pick(t)}
                        sx={(th) => ({
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1,
                            py: 1.25,
                            borderRadius: 2.5,
                            border: '1.5px solid',
                            borderColor: active ? 'primary.main' : th.vars.palette.divider,
                            bgcolor: active ? th.vars.palette.action.selected : 'transparent',
                            transition: th.transitions.create(['border-color', 'background-color'], { duration: 150 }),
                            '&:hover': { bgcolor: th.vars.palette.action.hover },
                        })}
                    >
                        <Swatch theme={t} />
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, lineHeight: 1.2, color: active ? 'primary.main' : 'text.primary' }}
                        >
                            {t.label}
                        </Typography>
                        {active && (
                            <Box
                                aria-hidden
                                sx={{
                                    position: 'absolute',
                                    top: 5,
                                    right: 5,
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    display: 'grid',
                                    placeItems: 'center',
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                }}
                            >
                                <CheckIcon sx={{ fontSize: 12 }} />
                            </Box>
                        )}
                    </ButtonBase>
                )
            })}
        </Box>
    )
}

/** Dugme u zaglavlju koje otvara izbor teme. */
export default function ThemePicker({ withLabel = false }: { withLabel?: boolean }) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)

    const trigger = withLabel ? (
        <Button
            startIcon={<PaletteOutlinedIcon />}
            onClick={(e) => setAnchor(e.currentTarget)}
            color="inherit"
            sx={{ color: 'text.secondary' }}
        >
            Tema
        </Button>
    ) : (
        <Tooltip title="Izaberi temu">
            <span>
                <IconButton
                    aria-label="Izaberi temu"
                    onClick={(e) => setAnchor(e.currentTarget)}
                    sx={(t) => ({
                        color: 'text.secondary',
                        '&:hover': { color: 'primary.main', bgcolor: t.vars.palette.action.hover },
                        mr: 1,
                    })}
                >
                    <PaletteOutlinedIcon />
                </IconButton>
            </span>
        </Tooltip>
    )

    return (
        <>
            {trigger}
            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            width: 'min(400px, calc(100vw - 32px))',
                            maxHeight: 'min(520px, calc(100dvh - 96px))',
                            mt: 1,
                            borderRadius: 1,
                            p: 1,
                        },
                    },
                }}
            >
                <ThemeList onPick={() => setAnchor(null)} />
            </Popover>
        </>
    )
}
