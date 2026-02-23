/*=================================================================
  EVENT UPLOAD PORTAL - YUVA 2025
  Email-verified event submission system for central/independent events
=================================================================*/

(() => {
        // Prevent double-loading (Live Server / hot reload / accidental duplicate script eval)
        if (window.__yuvaEventUploadScriptLoaded) return;
        window.__yuvaEventUploadScriptLoaded = true;

        // Ensure Supabase is available; if not, allow retry later.
        if (typeof window.supabase === 'undefined') {
                console.error('Supabase library not loaded. Make sure it is included in HTML before event-upload.js');
                window.__yuvaEventUploadScriptLoaded = false;
                return;
        }

const SUPABASE_URL = 'https://jgsrsjwmywiirtibofth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5KtvO0cEHfnECBoyp2CQnw_RC3_x2me';

// Initialize Supabase client safely (avoid "already declared" errors)
// Check if already initialized globally, otherwise create new client
if (typeof window.supabase_client === 'undefined') {
    window.supabase_client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const supabase = window.supabase_client;

// ===== EMAIL VERIFICATION CONFIGURATION =====
// Replace with your actual Google Apps Script deployment URL
// Format: https://script.google.com/macros/d/{DEPLOYMENT_ID}/usercallback
const GAS_VERIFICATION_URL = 'https://script.google.com/macros/s/AKfycbw38yGhyQZLwuBRf2XN3MTOKER-eVH-EZlF9qxlPWIu-L9mkwd5h4LdkbJOkOvfmQMK5Q/exec';

// State management
let currentUser = {
    email: null,
    verified: false,
    uploaderId: null
};

let uploadedBannerUrl = null;

/*=================================================================
   INITIALIZATION
=================================================================*/
document.addEventListener('DOMContentLoaded', () => {
    initializeEventUpload();
});

async function initializeEventUpload() {
    // Check if user is already verified in session
    const savedUser = sessionStorage.getItem('eventUploaderEmail');
    if (savedUser) {
        await verifyExistingSessionEnhanced(savedUser);
    }

    // Load categories
    await loadCategories();

    // Setup event listeners
    setupEventListeners();
}

/*=================================================================
   EVENT LISTENERS
=================================================================*/
function setupEventListeners() {
    // Email form
    document.getElementById('emailForm').addEventListener('submit', handleEmailSubmit);

    // Code form
    document.getElementById('codeForm').addEventListener('submit', handleCodeVerification);

    // Back button (email verification)
    document.getElementById('backToEmailBtn').addEventListener('click', () => {
        resetVerificationFlow();
    });

    // Resend code button
    document.getElementById('resendCodeBtn').addEventListener('click', handleResendCode);

    // Event form
    document.getElementById('eventForm').addEventListener('submit', handleEventSubmit);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogoutEnhanced);

    // File upload
    const fileUploadArea = document.getElementById('fileUploadArea');
    const bannerFile = document.getElementById('bannerFile');

    fileUploadArea.addEventListener('click', () => bannerFile.click());

    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--color-primary)';
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.style.borderColor = 'var(--border-medium)';
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--border-medium)';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    bannerFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Add real-time validation listeners
    addFormValidationListeners();

    // Checkbox event listeners
    const displayOnHome = document.getElementById('displayOnHome');
    const displayOnUpcoming = document.getElementById('displayOnUpcoming');
    
    if (displayOnHome) {
        displayOnHome.addEventListener('change', function(e) {
            console.log('displayOnHome changed:', this.checked);
        });
    }
    
    if (displayOnUpcoming) {
        displayOnUpcoming.addEventListener('change', function(e) {
            console.log('displayOnUpcoming changed:', this.checked);
        });
    }
}

/*=================================================================
   FORM VALIDATION SYSTEM
=================================================================*/

/**
 * Add real-time validation listeners to form fields
 */
function addFormValidationListeners() {
    const emailForm = document.getElementById('emailForm');
    const codeForm = document.getElementById('codeForm');
    const eventForm = document.getElementById('eventForm');

    // Email form validation
    if (emailForm) {
        const emailInput = emailForm.querySelector('#email');
        emailInput?.addEventListener('input', () => validateField(emailInput));
        emailInput?.addEventListener('blur', () => validateField(emailInput));
    }

    // Code form validation
    if (codeForm) {
        const codeInput = codeForm.querySelector('#verificationCode');
        codeInput?.addEventListener('input', (e) => {
            // Only allow digits
            e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
            validateField(codeInput);
        });
    }

    // Event form validation
    if (eventForm) {
        const inputs = eventForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                validateField(input);
                updateSubmitButtonState();
            });
            input.addEventListener('blur', () => {
                validateField(input);
                updateSubmitButtonState();
            });
            input.addEventListener('change', () => {
                validateField(input);
                updateSubmitButtonState();
            });
        });
        
        // Initial button state
        updateSubmitButtonState();
    }
}

