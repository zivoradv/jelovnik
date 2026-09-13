'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';

/**
 * Logotip aplikacije: zaobljeni znak sa priborom + naziv u serif pismu.
 */
export default function BrandMark({
  size = 'md',
  showText = true,
}: {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}) {
  const dims = { sm: 32, md: 38, lg: 56 }[size];
  const iconSize = { sm: 18, md: 22, lg: 32 }[size];
  const textVariant = { sm: 'subtitle1', md: 'h6', lg: 'h5' }[size] as
    | 'subtitle1'
    | 'h6'
    | 'h5';

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Box
        aria-hidden
        sx={(t) => ({
          width: dims,
          height: dims,
          flexShrink: 0,
          borderRadius: `${dims * 0.32}px`,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          background: `linear-gradient(145deg, ${t.vars.palette.primary.light}, ${t.vars.palette.primary.dark})`,
          boxShadow: t.shadows[2],
          ...t.applyStyles('dark', {
            color: t.vars.palette.primary.contrastText,
          }),
        })}
      >
        <RestaurantMenuIcon sx={{ fontSize: iconSize }} />
      </Box>

      {showText && (
        <Typography
          variant={textVariant}
          sx={{ fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1 }}
        >
          Jelovnik
        </Typography>
      )}
    </Stack>
  );
}
