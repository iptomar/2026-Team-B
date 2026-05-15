import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { removeStorageItem } from '../utils/storage';
import './Navbar.css';

const Navbar = ({ user }) => {
	const [isOpen, setIsOpen] = useState(false);
	const navigate = useNavigate();
	const { language, changeLanguage, t } = useLanguage();

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

					<div className="language-toggle" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
						{['en', 'pt', 'es', 'de', 'fr'].map((lang, index) => (
							<React.Fragment key={lang}>
								<button 
									onClick={() => changeLanguage(lang)} 
									style={{ 
										background: 'none', 
										border: 'none', 
										cursor: 'pointer', 
										fontWeight: language === lang ? 'bold' : 'normal', 
										color: language === lang ? '#2f855a' : '#4a5568',
										padding: '2px 4px',
										fontSize: '14px',
										textTransform: 'uppercase'
									}}
								>
									{lang}
								</button>
								{index < 4 && <span style={{ color: '#cbd5e0', fontSize: '12px' }}>|</span>}
							</React.Fragment>
						))}
					</div>

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
