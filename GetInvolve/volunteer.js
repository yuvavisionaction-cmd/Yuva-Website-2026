/* ===== MODERN VOLUNTEER PAGE JAVASCRIPT - YUVA 2025 (REVISED with Inline Validation & SMOOTH SCROLL) ===== */

/**
 * FlashNotification System
 * Manages displaying success, error, and info pop-up messages.
 */
class FlashNotification {
    constructor() {
        this.initializeFlashSystem();
    }

    initializeFlashSystem() {
        // Remove any existing flash container first
        const existingContainer = document.getElementById('flash-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create fresh container and append directly to body
        const flashContainer = document.createElement('div');
        flashContainer.id = 'flash-container';
        flashContainer.className = 'flash-container';

        // Ensure it's added to body, not inside any other element
        document.body.appendChild(flashContainer);
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


/**
 * VolunteerPage Class
 * Manages all interactive elements on the volunteer page.
 */
class VolunteerPage {
    constructor() {
        this.flash = new FlashNotification();
        this.form = document.getElementById('volunteer-form');

        // ===== SMOOTH SCROLL OPTIMIZATION =====
        this.initializeSmoothScroll();

        if (this.form) {
            // ===== NEW: Define validation rules =====
            this.validationRules = {
                'fullName': {
                    required: true,
                    message: 'Full Name is required.'
                },
                'age': {
                    required: true,
                    pattern: /^\d{1,2}$/,
                    message: 'Please enter a valid age.'
                },
                'gender': {
                    required: true,
                    message: 'Please select a gender.'
                },
                'email': {
                    required: true,
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address.'
                },
                'phone': {
                    required: true,
                    pattern: /^[6-9]\d{9}$/,
                    message: 'Please enter a valid 10-digit phone number.'
                },
                'occupation': {
                    required: true,
                    message: 'Occupation is required.'
                },
                'college': {
                    required: true,
                    message: 'College/Institute is required.'
                },
                'involvement': {
                    required: true,
                    message: 'Please select how you want to get involved.'
                },
                'skills': {
                    required: true,
                    message: 'Please select a skill.'
                },
                'causes': {
                    required: true,
                    message: 'Please select a cause.'
                },
                'time': {
                    required: true,
                    message: 'Please select your available time.'
                },
                'whyJoin': {
                    required: true,
                    message: 'This field is required.'
                },
                'hopeToAchieve': {
                    required: true,
                    message: 'This field is required.'
                },
                'pastVolunteer': {
                    required: true,
                    message: 'Please select an option.'
                },
                'otherGroups': {
                    required: true,
                    message: 'Please select an option.'
                },
                'emailUpdates': {
                    required: true,
                    message: 'Please select an option for email updates.'
                },
                'dataConsent': {
                    required: true,
                    message: 'You must consent to data usage to proceed.'
                }
            };
            this.initializeForm();
        }

        this.initializeRoleFilters();
    }

    // ===== SMOOTH SCROLL OPTIMIZATION =====
    initializeSmoothScroll() {
        // Enable CSS smooth scrolling
        document.documentElement.style.scrollBehavior = 'smooth';

        // Use passive event listeners for better scroll performance
        let scrollTimeout;
        const optimizeScroll = () => {
            document.body.style.pointerEvents = 'none';
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                document.body.style.pointerEvents = 'auto';
            }, 150);
        };

        // Throttle scroll events
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    optimizeScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });

        // Optimize touch scrolling on mobile
        document.addEventListener('touchstart', () => { }, { passive: true });
        document.addEventListener('touchmove', () => { }, { passive: true });

