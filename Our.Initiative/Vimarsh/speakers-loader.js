/**
 * ================================================
 * VIMARSH SPEAKERS - DYNAMIC SUPABASE LOADER
 * ================================================
 *
 * Loads speaker images only from current page year folder:
 * gallery_photos/photos/vimarsh/{year}/speakers/
 */

const baseSupabaseConfig = (typeof window !== 'undefined' && window.SUPABASE_CONFIG)
    ? window.SUPABASE_CONFIG
    : ((typeof SUPABASE_CONFIG !== 'undefined') ? SUPABASE_CONFIG : null);

const SPEAKER_STORAGE_CONFIG = {
    PROJECT_URL: baseSupabaseConfig?.PROJECT_URL || '',
    ANON_KEY: baseSupabaseConfig?.ANON_KEY || '',
    BUCKET: baseSupabaseConfig?.BUCKET_NAME || '',
    BASE_FOLDER: 'photos/vimarsh'
};

function isSpeakerImage(fileName) {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName || '');
}

function detectVimarshPageYear() {
    const path = (window.location.pathname || '').toLowerCase();
    const pathMatch = path.match(/vimarsh(\d{4})\.html$/i);
    if (pathMatch) return pathMatch[1];

    const heroTitle = document.querySelector('#hero h1')?.textContent || '';
    const hero2kMatch = heroTitle.match(/2k(\d{2})/i);
    if (hero2kMatch) return `20${hero2kMatch[1]}`;

    const title = document.title || '';
    const title2kMatch = title.match(/2k(\d{2})/i);
    if (title2kMatch) return `20${title2kMatch[1]}`;

    const titleYearMatch = title.match(/(20\d{2})/);
    if (titleYearMatch) return titleYearMatch[1];

    return null;
}

function getSpeakerFolder(year) {
    return `${SPEAKER_STORAGE_CONFIG.BASE_FOLDER}/${year}/speakers`;
}

function getPublicSpeakerUrl(folderPath, relativeFileName) {
    return `${SPEAKER_STORAGE_CONFIG.PROJECT_URL}/storage/v1/object/public/${SPEAKER_STORAGE_CONFIG.BUCKET}/${folderPath}/${relativeFileName}`;
}

function showNoSpeakerPhotos(yearLabel) {
    const speakersSection = document.getElementById('speakers') || document.querySelector('.speakers');
    const slider = document.getElementById('speakersSlider');
    const existingNotice = document.querySelector('.speakers-empty-state');

    if (slider) {
        slider.style.display = 'none';
    }

    if (!speakersSection || existingNotice) return;

    const notice = document.createElement('p');
    notice.className = 'speakers-empty-state';
    notice.textContent = `No speaker photos available for ${yearLabel}.`;
    notice.style.textAlign = 'center';
    notice.style.fontSize = '1.1rem';
    notice.style.fontWeight = '700';
    notice.style.color = '#7a0000';
    notice.style.margin = '20px auto 0';
    notice.style.maxWidth = '900px';
    notice.style.padding = '14px 18px';
    notice.style.border = '1px solid rgba(122, 0, 0, 0.2)';
    notice.style.borderRadius = '12px';
    notice.style.background = '#fff7eb';
    speakersSection.appendChild(notice);
}

async function fetchSpeakerFiles(folderPath) {
    const listUrl = `${SPEAKER_STORAGE_CONFIG.PROJECT_URL}/storage/v1/object/list/${SPEAKER_STORAGE_CONFIG.BUCKET}`;

    const response = await fetch(listUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SPEAKER_STORAGE_CONFIG.ANON_KEY}`,
            'apikey': SPEAKER_STORAGE_CONFIG.ANON_KEY
        },
        body: JSON.stringify({
            prefix: folderPath,
            limit: 1000,
            offset: 0,
            sortBy: { column: 'created_at', order: 'asc' }
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to list speaker files: ${response.status}`);
    }

    const files = await response.json();
    return files
        .filter(file => file?.name && isSpeakerImage(file.name))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

async function initSpeakerImages() {
    try {
        const cards = Array.from(document.querySelectorAll('.speaker-card'));
        if (cards.length === 0) return;

        if (!SPEAKER_STORAGE_CONFIG.PROJECT_URL || !SPEAKER_STORAGE_CONFIG.ANON_KEY || !SPEAKER_STORAGE_CONFIG.BUCKET) {
            const pageYear = detectVimarshPageYear() || 'this year';
            showNoSpeakerPhotos(pageYear);
            console.warn('SUPABASE_CONFIG is missing for speaker loader.');
            return;
        }

        const pageYear = detectVimarshPageYear();
        if (!pageYear) {
            showNoSpeakerPhotos('this year');
            console.warn('Could not detect Vimarsh page year. Speaker photos hidden by design.');
            return;
        }

        const folderPath = getSpeakerFolder(pageYear);
        const speakerFiles = await fetchSpeakerFiles(folderPath);
        if (speakerFiles.length === 0) {
            showNoSpeakerPhotos(pageYear);
            console.warn(`No speaker images found in ${folderPath}.`);
            return;
        }

        cards.forEach((card, index) => {
            const img = card.querySelector('.speaker-front img');
            const file = speakerFiles[index];

            if (!img) return;

            if (!file) {
                card.style.display = 'none';
                return;
            }

            img.src = getPublicSpeakerUrl(folderPath, file.name);
            img.onerror = function () {
                const parentCard = this.closest('.speaker-card');
                if (parentCard) {
                    parentCard.style.display = 'none';
                }
            };
        });

        console.log(`Loaded ${Math.min(cards.length, speakerFiles.length)} speaker images from ${folderPath}`);
    } catch (error) {
        const pageYear = detectVimarshPageYear() || 'this year';
        showNoSpeakerPhotos(pageYear);
        console.error('Speaker loader failed:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpeakerImages);
} else {
    initSpeakerImages();
}
