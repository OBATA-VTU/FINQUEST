
import { useEffect, useContext, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

/**
 * Component to handle browser-level push notifications and real-time alerts.
 * Safely checks for Web Notifications API support to prevent ReferenceError in non-supporting environments.
 */
export const NotificationHandler = () => {
    const auth = useContext(AuthContext);
    const { showNotification: showUINotification } = useNotification();
    
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        // Safely check for browser support on mount
        const supported = typeof window !== 'undefined' && 'Notification' in window;
        setIsSupported(supported);
        if (supported) {
            setPermission(Notification.permission);
        }
    }, []);

    // Effect for listening to Firestore changes
    useEffect(() => {
        // Only run if supported, authenticated, and granted
        if (!isSupported || !auth?.user || permission !== 'granted') return;

        // Listener for admin broadcasts (global notifications)
        const broadcastQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', 'all')
        );

        const unsubBroadcasts = onSnapshot(broadcastQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" && document.hidden) {
                    const data = change.doc.data();
                    // Avoid triggering for old notifications (created > 1 min ago)
                    const notificationTime = data.createdAt ? new Date(data.createdAt).getTime() : 0;
                    if (Date.now() - notificationTime < 60000) { 
                        try {
                            new Notification(data.title || 'FINSA Announcement', {
                                body: data.message,
                                icon: '/logo.svg'
                            });
                        } catch (e) {
                            console.warn("Native notification failed:", e);
                        }
                    }
                }
            });
        });

        // Listener for new lost & found items
        const lostAndFoundQuery = query(
            collection(db, 'lost_items'),
            where('status', '==', 'approved')
        );

        const unsubLostFound = onSnapshot(lostAndFoundQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                // Don't notify the finder themselves
                if (change.type === "added" && document.hidden && data.finderId !== auth.user?.id) {
                    const itemTime = data.dateFound ? new Date(data.dateFound).getTime() : 0;
                    if (Date.now() - itemTime < 60000) { 
                        try {
                            new Notification('New Lost & Found Item', {
                                body: `A ${data.itemName} was found at ${data.locationFound}.`,
                                icon: '/logo.svg'
                            });
                        } catch (e) {
                            console.warn("Native notification failed:", e);
                        }
                    }
                }
            });
        });

        return () => {
            unsubBroadcasts();
            unsubLostFound();
        };

    }, [auth?.user, permission, isSupported]);

    return null; // This component does not render anything
};
