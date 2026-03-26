// Advanced Admin Logic

// --- TOAST NOTIFICATION SYSTEM ---
const Toast = {
    init() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    },

    show(type, title, message, duration = 5000) {
        this.init();
        const container = document.getElementById('toast-container');

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icons[type] || 'fa-info-circle'}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 400); // Wait for transition
        }, duration);
    }
};

// --- CUSTOM DIALOG SYSTEM (replaces browser alert/confirm/prompt in certificate flow) ---
const CustomDialog = {
    ensure() {
        if (document.getElementById('custom-dialog-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'custom-dialog-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.innerHTML = `
            <div class="modal-content" style="width: 520px; max-width: 92%;">
                <div class="modal-header">
                    <h3 id="custom-dialog-title">Notice</h3>
                    <button class="modal-close" id="custom-dialog-close" aria-label="Close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p id="custom-dialog-message" style="white-space: pre-line; margin: 0 0 14px;"></p>
                    <div id="custom-dialog-input-wrap" style="display:none;">
                        <input id="custom-dialog-input" class="form-control" type="text" style="width:100%;" />
                    </div>
                </div>
                <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px;">
                    <button id="custom-dialog-cancel" class="btn secondary">Cancel</button>
                    <button id="custom-dialog-ok" class="btn primary">OK</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    async alert(message, title = 'Notice') {
        this.ensure();
        return new Promise(resolve => {
            const overlay = document.getElementById('custom-dialog-overlay');
            const titleEl = document.getElementById('custom-dialog-title');
            const messageEl = document.getElementById('custom-dialog-message');
            const inputWrap = document.getElementById('custom-dialog-input-wrap');
            const cancelBtn = document.getElementById('custom-dialog-cancel');
            const okBtn = document.getElementById('custom-dialog-ok');
            const closeBtn = document.getElementById('custom-dialog-close');

            titleEl.textContent = title;
            messageEl.textContent = message;
            inputWrap.style.display = 'none';
            cancelBtn.style.display = 'none';
            okBtn.textContent = 'OK';

            const cleanup = () => {
                overlay.classList.add('hidden');
                okBtn.onclick = null;
                closeBtn.onclick = null;
            };

            okBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            closeBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            overlay.classList.remove('hidden');
            okBtn.focus();
        });
    },

    async confirm(message, title = 'Please Confirm', okText = 'OK', cancelText = 'Cancel') {
        this.ensure();
        return new Promise(resolve => {
            const overlay = document.getElementById('custom-dialog-overlay');
            const titleEl = document.getElementById('custom-dialog-title');
            const messageEl = document.getElementById('custom-dialog-message');
            const inputWrap = document.getElementById('custom-dialog-input-wrap');
            const cancelBtn = document.getElementById('custom-dialog-cancel');
            const okBtn = document.getElementById('custom-dialog-ok');
            const closeBtn = document.getElementById('custom-dialog-close');

            titleEl.textContent = title;
            messageEl.textContent = message;
            inputWrap.style.display = 'none';
            cancelBtn.style.display = '';
            cancelBtn.textContent = cancelText;
            okBtn.textContent = okText;

            const cleanup = () => {
                overlay.classList.add('hidden');
                okBtn.onclick = null;
                cancelBtn.onclick = null;
                closeBtn.onclick = null;
            };

            okBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            const cancelHandler = () => {
                cleanup();
                resolve(false);
            };

            cancelBtn.onclick = cancelHandler;
            closeBtn.onclick = cancelHandler;

            overlay.classList.remove('hidden');
            okBtn.focus();
        });
    },

    async prompt(message, title = 'Input Required', placeholder = '', defaultValue = '') {
        this.ensure();
        return new Promise(resolve => {
            const overlay = document.getElementById('custom-dialog-overlay');
            const titleEl = document.getElementById('custom-dialog-title');
            const messageEl = document.getElementById('custom-dialog-message');
            const inputWrap = document.getElementById('custom-dialog-input-wrap');
            const inputEl = document.getElementById('custom-dialog-input');
            const cancelBtn = document.getElementById('custom-dialog-cancel');
            const okBtn = document.getElementById('custom-dialog-ok');
            const closeBtn = document.getElementById('custom-dialog-close');

            titleEl.textContent = title;
            messageEl.textContent = message;
            inputWrap.style.display = '';
            cancelBtn.style.display = '';
            cancelBtn.textContent = 'Cancel';
            okBtn.textContent = 'Submit';
            inputEl.placeholder = placeholder;
            inputEl.value = defaultValue;

            const cleanup = () => {
                overlay.classList.add('hidden');
                okBtn.onclick = null;
                cancelBtn.onclick = null;
                closeBtn.onclick = null;
                inputEl.onkeydown = null;
            };

            okBtn.onclick = () => {
                const value = inputEl.value;
                cleanup();
                resolve(value);
            };

            const cancelHandler = () => {
                cleanup();
                resolve(null);
            };

            cancelBtn.onclick = cancelHandler;
            closeBtn.onclick = cancelHandler;
            inputEl.onkeydown = (e) => {
                if (e.key === 'Enter') okBtn.click();
            };

            overlay.classList.remove('hidden');
            inputEl.focus();
        });
    }
};

const VERTICAL_STORAGE_BUCKET = 'vertical_images';
const KNOWN_STORAGE_BUCKETS = ['vertical_images', 'gallery_photos', 'event-banners', 'alumni-images', 'executive_team'];
let verticalImageRecords = [];
let pendingVerticalImageDelete = null;
let pendingExecutiveDelete = null;
let collegeRecords = [];
let zoneRecords = [];
let collegesLoadInFlight = false;
const storageManagerState = {
    bucket: '',
    prefix: '',
    pendingDeletePath: ''
};

document.addEventListener('DOMContentLoaded', async () => {

    // 1. ACCESS CHECK & INIT
    const checkAccess = async () => {
        const loader = document.getElementById('loading-screen');
        const unauthorizedMsg = document.getElementById('unauthorized-message');
        const contentDiv = document.getElementById('admin-content');
        const sidebarName = document.getElementById('sidebar-name');
        const sidebarInitials = document.getElementById('sidebar-initials');

        // Ensure loader is visible
        if (loader) loader.style.display = 'flex';
        if (unauthorizedMsg) unauthorizedMsg.style.display = 'none';
        if (contentDiv) contentDiv.style.display = 'none';

        let email = null;
        let role = 'viewer';
        let fullName = 'Admin';

        // Check robust Supabase session first
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();

            if (session && session.user) {
                email = session.user.email;

                const { data: adminUser, error: adminError } = await supabaseClient
                    .from('admin_users')
                    .select('role, full_name, id')
                    .eq('email', email)
                    .maybeSingle();

                if (adminUser) {
                    role = adminUser.role;
                    fullName = adminUser.full_name || 'Admin';
                }
            }
        } catch (error) {
            console.error('[AdvancedAdmin] Error checking Supabase session:', error);
        }

        // Fallback to local storage
        if (!email || (role !== 'super_admin' && role !== 'Super Admin')) {
            const localSession = localStorage.getItem('yuva_user');
            if (localSession) {
                try {
                    let parsed = JSON.parse(localSession);
                    // Handle potential double-stringification
                    if (typeof parsed === 'string') {
                        try { parsed = JSON.parse(parsed); } catch (e) { }
                    }

                    if (parsed && (parsed.email || parsed.user?.email)) {
                        email = parsed.email || parsed.user?.email;
                        role = parsed.role || parsed.user?.role;
                        fullName = parsed.full_name || parsed.user?.full_name || 'Admin';
                    }
                } catch (e) {
                    console.error('[AdvancedAdmin] Error parsing localStorage:', e);
                }
            }
        }

        // Normalize check
        const normalizedRole = role ? String(role).toLowerCase().replace(/ /g, '_') : '';

        if (!email || (normalizedRole !== 'super_admin')) {
            if (loader) loader.style.display = 'none';
            if (unauthorizedMsg) unauthorizedMsg.style.display = 'flex';
            Toast.show('error', 'Access Denied', 'You do not have permission to view this page.');
            return;
        }

        // Initial Setup
        if (sidebarName) sidebarName.textContent = fullName;
        if (sidebarInitials) sidebarInitials.textContent = fullName.charAt(0).toUpperCase();

        // Show App
        if (loader) loader.style.display = 'none';
        if (unauthorizedMsg) unauthorizedMsg.style.display = 'none';
        if (contentDiv) contentDiv.style.display = 'flex'; // Flex for sidebar layout

        document.body.classList.remove('logged-out-state');

        // Load dashboard counters
        await updateDashboardCounters();
    };

    // Call immediately without delay
    await checkAccess();

    // LOGOUT PROXY
    const logoutBtnNav = document.getElementById('logout-btn-nav');
    if (logoutBtnNav) {
        logoutBtnNav.addEventListener('click', () => {
            if (window.authManager) window.authManager.logout(); // Use unit.js auth manager if available
            else window.location.href = '/GetInvolve/UnitRegistration.html';
        });
    }
});

// 2. NAVIGATION LOGIC
window.showSection = function (sectionId) {
    // Update Menu Active State
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent.toLowerCase().includes(sectionId.split('-')[0])) {
            item.classList.add('active');
        }
    });

    // Update Header Title
    const titleMap = {
        'dashboard': 'Dashboard Overview',
        'user-manager': 'User Management',
        'colleges-manager': 'College Details',
        'messages': 'Zone Messages',
        'events-manager': 'Event Management',
        'verticals-manager': 'Verticals Management',
        'storage-manager': 'Supabase Storage Manager',
        'executive-manager': 'Executive Team Members',
        'counter-admin': 'Live Counter',
        'certificates': 'Certificates',
        'vimarsh-certificates': 'Vimarsh Certificates'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titleMap[sectionId] || 'Dashboard';

    // Show Section
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('user-manager-view').classList.add('hidden');
    const messagesView = document.getElementById('messages-view');
    const eventsView = document.getElementById('events-manager-view');
    const verticalsView = document.getElementById('verticals-manager-view');
    const storageView = document.getElementById('storage-manager-view');
    const collegesView = document.getElementById('colleges-manager-view');
    const executiveView = document.getElementById('executive-manager-view');
    const counterView = document.getElementById('counter-admin-view');
    const certificatesView = document.getElementById('certificates-view');
    const certificatesSelectorView = document.getElementById('certificates-selector-view');
    if (messagesView) messagesView.style.display = 'none';
    if (eventsView) eventsView.style.display = 'none';
    if (verticalsView) verticalsView.style.display = 'none';
    if (storageView) storageView.style.display = 'none';
    if (collegesView) collegesView.classList.add('hidden');
    if (executiveView) executiveView.style.display = 'none';
    if (counterView) counterView.style.display = 'none';
    if (certificatesView) certificatesView.style.display = 'none';

    if (sectionId === 'dashboard') {
        document.getElementById('dashboard-view').classList.remove('hidden');
        updateDashboardCounters();
    } else if (sectionId === 'user-manager') {
        document.getElementById('user-manager-view').classList.remove('hidden');
        loadUsers();
    } else if (sectionId === 'messages') {
        if (messagesView) messagesView.style.display = 'block';
        loadMessages();
    } else if (sectionId === 'colleges-manager') {
        if (collegesView) collegesView.classList.remove('hidden');
        loadColleges();
    } else if (sectionId === 'events-manager') {
        if (eventsView) eventsView.style.display = 'block';
        refreshEventsManagerData();
    } else if (sectionId === 'verticals-manager') {
        if (verticalsView) verticalsView.style.display = 'block';
        loadVerticalAccessUsers();
        loadVerticalImages();
    } else if (sectionId === 'storage-manager') {
        if (storageView) storageView.style.display = 'block';
        loadStorageBuckets();
    } else if (sectionId === 'executive-manager') {
        if (executiveView) executiveView.style.display = 'block';
        loadExecutiveMembers();
    } else if (sectionId === 'counter-admin') {
        if (counterView) counterView.style.display = 'block';
        loadCounterData();
    } else if (sectionId === 'certificates') {
        if (certificatesView) certificatesView.style.display = 'block';
        if (certificatesSelectorView) certificatesSelectorView.style.display = 'grid';
        document.getElementById('vimarsh-certificates-view').style.display = 'none';
        document.getElementById('tenure-certificates-view').style.display = 'none';
    }
};

// Show specific certificate type (Vimarsh or Tenure)
window.showCertificateType = function (type) {
    const selectorView = document.getElementById('certificates-selector-view');
    const vimarshView = document.getElementById('vimarsh-certificates-view');
    const tenureView = document.getElementById('tenure-certificates-view');

    // Hide selector
    if (selectorView) selectorView.style.display = 'none';

    if (type === 'vimarsh') {
        if (vimarshView) vimarshView.style.display = 'block';
        if (tenureView) tenureView.style.display = 'none';
        initCertificateFilterCustomDropdowns();
        loadCertificates();
    } else if (type === 'tenure') {
        if (vimarshView) vimarshView.style.display = 'none';
        if (tenureView) tenureView.style.display = 'block';
        initCertificateFilterCustomDropdowns();
        loadTenureCertificates();
    }
};

// 3. DATA LOGIC
window.loadUsers = async function () {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Retrieving users...</td></tr>';

    // Verify auth via Supabase OR Local Storage
    let authenticated = false;
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        authenticated = true;
    } else {
        const localSession = localStorage.getItem('yuva_user');
        if (localSession) {
            authenticated = true;
        }
    }

    if (!authenticated) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:orange; padding:20px;">Please login to view data.</td></tr>`;
        Toast.show('error', 'Authentication Error', 'You must be logged in to view users.');
        return;
    }

    // Fetch all users from admin_users
    const { data: users, error } = await supabaseClient
        .from('admin_users')
        .select('*')
        .order('role', { ascending: true });

    if (error) {
        console.error("loadUsers: Supabase Error during fetch:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center; padding:20px;">Error fetching data. Check console.</td></tr>`;
        Toast.show('error', 'Database Error', `Failed to load users: ${error.message}`);
        return;
    }

    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">
            No users found. <br>
            <small style="color:#aaa;">(0 records returned. Check RLS policies if you expect to see data)</small>
        </td></tr>`;
        Toast.show('info', 'No Data', 'No user records were found in the database.');
        return;
    }

    tbody.innerHTML = '';

    users.forEach(user => {
        // Safe null checks
        const fullName = user.full_name || 'Unknown User';
        const userEmail = user.email || 'No Email';
        const userRole = user.role || 'viewer';
        const userZone = user.zone || '-';
        const userId = user.id;

        const roleBadge = getRoleBadgeClass(userRole);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="user-avatar" style="width:32px; height:32px; font-size:12px;">${fullName.charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-weight:700; color:#333;">${fullName}</div>
                    </div>
                </div>
            </td>
            <td>${userEmail}</td>
            <td><span class="badge badge-${roleBadge}">${userRole.replace('_', ' ').toUpperCase()}</span></td>
            <td>${userZone}</td>
        `;
        tbody.appendChild(tr);
    });
};

window.getRoleBadgeClass = function (role) {
    if (role === 'super_admin') return 'primary'; // Blue
    if (role === 'zone_convener') return 'success'; // Green
    return 'warning'; // Orange
};

// 3b. COLLEGES MANAGEMENT
window.loadColleges = async function () {
    const tbody = document.querySelector('#colleges-table tbody');
    if (!tbody) return;

    if (collegesLoadInFlight) return;
    collegesLoadInFlight = true;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading colleges...</td></tr>';

    try {
        let loaded = false;
        let lastError = null;

        for (let attempt = 0; attempt < 2 && !loaded; attempt++) {
            try {
                // Fetch sequentially to reduce lock contention in some browsers.
                const zonesResult = await supabaseClient
                    .from('zones')
                    .select('id, zone_name')
                    .order('zone_name', { ascending: true });
                if (zonesResult.error) throw zonesResult.error;

                const collegesResult = await supabaseClient
                    .from('colleges')
                    .select('id, college_name, college_code, zone_id, address, contact_email, contact_phone, total_members, is_active, updated_at')
                    .order('college_name', { ascending: true });
                if (collegesResult.error) throw collegesResult.error;

                collegeRecords = collegesResult.data || [];
                zoneRecords = zonesResult.data || [];
                loaded = true;
            } catch (error) {
                lastError = error;
                if (isTransientLockError(error) && attempt === 0) {
                    await waitMs(180);
                    continue;
                }
                throw error;
            }
        }

        if (!loaded && lastError) throw lastError;

        populateCollegeZoneDropdown();
        populateCollegeZoneFilter();
        renderCollegesTable();
    } catch (error) {
        console.error('Error loading colleges:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#c62828; padding:20px;">Failed to load colleges: ${escapeHtml(error.message || 'Unknown error')}</td></tr>`;
        Toast.show('error', 'Load Failed', error.message || 'Could not load college details');
    } finally {
        collegesLoadInFlight = false;
    }
};

function isTransientLockError(error) {
    const msg = String(error?.message || '').toLowerCase();
    const name = String(error?.name || '').toLowerCase();
    return name === 'aborterror'
        || msg.includes('lock broken by another request')
        || msg.includes('another request with the')
        || msg.includes('navigator lock');
}

function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderCollegesTable() {
    const tbody = document.querySelector('#colleges-table tbody');
    const searchInput = document.getElementById('college-search');
    const zoneFilter = document.getElementById('college-zone-filter');
    if (!tbody) return;

    const query = String(searchInput?.value || '').trim().toLowerCase();
    const selectedZone = String(zoneFilter?.value || 'all');
    const zonesById = new Map((zoneRecords || []).map((zone) => [Number(zone.id), zone.zone_name || '-']));

    const filtered = (collegeRecords || []).filter((row) => {
        if (selectedZone !== 'all' && String(row.zone_id || '') !== selectedZone) {
            return false;
        }

        if (!query) return true;

        const zoneName = zonesById.get(Number(row.zone_id)) || '';
        const haystack = [
            row.college_name,
            row.college_code,
            zoneName,
            row.contact_email,
            row.contact_phone,
            row.address
        ].map((v) => String(v || '').toLowerCase()).join(' ');

        return haystack.includes(query);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#777;">No colleges found for this search.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((row) => {
        const zoneName = zonesById.get(Number(row.zone_id)) || '-';
        const members = Number(row.total_members || 0);
        const statusClass = row.is_active ? 'badge-success' : 'badge-warning';
        const statusText = row.is_active ? 'ACTIVE' : 'INACTIVE';

        return `
            <tr>
                <td>
                    <div style="font-weight:700; color:#1f2937;">${escapeHtml(row.college_name || '-')}</div>
                    <div style="font-size:12px; color:#6b7280;">${escapeHtml(row.address || '')}</div>
                </td>
                <td>${escapeHtml(row.college_code || '-')}</td>
                <td>${escapeHtml(zoneName)}</td>
                <td>
                    <div style="font-size:13px;">${escapeHtml(row.contact_email || '-')}</div>
                    <div style="font-size:12px; color:#6b7280;">${escapeHtml(row.contact_phone || '-')}</div>
                </td>
                <td><strong>${members}</strong></td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action edit" onclick="openCollegeModal(${Number(row.id)})"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn-action delete" onclick="deleteCollege(${Number(row.id)})"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function populateCollegeZoneFilter() {
    const select = document.getElementById('college-zone-filter');
    if (!select) return;

    const current = select.value || 'all';
    select.innerHTML = '<option value="all">All Zones</option>';

    (zoneRecords || []).forEach((zone) => {
        const option = document.createElement('option');
        option.value = String(zone.id);
        option.textContent = zone.zone_name || `Zone ${zone.id}`;
        select.appendChild(option);
    });

    const validValues = new Set(Array.from(select.options).map((opt) => opt.value));
    select.value = validValues.has(current) ? current : 'all';
}

function populateCollegeZoneDropdown() {
    const select = document.getElementById('college-zone');
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">Select zone</option>';

    (zoneRecords || []).forEach((zone) => {
        const option = document.createElement('option');
        option.value = String(zone.id);
        option.textContent = zone.zone_name || `Zone ${zone.id}`;
        select.appendChild(option);
    });

    if (current) select.value = current;
}

window.openCollegeModal = function (collegeId = null) {
    const modal = document.getElementById('college-modal');
    if (!modal) return;

    const titleEl = document.getElementById('college-modal-title');
    const idEl = document.getElementById('college-id');
    const nameEl = document.getElementById('college-name');
    const codeEl = document.getElementById('college-code');
    const zoneEl = document.getElementById('college-zone');
    const addressEl = document.getElementById('college-address');
    const emailEl = document.getElementById('college-email');
    const phoneEl = document.getElementById('college-phone');
    const membersEl = document.getElementById('college-members');
    const activeEl = document.getElementById('college-active');

    populateCollegeZoneDropdown();

    if (!collegeId) {
        if (titleEl) titleEl.textContent = 'Add College';
        if (idEl) idEl.value = '';
        if (nameEl) nameEl.value = '';
        if (codeEl) codeEl.value = '';
        if (zoneEl) zoneEl.value = '';
        if (addressEl) addressEl.value = '';
        if (emailEl) emailEl.value = '';
        if (phoneEl) phoneEl.value = '';
        if (membersEl) membersEl.value = '0';
        if (activeEl) activeEl.checked = true;
    } else {
        const row = (collegeRecords || []).find((item) => Number(item.id) === Number(collegeId));
        if (!row) {
            Toast.show('warning', 'Record Missing', 'College record not found. Refresh and try again.');
            return;
        }

        if (titleEl) titleEl.textContent = 'Edit College';
        if (idEl) idEl.value = String(row.id);
        if (nameEl) nameEl.value = row.college_name || '';
        if (codeEl) codeEl.value = row.college_code || '';
        if (zoneEl) zoneEl.value = row.zone_id ? String(row.zone_id) : '';
        if (addressEl) addressEl.value = row.address || '';
        if (emailEl) emailEl.value = row.contact_email || '';
        if (phoneEl) phoneEl.value = row.contact_phone || '';
        if (membersEl) membersEl.value = String(Number(row.total_members || 0));
        if (activeEl) activeEl.checked = !!row.is_active;
    }

    modal.classList.remove('hidden');
};

window.closeCollegeModal = function () {
    const modal = document.getElementById('college-modal');
    if (modal) modal.classList.add('hidden');
};

window.saveCollege = async function () {
    const id = Number(document.getElementById('college-id')?.value || 0);
    const collegeName = String(document.getElementById('college-name')?.value || '').trim();
    const collegeCode = String(document.getElementById('college-code')?.value || '').trim();
    const zoneId = Number(document.getElementById('college-zone')?.value || 0);
    const address = String(document.getElementById('college-address')?.value || '').trim();
    const contactEmail = String(document.getElementById('college-email')?.value || '').trim();
    const contactPhone = String(document.getElementById('college-phone')?.value || '').trim();
    const totalMembers = Number(document.getElementById('college-members')?.value || 0);
    const isActive = !!document.getElementById('college-active')?.checked;

    if (!collegeName || !collegeCode || !zoneId) {
        Toast.show('warning', 'Missing Required Fields', 'College name, code, and zone are required.');
        return;
    }

    const payload = {
        college_name: collegeName,
        college_code: collegeCode,
        zone_id: zoneId,
        address: address || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        total_members: Number.isFinite(totalMembers) && totalMembers >= 0 ? totalMembers : 0,
        is_active: isActive,
        updated_at: new Date().toISOString()
    };

    try {
        if (id) {
            const { error } = await supabaseClient
                .from('colleges')
                .update(payload)
                .eq('id', id);

            if (error) throw error;
            Toast.show('success', 'Updated', 'College record updated successfully.');
        } else {
            const { error } = await supabaseClient
                .from('colleges')
                .insert([{ ...payload, created_at: new Date().toISOString() }]);

            if (error) throw error;
            Toast.show('success', 'Added', 'New college added successfully.');
        }

        closeCollegeModal();
        await loadColleges();
    } catch (error) {
        console.error('Error saving college:', error);
        Toast.show('error', 'Save Failed', error.message || 'Could not save college details');
    }
};

window.deleteCollege = async function (collegeId) {
    if (!collegeId) return;
    const row = (collegeRecords || []).find((item) => Number(item.id) === Number(collegeId));
    const name = row?.college_name || 'this college';

    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    try {
        const { error } = await supabaseClient
            .from('colleges')
            .delete()
            .eq('id', Number(collegeId));

        if (error) throw error;

        Toast.show('success', 'Deleted', 'College record deleted successfully.');
        await loadColleges();
    } catch (error) {
        console.error('Error deleting college:', error);
        Toast.show('error', 'Delete Failed', error.message || 'Could not delete college');
    }
};

// 4. MESSAGES FUNCTIONALITY
window.loadMessages = async function () {
    const container = document.getElementById('messages-container');
    const statusFilter = document.getElementById('message-status-filter').value;

    container.innerHTML = '<div style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading messages...</div>';

    // Verify auth via Supabase OR Local Storage
    let authenticated = false;
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        authenticated = true;
    } else {
        const localSession = localStorage.getItem('yuva_user');
        if (localSession) {
            authenticated = true;
        }
    }

    if (!authenticated) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#aaa;">Please login again</div>';
        Toast.show('error', 'Authentication Error', 'You must be logged in to view messages.');
        return;
    }

    let query = supabaseClient
        .from('zone_convener_messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    const { data: messages, error } = await query;

    if (error) {
        console.error("[loadMessages] Error:", error);
        container.innerHTML = `<div style="text-align:center; padding:30px; color:red;">
            Error loading messages: ${error.message}<br>
            <small>${error.details || error.hint || 'Check console for details'}</small>
        </div>`;
        return;
    }

    // Sort: High Priority First, then Unread, then Date
    if (messages) {
        messages.sort((a, b) => {
            // 1. PRIORITY (Crucial items first)
            const priorityOrder = { 'high': 0, 'urgent': 0, 'medium': 1, 'normal': 1, 'low': 2 };
            // Default to 'normal' (1) if missing
            const pA = a.priority ? (priorityOrder[a.priority.toLowerCase()] ?? 1) : 1;
            const pB = b.priority ? (priorityOrder[b.priority.toLowerCase()] ?? 1) : 1;

            if (pA !== pB) {
                return pA - pB; // Lower number = Higher priority (0 comes first)
            }

            // 2. STATUS (Unread next)
            const statusOrder = { 'unread': 0, 'read': 1, 'resolved': 2 };
            const sA = statusOrder[a.status] ?? 1;
            const sB = statusOrder[b.status] ?? 1;

            if (sA !== sB) {
                return sA - sB;
            }

            // 3. DATE (Newest first)
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }

    if (!messages || messages.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#777;">No messages found</div>';
        return;
    }

    // Render messages
    let html = '<div class="messages-stack">';
    messages.forEach(msg => {
        const statusColors = {
            'unread': '#FF9933',
            'read': '#000080',
            'resolved': '#138808'
        };
        const categoryColors = {
            'technical': '#E67300',
            'policy': '#000080',
            'resources': '#FF9933',
            'other': '#64748B'
        };
        const statusColor = statusColors[msg.status] || '#64748B';
        const categoryColor = categoryColors[msg.category] || '#64748B';
        const safeCategory = (msg.category || 'other').toUpperCase();
        const safeStatus = (msg.status || 'read').toUpperCase();
        const createdAtLabel = msg.created_at ? new Date(msg.created_at).toLocaleString() : 'N/A';

        html += `
            <article class="message-card" style="--message-status-color:${statusColor}">
                <div class="message-card-head">
                    <div class="message-card-head-main">
                        <h3 class="message-title">${msg.subject}</h3>
                        <div class="message-meta">
                            <span class="message-pill" style="--pill-bg:${categoryColor};">${safeCategory}</span>
                            <span class="message-pill" style="--pill-bg:${statusColor};">${safeStatus}</span>
                        </div>
                    </div>
                    <div class="message-time">${createdAtLabel}</div>
                </div>

                <div class="message-info-box">
                    <div class="message-info-grid">
                        <div><strong>From:</strong> ${msg.sender_name || 'N/A'}</div>
                        <div><strong>Email:</strong> ${msg.sender_email || 'N/A'}</div>
                        <div><strong>Zone:</strong> ${msg.zone_name || 'N/A'}</div>
                        <div><strong>Role:</strong> ${msg.sender_role || 'N/A'}</div>
                    </div>
                </div>

                <div class="message-body">
                    <strong class="message-label">Message:</strong>
                    <p class="message-text">${msg.message || ''}</p>
                </div>

                <div class="message-actions">
                    ${msg.status === 'unread' ? `<button class="btn primary" data-action="mark-read" data-msg-id="${msg.id}"><i class="fas fa-check"></i> Mark as Read</button>` : ''}
                    ${msg.status === 'read' ? `<button class="btn primary" data-action="mark-resolved" data-msg-id="${msg.id}"><i class="fas fa-check-double"></i> Mark as Resolved</button>` : ''}
                    ${msg.status === 'resolved' ? `<button class="btn secondary" data-action="reopen" data-msg-id="${msg.id}"><i class="fas fa-undo"></i> Reopen</button>` : ''}
                    <button class="btn secondary" data-action="reply" data-msg-id="${msg.id}" data-email="${msg.sender_email}" data-subject="${msg.subject.replace(/"/g, '&quot;')}" data-name="${msg.sender_name.replace(/"/g, '&quot;')}"><i class="fas fa-reply"></i> Reply via Email</button>
                </div>
            </article>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};

window.updateMessageStatus = async function (messageId, newStatus, extraFields = {}, buttonElement = null) {
    // Add animation class based on status
    if (buttonElement) {
        if (newStatus === 'read') {
            buttonElement.classList.add('marking');
        } else if (newStatus === 'resolved') {
            buttonElement.classList.add('resolving');
        } else if (newStatus === 'unread') {
            buttonElement.classList.add('reopening');
        }
        buttonElement.disabled = true;
    }

    const updates = { status: newStatus, ...extraFields };
    const { error } = await supabaseClient
        .from('zone_convener_messages')
        .update(updates)
        .eq('id', messageId);

    if (error) {
        Toast.show('error', 'Status Update Failed', error.message);
        if (buttonElement) {
            buttonElement.classList.remove('marking', 'resolving', 'reopening');
            buttonElement.disabled = false;
        }
    } else {
        Toast.show('success', 'Status Updated', 'Message status changed successfully');
        if (buttonElement) {
            buttonElement.classList.add('success-bounce');
            setTimeout(() => {
                loadMessages();
            }, 300);
        } else {
            loadMessages();
        }
    }
};

// Event delegation for message action buttons with animations
document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const msgId = btn.dataset.msgId;

    if (action === 'mark-read') {
        updateMessageStatus(msgId, 'read', {}, btn);
    } else if (action === 'mark-resolved') {
        updateMessageStatus(msgId, 'resolved', {}, btn);
    } else if (action === 'reopen') {
        updateMessageStatus(msgId, 'unread', {}, btn);
    } else if (action === 'reply') {
        btn.classList.add('sending');
        setTimeout(() => {
            btn.classList.remove('sending');
            replyToMessage(msgId, btn.dataset.email, btn.dataset.subject, btn.dataset.name);
        }, 800);
    }
});
window.replyToMessage = function (id, email, subject, name) {
    const modal = document.getElementById('reply-modal');
    if (!modal) return;

    document.getElementById('reply-id').value = id;
    document.getElementById('reply-name').value = name; // Store Name
    document.getElementById('reply-to').value = email;
    document.getElementById('reply-subject').value = `Re: ${subject}`;

    // Clear message body (Templating moved to backend)
    document.getElementById('reply-body').value = '';
    document.getElementById('reply-body').placeholder = 'Type your reply here...';

    modal.classList.remove('hidden');
};

window.closeReplyModal = function () {
    const modal = document.getElementById('reply-modal');
    if (modal) modal.classList.add('hidden');
};

window.sendReply = async function () {
    const id = document.getElementById('reply-id').value;
    const name = document.getElementById('reply-name').value;
    const email = document.getElementById('reply-to').value;
    const subject = document.getElementById('reply-subject').value;
    const body = document.getElementById('reply-body').value;
    const sendBtn = document.querySelector('#reply-modal .btn.primary');

    if (!body.trim()) {
        Toast.show('error', 'Message Required', 'Please enter a message.');
        return;
    }

    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    sendBtn.disabled = true;

    try {
        const payload = new URLSearchParams();
        payload.append('action', 'notify');
        payload.append('method', 'replyViaEmail');
        payload.append('toEmail', email);
        payload.append('subject', subject);
        payload.append('body', body);

        const senderName = document.getElementById('sidebar-name')?.textContent || 'YUVA Admin';
        payload.append('replierName', senderName);
        payload.append('userName', name); // Pass user name for greeting

        const url = typeof GAS_WEB_APP_URL !== 'undefined' ? GAS_WEB_APP_URL : '';
        if (!url) throw new Error("Backend URL not found.");

        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload
        });

        // 1. Resolve & Save Note
        if (id) {
            let resolvedBy = null;
            try {
                const user = JSON.parse(localStorage.getItem('yuva_user'));
                if (user && user.id) resolvedBy = user.id;
            } catch (e) { console.error("User ID parsing error", e); }

            await updateMessageStatus(id, 'resolved', {
                admin_notes: body,
                resolved_by: resolvedBy,
                updated_at: new Date().toISOString()
            });
        }

        Toast.show('success', 'Email Sent', 'Message has been marked as resolved.');
        closeReplyModal();

    } catch (error) {
        console.error("Send Reply Error:", error);
        Toast.show('error', 'Send Failed', 'Could not send email. Try again.');
    } finally {
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reply';
        sendBtn.disabled = false;
    }
};

// Add filter listener
document.addEventListener('DOMContentLoaded', () => {
    const filterEl = document.getElementById('message-status-filter');
    if (filterEl) {
        filterEl.addEventListener('change', loadMessages);
    }
});

// 5. GLOBAL UTILITIES
window.refreshCurrentView = function () {
    // Add spin animation to refresh button
    const refreshBtn = document.querySelector('.header-actions .btn.secondary i.fa-sync');
    if (refreshBtn) {
        refreshBtn.parentElement.classList.add('refreshing');
    }

    Toast.show('info', 'Refreshing', 'Updating dashboard data...', 2000);

    // Check which view is visible
    const userView = document.getElementById('user-manager-view');
    const messagesView = document.getElementById('messages-view');

    const stopRefreshAnimation = () => {
        if (refreshBtn) {
            setTimeout(() => {
                refreshBtn.parentElement.classList.remove('refreshing');
            }, 500);
        }
    };

    if (userView && !userView.classList.contains('hidden')) {
        loadUsers().finally(stopRefreshAnimation);
    } else {
        const collegesView = document.getElementById('colleges-manager-view');
        if (collegesView && !collegesView.classList.contains('hidden')) {
            loadColleges().finally(stopRefreshAnimation);
            return;
        }
    }

    if (messagesView && messagesView.style.display !== 'none') {
        loadMessages().finally(stopRefreshAnimation);
    } else {
        const eventsView = document.getElementById('events-manager-view');
        if (eventsView && eventsView.style.display !== 'none') {
            refreshEventsManagerData().finally(stopRefreshAnimation);
        } else {
            const verticalsView = document.getElementById('verticals-manager-view');
            if (verticalsView && verticalsView.style.display !== 'none') {
                Promise.all([loadVerticalAccessUsers(), loadVerticalImages()]).finally(stopRefreshAnimation);
            } else {
                const storageView = document.getElementById('storage-manager-view');
                if (storageView && storageView.style.display !== 'none') {
                    loadStorageObjects().finally(stopRefreshAnimation);
                } else {
                    // Main Dashboard (Static for now, but simulating refresh)
                    setTimeout(() => {
                        Toast.show('success', 'Dashboard Updated', 'Dashboard Refreshed Successfully');
                        stopRefreshAnimation();
                    }, 800);
                }
            }
        }
    }
};

// ===== VERTICALS MANAGEMENT SECTION =====

window.loadVerticalAccessUsers = async function () {
    const tbody = document.querySelector('#vertical-access-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading access users...</td></tr>';

    try {
        const [accessResult, keysResult] = await Promise.all([
            supabaseClient
                .from('vertical_access')
                .select('email, vertical_name')
                .order('vertical_name', { ascending: true })
                .order('email', { ascending: true }),
            supabaseClient
                .from('security_keys')
                .select('email, security_key')
        ]);

        if (accessResult.error) throw accessResult.error;
        if (keysResult.error) throw keysResult.error;

        const keyByEmail = new Map();
        (keysResult.data || []).forEach((row) => {
            if (!row || !row.email) return;
            keyByEmail.set(String(row.email).toLowerCase(), row.security_key || '');
        });

        const rows = accessResult.data || [];
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#777;">No vertical access users found.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map((row) => {
            const email = row.email || '';
            const vertical = row.vertical_name || '';
            const key = keyByEmail.get(String(email).toLowerCase()) || '';
            const encodedEmail = encodeURIComponent(email);
            const encodedVertical = encodeURIComponent(vertical);
            const encodedKey = encodeURIComponent(key);
            const keyPreview = key ? `${'*'.repeat(Math.max(4, Math.min(10, key.length)))}` : 'Not set';

            return `
                <tr>
                    <td>${escapeHtml(email)}</td>
                    <td>${escapeHtml(vertical)}</td>
                    <td>${escapeHtml(keyPreview)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action edit" onclick="openVerticalAccessModalFromRow('${encodedEmail}', '${encodedVertical}', '${encodedKey}')"><i class="fas fa-edit"></i> Edit</button>
                            <button class="btn-action delete" onclick="deleteVerticalAccess('${encodedEmail}', '${encodedVertical}')"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading vertical access users:', error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#c62828; padding:20px;">Failed to load access users: ${escapeHtml(error.message || 'Unknown error')}</td></tr>`;
        Toast.show('error', 'Load Failed', error.message || 'Could not load vertical access users');
    }
};

window.openVerticalAccessModalFromRow = function (encodedEmail, encodedVertical, encodedKey) {
    openVerticalAccessModal({
        email: decodeURIComponent(encodedEmail || ''),
        vertical_name: decodeURIComponent(encodedVertical || ''),
        security_key: decodeURIComponent(encodedKey || '')
    });
};

window.openVerticalAccessModal = function (record = null) {
    const modal = document.getElementById('vertical-access-modal');
    if (!modal) return;

    const isEdit = !!record;
    document.getElementById('vertical-access-modal-title').textContent = isEdit ? 'Edit Vertical Access' : 'Add Vertical Access';
    document.getElementById('vertical-access-original-email').value = isEdit ? (record.email || '') : '';
    document.getElementById('vertical-access-original-vertical').value = isEdit ? (record.vertical_name || '') : '';
    document.getElementById('vertical-access-email').value = isEdit ? (record.email || '') : '';
    document.getElementById('vertical-access-vertical').value = isEdit ? (record.vertical_name || '') : '';
    document.getElementById('vertical-access-security-key').value = isEdit ? (record.security_key || '') : '';

    modal.classList.remove('hidden');
};

window.closeVerticalAccessModal = function () {
    const modal = document.getElementById('vertical-access-modal');
    if (modal) modal.classList.add('hidden');
};

window.saveVerticalAccess = async function () {
    const email = (document.getElementById('vertical-access-email')?.value || '').trim().toLowerCase();
    const verticalName = (document.getElementById('vertical-access-vertical')?.value || '').trim();
    const securityKey = (document.getElementById('vertical-access-security-key')?.value || '').trim();
    const originalEmail = (document.getElementById('vertical-access-original-email')?.value || '').trim().toLowerCase();
    const originalVertical = (document.getElementById('vertical-access-original-vertical')?.value || '').trim();

    if (!email || !verticalName || !securityKey) {
        Toast.show('warning', 'Missing Data', 'Email, vertical name, and security key are required.');
        return;
    }

    try {
        if (originalEmail && originalVertical) {
            const { error: deleteOldError } = await supabaseClient
                .from('vertical_access')
                .delete()
                .eq('email', originalEmail)
                .eq('vertical_name', originalVertical);

            if (deleteOldError) throw deleteOldError;
        }

        const { error: insertAccessError } = await supabaseClient
            .from('vertical_access')
            .insert([{ email, vertical_name: verticalName }]);

        if (insertAccessError) throw insertAccessError;

        const { error: keyUpsertError } = await supabaseClient
            .from('security_keys')
            .upsert([{ email, security_key: securityKey }], { onConflict: 'email' });

        if (keyUpsertError) {
            // Fallback for schemas where email is not a declared unique constraint.
            const { error: keyUpdateError } = await supabaseClient
                .from('security_keys')
                .update({ security_key: securityKey })
                .eq('email', email);

            if (keyUpdateError) throw keyUpdateError;

            const { data: keyRows, error: keyRowsError } = await supabaseClient
                .from('security_keys')
                .select('id')
                .eq('email', email)
                .limit(1);

            if (keyRowsError) throw keyRowsError;

            if (!keyRows || keyRows.length === 0) {
                const { error: keyInsertError } = await supabaseClient
                    .from('security_keys')
                    .insert([{ email, security_key: securityKey }]);

                if (keyInsertError) throw keyInsertError;
            }
        }

        Toast.show('success', 'Saved', 'Vertical access updated successfully.');
        closeVerticalAccessModal();
        await loadVerticalAccessUsers();
    } catch (error) {
        console.error('Error saving vertical access:', error);
        Toast.show('error', 'Save Failed', error.message || 'Could not save vertical access');
    }
};

window.deleteVerticalAccess = async function (encodedEmail, encodedVertical) {
    const email = decodeURIComponent(encodedEmail || '').toLowerCase();
    const verticalName = decodeURIComponent(encodedVertical || '');

    if (!email || !verticalName) return;
    if (!confirm(`Delete access for ${email} in ${verticalName}?`)) return;

    try {
        const { error } = await supabaseClient
            .from('vertical_access')
            .delete()
            .eq('email', email)
            .eq('vertical_name', verticalName);

        if (error) throw error;

        const { data: remainingAccess, error: remainingError } = await supabaseClient
            .from('vertical_access')
            .select('email')
            .eq('email', email)
            .limit(1);

        if (remainingError) throw remainingError;

        if (!remainingAccess || remainingAccess.length === 0) {
            await supabaseClient
                .from('security_keys')
                .delete()
                .eq('email', email);
        }

        Toast.show('success', 'Deleted', 'Vertical access removed.');
        await loadVerticalAccessUsers();
    } catch (error) {
        console.error('Error deleting vertical access:', error);
        Toast.show('error', 'Delete Failed', error.message || 'Could not delete vertical access');
    }
};

window.loadVerticalImages = async function () {
    const tbody = document.querySelector('#vertical-images-table tbody');
    const filterEl = document.getElementById('vertical-image-filter');
    if (!tbody || !filterEl) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading vertical images...</td></tr>';

    try {
        const selectedVertical = filterEl.value || 'all';
        let query = supabaseClient
            .from('vertical_events')
            .select('id, event_name, event_date, event_location, vertical_name, image_url, uploaded_by, created_at')
            .order('created_at', { ascending: false });

        if (selectedVertical !== 'all') {
            query = query.eq('vertical_name', selectedVertical);
        }

        const { data, error } = await query;
        if (error) throw error;

        const dbRecords = (data || []).map((row) => ({
            ...row,
            source: 'database'
        }));

        const storageOnlyRecords = await loadStorageOnlyVerticalImages(dbRecords, selectedVertical);
        verticalImageRecords = [...dbRecords, ...storageOnlyRecords]
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        await populateVerticalImageFilterOptions(selectedVertical);

        if (verticalImageRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#777;">No vertical images found.</td></tr>';
            return;
        }

        tbody.innerHTML = verticalImageRecords.map((row) => {
            const encodedUrl = encodeURIComponent(row.image_url || '');
            const date = row.event_date ? formatDate(row.event_date) : '-';
            const uploadedBy = row.uploaded_by || '-';
            const canEdit = row.source !== 'storage';
            const recordId = row.id ? Number(row.id) : null;
            const editButtonHtml = canEdit && recordId !== null
                ? `<button class="btn-action edit" onclick="openVerticalImageEditModal(${recordId})"><i class="fas fa-edit"></i> Edit</button>`
                : '';

            return `
                <tr>
                    <td><img src="${escapeHtml(row.image_url || '')}" alt="${escapeHtml(row.event_name || 'Vertical image')}" class="vertical-thumb"></td>
                    <td>
                        <strong>${escapeHtml(row.event_name || '-')}</strong>
                        <div style="color:#888; font-size:12px;">${escapeHtml(row.event_location || '')}</div>
                        <div style="color:#999; font-size:11px; margin-top:4px;">${row.source === 'storage' ? 'Storage only (no DB metadata)' : 'Database record'}</div>
                    </td>
                    <td>${escapeHtml(row.vertical_name || '-')}</td>
                    <td>${escapeHtml(date)}</td>
                    <td>${escapeHtml(uploadedBy)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action view" onclick="openVerticalImageViewModal('${encodedUrl}', '${encodeURIComponent(row.event_name || 'Image Preview')}')"><i class="fas fa-eye"></i> View</button>
                            ${editButtonHtml}
                            <button class="btn-action delete" onclick="deleteVerticalImageRecord(${recordId === null ? 'null' : recordId}, '${encodedUrl}')"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading vertical images:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#c62828; padding:20px;">Failed to load images: ${escapeHtml(error.message || 'Unknown error')}</td></tr>`;
        Toast.show('error', 'Load Failed', error.message || 'Could not load vertical images');
    }
};

async function populateVerticalImageFilterOptions(selectedValue) {
    const filterEl = document.getElementById('vertical-image-filter');
    if (!filterEl) return;

    const { data: allRows, error } = await supabaseClient
        .from('vertical_events')
        .select('vertical_name');

    if (error) {
        console.error('Error loading vertical names for filter:', error);
        return;
    }

    const storageVerticals = await getStorageVerticalFolders();
    const uniqueVerticals = [...new Set([...(allRows || [])
        .map((row) => (row.vertical_name || '').trim())
        .filter(Boolean), ...storageVerticals])].sort((a, b) => a.localeCompare(b));

    filterEl.innerHTML = '<option value="all">All Verticals</option>';
    uniqueVerticals.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        filterEl.appendChild(option);
    });

    filterEl.value = uniqueVerticals.includes(selectedValue) || selectedValue === 'all' ? selectedValue : 'all';
}

window.openVerticalImageViewModal = function (encodedUrl, encodedTitle) {
    const imageUrl = decodeURIComponent(encodedUrl || '');
    const imageTitle = decodeURIComponent(encodedTitle || 'Image Preview');
    if (!imageUrl) return;

    const modal = document.getElementById('vertical-image-view-modal');
    const titleEl = document.getElementById('vertical-image-view-title');
    const imageEl = document.getElementById('vertical-image-view-img');

    if (!modal || !titleEl || !imageEl) {
        Toast.show('warning', 'Preview Unavailable', 'Preview modal not found. Please refresh the page.');
        return;
    }

    titleEl.textContent = imageTitle;
    imageEl.src = imageUrl;
    imageEl.onerror = function () {
        this.removeAttribute('src');
        Toast.show('error', 'Preview Failed', 'Could not load this image.');
    };

    modal.classList.remove('hidden');
};

window.closeVerticalImageViewModal = function () {
    const modal = document.getElementById('vertical-image-view-modal');
    const imageEl = document.getElementById('vertical-image-view-img');
    if (imageEl) {
        imageEl.onerror = null;
        imageEl.removeAttribute('src');
    }
    if (modal) modal.classList.add('hidden');
};

window.openVerticalImageEditModal = function (recordId) {
    const modal = document.getElementById('vertical-image-modal');
    if (!modal) return;

    const record = verticalImageRecords.find((row) => Number(row.id) === Number(recordId));
    if (!record) {
        Toast.show('warning', 'Not Found', 'Image record not found in current list. Refresh and try again.');
        return;
    }

    document.getElementById('vertical-image-id').value = record.id;
    document.getElementById('vertical-image-event-name').value = record.event_name || '';
    document.getElementById('vertical-image-event-date').value = record.event_date || '';
    document.getElementById('vertical-image-vertical').value = record.vertical_name || '';
    document.getElementById('vertical-image-location').value = record.event_location || '';

    modal.classList.remove('hidden');
};

window.closeVerticalImageModal = function () {
    const modal = document.getElementById('vertical-image-modal');
    if (modal) modal.classList.add('hidden');
};

window.saveVerticalImageRecord = async function () {
    const id = Number(document.getElementById('vertical-image-id')?.value || 0);
    const eventName = (document.getElementById('vertical-image-event-name')?.value || '').trim();
    const eventDate = (document.getElementById('vertical-image-event-date')?.value || '').trim();
    const verticalName = (document.getElementById('vertical-image-vertical')?.value || '').trim();
    const eventLocation = (document.getElementById('vertical-image-location')?.value || '').trim();

    if (!id || !eventName || !eventDate || !verticalName) {
        Toast.show('warning', 'Missing Data', 'Event name, date, and vertical are required.');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('vertical_events')
            .update({
                event_name: eventName,
                event_date: eventDate,
                vertical_name: verticalName,
                event_location: eventLocation,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        Toast.show('success', 'Updated', 'Vertical image record updated successfully.');
        closeVerticalImageModal();
        await loadVerticalImages();
    } catch (error) {
        console.error('Error updating vertical image record:', error);
        Toast.show('error', 'Update Failed', error.message || 'Could not update image record');
    }
};

window.deleteVerticalImageRecord = function (recordId, encodedUrl) {
    const imageUrl = decodeURIComponent(encodedUrl || '');
    if (!imageUrl) return;

    pendingVerticalImageDelete = {
        recordId: recordId ? Number(recordId) : null,
        imageUrl
    };

    const modal = document.getElementById('vertical-image-delete-modal');
    const fileNameEl = document.getElementById('vertical-image-delete-name');
    if (!modal || !fileNameEl) {
        Toast.show('warning', 'Delete Unavailable', 'Delete modal is not available. Please refresh page.');
        return;
    }

    const storagePath = getStoragePathFromPublicUrl(imageUrl, VERTICAL_STORAGE_BUCKET) || '';
    const fileName = storagePath.split('/').pop() || 'Selected image';
    fileNameEl.textContent = fileName;
    modal.classList.remove('hidden');
};

window.closeVerticalImageDeleteModal = function () {
    const modal = document.getElementById('vertical-image-delete-modal');
    if (modal) modal.classList.add('hidden');
    pendingVerticalImageDelete = null;
};

window.confirmVerticalImageDelete = async function () {
    if (!pendingVerticalImageDelete || !pendingVerticalImageDelete.imageUrl) {
        closeVerticalImageDeleteModal();
        return;
    }

    const { recordId, imageUrl } = pendingVerticalImageDelete;
    const confirmBtn = document.getElementById('vertical-image-delete-confirm-btn');
    const originalBtnText = confirmBtn ? confirmBtn.innerHTML : '';

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    }

    try {
        const storagePath = getStoragePathFromPublicUrl(imageUrl, VERTICAL_STORAGE_BUCKET);
        if (storagePath) {
            const { error: storageError } = await supabaseClient.storage
                .from(VERTICAL_STORAGE_BUCKET)
                .remove([storagePath]);

            if (storageError) throw storageError;
        }

        if (recordId) {
            const { error: dbError } = await supabaseClient
                .from('vertical_events')
                .delete()
                .eq('id', recordId);

            if (dbError) throw dbError;
        }

        Toast.show('success', 'Deleted', 'Image deleted successfully.');
        closeVerticalImageDeleteModal();
        await loadVerticalImages();
    } catch (error) {
        console.error('Error deleting vertical image:', error);
        Toast.show('error', 'Delete Failed', error.message || 'Could not delete image');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalBtnText;
        }
    }
};

function getStoragePathFromPublicUrl(publicUrl, bucketName) {
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const markerIndex = publicUrl.indexOf(marker);
    if (markerIndex === -1) return null;

    const rawPath = publicUrl.slice(markerIndex + marker.length);
    return decodeURIComponent(rawPath.split('?')[0]);
}

async function getStorageVerticalFolders() {
    const { data, error } = await supabaseClient.storage
        .from(VERTICAL_STORAGE_BUCKET)
        .list('', { limit: 200 });

    if (error) {
        console.error('Error listing storage folders:', error);
        return [];
    }

    return (data || [])
        .map((item) => String(item?.name || '').trim())
        .filter(Boolean);
}

async function loadStorageOnlyVerticalImages(dbRecords, selectedVertical) {
    const dbImageUrls = new Set((dbRecords || []).map((row) => normalizePublicUrl(row.image_url)).filter(Boolean));
    const storageFolders = selectedVertical === 'all' ? await getStorageVerticalFolders() : [selectedVertical];
    const output = [];

    for (const folder of storageFolders) {
        if (!folder) continue;

        const { data: files, error } = await supabaseClient.storage
            .from(VERTICAL_STORAGE_BUCKET)
            .list(folder, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

        if (error) {
            console.warn('Failed to list folder in storage:', folder, error.message);
            continue;
        }

        for (const file of files || []) {
            if (!file || !file.name) continue;
            if (!/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) continue;

            const storagePath = `${folder}/${file.name}`;
            const { data: publicData } = supabaseClient.storage.from(VERTICAL_STORAGE_BUCKET).getPublicUrl(storagePath);
            const publicUrl = publicData.publicUrl;
            const normalizedUrl = normalizePublicUrl(publicUrl);

            if (dbImageUrls.has(normalizedUrl)) continue;

            output.push({
                id: null,
                event_name: file.name,
                event_date: file.created_at ? String(file.created_at).slice(0, 10) : null,
                event_location: '',
                vertical_name: folder,
                image_url: publicUrl,
                uploaded_by: '-',
                created_at: file.created_at || file.updated_at || null,
                source: 'storage'
            });
        }
    }

    return output;
}

function normalizePublicUrl(url) {
    if (!url) return '';
    return decodeURIComponent(String(url).split('?')[0]);
}

// ===== STORAGE MANAGEMENT SECTION =====

window.loadStorageBuckets = async function () {
    const bucketSelect = document.getElementById('storage-bucket-select');
    if (!bucketSelect) return;

    try {
        const { data, error } = await supabaseClient.storage.listBuckets();
        if (error) throw error;

        const buckets = (data || []).map((b) => b.name).filter(Boolean);

        // Some anon sessions return empty bucket list without throwing an error.
        if (buckets.length === 0) {
            renderStorageBucketOptions(KNOWN_STORAGE_BUCKETS);
            Toast.show('warning', 'Limited Bucket Access', 'Using known buckets because bucket listing returned empty.');
        } else {
            renderStorageBucketOptions(buckets);
        }
    } catch (error) {
        console.warn('Falling back to known bucket list:', error.message || error);
        renderStorageBucketOptions(KNOWN_STORAGE_BUCKETS);
        Toast.show('warning', 'Limited Bucket Access', 'Bucket listing is restricted. Showing known buckets only.');
    }

    await loadStorageObjects();
};

function renderStorageBucketOptions(bucketNames) {
    const bucketSelect = document.getElementById('storage-bucket-select');
    if (!bucketSelect) return;

    const unique = [...new Set((bucketNames || []).map((x) => String(x).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const current = storageManagerState.bucket;

    bucketSelect.innerHTML = '<option value="">Select bucket...</option>';
    unique.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        bucketSelect.appendChild(option);
    });

    if (current && unique.includes(current)) {
        bucketSelect.value = current;
    } else if (!current && unique.length > 0) {
        bucketSelect.value = unique[0];
        storageManagerState.bucket = unique[0];
    }

    syncStorageBucketCustomDropdown();
    updateStoragePathLabel();
}

function syncStorageBucketCustomDropdown() {
    const select = document.getElementById('storage-bucket-select');
    const wrapper = document.getElementById('storage-bucket-custom');
    const menu = document.getElementById('storage-bucket-menu');
    const label = document.getElementById('storage-bucket-selected-label');
    if (!select || !wrapper || !menu || !label) return;

    const selectedOption = select.options[select.selectedIndex];
    label.textContent = selectedOption ? selectedOption.textContent : 'Select bucket...';

    menu.innerHTML = '';
    Array.from(select.options).forEach((option) => {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'storage-select-option';
        if (option.value === select.value) optionBtn.classList.add('active');
        optionBtn.textContent = option.textContent || '';

        optionBtn.addEventListener('click', () => {
            select.value = option.value;
            select.dispatchEvent(new Event('change'));
            wrapper.classList.remove('open');
            wrapper.querySelector('.storage-select-trigger')?.setAttribute('aria-expanded', 'false');
        });

        menu.appendChild(optionBtn);
    });
}

function initStorageBucketCustomDropdown() {
    const wrapper = document.getElementById('storage-bucket-custom');
    const trigger = document.getElementById('storage-bucket-trigger');
    if (!wrapper || !trigger || wrapper.dataset.bound === 'true') return;

    wrapper.dataset.bound = 'true';
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.toggle('open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }
    });
}

window.loadStorageObjects = async function () {
    const tbody = document.querySelector('#storage-objects-table tbody');
    const bucketSelect = document.getElementById('storage-bucket-select');
    if (!tbody || !bucketSelect) return;

    const bucket = (bucketSelect.value || '').trim();
    storageManagerState.bucket = bucket;

    if (!bucket) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;">Select a bucket to load storage objects.</td></tr>';
        updateStoragePathLabel();
        return;
    }

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading storage objects...</td></tr>';
    updateStoragePathLabel();

    try {
        const { data, error } = await supabaseClient.storage
            .from(bucket)
            .list(storageManagerState.prefix, { limit: 200, sortBy: { column: 'name', order: 'asc' } });

        if (error) throw error;

        const objects = data || [];
        if (objects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#777;">No items found in this path.</td></tr>';
            return;
        }

        tbody.innerHTML = objects.map((item) => {
            const name = item?.name || '';
            const isFolder = !item?.metadata || !item?.metadata?.mimetype;
            const fullPath = storageManagerState.prefix ? `${storageManagerState.prefix}/${name}` : name;
            const encodedPath = encodeURIComponent(fullPath);
            const encodedName = encodeURIComponent(name);

            if (isFolder) {
                return `
                    <tr>
                        <td><i class="fas fa-folder" style="color:#f59e0b; margin-right:8px;"></i> ${escapeHtml(name)}</td>
                        <td>Folder</td>
                        <td>-</td>
                        <td>-</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-action view" onclick="openStorageFolder('${encodedName}')"><i class="fas fa-folder-open"></i> Open</button>
                            </div>
                        </td>
                    </tr>
                `;
            }

            const updatedAt = item.updated_at ? formatDateTime(item.updated_at) : '-';
            const size = formatBytes(item.metadata?.size || item.metadata?.contentLength || 0);
            return `
                <tr>
                    <td><i class="fas fa-file" style="color:#64748b; margin-right:8px;"></i> ${escapeHtml(name)}</td>
                    <td>${escapeHtml(item.metadata?.mimetype || 'File')}</td>
                    <td>${escapeHtml(size)}</td>
                    <td>${escapeHtml(updatedAt)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action view" onclick="openStorageFilePreview('${encodedPath}', '${encodedName}')"><i class="fas fa-eye"></i> View</button>
                            <button class="btn-action delete" onclick="openStorageDeleteModal('${encodedPath}')"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading storage objects:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#c62828;">Failed to load storage objects: ${escapeHtml(error.message || 'Unknown error')}</td></tr>`;
        Toast.show('error', 'Storage Load Failed', error.message || 'Could not load storage objects');
    }
};

window.openStorageFolder = function (encodedName) {
    const folderName = decodeURIComponent(encodedName || '').trim();
    if (!folderName) return;

    storageManagerState.prefix = storageManagerState.prefix
        ? `${storageManagerState.prefix}/${folderName}`
        : folderName;

    loadStorageObjects();
};

window.goUpStoragePath = function () {
    if (!storageManagerState.prefix) return;
    const parts = storageManagerState.prefix.split('/').filter(Boolean);
    parts.pop();
    storageManagerState.prefix = parts.join('/');
    loadStorageObjects();
};

function updateStoragePathLabel() {
    const pathEl = document.getElementById('storage-current-path');
    if (!pathEl) return;
    const bucket = storageManagerState.bucket || '(no bucket)';
    const prefix = storageManagerState.prefix ? `/${storageManagerState.prefix}` : '/';
    pathEl.textContent = `${bucket}${prefix}`;
}

window.uploadStorageFile = async function () {
    const fileInput = document.getElementById('storage-upload-file');
    const bucket = storageManagerState.bucket;
    const file = fileInput?.files?.[0];

    if (!bucket) {
        Toast.show('warning', 'Bucket Required', 'Please select a bucket first.');
        return;
    }
    if (!file) {
        Toast.show('warning', 'File Required', 'Please choose a file to upload.');
        return;
    }

    const targetPath = storageManagerState.prefix ? `${storageManagerState.prefix}/${file.name}` : file.name;

    try {
        const { error } = await supabaseClient.storage
            .from(bucket)
            .upload(targetPath, file, { upsert: false });

        if (error) throw error;

        Toast.show('success', 'Upload Complete', `${file.name} uploaded successfully.`);
        if (fileInput) {
            fileInput.value = '';
            updateStorageSelectedFileName();
        }
        await loadStorageObjects();
    } catch (error) {
        console.error('Upload failed:', error);
        Toast.show('error', 'Upload Failed', error.message || 'Could not upload file');
    }
};

window.openStorageFilePicker = function () {
    const fileInput = document.getElementById('storage-upload-file');
    if (fileInput) fileInput.click();
};

function updateStorageSelectedFileName() {
    const fileInput = document.getElementById('storage-upload-file');
    const fileNameEl = document.getElementById('storage-upload-file-name');
    if (!fileInput || !fileNameEl) return;

    const selectedName = fileInput.files && fileInput.files[0] ? fileInput.files[0].name : 'No file chosen';
    fileNameEl.textContent = selectedName;
}

window.openStorageFilePreview = function (encodedPath, encodedName) {
    const bucket = storageManagerState.bucket;
    const path = decodeURIComponent(encodedPath || '');
    const fileName = decodeURIComponent(encodedName || 'Preview');
    if (!bucket || !path) return;

    const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
    if (!data?.publicUrl) {
        Toast.show('warning', 'Preview Unavailable', 'Could not generate file preview URL.');
        return;
    }

    openVerticalImageViewModal(encodeURIComponent(data.publicUrl), encodeURIComponent(fileName));
};

window.openStorageDeleteModal = function (encodedPath) {
    const path = decodeURIComponent(encodedPath || '').trim();
    if (!path) return;

    storageManagerState.pendingDeletePath = path;
    const targetEl = document.getElementById('storage-delete-target');
    const modal = document.getElementById('storage-delete-modal');
    if (targetEl) targetEl.textContent = path;
    if (modal) modal.classList.remove('hidden');
};

window.closeStorageDeleteModal = function () {
    const modal = document.getElementById('storage-delete-modal');
    if (modal) modal.classList.add('hidden');
    storageManagerState.pendingDeletePath = '';
};

window.confirmStorageDelete = async function () {
    const bucket = storageManagerState.bucket;
    const path = storageManagerState.pendingDeletePath;
    const btn = document.getElementById('storage-delete-confirm-btn');
    const originalBtnText = btn ? btn.innerHTML : '';

    if (!bucket || !path) {
        closeStorageDeleteModal();
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    }

    try {
        const { error } = await supabaseClient.storage
            .from(bucket)
            .remove([path]);

        if (error) throw error;

        Toast.show('success', 'Deleted', 'Storage object deleted successfully.');
        closeStorageDeleteModal();
        await loadStorageObjects();
    } catch (error) {
        console.error('Delete storage object failed:', error);
        Toast.show('error', 'Delete Failed', error.message || 'Could not delete storage object');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    }
};

function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const scaled = value / (1024 ** index);
    return `${scaled.toFixed(scaled >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

// ===== CUSTOM DROPDOWN FOR MESSAGE STATUS FILTER =====
(function () {
    'use strict';

    function initCustomDropdown() {
        const select = document.getElementById('message-status-filter');
        if (!select) return;

        // Create custom dropdown structure
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-dropdown';

        const trigger = document.createElement('div');
        trigger.className = 'custom-dropdown-trigger';
        trigger.innerHTML = `
            <span class="custom-dropdown-text">${select.options[select.selectedIndex].text}</span>
            <i class="fas fa-chevron-down custom-dropdown-arrow"></i>
        `;

        const menu = document.createElement('div');
        menu.className = 'custom-dropdown-menu';

        // Create options
        Array.from(select.options).forEach((option, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'custom-dropdown-option';
            if (index === select.selectedIndex) {
                optionEl.classList.add('selected');
            }
            optionEl.textContent = option.text;
            optionEl.dataset.value = option.value;
            optionEl.dataset.index = index;

            optionEl.addEventListener('click', function () {
                // Update select
                select.selectedIndex = parseInt(this.dataset.index);
                select.dispatchEvent(new Event('change'));

                // Update UI
                trigger.querySelector('.custom-dropdown-text').textContent = this.textContent;
                menu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');

                // Close dropdown
                trigger.classList.remove('active');
                menu.classList.remove('active');
            });

            menu.appendChild(optionEl);
        });

        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);

        // Insert before the select
        select.parentNode.insertBefore(wrapper, select);

        // Toggle dropdown
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            const isActive = this.classList.contains('active');

            // Close all dropdowns
            document.querySelectorAll('.custom-dropdown-trigger.active').forEach(t => {
                t.classList.remove('active');
            });
            document.querySelectorAll('.custom-dropdown-menu.active').forEach(m => {
                m.classList.remove('active');
            });

            // Toggle this dropdown
            if (!isActive) {
                this.classList.add('active');
                menu.classList.add('active');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!wrapper.contains(e.target)) {
                trigger.classList.remove('active');
                menu.classList.remove('active');
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                trigger.classList.remove('active');
                menu.classList.remove('active');
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomDropdown);
    } else {
        initCustomDropdown();
    }
})();

// ===== EVENT MANAGEMENT SECTION =====

window.refreshEventsManagerData = async function () {
    await Promise.all([
        loadEvents(),
        loadEventUploaders(),
        loadEventPublications()
    ]);
};

// Load events from database
async function loadEvents() {
    try {
        const statusFilter = document.getElementById('event-status-filter').value;
        const displayFilter = document.getElementById('event-display-filter')?.value || 'all';

        // Use published_events view which already has mode and capacity
        let query = supabaseClient.from('published_events').select('*');

        // Apply status filter
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        // Apply event_publications display filter
        if (displayFilter === 'home') {
            query = query.eq('display_on_home', true);
        } else if (displayFilter === 'upcoming') {
            query = query.eq('display_on_upcoming', true);
        } else if (displayFilter === 'past') {
            query = query.eq('display_on_past', true);
        }

        const { data: events, error } = await query.order('start_at', { ascending: false });

        if (error) throw error;

        displayEventTable(events || []);
        updateEventStats(events || []);

        Toast.show('success', 'Events Loaded', `Loaded ${events?.length || 0} events`);
    } catch (error) {
        console.error('Error loading events:', error);
        Toast.show('error', 'Load Failed', error.message);
    }
}

async function loadEventUploaders() {
    const tbody = document.querySelector('#event-uploaders-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading uploaders...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('event_uploaders')
            .select('email, verified_at, total_uploads, last_upload_at, is_active')
            .order('verified_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#777;">No event uploaders found.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((row) => `
            <tr>
                <td>${escapeHtml(row.email || '-')}</td>
                <td>${row.verified_at ? formatDateTime(row.verified_at) : '-'}</td>
                <td><strong>${Number(row.total_uploads || 0)}</strong></td>
                <td>${row.last_upload_at ? formatDateTime(row.last_upload_at) : '-'}</td>
                <td><span class="badge ${row.is_active ? 'badge-success' : 'badge-warning'}">${row.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading event uploaders:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#c62828;">Failed to load uploaders: ${escapeHtml(error.message || 'Unknown error')}</td></tr>`;
    }
}

async function loadEventPublications() {
    const tbody = document.querySelector('#event-publications-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading publication controls...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('published_events')
            .select('id, title, status, display_on_home, display_on_upcoming, display_on_past')
            .order('start_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#777;">No publication rows found.</td></tr>';
            return;
        }

        const yesNo = (flag) => flag
            ? '<span class="badge badge-success">YES</span>'
            : '<span class="badge badge-warning">NO</span>';

        tbody.innerHTML = data.map((row) => `
            <tr>
                <td><strong>${escapeHtml(row.title || '-')}</strong></td>
                <td>${escapeHtml(row.status || '-')}</td>
                <td>${yesNo(!!row.display_on_home)}</td>
                <td>${yesNo(!!row.display_on_upcoming)}</td>
                <td>${yesNo(!!row.display_on_past)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading event publications:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#c62828;">Failed to load publication controls: ${escapeHtml(error.message || 'Unknown error')}</td></tr>`;
    }
}

// Display events in table
function displayEventTable(events) {
    const tbody = document.querySelector('#events-table tbody');

    if (!events || events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;"><i class="fas fa-calendar-times"></i> No events found</td></tr>';
        return;
    }

    tbody.innerHTML = events.map(event => {
        const startDate = new Date(event.start_at);
        const endDate = new Date(event.end_at);
        const status = getEventStatus(event.start_at, event.end_at, event.status);
        const mode = event.mode ? event.mode.charAt(0).toUpperCase() + event.mode.slice(1) : '-';
        const capacity = event.capacity || '∞';

        // Display settings text
        const displaySettings = [
            event.display_on_home ? 'Home' : null,
            event.display_on_upcoming ? 'Upcoming' : null,
            event.display_on_past ? 'Past' : null
        ].filter(Boolean).join(', ') || 'None';

        return `
            <tr>
                <td><strong>${escapeHtml(event.title)}</strong></td>
                <td>${formatDateTime(startDate)}<br><small>${formatDateTime(endDate)}</small></td>
                <td>${escapeHtml(event.location || 'N/A')}</td>
                <td><span class="status-badge ${status}">${status}</span></td>
                <td><span style="background:#f0f0f0; padding:4px 8px; border-radius:4px; font-weight:600;">${mode}</span></td>
                <td><span style="font-weight:600; font-size:15px;">${capacity}</span></td>
                <td><small style="color:#666;">${displaySettings}</small></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action edit" onclick="editEvent(${event.id})"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn-action delete" onclick="deleteEvent(${event.id})"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get event status
function getEventStatus(startAt, endAt, status) {
    const now = new Date();
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (status === 'cancelled') return 'cancelled';
    if (status === 'completed' || end < now) return 'completed';
    if (start <= now && now <= end) return 'ongoing';
    return 'upcoming';
}

// Update event statistics
function updateEventStats(events) {
    const now = new Date();
    const upcoming = events.filter(e => new Date(e.start_at) > now).length;
    const past = events.filter(e => new Date(e.end_at) < now).length;

    document.getElementById('total-events').textContent = events.length;
    document.getElementById('upcoming-events').textContent = upcoming;
    document.getElementById('past-events').textContent = past;
}

// Open new event modal
function openNewEventModal() {
    document.getElementById('event-id').value = '';
    document.getElementById('event-modal-title').textContent = 'Create New Event';

    // Clear form
    document.getElementById('event-title').value = '';
    document.getElementById('event-start').value = '';
    document.getElementById('event-end').value = '';
    document.getElementById('event-location').value = '';
    document.getElementById('event-description').value = '';
    document.getElementById('event-mode').value = '';
    document.getElementById('event-capacity').value = '';
    document.getElementById('event-banner').value = '';
    document.getElementById('event-status').value = 'scheduled';
    document.getElementById('event-category').value = '';
    document.getElementById('event-display-upcoming').checked = true;
    document.getElementById('event-display-past').checked = false;

    document.getElementById('event-modal').classList.remove('hidden');
}

// Edit event
async function editEvent(eventId) {
    try {
        const { data: event, error } = await supabaseClient
            .from('published_events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (error) throw error;

        document.getElementById('event-id').value = event.id;
        document.getElementById('event-modal-title').textContent = 'Edit Event';
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-start').value = event.start_at.substring(0, 16);
        document.getElementById('event-end').value = event.end_at.substring(0, 16);
        document.getElementById('event-location').value = event.location || '';
        document.getElementById('event-description').value = event.description || '';
        document.getElementById('event-mode').value = event.mode || '';
        document.getElementById('event-capacity').value = event.capacity || '';
        document.getElementById('event-banner').value = event.banner_url || '';
        document.getElementById('event-status').value = event.status || 'scheduled';
        document.getElementById('event-category').value = event.category_id || '';
        document.getElementById('event-display-upcoming').checked = event.display_on_upcoming || false;
        document.getElementById('event-display-home').checked = event.display_on_home || false;
        document.getElementById('event-display-past').checked = event.display_on_past || false;

        document.getElementById('event-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading event:', error);
        Toast.show('error', 'Load Failed', error.message);
    }
}

// Save event
async function saveEvent() {
    try {
        const eventId = document.getElementById('event-id').value;
        const eventData = {
            title: document.getElementById('event-title').value,
            start_at: document.getElementById('event-start').value,
            end_at: document.getElementById('event-end').value,
            location: document.getElementById('event-location').value,
            description: document.getElementById('event-description').value,
            banner_url: document.getElementById('event-banner').value,
            status: document.getElementById('event-status').value,
            updated_at: new Date().toISOString()
        };

        const publicationData = {
            mode: document.getElementById('event-mode').value,
            capacity: parseInt(document.getElementById('event-capacity').value) || null,
            display_on_upcoming: document.getElementById('event-display-upcoming').checked,
            display_on_home: document.getElementById('event-display-home').checked,
            display_on_past: document.getElementById('event-display-past').checked,
            updated_at: new Date().toISOString()
        };

        // Validation
        if (!eventData.title || !eventData.start_at || !eventData.end_at || !eventData.location) {
            Toast.show('error', 'Validation Error', 'Please fill in all required fields');
            return;
        }

        // Home section only shows active statuses; prevent misleading selection.
        if (publicationData.display_on_home && ['cancelled', 'completed'].includes(String(eventData.status || '').toLowerCase())) {
            publicationData.display_on_home = false;
            const homeCheckbox = document.getElementById('event-display-home');
            if (homeCheckbox) homeCheckbox.checked = false;
            Toast.show('warning', 'Home Visibility Updated', 'Home display was disabled because the event is cancelled or completed.');
        }

        // UI rule: Past display is only valid after event end time has passed.
        const endAt = new Date(eventData.end_at);
        const now = new Date();
        if (publicationData.display_on_past && endAt > now) {
            publicationData.display_on_past = false;
            if (!publicationData.display_on_upcoming) {
                publicationData.display_on_upcoming = true;
            }

            const pastCheckbox = document.getElementById('event-display-past');
            const upcomingCheckbox = document.getElementById('event-display-upcoming');
            if (pastCheckbox) pastCheckbox.checked = false;
            if (upcomingCheckbox) upcomingCheckbox.checked = publicationData.display_on_upcoming;

            Toast.show('warning', 'Invalid Selection', 'Past event not selected because end date has not passed yet.');
        }

        let result;
        if (eventId) {
            // Update existing event
            result = await supabaseClient
                .from('events')
                .update(eventData)
                .eq('id', eventId);

            if (result.error) throw result.error;

            // Update event publication
            const pubResult = await supabaseClient
                .from('event_publications')
                .update(publicationData)
                .eq('event_id', eventId);

            if (pubResult.error) throw pubResult.error;
        } else {
            // Create new event
            const createResult = await supabaseClient
                .from('events')
                .insert([{
                    ...eventData,
                    created_at: new Date().toISOString()
                }])
                .select('id')
                .single();

            if (createResult.error) throw createResult.error;

            const newEventId = createResult.data.id;

            // Create event publication
            const pubResult = await supabaseClient
                .from('event_publications')
                .insert([{
                    event_id: newEventId,
                    ...publicationData,
                    created_at: new Date().toISOString()
                }]);

            if (pubResult.error) throw pubResult.error;
        }

        Toast.show('success', 'Success', eventId ? 'Event updated successfully' : 'Event created successfully');
        closeEventModal();
        refreshEventsManagerData();
    } catch (error) {
        console.error('Error saving event:', error);
        Toast.show('error', 'Save Failed', error.message);
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
        const { error } = await supabaseClient
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) throw error;

        Toast.show('success', 'Deleted', 'Event deleted successfully');
        refreshEventsManagerData();
    } catch (error) {
        console.error('Error deleting event:', error);
        Toast.show('error', 'Delete Failed', error.message);
    }
}

// Close modals
function closeEventModal() {
    document.getElementById('event-modal').classList.add('hidden');
}

function closeRegistrationModal() {
    document.getElementById('registration-modal').classList.add('hidden');
}

// Helper functions
function formatDateTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function () {
    const eventStatusFilter = document.getElementById('event-status-filter');
    if (eventStatusFilter) {
        eventStatusFilter.addEventListener('change', loadEvents);
    }

    const eventDisplayFilter = document.getElementById('event-display-filter');
    if (eventDisplayFilter) {
        eventDisplayFilter.addEventListener('change', loadEvents);
    }

    const eventPastCheckbox = document.getElementById('event-display-past');
    const eventUpcomingCheckbox = document.getElementById('event-display-upcoming');
    const eventEndInput = document.getElementById('event-end');

    const enforcePastDateRule = () => {
        if (!eventPastCheckbox || !eventEndInput) return;
        if (!eventPastCheckbox.checked) return;

        const endValue = eventEndInput.value;
        if (!endValue) return;

        const endAt = new Date(endValue);
        const now = new Date();
        if (endAt > now) {
            eventPastCheckbox.checked = false;
            if (eventUpcomingCheckbox && !eventUpcomingCheckbox.checked) {
                eventUpcomingCheckbox.checked = true;
            }
            Toast.show('warning', 'Invalid Selection', 'Past event not selected because end date has not passed yet.');
        }
    };

    if (eventPastCheckbox) {
        eventPastCheckbox.addEventListener('change', enforcePastDateRule);
    }
    if (eventEndInput) {
        eventEndInput.addEventListener('change', enforcePastDateRule);
    }

    const registrationSearch = document.getElementById('registration-search');
    if (registrationSearch) {
        registrationSearch.addEventListener('keyup', debounce(function () {
            loadRegistrations();
        }, 500));
    }

    const verticalImageFilter = document.getElementById('vertical-image-filter');
    if (verticalImageFilter) {
        verticalImageFilter.addEventListener('change', loadVerticalImages);
    }

    const collegeSearch = document.getElementById('college-search');
    if (collegeSearch) {
        collegeSearch.addEventListener('input', debounce(() => {
            renderCollegesTable();
        }, 180));
    }

    const collegeZoneFilter = document.getElementById('college-zone-filter');
    if (collegeZoneFilter) {
        collegeZoneFilter.addEventListener('change', () => {
            renderCollegesTable();
        });
    }

    const storageBucketSelect = document.getElementById('storage-bucket-select');
    if (storageBucketSelect) {
        storageBucketSelect.addEventListener('change', () => {
            storageManagerState.bucket = storageBucketSelect.value || '';
            storageManagerState.prefix = '';
            syncStorageBucketCustomDropdown();
            loadStorageObjects();
        });
    }

    const storageFileInput = document.getElementById('storage-upload-file');
    if (storageFileInput) {
        storageFileInput.addEventListener('change', updateStorageSelectedFileName);
        updateStorageSelectedFileName();
    }

    initStorageBucketCustomDropdown();
});

// Debounce helper
function debounce(func, wait) {
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

// ===== COUNTER ADMIN FUNCTIONALITY =====

// GAS middleware URL - same as home page uses
const COUNTER_GAS_URL = window.YUVA_GAS_COUNTER_URL || 'https://script.google.com/macros/s/AKfycbwwx6hQ4rdoSGlKkKE3l1a1nfbQJNoJBXg0xkK662IWoYWQCo_KB1GIHigX6Fcd-j38fA/exec';
let counterAutoRefreshInterval = null;

function getCounterVisitorId() {
    const key = 'yuva_admin_counter_visitor_id';
    let visitorId = localStorage.getItem(key);

    if (!visitorId) {
        visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(key, visitorId);
    }

    return visitorId;
}

function getCounterSessionToken() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12);
}

async function counterTextRequest(payload) {
    const response = await fetch(COUNTER_GAS_URL, {
        method: 'POST',
        headers: {
            // Keep request simple (same pattern as home page live counter)
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        return { success: false, message: `HTTP ${response.status}` };
    }

    const rawText = (await response.text() || '').trim();
    if (!rawText) {
        return { success: false, message: 'Empty response from counter service' };
    }

    const normalizeCounterResult = (value) => {
        if (value && typeof value === 'object') {
            // Already in expected format: { success, data: { refreshCount, uniqueCount } }
            if (value.success === true && value.data) {
                return value;
            }

            // Alternate object format: { refreshCount, uniqueCount }
            if (value.refreshCount !== undefined || value.uniqueCount !== undefined) {
                return {
                    success: true,
                    data: {
                        refreshCount: Number(value.refreshCount || 0),
                        uniqueCount: Number(value.uniqueCount || 0)
                    }
                };
            }

            // Nested alternate format: { data: { refreshCount, uniqueCount } }
            if (value.data && (value.data.refreshCount !== undefined || value.data.uniqueCount !== undefined)) {
                return {
                    success: true,
                    data: {
                        refreshCount: Number(value.data.refreshCount || 0),
                        uniqueCount: Number(value.data.uniqueCount || 0)
                    }
                };
            }
        }

        if (typeof value === 'string') {
            // Plain-text format: "123|45" or "123,45"
            const pairMatch = value.match(/^\s*(\d+)\s*[|,]\s*(\d+)\s*$/);
            if (pairMatch) {
                return {
                    success: true,
                    data: {
                        refreshCount: Number(pairMatch[1]),
                        uniqueCount: Number(pairMatch[2])
                    }
                };
            }

            // Named plain-text format: "refresh=123 unique=45"
            const refreshMatch = value.match(/refresh(?:count)?\s*[:=]\s*(\d+)/i);
            const uniqueMatch = value.match(/unique(?:count|visitors?)?\s*[:=]\s*(\d+)/i);
            if (refreshMatch || uniqueMatch) {
                return {
                    success: true,
                    data: {
                        refreshCount: refreshMatch ? Number(refreshMatch[1]) : 0,
                        uniqueCount: uniqueMatch ? Number(uniqueMatch[1]) : 0
                    }
                };
            }
        }

        return { success: false, message: 'Unsupported response format from counter service' };
    };

    try {
        const parsed = JSON.parse(rawText);
        return normalizeCounterResult(parsed);
    } catch (_) {
        return normalizeCounterResult(rawText);
    }
}

window.loadCounterData = async function () {
    try {
        // Stop any existing auto-refresh
        if (counterAutoRefreshInterval) {
            clearInterval(counterAutoRefreshInterval);
        }

        // Load initial data
        await fetchCounterValues();

        // Set up auto-refresh every 5 seconds
        counterAutoRefreshInterval = setInterval(() => {
            fetchCounterValues();
        }, 5000);
    } catch (error) {
        console.error('Error loading counter data:', error);
        Toast.show('error', 'Load Failed', 'Could not load counter data');
    }
};

window.fetchCounterValues = async function () {
    try {
        if (!COUNTER_GAS_URL || COUNTER_GAS_URL.includes('YOUR_GAS')) {
            const refreshDisplay = document.getElementById('counter-refresh-display');
            const uniqueDisplay = document.getElementById('counter-unique-display');
            const refreshInput = document.getElementById('counter-refresh-input');
            const uniqueInput = document.getElementById('counter-unique-input');

            if (refreshDisplay) refreshDisplay.textContent = 'N/A';
            if (uniqueDisplay) uniqueDisplay.textContent = 'N/A';
            if (refreshInput) refreshInput.value = 'GAS URL not configured';
            if (uniqueInput) uniqueInput.value = 'GAS URL not configured';

            Toast.show('warning', 'Configuration Required', 'GAS URL not configured. Please set up Google Apps Script middleware.');
            return;
        }

        const result = await counterTextRequest({
            action: 'getCounters',
            visitorId: getCounterVisitorId(),
            sessionToken: getCounterSessionToken()
        });

        if (result && result.success && result.data) {
            const refreshCount = result.data.refreshCount || 0;
            const uniqueCount = result.data.uniqueCount || 0;

            // Update displays
            const refreshDisplay = document.getElementById('counter-refresh-display');
            const uniqueDisplay = document.getElementById('counter-unique-display');
            const refreshInput = document.getElementById('counter-refresh-input');
            const uniqueInput = document.getElementById('counter-unique-input');

            if (refreshDisplay) {
                refreshDisplay.textContent = formatNumberIndian(refreshCount);
            }
            if (uniqueDisplay) {
                uniqueDisplay.textContent = formatNumberIndian(uniqueCount);
            }
            if (refreshInput) {
                refreshInput.value = refreshCount;
            }
            if (uniqueInput) {
                uniqueInput.value = uniqueCount;
            }
        } else if (result && !result.success) {
            console.warn('Counter data not available:', result.message || result.error || result);
            const refreshDisplay = document.getElementById('counter-refresh-display');
            const uniqueDisplay = document.getElementById('counter-unique-display');
            if (refreshDisplay) refreshDisplay.textContent = 'Error';
            if (uniqueDisplay) uniqueDisplay.textContent = 'Error';
        }
    } catch (error) {
        console.error('Error fetching counter values:', error);
        Toast.show('error', 'Counter Error', 'Failed to load counter data. Please verify GAS deployment settings.');

        // Show fallback values
        const refreshDisplay = document.getElementById('counter-refresh-display');
        const uniqueDisplay = document.getElementById('counter-unique-display');
        if (refreshDisplay) refreshDisplay.textContent = 'N/A';
        if (uniqueDisplay) uniqueDisplay.textContent = 'N/A';
    }
};

window.openCounterResetModal = function () {
    const modal = document.getElementById('counter-reset-modal');
    const adminKeyInput = document.getElementById('counter-admin-key');

    if (modal) {
        modal.classList.remove('hidden');
        if (adminKeyInput) {
            adminKeyInput.value = '';
            adminKeyInput.focus();
        }
    }
};

window.closeCounterResetModal = function () {
    const modal = document.getElementById('counter-reset-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.confirmCounterReset = async function () {
    const adminKeyInput = document.getElementById('counter-admin-key');
    const adminKey = adminKeyInput ? adminKeyInput.value.trim() : '';

    if (!adminKey) {
        Toast.show('warning', 'Required Field', 'Please enter admin key');
        return;
    }

    try {
        if (!COUNTER_GAS_URL || COUNTER_GAS_URL.includes('YOUR_GAS')) {
            Toast.show('error', 'Configuration Error', 'GAS URL not configured');
            return;
        }

        const result = await counterTextRequest({
            action: 'reset',
            visitorId: getCounterVisitorId(),
            sessionToken: getCounterSessionToken(),
            adminKey: adminKey
        });

        if (result && result.success) {
            Toast.show('success', 'Success', 'Counters have been reset to 0');
            closeCounterResetModal();
            // Refresh the display
            await fetchCounterValues();
        } else {
            Toast.show('error', 'Reset Failed', (result && result.message) || 'Could not reset counters');
        }
    } catch (error) {
        console.error('Error resetting counters:', error);
        Toast.show('error', 'Error', 'Failed to reset counters: ' + error.message);
    }
};

// ============================================================================
// VIMARSH CERTIFICATES MODULE
// ============================================================================

const VIMARSH_CERT_TABLE = 'vim_cert_vimarsh_certificates';
// Generic table name - works for all years (2025, 2026, etc.)
const VIMARSH_CERT_DIRECTOR_NAME = 'Dr. Kavindra Taliyan';
const VIMARSH_CERT_COORDINATOR_NAME = 'Dr. Meenu Rani';
const VIMARSH_EVENT_YEAR = 2026;
// Update only these two paths if you want to change certificate logos.
const VIMARSH_CERT_YUVA_LOGO_SRC = '/Images/YUVA logo.png';
const VIMARSH_CERT_VIMARSH_LOGO_SRC = '/Images/Vimarsh2025_logo.jpg';
const EVENT_START_DATE = '2026-01-10';
const EVENT_END_DATE = '2026-01-12';
const VIMARSH_REG_TABLE = 'vim26_registrations';
const PAID_PAYMENT_STATUSES = ['completed', 'paid', 'success', 'captured'];
const VIMARSH_CERT_BATCH_TABLE = 'vim_cert_batch_generation';
const ADV_TENURE_CERT_TABLE = 'yuva_tenure_certificates';
const UNIT_REGISTRATION_TABLE = 'registrations';
const VIMARSH_CERTIFICATE_FINDER_URL = window.VIMARSH_CERTIFICATE_FINDER_URL || 'https://yuva.ind.in/Our.Initiative/Vimarsh/certificate-finder.html';
const VIMARSH_CERT_EMAIL_GAS_URL = window.VIMARSH_CERT_EMAIL_GAS_URL || window.YUVA_GAS_COUNTER_URL || COUNTER_GAS_URL || (typeof GAS_WEB_APP_URL !== 'undefined' ? GAS_WEB_APP_URL : '');

let certificatesData = [];
let filteredCertificates = [];
let tenureMembersData = [];
let filteredTenureMembers = [];

async function getCurrentAdminUserId() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user?.id) return session.user.id;
    } catch (error) {
        console.warn('Could not read Supabase session for logging:', error);
    }

    try {
        const localSession = localStorage.getItem('yuva_user');
        if (!localSession) return null;

        let parsed = JSON.parse(localSession);
        if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
        }

        return parsed?.id || parsed?.user?.id || null;
    } catch (error) {
        console.warn('Could not parse local session for logging:', error);
        return null;
    }
}

async function logCertificateBatchGeneration({
    adminUserId,
    totalCount,
    successCount,
    failedCount,
    status,
    includeNonAttended,
    note
}) {
    if (!adminUserId) return;

    const payload = {
        batch_name: `Vimarsh-${VIMARSH_EVENT_YEAR}-${new Date().toISOString()}`,
        total_count: Number(totalCount || 0),
        success_count: Number(successCount || 0),
        failed_count: Number(failedCount || 0),
        status,
        filters: {
            include_non_attended: Boolean(includeNonAttended),
            event_year: VIMARSH_EVENT_YEAR
        },
        error_log: note ? [{ note, timestamp: new Date().toISOString() }] : [],
        completed_at: new Date().toISOString(),
        created_by: adminUserId
    };

    const { error } = await supabaseClient
        .from(VIMARSH_CERT_BATCH_TABLE)
        .insert([payload]);

    if (error) {
        console.warn('Batch logging skipped due to table/schema mismatch:', error);
    }
}

// Load all certificates
window.loadCertificates = async function () {
    try {
        // Fetch certificates from Supabase
        const { data, error } = await supabaseClient
            .from(VIMARSH_CERT_TABLE)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        certificatesData = data || [];
        filteredCertificates = [...certificatesData];

        // Update stats
        updateCertificateStats();

        // Populate filters
        await populateCertificateFilters();

        // Display certificates
        displayCertificates(filteredCertificates);

        Toast.show('success', 'Success', `Loaded ${certificatesData.length} certificates`);
    } catch (error) {
        console.error('Error loading certificates:', error);
        Toast.show('error', 'Load Error', 'Failed to load certificates');
    }
};

// Update certificate statistics
function updateCertificateStats() {
    const totalEl = document.getElementById('cert-total');
    const issuedEl = document.getElementById('cert-issued');
    const downloadedEl = document.getElementById('cert-downloaded');
    const revokedEl = document.getElementById('cert-revoked');

    if (totalEl) totalEl.textContent = certificatesData.length;
    if (issuedEl) issuedEl.textContent = certificatesData.filter(c => c.status === 'issued').length;
    if (downloadedEl) downloadedEl.textContent = certificatesData.filter(c => c.downloaded === true).length;
    if (revokedEl) revokedEl.textContent = certificatesData.filter(c => c.status === 'revoked').length;
}

// Populate filter dropdowns
async function populateCertificateFilters() {
    const collegeFilter = document.getElementById('cert-college-filter');
    if (!collegeFilter) return;

    // Reset options first to prevent duplicates after repeated reloads.
    collegeFilter.innerHTML = '<option value="">All Colleges</option>';

    // Build unique college list using normalized keys (trim + lowercase).
    const collegeMap = new Map();
    certificatesData.forEach(cert => {
        const rawCollege = String(cert.college_name || '').trim();
        if (!rawCollege) return;

        const key = rawCollege.toLowerCase();
        if (!collegeMap.has(key)) {
            collegeMap.set(key, rawCollege);
        }
    });

    const colleges = Array.from(collegeMap.values()).sort((a, b) => a.localeCompare(b));

    colleges.forEach(college => {
        const option = document.createElement('option');
        option.value = college;
        option.textContent = college;
        collegeFilter.appendChild(option);
    });

    // Keep custom dropdown UI synced with updated select options.
    initCertificateFilterCustomDropdowns();
}

function initCustomDropdownForSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select || !select.parentNode) return;

    const parent = select.parentNode;
    let wrapper = parent.querySelector(`.custom-dropdown[data-select-id="${selectId}"]`);
    let trigger;
    let menu;

    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'custom-dropdown custom-dropdown-filter';
        wrapper.dataset.selectId = selectId;

        trigger = document.createElement('div');
        trigger.className = 'custom-dropdown-trigger';
        trigger.innerHTML = `
            <span class="custom-dropdown-text"></span>
            <i class="fas fa-chevron-down custom-dropdown-arrow"></i>
        `;

        menu = document.createElement('div');
        menu.className = 'custom-dropdown-menu';

        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);
        parent.insertBefore(wrapper, select);

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            const isActive = trigger.classList.contains('active');

            document.querySelectorAll('.custom-dropdown-trigger.active').forEach(t => {
                t.classList.remove('active');
            });
            document.querySelectorAll('.custom-dropdown-menu.active').forEach(m => {
                m.classList.remove('active');
            });

            if (!isActive) {
                trigger.classList.add('active');
                menu.classList.add('active');
            }
        });

        select.classList.add('custom-select-hidden');
    } else {
        trigger = wrapper.querySelector('.custom-dropdown-trigger');
        menu = wrapper.querySelector('.custom-dropdown-menu');
        menu.innerHTML = '';
    }

    const selectedOption = select.options[select.selectedIndex] || select.options[0];
    const triggerText = trigger.querySelector('.custom-dropdown-text');
    if (triggerText) {
        triggerText.textContent = selectedOption ? selectedOption.text : 'Select';
    }

    Array.from(select.options).forEach((option, index) => {
        const optionEl = document.createElement('div');
        optionEl.className = 'custom-dropdown-option';
        if (index === select.selectedIndex) {
            optionEl.classList.add('selected');
        }

        optionEl.textContent = option.text;
        optionEl.dataset.index = String(index);

        optionEl.addEventListener('click', function () {
            select.selectedIndex = parseInt(this.dataset.index, 10);
            select.dispatchEvent(new Event('change'));

            const localTriggerText = trigger.querySelector('.custom-dropdown-text');
            if (localTriggerText) {
                localTriggerText.textContent = this.textContent;
            }

            menu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');

            trigger.classList.remove('active');
            menu.classList.remove('active');
        });

        menu.appendChild(optionEl);
    });
}

function initCertificateFilterCustomDropdowns() {
    ['cert-college-filter', 'cert-status-filter', 'cert-downloaded-filter', 'tenure-college-filter', 'tenure-status-filter'].forEach(initCustomDropdownForSelect);
}

function generateTenureCertificateId() {
    const year = new Date().getFullYear();
    const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    const suffix = (seed + '000000').slice(0, 6);
    return `TN-${year}-${suffix}`;
}

function getTenureStatusLabel(status) {
    const normalized = String(status || 'pending').toLowerCase();
    if (normalized === 'completed') return 'Completed';
    if (normalized === 'issued') return 'Issued';
    if (normalized === 'revoked') return 'Revoked';
    return 'Pending';
}

function toDisplayDate(value) {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
}

function getCurrentAdminRole() {
    try {
        if (window.authManager?.currentUser?.role) {
            return String(window.authManager.currentUser.role).toLowerCase();
        }

        const localSession = localStorage.getItem('yuva_user');
        if (!localSession) return '';

        let parsed = JSON.parse(localSession);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        return String(parsed?.role || parsed?.user?.role || '').toLowerCase();
    } catch (_) {
        return '';
    }
}

function calculateTenureCompletionDate(approvalDate) {
    if (!approvalDate) return null;
    const start = new Date(approvalDate);
    if (Number.isNaN(start.getTime())) return null;
    const completionDate = new Date(start);
    completionDate.setFullYear(completionDate.getFullYear() + 1);
    return completionDate;
}

async function fetchApprovedMembersForTenure() {
    // Preferred query: uses dedicated approved_at for accurate tenure start.
    const withApprovedAt = await supabaseClient
        .from(UNIT_REGISTRATION_TABLE)
        .select('id, applicant_name, email, applying_for, unit_name, academic_session, status, college_id, zone_id, created_at, updated_at, approved_at')
        .eq('status', 'approved')
        .order('applicant_name', { ascending: true });

    if (!withApprovedAt.error) {
        return withApprovedAt;
    }

    const errorMsg = String(withApprovedAt.error.message || '').toLowerCase();
    const approvedAtMissing = errorMsg.includes('approved_at') && (errorMsg.includes('column') || errorMsg.includes('does not exist'));

    if (!approvedAtMissing) {
        return withApprovedAt;
    }

    // Fallback for environments where approved_at migration is not yet applied.
    const fallback = await supabaseClient
        .from(UNIT_REGISTRATION_TABLE)
        .select('id, applicant_name, email, applying_for, unit_name, academic_session, status, college_id, zone_id, created_at, updated_at')
        .eq('status', 'approved')
        .order('applicant_name', { ascending: true });

    if (!fallback.error) {
        fallback.data = (fallback.data || []).map(row => ({ ...row, approved_at: null }));
    }

    return fallback;
}

async function resolveCollegeNameById(collegeId, fallbackName = '') {
    if (!collegeId) return fallbackName || '';

    try {
        const { data: collegeDetails } = await supabaseClient
            .from('college_details')
            .select('college_name')
            .eq('id', collegeId)
            .maybeSingle();

        if (collegeDetails?.college_name) return collegeDetails.college_name;
    } catch (_) {
        // Ignore and try legacy table.
    }

    try {
        const { data: legacyCollege } = await supabaseClient
            .from('colleges')
            .select('college_name')
            .eq('id', collegeId)
            .maybeSingle();

        if (legacyCollege?.college_name) return legacyCollege.college_name;
    } catch (_) {
        // Ignore and use fallback.
    }

    return fallbackName || '';
}

window.loadTenureCertificates = async function () {
    try {
        const [membersResult, collegesResult, legacyCollegesResult, tenureResult] = await Promise.all([
            fetchApprovedMembersForTenure(),
            supabaseClient
                .from('college_details')
                .select('id, college_name'),
            supabaseClient
                .from('colleges')
                .select('id, college_name'),
            supabaseClient
                .from(ADV_TENURE_CERT_TABLE)
                .select('*')
        ]);

        if (membersResult.error) throw membersResult.error;
        if (collegesResult.error) throw collegesResult.error;

        let tenureRows = [];
        if (tenureResult.error) {
            const errorMessage = String(tenureResult.error.message || '').toLowerCase();
            if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
                Toast.show('warning', 'Table Missing', 'Create table yuva_tenure_certificates to enable tenure issuance.');
            } else {
                throw tenureResult.error;
            }
        } else {
            tenureRows = tenureResult.data || [];
        }

        const collegeMap = new Map();
        (legacyCollegesResult.data || []).forEach(c => {
            if (!collegeMap.has(String(c.id)) && c.college_name) {
                collegeMap.set(String(c.id), c.college_name);
            }
        });
        (collegesResult.data || []).forEach(c => {
            if (c.college_name) {
                collegeMap.set(String(c.id), c.college_name);
            }
        });
        const tenureMap = new Map((tenureRows || []).map(r => [String(r.registration_id), r]));
        const now = new Date();

        tenureMembersData = (membersResult.data || []).map(member => {
            const tenure = tenureMap.get(String(member.id)) || {};
            const persistedStatus = String(tenure.status || 'pending').toLowerCase();
            const approvalDate = tenure.approval_date || member.approved_at || member.updated_at || member.created_at || null;
            const autoCompletionDate = calculateTenureCompletionDate(approvalDate);
            const isAutoCompleted = autoCompletionDate ? now >= autoCompletionDate : false;

            let status = 'pending';
            if (persistedStatus === 'issued') {
                status = 'issued';
            } else if (persistedStatus === 'revoked') {
                status = 'revoked';
            } else if (persistedStatus === 'completed' || isAutoCompleted) {
                status = 'completed';
            }

            return {
                registration_id: member.id,
                member_name: member.applicant_name || 'N/A',
                email: member.email || '',
                role: member.applying_for || 'Member',
                unit_name: member.unit_name || '',
                academic_session: member.academic_session || '',
                college_id: member.college_id,
                college_name: tenure.college_name || collegeMap.get(String(member.college_id)) || 'Unknown College',
                zone_id: member.zone_id,
                status,
                certificate_id: tenure.certificate_id || '',
                approval_date: approvalDate,
                tenure_completed_at: tenure.tenure_completed_at || (isAutoCompleted ? autoCompletionDate?.toISOString() : null),
                tenure_due_at: autoCompletionDate ? autoCompletionDate.toISOString() : null,
                issued_at: tenure.issued_at || null,
                revoked_at: tenure.revoked_at || null
            };
        });

        filteredTenureMembers = [...tenureMembersData];
        updateTenureStats();
        populateTenureFilters();
        displayTenureCertificates(filteredTenureMembers);
    } catch (error) {
        console.error('Error loading tenure certificates:', error);
        Toast.show('error', 'Load Error', 'Failed to load tenure certificate data');
    }
};

function updateTenureStats() {
    const totalEl = document.getElementById('tenure-total');
    const completedEl = document.getElementById('tenure-completed');
    const issuedEl = document.getElementById('tenure-issued');
    const revokedEl = document.getElementById('tenure-revoked');

    if (totalEl) totalEl.textContent = String(tenureMembersData.length);
    if (completedEl) completedEl.textContent = String(tenureMembersData.filter(m => m.status === 'completed').length);
    if (issuedEl) issuedEl.textContent = String(tenureMembersData.filter(m => m.status === 'issued').length);
    if (revokedEl) revokedEl.textContent = String(tenureMembersData.filter(m => m.status === 'revoked').length);
}

function populateTenureFilters() {
    const collegeFilter = document.getElementById('tenure-college-filter');
    if (!collegeFilter) return;

    collegeFilter.innerHTML = '<option value="">All Colleges</option>';
    const colleges = [...new Set(tenureMembersData.map(m => m.college_name).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    colleges.forEach(college => {
        const option = document.createElement('option');
        option.value = college;
        option.textContent = college;
        collegeFilter.appendChild(option);
    });

    initCertificateFilterCustomDropdowns();
}

window.filterTenureCertificates = function () {
    const searchTerm = (document.getElementById('tenure-search')?.value || '').toLowerCase();
    const collegeFilter = document.getElementById('tenure-college-filter')?.value || '';
    const statusFilter = document.getElementById('tenure-status-filter')?.value || '';

    filteredTenureMembers = tenureMembersData.filter(member => {
        const matchesSearch = !searchTerm ||
            String(member.member_name || '').toLowerCase().includes(searchTerm) ||
            String(member.email || '').toLowerCase().includes(searchTerm);

        const matchesCollege = !collegeFilter || member.college_name === collegeFilter;
        const matchesStatus = !statusFilter || member.status === statusFilter;

        return matchesSearch && matchesCollege && matchesStatus;
    });

    displayTenureCertificates(filteredTenureMembers);
};

function displayTenureCertificates(rows) {
    const tbody = document.querySelector('#tenure-certificates-table tbody');
    if (!tbody) return;
    const isSuperAdmin = getCurrentAdminRole() === 'super_admin';

    if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px;">No tenure members found</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map(member => {
        const canIssue = member.status === 'completed' || member.status === 'pending' || (member.status === 'revoked' && isSuperAdmin);
        const canRevoke = member.status === 'issued';
        const issueTitle = member.status === 'revoked'
            ? 'Re-Issue (Super Admin Only)'
            : (member.status === 'completed' ? 'Issue Certificate' : 'Issue Early (Super Admin Only)');

        return `
            <tr>
                <td>${member.registration_id}</td>
                <td>${member.member_name}</td>
                <td>${member.email || 'N/A'}</td>
                <td>${member.role || 'Member'}${member.unit_name ? `<br><small>${member.unit_name}</small>` : ''}</td>
                <td>${member.college_name || 'N/A'}</td>
                <td>${member.academic_session || 'N/A'}</td>
                <td>
                    <span class="certificate-status-badge ${member.status}">${getTenureStatusLabel(member.status)}</span>
                    ${member.status === 'pending' && member.tenure_due_at ? `<div class="tenure-due-text">Due: ${toDisplayDate(member.tenure_due_at)}</div>` : ''}
                </td>
                <td>${member.certificate_id || 'Not Issued'}</td>
                <td>${toDisplayDate(member.issued_at)}</td>
                <td>
                    <div class="tenure-action-group">
                        <button class="tenure-action-btn issue" title="${issueTitle}" onclick="issueTenureCertificate('${member.registration_id}')" ${canIssue ? '' : 'disabled'}>
                            Issue
                        </button>
                        <button class="tenure-action-btn revoke" title="Revoke Certificate" onclick="revokeTenureCertificate('${member.registration_id}')" ${canRevoke ? '' : 'disabled'}>
                            Revoke
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.issueTenureCertificate = async function (registrationId) {
    const member = tenureMembersData.find(m => String(m.registration_id) === String(registrationId));
    if (!member) return;

    const role = getCurrentAdminRole();
    const isSuperAdmin = role === 'super_admin';
    const isCompleted = member.status === 'completed';
    const isRevoked = member.status === 'revoked';

    if (isRevoked && !isSuperAdmin) {
        Toast.show('warning', 'Restricted', 'Only Super Admin can re-issue a revoked certificate.');
        return;
    }

    if (isRevoked && isSuperAdmin) {
        const reissueConfirmed = await CustomDialog.confirm(
            `Certificate for ${member.member_name} is revoked.\n\nRe-issue this certificate now?`,
            'Re-Issue Revoked Certificate',
            'Re-Issue',
            'Cancel'
        );

        if (!reissueConfirmed) return;
    }

    if (!isCompleted && !isRevoked && !isSuperAdmin) {
        Toast.show('warning', 'Not Eligible', 'One-year tenure is not completed yet. Only Super Admin can issue early.');
        return;
    }

    if (!isCompleted && !isRevoked && isSuperAdmin) {
        const earlyConfirmed = await CustomDialog.confirm(
            `Tenure year is not complete for ${member.member_name}.\n\nIssue certificate early as Super Admin override?`,
            'Early Issue Override',
            'Issue Early',
            'Cancel'
        );

        if (!earlyConfirmed) return;
    }

    const confirmed = await CustomDialog.confirm(
        `Issue tenure certificate for ${member.member_name}?`,
        'Issue Tenure Certificate',
        'Issue',
        'Cancel'
    );

    if (!confirmed) return;

    try {
        const resolvedCollegeName = await resolveCollegeNameById(member.college_id, member.college_name);

        const payload = {
            registration_id: member.registration_id,
            member_name: member.member_name,
            email: member.email,
            college_id: member.college_id,
            college_name: resolvedCollegeName || member.college_name || 'N/A',
            zone_id: member.zone_id,
            role: member.role,
            academic_session: member.academic_session,
            approval_date: member.approval_date,
            status: 'issued',
            certificate_id: member.certificate_id || generateTenureCertificateId(),
            tenure_completed_at: member.tenure_completed_at,
            issued_at: new Date().toISOString(),
            revoked_at: null,
            revoke_reason: null,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from(ADV_TENURE_CERT_TABLE)
            .upsert(payload, { onConflict: 'registration_id' });

        if (error) throw error;

        Toast.show('success', 'Issued', 'Tenure certificate issued successfully.');
        await loadTenureCertificates();
    } catch (error) {
        console.error('Error issuing tenure certificate:', error);
        Toast.show('error', 'Issue Failed', error.message || 'Could not issue tenure certificate');
    }
};

window.revokeTenureCertificate = async function (registrationId) {
    const member = tenureMembersData.find(m => String(m.registration_id) === String(registrationId));
    if (!member) return;

    if (member.status !== 'issued') {
        Toast.show('warning', 'Invalid Status', 'Only issued certificates can be revoked.');
        return;
    }

    const reason = await CustomDialog.prompt(
        `Revoke certificate for ${member.member_name}?\n\nEnter reason:`,
        'Revoke Tenure Certificate',
        'Reason'
    );

    if (!reason || !reason.trim()) return;

    try {
        const { error } = await supabaseClient
            .from(ADV_TENURE_CERT_TABLE)
            .update({
                status: 'revoked',
                revoke_reason: reason.trim(),
                revoked_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('registration_id', registrationId);

        if (error) throw error;

        Toast.show('success', 'Revoked', 'Tenure certificate revoked.');
        await loadTenureCertificates();
    } catch (error) {
        console.error('Error revoking tenure certificate:', error);
        Toast.show('error', 'Revoke Failed', error.message || 'Could not revoke certificate');
    }
};

// Filter certificates by criteria
window.filterCertificates = function () {
    const searchTerm = (document.getElementById('cert-search')?.value || '').toLowerCase();
    const collegeFilter = document.getElementById('cert-college-filter')?.value || '';
    const statusFilter = document.getElementById('cert-status-filter')?.value || '';
    const downloadedFilter = document.getElementById('cert-downloaded-filter')?.value || '';

    filteredCertificates = certificatesData.filter(cert => {
        // Search filter (name or email)
        const matchesSearch = !searchTerm ||
            cert.first_name.toLowerCase().includes(searchTerm) ||
            cert.last_name?.toLowerCase().includes(searchTerm) ||
            cert.email.toLowerCase().includes(searchTerm);

        // College filter
        const matchesCollege = !collegeFilter || cert.college_name === collegeFilter;

        // Status filter
        const matchesStatus = !statusFilter || cert.status === statusFilter;

        // Downloaded filter
        const matchesDownloaded = !downloadedFilter ||
            (downloadedFilter === 'yes' && cert.downloaded) ||
            (downloadedFilter === 'no' && !cert.downloaded);

        return matchesSearch && matchesCollege && matchesStatus && matchesDownloaded;
    });

    displayCertificates(filteredCertificates);
};

// Display certificates in table
function displayCertificates(certificates) {
    const tbody = document.querySelector('#certificates-table tbody');
    if (!tbody) return;

    if (certificates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:30px;">No certificates found</td></tr>';
        return;
    }

    tbody.innerHTML = certificates.map(cert => `
        <tr>
            <td><strong>${cert.certificate_id}</strong></td>
            <td>${cert.registration_id || 'N/A'}</td>
            <td>${cert.first_name} ${cert.last_name || ''}</td>
            <td>${cert.college_name}</td>
            <td>${cert.email}</td>
            <td>${cert.category}</td>
            <td>${cert.issued_date ? new Date(cert.issued_date).toLocaleDateString() : 'N/A'}</td>
            <td>
                <span class="certificate-status-badge ${cert.status}">
                    ${cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                </span>
            </td>
            <td>${cert.downloaded ? '<i class="fas fa-check" style="color:green;"></i> Yes' : 'No'}</td>
            <td>${cert.email_sent_at ? '<i class="fas fa-check" style="color:blue;"></i> Yes' : 'No'}</td>
            <td>
                <div class="cert-action-cell">
                    <button class="cert-action-icon-btn download" title="Download PDF" 
                            onclick="downloadCertificatePDF('${cert.id}')" 
                            ${cert.status !== 'issued' ? 'disabled' : ''}>
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="cert-action-icon-btn email" title="Send Email" 
                            onclick="sendIndividualCertificateEmail('${cert.id}')" 
                            ${cert.status !== 'issued' || cert.email_sent_at ? 'disabled' : ''}>
                        <i class="fas fa-envelope"></i>
                    </button>
                    ${cert.status === 'revoked'
            ? `<button class="cert-action-icon-btn reissue" title="Re-Issue Certificate" onclick="openReissueModal('${cert.id}')"><i class="fas fa-rotate-left"></i></button>`
            : `<button class="cert-action-icon-btn revoke" title="Revoke Certificate" onclick="openRevokeModal('${cert.id}')"><i class="fas fa-ban"></i></button>`}
                </div>
            </td>
        </tr>
    `).join('');
}

// View certificate modal
window.viewCertificateModal = function (certId) {
    const cert = certificatesData.find(c => c.id === certId);
    if (!cert) return;

    // For now, just show download option
    CustomDialog.alert(
        `Certificate: ${cert.certificate_id}\nParticipant: ${cert.first_name} ${cert.last_name || ''}`,
        'Certificate Details'
    );
};

async function loadExternalScript(url) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${url}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${url}`)), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
}

function getJsPdfConstructor() {
    return (window.jspdf && window.jspdf.jsPDF) || window.jsPDF || null;
}

async function ensurePdfLibraries() {
    if (window.html2canvas && getJsPdfConstructor()) return true;

    const html2canvasSources = [
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    ];

    const jsPdfSources = [
        'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
        'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    ];

    if (!window.html2canvas) {
        for (const src of html2canvasSources) {
            try {
                await loadExternalScript(src);
                if (window.html2canvas) break;
            } catch (_) {
                // Try next source.
            }
        }
    }

    if (!getJsPdfConstructor()) {
        for (const src of jsPdfSources) {
            try {
                await loadExternalScript(src);
                if (getJsPdfConstructor()) break;
            } catch (_) {
                // Try next source.
            }
        }
    }

    return Boolean(window.html2canvas && getJsPdfConstructor());
}

// Download certificate PDF
window.downloadCertificatePDF = async function (certId) {
    const cert = certificatesData.find(c => c.id === certId);
    if (!cert) {
        Toast.show('error', 'Error', 'Certificate not found');
        return;
    }

    let certElement = null;
    try {
        const libsReady = await ensurePdfLibraries();
        if (!libsReady) {
            Toast.show('error', 'Download Error', 'PDF libraries blocked by browser/network. Please allow CDN scripts and retry.');
            return;
        }

        // Create certificate HTML element
        certElement = generateCertificateHTML(cert);

        // Wait a moment for fonts/layout to settle before capturing
        await new Promise(resolve => setTimeout(resolve, 300));

        // Capture the inner cert div (not the offscreen wrapper)
        const certInner = certElement.querySelector('.cert-capture');
        const canvas = await window.html2canvas(certInner, {
            scale: 3,
            backgroundColor: '#f5f0e8',
            useCORS: true,
            logging: false,
            imageTimeout: 0
        });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const JsPdfCtor = getJsPdfConstructor();
        const pdf = new JsPdfCtor({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 6;
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);

        const scaleFit = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
        const imgWidth = canvas.width * scaleFit;
        const imgHeight = canvas.height * scaleFit;
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
        pdf.save(`${cert.certificate_id}.pdf`);

        // Note: This is admin download for testing/viewing only.
        // Do NOT mark as downloaded. User downloads are tracked only from Certificate Finder.
        Toast.show('success', 'Success', 'Certificate downloaded successfully');
    } catch (error) {
        console.error('Error downloading certificate:', error);
        Toast.show('error', 'Download Error', 'Failed to download certificate: ' + (error.message || 'Unknown error'));
    } finally {
        if (certElement && certElement.parentNode) {
            certElement.parentNode.removeChild(certElement);
        }
    }
};

async function generateCertificatePdfAttachmentPayload(cert) {
    let certElement = null;

    const libsReady = await ensurePdfLibraries();
    if (!libsReady) {
        throw new Error('PDF libraries blocked by browser/network. Please allow CDN scripts and retry.');
    }

    try {
        certElement = generateCertificateHTML(cert);
        await new Promise(resolve => setTimeout(resolve, 300));

        const certInner = certElement.querySelector('.cert-capture');
        const canvas = await window.html2canvas(certInner, {
            scale: 1,
            backgroundColor: '#f5f0e8',
            useCORS: true,
            logging: false,
            imageTimeout: 0
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        const JsPdfCtor = getJsPdfConstructor();
        const pdf = new JsPdfCtor({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 6;
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);

        const scaleFit = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
        const imgWidth = canvas.width * scaleFit;
        const imgHeight = canvas.height * scaleFit;
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);

        const dataUri = pdf.output('datauristring');
        const pdfBase64 = (dataUri.split(',')[1] || '').trim();

        if (!pdfBase64) {
            throw new Error('Failed to generate PDF attachment data.');
        }

        return {
            pdfBase64,
            pdfFileName: `${cert.certificate_id || 'vimarsh-certificate'}.pdf`
        };
    } finally {
        if (certElement && certElement.parentNode) {
            certElement.parentNode.removeChild(certElement);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate certificate HTML — VIMARSH design:
//   • Cream background (#f5f0e8), rounded gold/amber outer border
//   • Thick red stripe top & bottom
//   • Header row: big YUVA logo (left) | "Youth United..." text (centre) | big Vimarsh logo (right)
//   • Certificate title, participant name, college, body text, signatures, ref ID
// ─────────────────────────────────────────────────────────────────────────────
function generateCertificateHTML(cert) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed; left:-99999px; top:0; z-index:-1;';

    const certYear = cert.year || VIMARSH_EVENT_YEAR;
    const participantName = `${cert.first_name || ''} ${cert.last_name || ''}`.trim();
    const collegeName = cert.college_name || 'College Name';
    const refId = cert.registration_id || cert.certificate_id;

    // 1122 × 794 px = exact A4 landscape at 96 dpi
    wrapper.innerHTML = `
        <div class="cert-capture" style="
            width: 1122px;
            height: 794px;
            box-sizing: border-box;
            background: #f5f0e8;
            border-radius: 16px;
            border: 7px solid #d4850a;
            position: relative;
            font-family: Georgia, 'Times New Roman', serif;
            color: #111;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        ">
            <!-- ── Top red stripe ── -->
            <div style="width:100%; height:20px; background:#c20f0f; flex-shrink:0;"></div>
 
            <!-- ── Main content ── -->
            <div style="
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                padding: 20px 60px 16px;
                box-sizing: border-box;
                position: relative;
            ">
 
                <!-- ── Header row: YUVA logo | title text | Vimarsh logo ── -->
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                ">
                    <!-- Left: YUVA logo (circular) -->
                    <img
                        src="${VIMARSH_CERT_YUVA_LOGO_SRC}"
                        alt="YUVA Logo"
                        style="height:120px; width:120px; object-fit:contain; flex-shrink:0; border-radius:50%; background:#fff; padding:8px; border:2px solid #d4850a;"
                        onerror="this.style.visibility='hidden'"
                    >
 
                    <!-- Centre: organisation name -->
                    <div style="flex:1; text-align:center; padding:0 16px;">
                        <div style="font-size:30px; font-weight:400; line-height:1.35; font-family:Georgia,serif; color:#111;">
                            Youth United for Vision and Action
                        </div>
                        <div style="font-size:28px; font-weight:400; line-height:1.35; font-family:Georgia,serif; color:#111;">
                            (YUVA)
                        </div>
                    </div>
 
                    <!-- Right: Vimarsh logo (circular) -->
                    <img
                        src="${VIMARSH_CERT_VIMARSH_LOGO_SRC}"
                        alt="Vimarsh Logo"
                        style="height:120px; width:120px; object-fit:contain; flex-shrink:0; border-radius:50%; background:#fff; padding:8px; border:2px solid #d4850a;"
                        onerror="this.style.visibility='hidden'"
                    >
                </div>
 
                <!-- Certificate title -->
                <div style="
                    font-size:44px;
                    font-weight:900;
                    font-family:Georgia,serif;
                    color:#111;
                    text-align:center;
                    letter-spacing:0.4px;
                    line-height:1.1;
                ">Certificate for Participation</div>
 
                <!-- Participant name -->
                <div style="
                    font-size:58px;
                    font-weight:900;
                    font-family:Arial,sans-serif;
                    color:#111;
                    text-align:center;
                    line-height:1.1;
                ">${participantName}</div>
 
                <!-- College name -->
                <div style="
                    font-size:28px;
                    font-weight:400;
                    font-family:Arial,sans-serif;
                    color:#555;
                    text-align:center;
                    line-height:1.2;
                ">${collegeName}</div>
 
                <!-- Body paragraph -->
                <div style="
                    font-family:Arial,sans-serif;
                    font-size:18px;
                    line-height:1.7;
                    text-align:center;
                    color:#222;
                    max-width:800px;
                ">
                    This Certificate is awarded for Participating &nbsp;at VIMARSH ${certYear},<br>
                    the three-day annual conclave of Youth United for Vision &amp; Action (YUVA).<br>
                    We appreciate your commitment and dedication towards the conclave.
                </div>
 
                <!-- Signatures row -->
                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-end;
                    width:90%;
                ">
                    <!-- Left signature -->
                    <div style="text-align:left; font-family:Arial,sans-serif;">
                        <div style="font-size:18px; color:#444; margin-bottom:3px; letter-spacing:3px;">_______________</div>
                        <div style="font-size:21px; font-weight:700; color:#111;">${VIMARSH_CERT_DIRECTOR_NAME}</div>
                        <div style="font-size:17px; color:#555;">Convener, YUVA</div>
                        <div style="font-size:13px; color:#0a7a33; font-weight:700; margin-top:4px;">Digitally Signed</div>
                    </div>
 
                    <!-- Reference ID — centred between signatures -->
                    <div style="
                        font-family:Arial,sans-serif;
                        font-size:15px;
                        font-weight:700;
                        color:#c20f0f;
                        text-align:center;
                        letter-spacing:0.5px;
                        padding-bottom:2px;
                    ">${refId}</div>
 
                    <!-- Right signature -->
                    <div style="text-align:right; font-family:Arial,sans-serif;">
                        <div style="font-size:18px; color:#444; margin-bottom:3px; letter-spacing:3px;">_______________</div>
                        <div style="font-size:21px; font-weight:700; color:#111;">${VIMARSH_CERT_COORDINATOR_NAME}</div>
                        <div style="font-size:17px; color:#555;">Convener, Vimarsh ${certYear}</div>
                        <div style="font-size:13px; color:#0a7a33; font-weight:700; margin-top:4px;">Digitally Signed</div>
                    </div>
                </div>

                <!-- Digital certificate verification note -->
                <div style="
                    font-family:Arial,sans-serif;
                    font-size:13px;
                    color:#444;
                    text-align:center;
                    margin-top:6px;
                    letter-spacing:0.2px;
                ">
                    This is a digitally generated certificate and does not require physical signatures.
                </div>
 
            </div>
 
            <!-- ── Bottom red stripe ── -->
            <div style="width:100%; height:24px; background:#c20f0f; flex-shrink:0; display:flex; justify-content:flex-start; align-items:center; padding-left:30px; box-sizing:border-box;">
                <span style="color:#ffffff; font-family:Arial,sans-serif; font-size:12px; font-weight:bold; letter-spacing:1px; margin-top:-2px;">Registration No.(YUVA): DL/2023/0362176</span>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    return wrapper;
}

// Update certificate download count
async function updateCertificateDownload(certId) {
    try {
        const cert = certificatesData.find(c => c.id === certId);
        if (!cert) return;

        const { error } = await supabaseClient
            .from(VIMARSH_CERT_TABLE)
            .update({
                downloaded: true,
                download_count: (cert.download_count || 0) + 1,
                last_download_at: new Date().toISOString()
            })
            .eq('id', certId);

        if (error) throw error;

        // Update local data
        cert.downloaded = true;
        cert.download_count = (cert.download_count || 0) + 1;
    } catch (error) {
        console.error('Error updating download:', error);
    }
}

// Open revoke modal
window.openRevokeModal = async function (certId) {
    const cert = certificatesData.find(c => c.id === certId);
    if (!cert) return;

    const reason = await CustomDialog.prompt(
        `Revoke certificate for ${cert.first_name} ${cert.last_name || ''}?\n\nEnter revocation reason:`,
        'Revoke Certificate',
        'Enter reason'
    );
    if (reason && reason.trim()) {
        revokeCertificate(cert.id, reason.trim());
    }
};

// Revoke certificate
async function revokeCertificate(certId, reason) {
    try {
        const { error } = await supabaseClient
            .from(VIMARSH_CERT_TABLE)
            .update({
                status: 'revoked',
                revoke_reason: reason,
                revoked_at: new Date().toISOString()
            })
            .eq('id', certId);

        if (error) throw error;

        Toast.show('success', 'Success', 'Certificate revoked successfully');
        loadCertificates();
    } catch (error) {
        console.error('Error revoking certificate:', error);
        Toast.show('error', 'Error', 'Failed to revoke certificate');
    }
}

// Open re-issue modal for revoked certificates
window.openReissueModal = async function (certId) {
    const cert = certificatesData.find(c => c.id === certId);
    if (!cert) return;

    if (cert.status !== 'revoked') {
        Toast.show('warning', 'Invalid Status', 'Only revoked certificates can be re-issued.');
        return;
    }

    const confirmed = await CustomDialog.confirm(
        `Re-issue certificate for ${cert.first_name} ${cert.last_name || ''}?\n\nThis will set status back to Issued and clear revocation fields.`,
        'Re-Issue Certificate',
        'Re-Issue',
        'Cancel'
    );

    if (!confirmed) return;
    await reissueCertificate(cert.id);
};

// Re-issue certificate (reversal of revoked status)
async function reissueCertificate(certId) {
    try {
        const { error } = await supabaseClient
            .from(VIMARSH_CERT_TABLE)
            .update({
                status: 'issued',
                revoke_reason: null,
                revoked_at: null,
                issued_date: new Date().toISOString(),
                downloaded: false,
                download_count: 0,
                last_download_at: null,
                is_verified: true
            })
            .eq('id', certId);

        if (error) throw error;

        Toast.show('success', 'Re-Issued', 'Certificate has been re-issued successfully.');
        await loadCertificates();
    } catch (error) {
        console.error('Error re-issuing certificate:', error);
        Toast.show('error', 'Re-Issue Failed', 'Could not re-issue certificate: ' + (error.message || 'Unknown error'));
    }
}

// Open generate certificate modal
window.openGenerateCertificateModal = async function () {
    const identifierRaw = await CustomDialog.prompt(
        'Enter Registration ID or Email to generate one certificate.',
        'Generate Single Certificate',
        'e.g. VIM2026-... or name@email.com'
    );

    if (!identifierRaw || !identifierRaw.trim()) return;

    const identifier = identifierRaw.trim();
    const isEmail = identifier.includes('@');

    try {
        let query = supabaseClient
            .from(VIMARSH_REG_TABLE)
            .select('*')
            .in('payment_status', PAID_PAYMENT_STATUSES)
            .order('created_at', { ascending: false });

        if (isEmail) {
            query = query.ilike('email', identifier.toLowerCase());
        } else {
            query = query.eq('registration_id', identifier);
        }

        const { data: registrations, error: regError } = await query;
        if (regError) throw regError;

        if (!registrations || registrations.length === 0) {
            Toast.show('warning', 'Not Found', 'No paid registration found for this Registration ID/Email.');
            return;
        }

        const registration = registrations[0];

        // Keep attendance rule aligned with bulk generation default behavior.
        if (!registration.checked_in) {
            const includeNonAttended = await CustomDialog.confirm(
                `${registration.first_name || ''} ${registration.last_name || ''} is not marked as checked-in.\n\nGenerate certificate anyway?`,
                'Attendance Check',
                'Generate Anyway',
                'Cancel'
            );

            if (!includeNonAttended) return;
        }

        const emailKey = String(registration.email || '').toLowerCase();
        const { data: existingCerts, error: certError } = await supabaseClient
            .from(VIMARSH_CERT_TABLE)
            .select('id, certificate_id')
            .eq('year', VIMARSH_EVENT_YEAR)
            .ilike('email', emailKey)
            .limit(1);

        if (certError) throw certError;

        if (existingCerts && existingCerts.length > 0) {
            Toast.show('info', 'Already Generated', `Certificate already exists: ${existingCerts[0].certificate_id}`);
            return;
        }

        const certificateRecord = {
            certificate_id: generateCertificateId(VIMARSH_EVENT_YEAR, registration.zone_name, registration.college_name, 1),
            registration_id: registration.registration_id || null,
            year: VIMARSH_EVENT_YEAR,
            first_name: registration.first_name,
            last_name: registration.last_name || '',
            email: registration.email,
            mobile: registration.mobile,
            college_name: registration.college_name,
            college_id: registration.college_id,
            zone: registration.zone_name,
            state: registration.state,
            age_group: registration.age_group,
            category: registration.payment_category,
            event_start_date: EVENT_START_DATE,
            issued_date: new Date().toISOString(),
            certificate_template_version: '1.0',
            signature_director_name: VIMARSH_CERT_DIRECTOR_NAME,
            signature_coordinator_name: VIMARSH_CERT_COORDINATOR_NAME,
            status: 'issued',
            is_verified: true,
            created_at: new Date().toISOString()
        };

        const { error: insertError } = await supabaseClient
            .from(VIMARSH_CERT_TABLE)
            .insert([certificateRecord]);

        if (insertError) throw insertError;

        Toast.show('success', 'Certificate Generated', `Generated certificate ${certificateRecord.certificate_id} for ${registration.first_name} ${registration.last_name || ''}`);
        await loadCertificates();
    } catch (error) {
        console.error('Error generating single certificate:', error);
        Toast.show('error', 'Generation Error', 'Failed to generate certificate: ' + (error.message || 'Unknown error'));
    }
};

// Open bulk generate modal
window.openBulkGenerateModal = async function () {
    const stats = await getRegistrationStatsForBulkGeneration();
    const count = stats.total;
    const confirmed = await CustomDialog.confirm(
        `Found ${count} paid registrations for Vimarsh ${VIMARSH_EVENT_YEAR}.\n` +
        `Participants (checked-in): ${stats.participants}\n` +
        `Not attended: ${stats.nonParticipants}\n\n` +
        `Continue to generation options?`,
        'Bulk Certificate Generation',
        'Continue',
        'Cancel'
    );

    if (!confirmed) return;

    const includeNonAttended = await CustomDialog.confirm(
        `Include non-attended registrations also?\n\n` +
        `Include All = Include attended + non-attended\n` +
        `Attended Only = Generate only for checked-in participants`,
        'Attendance Rule',
        'Include All',
        'Attended Only'
    );

    const finalConfirmed = await CustomDialog.confirm(
        includeNonAttended
            ? `Generate certificates for ALL paid registrations (${stats.total})?`
            : `Generate certificates for ONLY attended participants (${stats.participants})?`,
        'Final Confirmation',
        'Generate',
        'Cancel'
    );

    if (finalConfirmed) {
        await generateBulkCertificatesFromRegistrations({ includeNonAttended });
    }
};

// Get registration summary for bulk generation options
async function getRegistrationStatsForBulkGeneration() {
    try {
        const { data, error } = await supabaseClient
            .from(VIMARSH_REG_TABLE)
            .select('checked_in,payment_status');

        if (error) throw error;

        const rows = data || [];
        const paidRows = rows.filter(row => {
            const status = String(row.payment_status || '').toLowerCase();
            return PAID_PAYMENT_STATUSES.includes(status);
        });

        const participants = paidRows.filter(row => row.checked_in === true).length;
        const total = paidRows.length;
        const nonParticipants = total - participants;

        return { total, participants, nonParticipants };
    } catch (error) {
        console.error('Error fetching registration stats:', error);
        Toast.show('error', 'Registration Query Error', 'Could not read vim26 registrations. Please check table name/RLS policy.');
        return { total: 0, participants: 0, nonParticipants: 0 };
    }
}

// Backward-compatible helper retained for any existing call sites
async function getRegistrationCountForBulkGeneration() {
    const stats = await getRegistrationStatsForBulkGeneration();
    return stats.total;
}

// Generate bulk certificates from registrations
async function generateBulkCertificatesFromRegistrations(options = {}) {
    const includeNonAttended = Boolean(options.includeNonAttended);
    const adminUserId = await getCurrentAdminUserId();

    try {
        Toast.show('info', 'Processing', 'Generating certificates... This may take a moment');

        // Fetch completed registrations; restrict to checked-in unless explicitly included.
        let query = supabaseClient
            .from(VIMARSH_REG_TABLE)
            .select('*')
            .in('payment_status', PAID_PAYMENT_STATUSES)
            .order('created_at', { ascending: false });

        if (!includeNonAttended) {
            query = query.eq('checked_in', true);
        }

        const { data: registrations, error: regError } = await query;

        if (regError) throw regError;
        if (!registrations || registrations.length === 0) {
            Toast.show('warning', 'No Data', includeNonAttended
                ? 'No completed registrations found'
                : 'No checked-in participants found');
            return;
        }

        // Fetch existing certificates to avoid duplicates
        const { data: existingCerts, error: certError } = await supabaseClient
            .from(VIMARSH_CERT_TABLE)
            .select('email, year');

        if (certError) throw certError;
        const existingKeys = new Set(
            (existingCerts || []).map(c => `${String(c.email || '').toLowerCase()}::${c.year}`)
        );

        // Filter out registrations that already have certificates for the current year.
        const newRegistrations = registrations.filter(reg => {
            const email = String(reg.email || '').toLowerCase();
            return !existingKeys.has(`${email}::${VIMARSH_EVENT_YEAR}`);
        });

        if (newRegistrations.length === 0) {
            await logCertificateBatchGeneration({
                adminUserId,
                totalCount: registrations.length,
                successCount: 0,
                failedCount: registrations.length,
                status: 'completed',
                includeNonAttended,
                note: `No new certificates generated. All eligible registrations already had certificates for ${VIMARSH_EVENT_YEAR}.`
            });

            Toast.show('info', 'Info', `All eligible registrations already have certificates for ${VIMARSH_EVENT_YEAR}`);
            return;
        }

        // Generate certificate records
        const certificateRecords = newRegistrations.map((reg, index) => ({
            certificate_id: generateCertificateId(VIMARSH_EVENT_YEAR, reg.zone_name, reg.college_name, index + 1),
            registration_id: reg.registration_id || null,
            year: VIMARSH_EVENT_YEAR,
            first_name: reg.first_name,
            last_name: reg.last_name || '',
            email: reg.email,
            mobile: reg.mobile,
            college_name: reg.college_name,
            college_id: reg.college_id,
            zone: reg.zone_name,
            state: reg.state,
            age_group: reg.age_group,
            category: reg.payment_category,
            event_start_date: EVENT_START_DATE,
            issued_date: new Date().toISOString(),
            certificate_template_version: '1.0',
            signature_director_name: VIMARSH_CERT_DIRECTOR_NAME,
            signature_coordinator_name: VIMARSH_CERT_COORDINATOR_NAME,
            status: 'issued',
            is_verified: true,
            created_at: new Date().toISOString()
        }));

        // Batch insert certificates
        const batchSize = 50;
        for (let i = 0; i < certificateRecords.length; i += batchSize) {
            const batch = certificateRecords.slice(i, i + batchSize);
            const { error: insertError } = await supabaseClient
                .from(VIMARSH_CERT_TABLE)
                .insert(batch);

            if (insertError) throw insertError;
        }

        await logCertificateBatchGeneration({
            adminUserId,
            totalCount: registrations.length,
            successCount: certificateRecords.length,
            failedCount: registrations.length - certificateRecords.length,
            status: 'completed',
            includeNonAttended,
            note: `Generated ${certificateRecords.length} certificates for Vimarsh ${VIMARSH_EVENT_YEAR}.`
        });

        // Generate summary report by college
        const summary = {};
        certificateRecords.forEach(cert => {
            if (!summary[cert.college_name]) {
                summary[cert.college_name] = 0;
            }
            summary[cert.college_name]++;
        });

        // Build detailed message
        const skipCount = registrations.length - newRegistrations.length;
        const summaryText = Object.entries(summary)
            .map(([college, count]) => `${college}: ${count}`)
            .join('\n');

        const fullMessage = `✅ Generated ${certificateRecords.length} certificates\n\n` +
            `Mode: ${includeNonAttended ? 'Attended + Non-attended' : 'Attended Only'}\n\n` +
            `Breakdown by College:\n${summaryText}\n\n` +
            (skipCount > 0 ? `⚠️ Skipped ${skipCount} registrations (already have certificates)\n\n` : '') +
            `Click elsewhere to dismiss this message.`;

        Toast.show('success', 'Bulk Generation Complete', fullMessage, 8000);

        // Reload certificates view
        await loadCertificates();

    } catch (error) {
        console.error('Error generating bulk certificates:', error);
        await logCertificateBatchGeneration({
            adminUserId,
            totalCount: 0,
            successCount: 0,
            failedCount: 0,
            status: 'failed',
            includeNonAttended,
            note: error.message || 'Bulk generation failed'
        });
        Toast.show('error', 'Generation Error',
            'Failed to generate certificates: ' + error.message);
    }
}

function buildCertificateFinderLink(cert) {
    const url = new URL(VIMARSH_CERTIFICATE_FINDER_URL, window.location.origin);

    if (cert.email) url.searchParams.set('email', String(cert.email));
    if (cert.registration_id) url.searchParams.set('regId', String(cert.registration_id));
    if (cert.certificate_id) url.searchParams.set('certId', String(cert.certificate_id));

    return url.toString();
}

// Send individual certificate email
window.sendIndividualCertificateEmail = async function (certId) {
    const cert = certificatesData.find(c => c.id === certId);
    if (!cert) {
        Toast.show('error', 'Error', 'Certificate not found');
        return;
    }

    if (cert.status !== 'issued') {
        Toast.show('warning', 'Cannot Send', 'Only issued certificates can be emailed');
        return;
    }

    if (!cert.email) {
        Toast.show('error', 'Missing Email', 'This certificate has no recipient email address');
        return;
    }

    if (cert.email_sent_at) {
        Toast.show('warning', 'Already Sent', `Email already sent to ${cert.email} on ${new Date(cert.email_sent_at).toLocaleString()}`);
        return;
    }

    if (!VIMARSH_CERT_EMAIL_GAS_URL) {
        Toast.show('error', 'Configuration Error', 'Certificate email GAS URL is not configured.');
        return;
    }

    const confirmed = await CustomDialog.confirm(
        `Send certificate email to ${cert.first_name || ''} ${cert.last_name || ''} (${cert.email})?`,
        'Send Certificate Email',
        'Send',
        'Cancel'
    );

    if (!confirmed) return;

    try {
        let attachmentPayload = null;
        try {
            attachmentPayload = await generateCertificatePdfAttachmentPayload(cert);
        } catch (pdfError) {
            console.warn('PDF attachment generation failed, sending without attachment:', pdfError);
        }

        const payloadItem = {
            email: cert.email,
            firstName: cert.first_name || '',
            lastName: cert.last_name || '',
            certificateId: cert.certificate_id || '',
            registrationId: cert.registration_id || '',
            year: cert.year || VIMARSH_EVENT_YEAR,
            collegeName: cert.college_name || '',
            downloadLink: buildCertificateFinderLink(cert),
            pdfBase64: attachmentPayload ? attachmentPayload.pdfBase64 : '',
            pdfFileName: attachmentPayload ? attachmentPayload.pdfFileName : ''
        };

        const response = await fetch(VIMARSH_CERT_EMAIL_GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                action: 'notify',
                method: 'sendVimarshCertificateEmails',
                certificates: [payloadItem]
            })
        });

        const raw = await response.text();
        let parsed = {};
        try {
            parsed = raw ? JSON.parse(raw) : {};
        } catch (_) {
            parsed = {};
        }

        if (!response.ok || parsed.success === false) {
            throw new Error(parsed.error || `HTTP ${response.status}`);
        }

        // Mark certificate as emailed in database
        if (parsed.success) {
            await markCertificateAsEmailed(cert.id);
            cert.email_sent_at = new Date().toISOString();
        }

        Toast.show('success', 'Email Sent', `Certificate email sent to ${cert.email}`);
        
        // Refresh table to show updated "Emailed" status
        await loadCertificates();
    } catch (error) {
        console.error('Individual certificate email send failed:', error);
        Toast.show('error', 'Email Send Failed', 'Could not send certificate email: ' + (error.message || 'Unknown error'));
    }
};

window.bulkSendCertificateEmails = async function () {
    const targets = (filteredCertificates || []).filter(cert =>
        cert &&
        cert.status === 'issued' &&
        cert.email &&
        cert.certificate_id &&
        !cert.email_sent_at  // Skip already emailed certificates
    );

    if (targets.length === 0) {
        Toast.show('warning', 'No Eligible Certificates', 'No new issued certificates with email were found. All matching certificates have already been emailed.');
        return;
    }

    if (!VIMARSH_CERT_EMAIL_GAS_URL) {
        Toast.show('error', 'Configuration Error', 'Certificate email GAS URL is not configured. Set window.VIMARSH_CERT_EMAIL_GAS_URL or window.YUVA_GAS_COUNTER_URL.');
        return;
    }

    const confirmed = await CustomDialog.confirm(
        `Send certificate email to ${targets.length} participant(s) from current filtered list?`,
        'Bulk Certificate Email',
        'Send Emails',
        'Cancel'
    );

    if (!confirmed) return;

    const sendBtn = document.querySelector('button[onclick="bulkSendCertificateEmails()"]');
    const originalHtml = sendBtn ? sendBtn.innerHTML : '';

    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    }

    try {
        let sent = 0;
        let failed = 0;

        for (const cert of targets) {
            let attachmentPayload = null;
            try {
                attachmentPayload = await generateCertificatePdfAttachmentPayload(cert);
            } catch (pdfError) {
                console.warn('PDF attachment generation failed, sending without attachment for:', cert.certificate_id, pdfError);
            }

            const payloadItem = {
                email: cert.email,
                firstName: cert.first_name || '',
                lastName: cert.last_name || '',
                certificateId: cert.certificate_id || '',
                registrationId: cert.registration_id || '',
                year: cert.year || VIMARSH_EVENT_YEAR,
                collegeName: cert.college_name || '',
                downloadLink: buildCertificateFinderLink(cert),
                pdfBase64: attachmentPayload ? attachmentPayload.pdfBase64 : '',
                pdfFileName: attachmentPayload ? attachmentPayload.pdfFileName : ''
            };

            const response = await fetch(VIMARSH_CERT_EMAIL_GAS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify({
                    action: 'notify',
                    method: 'sendVimarshCertificateEmails',
                    certificates: [payloadItem]
                })
            });

            const raw = await response.text();
            let parsed = {};
            try {
                parsed = raw ? JSON.parse(raw) : {};
            } catch (_) {
                parsed = {};
            }

            if (!response.ok || parsed.success === false) {
                throw new Error(parsed.error || `HTTP ${response.status}`);
            }

            // Mark certificate as emailed in database
            if (parsed.success) {
                await markCertificateAsEmailed(cert.id);
                cert.email_sent_at = new Date().toISOString();
            }

            sent += Number(parsed.sent || 1);
            failed += Number(parsed.failed || 0);
        }

        Toast.show('success', 'Email Dispatch Complete', `Sent: ${sent}, Failed: ${failed}`);
        
        // Refresh table to show updated "Emailed" status
        await loadCertificates();
    } catch (error) {
        console.error('Bulk certificate email send failed:', error);
        Toast.show('error', 'Email Send Failed', 'Could not send bulk certificate emails: ' + (error.message || 'Unknown error'));
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalHtml;
        }
    }
};

// Mark certificate as emailed
async function markCertificateAsEmailed(certId) {
    try {
        const { error } = await supabaseClient
            .from(VIMARSH_CERT_TABLE)
            .update({
                email_sent: true,
                email_sent_at: new Date().toISOString()
            })
            .eq('id', certId);

        if (error) {
            console.error('Error marking certificate as emailed:', error);
        }
    } catch (err) {
        console.error('Failed to mark certificate as emailed:', err);
    }
}

// Generate unique certificate ID
function generateCertificateId(year, zone, college, sequence) {
    // Must match DB constraint: ^VM-[0-9]{4}-[A-Z0-9]{5}$
    const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${(sequence || 0).toString(36)}`
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    const suffix = (seed + '00000').slice(0, 5);

    return `VM-${year}-${suffix}`;
}

// Export certificates CSV
window.exportCertificatesCSV = function () {
    if (filteredCertificates.length === 0) {
        Toast.show('warning', 'Warning', 'No certificates to export');
        return;
    }

    const headers = ['Certificate ID', 'Registration ID', 'Name', 'Email', 'College', 'Zone', 'Category', 'Status', 'Issued Date', 'Downloaded'];
    const data = filteredCertificates.map(cert => [
        cert.certificate_id,
        cert.registration_id || 'N/A',
        `${cert.first_name} ${cert.last_name || ''}`,
        cert.email,
        cert.college_name,
        cert.zone,
        cert.category,
        cert.status,
        cert.issued_date ? new Date(cert.issued_date).toLocaleDateString() : 'N/A',
        cert.downloaded ? 'Yes' : 'No'
    ]);

    const csv = [headers, ...data]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vimarsh-certificates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    Toast.show('success', 'Success', 'Certificates exported to CSV');
};

window.refreshCurrentView = function () {
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && pageTitle.textContent.includes('Counter')) {
        loadCounterData();
    }
};

function formatNumberIndian(num) {
    return new Intl.NumberFormat('en-IN').format(num || 0);
}

// --- DASHBOARD COUNTERS ---
async function updateDashboardCounters() {
    try {
        // Get executive members count
        const { data: executives, error } = await supabaseClient
            .from('executive_members')
            .select('id', { count: 'exact', head: true });

        if (!error) {
            const execCount = executives?.length || 0;
            const countEl = document.getElementById('dashboard-exec-count');
            if (countEl) {
                countEl.innerHTML = `Total Members: <strong>${execCount}</strong>`;
            }
        }

        // Get counter status
        const counterStatusEl = document.getElementById('dashboard-counter-status');
        if (counterStatusEl) {
            // Check if counter data exists in localStorage or session
            const refreshCount = localStorage.getItem('page_refresh_count') || '0';
            if (refreshCount && parseInt(refreshCount) > 0) {
                counterStatusEl.innerHTML = `Status: <strong style="color:#10b981;">Active</strong>`;
            } else {
                counterStatusEl.innerHTML = `Status: <strong style="color:#666;">Ready</strong>`;
            }
        }
    } catch (error) {
        console.error('Error loading dashboard counters:', error);
    }
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

// --- EXECUTIVE MEMBERS MANAGEMENT ---

window.loadExecutiveMembers = async function () {
    const tbody = document.querySelector('#executives-table tbody');
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">Loading executive members...</td></tr>';

        const { data, error } = await supabaseClient
            .from('executive_members')
            .select('id, member_name, designation, role, photo_url, contact_email, description, display_order')
            .order('display_order', { ascending: true });

        if (error) throw error;

        renderExecutivesTable(data || []);
        updateDashboardCounters(); // Update dashboard counter
    } catch (error) {
        console.error('Error loading executives:', error);
        Toast.show('error', 'Load Failed', error.message);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#c00;">Failed to load executive members</td></tr>';
    }
};

function renderExecutivesTable(executives) {
    const tbody = document.querySelector('#executives-table tbody');
    const searchInput = document.querySelector('#executive-search');
    if (!tbody) return;

    // Apply search filter
    const searchTerm = (searchInput?.value || '').toLowerCase();
    const filtered = executives.filter(exec =>
        (exec.member_name || '').toLowerCase().includes(searchTerm) ||
        (exec.designation || '').toLowerCase().includes(searchTerm) ||
        (exec.role || '').toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#666;">No executive members found</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((exec, index) => `
        <tr>
            <td>
                ${exec.photo_url ? `
                    <img src="${exec.photo_url}" alt="${exec.member_name}" 
                        style="width:40px; height:40px; border-radius:50%; object-fit:cover; cursor:pointer;"
                        onclick="openExecutiveImageViewModal('${encodeURIComponent(exec.photo_url)}', '${escapeHtml(exec.member_name)}')">
                ` : `
                    <div style="width:40px; height:40px; border-radius:50%; background:#ddd; display:flex; align-items:center; justify-content:center; color:#999; font-weight:600;">
                        ${getInitials(exec.member_name || '')}
                    </div>
                `}
            </td>
            <td><strong>${escapeHtml(exec.member_name || '')}</strong></td>
            <td>${escapeHtml(exec.designation || '')}</td>
            <td>${escapeHtml(exec.role || '')}</td>
            <td><small>${escapeHtml(exec.contact_email || '-')}</small></td>
            <td style="text-align:center;">${exec.display_order || 0}</td>
            <td style="text-align:center;">
                ${index > 0 ? `<button class="btn-icon" title="Move Up" onclick="moveExecutiveMemberUp('${exec.id}')"><i class="fas fa-arrow-up"></i></button>` : '<span style="width:32px; display:inline-block;"></span>'}
                ${index < filtered.length - 1 ? `<button class="btn-icon" title="Move Down" onclick="moveExecutiveMemberDown('${exec.id}')"><i class="fas fa-arrow-down"></i></button>` : '<span style="width:32px; display:inline-block;"></span>'}
            </td>
            <td style="text-align:center;">
                <button class="btn-icon" title="Edit" onclick="openExecutiveMemberModal('${exec.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" title="Delete" onclick="deleteExecutiveMember('${exec.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.openExecutiveMemberModal = async function (memberId) {
    const modal = document.getElementById('executive-member-modal');
    const titleEl = document.getElementById('executive-modal-title');

    // Reset form
    document.getElementById('executive-id').value = '';
    document.getElementById('executive-name').value = '';
    document.getElementById('executive-designation').value = '';
    document.getElementById('executive-role').value = '';
    document.getElementById('executive-email').value = '';
    document.getElementById('executive-description').value = '';
    document.getElementById('executive-display-order').value = '0';
    document.getElementById('executive-photo-input').value = '';
    document.getElementById('executive-current-photo').style.display = 'none';

    if (memberId) {
        // Load existing member
        try {
            const { data, error } = await supabaseClient
                .from('executive_members')
                .select('*')
                .eq('id', memberId)
                .single();

            if (error) throw error;

            document.getElementById('executive-id').value = data.id;
            document.getElementById('executive-name').value = data.member_name || '';
            document.getElementById('executive-designation').value = data.designation || '';
            document.getElementById('executive-role').value = data.role || '';
            document.getElementById('executive-email').value = data.contact_email || '';
            document.getElementById('executive-description').value = data.description || '';
            document.getElementById('executive-display-order').value = data.display_order || '0';

            // Show current photo if available
            if (data.photo_url) {
                const currentPhotoDiv = document.getElementById('executive-current-photo');
                const currentPhotoImg = document.getElementById('executive-current-photo-img');
                currentPhotoImg.src = data.photo_url;
                currentPhotoDiv.style.display = 'block';
            }

            titleEl.textContent = 'Edit Executive Member';
        } catch (error) {
            console.error('Error loading member:', error);
            Toast.show('error', 'Load Failed', error.message);
            return;
        }
    } else {
        titleEl.textContent = 'Add Executive Member';
    }

    if (modal) modal.classList.remove('hidden');
};

window.closeExecutiveMemberModal = function () {
    const modal = document.getElementById('executive-member-modal');
    if (modal) modal.classList.add('hidden');
};

// Validation helper for Executive Member fields
function validateExecutiveMemberFields(name, designation, role, email) {
    // Name, Designation, Role: Allow alphanumeric + special characters (no restrictions)
    if (!name || name.length === 0) {
        Toast.show('warning', 'Validation', 'Member Name is required');
        return false;
    }
    if (!designation || designation.length === 0) {
        Toast.show('warning', 'Validation', 'Designation is required');
        return false;
    }
    if (!role || role.length === 0) {
        Toast.show('warning', 'Validation', 'Role is required');
        return false;
    }
    // Email: Optional but if provided must be valid email format
    if (email && email.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Toast.show('warning', 'Validation', 'Please enter a valid email address');
            return false;
        }
    }
    return true;
}

window.saveExecutiveMember = async function () {
    const memberId = document.getElementById('executive-id').value;
    const memberName = document.getElementById('executive-name').value.trim();
    const designation = document.getElementById('executive-designation').value.trim();
    const role = document.getElementById('executive-role').value.trim();
    const email = document.getElementById('executive-email').value.trim();
    const description = document.getElementById('executive-description').value.trim();
    const displayOrder = parseInt(document.getElementById('executive-display-order').value) || 0;
    const photoInput = document.getElementById('executive-photo-input');

    // Validation: Name, Designation, Role are required; Email optional but must be valid format if provided
    if (!validateExecutiveMemberFields(memberName, designation, role, email)) {
        return;
    }

    try {
        let photoUrl = null;

        // Handle photo upload
        if (photoInput?.files?.[0]) {
            const file = photoInput.files[0];

            // Validate file size (max 500 KB for executive member photos)
            const MAX_FILE_SIZE = 500 * 1024; // 500 KB
            if (file.size > MAX_FILE_SIZE) {
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                Toast.show('warning', 'File Too Large', `Photo must be less than 500 KB. Current size: ${fileSizeMB} MB`);
                return;
            }

            // Upload to executive_team bucket
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('executive_team')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabaseClient.storage
                .from('executive_team')
                .getPublicUrl(fileName);

            photoUrl = urlData?.publicUrl || null;
        }

        const memberData = {
            member_name: memberName,
            designation: designation,
            role: role,
            contact_email: email || null,
            description: description || null,
            display_order: displayOrder
        };

        // Add photo URL if new photo was uploaded
        if (photoUrl) {
            memberData.photo_url = photoUrl;
        }

        if (memberId) {
            // Update existing
            const { error } = await supabaseClient
                .from('executive_members')
                .update(memberData)
                .eq('id', memberId);

            if (error) throw error;
            Toast.show('success', 'Updated', 'Executive member updated successfully');
        } else {
            // Create new
            const { error } = await supabaseClient
                .from('executive_members')
                .insert([{
                    ...memberData,
                    photo_url: photoUrl
                }]);

            if (error) throw error;
            Toast.show('success', 'Created', 'Executive member added successfully');
        }

        closeExecutiveMemberModal();
        loadExecutiveMembers();
    } catch (error) {
        console.error('Error saving executive member:', error);
        Toast.show('error', 'Save Failed', error.message);
    }
};

window.deleteExecutiveMember = async function (memberId) {
    if (!memberId) {
        console.error('No member ID provided');
        return;
    }

    try {
        // Fetch member data for display
        const { data: member, error } = await supabaseClient
            .from('executive_members')
            .select('member_name')
            .eq('id', memberId)
            .single();

        if (error) throw error;

        pendingExecutiveDelete = memberId;
        const modal = document.getElementById('executive-delete-modal');
        const nameEl = document.getElementById('executive-delete-name');

        if (!modal || !nameEl) {
            Toast.show('warning', 'Delete Unavailable', 'Delete modal is not available. Please refresh page.');
            return;
        }

        nameEl.textContent = member?.member_name || 'this member';
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading member for deletion:', error);
        Toast.show('error', 'Load Failed', 'Could not load member details');
    }
};

window.closeExecutiveDeleteModal = function () {
    const modal = document.getElementById('executive-delete-modal');
    if (modal) modal.classList.add('hidden');
    pendingExecutiveDelete = null;
};

window.confirmExecutiveDelete = async function () {
    if (!pendingExecutiveDelete) {
        closeExecutiveDeleteModal();
        return;
    }

    const memberId = Number(pendingExecutiveDelete);
    console.log('Deleting member with ID:', memberId);

    const confirmBtn = document.getElementById('executive-delete-confirm-btn');
    const originalBtnText = confirmBtn ? confirmBtn.innerHTML : '';

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    }

    try {
        const { data, error } = await supabaseClient
            .from('executive_members')
            .delete()
            .eq('id', memberId);

        console.log('Delete response:', { data, error });

        if (error) {
            console.error('Delete error details:', error);
            throw error;
        }

        Toast.show('success', 'Deleted', 'Executive member deleted successfully');
        closeExecutiveDeleteModal();
        await loadExecutiveMembers();
    } catch (error) {
        console.error('Error deleting executive member:', error);
        Toast.show('error', 'Delete Failed', error.message || 'Unable to delete member');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalBtnText;
        }
    }
};

window.moveExecutiveMemberUp = async function (memberId) {
    try {
        // Get all executives sorted by display_order
        const { data: allExecutives, error: fetchError } = await supabaseClient
            .from('executive_members')
            .select('id, display_order')
            .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;

        // Find current member and previous member
        const currentIndex = allExecutives.findIndex(e => e.id == memberId);
        if (currentIndex <= 0) return; // Can't move up if first

        const currentMember = allExecutives[currentIndex];
        const previousMember = allExecutives[currentIndex - 1];

        // Swap display_order values
        await supabaseClient
            .from('executive_members')
            .update({ display_order: previousMember.display_order })
            .eq('id', currentMember.id);

        await supabaseClient
            .from('executive_members')
            .update({ display_order: currentMember.display_order })
            .eq('id', previousMember.id);

        Toast.show('success', 'Updated', 'Member order updated');
        await loadExecutiveMembers();
    } catch (error) {
        console.error('Error moving member up:', error);
        Toast.show('error', 'Move Failed', error.message);
    }
};

window.moveExecutiveMemberDown = async function (memberId) {
    try {
        // Get all executives sorted by display_order
        const { data: allExecutives, error: fetchError } = await supabaseClient
            .from('executive_members')
            .select('id, display_order')
            .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;

        // Find current member and next member
        const currentIndex = allExecutives.findIndex(e => e.id == memberId);
        if (currentIndex >= allExecutives.length - 1) return; // Can't move down if last

        const currentMember = allExecutives[currentIndex];
        const nextMember = allExecutives[currentIndex + 1];

        // Swap display_order values
        await supabaseClient
            .from('executive_members')
            .update({ display_order: nextMember.display_order })
            .eq('id', currentMember.id);

        await supabaseClient
            .from('executive_members')
            .update({ display_order: currentMember.display_order })
            .eq('id', nextMember.id);

        Toast.show('success', 'Updated', 'Member order updated');
        await loadExecutiveMembers();
    } catch (error) {
        console.error('Error moving member down:', error);
        Toast.show('error', 'Move Failed', error.message);
    }
};

window.openExecutiveImageViewModal = function (encodedUrl, encodedName) {
    const modal = document.getElementById('executive-image-view-modal');
    const img = document.getElementById('executive-image-view-img');
    const title = document.getElementById('executive-image-view-title');

    if (img && encodedUrl) {
        img.src = decodeURIComponent(encodedUrl);
    }
    if (title && encodedName) {
        title.textContent = `${decodeURIComponent(encodedName)} - Profile Photo`;
    }

    if (modal) modal.classList.remove('hidden');
};

window.closeExecutiveImageViewModal = function () {
    const modal = document.getElementById('executive-image-view-modal');
    if (modal) modal.classList.add('hidden');
};

// Attach search event listener to executive search
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('executive-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const tbody = document.querySelector('#executives-table tbody');
            if (tbody && tbody.innerHTML) {
                // Get all executives from the data attributes or reload
                loadExecutiveMembers();
            }
        }, 300));
    }
});

window.toggleSidebar = function () {
    document.querySelector('.sidebar').classList.toggle('open');
    document.body.classList.toggle('sidebar-open');
};

// Close sidebar when menu item is clicked (mobile only)
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function () {
            if (document.body.classList.contains('sidebar-open')) {
                document.querySelector('.sidebar').classList.remove('open');
                document.body.classList.remove('sidebar-open');
            }
        });
    });
});

document.addEventListener('click', function (e) {
    if (document.body.classList.contains('sidebar-open') &&
        !e.target.closest('.sidebar') &&
        !e.target.closest('.hamburger-btn')) {
        document.querySelector('.sidebar').classList.remove('open');
        document.body.classList.remove('sidebar-open');
    }
});