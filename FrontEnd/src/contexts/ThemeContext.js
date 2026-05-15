import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
	const [isDarkTheme, setIsDarkTheme] = useState(false);

	useEffect(() => {
		const storedTheme = localStorage.getItem('theme');
		if (storedTheme === 'dark') {
			setIsDarkTheme(true);
		}
	}, []);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
		localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
	}, [isDarkTheme]);

	const toggleTheme = () => {
		setIsDarkTheme(prev => !prev);
	};

	return (
		<ThemeContext.Provider value={{ isDarkTheme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	return useContext(ThemeContext);
};
