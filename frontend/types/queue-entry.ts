// Mirrors the backend EntryStatus enum
export type EntryStatus = "waiting" | "serving" | "completed" | "skipped" | "left";
export interface QueueEntry {
  id: string;
  queue_id: string;
  user_id: string;
  token_number: number;
  status: EntryStatus;
  created_at: string;
  updated_at: string;
}