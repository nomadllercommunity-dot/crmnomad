import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, Phone, MessageCircle, MapPin, Users, DollarSign, Calendar } from 'lucide-react-native';

export default function HotLeadsScreen() {
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
        .eq('lead_type', 'hot')
        .in('status', ['hot', 'allocated', 'follow_up'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching hot leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening dialer:', err);
    });
  };

  const handleWhatsApp = (phoneNumber: string, clientName: string, place: string) => {
    // Remove any spaces, dashes, or special characters from phone number
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    const message = `Hello ${clientName}, I'm reaching out regarding your travel inquiry for ${place}.`;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening WhatsApp:', err);
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hot Leads</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {leads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hot leads</Text>
          </View>
        ) : (
          leads.map((lead) => (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <Text style={styles.leadName}>{lead.client_name}</Text>
                <View style={styles.hotBadge}>
                  <Text style={styles.hotBadgeText}>HOT</Text>
                </View>
              </View>

              <View style={styles.leadDetails}>
                {lead.contact_number && (
                  <View style={styles.detailRow}>
                    <Phone size={16} color="#666" />
                    <Text style={styles.detailText}>{lead.contact_number}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <MapPin size={16} color="#666" />
                  <Text style={styles.detailText}>{lead.place}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Users size={16} color="#666" />
                  <Text style={styles.detailText}>{lead.no_of_pax} Pax</Text>
                </View>
                <View style={styles.detailRow}>
                  <Calendar size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {lead.travel_date || lead.travel_month || 'Date TBD'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <DollarSign size={16} color="#666" />
                  <Text style={styles.detailText}>₹{lead.expected_budget}</Text>
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
                  style={[styles.actionButton, styles.callButton, !lead.contact_number && styles.disabledButton]}
                  onPress={() => lead.contact_number && handleCall(lead.contact_number)}
                  disabled={!lead.contact_number}
                >
                  <Phone size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.whatsappButton, !lead.contact_number && styles.disabledButton]}
                  onPress={() => lead.contact_number && handleWhatsApp(lead.contact_number, lead.client_name, lead.place)}
                  disabled={!lead.contact_number}
                >
                  <MessageCircle size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>WhatsApp</Text>
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
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
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
  hotBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  hotBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  leadDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  remarkContainer: {
    backgroundColor: '#fef2f2',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
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
  disabledButton: {
    opacity: 0.5,
  },
});
