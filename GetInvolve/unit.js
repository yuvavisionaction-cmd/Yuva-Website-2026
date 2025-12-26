// ===== YUVA DELHI UNIT REGISTRATION ADMIN SYSTEM - FRONTEND JAVASCRIPT =====

// Supabase Configuration
const SUPABASE_URL = 'https://jgsrsjwmywiirtibofth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5KtvO0cEHfnECBoyp2CQnw_RC3_x2me';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwbeXIEqX6H2pdxdTYexn0WrVE3gwcVE4RLtJZy9dkiIzEJ1rj03UTmYO_bJUcnCQm8/exec';

// ===== FLASH NOTIFICATION SYSTEM =====
class FlashNotification {
    constructor() {
        this.initializeFlashSystem();
    }
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
        const icons = {
            success: 'fas fa-check',
            error: 'fas fa-times',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        notification.innerHTML = `
            <div class="flash-icon"><i class="${icons[type]}"></i></div>
            <div class="flash-content">
                <div class="flash-title">${title}</div>
                <div class="flash-message">${message}</div>
            </div>
            <button class="flash-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
    }
    showSuccess(title, message, duration = 5000) { this.showFlashNotification('success', title, message, duration); }
    showError(title, message, duration = 5000) { this.showFlashNotification('error', title, message, duration); }
    showWarning(title, message, duration = 5000) { this.showFlashNotification('warning', title, message, duration); }
    showInfo(title, message, duration = 5000) { this.showFlashNotification('info', title, message, duration); }
}
const flashNotification = new FlashNotification();



// ===== SUPABASE API INTEGRATION =====
class SupabaseService {

    static async login(email, password) {
        try {
            // 1) Try GET first (works reliably with Apps Script web apps)
            const qs = new URLSearchParams({ action: 'auth', method: 'login', email, password }).toString();
            const respGet = await fetch(`${GAS_WEB_APP_URL}?${qs}`, { method: 'GET' });
            const rawGet = await respGet.text();
            let jsonGet = null; try { jsonGet = JSON.parse(rawGet); } catch (_) { jsonGet = null; }
            if (respGet.ok && jsonGet && jsonGet.success) {
                return { success: true, user: jsonGet.user, token: jsonGet.token };
            }

            // 2) Fallback to POST x-www-form-urlencoded
            const bodyParams = new URLSearchParams({ action: 'auth', method: 'login', email, password });
            const respPost = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                body: bodyParams.toString()
            });
            const rawPost = await respPost.text();
            let jsonPost = null; try { jsonPost = JSON.parse(rawPost); } catch (_) { jsonPost = null; }
            if (respPost.ok && jsonPost && jsonPost.success) {
                return { success: true, user: jsonPost.user, token: jsonPost.token };
            }

            const errMsg = (jsonGet && (jsonGet.error || jsonGet.details)) || (jsonPost && (jsonPost.error || jsonPost.details)) || rawPost || rawGet || `HTTP ${respPost.status}`;
            return { success: false, error: String(errMsg).slice(0, 300) };
        } catch (error) {
            console.error("Login fetch error:", error);
            const msg = (error && error.message) ? error.message : 'Login failed due to a network error.';
            return { success: false, error: msg };
        }
    }
    // Add this function inside the SupabaseService class
    static async checkEmail(email) {
        try {
            const params = new URLSearchParams({ action: 'auth', method: 'checkEmail', email }).toString();
            const response = await fetch(`${GAS_WEB_APP_URL}?${params}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Email check failed:', errorText);
                return { success: false, error: 'Could not verify email due to a server error.' };
            }

            const result = await response.json();
            // Expects the server to return { success: true, exists: boolean }
            if (result && typeof result.exists === 'boolean') {
                return { success: true, exists: result.exists };
            }

            return { success: false, error: 'Received an invalid response from the server.' };

        } catch (error) {
            console.error("Email check network error:", error);
            return { success: false, error: 'Could not verify email due to a network error.' };
        }
    }



    /**
     * UPDATED: This function now only handles the registration call.
     * It uses the more secure POST method.
     */
    // Replace the SupabaseService.register function
    static async register(userData) {
        try {
            const params = new URLSearchParams({
                action: 'auth',
                method: 'register',
                email: userData.email,
                password: userData.password,
                full_name: userData.full_name,
                role: userData.role,
                zone: userData.zone || ''
            });

            // Using GET as it is more reliable with Google Apps Script
            const response = await fetch(`${GAS_WEB_APP_URL}?${params.toString()}`);
            const result = await response.json(); // We will get JSON for both success and errors

            if (response.ok && result.success) {
                return { success: true, user_id: result.user_id };
            }

            // This now passes the full error object (including details) forward
            return { success: false, error: result.error || 'Registration failed', details: result.details || 'No details provided.' };

        } catch (error) {
            console.error("Registration failed:", error);
            // This catches network errors or if the response isn't valid JSON
            return { success: false, error: 'Network Error', details: error.toString() };
        }
    }

    // ===== NEW: Method to get college details by code =====
    static async getCollegeByCode(code) {
        try {
            const params = new URLSearchParams({
                action: 'colleges',
                method: 'getByCode',
                code: code
            }).toString();
            const response = await fetch(`${GAS_WEB_APP_URL}?${params}`);
            const result = await response.json();

            if (response.ok && result.success) {
                return {
                    success: true,
                    college: result.college
                };
            }
            return {
                success: false,
                error: result.error || 'Invalid response from server.'
            };
        } catch (error) {
            console.error("Fetch college by code error:", error);
            return {
                success: false,
                error: 'A network error occurred.'
            };
        }
    }
    // ===== NEW: Method to notify Super Admin =====
    static async notifyAdminForCollege(requesterName, requesterRole, requesterContext, collegeName) {
        try {
            const params = new URLSearchParams({
                action: 'notify',
                method: 'requestCollege',
                requesterName: requesterName,
                requesterRole: requesterRole,
                requesterContext: requesterContext,
                collegeName: collegeName // <--- Added: Sends college name to backend
            }).toString();

            const response = await fetch(`${GAS_WEB_APP_URL}?${params}`);
            const result = await response.json();

            if (response.ok && result.success) {
                return { success: true, message: result.message };
            }
            return { success: false, error: result.error || 'Failed to send notification.' };
        } catch (error) {
            console.error("Notify admin error:", error);
            return { success: false, error: 'A network error occurred.' };
        }
    }


    static async getAllZones() {
        try {
            const { data, error } = await supabaseClient
                .from('zones')
                .select('id, zone_name, zone_code')
                .order('zone_name');

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, zones: data };
        } catch (error) {
            return { success: false, error: 'Failed to fetch zones' };
        }
    }

    static async getCollegesByZone(zoneId) {
        try {
            const { data, error } = await supabaseClient
                .from('colleges')
                .select('*')
                .eq('zone_id', zoneId)
                .order('college_name');

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, colleges: data };
        } catch (error) {
            return { success: false, error: 'Failed to fetch colleges' };
        }
    }

    static async getAllRegistrations() {
        try {
            const { data, error } = await supabaseClient
                .from('registrations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, registrations: data };
        } catch (error) {
            return { success: false, error: 'Failed to fetch registrations' };
        }
    }
    // ===== NEW SUPER ADMIN METHODS =====
    static async getSuperAdminDashboardData() {
        try {
            const params = new URLSearchParams({ action: 'super_admin', method: 'getDashboardData' }).toString();
            const response = await fetch(`${GAS_WEB_APP_URL}?${params}`);
            const result = await response.json();
            if (response.ok && result.success) {
                return { success: true, data: result.data };
            }
            return { success: false, error: result.error || 'Failed to fetch dashboard data.' };
        } catch (error) {
            return { success: false, error: 'A network error occurred.' };
        }
    }

    static async updateUser(userId, role, zoneId) {
        try {
            const params = new URLSearchParams({
                action: 'super_admin',
                method: 'updateUser',
                userId: userId,
                role: role,
                zoneId: zoneId || ''
            });
            const response = await fetch(`${GAS_WEB_APP_URL}?${params.toString()}`);
            const result = await response.json();
            return result; // Should return { success: true } or { success: false, error: ... }
        } catch (error) {
            return { success: false, error: 'A network error occurred.' };
        }
    }

    static async sendNotice(recipient, subject, message) {
        try {
            const params = new URLSearchParams({
                action: 'super_admin',
                method: 'sendNotice',
                recipient: recipient,
                subject: subject,
                message: message
            });
            const response = await fetch(`${GAS_WEB_APP_URL}?${params.toString()}`);
            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, error: 'A network error occurred.' };
        }
    }
    static async toggleCollegeStatus(collegeId, newStatus) {
        try {
            const params = new URLSearchParams({
                action: 'colleges',
                method: 'update',
                id: collegeId,
                is_active: newStatus
            }).toString();

            // Using GET as it's common in this file
            const response = await fetch(`${GAS_WEB_APP_URL}?${params}`);
            const result = await response.json();

            if (response.ok && result.success) {
                return { success: true };
            }
            return { success: false, error: result.error || 'Failed to update status.' };
        } catch (error) {
            console.error("Toggle college status error:", error);
            return { success: false, error: 'A network error occurred.' };
        }
    }
    static async recoverPassword(email) {
        try {
            const params = new URLSearchParams({
                action: 'auth',
                method: 'recoverPassword',
                email: email
            });
            // Use GET or POST; GET is fine here since we aren't sending sensitive data, we are requesting it sent to email
            const response = await fetch(`${GAS_WEB_APP_URL}?${params.toString()}`);
            return await response.json();
        } catch (error) {
            return { success: false, error: 'Network connection error' };
        }
    }

}

