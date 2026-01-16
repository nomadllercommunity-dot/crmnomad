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
  Alert,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { setUserContext } from '@/lib/auth-context';
import { Lead, Destination, Itinerary } from '@/types';
import { ArrowLeft, Phone, MessageCircle, X, Calendar, Users, MapPin, DollarSign, ChevronDown, Search, Check } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';
import { calendarService } from '@/services/calendar';

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
  const [place, setPlace] = useState('');
  const [budget, setBudget] = useState('');
  const [remarks, setRemarks] = useState('');

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);

  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [filteredItineraries, setFilteredItineraries] = useState<Itinerary[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [showItinerarySelection, setShowItinerarySelection] = useState(false);
  const [itinerarySearchText, setItinerarySearchText] = useState('');
  const [filterTransportMode, setFilterTransportMode] = useState('');
  const [filterDays, setFilterDays] = useState('');
  const [filterPax, setFilterPax] = useState('');
  const [loadingItineraries, setLoadingItineraries] = useState(false);

  const [actionType, setActionType] = useState('');
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [followUpRemark, setFollowUpRemark] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(new Date());
  const [nextFollowUpTime, setNextFollowUpTime] = useState(new Date());
  const [itineraryId, setItineraryId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [deadReason, setDeadReason] = useState('');
  const [showDeadReasonPicker, setShowDeadReasonPicker] = useState(false);
  const [confirmTravelDate, setConfirmTravelDate] = useState<Date | null>(null);
  const [reminderTime, setReminderTime] = useState<Date | null>(null);

  const appState = useRef(AppState.currentState);
  const callInitiatedRef = useRef(false);
  const leadForCallRef = useRef<Lead | null>(null);

  const actionTypes = [
    { label: 'Itinerary Sent', value: 'itinerary_sent' },
    { label: 'Itinerary Updated', value: 'itinerary_updated' },
    { label: 'Follow Up', value: 'follow_up' },
    { label: 'Confirm and Advance Paid', value: 'confirmed_advance_paid' },
    { label: 'Dead', value: 'dead' },
  ];

  const deadReasons = [
    'Budget too high',
    'Found another agency',
    'Plans cancelled',
    'Not responding',
    'Changed destination',
    'Timing not suitable',
    'Other',
  ];

  const transportModes = [
    { label: 'All', value: '' },
    { label: 'Driver with Cab', value: 'driver_with_cab' },
    { label: 'Self Drive Cab', value: 'self_drive_cab' },
    { label: 'Self Drive Scooter', value: 'self_drive_scooter' },
  ];

  useEffect(() => {
    fetchLeads();
    fetchDestinations();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (selectedDestination) {
      fetchItineraries();
      setShowItinerarySelection(true);
    } else {
      setItineraries([]);
      setFilteredItineraries([]);
      setShowItinerarySelection(false);
    }
  }, [selectedDestination]);

  useEffect(() => {
    filterItineraries();
  }, [itineraries, itinerarySearchText, filterTransportMode, filterDays, filterPax]);

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

  const fetchDestinations = async () => {
    if (user?.id) {
      await setUserContext(user.id);
    }

    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setDestinations(data || []);
    } catch (err: any) {
      console.error('Error fetching destinations:', err);
    }
  };

  const fetchItineraries = async () => {
    if (!selectedDestination) return;

    setLoadingItineraries(true);
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('destination_id', selectedDestination.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setItineraries(data || []);
      setFilteredItineraries(data || []);
    } catch (err: any) {
      console.error('Error fetching itineraries:', err);
      setItineraries([]);
      setFilteredItineraries([]);
    } finally {
      setLoadingItineraries(false);
    }
  };

  const filterItineraries = () => {
    let filtered = [...itineraries];

    if (itinerarySearchText) {
      filtered = filtered.filter((it) =>
        it.name.toLowerCase().includes(itinerarySearchText.toLowerCase())
      );
    }

    if (filterTransportMode) {
      filtered = filtered.filter((it) => it.mode_of_transport === filterTransportMode);
    }

    if (filterDays) {
      filtered = filtered.filter((it) => it.days === parseInt(filterDays));
    }

    if (filterPax) {
      filtered = filtered.filter((it) => it.no_of_pax === parseInt(filterPax));
    }

    setFilteredItineraries(filtered);
  };

  const resetForm = () => {
    setClientName('');
    setTravelDate(null);
    setTravelMonth('');
    setNoOfPax('');
    setPlace('');
    setBudget('');
    setRemarks('');
    setSelectedDestination(null);
    setItineraries([]);
    setFilteredItineraries([]);
    setSelectedItinerary(null);
    setShowItinerarySelection(false);
    setItinerarySearchText('');
    setFilterTransportMode('');
    setFilterDays('');
    setFilterPax('');
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

  const handleSendItineraryWhatsApp = async () => {
    if (!selectedItinerary || !currentLead?.contact_number) {
      Alert.alert('Error', 'Cannot send itinerary');
      return;
    }

    const exchangeRate = 83;
    const costINR = Math.round(selectedItinerary.cost_usd * exchangeRate);

    const message = `Hi ${clientName},

Here's your ${selectedDestination?.name} itinerary:

*${selectedItinerary.name}*
Duration: ${selectedItinerary.days} Days | Passengers: ${selectedItinerary.no_of_pax}

💰 *Cost:*
USD $${selectedItinerary.cost_usd.toFixed(2)}
INR ₹${costINR}

📋 *Itinerary:*
${selectedItinerary.full_itinerary}

✅ *Inclusions:*
${selectedItinerary.inclusions}

❌ *Exclusions:*
${selectedItinerary.exclusions}

${selectedItinerary.important_notes ? `\n⚠️ *Important Notes:*\n${selectedItinerary.important_notes}\n` : ''}
${selectedItinerary.disclaimers ? `\n📝 *Disclaimers:*\n${selectedItinerary.disclaimers}\n` : ''}

Looking forward to planning your amazing journey!

Best regards,
TeleCRM Team`;

    try {
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${currentLead.contact_number}?text=${encodedMessage}`;

      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (!canOpen) {
        Alert.alert('Error', 'WhatsApp is not installed');
        return;
      }

      await Linking.openURL(whatsappUrl);
      Alert.alert('Success', 'Itinerary sent via WhatsApp!');
    } catch (err: any) {
      console.error('Error sending via WhatsApp:', err);
      Alert.alert('Error', 'Failed to send itinerary');
    }
  };

  const handleSkipItinerary = () => {
    setSelectedItinerary(null);
    setShowItinerarySelection(false);
  };

  const validateProfile = (): string | null => {
    if (!clientName.trim()) return 'Client name is required';
    if (!selectedDestination) return 'Destination is required';
    if (!noOfPax || parseInt(noOfPax) < 1) return 'Number of persons must be at least 1';
    if (!budget || parseFloat(budget) <= 0) return 'Budget must be greater than 0';
    if (!travelDate && !travelMonth.trim()) return 'Please provide either travel date or month';
    return null;
  };

  const calculateDueAmount = () => {
    const total = parseFloat(totalAmount) || 0;
    const advance = parseFloat(advanceAmount) || 0;
    return total - advance;
  };

  const getActionTypeLabel = (value: string) => {
    return actionTypes.find((type) => type.value === value)?.label || value;
  };

  const handleAddFollowUp = async () => {
    if (!currentLead) return;

    const validationError = validateProfile();
    if (validationError) {
      Alert.alert('Error', validationError);
      return;
    }

    if (!actionType) {
      Alert.alert('Error', 'Please select an action type');
      return;
    }

    if (!followUpRemark.trim()) {
      Alert.alert('Error', 'Please add a remark');
      return;
    }

    if (actionType === 'confirmed_advance_paid' && !confirmTravelDate) {
      Alert.alert('Error', 'Please select a travel date');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        client_name: clientName.trim(),
        place: selectedDestination?.name || place.trim(),
        destination_id: selectedDestination?.id || null,
        no_of_pax: parseInt(noOfPax),
        expected_budget: parseFloat(budget),
        remark: remarks.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (travelDate) {
        updateData.travel_date = travelDate.toISOString().split('T')[0];
        updateData.travel_month = null;
      } else if (travelMonth.trim()) {
        updateData.travel_month = travelMonth.trim();
        updateData.travel_date = null;
      }

      if (actionType === 'confirmed_advance_paid') {
        updateData.status = 'confirmed';
        if (confirmTravelDate) {
          updateData.travel_date = confirmTravelDate.toISOString().split('T')[0];
          updateData.travel_month = null;
        }
      } else if (actionType === 'dead') {
        updateData.status = 'dead';
      } else if (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType)) {
        updateData.status = 'follow_up';
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', currentLead.id);

      if (updateError) throw updateError;

      const followUpData: any = {
        lead_id: currentLead.id,
        sales_person_id: user?.id,
        action_type: actionType,
        follow_up_note: followUpRemark.trim(),
        follow_up_date: new Date().toISOString(),
        status: 'completed',
      };

      if (actionType === 'confirmed_advance_paid' && confirmTravelDate) {
        followUpData.itinerary_id = itineraryId;
        followUpData.total_amount = parseFloat(totalAmount);
        followUpData.advance_amount = parseFloat(advanceAmount);
        followUpData.due_amount = calculateDueAmount();
        followUpData.transaction_id = transactionId;
      }

      if (actionType === 'dead') {
        followUpData.dead_reason = deadReason;
      }

      const { error: followUpError } = await supabase
        .from('follow_ups')
        .insert(followUpData);

      if (followUpError) throw followUpError;

      if (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType)) {
        const dateValue = nextFollowUpDate.toISOString().split('T')[0];
        const timeValue = nextFollowUpTime.toTimeString().split(':').slice(0, 2).join(':');
        const nextFollowUpDateTime = `${dateValue}T${timeValue}:00`;

        const { error: nextFollowUpError } = await supabase
          .from('follow_ups')
          .insert({
            lead_id: currentLead.id,
            sales_person_id: user?.id,
            follow_up_date: nextFollowUpDateTime,
            status: 'pending',
            remark: `Scheduled follow-up after ${getActionTypeLabel(actionType)}`,
          });

        if (nextFollowUpError) throw nextFollowUpError;
      }

      const { error: callLogError } = await supabase
        .from('call_logs')
        .insert({
          lead_id: currentLead.id,
          sales_person_id: user?.id,
          call_start_time: new Date().toISOString(),
          call_duration: 0,
        });

      if (callLogError) throw callLogError;

      const actionTypeLabel = getActionTypeLabel(actionType);
      await supabase.from('notifications').insert({
        user_id: currentLead.assigned_by || user?.id,
        type: 'follow_up',
        title: 'Follow-up Updated',
        message: `Follow-up added for ${clientName} - ${actionTypeLabel}`,
        lead_id: currentLead.id,
      });

      if (actionType === 'confirmed_advance_paid' && confirmTravelDate && user) {
        const reminderDate = new Date(confirmTravelDate);
        reminderDate.setDate(reminderDate.getDate() - 7);

        const reminderTimeObj = reminderTime || new Date();

        try {
          const calendarTitle = `Travel Reminder: ${clientName}`;
          const calendarDescription = `Client: ${clientName}
Location: ${selectedDestination?.name || place}
Pax: ${noOfPax}
Travel Date: ${confirmTravelDate.toISOString().split('T')[0]}

This is a 7-day advance reminder for the travel date.`;

          const calendarEventDate = new Date(reminderDate);
          calendarEventDate.setHours(reminderTimeObj.getHours());
          calendarEventDate.setMinutes(reminderTimeObj.getMinutes());

          const calendarEventId = await calendarService.createReminder(
            {
              title: calendarTitle,
              description: calendarDescription,
              startDate: calendarEventDate,
            },
            currentLead.id,
            clientName
          );

          await supabase.from('reminders').insert({
            lead_id: currentLead.id,
            sales_person_id: user.id,
            travel_date: confirmTravelDate.toISOString().split('T')[0],
            reminder_date: reminderDate.toISOString().split('T')[0],
            reminder_time: reminderTime?.toTimeString().slice(0, 5) || '09:00',
            calendar_event_id: calendarEventId,
            status: 'pending',
          });
        } catch (reminderError) {
          console.error('Error creating reminder:', reminderError);
        }
      }

      handleCloseModal();
      fetchLeads();
    } catch (err: any) {
      console.error('Error adding follow-up:', err);
      Alert.alert('Error', err.message || 'Failed to add follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowUpdateModal(false);
    resetForm();
    setActionType('');
    setFollowUpRemark('');
    setItineraryId('');
    setTotalAmount('');
    setAdvanceAmount('');
    setTransactionId('');
    setDeadReason('');
    setConfirmTravelDate(null);
    setReminderTime(null);
    setCurrentLead(null);
  };

  const getTransportBadgeColor = (mode?: string) => {
    switch (mode) {
      case 'driver_with_cab': return '#3b82f6';
      case 'self_drive_cab': return '#10b981';
      case 'self_drive_scooter': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getTransportLabel = (mode?: string) => {
    switch (mode) {
      case 'driver_with_cab': return 'Driver';
      case 'self_drive_cab': return 'Self Cab';
      case 'self_drive_scooter': return 'Scooter';
      default: return 'N/A';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
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
            <Text style={styles.emptyText}>No leads added yet</Text>
          </View>
        ) : (
          leads.map((lead) => (
            <View key={lead.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{lead.client_name}</Text>
                <Text style={styles.cardContact}>{lead.contact_number}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleCall(lead.contact_number!, lead)}
                  style={[styles.actionButton, styles.callButton]}
                >
                  <Phone size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleWhatsApp(lead.contact_number!)}
                  style={[styles.actionButton, styles.whatsappButton]}
                >
                  <MessageCircle size={18} color="#fff" />
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Number of Persons *</Text>
              <TextInput
                style={styles.input}
                value={noOfPax}
                onChangeText={setNoOfPax}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Destination Place *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDestinationPicker(true)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedDestination && styles.placeholderText,
                  ]}
                >
                  {selectedDestination?.name || 'Select a destination'}
                </Text>
                <ChevronDown size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {showItinerarySelection && (
              <>
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionTitle}>Select Itinerary (Optional)</Text>
                  <Text style={styles.sectionSubtitle}>
                    Choose an itinerary to send via WhatsApp or skip to continue
                  </Text>
                </View>

                <View style={styles.searchContainer}>
                  <Search size={20} color="#666" />
                  <TextInput
                    style={styles.searchInput}
                    value={itinerarySearchText}
                    onChangeText={setItinerarySearchText}
                    placeholder="Search itineraries..."
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.filterRow}>
                  <TextInput
                    style={styles.filterInput}
                    value={filterDays}
                    onChangeText={setFilterDays}
                    placeholder="Days"
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.filterInput}
                    value={filterPax}
                    onChangeText={setFilterPax}
                    placeholder="Pax"
                    keyboardType="numeric"
                  />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.transportFilters}>
                  {transportModes.map((mode) => (
                    <TouchableOpacity
                      key={mode.value}
                      style={[
                        styles.transportFilterButton,
                        filterTransportMode === mode.value && styles.transportFilterButtonActive,
                      ]}
                      onPress={() => setFilterTransportMode(mode.value)}
                    >
                      <Text
                        style={[
                          styles.transportFilterText,
                          filterTransportMode === mode.value && styles.transportFilterTextActive,
                        ]}
                      >
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {loadingItineraries ? (
                  <ActivityIndicator size="large" color="#8b5cf6" style={styles.loader} />
                ) : filteredItineraries.length === 0 ? (
                  <Text style={styles.noItinerariesText}>No itineraries found</Text>
                ) : (
                  filteredItineraries.map((itinerary) => (
                    <TouchableOpacity
                      key={itinerary.id}
                      style={[
                        styles.itineraryCard,
                        selectedItinerary?.id === itinerary.id && styles.itineraryCardSelected,
                      ]}
                      onPress={() => setSelectedItinerary(itinerary)}
                    >
                      <View style={styles.itineraryCardHeader}>
                        <Text style={styles.itineraryCardTitle}>{itinerary.name}</Text>
                        <View
                          style={[
                            styles.transportBadge,
                            { backgroundColor: getTransportBadgeColor(itinerary.mode_of_transport) },
                          ]}
                        >
                          <Text style={styles.transportBadgeText}>
                            {getTransportLabel(itinerary.mode_of_transport)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.itineraryCardDetails}>
                        <Text style={styles.itineraryCardDetail}>{itinerary.days} Days</Text>
                        <Text style={styles.itineraryCardDetail}>•</Text>
                        <Text style={styles.itineraryCardDetail}>{itinerary.no_of_pax} Pax</Text>
                        <Text style={styles.itineraryCardDetail}>•</Text>
                        <Text style={styles.itineraryCardDetail}>${itinerary.cost_usd}</Text>
                      </View>
                      {selectedItinerary?.id === itinerary.id && (
                        <Check size={24} color="#8b5cf6" style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  ))
                )}

                {selectedItinerary && (
                  <TouchableOpacity
                    style={styles.sendWhatsAppButton}
                    onPress={handleSendItineraryWhatsApp}
                  >
                    <MessageCircle size={20} color="#fff" />
                    <Text style={styles.sendWhatsAppButtonText}>Send via WhatsApp</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkipItinerary}
                >
                  <Text style={styles.skipButtonText}>Skip Itinerary & Continue</Text>
                </TouchableOpacity>
              </>
            )}

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
              <Text style={styles.sectionTitle}>Follow-Up Action</Text>
              <Text style={styles.sectionSubtitle}>Required to save the lead details</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Action Type *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowActionPicker(!showActionPicker)}
              >
                <Text style={[styles.pickerButtonText, !actionType && styles.placeholderText]}>
                  {actionType ? getActionTypeLabel(actionType) : 'Select action type'}
                </Text>
                <ChevronDown size={20} color="#666" />
              </TouchableOpacity>
              {showActionPicker && (
                <View style={styles.pickerOptions}>
                  {actionTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={styles.pickerOption}
                      onPress={() => {
                        setActionType(type.value);
                        setShowActionPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType) && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Next Follow-Up Date *</Text>
                  <DateTimePickerComponent
                    value={nextFollowUpDate}
                    onChange={setNextFollowUpDate}
                    mode="date"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Next Follow-Up Time *</Text>
                  <DateTimePickerComponent
                    value={nextFollowUpTime}
                    onChange={setNextFollowUpTime}
                    mode="time"
                  />
                </View>
              </>
            )}

            {actionType === 'confirmed_advance_paid' && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Travel Date *</Text>
                  <DateTimePickerComponent
                    value={confirmTravelDate}
                    onChange={setConfirmTravelDate}
                    placeholder="Select travel date"
                    mode="date"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Reminder Time</Text>
                  <DateTimePickerComponent
                    value={reminderTime}
                    onChange={setReminderTime}
                    placeholder="Select reminder time"
                    mode="time"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Itinerary ID</Text>
                  <TextInput
                    style={styles.input}
                    value={itineraryId}
                    onChangeText={setItineraryId}
                    placeholder="Enter itinerary ID"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Total Amount</Text>
                    <TextInput
                      style={styles.input}
                      value={totalAmount}
                      onChangeText={setTotalAmount}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Advance Amount</Text>
                    <TextInput
                      style={styles.input}
                      value={advanceAmount}
                      onChangeText={setAdvanceAmount}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {totalAmount && advanceAmount && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Due Amount</Text>
                    <Text style={styles.dueAmountText}>₹ {calculateDueAmount().toFixed(2)}</Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Transaction ID</Text>
                  <TextInput
                    style={styles.input}
                    value={transactionId}
                    onChangeText={setTransactionId}
                    placeholder="Enter transaction ID"
                  />
                </View>
              </>
            )}

            {actionType === 'dead' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Dead Reason *</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowDeadReasonPicker(!showDeadReasonPicker)}
                >
                  <Text style={[styles.pickerButtonText, !deadReason && styles.placeholderText]}>
                    {deadReason || 'Select reason'}
                  </Text>
                  <ChevronDown size={20} color="#666" />
                </TouchableOpacity>
                {showDeadReasonPicker && (
                  <View style={styles.pickerOptions}>
                    {deadReasons.map((reason) => (
                      <TouchableOpacity
                        key={reason}
                        style={styles.pickerOption}
                        onPress={() => {
                          setDeadReason(reason);
                          setShowDeadReasonPicker(false);
                        }}
                      >
                        <Text style={styles.pickerOptionText}>{reason}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Remarks *</Text>
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
                  <Text style={styles.modalButtonText}>Save & Add Follow-Up</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showDestinationPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDestinationPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowDestinationPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Select Destination</Text>
            <ScrollView style={styles.pickerModalList}>
              {destinations.map((dest) => (
                <TouchableOpacity
                  key={dest.id}
                  style={styles.pickerModalOption}
                  onPress={() => {
                    setSelectedDestination(dest);
                    setPlace(dest.name);
                    setShowDestinationPicker(false);
                  }}
                >
                  <Text style={styles.pickerModalOptionText}>{dest.name}</Text>
                  {selectedDestination?.id === dest.id && (
                    <Check size={20} color="#8b5cf6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardContact: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  callButton: {
    backgroundColor: '#3b82f6',
  },
  whatsappButton: {
    backgroundColor: '#25d366',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
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
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  pickerOptions: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#fff',
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  sectionDivider: {
    marginVertical: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  transportFilters: {
    marginBottom: 16,
  },
  transportFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  transportFilterButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  transportFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  transportFilterTextActive: {
    color: '#fff',
  },
  loader: {
    marginVertical: 24,
  },
  noItinerariesText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
    paddingVertical: 24,
  },
  itineraryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  itineraryCardSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
  },
  itineraryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itineraryCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  transportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  transportBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  itineraryCardDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  itineraryCardDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  checkIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  sendWhatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25d366',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  sendWhatsAppButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  dueAmountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  modalActions: {
    marginTop: 24,
    marginBottom: 32,
  },
  modalButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#8b5cf6',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxHeight: '60%',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  pickerModalList: {
    maxHeight: 300,
  },
  pickerModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerModalOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
});
