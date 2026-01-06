
import { useEffect, useContext, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const NotificationHandler = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [permission, setPermission] = useState(Notification.permission);

    // Effect to handle notification permission request
    useEffect(() => {
        if (permission === 'default') {
            // This could be enhanced with a small banner in the UI
            // For now, let's keep it simple and not prompt automatically.
            // A user can be prompted via a UI button if desired.
        }
    }, [permission]);

    // Function to request permission (can be tied to a UI button)
    const requestPermission = () => {
        Notification.requestPermission().then(setPermission);
    };

    // Effect for listening to Firestore changes
    useEffect(() => {
        if (!auth?.user || permission !== 'granted') return;

        const now = Timestamp.now();

        // Listener for admin broadcasts
        const broadcastQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', 'all'),
            where('createdAt', '>', new Date(now.toMillis() - 5000).toISOString()) // only new
        );

        const unsubBroadcasts = onSnapshot(broadcastQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" && document.hidden) {
                    const data = change.doc.data();
                    new Notification('FINSA Announcement', {
                        body: data.message,
                        icon: '/logo.svg'
                    });
                }
            });
        });

        // Listener for new lost & found items
        const lostAndFoundQuery = query(
            collection(db, 'lost_items'),
            where('status', '==', 'approved'),
            where('dateFound', '>', new Date(now.toMillis() - 5000).toISOString()) // only new
        );

        const unsubLostFound = onSnapshot(lostAndFoundQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                // Prevent showing notification for your own post
                if (change.type === "added" && document.hidden && data.finderId !== auth.user?.id) {
                    new Notification('New Lost & Found Item', {
                        body: `A ${data.itemName} was found at ${data.locationFound}.`,
                        icon: '/logo.svg'
                    });
                }
            });
        });

        return () => {
            unsubBroadcasts();
            unsubLostFound();
        };

    }, [auth?.user, permission]);

    return null; // This component does not render anything
};
