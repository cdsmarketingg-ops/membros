import React, { useState, useEffect } from 'react';
import { CourseConfig, AppView } from './types';
import { INITIAL_COURSE_DATA } from './constants';
import StudentArea from './components/StudentArea';
import AdminArea from './components/AdminArea';
import Login from './components/Login';
import { ChevronLeft, Settings, LogOut, Loader2 } from 'lucide-react';

const App: React.FC = () => {

  const [view, setView] = useState<AppView>('student');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProducts, setUserProducts] = useState<string[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // 🔥 FONTE ÚNICA DA VERDADE
  const [courseData, setCourseData] = useState<CourseConfig>(INITIAL_COURSE_DATA);

  // 🔥 CARREGA CONFIG
  useEffect(() => {
    const loadCourse = async () => {
      try {
        console.log('🔥 carregando curso...');

        const res = await fetch('https://api.rafaelpedrozo.online/membros/admin/config');
        const data = await res.json();

        console.log('🔥 COURSE:', data);

        if (data && Object.keys(data).length > 0) {
          setCourseData(data);
        }

      } catch (err) {
        console.error('❌ erro ao carregar:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    loadCourse();
  }, []);

  // 🔐 SESSION
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('https://api.rafaelpedrozo.online/api/auth/session');
      const data = await response.json();

      if (data.authenticated) {
        setIsAuthenticated(true);
        setUserEmail(data.email);
        setUserProducts(data.products || []);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleLoginSuccess = (email: string, products: string[]) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    setUserProducts(products || []);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUserEmail(null);
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const isAdmin = userEmail === 'cdsmarketingg@gmail.com';

  // 🔥 FUNÇÃO CRÍTICA (CORRIGIDA)
  const handleUpdateCourse = async (newData: CourseConfig) => {
    try {
      console.log('🔥 ENVIANDO:', newData);

      const response = await fetch('https://api.rafaelpedrozo.online/membros/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newData)
      });

      const result = await response.json();
      console.log('🔥 SALVO:', result);

      if (!response.ok) throw new Error('Erro ao salvar');

      // 🔥 ESSA PARTE RESOLVE SEU BUG
      const resReload = await fetch('https://api.rafaelpedrozo.online/membros/admin/config');
      const dataReload = await resReload.json();

      console.log('🔥 RELOAD:', dataReload);

      setCourseData(dataReload);

    } catch (error) {
      console.error('❌ erro ao salvar:', error);
    }
  };

  // ⏳ LOADING
  if (isAuthenticated === null || loadingConfig) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="text-amber-500 animate-spin" size={40} />
      </div>
    );
  }

  // 🔐 LOGIN
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const currentView = isAdmin ? view : 'student';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-[100] h-14 bg-[#111] border-b border-white/10 flex items-center justify-between px-4 md:px-6">

        <button
          onClick={() => setView('student')}
          className="text-white/60 hover:text-white flex items-center gap-2 text-sm"
        >
          <ChevronLeft size={18} />
          Configurações
        </button>

        <div className="flex items-center gap-4 text-sm">

          {isAdmin && (
            <button
              onClick={() => setView(view === 'admin' ? 'student' : 'admin')}
              className="bg-white/5 border border-white/10 px-4 py-1.5 rounded flex items-center gap-2 hover:bg-white/10"
            >
              {view === 'admin' ? 'Produtor' : 'Aluno'}
              <Settings size={12} />
            </button>
          )}

          <span className="text-white/40">{userEmail}</span>

          <button onClick={handleLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 mt-14 overflow-hidden">
        {currentView === 'student' ? (
          <StudentArea course={courseData} userProducts={userProducts} />
        ) : (
          <AdminArea course={courseData} onUpdate={handleUpdateCourse} />
        )}
      </main>

    </div>
  );
};

export default App;