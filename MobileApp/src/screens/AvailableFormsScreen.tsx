import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
	const [forms, setForms] = useState([]);// List of form templates
	const [loading, setLoading] = useState(true);
	// Load available forms when screen mounts

	useEffect(() => {
		fetchForms();
	}, []);
	// Fetch all form templates user has permission to submit

	const fetchForms = async () => {
		try {
			const response = await api.get('/formTemplates');
			setForms(response.data);
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
				<ActivityIndicator size="large" color="#0d9488" />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={forms}
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
		backgroundColor: '#0f172a',
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#0f172a',
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
