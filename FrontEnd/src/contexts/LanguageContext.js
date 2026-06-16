import React, { createContext, useState, useEffect, useContext } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
	const [language, setLanguage] = useState('en');
	const [translations, setTranslations] = useState({});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const storedLang = localStorage.getItem('language');
		if (storedLang && ['af', 'sq', 'am', 'ar', 'hy', 'as', 'ay', 'az', 'bm', 'eu', 'be', 'bn', 'bho', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da', 'dv', 'doi', 'nl', 'en', 'eo', 'et', 'ee', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gn', 'gu', 'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is', 'ig', 'ilo', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw', 'gom', 'ko', 'kri', 'ku', 'ckb', 'ky', 'lo', 'la', 'lv', 'ln', 'lt', 'lg', 'lb', 'mk', 'mai', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mni-Mtei', 'lus', 'mn', 'my', 'ne', 'no', 'or', 'om', 'ps', 'fa', 'pl', 'pt', 'pa', 'qu', 'ro', 'ru', 'sm', 'sa', 'gd', 'nso', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'ti', 'ts', 'tr', 'tk', 'ak', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu'].includes(storedLang)) {
			setLanguage(storedLang);
		}
	}, []);

	useEffect(() => {
		fetch('/translations.json')
			.then(res => res.json())
			.then(data => {
				setTranslations(data);
				setLoading(false);
			})
			.catch(err => {
				console.error("Failed to load translations", err);
				setLoading(false); // Render anyway if it fails
			});
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
			{!loading && children}
		</LanguageContext.Provider>
	);
};

export const useLanguage = () => {
	return useContext(LanguageContext);
};
