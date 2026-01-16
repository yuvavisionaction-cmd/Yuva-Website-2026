/*=================================================================
  MODERN EVENTS PAGE JAVASCRIPT - YUVA 2025
  Comprehensive events manager with flash notifications
=================================================================*/

const SUPABASE_URL = 'https://jgsrsjwmywiirtibofth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5KtvO0cEHfnECBoyp2CQnw_RC3_x2me';

const supabaseClient = window.supabase ?
    window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const LIVE_SITE_URL = 'https://yuvaind.netlify.app';


/* =================================================================
   CUSTOM DROPDOWN FUNCTIONALITY
   ================================================================= */

class CustomDropdown {
    constructor() {
        this.dropdowns = [];
        this.init();
    }

    init() {
        const dropdownElements = document.querySelectorAll('.custom-dropdown');
        dropdownElements.forEach(dropdown => {
            this.setupDropdown(dropdown);
            this.dropdowns.push(dropdown);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-dropdown')) {
                this.closeAllDropdowns();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllDropdowns();
            }
        });
    }

    // THIS IS THE CORRECTED FUNCTION
    setupDropdown(dropdown) {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const menu = dropdown.querySelector('.dropdown-menu');
        const valueDisplay = dropdown.querySelector('.dropdown-value');
        const dropdownName = dropdown.dataset.name;

        // Make sure previous listeners are removed to avoid duplicates
        if (trigger.handler) {
            trigger.removeEventListener('click', trigger.handler);
        }
        if (menu.handler) {
            menu.removeEventListener('click', menu.handler);
        }

        // Handler for opening/closing the dropdown
        trigger.handler = (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('active');
            this.closeAllDropdowns();
            if (!isOpen) {
                dropdown.classList.add('active');
            }
        };
        trigger.addEventListener('click', trigger.handler);

        // Handler for selecting an item (delegated to the menu)
        menu.handler = (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;

            e.stopPropagation();

            // Update active state on ALL items within this menu
            const allItems = menu.querySelectorAll('.dropdown-item');
            allItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            valueDisplay.textContent = item.textContent;
            dropdown.classList.remove('active');

            const selectedValue = item.dataset.value;
            this.triggerFilterChange(dropdownName, selectedValue, item.textContent);
        };
        menu.addEventListener('click', menu.handler);
    }

    closeAllDropdowns() {
        this.dropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }

    triggerFilterChange(dropdownName, value, text) {
        const event = new CustomEvent('customDropdownChange', {
            detail: { dropdownName, value, text }
        });
        document.dispatchEvent(event);
    }

    // ... (The rest of your CustomDropdown class methods can remain the same)
    getValue(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return '';
        const activeItem = dropdown.querySelector('.dropdown-item.active');
        return activeItem ? activeItem.dataset.value : '';
    }
    setValue(dropdownId, value) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;
        const items = dropdown.querySelectorAll('.dropdown-item');
        const valueDisplay = dropdown.querySelector('.dropdown-value');
        items.forEach(item => {
            if (item.dataset.value === value) {
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                valueDisplay.textContent = item.textContent;
            }
        });
    }
    reset(dropdownId) {
        this.setValue(dropdownId, '');
    }
}

// Initialize custom dropdowns globally
let customDropdownInstance = null;

