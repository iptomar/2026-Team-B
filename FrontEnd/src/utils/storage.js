/**
 * Unified storage utility to handle session and persistent storage transparently.
 */

export const getStorageItem = (key) => {
	const local = localStorage.getItem(key);
	if (local !== null) return local;
	return sessionStorage.getItem(key);
};

export const setStorageItem = (key, value, rememberMe = true) => {
	const targetStorage = rememberMe ? localStorage : sessionStorage;
	targetStorage.setItem(key, value);
};

export const removeStorageItem = (key) => {
	localStorage.removeItem(key);
	sessionStorage.removeItem(key);
};

export const isRememberMe = () => {
	// If refresh token exists in localStorage, the user chose 'Remember Me'
	return localStorage.getItem('refreshToken') !== null;
};
