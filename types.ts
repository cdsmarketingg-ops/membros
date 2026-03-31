
export interface Material {
  id: string;
  name: string;
  url: string;
}

export interface Lesson {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  description: string;
  materials: Material[];
  tags: string;
  releaseDays: number;
}

export interface Module {
  id: string;
  title: string;
  thumbnailUrl: string;
  lessons: Lesson[];
  hideTitle?: boolean;
  isUpsell?: boolean;
  upsellUrl?: string;
  productId?: string;
}

export interface UpsellCourse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  bannerUrl?: string;
  instructorName?: string;
  supportUrl?: string;
  productId: string;
  upsellUrl: string;
  language?: 'pt' | 'es';
  modules: Module[];
}

export interface Notification {
  id: string;
  title: string;
  text: string;
  link?: string;
  createdAt: string;
}

export interface CourseConfig {
  name: string;
  description: string;
  bannerUrl: string;
  logoUrl: string;
  accentColor: string;
  supportUrl: string;
  instructorName: string;
  moduleThumbnailOrientation: 'horizontal' | 'vertical';
  bunnyStorageZone: string;
  bunnyAccessKey: string;
  bunnyPullZoneUrl: string;
  bunnyRegion: string;
  language?: 'pt' | 'es';
  modules: Module[];
  upsellCourses: UpsellCourse[];
  notifications?: Notification[];
}

export type AppView = 'student' | 'admin';
export type StudentView = 'home' | 'player' | 'module-lessons';
