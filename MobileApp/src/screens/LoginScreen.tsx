import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { login } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
	const { setToken } = useAuth();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		if (!username || !password) {
			Alert.alert('Error', 'Please enter both username and password');
			return;
		}

		setLoading(true);
		try {
			const data = await login(username, password);
			if (data.accessToken) {
				setToken(data.accessToken);
			} else {
				Alert.alert('Login Failed', 'Invalid response from server');
			}
		} catch (error: any) {
			Alert.alert('Login Failed', error.response?.data?.message || error.message || 'An error occurred');
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>IPT Forms</Text>
			<View style={styles.card}>
				<Text style={styles.subtitle}>Sign In</Text>

				<TextInput
					style={styles.input}
					placeholder="Username"
					value={username}
					onChangeText={setUsername}
					autoCapitalize="none"
				/>

				<TextInput
					style={styles.input}
					placeholder="Password"
					value={password}
					onChangeText={setPassword}
					secureTextEntry
				/>

				<TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Login</Text>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#0f172a', // slate-900
		justifyContent: 'center',
		padding: 20,
	},
	title: {
		fontSize: 32,
		fontWeight: 'bold',
		color: '#fff',
		textAlign: 'center',
		marginBottom: 40,
	},
	card: {
		backgroundColor: '#1e293b', // slate-800
		padding: 24,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#334155', // slate-700
	},
	subtitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#fff',
		marginBottom: 20,
		textAlign: 'center',
	},
	input: {
		backgroundColor: '#0f172a',
		borderWidth: 1,
		borderColor: '#334155',
		borderRadius: 8,
		padding: 12,
		color: '#fff',
		marginBottom: 16,
	},
	button: {
		backgroundColor: '#0d9488', // teal-600
		padding: 14,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 8,
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});
