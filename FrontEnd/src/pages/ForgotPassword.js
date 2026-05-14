import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForgotPassword.css';

const ForgotPassword = () => {
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();

	const handleForgotPassword = async (e) => {
		e.preventDefault();
		setError('');
		setMessage('');

		if (!email) {
			setError('Please enter your email address');
			return;
		}

		try {
			setIsLoading(true);
			const apiUrl = process.env.REACT_APP_API_URL || '';
			
			const res = await fetch(`${apiUrl}/auth/forgot-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await res.json();

			if (res.ok) {
				setMessage(data.message || 'If an account exists with this email, a reset link has been sent.');
				// Optional: Clear the email field after successful submission
				setEmail('');
			} else {
				setError(data.message || 'Failed to send reset link');
			}
		} catch (err) {
			setError('Network error, could not connect to server.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="forgot-password-container">
			<div className="forgot-password-card">
				<h2>Forgot Password</h2>
				<p style={{ marginBottom: '20px', fontSize: '14px', color: 'black' }}>
					Enter your email address and we'll send you a link to reset your password.
				</p>
				{error && <div className="error-message">{error}</div>}
				{message && <div className="success-message">{message}</div>}
				<form onSubmit={handleForgotPassword}>
					<div className="input-group">
						<label htmlFor="email">Email</label>
						<input
							type="email"
							id="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Enter your email address"
							disabled={isLoading}
						/>
					</div>
					<button type="submit" className="forgot-password-button" disabled={isLoading}>
						{isLoading ? 'Sending...' : 'Send Reset Link'}
					</button>
					<button type="button" className="back-button" onClick={() => navigate(-1)} disabled={isLoading}>
						Back
					</button>
				</form>
			</div>
		</div>
	);
};

export default ForgotPassword;
