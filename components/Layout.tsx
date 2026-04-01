
import React, { useState } from 'react';
import { NavigationTab, Message, UserProfile, SoundConfig, AudioSettings } from '../types';
import { Home, Sword, HeartPulse, Shield, Scroll, X, LogOut, ChevronRight, User, ShieldCheck, Swords, Settings, Moon, Sun, Volume2, Mail, Trash2, Send, Users, ShieldAlert, Calendar, Camera, RefreshCcw, Clock, Music, Volume1, VolumeX, Sliders, ChevronUp, ChevronDown, Lock, ScrollText } from 'lucide-react';
import { PRIVACY_POLICY } from '../constants';
import SoundConfigModal from './SoundConfigModal';

interface LayoutProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  children: React.ReactNode;
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onLogout: () => void;
  onEditProfile: () => void;
  onManageStudents: () => void;
  onContactMaster: () => void;
  onOpenMessenger: () => void;
  onDeleteMessage: (id: string) => void;
  isLider: boolean;
  theme: 'Dia' | 'Noite';
  setTheme: (t: 'Dia' | 'Noite') => void;
  audioSettings: AudioSettings;
  setAudioSettings: (s: AudioSettings) => void;
  sageAvatar?: string;
  customIcons?: Record<string, string>;
  onUpdateIcon?: (tabId: string, newUrl: string) => void;
  onResetIcon?: (tabId: string) => void;
  onOpenSchedule: () => void;
  onOpenMasterTracking: () => void; // Nova Prop
  // Props de Som
  soundConfig?: SoundConfig;
  onUpdateSoundConfig?: (config: SoundConfig) => void;
  onOpenQuestionnaire: () => void; // Nova Prop para Questionário
  onOpenCalendar: () => void; // Nova Prop para Calendário
}

