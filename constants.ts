import { PastQuestion, Level, Executive, Lecturer, Announcement, PendingQuestion, CommunityGroup } from './types';

export const LEVELS: Level[] = [100, 200, 300, 400];

const MOCK_TEXT_CONTENT = `
SECTION A: MULTIPLE CHOICE QUESTIONS (Answer all)

1. Which of the following is NOT a function of money?
   a) Medium of exchange
   b) Store of value
   c) Standard of deferred payment
   d) Creator of inflation

2. The central bank of Nigeria was established in?
   a) 1958
   b) 1960
   c) 1963
   d) 1959

SECTION B: THEORY (Answer any 2)

1. Discuss the role of financial intermediaries in the economic development of a developing nation.
2. Differentiate between Money Market and Capital Market. Give 2 examples of instruments traded in each.
3. "Inflation is a necessary evil". Discuss this statement with relevant examples.
`;

export const MOCK_QUESTIONS: PastQuestion[] = [
  // 100 Level
  { id: 'q1', level: 100, courseCode: 'FIN 101', courseTitle: 'Introduction to Finance', year: 2023, textContent: MOCK_TEXT_CONTENT },
  { id: 'q2', level: 100, courseCode: 'ECN 101', courseTitle: 'Principles of Economics I', year: 2023, textContent: MOCK_TEXT_CONTENT },
  { id: 'q3', level: 100, courseCode: 'ACC 101', courseTitle: 'Introduction to Accounting I', year: 2022, textContent: MOCK_TEXT_CONTENT },
  { id: 'q4', level: 100, courseCode: 'FIN 102', courseTitle: 'Business Finance', year: 2022, textContent: MOCK_TEXT_CONTENT },

  // 200 Level
  { id: 'q5', level: 200, courseCode: 'FIN 201', courseTitle: 'Corporate Finance I', year: 2023, textContent: MOCK_TEXT_CONTENT },
  { id: 'q6', level: 200, courseCode: 'FIN 203', courseTitle: 'Financial Markets & Institutions', year: 2023, textContent: MOCK_TEXT_CONTENT },
  { id: 'q7', level: 200, courseCode: 'ACC 201', courseTitle: 'Financial Accounting I', year: 2022, textContent: MOCK_TEXT_CONTENT },
  { id: 'q8', level: 200, courseCode: 'FIN 202', courseTitle: 'Corporate Finance II', year: 2022, textContent: MOCK_TEXT_CONTENT },

  // 300 Level
  { id: 'q9', level: 300, courseCode: 'FIN 301', courseTitle: 'Investment Analysis', year: 2023, textContent: MOCK_TEXT_CONTENT },
  { id: 'q10', level: 300, courseCode: 'FIN 305', courseTitle: 'International Finance', year: 2023, textContent: MOCK_TEXT_CONTENT },
  { id: 'q11', level: 300, courseCode: 'FIN 307', courseTitle: 'Public Sector Finance', year: 2022, textContent: MOCK_TEXT_CONTENT },
  { id: 'q12', level: 300, courseCode: 'FIN 302', courseTitle: 'Portfolio Management', year: 2022, textContent: MOCK_TEXT_CONTENT },
  
  // 400 Level
  { id: 'q13', level: 400, courseCode: 'FIN 401', courseTitle: 'Advanced Corporate Finance', year: 2023, textContent: MOCK_TEXT_CONTENT },
  { id: 'q14', level: 400, courseCode: 'FIN 403', courseTitle: 'Financial Derivatives', year: 2023, textContent: MOCK_TEXT_CONTENT },
  { id: 'q15', level: 400, courseCode: 'FIN 405', courseTitle: 'Bank Management', year: 2022, textContent: MOCK_TEXT_CONTENT },
  { id: 'q16', level: 400, courseCode: 'FIN 407', courseTitle: 'Risk Management and Insurance', year: 2022, textContent: MOCK_TEXT_CONTENT },
  { id: 'q17', level: 400, courseCode: 'FIN 499', courseTitle: 'Project/Long Essay', year: 2023, textContent: MOCK_TEXT_CONTENT },
];

