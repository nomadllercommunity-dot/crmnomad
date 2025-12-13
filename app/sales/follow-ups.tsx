import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock } from 'lucide-react-native';

interface FollowUpWithLead {
  id: string;
  follow_up_date: string;
  status: string;
  remark: string;
  lead: {
    id: string;
    client_name: string;
    place: string;
    no_of_pax: number;
  };
}

export default function FollowUpsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<FollowUpWithLead[]>([]);
  const [showTodayOnly, setShowTodayOnly] = useState(false);

  useEffect(() => {
    fetchFollowUps();
  }, [showTodayOnly]);

  const fetchFollowUps = async () => {
    try {
      let query = supabase
        .from('follow_ups')
        .select(`
          *,
          lead:leads(id, client_name, place, no_of_pax)
        `)
        .eq('sales_person_id', user?.id)
        .eq('status', 'pending')
        .order('follow_up_date', { ascending: true });

      if (showTodayOnly) {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('follow_up_date', `${today}T00:00:00`).lt('follow_up_date', `${today}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFollowUps(data || []);
    } catch (err: any) {
      console.error('Error fetching follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const handleFollowUp = (followUp: FollowUpWithLead) => {
    router.push({
      pathname: '/sales/lead-action',
      params: { leadId: followUp.lead.id },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Ups</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !showTodayOnly && styles.filterButtonActive]}
          onPress={() => setShowTodayOnly(false)}
        >
          <Text style={[styles.filterButtonText, !showTodayOnly && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, showTodayOnly && styles.filterButtonActive]}
          onPress={() => setShowTodayOnly(true)}
        >
          <Text style={[styles.filterButtonText, showTodayOnly && styles.filterButtonTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {followUps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No follow-ups scheduled</Text>
          </View>
        ) : (
          followUps.map((followUp) => {
            const { date, time } = formatDateTime(followUp.follow_up_date);
            return (
              <TouchableOpacity
                key={followUp.id}
                style={styles.followUpCard}
                onPress={() => handleFollowUp(followUp)}
              >
                <View style={styles.followUpHeader}>
                  <Text style={styles.leadName}>{followUp.lead.client_name}</Text>
                </View>

                <View style={styles.followUpDetails}>
                  <Text style={styles.leadDetail}>
                    {followUp.lead.place} - {followUp.lead.no_of_pax} Pax
                  </Text>

                  <View style={styles.dateTimeRow}>
                    <View style={styles.dateTimeItem}>
                      <Calendar size={14} color="#666" />
                      <Text style={styles.dateTimeText}>{date}</Text>
                    </View>
                    <View style={styles.dateTimeItem}>
                      <Clock size={14} color="#666" />
                      <Text style={styles.dateTimeText}>{time}</Text>
                    </View>
                  </View>

                  {followUp.remark && (
                    <View style={styles.remarkContainer}>
                      <Text style={styles.remarkText}>{followUp.remark}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
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
  followUpCard: {
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
  followUpHeader: {
    marginBottom: 8,
  },
  leadName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  followUpDetails: {
    gap: 8,
  },
  leadDetail: {
    fontSize: 14,
    color: '#666',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  remarkContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  remarkText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
});
