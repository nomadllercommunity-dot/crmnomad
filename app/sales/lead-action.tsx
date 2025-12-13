import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, Phone, Calendar, Clock } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';

export default function LeadActionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { leadId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callInProgress, setCallInProgress] = useState(false);

  const [updateType, setUpdateType] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [followUpDate, setFollowUpDate] = useState<Date>(new Date());
  const [followUpTime, setFollowUpTime] = useState<Date>(new Date());
  const [followUpHistory, setFollowUpHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchLead();
    fetchFollowUpHistory();
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      setLead(data);
    } catch (err: any) {
      console.error('Error fetching lead:', err);
      Alert.alert('Error', 'Failed to load lead details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowUpHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*, sales_person:sales_person_id(full_name)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowUpHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching follow-up history:', err);
    }
  };

  const startCall = () => {
    if (lead?.contact_number) {
      setCallStartTime(new Date());
      setCallInProgress(true);
      Linking.openURL(`tel:${lead.contact_number}`);
    }
  };

  const endCall = async () => {
    if (!callStartTime) return;

    const callEndTime = new Date();
    const duration = Math.floor((callEndTime.getTime() - callStartTime.getTime()) / 1000);

    try {
      await supabase.from('call_logs').insert([
        {
          lead_id: leadId,
          sales_person_id: user?.id,
          call_start_time: callStartTime.toISOString(),
          call_end_time: callEndTime.toISOString(),
          call_duration: duration,
        },
      ]);
    } catch (err: any) {
      console.error('Error logging call:', err);
    }

    setCallInProgress(false);
    setCallStartTime(null);
  };

  const handleSubmit = async () => {
    if (!updateType) {
      Alert.alert('Error', 'Please select an update type');
      return;
    }

    if (!remark.trim()) {
      Alert.alert('Error', 'Please enter a remark');
      return;
    }

    if (updateType === 'follow_up' && (!followUpDate || !followUpTime)) {
      Alert.alert('Error', 'Please select follow-up date and time');
      return;
    }

    if (updateType === 'advance_paid_confirmed') {
      router.push({
        pathname: '/sales/confirm-lead',
        params: { leadId },
      });
      return;
    }

    setSubmitting(true);

    try {
      if (updateType === 'dead') {
        await supabase
          .from('leads')
          .update({ status: 'dead', updated_at: new Date().toISOString() })
          .eq('id', leadId);
      } else if (updateType === 'follow_up') {
        const dateString = followUpDate.toISOString().split('T')[0];
        const timeString = followUpTime.toTimeString().slice(0, 5);
        const followUpDateTime = `${dateString}T${timeString}:00`;

        await supabase.from('follow_ups').insert([
          {
            lead_id: leadId,
            sales_person_id: user?.id,
            follow_up_date: followUpDateTime,
            status: 'pending',
            update_type: updateType,
            remark: remark,
          },
        ]);

        await supabase
          .from('leads')
          .update({ status: 'follow_up', updated_at: new Date().toISOString() })
          .eq('id', leadId);
      } else {
        await supabase.from('follow_ups').insert([
          {
            lead_id: leadId,
            sales_person_id: user?.id,
            follow_up_date: new Date().toISOString(),
            status: 'completed',
            update_type: updateType,
            remark: remark,
          },
        ]);
      }

      Alert.alert('Success', 'Lead updated successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.iconContainer}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Up Update</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.leadInfo}>
          <Text style={styles.leadName}>{lead?.client_name}</Text>
          <Text style={styles.leadDetail}>{lead?.place} - {lead?.no_of_pax} Pax</Text>
        </View>

        <TouchableOpacity
          style={[styles.callButton, callInProgress && styles.callButtonActive, !lead?.contact_number && styles.callButtonDisabled]}
          onPress={callInProgress ? endCall : startCall}
          disabled={!lead?.contact_number && !callInProgress}
        >
          <View style={styles.callButtonContent}>
            <View style={styles.iconContainer}>
              <Phone size={24} color="#fff" />
            </View>
            <Text style={styles.callButtonText}>
              {callInProgress ? 'End Call' : 'Start Call'}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Update Follow-Up</Text>

        <Text style={styles.label}>Update Type *</Text>
        <View style={styles.radioGroup}>
          {[
            { value: 'itinerary_created', label: 'Itinerary Created' },
            { value: 'itinerary_updated', label: 'Itinerary Updated' },
            { value: 'follow_up', label: 'Follow Up' },
            { value: 'advance_paid_confirmed', label: 'Advance Paid & Confirmed' },
            { value: 'dead', label: 'Dead' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioButton,
                updateType === option.value && styles.radioButtonActive,
              ]}
              onPress={() => setUpdateType(option.value)}
            >
              <Text
                style={[
                  styles.radioButtonText,
                  updateType === option.value && styles.radioButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Remark *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={remark}
          onChangeText={setRemark}
          placeholder="Enter remarks"
          multiline
          numberOfLines={4}
        />

        {updateType === 'follow_up' && (
          <>
            <DateTimePickerComponent
              label="Next Follow-Up Date *"
              value={followUpDate}
              onChange={setFollowUpDate}
              mode="date"
            />

            <DateTimePickerComponent
              label="Next Follow-Up Time *"
              value={followUpTime}
              onChange={setFollowUpTime}
              mode="time"
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Update</Text>
          )}
        </TouchableOpacity>

        {followUpHistory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Follow-Up History</Text>
            {followUpHistory.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyType}>
                    {item.update_type ? item.update_type.replace(/_/g, ' ').toUpperCase() : 'FOLLOW UP'}
                  </Text>
                  <Text style={styles.historyStatus}>{item.status}</Text>
                </View>
                <Text style={styles.historyRemark}>{item.remark}</Text>
                <Text style={styles.historyDate}>
                  {new Date(item.follow_up_date).toLocaleString()}
                </Text>
                <Text style={styles.historyBy}>
                  By: {item.sales_person?.full_name || 'Unknown'}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  leadInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  leadName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  leadDetail: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  callButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButtonActive: {
    backgroundColor: '#ef4444',
  },
  callButtonDisabled: {
    backgroundColor: '#93c5fd',
    opacity: 0.6,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 8,
  },
  radioGroup: {
    gap: 8,
    marginBottom: 16,
  },
  radioButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  radioButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  radioButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  radioButtonTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#86efac',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimeInputContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    textTransform: 'capitalize',
  },
  historyRemark: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historyBy: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
