
export type Level = 100 | 200 | 300 | 400;

export type Page = 'home' | 'questions' | 'executives' | 'lecturers' | 'announcements' | 'login' | 'admin' | 'profile' | 'community';

export type Role = 'student' | 'executive' | 'lecturer' | 'admin' | 'librarian' | 'vice_president' | 'supplement' | 'alumni';

export type BadgeType = 'pioneer' | 'first_step' | 'scholar' | 'legend' | 'brainiac' | 'archivist' | 'veteran' | 'polymath' | 'chatty' | 'top_10' | 'perfectionist' | 'helper' | 'regular' | 'librarian_pick';

export interface Badge {
    id: BadgeType;
    label: string;
    icon: string;
    description: string;
    color: string;
}

/**
 * Added missing interface for Executive to support departmental leadership profiles.
 */
export interface Executive {
  id: string;
  name: string;
  position: string;
  imageUrl?: string;
  quote?: string;
  whatsapp?: string;
  email?: string;
  level?: Level;
}

/**
 * Added missing interface for Lecturer to support the faculty directory.
 */
export interface Lecturer {
  id: string;
  name: string;
  title: string;
  imageUrl: string;
  specialization?: string;
}

/**
 * Added missing interface for Announcement to support news and updates.
 */
export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author?: string;
  imageUrl?: string;
}

export interface PastQuestion {
  id: string;
  level: Level;
  courseCode: string;
  courseTitle: string;
  year: number;
  lecturer?: string;
  fileUrl?: string; 
  storagePath?: string; 
  pages?: string[]; 
  textContent?: string;
  uploadedBy?: string;
  uploadedByEmail?: string;
  status?: 'pending' | 'approved';
  createdAt?: string;
  category?: "Past Question" | "Lecture Note" | "Handout" | "Textbook" | "Other";
}

/**
 * Added type alias for PendingQuestion to resolve import error in constants.ts.
 */
export type PendingQuestion = PastQuestion;

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
  badges?: BadgeType[];
  testCount?: number;
  messageCount?: number;
  uploadCount?: number;
  createdAt?: string;
  lastActive?: string; 
  isVerified?: boolean;
  isBanned?: boolean;
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
