import { useState, useEffect } from 'react';
import { UserProfile, Workout, TrainingLog, Exercise, OnboardingProfileData } from '../types';
import { INITIAL_USER_DATA } from '../constants';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { Json, ProfilesInsert, ProfilesRow, ProfilesUpdate, TrainingLogsInsert, TrainingLogsRow, TrainingLogsUpdate, WorkoutsInsert, WorkoutsRow } from '../supabase-types';

export const useUserProfile = (authUser: User | null) => {
  const [user, setUser] = useState<UserProfile>(INITIAL_USER_DATA);
  const [loading, setLoading] = useState(false);

  const toArray = <T,>(value: Json | null | undefined, fallback: T[]): T[] => {
    if (!Array.isArray(value)) return fallback;
    return value as T[];
  };
  const toJson = (value: unknown): Json => value as unknown as Json;
  const sanitizeDate = (value?: string | null) => {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  };
  const sanitizeEmail = (value?: string | null) => {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  };
  const requireProfileId = (candidateId?: string | null) => {
    const targetId = candidateId?.trim();
    if (!targetId || targetId === 'guest') {
      throw new Error('Profile update requires a valid id.');
    }
    return targetId;
  };
  const resolvePayloadEmail = async (candidateEmail?: string | null) => {
    const fromPayload = sanitizeEmail(candidateEmail);
    if (fromPayload) return fromPayload;

    const fromAuthHook = sanitizeEmail(authUser?.email);
    if (fromAuthHook) return fromAuthHook;

    const { data: authData } = await supabase.auth.getUser();
    return sanitizeEmail(authData.user?.email);
  };

  const mapProfileRowToUser = (row: ProfilesRow): UserProfile => {
    const baseData: Partial<UserProfile> = {
      id: row.id,
      name: row.full_name || row.name || INITIAL_USER_DATA.name,
      role: row.role || undefined,
      birthDate: row.birth_date || INITIAL_USER_DATA.birthDate,
      gender: row.gender || INITIAL_USER_DATA.gender,
      email: row.email || INITIAL_USER_DATA.email,
      password: row.password || INITIAL_USER_DATA.password,
      goal: row.goal || INITIAL_USER_DATA.goal,
      level: row.level || INITIAL_USER_DATA.level,
      weight: row.weight ?? INITIAL_USER_DATA.weight,
      height: row.height ?? INITIAL_USER_DATA.height,
      waterIntake: row.water_intake ?? INITIAL_USER_DATA.waterIntake,
      date: row.date || INITIAL_USER_DATA.date,
      phone: row.phone || INITIAL_USER_DATA.phone,
      isLider: row.is_lider ?? undefined,
      workouts: toArray<Workout>(row.workouts, INITIAL_USER_DATA.workouts),
      statsHistory: toArray(row.stats_history, INITIAL_USER_DATA.statsHistory),
      dailyMeals: toArray(row.daily_meals, INITIAL_USER_DATA.dailyMeals),
      goals: toArray(row.goals, INITIAL_USER_DATA.goals),
      messages: toArray(row.messages, INITIAL_USER_DATA.messages),
      trainingLogs: toArray<TrainingLog>(row.training_logs, INITIAL_USER_DATA.trainingLogs),
      schedule: toArray(row.schedule, INITIAL_USER_DATA.schedule),
      profileImage: row.avatar_url || row.profile_image || undefined,
      biography: row.biography || undefined,
      observations: row.observations || undefined,
      financial: (row.financial as unknown as UserProfile['financial']) || INITIAL_USER_DATA.financial,
      studentGroup: row.student_group || undefined,
      questionnaire: (row.questionnaire as unknown as UserProfile['questionnaire']) || undefined,
      isFirstLogin: row.is_first_login ?? true,
      hasAcceptedTerms: row.has_accepted_terms ?? false,
      professorCode: row.professor_code || undefined,
      linkedProfessorId: row.linked_professor_id || undefined
    };

    return ensureDataIntegrity(baseData);
  };

  const normalizeLogExercises = (value: Json | null | undefined): TrainingLog['exercises'] => {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => {
        if (!item || Array.isArray(item) || typeof item !== 'object') return null;
        const raw = item as Record<string, unknown>;

        return {
          name: typeof raw.name === 'string' ? raw.name : 'Exercício',
          sets: typeof raw.sets === 'number' ? raw.sets : Number(raw.sets) || 0,
          reps: typeof raw.reps === 'string' ? raw.reps : String(raw.reps || ''),
          weight: typeof raw.weight === 'number' ? raw.weight : Number(raw.weight) || 0
        };
      })
      .filter((item): item is TrainingLog['exercises'][number] => item !== null);
  };

  const mapWorkoutRowToWorkout = (row: WorkoutsRow): Workout => ({
    id: row.workout_id || row.id,
    title: row.title || 'Treino',
    description: row.description || '',
    exercises: toArray<Exercise>(row.exercises, []),
    lastPerformed: row.last_performed || undefined,
    isLocked: row.is_locked ?? false
  });

  const mapTrainingLogRowToTrainingLog = (row: TrainingLogsRow): TrainingLog => ({
    id: row.id,
    date: row.date || new Date().toISOString().split('T')[0],
    workoutTitle: row.workout_title || 'Treino',
    duration: row.duration || '0 min',
    totalLoad: row.total_load ?? 0,
    totalVolume: row.total_volume ?? 0,
    exercises: normalizeLogExercises(row.exercises)
  });

  const buildProfileUpdatePayload = async (profile: UserProfile): Promise<ProfilesUpdate | null> => {
    const email = await resolvePayloadEmail(profile.email);
    if (!email) {
      console.error('Profile write aborted: email is missing after mapping.');
      return null;
    }

    return {
      full_name: profile.name,
      email,
      phone: profile.phone || null,
      weight: profile.weight,
      height: profile.height,
      goal: profile.goal,
      goals: toJson(profile.goals ?? []),
      birth_date: sanitizeDate(profile.birthDate),
      gender: profile.gender,
      daily_meals: toJson(profile.dailyMeals ?? []),
      observations: profile.observations || null,
      is_lider: profile.isLider ?? false,
      avatar_url: profile.profileImage || null
    };
  };

  const buildProfileUpsertPayload = async (profile: UserProfile, id: string): Promise<ProfilesInsert | null> => {
    const mappedPayload = await buildProfileUpdatePayload(profile);
    if (!mappedPayload) {
      return null;
    }

    return {
      id: requireProfileId(id),
      ...mappedPayload
    };
  };

  const ensureDataIntegrity = (baseData: Partial<UserProfile>): UserProfile => {
    const mergedData = {
      ...INITIAL_USER_DATA,
      ...baseData
    } as UserProfile;

    if (!mergedData.goals) mergedData.goals = INITIAL_USER_DATA.goals;
    if (!mergedData.statsHistory) mergedData.statsHistory = INITIAL_USER_DATA.statsHistory;
    if (!mergedData.dailyMeals) mergedData.dailyMeals = INITIAL_USER_DATA.dailyMeals;
    if (!mergedData.financial) {
      mergedData.financial = {
        status: 'Em dia',
        plan: 'Mensal',
        dueDate: new Date().toISOString().split('T')[0],
        lastPayment: new Date().toISOString().split('T')[0],
        value: 120,
        history: []
      };
    }
    if (mergedData.financial && !mergedData.financial.history) {
      mergedData.financial.history = INITIAL_USER_DATA.financial?.history || [];
    }
    if (!mergedData.schedule) mergedData.schedule = [];
    if (mergedData.isFirstLogin === undefined) mergedData.isFirstLogin = true;
    if (mergedData.hasAcceptedTerms === undefined) mergedData.hasAcceptedTerms = false;
    if (!mergedData.workouts) mergedData.workouts = [];
    if (!mergedData.trainingLogs) mergedData.trainingLogs = [];
    if (!mergedData.messages) mergedData.messages = [];

    return mergedData;
  };

  useEffect(() => {
    if (!authUser) {
        setUser(INITIAL_USER_DATA);
        setLoading(false);
        return;
    }

    let isMounted = true;

    const loadUser = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .single();

            if (error) {
              if (error.code === 'PGRST116') {
                const initialProfile = ensureDataIntegrity({
                  ...INITIAL_USER_DATA,
                  id: authUser.id,
                  email: authUser.email || '',
                  isFirstLogin: true,
                  hasAcceptedTerms: false
                });
                const initialProfilePayload = await buildProfileUpsertPayload(initialProfile, authUser.id);
                if (!initialProfilePayload) {
                  throw new Error('Profile bootstrap aborted: mapped email is missing.');
                }

                const { error: upsertError } = await supabase
                  .from('profiles')
                  .upsert(initialProfilePayload, { onConflict: 'id' });

                if (upsertError) {
                  throw upsertError;
                }

                if (isMounted) {
                  setUser(initialProfile);
                }
              } else {
                throw error;
              }
            } else {
              if (!data) {
                throw new Error('Profile payload is empty');
              }
              const profileData = mapProfileRowToUser(data as unknown as ProfilesRow);
              const { data: workoutsData, error: workoutsError } = await supabase
                .from('workouts')
                .select('*')
                .eq('student_id', authUser.id);

              if (workoutsError) {
                throw workoutsError;
              }

              const { data: trainingLogsData, error: trainingLogsError } = await supabase
                .from('training_logs')
                .select('*')
                .eq('student_id', authUser.id)
                .order('date', { ascending: false });

              if (trainingLogsError) {
                throw trainingLogsError;
              }

              const mappedWorkouts = ((workoutsData || []) as unknown as WorkoutsRow[])
                .filter(workoutRow => workoutRow.status !== 'active')
                .map(mapWorkoutRowToWorkout);
              const mappedTrainingLogs = ((trainingLogsData || []) as unknown as TrainingLogsRow[]).map(mapTrainingLogRowToTrainingLog);
              const mergedProfile = ensureDataIntegrity({
                ...profileData,
                workouts: mappedWorkouts.length > 0 ? mappedWorkouts : profileData.workouts,
                trainingLogs: mappedTrainingLogs.length > 0 ? mappedTrainingLogs : profileData.trainingLogs
              });

              if (isMounted) {
                setUser(mergedProfile);
              }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error("Error loading user profile from Supabase:", message);
        } finally {
            if (isMounted) {
              setLoading(false);
            }
        }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [authUser]);

  const saveQuestionnaire = async (answers: { question: string; answer: string }[]) => {
      const targetId = requireProfileId(authUser?.id);
      
      const questionnaireData = {
          answers,
          answeredAt: new Date().toISOString()
      };

      const updatedUser = { ...user, questionnaire: questionnaireData };
      setUser(updatedUser);
      
      const payload = await buildProfileUpsertPayload(updatedUser, targetId);
      if (!payload) {
        return updatedUser;
      }
      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error("Error saving questionnaire:", error.message);
      }

      return updatedUser;
  };

  const acceptTerms = async () => {
     const updated = { ...user, hasAcceptedTerms: true };
     setUser(updated);

     const targetId = requireProfileId(authUser?.id);
     const payload = await buildProfileUpsertPayload(updated, targetId);
     if (!payload) {
       return updated;
     }
     const { error } = await supabase
       .from('profiles')
       .upsert(payload, { onConflict: 'id' });

     if (error) {
       console.error("Error saving accepted terms:", error.message);
     }

     return updated;
  };

  const completeOnboarding = async (profileData: OnboardingProfileData | any) => {
     const isProfessor = user.role === 'professor';
     
     const updated = isProfessor 
       ? {
           ...user,
           biography: profileData.biography,
           professorCode: profileData.professorCode,
           isFirstLogin: false,
           hasAcceptedTerms: true
         }
       : {
           ...user,
           weight: profileData.weight,
           height: profileData.height,
           goal: profileData.goal,
           isFirstLogin: false,
           hasAcceptedTerms: true
         };
         
     setUser(updated);

     const targetId = requireProfileId(authUser?.id);
     
     // Update the specific flags in Supabase directly to ensure the loop breaks
     const { error: directUpdateError } = await supabase
       .from('profiles')
       .update(
           isProfessor 
           ? { 
               is_first_login: false, 
               has_accepted_terms: true,
               biography: profileData.biography,
               professor_code: profileData.professorCode
             }
           : { 
               is_first_login: false, 
               has_accepted_terms: true,
               weight: profileData.weight,
               height: profileData.height,
               goal: profileData.goal
             }
       )
       .eq('id', targetId);

     if (directUpdateError) {
       console.error("Error completing onboarding (direct update):", directUpdateError.message);
     }

     return updated;
  };

  useEffect(() => {
    if (!authUser || loading || user.id === 'guest') return;

    const saveProfile = async () => {
      const targetId = requireProfileId(authUser?.id);
      const payload = await buildProfileUpsertPayload(user, targetId);
      if (!payload) {
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error("Error saving profile:", error.message);
      }
    };

    saveProfile();
  }, [user, authUser, loading]);

  const addWorkout = async (workout: Workout) => {
      if (!authUser) return;

      const workoutPayload: WorkoutsInsert = {
        student_id: authUser.id,
        workout_id: workout.id,
        title: workout.title,
        description: workout.description,
        exercises: toJson(workout.exercises),
        last_performed: workout.lastPerformed || null,
        is_locked: workout.isLocked ?? false,
        status: 'assigned'
      };

      const { data, error } = await supabase
        .from('workouts')
        .insert(workoutPayload)
        .select('*')
        .single();

      if (error || !data) {
        console.error("Error updating workouts:", error?.message || 'Unknown error');
        return;
      }

      const mappedWorkout = mapWorkoutRowToWorkout(data as unknown as WorkoutsRow);
      setUser(prev => {
        const withoutDuplicated = prev.workouts.filter(existingWorkout => existingWorkout.id !== mappedWorkout.id);
        return { ...prev, workouts: [...withoutDuplicated, mappedWorkout] };
      });
  };

  const addTrainingLog = async (log: TrainingLog) => {
      if (!authUser) return;

      const linkedWorkout = user.workouts.find(workout => workout.title === log.workoutTitle);
      const logPayload: TrainingLogsInsert = {
        student_id: authUser.id,
        workout_id: linkedWorkout?.id || null,
        workout_title: log.workoutTitle,
        date: log.date,
        duration: log.duration,
        total_load: log.totalLoad,
        total_volume: log.totalVolume,
        exercises: toJson(log.exercises)
      };

      const { data, error } = await supabase
        .from('training_logs')
        .insert(logPayload)
        .select('*')
        .single();

      if (error || !data) {
        console.error("Error adding training log:", error?.message || 'Unknown error');
        return;
      }

      const mappedLog = mapTrainingLogRowToTrainingLog(data as unknown as TrainingLogsRow);
      setUser(prev => ({ ...prev, trainingLogs: [mappedLog, ...prev.trainingLogs] }));
  };

  const updateTrainingLog = async (log: TrainingLog) => {
      if (!authUser) return;

      const updatePayload: TrainingLogsUpdate = {
        workout_title: log.workoutTitle,
        date: log.date,
        duration: log.duration,
        total_load: log.totalLoad,
        total_volume: log.totalVolume,
        exercises: toJson(log.exercises)
      };

      const { data, error } = await supabase
        .from('training_logs')
        .update(updatePayload)
        .eq('id', log.id)
        .eq('student_id', authUser.id)
        .select('*')
        .single();

      if (error) {
        console.error("Error updating training log:", error.message);
        return;
      }

      const updatedLog = data ? mapTrainingLogRowToTrainingLog(data as unknown as TrainingLogsRow) : log;
      const updatedLogs = user.trainingLogs.map(existingLog => existingLog.id === log.id ? updatedLog : existingLog);
      setUser(prev => ({ ...prev, trainingLogs: updatedLogs }));
  };

  const deleteTrainingLog = async (logId: string) => {
      if (!authUser) return;

      const { error } = await supabase
        .from('training_logs')
        .delete()
        .eq('id', logId)
        .eq('student_id', authUser.id);

      if (error) {
        console.error("Error deleting training log:", error.message);
        return;
      }

      const updatedLogs = user.trainingLogs.filter(log => log.id !== logId);
      setUser(prev => ({ ...prev, trainingLogs: updatedLogs }));
  };

  const [nextClassAlert, setNextClassAlert] = useState<{ studentName: string, time: string } | null>(null);

  // Alert Scheduler
  useEffect(() => {
    if (!authUser || !user.schedule) return;

    const checkNextClass = () => {
        const now = new Date();
        const currentDateStr = now.toISOString().split('T')[0];
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

        const upcomingClass = user.schedule.find(s => {
            if (s.date !== currentDateStr) return false;
            const [h, m] = s.time.split(':').map(Number);
            const classTimeMinutes = h * 60 + m;
            const diff = classTimeMinutes - currentTimeMinutes;
            return diff >= 0 && diff <= 20; 
        });

        if (upcomingClass) {
            setNextClassAlert({ studentName: upcomingClass.studentName, time: upcomingClass.time });
        } else {
            setNextClassAlert(null); 
        }
    };

    const interval = setInterval(checkNextClass, 60000); 
    checkNextClass(); 

    return () => clearInterval(interval);
  }, [user.schedule, authUser]);

  return { 
      user, 
      setUser,
      loading,
      nextClassAlert,
      saveQuestionnaire,
      acceptTerms,
      completeOnboarding,
      addWorkout,
      addTrainingLog,
      updateTrainingLog,
      deleteTrainingLog
  };
};
