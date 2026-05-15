import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSelector.css';

const LANGUAGES = [
	{ code: 'en', flag: '🇬🇧', name: 'English' },
	{ code: 'pt', flag: '🇵🇹', name: 'Português' },
	{ code: 'es', flag: '🇪🇸', name: 'Español' },
	{ code: 'de', flag: '🇩🇪', name: 'Deutsch' },
	{ code: 'fr', flag: '🇫🇷', name: 'Français' },
];

export default function LanguageSelector() {
	const { language, changeLanguage } = useLanguage();
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		const handler = (e) => {
			if (ref.current && !ref.current.contains(e.target)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	// eslint-disable-next-line no-unused-vars
	const selected = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

	return (
		<div className="lang-selector" ref={ref}>
			<button
				className="lang-selector-btn"
				onClick={() => setOpen(!open)}
				title="Change language"
				aria-label="Change language"
			>
				🌍
			</button>

			{open && (
				<div className="lang-selector-dropdown">
					{LANGUAGES.map(lang => (
						<button
							key={lang.code}
							className={`lang-selector-item ${lang.code === language ? 'active' : ''}`}
							onClick={() => { changeLanguage(lang.code); setOpen(false); }}
						>
							<span className="lang-flag">{lang.flag}</span>
							<span className="lang-name">{lang.name}</span>
							{lang.code === language && <span className="lang-check">✓</span>}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
