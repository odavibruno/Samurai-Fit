
import React, { useMemo, useState } from 'react';
import { UserProfile, Exercise } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { Activity, RefreshCcw, TrendingUp, Info, Rotate3D } from 'lucide-react';

const MUSCLE_GROUPS: Exercise['category'][] = ['Peito', 'Costas', 'Pernas', 'Braços', 'Ombros', 'Core'];

const HealthView: React.FC<{ user: UserProfile, theme: 'Dia' | 'Noite' }> = ({ user, theme }) => {
  const [isFront, setIsFront] = useState(true);
  const findCategoryByExerciseName = (name: string) => {
    const normalizedName = name.trim().toLowerCase();
    for (const workout of user.workouts) {
      const matchedExercise = workout.exercises.find(exercise => exercise.name.trim().toLowerCase() === normalizedName);
      if (matchedExercise) {
        return matchedExercise.category;
      }
    }
    return null;
  };
  const recovery = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const latestActivityByCategory = MUSCLE_GROUPS.reduce((acc, category) => ({ ...acc, [category]: null as number | null }), {} as Record<Exercise['category'], number | null>);
    const fatigueByCategory = MUSCLE_GROUPS.reduce((acc, category) => ({ ...acc, [category]: 0 }), {} as Record<Exercise['category'], number>);
    const workoutMap = new Map(user.workouts.map(workout => [workout.title.trim().toLowerCase(), workout]));

    for (const log of user.trainingLogs) {
      const logDate = new Date(`${log.date}T00:00:00`);
      if (Number.isNaN(logDate.getTime())) continue;
      const dayDiff = Math.max(0, Math.floor((today.getTime() - logDate.getTime()) / 86400000));
      const categorySets: Partial<Record<Exercise['category'], number>> = {};

      for (const loggedExercise of log.exercises || []) {
        const category = findCategoryByExerciseName(loggedExercise.name);
        if (!category) continue;
        categorySets[category] = (categorySets[category] || 0) + Math.max(1, Number(loggedExercise.sets) || 0);
      }

      if (Object.keys(categorySets).length === 0) {
        const workout = workoutMap.get(log.workoutTitle.trim().toLowerCase());
        if (workout) {
          for (const exercise of workout.exercises) {
            categorySets[exercise.category] = (categorySets[exercise.category] || 0) + Math.max(1, exercise.sets || 0);
          }
        }
      }

      for (const category of Object.keys(categorySets) as Exercise['category'][]) {
        const currentLatest = latestActivityByCategory[category];
        if (currentLatest === null || dayDiff < currentLatest) {
          latestActivityByCategory[category] = dayDiff;
        }
        const recencyWeight = Math.max(0, 4 - dayDiff);
        const setLoad = categorySets[category] || 0;
        fatigueByCategory[category] += setLoad * recencyWeight;
      }
    }

    return MUSCLE_GROUPS.reduce((acc, category) => {
      const lastDay = latestActivityByCategory[category];
      const baseRecovery = lastDay === null ? 100 : Math.min(100, 20 + (lastDay * 20));
      const fatiguePenalty = Math.min(45, fatigueByCategory[category] * 1.2);
      const value = Math.max(5, Math.min(100, Math.round(baseRecovery - fatiguePenalty)));
      return { ...acc, [category]: value };
    }, {} as Record<Exercise['category'], number>);
  }, [user.trainingLogs, user.workouts]);
  const systemicRecovery = useMemo(() => {
    const values = Object.values(recovery);
    if (!values.length) return 0;
    return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);
  }, [recovery]);

  const getRecoveryColor = (val: number) => {
    if (val > 80) return '#22c55e'; // Green
    if (val > 40) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const bubbleColor = theme === 'Noite' ? 'bg-[#1A1A1A]' : 'bg-white shadow-xl border border-zinc-100';
  const textColor = theme === 'Noite' ? 'text-white' : 'text-zinc-900';

  const compositionData = user.statsHistory.map(s => ({
    date: s.date.slice(5),
    gordura: s.bodyFat || 0,
    massaMagra: s.muscleMass || 0,
    peso: s.weight
  }));

  const HumanBody3D = ({ front, gender }: { front: boolean, gender: string }) => {
      const colors = {
          head: theme === 'Noite' ? '#71717a' : '#d4d4d8', 
          chest: getRecoveryColor(front ? recovery.Peito : recovery.Costas),
          abs: getRecoveryColor(front ? recovery.Core : recovery.Costas),
          shoulders: getRecoveryColor(recovery.Ombros),
          arms: getRecoveryColor(recovery.Braços),
          legs: getRecoveryColor(recovery.Pernas)
      };

      const strokeColor = theme === 'Noite' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

      const defs = (
        <defs>
            <linearGradient id="gradBody" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="50%" stopColor="rgba(0,0,0,0.05)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
            </linearGradient>
            <filter id="glow3d">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <mask id="muscleMask">
               <rect x="-100" y="-200" width="200" height="400" fill="white" />
               {/* Linhas de definição muscular (negativas) */}
               <path d="M-2 -85 L-2 -45" stroke="black" strokeWidth="1" /> {/* Linha Alba */}
               <path d="M-15 -75 L15 -75" stroke="black" strokeWidth="0.5" /> {/* Abdomen Horizontal 1 */}
               <path d="M-13 -60 L13 -60" stroke="black" strokeWidth="0.5" /> {/* Abdomen Horizontal 2 */}
            </mask>
        </defs>
      );

      return (
          <svg viewBox="0 0 200 420" className="h-full w-auto drop-shadow-2xl transition-all duration-1000">
              {defs}
              
              <g transform="translate(100, 210)">
                  {/* Cabeça */}
                  <g filter="url(#glow3d)">
                    <ellipse cx="0" cy="-165" rx="14" ry="18" fill={colors.head} opacity="0.9" />
                    <path d="M-6 -148 L-6 -138 L6 -138 L6 -148" fill={colors.head} />
                  </g>

                  {front ? (
                      // FRENTE ANATÔMICA
                      <g stroke={strokeColor} strokeWidth="0.5">
                          {/* Ombros (Deltoides) */}
                          <path d="M-18 -140 Q-35 -145 -48 -130 Q-52 -115 -42 -105 Q-30 -120 -18 -125 Z" fill={colors.shoulders} opacity="0.95" />
                          <path d="M18 -140 Q35 -145 48 -130 Q52 -115 42 -105 Q30 -120 18 -125 Z" fill={colors.shoulders} opacity="0.95" />
                          
                          {/* Peitoral (Major) */}
                          <path d="M-2 -135 L-18 -138 Q-40 -130 -40 -110 Q-25 -95 -2 -100 Z" fill={colors.chest} opacity="0.9" />
                          <path d="M2 -135 L18 -138 Q40 -130 40 -110 Q25 -95 2 -100 Z" fill={colors.chest} opacity="0.9" />
                          
                          {/* Core (Abdomen + Obliquos) */}
                          <g mask="url(#muscleMask)">
                             {/* Reto Abdominal */}
                             <path d="M-15 -100 L-20 -50 L-10 -40 L0 -40 L10 -40 L20 -50 L15 -100 Q0 -90 -15 -100 Z" fill={colors.abs} opacity="0.85" />
                          </g>
                          {/* Obliquos (Laterais) */}
                          <path d="M-20 -95 Q-28 -80 -25 -55 L-20 -50 Z" fill={colors.abs} opacity="0.7" />
                          <path d="M20 -95 Q28 -80 25 -55 L20 -50 Z" fill={colors.abs} opacity="0.7" />

                          {/* Braços (Bíceps) */}
                          <path d="M-42 -105 Q-50 -100 -52 -80 Q-45 -75 -38 -80 L-35 -100 Z" fill={colors.arms} />
                          <path d="M42 -105 Q50 -100 52 -80 Q45 -75 38 -80 L35 -100 Z" fill={colors.arms} />
                          {/* Antebraços */}
                          <path d="M-52 -80 L-55 -40 Q-50 -35 -42 -40 L-38 -80 Z" fill={colors.arms} opacity="0.8" />
                          <path d="M52 -80 L55 -40 Q50 -35 42 -40 L38 -80 Z" fill={colors.arms} opacity="0.8" />
                          {/* Mãos */}
                          <circle cx="-48" cy="-32" r="5" fill={colors.arms} opacity="0.6"/>
                          <circle cx="48" cy="-32" r="5" fill={colors.arms} opacity="0.6"/>

                          {/* Pernas (Quadriceps - Vastus Lateralis/Medialis) */}
                          <path d="M-10 -40 Q-30 -30 -30 20 Q-32 50 -25 70 L-15 65 L-8 70 L-5 20 Z" fill={colors.legs} />
                          <path d="M10 -40 Q30 -30 30 20 Q32 50 25 70 L15 65 L8 70 L5 20 Z" fill={colors.legs} />
                          
                          {/* Joelhos */}
                          <path d="M-25 70 L-15 65 L-8 70 L-8 78 L-25 78 Z" fill={colors.legs} opacity="0.5" />
                          <path d="M25 70 L15 65 L8 70 L8 78 L25 78 Z" fill={colors.legs} opacity="0.5" />

                          {/* Canelas (Tibialis) */}
                          <path d="M-25 78 L-22 130 L-12 130 L-8 78 Z" fill={colors.legs} opacity="0.8" />
                          <path d="M25 78 L22 130 L12 130 L8 78 Z" fill={colors.legs} opacity="0.8" />
                          
                          {/* Pés */}
                          <path d="M-22 130 L-25 145 L-10 145 L-12 130 Z" fill={colors.legs} opacity="0.6" />
                          <path d="M22 130 L25 145 L10 145 L12 130 Z" fill={colors.legs} opacity="0.6" />
                      </g>
                  ) : (
                      // COSTAS ANATÔMICA
                      <g stroke={strokeColor} strokeWidth="0.5">
                          {/* Trapézio */}
                          <path d="M-6 -138 L-25 -135 L-6 -115 L0 -110 L6 -115 L25 -135 L6 -138 Z" fill={colors.shoulders} opacity="0.9" />

                          {/* Ombros Posteriores */}
                          <path d="M-25 -135 L-48 -130 L-45 -110 L-25 -120 Z" fill={colors.shoulders} opacity="0.9" />
                          <path d="M25 -135 L48 -130 L45 -110 L25 -120 Z" fill={colors.shoulders} opacity="0.9" />
                          
                          {/* Grande Dorsal (Lats) */}
                          <path d="M-6 -115 L-25 -120 L-40 -100 L-30 -70 L-5 -50 L0 -50 Z" fill={colors.chest} />
                          <path d="M6 -115 L25 -120 L40 -100 L30 -70 L5 -50 L0 -50 Z" fill={colors.chest} />
                          
                          {/* Lombar (Eretores da Espinha) */}
                          <path d="M-5 -50 L-10 -40 L0 -40 L10 -40 L5 -50 Z" fill={colors.abs} />

                          {/* Braços (Tríceps) */}
                          <path d="M-45 -110 L-52 -80 L-38 -80 L-35 -100 Z" fill={colors.arms} />
                          <path d="M45 -110 L52 -80 L38 -80 L35 -100 Z" fill={colors.arms} />
                          {/* Antebraços Post */}
                          <path d="M-52 -80 L-56 -40 L-40 -40 L-38 -80 Z" fill={colors.arms} opacity="0.8" />
                          <path d="M52 -80 L56 -40 L40 -40 L38 -80 Z" fill={colors.arms} opacity="0.8" />

                          {/* Glúteos */}
                          <path d="M-10 -40 Q-32 -30 -30 -5 Q-30 10 -5 10 L0 -5 Z" fill={colors.legs} opacity="0.95" />
                          <path d="M10 -40 Q32 -30 30 -5 Q30 10 5 10 L0 -5 Z" fill={colors.legs} opacity="0.95" />

                          {/* Posteriores de Coxa (Hamstrings) */}
                          <path d="M-5 10 Q-28 20 -25 70 L-8 70 L-5 20 Z" fill={colors.legs} />
                          <path d="M5 10 Q28 20 25 70 L8 70 L5 20 Z" fill={colors.legs} />
                          
                          {/* Panturrilhas (Gastrocnemius) */}
                          <path d="M-25 70 Q-32 90 -22 110 L-18 130 L-8 130 L-8 70 Z" fill={colors.legs} opacity="0.9" />
                          <path d="M25 70 Q32 90 22 110 L18 130 L8 130 L8 70 Z" fill={colors.legs} opacity="0.9" />
                      </g>
                  )}
                  
                  {/* Overlay de Sombra 3D Global */}
                  <g opacity="0.3" fill="url(#gradBody)" style={{ mixBlendMode: 'overlay' }}>
                      <rect x="-60" y="-180" width="120" height="350" rx="20" />
                  </g>
              </g>
          </svg>
      );
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <header className="flex items-center gap-3">
        <div className="p-3 bg-red-900/10 rounded-2xl text-red-900 shadow-sm"><Activity size={32} /></div>
        <div>
          <h2 className="text-sm font-black uppercase text-zinc-600 tracking-widest italic">Análise de Batalha</h2>
          <h3 className="text-3xl font-black uppercase italic">Saúde & Repouso</h3>
        </div>
      </header>

      {/* Modelo 3D Holográfico */}
      <section className={`${bubbleColor} p-8 rounded-[3rem] relative overflow-hidden transition-colors shadow-2xl`}>
        {/* Grid de fundo estilo Sci-Fi */}
        <div className="absolute inset-0 opacity-5" style={{ 
            backgroundImage: `linear-gradient(${theme === 'Noite' ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${theme === 'Noite' ? '#fff' : '#000'} 1px, transparent 1px)`, 
            backgroundSize: '40px 40px' 
        }}></div>

        <div className="flex justify-between items-center mb-8 relative z-10">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
            <RefreshCcw size={16} className="text-red-900" /> Recuperação Biológica 3D
          </h3>
          <button onClick={() => setIsFront(!isFront)} className="px-5 py-2.5 bg-zinc-800 text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-zinc-700 active:scale-95 transition-all flex items-center gap-2">
            <Rotate3D size={14} /> {isFront ? 'Ver Costas' : 'Ver Frente'}
          </button>
        </div>

        <div className="relative h-96 flex items-center justify-center perspective-1000">
          {/* Plataforma Holográfica */}
          <div className={`absolute bottom-0 w-48 h-12 bg-red-900/20 rounded-[100%] blur-xl animate-pulse`}></div>
          
          <div className={`transition-all duration-700 transform ${isFront ? 'scale-100 rotate-y-0' : 'scale-100 rotate-y-180'} h-full flex items-center justify-center`}>
             <HumanBody3D front={isFront} gender={user.gender} />
          </div>

          {/* Legenda Flutuante Direita */}
          <div className="absolute inset-y-0 right-0 flex flex-col justify-center gap-4 py-4 z-10">
            {Object.entries(recovery).slice(0, 3).map(([muscle, val]) => (
              <div key={muscle} className={`${theme === 'Noite' ? 'bg-black/80' : 'bg-white/90'} p-3 pr-6 rounded-l-2xl border-y border-l border-r-0 border-red-900/20 backdrop-blur-md shadow-lg translate-x-2 hover:translate-x-0 transition-transform group`}>
                <p className="text-[9px] font-black uppercase text-zinc-500 group-hover:text-red-900 transition-colors">{muscle}</p>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getRecoveryColor(val) }}></div>
                    <p className={`text-sm font-black italic ${theme === 'Noite' ? 'text-white' : 'text-zinc-900'}`}>{val}%</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Legenda Flutuante Esquerda */}
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center gap-4 py-4 z-10">
            {Object.entries(recovery).slice(3, 6).map(([muscle, val]) => (
              <div key={muscle} className={`${theme === 'Noite' ? 'bg-black/80' : 'bg-white/90'} p-3 pl-6 rounded-r-2xl border-y border-r border-l-0 border-red-900/20 backdrop-blur-md shadow-lg -translate-x-2 hover:translate-x-0 transition-transform group text-right`}>
                <p className="text-[9px] font-black uppercase text-zinc-500 group-hover:text-red-900 transition-colors">{muscle}</p>
                <div className="flex items-center gap-2 justify-end">
                    <p className={`text-sm font-black italic ${theme === 'Noite' ? 'text-white' : 'text-zinc-900'}`}>{val}%</p>
                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getRecoveryColor(val) }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`mt-8 text-center ${theme === 'Noite' ? 'bg-black/40' : 'bg-slate-50'} p-5 rounded-[2rem] border ${theme === 'Noite' ? 'border-white/5' : 'border-zinc-200'} shadow-inner relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-1 h-full bg-red-900"></div>
          <p className="text-[10px] font-black text-red-900 uppercase tracking-[0.4em] mb-1 italic">Veredito do Sábio</p>
          <p className={`text-sm font-bold uppercase italic ${theme === 'Dia' ? 'text-zinc-900' : 'text-white'}`}>
            Recuperação Sistêmica: <span className="text-red-700 text-lg">{systemicRecovery}%</span>
          </p>
        </div>
      </section>

      {/* Gráfico de Evolução Corporal */}
      <section className={`${bubbleColor} p-6 rounded-3xl transition-colors`}>
        <div className="flex justify-between items-start mb-6">
          <h3 className={`font-bold text-xs uppercase tracking-widest flex items-center gap-2 ${theme === 'Dia' ? 'text-zinc-600' : 'text-zinc-400'}`}>
            <Activity size={16} className="text-red-900" /> Composição Corporal
          </h3>
          <div className="flex gap-4">
             <div className="flex items-center gap-1">
               <div className="w-2 h-2 rounded-full bg-red-900"></div>
               <span className="text-[8px] font-black uppercase text-zinc-500">Gordura %</span>
             </div>
             <div className="flex items-center gap-1">
               <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
               <span className="text-[8px] font-black uppercase text-zinc-500">Massa Magra kg</span>
             </div>
          </div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={compositionData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'Noite' ? "#222" : "#eee"} vertical={false} />
              <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{backgroundColor: theme === 'Noite' ? '#111' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="gordura" name="Gordura (%)" stroke="#991b1b" strokeWidth={3} dot={{ r: 4, fill: '#991b1b' }} />
              <Line type="monotone" dataKey="massaMagra" name="Massa Magra (kg)" stroke="#555" strokeWidth={3} dot={{ r: 4, fill: '#555' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Gráfico de Peso */}
      <section className={`${bubbleColor} p-6 rounded-3xl transition-colors`}>
        <h3 className={`font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-2 ${theme === 'Dia' ? 'text-zinc-600' : 'text-zinc-400'}`}>
          <TrendingUp size={16} className="text-red-900" /> Evolução de Peso (kg)
        </h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={compositionData}>
              <defs><linearGradient id="colorW" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#991b1b" stopOpacity={0.3}/><stop offset="95%" stopColor="#991b1b" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'Noite' ? "#222" : "#e5e7eb"} vertical={false} />
              <XAxis dataKey="date" stroke="#666" fontSize={9} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{backgroundColor: theme === 'Noite' ? '#111' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
              <Area type="monotone" dataKey="peso" name="Peso (kg)" stroke="#991b1b" strokeWidth={3} fillOpacity={1} fill="url(#colorW)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default HealthView;
