
import React, { useState, useRef, useEffect } from 'react';
import { CourseConfig, Lesson, Module, StudentView } from '../types';
import { Play, Search, Bell, Menu, Headphones, Download, Tag, Calendar, Layout, X, List, Lock, ShoppingCart, User, MessageCircle, FileText, ExternalLink } from 'lucide-react';

interface StudentAreaProps {
  course: CourseConfig;
  userProducts: string[];
}

const StudentArea: React.FC<StudentAreaProps> = ({ course, userProducts }) => {
  const [viewState, setViewState] = useState<StudentView>('home');
  const [selectedModule, setSelectedModule] = useState<Module>(course.modules[0]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson>(course.modules[0]?.lessons[0]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState<string>('main');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [homeFilter, setHomeFilter] = useState<'all' | 'my-courses'>('all');
  const videoRef = useRef<HTMLVideoElement>(null);

  const lang = activeCourseId === 'main' 
    ? (course.language || 'pt')
    : (course.upsellCourses?.find(u => u.id === activeCourseId)?.language || 'pt');

  const t = (key: string) => {
    const texts: Record<string, Record<string, string>> = {
      pt: {
        home: 'Início',
        lessons: 'Aulas',
        module: 'Módulo',
        lesson: 'Aula',
        backToHome: 'Voltar ao Início',
        releaseIn: 'dias para liberar',
        materials: 'Materiais',
        download: 'Baixar',
        support: 'Suporte',
        community: 'Comunidade',
        notifications: 'Notificações',
        clearAll: 'Limpar Tudo',
        accessNow: 'Acessar Agora',
        noNews: 'Nenhuma novidade por aqui',
        exclusiveContent: 'Este conteúdo é exclusivo. Entre em contato com o suporte para adquirir.',
        noLessons: 'Este módulo ainda não possui aulas cadastradas.',
        currentLesson: 'Aula Atual',
        welcome: 'Seja bem-vindo',
        whatToLearn: 'O que você quer aprender hoje?',
        continueWatching: 'Continuar Assistindo',
        nextLesson: 'Próxima Aula',
        prevLesson: 'Aula Anterior',
        markAsDone: 'Marcar como Concluída',
        done: 'Concluída',
        search: 'Buscar aulas...',
        modules: 'Módulos',
        instructor: 'Instrutor',
        allLessons: 'Todas as Aulas',
        play: 'Play',
        description: 'Descrição',
        back: 'Voltar',
        selectedModule: 'Módulo Selecionado',
        lessonsAvailable: 'aulas disponíveis',
        lessonIdx: 'Aula',
        showcase: 'Vitrine',
        myTrainings: 'Meus Treinamentos',
        restrictedAccess: 'Acesso Restrito & Premium',
        resumeTraining: 'RETOMAR TREINAMENTO',
        courseModules: 'Módulos do Curso',
        lessonsCount: 'aulas',
        exclusiveOffer: 'Produto Bloqueado',
        getAccessNow: 'QUERO DESBLOQUEAR AGORA',
        additionalCourse: 'Curso Adicional',
        resumeCourse: 'RETOMAR CURSO',
        selectLessonToStart: 'Selecione uma aula para começar',
        premiumSupport: 'SUPORTE PREMIUM',
        lessonDescription: 'Conteúdo da Aula',
        lessonMaterials: 'Materiais da Aula',
        studentSupport: 'Suporte ao Aluno',
        noModulesAvailable: 'Nenhum módulo disponível ainda',
        unlockMessage: 'Para desbloquear realize a compra do produto',
        allRightsReserved: 'Todos os direitos reservados'
      },
      es: {
        home: 'Inicio',
        lessons: 'Clases',
        module: 'Módulo',
        lesson: 'Clase',
        backToHome: 'Volver al Inicio',
        releaseIn: 'días para liberar',
        materials: 'Materiales',
        download: 'Descargar',
        support: 'Soporte',
        community: 'Comunidad',
        notifications: 'Notificaciones',
        clearAll: 'Limpiar Todo',
        accessNow: 'Acceder Ahora',
        noNews: 'Nada nuevo por aquí',
        exclusiveContent: 'Este contenido es exclusivo. Contacta con soporte para adquirirlo.',
        noLessons: 'Este módulo aún no tiene clases registradas.',
        currentLesson: 'Clase Actual',
        welcome: 'Bienvenido',
        whatToLearn: '¿Qué quieres aprender hoy?',
        continueWatching: 'Continuar Viendo',
        nextLesson: 'Próxima Clase',
        prevLesson: 'Anterior',
        markAsDone: 'Marcar como Completada',
        done: 'Completada',
        search: 'Buscar clases...',
        modules: 'Módulos',
        instructor: 'Instructor',
        allLessons: 'Todas las Clases',
        play: 'Reproducir',
        description: 'Descripción',
        back: 'Volver',
        selectedModule: 'Módulo Seleccionado',
        lessonsAvailable: 'clases disponibles',
        lessonIdx: 'Clase',
        showcase: 'Vitrina',
        myTrainings: 'Mis Entrenamientos',
        restrictedAccess: 'Acceso Restringido & Premium',
        resumeTraining: 'REANUDAR ENTRENAMIENTO',
        courseModules: 'Módulos del Curso',
        lessonsCount: 'clases',
        exclusiveOffer: 'Producto Bloqueado',
        getAccessNow: 'QUIERO DESBLOQUEAR AHORA',
        additionalCourse: 'Curso Adicional',
        resumeCourse: 'REANUDAR CURSO',
        selectLessonToStart: 'Selecciona una clase para comenzar',
        premiumSupport: 'SOPORTE PREMIUM',
        lessonDescription: 'Contenido de la Clase',
        lessonMaterials: 'Materiales de la Clase',
        studentSupport: 'Soporte al Estudiante',
        noModulesAvailable: 'Ningún módulo disponible aún',
        unlockMessage: 'Para desbloquear realice la compra del producto',
        allRightsReserved: 'Todos los derechos reservados'
      }
    };
    return texts[lang][key] || key;
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          setNotifications(prev => [{ ...data.payload, id: Date.now(), read: false }, ...prev]);
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    return () => socket.close();
  }, []);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Helper to convert standard video links to embed links
  const getAutoThumbnail = (videoUrl: string) => {
    if (!videoUrl) return '';
    
    // YouTube
    if (videoUrl.includes('youtube.com/watch?v=')) {
      const id = videoUrl.split('v=')[1]?.split('&')[0];
      return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    }
    if (videoUrl.includes('youtu.be/')) {
      const id = videoUrl.split('youtu.be/')[1]?.split('?')[0];
      return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    }
    
    // Vimeo
    if (videoUrl.includes('vimeo.com/')) {
      const parts = videoUrl.split('vimeo.com/')[1];
      const id = parts.split('?')[0].split('/')[0];
      return `https://vumbnail.com/${id}.jpg`;
    }
    
    return '';
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // Handle YouTube
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    
    // Handle Vimeo
    if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
      const parts = url.split('vimeo.com/')[1];
      const id = parts.split('?')[0].split('/')[0];
      return `https://player.vimeo.com/video/${id}`;
    }
    
    return url;
  };

  const isDirectVideo = (url: string) => {
    if (!url) return false;
    const directExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    // Bunny.net direct links (bunnycdn.com or b-cdn.net) or files with video extensions
    return directExtensions.some(ext => url.toLowerCase().includes(ext)) || 
           url.includes('bunnycdn.com') || 
           url.includes('b-cdn.net');
  };

  const isModuleLocked = (mod: Module) => {
    if (!mod.isUpsell) return false;
    if (!mod.productId) return false;
    return !userProducts.includes(mod.productId);
  };

  const isCourseLocked = (upsell: any) => {
    if (!upsell.productId) return false;
    return !userProducts.includes(upsell.productId);
  };

  const enterModule = (mod: Module, courseId: string = 'main') => {
    if (isModuleLocked(mod)) {
      if (mod.upsellUrl) {
        window.open(mod.upsellUrl, '_blank');
      } else {
        alert(t('exclusiveContent'));
      }
      return;
    }

    if (!mod.lessons || mod.lessons.length === 0) {
      alert(t('noLessons'));
      return;
    }
    setSelectedModule(mod);
    setActiveCourseId(courseId);
    setViewState('module-lessons');
    setIsMobileSidebarOpen(false);
    setIsPlaying(false);
  };

  const selectLesson = (mod: Module, lesson: Lesson, courseId: string = 'main') => {
    setSelectedModule(mod);
    setSelectedLesson(lesson);
    setActiveCourseId(courseId);
    setViewState('player');
    setIsMobileSidebarOpen(false);
    setIsPlaying(false);
  };

  if (viewState === 'player') {
    return (
      <div className="flex h-full overflow-hidden bg-[#0a0a0a] relative touch-pan-y">
        {/* MOBILE PLAYER HEADER (Visible on small screens) */}
        <div className="lg:hidden fixed top-14 left-0 right-0 h-14 bg-[#111] border-b border-white/5 flex items-center justify-between px-4 z-[80]">
          <button 
            onClick={() => setViewState('home')}
            className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-widest"
          >
            {t('back')}
          </button>
          <div className="flex-1 px-4 truncate text-center">
             <span className="text-[10px] font-black uppercase text-amber-500 truncate block">{t('currentLesson')}</span>
             <span className="text-xs font-bold text-white truncate block">{selectedLesson?.title}</span>
          </div>
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-widest"
          >
            {t('lessons')} <List size={18} />
          </button>
        </div>

        {/* PLAYER SIDEBAR (Desktop) & MOBILE DRAWER */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-[110] lg:z-0
          w-80 bg-[#111] border-r border-white/5 flex flex-col
          transition-transform duration-300 transform
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <button 
                onClick={() => setViewState('home')}
                className="text-xs font-bold text-white/40 hover:text-white uppercase tracking-widest flex items-center gap-2 mb-4"
              >
                {t('backToHome')}
              </button>
              <h2 className="font-bold text-lg leading-tight uppercase italic">
                {activeCourseId === 'main' 
                  ? course.name 
                  : course.upsellCourses?.find(u => u.id === activeCourseId)?.title || course.name}
              </h2>
            </div>
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-2 text-white/40"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {(activeCourseId === 'main' 
              ? course.modules 
              : course.upsellCourses?.find(u => u.id === activeCourseId)?.modules || []
            ).map((mod, mIdx) => (
              <div key={mod.id}>
                <div className="px-6 py-4 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Layout size={10} className="text-amber-500" />
                  {t('module')} {mIdx + 1}: {mod.title}
                </div>
                {mod.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setSelectedModule(mod);
                      setSelectedLesson(lesson);
                      setIsMobileSidebarOpen(false);
                      setIsPlaying(false);
                    }}
                    className={`w-full px-6 py-4 text-left hover:bg-white/5 transition-all group border-l-4 ${
                      selectedLesson?.id === lesson.id ? 'bg-white/5 border-amber-500' : 'border-transparent'
                    }`}
                  >
                    <p className={`text-sm font-medium ${selectedLesson?.id === lesson.id ? 'text-amber-500' : 'text-white/70'}`}>
                      {lesson.title}
                    </p>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* MOBILE SIDEBAR OVERLAY */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* PLAYER CONTENT AREA */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-20 pt-14 lg:pt-0 touch-pan-y">
          <div className="max-w-5xl mx-auto p-4 lg:p-10">
            {selectedLesson ? (
              <>
                <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl mb-10 ring-1 ring-white/10 shadow-amber-500/5 mt-4 lg:mt-0">
                  {isDirectVideo(selectedLesson.videoUrl) ? (
                    <div className="w-full h-full relative group">
                      <video 
                        ref={videoRef}
                        key={selectedLesson.videoUrl}
                        src={selectedLesson.videoUrl}
                        controls 
                        playsInline
                        preload="metadata"
                        referrerPolicy="no-referrer"
                        className="w-full h-full bg-black"
                        poster={selectedLesson.thumbnailUrl || getAutoThumbnail(selectedLesson.videoUrl)}
                        controlsList="nodownload"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onLoadedData={() => console.log('✅ Vídeo pronto para tocar!')}
                        onError={(e) => {
                          const videoTag = e.currentTarget;
                          console.error('❌ Erro no vídeo detalhado:', {
                            code: videoTag.error?.code,
                            message: videoTag.error?.message,
                            url: selectedLesson.videoUrl,
                            networkState: videoTag.networkState,
                            readyState: videoTag.readyState
                          });
                        }}
                      >
                        Seu navegador não suporta a reprodução de vídeos.
                      </video>

                      {!isPlaying && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition-all duration-500 group-hover:bg-black/20"
                          onClick={handlePlay}
                        >
                          <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/40 transform transition-transform duration-300 group-hover:scale-110">
                            <Play size={48} className="text-black fill-current ml-2" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <iframe
                      src={getEmbedUrl(selectedLesson.videoUrl)}
                      className="w-full h-full"
                      allowFullScreen
                      title={selectedLesson.title}
                    ></iframe>
                  )}
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                  <div className="flex-1">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-8">
                      <div>
                        <h1 className="text-xl md:text-4xl font-black mb-4 uppercase italic tracking-tighter text-white leading-tight">
                          {selectedLesson.title}
                        </h1>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                              <User size={18} className="text-amber-500" />
                            </div>
                            <span className="text-sm font-bold text-white/60 uppercase tracking-widest italic">
                              {activeCourseId === 'main' 
                                ? course.instructorName 
                                : (course.upsellCourses?.find(u => u.id === activeCourseId)?.instructorName || course.instructorName)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('module')}: {selectedModule.title}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LESSON DESCRIPTION */}
                    <div className="mb-12 bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-10 shadow-inner">
                      <h3 className="text-sm md:text-3xl font-black mb-8 uppercase italic tracking-tighter flex items-center gap-4 text-white">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                          <List size={24} className="text-black" />
                        </div>
                        {t('lessonDescription')}
                      </h3>
                      <div 
                        className="prose prose-invert max-w-none text-white/70 leading-relaxed lesson-content-html text-sm md:text-base"
                        dangerouslySetInnerHTML={{ __html: selectedLesson.description }}
                      />
                    </div>
                  </div>
                  
                  <div className="w-full lg:w-80 space-y-6">
                    {selectedLesson.materials && selectedLesson.materials.length > 0 && (
                      <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-2xl">
                        <h4 className="font-black text-[10px] mb-4 uppercase tracking-[0.2em] text-white/40">{t('lessonMaterials')}</h4>
                        <div className="space-y-3">
                          {selectedLesson.materials.map((mat) => (
                            <a 
                              key={mat.id}
                              href={mat.url}
                              target="_blank"
                              download={mat.name}
                              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
                            >
                              <Download size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-bold truncate text-white/80">{mat.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 text-center">
                 <Play size={64} className="text-white/10 mb-6" />
                 <h2 className="text-2xl font-black text-white/40 uppercase tracking-widest italic">{t('selectLessonToStart')}</h2>
              </div>
            )}
          </div>
          {/* STUDENT FOOTER */}
          <footer className="px-6 py-6 bg-[#0a0a0a] border-t border-white/5 mt-8">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <img src={course.logoUrl} className="w-6 h-6 rounded grayscale opacity-20 border border-white/10" alt="Logo grayscale" />
                <p className="text-white/10 text-[9px] uppercase font-black tracking-[0.2em]">© 2026 {course.name} • {t('allRightsReserved')}</p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    );
  }

  if (viewState === 'module-lessons') {
    return (
      <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#0a0a0a] touch-pan-y">
        {/* STUDENT HEADER */}
        <nav className="h-16 flex items-center justify-between px-4 md:px-8 bg-black/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setViewState('home')}
                className="text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-2 mr-4"
              >
                <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
              </button>
              <img src={course.logoUrl} className="w-8 h-8 rounded-lg shadow-lg border border-white/10 object-contain bg-white/5 p-1" alt="Logo" />
              <span className="font-black text-lg tracking-tighter hidden md:block uppercase italic">{course.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 relative">
            <Search size={20} className="text-white/40" />
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-white/40 hover:text-amber-500 transition-colors"
            >
              <Bell size={20} />
              {notifications.some(n => !n.read) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-12 right-0 w-80 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60">{t('notifications')}</h4>
                  <button onClick={() => setNotifications([])} className="text-[8px] font-black text-white/20 hover:text-white uppercase tracking-tighter">{t('clearAll')}</button>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <h5 className="text-xs font-black text-amber-500 uppercase tracking-tight mb-1">{notif.title}</h5>
                        <p className="text-[11px] text-white/60 leading-relaxed mb-2">{notif.text}</p>
                        {notif.link && (
                          <a 
                            href={notif.link} 
                            target="_blank" 
                            className="text-[9px] font-black text-white hover:text-amber-500 flex items-center gap-1 uppercase tracking-widest"
                          >
                            {t('accessNow')} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center">
                      <Bell size={24} className="text-white/5 mx-auto mb-3" />
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">{t('noNews')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-[10px] ring-2 ring-white/10 shadow-lg">
              USER
            </div>
          </div>
        </nav>

        {/* MODULE HEADER */}
        <div className="relative w-full h-[200px] md:h-[300px] overflow-hidden">
          <img 
            src={selectedModule?.thumbnailUrl} 
            className="w-full h-full object-cover opacity-30 blur-sm scale-110" 
            alt="Module Banner"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
          <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12">
            <p className="text-amber-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.4em] mb-2 md:mb-4 italic">{t('selectedModule')}</p>
            <h1 className="text-xl md:text-4xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none">{selectedModule?.title}</h1>
            <p className="text-white/40 text-xs md:text-sm mt-2 md:mt-4 font-bold uppercase tracking-widest">{selectedModule?.lessons.length} {t('lessonsAvailable')}</p>
          </div>
        </div>

        {/* LESSONS LIST */}
        <section className="px-4 md:px-12 py-10 md:py-20 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {selectedModule?.lessons.map((lesson, idx) => (
              <div 
                key={lesson.id}
                onClick={() => selectLesson(selectedModule!, lesson, activeCourseId)}
                className="group cursor-pointer bg-white/5 rounded-2xl overflow-hidden border border-white/5 hover:border-amber-500/50 transition-all shadow-2xl"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={lesson.thumbnailUrl} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    alt={lesson.title}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-2xl">
                      <Play fill="black" size={24} className="ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic">{t('lessonIdx')} {idx + 1}</span>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{lesson.duration}</span>
                  </div>
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-black text-sm md:text-lg uppercase italic tracking-tighter group-hover:text-amber-500 transition-colors line-clamp-2 leading-tight">{lesson.title}</h3>
                  <p className="text-white/40 text-[10px] md:text-xs mt-2 line-clamp-2 leading-relaxed">{lesson.description.replace(/<[^>]*>?/gm, '')}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* STUDENT FOOTER */}
        <footer className="px-6 py-6 bg-[#0a0a0a] border-t border-white/5 mt-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <img src={course.logoUrl} className="w-6 h-6 rounded grayscale opacity-20 border border-white/10" alt="Logo grayscale" />
              <p className="text-white/10 text-[9px] uppercase font-black tracking-[0.2em]">© 2026 {course.name} • {t('allRightsReserved')}</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#0a0a0a] touch-pan-y">
      {/* STUDENT HEADER */}
      <nav className="h-16 flex items-center justify-between px-4 md:px-8 bg-black/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-4 md:gap-10">
          <div className="flex items-center gap-3">
            <Menu className="text-white/60 lg:hidden cursor-pointer" onClick={() => setIsMobileSidebarOpen(true)} />
            <img src={course.logoUrl} className="w-8 h-8 rounded-lg shadow-lg border border-white/10 object-contain bg-white/5 p-1" alt="Logo" />
            <span className="font-black text-lg tracking-tighter hidden md:block uppercase italic">{course.name}</span>
          </div>
          <div className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-white/60">
            <button 
              onClick={() => {
                setHomeFilter('all');
                setViewState('home');
              }}
              className={`py-5 transition-all border-b-2 ${homeFilter === 'all' && viewState === 'home' ? 'text-white border-amber-500' : 'border-transparent hover:text-white'}`}
            >
              {t('showcase')}
            </button>
            <button 
              onClick={() => {
                setHomeFilter('my-courses');
                setViewState('home');
              }}
              className={`py-5 transition-all border-b-2 ${homeFilter === 'my-courses' && viewState === 'home' ? 'text-white border-amber-500' : 'border-transparent hover:text-white'}`}
            >
              {t('myTrainings')}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-6 relative">
          <Search size={20} className="text-white/40 hidden xs:block" />
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-white/40 hover:text-amber-500 transition-colors"
          >
            <Bell size={20} />
            {notifications.some(n => !n.read) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-12 right-0 w-[280px] md:w-80 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60">Notificações</h4>
                <button onClick={() => setNotifications([])} className="text-[8px] font-black text-white/20 hover:text-white uppercase tracking-tighter">Limpar Tudo</button>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div key={notif.id} className="p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <h5 className="text-xs font-black text-amber-500 uppercase tracking-tight mb-1">{notif.title}</h5>
                      <p className="text-[11px] text-white/60 leading-relaxed mb-2">{notif.text}</p>
                      {notif.link && (
                        <a 
                          href={notif.link} 
                          target="_blank" 
                          className="text-[9px] font-black text-white hover:text-amber-500 flex items-center gap-1 uppercase tracking-widest"
                        >
                          Acessar Agora <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center">
                    <Bell size={24} className="text-white/5 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Nenhuma novidade por aqui</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-[10px] ring-2 ring-white/10 shadow-lg">
            USER
          </div>
        </div>
      </nav>

      {/* MOBILE SIDEBAR (Visible on small screens when Menu is clicked) */}
      <aside className={`
        fixed inset-y-0 left-0 z-[110] w-72 bg-[#111] border-r border-white/5 flex flex-col
        transition-transform duration-300 transform lg:hidden
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={course.logoUrl} className="w-6 h-6 object-contain" alt="Logo" />
            <span className="font-black text-sm uppercase italic tracking-tighter">{course.name}</span>
          </div>
          <button onClick={() => setIsMobileSidebarOpen(false)} className="text-white/40">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 p-6 space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Navegação</p>
            <button 
              onClick={() => {
                setHomeFilter('all');
                setViewState('home');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 text-sm font-bold p-3 rounded-xl transition-all ${homeFilter === 'all' && viewState === 'home' ? 'text-amber-500 bg-white/5' : 'text-white/60 hover:bg-white/5'}`}
            >
              <Layout size={18} /> {t('showcase')}
            </button>
            <button 
              onClick={() => {
                setHomeFilter('my-courses');
                setViewState('home');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 text-sm font-bold p-3 rounded-xl transition-all ${homeFilter === 'my-courses' && viewState === 'home' ? 'text-amber-500 bg-white/5' : 'text-white/60 hover:bg-white/5'}`}
            >
              <Play size={18} /> {t('myTrainings')}
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* STUDENT BANNER */}
      {(homeFilter === 'all' || !isCourseLocked(course)) && (
        <div className="relative w-full h-[350px] md:h-[500px] overflow-hidden group">
          <picture className="w-full h-full">
            {course.mobileBannerUrl && (
              <source media="(max-width: 768px)" srcSet={course.mobileBannerUrl} />
            )}
            <img 
              src={course.bannerUrl} 
              className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-[2000ms]" 
              alt="Banner"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
          <div className="absolute bottom-8 md:bottom-12 left-6 md:left-12 max-w-2xl">
            <p className="text-amber-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.4em] mb-2 md:mb-4 italic">{t('restrictedAccess')}</p>
            <h1 className="text-3xl md:text-5xl lg:text-8xl font-black mb-4 md:mb-8 drop-shadow-2xl uppercase italic tracking-tighter leading-tight md:leading-none">{course.name}</h1>
            <button 
              onClick={() => enterModule(course.modules[0])}
              className="px-8 md:px-12 py-4 md:py-5 bg-white text-black font-black rounded-xl flex items-center gap-3 md:gap-4 hover:bg-amber-500 transition-all shadow-2xl scale-100 hover:scale-105 active:scale-95 text-[10px] md:text-xs tracking-widest italic uppercase"
            >
              <Play fill="black" size={18} /> {t('resumeTraining')}
            </button>
          </div>
        </div>
      )}

      {/* MODULES GRID */}
      {(homeFilter === 'all' || !isCourseLocked(course)) && (
        <section className="px-4 md:px-12 py-10 md:py-20">
          <div className="flex items-center justify-between mb-8 md:mb-16">
            <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tight flex items-center gap-2 md:gap-4">
              {t('courseModules')} <span className="text-white/10 font-light text-xs md:text-sm not-italic">({course.modules.length})</span>
            </h2>
            <div className="h-[1px] flex-1 mx-4 md:mx-12 bg-white/5" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-10">
            {course.modules.map((mod) => {
              const locked = isModuleLocked(mod);
              return (
                <div 
                  key={mod.id} 
                  className={`group cursor-pointer relative ${locked ? 'opacity-80' : ''}`}
                  onClick={() => enterModule(mod, 'main')}
                >
                  <div className={`relative overflow-hidden rounded-2xl ring-1 ring-white/5 group-hover:ring-amber-500/40 transition-all shadow-2xl shadow-black duration-500 ${
                    course.moduleThumbnailOrientation === 'horizontal' ? 'aspect-video' : 'aspect-[2/3]'
                  }`}>
                    <img 
                      src={mod.thumbnailUrl} 
                      className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1000ms] ${locked ? 'grayscale blur-[2px]' : ''}`} 
                      alt={mod.title}
                    />
                    
                    {/* CONDITIONAL TEXT OVERLAY */}
                    {!mod.hideTitle && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
                          <h3 className="font-black text-sm lg:text-xl leading-tight drop-shadow-2xl text-white group-hover:text-amber-500 transition-colors uppercase italic tracking-tighter">{mod.title}</h3>
                          <div className="flex items-center justify-between mt-2 md:mt-3">
                            <span className="text-[9px] md:text-[10px] text-white/40 font-black uppercase tracking-widest">{mod.lessons.length} {t('lessonsCount')}</span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* PLAY ICON OVERLAY */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100">
                      {locked ? (
                        <div className="w-16 h-16 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-2xl ring-4 ring-white/20">
                          <Lock size={28} />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-2xl ring-4 ring-white/20">
                          <Play fill="black" size={28} className="ml-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* UPSELL COURSES SECTIONS */}
      {(course.upsellCourses || [])
        .filter(upsell => homeFilter === 'all' || !isCourseLocked(upsell))
        .map((upsell) => {
        const locked = isCourseLocked(upsell);
        
        if (locked) {
          return (
            <section key={upsell.id} className="px-4 md:px-12 py-8 md:py-12 border-t border-white/5">
               <div className="relative w-full h-[280px] md:h-auto md:aspect-video md:max-w-2xl md:mx-auto rounded-2xl md:rounded-3xl overflow-hidden group border border-white/5 hover:border-amber-500/30 transition-all">
                  <img 
                    src={upsell.bannerUrl || upsell.thumbnailUrl} 
                    className="w-full h-full object-cover grayscale blur-[2px] group-hover:grayscale-0 group-hover:blur-0 transition-all duration-700" 
                    alt={upsell.title} 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/70 md:bg-black/60 backdrop-blur-sm group-hover:bg-black/40 transition-all" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8 text-center">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-amber-500 rounded-full flex items-center justify-center mb-3 md:mb-4 shadow-2xl shadow-amber-500/20">
                      <Lock className="text-black" size={20} />
                    </div>
                    <p className="text-amber-500 font-black text-[9px] md:text-[10px] uppercase tracking-[0.4em] mb-1 md:mb-2 italic">{t('exclusiveOffer')}</p>
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-black mb-2 md:mb-4 uppercase italic tracking-tighter leading-tight px-2">{upsell.title}</h2>
                    <p className="text-white/60 max-w-md mb-4 md:mb-6 text-[11px] md:text-xs lg:text-sm line-clamp-2 px-4">{t('unlockMessage')}</p>
                    <button 
                      onClick={() => window.open(upsell.upsellUrl, '_blank')}
                      className="px-6 md:px-10 py-3 md:py-4 bg-amber-500 text-black font-black rounded-lg md:rounded-xl flex items-center gap-2 md:gap-4 hover:bg-white transition-all shadow-2xl text-[9px] md:text-xs tracking-widest italic uppercase"
                    >
                      <ShoppingCart size={14} /> {t('getAccessNow')}
                    </button>
                  </div>
               </div>
            </section>
          );
        }

        return (
          <section key={upsell.id} className="px-4 md:px-12 py-8 md:py-20 border-t border-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-16 gap-6 md:gap-0">
              <div>
                <p className="text-amber-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.4em] mb-1 md:mb-2 italic">{t('additionalCourse')}</p>
                <h2 className="text-lg md:text-3xl font-black uppercase italic tracking-tight flex items-center gap-2 md:gap-4">
                  {upsell.title} <span className="text-white/10 font-light text-[9px] md:text-sm not-italic">({upsell.modules.length} {t('modules').toLowerCase()})</span>
                </h2>
                {upsell.instructorName && <p className="text-white/40 text-[10px] md:text-xs mt-1 md:mt-2 font-bold uppercase tracking-widest italic">{t('instructor')} {upsell.instructorName}</p>}
              </div>
              <div className="hidden md:block h-[1px] flex-1 mx-12 bg-white/5" />
              <button 
                onClick={() => upsell.modules.length > 0 && enterModule(upsell.modules[0], upsell.id)}
                className="w-full md:w-auto px-8 py-4 md:py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black rounded-xl text-[10px] tracking-widest uppercase italic transition-all"
              >
                {t('resumeCourse')}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-10">
              {upsell.modules.map((mod) => (
                <div 
                  key={mod.id} 
                  className="group cursor-pointer relative"
                  onClick={() => enterModule(mod, upsell.id)}
                >
                  <div className={`relative overflow-hidden rounded-2xl ring-1 ring-white/5 group-hover:ring-amber-500/40 transition-all shadow-2xl shadow-black duration-500 ${
                    course.moduleThumbnailOrientation === 'horizontal' ? 'aspect-video' : 'aspect-[2/3]'
                  }`}>
                    <img 
                      src={mod.thumbnailUrl} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1000ms]" 
                      alt={mod.title}
                      referrerPolicy="no-referrer"
                    />
                    {!mod.hideTitle && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-6 left-6 right-6">
                          <h3 className="font-black text-base lg:text-xl leading-tight drop-shadow-2xl text-white group-hover:text-amber-500 transition-colors uppercase italic tracking-tighter">{mod.title}</h3>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">{mod.lessons.length} {t('lessonsCount')}</span>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100">
                      <div className="w-16 h-16 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-2xl ring-4 ring-white/20">
                        <Play fill="black" size={28} className="ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!upsell.modules || upsell.modules.length === 0) && (
                <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <p className="text-white/20 font-black uppercase tracking-widest italic">{t('noModulesAvailable')}</p>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* STUDENT FOOTER */}
      <footer className="px-6 py-6 bg-[#0a0a0a] border-t border-white/5 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <img src={course.logoUrl} className="w-6 h-6 rounded grayscale opacity-20 border border-white/10" alt="Logo grayscale" />
            <p className="text-white/10 text-[9px] uppercase font-black tracking-[0.2em]">© 2026 {course.name} • {t('allRightsReserved')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentArea;
