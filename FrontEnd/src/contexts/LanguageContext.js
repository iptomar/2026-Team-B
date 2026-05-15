import React, { createContext, useState, useEffect, useContext } from 'react';
import translations from '../translations.json';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
	const [language, setLanguage] = useState('en');

	useEffect(() => {
		const storedLang = localStorage.getItem('language');
		if (storedLang && ['en', 'pt', 'es', 'de', 'fr'].includes(storedLang)) {
			setLanguage(storedLang);
		}
	}, []);

	const changeLanguage = (lang) => {
		setLanguage(lang);
		localStorage.setItem('language', lang);
	};

	const t = (key) => {
		if (translations[key] && translations[key][language]) {
			return translations[key][language];
		}
		// Fallback to key itself if not found
		return key;
	};

	return (
		<LanguageContext.Provider value={{ language, changeLanguage, t }}>
			{children}
		</LanguageContext.Provider>
	);
};

export const useLanguage = () => {
	return useContext(LanguageContext);
};
