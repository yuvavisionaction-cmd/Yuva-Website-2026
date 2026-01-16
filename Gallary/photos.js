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
            pageSize: 30, // Updated: 30 photos per page as requested
            isLoading: false,
            imagesToLoadInBatch: 0,
            imagesLoadedInBatch: 0,
            lightboxIndex: -1, // New: Track current lightbox image
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
            pagination: null,
            backToTop: null,
            progressBarContainer: null,
            progressBar: null,
            // Lightbox Elements
            lightbox: null,
            lightboxImage: null,
            lightboxCaption: null,
            lightboxClose: null,
            lightboxPrev: null,
            lightboxNext: null,
            lightboxOverlay: null,
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
        this.elements.pagination = document.getElementById('pagination');
        this.elements.backToTop = document.getElementById('backToTop');

        // Lightbox Elements
        this.elements.lightbox = document.getElementById('lightbox');
        if (this.elements.lightbox) {
            this.elements.lightboxImage = this.elements.lightbox.querySelector('.lightbox-image');
            this.elements.lightboxCaption = this.elements.lightbox.querySelector('.lightbox-caption');
            this.elements.lightboxClose = this.elements.lightbox.querySelector('.lightbox-close');
            this.elements.lightboxPrev = this.elements.lightbox.querySelector('.lightbox-prev');
            this.elements.lightboxNext = this.elements.lightbox.querySelector('.lightbox-next');
            this.elements.lightboxOverlay = this.elements.lightbox.querySelector('.lightbox-overlay');
        }

        // Dynamically inject progress bar HTML
        const metaSection = this.elements.metaCount.parentElement;
        if (metaSection) {
            const progressBarHTML = `<div class="progress-loader" id="imageProgressBarContainer" style="display: none;"><div class="progress-loader__bar" id="imageProgressBar"></div></div>`;
            metaSection.insertAdjacentHTML('afterend', progressBarHTML);
            this.elements.progressBarContainer = document.getElementById('imageProgressBarContainer');
            this.elements.progressBar = document.getElementById('imageProgressBar');
        }

        const missingElements = Object.entries(this.elements).filter(([key, element]) => !element && !key.startsWith('lightbox')).map(([key]) => key);
        if (missingElements.length > 0) {
            this.showError('Initialization Error', `Missing elements: ${missingElements.join(', ')}`);
            throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
        }
    }

    // ===== EVENT BINDING =====
    bindEvents() {
        if (this.elements.backToTop) { this.elements.backToTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearFlashMessages();
                this.closeLightbox();
            }
            // Lightbox Navigation
            if (this.state.lightboxIndex !== -1) {
                if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
                if (e.key === 'ArrowRight') this.navigateLightbox(1);
            }
        });

        // Lightbox Events
        if (this.elements.lightbox) {
            this.elements.lightboxClose.addEventListener('click', () => this.closeLightbox());
            this.elements.lightboxOverlay.addEventListener('click', () => this.closeLightbox());
            this.elements.lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); this.navigateLightbox(-1); });
            this.elements.lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); this.navigateLightbox(1); });

            // Touch Swipe Support
            let touchstartX = 0;
            let touchendX = 0;
            const minSwipeDistance = 50;

            this.elements.lightbox.addEventListener('touchstart', (e) => {
                touchstartX = e.changedTouches[0].screenX;
            }, { passive: true });

            this.elements.lightbox.addEventListener('touchend', (e) => {
                touchendX = e.changedTouches[0].screenX;
                handleSwipe();
            }, { passive: true });

            const handleSwipe = () => {
                const distance = touchendX - touchstartX;
                if (Math.abs(distance) > minSwipeDistance) {
                    if (distance < 0) this.navigateLightbox(1); // Swipe Left -> Next
                    if (distance > 0) this.navigateLightbox(-1); // Swipe Right -> Prev
                }
            };
        }
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
            // Reset sentinel
            if (this.elements.sentinel) this.elements.sentinel.style.display = 'block';
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

            this.requestIdleCallbackSafe(() => this.goToPage(1));
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
        // Make card clickable & focusable
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.style.cursor = 'pointer';

        const img = document.createElement('img');
        img.className = 'card__img';
        img.alt = item.alt;
        img.loading = 'eager'; // Changed from 'lazy' to fix Masonry layout issues
        img.decoding = 'async';
        img.style.aspectRatio = '4 / 3';

        const onImageLoad = () => {
            img.classList.add('loaded');
            card.classList.add('loaded');
            this.handleImageLoadAttempt();
        };

        const onImageError = () => {
            console.warn(`Failed to load image: ${item.src}`);
            this.handleImageLoadAttempt();
            this.removeFailedCard(card, item);
        };

        img.addEventListener('error', onImageError);
        img.addEventListener('load', onImageLoad);

        // Safety: If image hangs for 5s, treat as loaded (or failed if broken)
        // This prevents permanent white boxes
        setTimeout(() => {
            if (!img.classList.contains('loaded') && img.complete) {
                if (img.naturalWidth === 0) onImageError();
                else onImageLoad();
            } else if (!img.classList.contains('loaded')) {
                // Still loading? Force visible so user sees it loading or broken icon
                img.classList.add('loaded');
            }
        }, 5000);

        // Click to open lightbox
        card.addEventListener('click', (e) => {
            console.log('Card clicked:', item.id); // Debug

            // Find current index in filtered list
            // Ensure IDs are compared correctly (both as numbers or strings)
            const index = this.state.filtered.findIndex(i => String(i.id) === String(item.id));

            if (index !== -1) {
                this.openLightbox(index);
            } else {
                console.warn('Click ignored: Item not found in filtered list', item);
            }
        });

        // Enter key to open
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const index = this.state.filtered.findIndex(i => String(i.id) === String(item.id));
                if (index !== -1) this.openLightbox(index);
            }
        });

        img.src = item.src;
        card.appendChild(img);
        return card;
    }

    // ===== LIGHTBOX FUNCTIONS =====
    openLightbox(index) {
        if (!this.elements.lightbox) {
            console.error('Lightbox element not found');
            return;
        }

        console.log('Opening lightbox at index:', index);
        this.state.lightboxIndex = index;
        const item = this.state.filtered[index];
        if (!item) {
            console.error('Lightbox item not found at index:', index);
            return;
        }

        this.updateLightboxContent(item);
        this.elements.lightbox.classList.add('open');
        this.elements.lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    closeLightbox() {
        if (!this.elements.lightbox) return;
        this.elements.lightbox.classList.remove('open');
        this.elements.lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // Restore scrolling
        this.state.lightboxIndex = -1;

        // Clear image to prevent flash of old image next open
        setTimeout(() => {
            if (this.elements.lightboxImage) {
                this.elements.lightboxImage.src = '';
                this.elements.lightboxImage.classList.remove('loaded');
            }
        }, 300);
    }

    navigateLightbox(direction) {
        if (this.state.lightboxIndex === -1) return;

        let newIndex = this.state.lightboxIndex + direction;

        // Loop navigation
        if (newIndex < 0) newIndex = this.state.filtered.length - 1;
        if (newIndex >= this.state.filtered.length) newIndex = 0;

        this.state.lightboxIndex = newIndex;
        const item = this.state.filtered[newIndex];
        this.updateLightboxContent(item);
    }

    updateLightboxContent(item) {
        if (!this.elements.lightboxImage) return;

        // Show loader, hide image
        const loader = this.elements.lightbox.querySelector('.lightbox-loader');
        if (loader) loader.style.display = 'block';

        this.elements.lightboxImage.classList.remove('loaded');
        this.elements.lightboxImage.src = item.src;
        this.elements.lightboxImage.alt = item.alt;

        this.elements.lightboxImage.onload = () => {
            this.elements.lightboxImage.classList.add('loaded');
            if (loader) loader.style.display = 'none';
        };

        if (this.elements.lightboxCaption) {
            this.elements.lightboxCaption.textContent = `${item.event} (${item.year}) - ${item.category}`;
        }
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

    goToPage(pageNumber) {
        if (!this.state.filtered.length) return;

        // Calculate total pages
        const totalPages = Math.ceil(this.state.filtered.length / this.state.pageSize);

        // Validate page number
        if (pageNumber < 1) pageNumber = 1;
        if (pageNumber > totalPages) pageNumber = totalPages;

        this.state.page = pageNumber;
        // Cursor isn't strictly needed for random access but good to update
        this.state.cursor = (pageNumber - 1) * this.state.pageSize;

        console.log(`Navigating to Page ${pageNumber} of ${totalPages}`);

        // Scroll to top of filters/grid
        if (this.elements.activeFilters) {
            this.elements.activeFilters.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Clear Grid
        this.elements.masonry.innerHTML = '';

        const start = (this.state.page - 1) * this.state.pageSize;
        const end = Math.min(start + this.state.pageSize, this.state.filtered.length);
        const batch = this.state.filtered.slice(start, end);

        if (batch.length === 0) return;

        // Render Cards
        const fragment = document.createDocumentFragment();
        batch.forEach((item, index) => {
            const card = this.createCard(item);
            card.dataset.page = this.state.page;
            // Stagger animation for nice effect
            card.style.animationDelay = `${index * 30}ms`;
            fragment.appendChild(card);
        });
        this.elements.masonry.appendChild(fragment);

        this.updateCounts(batch.length, this.state.filtered.length);

        // Update Pagination Controls
        this.renderPaginationControls(totalPages);

        if (this.state.page === 1) {
            const yearText = this.state.activeYear ? ` ${this.state.activeYear}` : '';
            // Only show toast on first load not every page change to avoid annoyance
            // this.showSuccess('Photos Loaded', `Displaying photos from ${this.state.activeEvent}${yearText}`);
        }
    }

    renderPaginationControls(totalPages) {
        const container = document.getElementById('pagination');
        if (!container) return;
        container.innerHTML = '';

        // If only 1 page, no need for controls
        if (totalPages <= 1) return;

        const createBtn = (text, onClick, isActive = false, isDisabled = false, isIcon = false) => {
            const btn = document.createElement('button');
            btn.className = `page-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
            if (isIcon) btn.innerHTML = text;
            else btn.textContent = text;
            btn.addEventListener('click', onClick);
            return btn;
        };

        // Previous Button
        container.appendChild(createBtn(
            '<i class="fas fa-chevron-left"></i>',
            () => this.goToPage(this.state.page - 1),
            false,
            this.state.page === 1,
            true
        ));

        // Logic for "Smart" Pagination: 1 ... 4 5 [6] 7 8 ... 20
        const maxVisible = 5;
        let startPage = Math.max(1, this.state.page - 2);
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        // First Page
        if (startPage > 1) {
            container.appendChild(createBtn('1', () => this.goToPage(1)));
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.margin = '0 4px';
                dots.style.color = 'var(--text-muted)';
                container.appendChild(dots);
            }
        }

        // Numbered Pages
        for (let i = startPage; i <= endPage; i++) {
            container.appendChild(createBtn(String(i), () => this.goToPage(i), i === this.state.page));
        }

        // Last Page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.margin = '0 4px';
                dots.style.color = 'var(--text-muted)';
                container.appendChild(dots);
            }
            container.appendChild(createBtn(String(totalPages), () => this.goToPage(totalPages)));
        }

        // Next Button
        container.appendChild(createBtn(
            '<i class="fas fa-chevron-right"></i>',
            () => this.goToPage(this.state.page + 1),
            false,
            this.state.page === totalPages,
            true
        ));
    }

    handleImageLoadAttempt() {
        if (this.state.page > 1 && this.state.page !== 1) return; // Allow for page 1 logic if needed, but simplified
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
        // Disabled for Pagination Mode
        if (this.elements.sentinel) this.elements.sentinel.style.display = 'none';
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