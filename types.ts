
export type Level = 100 | 200 | 300 | 400;

export type Page = 'home' | 'questions' | 'executives' | 'lecturers' | 'announcements' | 'login' | 'admin' | 'profile' | 'community';

export type Role = 'student' | 'executive' | 'lecturer' | 'admin';

export interface PastQuestion {
  id: string;
  level: Level;
  courseCode: string;
  courseTitle: string;
  year: number;
  fileUrl?: string; // Optional now, as we might have textContent instead
  textContent?: string; // For AI generated questions stored in DB
  file?: File; // Optional file object for new uploads
}

export interface PendingQuestion extends PastQuestion {
  submittedBy: string;
  submittedByEmail?: string;
  submittedAt: string;
}

export interface Executive {
  id: string;
  name: string;
  position: string;
  imageUrl: string;
  level: Level;
}

export interface Lecturer {
  id: string;
  name: string;
  title: string;
  imageUrl: string;
  specialization: string;
}

export interface Announcement {
  id:string;
  title: string;
  date: string; // Using string for simplicity, can be Date object
  content: string;
  author: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  matricNumber?: string;
  role: Role;
  level?: Level;
  avatarUrl?: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  platform: 'WhatsApp' | 'Telegram' | 'Discord';
  link: string;
  description: string;
  members: number;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  caption: string;
  date: string;
}
