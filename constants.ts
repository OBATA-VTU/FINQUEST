
import { PastQuestion, Level, Executive, Lecturer, Announcement, PendingQuestion, CommunityGroup, BadgeType } from './types';

export const LEVELS: Level[] = [100, 200, 300, 400];

export const BADGE_MAP: Record<BadgeType, { icon: string, label: string, description: string }> = {
    'pioneer': { icon: '🌱', label: 'Pioneer', description: 'One of the first 100 users to join the portal.' },
    'first_step': { icon: '🎯', label: 'Contributor', description: 'Made your first approved contribution to the archives.' },
    'scholar': { icon: '🎓', label: 'Scholar', description: 'Earned over 50 contribution points.' },
    'legend': { icon: '👑', label: 'Legend', description: 'A top-tier contributor with over 150 points.' },
    'brainiac': { icon: '🧠', label: 'Brainiac', description: 'Achieved a perfect 100% score in a CBT practice test.' },
    'archivist': { icon: '🏛️', label: 'Archivist', description: 'Contributed 5 or more approved materials.' },
    'veteran': { icon: '🛡️', label: 'Veteran', description: 'An active member for over one year.' },
    'polymath': { icon: '🌐', label: 'Polymath', description: 'Contributed materials for 3 or more different levels.' },
    'chatty': { icon: '💬', label: 'Communicator', description: 'Sent over 50 messages in the community lounge.' },
    'perfectionist': { icon: '✨', label: 'Perfectionist', description: 'Completed 10 or more CBT practice tests.' },
    'top_10': { icon: '🔥', label: 'Top 10', description: 'Ranked in the top 10 on the leaderboard.' },
    'helper': { icon: '🤝', label: 'Helper', description: 'Recognized for helping others in the community.' },
    'regular': { icon: '📅', label: 'Regular', description: 'Logged in consistently for 7 consecutive days.' },
    'librarian_pick': { icon: '⭐', label: 'Librarian\'s Pick', description: 'Submitted an exceptionally high-quality material.' },
};


// Empty mocks to force data fetching from Firebase
export const MOCK_QUESTIONS: PastQuestion[] = [];
export const MOCK_EXECUTIVES: Executive[] = [];
export const MOCK_LECTURERS: Lecturer[] = [];
export const MOCK_ANNOUNCEMENTS: Announcement[] = [];
export const MOCK_PENDING_UPLOADS: PendingQuestion[] = [];
export const MOCK_GROUPS: CommunityGroup[] = [];
