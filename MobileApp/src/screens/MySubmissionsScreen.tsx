import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

/**
 * My Submissions Screen
 * 
 * Displays a list of all forms submitted by the current user.
 * Users can tap on any submission to view its full details.
 * 
 * Features:
 * - List of user's form submissions
 * - Status color coding (approved, rejected, pending)
 * - Tap to view submission details
 * - Empty state when no submissions
 * - Submission ID and template title displayed
 */
export default function MySubmissionsScreen({ navigation }) {
	const [submissions, setSubmissions] = useState([]);
	const [loading, setLoading] = useState(true);

	useFocusEffect(
		useCallback(() => {
			fetchSubmissions();
		}, [])
	);

	const fetchSubmissions = async () => {
		try {
			const response = await api.get('/formSubmissions/my');
			setSubmissions(response.data);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'approved': return '#10b981'; // green-500
			case 'rejected': return '#ef4444'; // red-500
			case 'pending': return '#f59e0b'; // amber-500
			default: return '#94a3b8'; // slate-400
		}
	};

	const renderItem = ({ item }) => (
		<TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SubmissionDetail', { submissionId: item._id })}>
			<Text style={styles.cardTitle}>{item.templateTitle || 'Untitled Form'}</Text>
			<View style={styles.row}>
				<Text style={styles.cardId}>Sub: {item._id.substring(0, 8)}...</Text>
				<Text style={[styles.status, { color: getStatusColor(item.status) }]}>
					{item.status.toUpperCase()}
				</Text>
			</View>
		</TouchableOpacity>
	);

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#22c55e" />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={submissions}
				keyExtractor={(item) => item._id}
				renderItem={renderItem}
				contentContainerStyle={styles.list}
				ListEmptyComponent={<Text style={styles.empty}>No submissions found.</Text>}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'transparent',
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'transparent',
	},
	list: {
		padding: 16,
	},
	card: {
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
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
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 8,
	},
	cardId: {
		color: '#94a3b8',
		fontSize: 12,
	},
	status: {
		fontSize: 12,
		fontWeight: 'bold',
	},
	empty: {
		color: '#94a3b8',
		textAlign: 'center',
		marginTop: 20,
	},
});
