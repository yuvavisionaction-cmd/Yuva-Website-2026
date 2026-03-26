// ===== YUVA DELHI UNIT REGISTRATION ADMIN SYSTEM - GOOGLE APPS SCRIPT BACKEND =====

// Supabase Configuration
const SUPABASE_URL = 'https://jgsrsjwmywiirtibofth.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnc3JzandteXdpaXJ0aWJvZnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzY2NDgsImV4cCI6MjA3NDY1MjY0OH0.qN_GZIIOm6J1-qSY7r-HX8RLMoH7udc_0Jn7izqk8J8';
// The service key is only used in server-to-server requests, not exposed.
// However, the current implementation prefers RPC calls with the anon key for security.
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnc3JzandteXdpaXJ0aWJvZnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA3NjY0OCwiZXhwIjoyMDc0NjUyNjQ4fQ.tQ9aD4OP1okfdgNr8O4LqIkYAF4rUvbRBN4XBW-KrZo';

// ===== SUPABASE HELPER FUNCTIONS =====
function makeSupabaseRequest(endpoint, method = 'GET', data = null, useServiceKey = false) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const key = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  const options = {
    method: method,
    headers: {
      // Always send anon key in apikey header. Use service/anon in Authorization as needed.
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
    const text = response.getContentText();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (_) { parsed = text; }
    const ok = response.getResponseCode() >= 200 && response.getResponseCode() < 300;
    return ok ? { success: true, data: parsed } : { success: false, error: text, status: response.getResponseCode() };
  } catch (error) {
    console.error('Supabase request error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Read-only requests using the anon key
function makeSupabaseSelect(endpoint) {
  return makeSupabaseRequest(endpoint, 'GET', null, false);
}

// Call PostgREST RPC with anon key
function callSupabaseRpc(fnName, payload) {
  return makeSupabaseRequest(`rpc/${fnName}`, 'POST', payload || {}, false);
}

// ===== GENERAL DATA FUNCTIONS =====

function getSupabaseData(table, filters = {}) {
  let endpoint = `${table}?select=*`;
  if (Object.keys(filters).length > 0) {
    const queryParams = Object.keys(filters)
      .map(key => `${encodeURIComponent(key)}=eq.${encodeURIComponent(filters[key])}`)
      .join('&');
    endpoint += `&${queryParams}`;
  }
  // Use service key for server-side requests to avoid RLS permission issues
  return makeSupabaseRequest(endpoint, 'GET', null, false);
}

function insertSupabaseData(table, data) {
  return makeSupabaseRequest(table, 'POST', data, true);
}

function updateSupabaseData(table, id, data) {
  return makeSupabaseRequest(`${table}?id=eq.${id}`, 'PATCH', data, true);
}

function deleteSupabaseData(table, id) {
  return makeSupabaseRequest(`${table}?id=eq.${id}`, 'DELETE', null, true);
}

// ===== MAIN HANDLERS =====
function doGet(e) {
  const action = e.parameter.action;
  const method = e.parameter.method;

  try {
    // Parse POST body if present
    if (e.postData && e.postData.contents) {
      const bodyString = e.postData.contents;
      const pairs = bodyString.split('&');
      
      for (var i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        const key = decodeURIComponent(pair[0].replace(/\+/g, ' '));
        const value = decodeURIComponent((pair[1] || '').replace(/\+/g, ' '));
        e.parameter[key] = value;
      }
    }

    switch (action) {

      case 'auth':
        return handleAuth(e, method || e.parameter.method);
      case 'zones':
        return handleZones(e, method || e.parameter.method);
      case 'colleges':
        return handleColleges(e, method || e.parameter.method);
      case 'users':
        return handleUsers(e, method || e.parameter.method);
      case 'registrations':
        return handleRegistrations(e, method || e.parameter.method);
      case 'notify':
        return handleNotify(e, method || e.parameter.method);
      case 'events':
        return handleEvents(e, method || e.parameter.method);
      case 'reports':
        return handleReports(e, method || e.parameter.method);
      case 'generateCollegeReport':
        return generateCollegeReport(e);
      // case 'super_admin':
      //   return handleSuperAdmin(e, method || e.parameter.method);
      case 'public-stats':
        return getHomepageStats(); // This is the new function we will create
      default:
        return createResponse({ error: 'Invalid action' }, 400);
    }
  } catch (error) {
    console.error('Error in doGet:', error, error.stack);
    return createResponse({ error: 'Internal server error', details: error.toString() }, 500);
  }
}

function doPost(e) {
  // Parse POST body parameters
  if (e.postData && e.postData.contents) {
    try {
      const bodyString = e.postData.contents;
      
      // Handle JSON Body
      if (bodyString.trim().startsWith('{')) {
        const jsonBody = JSON.parse(bodyString);
        for (var key in jsonBody) {
          e.parameter[key] = jsonBody[key];
        }
      } else {
        // Handle URL-encoded body
        const pairs = bodyString.split('&');
        for (var i = 0; i < pairs.length; i++) {
          const pair = pairs[i].split('=');
          const k = decodeURIComponent(pair[0].replace(/\+/g, ' '));
          const v = decodeURIComponent((pair[1] || '').replace(/\+/g, ' '));
          e.parameter[k] = v;
        }
      }
    } catch (err) {
      console.error('Error parsing POST body:', err);
    }
  }
  // Delegate to doGet for unified handling
  return doGet(e);
}

// Handle CORS preflight OPTIONS requests
function doOptions(e) {
  return createResponse({ success: true, message: 'CORS preflight OK' });
}

// ===== NEW NOTIFICATION HANDLER =====
/**
 * Handles notification-related actions like sending emails.
 */
function handleNotify(e, method) {
  switch (method) {
    case 'requestCollege':
      return notifySuperAdminForCollege(e);
    case 'contactSuperAdmin':
      return contactSuperAdmin(e);
    case 'replyViaEmail':
      return replyToUser(e);
    default:
      return createResponse({ error: 'Invalid notification method' }, 400);
  }
}

/**
 * Sends a reply email from Admin to a User
 */
function replyToUser(e) {
  try {
    const toEmail = e.parameter.toEmail;
    const subject = e.parameter.subject;
    const body = e.parameter.body;
    const replierName = e.parameter.replierName || 'YUVA Admin';
    const userName = e.parameter.userName || 'User';

    if (!toEmail || !subject || !body) {
      return createResponse({ success: false, error: 'Missing required fields (toEmail, subject, body)' }, 400);
    }

    // Format message with proper line breaks
    const formattedBody = body.replace(/\n/g, '<br>');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
                
                <!-- Header with YUVA Branding -->
                <tr>
                  <td style="background: linear-gradient(135deg, #FF9933 0%, #E67300 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                      YUVA
                    </h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.95); font-size: 14px; font-weight: 500;">
                      Youth United for Vision and Action
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Greeting -->
                    <p style="margin: 0 0 24px 0; font-size: 18px; color: #2d3748; font-weight: 600;">
                      Dear ${userName},
                    </p>

                    <!-- Message Body -->
                    <div style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.8; color: #4a5568;">
                      ${formattedBody}
                    </div>

                    <!-- Signature -->
                    <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #e2e8f0;">
                      <p style="margin: 0 0 8px 0; font-size: 15px; color: #2d3748; font-weight: 600;">
                        Best regards,
                      </p>
                      <p style="margin: 0; font-size: 15px; color: #000080; font-weight: 700;">
                        YUVA Admin Team
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: linear-gradient(to bottom, #f7fafc 0%, #edf2f7 100%); padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 8px 0; font-size: 12px; color: #718096;">
                            <strong style="color: #2d3748;">Replied by:</strong> ${replierName}
                          </p>
                          <p style="margin: 0; font-size: 11px; color: #a0aec0;">
                            This is an official communication from YUVA Admin Panel
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Branding Strip -->
                <tr>
                  <td style="background: linear-gradient(90deg, #FF9933 0%, #FFFFFF 33%, #138808 66%, #000080 100%); height: 4px;">
                  </td>
                </tr>

              </table>

              <!-- Disclaimer -->
              <table role="presentation" style="max-width: 600px; margin: 20px auto 0;">
                <tr>
                  <td style="text-align: center; padding: 0 20px;">
                    <p style="margin: 0; font-size: 11px; color: #a0aec0; line-height: 1.6;">
                      © ${new Date().getFullYear()} YUVA. All rights reserved.<br>
                      This email was sent from an automated system. Please do not reply directly to this email.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    GmailApp.sendEmail(toEmail, subject, body, {
       htmlBody: htmlBody,
       name: 'YUVA Admin Support'
    });

    return createResponse({ success: true, message: 'Email reply sent successfully.' });

  } catch (error) {
    console.error("Failed to send reply email:", error);
    return createResponse({ success: false, error: 'Failed to send reply.', details: error.toString() }, 500);
  }
}

/**
 * Sends an email to all super admins requesting a new college addition.
 */
function notifySuperAdminForCollege(e) {
  try {
    const requesterName = e.parameter.requesterName || 'An Admin';
    const requesterRole = e.parameter.requesterRole || 'N/A';
    const requesterContext = e.parameter.requesterContext || 'their dashboard';
    const collegeName = e.parameter.collegeName || 'Unknown College';

    // 1. Fetch all super admin emails using the service key
    const adminResult = makeSupabaseRequest("admin_users?role=eq.super_admin&select=email", 'GET', null, true);

    if (!adminResult.success || !adminResult.data || adminResult.data.length === 0) {
      console.error("Could not find any super admins to notify.", adminResult.error);
      return createResponse({ success: false, error: 'No super admin accounts found to notify.' }, 404);
    }

    const superAdminEmails = adminResult.data.map(function (admin) {
      return admin.email;
    }).join(',');

    if (!superAdminEmails) {
      return createResponse({ success: false, error: 'Could not extract super admin emails.' }, 500);
    }

    // 2. Compose and send the email
    const subject = `YUVA Admin: Request to Add "${collegeName}" College`;
    const body = `
            <p>Hello Super Admin,</p>
            <p>A request has been made to add a new college to the YUVA registration system.</p>
            <ul>
                <li><strong>Requested College:</strong> <span style="color: #0066cc; font-weight: bold;">${collegeName}</span></li>
                <li><strong>Requester:</strong> ${requesterName}</li>
                <li><strong>Role:</strong> ${requesterRole}</li>
                <li><strong>From:</strong> ${requesterContext}</li>
            </ul>
            <p>Please log in to the admin dashboard to add the new college.</p>
            <p>Thank you,<br/>YUVA Automated System</p>
        `;

    GmailApp.sendEmail(superAdminEmails, subject, "", {
      htmlBody: body,
      name: 'YUVA College Management'
    });

    return createResponse({ success: true, message: 'Notification sent successfully to super admins.' });

  } catch (error) {
    console.error("Failed to send notification email:", error);
    return createResponse({ success: false, error: 'Failed to send notification.', details: error.toString() }, 500);
  }
}

/**
 * Sends a message from Zone Convener to all Super Admins
 */
function contactSuperAdmin(e) {
  try {
    const senderName = e.parameter.senderName || 'Zone Convener';
    const senderEmail = e.parameter.senderEmail || 'N/A';
    const senderRole = e.parameter.senderRole || 'zone_convener';
    const zoneName = e.parameter.zoneName || 'Unknown Zone';
    const zoneId = e.parameter.zoneId || null;
    const subject = e.parameter.subject || 'Message from Zone Convener';
    const category = e.parameter.category || 'other';
    const message = e.parameter.message || '';

    // Validate required fields
    if (!senderEmail || senderEmail === 'N/A') {
      return createResponse({ success: false, error: 'Sender email is required.' }, 400);
    }

    if (!message || message.trim() === '') {
      return createResponse({ success: false, error: 'Message content is required.' }, 400);
    }

    // Save message to database
    const messageData = {
      sender_name: senderName,
      sender_email: senderEmail,
      sender_role: senderRole,
      zone_id: zoneId,
      zone_name: zoneName,
      subject: subject,
      category: category,
      message: message,
      status: 'unread'
    };

    const saveResult = insertSupabaseData('zone_convener_messages', messageData);

    if (!saveResult.success) {
      console.error('Failed to save message to database:', saveResult.error);
      return createResponse({ success: false, error: 'Failed to save message to database.', details: saveResult.error }, 500);
    }

    // Optionally send email notification to super admins
    try {
      const adminResult = makeSupabaseRequest("admin_users?role=eq.super_admin&select=email,full_name", 'GET', null, true);

      if (adminResult.success && adminResult.data && adminResult.data.length > 0) {
        const superAdminEmails = adminResult.data.map(admin => admin.email).join(',');

        // Category badge color
        const categoryColors = {
          'technical': '#E67300',
          'policy': '#000080',
          'resources': '#FF9933',
          'other': '#64748B'
        };
        const categoryColor = categoryColors[category] || categoryColors.other;

        // Send email notification
        const emailSubject = `[YUVA Admin] New Message: ${subject}`;
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #FF9933 0%, #E67300 100%); padding: 20px; text-align: center;">
              <h2 style="color: white; margin: 0;">New Message from Zone Convener</h2>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #000080;">Sender Information</h3>
                <p><strong>Name:</strong> ${senderName}</p>
                <p><strong>Email:</strong> ${senderEmail}</p>
                <p><strong>Role:</strong> ${senderRole}</p>
                <p><strong>Zone:</strong> ${zoneName}</p>
                <p><strong>Category:</strong> <span style="background: ${categoryColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">${category.replace('_', ' ').toUpperCase()}</span></p>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #000080;">Subject</h3>
                <p style="font-size: 16px; font-weight: 600;">${subject}</p>
                <h3 style="color: #000080;">Message</h3>
                <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
              <div style="margin-top: 20px; padding: 15px; background: #EBF4FF; border-left: 4px solid #000080; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #475569;">
                  <strong>Reply to:</strong> ${senderEmail}<br>
                  <strong>Action Required:</strong> Login to Admin Dashboard to view and respond
                </p>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #94A3B8; font-size: 12px;">
              <p>© ${new Date().getFullYear()} YUVA · Automated System Message</p>
            </div>
          </div>
        `;

        GmailApp.sendEmail(superAdminEmails, emailSubject, "", {
          htmlBody: emailBody,
          replyTo: senderEmail,
          name: 'YUVA Zone Management'
        });
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the whole request if email fails
    }

    return createResponse({ success: true, message: 'Message saved successfully and Super Admins have been notified.' });

  } catch (error) {
    console.error("Failed to process message:", error);
    return createResponse({ success: false, error: 'Failed to process message.', details: error.toString() }, 500);
  }
}

// ===== AUTHENTICATION HANDLERS =====
function handleAuth(e, method) {
  switch (method) {
    case 'login':
      return loginUser(e);
    case 'logout':
      return logoutUser(e);
    case 'checkSession':
      return checkUserSession(e);
    case 'register':
      return registerUser(e);
    case 'checkEmail':
      return checkEmailExists(e);
    case 'recoverPassword':
      return recoverPassword(e);
    case 'resetPassword':
      return resetPassword(e);
    case 'verifyEmail':
      return verifyEmail(e);
    case 'getAdminUser':
      return getAdminUser(e);
    default:
      return createResponse({ error: 'Invalid auth method' }, 400);
  }
}

/**
 * loginUser: Now delegates authentication to Supabase Auth entirely.
 * This endpoint is called ONLY after the frontend has successfully authenticated with Supabase Auth.
 * It fetches admin role/metadata from the admin_users table using the authenticated user's email.
 * 
 * The frontend MUST provide the user's email from Supabase Auth.
 * This function verifies that the user has an admin profile in admin_users.
 */
function loginUser(e) {
  const email = (e.parameter.email || '').trim().toLowerCase();

  if (!email) {
    return createResponse({ error: 'Email required for verification' }, 400);
  }

  try {
    // Query the admin_users table using email (authenticated by Supabase)
    const endpoint = `admin_users?email=eq.${encodeURIComponent(email)}&select=id,email,full_name,role,zone,college_id`;
    const result = makeSupabaseRequest(endpoint, 'GET', null, true);

    if (!result.success || !result.data || result.data.length === 0) {
      console.warn(`Admin user not found for email: ${email}`);
      return createResponse({ 
        error: 'This email is not registered as an admin. Please contact the administrator.',
        code: 'NOT_ADMIN'
      }, 403);
    }

    const adminUser = result.data[0];

    return createResponse({
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        full_name: adminUser.full_name,
        role: adminUser.role,
        zone: adminUser.zone,
        college_id: adminUser.college_id
      }
    });

  } catch (error) {
    console.error('Admin user verification error:', error, error.stack);
    return createResponse({ error: 'Unable to verify admin status' }, 500);
  }
}

/**
 * getAdminUser: Fetch admin user data by email (from Supabase Auth).
 * This is a helper endpoint for the frontend to get admin details after Auth.
 */
function getAdminUser(e) {
  const email = (e.parameter.email || '').trim().toLowerCase();

  if (!email) {
    return createResponse({ error: 'Email required' }, 400);
  }

  try {
    const result = makeSupabaseRequest(`admin_users?email=eq.${encodeURIComponent(email)}&select=*`, 'GET', null, true);

    if (!result.success || !result.data || result.data.length === 0) {
      return createResponse({ error: 'Admin user not found', code: 'NOT_FOUND' }, 404);
    }

    const adminUser = result.data[0];

    return createResponse({
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        full_name: adminUser.full_name,
        role: adminUser.role,
        zone: adminUser.zone,
        college_id: adminUser.college_id,
        is_verified: adminUser.is_verified // Return actual value: true, false, or null/undefined
      }
    });

  } catch (error) {
    console.error('Error fetching admin user:', error);
    return createResponse({ error: 'Failed to fetch user data' }, 500);
  }
}

function registerUser(e) {
  const email = (e.parameter.email || '').trim().toLowerCase();
  const full_name = (e.parameter.full_name || '').trim();
  const role = (e.parameter.role || 'member').trim();
  const zone = (e.parameter.zone || '').trim();
  const college_id = e.parameter.college_id;
  const program_type = (e.parameter.program_type || '').trim();
  const origin = e.parameter.origin || 'https://yuva.ind.in';

  // 1. Input Validation
  if (!email || !full_name) {
    return createResponse({ error: 'Required fields missing' }, 400);
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return createResponse({ error: 'Please provide a valid email address' }, 400);
  }
  const allowedRoles = ['super_admin', 'zone_convener', 'mentor', 'yuva_student_program'];
  if (allowedRoles.indexOf(role) === -1) {
    return createResponse({ error: 'Invalid role selected' }, 400);
  }
  
  // Role-specific validation
  if (role === 'zone_convener' && !zone) {
    return createResponse({ error: 'Zone is required for Zone Conveners' }, 400);
  }
  if (role === 'mentor' && !college_id) {
    return createResponse({ error: 'College ID is required for Mentors' }, 400);
  }
  if (role === 'yuva_student_program' && !program_type) {
    return createResponse({ error: 'Program Type is required for YUVA Student Program' }, 400);
  }
  
  const allowedPrograms = ['NCWEB', 'DUSOL', 'IGNOU'];
  if (role === 'yuva_student_program' && allowedPrograms.indexOf(program_type) === -1) {
    return createResponse({ error: 'Invalid Program Type selected' }, 400);
  }

  // Check super admin limit - only 2 allowed
  if (role === 'super_admin') {
    try {
      const superAdminCheck = makeSupabaseRequest('admin_users?role=eq.super_admin&select=id', 'GET', null, true);
      if (superAdminCheck.success && superAdminCheck.data) {
        const superAdminCount = Array.isArray(superAdminCheck.data) ? superAdminCheck.data.length : 0;
        if (superAdminCount >= 2) {
          return createResponse({ 
            error: 'Maximum number of Super Admins reached', 
            details: 'Only 2 Super Admins are allowed in the system. Please contact existing Super Admins for access.' 
          }, 403);
        }
      }
    } catch (checkErr) {
      console.error('Error checking super admin count:', checkErr);
    }
  }

  try {
    // 2. Insert admin record directly (Auth user already created by frontend)
    const adminRecord = {
      email: email,
      full_name: full_name,
      role: role,
      zone: zone || null,
      college_id: college_id ? Number(college_id) : null,
      program_type: program_type || null
    };
    
    const result = makeSupabaseRequest('admin_users', 'POST', adminRecord, true);

    // 3. Check the result of the RPC call for success or failure
    if (!result.success) {
      // This is the correct place to handle errors, including duplicate emails
      var errText = String(result.error || '').toLowerCase();
      var statusCode = Number(result.status || 0);

      // Use the robust check we discussed to find the 'duplicate_email' error
      if (statusCode === 409 || /(duplicate key|unique constraint|already exists|duplicate_email)/.test(errText)) {
        return createResponse({ error: 'duplicate_email' }, 409);
      }

      // Return any other database errors
      return createResponse({ error: 'Supabase registration error', details: result.error || null, status: result.status || null }, statusCode && statusCode >= 400 ? statusCode : 500);
    }

    // 4. If successful, send custom verification email
    var uid = null;
    try {
      if (Array.isArray(result.data) && result.data.length) uid = result.data[0]?.id ?? result.data[0];
      else if (result.data && typeof result.data === 'object') uid = result.data.id ?? null;
      else uid = result.data ?? null;
    } catch (_) { uid = result.data ?? null; }

    // Generate verification token
    const verifyToken = Utilities.getUuid();
    const expiresAt = new Date(Date.now() + 86400000); // 24 hours
    
    // Store verification token
    try {
      const tokenPayload = {
        email: email,
        token: verifyToken,
        expires_at: expiresAt.toISOString()
      };
      makeSupabaseRequest('email_verification_tokens', 'POST', tokenPayload, true);
    } catch (tokenErr) {
      console.warn('Could not store verification token:', tokenErr);
    }
    
    // Send custom verification email - link goes to frontend verify page, not Apps Script
    // Frontend page will then call the script to verify the token
    const verifyLink = `${origin}/GetInvolve/verify-email.html?token=${verifyToken}&email=${encodeURIComponent(email)}`;
    
    try {
      GmailApp.sendEmail(email, 'YUVA Admin: Verify Your Email Address', '', {
        htmlBody: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #FAFAF9;">
            <div style="background: linear-gradient(135deg, #FF9933 0%, #E67300 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 32px; font-weight: 700;">YUVA</h1>
              <p style="color: #FFFFFF; margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Youth United for Vision and Action</p>
            </div>
            <div style="background: #FFFFFF; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <h2 style="color: #000080; margin-top: 0; font-size: 24px; font-weight: 600;">Welcome to YUVA Admin Dashboard!</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hello <strong style="color: #0F172A;">${full_name}</strong>,</p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Thank you for registering as a <strong style="color: #138808;">${role.replace('_', ' ')}</strong> with YUVA. 
                To complete your registration and access the admin dashboard, please verify your email address.
              </p>
              <div style="text-align: center; margin: 35px 0;">
                <a href="${verifyLink}" 
                   style="background: linear-gradient(135deg, #FF9933 0%, #E67300 100%); color: #FFFFFF; padding: 16px 45px; text-decoration: none; 
                          border-radius: 50px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 153, 51, 0.3); transition: all 0.3s;">
                  Verify Email Address
                </a>
              </div>
              <div style="background: #EBF4FF; border-left: 4px solid #000080; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong style="color: #000080;">Alternative:</strong> Copy and paste this link into your browser:<br>
                  <a href="${verifyLink}" style="color: #FF9933; word-break: break-all; font-size: 13px;">${verifyLink}</a>
                </p>
              </div>
              <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                This link will expire in <strong>24 hours</strong> for security reasons.
              </p>
              <hr style="border: none; border-top: 2px solid #F5F5F4; margin: 30px 0;">
              <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin: 15px 0;">
                If you didn't request this registration, please ignore this email or contact support if you have concerns.
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
        `,
        name: 'YUVA Account Services'
      });
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      // Don't fail registration if email fails
    }

    return createResponse({ 
      success: true, 
      message: 'Registration successful! Please check your email to verify your account.', 
      user_id: uid,
      requiresVerification: true
    });

    // Replace with this new catch block
  } catch (error) {
    console.error('Registration error:', error, error.stack); // Log the full error stack for debugging
    // Send a detailed error object back to the frontend
    return createResponse({
      success: false,
      error: 'Backend Error',
      details: error.toString()
    }, 500);
  }
}

function checkEmailExists(e) {
  var email = (e.parameter.email || '').trim().toLowerCase();
  if (!email) {
    return createResponse({ error: 'email_required' }, 400);
  }

  try {
    // 1. Call your SQL function (RPC) to check if the email exists.
    var rpcResult = callSupabaseRpc('check_admin_user_email', { p_email: email });

    // 2. Check if the call to Supabase was successful.
    if (!rpcResult || !rpcResult.success) {
      console.error('check_admin_user_email RPC failed:', rpcResult ? rpcResult.error : 'No response');
      return createResponse({ success: false, error: 'Database RPC failed.' }, 500);
    }

    // 3. The result from this RPC is a simple boolean (true or false).
    //    We wrap it in the JSON format the frontend expects.
    var userExists = rpcResult.data;

    return createResponse({ success: true, exists: (userExists === true) });

  } catch (err) {
    console.error('Critical error in checkEmailExists:', err);
    return createResponse({ error: 'check_failed', details: String(err) }, 500);
  }
}
function recoverPassword(e) {
  const email = (e.parameter.email || '').trim().toLowerCase();
  const origin = e.parameter.origin || 'https://yuva.ind.in';

  if (!email) return createResponse({ success: false, error: 'Email is required' }, 400);

  try {
    // Check if email exists in admin_users table
    const result = makeSupabaseRequest(`admin_users?email=eq.${encodeURIComponent(email)}&select=id,full_name`, 'GET', null, true);

    if (!result.success || !result.data || result.data.length === 0) {
      // For security, we don't reveal if email exists or not
      return createResponse({ 
        success: true, 
        message: 'If an account with that email exists, a password reset link will be sent.' 
      });
    }

    const user = result.data[0];
    const userName = user.full_name || 'Admin';
    
    // Generate a secure reset token
    const resetToken = Utilities.getUuid();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Store reset token in database (you may need to create a password_reset_tokens table)
    const tokenPayload = {
      email: email,
      token: resetToken,
      expires_at: expiresAt.toISOString()
    };
    
    // Try to store token (optional - for validation)
    try {
      makeSupabaseRequest('password_reset_tokens', 'POST', tokenPayload, true);
    } catch (tokenErr) {
      console.warn('Could not store reset token:', tokenErr);
      // Continue anyway - token is in the email
    }
    
    // Create reset link using the origin URL from the request (supports localhost and production)
    const resetLink = `${origin}/GetInvolve/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    // Send custom email from your Gmail account
    try {
      GmailApp.sendEmail(email, 'YUVA Admin: Password Reset Request', '', {
        htmlBody: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #FAFAF9;">
            <div style="background: linear-gradient(135deg, #FF9933 0%, #E67300 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 32px; font-weight: 700;">YUVA</h1>
              <p style="color: #FFFFFF; margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Youth United for Vision and Action</p>
            </div>
            <div style="background: #FFFFFF; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <h2 style="color: #000080; margin-top: 0; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hello <strong style="color: #0F172A;">${userName}</strong>,</p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password for the YUVA Admin Dashboard. 
                Click the button below to create a new password:
              </p>
              <div style="text-align: center; margin: 35px 0;">
                <a href="${resetLink}" 
                   style="background: linear-gradient(135deg, #FF9933 0%, #E67300 100%); color: #FFFFFF; padding: 16px 45px; text-decoration: none; 
                          border-radius: 50px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 153, 51, 0.3);">
                  Reset Password
                </a>
              </div>
              <div style="background: #EBF4FF; border-left: 4px solid #000080; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong style="color: #000080;">Alternative:</strong> Copy and paste this link into your browser:<br>
                  <a href="${resetLink}" style="color: #FF9933; word-break: break-all; font-size: 13px;">${resetLink}</a>
                </p>
              </div>
              <div style="background: #FFF3CD; border-left: 4px solid #FF9933; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #664D03; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>Security Notice:</strong> This link will expire in <strong>1 hour</strong> for your protection.
                </p>
              </div>
              <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                If you didn't request this password reset, please ignore this email or contact support immediately if you have concerns about your account security.
              </p>
              <hr style="border: none; border-top: 2px solid #F5F5F4; margin: 30px 0;">
              <div style="background: #F1F5F9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0;">
                  <strong style="color: #0F172A;">Need help?</strong> Contact our support team or visit the admin dashboard.
                </p>
              </div>
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
        `,
        name: 'YUVA Account Security'
      });
      
      return createResponse({ 
        success: true, 
        message: 'Password reset instructions have been sent to your email.' 
      });
      
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr);
      return createResponse({ 
        success: false, 
        error: 'Failed to send reset email. Please try again later.' 
      }, 500);
    }

  } catch (err) {
    console.error('Password recovery error:', err);
    return createResponse({ success: false, error: 'An error occurred.' }, 500);
  }
}

