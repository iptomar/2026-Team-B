import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import LanguageSelector from '../components/LanguageSelector';
import { setStorageItem, removeStorageItem } from '../utils/storage';
import './Register.css';
import './Register.css';

const Register = () => {
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const navigate = useNavigate();
	const { t } = useLanguage();
	const { themeMode, cycleTheme, isDark } = useTheme();
	const themeIcon = { light: '☀️', dark: '🌙', auto: '🌗' }[themeMode];
	const themeLabel = { light: 'Switch to dark', dark: 'Switch to auto', auto: 'Switch to light' }[themeMode];

	const handleRegister = async (e) => {
		e.preventDefault();
		setError('');
		setSuccessMessage('');

		if (!username || !email || !password || !confirmPassword) {
			setError(t('fillAllFields'));
			return;
		}

		if (password !== confirmPassword) {
			setError(t('passwordsDoNotMatch') || 'Passwords do not match');
			return;
		}

		const lowerEmail = email.toLowerCase();
		if (!lowerEmail.endsWith('@ipt.pt') && !lowerEmail.endsWith('@estt.pt')) {
			setError(t('invalidEmailDomain') || 'Only @ipt.pt or @estt.pt emails are allowed');
			return;
		}

		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, email: lowerEmail, password })
			});
			const data = await res.json();

			if (res.ok) {
				setSuccessMessage(t('registerSuccess') || 'Registration successful!');

				// Automatically log the user in
				removeStorageItem('accessToken');
				removeStorageItem('refreshToken');
				removeStorageItem('user');

				setStorageItem('accessToken', data.accessToken, true); // Use local storage by default
				setStorageItem('refreshToken', data.refreshToken, true);
				setStorageItem('user', JSON.stringify(data.user), true);

				// Show toast/message briefly before redirect
				setTimeout(() => {
					navigate('/dashboard');
				}, 1500);
			} else {
				setError(data.message || t('invalidCredentials'));
			}
		} catch (err) {
			setError(t('networkError'));
		}
	};

	return (
		<div className="register-container">
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
			<div className="register-card">
				<img src={isDark ? '/bannerDark.png' : '/bannerLight.png'} alt="IPT Logo" style={{ height: '150px', marginBottom: '15px' }} />
				<h2>{t('createAccount') || 'Create Account'}</h2>

				{error && <div className="error-toast-fixed">{error}</div>}
				{successMessage && <div className="success-message" style={{ color: 'var(--color-success-text)', backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{successMessage}</div>}

				<form onSubmit={handleRegister}>
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
						<label htmlFor="email">{t('email')}</label>
						<input
							type="email"
							id="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={t('email')}
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
					<div className="input-group">
						<label htmlFor="confirmPassword">{t('confirmPassword') || 'Confirm Password'}</label>
						<input
							type="password"
							id="confirmPassword"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder={t('confirmPassword') || 'Confirm Password'}
						/>
					</div>
					<button type="submit" className="register-button">{t('register') || 'Register'}</button>
					<div style={{ marginTop: '15px', fontSize: '14px', textAlign: 'center' }}>
						<Link to="/login" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: '500' }}>
							{t('loginLinkText') || 'Already have an account? Login here.'}
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
};

export default Register;
