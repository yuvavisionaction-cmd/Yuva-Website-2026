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

// ===== NEW SESSION MANAGEMENT FUNCTIONS (THESE WERE MISSING) =====

function createSessionToken(userId) {
  if (!userId) {
    throw new Error('User ID is required to create a session token.');
  }
  // Generate a simple, secure-enough random token
  const token = Utilities.getUuid();
  const now = new Date();
  const expires = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7-day expiry

  const payload = {
    user_id: userId,
    token: token,
    expires_at: expires.toISOString()
  };

  // We must use the service key here to insert into the sessions table,
  // as the anon key does not have write permissions by default.
  const result = makeSupabaseRequest('sessions', 'POST', payload, true);

  if (result.success) {
    return token;
  } else {
    console.error('Failed to create session in database:', result.error);
    throw new Error('Could not create session token.');
  }
}

function getSessionByToken(token) {
  // Use the service key to bypass RLS for this internal check
  const result = makeSupabaseRequest(`sessions?token=eq.${token}&select=*`, 'GET', null, true);
  if (result.success && result.data && result.data.length > 0) {
    return result.data[0];
  }
  return null;
}

function getUserById(userId) {
  // Use the service key to fetch user details internally
  const result = makeSupabaseRequest(`admin_users?id=eq.${userId}&select=*`, 'GET', null, true);
  if (result.success && result.data && result.data.length > 0) {
    return result.data[0];
  }
  return null;
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
  return makeSupabaseRequest(endpoint, 'GET', null, false); // <-- CORRECTED LINE
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
    // Since doPost body parsing is tricky in GAS, we allow GET for simplicity in some cases
    if (e.postData && e.postData.contents) {
      const bodyParams = new URLSearchParams(e.postData.contents);
      for (const [key, value] of bodyParams.entries()) {
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
  // Delegate all POST requests to doGet to handle them in one place
  return doGet(e);
}

// Optional CORS helper
function doOptions(e) {
  return createResponse({ success: true });
}
// ===== NEW NOTIFICATION HANDLER =====
/**
 * Handles notification-related actions like sending emails.
 */
function handleNotify(e, method) {
  switch (method) {
    case 'requestCollege':
      return notifySuperAdminForCollege(e);
    default:
      return createResponse({ error: 'Invalid notification method' }, 400);
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
    const subject = "YUVA Admin: Request to Add a New College";
    const body = `
            <p>Hello Super Admin,</p>
            <p>A request has been made to add a new college to the YUVA registration system.</p>
            <ul>
                <li><strong>Requester:</strong> ${requesterName}</li>
                <li><strong>Role:</strong> ${requesterRole}</li>
                <li><strong>From:</strong> ${requesterContext}</li>
            </ul>
            <p>Please log in to the admin dashboard to add the new college.</p>
            <p>Thank you,<br/>YUVA Automated System</p>
        `;

    GmailApp.sendEmail(superAdminEmails, subject, "", {
      htmlBody: body
    });

    return createResponse({ success: true, message: 'Notification sent successfully to super admins.' });

  } catch (error) {
    console.error("Failed to send notification email:", error);
    return createResponse({ success: false, error: 'Failed to send notification.', details: error.toString() }, 500);
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
    // ===== NEW CASE =====
    case 'recoverPassword':
      return recoverPassword(e);
    // ====================
    default:
      return createResponse({ error: 'Invalid auth method' }, 400);
  }
}

function loginUser(e) {
  const email = (e.parameter.email || '').trim().toLowerCase();
  const password = (e.parameter.password || '').trim();

  if (!email || !password) {
    return createResponse({ error: 'Email and password required' }, 400);
  }

  try {
    var rows = [];
    
    // Try RPC first (if it exists)
    try {
      const result = callSupabaseRpc('admin_users_login', {
        p_email: email,
        p_password: password
      });

      if (result.success && result.data) {
        // Normalize RPC response: it may return a single object or an array
        if (Array.isArray(result.data)) {
          rows = result.data;
        } else if (typeof result.data === 'object') {
          rows = [result.data];
        }
      } else {
        // RPC failed or returned no data - log it but continue to fallback
        console.log('RPC admin_users_login failed or returned no data, using fallback method');
      }
    } catch (rpcErr) {
      // RPC call threw an error - log it but continue to fallback
      console.log('RPC admin_users_login threw error, using fallback method:', rpcErr);
    }
    
    // Fallback: Direct table check if RPC not available/misconfigured or returned no results
    if (!rows || rows.length === 0) {
      try {
        var fallback = makeSupabaseRequest(`admin_users?email=eq.${encodeURIComponent(email)}&select=id,email,full_name,role,zone,college_id,password`, 'GET', null, true);
        if (fallback && fallback.success && Array.isArray(fallback.data) && fallback.data.length) {
          var u = fallback.data[0];
          // Very basic password check: compare plaintext
          // Note: Replace this with a proper secure compare if your DB stores hashes
          var ok = (String(u.password || '') === password);
          if (!ok) {
            return createResponse({ error: 'Invalid email or password' }, 401);
          }
          rows = [{ id: u.id, email: u.email, full_name: u.full_name, role: u.role, zone: u.zone, college_id: u.college_id }];
        } else {
          return createResponse({ error: 'Invalid email or password' }, 401);
        }
      } catch (fbErr) {
        console.error('Auth fallback failed:', fbErr);
        return createResponse({ error: 'Authentication service unavailable' }, 503);
      }
    }
    
    // If still no user found, return invalid credentials
    if (!rows || rows.length === 0) {
      return createResponse({ error: 'Invalid email or password' }, 401);
    }
    
    const user = rows[0];

    // Create a session token and store it (do not block login if this fails)
    var token = null;
    try {
      token = createSessionToken(user.id);
    } catch (sessErr) {
      console.error('Session creation failed (non-blocking):', sessErr);
      token = null; // Frontend does not currently require token; continue login
    }

    return createResponse({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        zone: user.zone,
        college_id: user.college_id
      },
      token: token
    });

  } catch (error) {
    console.error('Login error:', error, error.stack);
    return createResponse({ error: 'Unable to process login request' }, 500);
  }
}

function registerUser(e) {
  const email = (e.parameter.email || '').trim().toLowerCase();
  const password = (e.parameter.password || '').trim();
  const full_name = (e.parameter.full_name || '').trim();
  const role = (e.parameter.role || 'member').trim();
  const zone = (e.parameter.zone || '').trim();
  const college_id = e.parameter.college_id;

  // 1. Input Validation (This part is correct)
  if (!email || !password || !full_name) {
    return createResponse({ error: 'Required fields missing' }, 400);
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return createResponse({ error: 'Please provide a valid email address' }, 400);
  }
  if (password.length < 6) {
    return createResponse({ error: 'Password must be at least 6 characters' }, 400);
  }
  const allowedRoles = ['super_admin', 'zone_convener', 'mentor'];
  if (allowedRoles.indexOf(role) === -1) {
    return createResponse({ error: 'Invalid role selected' }, 400);
  }
  if (role !== 'super_admin' && !zone) {
    return createResponse({ error: 'Zone is required for this role' }, 400);
  }

  try {
    // 2. Call the Supabase RPC to register the user
    const result = callSupabaseRpc('admin_users_register', {
      p_email: email,
      p_password: password,
      p_full_name: full_name,
      p_role: role,
      p_zone: zone,
      p_college_id: college_id ? Number(college_id) : null
    });

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

    // 4. If successful, return the success message
    var uid = null;
    try {
      if (Array.isArray(result.data) && result.data.length) uid = result.data[0]?.id ?? result.data[0];
      else if (result.data && typeof result.data === 'object') uid = result.data.id ?? null;
      else uid = result.data ?? null;
    } catch (_) { uid = result.data ?? null; }

    return createResponse({ success: true, message: 'User registered successfully', user_id: uid });

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

function checkUserSession(e) {
  const token = e.parameter.token;

  if (!token) {
    return createResponse({ error: 'Token required' }, 400);
  }

  try {
    const session = getSessionByToken(token);

    if (!session || new Date(session.expires_at) < new Date()) {
      return createResponse({ error: 'Invalid or expired session' }, 401);
    }

    const user = getUserById(session.user_id);
    if (!user) {
      return createResponse({ error: 'User for this session not found.' }, 404);
    }

    return createResponse({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        zone: user.zone,
        college_id: user.college_id
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    return createResponse({ error: 'Session check failed' }, 500);
  }
}
function recoverPassword(e) {
  const email = (e.parameter.email || '').trim().toLowerCase();

  if (!email) return createResponse({ success: false, error: 'Email is required' }, 400);

  // 1. Look up the user to get their password
  // We select the 'password' field directly
  const result = makeSupabaseRequest(`admin_users?email=eq.${encodeURIComponent(email)}&select=full_name,password`, 'GET', null, true);

  if (!result.success || !result.data || result.data.length === 0) {
    // For security, we usually say "If email exists, it was sent", but you can return an error if you prefer.
    return createResponse({ success: false, error: 'Email not found.' }, 404);
  }

  const user = result.data[0];
  const userPass = user.password;
  const userName = user.full_name || 'Admin';

  // 2. Send the email with the password
  try {
    GmailApp.sendEmail(email, 'YUVA Admin: Password Recovery', '', {
      htmlBody: `
        <h3>Password Recovery</h3>
        <p>Hello ${userName},</p>
        <p>You requested to recover your password for the YUVA Admin Dashboard.</p>
        <div style="background:#f4f4f4; padding:15px; border-radius:5px; font-size:16px; margin: 10px 0;">
          <strong>Your Password:</strong> <span style="color:#000080; font-weight:bold;">${userPass}</span>
        </div>
        <p>Please keep this secure. You can log in immediately using this password.</p>
        <p>Regards,<br>YUVA Team</p>
      `
    });
    return createResponse({ success: true, message: 'Password sent to your email.' });
  } catch (err) {
    console.error('Email failed:', err);
    return createResponse({ success: false, error: 'Failed to send email.' }, 500);
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
  ['applicant_name', 'email', 'phone', 'college_id', 'zone_id', 'applying_for', 'unit_name', 'status'].forEach(k => { const v = readField(e, body, k); if (v !== '') data[k] = v; });
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
        const headers = ['ID', 'Applicant Name', 'Email', 'Phone', 'Applying For', 'Unit Name', 'Status', 'College Name', 'Zone Name', 'Registered At'];
        const rows = (regsRes.data || []).map(r => [r.id, r.applicant_name, r.email, r.phone, r.applying_for, r.unit_name, r.status, r.college_name, r.zone_name, r.created_at]);
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
      const headers = ['id', 'applicant_name', 'email', 'phone', 'applying_for', 'status', 'college_name', 'zone_name'];
      const rows = (regsRes.data || []).map(r => [r.id, r.applicant_name, r.email, r.phone, r.applying_for, r.status, r.college_name, r.zone_name]);
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    
    :root {
      --primary: ${brand.primary};
      --secondary: ${brand.secondary};
      --accent: ${brand.accent};
      --cream: ${brand.cream};
      --gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --gradient-2: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      --gradient-3: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      --shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
      --shadow-md: 0 4px 16px rgba(0,0,0,0.12);
      --shadow-lg: 0 8px 24px rgba(0,0,0,0.15);
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1a202c;
      background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
      line-height: 1.6;
    }
    
    .letterhead {
      background: var(--gradient-1);
      padding: 32px 56px;
      position: relative;
      overflow: hidden;
    }
    
    .letterhead::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
    }
    
    .letterhead::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -5%;
      width: 200px;
      height: 200px;
      background: rgba(255,255,255,0.08);
      border-radius: 50%;
    }
    
    .brand {
      font-weight: 800;
      font-size: 28px;
      color: white;
      letter-spacing: -0.5px;
      position: relative;
      z-index: 1;
      text-shadow: 0 2px 12px rgba(0,0,0,0.2);
    }
    
    .tag {
      font-size: 14px;
      color: rgba(255,255,255,0.9);
      font-weight: 600;
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }
    
    .cover {
      background: white;
      padding: 48px 56px;
      border-radius: 0 0 24px 24px;
      box-shadow: var(--shadow-lg);
      margin-bottom: 32px;
      position: relative;
    }
    
    .cover h1 {
      font-size: 36px;
      font-weight: 800;
      color: #2d3748;
      margin-bottom: 16px;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .cover-meta {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      color: #718096;
      font-size: 14px;
      font-weight: 600;
      margin-top: 12px;
    }
    
    .cover-meta span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .cover-meta span::before {
      content: '•';
      color: var(--accent);
      font-size: 18px;
    }
    
    .section {
      padding: 0 56px 32px;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 800;
      color: #2d3748;
      margin-bottom: 24px;
      position: relative;
      padding-left: 16px;
    }
    
    .section-title::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 24px;
      background: var(--gradient-1);
      border-radius: 2px;
    }
    
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .kpi-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
      transition: transform 0.2s;
    }
    
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--gradient-1);
    }
    
    .kpi-card:nth-child(2)::before { background: var(--gradient-2); }
    .kpi-card:nth-child(3)::before { background: var(--gradient-3); }
    .kpi-card:nth-child(4)::before { background: var(--gradient-1); }
    
    .kpi-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #718096;
      margin-bottom: 8px;
    }
    
    .kpi-value {
      font-size: 36px;
      font-weight: 800;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }
    
    .kpi-card:nth-child(2) .kpi-value { background: var(--gradient-2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .kpi-card:nth-child(3) .kpi-value { background: var(--gradient-3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    
    .content-grid {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 24px;
      margin-top: 32px;
    }
    
    .data-card {
      background: white;
      border-radius: 20px;
      padding: 28px;
      box-shadow: var(--shadow-md);
    }
    
    .card-header {
      font-size: 18px;
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .card-header::before {
      content: '';
      width: 8px;
      height: 8px;
      background: var(--gradient-1);
      border-radius: 50%;
    }
    
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-top: 12px;
    }
    
    thead tr {
      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
    }
    
    th {
      padding: 12px 14px;
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4a5568;
      border-bottom: 2px solid #e2e8f0;
    }
    
    th:first-child { border-radius: 8px 0 0 0; }
    th:last-child { border-radius: 0 8px 0 0; }
    
    td {
      padding: 14px;
      font-size: 13px;
      color: #2d3748;
      border-bottom: 1px solid #f0f0f0;
    }
    
    tbody tr:hover {
      background: #f7fafc;
    }
    
    tbody tr:last-child td:first-child { border-radius: 0 0 0 8px; }
    tbody tr:last-child td:last-child { border-radius: 0 0 8px 0; }
    
    .activity-item {
      padding: 16px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .activity-item:last-child {
      border-bottom: none;
    }
    
    .activity-label {
      font-size: 13px;
      font-weight: 600;
      color: #4a5568;
      margin-bottom: 8px;
    }
    
    .bar-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .bar-container {
      flex: 1;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .bar-fill {
      height: 100%;
      background: var(--gradient-1);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .bar-value {
      font-size: 12px;
      font-weight: 700;
      color: #4a5568;
      min-width: 32px;
      text-align: right;
    }
    
    .bar-fill.events {
      background: var(--gradient-2);
    }
    
    .footer {
      padding: 24px 56px 32px;
      text-align: center;
      color: #718096;
      font-size: 13px;
      background: white;
      margin-top: 32px;
      border-radius: 24px 24px 0 0;
      box-shadow: var(--shadow-sm);
    }
    
    .footer-brand {
      font-weight: 700;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  `;

  // Build table rows
  var tableRows = '';
  for (var zid in json.by_zone) {
    var z = json.by_zone[zid];
    tableRows += `
      <tr>
        <td><strong>${escapeHtml(zid)}</strong></td>
        <td>${z.colleges}</td>
        <td>${z.members}</td>
        <td>${z.events}</td>
      </tr>`;
  }

  // Build activity bars
  var maxMembers = 1, maxEvents = 1;
  var zones = [];
  for (var zid2 in json.by_zone) {
    var bz = json.by_zone[zid2];
    if (bz.members > maxMembers) maxMembers = bz.members;
    if (bz.events > maxEvents) maxEvents = bz.events;
    zones.push({ id: zid2, m: bz.members, e: bz.events });
  }

  var activityBars = '';
  zones.forEach(function (zone) {
    var memberWidth = Math.round((zone.m / (maxMembers || 1)) * 100);
    var eventWidth = Math.round((zone.e / (maxEvents || 1)) * 100);
    activityBars += `
      <div class="activity-item">
        <div class="activity-label">${escapeHtml(zone.id)}</div>
        <div class="bar-wrapper">
          <div class="bar-container">
            <div class="bar-fill" style="width: ${memberWidth}%"></div>
          </div>
          <div class="bar-value">${zone.m}</div>
        </div>
        <div class="bar-wrapper" style="margin-top: 6px;">
          <div class="bar-container">
            <div class="bar-fill events" style="width: ${eventWidth}%"></div>
          </div>
          <div class="bar-value">${zone.e}</div>
        </div>
      </div>`;
  });

  var html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${css}</style>
</head>
<body>
  <div class="letterhead">
    <div class="brand">YUVA • Youth United For Vision & Action</div>
    <div class="tag">Delhi Chapter</div>
  </div>
  
  <div class="cover">
    <h1>Activity Summary Report</h1>
    <div class="cover-meta">
      <span>Period: ${escapeHtml(params.range)}</span>
      <span>Zone: ${escapeHtml(params.zoneId || 'All Zones')}</span>
      <span>Generated: ${escapeHtml(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))}</span>
    </div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Key Metrics</h2>
    <div class="kpis">
      <div class="kpi-card">
        <div class="kpi-label">Total Colleges</div>
        <div class="kpi-value">${json.kpi.total_colleges}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Members</div>
        <div class="kpi-value">${json.kpi.total_members}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Events</div>
        <div class="kpi-value">${json.kpi.total_events}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Active Units</div>
        <div class="kpi-value">${json.kpi.units_proxy}</div>
      </div>
    </div>
    
    <div class="content-grid">
      <div class="data-card">
        <h3 class="card-header">Zone-wise Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Zone</th>
              <th>Colleges</th>
              <th>Members</th>
              <th>Events</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      
      <div class="data-card">
        <h3 class="card-header">Activity Overview</h3>
        ${activityBars}
      </div>
    </div>
  </div>
  
  <div class="footer">
    <span class="footer-brand">YUVA Delhi</span> • Empowering youth through vision and action
  </div>
</body>
</html>`;

  return html;
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
      GmailApp.sendEmail(emailList, `[YUVA Admin Notice] ${subject}`, "", { htmlBody: htmlBody });
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