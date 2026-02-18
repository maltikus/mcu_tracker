import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { PendingSyncItem, ProgressRow } from '../types';

const PAGE_SIZE = 1000;

export const fetchProgressRows = async (userId: string): Promise<ProgressRow[]> => {
  const out: ProgressRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('progress_items')
      .select('id,user_id,item_key,watched,watched_at,updated_at')
      .eq('user_id', userId)
      .range(from, from + PAGE_SIZE - 1)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    const rows = (data ?? []) as ProgressRow[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return out;
};

export const upsertProgressRow = async (row: ProgressRow): Promise<PostgrestError | null> => {
  const { error } = await supabase.from('progress_items').upsert(row, {
    onConflict: 'user_id,item_key'
  });
  return error;
};

export const flushPendingRows = async (
  userId: string,
  pendingSync: Record<string, PendingSyncItem>
): Promise<{ synced: string[]; failed: string[] }> => {
  const entries = Object.values(pendingSync);
  const synced: string[] = [];
  const failed: string[] = [];

  for (const pending of entries) {
    const error = await upsertProgressRow({
      user_id: userId,
      item_key: pending.itemKey,
      watched: pending.watched,
      watched_at: pending.watchedAt ?? null,
      updated_at: pending.updatedAt
    });

    if (error) {
      failed.push(pending.itemKey);
    } else {
      synced.push(pending.itemKey);
    }
  }

  return { synced, failed };
};
