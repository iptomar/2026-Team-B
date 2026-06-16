import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSelector.css';

export const LANGUAGES = [
	{ code: 'en', flag: '🇬🇧', name: 'English' },
	{ code: 'pt', flag: '🇵🇹', name: 'Português' },
	{ code: 'es', flag: '🇪🇸', name: 'Español' },
	{ code: 'de', flag: '🇩🇪', name: 'Deutsch' },
	{ code: 'fr', flag: '🇫🇷', name: 'Français' },
	{ code: 'it', flag: '🇮🇹', name: 'Italiano' },
	{ code: 'ar', flag: '🇸🇦', name: 'العربية' },
	{ code: 'zh', flag: '🇨🇳', name: '中文' },
	{ code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
	{ code: 'ru', flag: '🇷🇺', name: 'Русский' },
	{ code: 'ja', flag: '🇯🇵', name: '日本語' },
	{ code: 'el', flag: '🇬🇷', name: 'Ελληνικά' },
	{ code: 'ko', flag: '🇰🇷', name: '한국어' },
	{ code: 'id', flag: '🇮🇩', name: 'Bahasa Indonesia' },
	{ code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
	{ code: 'ms', flag: '🇲🇾', name: 'Bahasa Melayu' },
	{ code: 'iw', flag: '🇮🇱', name: 'עברית' },
	{ code: 'eu', flag: '🏴󠁥󠁳󠁰󠁶󠁿', name: 'Euskara' },
	{ code: 'ka', flag: '🇬🇪', name: 'ქართული' },
	{ code: 'hy', flag: '🇦🇲', name: 'Հայերեն' },
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
				{selected.flag}
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
