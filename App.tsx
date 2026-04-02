import React, { useState, useEffect } from 'react';
import { CourseConfig, AppView } from './types';
import { INITIAL_COURSE_DATA } from './constants';
import StudentArea from './components/StudentArea';
import AdminArea from './components/AdminArea';
import Login from './components/Login';
import { User, Bell, Search, Settings, LogOut, Loader2 } from 'lucide-react';

// 🔥 Sessão expira em 7 dias (igual ao cookie)
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

const App: React.FC = () => {

  const [view, setView] = useState<AppView>('student');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProducts, setUserProducts] = useState<string[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [courseData, setCourseData] = useState<CourseConfig>(INITIAL_COURSE_DATA);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const res = await fetch('https://api.rafaelpedrozo.online/membros/admin/config', {
          credentials: 'include'
        });
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setCourseData(data);
        }
      } catch (err) {
        console.error('❌ erro ao carregar curso:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadCourse();
  }, []);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    // 1️⃣ Tenta localStorage primeiro (funciona em mobile)
    const savedEmail = localStorage.getItem('nexus_email');
    const savedProducts = localStorage.getItem('nexus_products');
    const savedTime = localStorage.getItem('nexus_auth_time');

    if (savedEmail && savedTime) {
      const elapsed = Date.now() - parseInt(savedTime);
      if (elapsed < SESSION_DURATION) {
        // Sessão local ainda válida
        setIsAuthenticated(true);
        setUserEmail(savedEmail);
        setUserProducts(savedProducts ? JSON.parse(savedProducts) : []);
        return;
      } else {
        // Sessão expirada — limpa
        localStorage.removeItem('nexus_email');
        localStorage.removeItem('nexus_products');
        localStorage.removeItem('nexus_auth_time');
      }
    }

    // 2️⃣ Fallback: tenta cookie (funciona em desktop)
    try {
      const response = await fetch('https://api.rafaelpedrozo.online/membros/auth/session', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        setUserEmail(data.email);
        setUserProducts(data.products || []);
        // Salva no localStorage para próximas visitas mobile
        localStorage.setItem('nexus_email', data.email);
        localStorage.setItem('nexus_products', JSON.stringify(data.products || []));
        localStorage.setItem('nexus_auth_time', Date.now().toString());
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  const handleLoginSuccess = (email: string, products: string[]) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    setUserProducts(products || []);
  };

  const handleLogout = async () => {
    // Limpa localStorage
    localStorage.removeItem('nexus_email');
    localStorage.removeItem('nexus_products');
    localStorage.removeItem('nexus_auth_time');

    try {
      await fetch('https://api.rafaelpedrozo.online/membros/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.error('Logout failed', e);
    }

    setIsAuthenticated(false);
    setUserEmail(null);
  };

  const isAdmin = userEmail === 'cdsmarketingg@gmail.com';

  const handleUpdateCourse = async (newData: CourseConfig) => {
    try {
      const response = await fetch('https://api.rafaelpedrozo.online/membros/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newData)
      });

      const result = await response.json();
      if (!response.ok) throw new Error('Erro ao salvar');

      const resReload = await fetch('https://api.rafaelpedrozo.online/membros/admin/config', {
        credentials: 'include'
      });
      const dataReload = await resReload.json();
      setCourseData(dataReload);

    } catch (error) {
      console.error('Erro saving config:', error);
    }
  };

  if (isAuthenticated === null || loadingConfig) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="text-amber-500 animate-spin" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const currentView = isAdmin ? view : 'student';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      <header className="fixed top-0 left-0 right-0 z-[100] h-14 bg-[#111] border-b border-white/10 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setView('student')}
            className="text-white/60 hover:text-white flex items-center gap-1 md:gap-2 text-xs md:text-sm transition-colors"
          >
            <span className="hidden xs:inline">Configurações</span>
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          <div className="flex items-center gap-2 md:gap-6 text-xs md:text-sm">
            {isAdmin && (
              <>
                <span className="text-white/60 hidden sm:inline">Visualizando como:</span>
                <button 
                  onClick={() => setView(view === 'admin' ? 'student' : 'admin')}
                  className="bg-white/5 border border-white/10 px-2 md:px-4 py-1.5 rounded flex items-center gap-1 md:gap-2 hover:bg-white/10 transition-all font-medium"
                >
                  <span className="text-[10px] md:text-xs">{view === 'admin' ? 'Produtor' : 'Aluno'}</span>
                  <Settings size={12} className="text-white/40" />
                </button>
                <div className="h-6 w-[1px] bg-white/10 mx-1 hidden xs:block" />
              </>
            )}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-[10px] md:text-xs hidden md:inline">{userEmail}</span>
              <button 
                onClick={handleLogout}
                className="text-white/40 hover:text-white transition-colors p-1.5"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mt-14 overflow-hidden">
        {currentView === 'student' ? (
          <StudentArea course={courseData} userProducts={userProducts} isAdmin={isAdmin} />
        ) : (
          <AdminArea course={courseData} onUpdate={handleUpdateCourse} />
        )}
      </main>
    </div>
  );
};

export default App;