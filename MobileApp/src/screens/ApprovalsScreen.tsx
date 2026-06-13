import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../services/api';
import { logout } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

export default function ApprovalsScreen({ route, navigation }) {
	const [submissions, setSubmissions] = useState([]);
	const [loading, setLoading] = useState(true);
	const { setToken } = useAuth();

	useEffect(() => {
		fetchPending();
	}, []);

	const fetchPending = async () => {
		try {
			const response = await api.get('/formSubmissions/pending');
			setSubmissions(response.data);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = async () => {
		await logout();
		setToken(null);
	};

	const renderItem = ({ item }) => (
		<TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ApprovalAction', { submissionId: item._id })}>
			<Text style={styles.cardTitle}>{item.templateTitle || 'Untitled Form'}</Text>
			<Text style={styles.cardId}>Sub: {item._id.substring(0, 8)}...</Text>
			<Text style={styles.cardId}>Submitted by: {item.submitterName}</Text>
		</TouchableOpacity>
	);

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#0d9488" />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Pending Approvals</Text>
				<TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
					<Text style={styles.logoutText}>Logout</Text>
				</TouchableOpacity>
			</View>

			<FlatList
				data={submissions}
				keyExtractor={(item) => item._id}
				renderItem={renderItem}
				contentContainerStyle={styles.list}
				ListEmptyComponent={<Text style={styles.empty}>No pending approvals.</Text>}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#0f172a',
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#0f172a',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#1e293b',
		marginTop: 40, // rough safe area
	},
	headerTitle: {
		color: '#fff',
		fontSize: 20,
		fontWeight: 'bold',
	},
	logoutBtn: {
		backgroundColor: '#ef4444',
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 4,
	},
	logoutText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 12,
	},
	list: {
		padding: 16,
	},
	card: {
		backgroundColor: '#1e293b',
		padding: 16,
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#334155',
	},
	cardTitle: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	cardId: {
		color: '#94a3b8',
		fontSize: 12,
		marginTop: 4,
	},
	empty: {
		color: '#94a3b8',
		textAlign: 'center',
		marginTop: 20,
	},
});
