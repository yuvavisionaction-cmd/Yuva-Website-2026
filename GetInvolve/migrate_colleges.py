# migrate_colleges.py
import pandas as pd
from supabase import create_client, Client
import re

# --- Configuration ---
SUPABASE_URL = "https://jgsrsjwmywiirtibofth.supabase.co"
SUPABASE_SERVICE_KEY = "sb_secret_DVQha-CsYHFhTp71mFJSlw_9OA_QWNo" # Use your service key for this script
excel_file_path = 'GetInvolve/yuva_colleges2.xlsx'

# --- Supabase Client ---
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_initials(name):
    """Generates initials from a string."""
    # Remove parentheses and content within them
    name = re.sub(r'\(.*?\)', '', name)
    words = name.strip().split()
    if not words:
        return ""
    return "".join(word[0] for word in words).upper()

def main():
    try:
        # 1. Fetch existing zones from Supabase
        print("Fetching zones from Supabase...")
        zones_response = supabase.table('zones').select('id, zone_name, zone_code').execute()
        if not zones_response.data:
            print("Error: No zones found in the database. Please insert zones first.")
            return
        
        zones_map = {zone['zone_name'].lower(): zone for zone in zones_response.data}
        zone_code_map = {zone['zone_code'].lower(): zone for zone in zones_response.data}
        print(f"Found {len(zones_map)} zones.")

        # 2. Fetch existing colleges from Supabase
        print("Fetching existing colleges from Supabase...")
        colleges_response = supabase.table('colleges').select('college_name, college_code, zone_id').execute()
        existing_colleges_names = set()
        existing_colleges_codes = set()
        
        if colleges_response.data:
            for college in colleges_response.data:
                existing_colleges_names.add(college['college_name'].lower().strip())
                existing_colleges_codes.add(college['college_code'].lower().strip())
            print(f"Found {len(colleges_response.data)} existing colleges in database.")

        # 3. Read the Excel file
        print(f"\nReading Excel file: {excel_file_path}")
        xls = pd.ExcelFile(excel_file_path)
        
        all_colleges_to_insert = []
        skipped_colleges = []
        zone_counters = {} # To track the unit number for each zone

        # 4. Process each sheet (each sheet is a zone)
        for sheet_name in xls.sheet_names:
            print(f"\nProcessing sheet (zone): '{sheet_name}'...")
            zone_info = zone_code_map.get(sheet_name.lower().strip())
            
            if not zone_info:
                print(f"  [Warning] Zone code '{sheet_name}' from Excel not found in database. Skipping sheet.")
                continue

            zone_id = zone_info['id']
            zone_initials = get_initials(zone_info['zone_name'])
            
            df = pd.read_excel(xls, sheet_name)
            
            # Assuming the college names are in a column named 'College Name'
            if 'College Name' not in df.columns:
                print(f"  [Error] 'College Name' column not found in sheet '{sheet_name}'. Skipping.")
                continue

            for college_name in df['College Name']:
                if pd.isna(college_name):
                    continue
                
                college_name = str(college_name).strip()
                
                # Check if college already exists
                if college_name.lower() in existing_colleges_names:
                    print(f"  ⏭️  Skipped (already exists): {college_name}")
                    skipped_colleges.append(college_name)
                    continue
                
                # Increment counter for the zone
                zone_counters[zone_id] = zone_counters.get(zone_id, 0) + 1
                unit_number = str(zone_counters[zone_id]).zfill(3)
                
                # Generate the code
                college_initials = get_initials(college_name)
                college_code = f"{college_initials}{zone_initials}{unit_number}"
                
                # Check if the generated code already exists
                while college_code.lower() in existing_colleges_codes:
                    zone_counters[zone_id] += 1
                    unit_number = str(zone_counters[zone_id]).zfill(3)
                    college_code = f"{college_initials}{zone_initials}{unit_number}"

                college_record = {
                    "college_name": college_name,
                    "college_code": college_code,
                    "zone_id": zone_id,
                    "is_active": True
                }
                all_colleges_to_insert.append(college_record)
                existing_colleges_codes.add(college_code.lower())  # Add to set to avoid duplicates within this run
                print(f"  ✅ Prepared: {college_name} -> {college_code}")

        # 5. Insert all collected data into Supabase
        if all_colleges_to_insert:
            print(f"\n{'='*60}")
            print(f"Summary:")
            print(f"  - Total colleges processed: {len(all_colleges_to_insert) + len(skipped_colleges)}")
            print(f"  - Colleges to insert: {len(all_colleges_to_insert)}")
            print(f"  - Colleges skipped (already exist): {len(skipped_colleges)}")
            print(f"{'='*60}\n")
            
            print(f"Inserting {len(all_colleges_to_insert)} new colleges into Supabase...")
            insert_response = supabase.table('colleges').insert(all_colleges_to_insert).execute()
            
            if insert_response.data:
                print("✅ Successfully inserted colleges!")
            else:
                print("❌ Failed to insert colleges.")
                print("   Error:", insert_response)
        else:
            print(f"\n{'='*60}")
            print(f"Summary:")
            print(f"  - Total colleges processed: {len(skipped_colleges)}")
            print(f"  - Colleges skipped (already exist): {len(skipped_colleges)}")
            print("✅ No new colleges to insert - all colleges already exist in the database.")
            print(f"{'='*60}\n")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()