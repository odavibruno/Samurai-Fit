
import React, { useState } from 'react';
import { UserProfile, OnboardingProfileData } from '../types';
import { PRIVACY_POLICY } from '../constants';
import { ShieldCheck, CheckCircle2, ArrowRight, Scale, Ruler, Target, ScrollText, Hash } from 'lucide-react';

interface OnboardingFlowProps {
  user: UserProfile;
  onAcceptTerms: () => Promise<void>;
  onComplete: (profileData: OnboardingProfileData | any) => Promise<void>;
  theme: 'Dia' | 'Noite';
}

type Step = 'TERMS' | 'PROFILE';

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ user, onAcceptTerms, onComplete, theme }) => {
  const [step, setStep] = useState<Step>(user.hasAcceptedTerms ? 'PROFILE' : 'TERMS');
  const [weight, setWeight] = useState(user.weight ? String(user.weight) : '');
  const [height, setHeight] = useState(user.height ? String(user.height) : '');
  const [goal, setGoal] = useState(user.goal && user.goal !== 'Definir Objetivo' ? user.goal : '');
  
  // Professor specific state
  const [biography, setBiography] = useState(user.biography || '');
  const [professorCode, setProfessorCode] = useState(user.professorCode || '');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isProfessor = user.role === 'professor';

  const handleAcceptTerms = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await onAcceptTerms();
      setStep('PROFILE');
    } catch {
      setError('Não foi possível registrar o aceite. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async () => {
    setError('');
    
    if (isProfessor) {
      if (!biography.trim()) {
        setError('Por favor, escreva uma breve biografia ou especialidade.');
        return;
      }
      if (!professorCode.trim()) {
        setError('O Código do Mestre é obrigatório para que os alunos possam se vincular a você.');
        return;
      }
      
      setIsSubmitting(true);
      try {
        await onComplete({
          biography: biography.trim(),
          professorCode: professorCode.trim(),
          weight: user.weight || 0, // Valores default apenas para cumprir a tipagem, caso precise
          height: user.height || 0,
          goal: 'Mestre'
        });
      } catch {
        setError('Não foi possível concluir a configuração. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const parsedWeight = Number(weight);
    const parsedHeight = Number(height);
    if (!parsedWeight || parsedWeight <= 0) {
      setError('Informe um peso válido.');
      return;
    }
    if (!parsedHeight || parsedHeight <= 0) {
      setError('Informe uma altura válida.');
      return;
    }
    if (!goal.trim() || goal === 'Definir Objetivo') {
      setError('Selecione seu objetivo principal.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onComplete({
        weight: parsedWeight,
        height: parsedHeight,
        goal: goal.trim()
      });
    } catch {
      setError('Não foi possível concluir o cadastro inicial. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bgColor = theme === 'Noite' ? 'bg-zinc-950' : 'bg-zinc-100';
  const cardBg = theme === 'Noite' ? 'bg-[#121212]' : 'bg-white';
  const textColor = theme === 'Noite' ? 'text-white' : 'text-zinc-900';
  const inputBg = theme === 'Noite' ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-zinc-200';

  return (
    <div className={`fixed inset-0 z-[200] ${bgColor} flex items-center justify-center p-6`}>
      <div className={`${cardBg} w-full max-w-lg p-8 rounded-[3rem] shadow-2xl border border-red-900/30 flex flex-col items-center text-center animate-in zoom-in-95 duration-500`}>
        
        {step === 'TERMS' && (
          <div className="w-full flex flex-col h-full">
            <div className="mb-6 flex justify-center">
               <div className="w-16 h-16 rounded-2xl bg-red-900/10 flex items-center justify-center text-red-900">
                  <ShieldCheck size={32} />
               </div>
            </div>
            <h2 className={`text-2xl font-black uppercase italic ${textColor} mb-2`}>Código de Honra</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Termos de Uso e Privacidade</p>
            
            <div className={`flex-grow bg-black/20 rounded-2xl p-4 text-left overflow-y-auto h-64 mb-6 border border-white/5 custom-scrollbar`}>
               <p className={`text-xs font-medium leading-relaxed whitespace-pre-line ${theme === 'Noite' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {PRIVACY_POLICY}
               </p>
            </div>

            <button 
              onClick={handleAcceptTerms}
              disabled={isSubmitting}
              className="w-full bg-red-900 text-white font-black py-5 rounded-3xl shadow-xl uppercase italic tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : 'Li e Aceito as Regras'} <CheckCircle2 size={18} />
            </button>
          </div>
        )}

        {step === 'PROFILE' && (
          <div className="w-full flex flex-col">
             <div className="mb-6 flex justify-center">
               <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                  <Target size={32} />
               </div>
            </div>
            <h2 className={`text-2xl font-black uppercase italic ${textColor} mb-2`}>
                {isProfessor ? 'Configuração do Mestre' : 'Ajuste Inicial'}
            </h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-8">
                {isProfessor ? 'Preencha seus dados como instrutor' : 'Preencha seus dados estratégicos'}
            </p>

            <div className="space-y-4 mb-8 w-full text-left">
                {error && (
                    <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-2xl text-red-500 text-xs font-bold text-center">
                        {error}
                    </div>
                )}

                {isProfessor ? (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-2 flex items-center gap-1">
                                <ScrollText size={11} /> Especialidade / Biografia
                            </label>
                            <textarea 
                                value={biography}
                                onChange={(e) => setBiography(e.target.value)}
                                className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} focus:outline-none focus:border-red-900 transition-colors resize-none h-32`}
                                placeholder="Ex: Especialista em hipertrofia e emagrecimento..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-2 flex items-center gap-1">
                                <Hash size={11} /> Código do Mestre
                            </label>
                            <input 
                                type="text" 
                                value={professorCode}
                                onChange={(e) => setProfessorCode(e.target.value)}
                                className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} focus:outline-none focus:border-red-900 transition-colors uppercase`}
                                placeholder="Ex: SENSEI-123 (Seus alunos usarão este código)"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-2 flex items-center gap-1"><Scale size={11} /> Peso (kg)</label>
                            <input 
                                type="number" 
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} focus:outline-none focus:border-red-900 transition-colors`}
                                placeholder="Ex: 82"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-2 flex items-center gap-1"><Ruler size={11} /> Altura (cm)</label>
                            <input 
                                type="number" 
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} focus:outline-none focus:border-red-900 transition-colors`}
                                placeholder="Ex: 178"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-2 flex items-center gap-1"><Target size={11} /> Objetivo</label>
                            <select
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                className={`w-full ${inputBg} p-4 rounded-2xl text-sm font-bold ${textColor} focus:outline-none focus:border-red-900 transition-colors`}
                            >
                                <option value="">Selecione um objetivo</option>
                                <option value="Emagrecimento">Emagrecimento</option>
                                <option value="Hipertrofia">Hipertrofia</option>
                                <option value="Condicionamento">Condicionamento</option>
                                <option value="Definição">Definição</option>
                            </select>
                        </div>
                    </>
                )}
            </div>

            <button 
              onClick={handleProfileSubmit}
              disabled={isSubmitting}
              className="w-full bg-red-900 text-white font-black py-5 rounded-3xl shadow-xl uppercase italic tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : 'Concluir e Entrar'} <ArrowRight size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default OnboardingFlow;
