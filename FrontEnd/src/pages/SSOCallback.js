import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { setStorageItem, removeStorageItem } from '../utils/storage';
import './Login.css';

const SSOCallback = () => {
	const [error, setError] = useState('');
	const navigate = useNavigate();
	const location = useLocation();
	const { t } = useLanguage();
	const calledOnce = useRef(false);

	useEffect(() => {
		if (calledOnce.current) return;
		calledOnce.current = true;

		const handleCallback = async () => {
			const searchParams = new URLSearchParams(location.search);
			const code = searchParams.get('code');

			if (!code) {
				setError('Invalid SSO Callback');
				setTimeout(() => navigate('/'), 3000);
				return;
			}

			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const res = await fetch(`${apiUrl}/auth/sso/callback`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code })
				});

				const data = await res.json();

				if (res.ok) {
					removeStorageItem('accessToken');
					removeStorageItem('refreshToken');
					removeStorageItem('user');

					// Default to local storage for SSO
					setStorageItem('accessToken', data.accessToken, true);
					setStorageItem('refreshToken', data.refreshToken, true);
					setStorageItem('user', JSON.stringify(data.user), true);
					
					navigate('/dashboard');
				} else {
					setError(data.message || t('networkError'));
					setTimeout(() => navigate('/'), 3000);
				}
			} catch (err) {
				setError(t('networkError'));
				setTimeout(() => navigate('/'), 3000);
			}
		};

		handleCallback();
	}, [location, navigate, t]);

	return (
		<div className="login-container">
			<div className="login-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
				<h2>{error ? 'Authentication Failed' : 'Authenticating...'}</h2>
				{error ? (
					<div className="error-toast-fixed" style={{ position: 'relative', top: 0 }}>{error}</div>
				) : (
					<div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', borderTopColor: 'var(--color-accent)' }}></div>
				)}
			</div>
		</div>
	);
};

export default SSOCallback;
