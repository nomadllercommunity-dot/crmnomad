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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Edit, Trash2, Search, MapPin } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { setUserContext } from '@/lib/auth-context';
import { useAuth } from '@/contexts/AuthContext';

interface Destination {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ManageDestinationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    is_active: true,
  });

  useEffect(() => {
    fetchDestinations();
  }, []);

  useEffect(() => {
    filterDestinations();
  }, [destinations, searchQuery]);

  const filterDestinations = () => {
    let filtered = [...destinations];

    if (searchQuery) {
      filtered = filtered.filter((destination) =>
        destination.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredDestinations(filtered);
  };

  const fetchDestinations = async () => {
    if (user?.id) {
      await setUserContext(user.id);
    }

    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setDestinations(data || []);
      setFilteredDestinations(data || []);
    } catch (err: any) {
      console.error('Error fetching destinations:', err);
      Alert.alert('Error', 'Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (destination: Destination) => {
    setFormData({
      name: destination.name,
      is_active: destination.is_active,
    });
    setEditingId(destination.id);
    setShowForm(true);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Destination',
      `Are you sure you want to delete "${name}"? This will not delete associated itineraries but will remove the link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(id),
        },
      ]
    );
  };

  const performDelete = async (id: string) => {
    try {
      if (user?.id) {
        await setUserContext(user.id);
      }

      const { error } = await supabase.from('destinations').delete().eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Destination deleted successfully');
      fetchDestinations();
    } catch (err: any) {
      console.error('Error deleting destination:', err);
      Alert.alert('Error', err.message || 'Failed to delete destination');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Destination name is required');
      return;
    }

    setSaving(true);
    try {
      if (user?.id) {
        await setUserContext(user.id);
      }

      if (editingId) {
        const { error } = await supabase
          .from('destinations')
          .update({
            name: formData.name.trim(),
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Success', 'Destination updated successfully');
      } else {
        const { error } = await supabase.from('destinations').insert({
          name: formData.name.trim(),
          is_active: formData.is_active,
        });

        if (error) throw error;
        Alert.alert('Success', 'Destination added successfully');
      }

      resetForm();
      fetchDestinations();
    } catch (err: any) {
      console.error('Error saving destination:', err);
      Alert.alert('Error', err.message || 'Failed to save destination');
    } finally {
      setSaving(false);
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
        <Text style={styles.headerTitle}>Manage Destinations</Text>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          style={styles.addButton}
        >
          <Plus size={24} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingId ? 'Edit Destination' : 'Add New Destination'}
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Destination Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="e.g., Leh Ladakh"
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Active Status</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_active: value })
                }
                trackColor={{ false: '#d1d5db', true: '#a78bfa' }}
                thumbColor={formData.is_active ? '#8b5cf6' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.hint}>
              Only active destinations appear in dropdowns
            </Text>
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              onPress={resetForm}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.button, styles.saveButton]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update' : 'Add'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Search size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search destinations..."
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {filteredDestinations.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No destinations found' : 'No destinations yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try a different search term'
                : 'Add your first destination to get started'}
            </Text>
          </View>
        ) : (
          filteredDestinations.map((destination) => (
            <View key={destination.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <MapPin size={20} color="#8b5cf6" />
                  <Text style={styles.cardTitle}>{destination.name}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    destination.is_active ? styles.activeBadge : styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      destination.is_active ? styles.activeText : styles.inactiveText,
                    ]}
                  >
                    {destination.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(destination)}
                  style={styles.actionButton}
                >
                  <Edit size={18} color="#3b82f6" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(destination.id, destination.name)}
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
  formCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#8b5cf6',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
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
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#065f46',
  },
  inactiveText: {
    color: '#991b1b',
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
  deleteText: {
    color: '#ef4444',
  },
});
