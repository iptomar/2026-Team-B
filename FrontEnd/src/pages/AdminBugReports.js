import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import './AdminBugReports.css';

const AdminBugReports = () => {
	const [user, setUser] = useState(null);
	const [reports, setReports] = useState([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();
	const { t } = useLanguage();

	useEffect(() => {
		const storedUser = localStorage.getItem('user');
		if (storedUser) {
			const parsedUser = JSON.parse(storedUser);
			const isAdmin = parsedUser.roles?.some(r => r.name?.toLowerCase() === 'admin');
			if (!isAdmin) {
				navigate('/dashboard'); // Restrict to admins only
				return;
			}
			setUser(parsedUser);
			fetchBugReports();
		} else {
			navigate('/');
		}
	}, [navigate]);

	const fetchBugReports = async () => {
		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/bug-reports`, {
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
				}
			});
			if (res.ok) {
				const data = await res.json();
				setReports(data);
			} else {
				console.error('Failed to fetch bug reports');
			}
		} catch (error) {
			console.error('Network error while fetching bug reports', error);
		} finally {
			setLoading(false);
		}
	};

	if (!user) return null;

	return (
		<div className="admin-reports-container">
			<Navbar user={user} />
			<div className="admin-reports-content">
				<div className="admin-reports-header">
					<div className="header-actions">
						<button className="btn-back" onClick={() => navigate('/dashboard')}>
							{t('backToDashboard')}
						</button>
					</div>
					<h1>{t('bugReports')}</h1>
					<p>{t('adminBugReportsDesc')}</p>
				</div>

				<div className="admin-reports-card">
					{loading ? (
						<div className="loading-state">{t('loadingReports')}</div>
					) : reports.length === 0 ? (
						<div className="empty-state">
							<div className="empty-icon">🎉</div>
							<h3>{t('noBugsReported')}</h3>
							<p>{t('noBugsReportedDesc')}</p>
						</div>
					) : (
						<div className="reports-table-wrapper">
							<table className="reports-table">
								<thead>
									<tr>
										<th>{t('title')}</th>
										<th>{t('reporter')}</th>
										<th>{t('dateSubmitted')}</th>
										<th>{t('action')}</th>
									</tr>
								</thead>
								<tbody>
									{reports.map((report) => (
										<tr 
											key={report._id} 
											className="report-row"
											onClick={() => navigate(`/admin/bug-reports/${report._id}`)}
										>
											<td className="report-title">{report.title}</td>
											<td>
												{report.user ? (
													<span className="reporter-badge">
														{report.user.username || report.user.email}
													</span>
												) : (
													<span className="reporter-badge unknown">{t('unknownUser')}</span>
												)}
											</td>
											<td className="report-date">
												{new Date(report.createdAt).toLocaleDateString(undefined, {
													year: 'numeric',
													month: 'short',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit'
												})}
											</td>
											<td>
												<span className="view-link">{t('viewDetailsArrow')}</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AdminBugReports;
