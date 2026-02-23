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
        'messages': 'Zone Messages',
        'events-manager': 'Event Management',
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titleMap[sectionId] || 'Dashboard';

    // Show Section
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('user-manager-view').classList.add('hidden');
    const messagesView = document.getElementById('messages-view');
    const eventsView = document.getElementById('events-manager-view');
    if (messagesView) messagesView.style.display = 'none';
    if (eventsView) eventsView.style.display = 'none';

    if (sectionId === 'dashboard') {
        document.getElementById('dashboard-view').classList.remove('hidden');
    } else if (sectionId === 'user-manager') {
        document.getElementById('user-manager-view').classList.remove('hidden');
        loadUsers();
    } else if (sectionId === 'messages') {
        if (messagesView) messagesView.style.display = 'block';
        loadMessages();
    } else if (sectionId === 'events-manager') {
        if (eventsView) eventsView.style.display = 'block';
        loadEvents();
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
    let html = '<div style="display: flex; flex-direction: column; gap: 15px; padding: 20px;">';
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

        html += `
            <div class="message-card" style="background: white; border-left: 4px solid ${statusColors[msg.status]}; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: #333; font-size: 18px;">${msg.subject}</h3>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span style="background: ${categoryColors[msg.category]}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                ${msg.category.toUpperCase()}
                            </span>
                            <span style="background: ${statusColors[msg.status]}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                ${msg.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; color: #777;">${new Date(msg.created_at).toLocaleString()}</div>
                    </div>
                </div>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 14px;">
                        <div><strong>From:</strong> ${msg.sender_name}</div>
                        <div><strong>Email:</strong> ${msg.sender_email}</div>
                        <div><strong>Zone:</strong> ${msg.zone_name || 'N/A'}</div>
                        <div><strong>Role:</strong> ${msg.sender_role}</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="color: #000080;">Message:</strong>
                    <p style="margin: 8px 0 0 0; line-height: 1.6; white-space: pre-wrap;">${msg.message}</p>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    ${msg.status === 'unread' ? `<button class="btn primary" data-action="mark-read" data-msg-id="${msg.id}"><i class="fas fa-check"></i> Mark as Read</button>` : ''}
                    ${msg.status === 'read' ? `<button class="btn primary" data-action="mark-resolved" data-msg-id="${msg.id}"><i class="fas fa-check-double"></i> Mark as Resolved</button>` : ''}
                    ${msg.status === 'resolved' ? `<button class="btn secondary" data-action="reopen" data-msg-id="${msg.id}"><i class="fas fa-undo"></i> Reopen</button>` : ''}
                    <button class="btn secondary" data-action="reply" data-msg-id="${msg.id}" data-email="${msg.sender_email}" data-subject="${msg.subject.replace(/"/g, '&quot;')}" data-name="${msg.sender_name.replace(/"/g, '&quot;')}"><i class="fas fa-reply"></i> Reply via Email</button>
                </div>
            </div>
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
    } else if (messagesView && messagesView.style.display !== 'none') {
        loadMessages().finally(stopRefreshAnimation);
    } else {
        const eventsView = document.getElementById('events-manager-view');
        if (eventsView && eventsView.style.display !== 'none') {
            loadEvents().finally(stopRefreshAnimation);
        } else {
            // Main Dashboard (Static for now, but simulating refresh)
            setTimeout(() => {
                Toast.show('success', 'Dashboard Updated', 'Dashboard Refreshed Successfully');
                stopRefreshAnimation();
            }, 800);
        }
    }
};

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
                document.querySelector('.custom-dropdown-text').textContent = this.textContent;
                document.querySelectorAll('.custom-dropdown-option').forEach(opt => {
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

// Load events from database
async function loadEvents() {
    try {
        const statusFilter = document.getElementById('event-status-filter').value;
        
        // Use published_events view which already has mode and capacity
        let query = supabaseClient.from('published_events').select('*');
        
        // Apply status filter
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
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
        loadEvents();
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
        loadEvents();
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
document.addEventListener('DOMContentLoaded', function() {
    const eventStatusFilter = document.getElementById('event-status-filter');
    if (eventStatusFilter) {
        eventStatusFilter.addEventListener('change', loadEvents);
    }
    
    const registrationSearch = document.getElementById('registration-search');
    if (registrationSearch) {
        registrationSearch.addEventListener('keyup', debounce(function() {
            loadRegistrations();
        }, 500));
    }
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

