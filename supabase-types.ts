import { ClassSession, FinancialRecord, Goal, Meal, Message, QuestionnaireData, StudentGroup, TrainingLog, UserStats, Workout } from './types';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: GenericRelationship[];
};

type GenericUpdatableView = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: GenericRelationship[];
};

type GenericNonUpdatableView = {
  Row: Record<string, unknown>;
  Relationships: GenericRelationship[];
};

type GenericView = GenericUpdatableView | GenericNonUpdatableView;

type GenericFunction = {
  Args: Record<string, unknown> | never;
  Returns: unknown;
};

export interface ProfilesRow {
  id: string;
  full_name?: string | null;
  role: string | null;
  name: string | null;
  email: string | null;
  password: string | null;
  goal: string | null;
  level: string | null;
  birth_date: string | null;
  gender: 'Masculino' | 'Feminino' | null;
  weight: number | null;
  height: number | null;
  water_intake: number | null;
  date: string | null;
  phone: string | null;
  is_lider: boolean | null;
  workouts: Json | null;
  stats_history: Json | null;
  daily_meals: Json | null;
  goals: Json | null;
  messages: Json | null;
  training_logs: Json | null;
  schedule: Json | null;
  avatar_url?: string | null;
  profile_image: string | null;
  biography: string | null;
  observations: string | null;
  financial: Json | null;
  student_group: StudentGroup | null;
  questionnaire: Json | null;
  is_first_login: boolean | null;
  has_accepted_terms: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export type ProfilesInsert = Partial<ProfilesRow> & { id: string };
export type ProfilesUpdate = Partial<ProfilesRow>;

export interface WorkoutsRow {
  id: string;
  student_id: string;
  workout_id: string | null;
  title: string | null;
  description: string | null;
  exercises: Json | null;
  last_performed: string | null;
  is_locked: boolean | null;
  status: string | null;
  start_time: string | null;
  last_resume_time: string | null;
  accumulated_duration: number | null;
  is_paused: boolean | null;
  current_exercise_index: number | null;
  session_data: Json | null;
  created_at: string | null;
  updated_at: string | null;
}

export type WorkoutsInsert = Partial<WorkoutsRow> & { student_id: string };
export type WorkoutsUpdate = Partial<WorkoutsRow>;

export interface TrainingLogsRow {
  id: string;
  student_id: string;
  workout_id: string | null;
  workout_title: string | null;
  date: string | null;
  duration: string | null;
  total_load: number | null;
  total_volume: number | null;
  exercises: Json | null;
  created_at: string | null;
  updated_at: string | null;
}

export type TrainingLogsInsert = Partial<TrainingLogsRow> & { student_id: string };
export type TrainingLogsUpdate = Partial<TrainingLogsRow>;

export interface MessagesRow {
  id: string;
  sender_id: string | null;
  recipient_id: string | null;
  title: string | null;
  content: string | null;
  image: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

export type MessagesInsert = Partial<MessagesRow>;
export type MessagesUpdate = Partial<MessagesRow>;

export type Database = {
  public: {
    Tables: Record<string, GenericTable> & {
      profiles: {
        Row: ProfilesRow;
        Insert: ProfilesInsert;
        Update: ProfilesUpdate;
        Relationships: GenericRelationship[];
      };
      workouts: {
        Row: WorkoutsRow;
        Insert: WorkoutsInsert;
        Update: WorkoutsUpdate;
        Relationships: GenericRelationship[];
      };
      training_logs: {
        Row: TrainingLogsRow;
        Insert: TrainingLogsInsert;
        Update: TrainingLogsUpdate;
        Relationships: GenericRelationship[];
      };
      messages: {
        Row: MessagesRow;
        Insert: MessagesInsert;
        Update: MessagesUpdate;
        Relationships: GenericRelationship[];
      };
    };
    Views: Record<string, GenericView>;
    Functions: Record<string, GenericFunction>;
  };
};

export type ProfileJson = {
  workouts: Workout[];
  stats_history: UserStats[];
  daily_meals: Meal[];
  goals: Goal[];
  messages: Message[];
  training_logs: TrainingLog[];
  schedule: ClassSession[];
  financial: FinancialRecord | null;
  questionnaire: QuestionnaireData | null;
};