class EventsPage {
    constructor() {
        this.events = [];
        this.filteredEvents = [];
        this.currentView = 'grid';
        this.selectedEvent = null;
        this.isLoading = false;
        this.countdownIntervals = [];
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            await this.fetchEvents();
            this.populateFilterDropdowns();
            this.applyFilters();
            this.renderFeatured();
            // Note: updateEventInsights is called from fetchEvents()
            // Updated call with Title
            this.showNotification('Welcome', 'Events loaded successfully!', 'success');
        } catch (err) {
            console.error('Init error:', err);
            this.showNotification('Error', 'Failed to load events', 'error');
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('event-search');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.applyFilters(), 300);
            });
        }

        // Custom dropdown changes
        document.addEventListener('customDropdownChange', (e) => {
            const { dropdownName, text } = e.detail;

            if (dropdownName === 'category-filter' || dropdownName === 'mode-filter') {
                this.applyFilters();
                this.showNotification('Filter Applied', `Filter: ${text}`, 'info');
            }
        });

        // --- NEW: VIEW TOGGLE LOGIC ---
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Don't do anything if it's already active
                if (btn.classList.contains('active')) return;

                viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.currentView = btn.dataset.view || 'grid';
                const gridContainer = document.getElementById('events-grid');

                if (this.currentView === 'list') {
                    gridContainer.classList.add('list-view');
                } else {
                    gridContainer.classList.remove('list-view');
                }

                this.showNotification('View Changed', `Switched to ${this.currentView} view`, 'info');
            });
        });
        // --- END NEW ---

        // Reset button
        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetAllFilters();
                this.showNotification('Reset', 'Filters cleared', 'success');
            });
        }

        // Modal listeners (unchanged)
        document.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal());
        const modal = document.getElementById('event-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    async fetchEvents() {
        this.isLoading = true;
        this.showLoader(true);

        try {
            if (!supabaseClient) throw new Error('Supabase not available');

            const now = new Date().toISOString();

            // Fetch upcoming events (events that haven't ended yet)
            // Automatic migration: Any event with end_at >= now appears here
            const { data, error } = await supabaseClient
                .from('published_events')
                .select('*')
                .eq('display_on_upcoming', true)  // Only get events marked for upcoming page
                .gte('end_at', now)                // Events that haven't ended yet (automatic migration)
                .order('start_at', { ascending: true })
                .limit(50);

            if (error) throw error;

            this.events = (data || []).map(e => this.normalizeEvent(e));

            if (this.events.length === 0) {
                // No published events, show empty state
                this.showNotification('No Events', 'No published events available at the moment.', 'info');
            } else {
                // Update stats from fetched events
                updateEventInsights(this.events);
            }
        } catch (err) {
            console.error('Error fetching events:', err);
            this.showNotification('Error', 'Failed to load events', 'error');
            this.events = [];
            // Reset stats on error
            updateEventInsights([]);
        } finally {
            this.isLoading = false;
            this.showLoader(false);
        }
    }

    normalizeEvent(e) {
        // Parse speakers if it's a JSON string
        let speakers = [];
        if (e.speakers) {
            try {
                speakers = typeof e.speakers === 'string' ? JSON.parse(e.speakers) : e.speakers;
            } catch (err) {
                console.warn('Failed to parse speakers:', err);
                speakers = [];
            }
        }

        return {
            id: e.id || Math.random().toString(36).substr(2, 9),
            title: e.title || 'Untitled Event',

            // Use long_description if available (from event_publications), fallback to description
            description: e.long_description || e.description || '',

            // Use banner_url from event_publications if available
            banner_url: e.banner_url || 'https://via.placeholder.com/600x400/ccc/999?text=Event',

            start_at: e.start_at || new Date().toISOString(),
            end_at: e.end_at || '',
            location: e.location || 'Online',

            // Use mode and category from event_publications (extended details)
            mode: (e.mode || 'offline').toLowerCase(),
            category: e.category || 'General',

            // Use extended details from event_publications
            speakers: speakers,
            registration_url: e.registration_url || '#',
            capacity: e.capacity || null,

            status: e.status || 'upcoming',
            organizer: e.college_name || 'YUVA India',

            // Additional metadata
            college_code: e.college_code || '',
            display_on_home: e.display_on_home || false,
            display_on_upcoming: e.display_on_upcoming || false
        };
    }
    /**
 * Fetch events for home page (basic details only)
 */
    async fetchHomePageEvents() {
        try {
            if (!supabaseClient) throw new Error('Supabase not available');

            const now = new Date().toISOString();

            // Fetch events marked for home page
            const { data, error } = await supabaseClient
                .from('published_events')
                .select('id, title, description, banner_url, start_at, end_at, location, category, college_name')
                .eq('display_on_home', true)  // Only get events marked for home page
                .gte('start_at', now)
                .in('status', ['upcoming', 'scheduled'])
                .order('start_at', { ascending: true })
                .limit(6);  // Limit for home page

            if (error) throw error;

            return (data || []).map(e => ({
                id: e.id,
                title: e.title,
                description: e.description ? e.description.substring(0, 150) + '...' : '',
                banner_url: e.banner_url || 'https://via.placeholder.com/600x400/ccc/999?text=Event',
                start_at: e.start_at,
                end_at: e.end_at,
                location: e.location,
                category: e.category || 'Event',
                organizer: e.college_name || 'YUVA India'
            }));
        } catch (err) {
            console.error('Error fetching home page events:', err);
            return [];
        }
    }

    async populateFilterDropdowns() {
        // 1. Populate CATEGORIES from the database
        try {
            const { data: categories, error } = await supabaseClient
                .from('event_categories')
                .select('name')
                .order('name', { ascending: true });

            if (error) throw error;

            const categoryDropdown = document.getElementById('category-filter');
            if (categoryDropdown) {
                const categoryMenu = categoryDropdown.querySelector('.dropdown-menu');
                const existingItems = categoryMenu.querySelectorAll('.dropdown-item:not([data-value=""])');

                if (existingItems.length === 0) {
                    categories.forEach(cat => {
                        const item = document.createElement('div');
                        item.className = 'dropdown-item';
                        item.dataset.value = cat.name;
                        item.textContent = cat.name;
                        categoryMenu.appendChild(item);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to populate category filter:', error);
            this.showNotification('Error', 'Could not load event categories.', 'error');
        }

        // 2. Re-initialize all dropdowns to ensure listeners are correctly attached
        if (customDropdownInstance) {
            document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
                customDropdownInstance.setupDropdown(dropdown);
            });
        }
    }

    applyFilters() {
        const searchTerm = (document.getElementById('event-search')?.value || '').toLowerCase();

        // Get values from custom dropdowns
        const category = customDropdownInstance.getValue('category-filter');
        const mode = customDropdownInstance.getValue('mode-filter'); // <-- Changed from 'location-filter'

        this.filteredEvents = this.events.filter(event => {
            const searchMatch = !searchTerm ||
                event.title.toLowerCase().includes(searchTerm) ||
                event.description.toLowerCase().includes(searchTerm) ||
                event.location.toLowerCase().includes(searchTerm);

            const categoryMatch = !category || event.category === category;
            const modeMatch = !mode || event.mode === mode; // <-- Changed from locationMatch

            return searchMatch && categoryMatch && modeMatch;
        });

        // Re-render the grid with the new filtered list
        this.renderGrid(this.filteredEvents);
        this.updateEmptyState();
    }

    resetAllFilters() {
        document.getElementById('event-search').value = '';

        if (customDropdownInstance) {
            customDropdownInstance.reset('category-filter');
            customDropdownInstance.reset('mode-filter'); // <-- Changed from 'location-filter'
        }

        this.applyFilters();
    }

    renderGrid(eventsList) {
        const grid = document.getElementById('events-grid');
        if (!grid) return;

        grid.innerHTML = '';

        if (eventsList.length === 0) return;

        eventsList.forEach((event, idx) => {
            const card = this.createEventCard(event, idx);
            grid.appendChild(card);
        });
    }

    createEventCard(event, idx) {
        const card = document.createElement('div');
        card.className = 'event-card-modern';
        const colors = ['accent-saffron', 'accent-navy', 'accent-green'];
        card.classList.add(colors[idx % 3]);

        const startDate = new Date(event.start_at);
        const day = startDate.getDate();
        const month = startDate.toLocaleString('default', { month: 'short' }).toUpperCase();
        const time = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        card.innerHTML = `
            <div class="card-img-container">
                <img src="${event.banner_url}" alt="${event.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400/ccc/999?text=Event'">
                <div class="date-badge-float">
                    <span class="db-day">${day}</span>
                    <span class="db-month">${month}</span>
                </div>
            </div>
            <div class="card-content">
                <div class="card-meta">
                    <span><i class="far fa-clock"></i> ${time}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                    ${event.mode === 'online' ? '<span><i class="fas fa-globe"></i> Online</span>' : ''}
                </div>
                <h3>${event.title}</h3>
                <p>${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
                <div class="card-actions">
                    <button class="btn-primary btn-sm register-btn" data-event-id="${event.id}">
                        <i class="fas fa-ticket-alt"></i> Register
                    </button>
                    <button class="btn-secondary btn-sm details-btn" data-event-id="${event.id}">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;

        card.querySelector('.register-btn').addEventListener('click', () => {
            this.handleRegister(event);
        });

        card.querySelector('.details-btn').addEventListener('click', () => {
            this.openModal(event);
        });

        return card;
    }

    handleRegister(event) {
        if (event.registration_url && event.registration_url !== '#') {
            window.open(event.registration_url, '_blank');
            this.showNotification('Redirecting', `Going to registration for "${event.title}"`, 'success');
        } else {
            this.showNotification('Info', 'Registration link coming soon!', 'info');
        }
    }

    renderFeatured() {
        const container = document.getElementById('featured-event-container');
        if (!container) return;

        // Show empty state if no events
        if (this.filteredEvents.length === 0) {
            container.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 80px 20px;
                    min-height: 400px;
                    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
                    border-radius: 16px;
                    border: 2px dashed #cbd5e1;
                    margin: 0 auto;
                    width: 100%;
                ">
                    <i class="far fa-calendar-times" style="
                        font-size: 5rem;
                        margin-bottom: 24px;
                        color: #cbd5e1;
                    "></i>
                    <h3 style="
                        color: #000080;
                        margin-bottom: 12px;
                        font-size: 1.75rem;
                        font-weight: 700;
                    ">No Featured Events</h3>
                    <p style="
                        color: #64748b;
                        font-size: 1rem;
                        max-width: 400px;
                        line-height: 1.6;
                    ">Check back soon for upcoming events and exciting opportunities!</p>
                </div>
            `;
            return;
        }

        const featured = this.filteredEvents[0];
        const startDate = new Date(featured.start_at);
        const dateStr = startDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });

        container.innerHTML = `
            <div class="featured-img">
                <img src="${featured.banner_url}" alt="${featured.title}">
            </div>
            <div class="featured-content">
                <div class="hero-badge" style="width: fit-content; margin-bottom: 16px;">
                    <i class="fas fa-star"></i> Featured Event
                </div>
                <h2 style="font-size: 2.5rem; color: #000080; margin: 12px 0; line-height: 1.1;">
                    ${featured.title}
                </h2>
                <p style="font-size: 1rem; color: #475569; margin: 12px 0 20px 0;">
                    ${featured.description.substring(0, 180)}...
                </p>
                <div style="display: flex; gap: 20px; margin: 20px 0; color: #64748b; font-weight: 600;">
                    <span><i class="far fa-calendar-alt"></i> ${dateStr}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${featured.location}</span>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="btn-primary" onclick="eventsPageInstance.handleRegister(eventsPageInstance.filteredEvents[0])">
                        <i class="fas fa-ticket-alt"></i> Register Now
                    </button>
                    <button class="btn-secondary" onclick="eventsPageInstance.openModal(eventsPageInstance.filteredEvents[0])">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                </div>
            </div>
        `;
    }

    openModal(event) {
        this.selectedEvent = event;
        const modal = document.getElementById('event-modal');
        const modalBody = document.getElementById('modal-body-content');

        if (!modal || !modalBody) return;

        const startDate = new Date(event.start_at);
        const dateStr = startDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = startDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Format end date if available
        let endDateStr = '';
        if (event.end_at) {
            const endDate = new Date(event.end_at);
            const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Check if same day
            if (startDate.toDateString() === endDate.toDateString()) {
                endDateStr = ` - ${endTime}`;
            } else {
                endDateStr = ` - ${endDate.toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric'
                })} ${endTime}`;
            }
        }

        // Build speakers HTML
        const speakersHtml = event.speakers && Array.isArray(event.speakers) && event.speakers.length > 0 ?
            `<div style="margin-top: 24px;">
            <h4 style="font-size: 1.1rem; margin: 0 0 12px 0; color: #000080; font-weight: 700;">
                <i class="fas fa-microphone"></i> Speakers & Guests
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
                ${event.speakers.map(s => `
                    <div style="text-align: center; padding: 16px; background: rgba(0,0,128,0.03); 
                         border-radius: 12px; border: 1px solid rgba(0,0,128,0.1); 
                         transition: all 0.3s ease;">
                        <div style="width: 60px; height: 60px; margin: 0 auto 12px; 
                             background: var(--gradient-navy); border-radius: 50%; 
                             display: flex; align-items: center; justify-content: center; 
                             color: white; font-size: 24px; font-weight: 700;">
                            ${s.name.charAt(0).toUpperCase()}
                        </div>
                        <div style="font-weight: 700; color: #000080; margin-bottom: 4px; font-size: 0.95rem;">
                            ${s.name}
                        </div>
                        <div style="font-size: 0.8rem; color: #64748b;">
                            ${s.role || 'Speaker'}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>` : '';

        // Mode badge
        const modeHtml = event.mode === 'online' ?
            '<span style="background: #EBF4FF; color: #000080; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-globe"></i> Online Event</span>' :
            event.mode === 'hybrid' ?
                '<span style="background: #D1FAE5; color: #0F6606; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-building"></i> Hybrid Event</span>' :
                '<span style="background: #FFE5CC; color: #E67300; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-map-marker-alt"></i> In-Person</span>';

        modalBody.innerHTML = `
        <img src="${event.banner_url}" alt="${event.title}" 
             style="width: 100%; max-height: 320px; object-fit: cover; border-radius: 8px 8px 0 0;">
        
        <div style="padding: 28px;">
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap;">
                <span style="background: #FFE5CC; color: #E67300; padding: 6px 14px; 
                       border-radius: 20px; font-size: 0.85rem; font-weight: 700;">
                    <i class="fas fa-tag"></i> ${event.category}
                </span>
                ${modeHtml}
            </div>
            
            <h2 style="margin: 0 0 8px 0; font-size: 2rem; color: #000080; line-height: 1.2;">
                ${event.title}
            </h2>
            
            <p style="color: #64748b; font-size: 0.9rem; margin: 0 0 24px 0;">
                <i class="fas fa-building"></i> Organized by ${event.organizer}
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
                 gap: 16px; margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 12px;">
                <div>
                    <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; 
                         letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600;">
                        <i class="far fa-calendar-alt"></i> Date & Time
                    </div>
                    <div style="font-weight: 700; color: #000080; font-size: 0.95rem;">
                        ${dateStr}
                    </div>
                    <div style="font-size: 0.9rem; color: #475569; margin-top: 4px;">
                        ${timeStr}${endDateStr}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; 
                         letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600;">
                        <i class="fas fa-map-marker-alt"></i> Location
                    </div>
                    <div style="font-weight: 700; color: #000080; font-size: 0.95rem;">
                        ${event.location}
                    </div>
                    <div style="font-size: 0.85rem; color: #475569; margin-top: 4px;">
                        ${event.mode === 'online' ? '🌐 Join from anywhere' : '🏢 In-person attendance'}
                    </div>
                </div>
                ${event.capacity ? `
                <div>
                    <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; 
                         letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600;">
                        <i class="fas fa-users"></i> Capacity
                    </div>
                    <div style="font-weight: 700; color: #000080; font-size: 0.95rem;">
                        ${event.capacity}
                    </div>
                    <div style="font-size: 0.85rem; color: #475569; margin-top: 4px;">
                        Attendees
                    </div>
                </div>
                ` : ''}
            </div>

            <div style="background: #f5f5f4; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h4 style="margin: 0 0 12px 0; color: #000080; font-weight: 700; font-size: 1.1rem;">
                    <i class="fas fa-info-circle"></i> About This Event
                </h4>
                <p style="margin: 0; line-height: 1.7; color: #475569; font-size: 0.95rem;">
                    ${event.description}
                </p>
            </div>

            ${speakersHtml}

            <div style="margin-top: 28px; display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="btn-primary" 
                        onclick="eventsPageInstance.handleRegister(eventsPageInstance.selectedEvent); eventsPageInstance.closeModal();" 
                        style="flex: 1; padding: 14px; min-width: 180px;">
                    <i class="fas fa-ticket-alt"></i> Register Now
                </button>
                <button class="btn-secondary" 
                        onclick="eventsPageInstance.shareEvent();" 
                        style="flex: 1; padding: 14px; min-width: 180px;">
                    <i class="fas fa-share-alt"></i> Share Event
                </button>
            </div>
        </div>
    `;

        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('event-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        document.body.style.overflow = 'auto';
        this.selectedEvent = null;
    }

    // NEW, SIMPLIFIED shareEvent function
    shareEvent() {
        if (this.selectedEvent) {
            openShareModal(this.selectedEvent);
        }
    }

    updateEmptyState() {
        const emptyState = document.getElementById('events-empty');
        if (emptyState) {
            emptyState.style.display = this.filteredEvents.length === 0 ? 'block' : 'none';
        }
    }

    showLoader(show) {
        const loader = document.getElementById('events-loading');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    // ------------------------------------------------------------------
    // UPDATED: Matches Home.css Flash Notification Structure Exactly
    // ------------------------------------------------------------------
    showNotification(title, message, type = 'info', duration = 4000) {
        const container = this.getNotificationContainer();
        const notification = document.createElement('div');

        // Use specific CSS classes from home.css
        notification.className = `flash-notification ${type}`;

        // Match Icons used in home.css
        const icons = {
            success: 'fa-check',
            error: 'fa-times',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const iconClass = icons[type] || icons.info;

        // Exact HTML Structure from Home.css
        notification.innerHTML = `
            <div class="flash-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="flash-content">
                <div class="flash-title">${title}</div>
                <div class="flash-message">${message}</div>
            </div>
            <button class="flash-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Add close event listener
        notification.querySelector('.flash-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });

        // Trigger Animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    }

    getNotificationContainer() {
        // Check for the container used in home.css
        let container = document.getElementById('flash-container');
        if (container) return container;

        // Create if it doesn't exist (using home.css class)
        container = document.createElement('div');
        container.id = 'flash-container';
        container.className = 'flash-container';
        document.body.appendChild(container);
        return container;
    }

    getNotificationColor(type) {
        const colors = {
            success: '#22C55E',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        return colors[type] || colors.info;
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Additional helper functions for event management

    /**
     * Get events by category
     */
    getEventsByCategory(category) {
        return this.events.filter(e => e.category === category);
    }

    /**
     * Get events by location
     */
    getEventsByLocation(location) {
        return this.events.filter(e => e.location === location);
    }

    /**
     * Get upcoming events in the next N days
     */
    getUpcomingEventsInDays(days) {
        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        return this.events.filter(e => {
            const eventDate = new Date(e.start_at);
            return eventDate >= now && eventDate <= futureDate;
        });
    }

    /**
     * Get most popular events (by capacity)
     */
    getMostPopularEvents(limit = 5) {
        return [...this.events]
            .sort((a, b) => (b.capacity || 0) - (a.capacity || 0))
            .slice(0, limit);
    }

    /**
     * Search events with advanced filters
     */
    searchEvents(query, filters = {}) {
        return this.filteredEvents.filter(event => {
            const matchesQuery = !query ||
                event.title.toLowerCase().includes(query.toLowerCase()) ||
                event.description.toLowerCase().includes(query.toLowerCase());

            const matchesCategory = !filters.category || event.category === filters.category;
            const matchesLocation = !filters.location || event.location === filters.location;
            const matchesMode = !filters.mode || event.mode === filters.mode;

            return matchesQuery && matchesCategory && matchesLocation && matchesMode;
        });
    }

    /**
     * Validate event data
     */
    isValidEvent(event) {
        return event.id && event.title && event.start_at && event.location;
    }

    /**
     * Format event date for display
     */
    formatEventDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /**
     * Format event time for display
     */
    formatEventTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Get time until event starts
     */
    getTimeUntilEvent(eventDate) {
        const now = new Date().getTime();
        const event = new Date(eventDate).getTime();
        const diff = event - now;

        if (diff < 0) return 'Event started';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} away`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} away`;
        return `${minutes} minute${minutes > 1 ? 's' : ''} away`;
    }

    /**
     * Export events to CSV
     */
    exportEventsToCSV() {
        if (this.filteredEvents.length === 0) {
            this.showNotification('Warning', 'No events to export', 'warning');
            return;
        }

        const headers = ['Title', 'Date', 'Time', 'Location', 'Category', 'Mode', 'Capacity'];
        const rows = this.filteredEvents.map(e => [
            e.title,
            this.formatEventDate(e.start_at),
            this.formatEventTime(e.start_at),
            e.location,
            e.category,
            e.mode,
            e.capacity || 'N/A'
        ]);

        const csv = [headers, ...rows].map(row =>
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `events-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.showNotification('Success', 'Events exported successfully!', 'success');
    }

    /**
     * Add event to favorites (local storage)
     */
    addToFavorites(eventId) {
        const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '[]');
        if (!favorites.includes(eventId)) {
            favorites.push(eventId);
            localStorage.setItem('favoriteEvents', JSON.stringify(favorites));
            this.showNotification('Success', 'Added to favorites', 'success');
        } else {
            this.showNotification('Info', 'Already in favorites', 'info');
        }
    }

    /**
     * Remove from favorites
     */
    removeFromFavorites(eventId) {
        const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '[]');
        const updated = favorites.filter(id => id !== eventId);
        localStorage.setItem('favoriteEvents', JSON.stringify(updated));
        this.showNotification('Success', 'Removed from favorites', 'success');
    }

    /**
     * Get favorite events
     */
    getFavoriteEvents() {
        const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '[]');
        return this.events.filter(e => favorites.includes(e.id));
    }

    /**
     * Check if event is favorited
     */
    isFavorited(eventId) {
        const favorites = JSON.parse(localStorage.getItem('favoriteEvents') || '[]');
        return favorites.includes(eventId);
    }

    /**
     * Debounce utility function
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle utility function
     */
    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Analytics: track event view
     */
    trackEventView(eventId) {
        const views = JSON.parse(localStorage.getItem('eventViews') || '{}');
        views[eventId] = (views[eventId] || 0) + 1;
        localStorage.setItem('eventViews', JSON.stringify(views));
    }

    /**
     * Get most viewed events
     */
    getMostViewedEvents(limit = 5) {
        const views = JSON.parse(localStorage.getItem('eventViews') || '{}');
        return this.events
            .map(e => ({ ...e, views: views[e.id] || 0 }))
            .sort((a, b) => b.views - a.views)
            .slice(0, limit);
    }

    /**
     * Get event statistics
     */
    getEventStatistics() {
        return {
            totalEvents: this.events.length,
            totalCapacity: this.events.reduce((sum, e) => sum + (e.capacity || 0), 0),
            categories: [...new Set(this.events.map(e => e.category))].length,
            locations: [...new Set(this.events.map(e => e.location))].length,
            onlineEvents: this.events.filter(e => e.mode === 'online').length,
            offlineEvents: this.events.filter(e => e.mode === 'offline').length,
            upcomingInWeek: this.getUpcomingEventsInDays(7).length
        };
    }

    /**
     * Print event details
     */
    printEvent(event) {
        const printWindow = window.open('', '', 'height=400,width=600');
        const html = `
            <h1>${event.title}</h1>
            <p><strong>Date:</strong> ${this.formatEventDate(event.start_at)}</p>
            <p><strong>Time:</strong> ${this.formatEventTime(event.start_at)}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Category:</strong> ${event.category}</p>
            <p><strong>Mode:</strong> ${event.mode}</p>
            <p><strong>Description:</strong></p>
            <p>${event.description}</p>
            <p><a href="${event.registration_url}">Register for this event</a></p>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }

    /**
     * Generate event reminder
     */
    setEventReminder(eventId, minutesBefore = 60) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            this.showNotification('Error', 'Event not found', 'error');
            return;
        }

        const eventTime = new Date(event.start_at).getTime();
        const reminderTime = eventTime - (minutesBefore * 60 * 1000);
        const now = new Date().getTime();

        if (reminderTime > now) {
            const delay = reminderTime - now;
            setTimeout(() => {
                this.showNotification('Reminder', `Reminder: ${event.title} starts in ${minutesBefore} minutes!`, 'warning');
            }, delay);
            this.showNotification('Success', `Reminder set for ${minutesBefore} minutes before event`, 'success');
        } else {
            this.showNotification('Error', 'Reminder time has already passed', 'error');
        }
    }

    /**
     * Validate registration URL
     */
    isValidRegistrationUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get event share URL
     */
    getEventShareUrl(event) {
        const url = new URL(window.location.href);
        url.searchParams.set('eventId', event.id);
        return url.toString();
    }

    /**
     * Load event from URL parameter
     */
    loadEventFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('eventId');
        if (eventId) {
            const event = this.events.find(e => e.id === eventId);
            if (event) {
                this.openModal(event);
            }
        }
    }

    /**
     * Calculate event popularity score
     */
    calculatePopularityScore(event) {
        const baseScore = (event.capacity || 0) / 100;
        const views = JSON.parse(localStorage.getItem('eventViews') || '{}')[event.id] || 0;
        const viewScore = Math.min(views / 10, 5);
        const categoryBonus = this.getEventsByCategory(event.category).length * 0.5;
        return baseScore + viewScore + categoryBonus;
    }

    /**
     * Sort events by popularity
     */
    sortByPopularity() {
        return [...this.filteredEvents].sort((a, b) =>
            this.calculatePopularityScore(b) - this.calculatePopularityScore(a)
        );
    }
}

