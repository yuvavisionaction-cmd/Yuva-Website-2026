# Vimarsh 2026 - Admin Standard Operating Procedures (SOP)

## 🎯 Quick Reference for Event Day

---

## 📱 ADMIN PORTAL ACCESS

**URL**: [Your Admin Portal URL]  
**Roles**:
- **Member**: Can scan QR codes only
- **Tech Head**: Full access (stats, search, batch operations, exports)

---

## ✅ NORMAL CHECK-IN FLOW

### Step 1: Open Scanner
1. Login to admin portal
2. Click "Scan" tab
3. Point camera at participant's QR code

### Step 2: Scan QR Code
- **Green Screen** = Success → Hand over kit & wristband
- **Yellow Screen** = Already checked in → Verify with participant
- **Red Screen** = Error → Follow troubleshooting below

### Step 3: Close Result
- Click "Continue Scanning"
- Ready for next participant

---

## 🔧 TROUBLESHOOTING GUIDE

### Issue 1: "Invalid QR Code" Error

**Cause**: QR code not in system or corrupted

**Solution**:
1. Ask participant for email address
2. Click "Search" tab
3. Type email in search box
4. Click "Find Participant"
5. Verify payment status shows "✅ In"
6. If pending, direct to registration desk

---

### Issue 2: "Already Checked In" Warning

**Cause**: Participant scanned twice (duplicate scan)

**Solution**:
1. Check if participant has kit & wristband
2. If YES: Inform them they're already checked in
3. If NO: Use manual search method below

**Manual Check-In (Tech Head Only)**:
1. Go to "Search" tab
2. Search by email
3. Verify status shows "✅ In"
4. Click "Mark Issued" for Kit and Band
5. Hand over items

---

### Issue 3: Payment Completed But No QR Code

**Cause**: Email delivery failed or user didn't receive

**Solution (Tech Head)**:
1. Go to "Search" tab
2. Search participant by email
3. Check status:
   - If "❌ Pending" → Payment not completed, send to registration desk
   - If "✅ In" → Already checked in, verify kit/band status
4. For missing QR: Note registration ID, contact tech support

**Tech Support Action**:
- Run manual email retry: `manualEmailRetry('VIM26-XXXX')`
- Or check Supabase for `email_sent = false`

---

### Issue 4: Scanner Not Working

**Cause**: Camera permission denied or browser issue

**Solution**:
1. Refresh page (F5)
2. Allow camera permission when prompted
3. If still not working:
   - Try different browser (Chrome recommended)
   - Check device camera works in other apps
   - Use another admin's device

---

### Issue 5: "Session Expired" Message

**Cause**: Logged in for more than 24 hours

**Solution**:
1. Click "Logout" or wait for auto-logout
2. Login again with same credentials
3. Continue scanning

---

## 🎒 INVENTORY MANAGEMENT (Tech Head Only)

### Individual Issuance
1. Go to "Search" tab
2. Find participant
3. Click "Mark Issued" for Kit or Band
4. Status updates immediately

### Batch Issuance
**Use Case**: All participants checked in, now distributing kits/bands in bulk

1. Go to "Stats" tab
2. Scroll to "Batch Operations"
3. Click "Issue All Kits" or "Issue All Bands"
4. Confirm the action
5. Wait for success message

**⚠️ Warning**: This marks ALL checked-in participants as issued. Use carefully!

---

## 📊 MONITORING DASHBOARD (Tech Head Only)

### Stats View
- **Total**: Total paid registrations
- **In**: Checked-in participants
- **Kits**: Kits distributed
- **Bands**: Wristbands distributed
- **Rem.**: Remaining to check in

### Auto-Refresh
- Stats refresh every 60 seconds automatically
- Or click "Force Refresh" for immediate update

### Recent Activity
- Shows last 15 check-ins
- Displays kit/band status for each
- Helps track distribution progress

---

## 🚨 EMERGENCY PROCEDURES

### Scenario 1: Multiple Admins Scan Same QR Simultaneously

**Symptoms**: Participant gets "Success" but appears twice in logs

**Action**:
1. Check participant physically has kit & band
2. If YES: Ignore duplicate, continue
3. If NO: Use Search → Mark Issued manually
4. Note registration ID for post-event cleanup

**Prevention**: Coordinate scanning zones to avoid overlap

---

### Scenario 2: Internet Connection Lost

**Symptoms**: Scanner shows "Scan Error" or timeout

