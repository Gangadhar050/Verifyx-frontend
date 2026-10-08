import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import './global.css';
import App from './App.jsx';
import './ultimate-theme.css';
import { enableUiFirstLetterCapitalization } from './utils/capitalizeUiText';

const rootElement = document.getElementById('root');
createRoot(rootElement).render(<React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>);
window.requestAnimationFrame(() => enableUiFirstLetterCapitalization(rootElement));
