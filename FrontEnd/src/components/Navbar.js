import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import LanguageSelector from './LanguageSelector';
import { removeStorageItem } from '../utils/storage';
import './Navbar.css';

const Navbar = ({ user }) => {
	const [isOpen, setIsOpen] = useState(false);
	const navigate = useNavigate();
	const { t } = useLanguage();
	const { themeMode, cycleTheme } = useTheme();

	const themeIcon = { light: '☀️', dark: '🌙', auto: '🌗' }[themeMode];
	const themeLabel = { light: 'Switch to dark', dark: 'Switch to auto', auto: 'Switch to light' }[themeMode];

	const handleSignOut = () => {
		removeStorageItem('accessToken');
		removeStorageItem('refreshToken');
		removeStorageItem('user');
		navigate('/');
	};

	const toggleMenu = () => {
		setIsOpen(!isOpen);
	};

	if (!user) return null;

	return (
		<nav className="common-nav">
			<div className="nav-container">
				<Link to="/dashboard" className="nav-brand">IPT Portal</Link>

				<div className="nav-right">
					<div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<img
							src={user.avatarIcon || require('../assets/default_user_avatar.jpg')}
							alt="User"
							style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
						/>
						<span className="user-greeting">{t('welcome')}, {user.username || user.email}</span>
					</div>

					<button
						onClick={cycleTheme}
						className="theme-toggle-btn"
						title={`${themeMode} · ${themeLabel}`}
						aria-label={`Theme: ${themeMode}. ${themeLabel}`}
					>
						{themeIcon}
					</button>

					<LanguageSelector />

					<div className={`burger-menu ${isOpen ? 'open' : ''}`} onClick={toggleMenu} id="burger-menu">
						<div className="burger-line"></div>
						<div className="burger-line"></div>
						<div className="burger-line"></div>
					</div>

					{isOpen && (
						<div className="nav-dropdown" id="nav-dropdown">
							<Link to="/settings" className="dropdown-item" onClick={() => setIsOpen(false)}>
								{t('settings')}
							</Link>
							<Link to="/report-bug" className="dropdown-item" onClick={() => setIsOpen(false)}>
								{t('reportBug')}
							</Link>
							<div className="dropdown-divider"></div>
							<button className="dropdown-item signout-item" onClick={handleSignOut}>
								{t('signOut')}
							</button>
						</div>
					)}
				</div>
			</div>
			{isOpen && <div className="menu-overlay" onClick={() => setIsOpen(false)}></div>}
		</nav>
	);
};

export default Navbar;
