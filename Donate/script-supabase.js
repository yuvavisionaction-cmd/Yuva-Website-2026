// ===== DONATE PAGE JAVASCRIPT - GOOGLE APPS SCRIPT + SUPABASE VERSION =====

class DonationManager {
    constructor() {
        // Google Apps Script Backend URL
        // IMPORTANT: Replace with your deployed Google Apps Script URL
        this.backendUrl = 'https://script.google.com/macros/s/AKfycbxiVt3pDychzTgTO-_Y-iW6IY1C6R1Jlq6A60LQZJofzQXDDSGn3GUTSBhGt1GDZ4wKZA/exec';
        // Example: 'https://script.google.com/macros/s/AKfycby.../exec'

        // Razorpay Configuration (Public Key Only - Secret is in backend)
        this.razorpayKeyId = 'rzp_live_RCnlaKffG5VeY0';

        // State
        this.isRecurring = false;
        this.selectedAmount = null;
        this.customAmount = null;
        this.donorInfo = {};
        this.paymentAttempts = 0;
        this.maxRetries = 3;

        this.init();
    }

    init() {
        this.loadRazorpayScript();
        this.bindEvents();
        this.setupFormValidation();
        this.initializeFlashSystem();
        this.testBackendConnection();
    }

    // ===== FLASH NOTIFICATION SYSTEM =====
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
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
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

    // ===== BACKEND COMMUNICATION =====
    async makeBackendRequest(endpoint, data = {}) {
        try {
            if (!this.backendUrl || this.backendUrl.includes('YOUR_GOOGLE_APPS_SCRIPT')) {
                throw new Error('Backend URL not configured. Please update the backendUrl in script-supabase.js');
            }

            const url = `${this.backendUrl}?path=${endpoint}`;

            const options = {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(data)
            };

            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Backend request error:', error);
            throw error;
        }
    }

    async testBackendConnection() {
        try {
            this.showInfo('Connecting...', 'Testing backend connection...');

            const response = await this.makeBackendRequest('test');

            if (response.success) {
                this.showSuccess('Connection Successful', 'Backend is ready to process donations');
            } else {
                this.showWarning('Connection Issue', 'Backend connection issue detected. Please refresh the page.');
            }
        } catch (error) {
            this.showError('Connection Failed', 'Unable to connect to backend. Please check configuration.');
            console.error('Backend connection error:', error);
        }
    }

