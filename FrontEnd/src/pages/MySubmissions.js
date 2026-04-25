import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './MySubmissions.css';

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
	submitted: 'status-submitted',
	in_progress: 'status-pending',
	approved: 'status-approved',
	denied: 'status-rejected',
	// legacy aliases
	pending: 'status-pending',
	rejected: 'status-rejected',
};

function formatDate(dateStr) {
	if (!dateStr) return '—';
	const d = new Date(dateStr);
	return d.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

const MySubmissions = () => {
	const [user, setUser] = useState(null);
	const [submissions, setSubmissions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		const userStr = localStorage.getItem('user');
		const token = localStorage.getItem('accessToken');

		if (!token || !userStr) {
			navigate('/');
			return;
		}

		try {
			setUser(JSON.parse(userStr));
		} catch (e) {
			navigate('/');
			return;
		}

		const fetchSubmissions = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const res = await fetch(`${apiUrl}/formSubmissions/my`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (res.ok) {
					const data = await res.json();
					setSubmissions(data);
				} else {
					setError('Failed to load your submissions.');
				}
			} catch (err) {
				setError('Network error. Please try again.');
			} finally {
				setLoading(false);
			}
		};

		fetchSubmissions();
	}, [navigate]);

	if (!user) return <div className="ms-loading">Loading...</div>;

	return (
		<div className="ms-container">
			<Navbar user={user} />

			<main className="ms-content">
				<div className="ms-header-row">
					<div>
						<button className="ms-back-btn" onClick={() => navigate('/dashboard')}>
							← Back to Dashboard
						</button>
						<h1 className="ms-title">My Submissions</h1>
						<p className="ms-subtitle">View all forms you have submitted and their current status.</p>
					</div>
					<div className="ms-count-badge">
						<span className="ms-count-number">{loading ? '…' : submissions.length}</span>
						<span className="ms-count-label">Total</span>
					</div>
				</div>

				{loading ? (
					<div className="ms-loading-inner">
						<div className="ms-spinner" />
						<p>Loading your submissions…</p>
					</div>
				) : error ? (
					<div className="ms-error">{error}</div>
				) : submissions.length === 0 ? (
					<div className="ms-empty">
						<div className="ms-empty-icon">📭</div>
						<h3>No submissions yet</h3>
						<p>When you submit a form, it will appear here.</p>
						<button className="ms-action-btn" onClick={() => navigate('/dashboard')}>
							Go to Dashboard
						</button>
					</div>
				) : (
					<div className="ms-table-wrapper">
						<table className="ms-table">
							<thead>
								<tr>
									<th>Form</th>
									<th>Submitted On</th>
									<th>Status</th>
									<th className="ms-th-action">Action</th>
								</tr>
							</thead>
							<tbody>
								{submissions.map((sub) => (
									<tr key={sub._id} className="ms-row">
										<td className="ms-td-title">{sub.templateTitle}</td>
										<td className="ms-td-date">{formatDate(sub.createdAt)}</td>
										<td>
											<span className={`ms-status-badge ${STATUS_COLORS[sub.status] || 'status-submitted'}`}>
												{STATUS_LABELS[sub.status] || sub.status}
											</span>
										</td>
										<td className="ms-td-action">
											<button
												className="ms-view-btn"
												onClick={() => navigate(`/submission/${sub._id}`)}
											>
												View →
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</main>
		</div>
	);
};

export default MySubmissions;
