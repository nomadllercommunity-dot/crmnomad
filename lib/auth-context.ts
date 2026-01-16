import { supabase } from './supabase';

export async function setUserContext(userId: string) {
  try {
    await supabase.rpc('set_user_context', { user_id: userId });
  } catch (error) {
    console.warn('Could not set user context:', error);
  }
}
