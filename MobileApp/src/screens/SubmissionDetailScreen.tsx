import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../services/api';
import DynamicNativeForm from '../components/DynamicNativeForm';

export default function SubmissionDetailScreen({ route, navigation }: any) {
  const { submissionId } = route.params;
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  const parsedData = submission?.templateLayout ? JSON.parse(submission.templateLayout) : {};

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
          <Text style={styles.metaText}>Status: {submission?.status?.toUpperCase()}</Text>
          <Text style={styles.metaText}>Submitted At: {new Date(submission?.createdAt).toLocaleString()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Form Data</Text>
          {parsedData?.layout ? (
            <DynamicNativeForm 
              template={{ parsedLayout: parsedData.layout }} 
              formData={submission?.submittedValues || {}}
              setFormData={() => {}}
              readOnly={true} 
              submissionId={submissionId}
              attachments={submission?.attachments || []}
            />
          ) : (
            <Text style={styles.metaText}>No form layout available.</Text>
          )}
        </View>

        {submission?.status === 'needs_correction' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Corrections Requested</Text>
            {(submission.correctionRequests || []).map((req: any, idx: number) => {
              const fieldLabel = parsedData?.layout?.flatMap((r: any) => r.columns.map((c: any) => c.field)).find((f: any) => f?.id === req.fieldId)?.label || req.fieldId;
              return (
                <Text key={idx} style={styles.metaText}>
                  <Text style={{ fontWeight: 'bold', color: '#fff' }}>{fieldLabel}:</Text> {req.comment}
                </Text>
              );
            })}
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#f59e0b', marginTop: 16 }]} 
              onPress={() => navigation.navigate('FormFill', { templateId: submission.templateId?._id || submission.templateId, editSubmissionId: submissionId })}
            >
              <Text style={styles.actionText}>Edit & Resubmit Form</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginTop: 40,
  },
  backBtn: {
    marginRight: 16,
  },
  backText: {
    color: '#0d9488',
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
    backgroundColor: '#1e293b',
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
});
