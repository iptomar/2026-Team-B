import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './Login.css';
import iptLogo from '../assets/logoiptlogin.png';

const Login = () => {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();
	const { language, changeLanguage, t } = useLanguage();

	const handleLogin = async (e) => {
		e.preventDefault();
		setError('');

		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifier: username, password })
			});
			const data = await res.json();

			if (res.ok) {
				// Save the tokens and user data for future authenticated requests
				localStorage.setItem('accessToken', data.accessToken);
				localStorage.setItem('refreshToken', data.refreshToken);
				localStorage.setItem('user', JSON.stringify(data.user));
				navigate('/dashboard');
			} else {
				setError(data.message || t('invalidCredentials'));
			}
		} catch (err) {
			setError(t('networkError'));
		}
	};

	return (
		<div className="login-container">
			<div className="language-toggle" style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '5px', alignItems: 'center' }}>
				<button 
					onClick={() => changeLanguage('en')} 
					style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: language === 'en' ? 'bold' : 'normal', color: '#4a5568' }}
				>EN</button>
				<span style={{ color: '#4a5568' }}>|</span>
				<button 
					onClick={() => changeLanguage('pt')} 
					style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: language === 'pt' ? 'bold' : 'normal', color: '#4a5568' }}
				>PT</button>
			</div>
			<div className="login-card">
				<img src={iptLogo} alt="IPT Logo" style={{ height: '150px', marginBottom: '15px' }} />
				<h2>{t('welcome')}</h2>
				{error && <div className="error-message">{error}</div>}
				<form onSubmit={handleLogin}>
					<div className="input-group">
						<label htmlFor="username">{t('username')}</label>
						<input
							type="text"
							id="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder={t('username')}
						/>
					</div>
					<div className="input-group">
						<label htmlFor="password">{t('password')}</label>
						<input
							type="password"
							id="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder={t('password')}
						/>
					</div>
					<button type="submit" className="login-button">{t('signIn')}</button>
					<div style={{ marginTop: '15px', fontSize: '14px' }}>
						<Link to="/forgot-password" style={{ color: '#2f855a', textDecoration: 'none', fontWeight: '500' }}>{t('forgotPassword')}</Link>
					</div>
				</form>
			</div>
		</div>
	);
};

export default Login;
