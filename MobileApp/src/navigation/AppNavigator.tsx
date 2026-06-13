import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, ImageBackground, StyleSheet } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

const TransparentTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: 'transparent',
	},
};

/**
 * App Navigator Component
 * 
 * Manages navigation based on authentication state.
 * Shows Login screen when logged out, Main app when logged in.
 * 
 * Screen flow:
 * - No token → LoginScreen
 * - Has token → MainTabNavigator (Dashboard, Forms, Profile, etc.)
 */
export default function AppNavigator() {
	const { userToken, isLoading } = useAuth();
	// Show loading spinner while checking token on app start

	if (isLoading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return (
		<ImageBackground 
			source={require('../../assets/iptNightDarkTheme.png')} 
			style={styles.background}
			resizeMode="cover"
		>
			<NavigationContainer theme={TransparentTheme}>
				<Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
					{userToken == null ? (
						<Stack.Screen name="Login" component={LoginScreen} />
					) : (
						<Stack.Screen name="Main" component={MainTabNavigator} />
					)}
				</Stack.Navigator>
			</NavigationContainer>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	background: {
		flex: 1,
		width: '100%',
		height: '100%',
	},
});
