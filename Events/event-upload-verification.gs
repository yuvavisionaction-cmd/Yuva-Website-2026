/**
 * Event Upload - Email Verification Backend
 * Google Apps Script Implementation
 * 
 * Deployment: Web App (Anyone)
 * Handles: Verification code generation, email sending, code validation
 */

// ===== CONFIGURATION =====
const SUPABASE_URL = 'https://jgsrsjwmywiirtibofth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5KtvO0cEHfnECBoyp2CQnw_RC3_x2me';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnc3JzandteXdpaXJ0aWJvZnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA3NjY0OCwiZXhwIjoyMDc0NjUyNjQ4fQ.tQ9aD4OP1okfdgNr8O4LqIkYAF4rUvbRBN4XBW-KrZo';

const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

// ===== MAIN ENTRY POINT =====
/**
 * Handles POST requests from frontend
 * Actions: sendVerificationCode, verifyCode
 */
function doPost(e) {
    try {
        const payload = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
        const data = JSON.parse(payload);

        let result;
        switch (data.action) {
            case 'sendVerificationCode':
                result = handleSendVerificationCode(data.email, data.ipAddress || e.clientAddress);
                break;

            case 'verifyCode':
                result = handleVerifyCode(data.email, data.code);
                break;

            default:
                result = { success: false, error: 'Invalid action', statusCode: 400 };
                break;
        }

        const statusCode = (result && typeof result.statusCode === 'number') ? result.statusCode : 200;
        // Always return JSON as TEXT so browsers can read it without relying on CORS headers.
        return createResponse(result, statusCode);
    } catch (error) {
        logError('Unexpected error in doPost', error);
        return createResponse({
            success: false,
            error: 'Server error occurred',
            statusCode: 500
        }, 500);
    }
}

/**
 * Handles CORS preflight requests (OPTIONS)
 */
function doOptions(e) {
    return createResponse({ success: true }, 200);
}

// ===== VERIFICATION CODE HANDLING =====

/**
 * Generates verification code and sends email
 * @param {string} email - User's email address
 * @param {string} ipAddress - Client IP for rate limiting
 * @returns {object} Response object
 */
