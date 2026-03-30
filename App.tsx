import React, { useState, useEffect } from 'react';
import { CourseConfig, AppView } from './types';
import { INITIAL_COURSE_DATA } from './constants';
import StudentArea from './components/StudentArea';
import AdminArea from './components/AdminArea';
import Login from './components/Login';
import { ChevronLeft, Settings, LogOut, Loader2 } from 'lucide-react';
import { db } from './src/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const API_URL = 'https://api.rafaelpedrozo.online/membros';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('student');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProducts, setUserProducts] = useState<string[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [courseData, setCourseData] = useState<CourseConfig>(INITIAL_COURSE_DATA);

  // 🔥 FIREBASE CONFIG
  useEffect(() => {
    const configRef = doc(db, 'config', 'main');

    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        setCourseData(docSnap.data() as CourseConfig);
      }
      setLoadingConfig(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 RESTAURA LOGIN (SEM API QUEBRANDO)
  useEffect(() => {
    const savedEmail = localStorage.getItem('user_email');

    if (savedEmail) {
      setUserEmail(savedEmail);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // 🔥 LOGIN VIA BACKEND (CHECK ACCESS)
  const handleLoginSuccess = async (email: string) => {
    try {
      const res = await fetch(`${API_URL}/check-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (data.access) {
        localStorage.setItem('user_email', email);
        setUserEmail(email);
        setIsAuthenticated(true);
      } else {
        alert('Você não tem acesso ainda.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao conectar com servidor');
    }
  };

  // 🔥 LOGOUT SIMPLES (SEM API)
  const handleLogout = () => {
    localStorage.removeItem('user_email');
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  const isAdmin = userEmail === 'cdsmarketingg@gmail.com';

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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <header className="fixed top-0 left-0 right-0 z-[100] h-14 bg-[#111] border-b border-white/10 flex items-center justify-between px-4 md:px-6">
        <div>
          <button 
            onClick={() => setView('student')}
            className="text-white/60 hover:text-white flex items-center gap-2 text-sm"
          >
            <ChevronLeft size={18} />
            Configurações
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {isAdmin && (
            <button 
              onClick={() => setView(view === 'admin' ? 'student' : 'admin')}
              className="bg-white/5 border border-white/10 px-3 py-1.5 rounded flex items-center gap-2"
            >
              {view === 'admin' ? 'Produtor' : 'Aluno'}
              <Settings size={14} />
            </button>
          )}

          <span className="text-white/40">{userEmail}</span>

          <button onClick={handleLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 mt-14 overflow-hidden">
        {currentView === 'student' ? (
          <StudentArea course={courseData} userProducts={userProducts} />
        ) : (
          <AdminArea course={courseData} />
        )}
      </main>
    </div>
  );
};

export default App;