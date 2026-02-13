
export type Level = 100 | 200 | 300 | 400 | 'General';

export type Page = 'home' | 'questions' | 'executives' | 'lecturers' | 'announcements' | 'login' | 'admin' | 'profile' | 'community' | 'ai';

export type Role = 'student' | 'executive' | 'lecturer' | 'admin' | 'librarian' | 'vice_president' | 'supplement' | 'alumni';

export interface PastQuestion {
  id: string;
  level: Level;
  courseCode: string;
  courseTitle: string;
  year: number;
  semester?: 1 | 2 | 'N/A';
  lecturer?: string; 
  fileUrl?: string; 
  storagePath?: string; 
  pages?: string[]; 
  textContent?: string;
  uploadedBy?: string;
  uploadedByEmail?: string;
  uploadedByName?: string;
  status?: 'pending' | 'approved';
  createdAt?: string;
  category?: "Past Question" | "Lecture Note" | "Handout" | "Textbook" | "Test Question" | "Other";
}

export interface Executive {
  id: string;
  name: string;
  position: string;
  level: number;
  imageUrl?: string;
  quote?: string;
  whatsapp?: string;
  email?: string;
}

export interface Lecturer {
  id: string;
  name: string;
  title: string;
  imageUrl?: string;
  specialization?: string;
  order?: number;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  caption: string;
  date: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  platform: string;
  link: string;
  description: string;
}

export type PendingQuestion = PastQuestion;

export interface Announcement {
  id:string;
  title: string;
  date: string;
  content: string;
  author: string;
  imageUrl?: string;
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
  contributionPoints?: number; 
  savedQuestions?: string[]; 
  createdAt?: string;
  lastActive?: string; 
  isVerified?: boolean;
  isBanned?: boolean;
  banUntil?: string;
  aiCredits?: number; 
  lastCreditRefreshDate?: string; 
  aiImageCount?: number; 
  lastAiImageDate?: string; 
  badges?: string[];
  viewedSessionWrapTimestamp?: string;
  infractionCount?: number;
  chatBanUntil?: string;
}

export interface AiSettings {
  isAvailable: boolean;
  shutdownReason?: string;
  lastExhaustionDate?: string;
}

export interface TestResult {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  totalQuestions: number;
  level: Level;
  date: string;
}

export interface MarketplaceItem {
    id: string;
    title: string;
    description: string;
    price: number;
    category: 'Goods' | 'Services' | 'Accommodation';
    imageUrl: string;
    sellerId: string;
    sellerName: string;
    sellerVerified: boolean;
    contact: string;
    createdAt: string;
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    createdAt: string;
    read: boolean;
    title?: string;
    link?: string;
}
