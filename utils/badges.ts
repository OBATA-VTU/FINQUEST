import { User } from '../types';
import { collection, query, where, getDocs, getCountFromServer, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rank: number; // Higher is better
}

export const BADGE_DEFINITIONS: Record<string, Omit<Badge, 'id'>> = {
  PIONEER: { name: 'Pioneer', description: 'Joined the platform during the launch period.', icon: '🚀', rank: 50 },
  CONTRIBUTOR_1: { name: 'First Contribution', description: 'Your first approved material upload.', icon: '🌱', rank: 10 },
  CONTRIBUTOR_5: { name: 'Serial Contributor', description: 'Uploaded 5 approved materials.', icon: '📚', rank: 30 },
  CONTRIBUTOR_10: { name: 'Librarian Aide', description: 'Uploaded 10+ approved materials.', icon: '🏛️', rank: 60 },
  SHARP_SHOOTER: { name: 'Sharp Shooter', description: 'Scored 80%+ in any CBT practice.', icon: '🎯', rank: 20 },
  GENIUS: { name: 'Genius', description: 'Scored 95%+ in any CBT practice.', icon: '💡', rank: 40 },
  VETERAN_5: { name: 'Test Veteran', description: 'Completed 5 CBT practice sessions.', icon: '🎖️', rank: 25 },
  VETERAN_20: { name: 'Exam Warrior', description: 'Completed 20+ CBT practice sessions.', icon: '⚔️', rank: 55 },
  COMMUNITY_STARTER: { name: 'Community Starter', description: 'Sent your first message in the lounge.', icon: '💬', rank: 5 },
};

export const getBadge = (id: string): Badge | undefined => {
    if (BADGE_DEFINITIONS[id]) {
        return { id, ...BADGE_DEFINITIONS[id] };
    }
    return undefined;
};

// This function will check criteria and return NEW badges the user has earned.
export const checkAndAwardBadges = async (user: User): Promise<string[]> => {
    const earnedBadges: Set<string> = new Set(user.badges || []);
    const newBadges: string[] = [];
    
    // --- Criteria checks ---

    // 1. Pioneer Badge (based on creation date)
    const launchDate = new Date('2026-01-10T12:00:00+01:00');
    const twoWeeksAfter = new Date(launchDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const userCreatedAt = user.createdAt ? new Date(user.createdAt) : new Date();
    if (userCreatedAt <= twoWeeksAfter && !earnedBadges.has('PIONEER')) {
        newBadges.push('PIONEER');
        earnedBadges.add('PIONEER');
    }

    // 2. Contribution Badges (requires DB query)
    const contributionsQuery = query(collection(db, 'questions'), where('uploadedBy', '==', user.id), where('status', '==', 'approved'));
    const contributionsSnap = await getCountFromServer(contributionsQuery);
    const contributionCount = contributionsSnap.data().count;

    if (contributionCount >= 1 && !earnedBadges.has('CONTRIBUTOR_1')) { newBadges.push('CONTRIBUTOR_1'); earnedBadges.add('CONTRIBUTOR_1'); }
    if (contributionCount >= 5 && !earnedBadges.has('CONTRIBUTOR_5')) { newBadges.push('CONTRIBUTOR_5'); earnedBadges.add('CONTRIBUTOR_5'); }
    if (contributionCount >= 10 && !earnedBadges.has('CONTRIBUTOR_10')) { newBadges.push('CONTRIBUTOR_10'); earnedBadges.add('CONTRIBUTOR_10'); }

    // 3. Test-related badges (requires DB query for count & high score)
    const testsQuery = query(collection(db, 'test_results'), where('userId', '==', user.id));
    const testsSnap = await getDocs(testsQuery);
    const testCount = testsSnap.size;
    let highScore = 0;
    testsSnap.forEach(doc => {
        if (doc.data().score > highScore) {
            highScore = doc.data().score;
        }
    });

    if (testCount >= 5 && !earnedBadges.has('VETERAN_5')) { newBadges.push('VETERAN_5'); earnedBadges.add('VETERAN_5'); }
    if (testCount >= 20 && !earnedBadges.has('VETERAN_20')) { newBadges.push('VETERAN_20'); earnedBadges.add('VETERAN_20'); }
    if (highScore >= 80 && !earnedBadges.has('SHARP_SHOOTER')) { newBadges.push('SHARP_SHOOTER'); earnedBadges.add('SHARP_SHOOTER'); }
    if (highScore >= 95 && !earnedBadges.has('GENIUS')) { newBadges.push('GENIUS'); earnedBadges.add('GENIUS'); }

    // 4. Community Badge
    const chatQuery = query(collection(db, 'community_messages'), where('senderId', '==', user.id), limit(1));
    const chatSnap = await getDocs(chatQuery);
    if (!chatSnap.empty && !earnedBadges.has('COMMUNITY_STARTER')) { newBadges.push('COMMUNITY_STARTER'); earnedBadges.add('COMMUNITY_STARTER'); }

    return newBadges;
};
