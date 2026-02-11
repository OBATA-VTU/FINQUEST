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
        title = "FINSA AAUA | Resources Archives";
        description = "Browse and download verified past questions and lecture notes for all levels in the Finance Department.";
        break;
      case '/community':
        title = "FINSA AAUA | Student Lounge";
        description = "Connect with peers in the official Finance student chat lounge.";
        break;
      case '/gallery':
        title = "FINSA AAUA | Photo Gallery";
        description = "View photos and milestones from the Department of Finance activities and events.";
        break;
      case '/announcements':
        title = "FINSA AAUA | News & Bulletins";
        description = "Stay informed with official announcements from the Finance Department Executive Council.";
        break;
      case '/executives':
        title = "FINSA AAUA | Executive Council";
        description = "Meet the student leaders: President Comr. Sidiku Michael, VP Obe Bankole Michael, and more.";
        break;
      case '/lecturers':
        title = "FINSA AAUA | Academic Faculty";
        description = "Meet the distinguished academic faculty and lecturers of the Department of Finance (FAMASSA).";
        break;
      case '/test':
        title = "FINSA AAUA | CBT Practice Center";
        description = "Take AI-powered mock exams and quizzes to prepare for your finance exams.";
        break;
      case '/marketplace':
        title = "FINSA AAUA | Student Marketplace";
        description = "Buy and sell goods or services within the Finance student community.";
        break;
      case '/lost-and-found':
        title = "FINSA AAUA | Lost & Found";
        description = "Post and find lost items within the AAUA campus community.";
        break;
      case '/arcade':
        title = "FINSA Arcade | Finance Games";
        description = "Play trivia and finance timeline games to learn and earn points.";
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