// Utility functions outside the class

// ===============================================
// ===== NEW, CORRECTED SHARE MODAL FUNCTIONS =====
// ===============================================

/**
 * Helper: Check if device is mobile
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
/**
 * Helper function to check if the user is on a mobile device.
 * This is more reliable than just checking for navigator.share.
 */

function openShareModal(event) {
    const title = event.title;

    // --- THIS IS THE FIX ---
    // Construct a public, shareable URL using your live domain
    const shareableUrl = `${LIVE_SITE_URL}/Events/Upcoming.html?event=${event.id}`;

    const text = `Check out this YUVA event: ${title}`;

    // Use native share on mobile if available
    if (navigator.share && isMobileDevice()) {
        navigator.share({
            title: title,
            text: text,
            url: shareableUrl, // Use the correct URL
        })
            .then(() => console.log('Successful share'))
            .catch((error) => console.log('Error sharing', error));
        return;
    }

    // --- Fallback to custom modal on desktop ---

    const modal = document.getElementById('share-modal');
    if (!modal) return;

    // Set the content
    document.getElementById('share-modal-title').textContent = title;
    const shareInput = document.getElementById('share-link-input');
    shareInput.value = shareableUrl; // Show the correct URL

    // Set the social media links with the correct URL
    document.getElementById('share-whatsapp').href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + shareableUrl)}`;
    document.getElementById('share-twitter').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareableUrl)}`;
    document.getElementById('share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareableUrl)}`;
    document.getElementById('share-linkedin').href = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareableUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(text)}`;
    document.getElementById('share-telegram').href = `https://t.me/share/url?url=${encodeURIComponent(shareableUrl)}&text=${encodeURIComponent(text)}`;
    document.getElementById('share-instagram').href = `https://www.instagram.com/`; // No direct share API

    // Copy button logic
    const copyBtn = document.getElementById('copy-link-btn');
    const copyBtnText = copyBtn.querySelector('span');
    copyBtn.onclick = () => {
        shareInput.select();
        navigator.clipboard.writeText(shareInput.value).then(() => {
            copyBtnText.textContent = 'Copied!';
            setTimeout(() => {
                copyBtnText.textContent = 'Copy';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    // Show the modal
    modal.style.display = 'flex';
}

function closeShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Helper: Debounce function for throttling input
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Helper: Format currency (for future event pricing)
 */
function formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency
    }).format(amount);
}



/**
 * Helper: Local storage with expiration
 */
const StorageManager = {
    set: (key, value, expirationMinutes = null) => {
        const item = {
            value: value,
            expiration: expirationMinutes ? new Date().getTime() + (expirationMinutes * 60 * 1000) : null
        };
        localStorage.setItem(key, JSON.stringify(item));
    },

    get: (key) => {
        const item = JSON.parse(localStorage.getItem(key));
        if (!item) return null;
        if (item.expiration && new Date().getTime() > item.expiration) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    },

    remove: (key) => {
        localStorage.removeItem(key);
    }
};

/* =================================================================
   FAQ ACCORDION FUNCTIONALITY
   ================================================================= */
function toggleFAQ(element) {
    const faqItem = element.parentElement;
    const isActive = faqItem.classList.contains('active');

    // Close all other FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
            const answer = item.querySelector('.faq-answer');
            if (answer) answer.style.display = 'none';
        }
    });

    // Toggle current FAQ
    faqItem.classList.toggle('active');
    const answer = faqItem.querySelector('.faq-answer');
    if (answer) {
        answer.style.display = isActive ? 'none' : 'block';
    }
}

