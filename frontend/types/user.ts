// Mirrors the backend UserRole enum
export type UserRole = "customer" | "operator" | "admin";

export interface User {
  id: string;
  full_name: string;
  phone_number: string;
  role: UserRole;
  is_active: boolean;
}
