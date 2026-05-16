import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './SubmissionView.css';
import { getStorageItem } from '../utils/storage';
import Navbar from '../components/Navbar';

// ─── Read-only Field Renderer ─────────────────────────────────────────────────
function ReadonlyField({ field }) {
	const val = field.submittedValue;
	const { t } = useLanguage();

	switch (field.type) {
		case 'heading': {
			const sz = { h1: '28px', h2: '22px', h3: '18px' }[field.level] || '22px';
			return <div className="sv-heading" style={{ fontSize: sz }}>{field.label}</div>;
		}
		case 'label':
			return <p className="sv-p">{field.label}</p>;
		case 'divider':
			return <hr className="sv-divider" />;
		case 'checkbox': {
			const checked = Array.isArray(val) ? val : [];
			return (
				<div className="sv-field-wrapper">
					<label className="sv-label">{field.label}</label>
					<div className="sv-checkbox-group">
						{field.options?.map((o, i) => (
							<label key={i} className="sv-check-row">
								<input type="checkbox" disabled checked={checked.includes(o)} readOnly />
								<span>{o}</span>
							</label>
						))}
					</div>
				</div>
			);
		}
		case 'radio': {
			return (
				<div className="sv-field-wrapper">
					<label className="sv-label">{field.label}</label>
					<div className="sv-checkbox-group">
						{field.options?.map((o, i) => (
							<label key={i} className="sv-check-row">
								<input type="radio" disabled checked={val === o} readOnly />
								<span>{o}</span>
							</label>
						))}
					</div>
				</div>
			);
		}
		case 'file':
			return (
				<div className="sv-field-wrapper">
					<label className="sv-label">{field.label}</label>
					<div className="sv-value-box">
						{Array.isArray(val) && val.length > 0 ? val.join(', ') : <em className="sv-empty-val">{t('noFileAttached')}</em>}
					</div>
				</div>
			);
		default:
			return (
				<div className="sv-field-wrapper">
					<label className="sv-label">{field.label}</label>
					<div className="sv-value-box">
						{val !== null && val !== undefined && val !== ''
							? String(val)
							: <em className="sv-empty-val">{t('notAnswered')}</em>}
					</div>
				</div>
			);
	}
}

const STATUS_LABELS = {
	submitted: 'Submitted',
	in_progress: 'In Progress',
	approved: 'Approved',
	denied: 'Denied',
	// legacy aliases
	pending: 'Pending',
	rejected: 'Rejected',
};

const STATUS_COLORS = {
	submitted: 'sv-status-submitted',
	in_progress: 'sv-status-pending',
	approved: 'sv-status-approved',
	denied: 'sv-status-denied',
	// legacy aliases
	pending: 'sv-status-pending',
	rejected: 'sv-status-denied',
};

function formatDate(dateStr) {
	if (!dateStr) return '—';
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: 'numeric', month: 'long', day: 'numeric',
		hour: '2-digit', minute: '2-digit',
	});
}

function formatDateShort(dateStr) {
	if (!dateStr) return '—';
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: 'numeric', month: 'short', day: 'numeric',
	});
}

// ─── Node type icons ──────────────────────────────────────────────────────────
const NODE_ICONS = {
	start: '▶',
	approval: '✓',
	end: '■',
};

const NODE_LABELS = {
	start: 'Submitted',
	approval: 'Approval',
	end: 'End',
};

