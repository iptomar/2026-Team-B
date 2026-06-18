import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './SubmissionView.css';
import { getStorageItem } from '../utils/storage';
import Navbar from '../components/Navbar';
import { subscribeToSubmissionUpdates, unsubscribeFromSubmissionUpdates } from '../utils/socket';

// ─── Helper: format file size ─────────────────────────────────────────────────
function formatFileSize(bytes) {
	if (!bytes || bytes === 0) return '0 B';
	if (bytes < 1024) return bytes + ' B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
	return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─── File Attachment Card ─────────────────────────────────────────────────────
function FileAttachmentCard({ attachment, submissionId }) {
	const [loading, setLoading] = useState(false);
	const { t } = useLanguage();

	const handleDownload = async () => {
		if (loading) return;
		setLoading(true);
		try {
			const token = getStorageItem('accessToken');
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const encodedBlob = encodeURIComponent(attachment.blobName);
			const res = await fetch(
				`${apiUrl}/formSubmissions/${submissionId}/files/${encodedBlob}/sas`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			if (res.ok) {
				const { url } = await res.json();
				window.open(url, '_blank');
			} else {
				console.error('Failed to get SAS URL:', res.status);
			}
		} catch (err) {
			console.error('Error fetching SAS URL:', err);
		} finally {
			setLoading(false);
		}
	};

	const ext = (attachment.originalName || '').split('.').pop()?.toLowerCase() || '';
	const iconMap = {
		pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
		png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️',
		zip: '📦', rar: '📦', '7z': '📦',
		mp4: '🎬', mp3: '🎵', txt: '📝',
	};
	const icon = iconMap[ext] || '📄';

	return (
		<button
			type="button"
			className={`sv-file-card ${loading ? 'sv-file-card-loading' : ''}`}
			onClick={handleDownload}
			title={t('downloadFile') || 'Download file'}
		>
			<span className="sv-file-card-icon">{icon}</span>
			<div className="sv-file-card-info">
				<span className="sv-file-card-name">{attachment.originalName}</span>
				<span className="sv-file-card-size">{formatFileSize(attachment.size)}</span>
			</div>
			<span className="sv-file-card-dl">{loading ? '⏳' : '⬇'}</span>
		</button>
	);
}

// ─── Read-only Field Renderer ─────────────────────────────────────────────────
function ReadonlyField({ field, value, attachments, submissionId, isReviewer, flaggedComment, onFlag }) {
	const val = value;
	const { t } = useLanguage();

	let content = null;
	switch (field.type) {
		case 'heading': {
			const sz = { h1: '28px', h2: '22px', h3: '18px' }[field.level] || '22px';
			content = <div className="sv-heading" style={{ fontSize: sz }}>{field.label}</div>;
			break;
		}
		case 'label':
			content = <p className="sv-p">{field.label}</p>;
			break;
		case 'divider':
			content = <hr className="sv-divider" />;
			break;
		case 'checkbox': {
			const checked = Array.isArray(val) ? val : [];
			content = (
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
			break;
		}
		case 'radio': {
			content = (
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
			break;
		}
		case 'file': {
			const fieldAttachments = (attachments || []).filter(a => a.fieldId === field.id);
			content = (
				<div className="sv-field-wrapper">
					<label className="sv-label">{field.label}</label>
					{fieldAttachments.length > 0 ? (
						<div className="sv-file-list">
							{fieldAttachments.map((att, i) => (
								<FileAttachmentCard key={i} attachment={att} submissionId={submissionId} />
							))}
						</div>
					) : (
						<div className="sv-value-box">
							{Array.isArray(val) && val.length > 0
								? val.join(', ')
								: <em className="sv-empty-val">{t('noFileAttached')}</em>}
						</div>
					)}
				</div>
			);
			break;
		}
		default:
			content = (
				<div className="sv-field-wrapper">
					<label className="sv-label">{field.label}</label>
					<div className="sv-value-box">
						{val !== null && val !== undefined && val !== ''
							? String(val)
							: <em className="sv-empty-val">{t('notAnswered')}</em>}
					</div>
				</div>
			);
			break;
	}

	const isStatic = field.type === 'heading' || field.type === 'label' || field.type === 'divider';
	const isInteractive = isReviewer && !isStatic;

	if (!isInteractive && !flaggedComment) return content;

	return (
		<div 
			onClick={() => isInteractive && onFlag(field)}
			style={{ 
				position: 'relative', 
				cursor: isInteractive ? 'pointer' : 'default',
				padding: (isInteractive || flaggedComment) ? '8px' : '0',
				borderRadius: '8px',
				border: flaggedComment ? '2px dashed #ef4444' : '2px solid transparent',
				backgroundColor: flaggedComment ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
				transition: 'all 0.2s'
			}}
			className={`sv-interactive-wrapper ${isInteractive && !flaggedComment ? 'sv-interactive-hover-area' : ''}`}
		>
			{flaggedComment && isInteractive && (
				<div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', zIndex: 10 }}>
					!
				</div>
			)}
			{flaggedComment && !isInteractive && (
				<div className="sv-tooltip-container" style={{ position: 'absolute', top: '-10px', right: '-10px', zIndex: 10 }}>
					<span className="sv-tooltip-trigger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold', borderRadius: '50%', fontSize: '14px', cursor: 'help', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)' }}>?</span>
					<div className="sv-tooltip-content" style={{ position: 'absolute', bottom: '120%', right: '0', width: '250px', backgroundColor: '#1e293b', color: '#f8fafc', textAlign: 'left', borderRadius: '6px', padding: '10px', fontSize: '13px', lineHeight: '1.4', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)', border: '1px solid #334155', pointerEvents: 'none', zIndex: 20 }}>
						<strong>Correction Requested:</strong><br />
						{flaggedComment}
					</div>
				</div>
			)}
			{content}
		</div>
	);
}



const STATUS_COLORS = {
	submitted: 'sv-status-submitted',
	in_progress: 'sv-status-pending',
	approved: 'sv-status-approved',
	denied: 'sv-status-denied',
	needs_correction: 'sv-status-denied',
	// legacy aliases
	pending: 'sv-status-pending',
	rejected: 'sv-status-denied',
};

function formatDate(dateStr, lang = navigator.language) {
	if (!dateStr) return '—';
	return new Date(dateStr).toLocaleDateString(lang, {
		year: 'numeric', month: 'long', day: 'numeric',
		hour: '2-digit', minute: '2-digit',
	});
}

function formatDateShort(dateStr, lang = navigator.language) {
	if (!dateStr) return '—';
	return new Date(dateStr).toLocaleDateString(lang, {
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
	const { t, language } = useLanguage();
	if (!pipeline || pipeline.length === 0) return null;

	return (
		<div className="sv-pipeline">
			<h2 className="sv-pipeline-title">{t('approvalLifecycle') || 'Approval Lifecycle'}</h2>
			<div className="sv-pipeline-track">
				{pipeline.map((step, idx) => {
					const isLast = idx === pipeline.length - 1;
					
					let statusClass = `sv-pipeline-step-${step.status}`;
					if (step.nodeType === 'end' && step.outcome === 'denied') {
						statusClass += ' sv-pipeline-step-denied';
					} else if (step.nodeType === 'end' && step.outcome === 'approved') {
						statusClass += ' sv-pipeline-step-approved';
					} else if (step.action === 'denied') {
						statusClass += ' sv-pipeline-step-denied';
					}

					const icon = NODE_ICONS[step.nodeType] || '○';

					let lineColorClass = 'sv-pipeline-line-default';
					if (step.status === 'current') {
						lineColorClass = 'sv-pipeline-line-current';
					} else if (step.status === 'completed') {
						if (step.action === 'denied' || step.outcome === 'denied') {
							lineColorClass = 'sv-pipeline-line-denied';
						} else {
							lineColorClass = 'sv-pipeline-line-completed';
						}
					}

					return (
						<div key={step.nodeId} className={`sv-pipeline-step ${statusClass}`}>
							{/* Circle + line */}
							<div className="sv-pipeline-indicator">
								<div className="sv-pipeline-circle">
									{step.nodeType === 'end' && step.outcome === 'denied' ? '✕' : step.action === 'denied' ? '✕' : step.status === 'completed' ? '✓' : step.status === 'current' ? icon : '○'}
								</div>
								{!isLast && <div className={`sv-pipeline-line ${lineColorClass}`} />}
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
								{step.requiredApprovals > 1 && step.nodeEvents && step.nodeEvents.length > 0 ? (
									<div className="sv-pipeline-events-list">
										{step.nodeEvents.map((evt, idx) => (
											<div key={idx} className="sv-pipeline-event-item">
												<div className="sv-pipeline-detail">
													<span className="sv-pipeline-actor">{evt.actorName}</span>
													{evt.action && (
														<span className={`sv-pipeline-action${evt.action === 'denied' ? ' sv-pipeline-action-denied' : evt.action === 'forwarded' ? ' sv-pipeline-action-forwarded' : ''}`}>
															{evt.action === 'submitted' ? t('statusSubmitted') || 'Submitted'
																: evt.action === 'approved' ? t('statusApproved') || 'Approved'
																	: evt.action === 'denied' ? t('statusDenied') || 'Denied'
																		: evt.action === 'forwarded' ? 'Forwarded'
																			: evt.action}
														</span>
													)}
													{evt.eventCreatedAt && (
														<span className="sv-pipeline-date">{formatDateShort(evt.eventCreatedAt, language)}</span>
													)}
												</div>
												{evt.note && (
													<div className="sv-pipeline-note">"{evt.note}"</div>
												)}
											</div>
										))}
									</div>
								) : (
									<>
										{step.status === 'completed' && step.actorName && (
											<div className="sv-pipeline-detail">
												<span className="sv-pipeline-actor">{step.actorName}</span>
												{step.action && (
													<span className={`sv-pipeline-action${step.action === 'denied' ? ' sv-pipeline-action-denied' : step.action === 'forwarded' ? ' sv-pipeline-action-forwarded' : ''}`}>
														{step.action === 'submitted' ? t('statusSubmitted') || 'Submitted'
															: step.action === 'approved' ? t('statusApproved') || 'Approved'
																: step.action === 'denied' ? t('statusDenied') || 'Denied'
																	: step.action === 'forwarded' ? 'Forwarded'
																		: step.action}
													</span>
												)}
												{step.eventCreatedAt && (
													<span className="sv-pipeline-date">{formatDateShort(step.eventCreatedAt, language)}</span>
												)}
											</div>
										)}
										{step.status === 'completed' && step.note && (
											<div className="sv-pipeline-note">"{step.note}"</div>
										)}
									</>
								)}

								{/* Current step — show who's waiting */}
								{step.status === 'current' && step.nodeType === 'approval' && (
									<div className="sv-pipeline-waiting">
										{step.assignedRoleNames && step.assignedRoleNames.length > 0 ? (
											<>
												<span className="sv-pipeline-waiting-label">{t('waitingFor') || 'Waiting for:'} </span>
												<span className="sv-pipeline-roles">{step.assignedRoleNames.join(', ')}</span>
												{step.approvalMode === 'all' && step.requiredApprovals > 1 && (
													<span className="sv-pipeline-mode"> ({t('allRequired') || 'all'} {step.requiredApprovals} {t('required') || 'required'})</span>
												)}
												{step.approvalMode === 'any' && step.requiredApprovals > 1 && (
													<span className="sv-pipeline-mode"> ({t('anyRequired') || 'any'} {step.requiredApprovals} {t('required') || 'required'})</span>
												)}
											</>
										) : (
											<span className="sv-pipeline-waiting-label">{t('awaitingAction') || 'Awaiting action'}</span>
										)}
									</div>
								)}

								{/* Pending step — abstract info */}
								{step.status === 'pending' && step.nodeType === 'approval' && (
									<div className="sv-pipeline-pending-info">
										{step.assignedRoleNames && step.assignedRoleNames.length > 0 && (
											<span className="sv-pipeline-roles-muted">
												{t('requires') || 'Requires'}: {step.assignedRoleNames.join(', ')}
											</span>
										)}
									</div>
								)}

								{/* End node outcome */}
								{step.nodeType === 'end' && (
									<div className={`sv-pipeline-end-outcome ${step.outcome === 'denied' ? 'sv-pipeline-end-denied' : ''}`}>
										{step.outcome === 'denied' ? `❌ ${t('statusDenied') || 'Denied'}` : `✅ ${t('statusApproved') || 'Approved'}`}
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




// ─── Correction Modal ─────────────────────────────────────────────────────────
// ─── Field Correction Modal ─────────────────────────────────────────────────────────
function FieldCorrectionModal({ field, initialComment, onSave, onClose, onDelete }) {
	const { t } = useLanguage();
	const [comment, setComment] = useState(initialComment || '');

	const handleSave = (e) => {
		e.preventDefault();
		if (!comment.trim()) return;
		onSave(field.id, comment.trim());
	};

	return (
		<div className="pr-modal-overlay" onClick={onClose} style={{ zIndex: 1000, background: 'rgba(0,0,0,0.5)' }}>
			<div className="pr-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
				<header className="pr-modal-header">
					<h3>Correction for: {field.label}</h3>
					<button className="pr-modal-close" onClick={onClose}>✕</button>
				</header>
				<form onSubmit={handleSave} className="pr-modal-body">
					<div className="pr-modal-field">
						<label className="pr-modal-label">Reason / Comments</label>
						<textarea
							className="pr-modal-textarea"
							placeholder="Explain what needs to be fixed..."
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							required
							rows={4}
							maxLength={1000}
							autoFocus
						/>
					</div>

					<div className="pr-modal-actions" style={{ justifyContent: initialComment ? 'space-between' : 'flex-end' }}>
						{initialComment && (
							<button type="button" className="pr-modal-cancel" onClick={() => onDelete(field.id)} style={{ color: '#ef4444', borderColor: '#ef4444', backgroundColor: 'transparent' }}>Remove Flag</button>
						)}
						<div style={{ display: 'flex', gap: '0.5rem' }}>
							<button type="button" className="pr-modal-cancel" onClick={onClose}>{t('cancel')}</button>
							<button type="submit" className="pr-modal-submit" disabled={!comment.trim()}>Save</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}

// ─── SubmissionView Component ─────────────────────────────────────────────────
export default function SubmissionView() {
	const { submissionId } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const isReviewer = location.state?.from === 'pending';

	const [submission, setSubmission] = useState(null);
	const [layout, setLayout] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pipeline, setPipeline] = useState([]);
	const [user, setUser] = useState(null);
	const [pendingCorrections, setPendingCorrections] = useState([]);
	const [activeFieldForCorrection, setActiveFieldForCorrection] = useState(null);
	const [selectedVersion, setSelectedVersion] = useState('latest');
	const [markingUrgent, setMarkingUrgent] = useState(false);
	const { t, language } = useLanguage();

	useEffect(() => {
		const userStr = getStorageItem('user');
		if (userStr) {
			try { setUser(JSON.parse(userStr)); } catch { }
		}
	}, []);

	useEffect(() => {
		const handleSubmissionUpdate = (data) => {
			if (data.submissionId === submissionId && data.status !== 'in_progress') {
				// The submission was acted upon by someone else
				navigate('/pending', { 
					state: { 
						toastMsg: 'Someone else has already approved or acted on this submission.',
						toastType: 'ok'
					} 
				});
			}
		};

		subscribeToSubmissionUpdates(handleSubmissionUpdate);
		return () => unsubscribeFromSubmissionUpdates();
	}, [submissionId, navigate]);

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
						const parsed = JSON.parse(data.templateLayout);
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

	const handleRequestCorrection = async () => {
		if (pendingCorrections.length === 0) return;
		const token = getStorageItem('accessToken');
		if (!token) return;

		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/formSubmissions/${submissionId}/action`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ action: 'returned', correctionRequests: pendingCorrections }),
			});

			if (res.ok) {
				navigate('/pending'); // Go back to pending reviews
			} else {
				const data = await res.json();
				alert(data.message || 'Failed to request correction');
			}
		} catch (err) {
			alert('Network error submitting action');
		}
	};

	const handleSaveCorrection = (fieldId, comment) => {
		setPendingCorrections(prev => {
			const existing = prev.find(p => p.fieldId === fieldId);
			if (existing) {
				return prev.map(p => p.fieldId === fieldId ? { ...p, comment } : p);
			} else {
				return [...prev, { fieldId, comment }];
			}
		});
		setActiveFieldForCorrection(null);
	};

	const handleDeleteCorrection = (fieldId) => {
		setPendingCorrections(prev => prev.filter(p => p.fieldId !== fieldId));
		setActiveFieldForCorrection(null);
	};

	const handleMarkUrgent = async () => {
		if (markingUrgent) return;
		setMarkingUrgent(true);
		const token = getStorageItem('accessToken');
		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/formSubmissions/${submissionId}/urgent`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` }
			});
			if (res.ok) {
				setSubmission(prev => ({ ...prev, isUrgent: true }));
			} else {
				alert(t('errorMarkingUrgent') || 'Failed to mark as urgent');
			}
		} catch (err) {
			alert('Network error');
		} finally {
			setMarkingUrgent(false);
		}
	};

	if (loading) {
		return (
			<div className="sv-page">
				<Navbar user={user} />
				<main className="sv-container">
					<div className="sv-form-meta" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
						<div className="skeleton-box skeleton-title" style={{ width: '40%' }} />
						<div className="skeleton-box skeleton-text" style={{ width: '25%' }} />
					</div>
					
					<div className="sv-pipeline" style={{ marginBottom: '2rem' }}>
						<div className="skeleton-box skeleton-text" style={{ width: '20%', height: '1.5rem', marginBottom: '1.5rem' }} />
						<div className="sv-pipeline-track" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
							{[1, 2, 3].map((i) => (
								<div key={i} className="sv-pipeline-step sv-pipeline-step-pending" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
									<div className="sv-pipeline-indicator" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
										<div className="skeleton-box skeleton-circle" style={{ width: '32px', height: '32px' }} />
									</div>
									<div className="sv-pipeline-content" style={{ flex: 1 }}>
										<div className="skeleton-box skeleton-text" style={{ width: '30%', height: '1.25rem', marginBottom: '0.4rem' }} />
										<div className="skeleton-box skeleton-text-short" style={{ width: '15%' }} />
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="sv-form-body" style={{ marginTop: '2rem' }}>
						{[1, 2].map((i) => (
							<div key={i} className="sv-row" style={{ marginBottom: '1.5rem' }}>
								<div className="sv-col" style={{ flex: 1 }}>
									<div className="sv-field-wrapper">
										<div className="skeleton-box skeleton-text-short" style={{ width: '20%', marginBottom: '0.5rem' }} />
										<div className="skeleton-box skeleton-text" style={{ height: '2.5rem', borderRadius: '8px' }} />
									</div>
								</div>
							</div>
						))}
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="sv-page">
			<Navbar user={user} />

			{error ? (
				<div className="sv-error-wrapper">
					<div className="sv-error">{error}</div>
				</div>
			) : (
				<>
					<main className="sv-container">
						<div className="sv-form-meta">
							<button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: 0, fontWeight: 'bold' }}>
								{t('backBtn') || '← Back'}
							</button>
							<div className="sv-readonly-badge">{t('readOnlyView')}</div>
							<h1 className="sv-form-title">
								{submission?.templateTitle}
								<span className={`sv-status-badge ${STATUS_COLORS[submission?.status] || 'sv-status-submitted'}`} style={{ marginLeft: '1rem', verticalAlign: 'middle', fontSize: '0.9rem' }}>
									{t(submission?.status === 'submitted' ? 'statusSubmitted' : submission?.status === 'in_progress' ? 'statusInProgress' : submission?.status === 'approved' ? 'statusApproved' : submission?.status === 'denied' ? 'statusDenied' : submission?.status === 'needs_correction' ? 'statusNeedsCorrection' : 'statusPending')}
								</span>
								{submission?.isUrgent && (
									<span className="sv-status-badge" style={{ backgroundColor: '#ef4444', color: '#fff', marginLeft: '0.5rem', verticalAlign: 'middle', fontSize: '0.9rem' }}>
										🚨 {t('urgent') || 'Urgent'}
									</span>
								)}
							</h1>
							<p className="sv-submitted-on">
								{t('submittedOnText')} <strong>{formatDate(submission?.createdAt, language)}</strong>
							</p>

							{submission?.isAdminUser && submission?.status === 'in_progress' && !submission?.isUrgent && selectedVersion === 'latest' && (
								<div style={{ marginTop: '1rem' }}>
									<button onClick={handleMarkUrgent} disabled={markingUrgent} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: markingUrgent ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
										{markingUrgent ? '...' : t('urgencyFee') || 'Pay Urgency Fee 🚨'}
									</button>
								</div>
							)}

							{submission?.versionHistory && submission.versionHistory.length > 0 && (
								<div style={{ marginTop: '1rem' }}>
									<label style={{ color: '#94a3b8', marginRight: '0.5rem', fontWeight: 'bold' }}>{t('viewVersion') || 'View Version:'}</label>
									<select 
										value={selectedVersion} 
										onChange={(e) => {
											setSelectedVersion(e.target.value);
											setPendingCorrections([]);
										}}
										style={{ padding: '0.5rem', borderRadius: '4px', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', cursor: 'pointer' }}
									>
										<option value="latest">{t('latestVersion') || 'Latest Version'}</option>
										{submission.versionHistory.slice().reverse().map((v) => (
											<option key={v.versionNumber} value={v.versionNumber}>
												{t('versionText') || 'Version'} {v.versionNumber} ({formatDateShort(v.createdAt, language)})
											</option>
										))}
									</select>
									{selectedVersion !== 'latest' && (
										<span style={{ marginLeft: '1rem', color: '#f59e0b', fontSize: '0.9rem', fontWeight: 'bold' }}>
											{t('viewingHistoricalVersion') || 'Viewing historical version'}
										</span>
									)}
								</div>
							)}
						</div>

						{/* ── Pipeline Timeline ── */}
						{pipeline.length > 0 && <PipelineTimeline pipeline={pipeline} />}

						<div className="sv-form-body">
							{layout.length === 0 ? (
								<p className="sv-no-fields">{t('noFormFields')}</p>
							) : (
								layout.map((row) => (
									<div key={row.id} className="sv-row">
										{row.columns.map((col) => {
											const isActiveVersion = selectedVersion === 'latest';
											const activeVersionData = isActiveVersion ? null : (submission?.versionHistory || []).find(v => v.versionNumber === Number(selectedVersion));
											const activeValues = isActiveVersion ? submission?.submittedValues : activeVersionData?.submittedValues;
											const activeCorrectionRequests = isActiveVersion ? submission?.correctionRequests : activeVersionData?.correctionRequests;

											return (
												<div key={col.id} className="sv-col" style={{ flex: col.span || 1 }}>
													{col.field ? (
														<ReadonlyField 
															field={col.field} 
															value={activeValues?.[col.field.id]} 
															attachments={submission?.attachments || []} 
															submissionId={submissionId} 
															isReviewer={isReviewer && submission?.status === 'in_progress' && isActiveVersion}
															flaggedComment={
																pendingCorrections.find(c => c.fieldId === col.field.id)?.comment || 
																(activeCorrectionRequests || []).find(c => c.fieldId === col.field.id)?.comment
															}
															onFlag={(field) => setActiveFieldForCorrection(field)}
														/>
													) : null}
												</div>
											);
										})}
									</div>
								))
							)}
						</div>

						{/* Action Bar for Reviewers */}
						{isReviewer && submission?.status === 'in_progress' && selectedVersion === 'latest' && (
							<div className="sv-action-bar" style={{ marginTop: '2rem', padding: '1rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
								{pendingCorrections.length > 0 && (
									<div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #334155' }}>
										<h3 style={{ color: '#f59e0b', marginTop: 0 }}>Corrections to Request</h3>
										<ul style={{ color: '#f8fafc', paddingLeft: '1.5rem', margin: 0 }}>
											{pendingCorrections.map((req, idx) => {
												const fieldLabel = layout.flatMap(r => r.columns.map(c => c.field)).find(f => f?.id === req.fieldId)?.label || req.fieldId;
												return <li key={idx} style={{ marginBottom: '0.5rem' }}><strong>{fieldLabel}:</strong> {req.comment}</li>;
											})}
										</ul>
									</div>
								)}
								<div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
									<button className="pr-btn pr-btn-forward" onClick={handleRequestCorrection} disabled={pendingCorrections.length === 0} style={{ backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: pendingCorrections.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: pendingCorrections.length === 0 ? 0.5 : 1 }}>
										Submit Correction Requests ({pendingCorrections.length})
									</button>
								</div>
							</div>
						)}

						{/* Action Bar for Submitters / Correction Info */}
						{(submission?.status === 'needs_correction' || selectedVersion !== 'latest') && (
							<div className="sv-action-bar" style={{ marginTop: '2rem', padding: '1rem', background: '#451a03', border: '1px solid #78350f', borderRadius: '8px' }}>
								<h3 style={{ color: '#fbbf24', marginTop: 0 }}>
									{selectedVersion === 'latest' ? (t('correctionsRequested') || 'Corrections Requested') : (t('correctionsRequestedInVersion') || 'Corrections Requested in Version {v}').replace('{v}', selectedVersion)}
								</h3>
								<ul style={{ color: '#fef3c7', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
									{(selectedVersion === 'latest' ? submission.correctionRequests : (submission?.versionHistory || []).find(v => v.versionNumber === Number(selectedVersion))?.correctionRequests)?.map((req, idx) => {
										const fieldLabel = layout.flatMap(r => r.columns.map(c => c.field)).find(f => f?.id === req.fieldId)?.label || req.fieldId;
										return <li key={idx}><strong>{fieldLabel}:</strong> {req.comment}</li>;
									})}
								</ul>
								{(user?.id || user?._id) === submission?.submitterId && selectedVersion === 'latest' && submission?.status === 'needs_correction' && (
									<button onClick={() => navigate(`/fill-form/${submission.templateId?._id || submission.templateId}?edit=${submission._id}`)} style={{ backgroundColor: '#fbbf24', color: '#78350f', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
										{t('editResubmitForm') || 'Edit & Resubmit Form'}
									</button>
								)}
							</div>
						)}

					</main>
				</>
			)}

			{activeFieldForCorrection && (
				<FieldCorrectionModal
					field={activeFieldForCorrection}
					initialComment={pendingCorrections.find(c => c.fieldId === activeFieldForCorrection.id)?.comment}
					onSave={handleSaveCorrection}
					onDelete={handleDeleteCorrection}
					onClose={() => setActiveFieldForCorrection(null)}
				/>
			)}
		</div>
	);
}