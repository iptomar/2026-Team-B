import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import './Dashboard.css';
import { getStorageItem } from '../utils/storage';

const Dashboard = () => {
	const [user, setUser] = useState(null);

	const [showFormModal, setShowFormModal] = useState(false);
	const [showDraftsModal, setShowDraftsModal] = useState(false);
	const [templates, setTemplates] = useState([]);
	const [submissionCount, setSubmissionCount] = useState(null);
	const [pendingCount, setPendingCount] = useState(null);
	const [inProgressDrafts, setInProgressDrafts] = useState(null);
	const [draftsCount, setDraftsCount] = useState(null);
	const [formSearchQuery, setFormSearchQuery] = useState('');
	const [formLabelFilter, setFormLabelFilter] = useState('');
	const [allLabels, setAllLabels] = useState([]);
	const navigate = useNavigate();
	const { t } = useLanguage();
	const { isDark } = useTheme();

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


		} catch (e) {
			console.error('Failed to parse user data');
			navigate('/');
		}

		const fetchTemplatesAndLabels = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const [resTpl, resLbl] = await Promise.all([
					fetch(`${apiUrl}/formTemplates`),
					fetch(`${apiUrl}/labels`)
				]);
				if (resTpl.ok) {
					const data = await resTpl.json();
					setTemplates(data);
				}
				if (resLbl.ok) {
					const data = await resLbl.json();
					setAllLabels(data);
				}
			} catch (err) {
				console.error("Failed to fetch templates or labels", err);
			}
		};
		fetchTemplatesAndLabels();

		// Fetch all dashboard counters in parallel using lightweight count endpoints
		const fetchDashboardCounts = async () => {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const token = getStorageItem('accessToken');
			if (!token) return;

			const headers = { Authorization: `Bearer ${token}` };

			try {
				const [submissionsRes, pendingRes, draftsCountRes] = await Promise.all([
					fetch(`${apiUrl}/formSubmissions/my/count`, { headers }),
					fetch(`${apiUrl}/formSubmissions/pending/count`, { headers }),
					fetch(`${apiUrl}/draftFormTemplates/count`, { headers }),
				]);

				if (submissionsRes.ok) {
					const data = await submissionsRes.json();
					setSubmissionCount(data.count ?? 0);
				}
				if (pendingRes.ok) {
					const data = await pendingRes.json();
					setPendingCount(data.count ?? 0);
				}
				if (draftsCountRes.ok) {
					const data = await draftsCountRes.json();
					// Store count temporarily; drafts list fetched separately for the modal
					setInProgressDrafts(prev => prev !== null ? prev : []);
					// We use the count from the count endpoint
					setDraftsCount(data.count ?? 0);
				}
			} catch (err) {
				console.error('Failed to fetch dashboard counts', err);
			}
		};
		fetchDashboardCounts();

		// Still fetch the full drafts list for the modal content
		const fetchDrafts = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const token = getStorageItem('accessToken');
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
		<div className="dashboard-container" style={{ backgroundImage: `url(${isDark ? '/iptNightDarkTheme.png' : '/iptDayLightTheme.png'})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed' }}>
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
							{submissionCount === null ? (
								<div className="skeleton-box" style={{ width: '60px', height: '3rem', borderRadius: '12px' }} />
							) : (
								submissionCount
							)}
						</div>
						<div className="stat-label">{t('mySubmissions')}</div>
						<div className="stat-cta">{t('viewAll')}</div>
					</div>

					<div
						className="stat-card stat-card-clickable stat-card-pending"
						onClick={() => navigate('/pending-reviews')}
						title="View pending reviews and approvals"
					>
						<div className="stat-value">
							{pendingCount === null ? (
								<div className="skeleton-box" style={{ width: '60px', height: '3rem', borderRadius: '12px' }} />
							) : (
								pendingCount
							)}
						</div>
						<div className="stat-label">{t('pendingReviews')}</div>
						<div className="stat-cta">{t('viewAll')}</div>
					</div>

					<div
						className="stat-card stat-card-clickable stat-card-draft"
						onClick={() => setShowDraftsModal(true)}
						title="View your in-progress form templates"
					>
						<div className="stat-value">
							{draftsCount === null ? (
								<div className="skeleton-box" style={{ width: '60px', height: '3rem', borderRadius: '12px' }} />
							) : (
								draftsCount
							)}
						</div>
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

							<Link to="/admin/form-management" className="action-card" id="manage-forms-card">
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

					<Link to="/user-manual" className="action-card" id="user-manual-card">
						<div className="card-icon">📖</div>
						<h3>{t('userManual')}</h3>
						<p>{t('userManualDesc')}</p>
					</Link>
				</div>
			</main>

			{/* Form Selection Modal */}
			{showFormModal && (
				<div className="dashboard-modal-overlay">
					<div className="dashboard-modal">
						<header className="dashboard-modal-header">
							<h2>{t('selectForm')}</h2>
							<button className="dashboard-modal-close" onClick={() => { setShowFormModal(false); setFormSearchQuery(''); }}>✕</button>
						</header>
						<div className="dashboard-modal-content">
							<div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
								<input
									type="text"
									className="form-search-input"
									placeholder={t('searchFormPlaceholder') || 'Search by form name…'}
									value={formSearchQuery}
									onChange={e => setFormSearchQuery(e.target.value)}
									autoFocus
									style={{ flex: 1, margin: 0 }}
								/>
								<select
									className="dashboard-select"
									value={formLabelFilter}
									onChange={e => setFormLabelFilter(e.target.value)}
									style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border-input)', background: 'var(--color-bg-input)', color: 'var(--color-text)', outline: 'none' }}
								>
									<option value="">All Labels</option>
									{allLabels.map(lbl => (
										<option key={lbl._id} value={lbl._id}>{lbl.name}</option>
									))}
								</select>
							</div>
							{templates.filter(tpl => {
								if (isAdmin) return true;
								const roles = tpl.allowedSubmitRoles || [];
								const units = tpl.allowedSubmitUnits || [];
								if (roles.length === 0 && units.length === 0) return false;
								
								const hasRole = user?.roles?.some(userRole => roles.includes(userRole._id));
								const hasUnit = user?.units?.some(userUnit => units.includes(userUnit._id || userUnit));
								return hasRole || hasUnit;
							})
							.filter(tpl => !formSearchQuery || tpl.title?.toLowerCase().includes(formSearchQuery.toLowerCase()))
							.filter(tpl => !formLabelFilter || (tpl.labels && tpl.labels.some(l => (l._id || l) === formLabelFilter)))
							.length === 0 ? (
								<p className="no-forms-msg">{t('noFormsMsg')}</p>
							) : (
								<div className="form-list">
									{templates.filter(tpl => {
										if (isAdmin) return true;
										const roles = tpl.allowedSubmitRoles || [];
										const units = tpl.allowedSubmitUnits || [];
										if (roles.length === 0 && units.length === 0) return false;
										
										const hasRole = user?.roles?.some(userRole => roles.includes(userRole._id));
										const hasUnit = user?.units?.some(userUnit => units.includes(userUnit._id || userUnit));
										return hasRole || hasUnit;
									}).filter(tpl => !formSearchQuery || tpl.title?.toLowerCase().includes(formSearchQuery.toLowerCase())).map(tpl => (
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
							{(inProgressDrafts || []).length === 0 ? (
								<p className="no-forms-msg">{t('noDraftsMsg')}</p>
							) : (
								<div className="form-list">
									{(inProgressDrafts || []).map(d => (
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
