import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './utils/fetchInterceptor';

if (!process.env.REACT_APP_API_URL) {
	console.warn('⚠️ WARNING: REACT_APP_API_URL is not set. API calls will likely fail.');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