// ===== UTILITY FUNCTIONS =====
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('login-password');
    const toggleBtn = document.getElementById('password-toggle');

    if (!passwordInput || !toggleBtn) return;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        passwordInput.type = 'password';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// ===== AUTHENTICATION MANAGER =====
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionToken = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkExistingSession();
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));

            // Role select toggles visibility of Zone or College fields
            const roleSelect = document.getElementById('register-role');
            if (roleSelect) {
                roleSelect.addEventListener('change', () => this.updateRegistrationFormVisibility());
                this.updateRegistrationFormVisibility(); // Initial check
            }

            // NEW: Event listener for college code input
            const collegeCodeInput = document.getElementById('register-college-code');
            if (collegeCodeInput) {
                collegeCodeInput.addEventListener('blur', () => this.handleCollegeCodeBlur());
            }

            try {
                populateRegisterZones();
            } catch (_) { }
        }

        // Google login
        const googleLoginBtn = document.getElementById('google-login-btn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.handleGoogleAuth());
        }

        // Google register
        const googleRegisterBtn = document.getElementById('google-register-btn');
        if (googleRegisterBtn) {
            googleRegisterBtn.addEventListener('click', () => this.handleGoogleAuth());
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        // 1. Open "Forgot Password" Modal
        const forgotLink = document.getElementById('forgot-password-link');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('login-modal'); // Close login
                document.getElementById('forgot-modal').style.display = 'block'; // Open forgot
            });
        }

        // 2. Submit "Forgot Password" Form
        const forgotForm = document.getElementById('forgot-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('forgot-email');
                const btn = forgotForm.querySelector('button');

                if (!emailInput.value) return;

                // UI Loading State
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending...';

                try {
                    const res = await SupabaseService.recoverPassword(emailInput.value);

                    if (res.success) {
                        this.closeModal('forgot-modal');
                        flashNotification.showSuccess('Email Sent', 'Check your inbox for your password.');
                    } else {
                        flashNotification.showError('Error', res.error || 'Could not send email.');
                    }
                } catch (err) {
                    flashNotification.showError('Error', 'Something went wrong.');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        }
    }
    // ===== NEW: Handles visibility of form fields based on role =====
    updateRegistrationFormVisibility() {
        const role = document.getElementById('register-role')?.value;
        const zoneGroup = document.getElementById('zone-selector-group');
        const collegeGroup = document.getElementById('college-fields-group');
        const zoneSelect = document.getElementById('register-zone');
        const collegeCodeInput = document.getElementById('register-college-code');

        if (!zoneGroup || !collegeGroup) return;

        if (role === 'mentor') {
            zoneGroup.style.display = 'none';
            collegeGroup.style.display = 'block';
            if (zoneSelect) zoneSelect.required = false;
            if (collegeCodeInput) collegeCodeInput.required = true;
        } else if (role === 'zone_convener') {
            zoneGroup.style.display = 'block';
            collegeGroup.style.display = 'none';
            if (zoneSelect) zoneSelect.required = true;
            if (collegeCodeInput) collegeCodeInput.required = false;
        } else { // super_admin
            zoneGroup.style.display = 'none';
            collegeGroup.style.display = 'none';
            if (zoneSelect) zoneSelect.required = false;
            if (collegeCodeInput) collegeCodeInput.required = false;
        }
    }

    updateZoneVisibility() {
        const roleSelect = document.getElementById('register-role');
        const zoneSelect = document.getElementById('register-zone');
        if (!roleSelect || !zoneSelect) return;
        const zoneGroup = zoneSelect.closest('.form-group');
        const role = roleSelect.value;
        if (role === 'super_admin') {
            if (zoneGroup) zoneGroup.style.display = 'none';
            zoneSelect.required = false;
            zoneSelect.value = '';
        } else {
            if (zoneGroup) zoneGroup.style.display = '';
            zoneSelect.required = true;
        }
    }
    // ===== NEW: Fetches college data when user enters a code =====
    async handleCollegeCodeBlur() {
        const codeInput = document.getElementById('register-college-code');
        const nameInput = document.getElementById('register-college-name');
        const zoneNameInput = document.getElementById('register-zone-name');
        const collegeIdInput = document.getElementById('register-college-id');
        const loader = document.getElementById('college-loader');

        const code = codeInput.value.trim().toUpperCase();
        // Clear previous values
        nameInput.value = '';
        zoneNameInput.value = '';
        collegeIdInput.value = '';

        if (!code) return;

        try {
            if (loader) loader.style.display = 'inline';
            const response = await SupabaseService.getCollegeByCode(code);

            if (response.success && response.college) {
                nameInput.value = response.college.college_name;
                zoneNameInput.value = response.college.zone_name;
                collegeIdInput.value = response.college.id;
                flashNotification.showSuccess('Found', `${response.college.college_name}`, 2000);
            } else {
                flashNotification.showError('Not Found', response.error || 'Invalid College Code.');
            }
        } catch (error) {
            flashNotification.showError('Error', 'Could not verify college code.');
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();

        if (!email || !password) {
            flashNotification.showError('Error', 'Please fill in all fields');
            return;
        }

        // Define the form and button once to use throughout the function
        const form = e.currentTarget;
        const btn = form.querySelector('button[type="submit"]');

        try {
            // Set the button's loading state
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Logging in...';
            }
            flashNotification.showInfo('Signing in', 'Please wait while we verify your credentials...', 8000);

            const response = await SupabaseService.login(email, password);

            if (response.success) {
                this.currentUser = response.user;
                localStorage.setItem('yuva_session', JSON.stringify({
                    user: this.currentUser
                }));

                flashNotification.showSuccess('Welcome', 'You are now signed in.', 3000);
                this.closeModal('login-modal');
                this.showAdminInterface();
            } else {
                // Log the full error for debugging
                console.error('Login error details:', response.error);

                // Sanitize error message for user display
                let userMessage = 'Invalid email or password';

                // Check for specific error types
                if (response.error) {
                    const errorLower = response.error.toLowerCase();

                    if (errorLower.includes('database') || errorLower.includes('db')) {
                        userMessage = 'Service temporarily unavailable. Please try again in a moment.';
                    } else if (errorLower.includes('network') || errorLower.includes('connection')) {
                        userMessage = 'Network error. Please check your internet connection.';
                    } else if (errorLower.includes('invalid') || errorLower.includes('incorrect') || errorLower.includes('wrong')) {
                        userMessage = 'Invalid email or password';
                    } else if (errorLower.includes('not found') || errorLower.includes('no user')) {
                        userMessage = 'No account found with this email';
                    } else if (errorLower.includes('timeout')) {
                        userMessage = 'Request timed out. Please try again.';
                    }
                }

                flashNotification.showError('Login Failed', userMessage);
            }
        } catch (error) {
            // Log the full error for debugging
            console.error('Login exception:', error);
            // If any other error occurs, the 'finally' block will also run
            flashNotification.showError('Error', 'Unable to sign in. Please try again.');
        } finally {
            // This block ALWAYS runs, guaranteeing the button is reset for the next time.
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Login';
            }
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        // Collect common form data
        const formData = {
            email: document.getElementById('register-email').value.trim(),
            password: document.getElementById('register-password').value.trim(),
            full_name: document.getElementById('register-name').value.trim(),
            role: document.getElementById('register-role').value,
            zone: document.getElementById('register-zone').value,
            college_id: document.getElementById('register-college-id').value
        };

        if (!formData.email || !formData.password || !formData.full_name) {
            flashNotification.showError('Error', 'Please fill in Name, Email, and Password.');
            return;
        }

        // Role-specific validation
        if (formData.role === 'zone_convener' && !formData.zone) {
            flashNotification.showError('Error', 'A Zone must be selected for Zone Conveners.');
            return;
        }
        if (formData.role === 'mentor' && !formData.college_id) {
            flashNotification.showError('Error', 'A valid College Code is required for Mentors.');
            return;
        }


        const btn = e.currentTarget.querySelector('button[type="submit"]');
        const restoreBtn = () => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Register';
            }
        };
        const setBtn = (label, spinning) => {
            if (!btn) return;
            btn.disabled = true;
            btn.innerHTML = spinning ? `<i class="fas fa-circle-notch fa-spin"></i> ${label}` : label;
        };

        try {
            // Step 1: Check Email
            setBtn('Checking email...', true);
            const emailCheck = await SupabaseService.checkEmail(formData.email);
            if (!emailCheck.success) {
                flashNotification.showError(emailCheck.error || 'Check Failed', emailCheck.details || 'Could not verify email.');
                restoreBtn();
                return;
            }
            if (emailCheck.exists) {
                flashNotification.showWarning('Already Registered', 'This email address is already in use.');
                restoreBtn();
                return;
            }

            // Step 2: Register
            setBtn('Registering...', true);
            // The service now accepts college_id
            const response = await SupabaseService.register(formData);

            if (response.success) {
                localStorage.setItem('registrationSuccess', 'true');
                window.location.href = '/GetInvolve/UnitRegistration.html';
            } else {
                const title = response.error || 'Registration Failed';
                const message = response.details || 'An unknown error occurred.';
                flashNotification.showError(title, message, 10000);
            }
        } catch (error) {
            flashNotification.showError('Client-Side Error', error.toString(), 10000);
        } finally {
            restoreBtn();
        }
    }

    async handleGoogleAuth() {
        try {
            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                    }
                }
            });

            if (error) {
                flashNotification.showError('Google Login Failed', error.message || 'Unable to authenticate');
                return;
            }

            // On redirect back, Supabase will manage the session. We'll check it in init.
            flashNotification.showInfo('Redirecting', 'Continue with Google...');
        } catch (e) {
            flashNotification.showError('Error', 'Google authentication failed');
        }
    }

    // In the AuthManager class...

    async checkExistingSession() {
        // Get the page loader element
        const pageLoader = document.getElementById('page-loader');

        try {
            // Prefer Supabase auth session if present
            const {
                data: sessionResp
            } = await supabaseClient.auth.getSession();
            if (sessionResp && sessionResp.session && sessionResp.session.user) {
                const authUser = sessionResp.session.user;
                const email = authUser.email || (authUser.user_metadata && authUser.user_metadata.email) || '';

                // Check if email is registered in admin_users table
                let adminMatch = null;
                try {
                    const {
                        data: matchData
                    } = await supabaseClient
                        .from('admin_users')
                        .select('role, zone, college_id, full_name')
                        .eq('email', email)
                        .maybeSingle();
                    adminMatch = matchData;
                } catch (_) { }

                // If no admin record found, show access denied
                if (!adminMatch) {
                    flashNotification.showError('Access Denied', 'Your email is not registered as an admin. Please contact the administrator.');
                    // Sign out the user
                    try {
                        await supabaseClient.auth.signOut();
                    } catch (_) { }
                    this.showAccessDenied();
                    return;
                }

                this.currentUser = {
                    id: authUser.id,
                    email: email,
                    full_name: (authUser.user_metadata && (authUser.user_metadata.full_name || authUser.user_metadata.name)) || adminMatch.full_name || 'User',
                    role: adminMatch.role || 'viewer',
                    zone: adminMatch.zone || '',
                    college_id: adminMatch.college_id || null
                };
                this.showAdminInterface();
                return; // Exit after successful session check
            }

            // Fallback to legacy local storage session
            const sessionData = localStorage.getItem('yuva_session');
            if (sessionData) {
                const {
                    user
                } = JSON.parse(sessionData);
                if (user) {
                    this.currentUser = user;
                    this.showAdminInterface();
                    return; // Exit after successful session check
                }
            }

            // If no session is found, show access denied
            this.showAccessDenied();

        } catch (error) {
            // In case of an error during session check, still show access denied
            console.error("Session check failed:", error);
            this.showAccessDenied();
        } finally {
            // **THIS IS THE KEY FIX**
            // This block will always run after the session check is complete,
            // hiding the loader and revealing the correct content.
            if (pageLoader) {
                pageLoader.style.display = 'none';
            }
        }
    }

    showAdminInterface() {
        document.getElementById('access-denied').style.display = 'none';
        document.getElementById('zone-section').style.display = 'block';

        // --- NEW CODE ---
        // Remove the logged-out class so buttons behave normally for admins
        document.body.classList.remove('logged-out-state');

        // Get header elements
        const loginBtn = document.getElementById('login-btn');
        const pageTitle = document.querySelector('.page-title');

        // Logged-in state: Hide login, HIDE title, show toggles
        if (loginBtn) loginBtn.style.display = 'none';
        if (pageTitle) pageTitle.style.display = 'none';

        // Show ONLY the admin toggle button
        document.querySelectorAll('.toggle-btn').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.hamburger-menu').forEach(el => el.style.display = 'none');
        // --- END THE FIX ---

        // Update user info
        if (this.currentUser) {
            document.getElementById('admin-name').textContent = this.currentUser.full_name;
            document.getElementById('admin-role').textContent = this.currentUser.role;
        }

        // Initialize zone management, scoping to allowed zone for zone conveners
        try {
            const role = (this.currentUser && this.currentUser.role) || 'viewer';
            const allowedZoneId = (role === 'zone_convener' && this.currentUser && this.currentUser.zone) ? this.currentUser.zone : null;
            zoneManager.init({ allowedZoneId });
        } catch (_) {
            zoneManager.init();
        }

        // Apply permissions based on role
        this.applyRolePermissions();
    }

    showAccessDenied() {
        document.getElementById('access-denied').style.display = 'block';
        document.getElementById('zone-section').style.display = 'none';

        // --- NEW CODE ---
        // Add the class that triggers the CSS media query we added in Step 1
        document.body.classList.add('logged-out-state');

        // Get header elements
        const loginBtn = document.getElementById('login-btn');
        const pageTitle = document.querySelector('.page-title');
        const toggles = document.querySelectorAll('.toggle-btn, .hamburger-menu');

        // Logged-out state: Show login, hide title
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (pageTitle) pageTitle.style.display = 'none';

        // *** CHANGED HERE *** // Instead of setting display='none', we clear inline styles 
        // so the CSS media query can decide whether to hide them or not.
        toggles.forEach(el => el.style.display = '');
        // --- END NEW CODE ---
    }

    applyRolePermissions() {
        const role = (this.currentUser && this.currentUser.role) || 'viewer';
        const isSuperAdmin = role === 'super_admin';
        const isZoneConvener = role === 'zone_convener';
        const isMentor = role === 'mentor';
        const isAdmin = isSuperAdmin || isZoneConvener || isMentor;

        // Elements
        const exportAllBtn = document.getElementById('export-all-btn');
        const generateReportBtn = document.getElementById('generate-report-btn');
        const addCollegeBtn = document.getElementById('add-college-btn-global');
        const notifyAdminBtn = document.getElementById('notify-admin-btn');
        const sheetConfigSection = document.querySelector('.sheet-config');

        const superAdminPanel = document.getElementById('super-admin-panel');
        if (superAdminPanel) {
            if (isSuperAdmin) {
                superAdminPanel.style.display = 'block';
                // Initialize the dashboard loading process
                // loadSuperAdminDashboard();
            } else {
                superAdminPanel.style.display = 'none';
            }
        }

        if (!isAdmin) {
            // Hide all admin controls for non-admins
            if (exportAllBtn) exportAllBtn.style.display = 'none';
            if (generateReportBtn) generateReportBtn.style.display = 'none';
            if (addCollegeBtn) addCollegeBtn.style.display = 'none';
            if (notifyAdminBtn) notifyAdminBtn.style.display = 'none';
            if (sheetConfigSection) sheetConfigSection.style.display = 'none';
        } else {
            // General admin controls
            if (exportAllBtn) exportAllBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
            if (generateReportBtn) generateReportBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
            if (sheetConfigSection) sheetConfigSection.style.display = isSuperAdmin ? 'block' : 'none';

            // ===== REVISED LOGIC FOR COLLEGE BUTTONS =====
            // "Add College" button is ONLY for Super Admin
            if (addCollegeBtn) {
                addCollegeBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
            }
            // "Notify Admin" button is for Zone Conveners and Mentors
            if (notifyAdminBtn) {
                notifyAdminBtn.style.display = (isZoneConvener || isMentor) ? 'inline-flex' : 'none';
            }
        }
    }

    async logout() {
        this.currentUser = null;
        localStorage.removeItem('yuva_session');
        await supabaseClient.auth.signOut();

        // THIS IS THE KEY FIX: Force a page reload to clear all cached data.
        window.location.reload();

        // The lines below are no longer strictly necessary but can be kept
        this.showAccessDenied();
        flashNotification.showInfo('Logged Out', 'You have been logged out successfully');
    }

    closeModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) el.style.display = 'none';
        // Ensure scrolling is restored after closing any modal
        document.body.classList.remove('modal-open');
    }
}

// ===== ZONE MANAGER =====
class ZoneManager {
    constructor() {
        this.currentZone = null;
        this.zones = [];
        this.colleges = [];
        this._eventsBound = false;
        this._allowedZoneId = null;
    }

    async init(opts) {
        this._allowedZoneId = (opts && opts.allowedZoneId) ? Number(opts.allowedZoneId) : null;
        await this.loadZones();
        this.bindEvents();
    }

    async loadZones() {
        try {
            const response = await SupabaseService.getAllZones();
            if (response.success) {
                // If an allowed zone is specified (zone convener), restrict view to that zone only
                if (this._allowedZoneId) {
                    this.zones = (response.zones || []).filter(z => Number(z.id) === Number(this._allowedZoneId));
                } else {
                    this.zones = response.zones;
                }
                this.renderZoneButtons();
                // If a zone convener sees only one zone, tailor the header copy and hide zone switcher UI
                try {
                    if (this._allowedZoneId && this.zones.length === 1) {
                        const zh = document.querySelector('.zone-header h3');
                        const zs = document.querySelector('.zone-header p');
                        const zb = document.querySelector('.zone-buttons');
                        const hint = document.getElementById('zone-select-message');
                        if (zh) zh.textContent = `${this.zones[0].zone_name} Management`;
                        if (zs) zs.textContent = `Manage colleges and registrations in ${this.zones[0].zone_name}`;
                        if (zb) zb.style.display = 'none';
                        if (hint) hint.style.display = 'none';
                    }
                } catch (_) { }
                // Auto-select the allowed zone for convenience
                if (this._allowedZoneId && this.zones.length === 1) {
                    await this.selectZone(this.zones[0]);
                }
            } else {
                flashNotification.showError('Error', response.error || 'Failed to load zones');
            }
        } catch (error) {
            flashNotification.showError('Error', 'Failed to load zones');
        }
    }

    renderZoneButtons() {
        const zoneButtons = document.querySelector('.zone-buttons');
        if (!zoneButtons) return;

        zoneButtons.innerHTML = '';

        this.zones.forEach(zone => {
            const button = document.createElement('button');
            button.textContent = zone.zone_name;
            button.setAttribute('data-zone', zone.zone_code);
            button.addEventListener('click', () => this.selectZone(zone));
            zoneButtons.appendChild(button);
        });

        // Also populate register-zone select if present
        const registerZone = document.getElementById('register-zone');
        if (registerZone) {
            // Registration dropdown should ALWAYS list all zones, regardless of logged-in role
            const populate = (zonesList) => {
                registerZone.innerHTML = '<option value="">Select Zone</option>';
                (zonesList || []).forEach(z => {
                    const opt = document.createElement('option');
                    opt.value = z.id;
                    opt.textContent = z.zone_name;
                    registerZone.appendChild(opt);
                });
            };
            try {
                SupabaseService.getAllZones().then(full => {
                    if (full && full.success && Array.isArray(full.zones)) {
                        populate(full.zones);
                    } else {
                        populate(this.zones);
                    }
                }).catch(() => populate(this.zones));
            } catch (_) {
                populate(this.zones);
            }
        }
    }