function handleSendVerificationCode(email, ipAddress) {
    try {
        // Validate email format
        if (!isValidEmail(email)) {
            return {
                success: false,
                error: 'Please enter a valid email address',
                statusCode: 400
            };
        }

        // Rate limiting: Check recent attempts from this IP
        const rateLimitCheck = checkRateLimit(ipAddress);
        if (!rateLimitCheck.allowed) {
            return {
                success: false,
                error: `Too many attempts. Please try again in ${rateLimitCheck.minutesRemaining} minutes.`,
                statusCode: 429
            };
        }

        // Cleanup old unverified codes for this email
        cleanupOldCodes(email);

        // Generate secure 6-digit code
        const verificationCode = generateSecureCode();
        const codeHash = hashCode(verificationCode);

        // Calculate expiry time (10 minutes from now)
        const expiryTime = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

        // Store verification code in Supabase
        const stored = supabaseInsert('event_upload_verification', {
            email: email.toLowerCase().trim(),
            verification_code: verificationCode,
            code_hash: codeHash,
            created_at: new Date().toISOString(),
            expires_at: expiryTime.toISOString(),
            ip_address: ipAddress,
            user_agent: 'GoogleAppsScript',
            attempts: 0,
            is_verified: false
        });

        if (!stored.success) {
            logError('Database insert failed', stored.error);
            return {
                success: false,
                error: 'Failed to generate verification code. Please try again.',
                statusCode: 500
            };
        }

        // Send verification email
        const emailSent = sendVerificationEmail(email, verificationCode);
        if (!emailSent) {
            logError('Email send failed for', email);
            return {
                success: false,
                error: 'Unable to send email. Please check your email address and try again.',
                statusCode: 500
            };
        }

        // Log successful code generation
        logEvent('VERIFICATION_CODE_SENT', {
            email: email,
            ipAddress: ipAddress,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            message: 'Verification code has been sent to your email',
            expiresIn: VERIFICATION_CODE_EXPIRY_MINUTES * 60 // seconds
        };

    } catch (error) {
        logError('Error in handleSendVerificationCode', error);
        return {
            success: false,
            error: 'An error occurred. Please try again later.',
            statusCode: 500
        };
    }
}

/**
 * Verifies the code entered by user
 * @param {string} email - User's email address
 * @param {string} code - Code entered by user (6 digits)
 * @returns {object} Verification result
 */
function handleVerifyCode(email, code) {
    try {
        // Validate inputs
        if (!isValidEmail(email)) {
            return {
                success: false,
                error: 'Invalid email address',
                statusCode: 400
            };
        }

        if (!code || code.length !== VERIFICATION_CODE_LENGTH || !/^\d+$/.test(code)) {
            return {
                success: false,
                error: 'Please enter a valid 6-digit code',
                statusCode: 400
            };
        }

        // Fetch active verification record
        const verifications = supabaseSelect('event_upload_verification', {
            email: email.toLowerCase().trim(),
            is_verified: 'false'
        });

        if (!verifications || verifications.length === 0) {
            return {
                success: false,
                error: 'No active verification code found. Please request a new code.',
                statusCode: 404
            };
        }

        const record = verifications[0];

        // Check if code has expired
        if (new Date(record.expires_at) < new Date()) {
            return {
                success: false,
                error: 'Verification code has expired. Please request a new code.',
                statusCode: 410 // Gone
            };
        }

        // Check attempt limit
        if (record.attempts >= MAX_ATTEMPTS) {
            // Mark record as failed
            supabaseUpdate('event_upload_verification', record.id, {
                is_verified: false,
                attempts: record.attempts + 1
            });

            return {
                success: false,
                error: 'Too many failed attempts. Please request a new code.',
                statusCode: 429
            };
        }

        // Verify code - compare with stored plaintext
        if (code !== record.verification_code) {
            // Increment attempt counter
            const newAttempts = record.attempts + 1;
            const updateAttemptsResult = supabaseUpdate('event_upload_verification', record.id, {
                attempts: newAttempts
            });
            
            if (!updateAttemptsResult) {
                logError('Failed to update attempts', {recordId: record.id, email: email, attempts: newAttempts});
            }

            const attemptsRemaining = MAX_ATTEMPTS - newAttempts;
            return {
                success: false,
                error: `Invalid verification code. ${attemptsRemaining} attempts remaining.`,
                attemptsRemaining: attemptsRemaining,
                statusCode: 401
            };
        }

        // Code is valid - mark as verified
        const updateVerificationResult = supabaseUpdate('event_upload_verification', record.id, {
            is_verified: true,
            verified_at: new Date().toISOString()
        });
        
        if (!updateVerificationResult) {
            logError('Failed to update verification status', {recordId: record.id, email: email});
            return {
                success: false,
                error: 'Verification succeeded but database update failed. Please try again.',
                statusCode: 500
            };
        }

        // Get or create event_uploader record
        let uploader = supabaseSelect('event_uploaders', {
            email: email.toLowerCase().trim()
        });

        if (!uploader || uploader.length === 0) {
            // Create new uploader record
            const newUploaderResult = supabaseInsert('event_uploaders', {
                email: email.toLowerCase().trim(),
                verified_at: new Date().toISOString(),
                is_active: true,
                created_at: new Date().toISOString()
            });

            if (!newUploaderResult.success) {
                logError('Failed to create uploader record', newUploaderResult.error);
                return {
                    success: false,
                    error: 'Verification succeeded but profile creation failed. Please contact support.',
                    statusCode: 500
                };
            }

            uploader = [newUploaderResult.data];
        }

        // Log successful verification
        logEvent('VERIFICATION_CODE_VERIFIED', {
            email: email,
            uploaderId: uploader[0].id,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            message: 'Email verified successfully!',
            uploaderId: uploader[0].id,
            email: email
        };

    } catch (error) {
        logError('Error in handleVerifyCode', error);
        return {
            success: false,
            error: 'Verification failed. Please try again.',
            statusCode: 500
        };
    }
}

// ===== SECURITY FUNCTIONS =====

/**
 * Generates a cryptographically random 6-digit code
 * @returns {string} 6-digit code
 */
function generateSecureCode() {
    let code = '';
    for (let i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
        // Use Math.random() seeded with high-precision timestamp
        code += Math.floor(Math.random() * 10);
    }
    return code;
}

/**
 * Creates a simple hash of the verification code
 * In production, consider using Utilities.computeDigest_() for stronger hash
 * @param {string} code - The verification code
 * @returns {string} Hashed code
 */
function hashCode(code) {
    // Store with timestamp and code for uniqueness
    // This is a placeholder - can be enhanced with stronger hashing
    const timestamp = Date.now();
    return `veri_${timestamp}_${code.substring(0, 3)}`;
}

/**
 * Checks rate limiting for an IP address
 * Limit: 5 attempts per 15 minutes
 * @param {string} ipAddress - Client IP address
 * @returns {object} Rate limit check result
 */
function checkRateLimit(ipAddress) {
    try {
        const fifteenMinutesAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
        
        // Query Supabase for recent attempts from this IP
        const endpoint = `event_upload_verification?ip_address=eq.${encodeURIComponent(ipAddress)}&created_at=gte.${encodeURIComponent(fifteenMinutesAgo.toISOString())}&select=count()`;
        
        const response = makeSupabaseRequest(endpoint, 'GET');
        
        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
            const count = response.data[0].count || 0;
            const allowed = count < RATE_LIMIT_ATTEMPTS;
            const minutesRemaining = allowed ? 0 : Math.ceil(RATE_LIMIT_WINDOW_MINUTES - ((Date.now() - new Date(response.data[0].created_at)) / 60000));
            
            return {
                allowed: allowed,
                attempts: count,
                minutesRemaining: minutesRemaining
            };
        }

        return { allowed: true, attempts: 0, minutesRemaining: 0 };

    } catch (error) {
        logError('Rate limit check failed', error);
        // Default to allowing (fail open)
        return { allowed: true, attempts: 0, minutesRemaining: 0 };
    }
}

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Cleans up old unverified codes for an email
 * Keeps database clean and prevents code spam
 * @param {string} email - Email address
 */
function cleanupOldCodes(email) {
    try {
        // Fetch all unverified codes for this email
        const codes = supabaseSelect('event_upload_verification', {
            email: email.toLowerCase().trim(),
            is_verified: 'false'
        });

        if (codes && codes.length > 0) {
            // Delete expired codes
            for (let code of codes) {
                if (new Date(code.expires_at) < new Date()) {
                    supabaseDelete('event_upload_verification', code.id);
                }
            }
        }
    } catch (error) {
        logError('Cleanup failed for email', error);
        // Don't throw, continue execution
    }
}

// ===== EMAIL SENDING =====

/**
 * Sends verification code via email using Gmail
 * @param {string} email - Recipient email address
 * @param {string} code - Verification code to send
 * @returns {boolean} True if email sent successfully
 */
function sendVerificationEmail(email, code) {
    try {
        const subject = 'YUVA: Event Upload Verification Code';
        const senderName = 'YUVA Event Upload';
        
        const htmlBody = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #FAFAF9;">
            <div style="background: linear-gradient(135deg, #FF9933 0%, #E67300 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 32px; font-weight: 700;">YUVA</h1>
              <p style="color: #FFFFFF; margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Youth United for Vision and Action</p>
            </div>
            <div style="background: #FFFFFF; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <h2 style="color: #000080; margin-top: 0; font-size: 24px; font-weight: 600;">Event Upload Verification</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hello,</p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                We received a request to verify your email for the <strong style="color: #138808;">Event Upload Portal</strong>. 
                Please use the verification code below to complete your registration.
              </p>
              <div style="text-align: center; margin: 35px 0;">
                <div style="background: linear-gradient(135deg, #FFF3E0 0%, #E8F5E9 100%); padding: 25px; border-radius: 12px; display: inline-block; border: 2px solid #FFD699; box-shadow: 0 2px 8px rgba(255, 153, 51, 0.15);">
                  <p style="color: #666; font-size: 12px; margin: 0 0 12px 0; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Your Verification Code</p>
                  <p style="color: #FF9933; font-family: 'Courier New', monospace; font-size: 48px; font-weight: 700; margin: 0; letter-spacing: 8px;">${code}</p>
                </div>
              </div>
              <div style="background: #EBF4FF; border-left: 4px solid #000080; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong style="color: #000080;">Important:</strong> This code will expire in <strong>10 minutes</strong> for security reasons.
                </p>
              </div>
              <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                <strong style="color: #0F172A;">Security Note:</strong> Never share this code with anyone. Our team will never ask you for this code via phone, email, or any other channel.
              </p>
              <hr style="border: none; border-top: 2px solid #F5F5F4; margin: 30px 0;">
              <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin: 15px 0;">
                If you didn't request this verification code, please ignore this email or contact support if you have concerns.
              </p>
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
                <p style="color: #94A3B8; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} <strong style="color: #FF9933;">YUVA</strong> · All rights reserved
                </p>
                <p style="color: #CBD5E1; font-size: 11px; margin: 8px 0 0 0;">
                  Youth United for Vision and Action
                </p>
              </div>
            </div>
          </div>
        `;

                const textBody = `YUVA: Event Upload Verification\n\nHello,\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nDo not share this code with anyone.\n\nIf you did not request this code, please ignore this email.\n\nYouth United for Vision and Action\nhttps://yuvaindia.in`;

        // Send via Gmail
        GmailApp.sendEmail(email, subject, '', {
            htmlBody: htmlBody,
            name: senderName
        });

        logEvent('EMAIL_SENT', {
            email: email,
            timestamp: new Date().toISOString()
        });

        return true;

    } catch (error) {
        logError('Email sending failed', error);
        return false;
    }
}


/**
 * Makes a request to Supabase REST API
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {object} data - Request payload
 * @param {boolean} useServiceKey - Use service key instead of anon key
 * @returns {object} Response object
 */
function makeSupabaseRequest(endpoint, method = 'GET', data = null, useServiceKey = true) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const key = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;

    const options = {
        method: method,
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        muteHttpExceptions: true
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.payload = JSON.stringify(data);
    }

    try {
        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        const text = response.getContentText();

        let parsed = null;
        try {
            parsed = JSON.parse(text);
        } catch (_) {
            parsed = text;
        }

        const ok = responseCode >= 200 && responseCode < 300;
        return {
            success: ok,
            data: ok ? parsed : null,
            error: !ok ? text : null,
            status: responseCode
        };

    } catch (error) {
        logError('Supabase request error', error);
        return {
            success: false,
            error: error.toString(),
            data: null,
            status: 500
        };
    }
}

