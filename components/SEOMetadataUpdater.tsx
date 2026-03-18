import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEOMetadataUpdater dynamically changes the document title and meta tags
 * based on the current application route. This ensures search engines index
 * pages correctly and social previews match the page content.
 */
export const SEOMetadataUpdater: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    let title = "FINSA AAUA | Department of Finance Hub";
    let description = "Access past questions, CBT practice, and community news at the Department of Finance, AAUA.";

    switch (pathname) {
      case '/':
        title = "FINSA AAUA | Official Digital Portal";
        description = "The official digital platform for Finance students at Adekunle Ajasin University. Led by Comr. Sidiku Michael and the 2025/2026 Executive Council.";
        break;
      case '/dashboard':
        title = "FINSA AAUA | My Dashboard";
        description = "Manage your academic journey, view test scores and contribution points.";
        break;
      case '/questions':
        title = "FINSA AAUA | Past Questions Page";
        description = "Access the largest collection of Finance past questions, lecture notes, and academic materials at Adekunle Ajasin University. Download verified resources for all levels.";
        break;
      case '/library':
        title = "FINSA AAUA | E-Library";
        description = "Explore a vast collection of academic, professional, and entertainment literature powered by Google Books.";
        break;
      case '/community':
        title = "FINSA AAUA | Student Hub & Lounge";
        description = "Join the conversation! Connect with fellow Finance students, share ideas, and stay updated with departmental activities in our official student lounge.";
        break;
      case '/gallery':
        title = "FINSA AAUA | Moments & Milestones";
        description = "Relive the best moments of the Department of Finance. Explore photos from induction ceremonies, sports festivals, and academic seminars.";
        break;
      case '/announcements':
        title = "FINSA AAUA | Official Bulletins";
        description = "Get real-time updates on departmental news, exam schedules, and official notices from the Finance Executive Council.";
        break;
      case '/executives':
        title = "FINSA AAUA | Leadership Council";
        description = "Meet the Comr. Sidiku Michael-led executive team dedicated to serving the interests of Finance students at AAUA.";
        break;
      case '/lecturers':
        title = "FINSA AAUA | Distinguished Faculty";
        description = "Learn more about the academic experts and mentors shaping the future of finance professionals at Adekunle Ajasin University.";
        break;
      case '/test':
        title = "FINSA AAUA | Exam Prep Center";
        description = "Sharpen your skills with our AI-powered CBT practice platform. Simulate real exam conditions and track your progress.";
        break;
      case '/marketplace':
        title = "FINSA AAUA | Campus Marketplace";
        description = "The trusted community marketplace for Finance students. Buy and sell textbooks, gadgets, and services securely.";
        break;
      case '/lost-and-found':
        title = "FINSA AAUA | Campus Recovery";
        description = "Lost something? Found something? Report it here to help fellow students recover their belongings within the AAUA community.";
        break;
      case '/arcade':
        title = "FINSA Arcade | Edutainment Zone";
        description = "Learn finance through play! Engage in trivia, timeline challenges, and earn contribution points while having fun.";
        break;
      case '/ai':
        title = "FINSA AI | Academic Assistant";
        description = "Leverage cutting-edge AI to summarize notes, solve complex finance problems, and generate study guides instantly.";
        break;
      case '/download-app':
        title = "FINSA AAUA | Mobile Experience";
        description = "Download the official FINSA AAUA mobile app for Android and iOS. Stay connected with the department on the go.";
        break;
      default:
        if (pathname.startsWith('/admin')) {
          title = "FINSA AAUA | Admin Control Panel";
        }
        break;
    }

    // Update Document Title
    document.title = title;

    // Update Meta Description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }

    // Update Open Graph tags for better social sharing previews
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', description);

  }, [pathname]);

  return null;
};