/**
 * Validate a single field with visual feedback
 */
function validateField(field) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return true;

    const errorEl = formGroup.querySelector('.form-error');
    const iconEl = formGroup.querySelector('.validation-icon');
    let isValid = true;
    let errorMessage = '';

    const value = field.value.trim();
    const type = field.type;
    const id = field.id;

    // Check required
    if (field.required && !value) {
        isValid = false;
        errorMessage = 'This field is required';
    }
    // Email validation
    else if (type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
    }
    // Verification code validation
    else if (id === 'verificationCode' && value) {
        if (!/^\d{6}$/.test(value)) {
            isValid = false;
            errorMessage = 'Code must be 6 digits';
        }
    }
    // Text length validation
    else if ((id === 'eventTitle' || id === 'eventLocation') && value) {
        if (value.length < 3) {
            isValid = false;
            errorMessage = 'Must be at least 3 characters';
        }
    }
    // URL validation
    else if (type === 'url' && value) {
        try {
            new URL(value);
        } catch {
            isValid = false;
            errorMessage = 'Please enter a valid URL (https://...)';
        }
    }
    // Number validation
    else if (type === 'number' && value) {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
            isValid = false;
            errorMessage = 'Please enter a valid number';
        }
    }
    // DateTime validation
    else if (type === 'datetime-local' && value && id === 'eventEndDate') {
        const startDateField = field.closest('form')?.querySelector('#eventStartDate');
        if (startDateField?.value) {
            const startDate = new Date(startDateField.value);
            const endDate = new Date(value);
            if (endDate <= startDate) {
                isValid = false;
                errorMessage = 'End date must be after start date';
            }
        }
    }

    // Update UI based on validation
    if (isValid && value) {
        // Valid
        formGroup.classList.add('valid');
        if (iconEl) {
            iconEl.innerHTML = '<i class="fas fa-check-circle validation-icon valid"></i>';
            iconEl.style.display = 'block';
        }
        if (errorEl) {
            errorEl.classList.remove('show');
            errorEl.textContent = '';
        }
    } else if (!isValid && value) {
        // Invalid
        formGroup.classList.remove('valid');
        if (iconEl) {
            iconEl.innerHTML = '<i class="fas fa-times-circle validation-icon invalid"></i>';
            iconEl.style.display = 'block';
        }
        if (errorEl) {
            errorEl.classList.add('show');
            errorEl.textContent = errorMessage;
        }
    } else {
        // Empty or untouched
        formGroup.classList.remove('valid');
        if (iconEl) iconEl.style.display = 'none';
        if (errorEl) errorEl.classList.remove('show');
    }

    return isValid || !value;
}

/**
 * Update submit button state based on form validation
 */
function updateSubmitButtonState() {
    const eventForm = document.getElementById('eventForm');
    const submitBtn = document.getElementById('submitEventBtn');
    
    if (!eventForm || !submitBtn) return;
    
    // Check all required fields
    const requiredInputs = eventForm.querySelectorAll('[required]');
    let allFilled = true;
    
    requiredInputs.forEach(input => {
        const value = input.value?.trim();
        if (!value) {
            allFilled = false;
        }
    });
    
    // Check at least one display option is selected
    const homeCheckbox = eventForm.querySelector('#displayOnHome');
    const upcomingCheckbox = eventForm.querySelector('#displayOnUpcoming');
    const oneDisplaySelected = homeCheckbox?.checked || upcomingCheckbox?.checked;
    
    // Enable button only if all required fields filled AND at least one display option selected
    if (allFilled && oneDisplaySelected) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    } else {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    }
}

/**
 * Validate entire form before submission
 */
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });

    // Additional check: at least one display option must be selected
    if (form.id === 'eventForm') {
        const homeCheckbox = form.querySelector('#displayOnHome');
        const upcomingCheckbox = form.querySelector('#displayOnUpcoming');
        if (homeCheckbox && upcomingCheckbox && !homeCheckbox.checked && !upcomingCheckbox.checked) {
            isValid = false;
            const errorEl = form.querySelector('.form-group:has(#displayOnHome) .form-error');
            if (errorEl) {
                errorEl.classList.add('show');
                errorEl.textContent = 'Please select at least one display option';
            }
        }
    }

    return isValid;
}

