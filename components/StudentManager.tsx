
import React, { useState, useEffect } from 'react';
import { Student, Workout, Exercise, FinancialRecord, StudentGroup } from '../types';
import { UserPlus, Search, Trash2, Edit3, ShieldCheck, X, Check, Info, Target, ScrollText, Plus, Save, Bot, Loader2, Sparkles, Lightbulb, ChevronLeft, Copy, Dumbbell, MoreHorizontal, User, Layers, CalendarRange, Repeat, DollarSign, BookOpen, AlertCircle, Calendar, CheckCircle2, EyeOff, Users, Wifi, Globe, Clock, Key, Brain } from 'lucide-react';
import { generateWorkoutPlan, generateWorkoutFromText, findExerciseDetails } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { WorkoutsRow } from '../supabase-types';

// Mock exercises for autocomplete
const MOCK_EXERCISES: Partial<Exercise>[] = [
  { name: 'Supino Reto', category: 'Peito', type: 'Peso Livre' },
  { name: 'Supino Inclinado', category: 'Peito', type: 'Peso Livre' },
  { name: 'Crucifixo', category: 'Peito', type: 'Máquina' },
  { name: 'Puxada Aberta', category: 'Costas', type: 'Polia' },
  { name: 'Remada Curvada', category: 'Costas', type: 'Peso Livre' },
  { name: 'Agachamento Livre', category: 'Pernas', type: 'Peso Livre' },
  { name: 'Leg Press 45', category: 'Pernas', type: 'Máquina' },
  { name: 'Desenvolvimento Militar', category: 'Ombros', type: 'Peso Livre' },
  { name: 'Elevação Lateral', category: 'Ombros', type: 'Peso Livre' },
  { name: 'Rosca Direta', category: 'Braços', type: 'Peso Livre' },
  { name: 'Tríceps Testa', category: 'Braços', type: 'Peso Livre' },
];

// --- COMPONENTE: GERENCIADOR DE TREINOS DO ALUNO (LISTA & EDITOR) ---
interface StudentWorkoutManagerProps {
  student: Student;
  onClose: () => void;
  onSave: (workouts: Workout[]) => void;
  availableExercises: Partial<Exercise>[];
  onAddNewExercises: (newExercises: Partial<Exercise>[]) => void;
  theme: 'Dia' | 'Noite';
}

