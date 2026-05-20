import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './LoadingOverlay.css';

export default function LoadingOverlay() {
	const location = useLocation();
	const [visible, setVisible] = useState(false);
	const { t } = useLanguage();

	useEffect(() => {
		setVisible(true);
		const timer = setTimeout(() => {
			setVisible(false);
		}, 450);
		return () => clearTimeout(timer);
	}, [location.key]);

	if (!visible) return null;

	return (
		<div className="global-loading-overlay">
			<div className="global-loading-spinner-wrapper">
				<div className="global-loading-spinner" />
				<span className="global-loading-text">{t('loading') || 'Loading...'}</span>
			</div>
		</div>
	);
}
