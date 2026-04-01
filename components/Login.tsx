import React, { useState } from 'react';
import { Mail, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (email: string, products: string[]) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://api.rafaelpedrozo.online/membros/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        // 🔥 Salva no localStorage como fallback para mobile (Safari bloqueia cookies cross-site)
        localStorage.setItem('nexus_email', data.email);
        localStorage.setItem('nexus_products', JSON.stringify(data.products || []));
        localStorage.setItem('nexus_auth_time', Date.now().toString());
        onLoginSuccess(data.email, data.products || []);
      } else {
        setError(data.error || 'Acesso negado. Verifique se sua compra foi aprovada.');
      }

    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md z-10">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
              <ShieldCheck className="text-amber-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Área de Membros</h1>
            <p className="text-white/50 text-center text-sm">
              Digite o e-mail que você utilizou na compra para acessar o conteúdo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Acessar Plataforma
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-white/30 text-xs">
              Problemas com o acesso? <a href="#" className="text-amber-500/60 hover:text-amber-500 underline">Fale com o suporte</a>
            </p>
          </div>
        </div>
        
        <p className="text-center mt-6 text-white/20 text-xs uppercase tracking-[0.2em]">
          Aevo Pro 2.0 &copy; 2026
        </p>
      </div>
    </div>
  );
};

export default Login;