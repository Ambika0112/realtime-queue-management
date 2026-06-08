export type QueueStatus = "active" | "paused" | "disabled";
export interface Queue {
  id: string;
  name: string;
  description: string | null;
  status: QueueStatus;
  current_token: number;
  last_reset_date: string | null;
  max_capacity: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}