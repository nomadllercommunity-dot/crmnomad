import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, Phone, MessageCircle, MapPin, Users, DollarSign, Calendar } from 'lucide-react-native';

export default function AllocatedLeadsScreen() {
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
        .eq('status', 'allocated')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (lead: Lead) => {
    router.push({
      pathname: '/sales/lead-action',
      params: { leadId: lead.id },
    });
  };

  const handleWhatsApp = (lead: Lead) => {
    const message = `Hello ${lead.client_name}, I'm reaching out regarding your travel inquiry for ${lead.place}.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
    });
  };

  const getLeadTypeColor = (type: string) => {
    switch (type) {
      case 'hot': return '#ef4444';
      case 'urgent': return '#f59e0b';
      default: return '#3b82f6';
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
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Allocated Leads</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {leads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No allocated leads</Text>
          </View>
        ) : (
          leads.map((lead) => (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <Text style={styles.leadName}>{lead.client_name}</Text>
                <View style={[styles.typeBadge, { backgroundColor: getLeadTypeColor(lead.lead_type) }]}>
                  <Text style={styles.typeBadgeText}>{lead.lead_type.toUpperCase()}</Text>
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
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <DollarSign size={16} color="#666" />
                    </View>
                    <Text style={styles.detailText}>₹{lead.expected_budget}</Text>
                  </View>
                </View>
              </View>

              {lead.remark && (
                <View style={styles.remarkContainer}>
                  <Text style={styles.remarkLabel}>Remark:</Text>
                  <Text style={styles.remarkText}>{lead.remark}</Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.callButton]}
                  onPress={() => handleCall(lead)}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.iconContainer}>
                      <Phone size={20} color="#fff" />
                    </View>
                    <Text style={styles.actionButtonText}>Call</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.whatsappButton]}
                  onPress={() => handleWhatsApp(lead)}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.iconContainer}>
                      <MessageCircle size={20} color="#fff" />
                    </View>
                    <Text style={styles.actionButtonText}>WhatsApp</Text>
                  </View>
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
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#fff',
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
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  remarkContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  remarkLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  remarkText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButton: {
    backgroundColor: '#3b82f6',
  },
  whatsappButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
