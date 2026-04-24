(function () {
    // Update these values in one place to set year-wise locations.
    const FOOTER_MAP_BY_YEAR = {
        2023: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3504.3474427132214!2d77.23517347567943!3d28.559327775704684!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ce3cac5814c0d%3A0x322ad4f3a9e3c631!2sLady%20Shri%20Ram%20College%20For%20Women%E2%80%93Delhi%20University%20(LSR%E2%80%93DU)!5e0!3m2!1sen!2sin!4v1756800843009!5m2!1sen!2sin",
        2024: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d11774.258837657411!2d77.13209610108353!3d28.67444391489323!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d03bd392e758f%3A0x6bf7748ebacf9fa!2sShyama%20Prasad%20Mukherji%20College%20for%20Women!5e0!3m2!1sen!2sin!4v1756804778250!5m2!1sen!2sin",
        2025: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d106008.52621079609!2d77.16394434310826!3d28.525928729588113!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ce26abe15c749%3A0xef3a70a01bb79361!2sKamala%20Nehru%20College!5e0!3m2!1sen!2sin!4v1760335962519!5m2!1sen!2sin",
        2026: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d106008.52621079609!2d77.16394434310826!3d28.525928729588113!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ce26abe15c749%3A0xef3a70a01bb79361!2sKamala%20Nehru%20College!5e0!3m2!1sen!2sin!4v1760335962519!5m2!1sen!2sin"
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

    const pageYear = detectPageYear();
    const FOOTER_MAP_EMBED_URL = FOOTER_MAP_BY_YEAR[pageYear] || FOOTER_MAP_BY_YEAR[2026];

    window.VIMARSH_FOOTER_MAP_BY_YEAR = FOOTER_MAP_BY_YEAR;
    window.VIMARSH_FOOTER_MAP_EMBED_URL = FOOTER_MAP_EMBED_URL;

    const mapFrames = document.querySelectorAll("iframe[data-vimarsh-footer-map]");
    mapFrames.forEach((frame) => {
        frame.src = FOOTER_MAP_EMBED_URL;
    });
})();