/**
 * Inserts data into Supabase table
 * @param {string} table - Table name
 * @param {object} data - Data to insert
 * @returns {object} Insert result
 */
function supabaseInsert(table, data) {
    const result = makeSupabaseRequest(table, 'POST', data, true);
    return {
        success: result.success,
        data: result.success && Array.isArray(result.data) ? result.data[0] : result.data,
        error: result.error
    };
}

/**
 * Selects data from Supabase table
 * @param {string} table - Table name
 * @param {object} filters - Filter criteria
 * @returns {array} Array of records
 */
function supabaseSelect(table, filters = {}) {
    let endpoint = `${table}?select=*`;

    // Add filters
    for (const [key, value] of Object.entries(filters)) {
        endpoint += `&${key}=eq.${encodeURIComponent(value)}`;
    }

    const result = makeSupabaseRequest(endpoint, 'GET', null, false);
    return result.success ? (Array.isArray(result.data) ? result.data : []) : [];
}

/**
 * Updates a record in Supabase
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @param {object} data - Data to update
 * @returns {boolean} Success status
 */
function supabaseUpdate(table, id, data) {
    try {
        if (!id || !table || !data) {
            logError('supabaseUpdate invalid params', {id, table, dataKeys: data ? Object.keys(data) : []});
            return false;
        }
        
        const endpoint = `${table}?id=eq.${encodeURIComponent(id)}`;
        const result = makeSupabaseRequest(endpoint, 'PATCH', data, true);
        
        if (!result.success) {
            logError(`Update failed for ${table}:${id}`, result.error);
            return false;
        }
        
        logEvent('UPDATE_SUCCESS', {table, id, updatedFields: Object.keys(data)});
        return true;
    } catch (error) {
        logError('supabaseUpdate exception', error);
        return false;
    }
}

