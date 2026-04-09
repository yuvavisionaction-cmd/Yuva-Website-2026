/* =============================================
   WHO IS WHO - HIERARCHICAL JS (v9 - With Executive Section)
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURATION ---
    const SUPABASE_URL = 'https://jgsrsjwmywiirtibofth.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_5KtvO0cEHfnECBoyp2CQnw_RC3_x2me';
    let supabase;

    // --- 2. DOM ELEMENTS ---
    const mainContainer = document.querySelector('.main');
    const levels = {
        zones: document.getElementById('level-zones'),
        colleges: document.getElementById('level-colleges'),
        members: document.getElementById('level-members')
    };
    const grids = {
        zones: document.getElementById('zones-grid'),
        colleges: document.getElementById('colleges-grid'),
        members: document.getElementById('members-grid')
    };

    // Executive section elements
    const executiveGrid = document.getElementById('executive-grid');
    const executiveLoading = document.getElementById('executive-loading');
    const executiveError = document.getElementById('executive-error');

    const loadingIndicator = document.getElementById('loading-indicator');
    const stateMessageEl = document.getElementById('state-message');
    const backButton = document.getElementById('back-button');
    const breadcrumbsEl = document.getElementById('breadcrumbs');
    const modalBackdrop = document.getElementById('member-modal-backdrop');
    const modalContent = document.getElementById('member-modal-content');

    // --- 3. STATE ---
    let state = {
        level: 'zones', // 'zones', 'colleges', 'members'
        zoneId: null,
        zoneName: '',
        collegeId: null,
        collegeName: '',
        history: [] // To manage back navigation
    };
    let zoneDataCache = []; // Cache fetched zones
    let collegeDataCache = {}; // Cache colleges by zoneId: [collegeData]
    let memberDataCache = {}; // Cache members by collegeId: [memberData]
    let executiveDataCache = []; // Cache executive members

    // ===== CHANGE =====
    // Add a flag to track modal state for history management
    let isModalOpen = false;

    // --- 4. INITIALIZATION ---
    try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("Supabase client initialized.");
            initializeApp(); // Start the app
        } else {
            throw new Error("Supabase library not loaded.");
        }
    } catch (e) {
        console.error("Initialization failed:", e);
        showStateMessage("Error: Could not initialize application.");
    }

    // --- 5. CORE LOGIC ---
    async function initializeApp() {
        setupEventListeners();
        await loadExecutiveTeam(); // Load executive team first
        await loadLevelData(); // Load initial zone data
    }

    // --- 6. EXECUTIVE TEAM FUNCTIONS ---
    async function loadExecutiveTeam() {
        if (!executiveGrid || !executiveLoading || !executiveError) {
            console.error("Executive section elements not found");
            return;
        }

        try {
            // Show loading
            executiveLoading.style.display = 'flex';
            executiveError.style.display = 'none';
            executiveGrid.innerHTML = '';

            // Check cache first
            let executives = executiveDataCache;

            if (executives.length === 0) {
                // Fetch from database
                executives = await fetchExecutiveMembers();
                executiveDataCache = executives; // Cache the data
                console.log("Fetched executive members:", executives);
            } else {
                console.log("Using cached executive members");
            }

            // Render executive cards
            renderExecutiveTeam(executives);

        } catch (error) {
            console.error("Error loading executive team:", error);
            executiveError.textContent = "Failed to load executive team. Please refresh the page.";
            executiveError.style.display = 'block';
            executiveGrid.innerHTML = '';
        } finally {
            executiveLoading.style.display = 'none';
        }
    }

    async function fetchExecutiveMembers() {
        if (!supabase) throw new Error("Supabase not initialized");

        const { data, error } = await supabase
            .from('vw_executive_members')
            .select('id, member_name, designation, role, photo_url, contact_email, description')
            .order('display_order', { ascending: true });

        if (error) {
            console.error("Supabase fetchExecutiveMembers Error:", error);
            throw error;
        }

        return data || [];
    }

    function renderExecutiveTeam(executives) {
        if (!executiveGrid) return;

        executiveGrid.innerHTML = '';

        if (!executives || executives.length === 0) {
            executiveGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No executive members found.</p>';
            return;
        }

        // Display in order from database (display_order) - no re-sorting
        // First 2 are "heads" (larger cards), rest are regular members
        const heads = executives.slice(0, 2);
        const members = executives.slice(2);

        // Create container for heads
        const headsContainer = document.createElement('div');
        headsContainer.className = 'executive-heads-container';

        const headsGrid = document.createElement('div');
        headsGrid.className = 'executive-heads-grid';

        // Render heads
        heads.forEach((exec, index) => {
            const card = document.createElement('div');
            card.className = 'executive-card head-card';
            card.style.animationDelay = '0ms'; // No delay for heads

            const initials = getInitials(exec.member_name || 'NA');
            const themeIndex = index % 3;
            let photoGradient = 'var(--gradient-navy)';
            if (themeIndex === 0) photoGradient = 'var(--gradient-saffron)';
            if (themeIndex === 2) photoGradient = 'var(--gradient-green)';

            // Display role: if both exist and are same, show once; else combine
            const displayRole = exec.designation && exec.role
                ? (exec.designation.trim() === exec.role.trim() ? exec.designation : `${exec.designation} – ${exec.role}`)
                : exec.designation || exec.role || 'Member';

            card.innerHTML = `
            <div class="exec-photo" style="background: ${photoGradient};">
                <div class="exec-photo-content">${initials}</div>
            </div>
            <div class="exec-info">
                <h3 class="exec-name">${exec.member_name || 'N/A'}</h3>
                <p class="exec-role">${displayRole}</p>
            </div>
        `;

            // Load image if available
            const photoContent = card.querySelector('.exec-photo-content');
            if (exec.photo_url && exec.photo_url.trim() !== '' && photoContent) {
                const img = document.createElement('img');
                img.src = exec.photo_url;
                img.alt = exec.member_name;
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';

                img.onload = () => {
                    photoContent.innerHTML = '';
                    photoContent.appendChild(img);
                    img.classList.add('loaded');
                };

                img.onerror = () => {
                    console.log('Failed to load image for:', exec.member_name);
                };
            }

            card.style.cursor = 'pointer';
            card.addEventListener('click', () => openExecutiveModal(exec, index));
            headsGrid.appendChild(card);
        });

        headsContainer.appendChild(headsGrid);
        executiveGrid.appendChild(headsContainer);

        // Create container for regular members
        const membersContainer = document.createElement('div');
        membersContainer.className = 'executive-members-grid';

        // Render members
        members.forEach((exec, index) => {
            const card = document.createElement('div');
            card.className = 'executive-card';
            card.style.animationDelay = `${index * 100}ms`;

            const initials = getInitials(exec.member_name || 'NA');
            const themeIndex = (index + heads.length) % 3; // Offset to avoid color clash
            let photoGradient = 'var(--gradient-navy)';
            if (themeIndex === 0) photoGradient = 'var(--gradient-saffron)';
            if (themeIndex === 2) photoGradient = 'var(--gradient-green)';

            const displayRole = exec.designation && exec.role
                ? `${exec.designation} – ${exec.role}`
                : exec.designation || exec.role || 'Member';

            card.innerHTML = `
            <div class="exec-photo" style="background: ${photoGradient};">
                <div class="exec-photo-content">${initials}</div>
            </div>
            <div class="exec-info">
                <h3 class="exec-name">${exec.member_name || 'N/A'}</h3>
                <p class="exec-role">${displayRole}</p>
            </div>
        `;

            // Load image
            const photoContent = card.querySelector('.exec-photo-content');
            if (exec.photo_url && exec.photo_url.trim() !== '' && photoContent) {
                const img = document.createElement('img');
                img.src = exec.photo_url;
                img.alt = exec.member_name;
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';

                img.onload = () => {
                    photoContent.innerHTML = '';
                    photoContent.appendChild(img);
                    img.classList.add('loaded');
                };

                img.onerror = () => {
                    console.log('Failed to load image for:', exec.member_name);
                };
            }

            card.style.cursor = 'pointer';
            card.addEventListener('click', () => openExecutiveModal(exec, index + heads.length));
            membersContainer.appendChild(card);
        });

        executiveGrid.appendChild(membersContainer);
    }

    function openExecutiveModal(exec, index) {
        // ===== CHANGE =====
        // Don't open a modal if one is already open
        if (isModalOpen) return;

        if (!modalContent || !modalBackdrop) return;

        const name = exec.member_name || 'N/A';

        // NEW: Combined designation + role display (same as in card)
        const displayRole = exec.designation && exec.role
            ? `${exec.designation} – ${exec.role}`
            : exec.designation || exec.role || 'Member';

        const description = exec.description || '';
        const email = exec.contact_email || '';
        const initials = getInitials(name);

        // Determine theme color based on index
        const themeIndex = index % 3;
        let photoGradient = 'var(--gradient-navy)';
        if (themeIndex === 0) photoGradient = 'var(--gradient-saffron)';
        if (themeIndex === 2) photoGradient = 'var(--gradient-green)';

        // Photo content with image or initials
        let modalPhotoContent = '';
        if (exec.photo_url && exec.photo_url.trim() !== '') {
            modalPhotoContent = `
                <img src="${exec.photo_url}" 
                     alt="${name}" 
                     onerror="this.style.display='none'; this.parentElement.innerHTML='${initials}';"
                     style="display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            `;
        } else {
            modalPhotoContent = initials;
        }

        modalContent.innerHTML = `
            <div class="modal-header">
                <div class="modal-photo" style="background: ${photoGradient};">
                    ${modalPhotoContent}
                </div>
                <div class="modal-header-info">
                    <h3>${name}</h3>
                    <p>${displayRole}</p>
                </div>
            </div>
            <div class="modal-body">
                ${description ? `<p style="margin-bottom: 1rem; color: var(--text-secondary);">${description}</p>` : ''}
                <div class="info-grid">
                    ${email ? `
                        <div class="info-item" style="grid-column: 1 / -1;">
                            <strong>Contact</strong>
                            <span><a href="mailto:${email}" style="color: var(--color-primary); text-decoration: none;">${email}</a></span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // ===== CHANGE =====
        // Set flag and push a history state BEFORE showing the modal
        isModalOpen = true;
        history.pushState({ modal: 'open' }, null, ''); // Push a state

        modalBackdrop.classList.add('visible');
    }

    function getInitials(name) {
        if (!name || typeof name !== 'string') return '?';
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';
    }

    function toTitleCase(text) {
        if (!text || typeof text !== 'string') return '';

        return text
            .trim()
            .replace(/[\s_]+/g, ' ')
            .split(' ')
            .map(word => word
                .split('-')
                .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '')
                .join('-'))
            .join(' ');
    }

    function buildMemberDesignation(member) {
        const rawRole = (member?.applying_for || '').trim();
        const rawUnit = (member?.unit_name || '').trim();

        const role = rawRole && !['n/a', 'na', 'null', 'undefined'].includes(rawRole.toLowerCase())
            ? toTitleCase(rawRole)
            : '';

        const unit = rawUnit && !['n/a', 'na', 'null', 'undefined'].includes(rawUnit.toLowerCase())
            ? toTitleCase(rawUnit)
            : '';

        if (unit && role) {
            return unit.toLowerCase().includes(role.toLowerCase())
                ? unit
                : `${unit} ${role}`;
        }

        return role || unit || 'Member';
    }

    // --- 7. LEVEL DATA LOADING (Zones, Colleges, Members) ---
    async function loadLevelData() {
        showLoading(true);
        showStateMessage(''); // Clear previous errors

        try {
            let data;
            let levelKey = state.level;
            let cacheKey;
            let fetchFunction;
            let renderFunction;

            switch (levelKey) {
                case 'zones':
                    cacheKey = 'zones'; // Use a consistent key for zone cache
                    fetchFunction = fetchZones;
                    renderFunction = renderZones;
                    if (zoneDataCache.length > 0) {
                        data = zoneDataCache;
                        console.log("Using cached zones.");
                    }
                    break;
                case 'colleges':
                    cacheKey = state.zoneId; // Key is zone ID
                    fetchFunction = () => fetchColleges(state.zoneId);
                    renderFunction = renderColleges;
                    if (collegeDataCache[cacheKey]) {
                        data = collegeDataCache[cacheKey];
                        console.log("Using cached colleges for zone:", cacheKey);
                    }
                    break;
                case 'members':
                    cacheKey = state.collegeId; // Key is college ID
                    fetchFunction = () => fetchMembers(state.collegeId);
                    renderFunction = renderMembers;
                    if (memberDataCache[cacheKey]) {
                        data = memberDataCache[cacheKey];
                        console.log("Using cached members for college:", cacheKey);
                    }
                    break;
                default:
                    throw new Error(`Invalid level state: ${levelKey}`);
            }

            // Fetch only if data wasn't found in cache
            if (data === undefined && fetchFunction) {
                data = await fetchFunction();
                console.log(`Fetched ${levelKey}.`);
                // Update the correct cache
                if (levelKey === 'zones' && data) zoneDataCache = data;
                else if (levelKey === 'colleges' && cacheKey && data) collegeDataCache[cacheKey] = data;
                else if (levelKey === 'members' && cacheKey && data) memberDataCache[cacheKey] = data;
            } else if (data === undefined) {
                // Handle case where fetchFunction wasn't defined (should not happen with current logic)
                throw new Error(`No data or fetch function for level: ${levelKey}`);
            }

            renderFunction(data); // Render fetched or cached data
            updateNavigation();
            showLevel(levelKey); // Transition UI to the current level

        } catch (error) {
            console.error(`Error loading ${state.level}:`, error);
            showStateMessage(`Error loading ${state.level}. Please try again.`);
            if (state.level !== 'zones' && state.history.length > 0) { // Check history before going back
                handleBackClick(true); // Attempt to go back silently on error
            } else if (state.level === 'zones') { // If error on zones level
                showLevel('zones'); // Ensure zones level is visible
                if (grids.zones) grids.zones.innerHTML = ''; // Clear potentially broken grid
            }
        } finally {
            showLoading(false);
        }
    }

    // --- 8. DATA FETCHING ---
    async function fetchZones() {
        if (!supabase) throw new Error("Supabase not initialized");
        const { data, error } = await supabase.rpc('get_zones_with_college_count');
        if (error) { console.error("Supabase fetchZones Error:", error); throw error; }
        return data || [];
    }
    async function fetchColleges(zoneId) {
        if (!supabase || !zoneId) throw new Error("Missing Supabase client or Zone ID");
        const { data, error } = await supabase.rpc('get_colleges_with_member_count', { p_zone_id: zoneId });
        if (error) { console.error("Supabase fetchColleges Error:", error); throw error; }
        return data || [];
    }
    async function fetchMembers(collegeId) {
        if (!supabase || !collegeId) throw new Error("Missing Supabase client or College ID");
        const { data, error } = await supabase
            .from('registrations')
            .select(`applicant_name, applying_for, unit_name, email, academic_session, colleges(college_name), zones(zone_name)`)
            .eq('college_id', collegeId)
            .eq('status', 'approved'); // Fetch only approved members
        if (error) { console.error("Supabase fetchMembers Error:", error); throw error; }
        return data || [];
    }

    // --- 9. RENDERING ---
    function renderLevel(levelKey, data, clickHandler) {
        const grid = grids[levelKey];
        if (!grid) { console.error(`Grid not found for level: ${levelKey}`); return; }
        grid.innerHTML = ''; // Clear previous

        if (!data || data.length === 0) {
            let message = `No ${levelKey} found.`;
            if (levelKey === 'colleges') message = `No colleges found in ${state.zoneName || 'this zone'}.`;
            if (levelKey === 'members') message = `No members found in ${state.collegeName || 'this college'}.`;
            showStateMessage(message);
            grid.style.display = 'none'; // Hide grid when empty
            return;
        }
        showStateMessage('');
        grid.style.display = 'grid'; // Ensure grid is visible

        data.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `card`; // Use the unified class; CSS nth-child handles theme
            card.style.animationDelay = `${index * 50}ms`;
            card.dataset.index = index; // Store index for modal theming
            card.innerHTML = createCardHTML(levelKey, item); // Use unified generator

            // Add click listener (button for members, card otherwise)
            const clickableElement = card.querySelector('.btn-view-details') || card;
            clickableElement.addEventListener('click', (e) => {
                e.stopPropagation();
                if (levelKey === 'members') {
                    openMemberModal(item, index); // Member card opens modal
                } else {
                    // Zone/College cards navigate
                    clickHandler(item.id, item.zone_name || item.college_name || ''); // Pass name safely
                }
            });
            grid.appendChild(card);
        });
    }

    // Specific render functions just call renderLevel now
    function renderZones(zones) { renderLevel('zones', zones, handleZoneClick); }
    function renderColleges(colleges) { renderLevel('colleges', colleges, handleCollegeClick); }
    function renderMembers(members) { renderLevel('members', members, openMemberModal); }

    /**
     * UNIFIED HTML Generator for all card types
     */
    function createCardHTML(levelKey, item) {
        let name = 'N/A';
        let subtitle = '';
        let location1 = null; // Optional location line 1 (e.g., College)
        let location2 = null; // Optional location line 2 (e.g., Zone)
        let showButton = false;
        let initials = '?';

        try { // Add try-catch for safety when accessing item properties
            if (levelKey === 'zones') {
                name = item.zone_name || 'Unnamed Zone';
                subtitle = `${item.college_count || 0} Colleges`;
                initials = name.charAt(0).toUpperCase() || '?'; // Use single initial for zones
            } else if (levelKey === 'colleges') {
                name = item.college_name || 'Unnamed College';
                subtitle = `${item.approved_member_count || 0} Members`;
                initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
            } else if (levelKey === 'members') {
                name = item.applicant_name || 'N/A';
                subtitle = buildMemberDesignation(item);
                location1 = item.colleges ? item.colleges.college_name : state.collegeName;
                location2 = item.zones ? item.zones.zone_name : state.zoneName;
                initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
                showButton = true;
            }
        } catch (e) { console.error("Error generating card HTML for item:", item, e); }

        return `
            <div class="card-initials"><span>${initials}</span></div>
            <div class="card-content">
                <h3 class="card-name">${name}</h3>
                <p class="card-subtitle">${subtitle}</p>
                ${location1 ? `<p class="card-location"><i class="fas fa-university"></i><span>${location1}</span></p>` : ''}
                ${location2 ? `<p class="card-location"><i class="fas fa-map-marker-alt"></i><span>${location2}</span></p>` : ''}
            </div>
            ${showButton ? `
                <div class="card-footer">
                    <button class="btn-view-details">View Details <i class="fas fa-arrow-right"></i></button>
                </div>
            ` : ''}
        `;
    }

    // --- 10. NAVIGATION & STATE UPDATES ---
    function updateNavigation() {
        let breadcrumbHTML = '<a href="#" data-level="zones">All Zones</a>';
        if (state.level === 'colleges' || state.level === 'members') {
            breadcrumbHTML += ` <i class="fas fa-chevron-right"></i> <a href="#" data-level="colleges">${state.zoneName || 'Zone'}</a>`;
        }
        if (state.level === 'members') {
            breadcrumbHTML += ` <i class="fas fa-chevron-right"></i> <span>${state.collegeName || 'College'}</span>`;
        }
        if (breadcrumbsEl) breadcrumbsEl.innerHTML = breadcrumbHTML;

        if (breadcrumbsEl) {
            breadcrumbsEl.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetLevel = e.target.getAttribute('data-level');
                    if (targetLevel === 'zones' && state.level !== 'zones') { // Prevent redundant clicks
                        while (state.history.length > 0) handleBackClick(true);
                        loadLevelData();
                    } else if (targetLevel === 'colleges' && state.level === 'members') {
                        handleBackClick();
                    }
                });
            });
        }
        if (backButton) backButton.style.display = state.level !== 'zones' ? 'flex' : 'none';
    }

    function showLevel(levelToShow) {
        Object.keys(levels).forEach(levelKey => {
            const container = levels[levelKey];
            if (!container) return;
            if (levelKey === levelToShow) {
                setTimeout(() => { container.classList.remove('exit-left'); container.classList.add('active'); }, 50);
            } else {
                if (container.classList.contains('active')) { container.classList.add('exit-left'); }
                container.classList.remove('active');
            }
        });
        // Ensure only the correct grid is visible
        Object.keys(grids).forEach(key => {
            if (grids[key]) grids[key].style.display = (key === levelToShow) ? 'grid' : 'none';
        });
        // Show "Approved Members Only" notice when viewing members
        const approvedNotice = document.getElementById('approved-members-notice');
        if (approvedNotice) {
            approvedNotice.style.display = (levelToShow === 'members') ? 'flex' : 'none';
        }
        // Hide loading indicator when showing a level
        showLoading(false);
    }

    function handleZoneClick(zoneId, zoneName) {
        if (state.level === 'zones') { // Prevent clicks during transition
            state.history.push({ ...state }); state.level = 'colleges'; state.zoneId = zoneId; state.zoneName = zoneName; state.collegeId = null; state.collegeName = ''; loadLevelData();
        }
    }
    function handleCollegeClick(collegeId, collegeName) {
        if (state.level === 'colleges') {
            state.history.push({ ...state }); state.level = 'members'; state.collegeId = collegeId; state.collegeName = collegeName; loadLevelData();
        }
    }
    function handleBackClick(silent = false) {
        const previousState = state.history.pop();
        if (previousState) {
            state = previousState;
            if (!silent) { loadLevelData(); }
            else { updateNavigation(); showLevel(state.level); }
        } else {
            // If history is empty, ensure we are at the zones level
            if (state.level !== 'zones') {
                state = { level: 'zones', zoneId: null, zoneName: '', collegeId: null, collegeName: '', history: [] };
                if (!silent) loadLevelData();
                else { updateNavigation(); showLevel(state.level); }
            }
        }
    }

    // --- 11. EVENT LISTENERS ---
    function setupEventListeners() {
        if (backButton) backButton.addEventListener('click', () => handleBackClick());

        // ===== CHANGE =====
        // Updated backdrop click to use history.back()
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', (e) => {
                if (e.target === modalBackdrop && isModalOpen) {
                    history.back(); // This will trigger the popstate listener
                }
            });
        }

        // ===== CHANGE =====
        // Updated Escape key to use history.back()
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isModalOpen) {
                history.back(); // This will trigger the popstate listener
            }
        });

        // ===== CHANGE =====
        // Add a new listener for the 'popstate' event (mobile back button)
        window.addEventListener('popstate', handleModalCloseOnBack);
    }

    // --- 12. HELPER FUNCTIONS ---
    function showLoading(isLoading) {
        if (loadingIndicator) loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        // Hide all *level containers* when loading starts
        Object.values(levels).forEach(level => {
            if (level && isLoading) level.classList.remove('active', 'exit-left'); // Reset visibility classes
        });
        // Hide state message when loading starts
        if (isLoading) showStateMessage('');
    }
    function showStateMessage(message) {
        if (stateMessageEl) { stateMessageEl.textContent = message; stateMessageEl.style.display = message ? 'block' : 'none'; }
        // If showing a message, hide the loading indicator and ensure no grid is visible
        if (message) {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            Object.values(grids).forEach(grid => { if (grid) grid.style.display = 'none'; });
        }
    }

    // ===== CHANGE =====
    // New function to handle closing the modal via popstate
    function handleModalCloseOnBack() {
        // This function is CALLED BY the popstate event.
        // It just updates the UI.
        if (isModalOpen) {
            isModalOpen = false;
            modalBackdrop.classList.remove('visible');
        }
    }

    function openMemberModal(member, index) { // Accept index
        // ===== CHANGE =====
        // Don't open a modal if one is already open
        if (isModalOpen) return;

        if (!modalContent || !modalBackdrop) return;
        const name = member.applicant_name || 'N/A';
        const designation = buildMemberDesignation(member);
        const unit = member.unit_name || 'N/A';
        const email = member.email || 'N/A';
        const academicSession = member.academic_session || 'N/A';
        const college = member.colleges ? member.colleges.college_name : state.collegeName;
        const zone = member.zones ? member.zones.zone_name : state.zoneName;
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const themeIndex = index % 3;
        let photoGradient = 'var(--gradient-navy)';
        if (themeIndex === 0) photoGradient = 'var(--gradient-saffron)';
        if (themeIndex === 2) photoGradient = 'var(--gradient-green)';
        modalContent.innerHTML = `
            <div class="modal-header"><div class="modal-photo" style="background: ${photoGradient};">${initials}</div><div class="modal-header-info"><h3>${name}</h3><p>${designation}</p></div></div>
            <div class="modal-body"><div class="info-grid"><div class="info-item"><strong>Designation</strong><span>${designation}</span></div><div class="info-item"><strong>Unit</strong><span>${unit}</span></div><div class="info-item"><strong>Email</strong><span>${email}</span></div><div class="info-item"><strong>Academic Session</strong><span>${academicSession}</span></div><div class="info-item"><strong>Zone</strong><span>${zone}</span></div><div class="info-item" style="grid-column: 1 / -1;"><strong>College</strong><span>${college}</span></div></div></div>`;

        // ===== CHANGE =====
        // Set flag and push a history state BEFORE showing the modal
        isModalOpen = true;
        history.pushState({ modal: 'open' }, null, ''); // Push a state

        modalBackdrop.classList.add('visible');
    }

}); // End DOMContentLoaded