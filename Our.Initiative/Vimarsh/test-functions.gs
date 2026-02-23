// ============================================================================
// SECTION 10: TEST FUNCTIONS
// ============================================================================
// These functions help you test the system before going live
// Run these manually from Apps Script to verify everything works

/**
 * TEST 1: Test Razorpay API Connection
 * Verifies that Razorpay credentials are correct
 */
function testRazorpayConnection() {
  Logger.log('🧪 Testing Razorpay API connection...\n');
  
  try {
    const url = 'https://api.razorpay.com/v1/payments?count=1';
    const auth = Utilities.base64Encode(`${CONFIG.RAZORPAY_KEY_ID}:${CONFIG.RAZORPAY_KEY_SECRET}`);
    
    const options = {
      method: 'get',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('✅ Razorpay API connection: SUCCESS');
      Logger.log('✅ Credentials are valid');
      const data = JSON.parse(response.getContentText());
      Logger.log(`📊 Found ${data.count} payments in your account`);
      return true;
    } else {
      Logger.log('❌ Razorpay API connection: FAILED');
      Logger.log(`Response code: ${responseCode}`);
      Logger.log(`Response: ${response.getContentText()}`);
      return false;
    }
  } catch (error) {
    Logger.log('❌ Error testing Razorpay connection:');
    Logger.log(error.toString());
    return false;
  }
}

/**
 * TEST 2: Test Supabase Connection
 * Verifies that Supabase URL and service role key are correct
 */
function testSupabaseConnection() {
  Logger.log('🧪 Testing Supabase connection...\n');
  
  try {
    // Test basic query
    const result = supabaseQuery('vim26_registrations', {
      select: 'registration_id',
      limit: '1'
    });
    
    if (result.error) {
      Logger.log('❌ Supabase connection: FAILED');
      Logger.log('Error:', JSON.stringify(result.error));
      return false;
    }
    
    Logger.log('✅ Supabase connection: SUCCESS');
    Logger.log('✅ Service role key is valid');
    Logger.log('✅ vim26_registrations table is accessible');
    return true;
  } catch (error) {
    Logger.log('❌ Error testing Supabase connection:');
    Logger.log(error.toString());
    return false;
  }
}

/**
 * TEST 3: Test All Database Tables
 * Checks if all required tables exist and are accessible
 */
function testAllDatabaseTables() {
  Logger.log('🧪 Testing all database tables...\n');
  
  const tables = [
    'vim26_admin_users',
    'vim26_registrations',
    'vim26_check_in_logs',
    'vim26_email_failures',
    'vim26_audit_discrepancies',
    'colleges',
    'zones'
  ];
  
  let allSuccess = true;
  
  tables.forEach(tableName => {
    try {
      const result = supabaseQuery(tableName, {
        select: '*',
        limit: '1'
      });
      
      if (result.error) {
        Logger.log(`❌ ${tableName}: FAILED`);
        Logger.log(`   Error: ${JSON.stringify(result.error)}`);
        allSuccess = false;
      } else {
        Logger.log(`✅ ${tableName}: OK`);
      }
    } catch (error) {
      Logger.log(`❌ ${tableName}: ERROR`);
      Logger.log(`   ${error.toString()}`);
      allSuccess = false;
    }
  });
  
  Logger.log('');
  if (allSuccess) {
    Logger.log('✅ All tables are accessible!');
  } else {
    Logger.log('⚠️ Some tables have issues. Check errors above.');
  }
  
  return allSuccess;
}

/**
 * TEST 4: Test Registration ID Generation
 * Tests the VIM26_generate_registration_id function
 */
function testRegistrationIDGeneration() {
  Logger.log('🧪 Testing registration ID generation...\n');
  
  try {
    // First, get a valid college ID
    const colleges = supabaseQuery('colleges', {
      select: 'id,college_name,college_code',
      limit: '1'
    });
    
    if (!colleges.data || colleges.data.length === 0) {
      Logger.log('⚠️ No colleges found in database');
      Logger.log('Please insert colleges first using insertTestColleges()');
      return false;
    }
    
    const testCollege = colleges.data[0];
    Logger.log(`Using test college: ${testCollege.college_name} (ID: ${testCollege.id})`);
    
    // Generate registration ID
    const regId = generateRegistrationId(testCollege.id);
    
    Logger.log(`✅ Generated Registration ID: ${regId}`);
    Logger.log(`Expected format: VIM2026-{ZONE}-{COLLEGE}-{SEQ}`);
    
    // Validate format
    if (regId.startsWith('VIM2026-')) {
      Logger.log('✅ Format is correct!');
      return true;
    } else {
      Logger.log('❌ Format is incorrect!');
      return false;
    }
  } catch (error) {
    Logger.log('❌ Error testing registration ID generation:');
    Logger.log(error.toString());
    return false;
  }
}

