'use client'

import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { useMemo } from 'react'
import { NOT_FOUND_MESSAGES, randomOf } from '@/lib/fun'

export default function NotFound() {
    const message = useMemo(() => randomOf(NOT_FOUND_MESSAGES), [])
    return (
        <Card sx={{ py: 8, px: 3, textAlign: 'center', maxWidth: 520, mx: 'auto' }}>
            <Typography sx={{ fontSize: 64, lineHeight: 1, mb: 2 }}>🍽️</Typography>
            <Typography variant="h4" sx={{ mb: 1 }}>
                404
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {message}
            </Typography>
            <Button component={Link} href="/" variant="contained" startIcon={<RestaurantMenuIcon />}>
                Nazad na jelovnik
            </Button>
        </Card>
    )
}
