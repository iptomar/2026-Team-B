import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import './ForgotPassword.css';

const ForgotPassword = () => {
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();
	const { t } = useLanguage();
	const { isDarkTheme, toggleTheme } = useTheme();

	const handleForgotPassword = async (e) => {
		e.preventDefault();
		setError('');
		setMessage('');

		if (!email) {
			setError(t('enterEmail'));
			return;
		}

		try {
			setIsLoading(true);
			const apiUrl = process.env.REACT_APP_API_URL || '';
			
			const res = await fetch(`${apiUrl}/auth/forgot-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await res.json();

			if (res.ok) {
				setMessage(data.message || t('resetLinkSent'));
				// Optional: Clear the email field after successful submission
				setEmail('');
			} else {
				setError(data.message || t('failedResetLink'));
			}
		} catch (err) {
			setError(t('networkError'));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="forgot-password-container">
			<div style={{ position: 'absolute', top: '20px', right: '20px' }}>
				<button
					onClick={toggleTheme}
					className="theme-toggle-btn"
					title={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
					aria-label={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
				>
					{isDarkTheme ? '☀️' : '🌙'}
				</button>
			</div>
			<div className="forgot-password-card">
				<h2>{t('forgotPassword')}</h2>
				<p style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--color-text)' }}>
					{t('forgotPasswordDesc')}
				</p>
				{error && <div className="error-message">{error}</div>}
				{message && <div className="success-message">{message}</div>}
				<form onSubmit={handleForgotPassword}>
					<div className="input-group">
						<label htmlFor="email">{t('email')}</label>
						<input
							type="email"
							id="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={t('enterEmailPlaceholder')}
							disabled={isLoading}
						/>
					</div>
					<button type="submit" className="forgot-password-button" disabled={isLoading}>
						{isLoading ? t('sending') : t('sendResetLink')}
					</button>
					<button type="button" className="back-button" onClick={() => navigate(-1)} disabled={isLoading}>
						{t('back')}
					</button>
				</form>
			</div>
		</div>
	);
};

export default ForgotPassword;