    async selectZone(zone) {
        this.currentZone = zone;

        // Update active button
        document.querySelectorAll('.zone-buttons button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-zone="${zone.zone_code}"]`).classList.add('active');

        setZoneStatsLoading(true);
        renderCollegeGridSkeleton();
        document.getElementById('zone-select-message').style.display = 'none';

        // --- ADD THIS LINE ---
        document.getElementById('search-container').style.display = 'block';

        await this.loadColleges(zone.id);

        this.showZoneStats();
        setZoneStatsLoading(false);
    }

    async loadColleges(zoneId) {
        try {
            // skeleton is already rendered in selectZone; keep UI snappy
            const response = await SupabaseService.getCollegesByZone(zoneId);
            if (response.success) {
                this.colleges = response.colleges || [];
                // Replace manual total_members with live counts from registrations table
                try {
                    await Promise.all(this.colleges.map(async (c) => {
                        if (!c || !c.id) return;
                        c.total_members = await countRegistrations(c.id);
                        // Also compute units per college for accurate zone aggregation
                        try {
                            c.units_count = await getCollegeUnitsCount(c.id);
                        } catch (_) {
                            c.units_count = 0;
                        }
                    }));
                } catch (_) { }
                this.renderColleges();
            } else {
                flashNotification.showError('Error', response.error || 'Failed to load colleges');
            }
        } catch (error) {
            flashNotification.showError('Error', 'Failed to load colleges');
        }
    }

    // In unit.js, find the ZoneManager class and replace the entire renderColleges function.

    renderColleges() {
        const collegeGrid = document.getElementById('college-grid');
        if (!collegeGrid) return;

        collegeGrid.innerHTML = '';

        const currentUserRole = (authManager.currentUser && authManager.currentUser.role) || 'viewer';
        const canManage = currentUserRole === 'super_admin' || currentUserRole === 'zone_convener';
        const isSuperAdmin = currentUserRole === 'super_admin'; // <-- NEW: Check for Super Admin

        this.colleges.forEach((college, idx) => {
            const card = document.createElement('div');
            card.className = 'college-card reveal';
            card.dataset.collegeId = college.id;
            card.style.animationDelay = `${60 + idx * 50}ms`;

            // --- START of MODIFIED code ---
            let cardActionsHTML = '';
            if (canManage) {
                // Determine status class and title for the indicator
                const statusClass = college.is_active ? 'active' : 'inactive';
                const statusTitle = college.is_active ? 'College is Active' : 'College is Inactive';

                // Build the HTML for the status indicator and delete button
                let statusIndicatorHTML = '';
                const deleteButtonHTML = `<button class="college-delete-btn" title="Delete College"><i class="fas fa-trash"></i></button>`;

                if (isSuperAdmin) {
                    // Super Admins get a clickable button to toggle status
                    const newStatusText = college.is_active ? 'Inactive' : 'Active';
                    statusIndicatorHTML = `<button class="college-status-indicator college-status-toggle ${statusClass}" title="Click to change status to ${newStatusText}"></button>`;
                } else {
                    // Other managers just see the status
                    statusIndicatorHTML = `<div class="college-status-indicator ${statusClass}" title="${statusTitle}"></div>`;
                }

                cardActionsHTML = `
                    <div class="college-card-actions">
                        ${statusIndicatorHTML}
                        ${deleteButtonHTML}
                    </div>
                `;
            }
            // --- END of MODIFIED code ---

            card.innerHTML = `
                <h3>${college.college_name}</h3>
                <div class="college-code">${college.college_code}</div>
                <div class="college-members">
                    <i class="fas fa-users"></i>
                    <span>${(college.total_members || 0)} Members</span>
                </div>
                <div class="college-units">
                    <i class="fas fa-layer-group"></i>
                    <span>${(college.units_count || 0)} Units</span>
                </div>
                ${cardActionsHTML} 
            `;
            card.addEventListener('click', () => {
                if (college.is_active) {
                    this.showCollegeDetails(college);
                } else {
                    flashNotification.showWarning(
                        'College Inactive',
                        'This college is inactive. Please contact the Super Admin for assistance.'
                    );
                }
            });

            if (canManage) {
                card.querySelector('.college-delete-btn')?.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const ok = await showConfirmDialog({
                        title: 'Delete college',
                        message: `Delete ${college.college_name}? This action cannot be undone.`,
                        confirmText: 'Delete',
                        cancelText: 'Cancel',
                        variant: 'error'
                    });
                    if (!ok) return;
                    try {
                        const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                        const { error } = await supa.rpc('delete_college', { p_id: college.id });
                        if (error) {
                            if (String(error.message).includes('college_has_members')) {
                                flashNotification.showWarning('Cannot delete', 'Remove all members first.');
                                return;
                            }
                            throw new Error(error.message || 'Delete failed');
                        }
                        flashNotification.showSuccess('Deleted', 'College removed.');
                        await this.loadColleges(this.currentZone.id);
                        this.showZoneStats();
                    } catch (err) {
                        flashNotification.showError('Failed', err && err.message ? err.message : 'Unable to delete college');
                    }
                });

                // --- NEW: Event listener for toggling college active status (Super Admin only) ---
                if (isSuperAdmin) {
                    card.querySelector('.college-status-toggle')?.addEventListener('click', async (e) => {
                        e.stopPropagation(); // Stop the card click event
                        const statusBtn = e.currentTarget; // <-- MOVED HERE

                        const currentStatus = college.is_active;
                        const newStatus = !currentStatus;
                        const actionText = newStatus ? 'Activate' : 'Deactivate';

                        const ok = await showConfirmDialog({
                            title: `${actionText} College`,
                            message: `Are you sure you want to ${actionText.toLowerCase()} ${college.college_name}?`,
                            confirmText: actionText,
                            cancelText: 'Cancel',
                            variant: newStatus ? 'success' : 'warning'
                        });

                        if (!ok) return;

                        // const statusBtn = e.currentTarget; // <-- REMOVED FROM HERE
                        statusBtn.disabled = true; // Show loading state

                        try {
                            const response = await SupabaseService.toggleCollegeStatus(college.id, newStatus);

                            if (response.success) {
                                flashNotification.showSuccess('Status Updated', `${college.college_name} is now ${newStatus ? 'active' : 'inactive'}.`);
                                // Refresh the college list to show the change
                                await this.loadColleges(this.currentZone.id);
                                this.showZoneStats(); // Update stats (active units)
                            } else {
                                flashNotification.showError('Update Failed', response.error || 'Could not update status.');
                                statusBtn.disabled = false; // Re-enable on failure
                            }
                        } catch (err) {
                            flashNotification.showError('Error', 'A network error occurred.');
                            statusBtn.disabled = false; // Re-enable on failure
                        }
                    });
                }
                // --- END NEW ---
            }
            collegeGrid.appendChild(card);
            setTimeout(() => card.classList.add('show'), 30);
        });

