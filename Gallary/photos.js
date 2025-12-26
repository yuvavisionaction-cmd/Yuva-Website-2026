// ===== PHOTO GALLERY JAVASCRIPT - SUPABASE STORAGE 2025 =====

class PhotoGalleryManager {
    constructor() {
        this.events = [];
        this.eventYears = {};

        // Supabase Configuration
        this.supabaseUrl = 'https://jgsrsjwmywiirtibofth.supabase.co';
        this.supabaseKey = 'sb_publishable_5KtvO0cEHfnECBoyp2CQnw_RC3_x2me';
        this.supabaseClient = null;
        this.storageBucket = 'gallery_photos';

        // State management
        this.state = {
            items: [],
            filtered: [],
            activeEvent: null,
            activeYear: null,
            cursor: 0,
            page: 0,
            pageSize: 60,
            isLoading: false,
            imagesToLoadInBatch: 0,
            imagesLoadedInBatch: 0,
        };

        // Elements
        this.elements = {
            masonry: null,
            shownCount: null,
            totalCount: null,
            metaCount: null,
            eventFilters: null,
            yearFilters: null,
            activeFilters: null,
            sentinel: null,
            backToTop: null,
            progressBarContainer: null,
            progressBar: null,
        };

        this.init();
    }

    async init() {
        this.initializeSupabase();
        this.initializeElements();
        this.initializeFlashSystem();
        this.bindEvents();
        await this.loadPhotosFromStorage();
        this.renderFilters();
        this.setupIntersectionObserver();
        this.setupScrollHandler();
        this.showInfo('Gallery Ready', 'Photo gallery initialized successfully');
    }

    // ===== SUPABASE INITIALIZATION =====
    initializeSupabase() {
        if (typeof window.supabase === 'undefined') {
            this.showError('Initialization Error', 'Supabase library not loaded. Please refresh the page.');
            throw new Error('Supabase library not loaded');
        }
        this.supabaseClient = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
    }

