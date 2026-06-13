import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import api from '../services/api';
import DynamicNativeForm from '../components/DynamicNativeForm';

export default function ApprovalActionScreen({ route, navigation }: any) {
  const { submissionId } = route.params;
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState('');

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

  const handleAction = async (action: 'approve' | 'reject' | 'forward' | 'return') => {
    if ((action === 'reject' || action === 'forward' || action === 'return') && !comments) {
      Alert.alert('Error', 'Please provide comments for this action.');
      return;
    }

    setSubmitting(true);
    let apiAction = action === 'approve' ? 'approved' : action === 'reject' ? 'denied' : action === 'return' ? 'returned' : 'forwarded';
    try {
      const payload: any = {
        action: apiAction,
        note: comments,
      };
      
      if (action === 'forward') {
        payload.forwardTarget = { roleId: 'some-role-id' }; // Simplification for MVP
      }
      
      if (action === 'return') {
        payload.correctionRequests = [{ fieldId: 'General', comment: comments }];
      }

      await api.post(`/formSubmissions/${submissionId}/action`, payload);
      Alert.alert('Success', `Submission ${action}d successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to process action');
    } finally {
      setSubmitting(false);
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
        <Text style={styles.headerTitle} numberOfLines={1}>{submission?.templateTitle || 'Approval'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
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
            <TouchableOpacity style={[styles.actionBtn, styles.returnBtn]} onPress={() => handleAction('return')} disabled={submitting}>
              <Text style={styles.actionText}>Correction</Text>
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
    backgroundColor: '#0f172a',
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
});
