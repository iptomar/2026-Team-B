import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import './ReviewedForms.css';
import { getStorageItem } from '../utils/storage';

function formatDate(dateStr) {
	if (!dateStr) return '—';
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: 'numeric', month: 'short', day: 'numeric',
		hour: '2-digit', minute: '2-digit',
	});
}

function Pagination({ page, totalPages, total, limit, onPageChange, t }) {
	const pages = [];
	const maxVisible = 5;
	let start = Math.max(1, page - Math.floor(maxVisible / 2));
	let end = Math.min(totalPages, start + maxVisible - 1);
	if (end - start + 1 < maxVisible) {
		start = Math.max(1, end - maxVisible + 1);
	}

	for (let i = start; i <= end; i++) {
		pages.push(i);
	}

	return (
		<div className="rf-pagination">
			<span className="rf-pagination-info">
				{t('page') || 'Page'} {page} {t('of') || 'of'} {totalPages} ({total} {t('total') || 'total'})
			</span>
			<div className="rf-pagination-btns">
				<button className="rf-page-btn" disabled={page <= 1} onClick={() => onPageChange(1)}>««</button>
				<button className="rf-page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>«</button>
				{pages.map(p => (
					<button key={p} className={`rf-page-btn ${p === page ? 'rf-page-active' : ''}`} onClick={() => onPageChange(p)}>
						{p}
					</button>
				))}
				<button className="rf-page-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>»</button>
				<button className="rf-page-btn" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>»»</button>
			</div>
		</div>
	);
}

const ReviewedForms = () => {
	const [user, setUser] = useState(null);
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [total, setTotal] = useState(0);
	const limit = 20;

	const navigate = useNavigate();
	const { t } = useLanguage();

	const fetchReviewed = useCallback(async () => {
		const token = getStorageItem('accessToken');
		if (!token) return;

		setLoading(true);
		setError(null);
		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/formSubmissions/reviewed?page=${page}&limit=${limit}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				setItems(data.items || []);
				setTotal(data.total || 0);
				setTotalPages(data.totalPages || 0);
			} else {
				setError('Failed to load reviewed forms.');
			}
		} catch {
			setError('Network error. Please try again.');
		} finally {
			setLoading(false);
		}
	}, [page]);

	useEffect(() => {
		const userStr = getStorageItem('user');
		const token = getStorageItem('accessToken');

		if (!token || !userStr) {
			navigate('/');
			return;
		}

		try {
			setUser(JSON.parse(userStr));
		} catch {
			navigate('/');
			return;
		}

		fetchReviewed();
	}, [navigate, fetchReviewed]);

	if (!user) return <div className="rf-loading">Loading…</div>;

	return (
		<div className="rf-container">
			<Navbar user={user} />
			<main className="rf-content">
				<div className="rf-header-row">
					<div>
						<h1 className="rf-title">{t('reviewedFormsTitle') || 'Reviewed Forms'}</h1>
						<p className="rf-subtitle">{t('reviewedFormsDesc') || 'Forms you have previously approved or denied'}</p>
					</div>
					<div className="rf-count-badge">
						<span className="rf-count-number">{loading ? '…' : total}</span>
						<span className="rf-count-label">{t('total') || 'Total'}</span>
					</div>
				</div>

				{loading ? (
					<div className="rf-list">
						{[1, 2].map((i) => (
							<div key={i} className="rf-card" style={{ cursor: 'default' }}>
								<div className="rf-card-header">
									<div className="rf-card-info" style={{ width: '100%' }}>
										<div className="skeleton-box skeleton-title" style={{ width: '40%', height: '1.25rem', marginBottom: '1rem' }} />
										<div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: '0.5rem' }} />
										<div className="skeleton-box skeleton-text" style={{ width: '20%', marginBottom: '0.5rem' }} />
									</div>
								</div>
							</div>
						))}
					</div>
				) : error ? (
					<div className="rf-error">{error}</div>
				) : items.length === 0 ? (
					<div className="rf-empty">
						<div className="rf-empty-icon">📝</div>
						<h3>{t('noReviewedItems') || 'You have not reviewed any forms yet.'}</h3>
						<button className="rf-btn rf-btn-view" onClick={() => navigate('/dashboard')} style={{ marginTop: '1.5rem' }}>
							{t('returnToDashboard') || 'Return to Dashboard'}
						</button>
					</div>
				) : (
					<>
						<div className="rf-list">
							{items.map((item) => (
								<div key={item._id} className="rf-card">
									<div className="rf-card-header">
										<div className="rf-card-info">
											<h3 className="rf-card-title">{item.templateTitle}</h3>
											<p className="rf-card-meta">
												<span>👤</span> {t('submittedBy') || 'Submitted by'} <strong>{item.submitterName}</strong>
											</p>
											<p className="rf-card-meta">
												<span>📅</span> {t('dateSubmitted') || 'Submitted on'} {formatDate(item.createdAt)}
											</p>
											<p className="rf-card-meta">
												<span>🕒</span> {t('dateReviewed') || 'Reviewed on'} {formatDate(item.lastActionDate)}
											</p>
										</div>
										<div className="rf-card-status-container">
											<span className={`rf-action-badge ${item.lastAction}`}>
												{item.lastAction === 'approved' ? (t('statusApproved') || 'Approved') : 
												 item.lastAction === 'denied' ? (t('statusDenied') || 'Denied') : item.lastAction}
											</span>
											<span className="rf-card-status-badge">
												{t('status') || 'Status'}: {
													item.status === 'submitted' ? (t('statusSubmitted') || 'Submitted') :
													item.status === 'in_progress' ? (t('statusInProgress') || 'In Progress') :
													item.status === 'approved' ? (t('statusApproved') || 'Approved') :
													item.status === 'denied' ? (t('statusDenied') || 'Denied') : item.status
												}
											</span>
										</div>
									</div>
									<div className="rf-card-actions">
										<button
											className="rf-btn rf-btn-view"
											onClick={() => navigate(`/submission/${item._id}`)}
										>
											{t('viewForm') || 'View Form'}
										</button>
									</div>
								</div>
							))}
						</div>
						{totalPages > 1 && (
							<Pagination
								page={page}
								totalPages={totalPages}
								total={total}
								limit={limit}
								onPageChange={(p) => { setPage(p); window.scrollTo(0, 0); }}
								t={t}
							/>
						)}
					</>
				)}
			</main>
		</div>
	);
};

export default ReviewedForms;