/*=================================================================
   EMAIL VERIFICATION FLOW (SECURE SERVER-SIDE)
=================================================================*/

/**
 * Handles email submission - generates verification code on server
 * Security: Code generated in GAS, never exposed to frontend
 */
async function handleEmailSubmit(e) {
    e.preventDefault();

    const emailForm = document.getElementById('emailForm');
    const email = document.getElementById('email').value.trim();
    const btn = document.getElementById('sendCodeBtn');

    // Validate form with new validation system
    if (!validateForm(emailForm)) {
        showMessage('Please fix the errors above before submitting', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Code...';

    try {
        // Avoid external IP lookup services (can timeout/blocked). Apps Script can use e.clientAddress.
        const clientIP = null;

        console.log('📧 Sending verification email request...');
        console.log('GAS URL:', GAS_VERIFICATION_URL);
        console.log('Email:', email);

        // Send request to Google Apps Script
        // IMPORTANT: Use text/plain to avoid CORS preflight (Apps Script doesn't return CORS headers)
        const response = await fetch(GAS_VERIFICATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'sendVerificationCode',
                email: email,
                ipAddress: clientIP
            })
        });

        console.log('✅ Got response from GAS:', response.status, response.statusText);

        // Check if response is OK
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const raw = await response.text();
        console.log('📝 Raw response:', raw);
        
        let result;
        try {
            result = JSON.parse(raw);
        } catch (parseError) {
            console.error('❌ Failed to parse response:', parseError);
            console.error('Raw text was:', raw);
            throw new Error(`Invalid response from verification service: ${raw}`);
        }
        
        console.log('✅ Parsed result:', result);

        if (result.success) {
            // Code generated and email sent successfully
            currentUser.email = email;
            
            // Switch to code entry screen
            document.getElementById('emailStep').style.display = 'none';
            document.getElementById('codeStep').style.display = 'block';
            
            // Show success message
            showMessage(
                `Verification code sent to ${email}\nCheck your inbox (and spam folder). Code expires in 10 minutes.`,
                'success'
            );

            // Start timer to show code expiry
            startVerificationTimer(10 * 60); // 10 minutes
            
            // Focus on code input
            document.getElementById('verificationCode').focus();

        } else {
            // GAS returned an error
            console.error('❌ GAS returned error:', result.error);
            showMessage(result.error || 'Failed to send verification code. Please try again.', 'error');
            
            // If rate limited, show retry message
            if (result.statusCode === 429) {
                showMessage(
                    `Too many attempts. ${result.error}\nPlease try again later.`,
                    'error'
                );
            }
        }

    } catch (error) {
        console.error('❌ Email submission error:', error);
        console.error('Stack:', error.stack);
        showMessage(
            'Unable to connect to verification service. Please check your internet and try again.',
            'error'
        );
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Verification Code';
    }
}

/**
 * Handles code verification - validates on server
 * Security: Server validates code, stores verified status
 */