const StudentWorkoutManager: React.FC<StudentWorkoutManagerProps> = ({ student, onClose, onSave, availableExercises, onAddNewExercises, theme }) => {
  // Estado Principal: Lista de Treinos
  const [workouts, setWorkouts] = useState<Workout[]>(
    (student.workouts && student.workouts.length > 0) 
      ? student.workouts 
      : []
  );

  const [viewMode, setViewMode] = useState<'LIST' | 'EDITOR'>('LIST');
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiConfig, setAiConfig] = useState({ mesocycles: 2, split: 'ABC' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0); 
  const [showMasterIdeas, setShowMasterIdeas] = useState(false);
  const [masterIdeasInput, setMasterIdeasInput] = useState('');
  const [masterIdeasScope, setMasterIdeasScope] = useState<'SINGLE' | 'MULTI' | 'MESO' | 'MACRO'>('SINGLE');
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);

  useEffect(() => {
    const loadWorkouts = async () => {
        if (!student.id) return;
        
        setIsLoadingWorkouts(true);
        try {
            const { data, error } = await supabase
              .from('workouts')
              .select('*')
              .eq('student_id', student.id)
              .neq('status', 'active');

            if (error) {
              throw error;
            }

            const rows = (data || []) as unknown as WorkoutsRow[];
            if (rows.length > 0) {
                const loadedWorkouts: Workout[] = rows.map(row => ({
                  id: row.workout_id || row.id,
                  title: row.title || 'Treino',
                  description: row.description || '',
                  exercises: Array.isArray(row.exercises) ? row.exercises as unknown as Workout['exercises'] : [],
                  lastPerformed: row.last_performed || undefined,
                  isLocked: row.is_locked ?? false
                }));
                setWorkouts(loadedWorkouts);
            } else {
                if (student.workouts && student.workouts.length > 0) {
                     setWorkouts(student.workouts);
                } else {
                     setWorkouts([]);
                }
            }
        } catch (error) {
            console.error("Error loading workouts:", error);
        } finally {
            setIsLoadingWorkouts(false);
        }
    };
    
    loadWorkouts();
  }, [student.id, student.workouts]);

  // --- FUNÇÕES DA LISTA DE TREINOS ---
  const handleCreateNew = () => {
    const char = String.fromCharCode(65 + workouts.length);
    const newWorkout: Workout = {
      id: Math.random().toString(),
      title: `Treino ${char}`,
      description: 'Novo protocolo de batalha',
      exercises: []
    };
    setWorkouts([...workouts, newWorkout]);
    setEditingWorkoutId(newWorkout.id);
    setViewMode('EDITOR');
  };

  const handleEdit = (id: string) => {
    setEditingWorkoutId(id);
    setViewMode('EDITOR');
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Tem certeza que deseja apagar este protocolo de guerra?")) {
      setWorkouts(prev => prev.filter(w => w.id !== id));
      if (editingWorkoutId === id) {
          setViewMode('LIST');
          setEditingWorkoutId(null);
      }
    }
  };

  const handleDuplicate = (workout: Workout, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const copy: Workout = {
      ...workout,
      id: Math.random().toString(),
      title: `${workout.title} (Cópia)`
    };
    setWorkouts([...workouts, copy]);
  };

  const handleAiFullGeneration = async () => {
    setIsGenerating(true);
    setLoadingProgress(10);
    setGenerationStatus('Estrategista IA analisando perfil...');
    try {
      const timer = setInterval(() => { setLoadingProgress(prev => Math.min(prev + 5, 40)); }, 500);
      const generatedData = await generateWorkoutPlan(student, availableExercises, aiConfig);
      clearInterval(timer);
      setLoadingProgress(90);
      setGenerationStatus('Finalizando estrutura...');
      if (generatedData && Array.isArray(generatedData) && generatedData.length > 0) {
        const newWorkouts: Workout[] = generatedData.map((w: any) => ({
          id: Math.random().toString(),
          title: w.title || 'Treino IA',
          description: w.description || 'Estratégia Automática',
          exercises: Array.isArray(w.exercises) ? w.exercises.map((e: any) => ({
            id: Math.random().toString(),
            name: e.name || 'Exercício',
            sets: Number(e.sets) || 3,
            reps: String(e.reps) || '10',
            weight: Number(e.weight) || 0,
            rest: String(e.rest) || '60s',
            category: (e.category || 'Geral') as any,
            type: (e.type || 'Máquina') as any,
            videoUrl: e.videoUrl || ''
          })) : []
        }));
        setTimeout(() => {
            setWorkouts(newWorkouts);
            setLoadingProgress(100);
            setIsGenerating(false);
            setShowAiPanel(false);
            setLoadingProgress(0);
        }, 500);
      } else {
        alert("A IA não retornou um plano válido.");
        setIsGenerating(false);
      }
    } catch (e) {
      console.error(e);
      alert("Erro na conexão com o Mestre IA.");
      setIsGenerating(false);
    } finally {
      setGenerationStatus('');
    }
  };

  const currentWorkout = workouts.find(w => w.id === editingWorkoutId);

  const updateCurrentWorkout = (updated: Workout) => {
    setWorkouts(prev => prev.map(w => w.id === updated.id ? updated : w));
  };

  const addExercise = () => {
    if (!currentWorkout) return;
    const newEx: Exercise = {
      id: Math.random().toString(),
      name: 'Novo Exercício',
      sets: 3,
      reps: '12',
      weight: 0,
      rest: '60s',
      category: 'Peito' as any,
      type: 'Peso Livre' as any,
      videoUrl: ''
    };
    updateCurrentWorkout({ ...currentWorkout, exercises: [...currentWorkout.exercises, newEx] });
  };

  const removeExercise = (exIdx: number) => {
    if (!currentWorkout) return;
    const newExs = currentWorkout.exercises.filter((_, i) => i !== exIdx);
    updateCurrentWorkout({ ...currentWorkout, exercises: newExs });
  };

  const updateExercise = (exIdx: number, field: keyof Exercise, value: any) => {
    if (!currentWorkout) return;
    const newExs = currentWorkout.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      if (field === 'name') {
        const predefined = availableExercises.find(a => a.name === value);
        if (predefined) {
          return { 
            ...ex, 
            name: value,
            category: predefined.category || ex.category,
            type: predefined.type || ex.type,
            videoUrl: predefined.videoUrl || ex.videoUrl
          };
        }
      }
      return { ...ex, [field]: value };
    });
    updateCurrentWorkout({ ...currentWorkout, exercises: newExs });
  };

  const handleMasterIdeas = async () => {
    if (!masterIdeasInput.trim()) return;
    const actualScope = viewMode === 'EDITOR' ? 'SINGLE' : masterIdeasScope;
    setIsGenerating(true);
    setLoadingProgress(10);
    setGenerationStatus('Decifrando manuscrito do Mestre...');
    try {
      const generatedData = await generateWorkoutFromText(masterIdeasInput, availableExercises, actualScope);
      setLoadingProgress(30);
      const newExercisesFound: Partial<Exercise>[] = [];
      const processedWorkouts: Workout[] = [];
      let totalItemsToProcess = 0;
      generatedData.forEach((w: any) => totalItemsToProcess += (w.exercises?.length || 0));
      let processedItems = 0;

      for (const w of generatedData) {
        const workoutExercises: Exercise[] = [];
        if (w.exercises) {
          for (const ex of w.exercises) {
             processedItems++;
             const progressStep = 30 + Math.round((processedItems / totalItemsToProcess) * 60); 
             setLoadingProgress(progressStep);
             setGenerationStatus(`Analisando técnica: ${ex.name}...`);
             const exists = availableExercises.some(avail => avail.name?.toLowerCase() === ex.name?.toLowerCase());
             let finalEx = { ...ex };
             if (!exists) {
                setGenerationStatus(`Mestre IA aprendendo: ${ex.name}...`);
                const details = await findExerciseDetails(ex.name);
                if (details && details.name) {
                   const newExObj = {
                      name: details.name,
                      category: details.category || 'Core',
                      type: details.type || 'Peso Livre',
                      description: details.description || 'Via Mestre IA',
                      videoUrl: details.videoId ? `https://www.youtube.com/embed/${details.videoId}` : ''
                   };
                   if (!newExercisesFound.some(n => n.name === newExObj.name)) newExercisesFound.push(newExObj);
                   finalEx.name = details.name;
                   finalEx.category = details.category;
                   finalEx.type = details.type;
                   finalEx.videoUrl = newExObj.videoUrl;
                }
             } else {
                const existing = availableExercises.find(a => a.name?.toLowerCase() === ex.name?.toLowerCase());
                if (existing) {
                   finalEx.videoUrl = existing.videoUrl;
                   finalEx.category = existing.category;
                   finalEx.type = existing.type;
                }
             }
             workoutExercises.push({
               id: Math.random().toString(),
               name: finalEx.name || 'Exercício',
               sets: Number(finalEx.sets) || 3,
               reps: String(finalEx.reps) || '10',
               weight: Number(finalEx.weight) || 0,
               rest: String(finalEx.rest) || '60s',
               category: finalEx.category as any,
               type: finalEx.type as any,
               videoUrl: finalEx.videoUrl || ''
             });
          }
        }
        processedWorkouts.push({
            id: Math.random().toString(),
            title: w.title || 'Treino do Mestre',
            description: w.description || '',
            exercises: workoutExercises
        });
      }
      setLoadingProgress(95);
      setGenerationStatus('Consolidando conhecimento...');
      if (newExercisesFound.length > 0) onAddNewExercises(newExercisesFound);
      if (viewMode === 'EDITOR' && currentWorkout && processedWorkouts.length > 0) {
          updateCurrentWorkout({
            ...currentWorkout,
            description: currentWorkout.description + " " + (processedWorkouts[0].description || ""),
            exercises: [...currentWorkout.exercises, ...processedWorkouts[0].exercises]
         });
      } else if (viewMode === 'LIST') {
          setWorkouts(prev => [...prev, ...processedWorkouts]);
      }
      setLoadingProgress(100);
      setGenerationStatus('Concluído!');
      setTimeout(() => {
        setShowMasterIdeas(false);
        setMasterIdeasInput('');
        setIsGenerating(false);
        setLoadingProgress(0);
      }, 800);
    } catch (e) {
      console.error(e);
      alert("Erro ao interpretar.");
      setIsGenerating(false);
      setLoadingProgress(0);
    } finally {
      setGenerationStatus('');
    }
  };

  const modalBg = theme === 'Noite' ? 'bg-[#121212]' : 'bg-white';
  const inputBg = theme === 'Noite' ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-zinc-200';
  const textColor = theme === 'Noite' ? 'text-white' : 'text-zinc-900';
  const cardBg = theme === 'Noite' ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-zinc-100 shadow-lg';

  // Render do WorkoutManager
  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl p-6 flex items-center justify-center animate-in zoom-in-95">
      <div className={`${modalBg} w-full max-w-4xl h-[90vh] rounded-[3rem] border border-red-900/30 shadow-2xl flex flex-col overflow-hidden`}>
         {/* Conteúdo mantido idêntico ao original por brevidade */}
         <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-red-900/10 to-transparent">
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest italic flex items-center gap-2">
              <ScrollText size={14} className="text-red-900" />
              Gestão de Protocolos
            </p>
            <h3 className={`text-2xl font-black italic uppercase ${textColor}`}>{student.name}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-red-900"><X size={28} /></button>
        </div>

        {viewMode === 'LIST' && (
          <div className="flex-grow flex flex-col overflow-hidden animate-in slide-in-from-left-4">
             {/* ... UI da lista ... */}
             <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={handleCreateNew} className="bg-zinc-800 text-white p-6 rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 group hover:bg-zinc-700">
                    <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors"><Plus size={20} /></div>
                    <div className="text-left"><span className="block text-[10px] font-black uppercase opacity-60">Manual</span><span className="block text-sm font-black uppercase italic">Criar Treino</span></div>
                </button>
                {/* ... outros botões ... */}
                <button onClick={() => { setShowMasterIdeas(!showMasterIdeas); setShowAiPanel(false); }} className="bg-yellow-600 hover:bg-yellow-700 text-white p-6 rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 group border border-yellow-400/20">
                    <div className="p-2 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors"><Lightbulb size={20} /></div>
                    <div className="text-left"><span className="block text-[10px] font-black uppercase opacity-80">Texto do Mestre</span><span className="block text-sm font-black uppercase italic">Ideias Livres</span></div>
                </button>
                <button onClick={() => { setShowAiPanel(!showAiPanel); setShowMasterIdeas(false); }} className="bg-red-900 hover:bg-red-800 text-white p-6 rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 group border border-red-500/20">
                    <div className="p-2 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors"><Sparkles size={20} /></div>
                    <div className="text-left"><span className="block text-[10px] font-black uppercase opacity-80">Automático</span><span className="block text-sm font-black uppercase italic">Gerar Protocolo</span></div>
                </button>
             </div>
             {/* Paineis de IA e Lista */}
             {showMasterIdeas && (
                 <div className={`mx-6 mb-6 p-6 rounded-3xl border border-yellow-500/30 ${theme === 'Noite' ? 'bg-zinc-900' : 'bg-yellow-50'} animate-in slide-in-from-top-2 relative`}>
                   {/* ... UI Master Ideas ... */}
                   <div className="flex justify-between items-center mb-4"><h4 className="text-xs font-black uppercase text-yellow-600 italic tracking-widest flex items-center gap-2"><Lightbulb size={16}/> Transcrever Pensamentos</h4><button onClick={() => setShowMasterIdeas(false)}><X size={16} className="text-zinc-400 hover:text-red-900"/></button></div>
                   <div className="flex flex-wrap gap-2 mb-4">
                      <button onClick={() => setMasterIdeasScope('SINGLE')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${masterIdeasScope === 'SINGLE' ? 'bg-yellow-600 text-white' : 'bg-black/10 text-zinc-500'}`}><Dumbbell size={14} /> Treino Único</button>
                      <button onClick={() => setMasterIdeasScope('MULTI')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${masterIdeasScope === 'MULTI' ? 'bg-yellow-600 text-white' : 'bg-black/10 text-zinc-500'}`}><Layers size={14} /> Vários Treinos</button>
                      <button onClick={() => setMasterIdeasScope('MESO')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${masterIdeasScope === 'MESO' ? 'bg-yellow-600 text-white' : 'bg-black/10 text-zinc-500'}`}><Repeat size={14} /> Mesociclo</button>
                      <button onClick={() => setMasterIdeasScope('MACRO')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${masterIdeasScope === 'MACRO' ? 'bg-yellow-600 text-white' : 'bg-black/10 text-zinc-500'}`}><CalendarRange size={14} /> Periodização</button>
                   </div>
                   <textarea value={masterIdeasInput} onChange={(e) => setMasterIdeasInput(e.target.value)} placeholder="Ex: Treino de Peito..." className={`w-full h-32 bg-transparent border border-yellow-600/20 rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-yellow-600 resize-none ${textColor}`} />
                   <div className="flex justify-end gap-2 mt-4"><button onClick={handleMasterIdeas} disabled={isGenerating} className="px-8 py-3 bg-yellow-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg hover:bg-yellow-700 transition-all">{isGenerating ? <Loader2 size={16} className="animate-spin" /> : <><Bot size={16} /> Criar Estrutura</>}</button></div>
                 </div>
             )}
              {/* ... Lista de treinos ... */}
              <div className="flex-grow overflow-y-auto px-6 pb-6 space-y-4 custom-scrollbar">
                {isLoadingWorkouts ? (
                    <div className="text-center py-20 opacity-50 animate-pulse"><Loader2 size={48} className="mx-auto mb-4 animate-spin" /><p className="text-sm font-bold uppercase italic">Buscando pergaminhos...</p></div>
                ) : workouts.length === 0 ? (
                    <div className="text-center py-20 opacity-40"><Dumbbell size={48} className="mx-auto mb-4" /><p className="text-sm font-bold uppercase italic">Nenhum treino cadastrado</p></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workouts.map((w) => (
                        <div key={w.id} className={`${cardBg} p-6 rounded-[2rem] relative group hover:border-red-900/50 transition-all`}>
                        <div className="flex justify-between items-start mb-4">
                            <div><h4 className={`text-xl font-black italic uppercase ${textColor}`}>{w.title}</h4><p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">{w.exercises.length} Exercícios</p></div>
                            <div className="flex gap-2"><button onClick={(e) => handleDuplicate(w, e)} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-blue-500 transition-colors" title="Duplicar"><Copy size={16} /></button><button onClick={(e) => handleDelete(w.id, e)} className="p-2 rounded-xl bg-red-900/10 text-red-900 hover:bg-red-900 hover:text-white transition-colors" title="Excluir"><Trash2 size={16} /></button></div>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium italic mb-6 line-clamp-2 min-h-[2.5em]">{w.description || "Sem descrição..."}</p>
                        <button onClick={() => handleEdit(w.id)} className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-900 hover:text-white text-zinc-600 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2"><Edit3 size={16} /> Editar Treino</button>
                        </div>
                    ))}
                    </div>
                )}
              </div>
              <div className="p-6 border-t border-white/5"><button onClick={() => onSave(workouts)} className="w-full bg-red-900 text-white font-black py-5 rounded-3xl shadow-2xl uppercase italic tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"><Save size={20} /> Salvar Tudo e Fechar</button></div>
          </div>
        )}

        {viewMode === 'EDITOR' && currentWorkout && (
            <div className="flex-grow flex flex-col overflow-hidden animate-in slide-in-from-right-4">
                {/* ... Editor ... */}
                <div className="p-4 border-b border-white/5 flex items-center gap-4">
                    <button onClick={() => setViewMode('LIST')} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-red-900"><ChevronLeft size={24} /></button>
                    <div className="flex-grow"><input value={currentWorkout.title} onChange={(e) => updateCurrentWorkout({...currentWorkout, title: e.target.value})} className={`w-full bg-transparent text-xl font-black uppercase italic ${textColor} focus:outline-none`} placeholder="TÍTULO DO TREINO"/></div>
                </div>
                <div className="p-4"><input value={currentWorkout.description} onChange={(e) => updateCurrentWorkout({...currentWorkout, description: e.target.value})} className={`w-full ${inputBg} p-3 rounded-xl text-sm font-bold ${textColor}`} placeholder="Descrição ou foco do treino..."/></div>
                <div className="flex-grow overflow-y-auto px-4 pb-6 space-y-3 custom-scrollbar">
                    {currentWorkout.exercises.map((ex, idx) => (
                    <div key={ex.id} className={`p-4 rounded-2xl border border-white/5 ${theme === 'Noite' ? 'bg-white/5' : 'bg-slate-50'} relative group`}>
                        <button onClick={() => removeExercise(idx)} className="absolute top-2 right-2 p-2 text-zinc-400 hover:text-red-900 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                        <div className="mb-3 pr-8"><label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Exercício</label><select value={ex.name} onChange={(e) => updateExercise(idx, 'name', e.target.value)} className={`w-full bg-transparent border-b border-zinc-500/20 py-1 text-sm font-black uppercase ${textColor} focus:outline-none focus:border-red-900`}><option value="Novo Exercício">Selecionar...</option>{availableExercises.map((a, i) => <option key={`${a.name}-${i}`} value={a.name}>{a.name}</option>)}</select></div>
                        <div className="grid grid-cols-4 gap-2">
                            <div><label className="text-[8px] uppercase font-bold text-zinc-500">Sets</label><input type="number" value={ex.sets} onChange={(e) => updateExercise(idx, 'sets', Number(e.target.value))} className={`w-full bg-transparent border-b border-zinc-500/20 text-xs font-bold ${textColor}`} /></div>
                            <div><label className="text-[8px] uppercase font-bold text-zinc-500">Reps</label><input type="text" value={ex.reps} onChange={(e) => updateExercise(idx, 'reps', e.target.value) } className={`w-full bg-transparent border-b border-zinc-500/20 text-xs font-bold ${textColor}`} /></div>
                            <div><label className="text-[8px] uppercase font-bold text-zinc-500">Kg</label><input type="number" value={ex.weight} onChange={(e) => updateExercise(idx, 'weight', Number(e.target.value))} className={`w-full bg-transparent border-b border-zinc-500/20 text-xs font-bold ${textColor}`} /></div>
                            <div><label className="text-[8px] uppercase font-bold text-zinc-500">Rest</label><input type="text" value={ex.rest} onChange={(e) => updateExercise(idx, 'rest', e.target.value)} className={`w-full bg-transparent border-b border-zinc-500/20 text-xs font-bold ${textColor}`} /></div>
                        </div>
                    </div>
                    ))}
                    <button onClick={addExercise} className="w-full py-4 border-2 border-dashed border-zinc-700 rounded-2xl text-zinc-500 font-bold uppercase text-xs hover:border-red-900 hover:text-red-900 transition-all flex items-center justify-center gap-2"><Plus size={16} /> Adicionar Exercício</button>
                </div>
                <div className="p-4 border-t border-white/5 bg-black/10"><button onClick={() => setViewMode('LIST')} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl uppercase text-xs flex items-center justify-center gap-2"><Check size={18} /> Concluir Edição</button></div>
            </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE: MODAL DE DETALHES DO ALUNO (3 ABAS) ---
interface StudentDetailModalProps {
    student: Student;
    onClose: () => void;
    onUpdate: (updatedStudent: Student) => void;
    onOpenWorkouts: () => void;
    theme: 'Dia' | 'Noite';
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose, onUpdate, onOpenWorkouts, theme }) => {
    const [activeTab, setActiveTab] = useState<'PROFILE' | 'BIO' | 'FINANCIAL'>('PROFILE');
    const [formData, setFormData] = useState<Student>(student);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Garante que o objeto financial exista
    if (!formData.financial) {
        setFormData(prev => ({
            ...prev,
            financial: { status: 'Em dia', plan: 'Mensal', dueDate: new Date().toISOString().split('T')[0], lastPayment: new Date().toISOString().split('T')[0], value: 150 }
        }));
    }

    const handleChange = (field: keyof Student, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFinancialChange = (field: keyof FinancialRecord, value: any) => {
        setFormData(prev => ({
            ...prev,
            financial: { ...prev.financial!, [field]: value }
        }));
    };

    const handleSave = () => {
        const finalData = { ...formData };
        
        // Geração Automática de Senha para Novos Alunos (Se ainda não foi definida ou se é primeiro acesso)
        // Formato DDMMAA (Ex: 010293 para 01/02/1993)
        if (!finalData.password || finalData.isFirstLogin === true || finalData.isFirstLogin === undefined) {
            // Garante que birthDate esteja no formato ISO YYYY-MM-DD para o split funcionar
            const birthDateStr = finalData.birthDate || new Date().toISOString().split('T')[0];
            const [year, month, day] = birthDateStr.split('-');
            
            if (year && month && day) {
                // Pega os últimos 2 dígitos do ano
                const shortYear = year.slice(-2);
                finalData.password = `${day}${month}${shortYear}`;
                finalData.isFirstLogin = true; // Força primeiro login
                finalData.hasAcceptedTerms = false; // Força aceite de termos
                
                // Log para debug (opcional)
                console.log(`Senha gerada para ${finalData.name}: ${finalData.password}`);
            }
        }

        onUpdate(finalData);
        onClose();
    };

    const formatBRPhone = (value: string) => {
        if (!value) return "";
        value = value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 10) return value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        if (value.length > 6) return value.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
        if (value.length > 2) return value.replace(/(\d{2})(\d{0,5})/, "($1) $2");
        return value;
    };

    const modalBg = theme === 'Noite' ? 'bg-[#121212]' : 'bg-white';
    const inputBg = theme === 'Noite' ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-zinc-200';
    const textColor = theme === 'Noite' ? 'text-white' : 'text-zinc-900';

    return (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl p-6 flex items-center justify-center animate-in zoom-in-95">
            <div className={`${modalBg} w-full max-w-4xl h-[90vh] rounded-[3rem] border border-red-900/30 shadow-2xl flex flex-col overflow-hidden`}>
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-red-900/10 to-transparent">
                    <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-black text-zinc-500">
                             {formData.profileImage ? <img src={formData.profileImage} className="w-full h-full rounded-full object-cover"/> : formData.name.charAt(0)}
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest italic">Ficha do Guerreiro</p>
                            <h3 className={`text-2xl font-black italic uppercase ${textColor}`}>{formData.name}</h3>
                         </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-red-900"><X size={28} /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 px-6 pt-4 gap-4">
                    <button 
                        onClick={() => setActiveTab('PROFILE')}
                        className={`pb-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeTab === 'PROFILE' ? 'text-red-900 border-red-900' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                    >
                        <User size={16} /> Perfil
                    </button>
                    <button 
                        onClick={() => setActiveTab('BIO')}
                        className={`pb-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeTab === 'BIO' ? 'text-red-900 border-red-900' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                    >
                        <ScrollText size={16} /> Biografia & Metas
                    </button>
                    <button 
                        onClick={() => setActiveTab('FINANCIAL')}
                        className={`pb-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeTab === 'FINANCIAL' ? 'text-red-900 border-red-900' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                    >
                        <DollarSign size={16} /> Status Financeiro
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
                    
                    {/* ABA PERFIL */}
                    {activeTab === 'PROFILE' && (
                        <div className="space-y-6 animate-in slide-in-from-left-4">
                            <div className="flex justify-between items-center bg-red-900/5 p-4 rounded-2xl border border-red-900/10">
                                <div>
                                    <h4 className="text-sm font-black uppercase text-red-900 italic">Gestão de Treinos</h4>
                                    <p className="text-[10px] text-zinc-500">Configurar fichas, exercícios e periodização.</p>
                                </div>
                                <button onClick={onOpenWorkouts} className="bg-red-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg hover:bg-red-800 transition-all">
                                    <Dumbbell size={16} /> Abrir Editor
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Email</label>
                                    <input className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Telefone</label>
                                    <input className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={formData.phone} onChange={e => handleChange('phone', formatBRPhone(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nascimento</label>
                                    <input type="date" className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={formData.birthDate} onChange={e => handleChange('birthDate', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Gênero</label>
                                    <select className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={formData.gender} onChange={e => handleChange('gender', e.target.value)}>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Feminino">Feminino</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* Visualização de Senha Automática */}
                            <div className="bg-zinc-800/20 p-4 rounded-2xl border border-zinc-800 flex items-center gap-3">
                                <Key size={16} className="text-zinc-500"/>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-zinc-500">Acesso Inicial</p>
                                    <p className="text-xs text-zinc-400 font-bold">A senha automática será a data de nascimento (DDMMAA).</p>
                                </div>
                            </div>

                            <button onClick={() => setShowAdvanced(!showAdvanced)} className={`w-full flex justify-center items-center gap-2 py-3 ${theme === 'Noite' ? 'bg-zinc-800/50' : 'bg-slate-50'} rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-900 border border-red-900/20 active:scale-95 transition-all`}><Info size={14} /> Dados Físicos Avançados</button>
                            
                            {showAdvanced && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-zinc-500">Peso (kg)</label><input type="number" className={`w-full ${inputBg} p-3 rounded-xl text-xs font-bold ${textColor}`} value={formData.weight} onChange={e => handleChange('weight', Number(e.target.value))} /></div>
                                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-zinc-500">Altura (cm)</label><input type="number" className={`w-full ${inputBg} p-3 rounded-xl text-xs font-bold ${textColor}`} value={formData.height} onChange={e => handleChange('height', Number(e.target.value))} /></div>
                                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-zinc-500">Gordura %</label><input type="number" className={`w-full ${inputBg} p-3 rounded-xl text-xs font-bold ${textColor}`} value={formData.bodyFat} onChange={e => handleChange('bodyFat', Number(e.target.value))} /></div>
                                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-zinc-500">Massa Magra</label><input type="number" className={`w-full ${inputBg} p-3 rounded-xl text-xs font-bold ${textColor}`} value={formData.muscleMass} onChange={e => handleChange('muscleMass', Number(e.target.value))} /></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ABA BIOGRAFIA & METAS */}
                    {activeTab === 'BIO' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            {/* --- SEÇÃO ANAMNESE E ESTRATÉGIA (NOVO) --- */}
                            {formData.questionnaire && (
                                <div className="space-y-4 mb-8 pb-8 border-b border-white/5">
                                    <h4 className="text-sm font-black uppercase text-red-900 italic flex items-center gap-2">
                                        <Brain size={16} /> Análise Estratégica do Guerreiro
                                    </h4>
                                    
                                    {/* Resumo da IA */}
                                    {formData.questionnaire.aiSummary && (
                                        <div className="p-5 bg-yellow-600/10 border border-yellow-600/20 rounded-2xl">
                                            <p className="text-[10px] font-black uppercase text-yellow-600 mb-2">Resumo da IA (Somente Mestre)</p>
                                            <div className={`text-xs leading-relaxed whitespace-pre-wrap ${theme === 'Noite' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                                {formData.questionnaire.aiSummary}
                                            </div>
                                        </div>
                                    )}

                                    {/* Respostas Detalhadas */}
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase text-zinc-500">Respostas do Questionário ({new Date(formData.questionnaire.answeredAt).toLocaleDateString()})</p>
                                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-2xl">
                                            {formData.questionnaire.answers.map((qa, idx) => (
                                                <div key={idx} className="mb-3">
                                                    <p className="text-[9px] font-bold text-zinc-500 mb-1">{idx + 1}. {qa.question}</p>
                                                    <p className={`text-xs font-medium italic ${textColor} pl-2 border-l-2 border-red-900/50`}>{qa.answer}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 flex items-center gap-2"><BookOpen size={12}/> Biografia do Guerreiro</label>
                                <textarea 
                                    className={`w-full h-40 ${inputBg} p-4 rounded-2xl text-sm font-medium ${textColor} resize-none`} 
                                    placeholder="História do aluno, lesões prévias, motivações..."
                                    value={formData.biography || ''}
                                    onChange={e => handleChange('biography', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-red-900 ml-1 flex items-center gap-2"><EyeOff size={12}/> Observações do Mestre (Privado)</label>
                                <textarea 
                                    className={`w-full h-40 ${inputBg} p-4 rounded-2xl text-sm font-medium ${textColor} resize-none border border-red-900/30`} 
                                    placeholder="Anotações internas sobre o aluno (comportamento, pagamentos manuais, detalhes técnicos)..."
                                    value={formData.observations || ''}
                                    onChange={e => handleChange('observations', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 flex items-center gap-2"><Target size={12}/> Objetivo Principal (Goal)</label>
                                <input 
                                    className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} 
                                    value={formData.goal} 
                                    onChange={e => handleChange('goal', e.target.value)}
                                />
                            </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 flex items-center gap-2"><ShieldCheck size={12}/> Nível Atual</label>
                                <select className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={formData.level} onChange={e => handleChange('level', e.target.value)}>
                                    <option value="Gokenin (Iniciante)">Gokenin (Iniciante)</option>
                                    <option value="Yoriki (Intermediário)">Yoriki (Intermediário)</option>
                                    <option value="Hatamoto (Avançado)">Hatamoto (Avançado)</option>
                                    <option value="Xogum (Atleta)">Xogum (Atleta)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* ABA FINANCEIRO */}
                    {activeTab === 'FINANCIAL' && formData.financial && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            {/* ... (financeiro mantido) ... */}
                            {/* Para brevidade, UI de financeiro idêntica */}
                            <div className={`p-6 rounded-3xl border flex items-center justify-between ${formData.financial.status === 'Em dia' ? 'bg-green-900/10 border-green-900/30' : formData.financial.status === 'Atrasado' ? 'bg-red-900/10 border-red-900/30' : 'bg-yellow-600/10 border-yellow-600/30'}`}>
                                <div><p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Status Atual</p><h3 className={`text-2xl font-black uppercase italic ${formData.financial.status === 'Em dia' ? 'text-green-600' : formData.financial.status === 'Atrasado' ? 'text-red-600' : 'text-yellow-600'}`}>{formData.financial.status}</h3></div>
                                {formData.financial.status === 'Atrasado' ? <AlertCircle size={32} className="text-red-600" /> : <CheckCircle2 size={32} className="text-green-600" />}
                            </div>
                             <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Divisão do Clã (Grupo)</label><div className="grid grid-cols-1 md:grid-cols-3 gap-2">{[{ id: 'Mentoria Presencial', label: 'Mentoria Presencial', icon: Users }, { id: 'Mentoria Online', label: 'Mentoria Online', icon: Wifi }, { id: 'Comunidade', label: 'Comunidade', icon: Globe }].map((group) => (<button key={group.id} onClick={() => handleChange('studentGroup', group.id)} className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 ${formData.studentGroup === group.id ? 'bg-red-900 text-white border-red-900' : `${inputBg} text-zinc-500 hover:border-red-900/30`}`}><group.icon size={20} className={formData.studentGroup === group.id ? 'text-white' : 'text-zinc-400'} /><span className="text-[10px] font-black uppercase text-center">{group.label}</span></button>))}</div></div>
                             {/* ... Inputs financeiros ... */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Plano Contratado</label><select className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={formData.financial.plan} onChange={e => handleFinancialChange('plan', e.target.value)}><option value="Mensal">Mensal</option><option value="Trimestral">Trimestral</option><option value="Semestral">Semestral</option><option value="Anual">Anual</option></select></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Valor (R$)</label><input type="number" className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={formData.financial.value} onChange={e => handleFinancialChange('value', Number(e.target.value))} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Vencimento</label><input type="date" className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={formData.financial.dueDate} onChange={e => handleFinancialChange('dueDate', e.target.value)} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Último Pagamento</label><input type="date" className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={formData.financial.lastPayment} onChange={e => handleFinancialChange('lastPayment', e.target.value)} /></div>
                             </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/5 bg-black/10 flex gap-4">
                     <button onClick={handleSave} className="flex-grow bg-red-900 text-white font-black py-4 rounded-3xl shadow-xl uppercase italic tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                        <Check size={20} /> Salvar Alterações
                     </button>
                </div>

            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL: STUDENT MANAGER ---
interface StudentManagerProps {
  onClose: () => void;
  students: Student[];
  onUpdateStudent: (student: Student) => void;
  onCreateStudent: (student: Student) => Promise<boolean>;
  onDeleteStudent: (id: string) => void;
  theme: 'Dia' | 'Noite';
  onOpenSchedule: (studentId?: string) => void; // Nova Prop
}

const StudentManager: React.FC<StudentManagerProps> = ({ onClose, students, onUpdateStudent, onCreateStudent, onDeleteStudent, theme, onOpenSchedule }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [workoutStudent, setWorkoutStudent] = useState<Student | null>(null);
  
  // Estado para filtro de divisões (Abas)
  const [activeTab, setActiveTab] = useState<'Todos' | StudentGroup>('Todos');

  // Filter students by Search and Group Tab
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = activeTab === 'Todos' || s.studentGroup === activeTab;
    
    return matchesSearch && matchesGroup;
  });

  const handleCreateStudent = () => {
    const newStudent: Student = {
        id: Math.random().toString(),
        name: 'Novo Aluno',
        email: 'email@exemplo.com',
        goal: 'Hipertrofia',
        level: 'Gokenin (Iniciante)',
        birthDate: new Date().toISOString().split('T')[0],
        gender: 'Masculino',
        weight: 70,
        height: 170,
        waterIntake: 2,
        date: new Date().toISOString().split('T')[0],
        workouts: [],
        trainingLogs: [],
        studentGroup: 'Mentoria Online', // Default mais comum
        isFirstLogin: true, // Novo: Marca como primeiro login
        hasAcceptedTerms: false, // Novo: Marca que não aceitou termos
        financial: { status: 'Em dia', plan: 'Mensal', dueDate: new Date().toISOString().split('T')[0], lastPayment: new Date().toISOString().split('T')[0], value: 100 }
    };
    // Não chama onUpdateStudent aqui, abre o modal primeiro para editar
    setSelectedStudent(newStudent); 
  };

  const handleSaveWorkouts = (workouts: Workout[]) => {
      if (workoutStudent) {
          const updated = { ...workoutStudent, workouts };
          onUpdateStudent(updated);
          setWorkoutStudent(null);
      }
  };
  
  const handleAddNewExercises = (newExercises: Partial<Exercise>[]) => {
      console.log("New exercises learned:", newExercises);
  }

  // Styles
  const modalBg = theme === 'Noite' ? 'bg-[#121212]' : 'bg-white';
  const cardBg = theme === 'Noite' ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-zinc-200 shadow-sm';
  const textColor = theme === 'Noite' ? 'text-white' : 'text-zinc-900';

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md p-6 flex items-center justify-center animate-in zoom-in-95">
       <div className={`${modalBg} w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl border border-red-900/30 flex flex-col overflow-hidden`}>
          {/* ... Header e Tabs mantidos ... */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-red-900/20 to-transparent">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-red-900 text-white rounded-2xl shadow-lg shadow-red-900/20"><ShieldCheck size={24} /></div>
                <div><h2 className={`text-xl font-black uppercase italic ${textColor}`}>Clã Warllley Samurai</h2><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Gestão de Discípulos</p></div>
             </div>
             <button onClick={onClose} className="p-2 text-zinc-500 hover:text-red-900 transition-colors"><X size={28} /></button>
          </div>
          <div className="px-6 pt-4 pb-2 flex gap-2 overflow-x-auto scroll-hide border-b border-white/5">{['Todos', 'Mentoria Presencial', 'Mentoria Online', 'Comunidade'].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-red-900 text-white' : `${theme === 'Noite' ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-600'} hover:bg-red-900/10 hover:text-red-900`}`}>{tab}</button>))}</div>

          <div className="p-6 flex gap-4 border-b border-white/5">
             <div className={`flex-grow ${theme === 'Noite' ? 'bg-black/40' : 'bg-slate-50'} rounded-2xl flex items-center px-4 border border-transparent focus-within:border-red-900/50 transition-all`}>
                <Search size={20} className="text-zinc-500" />
                <input 
                   className={`bg-transparent w-full p-4 font-bold text-sm focus:outline-none ${textColor}`} 
                   placeholder="Buscar por nome ou email..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <button onClick={handleCreateStudent} className="px-6 bg-red-900 text-white rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-red-800 transition-all active:scale-95">
                <UserPlus size={18} /> Novo Aluno
             </button>
          </div>

          <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map(student => (
                   <div key={student.id} className={`${cardBg} p-5 rounded-[2rem] border relative group hover:border-red-900/30 transition-all`}>
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-500 overflow-hidden">
                               {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" alt={student.name}/> : student.name.charAt(0)}
                            </div>
                            <div>
                               <h3 className={`font-black uppercase italic text-sm ${textColor}`}>{student.name}</h3>
                               <p className={`text-[10px] font-bold uppercase ${student.financial?.status === 'Atrasado' ? 'text-red-500' : 'text-green-500'}`}>{student.financial?.status || 'Em dia'}</p>
                            </div>
                         </div>
                         <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDeleteStudent(student.id);
                            }} 
                            className="p-3 bg-red-500/10 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all z-20 cursor-pointer flex-shrink-0"
                            title="Excluir Aluno"
                         >
                            <Trash2 size={18} />
                         </button>
                      </div>
                      
                      <div className="space-y-2 mb-6">
                         <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 border-b border-white/5 pb-1"><span>Divisão</span><span className={textColor}>{student.studentGroup || 'Comunidade'}</span></div>
                         <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 border-b border-white/5 pb-1"><span>Nível</span><span className={textColor}>{student.level.split(' ')[0]}</span></div>
                         <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 border-b border-white/5 pb-1"><span>Objetivo</span><span className={textColor}>{student.goal}</span></div>
                      </div>

                      <div className="flex gap-2">
                         <button onClick={() => setSelectedStudent(student)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${theme === 'Noite' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-zinc-600'}`}>
                            <Edit3 size={14} /> Ficha
                         </button>
                         <button onClick={() => setWorkoutStudent(student)} className="flex-1 py-3 bg-red-900/10 text-red-900 hover:bg-red-900 hover:text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all">
                            <Dumbbell size={14} /> Treinos
                         </button>
                         {/* NOVO BOTÃO DE AGENDA */}
                         <button onClick={() => onOpenSchedule(student.id)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all" title="Ver Agenda">
                            <Clock size={14} /> Agenda
                         </button>
                      </div>
                   </div>
                ))}
             </div>
             {filteredStudents.length === 0 && (
                <div className="text-center py-20 opacity-50">
                   <User size={48} className="mx-auto mb-4 text-zinc-600" />
                   <p className="text-sm font-bold uppercase italic text-zinc-500">Nenhum guerreiro encontrado</p>
                </div>
             )}
          </div>
       </div>
       {/* Modais de detalhes e workouts */}
       {selectedStudent && (
          <StudentDetailModal 
             student={selectedStudent} 
             onClose={() => setSelectedStudent(null)} 
             onUpdate={async (data) => {
                 // Check if it is a new student (by checking if email exists in current list)
                 // Note: Ideally we should use a more robust way, but here we can check if the student was just created via handleCreateStudent
                 // or check if email is already in 'students' array.
                 
                 const existing = students.find(s => s.email === data.email);
                 if (existing) {
                     onUpdateStudent(data);
                 } else {
                     try {
                        await onCreateStudent(data);
                        alert("Aluno criado com sucesso!");
                     } catch (e) {
                        alert("Erro ao criar aluno. Verifique se o e-mail já existe.");
                     }
                 }
             }}
             onOpenWorkouts={() => {
                setWorkoutStudent(selectedStudent);
                setSelectedStudent(null);
             }}
             theme={theme}
          />
       )}

       {workoutStudent && (
          <StudentWorkoutManager 
             student={workoutStudent}
             onClose={() => setWorkoutStudent(null)}
             onSave={handleSaveWorkouts}
             availableExercises={MOCK_EXERCISES}
             onAddNewExercises={handleAddNewExercises}
             theme={theme}
          />
       )}
    </div>
  );
};

export default StudentManager;
