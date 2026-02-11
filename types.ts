
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
  lecturer?: string; // Added for smart finder
  fileUrl?: string; 
  storagePath?: string; // Path in Dropbox/Storage for deletion
  pages?: string[]; // Array of image URLs if uploaded as multiple images
  textContent?: string;
  uploadedBy?: string;
  uploadedByEmail?: string;
  uploadedByName?: string;
  status?: 'pending' | 'approved';
  createdAt?: string;
  category?: "Past Question" | "Lecture Note" | "Handout" | "Textbook" | "Test Question" | "Other";
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
  whatsapp?: string;
  email?: string;
  quote?: string;
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
  isVerified?: boolean; // Added for blue tick
  isBanned?: boolean; // Added for suspension
  banUntil?: string; // ISO string for temporary bans
  aiImageCount?: number; // Daily tracker
  lastAiImageDate?: string; // YYYY-MM-DD
  badges?: string[];
  viewedSessionWrapTimestamp?: string;
  infractionCount?: number;
  chatBanUntil?: string;
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