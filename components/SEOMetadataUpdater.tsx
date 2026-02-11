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
    let title = "FINSA AAUA | Department of Finance Portal";
    let description = "Access past questions, CBT practice, and community news at the Department of Finance, AAUA.";

    switch (pathname) {
      case '/':
        title = "FINSA AAUA | Welcome to the Finance Portal";
        break;
      case '/dashboard':
        title = "My Dashboard | FINSA Portal";
        description = "Manage your academic journey, view test scores and contribution points.";
        break;
      case '/questions':
        title = "Resources Archives | Past Questions & Notes";
        description = "Browse and download verified past questions and lecture notes for all levels.";
        break;
      case '/community':
        title = "Student Lounge | FINSA Community";
        description = "Connect with peers in the official Finance student chat lounge.";
        break;
      case '/gallery':
        title = "Department Gallery | Captured Moments";
        description = "View photos and milestones from the Department of Finance activities and events.";
        break;
      case '/announcements':
        title = "News & Updates | Latest Bulletins";
        description = "Stay informed with official announcements from the Finance Department.";
        break;
      case '/executives':
        title = "Executive Council | Department Leadership";
        description = "Meet the student leaders guiding the Department of Finance.";
        break;
      case '/lecturers':
        title = "Academic Faculty | Finance Lecturers";
        description = "Meet the distinguished academic faculty and lecturers of the Department of Finance (FAMASSA).";
        break;
      case '/test':
        title = "CBT Practice Center | Sharpen Your Skills";
        description = "Take AI-powered mock exams and quizzes to prepare for your finance exams.";
        break;
      case '/marketplace':
        title = "Marketplace | Student Trade Hub";
        description = "Buy and sell goods or services within the Finance student community.";
        break;
      case '/lost-and-found':
        title = "Lost & Found | Helping Reclaim Items";
        description = "Post and find lost items within the AAUA campus community.";
        break;
      case '/arcade':
        title = "FINSA Arcade | Educational Games";
        description = "Play trivia and finance timeline games to learn and earn points.";
        break;
      default:
        if (pathname.startsWith('/admin')) {
          title = "Admin Control Panel | FINSA Portal";
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