        if (this.colleges.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'background:#fff;border:2px solid var(--gray-200);border-radius:16px;padding:24px;text-align:center;color:var(--gray-600)';
            empty.textContent = 'No colleges in this zone yet.';
            collegeGrid.appendChild(empty);
        }
    }

    findAndHighlightCollege(searchTerm) {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) return;

        // Find the first matching college in the data
        const targetCollege = this.colleges.find(college =>
            college.college_name.toLowerCase().includes(normalizedSearch) ||
            college.college_code.toLowerCase().includes(normalizedSearch)
        );

        if (targetCollege) {
            const card = document.querySelector(`.college-card[data-college-id="${targetCollege.id}"]`);
            if (card) {
                // Scroll the card into view
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Apply the highlight animation class
                card.classList.add('highlight');

                // Remove the highlight class after the 2-second animation finishes
                setTimeout(() => {
                    card.classList.remove('highlight');
                }, 2000); // <-- This value is now 2000ms (2 seconds)
            }
        }
    }

    showZoneStats() {
        const zoneStats = document.getElementById('zone-stats');
        if (!zoneStats) return;

        const totalColleges = this.colleges.length;
        const totalMembers = this.colleges.reduce((sum, college) => sum + (college.total_members || 0), 0);

        // --- MODIFIED LINE ---
        // Filters colleges to count only active ones for the 'Active Units' stat.
        const activeUnitsCount = this.colleges.filter(college => college.is_active === true).length;

        document.getElementById('total-colleges').textContent = totalColleges;
        document.getElementById('total-members').textContent = totalMembers;

        // --- MODIFIED LINE ---
        // Displays the new count of only active colleges.
        document.getElementById('active-units').textContent = activeUnitsCount;

        document.getElementById('last-sync').textContent = new Date().toLocaleTimeString();
        zoneStats.style.display = 'block';
    }

    showCollegeDetails(college) {
        // Render the embedded dashboard instead of redirect
        const dashboard = document.getElementById('college-dashboard');
        const zoneSection = document.getElementById('zone-section');
        if (!dashboard) return;
        if (zoneSection) zoneSection.style.display = 'none';
        document.getElementById('login-btn').style.display = 'none';
        dashboard.style.display = 'block';
        // Reset members list UI to avoid showing previous college data
        const membersContainer = document.getElementById('cd-members-list');
        if (membersContainer) {
            membersContainer.innerHTML = '';
            membersContainer.dataset.collegeId = String(college.id);
        }
        // Track the active college globally for safety
        window.__yuvaActiveCollegeId = college.id;
        loadCollegeDashboard(college.id);
        // Tip to load members
        flashNotification.showInfo('Tip', 'For members list, click "Load Members"');
        // Back button handler
        const backBtn = document.getElementById('cd-back-btn');
        if (backBtn) backBtn.onclick = () => {
            dashboard.style.display = 'none';
            if (zoneSection) zoneSection.style.display = 'block';
            document.getElementById('login-btn').style.display = 'inline-flex';
            // Refresh zone cards and stats so counts reflect any changes
            try {
                if (zoneManager && zoneManager.currentZone) {
                    zoneManager.loadColleges(zoneManager.currentZone.id).then(() => {
                        zoneManager.showZoneStats();
                    });
                }
            } catch (_) { }
        };
        const exportBtn = document.getElementById('cd-export-btn');
        if (exportBtn) exportBtn.onclick = () => exportCollegeCSV(college.id);

        // Add member inside dashboard pre-fills selected college
        const cdAdd = document.getElementById('cd-add-member');
        if (cdAdd) cdAdd.onclick = () => openMemberModal({ college_id: college.id, zone_id: this.currentZone ? this.currentZone.id : undefined });

        // Enable header Delete College now that a specific college is selected
        const addMemberGlobal = document.getElementById('add-member-btn-global');
        if (addMemberGlobal) {
            addMemberGlobal.disabled = false;
            addMemberGlobal.title = '';
            addMemberGlobal.textContent = 'Delete College';
        }
    }

    // ===== REPLACE THIS ENTIRE METHOD INSIDE ZoneManager CLASS =====
    bindEvents() {
        if (this._eventsBound) return;

        // --- SEARCH LOGIC ---
        const searchInput = document.getElementById('college-search-input');
        const searchBtn = document.getElementById('college-search-btn');
        const suggestionsContainer = document.getElementById('search-suggestions');
        const noResultsMessage = document.getElementById('no-results-message');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.trim().toLowerCase();
                suggestionsContainer.innerHTML = '';

                if (searchTerm === '') {
                    suggestionsContainer.style.display = 'none';
                    noResultsMessage.style.display = 'none';
                    return;
                }

                const matchingColleges = this.colleges.filter(college =>
                    college.college_name.toLowerCase().includes(searchTerm) ||
                    college.college_code.toLowerCase().includes(searchTerm)
                );

                if (matchingColleges.length > 0) {
                    matchingColleges.forEach(college => {
                        const item = document.createElement('div');
                        item.className = 'suggestion-item';
                        item.textContent = `${college.college_name} (${college.college_code})`;

                        item.addEventListener('click', () => {
                            searchInput.value = college.college_name;
                            suggestionsContainer.style.display = 'none';
                            noResultsMessage.style.display = 'none';
                            this.findAndHighlightCollege(college.college_name);
                        });
                        suggestionsContainer.appendChild(item);
                    });
                    suggestionsContainer.style.display = 'block';
                    noResultsMessage.style.display = 'none';
                } else {
                    suggestionsContainer.style.display = 'none';
                    noResultsMessage.style.display = 'block';
                }
            });

            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target)) {
                    suggestionsContainer.style.display = 'none';
                }
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.findAndHighlightCollege(searchInput.value);
                    suggestionsContainer.style.display = 'none';
                    noResultsMessage.style.display = 'none';
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.findAndHighlightCollege(searchInput.value);
                suggestionsContainer.style.display = 'none';
                noResultsMessage.style.display = 'none';
            });
        }

        // --- EXPORT BUTTONS ---
        const exportAllBtn = document.getElementById('export-all-btn');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => this.exportAllData());
        }

        this.bindSheetConfigEvents();

        const generateReportBtn = document.getElementById('generate-report-btn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }

        // --- DELETE COLLEGE BUTTON ---
        const addMemberGlobal = document.getElementById('add-member-btn-global');
        if (addMemberGlobal) {
            addMemberGlobal.textContent = 'Delete College';
            addMemberGlobal.title = 'Delete currently selected college';
            addMemberGlobal.addEventListener('click', async (e) => {
                e.preventDefault();
                const collegeId = window.__yuvaActiveCollegeId;

                if (!collegeId) {
                    flashNotification.showInfo('Action Required', 'Please click on a college card to select it first.');
                    return;
                }

                const ok = await showConfirmDialog({
                    title: 'Delete college',
                    message: 'Are you sure you want to delete this college? This action cannot be undone.',
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    variant: 'error'
                });
                if (!ok) return;
                try {
                    const memberCount = await countRegistrations(collegeId);
                    if (memberCount > 0) {
                        flashNotification.showWarning('Cannot delete', 'Remove or reassign all members before deleting this college.');
                        return;
                    }
                    const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    const { error } = await supa.from('colleges').delete().eq('id', collegeId);
                    if (error) throw new Error(error.message || 'Delete failed');
                    flashNotification.showSuccess('Deleted', 'College removed successfully.');
                    window.__yuvaActiveCollegeId = null;
                    const dashboard = document.getElementById('college-dashboard');
                    const zoneSection = document.getElementById('zone-section');
                    if (dashboard && zoneSection) {
                        dashboard.style.display = 'none';
                        zoneSection.style.display = 'block';
                    }
                    if (zoneManager && zoneManager.currentZone) {
                        await zoneManager.loadColleges(zoneManager.currentZone.id);
                        zoneManager.showZoneStats();
                    }
                } catch (err) {
                    flashNotification.showError('Failed', err && err.message ? err.message : 'Unable to delete college');
                }
            });
        }

        const addCollegeBtn = document.getElementById('add-college-btn-global');
        if (addCollegeBtn) {
            addCollegeBtn.addEventListener('click', () => openCollegeModal());
        }

        // --- NOTIFICATION BUTTON (SINGLE LISTENER NOW) ---
        const notifyAdminBtn = document.getElementById('notify-admin-btn');
        if (notifyAdminBtn) {
            // Remove any old listeners if possible (though replacing the function handles it better)
            const newBtn = notifyAdminBtn.cloneNode(true);
            notifyAdminBtn.parentNode.replaceChild(newBtn, notifyAdminBtn);

            newBtn.addEventListener('click', () => {
                const modal = document.getElementById('request-college-modal');
                if (modal) {
                    const form = document.getElementById('request-college-form');
                    if (form) form.reset();
                    modal.style.display = 'block';
                    document.body.classList.add('modal-open');
                }
            });
        }

        // --- REQUEST FORM SUBMISSION ---
        const requestForm = document.getElementById('request-college-form');
        if (requestForm) {
            // Use cloneNode to strip old listeners here too, just in case
            const newForm = requestForm.cloneNode(true);
            requestForm.parentNode.replaceChild(newForm, requestForm);

            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = authManager.currentUser;
                const nameInput = document.getElementById('req-college-name');
                const collegeName = nameInput.value.trim();
                // We must re-query the button since we cloned the form
                const btn = newForm.querySelector('button[type="submit"]');

                if (!user) {
                    flashNotification.showError('Error', 'User session not found.');
                    return;
                }

                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending...';

                try {
                    const context = zoneManager.currentZone ? `Zone: ${zoneManager.currentZone.zone_name}` : 'Dashboard';
                    const response = await SupabaseService.notifyAdminForCollege(user.full_name, user.role, context, collegeName);

                    if (response.success) {
                        document.getElementById('request-college-modal').style.display = 'none';
                        document.body.classList.remove('modal-open');
                        flashNotification.showSuccess('Request Sent', `Admin notified to add "${collegeName}".`);
                    } else {
                        flashNotification.showError('Failed', response.error || 'Could not send notification.');
                    }
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        }

        this._eventsBound = true;
    }

    bindSheetConfigEvents() {
        // Only bind events if user is super admin
        if (!this.isSuperAdmin()) {
            return;
        }

        // Load existing sheet ID on page load
        this.loadSheetConfig();

        // Save sheet ID button
        const saveBtn = document.getElementById('save-sheet-id');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSheetConfig());
        }

        // Test sheet ID button
        const testBtn = document.getElementById('test-sheet-id');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testSheetConfig());
        }

        // Auto-save on Enter key
        const sheetIdInput = document.getElementById('sheet-id-input');
        if (sheetIdInput) {
            sheetIdInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveSheetConfig();
                }
            });
        }
    }

    isSuperAdmin() {
        return authManager && authManager.currentUser && authManager.currentUser.role === 'super_admin';
    }

    loadSheetConfig() {
        // Security check: Only super admin can access sheet configuration
        if (!this.isSuperAdmin()) {
            return;
        }

        const sheetIdInput = document.getElementById('sheet-id-input');
        const statusDiv = document.getElementById('sheet-status');

        if (!sheetIdInput || !statusDiv) return;

        // Try to load from localStorage
        const savedId = localStorage.getItem('yuva_sheet_id');
        if (savedId) {
            sheetIdInput.value = savedId;
            this.updateSheetStatus('Sheet ID loaded from storage', 'info');
        } else {
            this.updateSheetStatus('No sheet ID configured. Please enter your Google Sheet ID.', 'warning');
        }
    }

    saveSheetConfig() {
        // Security check: Only super admin can save sheet configuration
        if (!this.isSuperAdmin()) {
            flashNotification.showError('Access Denied', 'Only Super Admin can configure Google Sheets.');
            return;
        }

        const sheetIdInput = document.getElementById('sheet-id-input');
        if (!sheetIdInput) return;

        const sheetId = sheetIdInput.value.trim();
        if (!sheetId) {
            this.updateSheetStatus('Please enter a valid Google Sheet ID', 'error');
            return;
        }

        // Validate sheet ID format (basic check)
        if (!/^[a-zA-Z0-9_-]+$/.test(sheetId)) {
            this.updateSheetStatus('Invalid sheet ID format. Please check your Google Sheet URL.', 'error');
            return;
        }

        // Save to localStorage
        localStorage.setItem('yuva_sheet_id', sheetId);

        // Update export button data attribute
        const exportBtn = document.getElementById('export-all-btn');
        if (exportBtn) {
            exportBtn.dataset.sheetId = sheetId;
        }

        this.updateSheetStatus('Sheet ID saved successfully!', 'success');
        flashNotification.showSuccess('Configuration Saved', 'Google Sheet ID has been configured for exports.');
    }

    async testSheetConfig() {
        // Security check: Only super admin can test sheet configuration
        if (!this.isSuperAdmin()) {
            flashNotification.showError('Access Denied', 'Only Super Admin can test Google Sheets configuration.');
            return;
        }

        const sheetIdInput = document.getElementById('sheet-id-input');
        if (!sheetIdInput) return;

        const sheetId = sheetIdInput.value.trim();
        if (!sheetId) {
            this.updateSheetStatus('Please enter a sheet ID first', 'error');
            return;
        }

        this.updateSheetStatus('Testing sheet access...', 'info');

        try {
            // Test by trying to export with the sheet ID
            const testUrl = `${GAS_WEB_APP_URL}?action=reports&method=export&format=sheets&sheetId=${encodeURIComponent(sheetId)}&source=base`;
            const response = await fetch(testUrl, { method: 'GET' });
            const result = await response.json();

            if (result && result.success) {
                this.updateSheetStatus('✓ Sheet access confirmed! Export will work.', 'success');
                flashNotification.showSuccess('Test Passed', 'Your Google Sheet is accessible and ready for exports.');
            } else {
                this.updateSheetStatus(`✗ Test failed: ${result.error || 'Unknown error'}`, 'error');
                flashNotification.showError('Test Failed', result.error || 'Unable to access the specified Google Sheet');
            }
        } catch (error) {
            this.updateSheetStatus('✗ Test failed: Network error', 'error');
            flashNotification.showError('Test Failed', 'Network error while testing sheet access');
        }
    }

    updateSheetStatus(message, type) {
        // Security check: Only super admin can update sheet status
        if (!this.isSuperAdmin()) {
            return;
        }

        const statusDiv = document.getElementById('sheet-status');
        if (!statusDiv) return;

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        statusDiv.textContent = message;
        statusDiv.style.color = colors[type] || colors.info;
        statusDiv.style.fontWeight = type === 'error' ? 'bold' : 'normal';
    }

    async exportAllData() {
        // Super admin only guard (UI already hides it, but double-check)
        if (!authManager || !authManager.currentUser || authManager.currentUser.role !== 'super_admin') {
            flashNotification.showWarning('Not allowed', 'Only Super Admin can export all data.');
            return;
        }

        const exportBtn = document.getElementById('export-all-btn');
        if (!exportBtn) return;

        // Store original button content
        const originalContent = exportBtn.innerHTML;
        const originalDisabled = exportBtn.disabled;

        // Set loading state
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Exporting...';

        try {
            flashNotification.showInfo('Export', 'Exporting data to Google Sheets...');

            // Get the configured sheet ID from multiple sources
            const configuredId = (exportBtn.dataset && exportBtn.dataset.sheetId) ?
                exportBtn.dataset.sheetId.trim() :
                (localStorage.getItem('yuva_sheet_id') || '1uEGAMh4_UDQ_DlmQLQjUOV8cQT0C_DkizHooI37CsJs').trim();

            // Use the exact same URL parameters that work when manually accessing the browser
            const exportUrl = `${GAS_WEB_APP_URL}?action=reports&method=export&format=sheets&sheetId=${encodeURIComponent(configuredId)}`;

            try {
                const resp = await fetch(exportUrl, { method: 'GET' });
                const json = await resp.json();

                if (json && json.success && json.url) {
                    flashNotification.showSuccess('Exported', 'Data exported to Google Sheets. Opening sheet...');
                    window.open(json.url, '_blank');
                } else {
                    // Try fallback with source=base if the first attempt fails
                    const fallbackUrl = `${GAS_WEB_APP_URL}?action=reports&method=export&format=sheets&sheetId=${encodeURIComponent(configuredId)}&source=base`;

                    const fallbackResp = await fetch(fallbackUrl, { method: 'GET' });
                    const fallbackJson = await fallbackResp.json();

                    if (fallbackJson && fallbackJson.success && fallbackJson.url) {
                        flashNotification.showSuccess('Exported', 'Data exported to Google Sheets (using base tables). Opening sheet...');
                        window.open(fallbackJson.url, '_blank');
                    } else {
                        flashNotification.showError('Export Failed', `Failed to export data. Error: ${fallbackJson.error || 'Unknown error'}`);
                    }
                }
            } catch (fetchError) {
                flashNotification.showError('Network Error', 'Unable to connect to export service. Please check your internet connection.');
            }
        } catch (e) {
            flashNotification.showError('Error', 'Unable to export to Google Sheets');
        } finally {
            // Restore original button state
            exportBtn.disabled = originalDisabled;
            exportBtn.innerHTML = originalContent;
        }
    }

    async generateReport() {
        try {
            const modal = document.getElementById('report-modal');
            if (modal) {
                // populate zones
                const select = document.getElementById('report-zone');
                if (select && select.options.length <= 1) {
                    const zones = (this.zones || []);
                    zones.forEach(z => {
                        const opt = document.createElement('option');
                        opt.value = z.id;
                        opt.textContent = z.zone_name;
                        select.appendChild(opt);
                    });
                }
                modal.style.display = 'block';
                document.body.classList.add('modal-open');
            } else {
                flashNotification.showInfo('Report', 'Opening report options...');
            }

            const runBtn = document.getElementById('report-run');
            const link = document.getElementById('report-link');
            if (runBtn) {
                runBtn.onclick = async () => {
                    const prev = { html: runBtn.innerHTML, dis: runBtn.disabled };
                    runBtn.disabled = true; runBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Generating...';
                    try {
                        const range = document.getElementById('report-range')?.value || '30d';
                        const zoneId = document.getElementById('report-zone')?.value || '';
                        const qs = new URLSearchParams({ action: 'reports', method: 'renderPdf', range, zoneId }).toString();
                        const res = await fetch(`${GAS_WEB_APP_URL}?${qs}`);
                        const json = await res.json();
                        if (json && json.success && json.url) {
                            if (link) { link.href = json.url; link.style.display = 'inline-flex'; }
                            flashNotification.showSuccess('Report Ready', 'Click Open PDF to view.');
                        } else {
                            flashNotification.showError('Failed', json && json.error ? json.error : 'Could not create PDF');
                        }
                    } catch (err) {
                        flashNotification.showError('Error', 'Network error while generating report');
                    }
                    runBtn.disabled = prev.dis; runBtn.innerHTML = prev.html;
                };
            }
        } catch (_) {
            flashNotification.showError('Report', 'Unable to open report dialog');
        }
    }
}

// ===== MODAL CONTROLS =====
async function populateRegisterZones() {
    const select = document.getElementById('register-zone');
    if (!select) return;
    const setOptions = (zones) => {
        select.innerHTML = '<option value="">Select Zone</option>';
        (zones || []).forEach(z => {
            const opt = document.createElement('option');
            opt.value = z.id;
            opt.textContent = z.zone_name;
            select.appendChild(opt);
        });
    };
    try {
        const res = await SupabaseService.getAllZones();
        if (res && res.success) { setOptions(res.zones || []); return; }
    } catch (_) { }
    // fallback to zoneManager's cached list if available
    try { setOptions((zoneManager && zoneManager.zones) ? zoneManager.zones : []); } catch (_) { }
}
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Global modal controls
document.addEventListener('DOMContentLoaded', () => {
    // *** NEW LOGIC ***
    // Check for a successful registration flag from the register page
    if (localStorage.getItem('registrationSuccess') === 'true') {
        // Show a notification prompting the user to log in
        flashNotification.showSuccess('Registration Successful!', 'Please log in to access the admin dashboard.', 8000);
        // Remove the flag so it doesn't show on subsequent page loads
        localStorage.removeItem('registrationSuccess');
    }

    // Login button event
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.style.display = 'block';
                document.body.classList.add('modal-open');
            }
        });
    }

    // Close active modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modals = Array.from(document.querySelectorAll('.modal'));
            const openModals = modals.filter(m => m.style.display === 'block');
            if (openModals.length > 0) {
                const topMost = openModals[openModals.length - 1];
                topMost.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        }
    });
});

// Initialize managers
const authManager = new AuthManager();
const zoneManager = new ZoneManager();