    // ===== FLASH NOTIFICATION SYSTEM =====
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
        setTimeout(() => { notification.classList.add('show'); }, 100);
        if (duration > 0) { setTimeout(() => { this.removeFlashNotification(notification); }, duration); }
        return notification;
    }

    removeFlashNotification(notification) {
        if (notification && notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => { if (notification.parentElement) { notification.remove(); } }, 300);
        }
    }

    showError(title, message) { this.showFlashNotification('error', title, message, 8000); }
    showSuccess(title, message) { this.showFlashNotification('success', title, message, 6000); }
    showWarning(title, message) { this.showFlashNotification('warning', title, message, 5000); }
    showInfo(title, message) { this.showFlashNotification('info', title, message, 4000); }

    // ===== ELEMENT INITIALIZATION =====
    initializeElements() {
        this.elements.masonry = document.getElementById('masonry');
        this.elements.shownCount = document.getElementById('shownCount');
        this.elements.totalCount = document.getElementById('totalCount');
        this.elements.metaCount = document.querySelector('.meta__count');
        this.elements.eventFilters = document.getElementById('eventFilters');
        this.elements.yearFilters = document.getElementById('yearFilters');
        this.elements.activeFilters = document.getElementById('activeFilters');
        this.elements.sentinel = document.getElementById('sentinel');
        this.elements.backToTop = document.getElementById('backToTop');

        // Dynamically inject progress bar HTML
        const metaSection = this.elements.metaCount.parentElement;
        if (metaSection) {
            const progressBarHTML = `<div class="progress-loader" id="imageProgressBarContainer" style="display: none;"><div class="progress-loader__bar" id="imageProgressBar"></div></div>`;
            metaSection.insertAdjacentHTML('afterend', progressBarHTML);
            this.elements.progressBarContainer = document.getElementById('imageProgressBarContainer');
            this.elements.progressBar = document.getElementById('imageProgressBar');
        }

        const missingElements = Object.entries(this.elements).filter(([key, element]) => !element).map(([key]) => key);
        if (missingElements.length > 0) {
            this.showError('Initialization Error', `Missing elements: ${missingElements.join(', ')}`);
            throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
        }
    }

    // ===== EVENT BINDING =====
    bindEvents() {
        if (this.elements.backToTop) { this.elements.backToTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.clearFlashMessages(); } });
    }

    setupScrollHandler() {
        window.addEventListener('scroll', this.debounce(() => {
            if (window.scrollY > 600) { this.elements.backToTop.classList.add('show'); }
            else { this.elements.backToTop.classList.remove('show'); }
        }, 100));
    }

    // ===== LOAD PHOTOS FROM SUPABASE STORAGE =====
    async loadPhotosFromStorage() {
        try {
            this.showInfo('Loading Photos', 'Fetching photos from storage...');

            // List all folders in the photos directory
            const { data: categories, error: categoriesError } = await this.supabaseClient.storage
                .from(this.storageBucket)
                .list('photos', {
                    limit: 100,
                    offset: 0,
                });

            if (categoriesError) throw categoriesError;

            this.state.items = [];
            this.state.availableEvents = new Set();
            this.eventYears = {};

            // Process each category folder
            for (const categoryFolder of categories) {
                if (!categoryFolder.name) continue;

                const categoryName = this.formatCategoryName(categoryFolder.name);
                this.state.availableEvents.add(categoryName);

                // List years within this category
                const { data: years, error: yearsError } = await this.supabaseClient.storage
                    .from(this.storageBucket)
                    .list(`photos/${categoryFolder.name}`, {
                        limit: 100,
                        offset: 0,
                    });

                if (yearsError) {
                    console.error(`Error loading years for ${categoryFolder.name}:`, yearsError);
                    continue;
                }

                // Process each year folder
                for (const yearFolder of years) {
                    if (!yearFolder.name) continue;

                    const year = parseInt(yearFolder.name, 10);
                    if (isNaN(year)) continue;

                    // Store year for this event
                    if (!this.eventYears[categoryName]) {
                        this.eventYears[categoryName] = new Set();
                    }
                    this.eventYears[categoryName].add(year);

                    // List images within this year folder
                    const { data: images, error: imagesError } = await this.supabaseClient.storage
                        .from(this.storageBucket)
                        .list(`photos/${categoryFolder.name}/${yearFolder.name}`, {
                            limit: 1000,
                            offset: 0,
                        });

                    if (imagesError) {
                        console.error(`Error loading images for ${categoryFolder.name}/${yearFolder.name}:`, imagesError);
                        continue;
                    }

                    // Add each image to items
                    images.forEach((image) => {
                        if (!image.name || !image.name.match(/\.(jpg|jpeg|png|webp)$/i)) return;

                        const fullPath = `photos/${categoryFolder.name}/${yearFolder.name}/${image.name}`;
                        const { data: urlData } = this.supabaseClient.storage
                            .from(this.storageBucket)
                            .getPublicUrl(fullPath);

                        this.state.items.push({
                            id: this.state.items.length + 1,
                            event: categoryName,
                            year: year,
                            src: urlData.publicUrl,
                            height: 220 + Math.floor(this.pseudoRandom(this.state.items.length * 7) * 220),
                            alt: `${categoryName} ${year} Photo`,
                            category: categoryFolder.name
                        });
                    });
                }
            }

            // Sort event names alphabetically
            this.events = Array.from(this.state.availableEvents).sort();

            this.showSuccess('Photos Loaded', `Loaded ${this.state.items.length} photos from ${this.events.length} categories`);
        } catch (error) {
            console.error('Failed to load photos from storage:', error);
            this.showError('Storage Error', 'Could not load photos from storage. Please check your connection.');
            this.generateFallbackDataset();
        }
    }

    formatCategoryName(folderName) {
        // Convert folder names to display names
        const nameMap = {
            'vimarsh': 'Vimarsh',
            'samarpan': 'Samarpan',
            'bharatparv': 'Bharat Parv',
            'events': 'Events',
            'activities': 'Activities'
        };
        return nameMap[folderName.toLowerCase()] || folderName.charAt(0).toUpperCase() + folderName.slice(1);
    }

    generateFallbackDataset() {
        this.state.items = [];
        this.state.availableEvents = new Set();
        this.eventYears = {};
        this.events = [];
        this.showWarning('Fallback Mode', 'No images available - Storage could not be accessed');
    }

    pseudoRandom(index) { let x = Math.sin(index + 1) * 10000; return x - Math.floor(x); }

    // ===== FILTER RENDERING =====
    renderFilters() {
        this.renderEventChips();
        this.renderYearChips();
        this.showPlaceholderMessage();
        this.updateCounts(0, this.state.items.length);
        this.renderActiveMeta();
        if (this.elements.metaCount) { this.elements.metaCount.style.visibility = 'hidden'; }
    }

    renderEventChips() {
        if (!this.elements.eventFilters) return;
        this.elements.eventFilters.innerHTML = '';
        this.events.forEach((label) => {
            const btn = document.createElement('button');
            btn.className = `chip${this.state.activeEvent === label ? ' active' : ''}`;
            btn.textContent = label;
            btn.setAttribute('aria-pressed', this.state.activeEvent === label ? 'true' : 'false');
            btn.addEventListener('click', () => this.onEventChange(label));
            this.elements.eventFilters.appendChild(btn);
        });
    }

    renderYearChips() {
        if (!this.elements.yearFilters) return;
        this.elements.yearFilters.innerHTML = '';

        const activeEventYears = this.eventYears[this.state.activeEvent];
        if (!activeEventYears || activeEventYears.size === 0) {
            return;
        }

        const allBtn = document.createElement('button');
        allBtn.className = `chip${this.state.activeYear === null ? ' active' : ''}`;
        allBtn.textContent = 'All Years';
        allBtn.addEventListener('click', () => this.onYearChange(null));
        this.elements.yearFilters.appendChild(allBtn);

        const years = Array.from(activeEventYears).sort((a, b) => b - a);
        years.forEach((year) => {
            const btn = document.createElement('button');
            btn.className = `chip${this.state.activeYear === year ? ' active' : ''}`;
            btn.textContent = String(year);
            btn.addEventListener('click', () => this.onYearChange(year));
            this.elements.yearFilters.appendChild(btn);
        });
    }

    // ===== FILTER HANDLING =====
    onEventChange(label) {
        if (this.state.activeEvent === label) return;
        this.state.activeEvent = label;
        this.state.activeYear = null;
        this.renderEventChips();
        this.renderYearChips();
        this.applyFilters(true);
        this.showInfo('Filter Applied', `Showing photos from ${label}`);
    }

    onYearChange(year) {
        if (this.state.activeYear === year) return;
        this.state.activeYear = year;
        this.renderYearChips();
        this.applyFilters(true);
        const yearText = year ? year : 'All Years';
        this.showInfo('Year Filter Applied', `Showing ${this.state.activeEvent} photos from ${yearText}`);
    }

    applyFilters(reset = false) {
        if (reset) {
            this.state.page = 0;
            this.state.cursor = 0;
            this.elements.masonry.innerHTML = '';
        }

        if (!this.state.activeEvent) {
            this.showPlaceholderMessage();
            if (this.elements.metaCount) this.elements.metaCount.style.visibility = 'hidden';
            this.updateCounts(0, this.state.items.length);
            this.renderActiveMeta();
            return;
        }
        if (this.elements.metaCount) this.elements.metaCount.style.visibility = 'visible';

        if (this.state.availableEvents && this.state.availableEvents.has(this.state.activeEvent)) {
            this.state.filtered = this.state.items.filter((item) => {
                if (item.event !== this.state.activeEvent) return false;

                const hasYearFilters = this.eventYears[this.state.activeEvent] && this.eventYears[this.state.activeEvent].size > 0;
                if (hasYearFilters && this.state.activeYear !== null) {
                    return item.year === this.state.activeYear;
                }

                return true;
            });

            this.updateCounts(0, this.state.filtered.length);

            // Set up and show the progress bar
            this.state.imagesToLoadInBatch = Math.min(this.state.filtered.length, this.state.pageSize);
            this.state.imagesLoadedInBatch = 0;
            if (this.state.imagesToLoadInBatch > 0) {
                this.updateProgressBar();
                this.elements.progressBarContainer.style.display = 'block';
            }

            this.requestIdleCallbackSafe(() => this.loadNextPage());
        } else {
            this.showNoImagesMessage();
            this.updateCounts(0, 0);
        }
        this.renderActiveMeta();
    }

    showPlaceholderMessage() {
        this.elements.masonry.innerHTML = `<div style="column-span: all; text-align: center; padding: 60px 20px; background: var(--bg-elevated); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); border: 2px dashed var(--border-light); margin: 0 auto; max-width: 500px;"><i class="fas fa-images" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 20px;"></i><h3 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">Please Select an Event</h3><p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 0;">Choose an event from the filters above to view photos</p></div>`;
    }

    showNoImagesMessage() {
        this.elements.masonry.innerHTML = `<div style="column-span: all; text-align: center; padding: 60px 20px; background: var(--bg-elevated); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); border: 2px dashed var(--border-light); margin: 0 auto; max-width: 500px;"><i class="fas fa-eye-slash" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 20px;"></i><h3 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">No Images Available</h3><p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 0;">There are no photos for this selection yet.</p></div>`;
    }

    updateCounts(shown, total) {
        if (this.elements.shownCount) this.elements.shownCount.textContent = String(shown);
        if (this.elements.totalCount) this.elements.totalCount.textContent = String(total);
    }

    renderActiveMeta() {
        if (!this.elements.activeFilters) return;
        if (!this.state.activeEvent) { this.elements.activeFilters.textContent = 'No event selected'; return; }
        const parts = [this.state.activeEvent];

        const hasYearFilters = this.eventYears[this.state.activeEvent] && this.eventYears[this.state.activeEvent].size > 0;
        if (hasYearFilters && this.state.activeYear) {
            parts.push(String(this.state.activeYear));
        }
        if (this.state.availableEvents && !this.state.availableEvents.has(this.state.activeEvent)) { parts.push('(No images)'); }
        this.elements.activeFilters.textContent = parts.join(' · ');
    }

    // ===== LOADING AND RENDERING =====
    createCard(item) {
        const card = document.createElement('article');
        card.className = 'card';
        card.dataset.itemId = item.id;
        const img = document.createElement('img');
        img.className = 'card__img';
        img.alt = item.alt;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.aspectRatio = '4 / 3';

        img.addEventListener('error', () => {
            console.warn(`Failed to load image: ${item.src}`);
            this.handleImageLoadAttempt();
            this.removeFailedCard(card, item);
        });
        img.addEventListener('load', () => {
            img.classList.add('loaded');
            card.classList.add('loaded');
            this.handleImageLoadAttempt();
        });

        img.src = item.src;
        card.appendChild(img);
        return card;
    }

    removeFailedCard(card, item) {
        if (card && card.parentNode) { card.parentNode.removeChild(card); }
        const index = this.state.filtered.findIndex(filteredItem => filteredItem.id === item.id);
        if (index > -1) { this.state.filtered.splice(index, 1); }
        const totalShown = this.elements.masonry.querySelectorAll('.card').length;
        this.updateCounts(totalShown, this.state.filtered.length);
        if (!this.failedImages) this.failedImages = new Set();
        if (!this.failedImages.has(item.src)) {
            this.failedImages.add(item.src);
            this.showWarning('Image Load Failed', `Removed failed image: ${item.alt}`);
        }
    }

    loadNextPage() {
        if (this.state.cursor >= this.state.filtered.length) return;
        const start = this.state.cursor;
        const end = Math.min(start + this.state.pageSize, this.state.filtered.length);
        const batch = this.state.filtered.slice(start, end);
        this.state.cursor = end;
        this.state.page += 1;

        const fragment = document.createDocumentFragment();
        for (const item of batch) {
            const card = this.createCard(item);
            fragment.appendChild(card);
        }
        this.elements.masonry.appendChild(fragment);

        const totalShown = this.elements.masonry.querySelectorAll('.card').length;
        this.updateCounts(totalShown, this.state.filtered.length);

        if (this.state.page === 1) {
            const yearText = this.state.activeYear ? ` ${this.state.activeYear}` : '';
            this.showSuccess('Photos Loaded', `Displaying photos from ${this.state.activeEvent}${yearText}`);
        }
    }

    handleImageLoadAttempt() {
        if (this.state.page > 1) return;
        if (this.state.imagesLoadedInBatch < this.state.imagesToLoadInBatch) {
            this.state.imagesLoadedInBatch++;
            this.updateProgressBar();
        }
    }

    updateProgressBar() {
        if (!this.elements.progressBar || this.state.imagesToLoadInBatch === 0) return;
        const percentage = (this.state.imagesLoadedInBatch / this.state.imagesToLoadInBatch) * 100;
        this.elements.progressBar.style.width = `${percentage}%`;
        if (this.state.imagesLoadedInBatch >= this.state.imagesToLoadInBatch) {
            setTimeout(() => {
                this.elements.progressBarContainer.style.display = 'none';
                this.elements.progressBar.style.width = '0%';
            }, 500);
        }
    }

    // ===== INTERSECTION OBSERVER =====
    setupIntersectionObserver() {
        if (!this.elements.sentinel) return;
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !this.state.isLoading) { this.loadNextPage(); }
            });
        }, { rootMargin: '1000px 0px' });
        this.intersectionObserver.observe(this.elements.sentinel);
    }

    // ===== UTILITY FUNCTIONS =====
    requestIdleCallbackSafe(callback) {
        if ('requestIdleCallback' in window) { window.requestIdleCallback(callback); }
        else { setTimeout(callback, 0); }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    clearFlashMessages() {
        const flashContainer = document.getElementById('flash-container');
        if (flashContainer) {
            const notifications = flashContainer.querySelectorAll('.flash-notification');
            notifications.forEach((notification) => {
                if (notification.classList.contains('info')) { this.removeFlashNotification(notification); }
            });
        }
    }

    // ===== PUBLIC API =====
    getState() { return { ...this.state }; }
    getFilteredCount() { return this.state.filtered.length; }
    getTotalCount() { return this.state.items.length; }
}

// ===== INITIALIZATION =====
let photoGalleryManager;
document.addEventListener('DOMContentLoaded', async () => {
    try {
        photoGalleryManager = new PhotoGalleryManager();
        console.log('Photo Gallery Manager initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Photo Gallery Manager:', error);
    }
});

// ===== GLOBAL FUNCTIONS FOR COMPATIBILITY =====
window.toggleSidebar = window.toggleSidebar || function () {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const isVisible = sidebar.classList.contains('open');
    sidebar.classList.toggle('open', !isVisible);
};

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhotoGalleryManager };
}