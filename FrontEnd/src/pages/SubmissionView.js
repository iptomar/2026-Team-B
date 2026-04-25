import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './SubmissionView.css';

// ─── Read-only Field Renderer ─────────────────────────────────────────────────
function ReadonlyField({ field }) {
	const val = field.submittedValue;

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
						{Array.isArray(val) && val.length > 0 ? val.join(', ') : <em className="sv-empty-val">No file attached</em>}
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
							: <em className="sv-empty-val">Not answered</em>}
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

// ─── SubmissionView Component ─────────────────────────────────────────────────
export default function SubmissionView() {
	const { submissionId } = useParams();
	const navigate = useNavigate();

	const [submission, setSubmission] = useState(null);
	const [layout, setLayout] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [events, setEvents] = useState([]);
	const [eventsLoading, setEventsLoading] = useState(true);

	useEffect(() => {
		const token = localStorage.getItem('accessToken');
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
					try {
						const parsed = JSON.parse(data.submittedData);
						if (parsed.layout) setLayout(parsed.layout);
					} catch {
						setError('Could not parse form data.');
					}
				} else if (res.status === 404) {
					setError('Submission not found.');
				} else {
					setError('Failed to load submission.');
				}
			} catch (err) {
				setError('Network error. Please try again.');
			} finally {
				setLoading(false);
			}
		};

		fetchSubmission();

		const fetchEvents = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const res = await fetch(`${apiUrl}/formSubmissions/${submissionId}/events`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (res.ok) setEvents(await res.json());
			} catch { /* non-fatal */ } finally {
				setEventsLoading(false);
			}
		};
		fetchEvents();
	}, [submissionId, navigate]);

	if (loading) return <div className="sv-fullpage-loading">Loading submission…</div>;

	return (
		<div className="sv-page">
			<header className="sv-header">
				<button className="sv-back-btn" onClick={() => navigate('/my-submissions')}>
					← My Submissions
				</button>
				{submission && (
					<div className="sv-header-meta">
						<span
							className={`sv-status-badge ${STATUS_COLORS[submission.status] || 'sv-status-submitted'}`}
						>
							{STATUS_LABELS[submission.status] || submission.status}
						</span>
					</div>
				)}
			</header>

			{error ? (
				<div className="sv-error-wrapper">
					<div className="sv-error">{error}</div>
					<button className="sv-back-btn" style={{ marginTop: '1rem' }} onClick={() => navigate('/my-submissions')}>
						← Back
					</button>
				</div>
			) : (
				<main className="sv-container">
					<div className="sv-form-meta">
						<div className="sv-readonly-badge">Read-only view</div>
						<h1 className="sv-form-title">{submission?.templateTitle}</h1>
						<p className="sv-submitted-on">
							Submitted on <strong>{formatDate(submission?.createdAt)}</strong>
						</p>
					</div>

					<div className="sv-form-body">
						{layout.length === 0 ? (
							<p className="sv-no-fields">No form fields found in this submission.</p>
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

					{/* ── Approval History ── */}
					{!eventsLoading && events.length > 0 && (
						<div className="sv-audit-trail">
							<h2 className="sv-audit-title">Approval History</h2>
							<ol className="sv-audit-list">
								{events.map((ev) => (
									<li key={ev._id} className={`sv-audit-item sv-audit-${ev.action}`}>
										<span className="sv-audit-icon">
											{ev.action === 'approved' ? '✅' : ev.action === 'denied' ? '❌' : '↪️'}
										</span>
										<div className="sv-audit-body">
											<span className="sv-audit-actor">{ev.actorName}</span>
											<span className="sv-audit-action">{ev.action}</span>
											{ev.nodeLabel && <span className="sv-audit-node">at «{ev.nodeLabel}»</span>}
											{ev.note && <span className="sv-audit-note">"{ev.note}"</span>}
											{ev.forwardedTo?.userName && (
												<span className="sv-audit-forward">→ {ev.forwardedTo.userName}</span>
											)}
											{ev.forwardedTo?.roleName && !ev.forwardedTo?.userName && (
												<span className="sv-audit-forward">→ role: {ev.forwardedTo.roleName}</span>
											)}
											<span className="sv-audit-date">{formatDate(ev.createdAt)}</span>
										</div>
									</li>
								))}
							</ol>
						</div>
					)}
				</main>
			)}
		</div>
	);
}
