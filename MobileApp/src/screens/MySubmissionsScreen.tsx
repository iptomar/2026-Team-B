import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
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
	const [searchQuery, setSearchQuery] = useState('');
	const [labels, setLabels] = useState([]);
	const [selectedLabelId, setSelectedLabelId] = useState('');

	useFocusEffect(
		useCallback(() => {
			fetchSubmissions();
		}, [])
	);

	const fetchSubmissions = async () => {
		try {
			const [response, labelsRes] = await Promise.all([
				api.get('/formSubmissions/my'),
				api.get('/labels')
			]);
			setSubmissions(response.data);
			setLabels(labelsRes.data);
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

	const filteredSubmissions = submissions.filter(sub => {
		const matchesSearch = !searchQuery || sub.templateTitle?.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesLabel = !selectedLabelId || (sub.templateLabels && sub.templateLabels.some(l => (l._id || l) === selectedLabelId));
		return matchesSearch && matchesLabel;
	});

	return (
		<View style={styles.container}>
			<View style={styles.filterContainer}>
				<TextInput
					style={styles.searchInput}
					placeholder="Search submissions..."
					placeholderTextColor="#94a3b8"
					value={searchQuery}
					onChangeText={setSearchQuery}
				/>
				<View style={styles.labelScrollWrapper}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.labelScroll}>
						<TouchableOpacity 
							style={[styles.labelPill, !selectedLabelId && styles.labelPillActive]}
							onPress={() => setSelectedLabelId('')}
						>
							<Text style={[styles.labelPillText, !selectedLabelId && styles.labelPillTextActive]}>All Labels</Text>
						</TouchableOpacity>
						{labels.map(lbl => (
							<TouchableOpacity 
								key={lbl._id}
								style={[styles.labelPill, selectedLabelId === lbl._id && styles.labelPillActive]}
								onPress={() => setSelectedLabelId(lbl._id)}
							>
								<Text style={[styles.labelPillText, selectedLabelId === lbl._id && styles.labelPillTextActive]}>{lbl.name}</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>
			</View>
			<FlatList
				data={filteredSubmissions}
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
	filterContainer: {
		padding: 16,
		paddingBottom: 0,
	},
	searchInput: {
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
		color: '#fff',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#334155',
		marginBottom: 12,
	},
	labelScrollWrapper: {
		height: 40,
		marginBottom: 12,
	},
	labelScroll: {
		gap: 8,
		paddingRight: 16,
	},
	labelPill: {
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#334155',
		justifyContent: 'center',
	},
	labelPillActive: {
		backgroundColor: '#22c55e',
		borderColor: '#16a34a',
	},
	labelPillText: {
		color: '#94a3b8',
		fontSize: 14,
		fontWeight: '600',
	},
	labelPillTextActive: {
		color: '#fff',
	},
});