/**
 * resetPassword: Verifies reset token and updates password in Supabase Auth
 */
function resetPassword(e) {
  const email = (e.parameter.email || '').trim().toLowerCase();
  const token = (e.parameter.token || '').trim();
  const newPassword = (e.parameter.password || '').trim();

  if (!email || !token || !newPassword) {
    return createResponse({ success: false, error: 'Email, token, and new password are required' }, 400);
  }

  if (newPassword.length < 6) {
    return createResponse({ success: false, error: 'Password must be at least 6 characters' }, 400);
  }

  try {
    // Verify token exists and hasn't expired
    const tokenResult = makeSupabaseRequest(
      `password_reset_tokens?email=eq.${encodeURIComponent(email)}&token=eq.${encodeURIComponent(token)}&select=*`,
      'GET',
      null,
      true
    );

    if (!tokenResult.success || !tokenResult.data || tokenResult.data.length === 0) {
      return createResponse({ 
        success: false, 
        error: 'Invalid or expired reset token' 
      }, 400);
    }

    const tokenData = tokenResult.data[0];
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt < new Date()) {
      // Token expired - delete it
      makeSupabaseRequest(`password_reset_tokens?id=eq.${tokenData.id}`, 'DELETE', null, true);
      return createResponse({ 
        success: false, 
        error: 'Reset token has expired. Please request a new password reset.' 
      }, 400);
    }

    // Find the Supabase Auth user by email using Admin API
    const authListUrl = `${SUPABASE_URL}/auth/v1/admin/users?email_filter=${encodeURIComponent(email)}&page=1&per_page=1`;
    const authListOptions = {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    const authListResponse = UrlFetchApp.fetch(authListUrl, authListOptions);
    const authListCode = authListResponse.getResponseCode();
    console.log('Auth list response code:', authListCode);

    let authUserId = null;
    if (authListCode >= 200 && authListCode < 300) {
      const authListData = JSON.parse(authListResponse.getContentText());
      if (authListData.users && authListData.users.length > 0) {
        authUserId = authListData.users[0].id;
        console.log('Found auth user ID:', authUserId);
      }
    }

    if (!authUserId) {
      console.error('Could not find Supabase Auth user for email:', email, 'Response:', authListResponse.getContentText());
      return createResponse({ 
        success: false, 
        error: 'Auth user not found. Please contact the administrator.' 
      }, 404);
    }

    // Update password in Supabase Auth using Admin API
    const updateUrl = `${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`;
    const updateOptions = {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ password: newPassword }),
      muteHttpExceptions: true
    };

    const updateResponse = UrlFetchApp.fetch(updateUrl, updateOptions);
    const updateCode = updateResponse.getResponseCode();
    console.log('Password update response code:', updateCode);

    if (updateCode < 200 || updateCode >= 300) {
      console.error('Failed to update auth password:', updateResponse.getContentText());
      return createResponse({ 
        success: false, 
        error: 'Failed to update password. Please try again.' 
      }, 500);
    }

    // Delete used token
    makeSupabaseRequest(`password_reset_tokens?id=eq.${tokenData.id}`, 'DELETE', null, true);
    console.log('Reset token deleted for email:', email);

    return createResponse({ 
      success: true, 
      message: 'Password reset successful.' 
    });

  } catch (err) {
    console.error('Password reset error:', err);
    return createResponse({ success: false, error: 'An error occurred during password reset.' }, 500);
  }
}