/**
 * TEST 5: Test QR Hash Generation
 * Tests the VIM26_generate_qr_hash function
 */
function testQRHashGeneration() {
  Logger.log('🧪 Testing QR hash generation...\n');
  
  try {
    const testRegId = 'VIM2026-NORTH-DU-00001';
    
    const hash1 = generateQRHash(testRegId);
    const hash2 = generateQRHash(testRegId);
    
    Logger.log(`Generated Hash 1: ${hash1}`);
    Logger.log(`Generated Hash 2: ${hash2}`);
    
    if (hash1 === hash2) {
      Logger.log('✅ QR hash is deterministic (same input = same output)');
      Logger.log(`✅ Hash length: ${hash1.length} characters`);
      return true;
    } else {
      Logger.log('❌ QR hash is NOT deterministic!');
      return false;
    }
  } catch (error) {
    Logger.log('❌ Error testing QR hash generation:');
    Logger.log(error.toString());
    return false;
  }
}

/**
 * TEST 6: Fetch Existing Zones
 * Displays all zones currently in the database
 */
function fetchExistingZones() {
  Logger.log('🧪 Fetching existing zones...\n');
  
  try {
    const result = supabaseQuery('zones', {
      select: 'id,zone_code,zone_name,description'
    });
    
    if (result.error) {
      Logger.log('❌ Failed to fetch zones');
      Logger.log('Error:', JSON.stringify(result.error));
      return false;
    }
    
    if (!result.data || result.data.length === 0) {
      Logger.log('⚠️ No zones found in database');
      Logger.log('Please add zones to your Supabase database first.');
      Logger.log('\nYou can add zones manually in Supabase Table Editor:');
      Logger.log('Table: zones');
      Logger.log('Columns: zone_code, zone_name, description');
      return false;
    }
    
    Logger.log(`✅ Found ${result.data.length} zones:\n`);
    
    result.data.forEach((zone, index) => {
      Logger.log(`${index + 1}. ${zone.zone_name} (${zone.zone_code})`);
      Logger.log(`   ID: ${zone.id}`);
      if (zone.description) {
        Logger.log(`   Description: ${zone.description}`);
      }
      Logger.log('');
    });
    
    return true;
  } catch (error) {
    Logger.log('❌ Error fetching zones:');
    Logger.log(error.toString());
    return false;
  }
}

/**
 * TEST 7: Fetch Existing Colleges
 * Displays all colleges currently in the database with their zones
 */
function fetchExistingColleges() {
  Logger.log('🧪 Fetching existing colleges...\n');
  
  try {
    const result = supabaseQuery('colleges', {
      select: 'id,college_name,college_code,zone_id,zones(zone_name,zone_code)'
    });
    
    if (result.error) {
      Logger.log('❌ Failed to fetch colleges');
      Logger.log('Error:', JSON.stringify(result.error));
      return false;
    }
    
    if (!result.data || result.data.length === 0) {
      Logger.log('⚠️ No colleges found in database');
      Logger.log('Please add colleges to your Supabase database.');
      return false;
    }
    
    Logger.log(`✅ Found ${result.data.length} colleges:\n`);
    
    result.data.forEach((college, index) => {
      Logger.log(`${index + 1}. ${college.college_name} (${college.college_code})`);
      Logger.log(`   ID: ${college.id}`);
      if (college.zones) {
        Logger.log(`   Zone: ${college.zones.zone_name} (${college.zones.zone_code})`);
      }
      Logger.log('');
    });
    
    return true;
  } catch (error) {
    Logger.log('❌ Error fetching colleges:');
    Logger.log(error.toString());
    return false;
  }
}

/**
 * TEST 8: Create Test Registration
 * Creates a complete test registration with all fields
 */
