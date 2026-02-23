/**
 * YUVA Donation System - Google Apps Script Backend with Supabase
 * Enhanced with professional email templates and PDF receipt generation
 */

// ===== CONFIGURATION =====
const CONFIG = {
  // Razorpay Credentials
  RAZORPAY_KEY_ID: 'rzp_test_RCnv6goa4rkg0Q',
  RAZORPAY_KEY_SECRET: 'qRw549IUqi47RQjbTf1d0clN',
  
  // Supabase Configuration
  SUPABASE_URL: 'https://jgsrsjwmywiirtibofth.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnc3JzandteXdpaXJ0aWJvZnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA3NjY0OCwiZXhwIjoyMDc0NjUyNjQ4fQ.tQ9aD4OP1okfdgNr8O4LqIkYAF4rUvbRBN4XBW-KrZo',
  
  // Email Configuration
  ADMIN_EMAIL: 'yuva.vision.action@gmail.com',
  ORGANIZATION_NAME: 'YUVA - Youth United For Vision & Action',
  WEBSITE_URL: 'https://yuva.ind.in'
};

/**
 * Create CORS response
 */
function createCorsResponse(data) {
  const response = ContentService.createTextOutput(JSON.stringify(data));
  response.setMimeType(ContentService.MimeType.JSON);
  return response;
}

/**
 * Handle GET requests
 */