function verifyEmail(e) {
  const email = (e.parameter.email || '').trim().toLowerCase();
  const token = (e.parameter.token || '').trim();
  const callback = (e.parameter.callback || '').trim();

  // If callback exists, return JSONP (avoids redirect blocking from public to localhost)
  const isJsonp = !!callback;

  // Return error response
  function returnError(errorMsg) {
    if (isJsonp) {
      return ContentService.createTextOutput(
        callback + '(' + JSON.stringify({ success: false, error: errorMsg }) + ')'
      ).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return createResponse({ success: false, error: errorMsg });
  }

  // Return success response
  function returnSuccess() {
    if (isJsonp) {
      return ContentService.createTextOutput(
        callback + '(' + JSON.stringify({ success: true, message: 'Email verified successfully!' }) + ')'
      ).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return createResponse({ success: true, message: 'Email verified successfully!' });
  }

  if (!email || !token) {
    return returnError('Invalid verification link. Missing email or token.');
  }

  try {
    // Verify token exists and hasn't expired
    const tokenResult = makeSupabaseRequest(
      `email_verification_tokens?email=eq.${encodeURIComponent(email)}&token=eq.${encodeURIComponent(token)}&select=*`,
      'GET',
      null,
      true
    );

    if (!tokenResult.success || !tokenResult.data || tokenResult.data.length === 0) {
      return returnError('Invalid or expired verification token.');
    }

    const tokenData = tokenResult.data[0];
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt < new Date()) {
      // Token expired - delete it
      makeSupabaseRequest(`email_verification_tokens?id=eq.${tokenData.id}`, 'DELETE', null, true);
      return returnError('Verification token has expired. Please register again.');
    }

    // Mark user as verified in Supabase Auth using Admin API
    const authUrl = SUPABASE_URL.replace('/rest/v1', '') + '/auth/v1/admin/users';
    
    // First, get the user by email from Supabase Auth
    const getUserUrl = authUrl + '?filter=email.eq.' + encodeURIComponent(email);
    const getUserOptions = {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    try {
      const getUserResponse = UrlFetchApp.fetch(getUserUrl, getUserOptions);
      const userData = JSON.parse(getUserResponse.getContentText());
      
      if (userData && userData.users && userData.users.length > 0) {
        const userId = userData.users[0].id;
        
        // Update user to mark email as verified
        const updateUserUrl = authUrl + '/' + userId;
        const updateOptions = {
          method: 'PUT',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            email_confirm: true
          }),
          muteHttpExceptions: true
        };
        
        UrlFetchApp.fetch(updateUserUrl, updateOptions);
      }
    } catch (authErr) {
      console.error('Supabase Auth verification error:', authErr);
      // Continue even if Auth API fails - we'll still mark in admin_users
    }
    
    // Mark user as verified in admin_users table
    const updateAdminResult = makeSupabaseRequest(
      `admin_users?email=eq.${encodeURIComponent(email)}`,
      'PATCH',
      { is_verified: true },
      true
    );
    
    if (!updateAdminResult.success) {
      return returnError('Failed to update user verification status.');
    }
    
    // Delete used token
    makeSupabaseRequest(`email_verification_tokens?id=eq.${tokenData.id}`, 'DELETE', null, true);
    
    // Return success
    return returnSuccess();

  } catch (err) {
    console.error('Email verification error:', err);
    return returnError('An error occurred during verification. Please try again.');
  }
}


