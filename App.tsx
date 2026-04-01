import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import WorkoutsView from './components/WorkoutsView';
import BattleTechniques from './components/BattleTechniques';
import AICoach from './components/AICoach';
import HealthView from './components/HealthView';
import StudentManager from './components/StudentManager';
import InstructorSchedule from './components/InstructorSchedule';
import MasterTrackingLog from './components/MasterTrackingLog';
import Login from './components/Login';
import OnboardingFlow from './components/OnboardingFlow';
import QuestionnaireModal from './components/QuestionnaireModal';
import CalendarModal from './components/CalendarModal';
import { NavigationTab, Student, UserProfile, TrainingLog, OnboardingProfileData } from './types';
import { INITIAL_USER_DATA } from './constants';
import { Save, X, Camera, ChevronDown, ChevronUp, Lock, Send, Users, CheckSquare, Square, ShieldAlert, CreditCard, User, AlertCircle, CheckCircle2, Clock, ScrollText, Shield } from 'lucide-react';

// Hooks
import { useSettings } from './hooks/useSettings';
import { useAuth } from './hooks/useAuth';
import { useWorkoutSession } from './hooks/useWorkoutSession';
import { useUserProfile } from './hooks/useUserProfile';
import { useClan } from './hooks/useClan';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  // Hooks
  const { theme, setTheme, audioSettings, setAudioSettings, soundConfig, handleUpdateSoundConfig, sageAvatar, handleUpdateSageAvatar, customIcons, handleUpdateIcon, handleResetIcon } = useSettings();
  const { isAuthenticated, login, onSignUp, logout, user: authUser } = useAuth();
  const { clanMembers, setClanMembers, createStudent, updateStudent, deleteStudent, updateStudentWorkouts } = useClan();
  const { user, setUser, loading: isUserProfileLoading, nextClassAlert, saveQuestionnaire, acceptTerms, completeOnboarding, addTrainingLog, updateTrainingLog, deleteTrainingLog } = useUserProfile(authUser);
  const { activeSession, startSession, pauseSession, resumeSession, updateSessionData, finishSession } = useWorkoutSession(authUser);

  // UI State (Local)
  const [activeTab, setActiveTab] = useState<NavigationTab>(NavigationTab.DOJO);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null); 
  const [profileTab, setProfileTab] = useState<'PERSONAL' | 'FINANCIAL'>('PERSONAL');
  const [isManagingStudents, setIsManagingStudents] = useState<boolean>(false);
  const [isMessagingClan, setIsMessagingClan] = useState<boolean>(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [scheduleTargetStudentId, setScheduleTargetStudentId] = useState<string | null>(null);
  const [isMasterTrackingOpen, setIsMasterTrackingOpen] = useState<boolean>(false);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [showAdvancedEdit, setShowAdvancedEdit] = useState<boolean>(false);
  const [showPasswordEdit, setShowPasswordEdit] = useState<boolean>(false);
  const [isContactingMaster, setIsContactingMaster] = useState<boolean>(false);
  const [masterMessage, setMasterMessage] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

  // Handlers Wrappers
  const handleLogin = async (email: string, passwordInput: string): Promise<boolean> => {
    try {
      const userData = await login(email, passwordInput);
      if (userData) {
        // useUserProfile will automatically load data based on authUser
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const handleSignUp = async (email: string, passwordInput: string): Promise<boolean> => {
    try {
      await onSignUp(email, passwordInput);
      return true;
    } catch (error) {
      console.error("Sign up failed:", error);
      throw error;
    }
  };

  const handleLogout = () => {
    logout();
    setUser(INITIAL_USER_DATA);
    setActiveTab(NavigationTab.DOJO);
  };

  const handleFinishSession = async (log?: TrainingLog) => {
    if (log) {
        // Persistir log usando a nova estrutura de subcoleções
        await addTrainingLog(log);
        
        // Opcional: Atualizar estado local do usuário se necessário (o hook já faz isso parcialmente)
        // Mas como addTrainingLog atualiza o estado `user`, não precisamos fazer manualmente aqui
        // a menos que queiramos garantir consistência imediata
    }
    finishSession();
  };

  const handleOnboardingComplete = async (profileData: OnboardingProfileData) => {
      const updatedUser = await completeOnboarding(profileData);
      updateStudent(updatedUser);
  };

  const handleAcceptTerms = async () => {
      const updatedUser = await acceptTerms();
      updateStudent(updatedUser);
  };

  const handleSaveQuestionnaire = async (answers: { question: string; answer: string }[]) => {
    setIsQuestionnaireOpen(false);
    alert("Respostas enviadas ao Mestre! A IA está analisando seu perfil estratégico...");
    const finalUser = await saveQuestionnaire(answers);
    updateStudent(finalUser);
    alert("Análise estratégica concluída e salva no pergaminho do Mestre.");
  };

  const handleUpdateStudentFromManager = (updatedStudent: Student) => {
    if (updatedStudent.id === user.id || updatedStudent.email.toLowerCase() === user.email.toLowerCase()) {
      setUser(prev => ({ ...prev, ...updatedStudent }));
    }
    updateStudent(updatedStudent);
    
    // Atualiza workouts na subcoleção se existirem no objeto atualizado
    if (updatedStudent.workouts && Array.isArray(updatedStudent.workouts)) {
        updateStudentWorkouts(updatedStudent.id, updatedStudent.workouts);
    }
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm("Tem certeza que deseja expulsar este membro do clã?")) {
      deleteStudent(id);
    }
  };

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsEditingProfile(false);
    setEditingUser(null);
    setIsManagingStudents(false);
    setIsMessagingClan(false);
    setIsContactingMaster(false);
    setIsScheduleOpen(false);
    setIsMasterTrackingOpen(false);
    setIsQuestionnaireOpen(false);
    setScheduleTargetStudentId(null);
    setMasterMessage('');
    setBroadcastTitle('');
    setBroadcastContent('');
    setSelectedRecipients([]);
  };

  const handleStartEditProfile = () => {
    setEditingUser(JSON.parse(JSON.stringify(user)));
    setProfileTab('PERSONAL'); 
    setIsEditingProfile(true);
  };

  const handleOpenScheduleForStudent = (studentId?: string) => {
      setScheduleTargetStudentId(studentId || null);
      setIsScheduleOpen(true);
      setIsManagingStudents(false); 
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (!authUser) {
          return;
        }

        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `${authUser.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type || 'image/jpeg'
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const imageUrl = data.publicUrl;

        if (isEditingProfile && editingUser) {
           setEditingUser({ ...editingUser, profileImage: imageUrl });
        } else {
           setUser({ ...user, profileImage: imageUrl });
        }
      } catch (error) {
        console.error('Erro ao enviar avatar para Supabase Storage:', error);
        alert('Não foi possível enviar a imagem. Tente novamente.');
      }
    }
  };

  const formatBRPhone = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 10) {
      return value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (value.length > 6) {
      return value.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (value.length > 2) {
      return value.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    } else {
      return value;
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (showPasswordEdit && newPass) {
      if (currentPass !== user.password) {
        alert("Código atual incorreto.");
        return;
      }
      if (newPass !== confirmNewPass) {
        alert("Os novos códigos não coincidem.");
        return;
      }
      editingUser.password = newPass; 
      alert("Código de acesso atualizado com sucesso.");
    }
    
    const profileToSave: UserProfile = {
      ...editingUser,
      id: editingUser.id || user.id
    };

    if (!profileToSave.id || profileToSave.id === 'guest') {
      alert("Não foi possível identificar o perfil para atualização.");
      return;
    }

    setUser(profileToSave);
    await updateStudent(profileToSave);
    
    setIsEditingProfile(false);
    setEditingUser(null);
    setShowAdvancedEdit(false);
    setShowPasswordEdit(false);
    setCurrentPass('');
    setNewPass('');
    setConfirmNewPass('');
  };

  const deleteMessage = (id: string) => {
    setUser({ ...user, messages: user.messages.filter(m => m.id !== id) });
  };

  const handleSendMessageToMaster = () => {
    if (!masterMessage.trim()) return;
    alert("Mensagem enviada ao pergaminho do Mestre.");
    setMasterMessage('');
    setIsContactingMaster(false);
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleAllRecipients = () => {
    if (selectedRecipients.length === clanMembers.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(clanMembers.map(m => m.id));
    }
  };

  const handleBroadcastMessage = () => {
    if (!broadcastTitle.trim() || !broadcastContent.trim() || selectedRecipients.length === 0) {
      alert("Preencha todos os campos e selecione pelo menos um membro.");
      return;
    }
    alert(`Mensagem "${broadcastTitle}" disparada para ${selectedRecipients.length} membros do clã.`);
    setBroadcastTitle('');
    setBroadcastContent('');
    setSelectedRecipients([]);
    setIsMessagingClan(false);
  };

  const isMestre = !!(user.isLider || ['w.samurai.fitness@gmail.com'].includes(user.email.toLowerCase()));

  // Render Content (Same logic, simplified variables)
  const renderContent = () => {
    if (isEditingProfile && editingUser) {
      const inputBg = theme === 'Noite' ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-zinc-200';
      const textColor = theme === 'Noite' ? 'text-white' : 'text-zinc-900';

      return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-20">
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-2xl font-black italic uppercase ${theme === 'Dia' ? 'text-zinc-900' : 'text-white'}`}>Meu Perfil</h2>
            <button onClick={() => { setIsEditingProfile(false); setEditingUser(null); setShowAdvancedEdit(false); setShowPasswordEdit(false); }} className="p-2 text-zinc-500 hover:text-red-900 transition-colors"><X size={28} /></button>
          </div>
          
           <div className={`flex p-1 rounded-2xl mb-6 ${theme === 'Noite' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
             <button 
                onClick={() => setProfileTab('PERSONAL')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    profileTab === 'PERSONAL' 
                    ? (theme === 'Noite' ? 'bg-zinc-700 text-white shadow-md' : 'bg-white text-red-900 shadow-md') 
                    : (theme === 'Noite' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-red-900')
                }`}
             >
                <User size={14} /> Dados
             </button>
             <button 
                onClick={() => setProfileTab('FINANCIAL')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    profileTab === 'FINANCIAL' 
                    ? (theme === 'Noite' ? 'bg-zinc-700 text-white shadow-md' : 'bg-white text-red-900 shadow-md') 
                    : (theme === 'Noite' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-red-900')
                }`}
             >
                <CreditCard size={14} /> Financeiro
             </button>
          </div>

          {profileTab === 'PERSONAL' ? (
             <form onSubmit={handleSaveProfile} className="space-y-6 animate-in slide-in-from-left-4">
                
                {/* Foto */}
                <div className="flex justify-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-red-900">
                      {editingUser.profileImage ? (
                        <img src={editingUser.profileImage} alt="Perfil" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 font-black text-2xl">
                          {editingUser.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-red-900 rounded-full text-white cursor-pointer shadow-lg hover:bg-red-800 transition-colors">
                      <Camera size={14} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>

                {/* VISUALIZAÇÃO DO NÍVEL (SOMENTE LEITURA) */}
                <div className={`p-5 rounded-2xl border ${theme === 'Noite' ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-100'} flex items-center justify-between`}>
                    <div>
                        <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 flex items-center gap-1">
                            <Shield size={12} className="text-red-900" /> Nível Atual
                        </p>
                        <h3 className="text-xl font-black uppercase text-red-900 italic">{editingUser.level}</h3>
                    </div>
                    <div className="text-[9px] font-bold uppercase text-zinc-500 text-right opacity-60">
                        <Lock size={12} className="inline mb-1"/>
                        <br/>
                        Definido pelo Mestre
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nome</label>
                    <input className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required />
                  </div>
                  
                  {/* EMAIL - SOMENTE LEITURA */}
                  <div className="space-y-1 opacity-75">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 flex items-center gap-2">Email <Lock size={10}/></label>
                    <input 
                        type="email" 
                        disabled
                        className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} cursor-not-allowed border-dashed border-zinc-600`} 
                        value={editingUser.email} 
                    />
                  </div>

                   <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Telefone</label>
                    <input className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: formatBRPhone(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nascimento</label>
                    <input type="date" className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={editingUser.birthDate} onChange={e => setEditingUser({...editingUser, birthDate: e.target.value})} />
                  </div>
                </div>

                {/* BIOGRAFIA (EDITÁVEL PELO ALUNO) */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1 flex items-center gap-2">
                        <ScrollText size={12}/> Minha Biografia (História)
                    </label>
                    <textarea 
                        className={`w-full h-32 ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} resize-none focus:outline-none focus:border-red-900 transition-all`}
                        placeholder="Escreva sua história, lesões passadas ou motivações..."
                        value={editingUser.biography || ''}
                        onChange={e => setEditingUser({...editingUser, biography: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Peso (kg)</label>
                     <input type="number" className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={editingUser.weight} onChange={e => setEditingUser({...editingUser, weight: Number(e.target.value)})} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Altura (cm)</label>
                     <input type="number" className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor}`} value={editingUser.height} onChange={e => setEditingUser({...editingUser, height: Number(e.target.value)})} />
                   </div>
                </div>

                <div className={`p-4 rounded-2xl border ${theme === 'Noite' ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
                    <button 
                      type="button" 
                      onClick={() => setShowPasswordEdit(!showPasswordEdit)}
                      className="flex items-center justify-between w-full text-xs font-black uppercase text-zinc-500 hover:text-red-900 transition-colors"
                    >
                      <span className="flex items-center gap-2"><Lock size={14} /> Alterar Código de Honra (Senha)</span>
                      {showPasswordEdit ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    
                    {showPasswordEdit && (
                      <div className="mt-4 space-y-3 animate-in slide-in-from-top-2">
                         <input type="password" placeholder="Senha Atual" className={`w-full ${inputBg} p-3 rounded-xl text-sm`} value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
                         <input type="password" placeholder="Nova Senha" className={`w-full ${inputBg} p-3 rounded-xl text-sm`} value={newPass} onChange={e => setNewPass(e.target.value)} />
                         <input type="password" placeholder="Confirmar Nova Senha" className={`w-full ${inputBg} p-3 rounded-xl text-sm`} value={confirmNewPass} onChange={e => setConfirmNewPass(e.target.value)} />
                      </div>
                    )}
                </div>

               <button type="submit" className="w-full bg-red-900 text-white font-black py-5 rounded-3xl shadow-2xl italic uppercase tracking-widest active:scale-95 transition-all shadow-red-900/20 flex items-center justify-center gap-2">
                 <Save size={18} /> ATUALIZAR PERGAMINHO
               </button>
             </form>
          ) : (
              <div className="animate-in slide-in-from-right-4 space-y-6">
                 {editingUser.financial ? (
                    <>
                      <div className={`p-6 rounded-3xl border flex items-center justify-between ${editingUser.financial.status === 'Em dia' ? 'bg-green-900/10 border-green-900/30' : editingUser.financial.status === 'Atrasado' ? 'bg-red-900/10 border-red-900/30' : 'bg-yellow-600/10 border-yellow-600/30'}`}>
                          <div>
                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Status Atual</p>
                            <h3 className={`text-2xl font-black uppercase italic ${editingUser.financial.status === 'Em dia' ? 'text-green-600' : editingUser.financial.status === 'Atrasado' ? 'text-red-600' : 'text-yellow-600'}`}>{editingUser.financial.status}</h3>
                          </div>
                          {editingUser.financial.status === 'Atrasado' ? <AlertCircle size={32} className="text-red-600" /> : <CheckCircle2 size={32} className="text-green-600" />}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className={`p-4 rounded-2xl ${inputBg}`}>
                            <p className="text-[9px] font-black uppercase text-zinc-500">Plano</p>
                            <p className={`text-lg font-black uppercase ${textColor}`}>{editingUser.financial.plan}</p>
                         </div>
                         <div className={`p-4 rounded-2xl ${inputBg}`}>
                            <p className="text-[9px] font-black uppercase text-zinc-500">Valor</p>
                            <p className={`text-lg font-black uppercase ${textColor}`}>R$ {editingUser.financial.value}</p>
                         </div>
                         <div className={`p-4 rounded-2xl ${inputBg}`}>
                            <p className="text-[9px] font-black uppercase text-zinc-500">Vencimento</p>
                            <p className={`text-lg font-black uppercase ${textColor}`}>{editingUser.financial.dueDate.split('-').reverse().join('/')}</p>
                         </div>
                         <div className={`p-4 rounded-2xl ${inputBg}`}>
                            <p className="text-[9px] font-black uppercase text-zinc-500">Último Pagamento</p>
                            <p className={`text-lg font-black uppercase ${textColor}`}>{editingUser.financial.lastPayment.split('-').reverse().join('/')}</p>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <h4 className="text-xs font-black uppercase text-zinc-500 ml-1">Histórico de Contribuição</h4>
                         {editingUser.financial.history && editingUser.financial.history.length > 0 ? (
                           editingUser.financial.history.map((h: any, i: number) => (
                             <div key={i} className={`p-4 rounded-2xl border flex justify-between items-center ${theme === 'Noite' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
                                <div>
                                   <p className={`text-xs font-black ${textColor}`}>{h.date.split('-').reverse().join('/')}</p>
                                   <p className="text-[9px] font-bold text-zinc-500 uppercase">{h.method}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-xs font-black text-green-600">R$ {h.amount}</p>
                                   <p className="text-[9px] font-bold text-zinc-500 uppercase">{h.status}</p>
                                </div>
                             </div>
                           ))
                         ) : (
                           <p className="text-center text-xs text-zinc-500 italic py-4">Nenhum registro encontrado.</p>
                         )}
                      </div>
                    </>
                 ) : (
                    <div className="text-center py-10 opacity-50">
                        <CreditCard size={40} className="mx-auto mb-2 text-zinc-600" />
                        <p className="text-xs font-bold uppercase italic text-zinc-500">Dados financeiros indisponíveis</p>
                    </div>
                 )}
              </div>
          )}
        </div>
      );
    }

    switch (activeTab) {
      case NavigationTab.DOJO: return <Dashboard user={user} onUpdateUser={setUser} theme={theme} activeSession={activeSession} onResumeSession={() => setActiveTab(NavigationTab.WORKOUTS)} />;
      case NavigationTab.TECHNIQUES: return <BattleTechniques isLider={isMestre} theme={theme} />;
      case NavigationTab.WORKOUTS: 
        return (
            <WorkoutsView 
                workouts={user.workouts} 
                theme={theme} 
                soundConfig={soundConfig}
                audioSettings={audioSettings}
                onUpdateAudioSettings={setAudioSettings}
                activeSession={activeSession}
                onStartSession={startSession}
                onPauseSession={pauseSession}
                onResumeSession={resumeSession}
                onUpdateSessionData={updateSessionData}
                onFinishSession={handleFinishSession}
            />
        );
      case NavigationTab.AI_COACH: return <AICoach user={user} theme={theme} sageAvatar={sageAvatar} onUpdateSageAvatar={handleUpdateSageAvatar} />;
      case NavigationTab.HEALTH: return <HealthView user={user} theme={theme} />;
      default: return <Dashboard user={user} onUpdateUser={setUser} theme={theme} activeSession={activeSession} onResumeSession={() => setActiveTab(NavigationTab.WORKOUTS)} />;
    }
  };

  return (
    <div className={`transition-colors duration-500 min-h-screen ${theme === 'Dia' ? 'bg-[#f7f9fc]' : 'bg-[#0A0A0A]'}`}>
      {isAuthenticated ? (
        <>
          {isUserProfileLoading ? (
            <div className={`fixed inset-0 z-[200] flex items-center justify-center ${theme === 'Noite' ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
              <div className={`w-16 h-16 rounded-full border-4 border-red-900/30 border-t-red-900 animate-spin`} />
            </div>
          ) : (user.isFirstLogin || !user.hasAcceptedTerms) ? (
              <OnboardingFlow user={user} onAcceptTerms={handleAcceptTerms} onComplete={handleOnboardingComplete} theme={theme} />
          ) : (
            <>
                {nextClassAlert && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
                        <div className="bg-red-900 text-white px-6 py-3 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-500 flex items-center gap-3">
                            <Clock size={20} className="animate-pulse" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Atenção Mestre</p>
                                <p className="text-sm font-bold uppercase italic">Aula com {nextClassAlert.studentName} às {nextClassAlert.time}</p>
                            </div>
                        </div>
                    </div>
                )}
                
                <Layout 
                    activeTab={activeTab} setActiveTab={handleTabChange} 
                    user={user} 
                    onUpdateUser={setUser}
                    onLogout={handleLogout}
                    onEditProfile={handleStartEditProfile}
                    onManageStudents={() => setIsManagingStudents(true)}
                    onContactMaster={() => setIsContactingMaster(true)}
                    onOpenMessenger={() => setIsMessagingClan(true)}
                    onDeleteMessage={deleteMessage}
                    isLider={isMestre}
                    theme={theme} setTheme={setTheme}
                    audioSettings={audioSettings} 
                    setAudioSettings={setAudioSettings}
                    sageAvatar={sageAvatar}
                    customIcons={customIcons}
                    onUpdateIcon={handleUpdateIcon}
                    onResetIcon={handleResetIcon}
                    onOpenSchedule={() => handleOpenScheduleForStudent()}
                    onOpenMasterTracking={() => setIsMasterTrackingOpen(true)}
                    onOpenQuestionnaire={() => setIsQuestionnaireOpen(true)}
                    onOpenCalendar={() => setIsCalendarOpen(true)}
                    soundConfig={soundConfig}
                    onUpdateSoundConfig={handleUpdateSoundConfig}
                >
                    {renderContent()}
                </Layout>
                
                {isManagingStudents && (
                    <StudentManager 
                    onClose={() => setIsManagingStudents(false)} 
                    students={clanMembers}
                    onUpdateStudent={handleUpdateStudentFromManager} 
                    onCreateStudent={createStudent}
                    onDeleteStudent={handleDeleteStudent}
                    theme={theme} 
                    onOpenSchedule={handleOpenScheduleForStudent} 
                    />
                )}

                {isScheduleOpen && (
                    <InstructorSchedule 
                        onClose={() => setIsScheduleOpen(false)}
                        user={user}
                        onUpdateUser={setUser}
                        students={clanMembers}
                        theme={theme}
                        initialStudentId={scheduleTargetStudentId} 
                    />
                )}

                {isMasterTrackingOpen && (
                    <MasterTrackingLog 
                        onClose={() => setIsMasterTrackingOpen(false)}
                        students={clanMembers}
                        theme={theme}
                    />
                )}

                {isQuestionnaireOpen && (
                    <QuestionnaireModal 
                        onClose={() => setIsQuestionnaireOpen(false)}
                        onSave={handleSaveQuestionnaire}
                        theme={theme}
                    />
                )}

                {isCalendarOpen && (
                    <CalendarModal 
                        onClose={() => setIsCalendarOpen(false)}
                        user={user}
                        onUpdateLog={updateTrainingLog}
                        onDeleteLog={deleteTrainingLog}
                        theme={theme}
                    />
                )}
                
                {isContactingMaster && (
                    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md p-6 flex items-center justify-center animate-in fade-in zoom-in-95">
                    <div className={`${theme === 'Noite' ? 'bg-[#1A1A1A]' : 'bg-white'} w-full max-w-md p-8 rounded-[3rem] shadow-2xl border ${theme === 'Noite' ? 'border-white/5' : 'border-zinc-200'}`}>
                        <div className="flex justify-between items-center mb-6">
                        <h3 className={`text-xl font-black italic uppercase ${theme === 'Dia' ? 'text-zinc-900' : 'text-white'}`}>Falar com o Mestre</h3>
                        <button onClick={() => setIsContactingMaster(false)} className="text-zinc-500 hover:text-red-900 transition-colors"><X size={24} /></button>
                        </div>
                        <textarea 
                        value={masterMessage} onChange={e => setMasterMessage(e.target.value)}
                        placeholder="Escreva sua dúvida ou relato para o Mestre..."
                        className={`w-full h-40 ${theme === 'Noite' ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-zinc-200'} border rounded-3xl p-5 text-sm font-bold focus:outline-none focus:border-red-900 transition-all resize-none`}
                        />
                        <button 
                        onClick={handleSendMessageToMaster}
                        className="w-full mt-6 bg-red-900 text-white font-black py-4 rounded-3xl shadow-xl flex items-center justify-center gap-2 italic uppercase active:scale-95 transition-all"
                        >
                        <Send size={18} /> Enviar ao Dojo
                        </button>
                    </div>
                    </div>
                )}

                {isMessagingClan && (
                    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md p-6 flex items-center justify-center animate-in fade-in zoom-in-95 overflow-y-auto">
                    <div className={`${theme === 'Noite' ? 'bg-[#1A1A1A]' : 'bg-white'} w-full max-w-lg p-8 rounded-[3rem] shadow-2xl border ${theme === 'Noite' ? 'border-red-900/20' : 'border-zinc-200'}`}>
                        <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <Users size={24} className="text-red-900" />
                            <h3 className={`text-xl font-black italic uppercase ${theme === 'Dia' ? 'text-zinc-900' : 'text-white'}`}>Comando do Clã</h3>
                        </div>
                        <button onClick={() => setIsMessagingClan(false)} className="text-zinc-500 hover:text-red-900 transition-colors"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 italic ml-1">Assunto do Pergaminho</label>
                            <input 
                            value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)}
                            placeholder="Ex: Treino de Sábado / Novo Protocolo"
                            className={`w-full p-4 rounded-2xl border ${theme === 'Noite' ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-zinc-200'} text-sm font-bold focus:outline-none focus:border-red-900 transition-all`}
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 italic ml-1">Conteúdo da Mensagem</label>
                            <textarea 
                            value={broadcastContent} onChange={e => setBroadcastContent(e.target.value)}
                            placeholder="Escreva a ordem para os membros..."
                            className={`w-full h-32 p-4 rounded-2xl border ${theme === 'Noite' ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-zinc-200'} text-sm font-bold focus:outline-none focus:border-red-900 transition-all resize-none`}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black uppercase text-zinc-500 italic ml-1">Selecionar Membros</label>
                            <button onClick={toggleAllRecipients} className="text-[9px] font-black uppercase text-red-900 hover:underline">
                                {selectedRecipients.length === clanMembers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </button>
                            </div>
                            
                            <div className={`max-h-40 overflow-y-auto p-2 rounded-2xl border ${theme === 'Noite' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-zinc-200'} custom-scrollbar`}>
                            {clanMembers.map(member => (
                                <button 
                                key={member.id}
                                onClick={() => toggleRecipient(member.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl mb-1 transition-all ${selectedRecipients.includes(member.id) ? 'bg-red-900/10' : 'hover:bg-white/5'}`}
                                >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs text-white">{member.name.charAt(0)}</div>
                                    <span className={`text-xs font-bold uppercase ${theme === 'Dia' ? 'text-zinc-800' : 'text-zinc-300'}`}>{member.name}</span>
                                </div>
                                {selectedRecipients.includes(member.id) ? <CheckSquare size={16} className="text-red-900" /> : <Square size={16} className="text-zinc-500" />}
                                </button>
                            ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleBroadcastMessage}
                            className="w-full mt-4 bg-red-900 text-white font-black py-4 rounded-3xl shadow-xl flex items-center justify-center gap-2 italic uppercase active:scale-95 transition-all"
                        >
                            <Send size={18} /> Disparar Ordem
                        </button>
                        </div>
                    </div>
                    </div>
                )}
            </>
          )}
        </>
      ) : (
        <Login 
          onLogin={handleLogin} 
          onSignUp={handleSignUp}
          theme={theme} 
          customLogo={customIcons['loginLogo']} 
        />
      )}
    </div>
  );
};

export default App;
