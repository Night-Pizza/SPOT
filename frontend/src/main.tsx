import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'antd/dist/reset.css';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <AppProvider>
                    <ThemeProvider>
                        <App />
                    </ThemeProvider>
                </AppProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
);