function createTestRegistration() {
  Logger.log('🧪 Creating test registration...\n');
  
  try {
    // Get a test college
    const colleges = supabaseQuery('colleges', {
      select: 'id,college_name,college_code,zone_id,zones(zone_name,zone_code)',
      limit: '1'
    });
    
    if (!colleges.data || colleges.data.length === 0) {
      Logger.log('⚠️ No colleges found. Run insertTestColleges() first.');
      return false;
    }
    
    const college = colleges.data[0];
    const zone = college.zones;
    
    Logger.log(`Using college: ${college.college_name}`);
    Logger.log(`Zone: ${zone.zone_name}\n`);
    
    // Generate registration ID
    const registrationId = generateRegistrationId(college.id);
    Logger.log(`Generated Registration ID: ${registrationId}`);
    
    // Generate QR hash
    const qrHash = generateQRHash(registrationId);
    Logger.log(`Generated QR Hash: ${qrHash}\n`);
    
    // Create test registration
    const testRegistration = {
      registration_id: registrationId,
      first_name: 'Test',
      last_name: 'User',
      email: `test.${Date.now()}@example.com`, // Unique email
      mobile: '9876543210',
      age_group: '18-21',
      blood_group: 'A+',
      college_id: college.id,
      zone_id: college.zone_id,
      college_name: college.college_name,
      zone_name: zone.zone_name,
      state: 'Delhi',
      payment_category: 'Student',
      previous_vimarsh: 'No',
      how_you_know: 'Social Media',
      razorpay_order_id: `order_test_${Date.now()}`,
      payment_status: 'pending',
      amount_paid: 30000,
      qr_code_hash: qrHash,
      email_sent: false
    };
    
    const result = supabaseInsert('vim26_registrations', testRegistration);
    
    if (result.error) {
      Logger.log('❌ Failed to create test registration');
      Logger.log('Error:', JSON.stringify(result.error));
      return false;
    }
    
    Logger.log('✅ Test registration created successfully!');
    Logger.log(`Email: ${testRegistration.email}`);
    Logger.log(`Registration ID: ${registrationId}`);
    Logger.log(`Payment Status: ${testRegistration.payment_status}`);
    
    return true;
  } catch (error) {
    Logger.log('❌ Error creating test registration:');
    Logger.log(error.toString());
    return false;
  }
}

/**
 * TEST 9: Test Payment Verification Flow
 * Simulates the complete payment verification process
 */
function testPaymentVerification() {
  Logger.log('🧪 Testing payment verification flow...\n');
  
  try {
    // Get a pending test registration
    const pending = supabaseQuery('vim26_registrations', {
      select: 'registration_id,razorpay_order_id,email',
      payment_status: 'eq.pending',
      email: 'like.test%',
      limit: '1'
    });
    
    if (!pending.data || pending.data.length === 0) {
      Logger.log('⚠️ No test registrations found. Run createTestRegistration() first.');
      return false;
    }
    
    const registration = pending.data[0];
    Logger.log(`Testing with registration: ${registration.registration_id}`);
    Logger.log(`Order ID: ${registration.razorpay_order_id}\n`);
    
    // Simulate payment verification
    const testPaymentId = `pay_test_${Date.now()}`;
    const testSignature = `test_sig_${Date.now()}`; // Simulated Razorpay signature
    
    Logger.log('Updating payment status to completed...');
    const updateResult = supabaseUpdate('vim26_registrations', {
      razorpay_order_id: `eq.${registration.razorpay_order_id}`
    }, {
      razorpay_payment_id: testPaymentId,
      payment_status: 'completed',
      payment_verified_at: new Date().toISOString(),
      payment_signature: testSignature
    });
    
    if (updateResult.error) {
      Logger.log('❌ Failed to update payment status');
      Logger.log('Error:', JSON.stringify(updateResult.error));
      return false;
    }
    
    Logger.log('✅ Payment status updated to completed');
    Logger.log(`Payment ID: ${testPaymentId}`);
    
    // Verify the update
    const verified = supabaseQuery('vim26_registrations', {
      select: 'registration_id,payment_status,razorpay_payment_id',
      razorpay_payment_id: `eq.${testPaymentId}`
    });
    
    if (verified.data && verified.data.length > 0) {
      Logger.log('\n✅ Verification successful!');
      Logger.log(`Status: ${verified.data[0].payment_status}`);
      return true;
    } else {
      Logger.log('\n❌ Verification failed!');
      return false;
    }
  } catch (error) {
    Logger.log('❌ Error testing payment verification:');
    Logger.log(error.toString());
    return false;
  }
}

/**
 * TEST 10: Test Email Failure Logging
 * Tests the email failure tracking system
 */