// ===== ZONE HANDLERS =====
function handleZones(e, method) {
  switch (method) {
    case 'getAll':
      return getAllZones();
    case 'getById':
      return getZoneById(e.parameter.id);
    case 'update':
      return updateZone(e);
    case 'getRegistrations':
      return getZoneRegistrations(e.parameter.zoneId);
    default:
      return createResponse({ error: 'Invalid zone method' }, 400);
  }
}

function getAllZones() {
  try {
    const result = getSupabaseData('zones');

    if (result.success) {
      return createResponse({ success: true, zones: result.data });
    } else {
      return createResponse({ error: 'Failed to fetch zones' }, 500);
    }
  } catch (error) {
    console.error('Get zones error:', error);
    return createResponse({ error: 'Failed to fetch zones' }, 500);
  }
}

function getZoneById(zoneId) {
  try {
    const zones = [
      { id: 1, zone_code: 'east', zone_name: 'East Delhi', description: 'Eastern zone of Delhi' },
      { id: 2, zone_code: 'west', zone_name: 'West Delhi', description: 'Western zone of Delhi' },
      { id: 3, zone_code: 'north', zone_name: 'North Delhi', description: 'Northern zone of Delhi' },
      { id: 4, zone_code: 'south', zone_name: 'South Delhi', description: 'Southern zone of Delhi' },
      { id: 5, zone_code: 'jhandewalan', zone_name: 'Jhandewalan', description: 'Jhandewalan zone' },
      { id: 6, zone_code: 'keshav', zone_name: 'Keshav Puram', description: 'Keshav Puram zone' },
      { id: 7, zone_code: 'ramkrishna', zone_name: 'Ramkrishna Puram', description: 'Ramkrishna Puram zone' },
      { id: 8, zone_code: 'yamuna', zone_name: 'Yamuna Vihar', description: 'Yamuna Vihar zone' }
    ];

    const zone = zones.find(z => z.id == zoneId);

    if (!zone) {
      return createResponse({ error: 'Zone not found' }, 404);
    }

    return createResponse({ success: true, zone: zone });
  } catch (error) {
    console.error('Get zone error:', error);
    return createResponse({ error: 'Failed to fetch zone' }, 500);
  }
}

// ===== COLLEGE HANDLERS =====
function handleColleges(e, method) {
  switch (method) {
    case 'getAll':
      return getAllColleges();
    case 'getByZone':
      return getCollegesByZone(e.parameter.zoneId);
    // ===== NEW METHOD HANDLER ADDED HERE =====
    case 'getByCode':
      return getCollegeByCode(e);
    case 'create':
      return createCollege(e);
    case 'update':
      return updateCollege(e);
    case 'delete':
      return deleteCollege(e.parameter.id);
    default:
      return createResponse({ error: 'Invalid college method' }, 400);
  }
}
/**
 * Fetches a single college's details using its unique code.
 * This is used for auto-filling the registration form.
 */
function getCollegeByCode(e) {
  try {
    const code = (e.parameter.code || '').trim().toUpperCase();
    if (!code) {
      return createResponse({ success: false, error: 'College code is required' }, 400);
    }

    // Call the new RPC function we created in setup.sql
    const result = callSupabaseRpc('get_college_by_code', {
      p_code: code
    });

    if (result.success && result.data && result.data.length > 0) {
      // Return the first matching college
      return createResponse({ success: true, college: result.data[0] });
    } else if (result.success) {
      // RPC succeeded but found no match
      return createResponse({ success: false, error: 'College code not found' }, 404);
    } else {
      // The RPC call itself failed
      console.error('getCollegeByCode RPC error:', result.error);
      return createResponse({ success: false, error: 'Failed to query database' }, 500);
    }
  } catch (error) {
    console.error('Error in getCollegeByCode:', error);
    return createResponse({ success: false, error: 'Internal server error' }, 500);
  }
}

function getAllColleges() {
  try {
    const result = getSupabaseData('colleges');

    if (result.success) {
      return createResponse({ success: true, colleges: result.data });
    } else {
      return createResponse({ error: 'Failed to fetch colleges' }, 500);
    }
  } catch (error) {
    console.error('Get colleges error:', error);
    return createResponse({ error: 'Failed to fetch colleges' }, 500);
  }
}

// ---- College CRUD ----
function parseJsonBody(e) {
  try {
    if (e && e.postData && e.postData.contents) {
      return JSON.parse(e.postData.contents);
    }
  } catch (err) {
    // fallthrough
  }
  return null;
}

function readField(e, body, key) {
  if (body && body[key] !== undefined && body[key] !== null && String(body[key]).length) return body[key];
  if (e && e.parameter && e.parameter[key] !== undefined) return e.parameter[key];
  return '';
}

function createCollege(e) {
  const body = parseJsonBody(e) || {};
  const college_name = String(readField(e, body, 'college_name')).trim();
  const college_code = String(readField(e, body, 'college_code')).trim();
  const zone_id = Number(readField(e, body, 'zone_id'));
  if (!college_name || !college_code || !zone_id) {
    return createResponse({ success: false, error: 'Missing fields' }, 400);
  }
  // Prefer RPC with anon key to avoid service key browser restrictions
  const result = callSupabaseRpc('create_college', {
    p_name: college_name,
    p_code: college_code,
    p_zone_id: zone_id
  });
  if (!result.success) {
    return createResponse({ success: false, error: result.error || 'Insert failed', status: result.status || null }, 500);
  }
  return createResponse({ success: true, id: (result.data && result.data.id) ? result.data.id : result.data });
}

function updateCollege(e) {
  const body = parseJsonBody(e) || {};
  const id = Number(readField(e, body, 'id'));
  if (!id) return createResponse({ success: false, error: 'id required' }, 400);
  const data = {};
  ['college_name', 'college_code', 'zone_id', 'address', 'contact_email', 'contact_phone', 'is_active', 'total_members'].forEach(k => {
    const v = readField(e, body, k);
    if (v !== '') data[k] = v;
  });
  const res = updateSupabaseData('colleges', id, data);
  if (!res.success) return createResponse({ success: false, error: res.error || 'Update failed', status: res.status || null }, 500);
  return createResponse({ success: true });
}

function deleteCollege(id) {
  if (!id) return createResponse({ success: false, error: 'id required' }, 400);
  const res = deleteSupabaseData('colleges', id);
  if (!res.success) return createResponse({ success: false, error: res.error || 'Delete failed', status: res.status || null }, 500);
  return createResponse({ success: true });
}

function getCollegesByZone(zoneId) {
  try {
    const result = getSupabaseData('colleges', { zone_id: zoneId });

    if (result.success) {
      return createResponse({ success: true, colleges: result.data });
    } else {
      return createResponse({ error: 'Failed to fetch colleges' }, 500);
    }
  } catch (error) {
    console.error('Get colleges by zone error:', error);
    return createResponse({ error: 'Failed to fetch colleges' }, 500);
  }
}

// ===== USER HANDLERS =====
function handleUsers(e, method) {
  switch (method) {
    case 'getAll':
      return getAllUsers();
    case 'getByRole':
      return getUsersByRole(e.parameter.role);
    case 'create':
      return createUser(e);
    case 'update':
      return updateUser(e);
    case 'delete':
      return deleteUser(e.parameter.id);
    default:
      return createResponse({ error: 'Invalid user method' }, 400);
  }
}

function getAllUsers() {
  try {
    // Mock data - replace with actual database query
    const users = [
      { id: 1, full_name: 'John Doe', email: 'john@example.com', role: 'zone_convener', zone: 'east', college_id: 1 },
      { id: 2, full_name: 'Jane Smith', email: 'jane@example.com', role: 'mentor', zone: 'east', college_id: 1 }
    ];

    return createResponse({ success: true, users: users });
  } catch (error) {
    console.error('Get users error:', error);
    return createResponse({ error: 'Failed to fetch users' }, 500);
  }
}

// ===== REGISTRATION HANDLERS =====
function handleRegistrations(e, method) {
  switch (method) {
    case 'getAll':
      return getAllRegistrations();
    case 'getById':
      return getRegistrationById(e.parameter.id);
    case 'approve':
      return approveRegistration(e);
    case 'reject':
      return rejectRegistration(e);
    case 'delete':
      return deleteRegistration(e.parameter.id);
    case 'create':
      return createRegistration(e);
    case 'update':
      return updateRegistration(e);
    default:
      return createResponse({ error: 'Invalid registration method' }, 400);
  }
}

function getAllRegistrations() {
  try {
    // Mock data - replace with actual database query
    const registrations = [
      { id: 1, applicant_name: 'Student 1', email: 'student1@example.com', zone: 'east', college: 'Delhi University', applying_for: 'mentor', status: 'pending' },
      { id: 2, applicant_name: 'Student 2', email: 'student2@example.com', zone: 'west', college: 'IIT Delhi', applying_for: 'convener', status: 'approved' }
    ];

    return createResponse({ success: true, registrations: registrations });
  } catch (error) {
    console.error('Get registrations error:', error);
    return createResponse({ error: 'Failed to fetch registrations' }, 500);
  }
}

