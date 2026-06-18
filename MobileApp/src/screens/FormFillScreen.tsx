import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../services/api';
import DynamicNativeForm from '../components/DynamicNativeForm';

/**
 * Form Fill Screen
 * 
 * Screen where users fill out and submit a form.
 * Supports both new submissions and editing/resubmitting existing ones.
 * 
 * Features:
 * - Dynamic form rendering based on template
 * - File upload support (multipart form data)
 * - New submission mode
 * - Edit/resubmit mode (for correction requests)
 */
export default function FormFillScreen({ route, navigation }: any) {
	const { formId, editSubmissionId } = route.params;
	const [template, setTemplate] = useState<any>(null);
	const [formData, setFormData] = useState({});
	const [correctionRequests, setCorrectionRequests] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		fetchTemplate();
		if (editSubmissionId) {
			fetchSubmissionData();
		}
	}, [formId, editSubmissionId]);

	const fetchSubmissionData = async () => {
		try {
			const res = await api.get(`/formSubmissions/${editSubmissionId}`);
			if (res.data) {
				if (res.data.submittedValues) setFormData(res.data.submittedValues);
				if (res.data.correctionRequests) setCorrectionRequests(res.data.correctionRequests);
			}
		} catch (err) {
			console.error('Failed to load existing submission data', err);
		}
	};

	const fetchTemplate = async () => {
		try {
			const response = await api.get(`/formTemplates/${formId}`);
			const data = response.data;
			const parsedTemplate = JSON.parse(data.template || '{}');
			setTemplate({ ...data, parsedLayout: parsedTemplate.layout });
		} catch (error) {
			console.error(error);
			Alert.alert('Error', 'Failed to load form template');
			navigation.goBack();
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async () => {
		setSubmitting(true);
		try {
			const textData: Record<string, any> = {};
			const fileEntries: { fieldId: string; file: any; }[] = [];

			// Separate file entries from text fields
			for (const [key, value] of Object.entries(formData)) {
				if (Array.isArray(value) && value.length > 0 && value[0].uri && value[0].name) {
					// It's a list of file assets
					value.forEach((fileAsset) => {
						fileEntries.push({ fieldId: key, file: fileAsset });
					});
					// Store filenames for the snapshot
					textData[key] = value.map(f => f.name);
				} else {
					textData[key] = value;
				}
			}

			if (editSubmissionId) {
				await api.post(`/formSubmissions/${editSubmissionId}/resubmit`, {
					formData: textData,
				});
			} else if (fileEntries.length > 0) {
				// Multipart upload with files
				const fd = new FormData();
				fd.append('templateId', formId);
				fd.append('formData', JSON.stringify(textData));
				fd.append('fileFieldMap', JSON.stringify(fileEntries.map(e => e.fieldId)));

				for (const entry of fileEntries) {
					fd.append('files', {
						uri: entry.file.uri,
						name: entry.file.name,
						type: entry.file.mimeType || 'application/octet-stream',
					} as any);
				}

				await api.post('/formSubmissions/upload', fd, {
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				});
			} else {
				// Standard JSON upload
				await api.post('/formSubmissions', {
					templateId: formId,
					formData: JSON.stringify(textData),
				});
			}
			Alert.alert('Success', 'Form submitted successfully!', [
				{ text: 'OK', onPress: () => navigation.goBack() }
			]);
		} catch (error: any) {
			console.error(error.response?.data);
			const msg = error.response?.data?.message || JSON.stringify(error.response?.data) || 'Failed to submit form';
			Alert.alert('Error', msg);
		} finally {
			setSubmitting(false);
		}
	};

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
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
					<Text style={styles.backText}>← Back</Text>
				</TouchableOpacity>
				<Text style={styles.headerTitle} numberOfLines={1}>{template?.title || 'Fill Form'}</Text>
			</View>
			<ScrollView contentContainerStyle={styles.scroll}>
				<View style={styles.card}>
					<DynamicNativeForm template={template} formData={formData} setFormData={setFormData} submissionCorrections={correctionRequests} />
				</View>
				<TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
					{submitting ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.submitText}>{editSubmissionId ? 'Resubmit Form' : 'Submit Form'}</Text>
					)}
				</TouchableOpacity>
			</ScrollView>
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
		alignItems: 'center',
		padding: 16,
		paddingTop: 48,
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(30, 41, 59, 0.85)',
	},
	backBtn: {
		marginRight: 16,
	},
	backText: {
		color: '#22c55e',
		fontSize: 16,
		fontWeight: 'bold',
	},
	headerTitle: {
		flex: 1,
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
	scroll: {
		padding: 16,
		paddingBottom: 40,
	},
	card: {
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
		padding: 16,
		borderRadius: 8,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#334155',
	},
	submitBtn: {
		backgroundColor: '#22c55e',
		padding: 16,
		borderRadius: 8,
		marginHorizontal: 0,
		marginTop: 20,
		alignItems: 'center',
	},
	submitText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
});
