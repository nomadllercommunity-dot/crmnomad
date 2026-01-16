import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2, Search, Filter, X, ChevronDown, Check, Copy, Edit } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { setUserContext } from '@/lib/auth-context';
import { useAuth } from '@/contexts/AuthContext';
import { Destination, Itinerary } from '@/types';
import * as Clipboard from 'expo-clipboard';

export default function SavedItineraryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [filteredItineraries, setFilteredItineraries] = useState<Itinerary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterDays, setFilterDays] = useState('');
  const [filterPax, setFilterPax] = useState('');
  const [filterTransport, setFilterTransport] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    destination_id: '',
    destination_name: '',
    name: '',
    days: '1',
    no_of_pax: '2',
    full_itinerary: '',

    inclusions_driver: '',
    exclusions_driver: '',
    cost_usd_driver: '',

    inclusions_self_drive_cab: '',
    exclusions_self_drive_cab: '',
    cost_usd_self_drive_cab: '',

    inclusions_self_drive_scooter: '',
    exclusions_self_drive_scooter: '',
    cost_usd_self_drive_scooter: '',

    important_notes: '',
    disclaimers: '',
  });

  const transportModes = [
    { label: 'Driver with Cab', value: 'driver_with_cab' },
    { label: 'Self Drive Cab', value: 'self_drive_cab' },
    { label: 'Self Drive Scooter', value: 'self_drive_scooter' },
  ];

  useEffect(() => {
    fetchDestinations();
    fetchItineraries();
    fetchExchangeRate();
  }, []);

  useEffect(() => {
    filterItineraries();
  }, [itineraries, searchQuery, filterDays, filterPax, filterTransport]);

  const filterItineraries = () => {
    let filtered = [...itineraries];

    if (searchQuery) {
      filtered = filtered.filter((itinerary) =>
        itinerary.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterDays) {
      filtered = filtered.filter((itinerary) => itinerary.days === parseInt(filterDays));
    }

    if (filterPax) {
      filtered = filtered.filter((itinerary) => itinerary.no_of_pax === parseInt(filterPax));
    }

    if (filterTransport) {
      filtered = filtered.filter((itinerary) => itinerary.mode_of_transport === filterTransport);
    }

    setFilteredItineraries(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterDays('');
    setFilterPax('');
    setFilterTransport('');
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

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      if (data.rates && data.rates.INR) {
        setExchangeRate(data.rates.INR);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  };

  const fetchItineraries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('itineraries')
        .select('*, destinations(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItineraries(data || []);
    } catch (error) {
      console.error('Error fetching itineraries:', error);
      Alert.alert('Error', 'Failed to load itineraries');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      destination_id: '',
      destination_name: '',
      name: '',
      days: '1',
      no_of_pax: '2',
      full_itinerary: '',
      inclusions_driver: '',
      exclusions_driver: '',
      cost_usd_driver: '',
      inclusions_self_drive_cab: '',
      exclusions_self_drive_cab: '',
      cost_usd_self_drive_cab: '',
      inclusions_self_drive_scooter: '',
      exclusions_self_drive_scooter: '',
      cost_usd_self_drive_scooter: '',
      important_notes: '',
      disclaimers: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (itinerary: Itinerary) => {
    const transportMode = itinerary.mode_of_transport;
    const baseName = itinerary.name
      .replace(' (Driver with Cab)', '')
      .replace(' (Self Drive Cab)', '')
      .replace(' (Self Drive Scooter)', '');

    setFormData({
      destination_id: itinerary.destination_id || '',
      destination_name: itinerary.destinations?.name || '',
      name: baseName,
      days: itinerary.days.toString(),
      no_of_pax: itinerary.no_of_pax.toString(),
      full_itinerary: itinerary.full_itinerary,
      inclusions_driver: transportMode === 'driver_with_cab' ? itinerary.inclusions : '',
      exclusions_driver: transportMode === 'driver_with_cab' ? itinerary.exclusions : '',
      cost_usd_driver: transportMode === 'driver_with_cab' ? itinerary.cost_usd.toString() : '',
      inclusions_self_drive_cab: transportMode === 'self_drive_cab' ? itinerary.inclusions : '',
      exclusions_self_drive_cab: transportMode === 'self_drive_cab' ? itinerary.exclusions : '',
      cost_usd_self_drive_cab: transportMode === 'self_drive_cab' ? itinerary.cost_usd.toString() : '',
      inclusions_self_drive_scooter: transportMode === 'self_drive_scooter' ? itinerary.inclusions : '',
      exclusions_self_drive_scooter: transportMode === 'self_drive_scooter' ? itinerary.exclusions : '',
      cost_usd_self_drive_scooter: transportMode === 'self_drive_scooter' ? itinerary.cost_usd.toString() : '',
      important_notes: itinerary.important_notes || '',
      disclaimers: itinerary.disclaimers || '',
    });
    setEditingId(itinerary.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.destination_id) {
      Alert.alert('Error', 'Please select a destination');
      return;
    }

    if (!formData.name || !formData.days || !formData.no_of_pax || !formData.full_itinerary) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const hasDriverData = formData.inclusions_driver && formData.cost_usd_driver;
    const hasSelfDriveCabData = formData.inclusions_self_drive_cab && formData.cost_usd_self_drive_cab;
    const hasSelfDriveScooterData = formData.inclusions_self_drive_scooter && formData.cost_usd_self_drive_scooter;

    if (!hasDriverData && !hasSelfDriveCabData && !hasSelfDriveScooterData) {
      Alert.alert('Error', 'Please provide at least one complete transport mode (inclusions and cost)');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const itinerary = itineraries.find(i => i.id === editingId);
        if (!itinerary) throw new Error('Itinerary not found');

        const transportMode = itinerary.mode_of_transport;
        let updateData: any = {
          name: formData.name,
          destination_id: formData.destination_id,
          days: parseInt(formData.days),
          no_of_pax: parseInt(formData.no_of_pax),
          full_itinerary: formData.full_itinerary,
          important_notes: formData.important_notes,
          disclaimers: formData.disclaimers,
          updated_at: new Date().toISOString(),
        };

        if (transportMode === 'driver_with_cab' && hasDriverData) {
          updateData = {
            ...updateData,
            name: `${formData.name} (Driver with Cab)`,
            inclusions: formData.inclusions_driver,
            exclusions: formData.exclusions_driver,
            cost_usd: parseFloat(formData.cost_usd_driver),
            cost_inr: parseFloat(formData.cost_usd_driver) * exchangeRate,
          };
        } else if (transportMode === 'self_drive_cab' && hasSelfDriveCabData) {
          updateData = {
            ...updateData,
            name: `${formData.name} (Self Drive Cab)`,
            inclusions: formData.inclusions_self_drive_cab,
            exclusions: formData.exclusions_self_drive_cab,
            cost_usd: parseFloat(formData.cost_usd_self_drive_cab),
            cost_inr: parseFloat(formData.cost_usd_self_drive_cab) * exchangeRate,
          };
        } else if (transportMode === 'self_drive_scooter' && hasSelfDriveScooterData) {
          updateData = {
            ...updateData,
            name: `${formData.name} (Self Drive Scooter)`,
            inclusions: formData.inclusions_self_drive_scooter,
            exclusions: formData.exclusions_self_drive_scooter,
            cost_usd: parseFloat(formData.cost_usd_self_drive_scooter),
            cost_inr: parseFloat(formData.cost_usd_self_drive_scooter) * exchangeRate,
          };
        } else {
          Alert.alert('Error', 'Please fill in the transport mode data that matches the current itinerary');
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from('itineraries')
          .update(updateData)
          .eq('id', editingId);

        if (error) throw error;

        Alert.alert('Success', 'Itinerary updated successfully');
      } else {
        const itinerariesToCreate: any[] = [];

        if (hasDriverData) {
          itinerariesToCreate.push({
            name: `${formData.name} (Driver with Cab)`,
            destination_id: formData.destination_id,
            days: parseInt(formData.days),
            no_of_pax: parseInt(formData.no_of_pax),
            full_itinerary: formData.full_itinerary,
            inclusions: formData.inclusions_driver,
            exclusions: formData.exclusions_driver,
            cost_usd: parseFloat(formData.cost_usd_driver),
            cost_inr: parseFloat(formData.cost_usd_driver) * exchangeRate,
            mode_of_transport: 'driver_with_cab',
            important_notes: formData.important_notes,
            disclaimers: formData.disclaimers,
            created_by: user?.id,
          });
        }

        if (hasSelfDriveCabData) {
          itinerariesToCreate.push({
            name: `${formData.name} (Self Drive Cab)`,
            destination_id: formData.destination_id,
            days: parseInt(formData.days),
            no_of_pax: parseInt(formData.no_of_pax),
            full_itinerary: formData.full_itinerary,
            inclusions: formData.inclusions_self_drive_cab,
            exclusions: formData.exclusions_self_drive_cab,
            cost_usd: parseFloat(formData.cost_usd_self_drive_cab),
            cost_inr: parseFloat(formData.cost_usd_self_drive_cab) * exchangeRate,
            mode_of_transport: 'self_drive_cab',
            important_notes: formData.important_notes,
            disclaimers: formData.disclaimers,
            created_by: user?.id,
          });
        }

        if (hasSelfDriveScooterData) {
          itinerariesToCreate.push({
            name: `${formData.name} (Self Drive Scooter)`,
            destination_id: formData.destination_id,
            days: parseInt(formData.days),
            no_of_pax: parseInt(formData.no_of_pax),
            full_itinerary: formData.full_itinerary,
            inclusions: formData.inclusions_self_drive_scooter,
            exclusions: formData.exclusions_self_drive_scooter,
            cost_usd: parseFloat(formData.cost_usd_self_drive_scooter),
            cost_inr: parseFloat(formData.cost_usd_self_drive_scooter) * exchangeRate,
            mode_of_transport: 'self_drive_scooter',
            important_notes: formData.important_notes,
            disclaimers: formData.disclaimers,
            created_by: user?.id,
          });
        }

        const { error } = await supabase.from('itineraries').insert(itinerariesToCreate);

        if (error) throw error;

        Alert.alert(
          'Success',
          `Created ${itinerariesToCreate.length} itinerary variant(s) successfully`
        );
      }

      resetForm();
      fetchItineraries();
    } catch (error: any) {
      console.error('Error saving itinerary:', error);
      Alert.alert('Error', error.message || 'Failed to save itinerary');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Itinerary',
      'Are you sure you want to delete this itinerary?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('itineraries').delete().eq('id', id);
              if (error) throw error;
              fetchItineraries();
              Alert.alert('Success', 'Itinerary deleted');
            } catch (error) {
              console.error('Error deleting itinerary:', error);
              Alert.alert('Error', 'Failed to delete itinerary');
            }
          },
        },
      ]
    );
  };

  const handleCopy = async (itinerary: Itinerary) => {
    const text = `
${itinerary.name}
${itinerary.days} Days | ${itinerary.no_of_pax} Passengers

Full Itinerary:
${itinerary.full_itinerary}

Inclusions:
${itinerary.inclusions}

Exclusions:
${itinerary.exclusions || 'N/A'}

Cost: $${itinerary.cost_usd} (₹${itinerary.cost_inr.toFixed(2)})

${itinerary.important_notes ? `Important Notes:\n${itinerary.important_notes}\n\n` : ''}${itinerary.disclaimers ? `Disclaimers:\n${itinerary.disclaimers}` : ''}
    `.trim();

    await Clipboard.setStringAsync(text);
    Alert.alert('Success', 'Itinerary copied to clipboard');
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
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Itineraries</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addButton}>
          <Plus size={24} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search itineraries..."
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
        >
          <Filter size={20} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
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
            placeholder="Passengers"
            keyboardType="numeric"
          />
          <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {filteredItineraries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No itineraries found</Text>
          </View>
        ) : (
          filteredItineraries.map((itinerary) => (
            <View key={itinerary.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{itinerary.name}</Text>
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
              <View style={styles.cardDetails}>
                <Text style={styles.cardDetail}>{itinerary.days} Days</Text>
                <Text style={styles.cardDetail}>•</Text>
                <Text style={styles.cardDetail}>{itinerary.no_of_pax} Pax</Text>
                <Text style={styles.cardDetail}>•</Text>
                <Text style={styles.cardDetail}>${itinerary.cost_usd}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(itinerary)}
                  style={styles.actionButton}
                >
                  <Edit size={18} color="#8b5cf6" />
                  <Text style={[styles.actionButtonText, styles.editText]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleCopy(itinerary)}
                  style={styles.actionButton}
                >
                  <Copy size={18} color="#3b82f6" />
                  <Text style={styles.actionButtonText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(itinerary.id)}
                  style={styles.actionButton}
                >
                  <Trash2 size={18} color="#ef4444" />
                  <Text style={[styles.actionButtonText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showForm}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Itinerary' : 'Add New Itinerary'}
            </Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Destination *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDestinationPicker(true)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !formData.destination_name && styles.placeholderText,
                  ]}
                >
                  {formData.destination_name || 'Select a destination'}
                </Text>
                <ChevronDown size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Itinerary Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g., Magical Leh Adventure"
              />
              <Text style={styles.hint}>Transport mode will be added automatically</Text>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Number of Days *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.days}
                  onChangeText={(text) => setFormData({ ...formData, days: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Number of Passengers *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.no_of_pax}
                  onChangeText={(text) => setFormData({ ...formData, no_of_pax: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Itinerary *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.full_itinerary}
                onChangeText={(text) => setFormData({ ...formData, full_itinerary: text })}
                placeholder="Day-wise itinerary details"
                multiline
                numberOfLines={6}
              />
            </View>

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Transport Mode Options</Text>
              <Text style={styles.sectionSubtitle}>
                Fill at least one transport mode completely
              </Text>
            </View>

            <View style={styles.transportSection}>
              <Text style={styles.transportTitle}>🚗 Driver with Cab</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Inclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.inclusions_driver}
                  onChangeText={(text) =>
                    setFormData({ ...formData, inclusions_driver: text })
                  }
                  placeholder="What's included"
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Exclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.exclusions_driver}
                  onChangeText={(text) =>
                    setFormData({ ...formData, exclusions_driver: text })
                  }
                  placeholder="What's not included"
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Cost (USD)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cost_usd_driver}
                  onChangeText={(text) =>
                    setFormData({ ...formData, cost_usd_driver: text })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>

            <View style={styles.transportSection}>
              <Text style={styles.transportTitle}>🚙 Self Drive Cab</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Inclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.inclusions_self_drive_cab}
                  onChangeText={(text) =>
                    setFormData({ ...formData, inclusions_self_drive_cab: text })
                  }
                  placeholder="What's included"
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Exclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.exclusions_self_drive_cab}
                  onChangeText={(text) =>
                    setFormData({ ...formData, exclusions_self_drive_cab: text })
                  }
                  placeholder="What's not included"
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Cost (USD)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cost_usd_self_drive_cab}
                  onChangeText={(text) =>
                    setFormData({ ...formData, cost_usd_self_drive_cab: text })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>

            <View style={styles.transportSection}>
              <Text style={styles.transportTitle}>🛵 Self Drive Scooter</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Inclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.inclusions_self_drive_scooter}
                  onChangeText={(text) =>
                    setFormData({ ...formData, inclusions_self_drive_scooter: text })
                  }
                  placeholder="What's included"
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Exclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.exclusions_self_drive_scooter}
                  onChangeText={(text) =>
                    setFormData({ ...formData, exclusions_self_drive_scooter: text })
                  }
                  placeholder="What's not included"
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Cost (USD)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cost_usd_self_drive_scooter}
                  onChangeText={(text) =>
                    setFormData({ ...formData, cost_usd_self_drive_scooter: text })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Important Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.important_notes}
                onChangeText={(text) => setFormData({ ...formData, important_notes: text })}
                placeholder="Important information for travelers"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Disclaimers</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.disclaimers}
                onChangeText={(text) => setFormData({ ...formData, disclaimers: text })}
                placeholder="Terms and conditions"
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Itinerary</Text>
              )}
            </TouchableOpacity>
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
            <Text style={styles.pickerTitle}>Select Destination</Text>
            <ScrollView style={styles.pickerList}>
              {destinations.map((dest) => (
                <TouchableOpacity
                  key={dest.id}
                  style={styles.pickerOption}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      destination_id: dest.id,
                      destination_name: dest.name,
                    });
                    setShowDestinationPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{dest.name}</Text>
                  {formData.destination_id === dest.id && (
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
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
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
  addButton: {
    padding: 8,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
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
  filterButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  clearButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
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
  cardDetails: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  cardDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  editText: {
    color: '#8b5cf6',
  },
  deleteText: {
    color: '#ef4444',
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
    marginBottom: 16,
  },
  formGroupHalf: {
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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
  transportSection: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
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
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
});