// ---- Registration CRUD ----
function createRegistration(e) {
  const body = parseJsonBody(e) || {};
  const required = ['applicant_name', 'email', 'phone', 'college_id', 'zone_id', 'applying_for', 'unit_name'];
  for (var i = 0; i < required.length; i++) {
    var key = required[i];
    var v = readField(e, body, key);
    if (v === '' || v === null || v === undefined) return createResponse({ success: false, error: 'Missing ' + key }, 400);
  }
  const payload = {
    p_applicant_name: String(readField(e, body, 'applicant_name')),
    p_email: String(readField(e, body, 'email')),
    p_phone: String(readField(e, body, 'phone')),
    p_college_id: Number(readField(e, body, 'college_id')),
    p_zone_id: Number(readField(e, body, 'zone_id')),
    p_applying_for: String(readField(e, body, 'applying_for')),
    p_unit_name: String(readField(e, body, 'unit_name')),
    p_date_of_birth: String(readField(e, body, 'date_of_birth') || null),
    p_academic_session: String(readField(e, body, 'academic_session') || null),
    p_student_year: String(readField(e, body, 'student_year') || null),
    p_status: String(readField(e, body, 'status') || 'pending')
  };
  const res = callSupabaseRpc('create_registration', payload);
  if (!res.success) return createResponse({ success: false, error: res.error || 'Insert failed', status: res.status || null }, 500);
  return createResponse({ success: true, id: res.data && res.data[0] ? res.data[0].id : null });
}

function updateRegistration(e) {
  const body = parseJsonBody(e) || {};
  const id = Number(readField(e, body, 'id'));
  if (!id) return createResponse({ success: false, error: 'id required' }, 400);
  const data = {};
  ['applicant_name', 'email', 'phone', 'college_id', 'zone_id', 'applying_for', 'unit_name', 'date_of_birth', 'academic_session', 'student_year', 'status'].forEach(k => { const v = readField(e, body, k); if (v !== '') data[k] = v; });
  const res = updateSupabaseData('registrations', id, data);
  if (!res.success) return createResponse({ success: false, error: res.error || 'Update failed', status: res.status || null }, 500);
  return createResponse({ success: true });
}

function approveRegistration(e) {
  const body = parseJsonBody(e) || {};
  const id = Number(readField(e, body, 'id'));
  const status = String(readField(e, body, 'status') || 'approved');
  if (!id) return createResponse({ success: false, error: 'id required' }, 400);
  const res = updateSupabaseData('registrations', id, { status: status });
  if (!res.success) return createResponse({ success: false, error: res.error || 'Status update failed', status: res.status || null }, 500);
  return createResponse({ success: true });
}

function rejectRegistration(e) {
  const body = parseJsonBody(e) || {};
  const id = Number(readField(e, body, 'id'));
  if (!id) return createResponse({ success: false, error: 'id required' }, 400);
  const res = updateSupabaseData('registrations', id, { status: 'rejected' });
  if (!res.success) return createResponse({ success: false, error: res.error || 'Reject failed', status: res.status || null }, 500);
  return createResponse({ success: true });
}

function deleteRegistration(id) {
  if (!id) return createResponse({ success: false, error: 'id required' }, 400);
  const res = deleteSupabaseData('registrations', id);
  if (!res.success) return createResponse({ success: false, error: res.error || 'Delete failed', status: res.status || null }, 500);
  return createResponse({ success: true });
}

// ===== REPORT HANDLERS =====
function handleReports(e, method) {
  switch (method) {
    case 'registrations':
      return getRegistrationReport();
    case 'zones':
      return getZoneReport();
    case 'colleges':
      return getCollegeReport();
    case 'summary':
      return reportSummary(e);
    case 'renderPdf':
      return renderReportPdf(e);
    case 'export':
      return exportData(e.parameter.format, e.parameter.name, e.parameter.sheetId, e.parameter.source);
    default:
      return createResponse({ error: 'Invalid report method' }, 400);
  }
}

// ===== EVENTS HANDLERS =====
function handleEvents(e, method) {
  switch (method) {
    case 'listByCollege':
      return eventsListByCollege(Number(e.parameter.collegeId));
    case 'create':
      return eventCreate(e);
    case 'update':
      return eventUpdate(e);
    case 'delete':
      return eventDelete(Number(e.parameter.id));
    default:
      return createResponse({ error: 'Invalid events method' }, 400);
  }
}

function eventsListByCollege(collegeId) {
  try {
    if (!collegeId) return createResponse({ success: false, error: 'collegeId required' }, 400);
    var endpoint = `events?select=*&college_id=eq.${collegeId}&order=start_at.asc`;
    // Primary: anon select
    var result = makeSupabaseSelect(endpoint);
    if (result && result.success && Array.isArray(result.data)) {
      return createResponse({ success: true, events: result.data });
    }
    // Fallback: server-side service role (still safe here, runs on Apps Script)
    var svc = makeSupabaseRequest(endpoint, 'GET');
    if (!svc.success) return createResponse({ success: false, error: svc.error || 'Fetch failed' }, 500);
    return createResponse({ success: true, events: svc.data });
  } catch (err) {
    return createResponse({ success: false, error: err.toString() }, 500);
  }
}

function eventCreate(e) {
  const body = parseJsonBody(e) || {};
  // Normalize timestamps: empty -> null; otherwise pass as-is (ISO expected)
  const norm = (v) => {
    const s = String(v === undefined || v === null ? '' : v).trim();
    return s.length ? s : null;
  };
  const payload = {
    college_id: Number(readField(e, body, 'college_id')),
    title: String(readField(e, body, 'title')),
    description: String(readField(e, body, 'description')),
    start_at: norm(readField(e, body, 'start_at')),
    end_at: norm(readField(e, body, 'end_at')),
    location: String(readField(e, body, 'location') || ''),
    banner_url: String(readField(e, body, 'banner_url') || ''),
    status: String(readField(e, body, 'status') || 'scheduled')
  };
  if (!payload.college_id || !payload.title || !payload.start_at) {
    return createResponse({ success: false, error: 'Missing required fields' }, 400);
  }
  // Insert via SECURITY DEFINER RPC to avoid RLS and never use service secret in browser
  const rpc = callSupabaseRpc('create_event', {
    p_college_id: payload.college_id,
    p_title: payload.title,
    p_description: payload.description,
    p_start_at: payload.start_at,
    p_end_at: payload.end_at,
    p_location: payload.location,
    p_banner_url: payload.banner_url,
    p_status: payload.status
  });
  if (!rpc.success) return createResponse({ success: false, error: rpc.error || 'Insert failed', status: rpc.status || null }, 500);
  return createResponse({ success: true, event: rpc.data && rpc.data[0] ? rpc.data[0] : null });
}

function eventUpdate(e) {
  const body = parseJsonBody(e) || {};
  const id = Number(readField(e, body, 'id'));
  if (!id) return createResponse({ success: false, error: 'id required' }, 400);
  const up = {};
  ['title', 'description', 'start_at', 'end_at', 'location', 'banner_url', 'status', 'college_id'].forEach(k => { var v = readField(e, body, k); if (v !== '') up[k] = v; });
  const res = updateSupabaseData('events', id, up);
  if (!res.success) return createResponse({ success: false, error: res.error || 'Update failed', status: res.status || null }, 500);
  return createResponse({ success: true });
}

function eventDelete(id) {
  if (!id) return createResponse({ success: false, error: 'id required' }, 400);
  // Use SECURITY DEFINER RPC to bypass RLS safely with anon key
  const rpc = callSupabaseRpc('delete_event', { p_id: Number(id) });
  if (!rpc.success) return createResponse({ success: false, error: rpc.error || 'Delete failed', status: rpc.status || null }, 500);
  return createResponse({ success: true });
}

function getRegistrationReport() {
  try {
    // Mock data - replace with actual database query
    const report = {
      total_registrations: 150,
      pending: 45,
      approved: 90,
      rejected: 15,
      by_zone: {
        'east': 25,
        'west': 20,
        'north': 30,
        'south': 25,
        'jhandewalan': 15,
        'keshav': 10,
        'ramkrishna': 15,
        'yamuna': 10
      }
    };

    return createResponse({ success: true, report: report });
  } catch (error) {
    console.error('Get registration report error:', error);
    return createResponse({ error: 'Failed to generate report' }, 500);
  }
}