function doGet(request) {
  try {
    const path = (request && request.parameter && request.parameter.path) || '';
    
    let result;
    switch (path) {
      case 'test':
        result = testSetup();
        break;
      case 'stats':
        result = getDonationStats();
        break;
      default:
        result = {
          success: true,
          message: 'YUVA Donation System API',
          timestamp: new Date().toISOString(),
          availableEndpoints: {
            GET: ['test', 'stats'],
            POST: ['create-order', 'verify-payment', 'save-donation']
          }
        };
    }
    
    return createCorsResponse(result);
  } catch (error) {
    console.error('doGet error:', error);
    return createCorsResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Handle POST requests
 */
function doPost(request) {
  try {
    let data = {};
    
    // Parse POST data
    if (request.postData && request.postData.contents) {
      try {
        const postData = JSON.parse(request.postData.contents);
        data = { ...data, ...postData };
      } catch (e) {
        console.error('Error parsing POST data:', e);
      }
    }
    
    // Parse URL parameters
    if (request.parameter) {
      data = { ...data, ...request.parameter };
    }
    
    const path = data.path || '';
    console.log('Processing request for path:', path);
    
    let result;
    switch (path) {
      case 'create-order':
        result = createRazorpayOrder(data);
        break;
      case 'verify-payment':
        result = verifyPayment(data);
        break;
      case 'save-donation':
        result = saveDonation(data);
        break;
      case 'test':
        result = testSetup();
        break;
      default:
        result = {
          success: false,
          error: 'Invalid endpoint: ' + path
        };
    }
    
    return createCorsResponse(result);
  } catch (error) {
    console.error('doPost error:', error);
    return createCorsResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Create Razorpay Order
 */
function createRazorpayOrder(data) {
  try {
    const { amount, currency = 'INR', receipt } = data;
    
    if (!amount || amount < 1) {
      return {
        success: false,
        error: 'Invalid amount'
      };
    }
    
    const orderData = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        source: 'YUVA Website',
        timestamp: new Date().toISOString()
      }
    };
    
    const url = 'https://api.razorpay.com/v1/orders';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(CONFIG.RAZORPAY_KEY_ID + ':' + CONFIG.RAZORPAY_KEY_SECRET),
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(orderData),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseData = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200) {
      throw new Error(responseData.error?.description || 'Failed to create order');
    }
    
    return {
      success: true,
      order: {
        id: responseData.id,
        amount: responseData.amount,
        currency: responseData.currency,
        receipt: responseData.receipt
      }
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Verify Razorpay Payment Signature
 */
function verifyPayment(data) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        success: false,
        error: 'Missing payment verification data'
      };
    }
    
    // Generate expected signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const signatureBytes = Utilities.computeHmacSha256Signature(body, CONFIG.RAZORPAY_KEY_SECRET);
    
    // Convert to hex string
    let signatureHex = '';
    for (let i = 0; i < signatureBytes.length; i++) {
      let byte = signatureBytes[i];
      if (byte < 0) {
        byte += 256;
      }
      const byteHex = byte.toString(16);
      signatureHex += (byteHex.length === 1 ? '0' : '') + byteHex;
    }
    
    // Compare signatures
    const isValid = signatureHex === razorpay_signature;
    
    if (!isValid) {
      return {
        success: false,
        error: 'Invalid payment signature'
      };
    }
    
    return {
      success: true,
      message: 'Payment verified successfully'
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Save Donation to Supabase
 */
function saveDonation(data) {
  try {
    const {
      firstName,
      surname,
      email,
      phone,
      address,
      amount,
      donationType,
      paymentId,
      orderId,
      signature,
      subscriptionId,
      wants80G,
      aadhaar,
      pan
    } = data;
    
    // Validate required fields
    if (!firstName || !surname || !email || !phone || !address || !amount || !paymentId) {
      return {
        success: false,
        error: 'Missing required fields'
      };
    }
    
    // Prepare donation data for Supabase
    const donationData = {
      first_name: firstName,
      surname: surname,
      email: email.toLowerCase().trim(),
      phone: phone,
      address: address,
      amount: parseFloat(amount),
      donation_type: donationType === 'recurring' ? 'recurring' : 'one-time',
      payment_id: paymentId,
      order_id: orderId || null,
      signature: signature || null,
      subscription_id: subscriptionId || null,
      payment_status: 'completed',
      wants_80g: wants80G || false,
      aadhaar_number: aadhaar || null,
      pan_number: pan || null,
      notes: `Donation received on ${new Date().toLocaleString('en-IN')}`,
      user_agent: data.userAgent || null
    };
    
    // Save to Supabase
    const supabaseResult = saveToSupabase(donationData);
    
    if (!supabaseResult.success) {
      throw new Error(supabaseResult.error || 'Failed to save to Supabase');
    }
    
    // Generate and send receipt with PDF
    try {
      sendDonationReceipt(donationData, supabaseResult.donationId);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the whole process if email fails
    }
    
    return {
      success: true,
      message: 'Donation saved successfully',
      donationId: supabaseResult.donationId
    };
  } catch (error) {
    console.error('Error saving donation:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Save data to Supabase using REST API
 */
function saveToSupabase(donationData) {
  try {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/donations`;
    
    const options = {
      method: 'POST',
      headers: {
        'apikey': CONFIG.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      payload: JSON.stringify(donationData),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());
    
    if (responseCode !== 201 && responseCode !== 200) {
      console.error('Supabase error:', responseData);
      throw new Error(responseData.message || 'Failed to save to Supabase');
    }
    
    return {
      success: true,
      donationId: responseData[0]?.id || null
    };
  } catch (error) {
    console.error('Error saving to Supabase:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get donation statistics from Supabase
 */
function getDonationStats() {
  try {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/rpc/get_donation_stats`;
    
    const options = {
      method: 'POST',
      headers: {
        'apikey': CONFIG.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const stats = JSON.parse(response.getContentText());
    
    return {
      success: true,
      stats: stats[0] || {}
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Generate PDF Receipt
 */
function generatePDFReceipt(donationData, receiptNumber) {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 20mm; }
          body { 
            font-family: 'Arial', sans-serif; 
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #555879;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo { font-size: 28px; font-weight: bold; color: #555879; }
          .org-name { font-size: 18px; color: #666; margin-top: 5px; }
          .receipt-title {
            background: #555879;
            color: white;
            padding: 15px;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
          }
          .receipt-number {
            text-align: right;
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
          }
          .section {
            margin: 25px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #555879;
            margin-bottom: 15px;
            border-bottom: 2px solid #555879;
            padding-bottom: 5px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dotted #ddd;
          }
          .detail-label { font-weight: bold; color: #555; }
          .detail-value { color: #333; }
          .amount-box {
            background: #f0f9ff;
            border: 2px solid #059669;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .amount-label { font-size: 14px; color: #666; }
          .amount-value { 
            font-size: 36px; 
            font-weight: bold; 
            color: #059669;
            margin: 10px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #555879;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .signature-section {
            margin-top: 50px;
            text-align: right;
          }
          .signature-line {
            border-top: 1px solid #333;
            width: 200px;
            margin: 50px 0 10px auto;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">YUVA</div>
          <div class="org-name">Youth United For Vision & Action</div>
          <div style="font-size: 12px; color: #888; margin-top: 10px;">
            Website: ${CONFIG.WEBSITE_URL} | Email: ${CONFIG.ADMIN_EMAIL}
          </div>
        </div>

        <div class="receipt-title">DONATION RECEIPT</div>
        
        <div class="receipt-number">
          Receipt No: <strong>${receiptNumber}</strong><br>
          Date: <strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
        </div>

        <div class="section">
          <div class="section-title">Donor Information</div>
          <div class="detail-row">
            <span class="detail-label">Name:</span>
            <span class="detail-value">${donationData.first_name} ${donationData.surname}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${donationData.email}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Phone:</span>
            <span class="detail-value">${donationData.phone}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Address:</span>
            <span class="detail-value">${donationData.address}</span>
          </div>
        </div>

        <div class="amount-box">
          <div class="amount-label">Donation Amount</div>
          <div class="amount-value">₹ ${donationData.amount.toLocaleString('en-IN')}</div>
          <div class="amount-label">${donationData.donation_type === 'recurring' ? 'Monthly Recurring Donation' : 'One-time Donation'}</div>
        </div>

        <div class="section">
          <div class="section-title">Payment Details</div>
          <div class="detail-row">
            <span class="detail-label">Payment ID:</span>
            <span class="detail-value">${donationData.payment_id}</span>
          </div>
          ${donationData.order_id ? `
          <div class="detail-row">
            <span class="detail-label">Order ID:</span>
            <span class="detail-value">${donationData.order_id}</span>
          </div>
          ` : ''}
          <div class="detail-row">
            <span class="detail-label">Payment Status:</span>
            <span class="detail-value">Completed</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment Date:</span>
            <span class="detail-value">${new Date().toLocaleString('en-IN')}</span>
          </div>
        </div>

        ${donationData.wants_80g ? `
        <div class="section">
          <div class="section-title">Tax Exemption Details</div>
          <div class="detail-row">
            <span class="detail-label">PAN Number:</span>
            <span class="detail-value">${donationData.pan_number || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Aadhaar Number:</span>
            <span class="detail-value">${donationData.aadhaar_number ? '************' : 'N/A'}</span>
          </div>
          <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px; font-size: 12px;">
            <strong>Note:</strong> This receipt is eligible for tax exemption under Section 80G/12A/10BE of the Income Tax Act.
          </div>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-line"></div>
          <div style="font-size: 12px; color: #666;">Authorized Signatory</div>
          <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">${CONFIG.ORGANIZATION_NAME}</div>
        </div>

        <div class="footer">
          <p><strong>Thank you for your generous donation!</strong></p>
          <p>Your contribution will help us empower youth across India through education, innovation, and community development.</p>
          <p style="margin-top: 15px; font-size: 11px;">
            This is a computer-generated receipt and does not require a physical signature.<br>
            For any queries, please contact us at ${CONFIG.ADMIN_EMAIL}
          </p>
        </div>
      </body>
      </html>
    `;

    // Create PDF from HTML
    const blob = Utilities.newBlob(htmlContent, 'text/html', 'receipt.html');
    const pdf = blob.getAs('application/pdf');
    pdf.setName(`YUVA_Donation_Receipt_${receiptNumber}.pdf`);
    
    return pdf;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
}

/**
 * Send donation receipt with PDF attachment
 */
function sendDonationReceipt(donationData, donationId) {
  try {
    const receiptNumber = `YUVA-${new Date().getFullYear()}-${String(donationId).padStart(6, '0')}`;
    
    // Generate PDF receipt
    const pdfReceipt = generatePDFReceipt(donationData, receiptNumber);
    
    const subject = `Donation Receipt - ${CONFIG.ORGANIZATION_NAME}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700\u0026display=swap');
          
          body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
          }
          .email-container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #555879 0%, #98A1BC 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #555879;
            margin-bottom: 20px;
          }
          .amount-highlight {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-left: 4px solid #059669;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
          }
          .amount-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          .amount-value {
            font-size: 36px;
            font-weight: 700;
            color: #059669;
            margin: 10px 0;
          }
          .details-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          }
          .details-title {
            font-size: 16px;
            font-weight: 600;
            color: #555879;
            margin-bottom: 15px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dotted #ddd;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            color: #666;
            font-weight: 500;
          }
          .detail-value {
            color: #333;
            font-weight: 600;
          }
          .impact-section {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
          }
          .impact-title {
            font-size: 18px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 15px;
          }
          .impact-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .impact-list li {
            padding: 8px 0 8px 25px;
            position: relative;
            color: #78350f;
          }
          .impact-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #059669;
            font-weight: bold;
            font-size: 18px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #555879 0%, #98A1BC 100%);
            color: white;
            text-decoration: none;
            padding: 14px 30px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer-text {
            color: #666;
            font-size: 13px;
            margin: 5px 0;
          }
          .social-links {
            margin: 20px 0;
          }
          .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #555879;
            text-decoration: none;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Thank You for Your Donation!</h1>
            <p>Your generosity is making a difference</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              Dear ${donationData.first_name} ${donationData.surname},
            </div>
            
            <p>
              We are deeply grateful for your generous donation to ${CONFIG.ORGANIZATION_NAME}. 
              Your support helps us continue our mission to empower youth across India.
            </p>
            
            <div class="amount-highlight">
              <div class="amount-label">Your Contribution</div>
              <div class="amount-value">₹${donationData.amount.toLocaleString('en-IN')}</div>
              <div class="amount-label">${donationData.donation_type === 'recurring' ? 'Monthly Recurring Donation' : 'One-time Donation'}</div>
            </div>
            
            <div class="details-box">
              <div class="details-title">Donation Details</div>
              <div class="detail-row">
                <span class="detail-label">Receipt Number:</span>
                <span class="detail-value">${receiptNumber}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment ID:</span>
                <span class="detail-value">${donationData.payment_id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="color: #059669;">Completed</span>
              </div>
            </div>
            
            <div class="impact-section">
              <div class="impact-title">Your Impact</div>
              <p style="color: #78350f; margin-bottom: 15px;">Your donation will help us:</p>
              <ul class="impact-list">
                <li>Support thousands of students across India</li>
                <li>Organize educational events and workshops</li>
                <li>Develop innovative programs for youth empowerment</li>
                <li>Create opportunities for community development</li>
                <li>Build a brighter future for the next generation</li>
              </ul>
            </div>
            
            <p style="margin-top: 25px;">
              <strong>Your official donation receipt is attached as a PDF.</strong> 
              Please keep it for your records${donationData.wants_80g ? ' and tax purposes' : ''}.
            </p>
            
            ${donationData.wants_80g ? `
            <p style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <strong>Tax Exemption:</strong> This donation is eligible for tax benefits under Section 80G/12A/10BE of the Income Tax Act.
            </p>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${CONFIG.WEBSITE_URL}" class="cta-button">Visit Our Website</a>
            </div>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              We'll keep you updated on how your donation is making a difference. 
              If you have any questions, please don't hesitate to reach out to us at 
              <a href="mailto:${CONFIG.ADMIN_EMAIL}" style="color: #555879;">${CONFIG.ADMIN_EMAIL}</a>.
            </p>
            
            <p style="margin-top: 20px; font-weight: 600; color: #555879;">
              With heartfelt gratitude,<br>
              Team ${CONFIG.ORGANIZATION_NAME}
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-text" style="font-weight: 600; color: #555879; margin-bottom: 10px;">
              ${CONFIG.ORGANIZATION_NAME}
            </div>
            <div class="footer-text">
              Empowering Youth, Building Tomorrow
            </div>
            
            <div class="social-links">
              <a href="https://www.facebook.com/YouthUnitedForVisionAndAction/">Facebook</a> •
              <a href="https://www.instagram.com/yuvaofficialpage/">Instagram</a> •
              <a href="https://twitter.com/yuva_delhi_">Twitter</a> •
              <a href="https://www.linkedin.com/company/youthunitedforvisionandaction">LinkedIn</a>
            </div>
            
            <div class="footer-text" style="margin-top: 15px; font-size: 11px;">
              This is an automated email. Please do not reply to this message.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Send email with PDF attachment
    const emailOptions = {
      to: donationData.email,
      subject: subject,
      htmlBody: htmlBody,
      name: 'YUVA Donation System'
    };
    
    if (pdfReceipt) {
      emailOptions.attachments = [pdfReceipt];
    }
    
    MailApp.sendEmail(emailOptions);
    
    // Send admin notification
    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: `New Donation Received: ₹${donationData.amount.toLocaleString('en-IN')} from ${donationData.first_name} ${donationData.surname}`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #555879;">New Donation Received!</h2>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #059669;">₹${donationData.amount.toLocaleString('en-IN')}</h3>
            <p style="margin: 0; color: #666;">${donationData.donation_type === 'recurring' ? 'Monthly Recurring' : 'One-time'} Donation</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold;">Donor Name:</td>
              <td style="padding: 10px;">${donationData.first_name} ${donationData.surname}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold;">Email:</td>
              <td style="padding: 10px;">${donationData.email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold;">Phone:</td>
              <td style="padding: 10px;">${donationData.phone}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold;">Address:</td>
              <td style="padding: 10px;">${donationData.address}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold;">Payment ID:</td>
              <td style="padding: 10px;">${donationData.payment_id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold;">Receipt Number:</td>
              <td style="padding: 10px;">${receiptNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold;">Date:</td>
              <td style="padding: 10px;">${new Date().toLocaleString('en-IN')}</td>
            </tr>
            ${donationData.wants_80g ? `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold;">Tax Exemption:</td>
              <td style="padding: 10px;">Requested (PAN: ${donationData.pan_number || 'N/A'})</td>
            </tr>
            ` : ''}
          </table>
          
          <p style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px;">
            <strong>Action Required:</strong> Please review the donation details and update records if necessary.
          </p>
        </div>
      `,
      name: 'YUVA Donation System'
    });
    
    // Save receipt metadata to donation_receipts table
    try {
      const receiptData = {
        donation_id: donationId,
        receipt_number: receiptNumber,
        receipt_url: null, // PDF is sent via email, not stored
        sent_via_email: true,
        email_sent_at: new Date().toISOString()
      };
      
      const receiptResult = saveReceiptToSupabase(receiptData);
      
      if (receiptResult.success) {
        console.log('Receipt metadata saved successfully:', receiptNumber);
      } else {
        console.error('Failed to save receipt metadata:', receiptResult.error);
      }
    } catch (receiptError) {
      console.error('Error saving receipt metadata:', receiptError);
      // Don't throw error - email was sent successfully
    }
    
  } catch (error) {
    console.error('Error sending receipt:', error);
    throw error;
  }
}

/**
 * Save receipt metadata to Supabase donation_receipts table
 */
function saveReceiptToSupabase(receiptData) {
  try {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/donation_receipts`;
    
    const options = {
      method: 'POST',
      headers: {
        'apikey': CONFIG.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      payload: JSON.stringify(receiptData),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());
    
    if (responseCode !== 201 && responseCode !== 200) {
      console.error('Supabase receipt error:', responseData);
      throw new Error(responseData.message || 'Failed to save receipt to Supabase');
    }
    
    return {
      success: true,
      receiptId: responseData[0]?.id || null
    };
  } catch (error) {
    console.error('Error saving receipt to Supabase:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test setup
 */
function testSetup() {
  try {
    // Test Razorpay connection
    const testOrder = createRazorpayOrder({ amount: 1, currency: 'INR' });
    
    return {
      success: true,
      message: 'Setup test completed',
      razorpayConnection: testOrder.success,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
function doOptions(e) {
  return ContentService.createTextOutput()
    .setMimeType(ContentService.MimeType.TEXT);
}
