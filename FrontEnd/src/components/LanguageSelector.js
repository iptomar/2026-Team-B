import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSelector.css';

export const LANGUAGES = [
	{ code: 'af', flag: '🇿🇦', name: 'Afrikaans' },
	{ code: 'sq', flag: '🇦🇱', name: 'Shqip' },
	{ code: 'am', flag: '🇪🇹', name: 'አማርኛ' },
	{ code: 'ar', flag: '🇸🇦', name: 'العربية' },
	{ code: 'hy', flag: '🇦🇲', name: 'Հայերեն' },
	{ code: 'as', flag: '🇮🇳', name: 'অসমীয়া' },
	{ code: 'ay', flag: '🇧🇴', name: 'Aymar aru' },
	{ code: 'az', flag: '🇦🇿', name: 'Azərbaycan' },
	{ code: 'bm', flag: '🇲🇱', name: 'Bamanankan' },
	{ code: 'eu', flag: '🏴󠁥󠁳󠁰󠁶󠁿', name: 'Euskara' },
	{ code: 'be', flag: '🇧🇾', name: 'Беларуская' },
	{ code: 'bn', flag: '🇧🇩', name: 'বাংলা' },
	{ code: 'bho', flag: '🇮🇳', name: 'भोजपुरी' },
	{ code: 'bs', flag: '🇧🇦', name: 'Bosanski' },
	{ code: 'bg', flag: '🇧🇬', name: 'Български' },
	{ code: 'ceb', flag: '🇵🇭', name: 'Cebuano' },
	{ code: 'ny', flag: '🇲🇼', name: 'Chichewa' },
	{ code: 'zh-CN', flag: '🇨🇳', name: '中文 (简体)' },
	{ code: 'zh-TW', flag: '🇹🇼', name: '中文 (繁體)' },
	{ code: 'co', flag: '🇫🇷', name: 'Corsu' },
	{ code: 'hr', flag: '🇭🇷', name: 'Hrvatski' },
	{ code: 'cs', flag: '🇨🇿', name: 'Čeština' },
	{ code: 'da', flag: '🇩🇰', name: 'Dansk' },
	{ code: 'dv', flag: '🇲🇻', name: 'ދިވެހި' },
	{ code: 'doi', flag: '🇮🇳', name: 'डोगरी' },
	{ code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
	{ code: 'en', flag: '🇬🇧', name: 'English' },
	{ code: 'et', flag: '🇪🇪', name: 'Eesti' },
	{ code: 'ee', flag: '🇬🇭', name: 'Eʋegbe' },
	{ code: 'tl', flag: '🇵🇭', name: 'Filipino' },
	{ code: 'fi', flag: '🇫🇮', name: 'Suomi' },
	{ code: 'fr', flag: '🇫🇷', name: 'Français' },
	{ code: 'fy', flag: '🇳🇱', name: 'Frysk' },
	{ code: 'ka', flag: '🇬🇪', name: 'ქართული' },
	{ code: 'de', flag: '🇩🇪', name: 'Deutsch' },
	{ code: 'el', flag: '🇬🇷', name: 'Ελληνικά' },
	{ code: 'gn', flag: '🇵🇾', name: 'Avañe\'ẽ' },
	{ code: 'gu', flag: '🇮🇳', name: 'ગુજરાતી' },
	{ code: 'ht', flag: '🇭🇹', name: 'Kreyòl ayisyen' },
	{ code: 'ha', flag: '🇳🇬', name: 'Hausa' },
	{ code: 'haw', flag: '🇺🇸', name: 'ʻŌlelo Hawaiʻi' },
	{ code: 'iw', flag: '🇮🇱', name: 'עברית' },
	{ code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
	{ code: 'hu', flag: '🇭🇺', name: 'Magyar' },
	{ code: 'is', flag: '🇮🇸', name: 'Íslenska' },
	{ code: 'ig', flag: '🇳🇬', name: 'Asụsụ Igbo' },
	{ code: 'ilo', flag: '🇵🇭', name: 'Ilokano' },
	{ code: 'id', flag: '🇮🇩', name: 'Bahasa Indonesia' },
	{ code: 'ga', flag: '🇮🇪', name: 'Gaeilge' },
	{ code: 'it', flag: '🇮🇹', name: 'Italiano' },
	{ code: 'ja', flag: '🇯🇵', name: '日本語' },
	{ code: 'jw', flag: '🇮🇩', name: 'Basa Jawa' },
	{ code: 'kn', flag: '🇮🇳', name: 'ಕನ್ನಡ' },
	{ code: 'kk', flag: '🇰🇿', name: 'Қазақ тілі' },
	{ code: 'km', flag: '🇰🇭', name: 'ខ្មែរ' },
	{ code: 'rw', flag: '🇷🇼', name: 'Kinyarwanda' },
	{ code: 'gom', flag: '🇮🇳', name: 'कोंकणी' },
	{ code: 'ko', flag: '🇰🇷', name: '한국어' },
	{ code: 'kri', flag: '🇸🇱', name: 'Krio' },
	{ code: 'ky', flag: '🇰🇬', name: 'Кыргызча' },
	{ code: 'lo', flag: '🇱🇦', name: 'ລາວ' },
	{ code: 'la', flag: '🇻🇦', name: 'Latina' },
	{ code: 'lv', flag: '🇱🇻', name: 'Latviešu' },
	{ code: 'ln', flag: '🇨🇩', name: 'Lingála' },
	{ code: 'lt', flag: '🇱🇹', name: 'Lietuvių' },
	{ code: 'lg', flag: '🇺🇬', name: 'Luganda' },
	{ code: 'lb', flag: '🇱🇺', name: 'Lëtzebuergesch' },
	{ code: 'mk', flag: '🇲🇰', name: 'Македонски' },
	{ code: 'mai', flag: '🇮🇳', name: 'मैथिली' },
	{ code: 'mg', flag: '🇲🇬', name: 'Malagasy' },
	{ code: 'ms', flag: '🇲🇾', name: 'Bahasa Melayu' },
	{ code: 'ml', flag: '🇮🇳', name: 'മലയാളം' },
	{ code: 'mt', flag: '🇲🇹', name: 'Malti' },
	{ code: 'mi', flag: '🇳🇿', name: 'Māori' },
	{ code: 'mr', flag: '🇮🇳', name: 'मराठी' },
	{ code: 'mni-Mtei', flag: '🇮🇳', name: 'ꯃꯤꯇꯩꯂꯣꯟ' },
	{ code: 'lus', flag: '🇮🇳', name: 'Mizo ṭawng' },
	{ code: 'mn', flag: '🇲🇳', name: 'Монгол' },
	{ code: 'my', flag: '🇲🇲', name: 'မြန်မာ' },
	{ code: 'ne', flag: '🇳🇵', name: 'नेपाली' },
	{ code: 'no', flag: '🇳🇴', name: 'Norsk' },
	{ code: 'or', flag: '🇮🇳', name: 'ଓଡ଼ିଆ' },
	{ code: 'om', flag: '🇪🇹', name: 'Afaan Oromoo' },
	{ code: 'ps', flag: '🇦🇫', name: 'پښتو' },
	{ code: 'fa', flag: '🇮🇷', name: 'فارسی' },
	{ code: 'pl', flag: '🇵🇱', name: 'Polski' },
	{ code: 'pt', flag: '🇵🇹', name: 'Português' },
	{ code: 'pa', flag: '🇮🇳', name: 'ਪੰਜਾਬੀ' },
	{ code: 'qu', flag: '🇵🇪', name: 'Runasimi' },
	{ code: 'ro', flag: '🇷🇴', name: 'Română' },
	{ code: 'ru', flag: '🇷🇺', name: 'Русский' },
	{ code: 'sm', flag: '🇼🇸', name: 'Gagana fa\'a Sāmoa' },
	{ code: 'sa', flag: '🇮🇳', name: 'संस्कृतम्' },
	{ code: 'gd', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', name: 'Gàidhlig' },
	{ code: 'nso', flag: '🇿🇦', name: 'Sesotho sa Leboa' },
	{ code: 'sr', flag: '🇷🇸', name: 'Српски' },
	{ code: 'st', flag: '🇱🇸', name: 'Sesotho' },
	{ code: 'sn', flag: '🇿🇼', name: 'ChiShona' },
	{ code: 'sd', flag: '🇵🇰', name: 'سنڌي' },
	{ code: 'si', flag: '🇱🇰', name: 'සිංහල' },
	{ code: 'sk', flag: '🇸🇰', name: 'Slovenčina' },
	{ code: 'sl', flag: '🇸🇮', name: 'Slovenščina' },
	{ code: 'so', flag: '🇸🇴', name: 'Soomaali' },
	{ code: 'es', flag: '🇪🇸', name: 'Español' },
	{ code: 'su', flag: '🇮🇩', name: 'Basa Sunda' },
	{ code: 'sw', flag: '🇰🇪', name: 'Kiswahili' },
	{ code: 'sv', flag: '🇸🇪', name: 'Svenska' },
	{ code: 'tg', flag: '🇹🇯', name: 'Тоҷикӣ' },
	{ code: 'ta', flag: '🇮🇳', name: 'தமிழ்' },
	{ code: 'tt', flag: '🇷🇺', name: 'Татар' },
	{ code: 'te', flag: '🇮🇳', name: 'తెలుగు' },
	{ code: 'th', flag: '🇹🇭', name: 'ไทย' },
	{ code: 'ti', flag: '🇪🇷', name: 'ትግርኛ' },
	{ code: 'ts', flag: '🇿🇦', name: 'Xitsonga' },
	{ code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
	{ code: 'tk', flag: '🇹🇲', name: 'Türkmen' },
	{ code: 'ak', flag: '🇬🇭', name: 'Twi' },
	{ code: 'uk', flag: '🇺🇦', name: 'Українська' },
	{ code: 'ur', flag: '🇵🇰', name: 'اردو' },
	{ code: 'ug', flag: '🇨🇳', name: 'ئۇيغۇرچە' },
	{ code: 'uz', flag: '🇺🇿', name: 'Oʻzbek' },
	{ code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
	{ code: 'cy', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', name: 'Cymraeg' },
	{ code: 'xh', flag: '🇿🇦', name: 'isiXhosa' },
	{ code: 'yo', flag: '🇳🇬', name: 'Yorùbá' },
	{ code: 'zu', flag: '🇿🇦', name: 'isiZulu' },
	{ code: 'yi', flag: '🏴󠁥󠁳󠁰󠁶󠁿', name: 'ייִדיש' },
	{ code: 'ku', flag: '🏴󠁥󠁳󠁰󠁶󠁿', name: 'Kurmancî' },
	{ code: 'ckb', flag: '🏴󠁥󠁳󠁰󠁶󠁿', name: 'سۆرانی' },
	{ code: 'gl', flag: '🏴󠁥󠁳󠁰󠁶󠁿', name: 'Galego' },
	{ code: 'ca', flag: '🏴󠁥󠁳󠁰󠁶󠁿', name: 'Català' },
	{ code: 'eo', flag: '🏴󠁥󠁳󠁰󠁶󠁿', name: 'Esperanto' },
	{ code: 'hmn', flag: '🏴󠁥󠁳󠁰󠁶󠁿', name: 'Hmoob' }
];

export default function LanguageSelector() {
	const { language, changeLanguage, t } = useLanguage();
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
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

	useEffect(() => {
		if (!open) {
			setSearchQuery('');
		}
	}, [open]);

	// eslint-disable-next-line no-unused-vars
	const selected = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

	const filteredLanguages = LANGUAGES.filter(lang => 
		lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
		lang.code.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className="lang-selector" ref={ref}>
			<button
				className="lang-selector-btn"
				onClick={() => setOpen(!open)}
				title={t('change_language') || "Change language"}
				aria-label={t('change_language') || "Change language"}
			>
				{selected.flag}
			</button>

			{open && (
				<div className="lang-selector-dropdown">
					<div className="lang-search-container">
						<input 
							type="text" 
							className="lang-search-input" 
							placeholder={t('search_language') || "Search language..."} 
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							autoFocus
						/>
					</div>
					<div className="lang-list-container">
						{filteredLanguages.map(lang => (
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
						{filteredLanguages.length === 0 && (
							<div className="lang-no-results">
								{t('no_languages_found') || "No languages found"}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