export const MOCK_EXECUTIVES: Executive[] = [
    { id: 'ex1', name: 'John Doe', position: 'President', imageUrl: 'https://placehold.co/400x400/EFEFEF/313131?text=JD', level: 400 },
    { id: 'ex2', name: 'Jane Smith', position: 'Vice President', imageUrl: 'https://placehold.co/400x400/EFEFEF/313131?text=JS', level: 300 },
    { id: 'ex3', name: 'Samuel Green', position: 'Secretary General', imageUrl: 'https://placehold.co/400x400/EFEFEF/313131?text=SG', level: 300 },
    { id: 'ex4', name: 'Emily White', position: 'Financial Secretary', imageUrl: 'https://placehold.co/400x400/EFEFEF/313131?text=EW', level: 400 },
    { id: 'ex5', name: 'Chris Black', position: 'Public Relations Officer', imageUrl: 'https://placehold.co/400x400/EFEFEF/313131?text=CB', level: 200 },
    { id: 'ex6', name: 'Anna Brown', position: 'Director of Socials', imageUrl: 'https://placehold.co/400x400/EFEFEF/313131?text=AB', level: 200 },
];

export const MOCK_LECTURERS: Lecturer[] = [
    { id: 'lec1', name: 'Dr. Evelyn Reed', title: 'Professor', imageUrl: 'https://placehold.co/400x400/E2E8F0/4A5568?text=ER', specialization: 'Corporate Finance, Mergers & Acquisitions' },
    { id: 'lec2', name: 'Dr. Marcus Hale', title: 'Associate Professor', imageUrl: 'https://placehold.co/400x400/E2E8F0/4A5568?text=MH', specialization: 'Investment Management, Behavioral Finance' },
    { id: 'lec3', name: 'Mrs. Clara Dunn', title: 'Senior Lecturer', imageUrl: 'https://placehold.co/400x400/E2E8F0/4A5568?text=CD', specialization: 'Financial Markets, Banking' },
    { id: 'lec4', name: 'Mr. Leo Vance', title: 'Lecturer I', imageUrl: 'https://placehold.co/400x400/E2E8F0/4A5568?text=LV', specialization: 'Public Finance, Risk Management' },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
    { id: 'an1', title: 'First Semester Examination Timetable Released', date: '2024-07-15', content: 'The official timetable for the first semester examinations has been released. Students are advised to check the department notice board or download a copy from the portal.', author: 'Admin' },
    { id: 'an2', title: 'Call for Submissions: departmental Journal', date: '2024-07-10', content: 'We are now accepting submissions for the annual departmental journal. All students, from 100 to 400 level, are encouraged to submit their research papers and articles.', author: 'Journal Committee' },
    { id: 'an3', title: 'Departmental Week Planning Meeting', date: '2024-07-05', content: 'There will be a general meeting for all students to discuss the upcoming departmental week. Your ideas and participation are highly welcome. Venue: LT-A, Time: 4:00 PM.', author: 'Executive Council' },
];

export const MOCK_PENDING_UPLOADS: PendingQuestion[] = [
  { id: 'pq1', level: 300, courseCode: 'FIN 310', courseTitle: 'Financial Modeling', year: 2024, textContent: 'Mock content...', submittedBy: 'student@aaua.edu.ng', submittedAt: '2024-07-20' },
];

export const MOCK_GROUPS: CommunityGroup[] = [
  { id: 'cg1', name: '100L General Study', platform: 'WhatsApp', link: 'https://whatsapp.com', description: 'General discussion for all 100 level students.', members: 240 },
  { id: 'cg2', name: 'Finance Gurus (300L)', platform: 'Telegram', link: 'https://telegram.org', description: 'Deep dive into investment analysis and modeling.', members: 150 },
  { id: 'cg3', name: 'Project Assistance 400L', platform: 'WhatsApp', link: 'https://whatsapp.com', description: 'Support group for final year projects.', members: 89 },
];