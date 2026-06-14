import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { logout } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { useApprovalsStore } from '../store/useApprovalsStore';
import {
	initiateSocketConnection,
	disconnectSocket,
	subscribeToSubmissionUpdates,
	unsubscribeFromSubmissionUpdates
} from '../utils/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';


/**
 * Approvals Screen
 * 
 * Shows a list of form submissions pending the current user's approval.
 * Only users who are assigned as approvers will see submissions here.
 * 
 * Features:
 * - List of pending approval requests
 * - Tap on a submission to review and take action
 * - Logout button in header
 * - Empty state when no pending approvals
 */
export default function ApprovalsScreen({ route, navigation }: any) {
	const { submissions, loading, fetchPending, removeSubmission, updateSubmission } = useApprovalsStore();
	const { setToken } = useAuth(); // For clearing auth on logout

	// Load pending submissions when screen mounts
	useFocusEffect(
		useCallback(() => {
			fetchPending();
		}, [fetchPending])
	);

	// WebSocket Reactivity
	useEffect(() => {
		let isMounted = true;
		
		const setupSocket = async () => {
			await initiateSocketConnection();
			
			subscribeToSubmissionUpdates((data: any) => {
				if (!isMounted) return;
				fetchPending(); // Refresh the list entirely
			});
		};

		setupSocket();

		return () => {
			isMounted = false;
			unsubscribeFromSubmissionUpdates();
			disconnectSocket();
		};
	}, [removeSubmission, updateSubmission]);

	// Logout user and clear token

	const handleLogout = async () => {
		await logout();
		setToken(null);
	};
	// Render each pending submission as a card

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
				<ActivityIndicator size="large" color="#22c55e" />
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
		backgroundColor: 'transparent',
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'transparent',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		paddingTop: 48,
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(30, 41, 59, 0.85)',
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
