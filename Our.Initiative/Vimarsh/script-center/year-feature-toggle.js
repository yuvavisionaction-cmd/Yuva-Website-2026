(function () {
    // Edit this object only to control per-year visibility.
    // If a year is missing, fallback behavior is used.
    const YEAR_FEATURES = {
        2023: { registration: false, volunteer: false, schedulePopup: false, scheduleModal: false },
        2024: { registration: false, volunteer: false, schedulePopup: false, scheduleModal: false },
        2025: { registration: false, volunteer: false, schedulePopup: false, scheduleModal: false },
        2026: { registration: false, volunteer: false, schedulePopup: false, scheduleModal: false }
    };

    const FEATURE_DEFAULTS = {
        registration: false,
        volunteer: false,
        schedulePopup: false,
        scheduleModal: false
    };

    function detectPageYear() {
        const bodyYear = Number(document.body?.dataset?.vimarshYear || "");
        if (Number.isFinite(bodyYear) && bodyYear > 2000) return bodyYear;

        const path = (window.location.pathname || "").toLowerCase();
        const pathMatch = path.match(/vimarsh(\d{4})\.html$/i);
        if (pathMatch) return Number(pathMatch[1]);

        const title = document.title || "";
        const titleMatch = title.match(/(20\d{2})/);
        if (titleMatch) return Number(titleMatch[1]);

        return new Date().getFullYear();
    }

    function hideElement(el) {
        if (!el) return;
        el.setAttribute("aria-hidden", "true");
        el.style.display = "none";
    }

    function applyFeatureVisibility(featureFlags) {
        const featureMap = {
            "registration-nav": featureFlags.registration,
            "registration-hero": featureFlags.registration,
            "volunteer-hero": featureFlags.volunteer,
            "schedule-popup": featureFlags.schedulePopup
        };

        document.querySelectorAll("[data-vimarsh-feature]").forEach((el) => {
            const key = el.getAttribute("data-vimarsh-feature");
            if (!(key in featureMap)) return;
            if (!featureMap[key]) hideElement(el);
        });
    }

    function setupSchedulePopup(enabled) {
        const popup = document.getElementById("brochurePopup");
        if (!popup) return;

        if (!enabled) {
            hideElement(popup);
            return;
        }

        let popupShown = false;

        document.addEventListener("scroll", function () {
            if (popupShown) return;

            const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
            if (!docHeight) return;

            const scrollPercent = ((window.scrollY + window.innerHeight) / docHeight) * 100;

            if (scrollPercent >= 50) {
                popupShown = true;
                popup.style.display = "block";

                setTimeout(function () {
                    popup.style.display = "none";
                }, 5000);
            }
        }, { passive: true });
    }

    const currentYear = new Date().getFullYear();
    const pageYear = detectPageYear();

    const baseFlags = pageYear === currentYear
        ? { registration: true, volunteer: true, schedulePopup: false, scheduleModal: false }
        : { registration: false, volunteer: false, schedulePopup: false, scheduleModal: false };

    const yearFlags = Object.assign({}, FEATURE_DEFAULTS, baseFlags, YEAR_FEATURES[pageYear] || {});

    // Shared flags consumed by other scripts (e.g., schedule modal in script.js).
    window.VIMARSH_FEATURE_FLAGS = yearFlags;

    applyFeatureVisibility(yearFlags);
    setupSchedulePopup(yearFlags.schedulePopup);
})();