        // Reduce animation complexity during scroll
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!reducedMotionQuery.matches) {
            this.optimizeAnimationsDuringScroll();
        }
    }

    optimizeAnimationsDuringScroll() {
        let scrollTimer;
        const heroChakra = document.querySelector('.hero-chakra-bg');

        if (heroChakra) {
            window.addEventListener('scroll', () => {
                // Pause heavy animations during scroll
                heroChakra.style.animationPlayState = 'paused';

                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    heroChakra.style.animationPlayState = 'running';
                }, 150);
            }, { passive: true });
        }
    }

    initializeForm() {
        this.formSteps = Array.from(this.form.querySelectorAll('.form-step'));
        this.nextButtons = Array.from(this.form.querySelectorAll('.btn-next'));
        this.prevButtons = Array.from(this.form.querySelectorAll('.btn-prev'));
        this.submitButton = this.form.querySelector('.btn-submit');
        this.progressBarSteps = Array.from(document.querySelectorAll('.progress-step'));
        this.currentStep = 0;

        this.nextButtons.forEach(button => {
            button.addEventListener('click', () => this.changeStep(1));
        });

        this.prevButtons.forEach(button => {
            button.addEventListener('click', () => this.changeStep(-1));
        });

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.setupConditionalFields();

        // ===== NEW: Add blur/input listeners for real-time validation =====
        this.form.querySelectorAll('input[required], textarea[required]').forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.clearFieldError(field));
        });
        this.form.querySelectorAll('input[type="radio"][required], input[type="checkbox"][required]').forEach(field => {
            // For radio/checkbox, check on 'change'
            field.addEventListener('change', () => this.validateField(field));
        });
    }

    setupConditionalFields() {
        // --- Past Volunteer Logic ---
        const pastVolunteerRadios = this.form.querySelectorAll('input[name="pastVolunteer"]');
        const pastVolunteerDetails = document.getElementById('pastVolunteerDetails');
        const pastVolunteerDetailsText = document.getElementById('pastVolunteerDetailsText');

        pastVolunteerRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'Yes') {
                    pastVolunteerDetails.style.display = 'block';
                } else {
                    pastVolunteerDetails.style.display = 'none';
                    if (pastVolunteerDetailsText) pastVolunteerDetailsText.value = ''; // Clear value
                }
            });
        });

        // --- Other Groups Logic ---
        const otherGroupsRadios = this.form.querySelectorAll('input[name="otherGroups"]');
        const otherGroupsDetails = document.getElementById('otherGroupsDetails');
        const otherGroupsDetailsText = document.getElementById('otherGroupsDetailsText');

        otherGroupsRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'Yes') {
                    otherGroupsDetails.style.display = 'block';
                } else {
                    otherGroupsDetails.style.display = 'none';
                    if (otherGroupsDetailsText) otherGroupsDetailsText.value = ''; // Clear value
                }
            });
        });
    }

    initializeRoleFilters() {
        this.filterChips = document.querySelectorAll('.role-filter-chip');
        this.roleCards = document.querySelectorAll('.role-card');

        if (this.filterChips.length > 0) {
            this.filterChips.forEach(chip => {
                chip.addEventListener('click', (e) => this.filterRoles(e));
            });
        }
    }

    changeStep(direction) {
        if (direction > 0 && !this.validateStep(this.currentStep)) {
            // MODIFIED: Show a more specific error
            this.flash.showError('Incomplete', 'Please correct the errors below.');
            return;
        }
        const newStep = this.currentStep + direction;
        if (newStep >= 0 && newStep < this.formSteps.length) {
            this.currentStep = newStep;
            this.updateFormSteps();
            this.updateProgressBar();

            // ===== SMOOTH SCROLL TO TOP OF FORM =====
            this.smoothScrollToForm();
        }
    }

    // ===== SMOOTH SCROLL TO FORM =====
    smoothScrollToForm() {
        const formCard = document.querySelector('.form-card');
        if (formCard) {
            const offset = 100; // Offset from top
            const elementPosition = formCard.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    // ===== NEW: Modern `validateField` function =====
    /**
     * Validates a single field and shows/hides the inline error message.
     */
    validateField(field) {
        const fieldName = field.name;
        const rules = this.validationRules[fieldName];
        if (!rules) return true; // Not a field we're validating

        let isValid = true;
        let errorMessage = '';

        if (field.type === 'radio') {
            const radioGroup = this.form.querySelectorAll(`input[name="${fieldName}"]`);
            if (![...radioGroup].some(r => r.checked)) {
                isValid = false;
                errorMessage = rules.message;
            }
        } else if (field.type === 'checkbox') {
            isValid = field.checked;
            if (!isValid) {
                errorMessage = rules.message;
            }
        } else {
            // This handles text, email, tel, textarea
            const value = field.value.trim();
            if (rules.required && !value) {
                isValid = false;
                errorMessage = rules.message;
            } else if (value && rules.pattern && !rules.pattern.test(value)) {
                isValid = false;
                errorMessage = rules.message;
            }
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        } else {
            this.clearFieldError(field);
        }
        return isValid;
    }

    // ===== NEW: Helper to show inline error =====
    showFieldError(field, message) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;

        // Remove old error
        this.clearFieldError(field);

        // Add error class to input
        field.classList.add('error');

        // Create and add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        // Special case for radio/checkbox groups
        if (field.type === 'radio' || field.type === 'checkbox') {
            const radioGroup = formGroup.querySelector('.radio-group');
            if (radioGroup) {
                radioGroup.appendChild(errorDiv);
            } else {
                field.parentElement.appendChild(errorDiv); // Append to label
            }
        } else {
            formGroup.appendChild(errorDiv);
        }
    }

    // ===== NEW: Helper to clear inline error =====
    clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;

        field.classList.remove('error');

        // Find all error messages in the group (for radio/checkboxes)
        const errorDivs = formGroup.querySelectorAll('.error-message');
        errorDivs.forEach(div => div.remove());
    }

    /**
     * Validates all required fields in the current step.
     */
    validateStep(stepIndex) {
        const currentStepElement = this.formSteps[stepIndex];
        const fields = currentStepElement.querySelectorAll('[required]');
        let allValid = true;

        // Keep track of validated radio groups so we don't check them multiple times
        const validatedRadioGroups = new Set();

        fields.forEach(field => {
            if (field.type === 'radio' && field.name) {
                if (validatedRadioGroups.has(field.name)) {
                    return; // Skip, already checked
                }
                validatedRadioGroups.add(field.name);
            }

            if (!this.validateField(field)) {
                allValid = false;
            }
        });

        return allValid;
    }

    updateFormSteps() {
        this.formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === this.currentStep);
        });
    }

    /**
     * Updates the progress bar with new theme colors.
     */
    updateProgressBar() {
        this.progressBarSteps.forEach((step, index) => {
            const stepContainer = step.parentElement;
            const stepLabel = stepContainer.querySelector('.step-label');

            step.classList.remove('active');
            stepLabel.style.color = 'var(--text-muted)'; // Use new variable

            if (index < this.currentStep) {
                step.classList.add('active');
                step.innerHTML = `<i class="fas fa-check"></i>`;
                stepLabel.style.color = 'var(--color-primary)'; // Use new variable
            } else if (index === this.currentStep) {
                step.classList.add('active');
                step.innerHTML = `${index + 1}`;
                stepLabel.style.color = 'var(--color-primary)'; // Use new variable
            } else {
                step.innerHTML = `${index + 1}`;
            }
        });
    }

    /**
     * Handles the final form submission.
     */
    async handleSubmit(e) {
        e.preventDefault();

        // Final validation check
        if (!this.validateStep(this.currentStep)) {
            this.flash.showError('Incomplete', 'Please correct the errors below.');
            return;
        }

        // PASTE THE WEB APP URL FROM YOUR GOOGLE APPS SCRIPT DEPLOYMENT HERE
        const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz7DVZe6kw__rabGKRXWMJ0ssRE2vwOf47EyLX_Q2vQZ5aTNIRogwcfu0-agf8NqM1l/exec'; // Your URL

        const originalButtonText = this.submitButton.innerHTML;
        this.submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Submitting...`;
        this.submitButton.disabled = true;

        const formData = new FormData(this.form);

        try {
            console.log('Submitting form to:', GAS_WEB_APP_URL);

            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                body: formData,
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response data:', result);

            if (result.success) {
                this.flash.showSuccess('Application Sent!', 'Thank you! We will get back to you shortly.');
                this.form.reset();

                // Manually trigger conditional field reset by firing 'change' on a "No" button
                this.form.querySelectorAll('input[name="pastVolunteer"][value="No"]').forEach(r => r.dispatchEvent(new Event('change')));
                this.form.querySelectorAll('input[name="otherGroups"][value="No"]').forEach(r => r.dispatchEvent(new Event('change')));

                this.currentStep = 0;
                this.updateFormSteps();
                this.updateProgressBar();
            } else {
                const errorMsg = result.error || result.message || 'An unknown error occurred.';
                console.error('Backend error:', errorMsg);
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('Submission Error:', error);
            this.flash.showError('Submission Failed', error.message || 'Could not submit the form. Please try again.');
        } finally {
            // Restore the button regardless of success or failure
            this.submitButton.innerHTML = originalButtonText;
            this.submitButton.disabled = false;
        }
    }

    filterRoles(e) {
        const selectedFilter = e.currentTarget.dataset.filter;

        this.filterChips.forEach(chip => {
            chip.classList.toggle('active', chip.dataset.filter === selectedFilter);
        });

        this.roleCards.forEach(card => {
            const cardCategory = card.dataset.category;
            const shouldShow = selectedFilter === 'all' || cardCategory === selectedFilter;
            card.style.display = shouldShow ? 'flex' : 'none';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VolunteerPage();
});