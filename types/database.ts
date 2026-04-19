/**
 * Types Supabase — squelette aligné sur les migrations.
 * À régénérer via `pnpm dlx supabase gen types typescript` une fois la base provisionnée.
 *
 * IMPORTANT : utiliser `type` (pas `interface`) pour la compatibilité avec
 * les index signatures requises par @supabase/supabase-js GenericTable.
 */

export type Sex = "F" | "M";
export type Role = "user" | "coach" | "admin";
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

export type Profile = {
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
  invite_code: string | null;
  can_edit_foods: boolean;
  timezone: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyLog = {
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
};

export type Meal = {
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
};

export type MealItem = {
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
};

export type MealComment = {
  id: string;
  meal_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type Activity = {
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
};

export type FoodItem = {
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
};

export type WeightLog = {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
  note: string | null;
  created_at: string;
};

export type Measurement = {
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
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  link_url: string | null;
};

export type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<R extends Record<string, unknown>> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: Rel[];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      daily_logs: Table<DailyLog>;
      meals: Table<Meal>;
      meal_items: Table<MealItem>;
      meal_comments: Table<MealComment>;
      activities: Table<Activity>;
      food_database: Table<FoodItem>;
      weight_logs: Table<WeightLog>;
      measurements: Table<Measurement>;
      notifications: Table<Notification>;
      push_subscriptions: Table<PushSubscription>;
    };
    Views: Record<string, never>;
    Functions: {
      get_or_create_daily_log: {
        Args: { p_date: string };
        Returns: DailyLog;
        SetofOptions: {
          isSetofReturn: false;
          isOneToOne: true;
          isNotNullable: false;
          to: "daily_logs";
          from: "get_or_create_daily_log";
        };
      };
      coach_claim_client: {
        Args: { p_code: string };
        Returns: Profile;
        SetofOptions: {
          isSetofReturn: false;
          isOneToOne: true;
          isNotNullable: false;
          to: "profiles";
          from: "coach_claim_client";
        };
      };
      coach_unassign_client: {
        Args: { p_client_id: string };
        Returns: undefined;
      };
      become_coach: {
        Args: Record<string, never>;
        Returns: Profile;
        SetofOptions: {
          isSetofReturn: false;
          isOneToOne: true;
          isNotNullable: false;
          to: "profiles";
          from: "become_coach";
        };
      };
      rotate_my_invite_code: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: Role;
      sex_type: Sex;
      meal_type_enum: MealType;
      activity_type_enum: ActivityType;
      daily_status: DailyStatus;
    };
  };
};
