import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './AdminBugReportDetail.css';

const AdminBugReportDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [report, setReport] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const fetchBugReportDetail = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const res = await fetch(`${apiUrl}/bug-reports/${id}`, {
					headers: {
						'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
					}
				});
				
				if (res.ok) {
					const data = await res.json();
					setReport(data);
				} else {
					const errData = await res.json();
					setError(errData.message || 'Failed to fetch bug report details.');
				}
			} catch (error) {
				setError('Network error while fetching bug report details.');
			} finally {
				setLoading(false);
			}
		};

		const storedUser = localStorage.getItem('user');
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
	}, [navigate, id]);

	if (!user) return null;

	return (
		<div className="report-detail-container">
			<Navbar user={user} />
			<div className="report-detail-content">
				<div className="report-detail-header">
					<div className="header-actions">
						<button className="btn-back" onClick={() => navigate('/admin/bug-reports')}>
							&larr; Back to Bug Reports
						</button>
					</div>
					<h1>Bug Report Details</h1>
				</div>

				{loading ? (
					<div className="loading-state">Loading details...</div>
				) : error ? (
					<div className="error-state">
						<h3>Error</h3>
						<p>{error}</p>
						<button className="btn-retry" onClick={() => navigate('/admin/bug-reports')}>
							Return to List
						</button>
					</div>
				) : report ? (
					<div className="report-detail-card">
						<div className="detail-section">
							<h2 className="detail-title">{report.title}</h2>
							<div className="detail-meta">
								<div className="meta-item">
									<span className="meta-label">Reported by:</span>
									{report.user ? (
										<span className="reporter-info">
											{report.user.avatarIcon && (
												<span className="reporter-avatar">{report.user.avatarIcon}</span>
											)}
											<strong>{report.user.username}</strong> ({report.user.email})
										</span>
									) : (
										<span className="unknown-reporter">Unknown User</span>
									)}
								</div>
								<div className="meta-item">
									<span className="meta-label">Date Submitted:</span>
									<span className="date-info">
										{new Date(report.createdAt).toLocaleString(undefined, {
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
						</div>

						<div className="detail-section">
							<h3>Description</h3>
							<div className="description-box">
								{report.description.split('\n').map((line, i) => (
									<p key={i}>
										{line}
										<br />
									</p>
								))}
							</div>
						</div>

						{report.image && (
							<div className="detail-section">
								<h3>Attached Screenshot</h3>
								<div className="screenshot-container">
									<img src={report.image} alt="Bug Screenshot" className="bug-screenshot" />
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