// ─── Pipeline Timeline Component ──────────────────────────────────────────────
function PipelineTimeline({ pipeline }) {
	const { t } = useLanguage();
	if (!pipeline || pipeline.length === 0) return null;

	return (
		<div className="sv-pipeline">
			<h2 className="sv-pipeline-title">Approval Lifecycle</h2>
			<div className="sv-pipeline-track">
				{pipeline.map((step, idx) => {
					const isLast = idx === pipeline.length - 1;
					const statusClass = `sv-pipeline-step-${step.status}`;
					const icon = NODE_ICONS[step.nodeType] || '○';

					return (
						<div key={step.nodeId} className={`sv-pipeline-step ${statusClass}`}>
							{/* Circle + line */}
							<div className="sv-pipeline-indicator">
								<div className="sv-pipeline-circle">
									{step.status === 'completed' ? '✓' : step.status === 'current' ? icon : '○'}
								</div>
								{!isLast && <div className="sv-pipeline-line" />}
							</div>

							{/* Step content */}
							<div className="sv-pipeline-content">
								<div className="sv-pipeline-node-label">
									{step.nodeLabel || NODE_LABELS[step.nodeType] || step.nodeType}
								</div>
								<div className="sv-pipeline-node-type">
									{step.nodeType === 'start' ? t('startNode') || 'Start'
										: step.nodeType === 'approval' ? t('approvalNode') || 'Approval Step'
										: step.nodeType === 'end' ? t('endNode') || 'End'
										: step.nodeType}
								</div>

								{/* Completed step details */}
								{step.status === 'completed' && step.actorName && (
									<div className="sv-pipeline-detail">
										<span className="sv-pipeline-actor">{step.actorName}</span>
										{step.action && (
											<span className="sv-pipeline-action">
												{step.action === 'submitted' ? t('statusSubmitted') || 'Submitted'
													: step.action === 'approved' ? t('statusApproved') || 'Approved'
													: step.action === 'denied' ? t('statusDenied') || 'Denied'
													: step.action === 'forwarded' ? 'Forwarded'
													: step.action}
											</span>
										)}
										{step.eventCreatedAt && (
											<span className="sv-pipeline-date">{formatDateShort(step.eventCreatedAt)}</span>
										)}
									</div>
								)}
								{step.status === 'completed' && step.note && (
									<div className="sv-pipeline-note">"{step.note}"</div>
								)}

								{/* Current step — show who's waiting */}
								{step.status === 'current' && step.nodeType === 'approval' && (
									<div className="sv-pipeline-waiting">
										{step.assignedRoleNames && step.assignedRoleNames.length > 0 ? (
											<>
												<span className="sv-pipeline-waiting-label">Waiting for: </span>
												<span className="sv-pipeline-roles">{step.assignedRoleNames.join(', ')}</span>
												{step.approvalMode === 'all' && step.requiredApprovals > 1 && (
													<span className="sv-pipeline-mode"> (all {step.requiredApprovals} required)</span>
												)}
												{step.approvalMode === 'any' && step.requiredApprovals > 1 && (
													<span className="sv-pipeline-mode"> (any {step.requiredApprovals} required)</span>
												)}
											</>
										) : (
											<span className="sv-pipeline-waiting-label">Awaiting action</span>
										)}
									</div>
								)}

								{/* Pending step — abstract info */}
								{step.status === 'pending' && step.nodeType === 'approval' && (
									<div className="sv-pipeline-pending-info">
										{step.assignedRoleNames && step.assignedRoleNames.length > 0 && (
											<span className="sv-pipeline-roles-muted">
												Requires: {step.assignedRoleNames.join(', ')}
											</span>
										)}
									</div>
								)}

								{/* End node outcome */}
								{step.nodeType === 'end' && (
									<div className="sv-pipeline-end-outcome">
										{step.outcome === 'denied' ? '❌ Denied' : '✅ Approved'}
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}


// ─── SubmissionView Component ─────────────────────────────────────────────────
export default function SubmissionView() {
	const { submissionId } = useParams();
	const navigate = useNavigate();

	const [submission, setSubmission] = useState(null);
	const [layout, setLayout] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pipeline, setPipeline] = useState([]);
	const [user, setUser] = useState(null);
	const { t } = useLanguage();

	useEffect(() => {
		const userStr = getStorageItem('user');
		if (userStr) {
			try { setUser(JSON.parse(userStr)); } catch {}
		}
	}, []);

	useEffect(() => {
		const token = getStorageItem('accessToken');
		if (!token) {
			navigate('/');
			return;
		}

		const fetchSubmission = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const res = await fetch(`${apiUrl}/formSubmissions/${submissionId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (res.ok) {
					const data = await res.json();
					setSubmission(data);
					if (data.pipeline) {
						setPipeline(data.pipeline);
					}
					try {
						const parsed = JSON.parse(data.submittedData);
						if (parsed.layout) setLayout(parsed.layout);
					} catch {
						setError(t('couldNotParse'));
					}
				} else if (res.status === 404) {
					setError(t('submissionNotFound'));
				} else {
					setError(t('failedLoadSubmission'));
				}
			} catch (err) {
				setError(t('networkErrorTryAgain'));
			} finally {
				setLoading(false);
			}
		};

		fetchSubmission();
	}, [submissionId, navigate, t]);

	if (loading) return <div className="sv-fullpage-loading">{t('loadingSubmission')}</div>;

	return (
		<div className="sv-page">
			<Navbar user={user} />

			{error ? (
				<div className="sv-error-wrapper">
					<div className="sv-error">{error}</div>
				</div>
			) : (
				<>
				{submission && (
					<div className="sv-status-bar">
						<span className={`sv-status-badge ${STATUS_COLORS[submission.status] || 'sv-status-submitted'}`}>
							{STATUS_LABELS[submission.status] || submission.status}
						</span>
					</div>
				)}
				<main className="sv-container">
					<div className="sv-form-meta">
						<div className="sv-readonly-badge">{t('readOnlyView')}</div>
						<h1 className="sv-form-title">{submission?.templateTitle}</h1>
						<p className="sv-submitted-on">
							{t('submittedOnText')} <strong>{formatDate(submission?.createdAt)}</strong>
						</p>
					</div>

					{/* ── Pipeline Timeline ── */}
					{pipeline.length > 0 && <PipelineTimeline pipeline={pipeline} />}

					<div className="sv-form-body">
						{layout.length === 0 ? (
							<p className="sv-no-fields">{t('noFormFields')}</p>
						) : (
							layout.map((row) => (
								<div key={row.id} className="sv-row">
									{row.columns.map((col) => (
										<div key={col.id} className="sv-col" style={{ flex: col.span || 1 }}>
											{col.field ? <ReadonlyField field={col.field} /> : null}
										</div>
									))}
								</div>
							))
						)}
					</div>


				</main>
				</>
			)}
		</div>
	);
}