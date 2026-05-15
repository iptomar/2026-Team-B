import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import './ChangePassword.css';

const ChangePassword = () => {
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();
	const location = useLocation();
	const { t } = useLanguage();
	const { isDarkTheme, toggleTheme } = useTheme();

	// Extract token from URL (e.g., /reset-password?token=...)
	const queryParams = new URLSearchParams(location.search);
	const token = queryParams.get('token');

	const handleChangePassword = async (e) => {
		e.preventDefault();
		setError('');
		setMessage('');

		if (!token) {
			setError(t('invalidToken'));
			return;
		}

		if (!newPassword || !confirmPassword) {
			setError(t('fillAllFields'));
			return;
		}

		if (newPassword !== confirmPassword) {
			setError(t('passwordsNotMatch'));
			return;
		}

		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			
			// Reset Password Flow
			const res = await fetch(`${apiUrl}/auth/reset-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token,
					newPassword
				})
			});

			const data = await res.json();

			if (res.ok) {
				setMessage(t('passwordResetSuccess'));
				setTimeout(() => navigate('/'), 3000);
			} else {
				setError(data.message || t('failedResetPassword'));
			}
		} catch (err) {
			setError(t('networkError'));
		}
	};

	return (
		<div className="change-password-container">
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
			<div className="change-password-card">
				<h2>{t('resetPassword')}</h2>
				{error && <div className="error-message">{error}</div>}
				{message && <div className="success-message">{message}</div>}
				<form onSubmit={handleChangePassword}>
					<div className="input-group">
						<label htmlFor="newPassword">{t('newPassword')}</label>
						<input
							type="password"
							id="newPassword"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder={t('enterNewPassword')}
						/>
					</div>
					<div className="input-group">
						<label htmlFor="confirmPassword">{t('confirmNewPassword')}</label>
						<input
							type="password"
							id="confirmPassword"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder={t('confirmNewPasswordPlaceholder')}
						/>
					</div>
					<button type="submit" className="change-password-button">
						{t('resetPassword')}
					</button>
					<button type="button" className="back-button" onClick={() => navigate(-1)}>{t('back')}</button>
				</form>
			</div>
		</div>
	);
};

export default ChangePassword;