/* =================================================================
   EVENT INSIGHTS CALCULATOR (DYNAMIC FROM DATABASE)
   ================================================================= */
function updateEventInsights(events) {
    if (!events || events.length === 0) {
        // Set defaults if no events (with null checks)
        const totalEventsEl = document.getElementById('total-events-count');
        const citiesEl = document.getElementById('cities-count');
        const capacityEl = document.getElementById('total-capacity');
        const nextEventEl = document.getElementById('next-event-days');

        if (totalEventsEl) totalEventsEl.textContent = '0';
        if (citiesEl) citiesEl.textContent = '0';
        if (capacityEl) capacityEl.textContent = '0+';
        if (nextEventEl) nextEventEl.textContent = 'Soon';
        return;
    }

    // 1. Total events (count from database)
    const totalEvents = events.length;
    const totalEventsEl = document.getElementById('total-events-count');
    if (totalEventsEl) totalEventsEl.textContent = totalEvents;

    // 2. Cities covered (unique locations from database)
    const cities = new Set(
        events
            .map(e => e.location)
            .filter(l => l && l.trim())
            .map(l => {
                // Extract city name (before comma if present)
                const cityName = l.split(',')[0].trim();
                return cityName;
            })
    );
    const citiesEl = document.getElementById('cities-count');
    if (citiesEl) citiesEl.textContent = cities.size;

    // 3. Expected attendees (sum of capacity from database)
    const totalCapacity = events.reduce((sum, e) => {
        const capacity = parseInt(e.capacity) || 0;
        return sum + capacity;
    }, 0);
    const capacityEl = document.getElementById('total-capacity');
    if (capacityEl) capacityEl.textContent = totalCapacity > 0 ? totalCapacity + '+' : '500+';

    // 4. Next event (days until - calculate from first event in sorted list)
    if (events.length > 0) {
        const nextEvent = events[0]; // Already sorted by start_at in fetchEvents
        const eventDate = new Date(nextEvent.start_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);

        const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
        const nextEventElement = document.getElementById('next-event-days');

        if (nextEventElement) {
            if (daysUntil < 0) {
                nextEventElement.textContent = 'Ongoing';
            } else if (daysUntil === 0) {
                nextEventElement.textContent = 'Today!';
            } else if (daysUntil === 1) {
                nextEventElement.textContent = 'Tomorrow';
            } else {
                nextEventElement.textContent = `${daysUntil} days`;
            }
        }
    }

    console.log(`📊 Stats Updated: ${totalEvents} events, ${cities.size} cities`);
}

