import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import './MySubmissions.css';
import { getStorageItem } from '../utils/storage';

const STATUS_COLORS = {
	submitted: 'status-submitted',
	in_progress: 'status-pending',
	approved: 'status-approved',
	denied: 'status-rejected',
};

const MySubmissionsStats = () => {
	const [user, setUser] = useState(null);
	const [submissions, setSubmissions] = useState([]);
	const [statusCounts, setStatusCounts] = useState(null);
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

		const fetchData = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const headers = { Authorization: `Bearer ${token}` };

				// Fetch status counts
				const countRes = await fetch(`${apiUrl}/formSubmissions/stats/my-status-count`, { headers });
				if (countRes.ok) {
					const data = await countRes.json();
					setStatusCounts(data);
				}

				// Fetch paginated submissions
				const submissionsRes = await fetch(`${apiUrl}/formSubmissions/my-paginated?page=1&limit=100`, { headers });
				if (submissionsRes.ok) {
					const data = await submissionsRes.json();
					setSubmissions(data.items || []);
				} else {
					setError(t('failedLoadSubmissions'));
				}
			} catch (err) {
				setError(t('networkErrorTryAgain'));
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [navigate, t]);

	if (!user) return <div className="ms-loading">{t('loading')}</div>;

	return (
		<div className="ms-container">
			<Navbar user={user} />

			<main className="ms-content">
				<div className="ms-header-row">
					<div>
						<h1 className="ms-title">My Submissions - Status Breakdown</h1>
						<p className="ms-subtitle">View your submitted forms grouped by status</p>
					</div>
					<button className="ms-back-btn" onClick={() => navigate('/dashboard')}>
						← Back to Dashboard
					</button>
				</div>

				{loading ? (
					<div className="ms-loading">{t('loading')}</div>
				) : error ? (
					<div className="ms-error">{error}</div>
				) : !statusCounts ? (
					<div className="ms-empty">
						<div className="ms-empty-icon">📊</div>
						<h3>No stats available</h3>
					</div>
				) : (
					<>
						{/* Status Cards Overview */}
						<div className="stats-cards-grid">
							{statusCounts.byStatus && statusCounts.byStatus.map((status) => (
								<div key={status.status} className={`stats-overview-card ${STATUS_COLORS[status.status] || ''}`}>
									<div className="stats-card-value">{status.count}</div>
									<div className="stats-card-label">{getStatusLabel(status.status)}</div>
									<div className="stats-card-status-badge">
										<span className={`status-badge ${STATUS_COLORS[status.status] || 'status-submitted'}`}>
											{getStatusLabel(status.status)}
										</span>
									</div>
								</div>
							))}
						</div>

						{/* Submissions List */}
						<div style={{ marginTop: '3rem' }}>
							<h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>All Submissions</h2>
							{submissions.length === 0 ? (
								<div className="ms-empty">
									<div className="ms-empty-icon">📭</div>
									<h3>{t('noSubmissions')}</h3>
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
												<span className="ms-card-date">
													{new Date(sub.createdAt).toLocaleDateString(undefined, {
														year: 'numeric',
														month: 'short',
														day: 'numeric',
														hour: '2-digit',
														minute: '2-digit',
													})}
												</span>
												<span className={`ms-status-badge ${STATUS_COLORS[sub.status] || 'status-submitted'}`}>
													{getStatusLabel(sub.status)}
												</span>
											</div>
											<button
												className="ms-view-btn"
												onClick={(e) => { e.stopPropagation(); navigate(`/submission/${sub._id}`); }}
											/>
										</div>
									))}
								</div>
							)}
						</div>
					</>
				)}
			</main>
		</div>
	);
};

export default MySubmissionsStats;