// ===== UTILITY FUNCTIONS =====
function createResponse(data, statusCode = 200) {
  console.log('Sending Response - Status:', statusCode, 'Data:', JSON.stringify(data));
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Internal builder so we can reuse in both handlers without reparsing TextOutput
function buildReportSummary(rangeParam, zoneIdParam) {
  var range = (String(rangeParam || '30d')).toLowerCase();
  var zoneId = zoneIdParam ? Number(zoneIdParam) : null;
  var sinceIso = '';
  try {
    var days = 30;
    if (/^(7|14|30|90)d$/.test(range)) days = Number(range.replace('d', ''));
    var since = new Date();
    since.setDate(since.getDate() - days);
    sinceIso = since.toISOString();
  } catch (_) { }

  // Use anon select for read-only
  var members = makeSupabaseSelect('registrations' + (sinceIso ? ('?select=*&created_at=gte.' + encodeURIComponent(sinceIso)) : '?select=*'));
  var colleges = makeSupabaseSelect('colleges' + (zoneId ? ('?select=*&zone_id=eq.' + zoneId) : '?select=*'));
  var events = makeSupabaseSelect('events' + (sinceIso ? ('?select=*&start_at=gte.' + encodeURIComponent(sinceIso)) : '?select=*'));

  if (!members.success || !colleges.success || !events.success) {
    return { success: false, error: 'fetch_failed', details: { members: members.success, colleges: colleges.success, events: events.success } };
  }

  var regs = members.data || [];
  var cols = (colleges.data || []).filter(function (c) { return zoneId ? c.zone_id == zoneId : true; });
  var evs = events.data || [];

  var kpi = {
    total_colleges: cols.length,
    total_members: regs.length,
    total_events: evs.length,
    units_proxy: 0
  };
  try {
    var setUnits = {};
    regs.forEach(function (r) { if (!r) return; var key = r.college_id + ':' + (r.unit_name || r.applying_for || 'x'); setUnits[key] = true; });
    kpi.units_proxy = Object.keys(setUnits).length;
  } catch (_) { }

  var by_zone = {};
  cols.forEach(function (c) { var zid = c.zone_id || 'unknown'; if (!by_zone[zid]) by_zone[zid] = { colleges: 0, members: 0, events: 0 }; by_zone[zid].colleges += 1; });
  regs.forEach(function (r) { var zid = r.zone_id || 'unknown'; if (!by_zone[zid]) by_zone[zid] = { colleges: 0, members: 0, events: 0 }; by_zone[zid].members += 1; });
  evs.forEach(function (ev) { var college = cols.find(function (c) { return c.id == ev.college_id; }); var zid = college ? college.zone_id : 'unknown'; if (!by_zone[zid]) by_zone[zid] = { colleges: 0, members: 0, events: 0 }; by_zone[zid].events += 1; });

  return { success: true, range: range, zoneId: zoneId, kpi: kpi, by_zone: by_zone, totals: { registrations: regs.length, colleges: cols.length, events: evs.length } };
}

// Internal builder so we can reuse in both handlers without reparsing TextOutput
function buildReportSummary(rangeParam, zoneIdParam) {
  var range = (String(rangeParam || '30d')).toLowerCase();
  var zoneId = zoneIdParam ? Number(zoneIdParam) : null;
  var sinceIso = '';
  try {
    var days = 30;
    if (/^(7|14|30|90)d$/.test(range)) days = Number(range.replace('d', ''));
    var since = new Date();
    since.setDate(since.getDate() - days);
    sinceIso = since.toISOString();
  } catch (_) { }

  var members = makeSupabaseSelect('registrations' + (sinceIso ? ('?select=id,zone_id,college_id,unit_name,applying_for,created_at&created_at=gte.' + encodeURIComponent(sinceIso)) : '?select=id,zone_id,college_id,unit_name,applying_for,created_at'));
  var colleges = makeSupabaseSelect('colleges' + (zoneId ? ('?select=id,zone_id&zone_id=eq.' + zoneId) : '?select=id,zone_id'));
  var events = makeSupabaseSelect('events' + (sinceIso ? ('?select=id,college_id,start_at&start_at=gte.' + encodeURIComponent(sinceIso)) : '?select=id,college_id,start_at'));

  // Be tolerant: if any fetch fails, continue with empty arrays and add warning
  var warnings = [];
  if (!members.success) warnings.push('registrations');
  if (!colleges.success) warnings.push('colleges');
  if (!events.success) warnings.push('events');

  var regs = (members && members.success && members.data) ? members.data : [];
  var cols = (colleges && colleges.success && colleges.data) ? colleges.data : [];
  if (zoneId) cols = cols.filter(function (c) { return c.zone_id == zoneId; });
  var evs = (events && events.success && events.data) ? events.data : [];

  var kpi = {
    total_colleges: cols.length,
    total_members: regs.length,
    total_events: evs.length,
    units_proxy: 0
  };
  try {
    var setUnits = {};
    regs.forEach(function (r) { if (!r) return; var key = r.college_id + ':' + (r.unit_name || r.applying_for || 'x'); setUnits[key] = true; });
    kpi.units_proxy = Object.keys(setUnits).length;
  } catch (_) { }

  var by_zone = {};
  cols.forEach(function (c) { var zid = c.zone_id || 'unknown'; if (!by_zone[zid]) by_zone[zid] = { colleges: 0, members: 0, events: 0 }; by_zone[zid].colleges += 1; });
  regs.forEach(function (r) { var zid = r.zone_id || 'unknown'; if (!by_zone[zid]) by_zone[zid] = { colleges: 0, members: 0, events: 0 }; by_zone[zid].members += 1; });
  evs.forEach(function (ev) { var college = cols.find(function (c) { return c.id == ev.college_id; }); var zid = college ? college.zone_id : 'unknown'; if (!by_zone[zid]) by_zone[zid] = { colleges: 0, members: 0, events: 0 }; by_zone[zid].events += 1; });

  var payload = { success: true, range: range, zoneId: zoneId, kpi: kpi, by_zone: by_zone, totals: { registrations: regs.length, colleges: cols.length, events: evs.length } };
  if (warnings.length) payload.warnings = warnings;
  return payload;
}


function createUser(userData) {
  // Mock implementation - replace with actual database insert
  return Math.floor(Math.random() * 1000);
}

function logoutUser(e) {
  const token = e.parameter.token;

  try {
    // Delete session from database
    // For now, just return success
    return createResponse({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return createResponse({ error: 'Logout failed' }, 500);
  }
}

// ===== EMAIL NOTIFICATIONS =====
function sendEmailNotification(to, subject, body) {
  try {
    GmailApp.sendEmail(to, subject, body);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// ===== GOOGLE SHEETS INTEGRATION =====
function exportToSheets(data, sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.create(sheetName);
    const sheet = spreadsheet.getActiveSheet();
    return spreadsheet.getUrl();
  } catch (error) {
    console.error('Sheets export error:', error);
    return null;
  }
}

function writeSheetData(sheet, headers, rows) {
  sheet.clear();
  if (headers && headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (rows && rows.length) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    sheet.setFrozenRows(1);
    try { sheet.autoResizeColumns(1, headers.length); } catch (_) { }
  }
}

// Test function to check Supabase connection
function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    const result = getSupabaseData('zones');
    console.log('Test result:', result);
    return result;
  } catch (error) {
    console.error('Supabase test failed:', error);
    return { success: false, error: error.toString() };
  }
}

function exportData(format, name, sheetId, source) {
  try {
    if (!format || format.toLowerCase() !== 'sheets') {
      return createResponse({ error: 'Unsupported export format. Use format=sheets' }, 400);
    }

    const exportName = name && name.trim() ? name.trim() : `YUVA Export ${new Date().toISOString().slice(0, 10)}`;
    var ss;
    if (sheetId && sheetId.trim()) {
      ss = SpreadsheetApp.openById(sheetId.trim());
    } else {
      ss = SpreadsheetApp.create(exportName);
    }

    // NEW: Handles the "Export Members" button click.
    if (source === 'registrations') {
      const regsRes = getSupabaseData('registration_details');
      var regsSheet = ss.getSheetByName('Members Export');
      if (!regsSheet) regsSheet = ss.insertSheet('Members Export', 0);

      if (regsRes.success) {
        // Added 'Academic Session' to headers and r.academic_session to rows
        const headers = ['ID', 'Applicant Name', 'Email', 'Phone', 'Applying For', 'Academic Session', 'Unit Name', 'Status', 'College Name', 'Zone Name', 'Registered At'];
        const rows = (regsRes.data || []).map(r => [r.id, r.applicant_name, r.email, r.phone, r.applying_for, r.academic_session || 'N/A', r.unit_name, r.status, r.college_name, r.zone_name, r.created_at]);
        writeSheetData(regsSheet, headers, rows);
      }

      var metaSheet = ss.getSheetByName('Meta');
      if (!metaSheet) metaSheet = ss.insertSheet('Meta');
      var metaHeaders = ['Tab', 'Rows', 'Success', 'Message'];
      var regsRowCount = (regsRes.data && regsRes.data.length) ? regsRes.data.length : 0;
      var metaRows = [
        ['Members Export', regsRowCount, regsRes.success, regsRes.success ? 'OK' : (regsRes.error || 'Permission Error')]
      ];
      writeSheetData(metaSheet, metaHeaders, metaRows);

      return createResponse({ success: true, url: ss.getUrl(), name: ss.getName() });
    }

    // --- Main Export Logic for "Export All to Sheets" & "Export College Updates" ---
    var useBase = (source && source.toLowerCase() === 'base');

    const zonesRes = getSupabaseData('zones');
    const collegesRes = getSupabaseData(useBase ? 'colleges' : 'college_details');
    const regsRes = getSupabaseData(useBase ? 'registrations' : 'registration_details');
    const usersRes = getSupabaseData('admin_users'); // Still fetched for full export

    // Write Zones
    var zonesSheet = ss.getSheetByName('Zones');
    if (!zonesSheet) zonesSheet = ss.getSheetByName('Sheet1') || ss.insertSheet('Zones');
    zonesSheet.setName('Zones');
    if (zonesRes.success) {
      const headers = ['id', 'zone_code', 'zone_name', 'is_active', 'created_at'];
      const rows = (zonesRes.data || []).map(z => [z.id, z.zone_code, z.zone_name, z.is_active, z.created_at]);
      writeSheetData(zonesSheet, headers, rows);
    }

    // Write Admin Users (for full export only)
    var usersSheet = ss.getSheetByName('Admin Users');
    if (!usersSheet) usersSheet = ss.insertSheet('Admin Users');
    if (usersRes.success) {
      const headers = ['id', 'full_name', 'email', 'role', 'zone'];
      const rows = (usersRes.data || []).map(u => [u.id, u.full_name, u.email, u.role, u.zone]);
      writeSheetData(usersSheet, headers, rows);
    }

    // Write Colleges
    var collegesSheet = ss.getSheetByName('Colleges');
    if (!collegesSheet) collegesSheet = ss.insertSheet('Colleges');
    if (collegesRes.success) {
      const headers = ['id', 'college_name', 'college_code', 'zone_name', 'is_active', 'total_members'];
      const rows = (collegesRes.data || []).map(c => [c.id, c.college_name, c.college_code, c.zone_name, c.is_active, c.total_members]);
      writeSheetData(collegesSheet, headers, rows);
    }

    // Write Registrations
    var regsSheet = ss.getSheetByName('Registrations');
    if (!regsSheet) regsSheet = ss.insertSheet('Registrations');
    if (regsRes.success) {
      // Added 'academic_session' to headers and rows
      const headers = ['id', 'applicant_name', 'email', 'phone', 'applying_for', 'academic_session', 'status', 'college_name', 'zone_name'];
      const rows = (regsRes.data || []).map(r => [r.id, r.applicant_name, r.email, r.phone, r.applying_for, r.academic_session || 'N/A', r.status, r.college_name, r.zone_name]);
      writeSheetData(regsSheet, headers, rows);
    }

    // Update Meta Sheet
    var metaSheet = ss.getSheetByName('Meta');
    if (!metaSheet) metaSheet = ss.insertSheet('Meta');
    var metaHeaders = ['Tab', 'Rows', 'Success', 'Message'];
    var zr = (zonesRes.data || []).length;
    var cr = (collegesRes.data || []).length;
    var rr = (regsRes.data || []).length;
    var ur = (usersRes.data || []).length;

    var metaRows = [
      ['Zones', zr, zonesRes.success, zonesRes.success ? 'OK' : (zonesRes.error || 'Error')],
      ['Admin Users', ur, usersRes.success, usersRes.success ? 'OK' : (usersRes.error || 'Permission Error')],
      ['Colleges', cr, collegesRes.success, collegesRes.success ? 'OK' : (collegesRes.error || 'Error')],
      ['Registrations', rr, regsRes.success, regsRes.success ? 'OK' : (regsRes.error || 'Error')]
    ];
    writeSheetData(metaSheet, metaHeaders, metaRows);

    return createResponse({ success: true, url: ss.getUrl(), name: ss.getName() });

  } catch (error) {
    console.error('Export error:', error);
    return createResponse({ error: 'Export failed: ' + error.toString() }, 500);
  }
}

// ===== REPORT SUMMARY (JSON) =====
function reportSummary(e) {
  var res = buildReportSummary(e.parameter.range, e.parameter.zoneId);
  return createResponse(res);
}

// ===== RENDER PDF REPORT =====
function renderReportPdf(e) {
  try {
    var range = e.parameter.range || '30d';
    var zoneId = e.parameter.zoneId || '';
    var brand = { primary: '#555879', secondary: '#98A1BC', accent: '#DED3C4', beige: '#DED3C4', cream: '#F4EBD3' };
    var json = buildReportSummary(range, zoneId);
    if (!json || !json.success) return createResponse({ success: false, error: 'Failed to build summary', details: json && json.details ? json.details : null });

    // Build HTML for PDF (inline)
    var htmlContent = buildReportHtml(json, brand, { range: range, zoneId: zoneId });
    // Convert robustly: HTML string -> Blob(html) -> PDF
    var blob = Utilities.newBlob(htmlContent, 'text/html', 'report.html').getAs('application/pdf');
    blob.setName('YUVA_Report_' + new Date().toISOString().slice(0, 10) + '.pdf');
    var file = DriveApp.createFile(blob);
    return createResponse({ success: true, url: file.getUrl(), name: file.getName() });
  } catch (err) {
    return createResponse({ success: false, error: 'internal', message: String(err) });
  }
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, function (ch) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[ch]); });
}

