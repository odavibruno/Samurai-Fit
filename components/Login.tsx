
import React, { useState } from 'react';
import { Loader2, AlertCircle, Shield } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  theme: 'Dia' | 'Noite';
  customLogo?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSignUp, theme, customLogo }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const defaultLogoPaths = ['/branding/logo-samurai.jpg', '/branding/logo-samurai.peg.jpeg'];
  const [logoPathIndex, setLogoPathIndex] = useState(0);
  const logoSource = customLogo || defaultLogoPaths[logoPathIndex] || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const success = await onLogin(email, password);
      
      if (!success) {
        setError('Acesso negado. Verifique suas credenciais.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error("Login error:", err);
      let msg = 'Erro ao conectar com o Dojo.';
      
      const rawMessage = typeof err?.message === 'string' ? err.message : '';
      const message = rawMessage.toLowerCase();

      if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
          msg = 'Credenciais inválidas. O portão do Dojo permanece fechado.';
      } else if (message.includes('user not found')) {
          msg = 'Usuário não encontrado. Você não pertence a este Dojo.';
      } else if (message.includes('already registered') || message.includes('already exists')) {
          msg = 'Este e-mail já possui conta. Entre com suas credenciais.';
      } else if (message.includes('too many requests')) {
          msg = 'Muitas tentativas. Medite um pouco e tente novamente mais tarde.';
      } else if (message.includes('network') || message.includes('failed to fetch')) {
          msg = 'Falha na conexão espiritual (Internet).';
      } else if (message.includes('invalid email')) {
          msg = 'O formato do e-mail é inválido.';
      }

      if (msg === 'Erro ao conectar com o Dojo.') {
          msg += ` (Detalhe: ${rawMessage || 'Desconhecido'})`;
      }
      
      setError(msg);
      setIsLoading(false);
    }
  };

  const bgColor = theme === 'Noite' ? 'bg-zinc-950' : 'bg-zinc-100';
  const inputBg = theme === 'Noite' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
  const textColor = theme === 'Noite' ? 'text-white' : 'text-zinc-900';
  const labelColor = theme === 'Noite' ? 'text-zinc-500' : 'text-zinc-500';

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${bgColor} relative overflow-hidden transition-colors duration-500`}>
      {/* Elemento Decorativo de Fundo */}
      <div className={`absolute top-[-20%] right-[-10%] w-[35rem] h-[35rem] ${theme === 'Noite' ? 'bg-red-900/5' : 'bg-red-500/5'} blur-[150px] rounded-full`}></div>
      <div className={`absolute bottom-[-10%] left-[-10%] w-[25rem] h-[25rem] ${theme === 'Noite' ? 'bg-zinc-800/10' : 'bg-zinc-300/20'} blur-[100px] rounded-full`}></div>
      
      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-12">
          {/* Logo container */}
          <div className="w-44 h-44 mx-auto mb-6 relative group flex items-center justify-center">
            {logoSource ? (
               <img 
                 src={logoSource}
                 alt="Samurai Fit Logo" 
                 className="w-full h-full object-contain relative z-10 rounded-xl"
                 onError={() => setLogoPathIndex((index) => index + 1)}
               />
            ) : (
               /* Quadrado Vermelho (Estilo Selo Oriental) */
               <div className="w-32 h-32 bg-red-800 rounded-xl shadow-[0_0_30px_rgba(185,28,28,0.4)] border-4 border-red-900 transform rotate-45 group-hover:rotate-0 transition-all duration-700 flex items-center justify-center relative overflow-hidden">
                  {/* Detalhe interno sutil */}
                  <div className="absolute inset-2 border border-red-700/50 rounded-lg"></div>
                  <span className="text-white text-5xl font-black opacity-20 select-none font-oriental -rotate-45 group-hover:rotate-0 transition-all duration-700">侍</span>
               </div>
            )}
          </div>
          
          <h1 className={`text-7xl ${textColor} font-oriental text-red-700 drop-shadow-md leading-tight`}>
            Samurai Fit
          </h1>
          <p className={`${labelColor} text-[10px] font-black uppercase tracking-[0.5em] mt-3 italic`}>O Caminho da Maestria</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-900/10 border border-red-900/20 p-5 rounded-3xl flex items-center gap-3 text-red-700 text-xs font-bold animate-in slide-in-from-top-4">
              <AlertCircle size={20} /> {error}
            </div>
          )}

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${labelColor} ml-2 italic`}>Guerreiro (E-mail)</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={`w-full ${inputBg} border rounded-3xl px-6 py-5 ${textColor} focus:outline-none focus:border-red-700 transition-all font-bold placeholder:text-zinc-500 shadow-sm`}
            />
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${labelColor} ml-2 italic`}>Código de Honra</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className={`w-full ${inputBg} border rounded-3xl px-6 py-5 ${textColor} focus:outline-none focus:border-red-700 transition-all font-bold placeholder:text-zinc-500 shadow-sm`}
            />
          </div>

          <div className="flex items-center gap-3 px-2">
            <button 
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${rememberMe ? 'bg-red-700 border-red-700 shadow-[0_0_10px_rgba(185,28,28,0.3)]' : `border-zinc-300 dark:border-zinc-700 ${theme === 'Noite' ? 'bg-zinc-900' : 'bg-white'}`}`}
            >
              {rememberMe && <div className="w-2 h-2 bg-white rounded-sm" />}
            </button>
            <span className={`text-[10px] font-black uppercase ${labelColor} tracking-widest cursor-pointer hover:text-red-700 transition-colors`} onClick={() => setRememberMe(!rememberMe)}>Lembrar de mim</span>
          </div>

          <button
            type="submit" disabled={isLoading}
            className="w-full bg-red-800 hover:bg-red-900 disabled:bg-zinc-400 text-white font-black py-5 rounded-3xl shadow-xl shadow-red-900/20 transition-all flex items-center justify-center gap-3 uppercase italic tracking-widest active:scale-95"
          >
            {isLoading ? <Loader2 size={24} className="animate-spin" /> : <>Entrar <Shield size={20} /></>}
          </button>

          {/* Fluxo de criação de conta temporariamente desativado
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-700 transition-colors italic"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Crie aqui'}
          </button>
          */}
        </form>
      </div>
    </div>
  );
};

export default Login;
