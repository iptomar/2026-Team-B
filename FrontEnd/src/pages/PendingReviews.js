import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './PendingReviews.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
	if (!dateStr) return '—';
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: 'numeric', month: 'short', day: 'numeric',
		hour: '2-digit', minute: '2-digit',
	});
}

const ACTION_LABELS = { approved: 'Approve', denied: 'Deny', forwarded: 'Forward' };

// ─── Forward Modal ────────────────────────────────────────────────────────────
function ForwardModal({ onClose, onSubmit, users, roles }) {
	const [targetType, setTargetType] = useState('user'); // 'user' | 'role'
	const [selectedId, setSelectedId] = useState('');
	const [note, setNote] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!selectedId) return;
		const forwardTarget = targetType === 'user'
			? { userId: selectedId }
			: { roleId: selectedId };
		onSubmit({ action: 'forwarded', forwardTarget, note: note.trim() || undefined });
	};

	return (
		<div className="pr-modal-overlay" onClick={onClose}>
			<div className="pr-modal" onClick={(e) => e.stopPropagation()}>
				<header className="pr-modal-header">
					<h3>Forward Submission</h3>
					<button className="pr-modal-close" onClick={onClose}>✕</button>
				</header>

				<form onSubmit={handleSubmit} className="pr-modal-body">
					<div className="pr-modal-toggle">
						<button
							type="button"
							className={`pr-toggle-btn ${targetType === 'user' ? 'active' : ''}`}
							onClick={() => { setTargetType('user'); setSelectedId(''); }}
						>
							Specific User
						</button>
						<button
							type="button"
							className={`pr-toggle-btn ${targetType === 'role' ? 'active' : ''}`}
							onClick={() => { setTargetType('role'); setSelectedId(''); }}
						>
							Role (all users)
						</button>
					</div>

					<div className="pr-modal-field">
						<label className="pr-modal-label">
							{targetType === 'user' ? 'Select User' : 'Select Role'}
						</label>
						<select
							className="pr-modal-select"
							value={selectedId}
							onChange={(e) => setSelectedId(e.target.value)}
							required
						>
							<option value="" disabled>— Choose —</option>
							{targetType === 'user'
								? users.map((u) => <option key={u._id} value={u._id}>{u.username}</option>)
								: roles.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)
							}
						</select>
					</div>

					<div className="pr-modal-field">
						<label className="pr-modal-label">Note (optional)</label>
						<textarea
							className="pr-modal-textarea"
							placeholder="Add a comment for the recipient…"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							rows={3}
							maxLength={1000}
						/>
					</div>

					<div className="pr-modal-actions">
						<button type="button" className="pr-modal-cancel" onClick={onClose}>Cancel</button>
						<button type="submit" className="pr-modal-submit" disabled={!selectedId}>
							↪ Forward
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ─── Action Note Modal ────────────────────────────────────────────────────────
function ActionModal({ action, onClose, onSubmit }) {
	const [note, setNote] = useState('');
	const isApprove = action === 'approved';

	const handleSubmit = (e) => {
		e.preventDefault();
		onSubmit({ action, note: note.trim() || undefined });
	};

	return (
		<div className="pr-modal-overlay" onClick={onClose}>
			<div className="pr-modal pr-modal-sm" onClick={(e) => e.stopPropagation()}>
				<header className="pr-modal-header">
					<h3>{isApprove ? '✅ Approve Submission' : '❌ Deny Submission'}</h3>
					<button className="pr-modal-close" onClick={onClose}>✕</button>
				</header>
				<form onSubmit={handleSubmit} className="pr-modal-body">
					<div className="pr-modal-field">
						<label className="pr-modal-label">Note (optional)</label>
						<textarea
							className="pr-modal-textarea"
							placeholder={isApprove ? 'Add an approval note…' : 'Reason for denial…'}
							value={note}
							onChange={(e) => setNote(e.target.value)}
							rows={3}
							maxLength={1000}
						/>
					</div>
					<div className="pr-modal-actions">
						<button type="button" className="pr-modal-cancel" onClick={onClose}>Cancel</button>
						<button
							type="submit"
							className={`pr-modal-submit ${isApprove ? '' : 'pr-modal-deny'}`}
						>
							{isApprove ? '✅ Confirm Approve' : '❌ Confirm Deny'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ─── PendingReviews Page ──────────────────────────────────────────────────────
const PendingReviews = () => {
	const [user, setUser] = useState(null);
	const [pendingItems, setPendingItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [toast, setToast] = useState(null);
	const [actionModal, setActionModal] = useState(null); // { submissionId, action }
	const [forwardModal, setForwardModal] = useState(null); // submissionId | null
	const [users, setUsers] = useState([]);
	const [roles, setRoles] = useState([]);
	const navigate = useNavigate();

	const showToast = (msg, type = 'ok') => {
		setToast({ msg, type });
		setTimeout(() => setToast(null), 3500);
	};

	const fetchPending = useCallback(async (token) => {
		setLoading(true);
		setError(null);
		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/formSubmissions/pending`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				setPendingItems(await res.json());
			} else {
				setError('Failed to load pending items.');
			}
		} catch {
			setError('Network error. Please try again.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		const userStr = localStorage.getItem('user');
		const token = localStorage.getItem('accessToken');

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

		fetchPending(token);

		// Fetch users and roles for the forward modal
		const apiUrl = process.env.REACT_APP_API_URL || '';
		fetch(`${apiUrl}/users`, { headers: { Authorization: `Bearer ${token}` } })
			.then((r) => r.ok ? r.json() : [])
			.then((data) => setUsers(Array.isArray(data) ? data : []))
			.catch(() => {});

		fetch(`${apiUrl}/roles`, { headers: { Authorization: `Bearer ${token}` } })
			.then((r) => r.ok ? r.json() : [])
			.then((data) => setRoles(Array.isArray(data) ? data : []))
			.catch(() => {});
	}, [navigate, fetchPending]);

	const handleAction = async ({ action, forwardTarget, note }) => {
		const token = localStorage.getItem('accessToken');
		const submissionId = actionModal?.submissionId || forwardModal;
		if (!submissionId || !token) return;

		setActionModal(null);
		setForwardModal(null);

		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/formSubmissions/${submissionId}/action`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ action, forwardTarget, note }),
			});

			const data = await res.json();

			if (res.ok) {
				showToast(`Action recorded: ${action}`);
				fetchPending(token);
			} else {
				showToast(data.message || 'Action failed', 'err');
			}
		} catch {
			showToast('Network error submitting action', 'err');
		}
	};

	if (!user) return <div className="pr-loading">Loading…</div>;

	return (
		<div className="pr-container">
			<Navbar user={user} />

			<main className="pr-content">
				<div className="pr-header-row">
					<div>
						<button className="pr-back-btn" onClick={() => navigate('/dashboard')}>
							← Back to Dashboard
						</button>
						<h1 className="pr-title">Pending Reviews &amp; Approvals</h1>
						<p className="pr-subtitle">Forms that are awaiting your review or approval action.</p>
					</div>
					<div className="pr-count-badge">
						<span className="pr-count-number">{loading ? '…' : pendingItems.length}</span>
						<span className="pr-count-label">Pending</span>
					</div>
				</div>

				{loading ? (
					<div className="pr-loading-inner">
						<div className="pr-spinner" />
						<p>Loading pending items…</p>
					</div>
				) : error ? (
					<div className="pr-error">{error}</div>
				) : pendingItems.length === 0 ? (
					<div className="pr-empty">
						<div className="pr-empty-icon">✨</div>
						<h3>You're all caught up!</h3>
						<p>No pending reviews or approvals require your attention at the moment.</p>
						<button className="pr-action-btn" onClick={() => navigate('/dashboard')}>
							Return to Dashboard
						</button>
					</div>
				) : (
					<div className="pr-list">
						{pendingItems.map((item) => (
							<div key={item._id} className="pr-card">
								<div className="pr-card-header">
									<div className="pr-card-info">
										<h3 className="pr-card-title">{item.templateTitle}</h3>
										<p className="pr-card-meta">
											<span>👤</span> Submitted by <strong>{item.submitterName}</strong>
										</p>
										<p className="pr-card-meta">
											<span>📅</span> {formatDate(item.createdAt)}
										</p>
										{item.currentNodeLabel && (
											<p className="pr-card-node">
												<span>📍</span> Current step: <strong>{item.currentNodeLabel}</strong>
											</p>
										)}
										{item.assignedRoleNames.length > 0 && (
											<p className="pr-card-roles">
												<span>👥</span> Assigned to: {item.assignedRoleNames.join(', ')}
											</p>
										)}
									</div>
									<div className="pr-card-status-container">
										<span className="pr-card-status-badge">Waiting for you</span>
									</div>
								</div>

								<div className="pr-card-actions">
									<button
										className="pr-btn pr-btn-view"
										onClick={() => navigate(`/submission/${item._id}`)}
									>
										👁 View Form
									</button>
									<button
										className="pr-btn pr-btn-approve"
										onClick={() => setActionModal({ submissionId: item._id, action: 'approved' })}
									>
										✅ Approve
									</button>
									<button
										className="pr-btn pr-btn-deny"
										onClick={() => setActionModal({ submissionId: item._id, action: 'denied' })}
									>
										❌ Deny
									</button>
									<button
										className="pr-btn pr-btn-forward"
										onClick={() => setForwardModal(item._id)}
									>
										↪ Forward
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</main>

			{/* ── Action Modal (Approve / Deny) ── */}
			{actionModal && (
				<ActionModal
					action={actionModal.action}
					onClose={() => setActionModal(null)}
					onSubmit={handleAction}
				/>
			)}

			{/* ── Forward Modal ── */}
			{forwardModal && (
				<ForwardModal
					users={users}
					roles={roles}
					onClose={() => setForwardModal(null)}
					onSubmit={handleAction}
				/>
			)}

			{/* ── Toast ── */}
			{toast && (
				<div className={`pr-toast ${toast.type === 'err' ? 'pr-toast-err' : 'pr-toast-ok'}`}>
					{toast.msg}
				</div>
			)}
		</div>
	);
};

export default PendingReviews;
