import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../services/api';
import DynamicNativeForm from '../components/DynamicNativeForm';
/**
 * Submission Detail Screen
 * 
 * Displays full details of a single form submission.
 * Users can view the submitted data, metadata, and (if needed) resubmit.
 * 
 * Features:
 * - View all submitted form values
 * - See submission metadata (ID, status, date)
 * - View correction requests (if status = needs_correction)
 * - Resubmit button for corrections
*/
export default function SubmissionDetailScreen({ route, navigation }: any) {
	const { submissionId } = route.params;
	const [submission, setSubmission] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [selectedVersion, setSelectedVersion] = useState('latest');
	const [markingUrgent, setMarkingUrgent] = useState(false);

	useEffect(() => {
		fetchSubmission();
	}, [submissionId]);

	const fetchSubmission = async () => {
		try {
			const response = await api.get(`/formSubmissions/${submissionId}`);
			setSubmission(response.data);
		} catch (error) {
			console.error(error);
			Alert.alert('Error', 'Failed to load submission');
			navigation.goBack();
		} finally {
			setLoading(false);
		}
	};

	const handleMarkUrgent = async () => {
		if (markingUrgent) return;
		setMarkingUrgent(true);
		try {
			await api.post(`/formSubmissions/${submissionId}/urgent`);
			setSubmission({ ...submission, isUrgent: true });
			Alert.alert('Success', 'Form marked as urgent');
		} catch (error) {
			console.error(error);
			Alert.alert('Error', 'Failed to mark as urgent');
		} finally {
			setMarkingUrgent(false);
		}
	};

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#22c55e" />
			</View>
		);
	}

	const parsedData = submission?.templateLayout ? JSON.parse(submission.templateLayout) : {};

	const versionHistory = submission?.versionHistory || [];
	const isActiveVersion = selectedVersion === 'latest';
	const activeVersionData = isActiveVersion ? null : versionHistory.find((v: any) => String(v.versionNumber) === selectedVersion);
	
	const activeValues = isActiveVersion ? submission?.submittedValues : activeVersionData?.submittedValues;
	const activeCorrectionRequests = isActiveVersion ? submission?.correctionRequests : activeVersionData?.correctionRequests;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
					<Text style={styles.backText}>← Back</Text>
				</TouchableOpacity>
				<Text style={styles.headerTitle} numberOfLines={1}>{submission?.templateTitle || 'Submission Details'}</Text>
			</View>
			<ScrollView contentContainerStyle={styles.scroll}>
				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Submission Meta</Text>
					<Text style={styles.metaText}>ID: {submission?._id}</Text>
					<Text style={styles.metaText}>Status: {submission?.status?.toUpperCase()} {submission?.isUrgent && '🚨 URGENT'}</Text>
					<Text style={styles.metaText}>Submitted At: {new Date(submission?.createdAt).toLocaleString()}</Text>
					{submission?.isAdminUser && submission?.status === 'in_progress' && !submission?.isUrgent && isActiveVersion && (
						<TouchableOpacity 
							style={[styles.actionBtn, { backgroundColor: '#ef4444', marginTop: 12, paddingVertical: 10 }]} 
							onPress={handleMarkUrgent}
							disabled={markingUrgent}
						>
							<Text style={styles.actionText}>{markingUrgent ? '...' : 'Pay Urgency Fee 🚨'}</Text>
						</TouchableOpacity>
					)}
				</View>

				{versionHistory.length > 0 && (
					<View style={styles.card}>
						<Text style={styles.sectionTitle}>View Version</Text>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row' }}>
							<TouchableOpacity
								style={[styles.chip, selectedVersion === 'latest' && styles.chipActive]}
								onPress={() => setSelectedVersion('latest')}
							>
								<Text style={[styles.chipText, selectedVersion === 'latest' && styles.chipTextActive]}>Latest</Text>
							</TouchableOpacity>
							{versionHistory.slice().reverse().map((v: any) => (
								<TouchableOpacity
									key={v.versionNumber}
									style={[styles.chip, selectedVersion === String(v.versionNumber) && styles.chipActive]}
									onPress={() => setSelectedVersion(String(v.versionNumber))}
								>
									<Text style={[styles.chipText, selectedVersion === String(v.versionNumber) && styles.chipTextActive]}>
										v{v.versionNumber}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
						{!isActiveVersion && (
							<Text style={{ color: '#f59e0b', marginTop: 12, fontWeight: 'bold' }}>Viewing historical version</Text>
						)}
					</View>
				)}

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Form Data</Text>
					{parsedData?.layout ? (
						<DynamicNativeForm
							template={{ parsedLayout: parsedData.layout }}
							formData={activeValues || {}}
							setFormData={() => { }}
							readOnly={true}
							submissionId={submissionId}
							attachments={submission?.attachments || []}
							submissionCorrections={activeCorrectionRequests || []}
						/>
					) : (
						<Text style={styles.metaText}>No form layout available.</Text>
					)}
				</View>

				{(submission?.status === 'needs_correction' || !isActiveVersion) && (
					<View style={styles.card}>
						<Text style={styles.sectionTitle}>{isActiveVersion ? 'Corrections Requested' : `Corrections Requested in v${selectedVersion}`}</Text>
						{((activeCorrectionRequests || [])).map((req: any, idx: number) => {
							const fieldLabel = parsedData?.layout?.flatMap((r: any) => r.columns.map((c: any) => c.field)).find((f: any) => f?.id === req.fieldId)?.label || req.fieldId;
							return (
								<Text key={idx} style={styles.metaText}>
									<Text style={{ fontWeight: 'bold', color: '#fff' }}>{fieldLabel}:</Text> {req.comment}
								</Text>
							);
						})}
						{isActiveVersion && submission?.status === 'needs_correction' && (
							<TouchableOpacity
								style={[styles.actionBtn, { backgroundColor: '#f59e0b', marginTop: 16 }]}
								onPress={() => navigation.navigate('FormFill', { templateId: submission.templateId?._id || submission.templateId, editSubmissionId: submissionId })}
							>
								<Text style={styles.actionText}>Edit & Resubmit Form</Text>
							</TouchableOpacity>
						)}
					</View>
				)}
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
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#334155',
		paddingBottom: 8,
	},
	metaText: {
		color: '#94a3b8',
		fontSize: 14,
		marginBottom: 6,
	},
	actionBtn: {
		padding: 14,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	chip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: '#334155',
		marginRight: 8,
	},
	chipActive: {
		backgroundColor: '#22c55e',
	},
	chipText: {
		color: '#94a3b8',
		fontWeight: 'bold',
	},
	chipTextActive: {
		color: '#fff',
	},
});
