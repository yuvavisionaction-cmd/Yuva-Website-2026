/* ===== YUVA ALUMNI PAGE - JAVASCRIPT 2025 ===== */

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx0i9z_-ZpCH0bq9iIQRlYSPP0J4DF8F_PEjHT1js0Nk7gThwRFjXlvegeu2JEQBeaj/exec';



/**
 * FlashNotification System
 * Manages displaying success, error, and info pop-up messages.
 */
class FlashNotification {
    constructor() {
        this.initializeFlashSystem();
    }

    initializeFlashSystem() {
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
 * AlumniPage Class
 * Manages all interactive elements on the alumni page.
 */
class AlumniPage {
    constructor() {
        this.flash = new FlashNotification();
        this.form = document.getElementById('alumni-form');

        if (this.form) {
            this.initializeForm();
        }

        this.initializeAnimations();
        this.initializeCounters();
        this.setupScrollAnimations();
        this.loadFeaturedAlumni();
        this.initializeImageUploadHelper();
    }

    initializeForm() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();

        const submitButton = this.form.querySelector('.btn-submit');
        const originalButtonText = submitButton.innerHTML;

        submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Submitting...`;
        submitButton.disabled = true;

        // Validate form
        if (!this.validateForm()) {
            this.flash.showError('Incomplete Form', 'Please fill out all required fields.');
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
            return;
        }

        try {
            // Check if user selected a file to upload
            const imageFile = document.getElementById('imageFile').files[0];
            let imageUrl = document.getElementById('imageUrl').value;

            if (imageFile) {
                // Upload image to Supabase Storage
                submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading image...`;

                try {
                    imageUrl = await this.uploadImageToSupabase(imageFile);

                    if (!imageUrl) {
                        throw new Error('Image upload returned no URL');
                    }
                } catch (uploadError) {
                    // Show specific upload error
                    this.flash.showError('Upload Failed', uploadError.message || 'Failed to upload image');
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                    return; // Stop form submission
                }
            }

            // Prepare form data
            const formData = new FormData(this.form);

            // Set the image URL (either uploaded or pasted)
            if (imageUrl) {
                formData.set('imageUrl', imageUrl);
            }

            // Process interests checkboxes
            const interests = Array.from(this.form.querySelectorAll('input[name="interests"]:checked'))
                .map(checkbox => checkbox.value)
                .join(', ');
            formData.set('interests', interests);

            submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Submitting registration...`;

            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                this.flash.showSuccess('Welcome to YUVA Alumni!', 'Your registration was successful. Check your email for details.');
                this.form.reset();

                // Clear image preview
                const imagePreview = document.getElementById('imagePreview');
                if (imagePreview) {
                    imagePreview.style.display = 'none';
                }

                // Scroll to top after successful submission
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 1000);
            } else {
                throw new Error(result.error || result.message || 'Submission failed');
            }

        } catch (error) {
            this.flash.showError('Submission Failed', error.message || 'Unable to submit your registration. Please try again or contact support.');
        } finally {
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    }

    /**
     * Upload image via Google Apps Script backend
     */
    async uploadImageToSupabase(file) {
        try {
            // Validate file
            const maxSize = 500 * 1024; // 500KB
            if (file.size > maxSize) {
                this.flash.showError('File Too Large', 'Please select an image smaller than 500KB.');
                return null;
            }

            // Show progress
            const progressDiv = document.getElementById('upload-progress');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            if (progressDiv) {
                progressDiv.style.display = 'block';
                progressFill.style.width = '30%';
                progressText.textContent = 'Uploading image...';
            }

            // Convert image to base64
            const base64Image = await this.fileToBase64(file);

            if (progressFill) progressFill.style.width = '50%';

            // Generate filename
            const timestamp = Date.now();
            const email = document.getElementById('email').value.replace(/[^a-zA-Z0-9]/g, '_');
            const fileExt = file.name.split('.').pop();
            const fileName = `${email}_${timestamp}.${fileExt}`;

            // Send to Google Apps Script
            const formData = new FormData();
            formData.append('action', 'uploadImage');
            formData.append('imageData', base64Image);
            formData.append('fileName', fileName);
            formData.append('fileType', file.type);

            if (progressFill) progressFill.style.width = '70%';

            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (progressFill) progressFill.style.width = '90%';

            if (!result.success) {
                const errorMsg = result.error || result.message || 'Upload failed';
                throw new Error(errorMsg);
            }

            // Extract image URL from response (it's in result.data.imageUrl)
            const imageUrl = result.data?.imageUrl || result.imageUrl;

            if (!imageUrl) {
                throw new Error('Backend did not return image URL');
            }

            // Get public URL from response
            const publicURL = imageUrl;

            if (progressFill) {
                progressFill.style.width = '100%';
                progressText.textContent = 'Upload complete!';
            }

            setTimeout(() => {
                if (progressDiv) progressDiv.style.display = 'none';
            }, 1000);

            this.flash.showSuccess('Image Uploaded!', 'Your profile photo has been uploaded successfully.');
            return publicURL;

        } catch (error) {

            const progressDiv = document.getElementById('upload-progress');
            if (progressDiv) progressDiv.style.display = 'none';

            // Re-throw the error so the caller can handle it
            throw error;
        }
    }

    /**
     * Convert file to base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    validateForm() {
        const requiredFields = this.form.querySelectorAll('[required]');
        for (let field of requiredFields) {
            if (!field.value.trim()) {
                field.focus();
                return false;
            }
        }
        return true;
    }

    initializeAnimations() {
        // Tilt effect for benefit cards
        const benefitCards = document.querySelectorAll('[data-tilt]');

        benefitCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            });
        });
    }

    initializeCounters() {
        const counters = document.querySelectorAll('.stat-number');
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                    this.animateCounter(entry.target);
                    entry.target.classList.add('counted');
                }
            });
        }, observerOptions);

        counters.forEach(counter => observer.observe(counter));
    }

    animateCounter(element) {
        const target = parseInt(element.getAttribute('data-count'));
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += increment;
            if (current < target) {
                element.textContent = Math.floor(current) + '+';
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target + '+';
            }
        };

        updateCounter();
    }

    setupScrollAnimations() {
        // 1. ADDED: Define the options for the observer.
        // This tells it to trigger when 10% of an element is visible.
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        // 2. ADDED: Select all the sections on the page you want to animate.
        // You can add more selectors here (e.g., '.spotlight-section').
        const sectionsToAnimate = document.querySelectorAll('.perks-section, .roles-section, .form-section');

        const observer = new IntersectionObserver((entries, observer) => { // <-- Pass 'observer' here
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.8s ease-out forwards';
                    entry.target.style.opacity = 1;

                    // Stop observing the element once it has been animated
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // 3. ADDED: Tell the observer which elements to watch.
        sectionsToAnimate.forEach(section => {
            section.style.opacity = 0; // Hide the section initially
            observer.observe(section);
        });
    }

    async loadFeaturedAlumni() {
        const storiesContainer = document.querySelector('.stories-carousel');
        if (!storiesContainer) return;

        // The skeleton loader is already in the HTML.
        try {
            // Fetch featured alumni from Supabase via Google Apps Script
            const response = await fetch(`${GAS_WEB_APP_URL}?action=getFeaturedAlumni`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                storiesContainer.innerHTML = ''; // Clear the skeleton loaders

                result.data.forEach(story => {
                    const storyCard = document.createElement('div');
                    storyCard.className = 'story-card';
                    storyCard.style.animation = 'fadeIn 0.5s ease-out forwards';
                    storyCard.innerHTML = `
                        <div class="story-image">
                            <img src="${story.ImageURL}" alt="${story.Name}" loading="lazy">
                            <div class="story-badge">${story.Badge}</div>
                        </div>
                        <div class="story-content">
                            <h3>${story.Name}</h3>
                            <p class="story-role">${story.Role} at ${story.Organization || 'YUVA'}</p>
                            <p class="story-text">"${story.Quote}"</p>
                            <div class="story-stats">
                                <span><i class="fas fa-graduation-cap"></i> ${story.Batch} Batch</span>
                                <span><i class="fas fa-map-marker-alt"></i> ${story.City}</span>
                            </div>
                        </div>
                    `;
                    storiesContainer.appendChild(storyCard);

                    // Get the image element we just created
                    const imgElement = storyCard.querySelector('.story-image img');

                    // This function will add the 'loaded' class to make the image visible
                    const revealImage = () => {
                        imgElement.classList.add('loaded');
                    };

                    // Check if the image is already cached by the browser
                    if (imgElement.complete) {
                        revealImage();
                    } else {
                        // If not, add an event listener to run the function when it's done loading
                        imgElement.addEventListener('load', revealImage);
                        // Add error handler for broken images
                        imgElement.addEventListener('error', () => {
                            imgElement.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(story.Name) + '&size=400&background=FF9933&color=fff';
                            revealImage();
                        });
                    }
                });

                // Show success notification
                this.flash.showSuccess('Alumni Stories Loaded!', `Displaying ${result.data.length} featured alumni.`, 3000);

            } else {
                // No featured alumni found
                storiesContainer.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-users" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                        <p>No featured alumni stories available yet.</p>
                        <p style="font-size: 0.9rem; color: var(--text-muted);">Check back soon!</p>
                    </div>
                `;
                this.flash.showInfo('No Stories Yet', 'Featured alumni will appear here soon.', 3000);
            }
        } catch (error) {
            console.error('Failed to load featured alumni:', error);
            // Replace skeleton loader with an error message
            storiesContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                    <p>Could not load alumni stories.</p>
                    <p style="font-size: 0.9rem;">Please check your connection and try again.</p>
                </div>
            `;
            this.flash.showError('Loading Failed', 'Unable to fetch alumni stories. Please try again later.', 5000);
        }
    }
    initializeImageUploadHelper() {
        const imageUrlInput = document.getElementById('imageUrl');
        const stepsContainer = document.getElementById('image-upload-steps');

        if (!imageUrlInput || !stepsContainer) return;

        const showSteps = () => {
            // Check if the steps are already visible to prevent repeating the action
            if (stepsContainer.classList.contains('show')) {
                return;
            }

            // Show the flash notification
            this.flash.showInfo('Image Link Required', 'Please provide a public URL to your photo.', 6000);

            // Add the instruction content to the div
            stepsContainer.innerHTML = `
                <h4><i class="fas fa-info-circle"></i>How to get your Image URL:</h4>
                <ul>
                    <li>
                        <span class="step-number">1</span>
                        <div>Go to <a href="https://postimages.org/" target="_blank">Postimages.org</a> and upload your photo.</div>
                    </li>
                    <li>
                        <span class="step-number">2</span>
                        <div>After the upload is complete, look for the field labeled <strong>"Direct Link"</strong> and copy the URL.</div>
                    </li>
                    <li>
                        <span class="step-number">3</span>
                        <div>Paste the <strong>Direct Link</strong> you copied into the input field above. That's it!</div>
                    </li>
                </ul>
            `;
            // Add the 'show' class to trigger the CSS slide-down animation
            stepsContainer.classList.add('show');
        };

        // Listen for a 'focus' event (when the user clicks into the input box)
        imageUrlInput.addEventListener('focus', showSteps);
    }
}

// Global scroll functions for buttons
function scrollToForm() {
    const formSection = document.getElementById('registration-form');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function scrollToStories() {
    const storiesSection = document.getElementById('stories');
    if (storiesSection) {
        storiesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================
// IMAGE UPLOAD HELPER FUNCTIONS
// ============================================

/**
 * Handle image file selection and show preview
 */
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPG, PNG, or WebP)');
        event.target.value = '';
        return;
    }

    // Validate file size (500KB)
    const maxSize = 500 * 1024;
    if (file.size > maxSize) {
        alert('Image size must be less than 500KB');
        event.target.value = '';
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = function (e) {
        const previewImg = document.getElementById('previewImg');
        const imagePreview = document.getElementById('imagePreview');

        if (previewImg && imagePreview) {
            previewImg.src = e.target.result;
            imagePreview.style.display = 'block';
        }

        // Clear URL input if file is selected
        const imageUrlInput = document.getElementById('imageUrl');
        if (imageUrlInput) {
            imageUrlInput.value = '';
        }
    };
    reader.readAsDataURL(file);
}

/**
 * Remove selected image
 */
function removeImage() {
    const imageFileInput = document.getElementById('imageFile');
    const imagePreview = document.getElementById('imagePreview');

    if (imageFileInput) {
        imageFileInput.value = '';
    }

    if (imagePreview) {
        imagePreview.style.display = 'none';
    }
}


// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const alumniPage = new AlumniPage();
    setTimeout(() => {
        alumniPage.flash.showSuccess('Welcome, YUVA Alumni!', 'We are glad to have you back.', 4000);
    }, 1000);

    // Add smooth scrolling to all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    // Form input focus animations
    const inputs = document.querySelectorAll('.form-group input, .form-group select');
    inputs.forEach(input => {
        input.addEventListener('focus', function () {
            this.parentElement.classList.add('focused');
        });
        input.addEventListener('blur', function () {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });

    // Image file input handler
    const imageFileInput = document.getElementById('imageFile');
    if (imageFileInput) {
        imageFileInput.addEventListener('change', handleImageSelect);
    }
});
