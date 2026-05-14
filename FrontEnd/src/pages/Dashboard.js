import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import './Dashboard.css';

const Dashboard = () => {
	const [user, setUser] = useState(null);

	const [showFormModal, setShowFormModal] = useState(false);
	const [showDraftsModal, setShowDraftsModal] = useState(false);
	const [templates, setTemplates] = useState([]);
	const [submissionCount, setSubmissionCount] = useState(null);
	const [pendingCount, setPendingCount] = useState(null);
	const [inProgressDrafts, setInProgressDrafts] = useState([]);
	const navigate = useNavigate();
	const { t } = useLanguage();

	useEffect(() => {
		const userStr = localStorage.getItem('user');
		const token = localStorage.getItem('accessToken');

		if (!token || !userStr) {
			navigate('/');
			return;
		}

		try {
			const userData = JSON.parse(userStr);
			setUser(userData);


		} catch (e) {
			console.error('Failed to parse user data');
			navigate('/');
		}

		const fetchTemplates = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const res = await fetch(`${apiUrl}/formTemplates`);
				if (res.ok) {
					const data = await res.json();
					setTemplates(data);
				}
			} catch (err) {
				console.error("Failed to fetch templates", err);
			}
		};
		fetchTemplates();

		const fetchSubmissionCount = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const token = localStorage.getItem('accessToken');
				const res = await fetch(`${apiUrl}/formSubmissions/my`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (res.ok) {
					const data = await res.json();
					setSubmissionCount(Array.isArray(data) ? data.length : 0);
				}
			} catch (err) {
				console.error('Failed to fetch submission count', err);
			}
		};
		fetchSubmissionCount();

		const fetchPendingCount = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const token = localStorage.getItem('accessToken');
				const res = await fetch(`${apiUrl}/formSubmissions/pending`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (res.ok) {
					const data = await res.json();
					setPendingCount(Array.isArray(data) ? data.length : 0);
				}
			} catch (err) {
				console.error('Failed to fetch pending count', err);
			}
		};
		fetchPendingCount();

		const fetchDrafts = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const token = localStorage.getItem('accessToken');
				if (!token) return;
				const res = await fetch(`${apiUrl}/draftFormTemplates`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (res.ok) {
					const data = await res.json();
					setInProgressDrafts(Array.isArray(data) ? data : []);
				}
			} catch (err) {
				console.error('Failed to fetch drafts', err);
			}
		};
		fetchDrafts();
	}, [navigate]);

	if (!user) {
		return <div className="dashboard-loading">Loading...</div>;
	}

	const isAdmin = user.roles?.some(r => r.name?.toLowerCase() === 'admin');

	return (
		<div className="dashboard-container">
			<Navbar user={user} />

			<main className="dashboard-content">
				<header className="dashboard-header">
					<h1>{t('dashboard')}</h1>
					<p>{t('dashboardDesc')}</p>
				</header>

				<div className="dashboard-stats">
					<div
						className="stat-card stat-card-clickable"
						onClick={() => navigate('/my-submissions')}
						title="View my submitted forms"
					>
						<div className="stat-value">
							{submissionCount === null ? '…' : submissionCount}
						</div>
						<div className="stat-label">{t('mySubmissions')}</div>
						<div className="stat-cta">{t('viewAll')}</div>
					</div>

					<div
						className="stat-card stat-card-clickable stat-card-pending"
						onClick={() => navigate('/pending-reviews')}
						title="View pending reviews and approvals"
					>
						<div className="stat-value">{pendingCount === null ? '…' : pendingCount}</div>
						<div className="stat-label">{t('pendingReviews')}</div>
						<div className="stat-cta">{t('viewAll')}</div>
					</div>

					<div
						className="stat-card stat-card-clickable stat-card-draft"
						onClick={() => setShowDraftsModal(true)}
						title="View your in-progress form templates"
					>
						<div className="stat-value">{inProgressDrafts.length}</div>
						<div className="stat-label">{t('inProgress')}</div>
						<div className="stat-cta">{t('resume')}</div>
					</div>
				</div>

				<div className="dashboard-grid">
					{isAdmin ? (
						<>
							<Link to="/manage-users" className="action-card" id="manage-users-card">
								<div className="card-icon">👥</div>
								<h3>{t('userManagement')}</h3>
								<p>{t('userManagementDesc')}</p>
							</Link>

							<Link to="/template-builder" className="action-card" id="template-builder-card">
								<div className="card-icon">🏗️</div>
								<h3>{t('templateBuilder')}</h3>
								<p>{t('templateBuilderDesc')}</p>
							</Link>

							<Link to="/manage-forms" className="action-card" id="manage-forms-card">
								<div className="card-icon">📁</div>
								<h3>{t('formManagement')}</h3>
								<p>{t('formManagementDesc')}</p>
							</Link>

							<Link to="/admin/bug-reports" className="action-card" id="bug-reports-card">
								<div className="card-icon">🐛</div>
								<h3>{t('bugReports')}</h3>
								<p>{t('bugReportsDesc')}</p>
							</Link>
						</>
					) : (
						<></>
					)}
					<div onClick={() => setShowFormModal(true)} className="action-card" style={{ cursor: 'pointer' }}>
						<div className="card-icon">✍️</div>
						<h3>{t('formFiling')}</h3>
						<p>{t('formFilingDesc')}</p>
					</div>
				</div>
			</main>

			{/* Form Selection Modal */}
			{showFormModal && (
				<div className="dashboard-modal-overlay">
					<div className="dashboard-modal">
						<header className="dashboard-modal-header">
							<h2>{t('selectForm')}</h2>
							<button className="dashboard-modal-close" onClick={() => setShowFormModal(false)}>✕</button>
						</header>
						<div className="dashboard-modal-content">
							{templates.filter(tpl => {
								if (isAdmin) return true;
								const roles = tpl.allowedSubmitRoles || [];
								if (roles.length === 0) return false; // Or true, if empty means everyone. The plan said false.
								return user?.roles?.some(userRole => roles.includes(userRole._id));
							}).length === 0 ? (
								<p className="no-forms-msg">{t('noFormsMsg')}</p>
							) : (
								<div className="form-list">
									{templates.filter(tpl => {
										if (isAdmin) return true;
										const roles = tpl.allowedSubmitRoles || [];
										if (roles.length === 0) return false;
										return user?.roles?.some(userRole => roles.includes(userRole._id));
									}).map(tpl => (
										<div
											key={tpl._id}
											className="form-list-item"
											onClick={() => navigate(`/fill-form/${tpl._id}`)}
										>
											<div className="form-list-info">
												<h4>{tpl.title} <span className="form-version">v{tpl.version}</span></h4>
												{tpl.description && <p>{tpl.description}</p>}
											</div>
											<div className="form-list-action">
												<span>{t('fill')}</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* In Progress Drafts Modal */}
			{showDraftsModal && (
				<div className="dashboard-modal-overlay">
					<div className="dashboard-modal">
						<header className="dashboard-modal-header">
							<h2>{t('inProgressDrafts')}</h2>
							<button className="dashboard-modal-close" onClick={() => setShowDraftsModal(false)}>✕</button>
						</header>
						<div className="dashboard-modal-content">
							{inProgressDrafts.length === 0 ? (
								<p className="no-forms-msg">{t('noDraftsMsg')}</p>
							) : (
								<div className="form-list">
									{inProgressDrafts.map(d => (
										<div
											key={d._id}
											className="form-list-item"
											onClick={() => {
												setShowDraftsModal(false);
												navigate(`/template-builder?draftId=${d._id}`);
											}}
										>
											<div className="form-list-info">
												<h4>
													{d.title}
													<span className="form-version draft-badge">draft</span>
												</h4>
												<p>{t('lastSaved')} {new Date(d.updatedAt).toLocaleString()}</p>
											</div>
											<div className="form-list-action"><span>{t('resume')}</span></div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}

		</div>
	);
};

export default Dashboard;
