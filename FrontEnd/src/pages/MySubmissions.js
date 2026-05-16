import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import './MySubmissions.css';
import { getStorageItem } from '../utils/storage';

// Removed unused STATUS_LABELS
const STATUS_COLORS = {
	submitted: 'status-submitted',
	in_progress: 'status-pending',
	approved: 'status-approved',
	denied: 'status-rejected',
	// legacy aliases
	pending: 'status-pending',
	rejected: 'status-rejected',
};

function formatDate(dateStr) {
	if (!dateStr) return '—';
	const d = new Date(dateStr);
	return d.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

const MySubmissions = () => {
	const [user, setUser] = useState(null);
	const [submissions, setSubmissions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();
	const { t } = useLanguage();

	const getStatusLabel = (status) => {
		const mapping = {
			submitted: t('statusSubmitted'),
			in_progress: t('statusInProgress'),
			approved: t('statusApproved'),
			denied: t('statusDenied'),
			pending: t('statusPending'),
			rejected: t('statusRejected'),
		};
		return mapping[status] || status;
	};

	useEffect(() => {
		const userStr = getStorageItem('user');
		const token = getStorageItem('accessToken');

		if (!token || !userStr) {
			navigate('/');
			return;
		}

		try {
			setUser(JSON.parse(userStr));
		} catch (e) {
			navigate('/');
			return;
		}

		const fetchSubmissions = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const res = await fetch(`${apiUrl}/formSubmissions/my`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (res.ok) {
					const data = await res.json();
					setSubmissions(data);
				} else {
					setError(t('failedLoadSubmissions'));
				}
			} catch (err) {
				setError(t('networkErrorTryAgain'));
			} finally {
				setLoading(false);
			}
		};

		fetchSubmissions();
	}, [navigate, t]);

	if (!user) return <div className="ms-loading">{t('loading')}</div>;

	return (
		<div className="ms-container">
			<Navbar user={user} />

			<main className="ms-content">
				<div className="ms-header-row">
					<div>
						<button className="ms-back-btn" onClick={() => navigate('/dashboard')}>
							{t('backToDashboard')}
						</button>
						<h1 className="ms-title">{t('mySubmissions')}</h1>
						<p className="ms-subtitle">{t('mySubmissionsDesc')}</p>
					</div>
					<div className="ms-count-badge">
						<span className="ms-count-number">{loading ? '…' : submissions.length}</span>
						<span className="ms-count-label">{t('total')}</span>
					</div>
				</div>

				{loading ? (
					<div className="ms-loading-inner">
						<div className="ms-spinner" />
						<p>{t('loadingSubmissions')}</p>
					</div>
				) : error ? (
					<div className="ms-error">{error}</div>
				) : submissions.length === 0 ? (
					<div className="ms-empty">
						<div className="ms-empty-icon">📭</div>
						<h3>{t('noSubmissions')}</h3>
						<p>{t('noSubmissionsDesc')}</p>
						<button className="ms-action-btn" onClick={() => navigate('/dashboard')}>
							{t('goToDashboard')}
						</button>
					</div>
				) : (
					<div className="ms-cards-list">
						{submissions.map((sub) => (
							<div
								key={sub._id}
								className="ms-card"
								onClick={() => navigate(`/submission/${sub._id}`)}
							>
								<div className="ms-card-body">
									<span className="ms-card-title">{sub.templateTitle}</span>
									<span className="ms-card-date">{formatDate(sub.createdAt)}</span>
									<span className={`ms-status-badge ${STATUS_COLORS[sub.status] || 'status-submitted'}`}>
										{getStatusLabel(sub.status)}
									</span>
								</div>
								<button
									className="ms-view-btn"
									onClick={(e) => { e.stopPropagation(); navigate(`/submission/${sub._id}`); }}
								>
									{t('viewArrow')}
								</button>
							</div>
						))}
					</div>
				)}
			</main>
		</div>
	);
};

export default MySubmissions;