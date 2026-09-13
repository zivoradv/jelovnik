'use client';

import { useColorScheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useEffect, useState } from 'react';

export default function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { mode, systemMode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);

  // Izbegni neslaganje pri hidraciji (mode je poznat tek na klijentu).
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return withLabel ? (
      <Button startIcon={<DarkModeIcon />} color="inherit" sx={{ color: 'text.secondary' }}>
        Tema
      </Button>
    ) : (
      <IconButton aria-label="Promeni temu" sx={{ color: 'text.secondary' }}>
        <DarkModeIcon />
      </IconButton>
    );
  }

  const resolved = mode === 'system' ? systemMode : mode;
  const isDark = resolved === 'dark';
  const next = isDark ? 'light' : 'dark';
  const label = isDark ? 'Svetla tema' : 'Tamna tema';
  const icon = isDark ? <LightModeIcon /> : <DarkModeIcon />;

  if (withLabel) {
    return (
      <Button
        startIcon={icon}
        onClick={() => setMode(next)}
        color="inherit"
        sx={{ color: 'text.secondary' }}
      >
        {label}
      </Button>
    );
  }

  return (
    <Tooltip title={label}>
      <IconButton
        aria-label="Promeni temu"
        onClick={() => setMode(next)}
        sx={(t) => ({
          color: 'text.secondary',
          '&:hover': {
            color: 'primary.main',
            bgcolor: t.vars.palette.action.hover,
          },
        })}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
