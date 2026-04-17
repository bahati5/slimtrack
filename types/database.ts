/**
 * Types Supabase — à régénérer via `pnpm dlx supabase gen types typescript` une fois
 * les migrations appliquées sur ton projet. Pour l'instant un squelette aligné
 * sur `supabase/migrations/0001_schema.sql`.
 */

export type Sex = "F" | "M";
export type Role = "user" | "coach";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type ActivityType =
  | "youtube"
  | "gym"
  | "walk"
  | "run"
  | "cycling"
  | "swim"
  | "other";
export type DailyStatus = "complete" | "partial" | "empty";

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal_weight_kg: number | null;
  activity_level: number | null;
  deficit_kcal: number | null;
  tdee: number | null;
  target_kcal: number | null;
  coach_id: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  total_kcal_eaten: number;
  total_kcal_burned: number;
  total_steps: number;
  steps_kcal_burned: number;
  net_kcal: number;
  target_kcal: number | null;
  deficit_respected: boolean;
  coach_comment: string | null;
  coach_commented_at: string | null;
  status: DailyStatus;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  daily_log_id: string;
  name: string;
  meal_type: MealType;
  total_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  media_urls: string[] | null;
  eaten_at: string;
  notes: string | null;
  created_at: string;
}

export interface MealItem {
  id: string;
  meal_id: string;
  user_id: string;
  food_name: string;
  quantity_g: number;
  kcal_per_100g: number;
  kcal_total: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  created_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  daily_log_id: string;
  activity_type: ActivityType;
  name: string;
  youtube_url: string | null;
  youtube_thumbnail: string | null;
  duration_min: number | null;
  kcal_burned: number;
  steps: number | null;
  media_urls: string[] | null;
  notes: string | null;
  done_at: string;
  created_at: string;
}

export interface FoodItem {
  id: string;
  name: string;
  name_fr: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  category: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
  note: string | null;
  created_at: string;
}

export interface Measurement {
  id: string;
  user_id: string;
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  left_thigh_cm: number | null;
  right_thigh_cm: number | null;
  left_arm_cm: number | null;
  right_arm_cm: number | null;
  measured_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

/**
 * Squelette de Database pour @supabase/ssr. À remplacer par les types
 * générés par `supabase gen types`.
 */
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      daily_logs: {
        Row: DailyLog;
        Insert: Partial<DailyLog>;
        Update: Partial<DailyLog>;
      };
      meals: { Row: Meal; Insert: Partial<Meal>; Update: Partial<Meal> };
      meal_items: {
        Row: MealItem;
        Insert: Partial<MealItem>;
        Update: Partial<MealItem>;
      };
      activities: {
        Row: Activity;
        Insert: Partial<Activity>;
        Update: Partial<Activity>;
      };
      food_database: {
        Row: FoodItem;
        Insert: Partial<FoodItem>;
        Update: Partial<FoodItem>;
      };
      weight_logs: {
        Row: WeightLog;
        Insert: Partial<WeightLog>;
        Update: Partial<WeightLog>;
      };
      measurements: {
        Row: Measurement;
        Insert: Partial<Measurement>;
        Update: Partial<Measurement>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification>;
        Update: Partial<Notification>;
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: Partial<PushSubscription>;
        Update: Partial<PushSubscription>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: Role;
      sex_type: Sex;
      meal_type_enum: MealType;
      activity_type_enum: ActivityType;
      daily_status: DailyStatus;
    };
  };
};