// ===== Embedded College Dashboard Logic =====
async function countRegistrations(collegeId) {
    try {
        const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // count by college_id as per schema
        let { count, error } = await supa
            .from('registrations')
            .select('id', { count: 'exact', head: true })
            .eq('college_id', collegeId);
        if (!error && typeof count === 'number') return count;
    } catch (_) { }
    return 0;
}
async function loadCollegeDashboard(collegeId) {
    try {
        setCdLoading(true);
        const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // Prefer view with zone information
        let { data: college, error } = await supa.from('college_details')
            .select('*')
            .eq('id', collegeId)
            .maybeSingle();
        if (error || !college) {
            const fb = await supa.from('colleges').select('*').eq('id', collegeId).maybeSingle();
            college = fb.data; // ignore fb.error, will notify below if needed
        }
        if (!college) {
            flashNotification.showError('Not Found', 'College not found');
            setCdLoading(false);
            return;
        }
        document.getElementById('cd-name').textContent = college.college_name;
        document.getElementById('cd-code').textContent = college.college_code || '-';
        document.getElementById('cd-zone').textContent = college.zone_name || college.zone_id || '-';

        // --- MODIFIED LINE ---
        // Sets the unit count to '1' only if the college's is_active status is true.
        document.getElementById('cd-units-count').textContent = college.is_active ? '1' : '0';

        document.getElementById('cd-last-updated').textContent = new Date().toLocaleString();
        // Persist current zone id for member modal fallbacks. If missing, fetch from base table
        try {
            if (college.zone_id) {
                window.__yuvaActiveZoneId = college.zone_id;
            } else {
                const { data: baseCol } = await supa
                    .from('colleges')
                    .select('zone_id')
                    .eq('id', collegeId)
                    .maybeSingle();
                if (baseCol && baseCol.zone_id) window.__yuvaActiveZoneId = baseCol.zone_id;
            }
        } catch (_) { }

        // Members count: compute live from registrations using college_id per schema
        let membersCount = await countRegistrations(collegeId);
        document.getElementById('cd-members-count').textContent = membersCount;

        // Wire load members button: ensure handler is for this college only
        const loadBtn = document.getElementById('cd-load-members');
        if (loadBtn) loadBtn.onclick = () => {
            // Guard against stale handler when switching quickly
            if (window.__yuvaActiveCollegeId !== collegeId) return;
            loadCollegeMembers(collegeId);
        };
        // Events: wire actions and load
        try {
            const refreshBtn = document.getElementById('cd-refresh-events');
            const addBtn = document.getElementById('cd-add-event');
            if (refreshBtn) refreshBtn.onclick = () => loadCollegeEvents(collegeId);
            if (addBtn) addBtn.onclick = () => openEventModal({ college_id: collegeId });
            await loadCollegeEvents(collegeId);
        } catch (_) { }
        setCdLoading(false);
    } catch (e) {
        flashNotification.showError('Error', 'Failed to load college');
        setCdLoading(false);
    }
}


async function loadCollegeMembers(collegeId) {
    try {
        const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // Show skeletons while loading
        const container = document.getElementById('cd-members-list');
        if (container) {
            container.innerHTML = '';
            const skelLeads = document.createElement('div');
            skelLeads.className = 'cd-leads';
            const skelTeam = document.createElement('div');
            skelTeam.className = 'cd-team';
            container.appendChild(skelLeads);
            container.appendChild(skelTeam);
            const makeSkel = () => {
                const s = document.createElement('div');
                s.className = 'cd-skel-card';
                s.innerHTML = `<div class="cd-skeleton cd-avatar"></div><div class="cd-skeleton cd-line"></div>`;
                return s;
            };
            skelLeads.appendChild(makeSkel());
            skelLeads.appendChild(makeSkel());
            for (let i = 0; i < 3; i++) skelTeam.appendChild(makeSkel());
        }
        let { data, error } = await supabaseClient
            .from('registrations')
            .select('id, applicant_name, created_at, applying_for, college_id, email, phone, unit_name, status')
            .eq('college_id', collegeId);
        if (error) {
            flashNotification.showError('Load failed', error.message || 'Unable to fetch members');
            return;
        }

        if (window.__yuvaActiveCollegeId !== collegeId) return;

        const dataMapped = (data || []).map(r => ({
            id: r.id,
            full_name: r.applicant_name,
            course: r.created_at ? new Date(r.created_at).toLocaleDateString() : '—',
            post: r.applying_for,
            email: r.email || '',
            phone: r.phone || '',
            unit_name: r.unit_name || '',
            status: r.status || 'pending',
            avatar_url: null
        }));

        const normalize = v => (v || '').toLowerCase();
        const isMentor = p => /\bmentor\b/.test(normalize(p)) && !/co[- ]?mentor/.test(normalize(p));
        const isCoMentor = p => /co[- ]?mentor/.test(normalize(p));
        const featured = [];
        dataMapped.forEach(m => { if (isMentor(m.post) && featured.length < 1) featured.push(m); });
        dataMapped.forEach(m => { if (isCoMentor(m.post) && featured.length < 2 && !featured.includes(m)) featured.push(m); });
        const rest = dataMapped.filter(m => !featured.includes(m));
        const ordered = [...featured, ...rest].slice(0, 12);

        container.innerHTML = '';
        container.dataset.collegeId = String(collegeId);

        if (ordered.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'grid-column: 1/-1; text-align:center; color:var(--gray-600); background:#fff; border:2px solid var(--gray-200); border-radius:12px; padding:16px';
            empty.textContent = 'No members found. Click "Load Members" again later.';
            container.appendChild(empty);
            return;
        }

        const leadsWrap = document.createElement('div');
        leadsWrap.className = 'cd-leads';
        const teamWrap = document.createElement('div');
        teamWrap.className = 'cd-team';
        container.appendChild(leadsWrap);
        container.appendChild(teamWrap);

        ordered.forEach((m, idx) => {
            const card = document.createElement('div');
            const featuredClass = idx < featured.length ? ' featured' : '';
            const statusClass = m.status === 'approved' ? ' approved' : (m.status === 'rejected' ? ' rejected' : '');
            card.className = 'cd-member-card' + featuredClass + statusClass + ' reveal';
            const dispName = m.full_name || m.name || 'Member';
            const initials = dispName.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
            const hasPhoto = !!(m.avatar_url && String(m.avatar_url).trim());
            const avatar = hasPhoto ? `<img src="${m.avatar_url}" alt="${dispName}">` : `<span class="cd-ph">${initials}</span>`;

            // Fix #3: Allow Super Admin OR Zone Convener to approve
            const currentUserRole = (authManager.currentUser && authManager.currentUser.role) || 'viewer';
            const canApprove = currentUserRole === 'super_admin' || currentUserRole === 'zone_convener';

            card.innerHTML = `<div class=\"cd-member-avatar${hasPhoto ? '' : ' placeholder'}\">${avatar}</div><div class=\"cd-member-info\"><h4>${dispName}</h4><p>${m.email || '—'}<br>${m.post || 'member'}${m.unit_name ? ' · <span class=\\"cd-unit\\">' + m.unit_name + '</span>' : ''}</p></div><div class=\"cd-member-actions\"><button class=\"cd-action-btn cd-edit\" title=\"Edit\"><i class=\"fas fa-edit\"></i></button><button class=\"cd-action-btn cd-delete\" title=\"Delete\"><i class=\"fas fa-trash\"></i></button>${canApprove ? '<button class=\"cd-action-btn cd-approve\" title=\"Approve\"><i class=\"fas fa-check\"></i></button><button class=\"cd-action-btn cd-reject\" title=\"Reject\"><i class=\"fas fa-times\"></i></button>' : ''}</div>`;

            if (idx < featured.length) {
                leadsWrap.appendChild(card);
            } else {
                teamWrap.appendChild(card);
            }
            setTimeout(() => card.classList.add('show'), 30 + idx * 20);

            card.querySelector('.cd-edit')?.addEventListener('click', () => {
                openMemberModal({
                    id: m.id,
                    applicant_name: m.full_name,
                    email: m.email || '',
                    phone: m.phone || '',
                    applying_for: m.post || 'member',
                    unit_name: m.unit_name || '',
                    status: m.status || 'pending',
                    college_id: collegeId,
                    zone_id: (zoneManager && zoneManager.currentZone ? zoneManager.currentZone.id : null)
                });
            });
            card.querySelector('.cd-delete')?.addEventListener('click', async () => {
                const ok = await showConfirmDialog({
                    title: 'Delete member',
                    message: `Are you sure you want to delete ${dispName}? This action cannot be undone.`,
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    variant: 'error'
                });
                if (!ok) return;
                await deleteMember(m.id, collegeId);
            });

            // Attach listeners if the user has permission
            if (canApprove) {
                card.querySelector('.cd-approve')?.addEventListener('click', async () => {
                    await approveRegistration(m.id, true, collegeId);
                });
                card.querySelector('.cd-reject')?.addEventListener('click', async () => {
                    await approveRegistration(m.id, false, collegeId);
                });
            }
        });

    } catch (e) {
        flashNotification.showError('Error', 'Failed to load members');
    }
}

function setCdLoading(isLoading) {
    const ids = ['cd-members-count', 'cd-units-count', 'cd-last-updated'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (isLoading) {
            el.innerHTML = '<div class="cd-skeleton cd-rect"></div>';
        }
    });
}

// ===== UI helpers for zone view =====
function setZoneStatsLoading(isLoading) {
    const ids = ['total-colleges', 'total-members', 'active-units', 'last-sync'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (isLoading) {
            el.innerHTML = '<div class="zs-skeleton zs-rect"></div>';
        }
    });
}

function renderCollegeGridSkeleton() {
    const grid = document.getElementById('college-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const s = document.createElement('div');
        s.className = 'zs-skeleton';
        s.style.cssText = 'height:120px;border-radius:16px';
        grid.appendChild(s);
    }
}

// ===== Member Modal + CRUD =====

// Configure unit field helpers in Add/Update Member modal
function setupMemberUnitHelpers() {
    const roleEl = document.getElementById('member-role');
    const unitEl = document.getElementById('member-unit');
    if (!roleEl || !unitEl) return;

    // Provide suggestions via datalist
    let dataList = document.getElementById('unit-suggestions');
    if (!dataList) {
        dataList = document.createElement('datalist');
        dataList.id = 'unit-suggestions';
        document.body.appendChild(dataList);
    }
    unitEl.setAttribute('list', 'unit-suggestions');
    const options = ['YUVA', 'Social Work', 'Academic', 'Health and Wellness', 'Social Media', 'Cultural'];
    dataList.innerHTML = options.map(o => `<option value="${o}"></option>`).join('');

    const updateRequired = () => {
        const role = (roleEl.value || '').toLowerCase();
        if (role === 'convener' || role === 'co-convener') {
            unitEl.placeholder = 'Select functional unit (e.g., Cultural)';
            unitEl.required = true;
        } else if (role === 'mentor' || role === 'co-mentor') {
            unitEl.placeholder = 'Optional for mentor roles';
            unitEl.required = false;
        } else {
            unitEl.placeholder = '';
            unitEl.required = false;
        }
    };
    updateRequired();
    roleEl.removeEventListener('change', roleEl.__yuvaUnitReqHandler || (() => { }));
    roleEl.__yuvaUnitReqHandler = updateRequired;
    roleEl.addEventListener('change', updateRequired);
}

// Compute units for a college based on fixed taxonomy and leadership presence
// Counts a unit only if the relevant leadership exists:
// - Mentor unit: at least one applying_for == 'mentor'
// - Co-mentor unit: at least one applying_for == 'co-mentor'
// - Functional units (Ramanujan, Social Work, Academic, Health and Wellness, Social Media, Cultural):
//   count if there is a Convener or Co-convener mapped to that unit
async function getCollegeUnitsCount(collegeId) {
    const normalize = (v) => (v || '').toString().trim().toLowerCase();

    // Canonical unit keys we track
    const UNIT_KEYS = [
        'mentor',
        'co-mentor',
        'yuva',
        'ramanujan',
        'social work',
        'academic',
        'health and wellness',
        'social media',
        'cultural'
    ];

    // Map various spellings to canonical functional unit keys
    const unitAliases = {
        // Treat any name starting with YUVA as the single category 'yuva'
        'yuva': 'yuva',
        'yuva unit': 'yuva',
        'yuva ramanujan': 'yuva',
        'yuva ramanujan unit': 'yuva',
        'yuva cultural': 'yuva',
        'yuva cultural unit': 'yuva',
        'yuva social work': 'yuva',
        'yuva academic': 'yuva',
        'yuva health and wellness': 'yuva',

        'yuva ramanujan': 'ramanujan',
        'ramanujan': 'ramanujan',
        'ramanuan': 'ramanujan',
        'yuva ramanuan': 'ramanujan',

        'social work': 'social work',
        'social': 'social work',

        'academic': 'academic',
        'academics': 'academic',
        'academci': 'academic',

        'health and wellness': 'health and wellness',
        'health': 'health and wellness',
        'wellness': 'health and wellness',

        'social media': 'social media',
        'media': 'social media',

        'cultural': 'cultural',
        'culture': 'cultural'
    };

    const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: rows, error } = await supa
        .from('registrations')
        .select('applying_for, unit_name')
        .eq('college_id', collegeId);
    if (error) throw error;

    // Track presence per canonical unit
    const presence = new Map();
    UNIT_KEYS.forEach(k => presence.set(k, false));

    (rows || []).forEach(r => {
        const role = normalize(r && r.applying_for);
        const rawUnit = normalize(r && r.unit_name);

        // Mentor and Co-mentor are independent units
        if (role === 'mentor') presence.set('mentor', true);
        if (role === 'co-mentor') presence.set('co-mentor', true);

        // Functional units only count when there is a Convener or Co-convener
        if (role === 'convener' || role === 'co-convener') {
            let mapped = rawUnit ? (unitAliases[rawUnit] || rawUnit) : '';
            // If name starts with 'yuva', coerce to 'yuva'
            if (mapped && /^\s*yuva\b/i.test(mapped)) mapped = 'yuva';
            if (presence.has(mapped)) presence.set(mapped, true);
        }
    });

    // Sum true values
    let count = 0;
    presence.forEach(v => { if (v) count += 1; });
    return count;
}

