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
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Copy, Edit } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Itinerary {
  id: string;
  name: string;
  days: number;
  full_itinerary: string;
  inclusions: string;
  exclusions: string;
  cost_usd: number;
  created_by: string;
  created_at: string;
}

export default function SavedItineraryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    days: '1',
    full_itinerary: '',
    inclusions: '',
    exclusions: '',
    cost_usd: '',
  });

  useEffect(() => {
    fetchItineraries();
    fetchExchangeRate();
  }, []);

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
        .select('*')
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

  const handleEdit = (itinerary: Itinerary) => {
    setFormData({
      name: itinerary.name,
      days: itinerary.days.toString(),
      full_itinerary: itinerary.full_itinerary,
      inclusions: itinerary.inclusions,
      exclusions: itinerary.exclusions,
      cost_usd: itinerary.cost_usd.toString(),
    });
    setEditingId(itinerary.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.days || !formData.full_itinerary || !formData.cost_usd) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const { error } = await supabase
          .from('itineraries')
          .update({
            name: formData.name,
            days: parseInt(formData.days),
            full_itinerary: formData.full_itinerary,
            inclusions: formData.inclusions,
            exclusions: formData.exclusions,
            cost_usd: parseFloat(formData.cost_usd),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Success', 'Itinerary updated successfully');
      } else {
        const { error } = await supabase
          .from('itineraries')
          .insert([{
            name: formData.name,
            days: parseInt(formData.days),
            full_itinerary: formData.full_itinerary,
            inclusions: formData.inclusions,
            exclusions: formData.exclusions,
            cost_usd: parseFloat(formData.cost_usd),
            created_by: user?.id,
          }]);

        if (error) throw error;
        Alert.alert('Success', 'Itinerary saved successfully');
      }

      setFormData({
        name: '',
        days: '1',
        full_itinerary: '',
        inclusions: '',
        exclusions: '',
        cost_usd: '',
      });
      setEditingId(null);
      setShowForm(false);
      fetchItineraries();
    } catch (error) {
      console.error('Error saving itinerary:', error);
      Alert.alert('Error', 'Failed to save itinerary');
    } finally {
      setSaving(false);
    }
  };

  const copyPackage = (itinerary: Itinerary) => {
    const finalExchangeRate = exchangeRate + 2;
    const costINR = (itinerary.cost_usd * finalExchangeRate).toFixed(2);

    const packageText = `
🌟 ${itinerary.name}
━━━━━━━━━━━━━━━━━━━━

📅 Duration: ${itinerary.days} Days

📍 FULL ITINERARY:
${itinerary.full_itinerary}

✅ INCLUSIONS:
${itinerary.inclusions}

❌ EXCLUSIONS:
${itinerary.exclusions}

💰 PACKAGE COST:
• USD: $${itinerary.cost_usd}
• INR: ₹${costINR}
(Exchange Rate: ${finalExchangeRate.toFixed(2)})

━━━━━━━━━━━━━━━━━━━━
Package prepared by
NOMADLLER PVT LTD
    `.trim();

    Clipboard.setString(packageText);
    Alert.alert('Success', 'Package details copied to clipboard!');
  };

  const calculateINR = (usd: string) => {
    if (!usd) return '0.00';
    const finalRate = exchangeRate + 2;
    return (parseFloat(usd) * finalRate).toFixed(2);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Itineraries</Text>
        <TouchableOpacity
          onPress={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingId(null);
              setFormData({
                name: '',
                days: '1',
                full_itinerary: '',
                inclusions: '',
                exclusions: '',
                cost_usd: '',
              });
            }
          }}
          style={styles.addButton}
        >
          <Plus size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingId ? 'Edit Itinerary' : 'Add New Itinerary'}
            </Text>

            <Text style={styles.label}>Itinerary Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="e.g., Bali Adventure Package"
            />

            <Text style={styles.label}>Number of Days *</Text>
            <TextInput
              style={styles.input}
              value={formData.days}
              onChangeText={(text) => setFormData({ ...formData, days: text })}
              placeholder="e.g., 7"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Full Itinerary *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.full_itinerary}
              onChangeText={(text) => setFormData({ ...formData, full_itinerary: text })}
              placeholder="Day 1: Arrival and hotel check-in&#10;Day 2: City tour..."
              multiline
              numberOfLines={6}
            />

            <Text style={styles.label}>Inclusions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.inclusions}
              onChangeText={(text) => setFormData({ ...formData, inclusions: text })}
              placeholder="• Hotel accommodation&#10;• Daily breakfast&#10;• Airport transfers..."
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Exclusions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.exclusions}
              onChangeText={(text) => setFormData({ ...formData, exclusions: text })}
              placeholder="• International flights&#10;• Personal expenses&#10;• Travel insurance..."
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Cost in USD *</Text>
            <TextInput
              style={styles.input}
              value={formData.cost_usd}
              onChangeText={(text) => setFormData({ ...formData, cost_usd: text })}
              placeholder="e.g., 1500"
              keyboardType="decimal-pad"
            />

            {formData.cost_usd && (
              <View style={styles.conversionBox}>
                <Text style={styles.conversionText}>
                  Exchange Rate: {(exchangeRate + 2).toFixed(2)}
                </Text>
                <Text style={styles.conversionAmount}>
                  INR: ₹{calculateINR(formData.cost_usd)}
                </Text>
              </View>
            )}

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    name: '',
                    days: '1',
                    full_itinerary: '',
                    inclusions: '',
                    exclusions: '',
                    cost_usd: '',
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingId ? 'Update Itinerary' : 'Save Itinerary'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {itineraries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No saved itineraries yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first itinerary</Text>
          </View>
        ) : (
          itineraries.map((itinerary) => (
            <View key={itinerary.id} style={styles.itineraryCard}>
              <View style={styles.itineraryHeader}>
                <Text style={styles.itineraryName}>{itinerary.name}</Text>
                <TouchableOpacity
                  onPress={() => handleEdit(itinerary)}
                  style={styles.actionButton}
                >
                  <Edit size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.itineraryDays}>{itinerary.days} Days</Text>

              <View style={styles.itinerarySection}>
                <Text style={styles.sectionTitle}>Itinerary:</Text>
                <Text style={styles.sectionText} numberOfLines={3}>
                  {itinerary.full_itinerary}
                </Text>
              </View>

              {itinerary.inclusions && (
                <View style={styles.itinerarySection}>
                  <Text style={styles.sectionTitle}>Inclusions:</Text>
                  <Text style={styles.sectionText} numberOfLines={2}>
                    {itinerary.inclusions}
                  </Text>
                </View>
              )}

              {itinerary.exclusions && (
                <View style={styles.itinerarySection}>
                  <Text style={styles.sectionTitle}>Exclusions:</Text>
                  <Text style={styles.sectionText} numberOfLines={2}>
                    {itinerary.exclusions}
                  </Text>
                </View>
              )}

              <View style={styles.costContainer}>
                <View>
                  <Text style={styles.costLabel}>Cost:</Text>
                  <Text style={styles.costUSD}>${itinerary.cost_usd}</Text>
                  <Text style={styles.costINR}>
                    ₹{(itinerary.cost_usd * (exchangeRate + 2)).toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyPackage(itinerary)}
                >
                  <Copy size={20} color="#fff" />
                  <Text style={styles.copyButtonText}>Copy Package</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F9F9F9',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  conversionBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  conversionText: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  conversionAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  itineraryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itineraryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  actionButton: {
    padding: 4,
  },
  itineraryDays: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 12,
  },
  itinerarySection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  costContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  costLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  costUSD: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  costINR: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
