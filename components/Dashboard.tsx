
import React, { useState, useMemo } from 'react';
import { UserProfile, Goal, ActiveWorkoutSession } from '../types';
import { Target, Scale, ChevronRight, X, CheckCircle2, Flame, Sword, Droplet, Moon, Dumbbell, Plus, Trash2, Edit3, Save, Timer, PlayCircle } from 'lucide-react';
import { JAPANESE_QUOTES } from '../constants';

interface DashboardProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  theme: 'Dia' | 'Noite';
  activeSession?: ActiveWorkoutSession | null;
  onResumeSession?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onUpdateUser, theme, activeSession, onResumeSession }) => {
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [tempGoal, setTempGoal] = useState<Goal | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const dailyQuote = useMemo(() => {
    const day = new Date().getDate();
    return JAPANESE_QUOTES[day % JAPANESE_QUOTES.length];
  }, []);

  const latestStats = user.statsHistory[user.statsHistory.length - 1] || { weight: 0, bodyFat: 0 };
  const parseDurationMinutes = (duration: string) => {
    const numeric = Number(duration.replace(/[^\d]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  };
  const trainingDates = useMemo(() => {
    return [...new Set((user.trainingLogs || []).map(log => log.date).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  }, [user.trainingLogs]);
  const completedSessions = user.trainingLogs.length;
  const sessionsLast7Days = useMemo(() => {
    const now = new Date();
    return (user.trainingLogs || []).filter(log => {
      const logDate = new Date(`${log.date}T00:00:00`);
      const diffDays = Math.floor((now.getTime() - logDate.getTime()) / 86400000);
      return diffDays >= 0 && diffDays < 7;
    }).length;
  }, [user.trainingLogs]);
  const averageDuration = useMemo(() => {
    if (!user.trainingLogs.length) return 0;
    const totalMinutes = user.trainingLogs.reduce((acc, log) => acc + parseDurationMinutes(log.duration), 0);
    return Math.round(totalMinutes / user.trainingLogs.length);
  }, [user.trainingLogs]);
  const currentStreak = useMemo(() => {
    if (!trainingDates.length) return 0;
    const dateSet = new Set(trainingDates);
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (dateSet.has(cursor.toISOString().split('T')[0])) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [trainingDates]);
  const weightScaleMax = useMemo(() => {
    const values = user.statsHistory.map(stat => stat.weight).filter(value => value > 0);
    const maxValue = values.length ? Math.max(...values) : latestStats.weight;
    return Math.max(maxValue, 1);
  }, [user.statsHistory, latestStats.weight]);
  const bodyFatScaleMax = useMemo(() => {
    const values = user.statsHistory.map(stat => stat.bodyFat || 0).filter(value => value > 0);
    const maxValue = values.length ? Math.max(...values) : (latestStats.bodyFat || 0);
    return Math.max(maxValue, 1);
  }, [user.statsHistory, latestStats.bodyFat]);
  const weightProgress = Math.min(1, Math.max(0, latestStats.weight / weightScaleMax));
  const bodyFatProgress = Math.min(1, Math.max(0, (latestStats.bodyFat || 0) / bodyFatScaleMax));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Ohayou Gozaimasu";
    if (hour < 18) return "Konnichiwa";
    return "Konbanwa";
  };

  const calculateProgress = (current: number, target: number, title: string) => {
    if (!target || target === 0) return 0;
    
    // Heurística simples para gordura (menor é melhor)
    if (title.toLowerCase().includes('gordura') || title.toLowerCase().includes('bf')) {
        if (current <= target) return 100;
        return Math.min(100, Math.max(0, (target / current) * 100));
    }

    return Math.min(100, Math.max(0, (current / target) * 100));
  };

  const handleSaveGoal = () => {
    if (!tempGoal) return;
    
    let updatedGoals;
    if (isAddingGoal) {
        updatedGoals = [...user.goals, { ...tempGoal, id: Math.random().toString() }];
    } else {
        updatedGoals = user.goals.map(g => g.id === tempGoal.id ? tempGoal : g);
    }
    
    onUpdateUser({ ...user, goals: updatedGoals });
    setEditingGoalId(null);
    setIsAddingGoal(false);
    setTempGoal(null);
  };

  const handleDeleteGoal = (id: string) => {
    if(window.confirm("Deseja abandonar esta missão?")) {
        const updatedGoals = user.goals.filter(g => g.id !== id);
        onUpdateUser({ ...user, goals: updatedGoals });
    }
  };

  const startEditGoal = (goal: Goal) => {
    setTempGoal({ ...goal });
    setEditingGoalId(goal.id);
    setIsAddingGoal(false);
  };

  const startAddGoal = () => {
    setTempGoal({
        id: '',
        title: '',
        current: 0,
        target: 10,
        unit: '',
        icon: 'Target'
    });
    setIsAddingGoal(true);
    setEditingGoalId(null); 
  };

  const renderIcon = (iconName: string, size = 18, className = "") => {
    switch (iconName) {
        case 'Scale': return <Scale size={size} className={className} />;
        case 'Flame': return <Flame size={size} className={className} />;
        case 'Droplet': return <Droplet size={size} className={className} />;
        case 'Sword': return <Sword size={size} className={className} />;
        case 'Moon': return <Moon size={size} className={className} />;
        case 'Dumbbell': return <Dumbbell size={size} className={className} />;
        default: return <Target size={size} className={className} />;
    }
  };

  // Cores Profissionais
  const bubbleBg = theme === 'Noite' ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-lg';
  const textColor = theme === 'Noite' ? 'text-zinc-100' : 'text-zinc-900';
  const subTextColor = theme === 'Noite' ? 'text-zinc-500' : 'text-zinc-500';
  const hudBg = theme === 'Noite' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
  const inputBg = theme === 'Noite' ? 'bg-black/30 border-white/10' : 'bg-zinc-50 border-zinc-200';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header de Boas Vindas Samurai */}
      <div className="relative pt-4 pb-2">
        <div className="flex justify-between items-end">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-700 italic mb-1">{getGreeting()}</p>
                <h1 className={`text-3xl font-black italic uppercase leading-none ${textColor}`}>
                    {user.name.split(' ')[0]} <span className="text-red-700">San</span>
                </h1>
            </div>
            <div className="w-12 h-12 bg-red-700 rounded-full flex items-center justify-center shadow-lg shadow-red-900/30 border-2 border-red-900">
                <span className="text-2xl text-white font-serif">氣</span>
            </div>
        </div>
        <p className={`mt-4 text-xs font-bold italic opacity-80 border-l-2 border-red-700 pl-3 py-1 ${theme === 'Dia' ? 'text-zinc-600' : 'text-zinc-400'}`}>
            "{dailyQuote}"
        </p>
      </div>

      {/* ALERT DE TREINO ATIVO - NOVIDADE */}
      {activeSession && (
          <section className="relative group cursor-pointer" onClick={onResumeSession}>
              <div className="absolute inset-0 bg-red-900/30 blur-xl rounded-[2rem] animate-pulse"></div>
              <div className="relative bg-red-900 text-white p-6 rounded-[2rem] shadow-2xl border border-red-700 flex items-center justify-between overflow-hidden">
                  {/* Pattern de fundo */}
                  <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
                  
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-red-200">Missão em Andamento</p>
                      </div>
                      <h3 className="text-xl font-black italic uppercase">{activeSession.workoutTitle}</h3>
                      <p className="text-xs font-bold mt-1 opacity-80 flex items-center gap-2">
                          {activeSession.isPaused ? '⏸️ Pausado' : '🔥 Ativo agora'}
                      </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                      <PlayCircle size={24} className="ml-1" />
                  </div>
              </div>
          </section>
      )}

      {/* Painel HUD de Status Biológico */}
      <section className="relative">
         {/* Glow Effect mais sutil */}
         <div className="absolute -inset-0.5 bg-gradient-to-r from-red-900/50 to-zinc-900/50 rounded-[2.2rem] blur opacity-40"></div>
         <div className={`relative ${hudBg} border p-6 rounded-[2rem] shadow-2xl overflow-hidden`}>
            {/* Linha tecnológica superior */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent"></div>
            
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
                    Status de Combate
                </h2>
                <span className="text-[10px] font-mono text-red-700 opacity-70">SYS.READY</span>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10 place-items-center">
                {/* Massa */}
                <div className="flex flex-col items-center justify-center space-y-3 w-full">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className={`${theme === 'Noite' ? 'text-zinc-800' : 'text-zinc-100'}`} />
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - weightProgress)} className="text-zinc-400" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-2xl font-black ${textColor} tracking-tighter`}>{latestStats.weight}</span>
                            <span className="text-[8px] font-bold uppercase text-zinc-500">KG</span>
                        </div>
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Peso Total</p>
                </div>

                {/* Gordura (Destaque) */}
                <div className="flex flex-col items-center justify-center space-y-3 w-full">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="absolute inset-0 bg-red-900/10 rounded-full blur-xl"></div>
                        <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 112 112">
                            <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-red-900/10" />
                            <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={289} strokeDashoffset={289 * (1 - bodyFatProgress)} className="text-red-700 drop-shadow-[0_0_8px_rgba(185,28,28,0.5)]" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <span className="text-2xl font-black text-red-700 italic tracking-tighter">{latestStats.bodyFat || 0}%</span>
                            <span className="text-[8px] font-bold uppercase text-red-900/60">Body Fat</span>
                        </div>
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-red-800">Nível Adiposo</p>
                </div>
            </div>
         </div>
      </section>

      <section className={`${bubbleBg} p-6 rounded-[2.5rem] shadow-sm`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className={`font-black text-sm uppercase italic tracking-tighter ${textColor}`}>
              Progresso Real
            </h3>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Dados do Histórico</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-4 rounded-2xl border ${theme === 'Noite' ? 'bg-black/20 border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Sessões</p>
            <p className={`text-2xl font-black italic mt-2 ${textColor}`}>{completedSessions}</p>
            <p className="text-[9px] font-bold text-red-700 mt-1">Concluídas</p>
          </div>
          <div className={`p-4 rounded-2xl border ${theme === 'Noite' ? 'bg-black/20 border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Frequência</p>
            <p className={`text-2xl font-black italic mt-2 ${textColor}`}>{sessionsLast7Days}</p>
            <p className="text-[9px] font-bold text-red-700 mt-1">Últimos 7 dias</p>
          </div>
          <div className={`p-4 rounded-2xl border ${theme === 'Noite' ? 'bg-black/20 border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Ritmo</p>
            <p className={`text-2xl font-black italic mt-2 ${textColor}`}>{averageDuration}m</p>
            <p className="text-[9px] font-bold text-red-700 mt-1">Média por treino</p>
          </div>
        </div>
        <div className={`mt-4 p-4 rounded-2xl border flex items-center justify-between ${theme === 'Noite' ? 'bg-black/20 border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-red-700" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sequência Atual</p>
          </div>
          <p className="text-sm font-black italic text-red-700">{currentStreak} dias</p>
        </div>
      </section>

      {/* Seção Missões de Honra (Objetivos) */}
      <section className={`${bubbleBg} p-6 rounded-[2.5rem] shadow-sm`}>
        <div className="flex justify-between items-center mb-6">
          <div>
              <h3 className={`font-black text-sm uppercase italic tracking-tighter ${textColor}`}>
                Minhas Conquistas
              </h3>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Missões de Honra</p>
          </div>
          <button 
            onClick={() => setIsGoalsModalOpen(true)} 
            className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            Ver Todas <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-4">
          {user.goals && user.goals.slice(0, 3).map((goal) => {
             const progress = calculateProgress(goal.current, goal.target, goal.title);
             return (
                <div key={goal.id} className="group relative">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${theme === 'Noite' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
                                {renderIcon(goal.icon, 14)}
                            </div>
                            <div>
                                <span className={`text-xs font-black uppercase italic ${textColor}`}>{goal.title}</span>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-[10px] font-bold ${subTextColor}`}>{goal.current}</span>
                                    <span className="text-[8px] text-zinc-400">/ {goal.target} {goal.unit}</span>
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-red-700 italic">{Math.round(progress)}%</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme === 'Noite' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                        <div 
                            className="h-full bg-gradient-to-r from-red-800 to-red-600 rounded-full transition-all duration-1000" 
                            style={{ width: `${progress}%` }} 
                        />
                    </div>
                </div>
             );
          })}
        </div>
      </section>

      {/* Modal Expandido de Metas */}
      {isGoalsModalOpen && (
        <div className={`fixed inset-0 z-[100] p-6 animate-in slide-in-from-bottom-10 ${theme === 'Noite' ? 'bg-zinc-950' : 'bg-zinc-100'} overflow-y-auto`}>
          <div className="max-w-xl mx-auto pb-10">
            <div className="flex justify-between items-center mb-8 sticky top-0 py-4 z-10 bg-inherit backdrop-blur-sm">
              <div>
                  <h2 className={`text-3xl font-black italic uppercase tracking-tighter ${textColor}`}>Quadro de Missões</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Defina seu legado</p>
              </div>
              <button onClick={() => { setIsGoalsModalOpen(false); setIsAddingGoal(false); setEditingGoalId(null); }} className={`p-2 hover:text-red-700 transition-colors ${subTextColor}`}><X size={32} /></button>
            </div>

            {/* Lista ou Form de Edição */}
            {(isAddingGoal || editingGoalId) && tempGoal ? (
                <div className={`p-6 rounded-[2rem] border ${theme === 'Noite' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-xl'} animate-in zoom-in-95`}>
                    <h3 className={`text-xl font-black uppercase italic mb-6 ${textColor}`}>{isAddingGoal ? 'Nova Missão' : 'Refinar Estratégia'}</h3>
                    
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Título da Missão</label>
                            <input 
                                className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} focus:outline-none focus:border-red-700`}
                                value={tempGoal.title}
                                onChange={e => setTempGoal({...tempGoal, title: e.target.value})}
                                placeholder="Ex: Supino 100kg"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Atual</label>
                                <input 
                                    type="number"
                                    className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} focus:outline-none focus:border-red-700`}
                                    value={tempGoal.current}
                                    onChange={e => setTempGoal({...tempGoal, current: Number(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Alvo</label>
                                <input 
                                    type="number"
                                    className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} focus:outline-none focus:border-red-700`}
                                    value={tempGoal.target}
                                    onChange={e => setTempGoal({...tempGoal, target: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                             <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Unidade (Ex: kg, %, km)</label>
                             <input 
                                className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} focus:outline-none focus:border-red-700`}
                                value={tempGoal.unit}
                                onChange={e => setTempGoal({...tempGoal, unit: e.target.value})}
                                placeholder="kg"
                            />
                        </div>
                        
                        <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase text-zinc-500 ml-1">Ícone</label>
                             <div className="flex gap-2 overflow-x-auto pb-2">
                                {['Target', 'Scale', 'Flame', 'Droplet', 'Sword', 'Moon', 'Dumbbell'].map(icon => (
                                    <button 
                                        key={icon}
                                        onClick={() => setTempGoal({...tempGoal, icon: icon as any})}
                                        className={`p-3 rounded-xl border-2 transition-all ${tempGoal.icon === icon ? 'border-red-700 bg-red-700 text-white' : 'border-transparent bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
                                    >
                                        {renderIcon(icon, 20)}
                                    </button>
                                ))}
                             </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={handleSaveGoal} className="flex-1 bg-red-800 hover:bg-red-900 text-white py-4 rounded-2xl font-black uppercase text-xs italic shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Save size={16} /> Salvar
                            </button>
                            <button onClick={() => { setIsAddingGoal(false); setEditingGoalId(null); }} className="px-6 bg-transparent border border-zinc-300 dark:border-zinc-700 text-zinc-500 rounded-2xl font-bold uppercase text-xs hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <button 
                        onClick={startAddGoal}
                        className="w-full py-5 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-zinc-400 font-bold uppercase text-xs hover:border-red-700 hover:text-red-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> Criar Nova Missão
                    </button>

                    {user.goals && user.goals.map(goal => {
                         const progress = calculateProgress(goal.current, goal.target, goal.title);
                         const isComplete = progress >= 100;

                         return (
                            <div key={goal.id} className={`${bubbleBg} p-6 rounded-[2rem] relative group`}>
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEditGoal(goal)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><Edit3 size={14} /></button>
                                    <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500 hover:bg-red-900 hover:text-white"><Trash2 size={14} /></button>
                                </div>

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-2xl shadow-inner ${isComplete ? 'bg-green-500/20 text-green-600' : (theme === 'Noite' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500')}`}>
                                            {renderIcon(goal.icon, 24)}
                                        </div>
                                        <div>
                                            <h4 className={`font-black uppercase italic text-lg ${textColor}`}>{goal.title}</h4>
                                            <div className="flex items-baseline gap-1 mt-1">
                                                <p className={`text-xl font-black ${theme === 'Noite' ? 'text-zinc-300' : 'text-zinc-700'}`}>{goal.current}</p>
                                                <p className="text-xs font-bold text-zinc-500">/ {goal.target} {goal.unit}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {isComplete && <CheckCircle2 className="text-green-500" size={32} />}
                                </div>
                                <div className={`w-full h-3 rounded-full overflow-hidden border ${theme === 'Noite' ? 'bg-black/40 border-white/5' : 'bg-zinc-200 border-zinc-100'}`}>
                                    <div 
                                        className={`h-full ${isComplete ? 'bg-green-500' : 'bg-red-700'} shadow-[0_0_10px_currentColor] transition-all duration-1000`} 
                                        style={{ width: `${progress}%` }} 
                                    />
                                </div>
                            </div>
                         );
                    })}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
