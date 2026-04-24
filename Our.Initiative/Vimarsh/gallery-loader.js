/**
 * ================================================
 * VIMARSH GALLERY - SUPABASE DYNAMIC LOADER
 * ================================================
 * 
 * This script dynamically loads gallery images from Supabase Storage
 * Uses Supabase Storage backend for dynamic gallery images
 * 
 * Dependencies: supabase-gallery-config.js (must be loaded first)
 */

// ================================================
// GALLERY MANAGER
// ================================================
class VimarshGalleryManager {
    constructor(containerSelector, filterButtonsSelector, lightboxId) {
        this.container = document.querySelector(containerSelector);
        this.filterButtons = document.querySelectorAll(filterButtonsSelector);
        this.lightbox = document.getElementById(lightboxId);
        this.currentFilter = 'all';
        this.images = [];
        this.isLoading = false;
    }

    /**
     * Initialize the gallery
     */
    async init() {
        try {
            this.showLoading();
            
            // Check if galleryClient is available
            if (typeof galleryClient === 'undefined') {
                throw new Error('galleryClient is not defined. Make sure supabase-gallery-config.js is loaded first.');
            }
            
            // Fetch images from Supabase
            const files = await galleryClient.listFiles();
            
            if (!files || files.length === 0) {
                this.showEmptyState();
                return;
            }

            // Process images with year extraction
            this.images = this.processImages(files);
            console.log(`📸 ${this.images.length} images processed`);
            
            // Create dynamic filter buttons
            this.createFilterButtons();
            
            // Render gallery
            this.renderGallery();
            
            // Setup filter buttons
            this.setupFilters();
            
            // Setup lightbox
            this.setupLightbox();
            
            // Setup lazy loading
            this.setupLazyLoading();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Failed to initialize gallery:', error);
            this.showError('Failed to load gallery. Please refresh the page.');
        }
    }

