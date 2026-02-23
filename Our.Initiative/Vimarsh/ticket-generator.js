// ============================================================================
// VIMARSH 2026 - CLIENT-SIDE TICKET PDF GENERATOR
// ============================================================================
// Purpose: Generate high-quality PDF tickets from HTML template
// Uses: html2canvas + jsPDF for client-side PDF generation
// QR Code: Deterministic hash from backend (same as email QR)
// ============================================================================

/**
 * Generate and download ticket PDF for a registration
 * @param {Object} registrationData - Complete registration data from backend
 * @returns {Promise<Blob>} - PDF blob for download
 */
async function generateTicketPDF(registrationData) {

    const ticketHTML = await createTicketHTML(registrationData);

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-9999px";
    wrapper.style.top = "0";
    wrapper.innerHTML = ticketHTML;

    document.body.appendChild(wrapper);

    await new Promise(r => setTimeout(r, 800));

    const ticket = wrapper.querySelector(".ticket");
    if (!ticket) throw new Error("Ticket not rendered");

    const canvas = await html2canvas(ticket, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff"
    });

    wrapper.remove();

    const PDF = jspdf.jsPDF;

    const width = 250;
    const height = canvas.height * width / canvas.width;

    const pdf = new PDF({
        orientation: "landscape",
        unit: "mm",
        format: [width, height]
    });

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height);

    return pdf;
}

/**
 * Create ticket HTML from registration data
 * Fetches pre-populated HTML from backend Apps Script
 * Backend stores ticket.html template and injects data server-side
 */
async function createTicketHTML(reg) {
    try {
        console.log('📋 Fetching ticket HTML from backend...');

        // Request pre-filled ticket HTML from Apps Script backend
        const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?origin=${encodeURIComponent(window.location.origin)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'generateTicketHTML',
                registrationId: reg.registration_id,
                firstName: reg.first_name,
                lastName: reg.last_name,
                collegeName: reg.college_name,
                zoneName: reg.zone_name,
                qrCodeHash: reg.qr_code_hash
            })
        });

        if (!response.ok) {
            throw new Error(`Backend request failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.html) {
            console.log('✅ Ticket HTML received from backend');
            return result.html;
        } else {
            throw new Error(result.message || 'Backend did not return HTML');
        }

    } catch (error) {
        console.error('❌ Error fetching ticket HTML from backend:', error);
        throw new Error('Failed to get ticket HTML from backend: ' + error.message);
    }
}


/**
 * Wait for all resources (fonts, images) to load
 */
function waitForResources(container) {
    return new Promise((resolve) => {
        let fontReady = false;
        let imagesReady = false;

        // Check fonts
        const checkFonts = () => {
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    fontReady = true;
                    if (imagesReady) resolve();
                }).catch(() => {
                    fontReady = true; // Assume ready even if error
                    if (imagesReady) resolve();
                });
            } else {
                fontReady = true; // No fonts API, skip
                if (imagesReady) resolve();
            }
        };

        // Check images
        const checkImages = () => {
            const images = container.querySelectorAll('img');
            if (images.length === 0) {
                imagesReady = true;
                if (fontReady) resolve();
                return;
            }

            let loadedCount = 0;
            const totalImages = images.length;

            images.forEach(img => {
                // Force image to load with CORS
                img.crossOrigin = 'anonymous';

                if (img.complete && img.naturalHeight > 0) {
                    loadedCount++;
                } else {
                    img.onload = () => {
                        loadedCount++;
                        if (loadedCount === totalImages) {
                            imagesReady = true;
                            if (fontReady) resolve();
                        }
                    };
                    img.onerror = () => {
                        loadedCount++;
                        console.warn('⚠️ Failed to load image:', img.src);
                        if (loadedCount === totalImages) {
                            imagesReady = true;
                            if (fontReady) resolve();
                        }
                    };
                }
            });

            if (loadedCount === totalImages) {
                imagesReady = true;
                if (fontReady) resolve();
            }

            // Fallback timeout - resolve after max wait time
            setTimeout(() => {
                imagesReady = true;
                if (fontReady) resolve();
            }, 4000);
        };

        checkFonts();
        checkImages();
    });
}

/**
 * Download ticket PDF with proper filename
 */
function downloadTicketPDF(pdf, registrationId) {
    const filename = `Vimarsh_2026_Ticket_${registrationId}.pdf`;
    pdf.save(filename);
    console.log(`✅ Ticket downloaded: ${filename}`);
}

/**
 * Main function to generate and download ticket
 * Called from success modal or regeneration flow
 */
async function generateAndDownloadTicket(registrationData) {
    try {
        // Show loading indicator
        showTicketGenerationLoading(true);

        // Generate PDF
        const pdf = await generateTicketPDF(registrationData);

        // Download PDF
        downloadTicketPDF(pdf, registrationData.registration_id);

        // Hide loading indicator
        showTicketGenerationLoading(false);

        return true;
    } catch (error) {
        console.error('❌ Failed to generate ticket:', error);
        showTicketGenerationLoading(false);
        alert('Failed to generate ticket PDF. Please try again or contact support.');
        return false;
    }
}

/**
 * Show/hide ticket generation loading indicator
 */
function showTicketGenerationLoading(show) {
    const existingLoader = document.getElementById('ticketGenerationLoader');

    if (show) {
        if (!existingLoader) {
            const loader = document.createElement('div');
            loader.id = 'ticketGenerationLoader';
            loader.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 30px 50px;
                border-radius: 15px;
                z-index: 10000;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            `;
            loader.innerHTML = `
                <div style="font-size: 18px; margin-bottom: 15px;">
                    <i class="fas fa-ticket-alt" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                    Generating your ticket...
                </div>
                <div style="font-size: 14px; color: #ccc;">
                    Please wait, this may take a few seconds
                </div>
            `;
            document.body.appendChild(loader);
        }
    } else {
        if (existingLoader) {
            existingLoader.remove();
        }
    }
}

