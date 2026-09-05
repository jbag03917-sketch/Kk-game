import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqqqwjcctdyhhhehftua.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XJeu38X_ySDbsgM21YLanQ_rwc2-tms';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

export interface SupabaseRoomEvent {
  type: 'PLAYER_JOIN' | 'PLAYER_LEAVE' | 'PLAYER_READY' | 'START_GAME' | 'SUBMIT_WORD' | 'PLAYER_TIMEOUT' | 'CHAT_MESSAGE' | 'SYNC_ROOM' | 'REQUEST_SYNC' | 'ROOMS_UPDATED';
  payload: any;
  senderId: string;
  timestamp: number;
}