// ===== Events: list + CRUD =====
async function loadCollegeEvents(collegeId) {
    try {
        const up = document.getElementById('cd-upcoming-events');
        const past = document.getElementById('cd-past-events');
        if (up) up.innerHTML = '';
        if (past) past.innerHTML = '';

        const refreshBtn = document.getElementById('cd-refresh-events');
        const prev = refreshBtn ? { html: refreshBtn.innerHTML, dis: refreshBtn.disabled } : null;
        if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Refreshing'; }

        const skeleton = () => {
            const s = document.createElement('div');
            s.className = 'cd-skel-card';
            s.style.height = '84px';
            s.innerHTML = '<div class="cd-skeleton cd-line" style="width:60%"></div><div class="cd-skeleton cd-line" style="width:40%"></div>';
            return s;
        };
        for (let i = 0; i < 2; i++) { up?.appendChild(skeleton()); past?.appendChild(skeleton()); }

        const qs = new URLSearchParams({ action: 'events', method: 'listByCollege', collegeId: String(collegeId) }).toString();
        const resp = await fetch(`${GAS_WEB_APP_URL}?${qs}`);
        const json = await resp.json();

        if (!json || !json.success) {
            if (up) up.innerHTML = '';
            if (past) past.innerHTML = '';
            flashNotification.showError('Events', json && json.error ? json.error : 'Failed to load events');
            if (refreshBtn && prev) { refreshBtn.disabled = prev.dis; refreshBtn.innerHTML = prev.html; }
            return;
        }

        const now = new Date().getTime(); // Current timestamp
        const events = Array.isArray(json.events) ? json.events : [];

        // --- NEW LOGIC: Check End Date ---
        const isUpcoming = (ev) => {
            const st = String(ev.status || '').toLowerCase();
            // 1. If manually cancelled, it's neither upcoming nor past (usually hidden or in past)
            if (st === 'cancelled') return false;

            // 2. Determine the cutoff time. 
            //    If 'end_at' exists, use it. If not, use 'start_at'.
            const compareDate = ev.end_at ? ev.end_at : ev.start_at;
            const compareTime = compareDate ? new Date(compareDate).getTime() : 0;

            // 3. If the cutoff time is in the future, it is Upcoming
            return compareTime > now;
        };

        const isPast = (ev) => {
            const st = String(ev.status || '').toLowerCase();
            if (st === 'cancelled') return true; // Move cancelled items to history/past list

            // Determine cutoff time
            const compareDate = ev.end_at ? ev.end_at : ev.start_at;
            const compareTime = compareDate ? new Date(compareDate).getTime() : 0;

            // If the cutoff time has passed, it is Past
            return compareTime <= now;
        };
        // --------------------------------

        const upList = events.filter(isUpcoming);
        const pastList = events.filter(isPast);

        const render = (ev, isUpcoming) => {
            const card = document.createElement('div');
            card.className = 'cd-event-card reveal show' + (isUpcoming ? ' upcoming' : ' past');

            const startStr = ev.start_at ? new Date(ev.start_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';

            // Show end time if available
            let dateDisplay = startStr;
            if (ev.end_at) {
                // Check if end date is same day
                const sDate = new Date(ev.start_at);
                const eDate = new Date(ev.end_at);
                const sameDay = sDate.toDateString() === eDate.toDateString();
                const endStr = sameDay
                    ? eDate.toLocaleTimeString([], { timeStyle: 'short' })
                    : eDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                dateDisplay += ` - ${endStr}`;
            }

            const loc = ev.location ? `<span class="cd-ev-loc"><i class="fas fa-location-dot"></i> ${ev.location}</span>` : '';

            card.innerHTML = `
                <div class="cd-ev-body">
                    <div class="cd-ev-title">${ev.title || 'Event'}</div>
                    <div class="cd-ev-meta"><span><i class="far fa-clock"></i> ${dateDisplay}</span> ${loc}</div>
                    <div class="cd-ev-desc">${(ev.description || '').slice(0, 160)}</div>
                </div>
                <div class="cd-ev-actions">
                    <button class="btn secondary cd-ev-edit"><i class="fas fa-edit"></i></button>
                    <button class="btn secondary cd-ev-delete"><i class="fas fa-trash"></i></button>
                </div>`;

            card.querySelector('.cd-ev-edit')?.addEventListener('click', () => openEventModal({ ...ev }));
            card.querySelector('.cd-ev-delete')?.addEventListener('click', async (e) => {
                const ok = await showConfirmDialog({ title: 'Delete event', message: `Delete "${ev.title}"?`, confirmText: 'Delete', variant: 'error' });
                if (!ok) return;
                try { e.currentTarget.classList.add('animating'); } catch (_) { }
                await deleteEvent(ev.id, collegeId);
                await loadCollegeEvents(collegeId);
            });

            setTimeout(() => card.classList.add('show'), 20);
            return card;
        };

        if (up) { up.innerHTML = ''; upList.forEach(e => up.appendChild(render(e, true))); if (upList.length === 0) up.innerHTML = '<div class="cd-empty">No upcoming events</div>'; }
        if (past) { past.innerHTML = ''; pastList.forEach(e => past.appendChild(render(e, false))); if (pastList.length === 0) past.innerHTML = '<div class="cd-empty">No past events</div>'; }

        if (refreshBtn && prev) { refreshBtn.disabled = prev.dis; refreshBtn.innerHTML = prev.html; }
    } catch (err) {
        console.error(err);
        flashNotification.showError('Events', 'Failed to load events');
    }
}

function openEventModal(prefill) {
    let modal = document.getElementById('event-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'event-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" id="event-close">&times;</span>
                <h2 id="event-title">Add Event</h2>
                <form id="event-form">
                    <input type="hidden" id="event-id">
                    <input type="hidden" id="event-college-id">
                    <div class="form-group"><label>College</label><input type="text" id="event-college-display" disabled></div>
                    <div class="form-group">
                        <label>Event Banner (Max 500KB)</label>
                        <input type="file" id="event-banner-file" accept="image/*">
                        <input type="hidden" id="event-banner-url">
                        <small style="color:var(--text-secondary); display:block; margin-top:4px;">Recommended: 16:9 aspect ratio (e.g., 1280x720)</small>
                    </div>
                    <div class="form-group"><label>Title</label><input type="text" id="event-name" required></div>
                    <div class="form-group"><label>Description</label><textarea id="event-desc" rows="3"></textarea></div>
                    <div class="form-group"><label>Start</label><input type="datetime-local" id="event-start" required></div>
                    <div class="form-group"><label>End</label><input type="datetime-local" id="event-end"></div>
                    <div class="form-group"><label>Location</label><input type="text" id="event-loc"></div>
                    <div class="form-group"><label>Status</label>
                        <select id="event-status">
                            <option value="upcoming">Upcoming</option>
                            <option value="past">Past</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <button type="submit" class="btn primary" id="event-save">Save</button>
                </form>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#event-close').onclick = () => { modal.style.display = 'none'; document.body.classList.remove('modal-open'); };
        document.getElementById('event-form').addEventListener('submit', saveEventForm);
    }

    const form = document.getElementById('event-form');
    if (form) form.reset();
    const saveBtn = document.getElementById('event-save');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = 'Save'; }

    document.getElementById('event-title').textContent = prefill && prefill.id ? 'Update Event' : 'Add Event';
    document.getElementById('event-id').value = prefill.id || '';
    const activeCollegeId = prefill.college_id || window.__yuvaActiveCollegeId || '';
    document.getElementById('event-college-id').value = activeCollegeId;
    document.getElementById('event-college-display').value = document.getElementById('cd-name')?.textContent || `ID ${activeCollegeId}`;
    document.getElementById('event-banner-file').value = '';
    document.getElementById('event-banner-url').value = prefill.banner_url || '';
    document.getElementById('event-name').value = prefill.title || '';
    document.getElementById('event-desc').value = prefill.description || '';
    const toLocalISOString = (date) => { if (!date) return ''; const d = new Date(date); const tzoffset = d.getTimezoneOffset() * 60000; const localISOTime = (new Date(d - tzoffset)).toISOString().slice(0, -1); return localISOTime.slice(0, 16); };
    document.getElementById('event-start').value = toLocalISOString(prefill.start_at);
    document.getElementById('event-end').value = toLocalISOString(prefill.end_at);
    document.getElementById('event-loc').value = prefill.location || '';
    document.getElementById('event-status').value = prefill.status || 'upcoming';
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
}


// Global variable to store the newly created/updated event data temporarily
let tempEventData = null;

// NEW HELPER FUNCTION to populate category dropdowns
async function populateCategoryDropdown(selectElementId, selectedId = null) {
    const select = document.getElementById(selectElementId);
    if (!select) return;

    try {
        const { data, error } = await supabase
            .from('event_categories')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) throw error;

        select.innerHTML = '<option value="">Select Category</option>'; // Reset
        data.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id; // The value is now the ID
            option.textContent = category.name; // The text is the name
            select.appendChild(option);
        });

        if (selectedId) {
            select.value = selectedId;
        }

    } catch (error) {
        console.error('Failed to populate categories:', error);
        select.innerHTML = '<option value="">Error loading categories</option>';
    }
}

// NEW FUNCTION for the edit flow
async function manageDisplayForEvent(eventId) {
    const { data: pub, error } = await supabase
        .from('event_publications')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

    if (error) {
        flashNotification.showError('Error', 'Could not fetch event display settings.');
        return;
    }

    if (!tempEventData || tempEventData.id !== eventId) {
        const { data: ev, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError || !ev) {
            flashNotification.showError('Error', 'Could not load event data.');
            return;
        }
        tempEventData = ev;
    }

    showEventDisplayOptions(null, pub || null);
}

// MODIFIED: saveEventForm to handle create vs. update flow
async function saveEventForm(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('event-save');
    const setLoading = (on, label) => { if (!saveBtn) return; if (on) { saveBtn.dataset.prev = saveBtn.innerHTML; saveBtn.disabled = true; saveBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${label || 'Saving'}`; } else { saveBtn.disabled = false; saveBtn.innerHTML = saveBtn.dataset.prev || 'Save'; } };

    try {
        setLoading(true, 'Processing...');
        const fileInput = document.getElementById('event-banner-file');
        let bannerUrl = document.getElementById('event-banner-url').value;

        if (fileInput.files.length > 0) {
            setLoading(true, 'Uploading Image...');
            const file = fileInput.files[0];
            if (file.size > 500 * 1024) { flashNotification.showError('File too large', 'Image must be less than 500KB.'); setLoading(false); return; }
            const filePath = `event-${Date.now()}.${file.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('event-banners').upload(filePath, file);
            if (uploadError) throw new Error('Image upload failed: ' + uploadError.message);
            const { data: urlData } = supabase.storage.from('event-banners').getPublicUrl(filePath);
            bannerUrl = urlData.publicUrl;
        }

        setLoading(true, 'Saving Event...');
        const toIsoOrEmpty = (val) => { try { return val ? new Date(val).toISOString() : ''; } catch (_) { return ''; } };
        const eventId = document.getElementById('event-id').value.trim();
        const collegeId = parseInt(document.getElementById('event-college-id').value, 10) || window.__yuvaActiveCollegeId;

        const eventData = { college_id: collegeId, title: document.getElementById('event-name').value.trim(), description: document.getElementById('event-desc').value.trim(), start_at: toIsoOrEmpty(document.getElementById('event-start').value), end_at: toIsoOrEmpty(document.getElementById('event-end').value), location: document.getElementById('event-loc').value.trim(), status: document.getElementById('event-status').value, banner_url: bannerUrl };
        if (!eventData.college_id || !eventData.title || !eventData.start_at) { flashNotification.showError('Missing fields', 'Title and Start time are required'); setLoading(false); return; }

        let savedEvent;
        if (eventId) {
            const { data, error } = await supabase.from('events').update(eventData).eq('id', eventId).select().single();
            if (error) throw error;
            savedEvent = data;
        } else {
            const { data, error } = await supabase.from('events').insert([eventData]).select().single();
            if (error) throw error;
            savedEvent = data;
        }

        tempEventData = { ...savedEvent };
        document.getElementById('event-modal').style.display = 'none';
        document.body.classList.remove('modal-open');
        flashNotification.showSuccess('Saved', `Event ${eventId ? 'updated' : 'created'} successfully.`);

        const title = eventId ? "Event Updated!" : "Event Created Successfully!";
        document.getElementById('display-options-title').textContent = title;

        if (eventId) {
            await manageDisplayForEvent(savedEvent.id);
        } else {
            showEventDisplayOptions();
        }
    } catch (err) {
        console.error(err);
        flashNotification.showError('Error', err.message || 'Network error while saving event');
    } finally {
        setLoading(false);
    }
}

// Show Event Display Options Modal (Step 2)
// MODIFIED: showEventDisplayOptions to handle radio buttons and pre-selection
function showEventDisplayOptions(preselect = null, existingPublication = null) {
    const modal = document.getElementById('event-display-options-modal');
    if (!modal) return;
    const continueBtn = document.getElementById('continue-display-btn');
    const form = document.getElementById('display-options-form');
    form.reset();
    continueBtn.disabled = true;
    continueBtn.innerHTML = 'Continue';

    if (existingPublication) {
        let targetValue = null;
        if (existingPublication.display_on_home && existingPublication.display_on_upcoming) targetValue = 'both';
        else if (existingPublication.display_on_home) targetValue = 'home';
        else if (existingPublication.display_on_upcoming) targetValue = 'upcoming';
        if (targetValue) { const radio = form.querySelector(`input[value="${targetValue}"]`); if (radio) radio.checked = true; continueBtn.disabled = false; }
    }
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    form.onchange = () => { continueBtn.disabled = !form.querySelector('input:checked'); };
    continueBtn.onclick = async () => { const selected = form.querySelector('input[name="display-target"]:checked'); if (!selected) return; const choice = selected.value; if (choice === 'home') { await saveEventDisplayPreferences(true, false, {}, existingPublication); } else { closeEventDisplayModal(); setTimeout(() => showEventDetailsModal(choice, existingPublication), 200); } };
}

// MODIFIED: showEventDetailsModal to dynamically populate categories
async function showEventDetailsModal(choice, existingPublication = null) {
    const modal = document.getElementById('event-details-modal');
    if (!modal || !tempEventData) return;

    // Fetch and populate categories, pre-selecting the correct one if it exists
    await populateCategoryDropdown('event-category', existingPublication?.category_id);

    document.getElementById('detail-event-title').textContent = tempEventData.title;
    let dateTimeStr = new Date(tempEventData.start_at).toLocaleString();
    if (tempEventData.end_at) dateTimeStr += ' - ' + new Date(tempEventData.end_at).toLocaleString();
    document.getElementById('detail-event-datetime').textContent = dateTimeStr;
    document.getElementById('detail-event-location').textContent = tempEventData.location || 'TBD';

    document.getElementById('event-mode').value = existingPublication?.mode || 'offline';
    document.getElementById('event-capacity').value = existingPublication?.capacity || '';
    document.getElementById('event-banner').value = existingPublication?.banner_url || tempEventData.banner_url || '';
    document.getElementById('event-registration-url').value = existingPublication?.registration_url || '';
    document.getElementById('event-long-description').value = existingPublication?.long_description || tempEventData.description || '';

    const speakersList = document.getElementById('speakers-list');
    const speakers = (existingPublication?.speakers && Array.isArray(existingPublication.speakers)) ? existingPublication.speakers : [];
    speakersList.innerHTML = '';
    if (speakers.length > 0) {
        speakers.forEach(s => addSpeaker(s.name, s.role));
    } else {
        addSpeaker();
    }
    updateDisplaySummary(choice === 'both', choice !== 'home');
    modal.style.display = 'block';
    document.body.classList.add('modal-open');

    const form = document.getElementById('event-details-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const extendedDetails = {
            category_id: parseInt(document.getElementById('event-category').value, 10) || null,
            mode: document.getElementById('event-mode').value || null,
            capacity: parseInt(document.getElementById('event-capacity').value) || null,
            banner_url: document.getElementById('event-banner').value || tempEventData.banner_url || null,
            registration_url: document.getElementById('event-registration-url').value || null,
            long_description: document.getElementById('event-long-description').value || null,
            speakers: collectSpeakers()
        };
        const showHome = (choice === 'both');
        const showUpcoming = (choice === 'upcoming' || choice === 'both');
        await saveEventDisplayPreferences(showHome, showUpcoming, extendedDetails, existingPublication);
    };
}


