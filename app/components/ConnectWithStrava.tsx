import React from 'react';
import { Button, createTheme } from '@mui/material';
import StravaIcon from './CustomIcons';
import { ThemeProvider } from '@mui/material/styles';

interface ButtonProps {
  onClick: () => void;
}

// Extend MUI's theme to include a custom color for Strava
declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    strava: true;
  }
}

const theme = createTheme({})
const stravaTheme = createTheme(theme,{
  palette: {
    strava: theme.palette.augmentColor({
      color: {
        main: '#FF5500',
      },
      name: 'strava',
    }),
  },
}
)

const ConnectWithStrava: React.FC<ButtonProps> = ({onClick}) => (
  <ThemeProvider theme={stravaTheme}>
    <Button
      fullWidth
      color="strava"
      variant="outlined"
      onClick={onClick}
      startIcon={<StravaIcon />}
    >
      Connect with Strava
    </Button>
  </ThemeProvider>
);

export default ConnectWithStrava;
