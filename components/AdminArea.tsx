
import React, { useState, useRef, useEffect } from 'react';
import { CourseConfig, Module, Lesson, Material } from '../types';
import { 
  Save, Plus, Trash2, Edit3, Image as ImageIcon, Layout as LayoutIcon, 
  Video, List, CheckCircle, ChevronDown, ChevronUp, LayoutGrid, Square, RectangleHorizontal, 
  FilePlus, Calendar, Tag, Info, Code, Bold, Italic, Strikethrough, ListOrdered, ListIcon, 
  Link as LinkIcon, Link2, Minus, Type, MessageCircle, Rocket, Upload, FileText, X, Settings2, EyeOff, Eye, Loader2, ShoppingCart, Bell, Users, Search as SearchIcon
} from 'lucide-react';
import { db } from '../src/firebase';


interface AdminAreaProps {
  course: CourseConfig;
  onUpdate: (newData: CourseConfig) => void;
}

const getAutoThumbnail = (videoUrl: string) => {
  if (!videoUrl) return '';
  
// YouTube
if (videoUrl?.includes('youtube.com/watch?v=')) {
  const id = videoUrl.split('v=')[1]?.split('&')?.[0];
  if (id) {
    return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  }
}

if (videoUrl?.includes('youtu.be/')) {
  const id = videoUrl.split('youtu.be/')[1]?.split('?')?.[0];
  if (id) {
    return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  }
}

// Vimeo
if (videoUrl?.includes('vimeo.com/')) {
  const parts = videoUrl.split('vimeo.com/')[1];
  const id = parts?.split('?')?.[0]?.split('/')?.[0];
  if (id) {
    return `https://vumbnail.com/${id}.jpg`;
  }
}

return '';
};

const isDirectVideo = (url: string) => {
  if (!url) return false;
  const directExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  return directExtensions.some(ext => url.toLowerCase().includes(ext)) || 
         url.includes('bunnycdn.com') || 
         url.includes('b-cdn.net');
};