/* =================================================================
   NEWSLETTER FORM HANDLER (SAVES TO DATABASE)
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const newsletterForm = document.getElementById('events-newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const email = emailInput.value.toLowerCase().trim();
            const button = newsletterForm.querySelector('button');
            const originalText = button.textContent;

            if (!email) {
                alert('Please enter a valid email');
                return;
            }

            try {
                button.disabled = true;
                button.textContent = 'Subscribing...';

                if (!supabaseClient) {
                    throw new Error('Supabase not available');
                }

                // Insert email into subscriptions table (without .select() to avoid RLS issues)
                const { error } = await supabaseClient
                    .from('subscriptions')
                    .insert([{ email: email }]);

                if (error) {
                    // Check if it's a duplicate email error
                    if (error.code === '23505') {
                        throw new Error('This email is already subscribed');
                    }
                    throw error;
                }

                // Success
                button.textContent = 'Subscribed! ✓';
                emailInput.value = '';

                // Show success notification
                if (eventsPageInstance) {
                    eventsPageInstance.showNotification(
                        'Newsletter Subscribed',
                        'Thank you for subscribing to our events newsletter!',
                        'success'
                    );
                }

                console.log('✓ Subscription saved:', email);

                // Reset button after 3 seconds
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 3000);

            } catch (err) {
                // Determine error message
                let errorMsg = err.message || 'Failed to subscribe. Please try again.';

                // Check if it's a duplicate error (expected case, not a real error)
                const isDuplicateError = err.code === '23505' ||
                    err.message?.includes('duplicate') ||
                    err.message?.includes('already subscribed');

                if (isDuplicateError) {
                    errorMsg = 'This email is already subscribed';
                    // Don't log duplicate errors to console (expected behavior)
                } else {
                    // Only log unexpected errors
                    console.error('Newsletter subscription error:', err);
                }

                button.textContent = 'Subscription Failed';
                button.style.background = 'var(--color-error, #ef4444)';

                // Show error notification
                if (eventsPageInstance) {
                    eventsPageInstance.showNotification(
                        'Subscription Error',
                        errorMsg,
                        'error'
                    );
                }

                // Reset button after 4 seconds
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                    button.disabled = false;
                }, 4000);
            }
        });
    }
});

let eventsPageInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize custom dropdowns first
    customDropdownInstance = new CustomDropdown();

    // Then initialize events page
    eventsPageInstance = new EventsPage();
});

/*=================================================================
  PAST EVENTS PAGE CLASS - Extends EventsPage
  Handles past events with date filtering and post-event features
=================================================================*/