// Standalone utility functions
function closeEventDisplayModal() { const modal = document.getElementById('event-display-options-modal'); if (modal) { modal.style.display = 'none'; document.body.classList.remove('modal-open'); } }
function skipEventDisplay() { closeEventDisplayModal(); if (tempEventData && tempEventData.college_id) { loadCollegeEvents(tempEventData.college_id); } tempEventData = null; }
function closeEventDetailsModal() { const modal = document.getElementById('event-details-modal'); if (modal) { modal.style.display = 'none'; document.body.classList.remove('modal-open'); } }
function goBackToDisplayOptions() { closeEventDetailsModal(); setTimeout(() => showEventDisplayOptions(null, tempEventData.publication), 300); }
function updateDisplaySummary(displayOnHome, displayOnUpcoming) { const container = document.getElementById('display-summary-content'); container.innerHTML = ''; if (displayOnHome) { container.innerHTML += '<div class="summary-badge"><i class="fas fa-home"></i> Home Page</div>'; } if (displayOnUpcoming) { container.innerHTML += '<div class="summary-badge"><i class="fas fa-calendar-alt"></i> Upcoming Events</div>'; } }
function addSpeaker(name = '', role = '') { const speakersList = document.getElementById('speakers-list'); const newSpeaker = document.createElement('div'); newSpeaker.className = 'speaker-item'; newSpeaker.innerHTML = `<input type="text" class="speaker-name" placeholder="Speaker Name" value="${name}"><input type="text" class="speaker-role" placeholder="Role/Designation" value="${role}"><button type="button" class="btn-icon remove-speaker" onclick="removeSpeaker(this)"><i class="fas fa-times"></i></button>`; speakersList.appendChild(newSpeaker); }
function removeSpeaker(button) { const speakerItem = button.closest('.speaker-item'); const speakersList = document.getElementById('speakers-list'); if (speakersList.children.length > 1) { speakerItem.remove(); } else { speakerItem.querySelector('.speaker-name').value = ''; speakerItem.querySelector('.speaker-role').value = ''; } }
function collectSpeakers() { const speakers = []; const speakerItems = document.querySelectorAll('.speaker-item'); speakerItems.forEach(item => { const name = item.querySelector('.speaker-name').value.trim(); const role = item.querySelector('.speaker-role').value.trim(); if (name) { speakers.push({ name, role: role || 'Speaker' }); } }); return speakers; }
// MODIFIED: addSpeaker to accept default values for pre-filling
function addSpeaker(name = '', role = '') {
    const speakersList = document.getElementById('speakers-list');
    const newSpeaker = document.createElement('div');
    newSpeaker.className = 'speaker-item';
    newSpeaker.innerHTML = `
        <input type="text" class="speaker-name" placeholder="Speaker Name" value="${name}">
        <input type="text" class="speaker-role" placeholder="Role/Designation" value="${role}">
        <button type="button" class="btn-icon remove-speaker" onclick="removeSpeaker(this)"><i class="fas fa-times"></i></button>
    `;
    speakersList.appendChild(newSpeaker);
}

// Save event display preferences to Supabase
// MODIFIED: saveEventDisplayPreferences to use category_id
async function saveEventDisplayPreferences(displayOnHome, displayOnUpcoming, extendedDetails = {}, existingPublication = null) {
    if (!tempEventData) return;
    const saveBtn = document.querySelector('#event-details-form button[type="submit"]') || document.getElementById('continue-display-btn');
    const setLoading = (on) => { if (!saveBtn) return; if (on) { saveBtn.dataset.prev = saveBtn.innerHTML; saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Publishing...'; } else { saveBtn.disabled = false; saveBtn.innerHTML = saveBtn.dataset.prev || 'Save'; } };

    try {
        setLoading(true);
        flashNotification.showInfo('Publishing', 'Saving display preferences...');
        const currentUserId = authManager?.currentUser?.id || null;

        const mergedDetails = {
            category_id: extendedDetails.category_id ?? existingPublication?.category_id ?? null,
            mode: extendedDetails.mode ?? existingPublication?.mode ?? null,
            capacity: extendedDetails.capacity ?? existingPublication?.capacity ?? null,
            registration_url: extendedDetails.registration_url ?? existingPublication?.registration_url ?? null,
            long_description: extendedDetails.long_description ?? existingPublication?.long_description ?? null,
            banner_url: extendedDetails.banner_url ?? existingPublication?.banner_url ?? tempEventData.banner_url,
            speakers: extendedDetails.speakers ?? existingPublication?.speakers ?? null
        };

        const { error } = await supabase.rpc('upsert_event_publication', {
            p_event_id: tempEventData.id,
            p_college_id: tempEventData.college_id,
            p_display_on_home: displayOnHome,
            p_display_on_upcoming: displayOnUpcoming,
            p_category_id: mergedDetails.category_id,
            p_mode: mergedDetails.mode,
            p_capacity: mergedDetails.capacity,
            p_registration_url: mergedDetails.registration_url,
            p_long_description: mergedDetails.long_description,
            p_speakers: mergedDetails.speakers,
            p_published_by: currentUserId
        });
        if (error) throw error;

        let message = 'Event publication settings saved!';
        if (displayOnHome && displayOnUpcoming) message = 'Published to Home Page and Upcoming Events Page.';
        else if (displayOnHome) message = 'Published to Home Page.';
        else if (displayOnUpcoming) message = 'Published to Upcoming Events Page.';
        flashNotification.showSuccess('Published!', message);

        closeEventDetailsModal();
        closeEventDisplayModal();
        if (tempEventData.college_id) await loadCollegeEvents(tempEventData.college_id);
        tempEventData = null;
    } catch (error) {
        console.error('Error saving display preferences:', error);
        flashNotification.showError('Error', error.message || 'Failed to publish event');
    } finally {
        setLoading(false);
    }
}


// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Event display workflow initialized with Supabase');
});

async function deleteEvent(id, collegeId) {
    try {
        const res = await fetch(`${GAS_WEB_APP_URL}?action=events&method=delete&id=${encodeURIComponent(String(id))}`);
        const json = await res.json();
        if (json && json.success) {
            flashNotification.showSuccess('Deleted', 'Event deleted');
            await loadCollegeEvents(collegeId);
        } else {
            flashNotification.showError('Failed', json && json.error ? json.error : 'Unable to delete');
        }
    } catch (err) {
        flashNotification.showError('Error', 'Network error while deleting event');
    }
}

function openMemberModal(prefill) {
    const modal = document.getElementById('member-modal');
    if (!modal) return;
    const memberForm = document.getElementById('member-form');
    if (memberForm) {
        memberForm.reset();
    }
    const saveBtn = document.getElementById('member-save-btn');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save';
    }
    document.getElementById('member-modal-title').textContent = prefill && prefill.id ? 'Update Member' : 'Add Member';
    document.getElementById('member-id').value = prefill.id || '';
    const resolvedCollegeId = prefill.college_id || (window.__yuvaActiveCollegeId || '');
    const resolvedZoneId = prefill.zone_id || (zoneManager && zoneManager.currentZone ? zoneManager.currentZone.id : (window.__yuvaActiveZoneId || ''));
    document.getElementById('member-college-id').value = resolvedCollegeId;
    document.getElementById('member-zone-id').value = resolvedZoneId;
    // Show display labels
    const collegeLabel = document.getElementById('member-college-display');
    const zoneLabel = document.getElementById('member-zone-display');
    if (collegeLabel) collegeLabel.value = document.getElementById('cd-name')?.textContent || `ID ${resolvedCollegeId}`;
    if (zoneLabel) zoneLabel.value = document.getElementById('cd-zone')?.textContent || `ID ${resolvedZoneId}`;
    document.getElementById('member-name').value = prefill.applicant_name || '';
    document.getElementById('member-email').value = prefill.email || '';
    document.getElementById('member-phone').value = prefill.phone || '';
    document.getElementById('member-role').value = prefill.applying_for || 'member';
    document.getElementById('member-unit').value = prefill.unit_name || '';
    // Setup unit helpers (datalist + required toggle based on role)
    try { setupMemberUnitHelpers(); } catch (_) { }

    modal.style.display = 'block';
    document.body.classList.add('modal-open');
}

// Lightweight custom confirm dialog using existing modal styles
async function showConfirmDialog(opts) {
    return new Promise((resolve) => {
        const { title, message, confirmText = 'OK', cancelText = 'Cancel', variant } = opts || {};
        let modal = document.getElementById('confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirm-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" id="confirm-close">&times;</span>
                    <h3 id="confirm-title" style="margin-top:0"></h3>
                    <p id="confirm-message" style="color:var(--gray-700)"></p>
                    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
                        <button class="btn secondary" id="confirm-cancel">${cancelText}</button>
                        <button class="btn primary" id="confirm-ok">${confirmText}</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }
        const titleEl = modal.querySelector('#confirm-title');
        const msgEl = modal.querySelector('#confirm-message');
        const okBtn = modal.querySelector('#confirm-ok');
        const cancelBtn = modal.querySelector('#confirm-cancel');
        const closeBtn = modal.querySelector('#confirm-close');
        if (titleEl) titleEl.textContent = title || 'Confirm';
        if (msgEl) msgEl.textContent = message || 'Are you sure?';
        if (okBtn) okBtn.textContent = confirmText || 'OK';
        if (cancelBtn) cancelBtn.textContent = cancelText || 'Cancel';

        // ===== MODIFIED SECTION: FIX FOR INVISIBLE BUTTON =====
        // Use correct CSS variable names and set text color to ensure visibility.
        okBtn.style.color = 'var(--white-primary)';
        if (variant === 'error') {
            okBtn.style.background = 'var(--color-error)';
            okBtn.style.borderColor = 'var(--color-error)';
        } else if (variant === 'success') {
            okBtn.style.background = 'var(--color-success)';
            okBtn.style.borderColor = 'var(--color-success)';
        } else if (variant === 'warning') {
            okBtn.style.background = 'var(--color-warning)';
            okBtn.style.borderColor = 'var(--color-warning)';
        } else {
            okBtn.style.background = 'var(--color-primary)';
            okBtn.style.borderColor = 'var(--color-primary)';
        }

        const cleanup = (val) => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
            resolve(val);
        };
        okBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
        closeBtn.onclick = () => cleanup(false);
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
    });
}

// In unit.js, replace the entire 'member-form' submit event listener.