async function handleCodeVerification(e) {
    e.preventDefault();

    const codeForm = document.getElementById('codeForm');
    const enteredCode = document.getElementById('verificationCode').value.trim();
    const btn = document.getElementById('verifyCodeBtn');

    // Validate form with new validation system
    if (!validateForm(codeForm)) {
        showMessage('Please enter the 6-digit code', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

    try {
        // Send verification request to Google Apps Script
        // IMPORTANT: Use text/plain to avoid CORS preflight (Apps Script doesn't return CORS headers)
        const response = await fetch(GAS_VERIFICATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'verifyCode',
                email: currentUser.email,
                code: enteredCode
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const raw = await response.text();
        let result;
        try {
            result = JSON.parse(raw);
        } catch {
            throw new Error(`Invalid response from verification service: ${raw}`);
        }

        if (result.success) {
            // Code verified successfully!
            // Store user info in state and session
            currentUser.verified = true;
            currentUser.uploaderId = result.uploaderId;
            sessionStorage.setItem('eventUploaderEmail', currentUser.email);
            sessionStorage.setItem('eventUploaderId', currentUser.uploaderId);

            // Clear verification section and show upload form
            clearMessage();
            clearVerificationTimer();
            showUploadSection();

            // Show success feedback
            showMessage('Email verified! You can now upload events.', 'success');

        } else {
            // Code verification failed
            let errorMsg = result.error || 'Invalid code. Please try again.';
            
            // Show attempts remaining if provided
            if (result.attemptsRemaining !== undefined) {
                errorMsg += ` (${result.attemptsRemaining} attempts remaining)`;
            }
            
            showMessage(errorMsg, 'error');

            // Special handling for certain error codes
            if (result.statusCode === 410) {
                // Code expired
                showMessage(
                    'Code expired. Please request a new code.',
                    'error'
                );
                // Reset to email entry
                resetVerificationFlow();
            } else if (result.statusCode === 429) {
                // Too many attempts
                showMessage(
                    'Too many failed attempts. Please request a new code.',
                    'error'
                );
                resetVerificationFlow();
            }
        }

    } catch (error) {
        console.error('Code verification error:', error);
        showMessage(
            'Verification failed. Please check your connection and try again.',
            'error'
        );
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify Code';
    }
}

/**
 * Handles resend code button click
 * Resends verification code to the same email
 */
async function handleResendCode(e) {
    e.preventDefault();
    
    if (!currentUser.email) {
        showMessage('Email not found. Please start over.', 'error');
        resetVerificationFlow();
        return;
    }
    
    const btn = document.getElementById('resendCodeBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resending...';
    
    try {
        const response = await fetch(GAS_VERIFICATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'sendVerificationCode',
                email: currentUser.email,
                ipAddress: null
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const raw = await response.text();
        let result;
        try {
            result = JSON.parse(raw);
        } catch {
            throw new Error(`Invalid response: ${raw}`);
        }
        
        if (result.success) {
            showMessage('New verification code sent to your email', 'success');
            // Clear the old code input
            document.getElementById('verificationCode').value = '';
            // Restart timer
            clearVerificationTimer();
            startVerificationTimer(10 * 60);
        } else {
            showMessage(result.error || 'Failed to resend code. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Resend error:', error);
        showMessage('Unable to resend code. Please check your connection.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-redo"></i> Resend Code';
    }
}

/**
 * Verifies existing session on page load
 * Enhanced version with server validation
 */
async function verifyExistingSessionEnhanced(email) {
    try {
        // Ensure supabase is initialized
        if (!supabase) {
            console.warn('Supabase not initialized yet');
            return;
        }

        // Check if email exists in event_uploaders
        const { data, error } = await supabase
            .from('event_uploaders')
            .select('id, email, verified_at, is_active')
            .eq('email', email.toLowerCase())
            .single();

        if (data && data.is_active) {
            // Session is valid
            currentUser.email = email;
            currentUser.verified = true;
            currentUser.uploaderId = data.id;
            showUploadSection();
        } else {
            // Session invalid, clear it
            handleLogoutEnhanced();
        }
    } catch (error) {
        console.error('Session verification error:', error);
        handleLogoutEnhanced();
    }
}

function showUploadSection() {
    document.getElementById('verificationWrapper').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('userEmail').textContent = currentUser.email;

    // Load user's events
    loadUserEvents();
}

/**
 * Handles logout with full cleanup
 */
function handleLogoutEnhanced() {
    // Clear verification state
    currentUser = { email: null, verified: false, uploaderId: null };
    sessionStorage.removeItem('eventUploaderEmail');
    sessionStorage.removeItem('eventUploaderId');

    // Reset UI
    document.getElementById('verificationWrapper').style.display = 'block';
    document.getElementById('uploadSection').style.display = 'none';

    // Clear forms
    document.getElementById('emailForm').reset();
    document.getElementById('codeForm').reset();
    document.getElementById('eventForm').reset();

    // Clear messages and timers
    clearMessage();
    clearVerificationTimer();
}

/**
 * Resets verification flow - goes back to email entry
 */
function resetVerificationFlow() {
    currentUser.email = null;
    
    document.getElementById('emailStep').style.display = 'block';
    document.getElementById('codeStep').style.display = 'none';
    document.getElementById('verificationCode').value = '';
    document.getElementById('emailForm').reset();
    
    clearMessage();
    clearVerificationTimer();
}

/*=================================================================
   EVENT SUBMISSION
=================================================================*/
async function handleEventSubmit(e) {
    e.preventDefault();

    const eventForm = document.getElementById('eventForm');
    const btn = document.getElementById('submitEventBtn');

    // Validate entire form with new validation system
    if (!validateForm(eventForm)) {
        showMessage('Please fix all validation errors before submitting', 'error');
        return;
    }

    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = '<i class="fas fa-spinner"></i> Submitting...';
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        // Validate required fields
        const title = document.getElementById('eventTitle').value.trim();
        const startDate = document.getElementById('eventStartDate').value;
        const mode = document.getElementById('eventMode').value;
        const category = document.getElementById('eventCategory').value;

        if (!title || !startDate || !mode || !category) {
            showMessage('Please fill in all required fields', 'error');
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.innerHTML = '<i class="fas fa-check"></i> Submit Event';
            return;
        }

        // Upload banner if selected
        let bannerUrl = null;
        const bannerFile = document.getElementById('bannerFile').files[0];
        if (bannerFile) {
            bannerUrl = await uploadBanner(bannerFile);
        }

        // Prepare event data
        const eventData = {
            title: title,
            description: document.getElementById('eventDescription').value.trim() || null,
            start_at: new Date(startDate).toISOString(),
            end_at: document.getElementById('eventEndDate').value ?
                new Date(document.getElementById('eventEndDate').value).toISOString() : null,
            location: document.getElementById('eventLocation').value.trim() || 'Online',
            banner_url: bannerUrl,
            status: 'upcoming',
            college_id: null, // No college association for uploaded events
            created_by_uploader: currentUser.uploaderId
        };

        // Insert into events table
        const { data: newEvent, error: eventError } = await supabase
            .from('events')
            .insert([eventData])
            .select()
            .single();

        if (eventError) throw eventError;

        // Prepare publication data
        const publicationData = {
            event_id: newEvent.id,
            mode: mode,
            capacity: document.getElementById('eventCapacity').value ?
                parseInt(document.getElementById('eventCapacity').value) : null,
            registration_url: document.getElementById('eventRegistrationUrl').value.trim() || null,
            long_description: document.getElementById('eventLongDescription').value.trim() || null,
            category_id: category,
            display_on_home: document.getElementById('displayOnHome').checked,
            display_on_upcoming: document.getElementById('displayOnUpcoming').checked,
            speakers: null
        };

        // Insert into event_publications table
        const { error: pubError } = await supabase
            .from('event_publications')
            .insert([publicationData]);

        if (pubError) throw pubError;

        // Success!
        showMessage('✓ Event submitted successfully! Your event will appear on the events pages.', 'success');

        // Reset form
        document.getElementById('eventForm').reset();
        document.getElementById('previewImage').style.display = 'none';
        document.getElementById('fileUploadArea').classList.remove('has-file');
        uploadedBannerUrl = null;

        // Reload events list
        await loadUserEvents();

    } catch (error) {
        console.error('Event submission error:', error);
        showMessage('Failed to submit event. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.innerHTML = '<i class="fas fa-check"></i> Submit Event';
    }
}

/*=================================================================
   FILE UPLOAD
=================================================================*/
async function handleFileSelect(file) {
    // Validate file
    if (!file.type.startsWith('image/')) {
        showMessage('Please select an image file', 'error');
        return;
    }

    if (file.size > 500 * 1024) { // 500KB limit
        showMessage('Image size must be less than 500KB', 'error');
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('previewImage');
        preview.src = e.target.result;
        preview.style.display = 'block';
        document.getElementById('fileUploadArea').classList.add('has-file');
    };
    reader.readAsDataURL(file);
}

async function uploadBanner(file) {
    try {
        // Ensure supabase is initialized
        if (!supabase) {
            throw new Error('Supabase not initialized');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `event-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `event-upload/${fileName}`;

        // Upload to Supabase Storage (using existing event-banners bucket)
        const { data, error } = await supabase.storage
            .from('event-banners')
            .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('event-banners')
            .getPublicUrl(filePath);

        return urlData.publicUrl;

    } catch (error) {
        console.error('Banner upload error:', error);
        throw new Error('Failed to upload banner image');
    }
}

/*=================================================================
   DATA LOADING
=================================================================*/
async function loadCategories() {
    try {
        const { data, error } = await supabase
            .from('event_categories')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) throw error;

        const select = document.getElementById('eventCategory');
        data.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadUserEvents() {
    try {
        // Get events created by this uploader (excluding soft-deleted events)
        const { data: events, error } = await supabase
            .from('published_events')
            .select('*')
            .eq('created_by_uploader', currentUser.uploaderId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const eventsList = document.getElementById('eventsList');

        if (!events || events.length === 0) {
            eventsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No events submitted yet</p>
                </div>
            `;
            return;
        }

        eventsList.innerHTML = events.map(event => {
            const startDate = new Date(event.start_at);
            const endDate = event.end_at ? new Date(event.end_at) : null;
            const now = new Date();
            const isPast = endDate ? endDate < now : startDate < now;

            return `
                <div class="event-item" data-event-id="${event.id}">
                    <img src="${event.banner_url || 'https://via.placeholder.com/120x80/ccc/999?text=Event'}" 
                         alt="${event.title}">
                    <div class="event-info">
                        <h3>${event.title}</h3>
                        <div class="event-meta">
                            <span><i class="far fa-calendar"></i> ${startDate.toLocaleDateString()}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                            <span><i class="fas fa-${event.mode === 'online' ? 'globe' : event.mode === 'hybrid' ? 'building' : 'map-marker-alt'}"></i> ${event.mode}</span>
                        </div>
                    </div>
                    <div class="event-actions">
                        <span class="badge ${isPast ? 'past' : 'upcoming'}">
                            ${isPast ? 'Past Event' : 'Upcoming'}
                        </span>
                        <button class="btn-delete-event" title="Delete this event"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        // Add delete event listeners
        document.querySelectorAll('.btn-delete-event').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const eventItem = e.currentTarget.closest('.event-item');
                const eventId = eventItem.dataset.eventId;
                const eventTitle = eventItem.querySelector('h3').textContent;
                
                // Confirm deletion
                if (!confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
                    return;
                }

                try {
                    await deleteEvent(eventId);
                    eventItem.style.opacity = '0.5';
                    eventItem.style.pointerEvents = 'none';
                    showMessage('✓ Event deleted successfully', 'success');
                    setTimeout(() => {
                        loadUserEvents();
                    }, 1500);
                } catch (error) {
                    console.error('Delete error:', error);
                    showMessage('Failed to delete event. Please try again.', 'error');
                }
            });
        });

    } catch (error) {
        console.error('Error loading events:', error);
    }
}

/*=================================================================
   DELETE EVENT FUNCTION (SOFT DELETE)
=================================================================*/
async function deleteEvent(eventId) {
    try {
        // Soft delete: Mark event as deleted instead of removing it
        // This preserves statistics and allows restoration if needed
        const { error: updateError } = await supabase
            .from('events')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('id', eventId);

        if (updateError) throw updateError;

        return true;
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
}

/*=================================================================
   RESTORE EVENT FUNCTION (for admins/recovery)
=================================================================*/
async function restoreEvent(eventId) {
    try {
        // Restore a soft-deleted event
        const { error: restoreError } = await supabase
            .from('events')
            .update({ is_deleted: false, deleted_at: null })
            .eq('id', eventId);

        if (restoreError) throw restoreError;

        return true;
    } catch (error) {
        console.error('Error restoring event:', error);
        throw error;
    }
}

/*=================================================================
   UTILITY FUNCTIONS
=================================================================*/
function showMessage(text, type = 'info') {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = text;
    messageBox.className = `message ${type}`;
    messageBox.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 5000);
    }
}

function clearMessage() {
    const messageBox = document.getElementById('messageBox');
    messageBox.style.display = 'none';
    messageBox.textContent = '';
    messageBox.className = 'message';
}

/*=================================================================
   SECURITY & UTILITY FUNCTIONS
=================================================================*/

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Gets client IP address (best effort)
 * @returns {Promise<string>} Client IP address
 */
async function getClientIP() {
    // External IP services are frequently blocked or slow on some networks.
    // We rely on Apps Script (e.clientAddress) for best-effort rate limiting.
    return null;
}

/**
 * Starts countdown timer for verification code expiry
 * @param {number} seconds - Seconds until expiry
 */
function startVerificationTimer(seconds) {
    clearVerificationTimer();
    
    const timerDisplay = document.getElementById('verificationTimer');
    if (!timerDisplay) return;

    let remaining = seconds;

    const timer = setInterval(() => {
        remaining--;
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        
        timerDisplay.textContent = `Code expires in ${minutes}:${secs.toString().padStart(2, '0')}`;
        
        if (remaining <= 60) {
            timerDisplay.style.color = '#ef4444'; // Red for last minute
        }
        
        if (remaining <= 0) {
            clearInterval(timer);
            showMessage('Verification code has expired. Please request a new code.', 'error');
            resetVerificationFlow();
        }
    }, 1000);

    // Store timer ID for cleanup
    window.verificationTimerId = timer;
}

/**
 * Clears verification timer
 */
function clearVerificationTimer() {
    if (window.verificationTimerId) {
        clearInterval(window.verificationTimerId);
        window.verificationTimerId = null;
    }
}

})();