class PastEventsPage extends EventsPage {
    constructor() {
        super();
        this.isPastEventsPage = true;
        this.currentPage = 1;
        this.eventsPerPage = 12;
        this.hasMore = true;
    }

    async fetchEvents() {
        this.isLoading = true;
        this.showLoader(true);

        try {
            if (!supabaseClient) throw new Error('Supabase not available');

            const now = new Date().toISOString();

            // Fetch past events using display_on_past flag
            // The database triggers automatically manage this flag based on end_at date
            const { data, error } = await supabaseClient
                .from('published_events')
                .select('*')
                .eq('display_on_past', true)  // Use the new display_on_past column
                .order('end_at', { ascending: false })  // Most recent first
                .limit(this.eventsPerPage);

            if (error) throw error;

            this.events = (data || []).map(e => this.normalizeEvent(e));
            this.filteredEvents = [...this.events];

            if (this.events.length < this.eventsPerPage) {
                this.hasMore = false;
            }

            if (this.events.length === 0) {
                this.showNotification('No Events', 'No past events available at the moment.', 'info');
            } else {
                updatePastEventInsights(this.events);
            }

            // Populate filters and render
            this.populateFilterDropdowns();
            this.renderFeatured();
            this.renderGrid(this.filteredEvents);

        } catch (err) {
            console.error('Error fetching past events:', err);
            this.showNotification('Error', 'Failed to load past events', 'error');
            this.events = [];
            updatePastEventInsights([]);
        } finally {
            this.isLoading = false;
            this.showLoader(false);
        }
    }

