
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Workout, Exercise, SoundConfig, ActiveWorkoutSession, AudioSettings, TrainingLog } from '../types';
import { ChevronRight, CheckCircle2, Info, Sword, Target, Play, X, Loader2, ExternalLink, AlertCircle, Lock, Unlock, Timer, Dumbbell, Plus, Minus, Volume2, VolumeX, Ghost, FastForward, Rewind, Scroll, Pause, PlayCircle } from 'lucide-react';

interface WorkoutsViewProps {
  workouts: Workout[];
  theme: 'Dia' | 'Noite';
  soundConfig?: SoundConfig;
  audioSettings: AudioSettings; // Nova Prop
  onUpdateAudioSettings: (s: AudioSettings) => void; // Nova Prop
  activeSession: ActiveWorkoutSession | null;
  onStartSession: (workout: Workout) => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onUpdateSessionData: (exerciseId: string, setIndex: number, data: { weight: number, reps: string, done: boolean }) => void;
  onFinishSession: (log?: TrainingLog) => void;
}

const MOTIVATIONAL_PHRASES = [
  "A dor de hoje é a força de amanhã.",
  "O aço mais forte é forjado no fogo mais quente.",
  "Não conte os dias, faça os dias contarem.",
  "A disciplina é a ponte entre metas e realizações.",
  "Honra, Coragem e Força. Missão cumprida.",
  "O verdadeiro guerreiro não desiste quando cansa, mas quando conclui."
];

