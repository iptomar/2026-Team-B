import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './BugReport.css';

const BugReport = () => {
	const [user, setUser] = useState(null);
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [image, setImage] = useState('');
	const [fileName, setFileName] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
	const navigate = useNavigate();

	useEffect(() => {
		const storedUser = localStorage.getItem('user');
		if (storedUser) {
			setUser(JSON.parse(storedUser));
		} else {
			navigate('/');
		}
	}, [navigate]);

	const handleImageChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			setFileName(file.name);
			const reader = new FileReader();
			reader.onloadend = () => {
				setImage(reader.result);
			};
			reader.readAsDataURL(file);
		} else {
			setFileName('');
			setImage('');
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!title.trim() || !description.trim()) {
			setStatusMessage({ type: 'error', text: 'Please fill in all required fields.' });
			return;
		}

		setIsSubmitting(true);
		setStatusMessage({ type: '', text: '' });

		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/bug-reports`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
				},
				body: JSON.stringify({
					userId: user.id || user._id,
					title,
					description,
					image
				})
			});

			if (res.ok) {
				setStatusMessage({ type: 'success', text: 'Bug report submitted successfully! Thank you.' });
				setTitle('');
				setDescription('');
				setImage('');
				setFileName('');
			} else {
				const data = await res.json();
				setStatusMessage({ type: 'error', text: data.message || 'Failed to submit bug report.' });
			}
		} catch (error) {
			setStatusMessage({ type: 'error', text: 'Network error. Please try again later.' });
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!user) return null;

	return (
		<div className="bug-report-container">
			<Navbar user={user} />
			<div className="bug-report-content">
				<div className="bug-report-header">
					<h1>Report a Bug</h1>
					<p>Found an issue? Let us know so we can fix it.</p>
				</div>

				<div className="bug-report-card">
					{statusMessage.text && (
						<div className={`alert ${statusMessage.type === 'error' ? 'error-alert' : 'success-alert'}`}>
							{statusMessage.text}
						</div>
					)}

					<form onSubmit={handleSubmit} className="bug-report-form">
						<div className="form-group">
							<label htmlFor="title">Issue Title <span className="required">*</span></label>
							<input
								type="text"
								id="title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Briefly describe the issue"
								disabled={isSubmitting}
							/>
						</div>

						<div className="form-group">
							<label htmlFor="description">Description <span className="required">*</span></label>
							<textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Provide detailed steps to reproduce the issue..."
								rows={6}
								disabled={isSubmitting}
							/>
						</div>

						<div className="form-group">
							<label htmlFor="imageUpload">Attach a Screenshot (Optional)</label>
							<div className="file-upload-wrapper">
								<input
									type="file"
									id="imageUpload"
									accept="image/*"
									onChange={handleImageChange}
									className="file-input"
									disabled={isSubmitting}
								/>
								<div className="file-upload-btn">Choose File</div>
								<span className="file-name">{fileName || 'No file chosen'}</span>
							</div>
							{image && (
								<div className="image-preview">
									<img src={image} alt="Screenshot preview" />
								</div>
							)}
						</div>

						<div className="form-actions">
							<button 
								type="button" 
								className="btn-cancel" 
								onClick={() => navigate('/dashboard')}
								disabled={isSubmitting}
							>
								Cancel
							</button>
							<button 
								type="submit" 
								className="btn-submit" 
								disabled={isSubmitting}
							>
								{isSubmitting ? 'Submitting...' : 'Submit Report'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default BugReport;
