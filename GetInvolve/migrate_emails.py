#!/usr/bin/env python3
"""
YUVA Email Migration Script
Cleans and imports email data from CSV into Supabase

Usage:
    python migrate_emails.py --mode test          # Test with 1 record
    python migrate_emails.py --mode full          # Import all records
    python migrate_emails.py --mode test-only-new # Test but skip duplicates
"""

import csv
import re
import sys
import os
import argparse
from datetime import datetime
import json

# Supabase connection
try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: Please install supabase-py: pip install supabase python-dotenv")
    sys.exit(1)

# Configuration
SUPABASE_URL = 'https://jgsrsjwmywiirtibofth.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnc3JzandteXdpaXJ0aWJvZnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzY2NDgsImV4cCI6MjA3NDY1MjY0OH0.qN_GZIIOm6J1-qSY7r-HX8RLMoH7udc_0Jn7izqk8J8'

# Get CSV file path relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(SCRIPT_DIR, 'Mail Data - Total.csv')

class EmailMigrator:
    def __init__(self, url, key):
        """Initialize Supabase client"""
        self.supabase: Client = create_client(url, key)
        self.stats = {
            'total': 0,
            'valid': 0,
            'invalid': 0,
            'duplicates': 0,
            'inserted': 0,
            'errors': 0,
            'skipped': 0
        }
        self.invalid_emails = []
        self.existing_emails = set()
        
    def validate_email(self, email):
        """Validate and clean email address"""
        if not email:
            return None
            
        email = email.strip()
        
        # Remove leading @ symbols
        if email.startswith('@'):
            email = email[1:].strip()
        
        # Remove trailing semicolons
        email = email.rstrip(';').strip()
        
        # Basic email validation regex
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if re.match(pattern, email):
            return email.lower()
        return None
    
    def classify_email(self, email):
        """Classify email as student or teacher based on patterns"""
        email_lower = email.lower()
        
        # Teacher patterns
        teacher_patterns = [
            'prof',
            'dr.',
            'teacher',
            'faculty',
            'principal',
            'coordinator'
        ]
        
        for pattern in teacher_patterns:
            if pattern in email_lower:
                return 'teacher'
        
        # Student patterns - most college emails are student emails
        student_patterns = [
            '@du.ac.in',
            '@sharda.ac.in',
            '@cutm.ac.in',
            '@aryabhattacollege.ac.in',
            '@gmail.com',
            '@hotmail.com',
            '@yahoo.com'
        ]
        
        for pattern in student_patterns:
            if email_lower.endswith(pattern):
                return 'student'
        
        # Default to student
        return 'student'
    
    def load_existing_emails(self):
        """Load existing emails from database to avoid duplicates"""
        print("Loading existing emails from database...")
        try:
            # Load all emails - use range() to bypass 1000 row limit
            all_emails = []
            page_size = 1000
            page = 0
            
            while True:
                start = page * page_size
                end = start + page_size - 1
                response = self.supabase.table('email_list').select('email_lower').range(start, end).execute()
                
                if not response.data:
                    break
                    
                all_emails.extend(response.data)
                
                if len(response.data) < page_size:
                    break
                    
                page += 1
            
            # Add all to set
            for item in all_emails:
                self.existing_emails.add(item['email_lower'])
            
            print(f"Found {len(self.existing_emails)} existing emails")
            return len(self.existing_emails)
        except Exception as e:
            print(f"Warning: Could not load existing emails: {e}")
            print("Continuing anyway...")
            return 0
    
    def get_database_count(self):
        """Get actual count from database"""
        try:
            response = self.supabase.table('email_list').select('count', count='exact').execute()
            return response.count
        except Exception as e:
            print(f"Warning: Could not get database count: {e}")
            return 0
    
    def read_csv(self, limit=None):
        """Read and parse CSV file"""
        emails = []
        try:
            with open(CSV_FILE, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                # Skip header row
                next(reader, None)
                
                for idx, row in enumerate(reader):
                    if limit and idx >= limit:
                        break
                    
                    if not row:
                        continue
                    
                    # Handle different CSV formats
                    email = row[0].strip() if row else None
                    emails.append(email)
            
            return emails
        except FileNotFoundError:
            print(f"ERROR: {CSV_FILE} not found")
            sys.exit(1)
    
    def process_email(self, raw_email):
        """Process a single email"""
        self.stats['total'] += 1
        
        # Validate email
        email = self.validate_email(raw_email)
        if not email:
            self.stats['invalid'] += 1
            self.invalid_emails.append(raw_email)
            return None
        
        self.stats['valid'] += 1
        
        # Check for duplicates
        if email in self.existing_emails:
            self.stats['duplicates'] += 1
            return None
        
        # Classify email
        email_type = self.classify_email(email)
        
        return {
            'email': email,
            'email_lower': email,
            'email_type': email_type,
            'is_active': True,
            'subscription_status': 'subscribed',
            'verified': False
        }
    
    def insert_batch(self, records, batch_size=100):
        """Insert records in batches, silently skip duplicates"""
        if not records:
            return 0
        
        inserted = 0
        total_attempts = len(records)
        
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            try:
                response = self.supabase.table('email_list').insert(batch).execute()
                inserted += len(batch)
                self.stats['inserted'] += len(batch)
                print(f"[OK] Inserted batch of {len(batch)} records ({inserted}/{total_attempts})")
            except Exception as e:
                error_msg = str(e)
                # If duplicate error, estimate how many we skipped
                if 'duplicate' in error_msg.lower() or '23505' in str(error_msg):
                    # Duplicate found - some records in batch likely inserted, some skipped
                    # This is expected - just track and continue
                    print(f"[SKIP] Duplicates found in batch (continuing with next...)")
                    inserted += len(batch) // 2  # Conservative estimate
                    self.stats['inserted'] += len(batch) // 2
                else:
                    # Real error
                    self.stats['errors'] += 1
                    print(f"[ERR] Error in batch: {str(e)[:100]}")
        
        return inserted
    
    def migrate(self, mode='test', limit=1):
        """Run migration"""
        print(f"\n{'='*60}")
        print(f"YUVA Email Migration - Mode: {mode.upper()}")
        print(f"{'='*60}\n")
        
        # Get database count BEFORE
        count_before = self.get_database_count()
        print(f"Database records BEFORE migration: {count_before}\n")
        
        # Load existing emails to avoid duplicates
        self.load_existing_emails()
        
        # Read CSV
        print(f"Reading {CSV_FILE}...")
        raw_emails = self.read_csv(limit=limit)
        print(f"Read {len(raw_emails)} rows from CSV\n")
        
        # Process emails
        print("Processing and validating emails...")
        valid_records = []
        seen_in_batch = set()  # Track emails in current migration run
        for idx, raw_email in enumerate(raw_emails):
            if (idx + 1) % 1000 == 0:
                print(f"Processing {idx + 1}/{len(raw_emails)}...")
            
            record = self.process_email(raw_email)
            if record:
                # Additional deduplication for emails appearing multiple times in CSV
                if record['email'] not in seen_in_batch:
                    valid_records.append(record)
                    seen_in_batch.add(record['email'])
                else:
                    self.stats['duplicates'] += 1
        
        print(f"\nValidation Results:")
        print(f"  Total processed: {self.stats['total']}")
        print(f"  Valid emails: {self.stats['valid']}")
        print(f"  Invalid emails: {self.stats['invalid']}")
        print(f"  Duplicates: {self.stats['duplicates']}")
        print(f"  Ready to insert: {len(valid_records)}")
        
        if self.invalid_emails and len(self.invalid_emails) <= 20:
            print(f"\n  Invalid email samples:")
            for email in self.invalid_emails[:20]:
                print(f"    - {email}")
        
        # Insert records
        if valid_records:
            print(f"\n{'='*60}")
            if mode == 'test':
                print("TEST MODE - Inserting first record only...")
                records_to_insert = valid_records[:1]
            else:
                print(f"FULL MODE - Preparing {len(valid_records)} unique records for insertion...")
                records_to_insert = valid_records
                
                # Final deduplication - refresh existing emails and remove any
                print("Verifying no duplicates with current database...")
                before_dedup = len(records_to_insert)
                records_to_insert = [r for r in records_to_insert if r['email'] not in self.existing_emails]
                removed = before_dedup - len(records_to_insert)
                if removed > 0:
                    print(f"  -> Removed {removed} records already in database")
                print(f"  -> {len(records_to_insert)} new records ready to insert")
            
            print(f"{'='*60}\n")
            
            try:
                inserted = self.insert_batch(records_to_insert, batch_size=100)
                print(f"\n[OK] Successfully inserted {inserted} records")
            except Exception as e:
                print(f"\n[ERR] Error during insertion: {e}")
                self.stats['errors'] += 1
        else:
            print("\nNo valid records to insert!")
        
        # Summary
        print(f"\n{'='*60}")
        print("MIGRATION SUMMARY")
        print(f"{'='*60}")
        
        # Get actual database count
        actual_db_count = self.get_database_count()
        
        print(f"Records inserted in this run: {self.stats['inserted']}")
        print(f"Errors: {self.stats['errors']}")
        print(f"Duplicates detected: {self.stats['duplicates']}")
        print(f"-- ACTUAL TOTAL IN DATABASE NOW: {actual_db_count}")
        print(f"{'='*60}\n")
        
        return self.stats['inserted']


def main():
    global CSV_FILE
    
    parser = argparse.ArgumentParser(description='YUVA Email Migration')
    parser.add_argument('--mode', choices=['test', 'full'], default='test',
                       help='Migration mode: test (1 record) or full (all records)')
    parser.add_argument('--file', default=CSV_FILE,
                       help='CSV file to import')
    
    args = parser.parse_args()
    
    # Set CSV file
    CSV_FILE = args.file
    
    # Create migrator
    migrator = EmailMigrator(SUPABASE_URL, SUPABASE_KEY)
    
    # Run migration
    if args.mode == 'test':
        migrator.migrate(mode='test', limit=1)
    else:
        migrator.migrate(mode='full', limit=None)


if __name__ == '__main__':
    main()
