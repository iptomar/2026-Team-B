import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import api from '../services/api';

/**
 * Available Forms Screen
 * 
 * Shows a list of form templates that the current user can submit.
 * This is the main screen for users to start filling out new forms.
 * 
 * Features:
 * - List of available form templates
 * - Tap on a form to start filling it out
 * - Empty state when no forms are available
 */
export default function AvailableFormsScreen({ navigation }) {
	const [forms, setForms] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [labels, setLabels] = useState([]);
	const [selectedLabelId, setSelectedLabelId] = useState('');

	useEffect(() => {
		fetchFormsAndLabels();
	}, []);

	const fetchFormsAndLabels = async () => {
		try {
			const [formsRes, labelsRes] = await Promise.all([
				api.get('/formTemplates'),
				api.get('/labels')
			]);
			setForms(formsRes.data);
			setLabels(labelsRes.data);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};
	// Render each form template as a card

	const renderItem = ({ item }) => (
		<TouchableOpacity style={styles.card} onPress={() => navigation.navigate('FormFill', { formId: item._id })}>
			<Text style={styles.cardTitle}>{item.title}</Text>
			<Text style={styles.cardId}>ID: {item._id}</Text>
		</TouchableOpacity>
	);
	// Show loading spinner while fetching

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#22c55e" />
			</View>
		);
	}

	const filteredForms = forms.filter(form => {
		const matchesSearch = !searchQuery || form.title?.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesLabel = !selectedLabelId || (form.labels && form.labels.some(l => (l._id || l) === selectedLabelId));
		return matchesSearch && matchesLabel;
	});

	return (
		<View style={styles.container}>
			<View style={styles.filterContainer}>
				<TextInput
					style={styles.searchInput}
					placeholder="Search forms..."
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
				data={filteredForms}
				keyExtractor={(item) => item._id}
				renderItem={renderItem}
				contentContainerStyle={styles.list}
				ListEmptyComponent={<Text style={styles.empty}>No forms available.</Text>}
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
