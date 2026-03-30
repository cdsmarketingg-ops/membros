import React, { useState, useEffect } from 'react';
import { CourseConfig, AppView } from './types';
import { INITIAL_COURSE_DATA } from './constants';
import StudentArea from './components/StudentArea';
import AdminArea from './components/AdminArea';
import Login from './components/Login';
import { Loader2 } from 'lucide-react';
import { db } from './src/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const API_URL = 'https://SEU-BACKEND.com'; // 🔥 TROQUE ISSO

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('student');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProducts, setUserProducts] = useState<string[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [courseData, setCourseData] = useState<CourseConfig>(INITIAL_COURSE_DATA);

  // 🔥 CONFIG FIREBASE (OK)
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

  // 🔥 RESTAURA LOGIN IMEDIATO
  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    const email = localStorage.getItem('nexus_email');

    if (token) {
      setIsAuthenticated(true);
      if (email) setUserEmail(email);
    } else {
      setIsAuthenticated(false);
    }

    // valida em background
    checkSession();
  }, []);

  // 🔥 VALIDAÇÃO COM BACKEND (SEM QUEBRAR UX)
  const checkSession = async () => {
    try {
      const token = localStorage.getItem('nexus_token');

      if (!token) return;

      const response = await fetch(`${API_URL}/api/auth/session`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      if (data.authenticated) {
        setIsAuthenticated(true);
        setUserEmail(data.email);
        setUserProducts(data.products || []);

        if (data.token) {
          localStorage.setItem('nexus_token', data.token);
        }

        localStorage.setItem('nexus_email', data.email);
      } else {
        // 🔥 só desloga se tiver certeza
        handleLogout();
      }
    } catch (error) {
      console.warn('Erro ao validar sessão (ignorado):', error);
      // 🔥 NÃO desloga
    }
  };

  // 🔥 LOGIN
  const handleLoginSuccess = (email: string, products: string[]) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    setUserProducts(products || []);

    localStorage.setItem('nexus_email', email);
  };

  // 🔥 LOGOUT
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' });
    } catch (e) {}

    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_email');

    setIsAuthenticated(false);
    setUserEmail(null);
    setUserProducts([]);
  };

  // 🔥 LOADING BONITO
  if (isAuthenticated === null || loadingConfig) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  // 🔥 NÃO LOGADO
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // 🔥 LOGADO
  if (view === 'admin') {
    return <AdminArea courseData={courseData} />;
  }

  return (
    <StudentArea
      courseData={courseData}
      userEmail={userEmail}
      userProducts={userProducts}
      onLogout={handleLogout}
      onSwitchView={setView}
    />
  );
};

export default App;