    /**
     * Process images and extract metadata
     */
    processImages(files) {
        return files.map(file => {
            // Year is now extracted from folder path (e.g., photos/vimarsh/2025/image.jpg)
            // If not available, try filename or date
            const year = file.year || 
                         this.extractYearFromFilename(file.name) || 
                         this.extractYearFromDate(file.createdAt);
            
            return {
                url: file.url,
                name: file.name,
                year: parseInt(year),
                createdAt: file.createdAt,
                caption: `Vimarsh ${year}`
            };
        }).sort((a, b) => {
            // Sort by year (newest first), then by date
            if (a.year !== b.year) {
                return b.year - a.year;
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    /**
     * Extract year from filename (e.g., "2024_img.jpg", "vimarsh2024.jpg")
     */
    extractYearFromFilename(filename) {
        const yearMatch = filename.match(/20\d{2}/);
        return yearMatch ? parseInt(yearMatch[0]) : null;
    }

    /**
     * Extract year from date string
     */
    extractYearFromDate(dateString) {
        if (!dateString) return new Date().getFullYear();
        const date = new Date(dateString);
        return date.getFullYear();
    }

    /**
     * Render gallery items
     */
    renderGallery() {
        if (!this.container) {
            console.error('Gallery container not found!');
            return;
        }

        // Clear existing content
        this.container.innerHTML = '';

        const filteredImages = this.currentFilter === 'all' 
            ? this.images 
            : this.images.filter(img => img.year.toString() === this.currentFilter);

        console.log(`Rendering ${filteredImages.length} images for filter: ${this.currentFilter}`);

        if (filteredImages.length === 0) {
            this.container.innerHTML = `
                <div class="no-images">
                    <p>No images found for ${this.currentFilter === 'all' ? 'this gallery' : this.currentFilter}</p>
                </div>
            `;
            return;
        }

        filteredImages.forEach((image, index) => {
            const galleryItem = this.createGalleryItem(image, index);
            this.container.appendChild(galleryItem);
        });
        
        console.log(`✅ Rendered ${filteredImages.length} gallery items`);
    }

    /**
     * Create a single gallery item element
     */
    createGalleryItem(image, index) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.setAttribute('data-year', image.year);
        item.setAttribute('data-caption', image.caption);
        item.setAttribute('data-index', index);

        const img = document.createElement('img');
        img.setAttribute('data-src', image.url);
        img.setAttribute('alt', image.caption);
        img.setAttribute('width', '600');
        img.setAttribute('height', '400');
        img.className = 'gallery-image lazy';
        
        // Add loading placeholder
        img.style.backgroundColor = '#f0f0f0';

        item.appendChild(img);

        // Click handler for lightbox
        item.addEventListener('click', () => {
            this.openLightbox(index, this.currentFilter);
        });

        return item;
    }

    /**
     * Create dynamic filter buttons based on available years
     */
    createFilterButtons() {
        const filterContainer = document.querySelector('.filter-container');
        if (!filterContainer) {
            console.error('Filter container not found!');
            return;
        }

        // Extract unique years from images and sort descending
        const years = [...new Set(this.images.map(img => img.year))].sort((a, b) => b - a);
        console.log('Creating filter buttons for years:', years);
        
        // Save home button before clearing (clone it to preserve)
        const homeBtn = filterContainer.querySelector('.back-btn');
        const homeBtnClone = homeBtn ? homeBtn.cloneNode(true) : null;
        
        // Clear existing filters
        filterContainer.innerHTML = '';
        
        // Add "All" button
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn active';
        allBtn.setAttribute('data-filter', 'all');
        allBtn.innerHTML = '<span>All</span>';
        filterContainer.appendChild(allBtn);
        
        // Add year buttons
        years.forEach(year => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.setAttribute('data-filter', year.toString());
            btn.innerHTML = `<span>${year}</span>`;
            filterContainer.appendChild(btn);
        });
        
        // Re-add home button
        if (homeBtnClone) {
            filterContainer.appendChild(homeBtnClone);
        }
        
        // Update filterButtons reference
        this.filterButtons = document.querySelectorAll('.filter-btn');
        console.log('Filter buttons created:', this.filterButtons.length);
    }

    /**
     * Setup filter buttons
     */
    setupFilters() {
        this.filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;

                // Update active state
                this.filterButtons.forEach(btn => btn.classList.remove('active'));
                targetButton.classList.add('active');

                // Update filter and re-render
                this.currentFilter = targetButton.getAttribute('data-filter');
                this.renderGallery();
                
                // Re-setup lazy loading for new images
                this.setupLazyLoading();
            });
        });
    }

    /**
     * Setup lazy loading using Intersection Observer
     */
    setupLazyLoading() {
        const lazyImages = document.querySelectorAll('img.lazy');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        
                        if (src) {
                            img.src = src;
                            img.classList.remove('lazy');
                            img.classList.add('loaded');
                            
                            // Handle load success
                            img.onload = () => {
                                img.style.backgroundColor = 'transparent';
                            };
                            
                            // Handle load error
                            img.onerror = () => {
                                img.alt = 'Image failed to load';
                                img.style.backgroundColor = '#ffebee';
                            };
                            
                            observer.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });

            lazyImages.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for browsers without IntersectionObserver
            lazyImages.forEach(img => {
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.classList.remove('lazy');
                }
            });
        }
    }

    /**
     * Setup lightbox functionality
     */
    setupLightbox() {
        if (!this.lightbox) return;

        const lightboxImg = this.lightbox.querySelector('.lightbox-content');
        const closeBtn = this.lightbox.querySelector('.lightbox-close');
        const leftArrow = this.lightbox.querySelector('.lightbox-arrow.left');
        const rightArrow = this.lightbox.querySelector('.lightbox-arrow.right');

        let currentIndex = 0;
        let currentImages = [];

        // Close lightbox
        const closeLightbox = () => {
            this.lightbox.classList.remove('active');
            document.body.style.overflow = '';
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closeLightbox);
        }

        // Close on background click
        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) {
                closeLightbox();
            }
        });

        // Navigate images
        const showImage = (index) => {
            if (currentImages.length === 0) return;
            
            currentIndex = (index + currentImages.length) % currentImages.length;
            const image = currentImages[currentIndex];
            
            if (lightboxImg && image) {
                lightboxImg.src = image.url;
                lightboxImg.alt = image.caption;
            }
        };

        if (leftArrow) {
            leftArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                showImage(currentIndex - 1);
            });
        }

        if (rightArrow) {
            rightArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                showImage(currentIndex + 1);
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.lightbox.classList.contains('active')) {
                if (e.key === 'Escape') closeLightbox();
                if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
                if (e.key === 'ArrowRight') showImage(currentIndex + 1);
            }
        });

        // Store function to open lightbox
        this.openLightbox = (index, filter) => {
            currentImages = filter === 'all' 
                ? this.images 
                : this.images.filter(img => img.year.toString() === filter);
            
            currentIndex = index;
            showImage(currentIndex);
            
            this.lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        };
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        if (this.container) {
            this.container.innerHTML = `
                <div class="gallery-loading">
                    <div class="spinner"></div>
                    <p>Loading gallery from Supabase...</p>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="gallery-empty">
                    <p>No images in gallery yet.</p>
                </div>
            `;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="gallery-error">
                    <p>${message}</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Refresh gallery
     */
    async refresh() {
        await this.init();
    }
}

// ================================================
// AUTO-INITIALIZE ON PAGE LOAD
// ================================================
let galleryManager = null;

// Wait for DOM and config to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
} else {
    initGallery();
}

function initGallery() {
    // Check if gallery container exists
    const galleryGrid = document.querySelector('.gallery-grid');
    
    if (galleryGrid) {
        // Initialize gallery manager
        galleryManager = new VimarshGalleryManager(
            '.gallery-grid',
            '.filter-btn',
            'lightbox'
        );
        
        // Load gallery
        galleryManager.init();
    }
}

// Export for external use
if (typeof window !== 'undefined') {
    window.VimarshGalleryManager = VimarshGalleryManager;
    window.galleryManager = galleryManager;
}
