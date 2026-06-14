import { io } from 'socket.io-client';
import { getStorageItem } from './storage';

let socket;

export const initiateSocketConnection = () => {
	const token = getStorageItem('accessToken');
	if (!socket && token) {
		const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
		socket = io(API_URL, {
			auth: {
				token
			}
		});
		console.log('Connecting socket...');
	}
};

export const disconnectSocket = () => {
	if (socket) {
		console.log('Disconnecting socket...');
		socket.disconnect();
		socket = undefined;
	}
};

export const subscribeToNotifications = (cb) => {
	if (!socket) return;
	socket.on('new_notification', msg => {
		return cb(msg);
	});
};

export const unsubscribeFromNotifications = () => {
	if (!socket) return;
	socket.off('new_notification');
};

export const subscribeToSubmissionUpdates = (cb) => {
	if (!socket) return;
	socket.on('submission_updated', msg => {
		return cb(msg);
	});
};

export const unsubscribeFromSubmissionUpdates = () => {
	if (!socket) return;
	socket.off('submission_updated');
};

export const getSocket = () => socket;
