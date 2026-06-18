import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import './AdminBugReportDetail.css';
import { getStorageItem } from '../utils/storage';

const AdminBugReportDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [report, setReport] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [sasUrls, setSasUrls] = useState({});
	const { t, language } = useLanguage();

	const fetchBugReportDetail = React.useCallback(async () => {
		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/bug-reports/${id}`, {
				headers: {
					'Authorization': `Bearer ${getStorageItem('accessToken')}`
				}
			});

			if (res.ok) {
				const data = await res.json();
				setReport(data);
				
				// Fetch SAS URLs for attachments
				if (data.attachments && data.attachments.length > 0) {
					const urls = {};
					for (const att of data.attachments) {
						if (att.contentType && att.contentType.startsWith('image/')) {
							try {
								const sasRes = await fetch(`${apiUrl}/bug-reports/${id}/files/${encodeURIComponent(att.blobName)}/sas`, {
									headers: { 'Authorization': `Bearer ${getStorageItem('accessToken')}` }
								});
								if (sasRes.ok) {
									const sasData = await sasRes.json();
									urls[att.blobName] = sasData.url;
								}
							} catch (e) {
								console.error('Failed to load sas url for', att.blobName);
							}
						}
					}
					setSasUrls(urls);
				}
			} else {
				const errData = await res.json();
				setError(errData.message || t('failedFetchReportDetails'));
			}
		} catch (error) {
			setError(t('networkErrorReportDetails'));
		} finally {
			setLoading(false);
		}
	}, [id, t]);

	const handleResolve = async () => {
		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/bug-reports/${id}/resolve`, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${getStorageItem('accessToken')}`
				}
			});
			if (res.ok) {
				const data = await res.json();
				setReport(data);
			} else {
				console.error('Failed to resolve bug report');
			}
		} catch (error) {
			console.error('Network error resolving bug report', error);
		}
	};

	useEffect(() => {
		const storedUser = getStorageItem('user');
		if (storedUser) {
			const parsedUser = JSON.parse(storedUser);
			const isAdmin = parsedUser.roles?.some(r => r.name?.toLowerCase() === 'admin');
			if (!isAdmin) {
				navigate('/dashboard');
				return;
			}
			setUser(parsedUser);
			fetchBugReportDetail();
		} else {
			navigate('/');
		}
	}, [navigate, fetchBugReportDetail]);

	if (!user) return null;

	return (
		<div className="report-detail-container">
			<Navbar user={user} />
			<div className="report-detail-content">
				<div className="report-detail-header">
					<h1>{t('bugReportDetailsTitle')}</h1>
				</div>

				{loading ? (
					<div className="report-detail-card">
						<div className="detail-section">
							<div className="skeleton-box skeleton-title" style={{ width: '40%', marginBottom: '1.5rem' }} />
							<div className="detail-meta">
								<div className="meta-item">
									<div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: '0.5rem' }} />
									<div className="skeleton-box skeleton-text-short" style={{ width: '50%' }} />
								</div>
								<div className="meta-item" style={{ marginTop: '1rem' }}>
									<div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: '0.5rem' }} />
									<div className="skeleton-box skeleton-text-short" style={{ width: '40%' }} />
								</div>
							</div>
						</div>
						<div className="detail-section" style={{ marginTop: '2rem' }}>
							<div className="skeleton-box skeleton-text" style={{ width: '20%', height: '1.25rem', marginBottom: '1rem' }} />
							<div className="description-box" style={{ padding: '1rem' }}>
								<div className="skeleton-box skeleton-text" style={{ width: '90%' }} />
								<div className="skeleton-box skeleton-text" style={{ width: '85%' }} />
								<div className="skeleton-box skeleton-text" style={{ width: '60%' }} />
							</div>
						</div>
					</div>
				) : error ? (
					<div className="error-state">
						<h3>{t('error')}</h3>
						<p>{error}</p>
						<button className="btn-retry" onClick={() => navigate('/admin/bug-reports')}>
							{t('returnToList')}
						</button>
					</div>
				) : report ? (
					<div className="report-detail-card">
						<div className="detail-section">
							<h2 className="detail-title">{report.title}</h2>
							<div className="detail-meta">
								<div className="meta-item">
									<span className="meta-label">{t('reportedBy')}</span>
									{report.user ? (
										<span className="reporter-info">
											{report.user.avatarIcon && (
												<span className="reporter-avatar">
													{report.user.avatarIcon.startsWith('data:image') || report.user.avatarIcon.startsWith('http') ? (
														<img src={report.user.avatarIcon} alt="Avatar" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
													) : (
														report.user.avatarIcon
													)}
												</span>
											)}
											<strong>{report.user.username}</strong> ({report.user.email})
										</span>
									) : (
										<span className="unknown-reporter">{t('unknownUser')}</span>
									)}
								</div>
								<div className="meta-item">
									<span className="meta-label">{t('dateSubmittedLabel')}</span>
									<span className="date-info">
										{new Date(report.createdAt).toLocaleString(language, {
											weekday: 'long',
											year: 'numeric',
											month: 'long',
											day: 'numeric',
											hour: '2-digit',
											minute: '2-digit'
										})}
									</span>
								</div>
							</div>
							
							<div className="detail-meta" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
								<div className="meta-item">
									<span className="meta-label">{t('status') || 'Status'}</span>
									<span className={`status-badge status-${report.status || 'pending'}`} style={{ display: 'inline-block', marginTop: '0.5rem' }}>
										{t(report.status || 'pending') || (report.status || 'pending')}
									</span>
								</div>
								{(report.status === 'pending' || !report.status) && (
									<div className="meta-item" style={{ display: 'flex', alignItems: 'center' }}>
										<button 
											onClick={handleResolve} 
											className="btn-primary"
											style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', marginTop: '1.5rem' }}
										>
											{t('markAsResolved') || 'Mark as resolved'}
										</button>
									</div>
								)}
							</div>
						</div>

						<div className="detail-section">
							<h3>{t('description')}</h3>
							<div className="description-box">
								{report.description.split('\n').map((line, i) => (
									<p key={i}>
										{line}
										<br />
									</p>
								))}
							</div>
						</div>

						{report.attachments && report.attachments.length > 0 && (
							<div className="detail-section">
								<h3>{t('attachedScreenshot')}</h3>
								<div className="screenshot-container" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
									{report.attachments.map(att => (
										sasUrls[att.blobName] ? (
											<img 
												key={att.blobName}
												src={sasUrls[att.blobName]} 
												alt={att.originalName} 
												className="bug-screenshot" 
												style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
											/>
										) : (
											<div key={att.blobName} className="skeleton-box" style={{ width: '100%', height: '200px' }} />
										)
									))}
								</div>
							</div>
						)}
					</div>
				) : null}
			</div>
		</div>
	);
};

export default AdminBugReportDetail;