    async loadMoreEvents() {
        if (!this.hasMore || this.isLoading) return;

        this.isLoading = true;
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }

        try {
            const now = new Date().toISOString();
            this.currentPage++;
            const offset = (this.currentPage - 1) * this.eventsPerPage;

            const { data, error } = await supabaseClient
                .from('published_events')
                .select('*')
                .eq('display_on_past', true)  // Use display_on_past column
                .order('end_at', { ascending: false })
                .range(offset, offset + this.eventsPerPage - 1);

            if (error) throw error;

            if (data.length < this.eventsPerPage) {
                this.hasMore = false;
            }

            const newEvents = data.map(e => this.normalizeEvent(e));
            this.events.push(...newEvents);
            this.filteredEvents.push(...newEvents);

            // Append new cards to grid
            const grid = document.getElementById('events-grid');
            newEvents.forEach((event, idx) => {
                const card = this.createEventCard(event, this.events.length - newEvents.length + idx);
                grid.appendChild(card);
            });

            this.showNotification('Success', `Loaded ${newEvents.length} more events`, 'success');
        } catch (err) {
            console.error('Error loading more events:', err);
            this.showNotification('Error', 'Failed to load more events', 'error');
        } finally {
            this.isLoading = false;
            if (loadMoreBtn) {
                if (this.hasMore) {
                    loadMoreBtn.disabled = false;
                    loadMoreBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Load More Events';
                } else {
                    loadMoreBtn.style.display = 'none';
                }
            }
        }
    }

    createEventCard(event, idx) {
        const card = document.createElement('div');
        card.className = 'event-card-modern past-event-card';
        const colors = ['accent-saffron', 'accent-navy', 'accent-green'];
        card.classList.add(colors[idx % 3]);

        const endDate = new Date(event.end_at);
        const day = endDate.getDate();
        const month = endDate.toLocaleString('default', { month: 'short' }).toUpperCase();
        const time = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        card.innerHTML = `
            <div class="card-img-container">
                <img src="${event.banner_url}" alt="${event.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400/ccc/999?text=Event'">
                <div class="date-badge-float">
                    <span class="db-day">${day}</span>
                    <span class="db-month">${month}</span>
                </div>
                <div class="completed-badge-overlay">
                    <span class="completed-badge">Completed</span>
                </div>
            </div>
            <div class="card-content">
                <div class="card-meta">
                    <span><i class="far fa-clock"></i> ${time}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                    ${event.mode === 'online' ? '<span><i class="fas fa-globe"></i> Online</span>' : ''}
                </div>
                <h3>${event.title}</h3>
                <p>${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
                <div class="card-actions">
                    <button class="btn-secondary btn-sm details-btn" data-event-id="${event.id}">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                    <button class="btn-primary btn-sm share-btn" data-event-id="${event.id}">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                </div>
            </div>
        `;

        card.querySelector('.details-btn').addEventListener('click', () => {
            this.openModal(event);
        });

        card.querySelector('.share-btn').addEventListener('click', () => {
            this.selectedEvent = event;
            this.shareEvent();
        });

        return card;
    }

    applyFilters() {
        const searchTerm = (document.getElementById('event-search')?.value || '').toLowerCase();
        const category = customDropdownInstance.getValue('category-filter');
        const dateRange = customDropdownInstance.getValue('date-range-filter');

        this.filteredEvents = this.events.filter(event => {
            const searchMatch = !searchTerm ||
                event.title.toLowerCase().includes(searchTerm) ||
                event.description.toLowerCase().includes(searchTerm) ||
                event.location.toLowerCase().includes(searchTerm);

            const categoryMatch = !category || event.category === category;
            const dateMatch = this.filterByDateRange(event, dateRange);

            return searchMatch && categoryMatch && dateMatch;
        });

        this.renderGrid(this.filteredEvents);
        this.updateEmptyState();
        this.updateLoadMoreButton();
    }

    filterByDateRange(event, range) {
        if (!range) return true;

        const eventDate = new Date(event.end_at);
        const now = new Date();

        switch (range) {
            case 'last-month':
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                return eventDate >= lastMonth && eventDate <= now;
            case 'last-3-months':
                const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                return eventDate >= last3Months && eventDate <= now;
            case 'last-6-months':
                const last6Months = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                return eventDate >= last6Months && eventDate <= now;
            case 'last-year':
                const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                return eventDate >= lastYear && eventDate <= now;
            default:
                return true;
        }
    }

    updateLoadMoreButton() {
        const container = document.getElementById('load-more-container');
        if (container) {
            // Show load more button only if we have more events and not filtering
            const isFiltering = document.getElementById('event-search')?.value ||
                customDropdownInstance.getValue('category-filter') ||
                customDropdownInstance.getValue('date-range-filter');

            if (this.hasMore && !isFiltering && this.filteredEvents.length >= this.eventsPerPage) {
                container.style.display = 'flex';
            } else {
                container.style.display = 'none';
            }
        }
    }

    setupEventListeners() {
        super.setupEventListeners();

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreEvents());
        }

        // Override date range filter listener
        document.addEventListener('customDropdownChange', (e) => {
            const { dropdownName, text } = e.detail;

            if (dropdownName === 'date-range-filter') {
                this.applyFilters();
                this.showNotification('Filter Applied', `Showing: ${text}`, 'info');
            }
        });
    }

    renderFeatured() {
        const container = document.getElementById('featured-event-container');
        if (!container || this.events.length === 0) return;

        // Get the most recent past event (first in the sorted list)
        const latestEvent = this.events[0];

        const endDate = new Date(latestEvent.end_at);
        const day = endDate.getDate();
        const month = endDate.toLocaleString('default', { month: 'long' });
        const year = endDate.getFullYear();
        const time = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Calculate how long ago the event was
        const daysAgo = Math.floor((new Date() - endDate) / (1000 * 60 * 60 * 24));
        let timeAgoText = '';
        if (daysAgo === 0) timeAgoText = 'Today';
        else if (daysAgo === 1) timeAgoText = 'Yesterday';
        else if (daysAgo < 30) timeAgoText = `${daysAgo} days ago`;
        else if (daysAgo < 365) timeAgoText = `${Math.floor(daysAgo / 30)} months ago`;
        else timeAgoText = `${Math.floor(daysAgo / 365)} years ago`;

        container.innerHTML = `
            <div class=\"latest-event-visual\">
                <div class=\"event-image-wrapper\">
                    <img src=\"${latestEvent.banner_url}\" alt=\"${latestEvent.title}\" 
                         onerror=\"this.src='https://via.placeholder.com/1200x600/667eea/ffffff?text=Past+Event'\">
                    <div class=\"image-overlay\"></div>
                    <div class=\"completed-badge-modern\">
                        <i class=\"fas fa-check-circle\"></i>
                        <span>Completed</span>
                    </div>
                </div>
            </div>
            <div class=\"latest-event-details\">
                <div class=\"event-date-badge\">
                    <div class=\"date-number\">${day}</div>
                    <div class=\"date-month\">${month}</div>
                    <div class=\"date-year\">${year}</div>
                </div>
                <div class=\"event-info\">
                    <div class=\"event-meta-tags\">
                        <span class=\"meta-tag time-ago\">
                            <i class=\"fas fa-history\"></i> ${timeAgoText}
                        </span>
                        <span class=\"meta-tag location\">
                            <i class=\"fas fa-map-marker-alt\"></i> ${latestEvent.location}
                        </span>
                        ${latestEvent.mode === 'online' ? '<span class=\"meta-tag mode\"><i class=\"fas fa-globe\"></i> Online</span>' : ''}
                    </div>
                    <h3 class=\"event-title\">${latestEvent.title}</h3>
                    <p class=\"event-description\">${latestEvent.description.substring(0, 200)}${latestEvent.description.length > 200 ? '...' : ''}</p>
                    <div class=\"event-stats-modern\">
                        <div class=\"stat-modern\">
                            <i class=\"fas fa-clock\"></i>
                            <span>${time}</span>
                        </div>
                        ${latestEvent.capacity ? `
                        <div class=\"stat-modern\">
                            <i class=\"fas fa-users\"></i>
                            <span>${latestEvent.capacity}+ Attended</span>
                        </div>
                        ` : ''}
                        <div class=\"stat-modern\">
                            <i class=\"fas fa-tag\"></i>
                            <span>${latestEvent.category || 'Event'}</span>
                        </div>
                    </div>
                    <div class=\"event-actions-modern\">
                        <button class=\"btn-modern-primary\" onclick=\"pastEventsPageInstance.openModal(pastEventsPageInstance.events[0])\">
                            <i class=\"fas fa-info-circle\"></i>
                            <span>View Details</span>
                        </button>
                        <button class=\"btn-modern-secondary\" onclick=\"pastEventsPageInstance.selectedEvent = pastEventsPageInstance.events[0]; pastEventsPageInstance.shareEvent();\">
                            <i class=\"fas fa-share-alt\"></i>
                            <span>Share</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Update insights for past events
function updatePastEventInsights(events) {
    // Total events
    const totalEl = document.getElementById('total-events-count');
    if (totalEl) totalEl.textContent = events.length;

    // Unique cities
    const cities = new Set(events.map(e => e.location));
    const citiesEl = document.getElementById('cities-count');
    if (citiesEl) citiesEl.textContent = cities.size;

    // Total participants (sum of capacities)
    const totalParticipants = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
    const participantsEl = document.getElementById('total-participants');
    if (participantsEl) {
        participantsEl.textContent = totalParticipants > 0 ? `${(totalParticipants / 1000).toFixed(0)}K+` : '0';
    }

    // Most recent event
    if (events.length > 0) {
        const mostRecent = events[0]; // Already sorted by end_at desc
        const recentEl = document.getElementById('most-recent-event');
        if (recentEl) {
            const endDate = new Date(mostRecent.end_at);
            const daysAgo = Math.floor((new Date() - endDate) / (1000 * 60 * 60 * 24));
            recentEl.textContent = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
        }
    }

    // Update hero impact numbers
    const impactEventsEl = document.getElementById('impact-past-events');
    if (impactEventsEl) impactEventsEl.textContent = `${events.length}+`;
}
