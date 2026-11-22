
(function () {
    'use strict';

    const STORAGE_KEY = 'cm_site_visitor_id';

    function getVisitorId() {
        let id = localStorage.getItem(STORAGE_KEY);

        if (!id) {
            id = window.crypto?.randomUUID
                ? window.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(STORAGE_KEY, id);
        }

        return id;
    }

    async function trackVisit() {
        try {
            await fetch('/analytics/visit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    visitorId: getVisitorId(),
                    path: window.location.pathname
                }),
                keepalive: true
            });
        } catch (error) {
            console.error('Visit tracking failed:', error);
        }
    }

    trackVisit();
})();
