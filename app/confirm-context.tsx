'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react'

export interface ConfirmOptions {
    title: string
    message?: ReactNode
    /** Tekst dugmeta za potvrdu (podrazumevano „Potvrdi”). */
    confirmText?: string
    cancelText?: string
    /** Crveno dugme – za brisanje i druge nepovratne radnje. */
    danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Zamena za window.confirm: `const ok = await confirm({ title: 'Obrisati?', danger: true })`.
 * Jedan dijalog za ceo projekat, u temi aplikacije.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [options, setOptions] = useState<ConfirmOptions | null>(null)
    const [open, setOpen] = useState(false)
    const resolver = useRef<((value: boolean) => void) | null>(null)

    const confirm = useCallback<ConfirmFn>((opts) => {
        // ako je neki dijalog već otvoren, prethodni poziv dobija „ne”
        resolver.current?.(false)
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve
            setOptions(opts)
            setOpen(true)
        })
    }, [])

    function settle(value: boolean) {
        resolver.current?.(value)
        resolver.current = null
        setOpen(false)
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Dialog
                open={open}
                onClose={() => settle(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{ transition: { onExited: () => setOptions(null) } }}
                aria-labelledby="confirm-dialog-title"
            >
                <DialogTitle id="confirm-dialog-title">{options?.title}</DialogTitle>
                {options?.message && (
                    <DialogContent>
                        {typeof options.message === 'string' ? <DialogContentText>{options.message}</DialogContentText> : options.message}
                    </DialogContent>
                )}
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => settle(false)} color="inherit">
                        {options?.cancelText ?? 'Otkaži'}
                    </Button>
                    <Button onClick={() => settle(true)} variant="contained" color={options?.danger ? 'error' : 'primary'} autoFocus>
                        {options?.confirmText ?? 'Potvrdi'}
                    </Button>
                </DialogActions>
            </Dialog>
        </ConfirmContext.Provider>
    )
}

export function useConfirm(): ConfirmFn {
    const ctx = useContext(ConfirmContext)
    if (!ctx) throw new Error('useConfirm mora biti unutar ConfirmProvider-a.')
    return ctx
}
