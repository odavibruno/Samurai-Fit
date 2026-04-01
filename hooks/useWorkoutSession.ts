import { useState, useEffect } from 'react';
import { ActiveWorkoutSession, Workout } from '../types';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { Json, TrainingLogsRow, WorkoutsInsert, WorkoutsRow } from '../supabase-types';

export const useWorkoutSession = (user: User | null) => {
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeWorkoutRowId, setActiveWorkoutRowId] = useState<string | null>(null);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLogsRow[]>([]);
  
  const isAuthenticated = !!user;

  const toJson = (value: unknown): Json => value as unknown as Json;
  const toSessionData = (value: Json | null): ActiveWorkoutSession['sessionData'] => {
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return value as unknown as ActiveWorkoutSession['sessionData'];
  };

  const mapWorkoutRowToSession = (row: WorkoutsRow): ActiveWorkoutSession => ({
    workoutId: row.workout_id || row.id,
    workoutTitle: row.title || '',
    startTime: row.start_time || new Date().toISOString(),
    lastResumeTime: row.last_resume_time,
    accumulatedDuration: row.accumulated_duration ?? 0,
    isPaused: row.is_paused ?? false,
    currentExerciseIndex: row.current_exercise_index ?? 0,
    sessionData: toSessionData(row.session_data)
  });

  const mapSessionToWorkoutInsert = (session: ActiveWorkoutSession, studentId: string): WorkoutsInsert => ({
    student_id: studentId,
    workout_id: session.workoutId,
    title: session.workoutTitle,
    start_time: session.startTime,
    last_resume_time: session.lastResumeTime,
    accumulated_duration: session.accumulatedDuration,
    is_paused: session.isPaused,
    current_exercise_index: session.currentExerciseIndex,
    session_data: toJson(session.sessionData),
    status: 'active'
  });

  useEffect(() => {
    if (!user) {
        setActiveSession(null);
        setActiveWorkoutRowId(null);
        setTrainingLogs([]);
        setLoading(false);
        return;
    }

    setLoading(true);

    const loadWorkoutData = async () => {
      try {
        const studentId = user.id;

        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select('*')
          .eq('student_id', studentId);

        if (workoutsError) {
          throw workoutsError;
        }

        const workouts = (workoutsData || []) as unknown as WorkoutsRow[];
        const activeWorkout = workouts.find(w => w.status === 'active');

        if (activeWorkout) {
          setActiveWorkoutRowId(String(activeWorkout.id));
          setActiveSession(mapWorkoutRowToSession(activeWorkout));
        } else {
          setActiveWorkoutRowId(null);
          setActiveSession(null);
        }

        const { data: logsData, error: logsError } = await supabase
          .from('training_logs')
          .select('*')
          .eq('student_id', studentId);

        if (logsError) {
          throw logsError;
        }

        setTrainingLogs((logsData || []) as unknown as TrainingLogsRow[]);
      } catch (error) {
        console.error("Error fetching workout session:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkoutData();
  }, [user]);

  useEffect(() => {
    const hasAlerted = sessionStorage.getItem('has_alerted_session');
    if (isAuthenticated && activeSession && !hasAlerted && !loading) {
       setTimeout(() => {
           sessionStorage.setItem('has_alerted_session', 'true');
       }, 500);
    }
  }, [isAuthenticated, activeSession, loading]);

  const saveSession = async (session: ActiveWorkoutSession | null) => {
    if (!user) return;
    const studentId = user.id;

    try {
        if (!session) {
          if (activeWorkoutRowId && activeSession) {
            const { error: deleteError } = await supabase
              .from('workouts')
              .delete()
              .eq('id', activeWorkoutRowId);

            if (deleteError) {
              throw deleteError;
            }

            setActiveWorkoutRowId(null);
          }
          return;
        }

        const payload = mapSessionToWorkoutInsert(session, studentId);

        if (activeWorkoutRowId) {
          const { error } = await supabase
            .from('workouts')
            .update(payload)
            .eq('id', activeWorkoutRowId);

          if (error) {
            throw error;
          }
        } else {
          const { data, error } = await supabase
            .from('workouts')
            .insert(payload)
            .select('id')
            .single();

          if (error) {
            throw error;
          }
          if (!data) {
            throw new Error('Failed to create active workout row');
          }

          setActiveWorkoutRowId(String(data.id));
        }
    } catch (error) {
        console.error("Error saving workout session:", error);
    }
  };

  const startSession = (workout: Workout) => {
    const newSession: ActiveWorkoutSession = {
      workoutId: workout.id,
      workoutTitle: workout.title,
      startTime: new Date().toISOString(),
      lastResumeTime: new Date().toISOString(),
      accumulatedDuration: 0,
      isPaused: false,
      currentExerciseIndex: 0,
      sessionData: {}
    };
    // Optimistic update
    setActiveSession(newSession);
    saveSession(newSession);
    sessionStorage.removeItem('has_alerted_session'); 
  };

  const pauseSession = () => {
    if (!activeSession || activeSession.isPaused) return;
    
    const now = new Date();
    const lastResume = activeSession.lastResumeTime ? new Date(activeSession.lastResumeTime) : now;
    const additionalTime = (now.getTime() - lastResume.getTime()) / 1000; // Segundos

    const updatedSession = {
      ...activeSession,
      isPaused: true,
      lastResumeTime: null,
      accumulatedDuration: activeSession.accumulatedDuration + additionalTime
    };
    
    setActiveSession(updatedSession);
    saveSession(updatedSession);
  };

  const resumeSession = () => {
    if (!activeSession || !activeSession.isPaused) return;

    const updatedSession = {
      ...activeSession,
      isPaused: false,
      lastResumeTime: new Date().toISOString()
    };

    setActiveSession(updatedSession);
    saveSession(updatedSession);
  };

  const updateSessionData = (exerciseId: string, setIndex: number, data: { weight: number, reps: string, done: boolean }) => {
    if (!activeSession) return;
    
    const newSessionData = { ...activeSession.sessionData };
    if (!newSessionData[exerciseId]) newSessionData[exerciseId] = {};
    newSessionData[exerciseId][setIndex] = data;

    const updatedSession = {
      ...activeSession,
      sessionData: newSessionData
    };

    setActiveSession(updatedSession);
    saveSession(updatedSession);
  };

  const finishSession = () => {
    setActiveSession(null);
    saveSession(null);
    sessionStorage.removeItem('has_alerted_session');
  };

  return {
    activeSession,
    trainingLogs,
    startSession,
    pauseSession,
    resumeSession,
    updateSessionData,
    finishSession,
    loading
  };
};
