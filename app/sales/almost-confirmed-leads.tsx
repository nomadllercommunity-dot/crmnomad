import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Lead } from '@/types';
import { ArrowLeft, Phone, MapPin, Users, AlertCircle } from 'lucide-react-native';

interface AlmostConfirmedLead extends Lead {
  last_follow_up_date: string;
  follow_up_remark: string | null;
}

export default function AlmostConfirmedLeadsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<AlmostConfirmedLead[]>([]);

  useEffect(() => {
    fetchAlmostConfirmedLeads();
  }, [user?.id]);

  const fetchAlmostConfirmedLeads = async () => {
    try {
      const { data: followUpData, error: followUpError } = await supabase
        .from('follow_ups')
        .select('lead_id, follow_up_date, follow_up_note, remark')
        .eq('sales_person_id', user?.id)
        .eq('action_type', 'almost_confirmed')
        .order('follow_up_date', { ascending: false });

      if (followUpError) throw followUpError;

      const leadIds = [...new Set((followUpData || []).map((f: any) => f.lead_id))];

      if (leadIds.length === 0) {
        setLeads([]);
        setLoading(false);
        return;
      }

      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .in('id', leadIds);

      if (leadsError) throw leadsError;

      const leadsWithFollowUp = (leadsData || []).map((lead: Lead) => {
        const followUp = followUpData?.find((f: any) => f.lead_id === lead.id);
        return {
          ...lead,
          last_follow_up_date: followUp?.follow_up_date || '',
          follow_up_remark: followUp?.follow_up_note || followUp?.remark || null,
        };
      });

      setLeads(leadsWithFollowUp);
    } catch (err: any) {
      console.error('Error fetching almost confirmed leads:', err);
      Alert.alert('Error', 'Failed to load almost confirmed leads');
    } finally {
      setLoading(false);
    }
  };

  const handleLeadPress = (leadId: string) => {
    router.push({
      pathname: '/sales/lead-action',
      params: { leadId },
    });
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
        <Text style={styles.headerTitle}>Almost Confirmed Leads</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {leads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={48} color="#999" />
            <Text style={styles.emptyText}>No almost confirmed leads yet</Text>
          </View>
        ) : (
          <>
            <Text style={styles.countText}>{leads.length} lead{leads.length !== 1 ? 's' : ''}</Text>
            {leads.map((lead) => (
              <TouchableOpacity
                key={lead.id}
                style={styles.leadCard}
                onPress={() => handleLeadPress(lead.id)}
              >
                <View style={styles.leadHeader}>
                  <Text style={styles.leadName}>{lead.client_name}</Text>
                  <View style={[styles.leadTypeBadge, { backgroundColor: '#fef3c7' }]}>
                    <Text style={styles.leadTypeText}>{lead.lead_type.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.leadDetails}>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color="#666" />
                    <Text style={styles.detailText}>{lead.place}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Users size={16} color="#666" />
                    <Text style={styles.detailText}>{lead.no_of_pax} Pax</Text>
                  </View>

                  {lead.contact_number && (
                    <View style={styles.detailRow}>
                      <Phone size={16} color="#666" />
                      <Text style={styles.detailText}>{lead.contact_number}</Text>
                    </View>
                  )}
                </View>

                {lead.follow_up_remark && (
                  <View style={styles.remarkSection}>
                    <Text style={styles.remarkLabel}>Latest Note:</Text>
                    <Text style={styles.remarkText}>{lead.follow_up_remark}</Text>
                  </View>
                )}

                <View style={styles.footerRow}>
                  <Text style={styles.followUpDate}>
                    Updated: {new Date(lead.last_follow_up_date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.actionText}>Tap to update</Text>
                </View>
              </TouchableOpacity>
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
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  leadTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  leadTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
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
  remarkSection: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  remarkLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 4,
  },
  remarkText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  followUpDate: {
    fontSize: 12,
    color: '#999',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
});
