import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Switch, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import api from '../services/api';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Dynamic Native Form Component (React Native)
 * 
 * Renders a dynamic form based on a JSON template.
 * Supports both editing mode (fill form) and read-only mode (view submission).
 * 
 * Supported field types:
 * - heading, label (display only)
 * - text, email, number, textarea
 * - date (with date picker)
 * - checkbox (single or multi-option)
 * - radio, dropdown
 * - file (upload/download)
 * - group (nested fields)
 */
export default function DynamicNativeForm({ 
	template, 
	formData, 
	setFormData, 
	readOnly = false, 
	submissionId = null, 
	attachments = [],
	isReviewer = false,
	pendingCorrections = [],
	submissionCorrections = [],
	onFlag = (field: any) => {}
}) {

	const handleUpdate = (fieldId: string, value: any) => {
		if (readOnly) return;
		setFormData?.(prev => ({ ...prev, [fieldId]: value }));
	};

	const handleDownload = async (blobName: string) => {
		if (!submissionId) return;
		try {
			const response = await api.get(`/formSubmissions/${submissionId}/files/${encodeURIComponent(blobName)}/sas`);
			if (response.data.url) {
				Linking.openURL(response.data.url);
			}
		} catch (error) {
			console.error(error);
			Alert.alert('Download Error', 'Could not retrieve file URL.');
		}
	};

	const handlePickFile = async (fieldId: string) => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				copyToCacheDirectory: true,
				multiple: true,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				// Grab existing files or start a new array
				const existingFiles = Array.isArray(formData[fieldId]) ? formData[fieldId] : [];
				setFormData?.((prev: any) => ({
					...prev,
					[fieldId]: [...existingFiles, ...result.assets],
				}));
			}
		} catch (err) {
			console.error(err);
			Alert.alert('Error', 'Failed to pick document.');
		}
	};

	const handleRemoveFile = (fieldId: string, indexToRemove: number) => {
		const existingFiles = Array.isArray(formData[fieldId]) ? formData[fieldId] : [];
		const newFiles = existingFiles.filter((_: any, i: number) => i !== indexToRemove);
		setFormData?.((prev: any) => ({
			...prev,
			[fieldId]: newFiles,
		}));
	};

	const renderFieldContent = (field: any) => {
		// Values are passed in via formData (which holds submittedValues in readOnly mode)
		const rawValue = formData?.[field.id] ?? '';

		// Only stringify for text inputs to avoid crashes when rendering objects in Text
		const stringValue = typeof rawValue === 'object' && rawValue !== null ? JSON.stringify(rawValue) : String(rawValue);

		switch (field.type) {
			case 'heading':
				return <Text style={styles.heading}>{field.label}</Text>;
			case 'label':
				return <Text style={styles.paragraph}>{field.label}</Text>;
			case 'text':
			case 'email':
			case 'number':
				return (
					<View style={styles.fieldContainer}>
						<Text style={styles.label}>{field.label} {field.required && !readOnly ? '*' : ''}</Text>
						{readOnly ? (
							<Text style={styles.readOnlyText}>{stringValue}</Text>
						) : (
							<TextInput
								style={styles.input}
								value={stringValue}
								onChangeText={(text) => handleUpdate(field.id, text)}
								keyboardType={field.type === 'number' ? 'numeric' : field.type === 'email' ? 'email-address' : 'default'}
								placeholder={field.placeholder || ''}
								placeholderTextColor="#ffffff"
							/>
						)}
					</View>
				);
			case 'date':
				const showPicker = formData?.[`_showDatePicker_${field.id}`];
				const dateValue = rawValue ? new Date(rawValue) : new Date();
				const displayString = rawValue ? new Date(rawValue).toISOString().split('T')[0] : '';

				return (
					<View style={styles.fieldContainer}>
						<Text style={styles.label}>{field.label} {field.required && !readOnly ? '*' : ''}</Text>
						{readOnly ? (
							<Text style={styles.readOnlyText}>{displayString || 'No date selected'}</Text>
						) : (
							<View>
								<TouchableOpacity
									style={styles.dateBtn}
									onPress={() => setFormData?.((prev: any) => ({ ...prev, [`_showDatePicker_${field.id}`]: true }))}
								>
									<Text style={displayString ? styles.dateBtnText : styles.dateBtnPlaceholder}>
										{displayString || field.placeholder || 'YYYY-MM-DD'}
									</Text>
								</TouchableOpacity>

								{showPicker && (
									<DateTimePicker
										value={dateValue}
										mode="date"
										display="default"
										onChange={(event, selectedDate) => {
											setFormData?.((prev: any) => ({ ...prev, [`_showDatePicker_${field.id}`]: false }));
											if (event.type === 'set' && selectedDate) {
												// Store exactly as YYYY-MM-DD
												const isoDate = selectedDate.toISOString().split('T')[0];
												handleUpdate(field.id, isoDate);
											}
										}}
									/>
								)}
							</View>
						)}
					</View>
				);
			case 'textarea':
				return (
					<View style={styles.fieldContainer}>
						<Text style={styles.label}>{field.label} {field.required && !readOnly ? '*' : ''}</Text>
						{readOnly ? (
							<Text style={styles.readOnlyText}>{stringValue}</Text>
						) : (
							<TextInput
								style={[styles.input, styles.textarea]}
								value={stringValue}
								onChangeText={(text) => handleUpdate(field.id, text)}
								multiline
								numberOfLines={4}
								placeholder={field.placeholder || ''}
								placeholderTextColor="#ffffff"
							/>
						)}
					</View>
				);
			case 'checkbox':
				if (field.options && field.options.length > 0) {
					const arrValue = Array.isArray(rawValue) ? rawValue : [];
					return (
						<View style={styles.fieldContainer}>
							<Text style={styles.label}>{field.label} {field.required && !readOnly ? '*' : ''}</Text>
							{field.options.map((opt: string, i: number) => {
								const isSelected = arrValue.includes(opt);
								return (
									<TouchableOpacity key={i} style={styles.optionRow} disabled={readOnly} onPress={() => {
										let newArr = [...arrValue];
										if (isSelected) newArr = newArr.filter(x => x !== opt);
										else newArr.push(opt);
										handleUpdate(field.id, newArr);
									}}>
										<View style={styles.checkboxOuter}>
											{isSelected && <View style={styles.checkboxInner} />}
										</View>
										<Text style={styles.optionText}>{opt}</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					);
				}
				return (
					<View style={[styles.fieldContainer, styles.row]}>
						<Text style={styles.label}>{field.label} {field.required && !readOnly ? '*' : ''}</Text>
						<Switch
							value={rawValue === 'true' || rawValue === true}
							onValueChange={(val) => handleUpdate(field.id, val)}
							disabled={readOnly}
						/>
					</View>
				);
			case 'dropdown':
				// A simple expanding list for dropdown MVP
				const isDropdownExpanded = formData?.[`_expanded_${field.id}`];
				return (
					<View style={styles.fieldContainer}>
						<Text style={styles.label}>{field.label} {field.required && !readOnly ? '*' : ''}</Text>
						{readOnly ? (
							<Text style={styles.readOnlyText}>{stringValue}</Text>
						) : (
							<View>
								<TouchableOpacity
									style={styles.dropdownBtn}
									onPress={() => setFormData?.((prev: any) => ({ ...prev, [`_expanded_${field.id}`]: !prev[`_expanded_${field.id}`] }))}
								>
									<Text style={styles.dropdownBtnText}>{rawValue || 'Select an option...'}</Text>
									<Text style={styles.dropdownBtnText}>▼</Text>
								</TouchableOpacity>
								{isDropdownExpanded && (
									<View style={styles.dropdownList}>
										{field.options?.map((opt: string, i: number) => (
											<TouchableOpacity
												key={i}
												style={styles.dropdownOption}
												onPress={() => {
													handleUpdate(field.id, opt);
													setFormData?.((prev: any) => ({ ...prev, [`_expanded_${field.id}`]: false }));
												}}
											>
												<Text style={styles.dropdownOptionText}>{opt}</Text>
											</TouchableOpacity>
										))}
									</View>
								)}
							</View>
						)}
					</View>
				);
			case 'radio':
				return (
					<View style={styles.fieldContainer}>
						<Text style={styles.label}>{field.label} {field.required && !readOnly ? '*' : ''}</Text>
						{field.options?.map((opt: string, i: number) => {
							const isSelected = rawValue === opt;
							return (
								<TouchableOpacity key={i} style={styles.optionRow} disabled={readOnly} onPress={() => {
									handleUpdate(field.id, opt);
								}}>
									<View style={styles.radioOuter}>
										{isSelected && <View style={styles.radioInner} />}
									</View>
									<Text style={styles.optionText}>{opt}</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				);
			case 'file':
				const fileAttachment = attachments.find((a: any) => a.fieldId === field.id);
				const selectedFiles = Array.isArray(formData?.[field.id]) ? formData[field.id] : [];

				return (
					<View style={styles.fieldContainer}>
						<Text style={styles.label}>{field.label} {field.required && !readOnly ? '*' : ''}</Text>
						{readOnly ? (
							fileAttachment ? (
								<TouchableOpacity style={styles.fileBtn} onPress={() => handleDownload(fileAttachment.blobName)}>
									<Text style={styles.fileDownloadText}>⬇️ Download {fileAttachment.originalName}</Text>
								</TouchableOpacity>
							) : (
								<Text style={styles.readOnlyText}>No file</Text>
							)
						) : (
							<View>
								{selectedFiles.map((f: any, idx: number) => (
									<View key={idx} style={styles.selectedFileRow}>
										<Text style={styles.selectedFileName} numberOfLines={1}>{f.name}</Text>
										<TouchableOpacity onPress={() => handleRemoveFile(field.id, idx)}>
											<Text style={styles.removeFileText}>✕</Text>
										</TouchableOpacity>
									</View>
								))}
								<TouchableOpacity style={styles.fileBtn} onPress={() => handlePickFile(field.id)}>
									<Text style={styles.fileBtnText}>📎 Select File</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				);
			case 'group':
				return (
					<View style={styles.groupContainer}>
						<Text style={styles.groupLabel}>{field.label}</Text>
						{field.children?.map((child: any) => (
							<View key={child.id}>{renderField(child)}</View>
						))}
					</View>
				);
			default:
				return null;
		}
	};

	const renderField = (field: any) => {
		const content = renderFieldContent(field);
		if (!content) return null;

		const isStatic = field.type === 'heading' || field.type === 'label' || field.type === 'divider';
		const isInteractive = isReviewer && !isStatic;
		const flaggedCorrection = pendingCorrections?.find((c: any) => c.fieldId === field.id) || submissionCorrections?.find((c: any) => c.fieldId === field.id);

		if (!isInteractive && !flaggedCorrection) return content;

		return (
			<TouchableOpacity 
				activeOpacity={isInteractive ? 0.7 : 1}
				onPress={() => isInteractive && onFlag(field)}
				style={[
					isInteractive && styles.interactiveField,
					flaggedCorrection && styles.flaggedField
				]}
			>
				{flaggedCorrection && (
					<View style={styles.flaggedIconContainer}>
						<Text style={styles.flaggedIconText}>!</Text>
					</View>
				)}
				<View style={{ pointerEvents: isInteractive ? 'none' : 'auto' }}>
					{content}
				</View>
				{flaggedCorrection && !isInteractive && (
					<View style={styles.flaggedMessage}>
						<Text style={styles.flaggedMessageText}><Text style={{fontWeight: 'bold'}}>Correction Requested:</Text> {flaggedCorrection.comment}</Text>
					</View>
				)}
			</TouchableOpacity>
		);
	};

	const renderRow = (row: any) => {
		return (
			<View style={styles.rowContainer}>
				{row.columns?.map((col: any, idx: number) => (
					<View key={idx} style={styles.colContainer}>
						{col.field ? renderField(col.field) : null}
					</View>
				))}
			</View>
		);
	};

	if (!template?.parsedLayout) {
		return <Text style={styles.paragraph}>Invalid form template.</Text>;
	}

	return (
		<View style={styles.container}>
			{template.parsedLayout.map((row: any) => (
				<View key={row.id}>{renderRow(row)}</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
	},
	heading: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#fff',
		marginVertical: 12,
	},
	paragraph: {
		fontSize: 14,
		color: '#94a3b8',
		marginBottom: 12,
	},
	fieldContainer: {
		marginBottom: 16,
	},
	label: {
		color: '#cbd5e1',
		marginBottom: 6,
		fontSize: 14,
		fontWeight: '600',
	},
	input: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: '#334155',
		color: '#fff',
		padding: 12,
		borderRadius: 8,
	},
	readOnlyText: {
		color: '#fff',
		fontSize: 16,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#334155',
	},
	textarea: {
		height: 100,
		textAlignVertical: 'top',
	},
	optionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	optionText: {
		color: '#fff',
		fontSize: 16,
		marginLeft: 12,
	},
	dropdownBtn: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
		borderWidth: 1,
		borderColor: '#334155',
		padding: 12,
		borderRadius: 8,
	},
	dropdownBtnText: {
		color: '#fff',
		fontSize: 16,
	},
	dropdownList: {
		backgroundColor: '#334155',
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
		borderWidth: 1,
		borderColor: 'rgba(30, 41, 59, 0.85)',
		marginTop: -4,
	},
	dropdownOption: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(30, 41, 59, 0.85)',
	},
	dropdownOptionText: {
		color: '#fff',
		fontSize: 16,
	},
	dateBtn: {
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
		borderWidth: 1,
		borderColor: '#334155',
		padding: 12,
		borderRadius: 8,
	},
	dateBtnText: {
		color: '#fff',
		fontSize: 16,
	},
	dateBtnPlaceholder: {
		color: '#94a3b8',
		fontSize: 16,
	},
	checkboxOuter: {
		width: 20,
		height: 20,
		borderWidth: 2,
		borderColor: '#22c55e',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 4,
	},
	checkboxInner: {
		width: 12,
		height: 12,
		backgroundColor: '#22c55e',
	},
	radioOuter: {
		width: 20,
		height: 20,
		borderWidth: 2,
		borderColor: '#22c55e',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 10,
	},
	radioInner: {
		width: 10,
		height: 10,
		backgroundColor: '#22c55e',
		borderRadius: 5,
	},
	fileBtn: {
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
		borderWidth: 1,
		borderColor: '#334155',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	fileBtnText: {
		color: '#22c55e',
		fontWeight: 'bold',
	},
	fileDownloadText: {
		color: '#38bdf8',
		fontWeight: 'bold',
	},
	selectedFileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#334155',
		padding: 10,
		borderRadius: 8,
		marginBottom: 8,
	},
	selectedFileName: {
		color: '#fff',
		flex: 1,
		marginRight: 8,
	},
	removeFileText: {
		color: '#ef4444',
		fontSize: 16,
		fontWeight: 'bold',
	},
	rowContainer: {
		flexDirection: 'column', // Stack rows vertically on mobile
	},
	colContainer: {
		flex: 1,
	},
	groupContainer: {
		borderWidth: 1,
		borderColor: '#334155',
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
	},
	groupLabel: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 12,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	interactiveField: {
		padding: 8,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: 'transparent',
	},
	flaggedField: {
		padding: 8,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: '#ef4444',
		backgroundColor: 'rgba(239, 68, 68, 0.1)',
		borderStyle: 'dashed',
		position: 'relative',
	},
	flaggedIconContainer: {
		position: 'absolute',
		top: -10,
		right: -10,
		backgroundColor: '#ef4444',
		borderRadius: 12,
		width: 24,
		height: 24,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 10,
	},
	flaggedIconText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 14,
	},
	flaggedMessage: {
		marginTop: 8,
		backgroundColor: 'rgba(30, 41, 59, 0.85)',
		padding: 10,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#334155',
	},
	flaggedMessageText: {
		color: '#f8fafc',
		fontSize: 13,
		lineHeight: 18,
	},
});