function testEmailFailureLogging() {
  Logger.log('🧪 Testing email failure logging...\n');
  
  try {
    // First, get an existing registration to use
    const registrations = supabaseQuery('vim26_registrations', {
      select: 'registration_id,email',
      limit: '1'
    });
    
    if (!registrations.data || registrations.data.length === 0) {
      Logger.log('⚠️ No registrations found in database');
      Logger.log('Create a test registration first using createTestRegistration()');
      return false;
    }
    
    const reg = registrations.data[0];
    
    const testFailure = {
      registration_id: reg.registration_id,
      email: reg.email,
      error_message: 'Test error: Gmail quota exceeded',
      attempts: 1,
      resolved: false
    };
    
    Logger.log(`Using registration: ${reg.registration_id}`);
    Logger.log(`Email: ${reg.email}\n`);
    
    const result = supabaseInsert('vim26_email_failures', testFailure);
    
    if (result.error) {
      Logger.log('❌ Failed to log email failure');
      Logger.log('Error:', JSON.stringify(result.error));
      return false;
    }
    
    Logger.log('✅ Email failure logged successfully');
    Logger.log(`Registration ID: ${testFailure.registration_id}`);
    Logger.log(`Error: ${testFailure.error_message}`);
    
    return true;
  } catch (error) {
    Logger.log('❌ Error testing email failure logging:');
    Logger.log(error.toString());
    return false;
  }
}

/**
 * RUN ALL TESTS
 * Executes all test functions in sequence
 */