function buildReportHtml(json, brand, params) {
  var css = `
    /* Web-safe fonts for GAS PDF compatibility */
    :root {
      --primary: #FF9933;
      --secondary: #000080;
      --accent: #138808;
      --light-bg: #f8fafc;
      --border: #e2e8f0;
      --text-main: #1a202c;
      --text-muted: #64748b;
      --white: #ffffff;
      --gradient-primary: linear-gradient(135deg, #FF9933 0%, #E67300 100%);
      --gradient-secondary: linear-gradient(135deg, #000080 0%, #000060 100%);
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: var(--text-main);
      background: var(--white);
      line-height: 1.5;
    }
    
    .header {
      background: var(--gradient-primary);
      padding: 40px 60px;
      color: var(--white);
      text-align: center;
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    
    .header p {
      font-size: 14px;
      font-weight: 500;
      opacity: 0.9;
    }
    
    .report-meta {
      display: flex;
      justify-content: space-between;
      padding: 30px 60px;
      border-bottom: 1px solid var(--border);
      background: var(--light-bg);
    }
    
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    
    .meta-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    
    .meta-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }
    
    .container {
      padding: 40px 60px;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--secondary);
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-left: 5px solid var(--primary);
      padding-left: 15px;
    }
    
    .summary-grid {
      display: table;
      width: 100%;
      border-spacing: 15px 0;
      margin: 0 -15px;
    }
    
    .summary-card {
      display: table-cell;
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      box-shadow: var(--shadow);
      width: 25%;
    }
    
    .card-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    
    .card-value {
      font-size: 32px;
      font-weight: 800;
      color: var(--primary);
    }
    
    .card-subtext {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    
    .content-blocks {
      display: table;
      width: 100%;
      margin-top: 30px;
      border-spacing: 30px 0;
      margin: 30px -30px 0;
    }
    
    .content-block {
      display: table-cell;
      vertical-align: top;
      width: 50%;
    }
    
    .block-card {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    
    .block-header {
      background: var(--light-bg);
      padding: 15px 20px;
      border-bottom: 1px solid var(--border);
      font-size: 16px;
      font-weight: 700;
      color: var(--secondary);
    }
    
    .block-body {
      padding: 20px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th {
      font-size: 11px;
      text-align: left;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      padding: 12px 10px;
      border-bottom: 2px solid var(--border);
    }
    
    td {
      padding: 12px 10px;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    .bar-chart-item {
      margin-bottom: 15px;
    }
    
    .bar-chart-label {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }
    
    .bar-container {
      height: 10px;
      background: var(--light-bg);
      border-radius: 5px;
      overflow: hidden;
    }
    
    .bar-fill {
      height: 100%;
      background: var(--primary);
      border-radius: 5px;
    }
    
    .footer {
      padding: 40px 60px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
    }
    
    .footer strong {
      color: var(--primary);
    }
  `;

  // Process data for charts/tables
  var tableRows = '';
  var maxMembers = 0;
  var zoneList = [];
  
  for (var zid in json.by_zone) {
    var z = json.by_zone[zid];
    maxMembers = Math.max(maxMembers, z.members);
    zoneList.push({ name: zid, data: z });
    
    tableRows += `
      <tr>
        <td style="font-weight:600;">${escapeHtml(zid)}</td>
        <td style="text-align:center;">${z.colleges}</td>
        <td style="text-align:center;">${z.members}</td>
        <td style="text-align:center;">${z.events}</td>
      </tr>`;
  }

  var activityBars = '';
  zoneList.slice(0, 8).forEach(function(zone) {
    var width = Math.max(5, (zone.data.members / (maxMembers || 1)) * 100);
    activityBars += `
      <div class="bar-chart-item">
        <div class="bar-chart-label">
          <span>${escapeHtml(zone.name)}</span>
          <span style="color:var(--primary);">${zone.data.members} Members</span>
        </div>
        <div class="bar-container">
          <div class="bar-fill" style="width: ${width}%"></div>
        </div>
      </div>
    `;
  });

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>${css}</style>
</head>
<body>
    <div class="header">
        <h1>YUVA India</h1>
        <p>Youth United for Vision & Action • Delhi Chapter</p>
    </div>

    <div class="report-meta">
        <div class="meta-item">
            <span class="meta-label">Report Type</span>
            <span class="meta-value">Activity Summary Report</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Date Range</span>
            <span class="meta-value">${escapeHtml(params.range)}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Zone Filter</span>
            <span class="meta-value">${escapeHtml(params.zoneId || 'All Zones')}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Generated On</span>
            <span class="meta-value">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
    </div>

    <div class="container">
        <div class="section">
            <h2 class="section-title">Operational Key Metrics</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="card-title">Total Colleges</div>
                    <div class="card-value">${json.kpi.total_colleges}</div>
                    <div class="card-subtext">Active Units</div>
                </div>
                <div class="summary-card">
                    <div class="card-title">Total Members</div>
                    <div class="card-value">${json.kpi.total_members}</div>
                    <div class="card-subtext">Registered Volunteers</div>
                </div>
                <div class="summary-card">
                    <div class="card-title">Total Events</div>
                    <div class="card-value">${json.kpi.total_events}</div>
                    <div class="card-subtext">Conducted Activities</div>
                </div>
                <div class="summary-card">
                    <div class="card-title">Units Proxy</div>
                    <div class="card-value">${json.kpi.units_proxy}</div>
                    <div class="card-subtext">Verified Formations</div>
                </div>
            </div>
        </div>

        <div class="content-blocks">
            <div class="content-block">
                <div class="block-card">
                    <div class="block-header">Zone-wise Metrics</div>
                    <div class="block-body">
                        <table>
                            <thead>
                                <tr>
                                    <th>Zone Name</th>
                                    <th style="text-align:center;">Colleges</th>
                                    <th style="text-align:center;">Members</th>
                                    <th style="text-align:center;">Events</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="content-block">
                <div class="block-card">
                    <div class="block-header">Activity Distribution</div>
                    <div class="block-body">
                        <p style="font-size:12px; color:var(--text-muted); margin-bottom:15px;">Visual representation of member engagement across active zones.</p>
                        ${activityBars}
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>© ${new Date().getFullYear()} <strong>YUVA India</strong>. This is an automatically generated system report.</p>
        <p style="margin-top:5px; opacity:0.7;">Confidential - For Administrative Use Only</p>
    </div>
</body>
</html>`;
}

/**
 * Fetches homepage statistics (total colleges, members, units)
 * by calling the get_homepage_stats RPC in Supabase.
 * This is a public-facing endpoint.
 */
function getHomepageStats() {
  try {
    // Call the RPC using the anon key because this is public data
    const result = callSupabaseRpc('get_homepage_stats');

    if (result.success && result.data) {
      // The RPC returns an array with one JSON object inside
      const stats = Array.isArray(result.data) ? result.data[0] : result.data;
      return createResponse({ success: true, stats: stats });
    } else {
      console.error('Failed to fetch homepage stats:', result.error);
      return createResponse({ success: false, error: 'Could not retrieve stats' }, 500);
    }
  } catch (error) {
    console.error('Error in getHomepageStats:', error);
    return createResponse({ error: 'Internal server error' }, 500);
  }
}

function testSupabaseConnection() {
  Logger.log("Testing Supabase connection...");
  var response = makeSupabaseRequest('zones?limit=1'); // Fetches just one zone
  Logger.log(JSON.stringify(response));
}


// ===============================================
// ===== SUPER ADMIN HANDLER (NEW)           =====
// ===============================================

function handleSuperAdmin(e, method) {
  // Note: Add a security check here to ensure only super admins can call these methods.
  // For simplicity in this example, we assume the frontend role check is sufficient.

  switch (method) {
    case 'getDashboardData':
      return getSuperAdminDashboardData();
    case 'updateUser':
      return updateUserRole(e);
    case 'sendNotice':
      return sendNotice(e);
    default:
      return createResponse({ error: 'Invalid super_admin method' }, 400);
  }
}

function getSuperAdminDashboardData() {
  try {
    // Fetch all data in parallel
    const zonePerformance = getZonePerformanceStats();
    const users = getAllAdminUsers();
    const activityLog = getActivityLog();
    const zones = makeSupabaseRequest('zones?select=id,zone_name', 'GET', null, true);

    const data = {
      zonePerformance: zonePerformance.success ? zonePerformance.data : [],
      users: users.success ? users.data : [],
      activityLog: activityLog.success ? activityLog.data : [],
      zones: zones.success ? zones.data : []
    };

    return createResponse({ success: true, data: data });
  } catch (error) {
    return createResponse({ success: false, error: 'Failed to aggregate dashboard data.', details: error.toString() }, 500);
  }
}

function getZonePerformanceStats() {
  // This is best done via a Supabase RPC for efficiency
  return callSupabaseRpc('get_zone_performance_stats');
}

function getAllAdminUsers() {
  return makeSupabaseRequest('admin_users?select=id,full_name,email,role,zone', 'GET', null, true);
}

function getActivityLog() {
  // Fetch latest 20 activities
  return makeSupabaseRequest('activity_log?select=user_email,action,created_at&order=created_at.desc&limit=20', 'GET', null, true);
}

function updateUserRole(e) {
  try {
    const userId = e.parameter.userId;
    const role = e.parameter.role;
    // The zoneId parameter can be added here if you want to assign conveners to zones.

    if (!userId || !role) {
      return createResponse({ success: false, error: 'User ID and Role are required.' }, 400);
    }

    // Check if trying to update to super_admin
    if (role === 'super_admin') {
      // Get current user's role to check if they're already a super admin
      const currentUserResult = makeSupabaseRequest(`admin_users?id=eq.${userId}&select=role`, 'GET', null, true);
      const currentRole = (currentUserResult.success && currentUserResult.data && currentUserResult.data[0]) 
        ? currentUserResult.data[0].role 
        : null;

      // Only check limit if user is NOT already a super admin
      if (currentRole !== 'super_admin') {
        const superAdminCheck = makeSupabaseRequest('admin_users?role=eq.super_admin&select=id', 'GET', null, true);
        if (superAdminCheck.success && superAdminCheck.data) {
          const superAdminCount = Array.isArray(superAdminCheck.data) ? superAdminCheck.data.length : 0;
          if (superAdminCount >= 2) {
            return createResponse({ 
              success: false, 
              error: 'Maximum number of Super Admins reached', 
              details: 'Only 2 Super Admins are allowed in the system.' 
            }, 403);
          }
        }
      }
    }

    // Use service key to update user roles
    const result = makeSupabaseRequest(`admin_users?id=eq.${userId}`, 'PATCH', { role: role }, true);

    if (result.success) {
      return createResponse({ success: true });
    } else {
      return createResponse({ success: false, error: 'Failed to update user role.', details: result.error }, 500);
    }
  } catch (error) {
    return createResponse({ success: false, error: 'Server error during user update.', details: error.toString() }, 500);
  }
}

function sendNotice(e) {
  try {
    const recipient = e.parameter.recipient;
    const subject = e.parameter.subject;
    const message = e.parameter.message;

    if (!recipient || !subject || !message) {
      return createResponse({ success: false, error: 'Recipient, subject, and message are required.' }, 400);
    }

    let emailList = '';
    let result;

    // Log the initial request for easier debugging in Apps Script Executions log
    console.log("Attempting to find recipients for group: " + recipient);

    if (recipient === 'all_conveners') {
      result = makeSupabaseRequest("admin_users?role=eq.zone_convener&select=email", 'GET', null, true);
    } else if (recipient === 'all_mentors') {
      result = makeSupabaseRequest("admin_users?role=eq.mentor&select=email", 'GET', null, true);
    } else if (recipient.startsWith('zone_')) {
      const zoneId = recipient.split('_')[1];
      // This queries users assigned to a specific zone ID
      result = makeSupabaseRequest(`admin_users?zone=eq.${zoneId}&select=email`, 'GET', null, true);
    } else {
      return createResponse({ success: false, error: 'Invalid recipient group selected.' }, 400);
    }

    // Log what the database returned
    console.log("Supabase query result: " + JSON.stringify(result));

    if (result && result.success && result.data && result.data.length > 0) {
      emailList = result.data.map(u => u.email).join(',');
      console.log("Compiled recipient email list: " + emailList);
    }

    if (emailList) {
      const htmlBody = `<p>${message}</p><hr><p><em>This is an automated message from the YUVA Delhi Admin Dashboard.</em></p>`;
      GmailApp.sendEmail(emailList, `[YUVA Admin Notice] ${subject}`, "", { htmlBody: htmlBody, name: 'YUVA Admin Notices' });
      console.log("Email sent successfully to " + result.data.length + " recipients.");
      return createResponse({ success: true, message: 'Notice sent to ' + result.data.length + ' recipient(s).' });
    } else {
      console.log("Request failed because no recipient emails were found for the group.");
      return createResponse({ success: false, error: 'No recipients found for the selected group.' });
    }
  } catch (error) {
    console.error("Critical error in sendNotice function: " + error.toString());
    return createResponse({ success: false, error: 'Failed to send email due to a server error.', details: error.toString() }, 500);
  }
}


/**
 * ===== TEMPORARY DEBUGGING FUNCTION =====
 * This function will help us test the backend logic directly.
 */
function testTheEmailCheck() {
  // We will pretend to be the frontend and call the checkEmailExists function
  // with an email that we know is already in your database.
  const mockFrontendRequest = {
    parameter: {
      email: 'zoneadmin@gmail.com' // Using the email from your screenshot
    }
  };

  // Run the function we want to test
  const response = checkEmailExists(mockFrontendRequest);

  // Log the exact output to see what the server is sending
  Logger.log(response.getContent());
}
// ===== COLLEGE REPORT GENERATION =====
/**
 * Generates a comprehensive PDF report for a specific college and emails it to the requesting user.
 * This function handles role-based access and generates reports with college overview, member statistics, and event details.
 */
function generateCollegeReport(e) {
  try {
    // Parse request body (JSON) if present and valid
    let requestData = {};
    if (e.postData && e.postData.contents) {
      try {
        // Only try to parse if it looks like JSON
        const contents = e.postData.contents;
        if (contents.trim().startsWith('{')) {
          requestData = JSON.parse(contents);
        }
      } catch (parseErr) {
        console.warn('Post data was not JSON, falling back to parameters');
      }
    }

    const collegeId = requestData.collegeId || e.parameter.collegeId;
    const userEmail = requestData.userEmail || e.parameter.userEmail;
    const userRole = requestData.userRole || e.parameter.userRole;
    const userName = requestData.userName || e.parameter.userName || 'Admin';

    // Validate required parameters
    if (!collegeId || !userEmail) {
      return createResponse({ success: false, error: 'College ID and user email are required' }, 400);
    }

    // Fetch college data
    const collegeResult = makeSupabaseRequest(
      `college_details?id=eq.${collegeId}&select=*`,
      'GET',
      null,
      true
    );

    if (!collegeResult.success || !collegeResult.data || collegeResult.data.length === 0) {
      // Fallback to colleges table
      const fallbackResult = makeSupabaseRequest(
        `colleges?id=eq.${collegeId}&select=*`,
        'GET',
        null,
        true
      );
      
      if (!fallbackResult.success || !fallbackResult.data || fallbackResult.data.length === 0) {
        return createResponse({ success: false, error: 'College not found' }, 404);
      }
      
      var college = fallbackResult.data[0];
    } else {
      var college = collegeResult.data[0];
    }

    // Fetch members/registrations for this college
    const membersResult = makeSupabaseRequest(
      `registrations?college_id=eq.${collegeId}&select=*`,
      'GET',
      null,
      true
    );

    const members = (membersResult.success && membersResult.data) ? membersResult.data : [];

    // Calculate member statistics
    const memberStats = {
      total: members.length,
      approved: members.filter(m => m.status === 'approved').length,
      pending: members.filter(m => m.status === 'pending').length,
      rejected: members.filter(m => m.status === 'rejected').length,
      mentors: members.filter(m => m.applying_for && m.applying_for.toLowerCase().includes('mentor')).length
    };

    // Fetch events for this college
    const eventsResult = makeSupabaseRequest(
      `events?college_id=eq.${collegeId}&select=*`,
      'GET',
      null,
      true
    );

    const events = (eventsResult.success && eventsResult.data) ? eventsResult.data : [];
    const now = new Date();
    const upcomingEvents = events.filter(e => new Date(e.start_at) > now);
    const pastEvents = events.filter(e => new Date(e.start_at) <= now);

    // Generate PDF
    const pdfBlob = Utilities.newBlob(buildCollegeReportHtml(college, memberStats, members, upcomingEvents, pastEvents), 'text/html').getAs('application/pdf');

    // Email the PDF
    const collegeName = college.college_name || 'College';
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    const fileName = `${collegeName.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${timestamp}.pdf`;

    const emailSubject = `YUVA - ${collegeName} Report`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FF9933 0%, #E67300 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">YUVA</h1>
          <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">College Report Generated</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px;">
          <h2 style="color: #000080; margin-top: 0;">Hello ${userName},</h2>
          <p style="color: #475569; line-height: 1.6;">
            Your college report for <strong>${collegeName}</strong> has been successfully generated.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #000080; margin-top: 0;">Report Summary</h3>
            <ul style="color: #475569; line-height: 1.8;">
              <li><strong>College:</strong> ${collegeName}</li>
              <li><strong>College Code:</strong> ${college.college_code || 'N/A'}</li>
              <li><strong>Zone:</strong> ${college.zone_name || 'N/A'}</li>
              <li><strong>Total Members:</strong> ${memberStats.total}</li>
              <li><strong>Total Events:</strong> ${events.length}</li>
              <li><strong>Generated:</strong> ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM dd, yyyy HH:mm')}</li>
            </ul>
          </div>
          <p style="color: #475569; line-height: 1.6;">
            The detailed PDF report is attached to this email. Please review it and keep it for your records.
          </p>
          <div style="background: #EBF4FF; border-left: 4px solid #000080; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #475569; font-size: 14px;">
              <strong>Note:</strong> This report contains sensitive information. Please handle it securely.
            </p>
          </div>
        </div>
        <div style="text-align: center; padding: 20px; color: #94A3B8; font-size: 12px;">
          <p>© ${new Date().getFullYear()} YUVA · All rights reserved</p>
          <p style="margin: 5px 0 0 0;">Youth United for Vision and Action</p>
        </div>
      </div>
    `;

    GmailApp.sendEmail(userEmail, emailSubject, '', {
      htmlBody: emailBody,
      attachments: [pdfBlob.setName(fileName)],
      name: 'YUVA Report System'
    });

    return createResponse({
      success: true,
      message: 'College report generated and sent successfully',
      fileName: fileName
    });

  } catch (error) {
    console.error('Error generating college report:', error);
    return createResponse({
      success: false,
      error: 'Failed to generate college report',
      details: error.toString()
    }, 500);
  }
}

