// Campus Chronicles — Modern interactions with flash notifications
class CampusChroniclesManager {
    constructor() {
        this.init();
    }

    init() {
        this.initializeFlashSystem();
        this.initializeRevealAnimations();
        this.initializeSlider();
        this.initializeBookSlider();
        this.initializeArticleExpansion();
        this.showWelcomeMessage();
    }

    // ===== FLASH NOTIFICATION SYSTEM =====
    initializeFlashSystem() {
        // Create flash container if it doesn't exist
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

        const icons = {
            success: 'fas fa-check',
            error: 'fas fa-times',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="flash-icon">
                <i class="${icons[type]}"></i>
            </div>
            <div class="flash-content">
                <div class="flash-title">${title}</div>
                <div class="flash-message">${message}</div>
            </div>
            <button class="flash-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.removeFlashNotification(notification);
            }, duration);
        }

        return notification;
    }

    removeFlashNotification(notification) {
        if (notification && notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }

    showError(title, message) {
        this.showFlashNotification('error', title, message, 8000);
    }

    showSuccess(title, message) {
        this.showFlashNotification('success', title, message, 6000);
    }

    showWarning(title, message) {
        this.showFlashNotification('warning', title, message, 5000);
    }

    showInfo(title, message) {
        this.showFlashNotification('info', title, message, 4000);
    }

    showWelcomeMessage() {
        setTimeout(() => {
            this.showInfo('Welcome to Campus Chronicles', 'Discover stories and insights from campuses across India');
        }, 1000);
    }

    // ===== REVEAL ANIMATIONS =====
    initializeRevealAnimations() {
        const revealEls = document.querySelectorAll('.reveal');
        if ('IntersectionObserver' in window && revealEls.length) {
            const io = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        io.unobserve(entry.target);
                    }
                }
            }, { threshold: 0.15 });
            revealEls.forEach(el => io.observe(el));
        } else {
            revealEls.forEach(el => el.classList.add('is-visible'));
        }
    }

    // ===== SLIDER FUNCTIONALITY =====
    initializeSlider() {
        const sliderTrack = document.getElementById('sliderTrack');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const dots = document.querySelectorAll('.cc-dot');
        if (!sliderTrack || !prevBtn || !nextBtn || dots.length === 0) return;

        let currentSlide = 0;
        const totalSlides = document.querySelectorAll('.cc-featured-card').length;

        const updateSlider = () => {
            sliderTrack.style.transform = `translateX(-${currentSlide * 100}%)`;

            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentSlide);
            });

            document.querySelectorAll('.cc-featured-card').forEach((card, index) => {
                card.classList.toggle('active', index === currentSlide);
            });
        };

        const nextSlide = () => {
            currentSlide = (currentSlide + 1) % totalSlides;
            updateSlider();
        };

        const prevSlide = () => {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            updateSlider();
        };

        nextBtn.addEventListener('click', nextSlide);
        prevBtn.addEventListener('click', prevSlide);

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentSlide = index;
                updateSlider();
            });
        });

        setInterval(nextSlide, 5000);
    }

    // ===== BOOK SLIDER FUNCTIONALITY (USING YOUR PROVIDED LOGIC) =====
    initializeBookSlider() {
        const bookTrack = document.getElementById('bookSliderTrack');
        const bookNextBtn = document.getElementById('bookNextBtn');
        const bookPrevBtn = document.getElementById('bookPrevBtn');
        const bookDots = document.querySelectorAll('.cc-book-dot');

        if (!bookTrack || !bookNextBtn || !bookPrevBtn || bookDots.length === 0) return;

        let currentBookSlide = 0;
        const totalBookSlides = bookDots.length;
        let bookInterval;

        const updateBookSlider = () => {
            const translateX = -currentBookSlide * 100;
            bookTrack.style.transform = `translateX(${translateX}%)`;

            bookDots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentBookSlide);
            });
        };

        const nextBookSlide = () => {
            currentBookSlide = (currentBookSlide + 1) % totalBookSlides;
            updateBookSlider();
        };

        const prevBookSlide = () => {
            currentBookSlide = (currentBookSlide - 1 + totalBookSlides) % totalBookSlides;
            updateBookSlider();
        };

        // Auto-Play Logic
        const startInterval = () => {
            if (bookInterval) clearInterval(bookInterval);
            bookInterval = setInterval(nextBookSlide, 8000);
        };

        const resetInterval = () => {
            clearInterval(bookInterval);
            startInterval();
        };

        // Navigation Events
        bookNextBtn.addEventListener('click', () => {
            nextBookSlide();
            resetInterval();
        });

        bookPrevBtn.addEventListener('click', () => {
            prevBookSlide();
            resetInterval();
        });

        bookDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentBookSlide = index;
                updateBookSlider();
                resetInterval();
            });
        });

        // Touch Swipe Support
        let touchStartX = 0;
        let touchEndX = 0;

        bookTrack.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            clearInterval(bookInterval); // Pause dragging
        }, { passive: true });

        bookTrack.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchEndX < touchStartX - 50) nextBookSlide();
            if (touchEndX > touchStartX + 50) prevBookSlide();
            startInterval();
        }, { passive: true });

        // Pause on Hover
        const container = document.querySelector('.cc-book-slider-container');
        if (container) {
            container.addEventListener('mouseenter', () => clearInterval(bookInterval));
            container.addEventListener('mouseleave', () => startInterval());
        }

        // Initialize
        updateBookSlider();
        startInterval();
    }

    // ===== ARTICLE EXPANSION =====
    initializeArticleExpansion() {
        document.querySelectorAll('[data-article]').forEach(card => {
            const accordion = card.querySelector('.cc-article');
            const toggle = card.querySelector('[data-toggle]');
            if (!accordion || !toggle) return;

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                card.style.setProperty('--mx', x + '%');
                card.style.setProperty('--my', y + '%');
            });

            const openAccordion = () => {
                const isHidden = accordion.getAttribute('aria-hidden') !== 'false';
                accordion.setAttribute('aria-hidden', String(!isHidden));
            };

            toggle.addEventListener('click', openAccordion);

            const cardBody = card.querySelector('.cc-card-body');
            if (cardBody) {
                cardBody.addEventListener('click', openAccordion);
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CampusChroniclesManager();
});