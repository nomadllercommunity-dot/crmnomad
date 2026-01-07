import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, Phone, MessageCircle, X, Calendar, Users, MapPin, DollarSign } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';

export default function AddedLeadsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);

  const [clientName, setClientName] = useState('');
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [travelMonth, setTravelMonth] = useState('');
  const [noOfPax, setNoOfPax] = useState('');
  const [noOfKids, setNoOfKids] = useState('0');
  const [place, setPlace] = useState('');
  const [budget, setBudget] = useState('');
  const [remarks, setRemarks] = useState('');

  const [followUpDate, setFollowUpDate] = useState(new Date());
  const [followUpTime, setFollowUpTime] = useState(new Date());
  const [followUpRemark, setFollowUpRemark] = useState('');

  const appState = useRef(AppState.currentState);
  const callInitiatedRef = useRef(false);
  const leadForCallRef = useRef<Lead | null>(null);

  useEffect(() => {
    fetchLeads();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active' &&
      callInitiatedRef.current &&
      leadForCallRef.current
    ) {
      setCurrentLead(leadForCallRef.current);
      resetForm();
      setShowUpdateModal(true);
      callInitiatedRef.current = false;
      leadForCallRef.current = null;
    }
    appState.current = nextAppState;
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', user?.id)
        .eq('status', 'added_by_sales')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setTravelDate(null);
    setTravelMonth('');
    setNoOfPax('');
    setNoOfKids('0');
    setPlace('');
    setBudget('');
    setRemarks('');
  };

  const handleCall = (phoneNumber: string, lead: Lead) => {
    callInitiatedRef.current = true;
    leadForCallRef.current = lead;
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening dialer:', err);
      callInitiatedRef.current = false;
      leadForCallRef.current = null;
    });
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    const message = `Hello! I'm reaching out regarding your travel inquiry.`;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening WhatsApp:', err);
    });
  };

  const validateProfile = (): string | null => {
    if (!clientName.trim()) return 'Client name is required';
    if (!place.trim()) return 'Destination place is required';
    if (!noOfPax || parseInt(noOfPax) < 1) return 'Number of persons must be at least 1';
    if (!budget || parseFloat(budget) <= 0) return 'Budget must be greater than 0';
    if (!travelDate && !travelMonth.trim()) return 'Please provide either travel date or month';
    return null;
  };


  const handleAddFollowUp = async () => {
    if (!currentLead) return;

    const validationError = validateProfile();
    if (validationError) {
      alert(validationError);
      return;
    }

    if (!followUpRemark.trim()) {
      alert('Please add a remark for the follow-up');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        client_name: clientName.trim(),
        place: place.trim(),
        no_of_pax: parseInt(noOfPax),
        no_of_kids: parseInt(noOfKids) || 0,
        expected_budget: parseFloat(budget),
        remark: remarks.trim() || null,
        status: 'follow_up',
        updated_at: new Date().toISOString(),
      };

      if (travelDate) {
        updateData.travel_date = travelDate.toISOString().split('T')[0];
        updateData.travel_month = null;
      } else if (travelMonth.trim()) {
        updateData.travel_month = travelMonth.trim();
        updateData.travel_date = null;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', currentLead.id);

      if (updateError) throw updateError;

      const combinedDateTime = new Date(followUpDate);
      combinedDateTime.setHours(followUpTime.getHours());
      combinedDateTime.setMinutes(followUpTime.getMinutes());

      const { error: followUpError } = await supabase
        .from('follow_ups')
        .insert({
          lead_id: currentLead.id,
          sales_person_id: user?.id,
          follow_up_date: combinedDateTime.toISOString(),
          status: 'pending',
          update_type: 'follow_up',
          remark: followUpRemark.trim(),
        });

      if (followUpError) throw followUpError;

      const { error: callLogError } = await supabase
        .from('call_logs')
        .insert({
          lead_id: currentLead.id,
          sales_person_id: user?.id,
          call_start_time: new Date().toISOString(),
          call_duration: 0,
        });

      if (callLogError) throw callLogError;

      setShowUpdateModal(false);
      resetForm();
      setFollowUpRemark('');
      setFollowUpDate(new Date());
      setFollowUpTime(new Date());
      fetchLeads();
      alert('Lead updated and moved to Follow Ups');
    } catch (err: any) {
      console.error('Error adding follow-up:', err);
      alert('Failed to add follow-up. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Added Leads</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {leads.length === 0 ? (
          <View style={styles.emptyState}>
            <Phone size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Added Leads Yet</Text>
            <Text style={styles.emptyText}>
              Start adding leads with their contact numbers to begin your outreach
            </Text>
          </View>
        ) : (
          leads.map((lead) => (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <View style={styles.phoneContainer}>
                  <Phone size={20} color="#14b8a6" />
                  <Text style={styles.phoneNumber}>{lead.contact_number}</Text>
                </View>
                <Text style={styles.timestamp}>{formatDate(lead.created_at)}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.callButton]}
                  onPress={() => handleCall(lead.contact_number!, lead)}
                >
                  <Phone size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.whatsappButton]}
                  onPress={() => handleWhatsApp(lead.contact_number!)}
                >
                  <MessageCircle size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showUpdateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Lead Profile</Text>
            <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Client Name *</Text>
              <TextInput
                style={styles.input}
                value={clientName}
                onChangeText={setClientName}
                placeholder="Enter client name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Travel Date</Text>
              <DateTimePickerComponent
                value={travelDate}
                onChange={setTravelDate}
                placeholder="Select travel date"
                mode="date"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Or Travel Month</Text>
              <TextInput
                style={styles.input}
                value={travelMonth}
                onChangeText={setTravelMonth}
                placeholder="e.g., June 2026"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Number of Persons *</Text>
                <TextInput
                  style={styles.input}
                  value={noOfPax}
                  onChangeText={setNoOfPax}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Number of Kids</Text>
                <TextInput
                  style={styles.input}
                  value={noOfKids}
                  onChangeText={setNoOfKids}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Destination Place *</Text>
              <TextInput
                style={styles.input}
                value={place}
                onChangeText={setPlace}
                placeholder="Enter destination"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Expected Budget *</Text>
              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                placeholder="Enter budget"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Add any additional notes"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Schedule Follow-Up</Text>
              <Text style={styles.sectionSubtitle}>Required to save the lead details</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Follow-Up Date *</Text>
              <DateTimePickerComponent
                value={followUpDate}
                onChange={setFollowUpDate}
                mode="date"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Follow-Up Time *</Text>
              <DateTimePickerComponent
                value={followUpTime}
                onChange={setFollowUpTime}
                mode="time"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Follow-Up Remarks *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={followUpRemark}
                onChangeText={setFollowUpRemark}
                placeholder="Add follow-up notes (required)"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddFollowUp}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Save & Add to Follow-Ups</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leadHeader: {
    marginBottom: 16,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  callButton: {
    backgroundColor: '#10b981',
  },
  whatsappButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 12,
    marginTop: 8,
    marginBottom: 40,
  },
  modalButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#14b8a6',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionDivider: {
    marginTop: 24,
    marginBottom: 20,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});