/**
 * Builds HTML content for the college report PDF
 * Uses modern styling similar to the zone reports
 */
function buildCollegeReportHtml(college, memberStats, members, upcomingEvents, pastEvents) {
  var css = `
    /* Web-safe fonts for GAS PDF compatibility */
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1a202c;
      background: #ffffff;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    
    :root {
      --primary: #FF9933;
      --secondary: #000080;
      --light-bg: #f8fafc;
      --border: #e2e8f0;
    }
    
    .header {
      background: linear-gradient(135deg, #FF9933 0%, #E67300 100%);
      padding: 40px 60px;
      color: #ffffff;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .report-meta {
      display: flex;
      justify-content: space-between;
      padding: 20px 60px;
      background: var(--light-bg);
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    
    .container {
      padding: 40px 60px;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--secondary);
      margin-bottom: 20px;
      border-left: 4px solid var(--primary);
      padding-left: 12px;
    }
    
    .stats-grid {
      display: table;
      width: 100%;
      border-spacing: 10px 0;
      margin: 0 -10px;
    }
    
    .stat-card {
      display: table-cell;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      width: 20%;
    }
    
    .stat-label {
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: 800;
      color: var(--primary);
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th {
      background: var(--light-bg);
      padding: 12px 15px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #4a5568;
      border-bottom: 2px solid var(--border);
    }
    
    td {
      padding: 12px 15px;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
    }
    
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    
    .badge-approved { background: #c6f6d5; color: #22543d; }
    .badge-pending { background: #fff4de; color: #ffa800; }
    
    .event-card {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 15px;
      margin-bottom: 12px;
    }
    
    .event-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    
    .event-title {
      font-weight: 700;
      color: #2d3748;
    }
    
    .event-meta {
      font-size: 12px;
      color: #718096;
    }
    
    .footer {
      padding: 40px 60px;
      text-align: center;
      font-size: 12px;
      color: #718096;
      border-top: 1px solid var(--border);
    }
  `;

  var memberRows = '';
  members.slice(0, 100).forEach(function(m) {
    var statusClass = (m.status || 'pending').toLowerCase();
    memberRows += `
      <tr>
        <td><strong>${escapeHtml(m.applicant_name)}</strong></td>
        <td>${escapeHtml(m.email)}</td>
        <td>${escapeHtml(m.applying_for || 'Member')}</td>
        <td><span class="badge badge-${statusClass}">${statusClass}</span></td>
      </tr>`;
  });

  var eventList = function(events) {
    if (!events.length) return '<p style="font-size:13px; color:#718096; font-style:italic;">No events recorded.</p>';
    return events.slice(0, 10).map(function(e) {
      return `
        <div class="event-card">
          <div class="event-header">
            <span class="event-title">${escapeHtml(e.title)}</span>
            <span class="event-meta">${Utilities.formatDate(new Date(e.start_at), "GMT+5:30", "MMM dd, yyyy")}</span>
          </div>
          <div class="event-meta">${e.location ? 'Location: ' + escapeHtml(e.location) : ''}</div>
        </div>`;
    }).join('');
  };

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>${css}</style>
</head>
<body>
    <div class="header">
        <h1>College Activity Report</h1>
        <p>YUVA India • Empowering Youth</p>
    </div>

    <div class="report-meta">
        <div><strong>College:</strong> ${escapeHtml(college.college_name)}</div>
        <div><strong>Code:</strong> ${escapeHtml(college.college_code)}</div>
        <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
    </div>

    <div class="container">
        <div class="section">
            <h2 class="section-title">Membership Overview</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total</div>
                    <div class="stat-value">${memberStats.total}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Approved</div>
                    <div class="stat-value" style="color:#2f855a;">${memberStats.approved}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Pending</div>
                    <div class="stat-value" style="color:#c05621;">${memberStats.pending}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Mentors</div>
                    <div class="stat-value" style="color:#2b6cb0;">${memberStats.mentors}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Members List</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Position</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${memberRows}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2 class="section-title">Upcoming Events</h2>
            ${eventList(upcomingEvents)}
        </div>

        <div class="section">
            <h2 class="section-title">Past Activities</h2>
            ${eventList(pastEvents)}
        </div>
    </div>

    <div class="footer">
        <p>© ${new Date().getFullYear()} YUVA India. This report is generated for administrative oversight.</p>
    </div>
</body>
</html>`;
}


function forceAuthorization() {
  UrlFetchApp.fetch("https://google.com");
}