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

export const AuthProvider = ({ children }: { children: React.ReactNode; }) => {
	const [userToken, setUserToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		setLogoutHandler(() => {
			setUserToken(null);
		});

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