    // ===== RAZORPAY INITIALIZATION =====
    loadRazorpayScript() {
        if (window.Razorpay) {
            this.initializeRazorpay();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => this.initializeRazorpay();
        script.onerror = () => this.showError('Payment Gateway Error', 'Failed to load payment gateway. Please refresh the page.');
        document.head.appendChild(script);
    }

    initializeRazorpay() {
        this.showInfo('Payment System Ready', 'Payment gateway loaded successfully');
    }

    // ===== EVENT BINDINGS =====
    bindEvents() {
        // Donation type selection
        document.querySelectorAll('input[name="donationType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'recurring') {
                    this.showWarning(
                        'Feature in Development',
                        'Recurring donations are coming soon! Please select "One-time Donation" for now.'
                    );
                    document.getElementById('oneTime').checked = true;
                    return;
                }
                this.isRecurring = false;
                this.updateDonationType();
                this.animateFormSection();
            });
        });

        // Amount selection
        document.querySelectorAll('input[name="amount"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.selectedAmount = e.target.value;
                this.customAmount = null;
                this.updateAmountDisplay();
                this.animateAmountSelection();
            });
        });

        // Custom amount input
        const customAmountInput = document.getElementById('customAmount');
        if (customAmountInput) {
            customAmountInput.addEventListener('input', (e) => {
                this.customAmount = parseFloat(e.target.value) || null;
                this.selectedAmount = null;
                this.updateAmountDisplay();
                this.animateAmountSelection();
            });

            customAmountInput.addEventListener('focus', () => {
                document.querySelector('input[name="amount"][value="custom"]').checked = true;
                this.selectedAmount = 'custom';
                this.updateAmountDisplay();
            });
        }

        // Form submission
        const donateForm = document.getElementById('donateForm');
        if (donateForm) {
            donateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processDonation();
            });
        }

        // Real-time form validation
        document.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => {
                this.clearFieldError(field);
                this.clearFlashMessages();
            });
        });

        // 80G Tax Exemption Checkbox
        const wants80G = document.getElementById('wants80G');
        if (wants80G) {
            wants80G.addEventListener('change', () => {
                const taxFields = document.getElementById('tax-exemption-fields');
                const aadhaarInput = document.getElementById('aadhaarNumber');
                const panInput = document.getElementById('panNumber');

                if (wants80G.checked) {
                    taxFields.style.display = 'block';
                    aadhaarInput.setAttribute('required', 'true');
                    panInput.setAttribute('required', 'true');
                } else {
                    taxFields.style.display = 'none';
                    aadhaarInput.removeAttribute('required');
                    panInput.removeAttribute('required');
                    this.clearFieldError(aadhaarInput);
                    this.clearFieldError(panInput);
                }
            });
        }

        // Agree to Terms Checkbox
        const agreeToTerms = document.getElementById('agreeToTerms');
        const donateButton = document.getElementById('donateButton');
        if (agreeToTerms && donateButton) {
            agreeToTerms.addEventListener('change', () => {
                donateButton.disabled = !agreeToTerms.checked;
            });
        }
    }

    setupFormValidation() {
        this.validationRules = {
            firstName: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s.-]+$/,
                message: 'Please enter a valid first name'
            },
            surname: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s.-]+$/,
                message: 'Please enter a valid surname'
            },
            donorEmail: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            donorPhone: {
                required: true,
                pattern: /^[6-9]\d{9}$/,
                message: 'Please enter a valid 10-digit mobile number'
            },
            donorAddress: {
                required: true,
                minLength: 10,
                message: 'Please enter your full address (min 10 characters)'
            },
            aadhaarNumber: {
                required: false,
                pattern: /^\d{12}$/,
                message: 'Aadhaar must be 12 digits'
            },
            panNumber: {
                required: false,
                pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i,
                message: 'PAN must be in the format ABCDE1234F'
            }
        };
    }

    // ===== ANIMATION METHODS =====
    animateFormSection() {
        const formSections = document.querySelectorAll('.form-section');
        formSections.forEach((section, index) => {
            section.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s both`;
        });
    }

    animateAmountSelection() {
        const amountOptions = document.querySelectorAll('.amount-option');
        amountOptions.forEach((option, index) => {
            option.style.animation = `bounceIn 0.3s ease-out ${index * 0.05}s both`;
        });
    }

    updateDonationType() {
        const recurringElements = document.querySelectorAll('.recurring-only');
        const oneTimeElements = document.querySelectorAll('.one-time-only');

        if (this.isRecurring) {
            recurringElements.forEach(el => el.style.display = 'block');
            oneTimeElements.forEach(el => el.style.display = 'none');
            this.updateDonateButton('Start Monthly Donation');
        } else {
            recurringElements.forEach(el => el.style.display = 'none');
            oneTimeElements.forEach(el => el.style.display = 'block');
            this.updateDonateButton('Continue to Payment');
        }
    }

    updateAmountDisplay() {
        const amountDisplay = document.getElementById('amountDisplay');
        if (!amountDisplay) return;

        const amount = this.getFinalAmount();
        if (amount) {
            amountDisplay.textContent = `₹${amount.toLocaleString('en-IN')}`;
            amountDisplay.classList.add('show');
            amountDisplay.style.animation = 'bounceIn 0.5s ease-out';
        } else {
            amountDisplay.classList.remove('show');
        }
    }

    getFinalAmount() {
        if (this.customAmount && this.customAmount > 0) {
            return this.customAmount;
        }
        if (this.selectedAmount && this.selectedAmount !== 'custom') {
            return parseFloat(this.selectedAmount);
        }
        return null;
    }

    updateDonateButton(text) {
        const donateButton = document.getElementById('donateButton');
        if (donateButton) {
            const buttonText = donateButton.querySelector('.button-text');
            if (buttonText) {
                buttonText.textContent = text;
            }
        }
    }

    // ===== FORM VALIDATION =====
    validateField(field) {
        const fieldName = field.name;
        const rules = this.validationRules[fieldName];

        if (!rules) return true;

        if (fieldName === 'aadhaarNumber' || fieldName === 'panNumber') {
            rules.required = document.getElementById('wants80G').checked;
        }

        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        if (rules.required && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        else if (value && rules.pattern && !rules.pattern.test(value)) {
            isValid = false;
            errorMessage = rules.message;
        }
        else if (value && rules.minLength && value.length < rules.minLength) {
            isValid = false;
            errorMessage = `Minimum ${rules.minLength} characters required`;
        }

        if (fieldName === 'panNumber' && value && !rules.pattern.test(value.toUpperCase())) {
            isValid = false;
            errorMessage = rules.message;
        }

        this.showFieldError(field, errorMessage);
        return isValid;
    }

    showFieldError(field, message) {
        this.clearFieldError(field);

        if (message) {
            field.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            field.parentNode.appendChild(errorDiv);
        }
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    validateForm() {
        const requiredFields = ['firstName', 'surname', 'donorEmail', 'donorPhone', 'donorAddress'];
        let isValid = true;

        this.clearErrors();

        requiredFields.forEach(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        });

        const wants80G = document.getElementById('wants80G').checked;
        if (wants80G) {
            const aadhaarField = document.querySelector('[name="aadhaarNumber"]');
            if (aadhaarField && !this.validateField(aadhaarField)) {
                isValid = false;
            }

            const panField = document.querySelector('[name="panNumber"]');
            if (panField && panField.value.trim() && !this.validateField(panField)) {
                isValid = false;
            }
        }

        const amount = this.getFinalAmount();
        if (!amount || amount < 1) {
            this.showError('Amount Required', 'Please select or enter a valid donation amount');
            isValid = false;
        }

        const agreeToTerms = document.getElementById('agreeToTerms').checked;
        if (!agreeToTerms) {
            this.showError('Agreement Required', 'You must agree that donations are non-refundable');
            isValid = false;
        }

        return isValid;
    }

    clearErrors() {
        document.querySelectorAll('.form-group .form-input.error').forEach(input => {
            input.classList.remove('error');
        });

        document.querySelectorAll('.error-message').forEach(error => {
            error.remove();
        });
    }

    clearFlashMessages() {
        const flashContainer = document.getElementById('flash-container');
        if (flashContainer) {
            const notifications = flashContainer.querySelectorAll('.flash-notification');
            notifications.forEach(notification => {
                if (notification.classList.contains('info')) {
                    this.removeFlashNotification(notification);
                }
            });
        }
    }

    collectDonorInfo() {
        this.donorInfo = {
            firstName: document.querySelector('[name="firstName"]')?.value.trim(),
            surname: document.querySelector('[name="surname"]')?.value.trim(),
            email: document.querySelector('[name="donorEmail"]')?.value.trim(),
            phone: document.querySelector('[name="donorPhone"]')?.value.trim(),
            address: document.querySelector('[name="donorAddress"]')?.value.trim(),
            amount: this.getFinalAmount(),
            donationType: this.isRecurring ? 'recurring' : 'one-time',
            wants80G: document.getElementById('wants80G').checked,
            aadhaar: document.querySelector('[name="aadhaarNumber"]')?.value.trim(),
            pan: document.querySelector('[name="panNumber"]')?.value.trim().toUpperCase(),
            userAgent: navigator.userAgent
        };
    }

    // ===== DONATION PROCESSING =====
    async processDonation() {
        if (!this.validateForm()) {
            this.showError('Form Validation', 'Please fill all required fields correctly');
            return;
        }

        this.clearFlashMessages();
        this.collectDonorInfo();
        this.setLoading(true);
        this.paymentAttempts++;

        this.showInfo('Processing...', 'Preparing your donation...');

        try {
            if (this.isRecurring) {
                await this.processRecurringDonation();
            } else {
                await this.processOneTimeDonation();
            }
        } catch (error) {
            await this.handlePaymentError(error);
        } finally {
            this.setLoading(false);
        }
    }

    async processOneTimeDonation() {
        this.showInfo('Creating Order', 'Setting up your payment...');

        // Create Razorpay order via backend
        const orderResponse = await this.makeBackendRequest('create-order', {
            amount: this.donorInfo.amount,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`
        });

        if (!orderResponse.success) {
            throw new Error(orderResponse.error || 'Failed to create order');
        }

        const orderId = orderResponse.order.id;

        const options = {
            key: this.razorpayKeyId,
            amount: this.donorInfo.amount * 100,
            currency: 'INR',
            name: 'YUVA - Youth United For Vision & Action',
            description: 'Donation to YUVA',
            // image: '/Images/YUVA logo.png', // Removed to avoid CORS issues
            order_id: orderId,
            prefill: {
                name: `${this.donorInfo.firstName} ${this.donorInfo.surname}`,
                email: this.donorInfo.email,
                contact: this.donorInfo.phone
            },
            theme: {
                color: '#555879'
            },
            handler: (response) => {
                this.handlePaymentSuccess(response);
            },
            modal: {
                ondismiss: () => {
                    this.showWarning('Payment Cancelled', 'Payment was cancelled by user');
                    this.setLoading(false);
                }
            }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
    }

    async handlePaymentSuccess(response) {
        // Step 1: Payment Success
        this.showSuccess('Payment Successful!', 'Your payment has been processed successfully. Verifying payment signature...');

        try {
            // Step 2: Verify payment signature via backend
            const verifyResponse = await this.makeBackendRequest('verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
            });

            if (!verifyResponse.success) {
                throw new Error('Payment verification failed');
            }

            // Step 3: Verification Success
            this.showSuccess('Payment Verified!', 'Payment signature verified successfully. Saving your donation details to our database...');

            // Step 4: Save donation to Supabase via backend
            const saveResponse = await this.makeBackendRequest('save-donation', {
                ...this.donorInfo,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature
            });

            if (!saveResponse.success) {
                throw new Error('Failed to save donation');
            }

            // Step 5: Final Success - Clear all previous notifications first
            const flashContainer = document.getElementById('flash-container');
            if (flashContainer) {
                flashContainer.innerHTML = '';
            }

            // Show final success message with longer duration
            this.showFlashNotification(
                'success',
                '🎉 Donation Successful!',
                `Thank you for your generous donation of ₹${this.donorInfo.amount.toLocaleString('en-IN')}! Your contribution has been recorded successfully. You will receive a confirmation email with your donation receipt shortly.`,
                12000 // Show for 12 seconds
            );

            // Reset form after a delay
            setTimeout(() => {
                this.resetForm();
            }, 1000);

        } catch (error) {
            console.error('Error processing payment:', error);

            // Clear previous notifications
            const flashContainer = document.getElementById('flash-container');
            if (flashContainer) {
                flashContainer.innerHTML = '';
            }

            this.showFlashNotification(
                'error',
                'Processing Error',
                'Your payment was successful, but we encountered an error saving your donation details. Please don\'t worry - we have your payment ID (' + response.razorpay_payment_id + ') and will contact you shortly to confirm your donation.',
                15000 // Show for 15 seconds
            );
        }
    }

    async handlePaymentError(error) {
        console.error('Payment error:', error);
        this.showError('Payment Failed', error.message || 'An error occurred during payment processing');
        this.setLoading(false);
    }

    setLoading(loading) {
        const donateButton = document.getElementById('donateButton');
        if (donateButton) {
            const buttonText = donateButton.querySelector('.button-text');
            const buttonIcon = donateButton.querySelector('.button-icon');

            if (loading) {
                donateButton.classList.add('loading');
                donateButton.disabled = true;

                // Change button text and add spinner
                if (buttonText) {
                    buttonText.textContent = 'Processing...';
                }
                if (buttonIcon) {
                    buttonIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                }
            } else {
                const agreeToTerms = document.getElementById('agreeToTerms').checked;
                donateButton.classList.remove('loading');
                donateButton.disabled = !agreeToTerms;

                // Reset button text and icon
                if (buttonText) {
                    buttonText.textContent = 'Continue to Payment';
                }
                if (buttonIcon) {
                    buttonIcon.innerHTML = '<i class="fas fa-arrow-right"></i>';
                }
            }
        }
    }

    resetForm() {
        document.getElementById('donateForm')?.reset();
        this.selectedAmount = null;
        this.customAmount = null;
        this.donorInfo = {};
        this.updateAmountDisplay();

        // Reset tax exemption fields visibility
        const taxFields = document.getElementById('tax-exemption-fields');
        if (taxFields) {
            taxFields.style.display = 'none';
        }
    }
}

// ===== INITIALIZE ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', () => {
    window.donationManager = new DonationManager();
});
