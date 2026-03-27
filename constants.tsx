
import { CourseConfig } from './types';

export const INITIAL_COURSE_DATA: CourseConfig = {
  name: "RP Business 2.0",
  description: "O treinamento definitivo para escala de negócios digitais com foco em ROI e gestão de alta performance.",
  bannerUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop",
  logoUrl: "https://picsum.photos/seed/rp-logo/200/200",
  accentColor: "#fbbf24",
  supportUrl: "https://wa.me/55000000000",
  instructorName: "Ricardo Pereira",
  moduleThumbnailOrientation: 'horizontal',
  bunnyStorageZone: 'teste-aula',
  bunnyAccessKey: '22baafe9-93d9-4501-b18ebad00488-7e0a-4567',
  bunnyPullZoneUrl: 'https://aevopro.b-cdn.net',
  bunnyRegion: 'br',
  language: 'pt',
  modules: [
    {
      id: "mod-1",
      title: "BOAS VINDAS E SUPORTE",
      thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop",
      hideTitle: false,
      lessons: [
        {
          id: "les-1",
          title: "Seja bem-vindo ao RP Business",
          thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop",
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          description: "Nesta aula você entenderá o mapa da mina para os próximos meses.",
          materials: [],
          tags: "introdução, boas vindas",
          releaseDays: 0
        }
      ]
    },
    {
      id: "mod-2",
      title: "FORNECEDORES COM NOTA FISCAL",
      thumbnailUrl: "https://images.unsplash.com/photo-1586769852044-692d6e3703a0?q=80&w=800&auto=format&fit=crop",
      hideTitle: false,
      lessons: [
        {
          id: "les-3",
          title: "Lista de Fornecedores Gold",
          thumbnailUrl: "https://images.unsplash.com/photo-1586769852044-692d6e3703a0?q=80&w=800&auto=format&fit=crop",
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          description: "Acesso direto aos contatos dos maiores fornecedores do Brasil.",
          materials: [
            { id: 'mat-1', name: 'PDF - Tabela de Preços', url: '#' }
          ],
          tags: "fornecedores, atacado",
          releaseDays: 7
        }
      ]
    }
  ],
  upsellCourses: []
};
