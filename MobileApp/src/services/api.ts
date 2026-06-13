import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL = 'https://bgpform.com';

const api = axios.create({
	baseURL: BASE_URL,
});

api.interceptors.request.use(async (config) => {
	const token = await AsyncStorage.getItem('accessToken');
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

let logoutHandler = () => { };

export const setLogoutHandler = (handler: () => void) => {
	logoutHandler = handler;
};

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response?.status === 401) {
			await AsyncStorage.removeItem('accessToken');
			logoutHandler();
		}
		return Promise.reject(error);
	}
);

export default api;