const LessonThumbnail: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const autoThumb = getAutoThumbnail(lesson.videoUrl);
  const hasThumbnail = !!lesson.thumbnailUrl;
  
  if (hasThumbnail) {
    return <img src={lesson.thumbnailUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={lesson.title} />;
  }

  if (autoThumb) {
    return <img src={autoThumb} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={lesson.title} />;
  }

  if (isDirectVideo(lesson.videoUrl)) {
    return (
      <video 
        src={`${lesson.videoUrl}#t=0.5`} 
        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
        muted 
        playsInline 
        preload="metadata"
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/20">
      <Video size={24} />
    </div>
  );
};

const AdminArea: React.FC<AdminAreaProps> = ({ course, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'modules' | 'appearance' | 'upsells' | 'notifications' | 'students' | 'bunny-files'>('modules');
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [bunnyFiles, setBunnyFiles] = useState<any[]>([]);
  const [loadingBunny, setLoadingBunny] = useState(false);

  const fetchBunnyFiles = async () => {
    setLoadingBunny(true);
    try {
      const response = await fetch('/api/admin/files');
      if (response.ok) {
        const data = await response.json();
        setBunnyFiles(data);
      } else {
        console.error('Failed to fetch bunny files');
      }
    } catch (error) {
      console.error('Error fetching bunny files:', error);
    } finally {
      setLoadingBunny(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bunny-files') {
      fetchBunnyFiles();
    }
  }, [activeTab]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await fetch('/api/admin/students');
      if (response.ok) {
        const studentList = await response.json();
        setStudents(studentList);
      } else {
        console.error("Failed to fetch students");
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab]);

  const handleAddStudent = async () => {
    if (!newStudentEmail) return;
    const email = newStudentEmail.toLowerCase().trim();
    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setNewStudentEmail('');
        fetchStudents();
      } else {
        alert("Erro ao adicionar aluno");
      }
    } catch (error) {
      console.error("Error adding student:", error);
      alert("Erro ao adicionar aluno");
    }
  };

  const handleDeleteStudent = async (email: string) => {
    setConfirmDelete({
      title: 'Remover Aluno?',
      message: `Tem certeza que deseja remover o acesso de ${email}?`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/students/${email}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            fetchStudents();
          }
        } catch (error) {
          console.error("Error deleting student:", error);
        }
        setConfirmDelete(null);
      }
    });
  };

  const [formData, setFormData] = useState<CourseConfig>({
    ...course,
    notifications: course.notifications || []
  });
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Initial sync of formData when course prop is available
useEffect(() => {
  const loadConfig = async () => {
    try {
      const res = await fetch('https://api.rafaelpedrozo.online/membros/admin/config');
      const data = await res.json();

      const safeData = {
        title: data.title || "",
        description: data.description || "",
        modules: data.modules || [],
        theme: data.theme || {},
        notifications: data.notifications || []
      };

      setFormData(safeData);

    } catch (err) {
      console.error('Erro ao carregar config:', err);
    }
  };

  loadConfig();
}, []);

  const [expandedModule, setExpandedModule] = useState<string | null>(formData.modules[0]?.id || null);
  const [expandedLessonSections, setExpandedLessonSections] = useState<Record<string, string | null>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const currentUploadTarget = useRef<{ modId: string, lessonId: string, courseId?: string } | null>(null);
  const currentImageTarget = useRef<{ type: 'logo' | 'banner' | 'module' | 'lesson' | 'upsell-thumb' | 'upsell-banner', modId?: string, lessonId?: string, courseId?: string } | null>(null);
  const currentVideoTarget = useRef<{ modId: string, lessonId: string, courseId?: string } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [notifForm, setNotifForm] = useState({ title: '', text: '', link: '' });
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const sendNotification = async () => {
    if (!notifForm.title || !notifForm.text) {
      alert('Preencha o título e o texto da notificação.');
      return;
    }

    setIsSendingNotif(true);
    try {
      const token = localStorage.getItem('nexus_admin_token');
      const response = await fetch('/api/admin/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notifForm),
      });

      if (response.ok) {
        alert('Notificação enviada com sucesso!');
        setNotifForm({ title: '', text: '', link: '' });
      } else {
        const err = await response.json();
        alert('Erro ao enviar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Erro de conexão ao enviar notificação.');
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleSave = async () => {
  try {
    const res = await fetch('https://api.rafaelpedrozo.online/membros/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Erro ao salvar');
    }

    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);

  } catch (err) {
    console.error('Erro ao salvar config:', err);
    alert('Erro ao salvar no servidor');
  }
};

  const toggleLessonSection = (lessonId: string, section: string) => {
    setExpandedLessonSections(prev => ({
      ...prev,
      [lessonId]: prev[lessonId] === section ? null : section
    }));
  };

  const renderModuleList = (modules: Module[], courseId?: string) => {
    return (
      <div className="space-y-8">
        {modules.map((mod, mIdx) => (
          <div key={mod.id} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            {/* MODULE HEADER BAR */}
            <div onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)} className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 bg-black/20">
              <div className="flex items-center gap-3 sm:gap-6 overflow-hidden">
                <div className={`flex-shrink-0 rounded object-cover ring-1 ring-white/10 overflow-hidden ${formData.moduleThumbnailOrientation === 'horizontal' ? 'w-16 sm:w-24 h-10 sm:h-14' : 'w-8 sm:w-10 h-10 sm:h-14'}`}>
                  {mod.thumbnailUrl ? (
                    <img src={mod.thumbnailUrl} className="w-full h-full object-cover" alt={mod.title} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/20"><ImageIcon size={16} /></div>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5 sm:mb-1 block">Módulo {mIdx + 1}</span>
                  <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3 truncate">
                    {mod.title}
                    {mod.hideTitle && <EyeOff size={12} className="text-white/20" title="Título Oculto no Aluno" />}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); deleteModule(mod.id, courseId); }} className="p-2 sm:p-3 text-white/20 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
                {expandedModule === mod.id ? <ChevronUp size={18} className="text-white/20" /> : <ChevronDown size={18} className="text-white/20" />}
              </div>
            </div>

            {expandedModule === mod.id && (
              <div className="animate-in slide-in-from-top-4 duration-300">
                {/* MODULE SETTINGS SECTION */}
                <div className="p-4 sm:p-8 border-t border-white/5 bg-white/[0.02] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Settings2 size={16} className="text-amber-500" />
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 italic">Configurações do Módulo</h4>
                    </div>
                    
                    {/* HIDE TITLE TOGGLE */}
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Ocultar Título?</span>
                      <button 
                        onClick={() => updateModule(mod.id, { hideTitle: !mod.hideTitle }, courseId)}
                        className={`w-12 h-6 rounded-full p-1 transition-all ${mod.hideTitle ? 'bg-amber-500' : 'bg-white/10'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-black transition-all transform ${mod.hideTitle ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Título do Módulo</label>
                      <input 
                        type="text" 
                        value={mod.title} 
                        onChange={(e) => updateModule(mod.id, { title: e.target.value }, courseId)} 
                        className="w-full bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none focus:border-amber-500 transition-colors" 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Capa do Módulo (Thumbnail)</label>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <input 
                          type="text" 
                          value={mod.thumbnailUrl} 
                          onChange={(e) => updateModule(mod.id, { thumbnailUrl: e.target.value }, courseId)} 
                          className="flex-1 bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none text-xs truncate" 
                          placeholder="URL da Imagem"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => triggerImageUpload({ type: 'module', modId: mod.id, courseId })}
                            className="flex-1 sm:flex-none bg-amber-500 text-black px-4 sm:px-6 py-2 sm:py-0 rounded font-black text-xs flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg whitespace-nowrap"
                          >
                            <Upload size={14} /> UPLOAD
                          </button>
                          {mod.thumbnailUrl && (
                            <button 
                              onClick={async () => {
                                const urlToDelete = mod.thumbnailUrl;
                                setConfirmDelete({
                                  title: 'Apagar Capa?',
                                  message: 'Deseja remover esta imagem de capa?',
                                  onConfirm: () => {
                                    updateModule(mod.id, { thumbnailUrl: '' }, courseId);
                                    if (urlToDelete) deleteFromBunny(urlToDelete);
                                    setConfirmDelete(null);
                                  }
                                });
                              }}
                              className="flex-1 sm:flex-none bg-red-500 text-white px-4 rounded font-black text-xs flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg whitespace-nowrap"
                            >
                              <Trash2 size={14} /> APAGAR
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* UPSELL SETTINGS (Only for main course modules) */}
                  {!courseId && (
                    <div className="pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
                      <div className="flex items-center justify-between sm:justify-start gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Módulo Upsell?</span>
                          <p className="text-[8px] text-white/20 uppercase tracking-tighter">Bloqueia acesso se não comprado</p>
                        </div>
                        <button 
                          onClick={() => updateModule(mod.id, { isUpsell: !mod.isUpsell }, courseId)}
                          className={`w-12 h-6 rounded-full p-1 transition-all ${mod.isUpsell ? 'bg-amber-500' : 'bg-white/10'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-black transition-all transform ${mod.isUpsell ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {mod.isUpsell && (
                        <>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-1"><Tag size={10} /> ID do Produto (Hotmart/Kiwify)</label>
                            <input 
                              type="text" 
                              value={mod.productId || ''} 
                              onChange={(e) => updateModule(mod.id, { productId: e.target.value }, courseId)} 
                              className="w-full bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none focus:border-amber-500 transition-colors text-xs" 
                              placeholder="Ex: 123456"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-1"><ShoppingCart size={10} /> URL de Venda (Checkout)</label>
                            <input 
                              type="text" 
                              value={mod.upsellUrl || ''} 
                              onChange={(e) => updateModule(mod.id, { upsellUrl: e.target.value }, courseId)} 
                              className="w-full bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none focus:border-amber-500 transition-colors text-xs" 
                              placeholder="https://pay.hotmart.com/..."
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* LESSONS LIST SECTION */}
                <div className="p-4 sm:p-8 border-t border-white/5 bg-black/40 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <List size={16} className="text-amber-500" />
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 italic">Conteúdo (Aulas)</h4>
                    </div>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{mod.lessons.length} aulas cadastradas</span>
                  </div>

                  <div className="space-y-6">
                    {mod.lessons.map((lesson, lIdx) => (
                      <div key={lesson.id} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/5">
                        <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-4 sm:gap-6">
                          <div className="w-full md:w-56 aspect-video rounded-xl bg-black overflow-hidden relative group border border-white/10">
                            <LessonThumbnail lesson={lesson} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                               <button 
                                onClick={() => triggerImageUpload({ type: 'lesson', modId: mod.id, lessonId: lesson.id, courseId })}
                                className="bg-black/80 text-white border border-white/20 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-amber-500 hover:text-black transition-all flex items-center gap-2 w-32 justify-center"
                               >
                                 <Upload size={12} /> TROCAR CAPA
                               </button>
                               {lesson.thumbnailUrl && (
                                 <button 
                                   onClick={async () => {
                                     const urlToDelete = lesson.thumbnailUrl;
                                     setConfirmDelete({
                                       title: 'Apagar Capa?',
                                       message: 'Deseja remover esta imagem de capa?',
                                       onConfirm: () => {
                                         updateLesson(mod.id, lesson.id, { thumbnailUrl: '' }, courseId);
                                         if (urlToDelete) deleteFromBunny(urlToDelete);
                                         setConfirmDelete(null);
                                       }
                                     });
                                   }}
                                  className="bg-red-500/80 text-white border border-red-500/20 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-red-600 transition-all flex items-center gap-2 w-32 justify-center"
                                 >
                                   <Trash2 size={12} /> APAGAR CAPA
                                 </button>
                               )}
                            </div>
                          </div>
                          <div className="flex-1 space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <input 
                                  value={lesson.title}
                                  onChange={(e) => updateLesson(mod.id, lesson.id, { title: e.target.value }, courseId)}
                                  className="bg-transparent text-lg sm:text-xl font-black text-white italic outline-none border-b border-transparent focus:border-amber-500 w-full truncate"
                                  placeholder="Título da Aula"
                                />
                                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Aula #{lIdx + 1}</span>
                                  <div className="flex items-center gap-2">
                                    <Calendar size={10} className="text-white/20" />
                                    <input 
                                      type="number"
                                      value={lesson.releaseDays || 0}
                                      onChange={(e) => updateLesson(mod.id, lesson.id, { releaseDays: parseInt(e.target.value) || 0 }, courseId)}
                                      className="bg-transparent text-[10px] font-bold text-white/40 outline-none w-8 focus:text-white"
                                    />
                                    <span className="text-[10px] font-bold text-white/20 uppercase">dias para liberar</span>
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => deleteLesson(mod.id, lesson.id, courseId)} className="p-2 text-white/10 hover:text-red-500 transition-colors flex-shrink-0">
                                <Trash2 size={20} />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-1"><Video size={10} /> Embed URL ou Upload Direto</label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input 
                                    value={lesson.videoUrl}
                                    onChange={(e) => updateLesson(mod.id, lesson.id, { videoUrl: e.target.value }, courseId)}
                                    className="flex-1 bg-black/40 border border-white/10 text-white rounded px-4 py-2 text-xs outline-none focus:border-amber-500"
                                    placeholder="URL do Vídeo ou link do Bunny.net"
                                  />
                                  <button 
                                    onClick={() => triggerVideoUpload(mod.id, lesson.id, courseId)}
                                    disabled={isUploading}
                                    className="bg-white/10 text-white px-4 py-2 rounded font-black text-[10px] flex items-center justify-center gap-2 hover:bg-amber-500 hover:text-black transition-all disabled:opacity-50"
                                  >
                                    {isUploading ? <Loader2 className="animate-spin" size={12} /> : <Upload size={12} />}
                                    UPLOAD BUNNY
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ACCORDION SECTIONS FOR LESSON DETAILS */}
                        <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-2">
                          <div className="border-t border-white/5">
                            <button 
                              onClick={() => toggleLessonSection(lesson.id, 'description')}
                              className="w-full py-4 flex items-center justify-between text-xs font-bold text-white/40 hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-3 font-black text-white/60 uppercase italic"><Type size={14} /> Descrição e Conteúdo Rico</div>
                              {expandedLessonSections[lesson.id] === 'description' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {expandedLessonSections[lesson.id] === 'description' && (
                              <div className="pb-6 animate-in slide-in-from-top-2 duration-200">
                                <div className="bg-[#334155] rounded-t-xl p-2 flex flex-wrap gap-1 items-center border border-white/10">
                                  <button onClick={() => insertHtmlAtCursor(mod.id, lesson.id, '<pre><code>CODIGO AQUI</code></pre>', courseId)} title="HTML" className="p-1.5 hover:bg-white/10 rounded text-white/80 transition-colors"><Code size={16} /></button>
                                  <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                                  <button onClick={() => insertHtmlAtCursor(mod.id, lesson.id, '<b>TEXTO EM NEGRITO</b>', courseId)} title="Negrito" className="p-1.5 hover:bg-white/10 rounded text-white/80 transition-colors"><Bold size={16} /></button>
                                  <button onClick={() => insertHtmlAtCursor(mod.id, lesson.id, '<i>TEXTO EM ITALICO</i>', courseId)} title="Itálico" className="p-1.5 hover:bg-white/10 rounded text-white/80 transition-colors"><Italic size={16} /></button>
                                  <button onClick={() => insertHtmlAtCursor(mod.id, lesson.id, '<strike>TEXTO RISCADO</strike>', courseId)} title="Riscado" className="p-1.5 hover:bg-white/10 rounded text-white/80 transition-colors"><Strikethrough size={16} /></button>
                                  <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                                  <button onClick={() => insertHtmlAtCursor(mod.id, lesson.id, '<ul><li>Item 1</li><li>Item 2</li></ul>', courseId)} title="Lista Simples" className="p-1.5 hover:bg-white/10 rounded text-white/80 transition-colors"><ListIcon size={16} /></button>
                                  <button onClick={() => insertHtmlAtCursor(mod.id, lesson.id, '<ol><li>Item 1</li><li>Item 2</li></ol>', courseId)} title="Lista Numerada" className="p-1.5 hover:bg-white/10 rounded text-white/80 transition-colors"><ListOrdered size={16} /></button>
                                  <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                                  <button onClick={() => insertHtmlAtCursor(mod.id, lesson.id, '<img src="URL_DA_IMAGEM" alt="Descricao" />', courseId)} title="Imagem" className="p-1.5 hover:bg-white/10 rounded text-white/80 transition-colors"><ImageIcon size={16} /></button>
                                  <button onClick={() => insertHtmlAtCursor(mod.id, lesson.id, '<a href="https://google.com" target="_blank">LINK AQUI</a>', courseId)} title="Link" className="p-1.5 hover:bg-white/10 rounded text-white/80 transition-colors"><LinkIcon size={16} /></button>
                                  <button onClick={() => insertHtmlAtCursor(mod.id, lesson.id, '<hr />', courseId)} title="Divisor" className="p-1.5 hover:bg-white/10 rounded text-white/80 transition-colors"><Minus size={16} /></button>
                                  <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                                  <button 
                                      onClick={() => insertHtmlAtCursor(mod.id, lesson.id, `<a href="#" class="btn-premium-support">🚀 ACESSAR FERRAMENTA AGORA</a>`, courseId)} 
                                      className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-black border border-indigo-500/20 flex items-center gap-1.5 hover:bg-indigo-500 hover:text-white transition-all"
                                  >
                                      <Rocket size={10} /> BOTÃO DE ACESSO
                                  </button>
                                </div>
                                <textarea 
                                  value={lesson.description}
                                  onChange={(e) => updateLesson(mod.id, lesson.id, { description: e.target.value }, courseId)}
                                  rows={10}
                                  className="w-full bg-white text-slate-900 border border-white/10 rounded-b-xl px-4 py-3 text-sm font-mono outline-none resize-none focus:border-amber-500"
                                  placeholder="Use HTML para formatar o conteúdo da aula..."
                                />
                              </div>
                            )}
                          </div>

                          <div className="border-t border-white/5">
                            <button 
                              onClick={() => toggleLessonSection(lesson.id, 'materials')}
                              className="w-full py-4 flex items-center justify-between text-xs font-bold text-white/40 hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-3 font-black text-white/60 uppercase italic"><FilePlus size={14} /> Material Extra e Anexos</div>
                              {expandedLessonSections[lesson.id] === 'materials' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {expandedLessonSections[lesson.id] === 'materials' && (
                              <div className="pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                                    <div className="space-y-1">
                                      <h5 className="text-white font-bold text-sm">Upload de Materiais</h5>
                                      <p className="text-[10px] text-white/40 max-w-md">
                                        Você pode adicionar até 10 arquivos de no máximo 100MB cada.<br/>
                                        Formatos: jpg, gif, png, bmp, pdf, zip, rar, epub, xls, xlsx, xlsm, mp3, doc, docx, ppt, pptx.
                                      </p>
                                    </div>
                                    <button 
                                      onClick={() => triggerFileUpload(mod.id, lesson.id, courseId)}
                                      className="w-full sm:w-auto bg-amber-500 text-black px-6 py-3 rounded-lg font-black text-xs flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg"
                                    >
                                      <Upload size={14} /> ANEXAR DO PC
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    {(lesson.materials || []).map((mat) => (
                                      <div key={mat.id} className="flex gap-4 items-center bg-black/40 p-3 rounded-xl border border-white/5 group">
                                        <FileText size={16} className="text-amber-500/60" />
                                        <div className="flex-1 overflow-hidden">
                                          <input 
                                            value={mat.name}
                                            onChange={(e) => updateMaterial(mod.id, lesson.id, mat.id, { name: e.target.value }, courseId)}
                                            className="bg-transparent text-white text-xs font-bold outline-none w-full border-b border-transparent focus:border-white/10"
                                            placeholder="Nome do Material"
                                          />
                                        </div>
                                        <button onClick={() => deleteMaterial(mod.id, lesson.id, mat.id, courseId)} className="text-white/20 hover:text-red-500 transition-colors p-1">
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ))}
                                    {(!lesson.materials || lesson.materials.length === 0) && (
                                      <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                                        <p className="text-white/20 text-[10px] font-medium uppercase tracking-widest italic">Nenhum arquivo anexado</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addLesson(mod.id, courseId)} className="w-full py-8 border-2 border-dashed border-white/5 rounded-2xl text-white/20 font-black uppercase tracking-widest hover:border-amber-500/30 hover:text-amber-500 transition-all flex items-center justify-center gap-3 italic">
                      <Plus size={24} /> ADICIONAR NOVA AULA DE ELITE
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        <button onClick={() => addModule(courseId)} className="w-full py-12 bg-white text-black font-black uppercase tracking-tighter rounded-3xl shadow-2xl hover:bg-amber-500 transition-all flex items-center justify-center gap-4 text-2xl italic">
          <Plus size={32} /> CRIAR NOVO MÓDULO CONTAINER
        </button>
      </div>
    );
  };

  const insertHtmlAtCursor = (moduleId: string, lessonId: string, htmlToInsert: string, courseId?: string) => {
    let lesson: Lesson | undefined;
    if (courseId) {
      const upsell = formData.upsellCourses.find(u => u.id === courseId);
      lesson = upsell?.modules.find(m => m.id === moduleId)?.lessons.find(l => l.id === lessonId);
    } else {
      lesson = formData.modules.find(m => m.id === moduleId)?.lessons.find(l => l.id === lessonId);
    }
    
    if (!lesson) return;
    const currentDescription = lesson.description || '';
    updateLesson(moduleId, lessonId, { description: currentDescription + '\n' + htmlToInsert }, courseId);
  };

  const addModule = (courseId?: string) => {
    const newModule: Module = {
      id: `mod-${Date.now()}`,
      title: 'Novo Módulo Premium',
      thumbnailUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=800&auto=format&fit=crop',
      lessons: [],
      hideTitle: false
    };

    if (courseId) {
      setFormData(prev => ({
        ...prev,
        upsellCourses: prev.upsellCourses.map(u => u.id === courseId ? { ...u, modules: [...u.modules, newModule] } : u)
      }));
    } else {
      setFormData(prev => ({ ...prev, modules: [...prev.modules, newModule] }));
    }
    setExpandedModule(newModule.id);
  };

  const updateModule = (id: string, updates: Partial<Module>, courseId?: string) => {
    if (courseId) {
      setFormData(prev => ({
        ...prev,
        upsellCourses: prev.upsellCourses.map(u => u.id === courseId ? {
          ...u,
          modules: u.modules.map(m => m.id === id ? { ...m, ...updates } : m)
        } : u)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        modules: prev.modules.map(m => m.id === id ? { ...m, ...updates } : m)
      }));
    }
  };

  const updateUpsell = (id: string, updates: any) => {
    setFormData(prev => ({
      ...prev,
      upsellCourses: prev.upsellCourses.map(u => u.id === id ? { ...u, ...updates } : u)
    }));
  };

  const deleteModule = (id: string, courseId?: string) => {
    setConfirmDelete({
      title: 'Excluir Módulo?',
      message: 'Tem certeza que deseja excluir este módulo e todas as suas aulas? Esta ação não pode ser desfeita.',
      onConfirm: () => {
        if (courseId) {
          setFormData(prev => ({
            ...prev,
            upsellCourses: prev.upsellCourses.map(u => u.id === courseId ? {
              ...u,
              modules: u.modules.filter(m => m.id !== id)
            } : u)
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            modules: prev.modules.filter(m => m.id !== id)
          }));
        }
        setConfirmDelete(null);
      }
    });
  };

  const addLesson = (moduleId: string, courseId?: string) => {
    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      title: 'Nova Aula de Elite',
      thumbnailUrl: '',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      description: '<p>Conteúdo programático...</p>',
      materials: [],
      tags: '',
      releaseDays: 0
    };

    if (courseId) {
      setFormData(prev => ({
        ...prev,
        upsellCourses: prev.upsellCourses.map(u => u.id === courseId ? {
          ...u,
          modules: u.modules.map(m => {
            if (m.id === moduleId) {
              return { ...m, lessons: [...m.lessons, { ...newLesson, thumbnailUrl: m.thumbnailUrl }] };
            }
            return m;
          })
        } : u)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        modules: prev.modules.map(m => {
          if (m.id === moduleId) {
            return { ...m, lessons: [...m.lessons, { ...newLesson, thumbnailUrl: m.thumbnailUrl }] };
          }
          return m;
        })
      }));
    }
  };

  const updateLesson = (moduleId: string, lessonId: string, updates: Partial<Lesson>, courseId?: string) => {
    if (courseId) {
      setFormData(prev => ({
        ...prev,
        upsellCourses: prev.upsellCourses.map(u => u.id === courseId ? {
          ...u,
          modules: u.modules.map(m => {
            if (m.id === moduleId) {
              return {
                ...m,
                lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l)
              };
            }
            return m;
          })
        } : u)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        modules: prev.modules.map(m => {
          if (m.id === moduleId) {
            return {
              ...m,
              lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l)
            };
          }
          return m;
        })
      }));
    }
  };

  const deleteLesson = (moduleId: string, lessonId: string, courseId?: string) => {
    setConfirmDelete({
      title: 'Excluir Aula?',
      message: 'Tem certeza que deseja excluir esta aula permanentemente?',
      onConfirm: () => {
        if (courseId) {
          setFormData(prev => ({
            ...prev,
            upsellCourses: prev.upsellCourses.map(u => u.id === courseId ? {
              ...u,
              modules: u.modules.map(m => {
                if (m.id === moduleId) {
                  return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
                }
                return m;
              })
            } : u)
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            modules: prev.modules.map(m => {
              if (m.id === moduleId) {
                return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
              }
              return m;
            })
          }));
        }
        setConfirmDelete(null);
      }
    });
  };

  const updateMaterial = (moduleId: string, lessonId: string, materialId: string, updates: Partial<Material>, courseId?: string) => {
    if (courseId) {
      setFormData(prev => ({
        ...prev,
        upsellCourses: prev.upsellCourses.map(u => u.id === courseId ? {
          ...u,
          modules: u.modules.map(m => {
            if (m.id === moduleId) {
              return {
                ...m,
                lessons: m.lessons.map(l => {
                  if (l.id === lessonId) {
                    return {
                      ...l,
                      materials: l.materials.map(mat => mat.id === materialId ? { ...mat, ...updates } : mat)
                    };
                  }
                  return l;
                })
              };
            }
            return m;
          })
        } : u)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        modules: prev.modules.map(m => {
          if (m.id === moduleId) {
            return {
              ...m,
              lessons: m.lessons.map(l => {
                if (l.id === lessonId) {
                  return {
                    ...l,
                    materials: l.materials.map(mat => mat.id === materialId ? { ...mat, ...updates } : mat)
                  };
                }
                return l;
              })
            };
          }
          return m;
        })
      }));
    }
  };

  const deleteMaterial = (moduleId: string, lessonId: string, materialId: string, courseId?: string) => {
    setConfirmDelete({
      title: 'Excluir Material?',
      message: 'Deseja remover este material de apoio?',
      onConfirm: () => {
        if (courseId) {
          setFormData(prev => ({
            ...prev,
            upsellCourses: prev.upsellCourses.map(u => u.id === courseId ? {
              ...u,
              modules: u.modules.map(m => {
                if (m.id === moduleId) {
                  return {
                    ...m,
                    lessons: m.lessons.map(l => {
                      if (l.id === lessonId) {
                        return {
                          ...l,
                          materials: l.materials.filter(mat => mat.id !== materialId)
                        };
                      }
                      return l;
                    })
                  };
                }
                return m;
              })
            } : u)
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            modules: prev.modules.map(m => {
              if (m.id === moduleId) {
                return {
                  ...m,
                  lessons: m.lessons.map(l => {
                    if (l.id === lessonId) {
                      return {
                        ...l,
                        materials: l.materials.filter(mat => mat.id !== materialId)
                      };
                    }
                    return l;
                  })
                };
              }
              return m;
            })
          }));
        }
        setConfirmDelete(null);
      }
    });
  };

  const triggerFileUpload = (modId: string, lessonId: string, courseId?: string) => {
    currentUploadTarget.current = { modId, lessonId, courseId };
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const triggerImageUpload = (target: typeof currentImageTarget.current) => {
    currentImageTarget.current = target;
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const triggerVideoUpload = (modId: string, lessonId: string, courseId?: string) => {
    currentVideoTarget.current = { modId, lessonId, courseId };
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  };

  const uploadToBunny = async (file: File): Promise<string | null> => {
    // Bunny.net Config from formData
    const storageZoneForUpload = formData.bunnyStorageZone?.trim() || 'teste-aula';
    let accessKey = formData.bunnyAccessKey?.trim();
    const pullZoneUrl = formData.bunnyPullZoneUrl?.trim()?.replace(/\/$/, '');
    let region = (formData.bunnyRegion || 'br')?.trim(); 

    // Sanitize access key (remove spaces, hidden chars)
    accessKey = accessKey?.replace(/[^a-f0-9-]/gi, '');
    
    if (!accessKey || !pullZoneUrl) {
      console.error('❌ Configuração do Bunny.net incompleta');
      alert('Erro: Configure a Access Key e Pull Zone na aba GERAL antes de fazer o upload.');
      return null;
    }
    
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${Date.now()}-${cleanName}`;
    
    // Try global endpoint first
    const bunnyUrl = `https://storage.bunnycdn.com/${storageZoneForUpload}/${fileName}`;

    try {
      console.log('🚀 Iniciando upload para:', bunnyUrl);
      
      let response = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': accessKey,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });
      
      if (!response.ok && region && region !== 'de') {
        const regionalUrl = `https://${region}.storage.bunnycdn.com/${storageZoneForUpload}/${fileName}`;
        console.log('⚠️ Global falhou ou redirecionou, tentando regional:', regionalUrl);
        response = await fetch(regionalUrl, {
          method: 'PUT',
          headers: {
            'AccessKey': accessKey,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });
      }

      if (response.ok) {
        const fileUrl = `${pullZoneUrl}/${fileName}`;
        console.log('✅ Upload concluído! Link gerado:', fileUrl);
        return fileUrl;
      } else {
        const errorText = await response.text();
        console.error('❌ Erro na resposta do Bunny.net:', response.status, errorText);
        throw new Error(`Erro no Bunny.net (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.error('Upload failed', error);
      alert('Falha no upload: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      return null;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado para a área de transferência!');
  };

  const deleteFromBunny = async (url: string): Promise<boolean> => {
    if (!url) return false;
    
    // Only delete if it's a Bunny.net URL
    if (!url.includes('bunnycdn.com') && !url.includes('b-cdn.net')) {
      return false;
    }

    const storageZone = formData.bunnyStorageZone?.trim() || 'teste-aula';
    let accessKey = formData.bunnyAccessKey?.trim();
    let region = (formData.bunnyRegion || 'br')?.trim();
    
    accessKey = accessKey?.replace(/[^a-f0-9-]/gi, '');
    
    if (!accessKey) return false;

    // Extract filename from URL, removing query parameters
    const urlPath = url.split('?')[0];
    const fileName = urlPath.split('/').pop();
    if (!fileName) return false;

    const bunnyUrl = `https://storage.bunnycdn.com/${storageZone}/${fileName}`;

    try {
      console.log('🗑️ Apagando do Bunny.net:', bunnyUrl);
      let response = await fetch(bunnyUrl, {
        method: 'DELETE',
        headers: { 'AccessKey': accessKey },
      });

      if (!response.ok && region && region !== 'de') {
        const regionalUrl = `https://${region}.storage.bunnycdn.com/${storageZone}/${fileName}`;
        response = await fetch(regionalUrl, {
          method: 'DELETE',
          headers: { 'AccessKey': accessKey },
        });
      }

      return response.ok;
    } catch (error) {
      console.error('❌ Erro ao apagar do Bunny.net:', error);
      return false;
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = currentVideoTarget.current;
    if (!file || !target) return;

    setIsUploading(true);
    
    const fileUrl = await uploadToBunny(file);
    if (fileUrl) {
      updateLesson(target.modId, target.lessonId, { videoUrl: fileUrl }, target.courseId);
      alert('Vídeo carregado com SUCESSO!');
    }

    setIsUploading(false);
    e.target.value = '';
    currentVideoTarget.current = null;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = currentImageTarget.current;
    if (!file || !target) return;

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !allowedExtensions.includes(extension)) {
      alert('Por favor, selecione uma imagem válida (JPG, PNG, WEBP, GIF ou SVG).');
      return;
    }

    setIsUploading(true);
    const imageUrl = await uploadToBunny(file);

    if (imageUrl) {
      if (target.type === 'logo') {
        setFormData(prev => ({ ...prev, logoUrl: imageUrl }));
      } else if (target.type === 'banner') {
        setFormData(prev => ({ ...prev, bannerUrl: imageUrl }));
      } else if (target.type === 'module' && target.modId) {
        updateModule(target.modId, { thumbnailUrl: imageUrl }, target.courseId);
      } else if (target.type === 'lesson' && target.modId && target.lessonId) {
        updateLesson(target.modId, target.lessonId, { thumbnailUrl: imageUrl }, target.courseId);
      } else if (target.type === 'upsell-thumb' && target.courseId) {
        updateUpsell(target.courseId, { thumbnailUrl: imageUrl });
      } else if (target.type === 'upsell-banner' && target.courseId) {
        updateUpsell(target.courseId, { bannerUrl: imageUrl });
      }
      alert('Imagem carregada com SUCESSO!');
    }

    setIsUploading(false);
    e.target.value = '';
    currentImageTarget.current = null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const target = currentUploadTarget.current;
    if (!files || !target) return;

    let mod: Module | undefined;
    if (target.courseId) {
      const upsell = formData.upsellCourses.find(u => u.id === target.courseId);
      mod = upsell?.modules.find(m => m.id === target.modId);
    } else {
      mod = formData.modules.find(m => m.id === target.modId);
    }
    
    const lesson = mod?.lessons.find(l => l.id === target.lessonId);
    if (!lesson) return;

    const allowedExtensions = ['jpg', 'jpeg', 'gif', 'png', 'bmp', 'pdf', 'zip', 'rar', 'epub', 'xls', 'xlsx', 'xlsm', 'mp3', 'doc', 'docx', 'ppt', 'pptx'];
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const MAX_FILES = 10;

    const currentFilesCount = lesson.materials?.length || 0;
    const remainingSlots = MAX_FILES - currentFilesCount;

    if (remainingSlots <= 0) {
      alert(`Você já atingiu o limite de ${MAX_FILES} arquivos para esta aula.`);
      return;
    }

    const newMaterials: Material[] = [];
    const filesArray = Array.from(files).slice(0, remainingSlots) as File[];

    filesArray.forEach(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        alert(`Formato de arquivo não permitido: ${file.name}`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`O arquivo ${file.name} excede o limite de 100MB.`);
        return;
      }

      const fileUrl = URL.createObjectURL(file);
      newMaterials.push({
        id: `mat-${Date.now()}-${Math.random()}`,
        name: file.name,
        url: fileUrl
      });
    });

    if (newMaterials.length > 0) {
      if (target.courseId) {
        setFormData(prev => ({
          ...prev,
          upsellCourses: prev.upsellCourses.map(u => u.id === target.courseId ? {
            ...u,
            modules: u.modules.map(m => m.id === target.modId ? {
              ...m,
              lessons: m.lessons.map(l => l.id === target.lessonId ? { 
                ...l, 
                materials: [...(l.materials || []), ...newMaterials] 
              } : l)
            } : m)
          } : u)
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          modules: prev.modules.map(m => m.id === target.modId ? {
            ...m,
            lessons: m.lessons.map(l => l.id === target.lessonId ? { 
              ...l, 
              materials: [...(l.materials || []), ...newMaterials] 
            } : l)
          } : m)
        }));
      }
    }
    
    e.target.value = '';
    currentUploadTarget.current = null;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-10 bg-[#0a0a0a] min-h-screen">
      {/* Hidden File Input for Materials */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        multiple
        accept=".jpg,.jpeg,.gif,.png,.bmp,.pdf,.zip,.rar,.epub,.xls,.xlsx,.xlsm,.mp3,.doc,.docx,.ppt,.pptx"
      />

      {/* Hidden File Input for Images (Logo, Banner, Thumbs) */}
      <input 
        type="file" 
        ref={imageInputRef} 
        onChange={handleImageChange} 
        className="hidden" 
        accept="image/*"
      />

      {/* Hidden File Input for Videos (Bunny.net) */}
      <input 
        type="file" 
        ref={videoInputRef} 
        onChange={handleVideoChange} 
        className="hidden" 
        accept="video/*"
      />

      {showSaveToast && (
        <div className="fixed bottom-10 right-10 z-[200] animate-in fade-in slide-in-from-bottom-5 duration-300 bg-amber-500 text-black px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3">
          <CheckCircle size={24} />
          <span className="font-black uppercase tracking-tight">Publicado com Sucesso!</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic text-white">Painel do Produtor</h1>
          <p className="text-white/40 mt-1 md:mt-2 font-medium text-sm md:text-base">Personalize a experiência premium dos seus alunos.</p>
        </div>
        <button 
          onClick={handleSave}
          className="w-full md:w-auto bg-amber-500 text-black px-8 md:px-12 py-3 md:py-4 rounded font-black hover:bg-white transition-all shadow-xl shadow-amber-500/10 flex items-center justify-center gap-3 text-sm md:text-base"
        >
          <Save size={20} /> SALVAR ALTERAÇÕES
        </button>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 md:gap-12">
        <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 no-scrollbar lg:col-span-3">
          <button onClick={() => setActiveTab('general')} className={`flex-1 lg:w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-5 rounded-lg font-bold transition-all border whitespace-nowrap text-xs md:text-sm ${activeTab === 'general' ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-[#111] text-white/60 border-white/5 hover:border-white/20'}`}>
            <LayoutIcon size={18} /> GERAL
          </button>
          <button onClick={() => setActiveTab('modules')} className={`flex-1 lg:w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-5 rounded-lg font-bold transition-all border whitespace-nowrap text-xs md:text-sm ${activeTab === 'modules' ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-[#111] text-white/60 border-white/5 hover:border-white/20'}`}>
            <List size={18} /> CONTEÚDO
          </button>
          <button onClick={() => setActiveTab('appearance')} className={`flex-1 lg:w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-5 rounded-lg font-bold transition-all border whitespace-nowrap text-xs md:text-sm ${activeTab === 'appearance' ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-[#111] text-white/60 border-white/5 hover:border-white/20'}`}>
            <ImageIcon size={18} /> VISUAL
          </button>
          <button onClick={() => setActiveTab('upsells')} className={`flex-1 lg:w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-5 rounded-lg font-bold transition-all border whitespace-nowrap text-xs md:text-sm ${activeTab === 'upsells' ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-[#111] text-white/60 border-white/5 hover:border-white/20'}`}>
            <ShoppingCart size={18} /> UPSELLS
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`flex-1 lg:w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-5 rounded-lg font-bold transition-all border whitespace-nowrap text-xs md:text-sm ${activeTab === 'notifications' ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-[#111] text-white/60 border-white/5 hover:border-white/20'}`}>
            <Bell size={18} /> NOTIFICAÇÕES
          </button>
          <button onClick={() => setActiveTab('students')} className={`flex-1 lg:w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-5 rounded-lg font-bold transition-all border whitespace-nowrap text-xs md:text-sm ${activeTab === 'students' ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-[#111] text-white/60 border-white/5 hover:border-white/20'}`}>
            <Users size={18} /> ALUNOS
          </button>
          <button onClick={() => setActiveTab('bunny-files')} className={`flex-1 lg:w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-5 rounded-lg font-bold transition-all border whitespace-nowrap text-xs md:text-sm ${activeTab === 'bunny-files' ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-[#111] text-white/60 border-white/5 hover:border-white/20'}`}>
            <LayoutGrid size={18} /> ARQUIVOS BUNNY
          </button>
        </div>

        <div className="lg:col-span-9">
          {activeTab === 'general' && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 md:p-10 space-y-6 md:space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-white/40 uppercase tracking-widest">Nome do Treinamento</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-4 md:px-5 py-3 md:py-4 text-white focus:border-amber-500 outline-none text-sm md:text-base" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-white/40 uppercase tracking-widest">Instrutor</label>
                  <input type="text" value={formData.instructorName} onChange={(e) => setFormData({...formData, instructorName: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-4 md:px-5 py-3 md:py-4 text-white focus:border-amber-500 outline-none text-sm md:text-base" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-white/40 uppercase tracking-widest">Idioma do Aluno</label>
                  <div className="flex gap-2 md:gap-4">
                    <button 
                      onClick={() => setFormData({...formData, language: 'pt'})}
                      className={`flex-1 py-2 md:py-3 rounded-lg border flex items-center justify-center gap-1 md:gap-2 font-bold text-[10px] md:text-xs ${formData.language === 'pt' || !formData.language ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
                    >
                      🇧🇷 <span className="hidden xs:inline">PORTUGUÊS</span><span className="xs:hidden">PT</span>
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, language: 'es'})}
                      className={`flex-1 py-2 md:py-3 rounded-lg border flex items-center justify-center gap-1 md:gap-2 font-bold text-[10px] md:text-xs ${formData.language === 'es' ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
                    >
                      🇪🇸 <span className="hidden xs:inline">ESPAÑOL</span><span className="xs:hidden">ES</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-white/40 uppercase tracking-widest">Orientação da Thumbnail</label>
                  <div className="flex gap-2 md:gap-4">
                    <button 
                      onClick={() => setFormData({...formData, moduleThumbnailOrientation: 'horizontal'})}
                      className={`flex-1 py-2 md:py-3 rounded-lg border flex items-center justify-center gap-1 md:gap-2 font-bold text-[10px] md:text-xs ${formData.moduleThumbnailOrientation === 'horizontal' ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
                    >
                      <RectangleHorizontal size={14} /> <span className="hidden xs:inline">HORIZONTAL</span><span className="xs:hidden">HORIZ</span>
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, moduleThumbnailOrientation: 'vertical'})}
                      className={`flex-1 py-2 md:py-3 rounded-lg border flex items-center justify-center gap-1 md:gap-2 font-bold text-[10px] md:text-xs ${formData.moduleThumbnailOrientation === 'vertical' ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
                    >
                      <Square size={14} /> <span className="hidden xs:inline">VERTICAL</span><span className="xs:hidden">VERT</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-6">
                <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] italic">Configurações Bunny.net (Hospedagem de Vídeo)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Storage Zone Name</label>
                    <input 
                      type="text" 
                      value={formData.bunnyStorageZone} 
                      onChange={(e) => setFormData({...formData, bunnyStorageZone: e.target.value})} 
                      className="w-full bg-black border border-white/10 rounded px-4 py-3 text-white text-xs outline-none focus:border-amber-500" 
                      placeholder="ex: teste-aula"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Storage Access Key</label>
                    <input 
                      type="password" 
                      value={formData.bunnyAccessKey} 
                      onChange={(e) => setFormData({...formData, bunnyAccessKey: e.target.value})} 
                      className="w-full bg-black border border-white/10 rounded px-4 py-3 text-white text-xs outline-none focus:border-amber-500" 
                      placeholder="Sua chave de acesso"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Pull Zone Hostname (URL)</label>
                    <input 
                      type="text" 
                      value={formData.bunnyPullZoneUrl} 
                      onChange={(e) => setFormData({...formData, bunnyPullZoneUrl: e.target.value})} 
                      className="w-full bg-black border border-white/10 rounded px-4 py-3 text-white text-xs outline-none focus:border-amber-500" 
                      placeholder="ex: https://teste-aula.b-cdn.net"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Storage Region (ex: br, ny, sg ou vazio)</label>
                    <input 
                      type="text" 
                      value={formData.bunnyRegion} 
                      onChange={(e) => setFormData({...formData, bunnyRegion: e.target.value})} 
                      className="w-full bg-black border border-white/10 rounded px-4 py-3 text-white text-xs outline-none focus:border-amber-500" 
                      placeholder="br"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-white/20">
                  * Certifique-se de que a <b>Pull Zone</b> está conectada ao <b>Storage Zone</b> no painel do Bunny.net.
                </p>
              </div>

              {/* WEBHOOK SECTION */}
              <div className="pt-6 border-t border-white/5 space-y-8">
                <div className="flex items-center gap-3">
                  <Link2 size={16} className="text-amber-500" />
                  <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] italic">Integração Webhook</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hotmart */}
                  <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Hotmart</label>
                      <span className="text-[8px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold">ATIVO</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          readOnly
                          value={`${window.location.origin}/api/webhook/hotmart`}
                          className="flex-1 bg-black border border-white/5 rounded px-4 py-3 text-white/60 text-[10px] outline-none font-mono"
                        />
                        <button 
                          onClick={() => copyToClipboard(`${window.location.origin}/api/webhook/hotmart`)}
                          className="bg-white/5 hover:bg-white/10 text-white px-4 rounded font-black text-[10px] transition-all border border-white/10"
                        >
                          COPIAR
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] text-white/20 leading-relaxed">
                      Eventos: <b>PURCHASE_APPROVED</b>, <b>PURCHASE_COMPLETE</b>, <b>PURCHASE_REFUNDED</b>, <b>PURCHASE_CHARGEBACK</b>, <b>PURCHASE_CANCELED</b>.
                    </p>
                  </div>

                  {/* Kiwify */}
                  <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Kiwify</label>
                      <span className="text-[8px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold">ATIVO</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          readOnly
                          value={`${window.location.origin}/api/webhook/kiwify`}
                          className="flex-1 bg-black border border-white/5 rounded px-4 py-3 text-white/60 text-[10px] outline-none font-mono"
                        />
                        <button 
                          onClick={() => copyToClipboard(`${window.location.origin}/api/webhook/kiwify`)}
                          className="bg-white/5 hover:bg-white/10 text-white px-4 rounded font-black text-[10px] transition-all border border-white/10"
                        >
                          COPIAR
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] text-white/20 leading-relaxed">
                      Eventos: <b>paid</b>, <b>completed</b>, <b>refunded</b>, <b>chargeback</b>, <b>canceled</b>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="space-y-8">
              {renderModuleList(formData.modules)}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-10 space-y-12">
              <div className="space-y-6">
                <h3 className="text-xl font-bold border-l-4 border-amber-500 pl-4 text-white uppercase italic">Identidade Visual</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest">Logo Principal (PNG/SVG)</label>
                    <div className="flex flex-col gap-4">
                      <div className="w-32 h-32 rounded-2xl bg-black border border-white/5 p-4 flex items-center justify-center shadow-inner overflow-hidden">
                        <img src={formData.logoUrl} className="max-w-full max-h-full object-contain" alt="Logo preview" />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <input 
                          type="text" 
                          value={formData.logoUrl} 
                          onChange={(e) => setFormData({...formData, logoUrl: e.target.value})} 
                          className="flex-1 bg-black border border-white/10 rounded px-4 py-2 text-white outline-none text-[10px]" 
                          placeholder="URL da Logo"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => triggerImageUpload({ type: 'logo' })}
                            className="flex-1 sm:flex-none bg-amber-500 text-black px-4 py-2 rounded font-black text-[10px] flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg"
                          >
                            <Upload size={12} /> UPLOAD
                          </button>
                          {formData.logoUrl && (
                            <button 
                              onClick={async () => {
                                const urlToDelete = formData.logoUrl;
                                setConfirmDelete({
                                  title: 'Apagar Logo?',
                                  message: 'Tem certeza que deseja remover a logo permanentemente?',
                                  onConfirm: () => {
                                    setFormData(prev => ({ ...prev, logoUrl: '' }));
                                    if (urlToDelete) deleteFromBunny(urlToDelete);
                                    setConfirmDelete(null);
                                  }
                                });
                              }}
                              className="flex-1 sm:flex-none bg-red-500 text-white px-3 py-2 rounded font-black text-[10px] flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg"
                            >
                              <Trash2 size={12} /> APAGAR
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest">Cor de Destaque</label>
                    <div className="flex gap-6 items-center">
                      <input type="color" value={formData.accentColor} onChange={(e) => setFormData({...formData, accentColor: e.target.value})} className="w-14 h-14 bg-transparent border-none cursor-pointer" />
                      <input type="text" value={formData.accentColor} className="flex-1 bg-black border border-white/10 rounded px-5 py-3 text-white outline-none text-xs font-mono" readOnly />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-10 border-t border-white/5">
                <h3 className="text-xl font-bold border-l-4 border-amber-500 pl-4 text-white uppercase tracking-tight italic">Capa Principal do Curso (Banner)</h3>
                <div className="space-y-4">
                  <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl relative group">
                    <img src={formData.bannerUrl} className="w-full h-full object-cover" alt="Banner preview" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col sm:flex-row items-center justify-center gap-4 p-4">
                      <button 
                        onClick={() => triggerImageUpload({ type: 'banner' })}
                        className="w-full sm:w-auto bg-white text-black px-4 sm:px-8 py-2 sm:py-3 rounded-xl font-black text-xs sm:text-base flex items-center justify-center gap-3 hover:bg-amber-500 transition-all shadow-2xl"
                      >
                        <Upload size={20} /> ALTERAR IMAGEM
                      </button>
                      {formData.bannerUrl && (
                        <button 
                          onClick={async () => {
                          const urlToDelete = formData.bannerUrl;
                          setConfirmDelete({
                            title: 'Apagar Banner?',
                            message: 'Deseja remover o banner principal permanentemente?',
                            onConfirm: () => {
                              setFormData(prev => ({ ...prev, bannerUrl: '' }));
                              if (urlToDelete) deleteFromBunny(urlToDelete);
                              setConfirmDelete(null);
                            }
                          });
                        }}
                          className="w-full sm:w-auto bg-red-500 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-xl font-black text-xs sm:text-base flex items-center justify-center gap-3 hover:bg-red-600 transition-all shadow-2xl"
                        >
                          <Trash2 size={20} /> APAGAR
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      value={formData.bannerUrl} 
                      onChange={(e) => setFormData({...formData, bannerUrl: e.target.value})} 
                      placeholder="Ou cole a URL da Imagem aqui..." 
                      className="flex-1 bg-black border border-white/10 rounded-lg px-5 py-4 text-white outline-none focus:border-amber-500 text-xs" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'upsells' && (
            <div className="space-y-12">
              <div className="bg-[#111] border border-white/5 rounded-2xl p-6 sm:p-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-xl font-bold border-l-4 border-amber-500 pl-4 text-white uppercase italic">Cursos de Upsell (Ofertas Adicionais)</h3>
                  <button 
                    onClick={() => {
                      const newUpsell = {
                        id: `upsell-${Date.now()}`,
                        title: 'Novo Curso de Upsell',
                        description: 'Descrição da oferta de upsell',
                        thumbnailUrl: 'https://picsum.photos/seed/upsell/800/450',
                        bannerUrl: '',
                        instructorName: '',
                        supportUrl: '',
                        productId: '',
                        upsellUrl: '',
                        language: 'pt',
                        modules: []
                      };
                      setFormData({ ...formData, upsellCourses: [...(formData.upsellCourses || []), newUpsell] });
                    }}
                    className="w-full sm:w-auto bg-amber-500 text-black px-6 py-3 rounded-lg font-black text-xs flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg"
                  >
                    <Plus size={16} /> NOVO CURSO UPSELL
                  </button>
                </div>
                <p className="text-white/40 text-sm">Estes cursos aparecerão abaixo do curso principal na área do aluno.</p>
              </div>

              <div className="space-y-8">
                {(formData.upsellCourses || []).map((upsell, uIdx) => (
                  <div key={upsell.id} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-4 sm:p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                          <ShoppingCart className="text-black" size={24} />
                        </div>
                        <div>
                          <input 
                            value={upsell.title}
                            onChange={(e) => updateUpsell(upsell.id, { title: e.target.value })}
                            className="bg-transparent text-2xl font-black text-white italic outline-none border-b border-transparent focus:border-amber-500 w-full mb-1"
                            placeholder="Título do Curso Upsell"
                          />
                          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Oferta Adicional #{uIdx + 1}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setConfirmDelete({
                            title: 'Remover Upsell?',
                            message: 'Tem certeza que deseja remover este curso de upsell permanentemente?',
                            onConfirm: () => {
                              setFormData(prev => ({
                                ...prev,
                                upsellCourses: prev.upsellCourses.filter((_, i) => i !== uIdx)
                              }));
                              setConfirmDelete(null);
                            }
                          });
                        }}
                        className="p-3 text-white/10 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>

                    <div className="p-4 sm:p-10 space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Capa do Curso (Thumbnail)</label>
                          <div className="flex gap-4">
                            <input 
                              value={upsell.thumbnailUrl}
                              onChange={(e) => updateUpsell(upsell.id, { thumbnailUrl: e.target.value })}
                              className="flex-1 bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none text-xs truncate"
                              placeholder="URL da Imagem"
                            />
                            <button 
                              onClick={() => triggerImageUpload({ type: 'upsell-thumb', courseId: upsell.id })}
                              className="bg-amber-500 text-black px-6 rounded font-black text-xs flex items-center gap-2 hover:bg-white transition-all shadow-lg whitespace-nowrap"
                            >
                              <Upload size={14} /> UPLOAD
                            </button>
                            {upsell.thumbnailUrl && (
                              <button 
                                onClick={async () => {
                                  const urlToDelete = upsell.thumbnailUrl;
                                  setConfirmDelete({
                                    title: 'Apagar Capa?',
                                    message: 'Deseja remover esta imagem de capa?',
                                    onConfirm: () => {
                                      updateUpsell(upsell.id, { thumbnailUrl: '' });
                                      if (urlToDelete) deleteFromBunny(urlToDelete);
                                      setConfirmDelete(null);
                                    }
                                  });
                                }}
                                className="bg-red-500 text-white px-4 rounded font-black text-xs flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg whitespace-nowrap"
                              >
                                <Trash2 size={14} /> APAGAR
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Banner do Curso (Capa Larga)</label>
                          <div className="flex gap-4">
                            <input 
                              value={upsell.bannerUrl || ''}
                              onChange={(e) => updateUpsell(upsell.id, { bannerUrl: e.target.value })}
                              className="flex-1 bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none text-xs truncate"
                              placeholder="URL do Banner"
                            />
                            <button 
                              onClick={() => triggerImageUpload({ type: 'upsell-banner', courseId: upsell.id })}
                              className="bg-amber-500 text-black px-6 rounded font-black text-xs flex items-center gap-2 hover:bg-white transition-all shadow-lg whitespace-nowrap"
                            >
                              <Upload size={14} /> UPLOAD
                            </button>
                            {upsell.bannerUrl && (
                              <button 
                                onClick={async () => {
                                  const urlToDelete = upsell.bannerUrl;
                                  setConfirmDelete({
                                    title: 'Apagar Banner?',
                                    message: 'Deseja remover este banner permanentemente?',
                                    onConfirm: () => {
                                      updateUpsell(upsell.id, { bannerUrl: '' });
                                      if (urlToDelete) deleteFromBunny(urlToDelete);
                                      setConfirmDelete(null);
                                    }
                                  });
                                }}
                                className="bg-red-500 text-white px-4 rounded font-black text-xs flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg whitespace-nowrap"
                              >
                                <Trash2 size={14} /> APAGAR
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Nome do Instrutor</label>
                          <input 
                            value={upsell.instructorName || ''}
                            onChange={(e) => updateUpsell(upsell.id, { instructorName: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none text-xs focus:border-amber-500"
                            placeholder="Nome do Instrutor"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">URL de Suporte</label>
                          <input 
                            value={upsell.supportUrl || ''}
                            onChange={(e) => updateUpsell(upsell.id, { supportUrl: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none text-xs focus:border-amber-500"
                            placeholder="https://wa.me/..."
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Idioma do Curso</label>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => updateUpsell(upsell.id, { language: 'pt' })}
                              className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 font-bold text-[10px] ${upsell.language === 'pt' || !upsell.language ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
                            >
                              🇧🇷 PT
                            </button>
                            <button 
                              onClick={() => updateUpsell(upsell.id, { language: 'es' })}
                              className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 font-bold text-[10px] ${upsell.language === 'es' ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
                            >
                              🇪🇸 ES
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Descrição da Oferta</label>
                        <textarea 
                          value={upsell.description}
                          onChange={(e) => updateUpsell(upsell.id, { description: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none text-xs h-24 resize-none"
                          placeholder="Descreva o que o aluno ganha com este curso..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-white/5">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2"><Tag size={12} /> ID do Produto (Hotmart/Kiwify)</label>
                          <input 
                            value={upsell.productId}
                            onChange={(e) => updateUpsell(upsell.id, { productId: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none text-xs focus:border-amber-500"
                            placeholder="Ex: 123456"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={12} /> URL de Venda (Checkout)</label>
                          <input 
                            value={upsell.upsellUrl}
                            onChange={(e) => updateUpsell(upsell.id, { upsellUrl: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 text-white rounded px-5 py-3 outline-none text-xs focus:border-amber-500"
                            placeholder="https://pay.hotmart.com/..."
                          />
                        </div>
                      </div>

                      <div className="pt-10 border-t border-white/5">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 italic">Módulos deste Curso Upsell</h4>
                        </div>

                        {renderModuleList(upsell.modules, upsell.id)}
                      </div>
                    </div>
                  </div>
                ))}

                {(!formData.upsellCourses || formData.upsellCourses.length === 0) && (
                  <div className="py-20 text-center bg-[#111] border-2 border-dashed border-white/5 rounded-3xl">
                    <ShoppingCart size={48} className="text-white/5 mx-auto mb-6" />
                    <p className="text-white/20 font-black uppercase tracking-widest italic">Nenhum curso de upsell cadastrado</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'notifications' && (
            <div className="space-y-12">
              <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold border-l-4 border-amber-500 pl-4 text-white uppercase italic">Enviar Notificação em Tempo Real</h3>
                </div>
                <p className="text-white/40 text-sm">Esta notificação será enviada instantaneamente para todos os alunos conectados e NÃO ficará salva no painel.</p>
              </div>

              <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-10 space-y-8 shadow-2xl">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Título da Notificação</label>
                    <input 
                      type="text"
                      value={notifForm.title}
                      onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 text-white rounded px-5 py-4 outline-none focus:border-amber-500 transition-colors text-lg font-black italic"
                      placeholder="Ex: Nova Aula Disponível!"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Texto da Notificação</label>
                    <textarea 
                      value={notifForm.text}
                      onChange={(e) => setNotifForm({ ...notifForm, text: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 text-white rounded px-5 py-4 outline-none focus:border-amber-500 transition-colors text-sm h-32 resize-none"
                      placeholder="Descreva o aviso para o aluno..."
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Link de Redirecionamento (Opcional)</label>
                    <div className="flex gap-4">
                      <input 
                        type="text"
                        value={notifForm.link}
                        onChange={(e) => setNotifForm({ ...notifForm, link: e.target.value })}
                        className="flex-1 bg-black/40 border border-white/10 text-white rounded px-5 py-4 outline-none focus:border-amber-500 transition-colors text-xs"
                        placeholder="https://..."
                      />
                      <div className="bg-white/5 px-6 rounded flex items-center text-white/20 border border-white/5">
                        <LinkIcon size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={sendNotification}
                      disabled={isSendingNotif}
                      className="w-full bg-amber-500 text-black py-5 rounded-xl font-black text-lg flex items-center justify-center gap-4 hover:bg-white transition-all shadow-2xl shadow-amber-500/20 disabled:opacity-50 uppercase italic tracking-tighter"
                    >
                      {isSendingNotif ? <Loader2 className="animate-spin" size={24} /> : <Bell size={24} />}
                      ENVIAR AGORA PARA TODOS OS ALUNOS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'students' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-[#111] border border-white/5 rounded-3xl p-4 sm:p-8 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight">Gerenciar Alunos</h3>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <input 
                      type="email"
                      placeholder="E-mail do novo aluno"
                      value={newStudentEmail}
                      onChange={(e) => setNewStudentEmail(e.target.value)}
                      className="bg-black border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-amber-500 outline-none w-full sm:w-64"
                    />
                    <button 
                      onClick={handleAddStudent}
                      className="bg-amber-500 text-black px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-white transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> ADICIONAR
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input 
                    type="text"
                    placeholder="Pesquisar por e-mail..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/5">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">
                      <tr>
                        <th className="px-6 py-4">E-mail</th>
                        <th className="px-6 py-4">Produtos</th>
                        <th className="px-6 py-4">Data de Cadastro</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loadingStudents ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <Loader2 className="animate-spin text-amber-500 mx-auto" size={32} />
                          </td>
                        </tr>
                      ) : students.filter(s => s.email.includes(studentSearch.toLowerCase())).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-white/20 italic text-sm">
                            Nenhum aluno encontrado.
                          </td>
                        </tr>
                      ) : students.filter(s => s.email.includes(studentSearch.toLowerCase())).map((student) => (
                        <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-bold text-sm">{student.email}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {student.products?.map((p: string) => (
                                <span key={p} className="text-[8px] font-black bg-white/10 px-2 py-0.5 rounded uppercase tracking-tighter">{p}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-white/40">
                            {student.createdAt?.toDate ? student.createdAt.toDate().toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteStudent(student.email)}
                              className="p-2 text-white/20 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'bunny-files' && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-10 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <LayoutGrid size={20} className="text-amber-500" />
                  <h3 className="text-lg sm:text-xl font-bold text-white uppercase italic">Arquivos no BunnyCDN</h3>
                </div>
                <button 
                  onClick={fetchBunnyFiles}
                  disabled={loadingBunny}
                  className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  {loadingBunny ? <Loader2 className="animate-spin" size={14} /> : <Rocket size={14} />}
                  ATUALIZAR LISTA
                </button>
              </div>

              {loadingBunny ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-amber-500" size={40} />
                  <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Acessando Storage Zone...</p>
                </div>
              ) : bunnyFiles.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                  <p className="text-white/20 font-black uppercase tracking-widest italic">Nenhum arquivo encontrado no storage</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {bunnyFiles.map((file) => {
                    const pullZoneUrl = formData.bunnyPullZoneUrl?.trim()?.replace(/\/$/, '') || 'https://teste-aula.b-cdn.net';
                    const fileUrl = `${pullZoneUrl}/${file.ObjectName}`;
                    const isVideo = file.ObjectName.toLowerCase().endsWith('.mp4') || file.ObjectName.toLowerCase().endsWith('.webm');
                    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].some(ext => file.ObjectName.toLowerCase().endsWith(ext));

                    return (
                      <div key={file.Guid} className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-4 group hover:border-amber-500/50 transition-all">
                        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                          {isImage ? (
                            <img src={fileUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={file.ObjectName} />
                          ) : isVideo ? (
                            <video src={`${fileUrl}#t=0.5`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" muted />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20">
                              <FileText size={32} />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-[8px] font-bold text-white/60">
                            {(file.Length / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-white truncate" title={file.ObjectName}>{file.ObjectName}</p>
                          <p className="text-[8px] text-white/40 uppercase tracking-widest">
                            {new Date(file.LastChanged).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => copyToClipboard(fileUrl)}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-[10px] font-black transition-all border border-white/10 uppercase"
                          >
                            Copiar Link
                          </button>
                          <button 
                            onClick={async () => {
                              setConfirmDelete({
                                title: 'Apagar do Bunny?',
                                message: `Tem certeza que deseja apagar permanentemente o arquivo ${file.ObjectName}?`,
                                onConfirm: async () => {
                                  const success = await deleteFromBunny(fileUrl);
                                  if (success) {
                                    fetchBunnyFiles();
                                  } else {
                                    alert('Erro ao apagar arquivo');
                                  }
                                  setConfirmDelete(null);
                                }
                              });
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-lg transition-all border border-red-500/20"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="bg-[#111] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full relative z-10 shadow-2xl space-y-6">
            <div className="flex items-center gap-4 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold uppercase italic tracking-tight">{confirmDelete.title}</h3>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{confirmDelete.message}</p>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 text-white/40 hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete.onConfirm}
                className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminArea;