/**
 * Fetch registration data by Registration ID or Email
 * Used for ticket regeneration flow
 */
async function fetchRegistrationForTicket(identifier, identifierType = 'email') {
    try {
        const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?origin=${encodeURIComponent(window.location.origin)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'checkStatus',
                [identifierType === 'email' ? 'email' : 'registrationId']: identifier
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();

        if (result.found && result.registrations && result.registrations.length > 0) {
            // Sort registrations to find the completed one first
            const completedReg = result.registrations.find(r => r.payment_status === 'completed');

            if (completedReg) {
                // Fetch full registration details
                return await fetchFullRegistrationDetails(completedReg.registration_id);
            } else {
                // Not completed - let's see what the status is of the first one
                const latestStatus = result.registrations[0].payment_status;
                throw new Error(`Your registration was found, but the payment status is currently "${latestStatus}". If you just paid, please wait a minute or contact support.`);
            }
        } else {
            throw new Error('No registration found for the provided details. Please check your Email/ID and try again.');
        }
    } catch (error) {
        console.error('Error fetching registration:', error);
        throw error;
    }
}

/**
 * Fetch complete registration details including QR hash
 */
async function fetchFullRegistrationDetails(registrationId) {
    // This would need a new backend endpoint or we can use the existing checkStatus
    // For now, we'll use checkStatus which should return the qr_code_hash
    const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?origin=${encodeURIComponent(window.location.origin)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
            action: 'checkStatus',
            registrationId: registrationId
        })
    });

    if (!response.ok) {
        throw new Error('Failed to fetch registration details');
    }

    const result = await response.json();

    if (result.found && result.registrations && result.registrations.length > 0) {
        const reg = result.registrations[0];
        // Handle naming inconsistencies (qr_code_hash vs qrHash)
        // If both are missing, use registrationId as fallback for the QR code
        reg.qr_code_hash = reg.qr_code_hash || reg.qrHash || reg.registration_id;
        return reg;
    } else {
        throw new Error('Could not retrieve full registration details.');
    }
}
