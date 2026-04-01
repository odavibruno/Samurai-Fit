import { useState, useEffect } from 'react';
import { Message, Student, Workout } from '../types';
import { supabase } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import { Json, MessagesInsert, MessagesRow, ProfilesInsert, ProfilesRow, ProfilesUpdate, WorkoutsInsert } from '../supabase-types';

type MessageWithSender = MessagesRow & { sender: ProfilesRow | null };

export const useClan = () => {
  const [clanMembers, setClanMembers] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [muralMessages, setMuralMessages] = useState<MessageWithSender[]>([]);

  const toJson = (value: unknown): Json => value as unknown as Json;
  const toArray = <T,>(value: Json | null | undefined, fallback: T[]): T[] => {
    if (!Array.isArray(value)) return fallback;
    return value as T[];
  };
  const sanitizeDate = (value?: string | null) => {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  };
  const sanitizeEmail = (value?: string | null) => {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  };
  const resolvePayloadEmail = async (candidateEmail?: string | null) => {
    const fromPayload = sanitizeEmail(candidateEmail);
    if (fromPayload) return fromPayload;

    const { data: authData } = await supabase.auth.getUser();
    return sanitizeEmail(authData.user?.email);
  };

  const mapProfileRowToStudent = (row: ProfilesRow): Student => ({
    id: row.id,
    name: row.full_name || row.name || 'Guerreiro',
    email: row.email || '',
    password: row.password || undefined,
    goal: row.goal || 'Definir Objetivo',
    level: row.level || 'Gokenin (Iniciante)',
    birthDate: row.birth_date || '',
    gender: row.gender || 'Masculino',
    weight: row.weight ?? 70,
    height: row.height ?? 170,
    waterIntake: row.water_intake ?? 2.5,
    date: row.date || new Date().toISOString().split('T')[0],
    phone: row.phone || undefined,
    isLider: row.is_lider ?? false,
    workouts: toArray<Workout>(row.workouts, []),
    profileImage: row.avatar_url || row.profile_image || undefined,
    trainingLogs: toArray(row.training_logs, []),
    biography: row.biography || undefined,
    observations: row.observations || undefined,
    financial: (row.financial as unknown as Student['financial']) || undefined,
    studentGroup: row.student_group || undefined,
    questionnaire: (row.questionnaire as unknown as Student['questionnaire']) || undefined,
    isFirstLogin: row.is_first_login ?? false,
    hasAcceptedTerms: row.has_accepted_terms ?? true
  });

  const mapStudentToProfileInsert = async (student: Student): Promise<ProfilesInsert | null> => {
    const email = await resolvePayloadEmail(student.email);
    if (!email) {
      console.error('Profile write aborted: email is missing after mapping.');
      return null;
    }

    return {
      id: student.id,
      full_name: student.name,
      email,
      phone: student.phone || null,
      weight: student.weight,
      height: student.height,
      goal: student.goal,
      birth_date: sanitizeDate(student.birthDate),
      gender: student.gender,
      goals: toJson([]),
      daily_meals: toJson([]),
      observations: student.observations || null,
      is_lider: student.isLider ?? false,
      avatar_url: student.profileImage || null
    };
  };

  const buildProfileUpdatePayload = async (student: Student): Promise<ProfilesUpdate | null> => {
    const email = await resolvePayloadEmail(student.email);
    if (!email) {
      console.error('Profile write aborted: email is missing after mapping.');
      return null;
    }

    return {
      full_name: student.name,
      email,
      phone: student.phone || null,
      weight: student.weight,
      height: student.height,
      goal: student.goal,
      goals: toJson([]),
      birth_date: sanitizeDate(student.birthDate),
      gender: student.gender,
      daily_meals: toJson([]),
      observations: student.observations || null,
      is_lider: student.isLider ?? false,
      avatar_url: student.profileImage || null
    };
  };

  const mapWorkoutToRow = (workout: Workout, studentId: string): WorkoutsInsert => ({
    id: workout.id,
    student_id: studentId,
    workout_id: workout.id,
    title: workout.title,
    description: workout.description,
    exercises: toJson(workout.exercises),
    last_performed: workout.lastPerformed || null,
    is_locked: workout.isLocked ?? false
  });

  const mapMessagePayloadToInsert = (payload: Record<string, unknown>): MessagesInsert => ({
    sender_id: typeof payload.sender_id === 'string' ? payload.sender_id : null,
    recipient_id: typeof payload.recipient_id === 'string' ? payload.recipient_id : null,
    title: typeof payload.title === 'string' ? payload.title : null,
    content: typeof payload.content === 'string' ? payload.content : null,
    image: typeof payload.image === 'string' ? payload.image : null,
    is_read: typeof payload.is_read === 'boolean'
      ? payload.is_read
      : (typeof payload.isRead === 'boolean' ? payload.isRead : false)
  });

  useEffect(() => {
    const loadClanData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'student');

        if (error) {
          throw error;
        }

        const profiles = (data || []) as unknown as ProfilesRow[];
        setClanMembers(profiles.map(mapProfileRowToStudent));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching clan members:', message);
      } finally {
        setLoading(false);
      }
    };

    const loadMuralMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .returns<MessageWithSender[]>()
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        setMuralMessages(data || []);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching mural messages:', message);
      }
    };

    loadClanData();
    loadMuralMessages();
  }, []);

  const sendMuralMessage = async (messagePayload: Record<string, unknown>) => {
    const payload = mapMessagePayloadToInsert(messagePayload);
    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select('*, sender:profiles(*)')
      .returns<MessageWithSender[]>()
      .single();

    if (error) {
      throw error;
    }

    setMuralMessages(prev => [...prev, data as MessageWithSender]);
    return data;
  };

  const createStudent = async (newStudent: Student) => {
    try {
        let password = newStudent.password;
        if (!password) {
            if (newStudent.birthDate) {
                const parts = newStudent.birthDate.split('-');
                if (parts.length === 3) {
                    password = `${parts[2]}${parts[1]}${parts[0].slice(2)}`;
                } else {
                    password = 'samuraifitness';
                }
            } else {
                password = 'samuraifitness';
            }
        }

        const isolatedSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false
            }
          }
        );

        const { data: authData, error } = await isolatedSupabase.auth.signUp({
          email: newStudent.email,
          password
        });

        if (error) {
          const isDuplicateEmail = error.message?.includes('user_already_exists') || 
                                   error.status === 422 || 
                                   error.code === '23505';
                                   
          if (isDuplicateEmail) {
            throw new Error('Este e-mail já pertence a outro guerreiro no dojo.');
          }
          throw new Error('Não foi possível recrutar o aluno. Tente novamente.');
        }

        const authUserId = authData?.user?.id;
        if (!authUserId) {
          throw new Error("Não foi possível obter o ID do utilizador recém-criado.");
        }

        const { data: currentUser } = await supabase.auth.getUser();
        const professorId = currentUser.user?.id || null;

        const studentToSave: Student = {
          ...newStudent,
          id: authUserId,
          password
        };
        const profileInsert = await mapStudentToProfileInsert(studentToSave);
        if (!profileInsert) {
          throw new Error('Student creation aborted: mapped email is missing.');
        }

        const finalProfileInsert: ProfilesInsert = {
          ...profileInsert,
          role: 'student',
          linked_professor_id: professorId
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(finalProfileInsert, { onConflict: 'id' });

        if (profileError) {
          if (profileError.code === '23505') {
            throw new Error('Este e-mail já pertence a outro guerreiro no dojo.');
          }
          throw new Error('Não foi possível recrutar o aluno. Tente novamente.');
        }

        setClanMembers(prev => [...prev, studentToSave]);

        return true;
    } catch (error: any) {
        console.error("Error creating student:", error);
        throw error;
    }
  };

  const updateStudent = async (updatedStudent: Student) => {
    try {
      const targetId = updatedStudent.id?.trim();
      if (!targetId || targetId === 'guest') {
        throw new Error('Profile update requires a valid id.');
      }
      const profileUpdate = await buildProfileUpdatePayload(updatedStudent);
      if (!profileUpdate) {
        return false;
      }
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', targetId);

      if (error) {
        throw error;
      }

      setClanMembers(prev =>
        prev.map(member => (member.id === updatedStudent.id ? updatedStudent : member))
      );
      return true;
    } catch (error) {
      console.error("Error updating student:", error);
      alert("Erro ao salvar estudante. Verifique o console.");
      return false;
    }
  };

  const deleteStudent = async (id: string) => {
    const studentToDelete = clanMembers.find(m => m.id === id);
    if (!studentToDelete) return;

    try {
      if (!id) {
        throw new Error('Delete requires a valid id.');
      }
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setClanMembers(prev => prev.filter(member => member.id !== id));
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Erro ao excluir estudante.");
    }
  };

  const updateStudentWorkouts = async (studentId: string, workouts: Workout[]) => {
      try {
          if (!studentId || studentId === 'guest') {
            throw new Error('Workout sync requires a valid id.');
          }

          const { data: existingWorkouts, error: existingError } = await supabase
            .from('workouts')
            .select('id')
            .eq('student_id', studentId);

          if (existingError) {
            throw existingError;
          }

          const existingIds = (existingWorkouts || []).map(w => w.id);
          const newIds = workouts.map(w => w.id);
          const toDelete = existingIds.filter(id => !newIds.includes(id));

          if (toDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('workouts')
              .delete()
              .eq('student_id', studentId)
              .in('id', toDelete);

            if (deleteError) {
              throw deleteError;
            }
          }

          if (workouts.length > 0) {
            const rows = workouts.map(workout => mapWorkoutToRow(workout, studentId));

            const { error: upsertError } = await supabase
              .from('workouts')
              .upsert(rows, { onConflict: 'id' });

            if (upsertError) {
              throw upsertError;
            }
          }

          setClanMembers(prev =>
            prev.map(member =>
              member.id === studentId ? { ...member, workouts } : member
            )
          );

      } catch (error) {
          console.error("Error updating workouts:", error);
          throw error;
      }
  };

  return {
    clanMembers,
    setClanMembers, // Keep for compatibility if needed, but changes should go through updateStudent
    updateStudent,
    deleteStudent,
    updateStudentWorkouts,
    createStudent,
    loading
  };
};
