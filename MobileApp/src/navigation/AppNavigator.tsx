import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

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
		<NavigationContainer>
			<Stack.Navigator screenOptions={{ headerShown: false }}>
				{userToken == null ? (
					<Stack.Screen name="Login" component={LoginScreen} />
				) : (
					<Stack.Screen name="Main" component={MainTabNavigator} />
				)}
			</Stack.Navigator>
		</NavigationContainer>
	);
}
