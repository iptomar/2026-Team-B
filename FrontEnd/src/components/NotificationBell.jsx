import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { subscribeToNotifications, unsubscribeFromNotifications } from '../utils/socket';
import { getStorageItem } from '../utils/storage';
import { useLanguage } from '../contexts/LanguageContext';
import './NotificationBell.css';

const NotificationBell = () => {
	const [notifications, setNotifications] = useState([]);
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef(null);
	const navigate = useNavigate();
	const { t, language } = useLanguage();

	useEffect(() => {
		fetchNotifications();

		// listen for new socket notifications
		subscribeToNotifications((newNotification) => {
			setNotifications(prev => [newNotification, ...prev]);
		});

		// Close dropdown when clicking outside
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);

		return () => {
			unsubscribeFromNotifications();
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const fetchNotifications = async () => {
		try {
			const token = getStorageItem('accessToken');
			if (!token) return;
			const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
			const response = await fetch(`${API_URL}/notifications`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			if (response.ok) {
				const data = await response.json();
				setNotifications(data);
			}
		} catch (error) {
			console.error('Failed to fetch notifications', error);
		}
	};

	const markAsRead = async (id) => {
		try {
			const token = getStorageItem('accessToken');
			const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
			await fetch(`${API_URL}/notifications/${id}/read`, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
		} catch (error) {
			console.error('Failed to mark notification as read', error);
		}
	};

	const markAllAsRead = async () => {
		try {
			const token = getStorageItem('accessToken');
			const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
			await fetch(`${API_URL}/notifications/read-all`, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			setNotifications(prev => prev.map(n => ({ ...n, read: true })));
		} catch (error) {
			console.error('Failed to mark all as read', error);
		}
	};

	const handleNotificationClick = (notification) => {
		if (!notification.read) {
			markAsRead(notification._id);
		}
		setIsOpen(false);
		if (notification.submissionId) {
			if (notification.type === 'action_required') {
				navigate('/pending-reviews');
			} else {
				navigate('/my-submissions');
			}
		}
	};

	const unreadCount = notifications.filter(n => !n.read).length;

	return (
		<div className="notification-bell-container" ref={dropdownRef}>
			<button 
				className="notification-bell-btn" 
				onClick={() => setIsOpen(!isOpen)}
				aria-label="Notifications"
			>
				<Bell size={20} />
				{unreadCount > 0 && (
					<span className="notification-badge">
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</button>

			{isOpen && (
				<div className="notification-dropdown">
					<div className="notification-header">
						<h3>{t('notifications') || 'Notifications'}</h3>
						{unreadCount > 0 && (
							<button className="mark-all-btn" onClick={markAllAsRead}>
								{t('markAllAsRead') || 'Mark all as read'}
							</button>
						)}
					</div>
					<div className="notification-list">
						{notifications.length === 0 ? (
							<div className="notification-empty">{t('noNotifications') || 'No notifications'}</div>
						) : (
							notifications.map(notification => (
								<div 
									key={notification._id} 
									className={`notification-item ${!notification.read ? 'unread' : ''}`}
									onClick={() => handleNotificationClick(notification)}
								>
									<p className="notification-message">{notification.message}</p>
									<span className="notification-time">
										{new Intl.DateTimeFormat(language || 'en', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(notification.createdAt))}
									</span>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default NotificationBell;
