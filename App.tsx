
import React, { useState, useEffect } from 'react';
import { CourseConfig, AppView } from './types';
import { INITIAL_COURSE_DATA } from './constants';
import StudentArea from './components/StudentArea';
import AdminArea from './components/AdminArea';
import Login from './components/Login';
import { ChevronLeft, User, Bell, Search, Settings, LogOut, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('student');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProducts, setUserProducts] = useState<string[]>([]);
  const [courseData, setCourseData] = useState<CourseConfig>(() => {
    const saved = localStorage.getItem('nexus_course_data_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Force update for the 'teste-aula' zone to ensure the correct key from the screenshot is used
      if (parsed.bunnyStorageZone === 'teste-aula') {
        parsed.bunnyAccessKey = INITIAL_COURSE_DATA.bunnyAccessKey;
        parsed.bunnyRegion = INITIAL_COURSE_DATA.bunnyRegion;
        parsed.bunnyPullZoneUrl = INITIAL_COURSE_DATA.bunnyPullZoneUrl;
      }
      
      // Update pull zone if it's still the old one (fallback)
      if (parsed.bunnyPullZoneUrl === 'https://teste-aula.b-cdn.net') {
        parsed.bunnyPullZoneUrl = INITIAL_COURSE_DATA.bunnyPullZoneUrl;
      }
      
      // Merge with initial data to ensure new fields (like Bunny config) are present
      return { ...INITIAL_COURSE_DATA, ...parsed };
    }
    return INITIAL_COURSE_DATA;
  });

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        setUserEmail(data.email);
        setUserProducts(data.products || []);
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
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUserEmail(null);
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const isAdmin = userEmail === 'cdsmarketingg@gmail.com';

  useEffect(() => {
    localStorage.setItem('nexus_course_data_v2', JSON.stringify(courseData));
  }, [courseData]);

  const handleUpdateCourse = (newData: CourseConfig) => {
    setCourseData(newData);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="text-amber-500 animate-spin" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Security check: if not admin, force student view
  const currentView = isAdmin ? view : 'student';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Bar Producer Style */}
      <header className="fixed top-0 left-0 right-0 z-[100] h-14 bg-[#111] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('student')}
            className="text-white/60 hover:text-white flex items-center gap-2 text-sm transition-colors"
          >
            <ChevronLeft size={18} />
            <span>Configurações</span>
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-sm">
            {isAdmin && (
              <>
                <span className="text-white/60 hidden sm:inline">Visualizando como:</span>
                <button 
                  onClick={() => setView(view === 'admin' ? 'student' : 'admin')}
                  className="bg-white/5 border border-white/10 px-4 py-1.5 rounded flex items-center gap-2 hover:bg-white/10 transition-all font-medium"
                >
                  {view === 'admin' ? 'Produtor' : 'Aluno'}
                  <Settings size={14} className="text-white/40" />
                </button>
                <div className="h-6 w-[1px] bg-white/10 mx-1" />
              </>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs hidden md:inline">{userEmail}</span>
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

      {/* Main Area */}
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
