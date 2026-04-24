// Navbar color change on scroll
window.addEventListener("scroll", function () {
    const navbar = document.querySelector(".navbar");
    navbar.classList.toggle("scrolled", window.scrollY > 50);
});

// ======================About=====================
// Wait for DOM to be ready before initializing
document.addEventListener("DOMContentLoaded", () => {
    initNavbar();
    initAboutSection();
    initSpeakersSlider(); // <-- Will be updated
    initSpeakersHeading();
    initGallerySection(); // <-- Will be updated
    initArchiveSection();
    initScheduleButton();
    initLightbox();
    initKnowMore();

    lazyLoadImages(); // Initial lazy load
});

function initNavbar() {
    window.addEventListener("scroll", function () {
        const navbar = document.querySelector(".navbar");
        navbar.classList.toggle("scrolled", window.scrollY > 50);
    });
}

function initAboutSection() {
    const aboutSection = document.querySelector(".about");
    if (!aboutSection) return;

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    aboutSection.classList.add("in-view");
                } else {
                    setTimeout(() => {
                        if (!entry.isIntersecting) {
                            aboutSection.classList.remove("in-view");
                        }
                    }, 200);
                }
            });
        },
        { threshold: 0.5 }
    );

    observer.observe(aboutSection);
}

/**
 * UPDATED FUNCTION
 * Animates the speaker slider using scrollLeft to allow for a native scrollbar.
 */
function initSpeakersSlider() {
    const viewport = document.getElementById("speakersSlider");
    if (!viewport) return;
    const track = viewport.querySelector(".speakers-track");
    const cards = Array.from(track.querySelectorAll(".speaker-card"));
    if (cards.length === 0) return; // Safety check

    // Clone cards *once* for the seamless loop
    const clones = cards.map(c => c.cloneNode(true));
    track.append(...clones);

    function getSpeed() {
        if (window.innerWidth <= 480) return 40; // phones
        if (window.innerWidth <= 768) return 60;  // tablets
        return 65; // desktops
    }

    let animRunning = false;
    let rafId = null;
    let lastTs = null;
    let isAnimatingScroll = false; // Flag to detect JS-driven scroll
    let scrollTimeout = null; // Timeout to resume play after manual scroll

    // Calculate width of original cards + gaps
    const cardStyle = window.getComputedStyle(cards[0]);
    const cardWidth = cards[0].offsetWidth + parseFloat(cardStyle.marginLeft) + parseFloat(cardStyle.marginRight);
    const cardGap = parseFloat(window.getComputedStyle(track).gap) || 30;
    const setWidth = cards.length * (cardWidth + cardGap) - cardGap; // Total width of one set


    function step(ts) {
        if (!animRunning) { lastTs = null; return; }
        if (lastTs == null) lastTs = ts;
        const dt = (ts - lastTs) / 1000;
        lastTs = ts;

        const SPEED_PX_PER_SEC = getSpeed();

        // Animate scrollLeft
        isAnimatingScroll = true; // Set flag
        viewport.scrollLeft += SPEED_PX_PER_SEC * dt;

        // Check for loop reset
        if (viewport.scrollLeft >= setWidth) {
            // Instantly snap back
            viewport.scrollLeft -= setWidth;
        }

        // Unset flag in the next frame
        requestAnimationFrame(() => { isAnimatingScroll = false; });

        rafId = requestAnimationFrame(step);
    }

    function play() {
        if (animRunning) return;
        animRunning = true;
        rafId = requestAnimationFrame(step);
    }

    function pause() {
        animRunning = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; lastTs = null; }
    }

    // Pause on manual scroll, resume after 3 seconds
    viewport.addEventListener("scroll", () => {
        if (isAnimatingScroll) return; // Ignore scrolls triggered by step()
        pause();
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(play, 3000);
    }, { passive: true });

    // Pause/resume on hover
    viewport.addEventListener("mouseenter", pause, { passive: true });
    viewport.addEventListener("mouseleave", () => {
        clearTimeout(scrollTimeout); // Prevent hover-out from clashing
        scrollTimeout = setTimeout(play, 120); // Short delay
    }, { passive: true });

    // Only run when visible
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) play();
            else pause();
        });
    }, { threshold: 0.35 });
    io.observe(viewport);

    // Flip animation (click/tap/keyboard) - UNCHANGED
    track.querySelectorAll(".speaker-card").forEach(card => {
        card.addEventListener("click", () => card.classList.toggle("is-flipped"));
        card.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                card.classList.toggle("is-flipped");
            }
        });
    });

    // start initially if visible
    setTimeout(() => {
        if (viewport.getBoundingClientRect().top < window.innerHeight) play();
    }, 200);
}


