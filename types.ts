
export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: number;
  rest: string;
  category: 'Peito' | 'Costas' | 'Pernas' | 'Braços' | 'Ombros' | 'Core';
  type: 'Peso Livre' | 'Polia' | 'Máquina' | 'Core';
  description?: string;
  videoUrl: string;
}

export interface Workout {
  id: string;
  title: string;
  description: string;
  exercises: Exercise[];
  lastPerformed?: string;
  isLocked?: boolean; // Nova propriedade para trancar treinos
}

export interface ActiveWorkoutSession {
  workoutId: string;
  workoutTitle: string;
  startTime: string; // ISO String do início absoluto
  lastResumeTime: string | null; // ISO String ou null se pausado
  accumulatedDuration: number; // Segundos acumulados antes da última pausa
  isPaused: boolean;
  currentExerciseIndex: number | null;
  sessionData: Record<string, Record<number, { weight: number, reps: string, done: boolean }>>;
}

export interface TrainingLog {
  id: string;
  date: string; // YYYY-MM-DD
  workoutTitle: string;
  duration: string; // Ex: "45 min"
  totalLoad: number; // Carga total somada (estimativa)
  totalVolume: number; // Volume total de treino
  exercises: {
    name: string;
    sets: number;
    reps: string;
    weight: number;
  }[];
}

export interface UserStats {
  weight: number;
  height: number;
  bodyFat?: number;
  waterIntake: number;
  date: string;
  phone?: string;
  // Informações Avançadas
  strength1RM?: number;
  muscleMass?: number;
  visceralFat?: number;
}

export interface Meal {
  time: string;
  name: string;
  calories: number;
  protein: number;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string; // ex: 'kg', '%', 'km', 'dias'
  icon: 'Scale' | 'Flame' | 'Target' | 'Sword' | 'Droplet' | 'Moon' | 'Dumbbell';
}

export interface Message {
  id: string;
  senderName: string;
  title: string;
  content: string;
  date: string;
  image?: string;
  isRead: boolean;
}

export interface PaymentHistoryItem {
  id: string;
  date: string;
  amount: number;
  status: 'Pago' | 'Pendente' | 'Atrasado';
  method: string; // Pix, Cartão, Dinheiro
}

export interface FinancialRecord {
  status: 'Em dia' | 'Pendente' | 'Atrasado';
  plan: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  dueDate: string;
  lastPayment: string;
  value: number;
  history?: PaymentHistoryItem[];
}

export interface QuestionnaireData {
  answeredAt: string;
  answers: { question: string; answer: string }[];
  aiSummary?: string; // Análise feita pela IA para o Mestre
}

export type StudentGroup = 'Mentoria Presencial' | 'Mentoria Online' | 'Comunidade';

export type ClassStatus = 'Agendada' | 'Concluída' | 'Cancelada' | 'Falta';

export interface ClassSession {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  status: ClassStatus; // Novo campo de status
  isCompleted?: boolean; // Deprecated, mantido para compatibilidade temporária
  notes?: string;
}

export interface Student extends UserStats {
  id: string;
  name: string;
  email: string;
  password?: string;
  goal: string;
  level: string;
  birthDate: string;
  gender: 'Masculino' | 'Feminino';
  isLider?: boolean;
  workouts?: Workout[];
  profileImage?: string;
  trainingLogs?: TrainingLog[]; // Histórico de treinos
  
  // Novos campos
  biography?: string;
  observations?: string;
  financial?: FinancialRecord;
  studentGroup?: StudentGroup;
  questionnaire?: QuestionnaireData; // Novo campo
  
  // Controle de Acesso
  isFirstLogin?: boolean;
  hasAcceptedTerms?: boolean;
}

export interface UserProfile extends Student {
  workouts: Workout[];
  statsHistory: UserStats[];
  dailyMeals: Meal[];
  goals: Goal[];
  profileImage?: string;
  messages: Message[];
  trainingLogs: TrainingLog[];
  schedule: ClassSession[]; // Agenda do Mestre
}

export interface OnboardingProfileData {
  weight: number;
  height: number;
  goal: string;
}

export interface SoundConfig {
  start: string[]; // 3 URLs para Início
  rest: string[];  // 3 URLs para Descanso
  finish: string[]; // 3 URLs para Conclusão
  selectedStart: number; // Índice 0-2
  selectedRest: number;
  selectedFinish: number;
}

// NOVA INTERFACE PARA CONTROLE DE ÁUDIO GRANULAR
export interface AudioSettings {
  masterEnabled: boolean;
  masterVolume: number; // 0.0 a 1.0
  types: {
    start: { enabled: boolean; volume: number };
    rest: { enabled: boolean; volume: number };
    finish: { enabled: boolean; volume: number };
    // Mapeamento interno para sons de efeito (clicks, etc)
    ui: { enabled: boolean; volume: number }; 
  };
}

export enum NavigationTab {
  DOJO = 'dojo',
  TECHNIQUES = 'techniques',
  WORKOUTS = 'workouts',
  AI_COACH = 'ai_coach',
  HEALTH = 'health'
}
