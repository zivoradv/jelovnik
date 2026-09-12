'use client';

import { useColorScheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);

  // Izbegni neslaganje pri hidraciji (mode je poznat tek na klijentu).
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <IconButton color="inherit" aria-label="Promeni temu">
        <DarkModeIcon />
      </IconButton>
    );
  }

  const resolved = mode === 'system' ? systemMode : mode;
  const isDark = resolved === 'dark';

  return (
    <Tooltip title={isDark ? 'Svetla tema' : 'Tamna tema'}>
      <IconButton
        color="inherit"
        aria-label="Promeni temu"
        onClick={() => setMode(isDark ? 'light' : 'dark')}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
