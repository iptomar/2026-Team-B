import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import api from '../services/api';
import DynamicNativeForm from '../components/DynamicNativeForm';
import {
	initiateSocketConnection,
	disconnectSocket,
	subscribeToSubmissionUpdates,
	unsubscribeFromSubmissionUpdates
} from '../utils/socket';


/**
 * Approval Action Screen
 * 
 * Screen where an approver can review a form submission and take action:
 * - Approve: Accept the submission
 * - Reject: Deny the submission (requires comment)
 * - Forward: Send to another approver (requires comment) * - Correction: Request changes from submitter (requires comment)
 * 
 * Access: Only users assigned to approve this submission
 */
export default function ApprovalActionScreen({ route, navigation }: any) {
	const { submissionId } = route.params;
	const [submission, setSubmission] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [comments, setComments] = useState('');
	const [pendingCorrections, setPendingCorrections] = useState<any[]>([]);
	const [activeField, setActiveField] = useState<any>(null);
	const [correctionComment, setCorrectionComment] = useState('');
	// Load submission data on screen mount

	// Load submission data on screen mount
	useEffect(() => {
		fetchSubmission();
	}, [submissionId]);

	// WebSocket Reactivity for Race Conditions
	useEffect(() => {
		let isMounted = true;
		
		const setupSocket = async () => {
			await initiateSocketConnection();
			subscribeToSubmissionUpdates((data: any) => {
				if (!isMounted) return;
				if (data.submissionId === submissionId && data.eventType === 'status_changed') {
					Alert.alert(
						'Submission Updated',
						'Someone else has already processed this form submission.',
						[{ text: 'OK', onPress: () => navigation.goBack() }]
					);
				}
			});
		};

		setupSocket();

		return () => {
			isMounted = false;
			unsubscribeFromSubmissionUpdates();
			disconnectSocket();
		};
	}, [submissionId]);
	// Fetch full submission details (form values + template layout)

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
	// Handle approval action (approve, reject, forward, correction)

	const handleAction = async (action: 'approve' | 'reject' | 'forward' | 'return') => {
		if ((action === 'forward') && !comments) {
			Alert.alert('Error', 'Please provide comments/target for forwarding.');
			return;
		}

		setSubmitting(true);
				// Map UI action to API action name

		let apiAction = action === 'approve' ? 'approved' : action === 'reject' ? 'denied' : action === 'return' ? 'returned' : 'forwarded';
		try {
			const payload: any = {
				action: apiAction,
				note: comments,
			};
		// Map UI action to API action name

			if (action === 'forward') {
				payload.forwardTarget = { roleId: 'some-role-id' }; // Simplification for MVP
			}
			// Return action (request corrections) - can include specific field IDs

			if (action === 'return') {
				if (pendingCorrections.length === 0) {
					Alert.alert('Error', 'Please flag at least one field for correction.');
					setSubmitting(false);
					return;
				}
				payload.correctionRequests = pendingCorrections.map(c => ({ fieldId: c.fieldId, comment: c.comment }));
				payload.note = comments || 'Corrections requested';
			}

			await api.post(`/formSubmissions/${submissionId}/action`, payload);
			Alert.alert('Success', `Submission ${action}d successfully.`, [
				{ text: 'OK', onPress: () => navigation.goBack() }
			]);
		} catch (error: any) {
			console.error(error);
			if (error.response?.status === 409) {
				Alert.alert(
					'Conflict Error',
					'This submission was modified by someone else before your action could complete.',
					[{ text: 'OK', onPress: () => navigation.goBack() }]
				);
			} else {
				Alert.alert('Error', error.response?.data?.message || 'Failed to process action');
			}
		} finally {
			setSubmitting(false);
		}
	};
	// Show loading spinner while fetching

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#22c55e" />
			</View>
		);
	}
	// Parse template layout JSON for dynamic form rendering

	const parsedData = submission?.templateLayout ? JSON.parse(submission.templateLayout) : {};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
					<Text style={styles.backText}>← Back</Text>
				</TouchableOpacity>
				<Text style={styles.headerTitle} numberOfLines={1}>{submission?.templateTitle || 'Approval'}</Text>
			</View>
			<ScrollView contentContainerStyle={styles.scroll}>
				{pendingCorrections.length > 0 && (
					<View style={[styles.card, { borderColor: '#f59e0b' }]}>
						<Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>Corrections Requested ({pendingCorrections.length})</Text>
						{pendingCorrections.map((req, idx) => (
							<Text key={idx} style={styles.metaText}>
								<Text style={{ fontWeight: 'bold', color: '#fff' }}>{req.fieldLabel}:</Text> {req.comment}
							</Text>
						))}
					</View>
				)}

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Form Data</Text>
					{parsedData?.layout ? (
						<DynamicNativeForm
							template={{ parsedLayout: parsedData.layout }}
							formData={submission?.submittedValues || {}}
							setFormData={() => { }}
							readOnly={true}
							submissionId={submissionId}
							attachments={submission?.attachments || []}
							isReviewer={submission?.status === 'in_progress'}
							pendingCorrections={pendingCorrections}
							onFlag={(field) => {
								setActiveField(field);
								setCorrectionComment(pendingCorrections.find(c => c.fieldId === field.id)?.comment || '');
							}}
						/>
					) : (
						<Text style={styles.metaText}>No form layout available.</Text>
					)}
				</View>

				<Modal visible={!!activeField} transparent animationType="fade">
					<View style={styles.modalOverlay}>
						<View style={styles.modalContent}>
							<Text style={styles.modalTitle}>Request Correction for {activeField?.label}</Text>
							<TextInput
								style={styles.modalInput}
								placeholder="Explain what needs to be changed..."
								placeholderTextColor="#94a3b8"
								value={correctionComment}
								onChangeText={setCorrectionComment}
								multiline
								numberOfLines={4}
							/>
							<View style={styles.modalActions}>
								<TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#334155' }]} onPress={() => setActiveField(null)}>
									<Text style={styles.modalBtnText}>Cancel</Text>
								</TouchableOpacity>
								{pendingCorrections.some(c => c.fieldId === activeField?.id) && (
									<TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#ef4444' }]} onPress={() => {
										setPendingCorrections(prev => prev.filter(c => c.fieldId !== activeField.id));
										setActiveField(null);
									}}>
										<Text style={styles.modalBtnText}>Remove</Text>
									</TouchableOpacity>
								)}
								<TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#22c55e' }]} onPress={() => {
									if (!correctionComment.trim()) return;
									setPendingCorrections(prev => {
										const existing = prev.filter(c => c.fieldId !== activeField.id);
										return [...existing, { fieldId: activeField.id, fieldLabel: activeField.label, comment: correctionComment }];
									});
									setActiveField(null);
								}}>
									<Text style={styles.modalBtnText}>Save</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Action</Text>
					<TextInput
						style={styles.input}
						placeholder="Comments (Required for reject/forward)"
						placeholderTextColor="#64748b"
						value={comments}
						onChangeText={setComments}
						multiline
						numberOfLines={3}
					/>
					<View style={styles.actionRow}>
						<TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleAction('approve')} disabled={submitting}>
							<Text style={styles.actionText}>Approve</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleAction('reject')} disabled={submitting}>
							<Text style={styles.actionText}>Reject</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.actionRow}>
						<TouchableOpacity style={[styles.actionBtn, styles.forwardBtn]} onPress={() => handleAction('forward')} disabled={submitting}>
							<Text style={styles.actionText}>Forward</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.actionBtn, styles.returnBtn, pendingCorrections.length === 0 && { opacity: 0.5 }]} onPress={() => handleAction('return')} disabled={submitting || pendingCorrections.length === 0}>
							<Text style={styles.actionText}>Correction ({pendingCorrections.length})</Text>
						</TouchableOpacity>
					</View>
				</View>
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
	fieldContainer: {
		marginBottom: 12,
	},
	fieldLabel: {
		fontSize: 12,
		color: '#94a3b8',
		marginBottom: 4,
		textTransform: 'uppercase',
	},
	fieldValue: {
		fontSize: 16,
		color: '#fff',
	},
	input: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: '#334155',
		color: '#fff',
		padding: 12,
		borderRadius: 8,
		height: 80,
		textAlignVertical: 'top',
		marginBottom: 16,
	},
	actionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	actionBtn: {
		flex: 1,
		padding: 14,
		borderRadius: 8,
		alignItems: 'center',
	},
	approveBtn: {
		backgroundColor: '#10b981',
		marginRight: 6,
	},
	rejectBtn: {
		backgroundColor: '#ef4444',
		marginLeft: 6,
	},
	forwardBtn: {
		backgroundColor: '#f59e0b',
		marginRight: 6,
	},
	returnBtn: {
		backgroundColor: '#d97706',
		marginLeft: 6,
	},
	actionText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		padding: 20,
	},
	modalContent: {
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
		borderRadius: 12,
		padding: 20,
		borderWidth: 1,
		borderColor: '#334155',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 16,
	},
	modalInput: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: '#334155',
		color: '#fff',
		padding: 12,
		borderRadius: 8,
		height: 100,
		textAlignVertical: 'top',
		marginBottom: 20,
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 12,
	},
	modalBtn: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 6,
	},
	modalBtnText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 14,
	},
});
