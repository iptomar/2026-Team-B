import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import LanguageSelector from '../components/LanguageSelector';
import { setStorageItem, getStorageItem, removeStorageItem } from '../utils/storage';
import './Login.css';
import './Login.css';

const Login = () => {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [rememberMe, setRememberMe] = useState(false);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const token = getStorageItem('accessToken');
		if (token) {
			navigate('/dashboard');
		}
	}, [navigate]);
	const { t } = useLanguage();
	const { themeMode, cycleTheme, isDark } = useTheme();
	const themeIcon = { light: '☀️', dark: '🌙', auto: '🌗' }[themeMode];
	const themeLabel = { light: 'Switch to dark', dark: 'Switch to auto', auto: 'Switch to light' }[themeMode];

	const handleLogin = async (e) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifier: username, password, rememberMe })
			});
			const data = await res.json();

			setIsLoading(false);

			if (res.ok) {
				// Save the tokens and user data using the storage utility based on rememberMe preference
				// Also, ensure the opposite storage is cleared so old tokens aren't accidentally used
				removeStorageItem('accessToken');
				removeStorageItem('refreshToken');
				removeStorageItem('user');

				setStorageItem('accessToken', data.accessToken, rememberMe);
				setStorageItem('refreshToken', data.refreshToken, rememberMe);
				setStorageItem('user', JSON.stringify(data.user), rememberMe);
				navigate('/dashboard');
			} else {
				setError(data.message || t('invalidCredentials'));
			}
		} catch (err) {
			setIsLoading(false);
			setError(t('networkError'));
		}
	};

	const handleSSOLogin = async () => {
		setError('');
		setIsLoading(true);

		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/auth/sso/url`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			const data = await res.json();

			if (res.ok && data.url) {
				window.location.href = data.url;
			} else {
				setIsLoading(false);
				setError(data.message || t('networkError'));
			}
		} catch (err) {
			setIsLoading(false);
			setError(t('networkError'));
		}
	};

	return (
		<div className="login-container">
			<div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
				<button
					onClick={cycleTheme}
					className="theme-toggle-btn"
					title={`${themeMode} · ${themeLabel}`}
					aria-label={`Theme: ${themeMode}. ${themeLabel}`}
				>
					{themeIcon}
				</button>
				<LanguageSelector />
			</div>
			<div className="login-card">
				<img src={isDark ? '/bannerDark.png' : '/bannerLight.png'} alt="IPT Logo" style={{ height: '150px', width: '100%', objectFit: 'contain', marginBottom: '15px' }} />
				<h2>{t('welcome')}</h2>
				{error && <div className="error-toast-fixed">{error}</div>}
				<form onSubmit={handleLogin} action="#" method="POST">
					<div className="input-group">
						<label htmlFor="username">{t('username')}</label>
						<input
							type="text"
							id="username"
							name="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder={t('username')}
							autoComplete="username"
						/>
					</div>
					<div className="input-group">
						<label htmlFor="password">{t('password')}</label>
						<input
							type="password"
							id="password"
							name="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder={t('password')}
							autoComplete="current-password"
						/>
					</div>
					<div className="input-group remember-me-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
						<input
							type="checkbox"
							id="rememberMe"
							checked={rememberMe}
							onChange={(e) => setRememberMe(e.target.checked)}
							style={{ width: 'auto', marginBottom: '0' }}
						/>
						<label htmlFor="rememberMe" style={{ marginBottom: '0', fontWeight: 'normal', fontSize: '14px' }}>
							{t('rememberMe') || 'Remember Me'}
						</label>
					</div>
					<button type="submit" className="login-button" disabled={isLoading}>
						{isLoading ? <div className="spinner"></div> : t('signIn')}
					</button>
					<div className="sso-divider">
						<span>{t('or') || 'or'}</span>
					</div>
					<button type="button" className="sso-button" onClick={handleSSOLogin} disabled={isLoading}>
						<svg className="sso-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21">
							<rect x="1" y="1" width="9" height="9" fill="#f25022"/>
							<rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
							<rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
							<rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
						</svg>
						{t('signInWithMicrosoft') || 'Sign in with Microsoft'}
					</button>
					<div style={{ marginTop: '15px', fontSize: '14px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
						<Link to="/register" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: '500' }}>
							{t('registerLinkText') || "Don't have an account? Register here."}
						</Link>
						<Link to="/forgot-password" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: '500' }}>
							{t('forgotPassword')}
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
};

export default Login;
