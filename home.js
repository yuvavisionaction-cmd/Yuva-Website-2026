/* ===== MODERN HOME PAGE JAVASCRIPT - YUVA 2025 ===== */

// --- CONFIGURATION ---
// Initialize Supabase client if not already initialized
if (!window.supabaseClient && window.supabase?.createClient) {
    const SUPABASE_URL = 'https://jgsrsjwmywiirtibofth.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_5KtvO0cEHfnECBoyp2CQnw_RC3_x2me';
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
// Use the global supabase client
const supabaseClient = window.supabaseClient || null;


class HomePageManager {
    constructor() {
        if (!supabaseClient) {
            console.error("Supabase client not initialized. Dynamic content (Executives, Events) will not load.");
            return;
        }
        this.init();
    }

    init() {
        this.loadExecutiveTeam();
        this.loadUpcomingEvents();
        this.setupNewsletter();
        this.setupModal();
    }

    // --- 👇 INSERT THIS NEW METHOD HERE 👇 ---
    async loadUpcomingEvents() {
        const grid = document.getElementById('events-grid');
        const loader = document.getElementById('events-loading');
        const emptyState = document.getElementById('events-empty');

        if (!grid) return;

        try {
            // Show loading state
            if (loader) loader.style.display = 'flex';
            grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';

            // Check if Supabase is initialized
            if (!supabaseClient) {
                console.error('Supabase client not initialized');
                if (loader) loader.style.display = 'none';
                if (emptyState) {
                    emptyState.style.display = 'block';
                    emptyState.innerHTML = `
                        <i class="far fa-calendar-times"></i>
                        <p>Unable to load events. Please refresh the page.</p>
                    `;
                }
                return;
            }

            // 1. Fetch recent and future events (fetch a bit more data to filter client-side)
            // We fetch events starting from "Yesterday" to catch events that started but haven't ended.
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const { data: events, error } = await supabaseClient
                .from('events')
                .select('id, title, description, start_at, end_at, location, banner_url, status')
                .in('status', ['upcoming', 'scheduled'])
                .gte('start_at', yesterday.toISOString()) // Fetch slightly wider range
                .order('start_at', { ascending: true })
                .limit(10); // Fetch 10, then we will filter down to 3

            if (error) throw error;

            // Hide loading spinner
            if (loader) loader.style.display = 'none';

            // 2. Filter in JavaScript using End Date Logic
            const now = new Date().getTime();

            const activeEvents = (events || []).filter(ev => {
                // Use End Date if available, otherwise Start Date
                const cutoff = ev.end_at ? new Date(ev.end_at).getTime() : new Date(ev.start_at).getTime();
                // Keep if the cutoff time is in the future
                return cutoff > now;
            }).slice(0, 3); // Take top 3

            // Show empty state if no events
            if (activeEvents.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                grid.style.display = 'none';
                return;
            }

            // 3. Render events
            grid.style.display = 'grid';
            grid.innerHTML = '';

            activeEvents.forEach(event => {
                const startDate = new Date(event.start_at);
                const day = startDate.getDate();
                const month = startDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                const time = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const bannerHtml = event.banner_url
                    ? `<img src="${event.banner_url}" alt="${event.title}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">`
                    : `<div style="width:100%; height:100%; background: var(--gradient-navy); display:flex; align-items:center; justify-content:center; color:var(--white-primary); font-size:3rem; opacity:0.8;"><i class="fas fa-calendar-alt"></i></div>`;

                const card = document.createElement('div');
                card.className = 'event-card';

                card.innerHTML = `
                    <div class="event-image">
                        ${bannerHtml}
                        <div class="event-date-badge">
                            <span class="day">${day}</span>
                            <span class="month">${month}</span>
                        </div>
                    </div>
                    <div class="event-details">
                        <h3 class="event-title">${event.title}</h3>
                        <div class="event-info">
                            <span><i class="far fa-clock"></i> ${time}</span>
                            ${event.location ? `<span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>` : ''}
                        </div>
                        <p class="event-description">${event.description || 'No description available.'}</p>
                    </div>
                `;
                grid.appendChild(card);
            });

        } catch (err) {
            console.error("Error loading upcoming events:", err);
            // Always hide loading spinner on error
            if (loader) loader.style.display = 'none';
            // Show empty state with error message
            if (emptyState) {
                emptyState.style.display = 'block';
                emptyState.innerHTML = `
                    <i class="far fa-calendar-times"></i>
                    <p>Unable to load events. Please try again later.</p>
                `;
            }
            // Hide grid on error
            grid.style.display = 'none';
        }
    }

    // --- FETCH & RENDER EXECUTIVE TEAM ---
    // --- FETCH & RENDER EXECUTIVE TEAM ---
    // --- Replace your entire loadExecutiveTeam function with this one ---
    async loadExecutiveTeam() {
        const grid = document.getElementById('executives-grid');
        const loader = document.getElementById('executives-loading');
        if (!grid) return;

        try {
            const { data: allExecs, error } = await supabaseClient
                .from('executive_members')
                .select('member_name, designation, role, photo_url, description, contact_email')
                .order('display_order', { ascending: true, nullsFirst: false })
                .order('member_name', { ascending: true });

            if (error) throw error;
            if (loader) loader.style.display = 'none';
            if (!allExecs || allExecs.length === 0) {
                grid.innerHTML = '<p style="text-align:center; color:var(--text-muted); grid-column:1/-1;">Leadership team to be announced.</p>';
                return;
            }

            const heads = [];
            const regularMembers = [];

            allExecs.forEach(exec => {
                if (exec.designation && exec.role && exec.designation.trim() === exec.role.trim()) {
                    heads.push(exec);
                } else {
                    regularMembers.push(exec);
                }
            });

            grid.innerHTML = '';

            // --- Helper function with NEW theme class logic ---
            const createCard = (exec, isHead = false, themeIndex) => {
                const initials = exec.member_name ? exec.member_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';

                const card = document.createElement('div');
                card.className = 'exec-card';

                let fallbackBg;
                let fallbackColor;

                if (isHead) {
                    card.classList.add('exec-card--head');
                    fallbackBg = 'var(--saffron-pale)';
                    fallbackColor = 'var(--saffron-dark)';
                } else {
                    // 👇 THIS IS THE NEW, RELIABLE COLOR LOGIC 👇
                    const colorIndex = themeIndex % 3;
                    if (colorIndex === 0) { // Orange
                        card.classList.add('exec-card--theme-saffron');
                        fallbackBg = 'var(--saffron-pale)';
                        fallbackColor = 'var(--saffron-dark)';
                    } else if (colorIndex === 1) { // Blue
                        card.classList.add('exec-card--theme-navy');
                        fallbackBg = 'var(--color-info-pale)';
                        fallbackColor = 'var(--navy-chakra)';
                    } else { // Green
                        card.classList.add('exec-card--theme-green');
                        fallbackBg = 'var(--green-pale)';
                        fallbackColor = 'var(--green-dark)';
                    }
                }

                const imgHtml = exec.photo_url
                    ? `<img src="${exec.photo_url}" alt="${exec.member_name}" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='${initials}'; this.parentElement.style.background='${fallbackBg}'; this.parentElement.style.color='${fallbackColor}'; this.parentElement.style.display='flex'; this.parentElement.style.alignItems='center'; this.parentElement.style.justifyContent='center'; this.parentElement.style.fontSize='2.5rem'; this.parentElement.style.fontWeight='700';">`
                    : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:2.5rem; color:${fallbackColor}; font-weight:700; background:${fallbackBg};">${initials}</div>`;

                card.innerHTML = `
                <div class="exec-image">${imgHtml}</div>
                <h3 class="exec-name">${exec.member_name}</h3>
                <p class="exec-role">${exec.designation && exec.role && exec.designation !== exec.role ? `${exec.designation} | ${exec.role}` : exec.designation || exec.role || ''}</p>
            `;
                card.addEventListener('click', () => this.openExecModal(exec, imgHtml));
                return card;
            };

            // Render heads (unchanged)
            if (heads.length > 0) {
                const headWrapper = document.createElement('div');
                headWrapper.className = 'executives-head-wrapper';
                heads.forEach(exec => {
                    headWrapper.appendChild(createCard(exec, true, 0));
                });
                grid.appendChild(headWrapper);
            }

            // Render regular members (unchanged)
            regularMembers.forEach((exec, index) => {
                grid.appendChild(createCard(exec, false, index));
            });

        } catch (err) {
            console.error("Error loading executives:", err);
            if (loader) loader.style.display = 'none';
        }
    }

    // --- NEWSLETTER SUBSCRIPTION (WITH LIVE TYPO VALIDATION) ---
    // --- NEWSLETTER SUBSCRIPTION (WITH LIVE TYPO VALIDATION) ---
    setupNewsletter() {
        const form = document.getElementById('newsletter-form');
        const emailInput = document.getElementById('newsletter-email');
        const btn = document.getElementById('newsletter-btn');
        const suggestionEl = document.getElementById('email-suggestion');

        if (!form || !emailInput || !btn || !suggestionEl) return;

        // --- 1. Define our most common domains ---
        // This makes the suggestions much more accurate
        const commonDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'aol.com', 'icloud.com', 'live.com', 'msn.com'
        ];

        // --- 2. Live Typo Checking on Input ---
        emailInput.addEventListener('input', function () {
            // Use Mailcheck library
            Mailcheck.run({
                email: emailInput.value,
                domains: commonDomains, // <-- THIS IS THE FIX

                suggested: function (suggestion) {
                    suggestionEl.innerHTML = `Did you mean <strong id="suggestion-link">${suggestion.full}</strong>?`;
                    suggestionEl.style.display = 'block';
                },
                empty: function () {
                    suggestionEl.style.display = 'none';
                }
            });
        });

        // --- 3. Click handler for the suggestion (Same as before) ---
        suggestionEl.addEventListener('click', (e) => {
            if (e.target.id === 'suggestion-link') {
                emailInput.value = e.target.textContent;
                suggestionEl.style.display = 'none';
                emailInput.focus();
            }
        });

        // --- 4. Form Submit Handler (Same as before) ---
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const originalBtnHtml = btn.innerHTML;
            suggestionEl.style.display = 'none';

            if (!emailInput.value || !emailInput.value.includes('@')) {
                if (window.flashNotification) window.flashNotification.showError('Invalid Email', 'Please enter a valid email address.');
                return;
            }

            try {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
                btn.disabled = true;

                const { error } = await supabaseClient
                    .from('subscriptions')
                    .insert([{ email: emailInput.value.toLowerCase().trim() }]);

                if (error) {
                    if (error.code === '23505') throw new Error("You are already subscribed!");
                    throw error;
                }

                if (window.flashNotification) window.flashNotification.showSuccess('Subscribed!', 'Thanks for joining our community.');
                form.reset();

            } catch (err) {
                if (window.flashNotification) window.flashNotification.showError('Subscription Failed', err.message || 'Please try again later.');
            } finally {
                btn.innerHTML = originalBtnHtml;
                btn.disabled = false;
            }
        });
    }

    // --- GENERIC MODAL UTILITIES ---
    setupModal() {
        this.modal = document.getElementById('generic-modal');
        if (!this.modal) return;
        this.modalContent = document.getElementById('modal-content-area');
        this.closeBtn = this.modal.querySelector('.modal-close');

        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) this.closeModal();
        });
    }

    openExecModal(exec, imgHtml) {
        if (!this.modal || !this.modalContent) return;
        // Populate modal with executive details
        this.modalContent.innerHTML = `
            <div class="modal-exec-profile">
                <div class="modal-exec-img">${imgHtml}</div>
                <h3 class="modal-exec-name">${exec.member_name}</h3>
                <p class="modal-exec-role">${exec.designation && exec.role && exec.designation !== exec.role ? `${exec.designation} | ${exec.role}` : exec.designation || exec.role || ''}</p>
                <div class="modal-exec-bio">
                    ${exec.description ? `<p>${exec.description}</p>` : '<p>No further details available.</p>'}
                </div>
                 ${exec.contact_email ? `
                    <div class="modal-socials" style="margin-top: 20px;">
                        <a href="mailto:${exec.contact_email}" class="modal-social-link" title="Contact via Email">
                            <i class="fas fa-envelope"></i>
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closeModal() {
        if (!this.modal) return;
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/* =========================================
   EXISTING ANIMATIONS & UTILITIES
   ========================================= */

class HomePageAnimations {
    constructor() {
        this.init();
    }

    init() {
        this.animateHeroElements();
        this.animateImpactNumbers();
        this.animateFeatureCards();
        this.animateQuickLinks();
        this.animateCTA();
        this.setupScrollAnimations();
        this.setupParallaxEffects();
        this.setupInteractiveElements();
        this.initializeHomepageGallery();
    }

    // ===== HERO SECTION ANIMATIONS =====
    animateHeroElements() {
        // Animate hero badge with pulse effect
        const heroBadge = document.querySelector('.hero-badge');
        if (heroBadge) {
            heroBadge.style.animation = 'fadeInUp 0.8s ease-out 0.2s both';
        }

        // Animate hero title with staggered effect
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            heroTitle.style.animation = 'fadeInUp 0.8s ease-out 0.4s both';
        }

        // Animate hero description
        const heroDescription = document.querySelector('.hero-description');
        if (heroDescription) {
            heroDescription.style.animation = 'fadeInUp 0.8s ease-out 0.6s both';
        }

        // Animate home impact items with staggered effect
        const homeImpactItems = document.querySelectorAll('.home-impact-item');
        homeImpactItems.forEach((item, index) => {
            item.style.animation = `fadeInUp 0.8s ease-out ${0.8 + (index * 0.2)}s both`;
        });
    }

    // ===== IMPACT NUMBERS ANIMATION =====
    animateImpactNumbers() {
        const impactNumbers = document.querySelectorAll('.home-impact-number');

        const animateNumber = (element, target) => {
            const duration = 2000;
            const start = 0;
            const increment = target / (duration / 16);
            let current = start;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                element.textContent = Math.floor(current).toLocaleString();
            }, 16);
        };

        // Use Intersection Observer to trigger animation when in view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.dataset.target);
                    if (target) {
                        animateNumber(entry.target, target);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        impactNumbers.forEach(number => {
            observer.observe(number);
        });
    }

    // ===== FEATURE CARDS ANIMATIONS =====
    animateFeatureCards() {
        const featureCards = document.querySelectorAll('.feature-card');

        featureCards.forEach((card, index) => {
            // Load-time slide-up animation removed

            // Hover animations
            card.addEventListener('mouseenter', () => {
                this.animateFeatureCard(card, 'enter');
            });

            card.addEventListener('mouseleave', () => {
                this.animateFeatureCard(card, 'leave');
            });

            card.addEventListener('click', () => {
                this.animateFeatureCard(card, 'click');
            });
        });
    }

    animateFeatureCard(card, action) {
        if (!card) return;

        switch (action) {
            case 'enter':
                card.style.transform = 'translateY(-12px) scale(1.02)';
                card.style.boxShadow = 'var(--shadow-2xl)';
                break;
            case 'leave':
                card.style.transform = 'translateY(0) scale(1)';
                card.style.boxShadow = 'var(--shadow-lg)';
                break;
            case 'click':
                card.style.animation = 'bounceIn 0.5s ease-out';
                setTimeout(() => {
                    card.style.animation = '';
                }, 500);
                break;
        }
    }

    // ===== QUICK LINKS ANIMATIONS =====
    animateQuickLinks() {
        const quickLinkCards = document.querySelectorAll('.quick-link-card');

        quickLinkCards.forEach((card, index) => {
            // Load-time slide-up animation removed

            // Hover animations
            card.addEventListener('mouseenter', () => {
                this.animateQuickLinkCard(card, 'enter');
            });

            card.addEventListener('mouseleave', () => {
                this.animateQuickLinkCard(card, 'leave');
            });

            card.addEventListener('click', () => {
                this.animateQuickLinkCard(card, 'click');
            });
        });
    }

    animateQuickLinkCard(card, action) {
        if (!card) return;

        switch (action) {
            case 'enter':
                card.style.transform = 'translateY(-8px) scale(1.02)';
                card.style.boxShadow = 'var(--shadow-2xl)';
                break;
            case 'leave':
                card.style.transform = 'translateY(0) scale(1)';
                card.style.boxShadow = 'var(--shadow-lg)';
                break;
            case 'click':
                card.style.animation = 'pulse 0.5s ease-out';
                setTimeout(() => {
                    card.style.animation = '';
                }, 500);
                break;
        }
    }

    // ===== CTA SECTION ANIMATIONS =====
    animateCTA() {
        const ctaContent = document.querySelector('.cta-content');
        if (ctaContent) {
            ctaContent.style.animation = 'fadeInUp 0.8s ease-out 0.2s both';
        }

        const ctaButtons = document.querySelectorAll('.btn-primary, .btn-secondary');
        ctaButtons.forEach((button, index) => {
            button.style.animation = `fadeInUp 0.6s ease-out ${0.4 + (index * 0.1)}s both`;
        });
    }

    // ===== SCROLL ANIMATIONS =====
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.8s ease-out both';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe sections for scroll animations (exclude features and quick links)
        const sections = document.querySelectorAll('.cta-section, .executives-section, .events-section, .partners-section, .newsletter-section');
        sections.forEach(section => {
            observer.observe(section);
        });
    }

    // ===== PARALLAX EFFECTS =====
    setupParallaxEffects() {
        // Background parallax disabled to keep backgrounds static
        // and avoid animating large surfaces
    }

    // ===== INTERACTIVE ELEMENTS =====
    setupInteractiveElements() {
        // Add ripple effect to buttons
        const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.createRippleEffect(e);
            });
        });

        // Add typing effect to hero title
        this.setupTypingEffect();

        // Initialize home stats counters
        this.initializeHomeStats();
    }

    createRippleEffect(event) {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    setupTypingEffect() {
        const heroTitle = document.querySelector('.hero-title');
        if (!heroTitle) return;

        const titleLines = heroTitle.querySelectorAll('.hero-title-line');
        titleLines.forEach((line, index) => {
            const text = line.textContent;
            line.textContent = '';
            line.style.animation = 'none';

            setTimeout(() => {
                this.typeText(line, text, 50);
            }, 1000 + (index * 1000));
        });
    }

    typeText(element, text, speed) {
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    }

    // ===== HOME STATS =====
    async initializeHomeStats() {
        // Define the elements
        const collegesEl = document.getElementById('home-total-colleges');
        const membersEl = document.getElementById('home-total-members');
        const unitsEl = document.getElementById('home-active-units');
        const lastSyncEl = document.getElementById('home-last-sync');

        // Utility to animate the numbers (from your existing code)
        const animateNumber = (el, target) => {
            if (!el) return;
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) {
                el.textContent = Number(target).toLocaleString();
                return;
            }
            const duration = 1200;
            const start = 0;
            const increment = target / (duration / 16);
            let current = start;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                el.textContent = Math.floor(current).toLocaleString();
            }, 16);
        };

        try {
            // Fetch data from your Google Apps Script backend
            // Make sure to replace 'YOUR_GAS_WEB_APP_URL' if it's not globally defined
            // This URL is the same one used in your unit.js file.
            const GAS_URL = 'https://script.google.com/macros/s/AKfycbzkOBsj6PS_ncTAy3I_hTJV4TWzup322AdUkCjpZZ1M1_RD1EHrLRQjgzdkKdNTR3-I/exec';  // also change in unit.js
            const response = await fetch(`${GAS_URL}?action=public-stats`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.stats) {
                // Use the live data to start the animations
                animateNumber(collegesEl, data.stats.total_colleges || 0);
                animateNumber(membersEl, data.stats.total_members || 0);
                animateNumber(unitsEl, data.stats.active_units || 0);
                if (lastSyncEl) lastSyncEl.textContent = new Date().toLocaleTimeString();
            } else {
                throw new Error(data.error || 'Failed to parse stats');
            }

        } catch (error) {
            console.error("Failed to fetch homepage stats:", error);
            // Display fallback text if the fetch fails
            if (collegesEl) collegesEl.textContent = 'N/A';
            if (membersEl) membersEl.textContent = 'N/A';
            if (unitsEl) unitsEl.textContent = 'N/A';
            if (lastSyncEl) lastSyncEl.textContent = 'Error';
        }
    }

    // ===== HOMEPAGE GALLERY =====
    async initializeHomepageGallery() {
        const grid = document.getElementById('gallery-preview-grid');
        if (!grid) return;

        try {
            const response = await fetch('/Gallary/images.json');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const allEvents = await response.json();

            // --- Updated Image Selection Logic ---
            const vimarsh2024 = allEvents.vimarsh2024?.images || [];
            const vimarsh2023 = allEvents.vimarsh2023?.images || [];

            // Get the first 5 photos from 2024 (excluding the logo)
            const photos2024 = vimarsh2024
                .filter(img => img.category !== 'logo')
                .slice(0, 5);

            // Get the first 5 photos from 2023 (excluding the logo)
            const photos2023 = vimarsh2023
                .filter(img => img.category !== 'logo')
                .slice(0, 5);

            const selectedImages = [...photos2024, ...photos2023];

            if (selectedImages.length === 0) {
                grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No photos found for recent events.</p>';
                return;
            }

            // --- Create and Append Image Elements ---
            const fragment = document.createDocumentFragment();
            selectedImages.forEach((imgData, index) => {
                const item = document.createElement('figure');
                item.className = 'gallery-preview-item';
                item.style.animationDelay = `${index * 100}ms`;

                const img = document.createElement('img');
                img.src = imgData.src;
                img.alt = imgData.alt;
                img.loading = 'lazy';
                img.decoding = 'async';

                item.appendChild(img);
                fragment.appendChild(item);
            });

            grid.innerHTML = ''; // Clear previous message
            grid.appendChild(fragment);

        } catch (error) {
            console.error('Failed to load homepage gallery:', error);
            grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Could not load gallery at this time.</p>';
        }
    }
}

