import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, MapPin, Users, Calendar, CheckCircle } from 'lucide-react-native';

export default function ConfirmedLeadsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', user?.id)
        .eq('status', 'confirmed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching confirmed leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const allocateToOperations = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'allocated_to_operations', updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      Alert.alert('Success', 'Lead allocated to operations');
      fetchLeads();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
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
        <Text style={styles.headerTitle}>Confirmed Leads</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {leads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No confirmed leads</Text>
          </View>
        ) : (
          leads.map((lead) => (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <Text style={styles.leadName}>{lead.client_name}</Text>
                <View style={styles.confirmedBadge}>
                  <View style={styles.badgeContent}>
                    <View style={styles.iconContainer}>
                      <CheckCircle size={16} color="#10b981" />
                    </View>
                    <Text style={styles.confirmedBadgeText}>CONFIRMED</Text>
                  </View>
                </View>
              </View>

              <View style={styles.leadDetails}>
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <MapPin size={16} color="#666" />
                    </View>
                    <Text style={styles.detailText}>{lead.place}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <Users size={16} color="#666" />
                    </View>
                    <Text style={styles.detailText}>{lead.no_of_pax} Pax</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <Calendar size={16} color="#666" />
                    </View>
                    <Text style={styles.detailText}>
                      {lead.travel_date || lead.travel_month || 'Date TBD'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.allocateButton}
                onPress={() => allocateToOperations(lead.id)}
              >
                <Text style={styles.allocateButtonText}>Allocate to Operations</Text>
              </TouchableOpacity>
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leadName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  confirmedBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmedBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  leadDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 4,
  },
  detailRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  allocateButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  allocateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
