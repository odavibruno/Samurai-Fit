import React, { useState, useEffect } from 'react';
import { UserProfile, Student, ClassSession, ClassStatus } from '../types';
import { Calendar as CalendarIcon, Clock, User, Plus, Brush, X, ChevronLeft, ChevronRight, CheckCircle2, ChevronDown, Repeat, CalendarDays, Ban, UserX, PenTool, UserCog, Trash2, Edit, Save, AlertCircle, RefreshCcw } from 'lucide-react';

interface InstructorScheduleProps {
  onClose: () => void;
  user: UserProfile; // O instrutor
  onUpdateUser: (user: UserProfile) => void;
  students: Student[];
  theme: 'Dia' | 'Noite';
  initialStudentId?: string | null; // Novo: Permite abrir focado em um aluno
}

type PlanType = 'Único' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';

const InstructorSchedule: React.FC<InstructorScheduleProps> = ({ onClose, user, onUpdateUser, students, theme, initialStudentId }) => {
  // Estado da Data Selecionada (Foco do Agendamento)
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Estados para o Calendário Visual (Navegação)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  // Estados do Modal de Novo Agendamento
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null); // HH:MM
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [duration, setDuration] = useState(30); // Padrão 30min
  const [planType, setPlanType] = useState<PlanType>('Único');
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]); // 0 = Domingo, 1 = Segunda...

  // Estados de Gestão de Aula (Edição de Status e Dados)
  const [managingClassId, setManagingClassId] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<ClassSession | null>(null); // Para editar data/hora

  // Estados de Gestão por Aluno (Cancelamento Futuro e Manipulação)
  const [isStudentManagerOpen, setIsStudentManagerOpen] = useState(false);
  const [manageStudentId, setManageStudentId] = useState('');
  
  // Estados para Manipulação em Massa
  const [massActionDays, setMassActionDays] = useState<number[]>([]);
  const [massActionTime, setMassActionTime] = useState<string>('');

  // Efeito para abrir gestão de aluno se ID for passado via prop
  useEffect(() => {
    if (initialStudentId) {
        setManageStudentId(initialStudentId);
        setIsStudentManagerOpen(true);
    }
  }, [initialStudentId]);

  // --- HELPER: FORMATAÇÃO DE DATA (YYYY-MM-DD) ---
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // --- HELPER: VERIFICAR COLISÃO ---
  // Retorna TRUE se houver colisão
  const checkCollision = (targetDate: string, targetTime: string, excludeClassId?: string): ClassSession | undefined => {
      const schedule = user.schedule || [];
      return schedule.find(s => 
          s.date === targetDate && 
          s.time === targetTime && 
          s.status !== 'Cancelada' && // Ignora aulas canceladas
          s.id !== excludeClassId // Ignora a própria aula se estiver editando
      );
  };

  // --- LÓGICA DO CALENDÁRIO ---
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekDaysShort = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDaySelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setCurrentDate(newDate);
    setIsCalendarOpen(false);
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(newDate);
  };

  const changeYear = (year: number) => {
    const newDate = new Date(year, viewDate.getMonth(), 1);
    setViewDate(newDate);
  };

  const changeViewMonthSpecific = (monthIndex: number) => {
    const newDate = new Date(viewDate.getFullYear(), monthIndex, 1);
    setViewDate(newDate);
  };

  // --- LÓGICA DE VISUALIZAÇÃO ---
  const dateStr = formatDate(currentDate);
  const daysClasses = user.schedule?.filter(s => s.date === dateStr) || [];

  // Geração de Horários (08:00 as 17:30, intervalos de 30min)
  const timeSlots: string[] = [];
  for (let h = 8; h <= 17; h++) {
      timeSlots.push(`${String(h).padStart(2, '0')}:00`);
      timeSlots.push(`${String(h).padStart(2, '0')}:30`);
  }

  const toggleWeekDay = (dayIndex: number) => {
    if (selectedWeekDays.includes(dayIndex)) {
      setSelectedWeekDays(prev => prev.filter(d => d !== dayIndex));
    } else {
      setSelectedWeekDays(prev => [...prev, dayIndex]);
    }
  };
  
  const toggleMassActionDay = (dayIndex: number) => {
      if (massActionDays.includes(dayIndex)) {
          setMassActionDays(prev => prev.filter(d => d !== dayIndex));
      } else {
          setMassActionDays(prev => [...prev, dayIndex]);
      }
  };

  const handleOpenNewClassModal = () => {
      setIsNewClassModalOpen(true);
      if (selectedWeekDays.length === 0) {
          setSelectedWeekDays([currentDate.getDay()]);
      }
      if (manageStudentId) {
          setSelectedStudentId(manageStudentId);
      }
  };

  // --- CORE: ADICIONAR AULA ---
  const handleAddClass = () => {
    if (!selectedSlot) { alert("Selecione um horário."); return; }
    if (!selectedStudentId) { alert("Selecione um aluno."); return; }

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) { alert("Aluno não encontrado."); return; }

    const currentSchedule = user.schedule || [];
    let newClasses: ClassSession[] = [];
    let conflictCount = 0;

    if (planType === 'Único') {
        const collision = checkCollision(dateStr, selectedSlot);
        if (collision) {
            alert(`Conflito! O horário das ${selectedSlot} já está ocupado por ${collision.studentName}.`);
            return;
        }

        newClasses.push({
            id: Math.random().toString(),
            studentId: student.id,
            studentName: student.name,
            date: dateStr,
            time: selectedSlot,
            duration: duration,
            status: 'Agendada'
        });
        alert("Agendamento confirmado!");
    } else {
        if (selectedWeekDays.length === 0) { alert("Selecione os dias da recorrência."); return; }

        const startDate = new Date(currentDate);
        const endDate = new Date(currentDate);
        
        switch (planType) {
            case 'Mensal': endDate.setMonth(endDate.getMonth() + 1); break;
            case 'Trimestral': endDate.setMonth(endDate.getMonth() + 3); break;
            case 'Semestral': endDate.setMonth(endDate.getMonth() + 6); break;
            case 'Anual': endDate.setFullYear(endDate.getFullYear() + 1); break;
        }

        let tempDate = new Date(startDate);
        while (tempDate <= endDate) {
            if (selectedWeekDays.includes(tempDate.getDay())) {
                const tempDateStr = formatDate(tempDate);
                const collision = checkCollision(tempDateStr, selectedSlot);

                if (!collision) {
                    newClasses.push({
                        id: Math.random().toString(),
                        studentId: student.id,
                        studentName: student.name,
                        date: tempDateStr,
                        time: selectedSlot,
                        duration: duration,
                        status: 'Agendada'
                    });
                } else {
                    conflictCount++;
                }
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }

        if (newClasses.length === 0) {
            alert("Não foi possível agendar. Todos os horários no período estão ocupados.");
            return;
        }
        alert(`Plano ativado! ${newClasses.length} aulas agendadas. (${conflictCount} conflitos ignorados)`);
    }

    onUpdateUser({ ...user, schedule: [...currentSchedule, ...newClasses] });
    setIsNewClassModalOpen(false);
  };

  // --- CORE: ATUALIZAR STATUS E EXCLUIR ---
  const handleUpdateStatus = (classId: string, action: ClassStatus | 'DELETE') => {
      let updatedSchedule;
      
      if (action === 'DELETE') {
          if(!window.confirm("Tem certeza que deseja EXCLUIR definitivamente este registro?")) return;
          updatedSchedule = user.schedule?.filter(s => s.id !== classId) || [];
      } else {
          updatedSchedule = user.schedule?.map(s => {
              if (s.id === classId) {
                  return { ...s, status: action };
              }
              return s;
          }) || [];
      }
      
      onUpdateUser({ ...user, schedule: updatedSchedule });
      setManagingClassId(null);
  };

  // --- CORE: EDITAR AULA EXISTENTE (MUDAR HORÁRIO) ---
  const startEditingClass = (session: ClassSession) => {
    setEditingClass({ ...session });
    setManagingClassId(null);
  };

  const saveEditedClass = () => {
    if (!editingClass) return;

    // Verificar colisão antes de salvar a edição
    const collision = checkCollision(editingClass.date, editingClass.time, editingClass.id);
    if (collision) {
        alert(`Não é possível mover para este horário. Conflito com ${collision.studentName}.`);
        return;
    }

    const updatedSchedule = user.schedule?.map(s => s.id === editingClass.id ? editingClass : s) || [];
    onUpdateUser({ ...user, schedule: updatedSchedule });
    setEditingClass(null);
    alert("Alterações salvas com sucesso!");
  };

  // --- CORE: GESTÃO POR ALUNO ---
  const getFutureClasses = (studentId: string) => {
      const today = formatDate(new Date());
      return user.schedule?.filter(s => s.studentId === studentId && s.date >= today && s.status === 'Agendada').sort((a,b) => a.date.localeCompare(b.date)) || [];
  };

  const handleCancelFutureClasses = () => {
      if (!manageStudentId) return;

      if (window.confirm("ATENÇÃO: Isso removerá TODAS as aulas futuras e de hoje (não concluídas) deste aluno. Confirmar?")) {
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Zera hora para comparar apenas data

          const currentSchedule = user.schedule || [];
          
          const updatedSchedule = currentSchedule.filter(s => {
              if (s.studentId !== manageStudentId) return true;
              
              // Converte data da string 'YYYY-MM-DD' para Date local
              const [y, m, d] = s.date.split('-').map(Number);
              const classDate = new Date(y, m - 1, d);
              
              // Se for passado, mantém
              if (classDate < now) return true;
              
              // Se for hoje ou futuro, remove (exceto se já concluída)
              if (s.status === 'Concluída') return true;
              
              return false; // Remove
          });
          
          const removed = currentSchedule.length - updatedSchedule.length;
          onUpdateUser({ ...user, schedule: updatedSchedule });
          alert(`${removed} agendamentos futuros foram removidos.`);
      }
  };

  const handleMassUpdate = (action: 'UPDATE_TIME' | 'CANCEL_DAYS') => {
      if (!manageStudentId) return;
      if (massActionDays.length === 0) { alert("Selecione os dias da semana."); return; }

      const todayStr = formatDate(new Date());
      let affectedCount = 0;
      let conflictCount = 0;
      const currentSchedule = user.schedule || [];

      if (action === 'UPDATE_TIME') {
          if (!massActionTime) { alert("Selecione o novo horário."); return; }
          
          if(window.confirm(`Mover aulas futuras para ${massActionTime}?`)) {
             const updatedSchedule = currentSchedule.map(s => {
                const [y, m, d] = s.date.split('-').map(Number);
                const classDate = new Date(y, m - 1, d);
                
                // Filtra: Aluno correto + Data futura/hoje + Status não concluído + Dia da semana bate
                if (s.studentId === manageStudentId && s.date >= todayStr && s.status !== 'Concluída' && massActionDays.includes(classDate.getDay())) {
                    
                    // Verifica colisão no novo horário
                    const collision = checkCollision(s.date, massActionTime, s.id);
                    if (!collision) {
                        affectedCount++;
                        return { ...s, time: massActionTime };
                    } else {
                        conflictCount++;
                        return s; // Mantém original se der conflito
                    }
                }
                return s;
             });
             onUpdateUser({ ...user, schedule: updatedSchedule });
             alert(`${affectedCount} aulas atualizadas. ${conflictCount} conflitos mantidos.`);
          }

      } else if (action === 'CANCEL_DAYS') {
          if(window.confirm(`Cancelar aulas futuras nos dias selecionados?`)) {
             const updatedSchedule = currentSchedule.map(s => {
                const [y, m, d] = s.date.split('-').map(Number);
                const classDate = new Date(y, m - 1, d);

                if (s.studentId === manageStudentId && s.date >= todayStr && s.status !== 'Concluída' && massActionDays.includes(classDate.getDay())) {
                    affectedCount++;
                    return { ...s, status: 'Cancelada' as ClassStatus };
                }
                return s;
             });
             onUpdateUser({ ...user, schedule: updatedSchedule });
             alert(`${affectedCount} aulas canceladas.`);
          }
      }
  };

  const navDay = (delta: number) => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + delta);
      setCurrentDate(newDate);
      setViewDate(newDate);
  };

  // Cores
  const modalBg = theme === 'Noite' ? 'bg-[#121212]' : 'bg-white';
  const inputBg = theme === 'Noite' ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-zinc-200';
  const textColor = theme === 'Noite' ? 'text-white' : 'text-zinc-900';
  const cardBg = theme === 'Noite' ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-zinc-200 shadow-sm';
  const calendarBg = theme === 'Noite' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200';

  return (
    <div className="animate-in zoom-in-95 h-full flex flex-col pt-4">
        <div className={`${modalBg} w-full h-full rounded-[3rem] shadow-2xl border border-red-900/30 flex flex-col overflow-hidden relative`}>
            {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-red-900/10 to-transparent">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-red-900 text-white rounded-2xl shadow-lg shadow-red-900/20"><CalendarIcon size={24} /></div>
             <div>
                <h2 className={`text-xl font-black uppercase italic ${textColor}`}>Agenda do Mestre</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Controle Tático (30min)</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-red-900 transition-colors"><X size={28} /></button>
        </div>

        {/* Date Navigator */}
        {!isStudentManagerOpen && (
            <div className="p-4 flex justify-between items-center border-b border-white/5 bg-black/5 relative z-20">
                <button onClick={() => navDay(-1)} className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                <button onClick={() => setIsCalendarOpen(!isCalendarOpen)} className="text-center group active:scale-95 transition-transform">
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest group-hover:text-red-700 transition-colors">Visualizando Dia</p>
                    <h3 className={`text-lg font-black uppercase italic ${textColor} flex items-center justify-center gap-2 group-hover:text-red-900 transition-colors`}>
                        {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        <ChevronDown size={16} />
                    </h3>
                </button>
                <button onClick={() => navDay(1)} className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>

                {isCalendarOpen && (
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 p-4 rounded-3xl shadow-2xl border ${calendarBg} z-50 animate-in fade-in`}>
                        <div className="flex justify-between mb-4">
                            <button onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></button>
                            <span className={`text-sm font-bold ${textColor}`}>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                            <button onClick={() => changeMonth(1)}><ChevronRight size={16} /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => (
                                <button key={i} onClick={() => handleDaySelect(i + 1)} className={`aspect-square rounded-lg text-xs font-bold ${currentDate.getDate() === i+1 ? 'bg-red-900 text-white' : 'hover:bg-zinc-800 text-zinc-500'}`}>{i + 1}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- MODAL FLUTUANTE DE NOVO AGENDAMENTO --- */}
        {isNewClassModalOpen && (
            <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md p-6 flex items-center justify-center animate-in zoom-in-95">
                <div className={`${modalBg} w-full max-w-lg p-8 rounded-[3rem] border border-red-900/30 shadow-2xl relative`}>
                    <button onClick={() => setIsNewClassModalOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-red-900"><X size={24} /></button>
                    <h3 className={`text-xl font-black uppercase italic ${textColor} text-center mb-6`}>Novo Agendamento</h3>
                    <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-2">
                            {(['Único', 'Mensal', 'Trimestral', 'Semestral', 'Anual'] as PlanType[]).map(type => (
                                <button key={type} onClick={() => setPlanType(type)} className={`py-3 rounded-xl text-[10px] font-black uppercase border ${planType === type ? 'bg-red-900 text-white border-red-900' : `${inputBg} text-zinc-500 border-transparent`}`}>{type}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold uppercase text-zinc-500">Aluno</label><select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className={`w-full ${inputBg} p-3 rounded-2xl text-xs font-bold ${textColor}`}><option value="">Selecione...</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                            <div><label className="text-[10px] font-bold uppercase text-zinc-500">Horário</label><select value={selectedSlot || ''} onChange={(e) => setSelectedSlot(e.target.value)} className={`w-full ${inputBg} p-3 rounded-2xl text-xs font-bold ${textColor}`}><option value="">Selecione...</option>{timeSlots.map(time => <option key={time} value={time}>{time}</option>)}</select></div>
                        </div>
                        {planType !== 'Único' && (
                            <div className="bg-red-900/5 p-4 rounded-2xl border border-red-900/10">
                                <label className="text-[9px] font-bold uppercase text-zinc-500 mb-2 block">Recorrência (Dias da Semana)</label>
                                <div className="flex justify-between">{weekDaysShort.map((day, idx) => (<button key={idx} onClick={() => toggleWeekDay(idx)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${selectedWeekDays.includes(idx) ? 'bg-red-900 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{day}</button>))}</div>
                            </div>
                        )}
                        <button onClick={handleAddClass} className="w-full bg-red-900 text-white font-black py-4 rounded-2xl uppercase text-xs flex items-center justify-center gap-2 mt-4"><PenTool size={16} /> Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL DE EDIÇÃO DE AULA INDIVIDUAL --- */}
        {editingClass && (
            <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-md p-6 flex items-center justify-center animate-in zoom-in-95">
                <div className={`${modalBg} w-full max-w-md p-8 rounded-[3rem] border border-zinc-700 shadow-2xl relative`}>
                    <button onClick={() => setEditingClass(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={24} /></button>
                    <h3 className={`text-xl font-black uppercase italic mb-6 ${textColor}`}>Alterar Aula</h3>
                    <div className="space-y-4">
                        <div><label className="text-[10px] font-bold uppercase text-zinc-500">Data</label><input type="date" value={editingClass.date} onChange={(e) => setEditingClass({...editingClass, date: e.target.value})} className={`w-full ${inputBg} p-3 rounded-2xl text-xs font-bold ${textColor}`} /></div>
                        <div><label className="text-[10px] font-bold uppercase text-zinc-500">Horário</label><select value={editingClass.time} onChange={(e) => setEditingClass({...editingClass, time: e.target.value})} className={`w-full ${inputBg} p-3 rounded-2xl text-xs font-bold ${textColor}`}>{timeSlots.map(time => <option key={time} value={time}>{time}</option>)}</select></div>
                        <button onClick={saveEditedClass} className="w-full bg-red-900 text-white font-black py-4 rounded-2xl uppercase text-xs mt-4"><Save size={16} className="inline mr-2"/> Salvar Alterações</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- TELA DE GESTÃO POR ALUNO (OVERLAY) --- */}
        {isStudentManagerOpen && (
             <div className="absolute inset-0 z-[50] bg-zinc-950 p-6 flex flex-col animate-in slide-in-from-bottom-10 overflow-y-auto">
                 <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 pt-4">
                     <h3 className="text-xl font-black uppercase italic text-white flex items-center gap-2"><UserCog size={24} className="text-red-900"/> Gestão por Aluno</h3>
                     <button onClick={() => setIsStudentManagerOpen(false)} className="px-4 py-2 bg-zinc-800 rounded-xl text-xs font-bold text-white hover:bg-zinc-700 w-full md:w-auto">Voltar</button>
                 </div>
                 <div className="flex flex-col md:flex-row gap-4 mb-6">
                     <div className="w-full md:w-1/3">
                         <label className="text-[10px] font-bold uppercase text-zinc-500">Selecione o Aluno</label>
                         <select value={manageStudentId} onChange={(e) => setManageStudentId(e.target.value)} className={`w-full bg-zinc-900 border border-zinc-700 p-4 rounded-2xl text-sm font-bold text-white`}><option value="">Selecione...</option>{students.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}</select>
                     </div>
                     {manageStudentId && (
                         <div className="flex-grow flex flex-col md:flex-row md:items-end gap-2 mt-4 md:mt-0">
                             <button onClick={handleOpenNewClassModal} className="h-14 px-6 bg-red-900 text-white rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 w-full md:w-auto"><Plus size={16}/> Novo Agendamento</button>
                             <div className="md:ml-auto bg-red-900/10 border border-red-900/20 px-4 py-2 rounded-2xl text-right flex justify-between items-center md:block">
                                 <p className="text-[10px] font-bold text-red-900 uppercase md:mb-1">Zona de Perigo</p>
                                 <button onClick={handleCancelFutureClasses} className="text-[10px] text-zinc-400 hover:text-white underline">Apagar Tudo (Futuro)</button>
                             </div>
                         </div>
                     )}
                 </div>
                 <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
                     {/* Lista Aulas Futuras */}
                     <div className="w-full md:w-1/2 overflow-y-auto custom-scrollbar bg-black/20 rounded-3xl border border-white/5 p-4 flex-1">
                        {manageStudentId ? (
                             <div className="space-y-2">
                                 <h4 className="text-xs font-black uppercase text-zinc-500 mb-4 sticky top-0 bg-zinc-950/90 p-2">Próximas Aulas</h4>
                                 {getFutureClasses(manageStudentId).map(session => (
                                     <div key={session.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-white/5">
                                         <div><p className="text-sm font-black text-white">{session.date.split('-').reverse().join('/')}</p><p className="text-xs text-zinc-500">{session.time}</p></div>
                                         <button onClick={() => startEditingClass(session)} className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold uppercase"><Edit size={14}/></button>
                                     </div>
                                 ))}
                             </div>
                         ) : <div className="h-full flex items-center justify-center text-zinc-600 font-bold uppercase py-10">Selecione um aluno</div>}
                     </div>
                     {/* Manipulação em Massa */}
                     {manageStudentId && (
                         <div className="w-full md:w-1/2 bg-black/20 rounded-3xl border border-white/5 p-6 overflow-y-auto">
                             <h4 className="text-xs font-black uppercase italic tracking-widest text-zinc-500 mb-6">Manipulação em Massa</h4>
                             <div className="space-y-6">
                                 <div>
                                     <p className="text-[10px] font-bold text-zinc-500 mb-2">1. Dias Alvo</p>
                                     <div className="flex gap-1 flex-wrap">{weekDaysShort.map((day, idx) => (<button key={idx} onClick={() => toggleMassActionDay(idx)} className={`w-8 h-8 rounded-lg text-[10px] font-bold ${massActionDays.includes(idx) ? 'bg-red-900 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{day}</button>))}</div>
                                 </div>
                                 <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5">
                                     <p className="text-[10px] font-bold text-zinc-400 mb-2">Mudar Horário</p>
                                     <div className="flex gap-2"><select value={massActionTime} onChange={(e) => setMassActionTime(e.target.value)} className="bg-zinc-800 text-white text-xs font-bold p-3 rounded-xl flex-grow"><option value="">Novo Horário...</option>{timeSlots.map(time => <option key={time} value={time}>{time}</option>)}</select><button onClick={() => handleMassUpdate('UPDATE_TIME')} className="px-4 bg-zinc-800 hover:bg-red-900 text-white rounded-xl"><RefreshCcw size={16}/></button></div>
                                 </div>
                                 <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex justify-between items-center">
                                     <p className="text-[10px] font-bold text-zinc-400">Cancelar nestes dias</p>
                                     <button onClick={() => handleMassUpdate('CANCEL_DAYS')} className="p-3 bg-red-900/20 text-red-700 hover:bg-red-900 hover:text-white rounded-xl"><Ban size={18}/></button>
                                 </div>
                             </div>
                         </div>
                     )}
                 </div>
             </div>
        )}

        <div className="flex flex-col md:flex-row flex-grow overflow-hidden relative z-0">
            {/* Sidebar Resumo */}
            <div className={`p-6 md:w-1/3 border-r border-white/5 overflow-y-auto ${theme === 'Noite' ? 'bg-zinc-900/30' : 'bg-zinc-50'}`}>
                <button onClick={handleOpenNewClassModal} className="w-full bg-red-900 hover:bg-red-800 text-white font-black py-5 rounded-3xl shadow-xl uppercase text-xs flex items-center justify-center gap-2 mb-4"><Plus size={18} /> Novo Agendamento</button>
                <button onClick={() => setIsStudentManagerOpen(true)} className={`w-full ${theme === 'Noite' ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-zinc-600 border border-zinc-200'} font-black py-4 rounded-3xl uppercase text-xs flex items-center justify-center gap-2 mb-8`}><UserCog size={18} /> Gerenciar Aluno</button>
                <div className="mt-4 p-6 rounded-[2.5rem] border border-dashed border-zinc-700 text-center"><Clock size={20} className="mx-auto mb-2 text-zinc-500"/><p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">Total do Dia</p><p className={`text-4xl font-black italic ${textColor}`}>{daysClasses.filter(c => c.status !== 'Cancelada').length}</p></div>
            </div>

            {/* Lista de Horários */}
            <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
                <h4 className="text-xs font-black uppercase text-zinc-500 italic mb-4 tracking-widest">Cronograma de Batalha</h4>
                <div className="space-y-3">
                    {timeSlots.map(time => {
                         const session = daysClasses.find(c => c.time === time && c.status !== 'Cancelada'); 
                         const cancelledSession = daysClasses.find(c => c.time === time && c.status === 'Cancelada'); 
                         const displaySession = session || cancelledSession;
                         const isOccupied = !!displaySession;
                         
                         let statusColor = "bg-zinc-700 text-zinc-400";
                         let statusBorder = "border-transparent";
                         if (displaySession) {
                             switch(displaySession.status) {
                                 case 'Concluída': statusColor = "bg-green-900/20 text-green-500 border-green-900/30"; statusBorder = "border-green-900/30"; break;
                                 case 'Falta': statusColor = "bg-red-900/20 text-red-500 border-red-900/30"; statusBorder = "border-red-900/30"; break;
                                 case 'Cancelada': statusColor = "bg-zinc-800/50 text-zinc-600 line-through opacity-60"; statusBorder = "border-zinc-700"; break;
                                 default: statusColor = "bg-red-900 text-white"; statusBorder = "border-red-900/30";
                             }
                         }

                         return (
                             <div key={time} className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${isOccupied ? `${cardBg} ${statusBorder}` : `border-transparent opacity-50 hover:opacity-100 ${theme === 'Noite' ? 'bg-zinc-800/30' : 'bg-slate-50'}`}`}>
                                 <div className={`w-16 p-2 rounded-xl text-center font-black ${isOccupied ? (displaySession?.status === 'Agendada' ? 'bg-red-900 text-white' : 'bg-zinc-800 text-zinc-400') : 'bg-zinc-700 text-zinc-400'}`}>{time}</div>
                                 
                                 {isOccupied ? (
                                     <div className="flex-grow flex justify-between items-center relative">
                                         <div>
                                             <h5 className={`font-black uppercase italic text-sm ${displaySession.status === 'Cancelada' ? 'text-zinc-500' : textColor}`}>{displaySession.studentName}</h5>
                                             <div className="flex items-center gap-2 mt-1"><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${statusColor}`}>{displaySession.status}</span><span className="text-[9px] font-bold text-zinc-500">{displaySession.duration} min</span></div>
                                         </div>
                                         
                                         {managingClassId === displaySession.id ? (
                                             <div className="flex gap-2 absolute right-0 bg-black/90 p-1 rounded-xl shadow-xl z-10 animate-in slide-in-from-right-2">
                                                 <button onClick={() => handleUpdateStatus(displaySession.id, 'Concluída')} className="p-2 bg-green-900 text-green-200 rounded-lg hover:bg-green-800" title="Concluída"><CheckCircle2 size={16}/></button>
                                                 <button onClick={() => handleUpdateStatus(displaySession.id, 'Falta')} className="p-2 bg-red-900 text-red-200 rounded-lg hover:bg-red-800" title="Falta"><UserX size={16}/></button>
                                                 <button onClick={() => startEditingClass(displaySession)} className="p-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600" title="Editar"><Edit size={16}/></button>
                                                 <button onClick={() => handleUpdateStatus(displaySession.id, 'Cancelada')} className="p-2 bg-zinc-800 text-zinc-500 rounded-lg hover:bg-zinc-700" title="Cancelar"><Ban size={16}/></button>
                                                 <button onClick={() => handleUpdateStatus(displaySession.id, 'DELETE')} className="p-2 bg-red-950 text-red-500 rounded-lg hover:bg-red-900 hover:text-white" title="EXCLUIR REGISTRO"><Trash2 size={16}/></button>
                                                 <button onClick={() => setManagingClassId(null)} className="p-2 text-zinc-500 hover:text-white"><X size={16}/></button>
                                             </div>
                                         ) : (
                                             <button onClick={() => setManagingClassId(displaySession.id)} className="p-2 text-zinc-500 hover:text-red-900 transition-colors bg-transparent border border-zinc-700/50 rounded-lg"><Brush size={16} /></button>
                                         )}
                                     </div>
                                 ) : <div className="flex-grow"><p className="text-xs font-bold uppercase text-zinc-500 italic">Horário Vago</p></div>}
                             </div>
                         );
                    })}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorSchedule;