// ===== YUVA VERTICALS - GENERAL JAVASCRIPT =====
class VerticalPageManager {
    constructor() {
        this.init();
    }
    init() {
        this.initializeFlashSystem();
        // Get page title to customize welcome message
        const pageTitle = document.title.split('-')[0].replace('YUVA India', 'Page').trim();
        this.showInfo('Welcome!', `Exploring the ${pageTitle} vertical.`);
    }

    // Dynamic Flash Notification System
    initializeFlashSystem() {
        if (!document.getElementById('flash-container')) {
            const flashContainer = document.createElement('div');
            flashContainer.id = 'flash-container';
            flashContainer.className = 'flash-container';
            document.body.appendChild(flashContainer);
        }
    }
    showFlashNotification(type, title, message, duration = 5000) {
        const container = document.getElementById('flash-container');
        if (!container) return;
        const notification = document.createElement('div');
        notification.className = `flash-notification ${type}`;
        const icons = { success: 'fas fa-check', error: 'fas fa-times', warning: 'fas fa-exclamation-triangle', info: 'fas fa-info-circle' };
        notification.innerHTML = `<div class="flash-icon"><i class="${icons[type]}"></i></div><div class="flash-content"><div class="flash-title">${title}</div><div class="flash-message">${message}</div></div><button class="flash-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
        container.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        if (duration > 0) setTimeout(() => this.removeFlashNotification(notification), duration);
    }
    removeFlashNotification(notification) {
        if (notification && notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }
    showInfo(title, message) { this.showFlashNotification('info', title, message, 4000); }
}

async function loadVerticalGallery() {
    const gallerySection = document.querySelector('.gallery-section');
    const photoGrid = document.getElementById('photo-grid-dynamic');
    if (!gallerySection || !photoGrid) return;

    const verticalName = (gallerySection.getAttribute('data-vertical') || '').trim();
    if (!verticalName) return;

    if (!window.supabase) {
        console.error('[VerticalGallery] Supabase SDK not loaded.');
        return;
    }

    const SUPABASE_URL = 'https://jgsrsjwmywiirtibofth.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_5KtvO0cEHfnECBoyp2CQnw_RC3_x2me';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    photoGrid.innerHTML = '<p style="color: white;">Loading gallery...</p>';

    try {
        // Primary source: metadata table used by upload form.
        const { data: images, error } = await supabaseClient
            .from('vertical_events')
            .select('image_url, event_name, event_date, event_location')
            .eq('vertical_name', verticalName)
            .order('event_date', { ascending: false })
            .limit(10);

        if (error) {
            throw error;
        }

        if (images && images.length > 0) {
            renderGalleryItems(photoGrid, images.map((image) => ({
                image_url: image.image_url,
                event_name: image.event_name,
                event_date: image.event_date,
                event_location: image.event_location
            })));
            return;
        }

        // Fallback: storage-only files (for images uploaded directly to bucket).
        const candidateFolders = await resolveStorageFolderCandidates(supabaseClient, verticalName);
        const fileItems = [];

        for (const folderName of candidateFolders) {
            const { data: storageFiles, error: storageError } = await supabaseClient
                .storage
                .from('vertical_images')
                .list(folderName, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

            if (storageError) {
                continue;
            }

            (storageFiles || [])
                .filter((item) => item && /\.(png|jpe?g|webp|gif|bmp)$/i.test(item.name || ''))
                .forEach((item) => {
                    const storagePath = `${folderName}/${item.name}`;
                    const { data: publicData } = supabaseClient.storage.from('vertical_images').getPublicUrl(storagePath);
                    fileItems.push({
                        image_url: publicData.publicUrl,
                        event_name: item.name,
                        event_date: item.created_at || item.updated_at || null,
                        event_location: `Uploaded image (${folderName})`
                    });
                });
        }

        fileItems.sort((a, b) => new Date(b.event_date || 0) - new Date(a.event_date || 0));

        if (fileItems.length > 0) {
            renderGalleryItems(photoGrid, fileItems.slice(0, 10));
        } else {
            photoGrid.innerHTML = '<p style="color: white;">No event photos have been uploaded for this vertical yet.</p>';
        }
    } catch (err) {
        console.error('[VerticalGallery] Failed to load gallery:', err);
        photoGrid.innerHTML = '<p style="color: white;">Could not load gallery at this time.</p>';
    }
}

function renderGalleryItems(container, items) {
    container.innerHTML = '';
    items.forEach((image) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';

        const dateLabel = image.event_date
            ? new Date(image.event_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'Date unavailable';

        photoItem.innerHTML = `
            <img src="${image.image_url}" alt="${image.event_name || 'Vertical image'}" loading="lazy">
            <div class="photo-caption">
                <strong>${image.event_name || 'Uploaded image'}</strong>
                <span>${dateLabel}${image.event_location ? ` - ${image.event_location}` : ''}</span>
            </div>
        `;
        container.appendChild(photoItem);
    });
}

async function resolveStorageFolderCandidates(supabaseClient, verticalName) {
    const normalizedTarget = normalizeVerticalName(verticalName);
    const candidates = new Set([verticalName]);

    const { data: rootItems, error } = await supabaseClient
        .storage
        .from('vertical_images')
        .list('', { limit: 200 });

    if (error || !rootItems) {
        return Array.from(candidates);
    }

    rootItems.forEach((item) => {
        const name = (item?.name || '').trim();
        if (!name) return;
        if (normalizeVerticalName(name) === normalizedTarget) {
            candidates.add(name);
        }
    });

    return Array.from(candidates);
}

function normalizeVerticalName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

document.addEventListener('DOMContentLoaded', () => {
    new VerticalPageManager();
    loadVerticalGallery();
});