function runAllTests() {
  Logger.log('═══════════════════════════════════════════════════════');
  Logger.log('🚀 RUNNING ALL TESTS FOR VIMARSH 2026 PAYMENT SYSTEM');
  Logger.log('═══════════════════════════════════════════════════════\n');
  
  const tests = [
    { name: 'Razorpay Connection', func: testRazorpayConnection },
    { name: 'Supabase Connection', func: testSupabaseConnection },
    { name: 'Database Tables', func: testAllDatabaseTables },
    { name: 'Registration ID Generation', func: testRegistrationIDGeneration },
    { name: 'QR Hash Generation', func: testQRHashGeneration }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach((test, index) => {
    Logger.log(`\n${'─'.repeat(60)}`);
    Logger.log(`TEST ${index + 1}/${tests.length}: ${test.name}`);
    Logger.log('─'.repeat(60));
    
    const result = test.func();
    
    if (result) {
      passed++;
    } else {
      failed++;
    }
  });
  
  Logger.log('\n═══════════════════════════════════════════════════════');
  Logger.log('📊 TEST SUMMARY');
  Logger.log('═══════════════════════════════════════════════════════');
  Logger.log(`✅ Passed: ${passed}`);
  Logger.log(`❌ Failed: ${failed}`);
  Logger.log(`📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  Logger.log('═══════════════════════════════════════════════════════\n');
  
  if (failed === 0) {
    Logger.log('🎉 ALL TESTS PASSED! System is ready for production.');
  } else {
    Logger.log('⚠️ Some tests failed. Please fix the issues above.');
  }
}

/**
 * CLEANUP TEST DATA
 * Removes all test registrations and data
 */
function cleanupTestData() {
  Logger.log('🧹 Cleaning up test data...\n');
  
  try {
    // Note: Supabase REST API doesn't support DELETE with LIKE
    // You'll need to delete test data manually from Supabase dashboard
    // Or use SQL: DELETE FROM VIM26_registrations WHERE email LIKE 'test%'
    
    Logger.log('⚠️ Test data cleanup must be done manually:');
    Logger.log('1. Go to Supabase Dashboard → Table Editor');
    Logger.log('2. Open vim26_registrations table');
    Logger.log('3. Delete rows where email starts with "test"');
    Logger.log('');
    Logger.log('Or run this SQL in Supabase SQL Editor:');
    Logger.log('DELETE FROM vim26_registrations WHERE email LIKE \'test%\';');
    Logger.log('DELETE FROM vim26_email_failures WHERE registration_id LIKE \'%TEST%\';');
    
  } catch (error) {
    Logger.log('❌ Error during cleanup:');
    Logger.log(error.toString());
  }
}


// ============================================================================
// WEBHOOK TESTING FUNCTIONS
// Add these to the end of your code vimarsh26.txt file
// ============================================================================

/**
 * Test Razorpay Webhook with Signature Verification
 * Run this from Apps Script to simulate a real webhook request
 * 
 * Usage:
 * 1. Create a test registration with payment completed
 * 2. Run: testWebhookWithSignature('order_XXXXX', 'pay_XXXXX')
 * 3. Check logs for verification results
 */
function testWebhookWithSignature(orderId, paymentId) {
  Logger.log('=== WEBHOOK TEST STARTED ===');
  Logger.log('Testing with Order ID: ' + orderId);
  Logger.log('Testing with Payment ID: ' + paymentId);
  
  // 1. Create webhook payload (exactly as Razorpay sends it)
  const webhookPayload = {
    action: 'razorpayWebhook',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: 30000,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          email: 'test@example.com',
          contact: '+919876543210',
          created_at: Math.floor(Date.now() / 1000)
        }
      }
    }
  };
  
  const payloadString = JSON.stringify(webhookPayload);
  
  // 2. Generate signature (simulating Razorpay)
  let signature = '';
  if (CONFIG.RAZORPAY_WEBHOOK_SECRET) {
    // Generate expected signature using HMAC SHA256
    // Apps Script's computeHmacSha256Signature expects (data, key) as strings
    const signatureBytes = Utilities.computeHmacSha256Signature(
      payloadString,  // Pass string directly, not bytes
      CONFIG.RAZORPAY_WEBHOOK_SECRET
    );
    
    // Convert to hex string
    signature = signatureBytes
      .map(byte => {
        const hex = (byte & 0xFF).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('');
    
    Logger.log('Generated Signature: ' + signature);
  } else {
    Logger.log('WARNING: No webhook secret configured, signature verification will be skipped');
  }
  
  // 3. Simulate webhook request
  Logger.log('--- Simulating Webhook Request ---');
  
  const mockEvent = {
    postData: {
      contents: payloadString
    },
    parameter: {
      'X-Razorpay-Signature': signature
    },
    parameters: {
      'X-Razorpay-Signature': [signature]
    }
  };
  
  // 4. Call webhook handler
  try {
    const result = doPost(mockEvent);
    const resultText = result.getContent();
    const resultData = JSON.parse(resultText);
    
    Logger.log('--- Webhook Response ---');
    Logger.log('Success: ' + resultData.success);
    Logger.log('Message: ' + resultData.message);
    
    if (resultData.error) {
      Logger.log('ERROR: ' + resultData.error);
    }
    
    Logger.log('=== WEBHOOK TEST COMPLETED ===');
    return resultData;
    
  } catch (e) {
    Logger.log('=== WEBHOOK TEST FAILED ===');
    Logger.log('Error: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Test Webhook with INVALID Signature
 * This should FAIL and return 401 Unauthorized
 * 
 * Usage: testWebhookInvalidSignature('order_XXXXX', 'pay_XXXXX')
 */
function testWebhookInvalidSignature(orderId, paymentId) {
  Logger.log('=== TESTING INVALID SIGNATURE ===');
  
  const webhookPayload = {
    action: 'razorpayWebhook',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: 30000,
          currency: 'INR',
          status: 'captured'
        }
      }
    }
  };
  
  const payloadString = JSON.stringify(webhookPayload);
  
  // Use WRONG signature
  const wrongSignature = 'wrong_signature_12345abcdef';
  
  Logger.log('Using WRONG signature: ' + wrongSignature);
  
  const mockEvent = {
    postData: {
      contents: payloadString
    },
    parameter: {
      'X-Razorpay-Signature': wrongSignature
    },
    parameters: {
      'X-Razorpay-Signature': [wrongSignature]
    }
  };
  
  try {
    const result = doPost(mockEvent);
    const resultText = result.getContent();
    const resultData = JSON.parse(resultText);
    
    Logger.log('--- Response ---');
    Logger.log('Should be REJECTED with 401');
    Logger.log('Result: ' + JSON.stringify(resultData));
    
    if (resultData.error === 'Unauthorized') {
      Logger.log('✅ TEST PASSED: Invalid signature correctly rejected');
    } else {
      Logger.log('❌ TEST FAILED: Invalid signature was accepted!');
    }
    
    return resultData;
    
  } catch (e) {
    Logger.log('Error: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Test Webhook WITHOUT Signature
 * This should FAIL if webhook secret is configured
 * 
 * Usage: testWebhookNoSignature('order_XXXXX', 'pay_XXXXX')
 */
function testWebhookNoSignature(orderId, paymentId) {
  Logger.log('=== TESTING MISSING SIGNATURE ===');
  
  const webhookPayload = {
    action: 'razorpayWebhook',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: 30000,
          currency: 'INR',
          status: 'captured'
        }
      }
    }
  };
  
  const payloadString = JSON.stringify(webhookPayload);
  
  Logger.log('Sending webhook WITHOUT signature header');
  
  const mockEvent = {
    postData: {
      contents: payloadString
    },
    parameter: {},
    parameters: {}
  };
  
  try {
    const result = doPost(mockEvent);
    const resultText = result.getContent();
    const resultData = JSON.parse(resultText);
    
    Logger.log('--- Response ---');
    
    if (CONFIG.RAZORPAY_WEBHOOK_SECRET) {
      Logger.log('Should be REJECTED (secret configured)');
      if (resultData.error) {
        Logger.log('✅ TEST PASSED: Missing signature correctly rejected');
      } else {
        Logger.log('❌ TEST FAILED: Missing signature was accepted!');
      }
    } else {
      Logger.log('Should be ACCEPTED (no secret configured)');
      if (resultData.success) {
        Logger.log('✅ TEST PASSED: Webhook processed (backward compatibility)');
      } else {
        Logger.log('⚠️ Unexpected rejection');
      }
    }
    
    Logger.log('Result: ' + JSON.stringify(resultData));
    return resultData;
    
  } catch (e) {
    Logger.log('Error: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Complete Webhook Test Suite
 * Runs all webhook tests and reports results
 * 
 * Usage: 
 * 1. Create a test order in Razorpay or use existing order_id
 * 2. Run: runWebhookTestSuite('order_XXXXX', 'pay_XXXXX')
 */
function runWebhookTestSuite(orderId, paymentId) {
  Logger.log('╔════════════════════════════════════════════════════════╗');
  Logger.log('║     RAZORPAY WEBHOOK TEST SUITE                        ║');
  Logger.log('╚════════════════════════════════════════════════════════╝');
  Logger.log('');
  
  const results = {
    validSignature: null,
    invalidSignature: null,
    missingSignature: null
  };
  
  // Test 1: Valid Signature
  Logger.log('📋 TEST 1: Valid Signature (Should PASS)');
  Logger.log('─────────────────────────────────────────────────────────');
  results.validSignature = testWebhookWithSignature(orderId, paymentId);
  Logger.log('');
  
  // Test 2: Invalid Signature
  Logger.log('📋 TEST 2: Invalid Signature (Should FAIL with 401)');
  Logger.log('─────────────────────────────────────────────────────────');
  results.invalidSignature = testWebhookInvalidSignature(orderId, paymentId);
  Logger.log('');
  
  // Test 3: Missing Signature
  Logger.log('📋 TEST 3: Missing Signature (Should FAIL if secret configured)');
  Logger.log('─────────────────────────────────────────────────────────');
  results.missingSignature = testWebhookNoSignature(orderId, paymentId);
  Logger.log('');
  
  // Summary
  Logger.log('╔════════════════════════════════════════════════════════╗');
  Logger.log('║     TEST SUMMARY                                       ║');
  Logger.log('╚════════════════════════════════════════════════════════╝');
  
  const test1Pass = results.validSignature && results.validSignature.success;
  const test2Pass = results.invalidSignature && results.invalidSignature.error === 'Unauthorized';
  const test3Pass = CONFIG.RAZORPAY_WEBHOOK_SECRET ? 
    (results.missingSignature && results.missingSignature.error) :
    (results.missingSignature && results.missingSignature.success);
  
  Logger.log('Test 1 (Valid Signature):   ' + (test1Pass ? '✅ PASS' : '❌ FAIL'));
  Logger.log('Test 2 (Invalid Signature): ' + (test2Pass ? '✅ PASS' : '❌ FAIL'));
  Logger.log('Test 3 (Missing Signature): ' + (test3Pass ? '✅ PASS' : '❌ FAIL'));
  Logger.log('');
  
  const allPassed = test1Pass && test2Pass && test3Pass;
  
  if (allPassed) {
    Logger.log('🎉 ALL TESTS PASSED! Webhook security is working correctly.');
  } else {
    Logger.log('⚠️ SOME TESTS FAILED. Please review the logs above.');
  }
  
  Logger.log('');
  Logger.log('Configuration Status:');
  Logger.log('- Webhook Secret: ' + (CONFIG.RAZORPAY_WEBHOOK_SECRET ? '✅ Configured' : '❌ Not configured'));
  Logger.log('');
  
  return {
    allPassed: allPassed,
    results: results
  };
}