const Layout: React.FC<LayoutProps> = ({ 
  activeTab, 
  setActiveTab, 
  children, 
  user,
  onUpdateUser,
  onLogout, 
  onEditProfile,
  onManageStudents,
  onContactMaster,
  onOpenMessenger,
  onDeleteMessage,
  isLider,
  theme,
  setTheme,
  audioSettings,
  setAudioSettings,
  sageAvatar,
  customIcons = {},
  onUpdateIcon,
  onResetIcon,
  onOpenSchedule,
  onOpenMasterTracking,
  soundConfig,
  onUpdateSoundConfig,
  onOpenQuestionnaire,
  onOpenCalendar
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIconEditor, setShowIconEditor] = useState(false);
  const [showAudioMixer, setShowAudioMixer] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isSoundConfigOpen, setIsSoundConfigOpen] = useState(false);

  // ... (Tabs e configurações de cores mantidas) ...
  const tabs = isLider ? [
    { id: NavigationTab.STUDENTS, label: 'Alunos', icon: Users },
    { id: NavigationTab.SCHEDULE, label: 'Agenda', icon: Calendar, highlight: true },
    { id: NavigationTab.DOJO, label: 'Resumo', icon: Home },
  ] : [
    { id: NavigationTab.DOJO, label: 'Dojo', icon: Home },
    { id: NavigationTab.TECHNIQUES, label: 'Técnicas', icon: Swords },
    { id: NavigationTab.WORKOUTS, label: 'Guerra', icon: Sword, highlight: true },
    { id: NavigationTab.AI_COACH, label: 'Sábio do Clã', icon: Shield },
    { id: NavigationTab.HEALTH, label: 'Saúde', icon: HeartPulse },
  ];

  const bgColor = theme === 'Noite' ? 'bg-zinc-950' : 'bg-zinc-100';
  const textColor = theme === 'Noite' ? 'text-zinc-100' : 'text-zinc-900';
  const sidebarBg = theme === 'Noite' ? 'bg-zinc-900' : 'bg-white';
  const bubbleColor = theme === 'Noite' ? 'bg-zinc-900' : 'bg-white';
  const borderColor = theme === 'Noite' ? 'border-white/10' : 'border-zinc-200';
  const modalDetailColor = theme === 'Noite' ? 'bg-zinc-900' : 'bg-white';

  const unreadCount = user.messages.filter((m: Message) => !m.isRead).length;

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>, tabId: string) => {
    const file = e.target.files?.[0];
    if (file && onUpdateIcon) {
        const reader = new FileReader();
        reader.onloadend = () => {
            onUpdateIcon(tabId, reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleAudioTypeToggle = (type: keyof AudioSettings['types']) => {
      const newSettings = { ...audioSettings };
      newSettings.types[type].enabled = !newSettings.types[type].enabled;
      setAudioSettings(newSettings);
  };

  const handleAudioTypeVolume = (type: keyof AudioSettings['types'], vol: number) => {
      const newSettings = { ...audioSettings };
      newSettings.types[type].volume = vol;
      setAudioSettings(newSettings);
  };

  return (
    <div className={`flex flex-col min-h-screen pb-28 ${bgColor} ${textColor} transition-colors duration-500`}>
      {/* ... (Header mantido igual) ... */}
      <header className={`sticky top-0 z-40 ${theme === 'Noite' ? 'bg-zinc-900/95' : 'bg-white/80'} backdrop-blur-xl border-b ${borderColor} p-4 rounded-b-[2rem] shadow-lg`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className={`p-2 hover:bg-red-900/10 rounded-xl text-red-700 transition-colors`}>
            {customIcons['sidebar'] ? (
               <div className="w-7 h-7 rounded-md overflow-hidden shadow-sm">
                  <img src={customIcons['sidebar']} className="w-full h-full object-cover" alt="Registros" />
               </div>
            ) : (
               <Scroll size={28} />
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-tighter uppercase italic">SAMURAI <span className="text-red-700">FIT</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
                className={`p-2.5 rounded-xl border ${theme === 'Noite' ? 'bg-zinc-800 border-white/5 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'} active:scale-95 transition-all relative hover:border-red-900/30`}
              >
                <Mail size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-zinc-900 animate-pulse"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className={`absolute right-[-60px] md:right-0 mt-4 w-72 ${bubbleColor} border ${borderColor} rounded-[2rem] p-5 z-50 animate-in fade-in slide-in-from-top-2 shadow-2xl`}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-700 italic">Mensagens</h4>
                    <button onClick={() => setIsNotificationsOpen(false)}><X size={16} className="text-zinc-500 hover:text-red-700" /></button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {user.messages.length > 0 ? (
                      user.messages.map((n: Message) => (
                        <div 
                          key={n.id} 
                          onClick={() => { setSelectedMessage(n); setIsNotificationsOpen(false); }}
                          className={`p-3 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100'} border border-transparent hover:border-red-900/20 transition-all cursor-pointer relative group`}
                        >
                          <p className="text-[9px] font-black uppercase text-zinc-500">{n.date}</p>
                          <p className={`text-xs font-black uppercase italic ${n.isRead ? 'text-zinc-400' : 'text-red-700'}`}>{n.title}</p>
                          <p className="text-[10px] leading-tight mt-1 opacity-80 truncate">{n.content}</p>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteMessage(n.id); }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-700 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-zinc-500 font-bold uppercase text-center py-4 italic">Sem mensagens no pergaminho</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setIsTopMenuOpen(!isTopMenuOpen)} className="w-10 h-10 rounded-full ring-2 ring-red-900/20 hover:ring-red-900/50 p-0.5 overflow-hidden active:scale-95 transition-all shadow-md">
                <img src={user.profileImage || "https://picsum.photos/seed/samurai_user/100/100"} className="w-full h-full rounded-full object-cover" alt="Avatar" />
              </button>
              
              {isTopMenuOpen && (
                <div className={`absolute right-0 mt-2 w-48 ${bubbleColor} border ${borderColor} rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 shadow-2xl`}>
                  <button onClick={() => { onEditProfile(); setIsTopMenuOpen(false); }} className={`w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 hover:bg-red-900/5 transition-colors`}>
                    <User size={16} className="text-red-700" /> Ver Perfil
                  </button>
                  <button onClick={() => { onLogout(); setIsTopMenuOpen(false); }} className="w-full px-4 py-3 text-left text-[11px] font-black uppercase italic text-red-700 hover:bg-red-900/5 flex items-center gap-3 tracking-widest transition-colors">
                    <LogOut size={16} /> SAIR DO DOJO
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ... (Modais de Calendário, Som Config, Detalhe Mensagem mantidos) ... */}
      {isSoundConfigOpen && soundConfig && onUpdateSoundConfig && (
        <SoundConfigModal onClose={() => setIsSoundConfigOpen(false)} config={soundConfig} onUpdate={onUpdateSoundConfig} theme={theme} />
      )}
      {selectedMessage && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md p-6 flex items-center justify-center animate-in fade-in zoom-in-95">
          <div className={`${modalDetailColor} w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl border ${theme === 'Noite' ? 'border-zinc-800' : 'border-zinc-200'} relative`}>
            <div className="p-8 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest italic">{selectedMessage.date} • De: {selectedMessage.senderName}</p>
                  <h3 className="text-2xl font-black italic uppercase text-red-700 mt-1">{selectedMessage.title}</h3>
                </div>
                <button onClick={() => setSelectedMessage(null)} className="p-2 text-zinc-500 hover:text-red-700 transition-colors"><X size={28} /></button>
              </div>
              
              {selectedMessage.image && (
                <div className="w-full aspect-video rounded-3xl overflow-hidden border border-zinc-500/10 my-4 shadow-xl">
                  <img src={selectedMessage.image} className="w-full h-full object-cover" alt="Mensagem" />
                </div>
              )}

              <p className={`text-sm font-bold leading-relaxed italic opacity-90 ${theme === 'Dia' ? 'text-zinc-800' : 'text-zinc-300'}`}>
                {selectedMessage.content}
              </p>

              <div className="pt-6 flex gap-4">
                <button onClick={() => { onDeleteMessage(selectedMessage.id); setSelectedMessage(null); }} className="flex-grow bg-red-900/5 text-red-700 font-black py-4 rounded-3xl text-xs uppercase italic border border-red-900/10 hover:bg-red-900 hover:text-white transition-all">Excluir do Pergaminho</button>
                <button onClick={() => setSelectedMessage(null)} className={`px-8 py-4 ${theme === 'Noite' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'} font-black text-xs uppercase italic rounded-3xl hover:opacity-80 transition-opacity`}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Pergaminho */}
      <aside className={`fixed top-0 left-0 h-full w-[80%] sm:w-1/2 ${sidebarBg} z-[60] border-r ${borderColor} transform transition-transform duration-500 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <Scroll size={20} className="text-red-700" />
              <h2 className="font-black italic uppercase text-sm tracking-widest">Registros</h2>
            </div>
            <button onClick={() => { setIsSidebarOpen(false); setShowSettings(false); setShowIconEditor(false); setShowAudioMixer(false); }} className="text-zinc-500 hover:text-red-700 transition-colors"><X size={28} /></button>
          </div>

          <div className="space-y-6 flex-grow overflow-y-auto custom-scrollbar">
            {!showSettings ? (
              <div className="space-y-3 animate-in fade-in duration-300">
                <p className="text-[10px] font-black uppercase text-zinc-500 ml-2 mb-2 tracking-widest">Menu do Guerreiro</p>
                {[{ icon: User, label: "Meu Perfil", action: onEditProfile }, { icon: Calendar, label: "Calendário", action: onOpenCalendar }].map((item, idx) => (
                  <button key={idx} onClick={() => { item.action(); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-white border border-zinc-100'} transition-all text-xs font-bold uppercase group`}>
                    <div className="flex items-center gap-3"><item.icon size={16} className="text-red-700 group-hover:scale-110 transition-transform" /><span>{item.label}</span></div>
                    <ChevronRight size={14} className="text-zinc-500" />
                  </button>
                ))}

                {!isLider && (
                    <button onClick={() => { onOpenQuestionnaire(); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-white border border-zinc-100'} transition-all text-xs font-bold uppercase group`}>
                        <div className="flex items-center gap-3"><ScrollText size={16} className="text-red-700 group-hover:scale-110 transition-transform" /><span>Questionário de Honra</span></div>
                        <ChevronRight size={14} className="text-zinc-500" />
                    </button>
                )}

                {!isLider ? (
                  <button onClick={() => { onContactMaster(); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-white border border-zinc-100'} transition-all text-xs font-bold uppercase group`}>
                    <div className="flex items-center gap-3"><Send size={16} className="text-red-700 group-hover:scale-110 transition-transform" /><span>Falar com o Mestre</span></div>
                    <ChevronRight size={14} className="text-zinc-500" />
                  </button>
                ) : (
                  <>
                    <button onClick={() => { onManageStudents(); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-white border border-zinc-100'} transition-all text-xs font-bold uppercase group`}>
                      <div className="flex items-center gap-3"><ShieldCheck size={16} className="text-red-700 group-hover:scale-110 transition-transform" /><span>Editar Clã</span></div>
                      <ChevronRight size={14} className="text-zinc-500" />
                    </button>
                    <button onClick={() => { onOpenSchedule(); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-white border border-zinc-100'} transition-all text-xs font-bold uppercase group`}>
                      <div className="flex items-center gap-3"><Clock size={16} className="text-red-700 group-hover:scale-110 transition-transform" /><span>Agenda do Mestre</span></div>
                      <ChevronRight size={14} className="text-zinc-500" />
                    </button>
                    {/* NOVO BOTÃO DE RASTREAMENTO */}
                    <button onClick={() => { onOpenMasterTracking(); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-white border border-zinc-100'} transition-all text-xs font-bold uppercase group`}>
                      <div className="flex items-center gap-3"><ScrollText size={16} className="text-red-700 group-hover:scale-110 transition-transform" /><span>Histórico do Clã</span></div>
                      <ChevronRight size={14} className="text-zinc-500" />
                    </button>
                    <button onClick={() => { onOpenMessenger(); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-white border border-zinc-100'} transition-all text-xs font-bold uppercase group`}>
                      <div className="flex items-center gap-3"><Users size={16} className="text-red-700 group-hover:scale-110 transition-transform" /><span>Mensagens para o Clã</span></div>
                      <ChevronRight size={14} className="text-zinc-500" />
                    </button>
                  </>
                )}

                <button onClick={() => setShowSettings(true)} className={`w-full flex items-center justify-between p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-white border border-zinc-100'} transition-all text-xs font-black uppercase italic group`}>
                  <div className="flex items-center gap-3"><Settings size={18} className="text-red-700 group-hover:rotate-45 transition-transform" /><span>Configurações</span></div>
                  <ChevronRight size={14} className="text-zinc-500" />
                </button>
              </div>
            ) : (
              // ÁREA DE CONFIGURAÇÕES
              <div className="animate-in slide-in-from-right-4 space-y-6">
                <button onClick={() => { setShowSettings(false); setShowIconEditor(false); setShowAudioMixer(false); }} className="text-[10px] font-black uppercase text-red-700 mb-2 flex items-center gap-2">← Voltar</button>
                
                {!showIconEditor ? (
                   <div className="space-y-4">
                        <div className={`p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50' : 'bg-zinc-50'} border ${borderColor} space-y-4`}>
                            {/* Tema */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                {theme === 'Noite' ? <Moon size={16} className="text-zinc-400" /> : <Sun size={16} className="text-yellow-600" />}
                                <span className="text-xs font-bold uppercase">Tema: {theme}</span>
                                </div>
                                <button onClick={() => setTheme(theme === 'Noite' ? 'Dia' : 'Noite')} className={`w-12 h-6 rounded-full relative transition-colors ${theme === 'Noite' ? 'bg-red-900' : 'bg-zinc-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${theme === 'Noite' ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Controle de Som Principal */}
                            <div className="flex items-center justify-between border-t border-zinc-500/10 pt-4">
                                <div className="flex items-center gap-3">
                                {audioSettings.masterEnabled ? <Volume2 size={16} className="text-zinc-400" /> : <VolumeX size={16} className="text-red-500" />}
                                <span className="text-xs font-bold uppercase">Sons do Dojo</span>
                                </div>
                                <button onClick={() => setAudioSettings({...audioSettings, masterEnabled: !audioSettings.masterEnabled})} className={`w-12 h-6 rounded-full relative transition-colors ${audioSettings.masterEnabled ? 'bg-red-900' : 'bg-zinc-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${audioSettings.masterEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Expandir Mixer de Áudio */}
                            {audioSettings.masterEnabled && (
                                <div className="pt-2 border-t border-zinc-500/10">
                                    <button onClick={() => setShowAudioMixer(!showAudioMixer)} className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-900 transition-colors">
                                        <span className="flex items-center gap-2"><Sliders size={12} /> Mixer de Volume</span>
                                        {showAudioMixer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                    
                                    {showAudioMixer && (
                                        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 bg-black/10 p-3 rounded-xl">
                                            {/* Master Volume */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-500">
                                                    <span>Master</span>
                                                    <span>{Math.round(audioSettings.masterVolume * 100)}%</span>
                                                </div>
                                                <input 
                                                    type="range" min="0" max="1" step="0.1" 
                                                    value={audioSettings.masterVolume}
                                                    onChange={(e) => setAudioSettings({...audioSettings, masterVolume: parseFloat(e.target.value)})}
                                                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-900"
                                                />
                                            </div>

                                            {/* Canais Individuais */}
                                            {['start', 'rest', 'finish', 'ui'].map((type) => {
                                                const labelMap: any = { start: 'Início', rest: 'Descanso', finish: 'Vitória', ui: 'Interface' };
                                                const setting = audioSettings.types[type as keyof AudioSettings['types']];
                                                
                                                return (
                                                    <div key={type} className="flex items-center gap-3">
                                                        <button 
                                                            onClick={() => handleAudioTypeToggle(type as any)}
                                                            className={`p-1.5 rounded-lg transition-colors ${setting.enabled ? 'bg-red-900 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                                                        >
                                                            {setting.enabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                                                        </button>
                                                        <div className="flex-grow space-y-1">
                                                            <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-500">
                                                                <span>{labelMap[type]}</span>
                                                            </div>
                                                            <input 
                                                                type="range" min="0" max="1" step="0.1" 
                                                                value={setting.volume}
                                                                onChange={(e) => handleAudioTypeVolume(type as any, parseFloat(e.target.value))}
                                                                disabled={!setting.enabled}
                                                                className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-zinc-500 ${!setting.enabled ? 'opacity-30' : ''}`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Botões de Mestre */}
                        {isLider && (
                            <>
                                <button onClick={() => { setIsSoundConfigOpen(true); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-white border border-zinc-100'} transition-all text-xs font-black uppercase italic group`}>
                                    <div className="flex items-center gap-3"><Music size={18} className="text-red-700" /><span>Arquivos de Áudio (Upload)</span></div>
                                    <ChevronRight size={14} className="text-zinc-500" />
                                </button>

                                <button onClick={() => setShowIconEditor(true)} className={`w-full flex items-center justify-between p-4 rounded-2xl ${theme === 'Noite' ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-white border border-zinc-100'} transition-all text-xs font-black uppercase italic group`}>
                                    <div className="flex items-center gap-3"><Camera size={18} className="text-red-700" /><span>Edição de Ícones</span></div>
                                    <ChevronRight size={14} className="text-zinc-500" />
                                </button>
                            </>
                        )}
                   </div>
                ) : (
                   // EDITOR DE ÍCONES (Mantido + Login Logo)
                   <div className="animate-in slide-in-from-right-4 space-y-4">
                        <div className="bg-red-900/10 border border-red-900/20 p-3 rounded-2xl mb-4">
                            <p className="text-[10px] text-red-900 font-bold uppercase italic text-center">Personalize a identidade do Clã</p>
                        </div>
                        
                        {/* Ícone Sidebar */}
                        <div className={`p-3 rounded-2xl border ${theme === 'Noite' ? 'bg-zinc-800/50 border-white/5' : 'bg-zinc-50 border-zinc-200'} flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-700">
                                    {customIcons['sidebar'] ? (<img src={customIcons['sidebar']} className="w-full h-full object-cover" alt="Icon" />) : (<Scroll size={20} className="text-zinc-500" />)}
                                </div>
                                <div><p className="text-[10px] font-black uppercase text-zinc-500">Menu Principal</p><p className={`text-xs font-black uppercase italic ${textColor}`}>Registros</p></div>
                            </div>
                            <div className="flex gap-2">
                                <label className="p-2 bg-red-900 rounded-lg text-white hover:bg-red-800 cursor-pointer shadow-lg active:scale-95 transition-all"><Camera size={16} /><input type="file" accept="image/*" className="hidden" onChange={(e) => handleIconUpload(e, 'sidebar')} /></label>
                            </div>
                        </div>

                        {/* Ícone Tela de Login (NOVO) */}
                        <div className={`p-3 rounded-2xl border ${theme === 'Noite' ? 'bg-zinc-800/50 border-white/5' : 'bg-zinc-50 border-zinc-200'} flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-700">
                                    {customIcons['loginLogo'] ? (<img src={customIcons['loginLogo']} className="w-full h-full object-cover" alt="Login Icon" />) : (<Lock size={20} className="text-zinc-500" />)}
                                </div>
                                <div><p className="text-[10px] font-black uppercase text-zinc-500">Tela de Login</p><p className={`text-xs font-black uppercase italic ${textColor}`}>Logo Principal</p></div>
                            </div>
                            <div className="flex gap-2">
                                <label className="p-2 bg-red-900 rounded-lg text-white hover:bg-red-800 cursor-pointer shadow-lg active:scale-95 transition-all"><Camera size={16} /><input type="file" accept="image/*" className="hidden" onChange={(e) => handleIconUpload(e, 'loginLogo')} /></label>
                            </div>
                        </div>
                   </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 space-y-3">
            {/* Suporte Link */}
            <a 
                href="mailto:w.samurai.fitness@gmail.com?subject=Suporte Samurai Fit" 
                className="text-[9px] font-bold text-zinc-500 hover:text-red-700 uppercase tracking-[0.2em] italic transition-colors block mx-auto text-center"
            >
                Suporte
            </a>

            {/* Política de Privacidade Link */}
            <button 
                onClick={() => setIsPolicyOpen(true)} 
                className="text-[8px] font-bold text-zinc-500 hover:text-red-700 uppercase tracking-[0.2em] italic transition-colors block mx-auto underline decoration-red-900/20 underline-offset-4"
            >
                Política de Uso e Privacidade
            </button>

            {/* Versão */}
            <p className="text-[8px] font-medium text-zinc-600 uppercase tracking-widest text-center opacity-50 pb-2">
                v1.0 (Beta)
            </p>

            <div className={`border-t ${borderColor} pt-4 text-center`}>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">MESTRE DO CLÃ: <span className="text-zinc-400 italic">WARLLLEY SAMURAI</span></p>
            </div>
          </div>
        </div>
      </aside>

      {/* ... (Sidebar Overlay, Main, Nav mantidos) ... */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-all" onClick={() => { setIsSidebarOpen(false); setShowSettings(false); setShowIconEditor(false); }} />}
      <main className="flex-grow p-4 max-w-4xl mx-auto w-full">{children}</main>
      <nav className={`fixed bottom-0 left-0 right-0 ${theme === 'Noite' ? 'bg-zinc-900/95' : 'bg-white/90'} border-t ${borderColor} p-2 pb-4 md:pb-2 flex justify-around items-center z-40 backdrop-blur-xl shadow-2xl rounded-t-[2.5rem]`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const customIcon = customIcons[tab.id];
          if (tab.highlight) {
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex flex-col items-center -translate-y-3 group">
                <div className={`p-3 rounded-3xl border-2 border-red-700 ${isActive ? 'bg-red-700 text-white' : (theme === 'Noite' ? 'bg-zinc-900 text-red-700' : 'bg-white text-red-700')} shadow-xl shadow-red-900/20 transition-all ${isActive ? 'scale-110' : 'hover:scale-105'} overflow-hidden relative flex items-center justify-center`}>
                   {customIcon ? (<img src={customIcon} className="w-10 h-10 object-cover" alt="Icon" />) : (<Icon size={40} className="relative z-10" />)}
                </div>
              </button>
            );
          }
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center p-3 rounded-3xl transition-all ${isActive ? 'text-red-700 bg-red-900/10' : 'text-zinc-500 hover:text-zinc-400 hover:bg-black/5'}`}>
               {customIcon ? (<div className="w-9 h-9 rounded-lg overflow-hidden shadow-sm"><img src={customIcon} className="w-full h-full object-cover" alt="Icon" /></div>) : (<Icon size={34} />)}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
