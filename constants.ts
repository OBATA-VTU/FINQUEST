import { PastQuestion, Level, Executive, Lecturer, Announcement, PendingQuestion, CommunityGroup } from './types';

export const LEVELS: Level[] = [100, 200, 300, 400, 'General'];

// Empty mocks to force data fetching from Firebase
export const MOCK_QUESTIONS: PastQuestion[] = [];
export const MOCK_EXECUTIVES: Executive[] = [];
export const MOCK_LECTURERS: Lecturer[] = [];
export const MOCK_ANNOUNCEMENTS: Announcement[] = [];
export const MOCK_PENDING_UPLOADS: PendingQuestion[] = [];
export const MOCK_GROUPS: CommunityGroup[] = [];