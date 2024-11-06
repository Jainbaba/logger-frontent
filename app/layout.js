"use client";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LoggerProvider } from './contexts/LoggerContext';

const theme = createTheme(); // You can customize your theme here

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <LoggerProvider>
            {children}
          </LoggerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
