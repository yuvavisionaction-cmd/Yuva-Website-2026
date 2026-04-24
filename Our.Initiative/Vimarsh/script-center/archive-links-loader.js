/**
 * ================================================
 * VIMARSH ARCHIVE LINKS - DYNAMIC INTERNAL LINKING
 * ================================================
 *
 * Keeps archive links in sync across all year pages.
 */

(function () {
    const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2019];

    const TAGLINES = {
        2026: 'Voices of Change',
        2025: 'Reimagining Futures',
        2024: 'Ideas that Inspire',
        2023: 'Innovation and Impact',
        2022: 'Voices of Change',
        2019: 'Awakened Bharat'
    };

    function detectCurrentYear() {
        const path = (window.location.pathname || '').toLowerCase();
        const pathMatch = path.match(/vimarsh(\d{4})\.html$/i);
        if (pathMatch) {
            return parseInt(pathMatch[1], 10);
        }

        const hero = document.querySelector('#hero h1')?.textContent || '';
        const hero2kMatch = hero.match(/2k(\d{2})/i);
        if (hero2kMatch) {
            return parseInt(`20${hero2kMatch[1]}`, 10);
        }

        const title = document.title || '';
        const titleMatch = title.match(/(20\d{2})/);
        if (titleMatch) {
            return parseInt(titleMatch[1], 10);
        }

        return null;
    }

    function buildCardMarkup(year) {
        const tagline = TAGLINES[year] || `Vimarsh ${year}`;

        return `
            <div class="archive-card">
                <div class="archive-inner">
                    <div class="archive-front" data-year="${year}">
                        <span>${year}</span>
                    </div>
                    <div class="archive-back">
                        <p>${tagline}</p>
                        <a href="vimarsh${year}.html">View</a>
                    </div>
                </div>
            </div>
        `;
    }

    function initArchiveLinks() {
        const archiveGrid = document.querySelector('#archives .archive-grid');
        if (!archiveGrid) return;

        const currentYear = detectCurrentYear();

        const yearsToShow = AVAILABLE_YEARS
            .filter(year => year !== currentYear)
            .sort((a, b) => b - a);

        archiveGrid.innerHTML = yearsToShow.map(buildCardMarkup).join('');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initArchiveLinks);
    } else {
        initArchiveLinks();
    }
})();
