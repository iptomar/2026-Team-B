import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/api';

let socket: Socket | undefined;

export const initiateSocketConnection = async () => {
	try {
		const token = await AsyncStorage.getItem('accessToken');
		if (!socket && token) {
			// Extract base URL if API_URL includes /api
			const baseUrl = API_URL.replace(/\/api\/?$/, '') || 'http://localhost:5000';
			socket = io(baseUrl, {
				auth: {
					token
				}
			});
			console.log('Connecting socket...');
		}
	} catch (err) {
		console.error('Error initiating socket:', err);
	}
};

export const disconnectSocket = () => {
	if (socket) {
		console.log('Disconnecting socket...');
		socket.disconnect();
		socket = undefined;
	}
};

export const subscribeToSubmissionUpdates = (cb: (msg: any) => void) => {
	if (!socket) return;
	socket.on('submission_updated', (msg) => {
		return cb(msg);
	});
};

export const unsubscribeFromSubmissionUpdates = () => {
	if (!socket) return;
	socket.off('submission_updated');
};