**Action**:
1. Check device internet connection
2. If offline: Switch to mobile hotspot
3. If still failing: Note registration IDs on paper
4. Manual check-in after connection restored

**Recovery**:
1. Once online, search each noted registration
2. Verify not already checked in
3. Use manual search method to complete

---

### Scenario 3: Payment Succeeded But Registration Pending

**Symptoms**: Participant paid, has Razorpay receipt, but search shows "Pending"

**Action (Tech Head)**:
1. Verify payment on Razorpay dashboard
2. Note Order ID and Payment ID
3. Contact tech support immediately
4. DO NOT manually check in until payment confirmed

**Tech Support Action**:
- Check webhook logs in Apps Script
- Manually update payment status in Supabase if verified
- Trigger email manually

---

### Scenario 4: Participant Lost QR Code

**Symptoms**: Paid and registered but no QR code email

**Action**:
1. Search by email in admin portal
2. If found and paid: Note registration ID
3. Contact tech support for email resend
4. Meanwhile, check in manually using registration ID

**Prevention**: Advise participants to save QR code or take screenshot

---

## 📋 PRE-EVENT CHECKLIST

### 1 Hour Before Event
- [ ] All admins logged in successfully
- [ ] Scanner working on all devices
- [ ] Internet connection stable
- [ ] Tech Head has access to Stats/Search
- [ ] Backup device ready
- [ ] Paper & pen for manual notes (backup)

### During Event
- [ ] Monitor "Remaining" count on dashboard
- [ ] Check Recent Activity for any errors
- [ ] Coordinate with other admins to avoid duplicate scans
- [ ] Report any issues to Tech Head immediately

### Post-Event
- [ ] Tech Head exports all data (Registrations + Logs)
- [ ] Verify total checked in matches physical count
- [ ] Review any manual notes for cleanup
- [ ] Report any system issues for improvement

---

## 🔑 KEY CONTACTS

**Tech Support**: [Your Contact]  
**Event Coordinator**: [Your Contact]  
**Backup Admin**: [Your Contact]

---

## 💡 BEST PRACTICES

### DO:
✅ Scan QR codes clearly and wait for result  
✅ Verify participant details before handing items  
✅ Use Search if QR scan fails  
✅ Refresh page if scanner freezes  
✅ Coordinate with other admins  
✅ Report issues immediately  

### DON'T:
❌ Scan same QR multiple times rapidly  
❌ Close result screen before reading  
❌ Hand over kit/band without green confirmation  
❌ Manually check in without verifying payment  
❌ Share admin credentials  
❌ Leave portal unattended while logged in  

---

## 📞 QUICK TROUBLESHOOTING FLOWCHART

```
QR Scan Failed?
    ↓
Try Search by Email
    ↓
Found & Paid?
    ↓ YES              ↓ NO
Manual Check-In    Send to Registration Desk
    ↓
Hand Kit & Band
    ↓
Mark as Issued (if Tech Head)
```

---

## 🎓 TRAINING NOTES

**For New Admins**:
1. Practice scanning test QR codes
2. Familiarize with Search function
3. Know how to refresh page
4. Understand difference between "Pending" and "Checked In"
5. Know when to escalate to Tech Head

**For Tech Heads**:
1. Understand all admin functions
2. Know how to export data
3. Familiar with batch operations
4. Can access Apps Script logs if needed
5. Coordinate with tech support

---

## 📝 INCIDENT LOG TEMPLATE

**Use this format to report issues**:

```
Time: [HH:MM]
Admin: [Your Name]
Issue: [Brief description]
Participant: [Email or Reg ID]
Action Taken: [What you did]
Resolution: [Outcome]
```

**Example**:
```
Time: 10:30 AM
Admin: Rahul
Issue: QR scan failed, "Invalid QR Code"
Participant: john@example.com
Action Taken: Searched by email, found registration, manually checked in
Resolution: Participant checked in successfully, kit & band issued
```

---

## ✅ FINAL CHECKLIST BEFORE GO-LIVE

- [ ] Webhook configured in Razorpay dashboard
- [ ] Email retry trigger set up (every 15 minutes)
- [ ] All admins trained on SOP
- [ ] Test registration completed successfully
- [ ] Backup plan documented
- [ ] Emergency contacts shared
- [ ] Admin devices charged and ready

---

**Document Version**: 1.0  
**Last Updated**: January 20, 2026  
**Next Review**: After Event

---

**Remember**: When in doubt, search by email. It's the most reliable fallback!
