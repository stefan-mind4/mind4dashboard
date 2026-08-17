import { createClient } from '@supabase/supabase-js';
import type {
  AdjustmentRow,
  ClientRow,
  FeedbackRow,
  ReportRow,
} from '../types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen — .env aus .env.example anlegen.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

export async function getReports(): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('client,report_date,payload')
    .order('report_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReportRow[];
}

export async function getFeedback(): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('client,report_date,item_id,done,note,updated_at');
  if (error) throw error;
  return (data ?? []) as FeedbackRow[];
}

export async function upsertFeedback(
  row: Omit<FeedbackRow, 'updated_at'>,
): Promise<void> {
  const { error } = await supabase
    .from('feedback')
    .upsert({ ...row, updated_at: new Date().toISOString() }, {
      onConflict: 'client,report_date,item_id',
    });
  if (error) throw error;
}

export async function getClients(): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClientRow[];
}

export async function upsertClient(row: Partial<ClientRow> & { id: string }) {
  const { error } = await supabase
    .from('clients')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
}

export async function getAdjustments(): Promise<AdjustmentRow[]> {
  const { data, error } = await supabase
    .from('adjustments')
    .select('id,client,adj_date,text,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdjustmentRow[];
}

export async function addAdjustment(
  row: Omit<AdjustmentRow, 'id' | 'created_at'>,
): Promise<AdjustmentRow> {
  const { data, error } = await supabase
    .from('adjustments')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as AdjustmentRow;
}
