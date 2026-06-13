import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setLogoutHandler } from '../services/api';

type AuthContextType = {
	userToken: string | null;
	setToken: (token: string | null) => void;
	isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
	userToken: null,
	setToken: () => { },
	isLoading: true,
});

/**
 * Authentication Provider Component
 * 
 * Manages authentication state for the entire React Native app.
 * Wraps the app to provide auth state to all components.
 * 
 * Flow:
 * 1. On app start, check AsyncStorage for existing token
 * 2. Verify token is still valid with a test API call
 * 3. Set token state (user logged in) or clear it (session expired)
 * 4. Register logout handler to clear state when API receives 401
 */
export const AuthProvider = ({ children }: { children: React.ReactNode; }) => {
	const [userToken, setUserToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Register a logout handler that the API interceptor can call
		// When API returns 401 (unauthorized), this clears the auth state
		
		setLogoutHandler(() => {
			setUserToken(null);
		});
		// Check if user is already logged in (app restart)

		const checkToken = async () => {
			try {
				const token = await AsyncStorage.getItem('accessToken');
				if (token) {
					// Temporarily set token for the API instance so the test request works
					api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
					try {
						await api.get('/notifications/unread');
						setUserToken(token);
					} catch (err) {
						// If 401, the interceptor will wipe it and call setLogoutHandler, but we ensure state is cleared anyway
						setUserToken(null);
					}
				}
			} catch (e) {
				console.error(e);
			} finally {
				setIsLoading(false);
			}
		};
		checkToken();
	}, []);

	return (
		<AuthContext.Provider value={{ userToken, setToken: setUserToken, isLoading }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