// ===== FLASH NOTIFICATION SYSTEM =====
class FlashNotification {
    constructor() {
        this.initializeFlashSystem();
    }

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

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
    }

    showSuccess(title, message, duration = 5000) {
        this.showFlashNotification('success', title, message, duration);
    }

    showError(title, message, duration = 5000) {
        this.showFlashNotification('error', title, message, duration);
    }

    showWarning(title, message, duration = 5000) {
        this.showFlashNotification('warning', title, message, duration);
    }

    showInfo(title, message, duration = 5000) {
        this.showFlashNotification('info', title, message, duration);
    }
}

// ===== UTILITY FUNCTIONS =====
class HomeUtils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}

// ===== INITIALIZE ON DOM LOAD =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize flash notifications first (used by other classes)
    window.flashNotification = new FlashNotification();

    // Initialize new dynamic content manager
    new HomePageManager();

    // Initialize animations
    new HomePageAnimations();

    // Add ripple effect styles
    const style = document.createElement('style');
    style.textContent = `
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        }
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Show welcome message
    setTimeout(() => {
        if (window.flashNotification) {
            window.flashNotification.showSuccess('Welcome to YUVA Delhi!', 'Explore our community and initiatives.', 3000);
        }
    }, 2000);
});

// ===== EXPORT FOR GLOBAL ACCESS =====
window.HomePageManager = HomePageManager;
window.HomePageAnimations = HomePageAnimations;
window.FlashNotification = FlashNotification;
window.HomeUtils = HomeUtils;