document.getElementById('member-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        id: document.getElementById('member-id').value.trim(),
        applicant_name: document.getElementById('member-name').value.trim(),
        email: document.getElementById('member-email').value.trim(),
        phone: document.getElementById('member-phone').value.trim(),
        applying_for: document.getElementById('member-role').value,
        unit_name: document.getElementById('member-unit').value.trim(),
        // 'status' field removed from payload
        college_id: parseInt(document.getElementById('member-college-id').value, 10) || null,
        zone_id: parseInt(document.getElementById('member-zone-id').value, 10) || null
    };

    if (!payload.college_id && window.__yuvaActiveCollegeId) {
        payload.college_id = window.__yuvaActiveCollegeId;
        const hiddenCollege = document.getElementById('member-college-id');
        if (hiddenCollege) hiddenCollege.value = String(payload.college_id);
    }
    if (!payload.zone_id) {
        if (zoneManager && zoneManager.currentZone) {
            payload.zone_id = zoneManager.currentZone.id;
        } else if (window.__yuvaActiveZoneId) {
            payload.zone_id = window.__yuvaActiveZoneId;
        }
        const hiddenZone = document.getElementById('member-zone-id');
        if (hiddenZone) hiddenZone.value = String(payload.zone_id);
    }

    try {
        const roleNorm = (payload.applying_for || '').toLowerCase();
        if (!payload.unit_name) {
            if (roleNorm === 'mentor' || roleNorm === 'co-mentor') {
                payload.unit_name = roleNorm;
            } else if (roleNorm === 'convener' || roleNorm === 'co-convener') {
                payload.unit_name = 'cultural';
            }
        }
    } catch (_) { }

    if (!payload.applicant_name || !payload.email || !payload.phone || !payload.unit_name || !payload.college_id) {
        flashNotification.showError('Missing fields', 'Please fill in all required fields');
        return;
    }

    const saveBtn = document.getElementById('member-save-btn');
    const setLoading = (on, label) => {
        if (!saveBtn) return;
        if (on) {
            saveBtn.dataset.prev = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${label || 'Saving'}`;
        } else {
            saveBtn.disabled = false;
            saveBtn.innerHTML = saveBtn.dataset.prev || 'Save';
        }
    };
    try {
        setLoading(true, 'Checking');
        const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        if (!payload.id && payload.college_id) {
            try {
                const { data: dupByEmail } = await supa.from('registrations').select('id').eq('college_id', payload.college_id).eq('email', payload.email).maybeSingle();
                const { data: dupByPhone } = await supa.from('registrations').select('id').eq('college_id', payload.college_id).eq('phone', payload.phone).maybeSingle();
                if ((dupByEmail && dupByEmail.id) || (dupByPhone && dupByPhone.id)) {
                    setLoading(false);
                    flashNotification.showWarning('Already exists', 'A member with this email/phone already exists in this college.');
                    return;
                }
            } catch (_) { }
        }

        flashNotification.showInfo('Saving', payload.id ? 'Updating member...' : 'Creating member...');
        setLoading(true, 'Saving');
        if (payload.id) {
            // --- MODIFIED RPC CALL: status parameter removed ---
            const { error } = await supa.rpc('update_registration_fields', {
                p_id: parseInt(payload.id, 10),
                p_applicant_name: payload.applicant_name,
                p_email: payload.email,
                p_phone: payload.phone,
                p_college_id: payload.college_id,
                p_zone_id: payload.zone_id,
                p_applying_for: payload.applying_for,
                p_unit_name: payload.unit_name,
                p_status: null // Pass null to prevent status update from this modal
            });
            if (error) throw new Error(error.message || 'Update failed');
        } else {
            // --- MODIFIED RPC CALL: status parameter removed ---
            const { error } = await supa.rpc('create_registration', {
                p_applicant_name: payload.applicant_name,
                p_email: payload.email,
                p_phone: payload.phone,
                p_college_id: payload.college_id,
                p_zone_id: payload.zone_id,
                p_applying_for: payload.applying_for,
                p_unit_name: payload.unit_name,
                p_status: 'pending' // Always create as pending
            });
            if (error) throw new Error(error.message || 'Create failed');
        }

        document.getElementById('member-modal').style.display = 'none';
        document.body.classList.remove('modal-open');
        flashNotification.showSuccess('Saved', payload.id ? 'Member updated.' : 'Member added.');

        const activeId = window.__yuvaActiveCollegeId;
        if (activeId && payload.college_id === activeId) {
            await loadCollegeDashboard(activeId);
            await loadCollegeMembers(activeId);
        } else if (zoneManager && zoneManager.currentZone) {
            await zoneManager.loadColleges(zoneManager.currentZone.id);
            zoneManager.showZoneStats();
        }
    } catch (err) {
        flashNotification.showError('Error', err && err.message ? err.message : 'Network error while saving');
    }
    setLoading(false);
});

async function deleteMember(memberId, collegeId) {
    try {
        flashNotification.showInfo('Deleting', 'Removing member...');
        const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error } = await supa.rpc('delete_registration', { p_id: memberId });
        if (!error) {
            flashNotification.showSuccess('Deleted', 'Member removed.');
            if (collegeId === window.__yuvaActiveCollegeId) {
                await loadCollegeDashboard(collegeId);
                await loadCollegeMembers(collegeId);
            } else if (zoneManager && zoneManager.currentZone) {
                await zoneManager.loadColleges(zoneManager.currentZone.id);
                zoneManager.showZoneStats();
            }
        } else {
            flashNotification.showError('Failed', error.message || 'Unable to delete');
        }
    } catch (e) {
        flashNotification.showError('Error', 'Network error while deleting');
    }
}

async function approveRegistration(memberId, approve, collegeId) {
    const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const newStatus = approve ? 'approved' : 'rejected';

    try {
        // --- START OF NEW CODE ---
        // 1. Fetch the current status of the member first.
        const { data: member, error: fetchError } = await supa
            .from('registrations')
            .select('status')
            .eq('id', memberId)
            .single();

        if (fetchError) {
            throw new Error(fetchError.message || 'Could not verify member status.');
        }

        // 2. Check if the status is already set to the desired state.
        if (member && member.status === newStatus) {
            const message = approve ? 'Member is already approved.' : 'Member is already rejected.';
            flashNotification.showInfo('No Change', message);
            return; // Exit the function to prevent redundant updates.
        }
        // --- END OF NEW CODE ---

        flashNotification.showInfo(approve ? 'Approving' : 'Rejecting', 'Please wait...');

        const { error } = await supa.rpc('set_registration_status', { p_id: memberId, p_status: newStatus });
        if (error) throw new Error(error.message || 'RPC failed');

        flashNotification.showSuccess('Updated', `Status set to ${newStatus}.`);
        if (collegeId === window.__yuvaActiveCollegeId) {
            await loadCollegeDashboard(collegeId);
            await loadCollegeMembers(collegeId);
        } else if (zoneManager && zoneManager.currentZone) {
            await zoneManager.loadColleges(zoneManager.currentZone.id);
            zoneManager.showZoneStats();
        }
    } catch (e) {
        flashNotification.showError('Error', e.message || 'Network error while updating status');
    }
}

// Export a single college's data (college details + its registrations) to CSV
async function exportCollegeCSV(collegeId) {
    try {
        const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        flashNotification.showInfo('Export', 'Preparing CSV...');
        // Fetch college details
        const { data: college, error: cErr } = await supa
            .from('college_details')
            .select('*')
            .eq('id', collegeId)
            .maybeSingle();
        if (cErr) throw new Error(cErr.message || 'Failed to fetch college');
        // Fetch registrations for this college
        const { data: regs, error: rErr } = await supa
            .from('registrations')
            .select('id, applicant_name, email, phone, applying_for, unit_name, status, created_at')
            .eq('college_id', collegeId)
            .order('created_at', { ascending: true });
        if (rErr) throw new Error(rErr.message || 'Failed to fetch members');

        // Build CSV
        const esc = (v) => {
            const s = (v === null || v === undefined) ? '' : String(v);
            if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
            return s;
        };
        const lines = [];
        // Header section about college
        if (college) {
            lines.push(`College,${esc(college.college_name)}`);
            lines.push(`Code,${esc(college.college_code)}`);
            lines.push(`Zone,${esc(college.zone_name || college.zone_id)}`);
            lines.push('');
        }
        // Members table
        const header = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Unit', 'Status', 'Registered At'];
        lines.push(header.join(','));
        (regs || []).forEach(r => {
            lines.push([
                r.id,
                esc(r.applicant_name),
                esc(r.email),
                esc(r.phone),
                esc(r.applying_for),
                esc(r.unit_name),
                esc(r.status),
                esc(r.created_at)
            ].join(','));
        });
        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = (college && college.college_code) ? `${college.college_code}-export.csv` : `college-${collegeId}-export.csv`;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        flashNotification.showSuccess('Exported', 'CSV downloaded');
    } catch (err) {
        flashNotification.showError('Export failed', err && err.message ? err.message : 'Unable to export CSV');
    }
}

function openCollegeModal() {
    // Security check: Only Super Admin and Zone Convener can add colleges
    const role = (authManager && authManager.currentUser && authManager.currentUser.role) || 'viewer';
    const canAddColleges = role === 'super_admin' || role === 'zone_convener';

    if (!canAddColleges) {
        flashNotification.showError('Access Denied', 'Only Super Admin and Zone Convener can add colleges. Mentors can only add members to existing colleges.');
        return;
    }

    const modal = document.getElementById('college-modal-add');
    if (!modal) return;
    // populate zones into select
    const zoneSelect = document.getElementById('college-zone-input');
    if (zoneSelect) {
        zoneSelect.innerHTML = '';
        const zones = (zoneManager && zoneManager.zones) ? zoneManager.zones : [];
        zones.forEach(z => {
            const opt = document.createElement('option');
            opt.value = z.id;
            opt.textContent = z.zone_name;
            zoneSelect.appendChild(opt);
        });
        if (zoneManager && zoneManager.currentZone) zoneSelect.value = zoneManager.currentZone.id;
    }
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
}

document.getElementById('college-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        college_name: document.getElementById('college-name-input').value.trim(),
        college_code: document.getElementById('college-code-input').value.trim(),
        zone_id: parseInt(document.getElementById('college-zone-input').value, 10)
    };
    if (!payload.college_name || !payload.college_code || !payload.zone_id) {
        flashNotification.showError('Missing fields', 'Please fill all college details');
        return;
    }
    const saveBtn = document.getElementById('college-save-btn');
    const setLoading = (on, label) => {
        if (!saveBtn) return;
        if (on) {
            saveBtn.dataset.prev = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${label || 'Saving'}`;
        } else {
            saveBtn.disabled = false;
            saveBtn.innerHTML = saveBtn.dataset.prev || 'Save';
        }
    };
    try {
        // Pre-check: avoid duplicate college_code
        setLoading(true, 'Checking');
        try {
            const { data: existing } = await supabase
                .from('colleges')
                .select('id')
                .eq('college_code', payload.college_code)
                .maybeSingle();
            if (existing && existing.id) {
                flashNotification.showWarning('Already exists', 'This college code is already registered.');
                setLoading(false);
                return;
            }
        } catch (_) { }
        flashNotification.showInfo('Saving', 'Creating college...');
        setLoading(true, 'Saving');
        const body = new URLSearchParams(payload).toString();
        const resp = await fetch(`${GAS_WEB_APP_URL}?action=colleges&method=create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body
        });
        const json = await resp.json();
        if (json && json.success) {
            document.getElementById('college-modal-add').style.display = 'none';
            document.body.classList.remove('modal-open');
            flashNotification.showSuccess('Added', 'College created successfully');
            if (zoneManager && zoneManager.currentZone) {
                // wait briefly for DB commit to reflect, then refresh
                setTimeout(async () => {
                    await zoneManager.loadColleges(zoneManager.currentZone.id);
                    zoneManager.showZoneStats();
                }, 500);
            }
        } else {
            const err = (json && json.error) || 'Unable to add college';
            if (typeof err === 'string' && err.indexOf('duplicate key value') !== -1) {
                flashNotification.showError('Already exists', 'This college code is already registered.');
            } else {
                flashNotification.showError('Failed', err);
            }
        }
    } catch (_) {
        flashNotification.showError('Error', 'Network error while adding college');
    }
    setLoading(false);
});

async function loadSuperAdminDashboard() {
    const response = await SupabaseService.getSuperAdminDashboardData();
    if (response.success) {
        const data = response.data;
        renderZonePerformance(data.zonePerformance);
        renderUserManagement(data.users);
        renderActivityLog(data.activityLog);
        populateNoticeRecipients(data.zones);
    } else {
        flashNotification.showError('Dashboard Error', response.error || 'Could not load Super Admin data.');
    }
}

function renderZonePerformance(zones) {
    const grid = document.getElementById('zone-performance-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!zones || zones.length === 0) {
        grid.innerHTML = '<p>No zone data available.</p>';
        return;
    }

    zones.forEach(zone => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div class="stat-label" style="font-size: 1rem; color: var(--text-primary);">${zone.zone_name}</div>
            <div style="display: flex; justify-content: space-around; margin-top: 12px; font-size: 14px; color: var(--text-secondary);">
                <span><i class="fas fa-school"></i> ${zone.college_count} Colleges</span>
                <span><i class="fas fa-users"></i> ${zone.member_count} Members</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderUserManagement(users) {
    const container = document.getElementById('user-management-table-container');
    if (!container) return;

    const table = document.createElement('table');
    table.className = 'user-management-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector('tbody');

    users.forEach(user => {
        const row = document.createElement('tr');
        row.dataset.userId = user.id;
        row.innerHTML = `
            <td>${user.full_name}</td>
            <td>${user.email}</td>
            <td>
                <select class="user-role-select" ${user.role === 'super_admin' ? 'disabled' : ''}>
                    <option value="mentor" ${user.role === 'mentor' ? 'selected' : ''}>Mentor</option>
                    <option value="zone_convener" ${user.role === 'zone_convener' ? 'selected' : ''}>Zone Convener</option>
                </select>
            </td>
            <td>
                ${user.role !== 'super_admin' ? `<button class="btn btn-save">Save</button>` : 'N/A'}
            </td>
        `;
        tbody.appendChild(row);
    });

    container.innerHTML = '';
    container.appendChild(table);

    // Add event listeners after rendering
    container.querySelectorAll('.btn-save').forEach(button => {
        button.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const userId = row.dataset.userId;
            const newRole = row.querySelector('.user-role-select').value;

            const response = await SupabaseService.updateUser(userId, newRole, null); // Zone update can be added if needed
            if (response.success) {
                flashNotification.showSuccess('Success', 'User role updated.');
            } else {
                flashNotification.showError('Error', response.error || 'Failed to update user.');
            }
        });
    });
}

function renderActivityLog(logs) {
    const container = document.getElementById('activity-log-container');
    if (!container) return;
    container.innerHTML = '';
    if (!logs || logs.length === 0) {
        container.innerHTML = '<p>No recent activity.</p>';
        return;
    }

    const iconMap = {
        'update_registration': 'fa-user-edit',
        'create_college': 'fa-school',
        'update_user_role': 'fa-user-shield',
        'default': 'fa-info-circle'
    };

    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'activity-log-item';
        const iconClass = iconMap[log.action] || iconMap['default'];

        item.innerHTML = `
            <div class="activity-icon"><i class="fas ${iconClass}"></i></div>
            <div class="activity-content">
                <p><strong>${log.user_email || 'System'}</strong> performed action: <strong>${log.action}</strong>.</p>
                <div class="activity-meta">${new Date(log.created_at).toLocaleString()}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

function populateNoticeRecipients(zones) {
    const select = document.getElementById('notice-recipient');
    if (!select) return;

    // Clear existing zone options
    select.querySelectorAll('option[data-zone-id]').forEach(opt => opt.remove());

    zones.forEach(zone => {
        const option = document.createElement('option');
        option.value = `zone_${zone.id}`;
        option.textContent = `Zone: ${zone.zone_name}`;
        option.dataset.zoneId = zone.id;
        select.appendChild(option);
    });
}

// Add Event Listeners for new Super Admin actions
document.addEventListener('DOMContentLoaded', () => {
    const noticeForm = document.getElementById('send-notice-form');
    if (noticeForm) {
        noticeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const recipient = document.getElementById('notice-recipient').value;
            const subject = document.getElementById('notice-subject').value;
            const message = document.getElementById('notice-message').value;

            const btn = noticeForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending...';

            const response = await SupabaseService.sendNotice(recipient, subject, message);

            if (response.success) {
                flashNotification.showSuccess('Sent', 'The notice has been broadcast successfully.');
                noticeForm.reset();
            } else {
                flashNotification.showError('Failed', response.error || 'Could not send the notice.');
            }

            btn.disabled = false;
            btn.innerHTML = 'Broadcast Message';
        });
    }

    // Helper function to handle the export process
    async function handleExport(source, buttonId) {
        const exportBtn = document.getElementById(buttonId);
        if (!exportBtn) return;

        const originalContent = exportBtn.innerHTML;
        exportBtn.disabled = true;
        exportBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Exporting...`;
        flashNotification.showInfo('Exporting', `Preparing your ${source} data...`);

        try {
            const sheetId = localStorage.getItem('yuva_sheet_id') || '1uEGAMh4_UDQ_DlmQLQjUOV8cQT0C_DkizHooI37CsJs';
            const exportUrl = `${GAS_WEB_APP_URL}?action=reports&method=export&format=sheets&sheetId=${encodeURIComponent(sheetId)}&source=${source}`;

            const response = await fetch(exportUrl);
            const result = await response.json();

            if (result.success && result.url) {
                flashNotification.showSuccess('Success!', 'Your Google Sheet is opening in a new tab.');
                window.open(result.url, '_blank');
            } else {
                flashNotification.showError('Export Failed', result.error || 'Could not retrieve the sheet URL.');
            }
        } catch (error) {
            flashNotification.showError('Network Error', 'Could not connect to the export service.');
        } finally {
            exportBtn.disabled = false;
            exportBtn.innerHTML = originalContent;
        }
    }

    // Data Management Export Buttons
    document.getElementById('export-members-btn')?.addEventListener('click', () => {
        // This now calls the export handler with a new 'registrations' source.
        handleExport('registrations', 'export-members-btn');
    });

    document.getElementById('export-colleges-btn')?.addEventListener('click', () => {
        // This remains the same, as the 'base' source correctly exports all college details.
        handleExport('base', 'export-colleges-btn');
    });
});