const toFreeExerciseId = () =>
  `free-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;

const WorkoutsView: React.FC<WorkoutsViewProps> = ({ 
    workouts, 
    theme, 
    soundConfig, 
    audioSettings,
    onUpdateAudioSettings,
    activeSession, 
    onStartSession, 
    onPauseSession, 
    onResumeSession, 
    onUpdateSessionData, 
    onFinishSession
}) => {
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
  const [restTimer, setRestTimer] = useState<number>(0); 
  const [isResting, setIsResting] = useState(false);
  const [showFreeWorkoutBuilder, setShowFreeWorkoutBuilder] = useState(false);
  const [freeWorkoutExercises, setFreeWorkoutExercises] = useState<Exercise[]>([]);
  const [freeWorkoutBuilderExercises, setFreeWorkoutBuilderExercises] = useState<Exercise[]>([]);
  
  // Timer de Duração Total da Sessão (Visual)
  const [elapsedTime, setElapsedTime] = useState(0);

  // Estado da contagem regressiva (3, 2, 1, null)
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Estado do Modal de Conclusão (Pergaminho)
  const [conclusionData, setConclusionData] = useState<{duration: number, phrase: string} | null>(null);
  
  // Referência persistente para o contexto de áudio (Singleton no componente)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const freeExerciseCatalog = useMemo(() => {
    const catalog = new Map<string, Exercise>();
    workouts.forEach(workout => {
      workout.exercises.forEach(ex => {
        const key = ex.name.trim().toLowerCase();
        if (!key || catalog.has(key)) return;
        catalog.set(key, { ...ex, id: toFreeExerciseId() });
      });
    });
    return Array.from(catalog.values());
  }, [workouts]);

  // Recalcular currentWorkout sempre que activeSession mudar
  const currentWorkout = useMemo(() => {
    if (!activeSession) return null;
    let w = workouts.find(w => w.id === activeSession.workoutId);
    
    if (activeSession.workoutId === 'free-mode' && !w) {
        w = {
            id: 'free-mode',
            title: activeSession.workoutTitle,
            description: 'Caminho sem mestre.',
            exercises: freeWorkoutExercises,
            isLocked: false
        };
    }
    return w;
  }, [activeSession, workouts, freeWorkoutExercises]);

  // --- EFEITO DO TIMER DE DURAÇÃO ---
  useEffect(() => {
    let interval: any;
    if (activeSession && !activeSession.isPaused && !countdown) {
        interval = setInterval(() => {
            const now = new Date();
            const lastResume = activeSession.lastResumeTime ? new Date(activeSession.lastResumeTime) : now;
            const currentSegment = (now.getTime() - lastResume.getTime()) / 1000;
            setElapsedTime(activeSession.accumulatedDuration + currentSegment);
        }, 1000);
    } else if (activeSession && activeSession.isPaused) {
        setElapsedTime(activeSession.accumulatedDuration);
    }
    return () => clearInterval(interval);
  }, [activeSession, countdown]);

  const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- SISTEMA DE ÁUDIO SINTETIZADO (WEB AUDIO API) ---
  const getAudioContext = () => {
      if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
              audioCtxRef.current = new AudioContext();
          }
      }
      return audioCtxRef.current;
  };

  const playSound = (type: 'BEEP' | 'GONG' | 'CHECK' | 'ALARM' | 'VICTORY') => {
      // 1. Verificação Mestre
      if (!audioSettings.masterEnabled) return;

      // 2. Verificação Específica e Volume
      let volume = audioSettings.masterVolume;
      let isEnabled = true;

      // Mapeamento do tipo de evento para a categoria no AudioSettings
      if (type === 'GONG') { // Start
          isEnabled = audioSettings.types.start.enabled;
          volume *= audioSettings.types.start.volume;
      } else if (type === 'ALARM') { // Rest
          isEnabled = audioSettings.types.rest.enabled;
          volume *= audioSettings.types.rest.volume;
      } else if (type === 'VICTORY') { // Finish
          isEnabled = audioSettings.types.finish.enabled;
          volume *= audioSettings.types.finish.volume;
      } else { // UI Sounds (Beep, Check)
          isEnabled = audioSettings.types.ui.enabled;
          volume *= audioSettings.types.ui.volume;
      }

      if (!isEnabled || volume <= 0.01) return;

      // 3. Tentar tocar som customizado se disponível
      if (soundConfig) {
          let customUrl = '';
          if (type === 'GONG') customUrl = soundConfig.start[soundConfig.selectedStart];
          if (type === 'ALARM') customUrl = soundConfig.rest[soundConfig.selectedRest];
          if (type === 'VICTORY') customUrl = soundConfig.finish[soundConfig.selectedFinish];

          if (customUrl) {
              const audio = new Audio(customUrl);
              audio.volume = volume; // Aplica o volume calculado
              audio.play().catch(e => {
                  console.warn("Falha ao tocar som customizado, usando fallback.", e);
                  playSynthSound(type, volume); // Fallback
              });
              return;
          }
      }

      // 4. Se não houver customizado, tocar synth
      playSynthSound(type, volume);
  };

  const playSynthSound = (type: 'BEEP' | 'GONG' | 'CHECK' | 'ALARM' | 'VICTORY', volume: number) => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        
        // Garante que o contexto esteja rodando (política de autoplay)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        switch (type) {
            case 'BEEP': // Contagem (Agudo curto)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
                gain.gain.setValueAtTime(0.3 * volume, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'GONG': // Início (Grave e longo)
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 1.5);
                gain.gain.setValueAtTime(0.8 * volume, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
                osc.start(now);
                osc.stop(now + 2.0);
                break;

            case 'CHECK': // Click (Seco)
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                gain.gain.setValueAtTime(0.1 * volume, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;

            case 'ALARM': // Fim Descanso (Duplo Bip)
                osc.type = 'sine';
                // Bip 1
                osc.frequency.setValueAtTime(880, now);
                gain.gain.setValueAtTime(0.3 * volume, now);
                gain.gain.setValueAtTime(0, now + 0.1);
                // Bip 2
                osc.frequency.setValueAtTime(880, now + 0.15);
                gain.gain.setValueAtTime(0.3 * volume, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                
                osc.start(now);
                osc.stop(now + 0.5);
                break;

            case 'VICTORY': // Vitória (Arpejo rápido)
                osc.type = 'triangle';
                gain.gain.value = 0.3 * volume;
                
                // Nota 1
                osc.frequency.setValueAtTime(440, now); // A4
                osc.frequency.setValueAtTime(554, now + 0.1); // C#5
                osc.frequency.setValueAtTime(659, now + 0.2); // E5
                osc.frequency.setValueAtTime(880, now + 0.3); // A5
                
                gain.gain.setValueAtTime(0.3 * volume, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.8);
                
                osc.start(now);
                osc.stop(now + 0.8);
                break;
        }
    } catch (e) {
        console.error("Audio Error", e);
    }
  };

  // Efeito da Contagem Regressiva
  useEffect(() => {
    let timer: any;
    if (countdown !== null) {
        if (countdown > 0) {
            playSynthSound('BEEP', audioSettings.masterVolume * audioSettings.types.ui.volume); // Beep usa volume UI
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else {
            // Chegou a 0, inicia o treino
            playSound('GONG');
            setCountdown(null);
            // setStartTime(new Date()); // Start time is managed globally now
        }
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Timer Effect (Descanso)
  useEffect(() => {
    let interval: any;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => prev - 1);
      }, 1000);
    } else if (isResting && restTimer === 0) {
      setIsResting(false);
      playSound('ALARM');
      if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const startWorkout = (workout: Workout) => {
    // Inicializa o áudio no clique do usuário para desbloquear autoplay
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();

    onStartSession(workout);
    setCountdown(3); 
  };

  const addFreeExercise = () => {
    setFreeWorkoutBuilderExercises(prev => [
      ...prev,
      { id: toFreeExerciseId(), name: '', category: 'Core', type: 'Peso Livre', sets: 4, reps: '10', weight: 0, rest: '60s', videoUrl: '' }
    ]);
  };

  const removeFreeExercise = (index: number) => {
    setFreeWorkoutBuilderExercises(prev => {
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const updateFreeExerciseField = (index: number, field: keyof Exercise, value: string | number) => {
    setFreeWorkoutBuilderExercises(prev =>
      prev.map((ex, idx) => idx === index ? { ...ex, [field]: value } : ex)
    );
  };

  const replaceFreeExerciseByName = (index: number, exerciseName: string) => {
    if (!exerciseName) {
      setFreeWorkoutBuilderExercises(prev =>
        prev.map((ex, idx) => idx === index ? { ...ex, name: '', category: 'Core', type: 'Peso Livre' } : ex)
      );
      return;
    }
    const selected = freeExerciseCatalog.find(ex => ex.name === exerciseName);
    if (!selected) {
      updateFreeExerciseField(index, 'name', exerciseName);
      return;
    }
    setFreeWorkoutBuilderExercises(prev =>
      prev.map((ex, idx) => idx === index ? { ...selected, id: ex.id } : ex)
    );
  };

  const startFreeWorkout = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();

    const sanitizedExercises = freeWorkoutBuilderExercises
      .filter(ex => ex.name.trim().length > 0)
      .map(ex => ({ ...ex, id: ex.id || toFreeExerciseId() }));

    if (sanitizedExercises.length === 0) {
      return;
    }

    const freeWorkout: Workout = {
      id: 'free-mode',
      title: 'Treino Ronin (Livre)',
      description: 'Caminho sem mestre. Escolha suas batalhas.',
      exercises: sanitizedExercises,
      isLocked: false
    };
    
    setFreeWorkoutExercises(sanitizedExercises);
    setShowFreeWorkoutBuilder(false);
    onStartSession(freeWorkout);
    setCountdown(3);
  };

  const toggleSet = (exerciseId: string, setIndex: number, defaultWeight: number, defaultReps: string, restString: string) => {
    if (!activeSession) return;

    const currentSetData = activeSession.sessionData[exerciseId]?.[setIndex];
    const isDone = currentSetData?.done;

    const newData = {
        weight: currentSetData?.weight || defaultWeight,
        reps: currentSetData?.reps || defaultReps,
        done: !isDone
    };

    onUpdateSessionData(exerciseId, setIndex, newData);

    if (!isDone) {
        playSound('CHECK');
        const restSeconds = parseInt(restString.replace(/\D/g, '')) || 60;
        setRestTimer(restSeconds);
        setIsResting(true);
    }
  };

  const updateSetData = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: any) => {
    if (!activeSession) return;
    
    const currentData = activeSession.sessionData[exerciseId]?.[setIndex] || { weight: 0, reps: '', done: false };
    const newData = { ...currentData, [field]: value };
    
    onUpdateSessionData(exerciseId, setIndex, newData);
  };

  const adjustTimer = (seconds: number) => {
      setRestTimer(prev => Math.max(0, prev + seconds));
  };

  const finishWorkout = () => {
    playSound('VICTORY');
    
    const duration = Math.round(elapsedTime / 60);
    const phrase = MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)];

    setConclusionData({ duration, phrase });
  };

  const closeConclusion = () => {
      // Create Log
      if (activeSession && currentWorkout) {
          const exercisesLog = currentWorkout.exercises.map(ex => {
              const setsData = activeSession.sessionData[ex.id] || {};
              // Count completed sets
              const setsCount = Object.values(setsData).filter((s: any) => s.done).length;
              
              if (setsCount === 0) return null;

              // Find data from the last completed set (or defaults)
              const lastSetIndex = Object.keys(setsData).map(Number).sort((a,b) => b-a).find(idx => setsData[idx].done);
              const lastSet = lastSetIndex !== undefined ? setsData[lastSetIndex] : null;

              return {
                  name: ex.name,
                  sets: setsCount,
                  reps: lastSet ? lastSet.reps : ex.reps,
                  weight: lastSet ? lastSet.weight : ex.weight
              };
          }).filter(Boolean) as { name: string, sets: number, reps: string, weight: number }[];

          const log: TrainingLog = {
              id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
              date: new Date().toISOString().split('T')[0],
              workoutTitle: currentWorkout.title,
              duration: `${Math.round(elapsedTime / 60)} min`,
              totalLoad: 0, // Implementar cálculo se necessário
              totalVolume: 0,
              exercises: exercisesLog
          };
          
          onFinishSession(log);
      } else {
          onFinishSession();
      }
      
      setConclusionData(null);
      setIsResting(false);
  };

  // Styles
  const bubbleBg = theme === 'Noite' ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-zinc-200 shadow-md';
  const textColor = theme === 'Noite' ? 'text-white' : 'text-zinc-900';
  const subTextColor = theme === 'Noite' ? 'text-zinc-500' : 'text-zinc-500';
  const activeInputBg = theme === 'Noite' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900';

  // --- MODO DE EXECUÇÃO (ACTIVE BATTLE) ---
  if (activeSession) {
    if (!currentWorkout) {
        return <div className="p-8 text-center text-red-500 font-bold">Erro: Treino não encontrado. <button onClick={() => onFinishSession()} className="underline">Resetar</button></div>;
    }

    return (
      <div className="pb-24 animate-in slide-in-from-right-4 relative min-h-screen">
        
        {/* MODAL DE CONCLUSÃO (PERGAMINHO) */}
        {conclusionData && (
            <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-500">
                <div className="relative w-full max-w-md bg-[#f4e4bc] text-[#4a3b2a] p-8 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center text-center overflow-hidden">
                    {/* Efeitos de papel */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-[#dcc694] opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-[#dcc694] opacity-50"></div>
                    
                    {/* Haste Superior e Inferior (Visual de Scroll) */}
                    <div className="absolute -top-3 left-2 right-2 h-6 bg-[#2c1810] rounded-full shadow-lg"></div>
                    <div className="absolute -bottom-3 left-2 right-2 h-6 bg-[#2c1810] rounded-full shadow-lg"></div>

                    <Scroll size={48} className="text-[#8b2e2e] mb-4 opacity-80" />
                    
                    <h2 className="text-2xl font-black uppercase tracking-widest text-[#8b2e2e] mb-2 font-serif border-b-2 border-[#8b2e2e]/20 pb-2 w-full">Honra Conquistada</h2>
                    
                    <div className="my-6 space-y-4">
                        <p className="text-lg font-serif font-bold italic leading-relaxed">
                            "{conclusionData.phrase}"
                        </p>
                        <div className="py-4 border-y border-[#4a3b2a]/10 w-full flex justify-around">
                             <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Duração</p>
                                 <p className="text-xl font-black font-serif">{conclusionData.duration} min</p>
                             </div>
                             <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</p>
                                 <p className="text-xl font-black font-serif text-[#8b2e2e]">Vencido</p>
                             </div>
                        </div>
                    </div>

                    <button 
                        onClick={closeConclusion}
                        className="mt-4 px-8 py-3 bg-[#8b2e2e] text-[#f4e4bc] font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:bg-[#681e1e] transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Sword size={16} /> Selar Pergaminho
                    </button>
                </div>
            </div>
        )}

        {/* OVERLAY DE CONTAGEM REGRESSIVA */}
        {countdown !== null && (
            <div className="fixed inset-0 z-[150] bg-red-900 flex flex-col items-center justify-center animate-in fade-in duration-200">
                <div className="text-[12rem] font-black italic text-white animate-pulse leading-none">
                    {countdown}
                </div>
                <p className="text-xl font-black uppercase tracking-[0.5em] text-red-200 mt-4">Prepare-se</p>
            </div>
        )}

        {/* Header Fixo do Treino */}
        <div className={`sticky top-0 z-30 ${theme === 'Noite' ? 'bg-black/90' : 'bg-white/90'} backdrop-blur-md border-b border-red-900/30 p-4 mb-4 rounded-b-3xl shadow-lg flex justify-between items-center`}>
          <div>
            <h2 className={`text-lg font-black uppercase italic ${textColor}`}>{activeSession.workoutTitle}</h2>
            {isResting ? (
               <div className="flex items-center gap-2 text-red-600 animate-pulse">
                  <Timer size={16} />
                  <span className="text-xl font-black font-mono">{restTimer}s</span>
               </div>
            ) : (
               <div className="flex items-center gap-2">
                   <p className={`text-[10px] font-bold uppercase ${activeSession.isPaused ? 'text-yellow-500' : 'text-zinc-500'}`}>
                       {activeSession.isPaused ? 'Sessão Pausada' : 'Em Batalha...'}
                   </p>
                   <span className={`text-xs font-mono font-bold ${activeSession.isPaused ? 'text-zinc-500' : 'text-red-700'}`}>
                       {formatTime(elapsedTime)}
                   </span>
               </div>
            )}
          </div>
          <div className="flex gap-2">
             <button onClick={() => activeSession.isPaused ? onResumeSession() : onPauseSession()} className={`p-2 rounded-full ${activeSession.isPaused ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'} shadow-lg active:scale-95 transition-all`}>
                {activeSession.isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
             </button>
             <button onClick={() => onUpdateAudioSettings({...audioSettings, masterEnabled: !audioSettings.masterEnabled})} className={`p-2 rounded-full ${audioSettings.masterEnabled ? 'bg-zinc-800 text-zinc-200' : 'bg-red-900 text-white'}`}>
               {audioSettings.masterEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
             </button>
          </div>
        </div>

        {/* Lista de Exercícios */}
        <div className={`space-y-6 px-1 ${activeSession.isPaused ? 'opacity-50 pointer-events-none filter grayscale' : ''}`}>
          {currentWorkout.exercises.map((ex, exIndex) => (
            <div key={ex.id} className={`${bubbleBg} border rounded-3xl overflow-hidden`}>
              {/* Cabeçalho do Exercício */}
              <div 
                className={`p-4 flex justify-between items-center cursor-pointer ${activeExerciseIndex === exIndex ? 'bg-red-900/10' : ''}`}
                onClick={() => setActiveExerciseIndex(activeExerciseIndex === exIndex ? null : exIndex)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${activeExerciseIndex === exIndex ? 'bg-red-900 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                    {exIndex + 1}
                  </div>
                  <div>
                     <h3 className={`font-black uppercase italic text-sm ${textColor}`}>{ex.name}</h3>
                     <p className="text-[10px] font-bold text-zinc-500">{ex.sets} Séries • Descanso {ex.rest}</p>
                  </div>
                </div>
                <ChevronRight size={18} className={`text-zinc-500 transition-transform ${activeExerciseIndex === exIndex ? 'rotate-90' : ''}`} />
              </div>

              {/* Corpo Expandido (Séries) */}
              {activeExerciseIndex === exIndex && (
                <div className="p-4 space-y-3 bg-black/5">
                  {/* Cabeçalho da Tabela */}
                  <div className="grid grid-cols-10 gap-2 mb-2 px-2 text-[9px] font-black uppercase text-zinc-500 text-center">
                     <div className="col-span-1">Set</div>
                     <div className="col-span-3">Kg</div>
                     <div className="col-span-3">Reps</div>
                     <div className="col-span-3">Status</div>
                  </div>

                  {Array.from({ length: ex.sets }).map((_, setIdx) => {
                    const setData = activeSession.sessionData[ex.id]?.[setIdx] || { weight: ex.weight, reps: ex.reps, done: false };
                    
                    return (
                      <div key={setIdx} className={`grid grid-cols-10 gap-2 items-center p-2 rounded-xl transition-all ${setData.done ? 'bg-green-900/20 border border-green-900/30' : 'bg-white/5'}`}>
                        <div className="col-span-1 text-center font-black text-xs text-zinc-500">{setIdx + 1}</div>
                        
                        <div className="col-span-3">
                           <input 
                              type="number" 
                              className={`w-full text-center p-2 rounded-lg text-xs font-bold ${activeInputBg} focus:outline-none focus:ring-2 focus:ring-red-900`}
                              value={setData.weight}
                              onChange={(e) => updateSetData(ex.id, setIdx, 'weight', Number(e.target.value))}
                              placeholder="kg"
                              disabled={setData.done}
                           />
                        </div>
                        
                        <div className="col-span-3">
                           <input 
                              type="text" 
                              className={`w-full text-center p-2 rounded-lg text-xs font-bold ${activeInputBg} focus:outline-none focus:ring-2 focus:ring-red-900`}
                              value={setData.reps}
                              onChange={(e) => updateSetData(ex.id, setIdx, 'reps', e.target.value)}
                              placeholder="reps"
                              disabled={setData.done}
                           />
                        </div>

                        <div className="col-span-3">
                           <button 
                              onClick={() => toggleSet(ex.id, setIdx, setData.weight || ex.weight, setData.reps || ex.reps, ex.rest)}
                              className={`w-full py-2 rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-lg ${setData.done ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-red-900 hover:text-white'}`}
                           >
                              {setData.done ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                           </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {ex.videoUrl && (
                    <div className="mt-4 pt-4 border-t border-white/5 text-center">
                        <a href={ex.videoUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase text-red-800 hover:underline flex items-center justify-center gap-1">
                            <Play size={10} /> Ver execução do movimento
                        </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Botão de Finalizar */}
        <div className="fixed bottom-24 left-4 right-4 z-40">
           <button 
             onClick={finishWorkout}
             disabled={activeSession.isPaused}
             className={`w-full font-black py-5 rounded-3xl border flex items-center justify-center gap-3 uppercase italic tracking-widest active:scale-95 transition-all ${activeSession.isPaused ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-red-900 hover:bg-red-800 text-white shadow-[0_10px_30px_rgba(153,27,27,0.4)] border-red-700'}`}
           >
             <Sword size={24} /> {activeSession.isPaused ? 'Sessão Pausada' : 'Finalizar Guerra'}
           </button>
        </div>

        {/* Overlay de Pausa */}
        {activeSession.isPaused && (
            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
                <button onClick={onResumeSession} className="bg-green-600 text-white p-6 rounded-full shadow-[0_0_50px_rgba(22,163,74,0.6)] animate-pulse hover:scale-110 transition-transform">
                    <Play size={48} fill="currentColor" />
                </button>
            </div>
        )}

        {/* Overlay de Descanso (Tela Cheia Opaca ou Modal Inferior) */}
        {isResting && !activeSession.isPaused && (
           <div className="fixed bottom-0 left-0 right-0 bg-red-900 z-50 px-6 py-6 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-full border-t border-red-700">
               <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-full animate-spin-slow">
                         <Timer size={28} className="text-white" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-red-200 tracking-[0.2em]">Recuperando</p>
                         <p className="text-5xl font-black text-white font-mono leading-none mt-1">{restTimer}s</p>
                      </div>
                   </div>
                   <button onClick={() => { setRestTimer(0); setIsResting(false); }} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold text-white uppercase tracking-widest border border-white/10">
                      Pular
                   </button>
               </div>
               
               {/* Controles do Timer */}
               <div className="flex gap-2">
                   <button onClick={() => adjustTimer(-10)} className="flex-1 py-4 bg-black/20 hover:bg-black/30 rounded-2xl text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                       <Rewind size={18} /> -10s
                   </button>
                   <button onClick={() => adjustTimer(10)} className="flex-1 py-4 bg-black/20 hover:bg-black/30 rounded-2xl text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                       +10s <FastForward size={18} />
                   </button>
               </div>
           </div>
        )}
      </div>
    );
  }

  // --- MODO MENU (LISTA DE TREINOS) ---
  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-800/10 rounded-2xl text-red-800 shadow-xl shadow-red-800/5">
            <Sword size={32} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase text-zinc-600 tracking-[0.2em]">Protocolos de Guerra</h2>
            <h3 className={`text-3xl font-black uppercase italic ${textColor}`}>Escolha sua Batalha</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {showFreeWorkoutBuilder && (
          <div className="fixed inset-0 z-[160] bg-black/75 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center">
            <div className={`w-full max-w-2xl rounded-[2rem] border p-5 sm:p-6 max-h-[90vh] overflow-y-auto ${theme === 'Noite' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-xl font-black uppercase italic ${textColor}`}>Configurar Treino Livre</h3>
                  <p className="text-[10px] font-bold uppercase text-zinc-500 mt-1">Escolha os exercícios e inicie quando estiver pronto.</p>
                </div>
                <button onClick={() => setShowFreeWorkoutBuilder(false)} className="p-2 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {freeWorkoutBuilderExercises.length === 0 && (
                  <div className={`rounded-2xl border p-6 text-center ${theme === 'Noite' ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50'}`}>
                    <p className="text-sm font-black uppercase text-zinc-500">Nenhum exercício selecionado</p>
                    <p className="text-[10px] font-bold uppercase text-zinc-500 mt-2">Toque em adicionar exercício para montar seu treino livre.</p>
                  </div>
                )}

                {freeWorkoutBuilderExercises.map((exercise, idx) => (
                  <div key={exercise.id} className={`rounded-2xl border p-3 ${theme === 'Noite' ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50'}`}>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-6">
                        <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Exercício / Aparelho</label>
                        <select
                          value={exercise.name || ''}
                          onChange={(e) => replaceFreeExerciseByName(idx, e.target.value)}
                          className={`w-full p-2 rounded-xl text-xs font-bold ${activeInputBg} focus:outline-none focus:ring-2 focus:ring-red-900`}
                        >
                          <option value="">Selecionar...</option>
                          {freeExerciseCatalog.map(option => (
                            <option key={option.name} value={option.name}>{option.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={exercise.name}
                          onChange={(e) => updateFreeExerciseField(idx, 'name', e.target.value)}
                          placeholder="Ou digite o exercício"
                          className={`w-full mt-2 p-2 rounded-xl text-xs font-bold ${activeInputBg} focus:outline-none focus:ring-2 focus:ring-red-900`}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Séries</label>
                        <input
                          type="number"
                          min={1}
                          value={exercise.sets}
                          onChange={(e) => updateFreeExerciseField(idx, 'sets', Math.max(1, Number(e.target.value) || 1))}
                          className={`w-full p-2 rounded-xl text-xs font-bold ${activeInputBg} focus:outline-none focus:ring-2 focus:ring-red-900`}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Reps</label>
                        <input
                          type="text"
                          value={exercise.reps}
                          onChange={(e) => updateFreeExerciseField(idx, 'reps', e.target.value)}
                          className={`w-full p-2 rounded-xl text-xs font-bold ${activeInputBg} focus:outline-none focus:ring-2 focus:ring-red-900`}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Descanso</label>
                        <input
                          type="number"
                          min={0}
                          value={Number(exercise.rest.replace(/\D/g, '')) || 60}
                          onChange={(e) => updateFreeExerciseField(idx, 'rest', `${Math.max(0, Number(e.target.value) || 0)}s`)}
                          className={`w-full p-2 rounded-xl text-xs font-bold ${activeInputBg} focus:outline-none focus:ring-2 focus:ring-red-900`}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-between items-center">
                      <p className="text-[10px] font-bold uppercase text-zinc-500">{exercise.category} • {exercise.type}</p>
                      <button
                        onClick={() => removeFreeExercise(idx)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-900 text-white hover:bg-red-800"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={addFreeExercise} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-black uppercase text-xs tracking-widest hover:bg-zinc-700">
                  + Adicionar Exercício
                </button>
                <button onClick={startFreeWorkout} disabled={freeWorkoutBuilderExercises.filter(ex => ex.name.trim().length > 0).length === 0} className={`flex-1 py-3 rounded-2xl font-black uppercase text-xs tracking-widest ${freeWorkoutBuilderExercises.filter(ex => ex.name.trim().length > 0).length === 0 ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-red-900 text-white hover:bg-red-800'}`}>
                  Iniciar Treino Livre
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card Treino Livre (Ronin) */}
        <button
          onClick={() => { setFreeWorkoutBuilderExercises([]); setShowFreeWorkoutBuilder(true); }}
          className={`w-full text-left p-6 rounded-[2.5rem] relative overflow-hidden group hover:scale-[1.01] transition-all shadow-xl border-2 border-dashed ${theme === 'Noite' ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-300 bg-zinc-50'}`}
        >
           <div className="flex justify-between items-center relative z-10">
              <div>
                 <h3 className={`text-xl font-black uppercase italic ${theme === 'Noite' ? 'text-zinc-400' : 'text-zinc-600'}`}>Treino Ronin (Livre)</h3>
                 <p className="text-[10px] font-bold uppercase text-zinc-500 mt-1">Sem mestre. Apenas instinto.</p>
                 <p className="text-[10px] font-bold uppercase text-red-800 mt-2">Monte do zero ao tocar aqui</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                 <Ghost size={24} />
              </div>
           </div>
        </button>

        {/* Lista de Treinos Normais */}
        {workouts.map((workout) => {
          const isLocked = workout.isLocked;

          return (
            <button
              key={workout.id}
              onClick={() => !isLocked && startWorkout(workout)}
              disabled={isLocked}
              className={`w-full text-left ${bubbleBg} p-6 rounded-[2.5rem] flex justify-between items-center group hover:scale-[1.01] transition-all shadow-xl relative overflow-hidden ${isLocked ? 'opacity-70 grayscale' : ''}`}
            >
              {isLocked && (
                 <div className="absolute inset-0 bg-black/10 z-20 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-black/80 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-xl">
                       <Lock size={14} /> Trancado pelo Mestre
                    </div>
                 </div>
              )}

              <div>
                <h3 className={`text-xl font-black group-hover:text-red-800 transition-colors uppercase italic tracking-tight ${textColor}`}>
                  {workout.title}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${subTextColor}`}>
                    {workout.exercises.length} Movimentos
                  </p>
                  <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                  <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest">
                    {workout.exercises[0]?.category || 'Geral'}
                  </p>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${theme === 'Noite' ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-200'} text-zinc-400 group-hover:text-red-800 group-hover:border-red-800/30 transition-all shadow-inner`}>
                {isLocked ? <Lock size={20} /> : <Play size={22} className="ml-1" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className={`mt-8 p-10 rounded-[3rem] border border-dashed text-center shadow-inner ${theme === 'Noite' ? 'bg-[#1A1A1A]/40 border-white/5' : 'bg-slate-50 border-zinc-300'}`}>
        <div className="w-14 h-14 bg-red-800/5 rounded-full flex items-center justify-center mx-auto mb-4 text-red-800/30">
          <Target size={28} />
        </div>
        <p className={`${subTextColor} font-bold uppercase text-xs tracking-[0.3em] mb-4 italic`}>A disciplina vence o talento.</p>
        <div className="flex justify-center gap-2 text-[10px] text-zinc-500 uppercase font-bold">
           <span className="flex items-center gap-1"><Volume2 size={12}/> Com Áudio</span>
           <span>•</span>
           <span className="flex items-center gap-1"><Timer size={12}/> Auto Timer</span>
        </div>
      </div>
    </div>
  );
};

export default WorkoutsView;