function initSpeakersHeading() {
    const heading = document.querySelector(".speakers h2");
    if (!heading) return;

    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                heading.classList.add("is-visible");
            } else {
                heading.classList.remove("is-visible");
            }
        });
    }, { threshold: 0.3 });

    io.observe(heading);
}

/**
 * UPDATED FUNCTION
 * Replaces the CSS animation with a JS-driven scrollLeft animation 
 * to allow for a native scrollbar.
 */
function initGallerySection() {
    const heading = document.querySelector(".gallery h2");
    if (!heading) return;

    const ioHeading = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                heading.classList.add("is-visible");
            } else {
                heading.classList.remove("is-visible");
            }
        });
    }, { threshold: 0.3 });

    ioHeading.observe(heading);

    const gallerySection = document.querySelector(".gallery");
    const viewport = document.querySelector(".gallery .slider-container");
    const track = viewport ? viewport.querySelector(".slider-track") : null;
    const galleryBtn = document.querySelector(".gallery .gallery-btn");
    if (!gallerySection || !viewport || !track) return;

    const supabaseConfig = (typeof window !== 'undefined' && window.SUPABASE_CONFIG)
        ? window.SUPABASE_CONFIG
        : ((typeof SUPABASE_CONFIG !== 'undefined') ? SUPABASE_CONFIG : null);

    function detectVimarshPageYear() {
        const path = (window.location.pathname || '').toLowerCase();
        const pathMatch = path.match(/vimarsh(\d{4})\.html$/i);
        if (pathMatch) return pathMatch[1];

        const heroTitle = document.querySelector('#hero h1')?.textContent || '';
        const hero2kMatch = heroTitle.match(/2k(\d{2})/i);
        if (hero2kMatch) return `20${hero2kMatch[1]}`;

        const title = document.title || '';
        const titleYearMatch = title.match(/(20\d{2})/);
        if (titleYearMatch) return titleYearMatch[1];

        return null;
    }

    function showNoGalleryPhotos(yearLabel) {
        viewport.style.display = 'none';
        if (galleryBtn) {
            galleryBtn.style.display = 'none';
        }

        if (gallerySection.querySelector('.gallery-empty-state-wrap')) return;

        const emptyWrap = document.createElement('div');
        emptyWrap.className = 'gallery-empty-state-wrap';
        emptyWrap.style.display = 'flex';
        emptyWrap.style.justifyContent = 'center';
        emptyWrap.style.alignItems = 'center';
        emptyWrap.style.minHeight = '42vh';
        emptyWrap.style.width = '100%';
        emptyWrap.style.padding = '0 16px';

        const empty = document.createElement('p');
        empty.className = 'gallery-empty-state';
        empty.textContent = `No gallery photos available for ${yearLabel}.`;
        empty.style.textAlign = 'center';
        empty.style.fontSize = '1.1rem';
        empty.style.fontWeight = '700';
        empty.style.color = '#7a0000';
        empty.style.margin = '0 auto';
        empty.style.maxWidth = '940px';
        empty.style.width = '100%';
        empty.style.padding = '12px 16px';
        empty.style.border = '1px solid rgba(122, 0, 0, 0.2)';
        empty.style.borderRadius = '12px';
        empty.style.background = '#fff7eb';

        emptyWrap.appendChild(empty);
        gallerySection.appendChild(emptyWrap);
    }

    function isImageFile(fileName) {
        return /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName || '');
    }

    async function loadYearGalleryImages() {
        const pageYear = detectVimarshPageYear();
        if (!pageYear) {
            showNoGalleryPhotos('this year');
            return false;
        }

        if (!supabaseConfig?.PROJECT_URL || !supabaseConfig?.ANON_KEY || !supabaseConfig?.BUCKET_NAME) {
            showNoGalleryPhotos(pageYear);
            return false;
        }

        const listUrl = `${supabaseConfig.PROJECT_URL}/storage/v1/object/list/${supabaseConfig.BUCKET_NAME}`;

        async function listImagesForPrefix(prefix) {
            const response = await fetch(listUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseConfig.ANON_KEY}`,
                    'apikey': supabaseConfig.ANON_KEY
                },
                body: JSON.stringify({
                    prefix,
                    limit: 1000,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'asc' }
                })
            });

            if (!response.ok) {
                return [];
            }

            const files = await response.json();
            return files
                .filter(file => file?.name && isImageFile(file.name))
                .map(file => ({ ...file, __prefix: prefix }));
        }

        const prefixes = [
            `photos/vimarsh/${pageYear}/gallery`,
            `photos/vimarsh/${pageYear}`
        ];

        const allImages = (await Promise.all(prefixes.map(listImagesForPrefix))).flat();

        const uniqueByPath = new Map();
        allImages.forEach(file => {
            const key = `${file.__prefix}/${file.name}`;
            if (!uniqueByPath.has(key)) {
                uniqueByPath.set(key, file);
            }
        });

        const imageFiles = Array.from(uniqueByPath.values())
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        if (imageFiles.length === 0) {
            showNoGalleryPhotos(pageYear);
            return false;
        }

        track.innerHTML = imageFiles
            .map(file => {
                const src = `${supabaseConfig.PROJECT_URL}/storage/v1/object/public/${supabaseConfig.BUCKET_NAME}/${file.__prefix}/${file.name}`;
                return `<img src="${src}" alt="Gallery ${pageYear}">`;
            })
            .join('');

        return true;
    }

    function startGallerySlider() {
        const images = Array.from(track.querySelectorAll("img"));
        if (images.length === 0) return;

        const clones = images.map(img => img.cloneNode(true));
        track.append(...clones);

        const SPEED_PX_PER_SEC = 50;
        let animRunning = false;
        let rafId = null;
        let lastTs = null;
        let isAnimatingScroll = false;
        let scrollTimeout = null;

        const imgStyle = window.getComputedStyle(images[0]);
        const imgWidth = images[0].offsetWidth + parseFloat(imgStyle.marginLeft) + parseFloat(imgStyle.marginRight);
        const imgGap = parseFloat(window.getComputedStyle(track).gap) || 15;
        const setWidth = images.length * (imgWidth + imgGap) - imgGap;

        function step(ts) {
            if (!animRunning) { lastTs = null; return; }
            if (lastTs == null) lastTs = ts;
            const dt = (ts - lastTs) / 1000;
            lastTs = ts;

            isAnimatingScroll = true;
            viewport.scrollLeft += SPEED_PX_PER_SEC * dt;

            if (viewport.scrollLeft >= setWidth) {
                viewport.scrollLeft -= setWidth;
            }

            requestAnimationFrame(() => { isAnimatingScroll = false; });
            rafId = requestAnimationFrame(step);
        }

        function play() {
            if (animRunning) return;
            animRunning = true;
            rafId = requestAnimationFrame(step);
        }

        function pause() {
            animRunning = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; lastTs = null; }
        }

        viewport.addEventListener("scroll", () => {
            if (isAnimatingScroll) return;
            pause();
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(play, 3000);
        }, { passive: true });

        viewport.addEventListener("mouseenter", pause, { passive: true });
        viewport.addEventListener("mouseleave", () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(play, 120);
        }, { passive: true });

        const ioSlider = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) play();
                else pause();
            });
        }, { threshold: 0.35 });
        ioSlider.observe(viewport);

        setTimeout(() => {
            if (viewport.getBoundingClientRect().top < window.innerHeight) play();
        }, 200);
    }

    loadYearGalleryImages()
        .then(hasImages => {
            if (hasImages) {
                startGallerySlider();
            }
        })
        .catch(() => {
            const year = detectVimarshPageYear() || 'this year';
            showNoGalleryPhotos(year);
        });
}


function initArchiveSection() {
    const archiveHeading = document.querySelector(".archives h2");
    const cards = document.querySelectorAll(".archive-card");
    if (!archiveHeading || !cards.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
            }
        });
    }, { threshold: 0.2 });

    observer.observe(archiveHeading);
    cards.forEach(card => observer.observe(card));

    // Subtle tilt effect on hover
    cards.forEach(card => {
        card.addEventListener("mousemove", e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / 10) * -1;
            const rotateY = (x - centerX) / 10;
            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        card.addEventListener("mouseleave", () => {
            card.style.transform = "rotateX(0) rotateY(0)";
        });
    });
}

function getScheduleReadyFlag() {
    return Boolean(window.VIMARSH_FEATURE_FLAGS && window.VIMARSH_FEATURE_FLAGS.scheduleModal);
}

function initScheduleButton() {
    // Find all the necessary elements first
    const scheduleButton = document.getElementById('schedule-btn');
    const scheduleModal = document.getElementById('scheduleModal');
    const closeModalButton = document.getElementById('closeScheduleModal');

    if (scheduleButton && scheduleModal && closeModalButton) {
        scheduleButton.addEventListener('click', function (event) {
            if (!getScheduleReadyFlag()) {
                event.preventDefault();
                scheduleModal.style.display = 'flex';
            }
            // If isScheduleReady is true, the link works normally
        });

        closeModalButton.addEventListener('click', () => {
            scheduleModal.style.display = 'none';
        });

        scheduleModal.addEventListener('click', (event) => {
            if (event.target === scheduleModal) {
                scheduleModal.style.display = 'none';
            }
        });
    }
}


// ===== LAZY IMAGE LOADING =====
function lazyLoadImages() {
    const images = document.querySelectorAll(".gallery-item img");

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                if (src) {
                    img.src = src;
                    img.onload = () => {
                        img.classList.add("loaded"); // fade-in effect
                        img.dataset.loaded = "true";
                    };
                    img.removeAttribute("data-src");
                }
                obs.unobserve(img);
            }
        });
    }, { rootMargin: "100px" });

    images.forEach(img => observer.observe(img));
}

function initLightbox() {
    // ===== FILTER FUNCTIONALITY =====
    const filterBtns = document.querySelectorAll(".filter-btn");
    const galleryItems = document.querySelectorAll(".gallery-item");

    // Only run filter logic if buttons exist
    if (filterBtns.length > 0 && galleryItems.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelector(".filter-btn.active")?.classList.remove("active");
                btn.classList.add("active");

                const year = btn.dataset.filter;

                galleryItems.forEach(item => {
                    if (year === "all" || item.dataset.year === year) {
                        item.classList.remove("hide");
                    } else {
                        item.classList.add("hide");
                    }
                });
                lazyLoadImages(); // Re-run lazy load for newly visible items
            });
        });
    }

    // ===== LIGHTBOX FUNCTIONALITY =====
    const lightbox = document.getElementById("lightbox");

    // ✅ IMPORTANT: Only run the rest of the code if the lightbox exists on the page
    if (lightbox) {
        const lightboxImg = document.querySelector(".lightbox-content");
        const closeBtn = document.querySelector("#lightbox .close");
        const prevArrow = document.querySelector(".lightbox-arrow.left");
        const nextArrow = document.querySelector(".lightbox-arrow.right");

        let currentIndex = -1;

        function getVisibleImages() {
            return [...document.querySelectorAll(".gallery-item:not(.hide) img.loaded")];
        }

        function showLightbox(index) {
            const visibleImages = getVisibleImages();
            if (!visibleImages.length) return;
            currentIndex = index;
            lightbox.style.display = "flex";
            lightboxImg.src = visibleImages[currentIndex].src;
        }

        // Open lightbox on click
        document.addEventListener("click", e => {
            if (e.target.matches(".gallery-item img.loaded")) {
                const visibleImages = getVisibleImages();
                const index = visibleImages.indexOf(e.target);
                if (index !== -1) showLightbox(index);
            }
        });

        // Close lightbox
        if (closeBtn) {
            closeBtn.addEventListener("click", () => lightbox.style.display = "none");
        }

        lightbox.addEventListener("click", e => {
            if (e.target === lightbox) lightbox.style.display = "none";
        });

        // Navigate with arrows
        if (prevArrow) {
            prevArrow.addEventListener("click", () => {
                const visibleImages = getVisibleImages();
                if (!visibleImages.length) return;
                currentIndex = (currentIndex - 1 + visibleImages.length) % visibleImages.length;
                lightboxImg.src = visibleImages[currentIndex].src;
            });
        }

        if (nextArrow) {
            nextArrow.addEventListener("click", () => {
                const visibleImages = getVisibleImages();
                if (!visibleImages.length) return;
                currentIndex = (currentIndex + 1) % visibleImages.length;
                lightboxImg.src = visibleImages[currentIndex].src;
            });
        }

        // Keyboard support
        document.addEventListener("keydown", e => {
            if (lightbox.style.display === "flex") {
                if (e.key === "Escape") lightbox.style.display = "none";
                if (e.key === "ArrowLeft" && prevArrow) prevArrow.click();
                if (e.key === "ArrowRight" && nextArrow) nextArrow.click();
            }
        });
    }
}


function initKnowMore() {
    // Reveal animation on scroll
    const sections = document.querySelectorAll('.km-section');
    const navLinks = document.querySelectorAll('.year-nav a');

    const revealOnScroll = () => {
        sections.forEach(sec => {
            const top = sec.getBoundingClientRect().top;
            if (top < window.innerHeight - 100) {
                sec.classList.add('visible');
            }
        });

        let current = "";
        sections.forEach(sec => {
            const sectionTop = sec.offsetTop - 200;
            if (pageYOffset >= sectionTop) {
                current = sec.getAttribute("id");
            }
        });
        navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === "#" + current) {
                link.classList.add("active");
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    window.addEventListener('load', revealOnScroll);

    // Smooth scroll
    navLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href && href.startsWith("#")) {
            link.addEventListener("click", e => {
                e.preventDefault();
                const target = document.querySelector(href);
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: "smooth"
                });
            });
        }
    });

    // =============================
    // 3D Tilt Image Effect
    // =============================
    document.querySelectorAll('.km-img').forEach(container => {
        const img = container.querySelector('img');
        let rotateX = 0, rotateY = 0;
        let targetX = 0, targetY = 0;

        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            targetX = ((centerY - y) / centerY) * 10;
            targetY = ((x - centerX) / centerX) * 10;
        });

        container.addEventListener('mouseleave', () => {
            targetX = 0;
            targetY = 0;
        });

        function animate() {
            rotateX += (targetX - rotateX) * 0.08;
            rotateY += (targetY - rotateY) * 0.08;
            img.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            requestAnimationFrame(animate);
        }
        animate();
    });

    // =============================
    // Mobile Sidebar Functionality
    // =============================
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const yearNav = document.getElementById('year-nav');
    let isMobile = window.innerWidth <= 760;

    window.addEventListener('resize', () => {
        isMobile = window.innerWidth <= 760;
        if (!isMobile && yearNav) {
            yearNav.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!yearNav) return;
            yearNav.classList.toggle('active');
            document.body.style.overflow = yearNav.classList.contains('active') ? 'hidden' : '';
        });
    }

    if (yearNav && hamburgerMenu) {
        document.addEventListener('click', (e) => {
            if (yearNav.classList.contains('active') &&
                !yearNav.contains(e.target) &&
                !hamburgerMenu.contains(e.target)) {
                yearNav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href) return;

            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    if (yearNav) {
                        yearNav.classList.remove('active');
                    }
                    document.body.style.overflow = '';

                    setTimeout(() => {
                        window.scrollTo({
                            top: target.offsetTop - 80,
                            behavior: 'smooth'
                        });
                    }, 300);
                }
            }
        });
    });
}