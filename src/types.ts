export type Role = 'admin' | 'volunteer';
export type ShiftType = 'morning' | 'afternoon';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Signup {
  id: string;
  shift_date: string;       // 'YYYY-MM-DD'
  shift_type: ShiftType;
  volunteer_id: string;
  is_fulfilled: boolean;
  fulfilled_at: string | null;
  created_at: string;
  volunteer: Profile;       // joined
}

export interface Comment {
  id: string;
  shift_date: string;
  shift_type: ShiftType;
  author_id: string;
  content: string;
  is_coverage_request: boolean;
  created_at: string;
  author: Profile;          // joined
}

export interface ClosedDate {
  id: string;
  date: string;             // 'YYYY-MM-DD'
  reason: string | null;
  created_by: string;
  created_at: string;
}

// Static shift configuration – single source of truth
export interface ShiftConfig {
  type: ShiftType;
  label: string;
  time: string;
  maxSlots: number;
}

export const SHIFTS: ShiftConfig[] = [
  { type: 'morning',   label: 'Morning',   time: '8:00 AM – 12:00 PM', maxSlots: 2 },
  { type: 'afternoon', label: 'Afternoon', time: '12:00 PM – 4:00 PM', maxSlots: 3 },
];