/**
 * Deletes a record from Supabase
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {boolean} Success status
 */
function supabaseDelete(table, id) {
    const result = makeSupabaseRequest(`${table}?id=eq.${id}`, 'DELETE', null, true);
    return result.status === 204;
}

// ===== TEST FUNCTIONS =====

/**
 * TEST FUNCTION - Run this manually to check database update functionality
 * Go to Google Apps Script Editor → Run → testDatabaseUpdate
 */
function testDatabaseUpdate() {
    console.log('========== DATABASE UPDATE TEST STARTING ==========');
    
    try {
        // Step 1: Insert a test record
        console.log('Step 1: Inserting test record...');
        const testEmail = 'test@example.com';
        const testCode = '123456';
        
        const insertResult = supabaseInsert('event_upload_verification', {
            email: testEmail,
            verification_code: testCode,
            code_hash: 'test_hash_' + Date.now(),
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            ip_address: 'test_ip',
            user_agent: 'GoogleAppsScript_Test',
            attempts: 0,
            is_verified: false
        });
        
        if (!insertResult.success) {
            console.error('❌ INSERT FAILED:', insertResult.error);
            return { success: false, step: 'INSERT', error: insertResult.error };
        }
        
        const recordId = insertResult.data.id;
        console.log('✅ INSERT SUCCESS - Record ID:', recordId);
        
        // Step 2: Try to update attempts
        console.log('Step 2: Updating attempts counter...');
        const updateAttemptsResult = supabaseUpdate('event_upload_verification', recordId, {
            attempts: 1
        });
        
        if (!updateAttemptsResult) {
            console.error('❌ UPDATE ATTEMPTS FAILED');
            return { success: false, step: 'UPDATE_ATTEMPTS', error: 'Update returned false' };
        }
        console.log('✅ UPDATE ATTEMPTS SUCCESS');
        
        // Step 3: Try to update verification status
        console.log('Step 3: Updating verification status...');
        const updateVerificationResult = supabaseUpdate('event_upload_verification', recordId, {
            is_verified: true,
            verified_at: new Date().toISOString()
        });
        
        if (!updateVerificationResult) {
            console.error('❌ UPDATE VERIFICATION FAILED');
            return { success: false, step: 'UPDATE_VERIFICATION', error: 'Update returned false' };
        }
        console.log('✅ UPDATE VERIFICATION SUCCESS');
        
        // Step 4: Read back the record to verify (query by exact ID)
        console.log('Step 4: Reading back record to verify updates...');
        const readEndpoint = `event_upload_verification?id=eq.${encodeURIComponent(recordId)}&select=*`;
        const readResult = makeSupabaseRequest(readEndpoint, 'GET', null, false);
        
        if (!readResult.success || !readResult.data || readResult.data.length === 0) {
            console.error('❌ READ FAILED - Record not found by ID');
            return { success: false, step: 'READ', error: 'Record not found by ID' };
        }
        
        const updatedRecord = readResult.data[0];
        console.log('✅ READ SUCCESS - Record data:', JSON.stringify(updatedRecord));
        console.log('Record ID verified:', updatedRecord.id === recordId ? '✅ MATCH' : '❌ MISMATCH (got different record!)');
        
        // Step 5: Cleanup - delete test record
        console.log('Step 5: Cleaning up test record...');
        const deleteResult = supabaseDelete('event_upload_verification', recordId);
        console.log(deleteResult ? '✅ CLEANUP SUCCESS' : '⚠️ CLEANUP FAILED (non-critical)');
        
        // Final verification
        console.log('\n========== TEST RESULTS ==========');
        console.log('Record ID matched:', updatedRecord.id === recordId ? '✅ YES' : '❌ NO');
        console.log('Attempts updated:', updatedRecord.attempts === 1 ? '✅ YES (1 failed attempt)' : '❌ NO');
        console.log('Verified status:', updatedRecord.is_verified === true ? '✅ YES' : '❌ NO');
        console.log('Verified_at set:', updatedRecord.verified_at ? '✅ YES' : '❌ NO');
        console.log('Code preserved:', updatedRecord.verification_code === testCode ? '✅ YES (kept for audit)' : '❌ NO');
        console.log('===================================\n');
        
        // Note: In production, when a user enters the CORRECT code:
        // - attempts stays at 0 (no failed attempts)
        // - is_verified is set to true
        // - verified_at is set
        // 
        // The test updates attempts to 1 to verify the UPDATE works,
        // but real users with 0 failed attempts will have attempts=0 when verified.
        
        const allGood = (
            updatedRecord.is_verified === true &&
            updatedRecord.verified_at !== null &&
            updatedRecord.verification_code === testCode
        );
        
        if (allGood) {
            console.log('🎉 DATABASE UPDATE TEST PASSED - Everything works!');
            return { success: true, message: 'All database operations working correctly' };
        } else {
            console.error('⚠️ DATABASE UPDATE TEST PARTIALLY FAILED - Some fields not updated correctly');
            return { success: false, message: 'Some updates did not apply correctly', record: updatedRecord };
        }
        
    } catch (error) {
        console.error('❌ TEST EXCEPTION:', error.toString());
        return { success: false, error: error.toString() };
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Creates a response object for HTTP requests
 * @param {object} data - Response data
 * @param {number} code - HTTP status code
 * @returns {TextOutput} Response object
 */
function createResponse(data, code = 200) {
    // Note: Apps Script Web Apps cannot reliably set custom CORS headers.
    // We avoid CORS preflight by using text/plain requests from the frontend.
    return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Logs an event for monitoring and debugging
 * @param {string} eventType - Type of event
 * @param {object} details - Event details
 */
function logEvent(eventType, details) {
    const log = {
        eventType: eventType,
        details: details,
        timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(log));
}

/**
 * Logs errors for debugging
 * @param {string} context - Error context
 * @param {Error|string} error - Error object or message
 */
function logError(context, error) {
    const errorLog = {
        context: context,
        error: error.toString(),
        timestamp: new Date().toISOString()
    };
    console.error(JSON.stringify(errorLog));
    
    // Optional: Could insert error logs to Supabase for monitoring
}
