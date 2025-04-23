import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

export async function getFormations(
  page = 1,
  pageSize = 500,
  filters: Record<string, any> = {},
  sortBy?: string,
  sortDirection?: 'asc' | 'desc'
) {
  let query = supabase
    .from('formations')
    .select('*', { count: 'exact' })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // Apply filters
  if (filters.search) {
    query = query.or(
      `etablissement.ilike.%${filters.search}%,filiere.ilike.%${filters.search}%,ville.ilike.%${filters.search}%`
    );
  }

  if (filters.type && filters.type.length > 0) {
    query = query.in('voie', filters.type);
  }

  if (filters.departement) {
    query = query.eq('departement', filters.departement);
  }

  if (filters.ville) {
    query = query.eq('ville', filters.ville);
  }

  // Apply sorting
  if (sortBy) {
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching formations:', error);
    throw error;
  }

  return { data, count };
}

export async function getFormationById(id: number) {
  const { data, error } = await supabase
    .from('formations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching formation:', error);
    throw error;
  }

  return data;
}

export async function getUserTokens() {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    return 0;
  }
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('tokens')
    .eq('user_id', user.user.id)
    .single();

  if (error) {
    console.error('Error fetching user tokens:', error);
    return 0;
  }

  return data?.tokens || 0;
}

export async function useToken(formationId: number) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }
  
  // Start a transaction
  const { data, error } = await supabase.rpc('use_token_for_formation', {
    p_user_id: user.user.id,
    p_formation_id: formationId
  });
  
  if (error) {
    console.error('Error using token:', error);
    throw error;
  }
  
  return data;
}