import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter } from 'react-router-dom';
import darkTheme from './theme/darkTheme';
import AppRouter from './routes/AppRouter';
import './styles/animations.css';

/**
 * Main application entry point with Diganthadeepa theme
 */
const Main = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default Main;
