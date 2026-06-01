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

// Language to locale mapping for date formatting
const LOCALE_MAP = {
	en: 'en-US',
	pt: 'pt-BR',
	es: 'es-ES',
	de: 'de-DE',
	fr: 'fr-FR',
};

const AdminSubmissionsStats = () => {
	const [user, setUser] = useState(null);
	const [submissions, setSubmissions] = useState([]);
	const [statusCounts, setStatusCounts] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [page, setPage] = useState(1);
	const [limit] = useState(20);
	const [totalPages, setTotalPages] = useState(1);
	const navigate = useNavigate();
	const { t, language } = useLanguage();

	const getStatusLabel = (status) => {
		const mapping = {
			submitted: t('statusSubmitted'),
			in_progress: t('statusInProgress'),
			approved: t('statusApproved'),
			denied: t('statusDenied'),
		};
		return mapping[status] || status;
	};

	const formatDate = (dateStr) => {
		if (!dateStr) return '—';
		try {
			const locale = LOCALE_MAP[language] || LOCALE_MAP.en;
			return new Date(dateStr).toLocaleDateString(locale, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch (e) {
			return '—';
		}
	};

	useEffect(() => {
		const userStr = getStorageItem('user');
		const token = getStorageItem('accessToken');

		if (!token || !userStr) {
			navigate('/');
			return;
		}

		try {
			const userData = JSON.parse(userStr);
			setUser(userData);

			// Check if admin
			const isAdmin = userData.roles?.some(r => r.name?.toLowerCase() === 'admin');
			if (!isAdmin) {
				navigate('/dashboard');
				return;
			}
		} catch (e) {
			navigate('/');
			return;
		}

		const fetchData = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const headers = { Authorization: `Bearer ${token}` };

				// Fetch all submissions status counts
				const countRes = await fetch(`${apiUrl}/formSubmissions/stats/status-count`, { headers });
				if (countRes.ok) {
					const data = await countRes.json();
					setStatusCounts(data);
				}

				// Fetch paginated submissions
				const submissionsRes = await fetch(
					`${apiUrl}/formSubmissions/admin?page=${page}&limit=${limit}`,
					{ headers }
				);
				if (submissionsRes.ok) {
					const data = await submissionsRes.json();
					setSubmissions(data.items || []);
					setTotalPages(data.totalPages || 1);
				} else {
					setError('Failed to load submissions');
				}
			} catch (err) {
				setError('Network error. Try again.');
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [navigate, page, limit]);

	if (!user) return <div className="ms-loading">{t('loading')}</div>;

	return (
		<div className="ms-container">
			<Navbar user={user} />

			<main className="ms-content">
				<div className="ms-header-row">
					<div>
						<h1 className="ms-title">{t('allSubmissions')} - {t('statusBreakdown')}</h1>
						<p className="ms-subtitle">{t('adminViewDesc')}</p>
					</div>
					<button className="ms-back-btn" onClick={() => navigate('/dashboard')}>
						{t('backToDashboard')}
					</button>
				</div>

				{loading ? (
					<div className="ms-loading">{t('loading')}</div>
				) : error ? (
					<div className="ms-error">{error}</div>
				) : !statusCounts ? (
					<div className="ms-empty">
						<div className="ms-empty-icon">📊</div>
					<h3>{t('noStatsAvailable')}</h3>
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
							<h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
							{t('allSubmissions')} ({t('pageOf')} {page} {t('of')} {totalPages})
						</h2>
						{submissions.length === 0 ? (
							<div className="ms-empty">
								<div className="ms-empty-icon">📭</div>
								<h3>{t('noSubmissionsFound')}</h3>
								</div>
							) : (
								<>
									<div className="ms-cards-list">
										{submissions.map((sub) => (
											<div
												key={sub._id}
												className="ms-card"
												onClick={() => navigate(`/submission/${sub._id}`)}
											>
												<div className="ms-card-body">
													<span className="ms-card-title">{sub.templateTitle}</span>
													<span className="ms-card-subtitle">
														{t('submittedBy')} {sub.submitterName} ({sub.submitterEmail})
													</span>
													<span className="ms-card-date">
														{formatDate(sub.createdAt)}
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

									{/* Pagination */}
									{totalPages > 1 && (
										<div className="pagination-controls" style={{
											display: 'flex',
											justifyContent: 'center',
											gap: '1rem',
											marginTop: '2rem',
											alignItems: 'center'
										}}>
											<button
												className="ms-back-btn"
												onClick={() => setPage(p => Math.max(1, p - 1))}
												disabled={page === 1}
												style={{ opacity: page === 1 ? 0.5 : 1 }}
											>
												{t('previous')}
											</button>
											<span style={{ fontWeight: '600', minWidth: '120px', textAlign: 'center' }}>
												{t('pageOf')} {page} {t('of')} {totalPages}
											</span>
											<button
												className="ms-back-btn"
												onClick={() => setPage(p => Math.min(totalPages, p + 1))}
												disabled={page === totalPages}
												style={{ opacity: page === totalPages ? 0.5 : 1 }}
											>
												{t('next')}
											</button>
										</div>
									)}
								</>
							)}
						</div>
					</>
				)}
			</main>
		</div>
	);
};

export default AdminSubmissionsStats;
