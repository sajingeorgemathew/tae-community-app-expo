// Profile types — based on EXPO-01 supabase-contract.md

/** String literal union for profile roles */
export type ProfileRole = "member" | "tutor" | "admin";

/** Profile row as returned by select queries */
export interface Profile {
  id: string;
  full_name: string | null;
  program: string | null;
  grad_year: number | null;
  role: ProfileRole;
  avatar_path: string | null;
  headline: string | null;
  skills: string | null;
  current_work: string | null;
  qualifications: string | null;
  experience: string | null;
  is_disabled: boolean;
  is_listed_as_tutor: boolean;
  created_at: string;
}

/** Payload for updating a profile (all fields optional) */
export interface ProfileUpdate {
  full_name?: string;
  program?: string;
  grad_year?: number;
  avatar_path?: string;
  headline?: string;
  skills?: string;
  current_work?: string;
  qualifications?: string;
  experience?: string;
  is_listed_as_tutor?: boolean;
}

/** Payload for inserting/upserting a profile on signup */
export interface ProfileInsert {
  id: string;
  full_name?: string;
  program?: string;
  grad_year?: number;
  role?: ProfileRole;
}

/** Admin-only update fields */
export interface ProfileAdminUpdate {
  is_disabled?: boolean;
  role?: ProfileRole;
  is_listed_as_tutor?: boolean;
}
