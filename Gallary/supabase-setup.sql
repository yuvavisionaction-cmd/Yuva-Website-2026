-- =====================================================
-- YUVA INDIA PHOTO GALLERY - SUPABASE SETUP SCRIPT
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- Last Updated: December 26, 2025
-- =====================================================
-- =====================================================
-- STEP 1: CREATE STORAGE BUCKET
-- =====================================================
-- Note: This must be done via Supabase Dashboard > Storage
-- Bucket Name: gallery_photos
-- Public: Yes
-- File Size Limit: 500 KB
-- Allowed MIME Types: image/jpeg, image/png, image/webp
-- =====================================================
-- STEP 2: STORAGE POLICIES
-- =====================================================
-- Policy 1: Allow public read access to all images
CREATE POLICY "Public read access for gallery photos" ON storage.objects FOR
SELECT USING (bucket_id = 'gallery_photos');
-- Policy 2: Allow authenticated users to upload images
-- Note: This assumes you're using Supabase Auth or custom auth
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR
INSERT WITH CHECK (bucket_id = 'gallery_photos');
-- Policy 3: Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete photos" ON storage.objects FOR DELETE USING (bucket_id = 'gallery_photos');
-- =====================================================
-- STEP 3: VERIFY EXISTING TABLES
-- =====================================================
-- These tables should already exist from your auth system
-- Just verify they're present:
-- Check if security_keys table exists
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'security_keys'
    );
-- Check if vertical_access table exists (optional, for future use)
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'vertical_access'
    );
-- =====================================================
-- STEP 4: VERIFY RPC FUNCTION
-- =====================================================
-- This function should already exist from your auth system
-- Verify it's working:
SELECT check_vertical_admin('test@example.com');
-- Should return true/false based on whether email exists
-- =====================================================
-- STEP 5: ADD SAMPLE ADMIN USER (OPTIONAL)
-- =====================================================
-- Add a test admin user to security_keys table
-- Replace with your actual email and security key
INSERT INTO security_keys (email, security_key)
VALUES ('admin@yuva.com', 'your_secure_password_here') ON CONFLICT (email) DO NOTHING;
-- =====================================================
-- STEP 6: GRANT PERMISSIONS (IF NEEDED)
-- =====================================================
-- Ensure anon and authenticated roles can access storage
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.objects TO authenticated;
GRANT INSERT ON storage.objects TO authenticated;
GRANT DELETE ON storage.objects TO authenticated;
-- =====================================================
-- STEP 7: CREATE HELPER FUNCTION (OPTIONAL)
-- =====================================================
-- Function to list all photos in a category/year
CREATE OR REPLACE FUNCTION get_gallery_photos(
        p_category TEXT DEFAULT NULL,
        p_year TEXT DEFAULT NULL
    ) RETURNS TABLE (
        name TEXT,
        id UUID,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        last_accessed_at TIMESTAMPTZ,
        metadata JSONB
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT o.name,
    o.id,
    o.created_at,
    o.updated_at,
    o.last_accessed_at,
    o.metadata
FROM storage.objects o
WHERE o.bucket_id = 'gallery_photos'
    AND o.name LIKE 'photos/%'
    AND (
        p_category IS NULL
        OR o.name LIKE 'photos/' || p_category || '/%'
    )
    AND (
        p_year IS NULL
        OR o.name LIKE 'photos/%/' || p_year || '/%'
    )
ORDER BY o.created_at DESC;
END;
$$;
-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_gallery_photos TO anon;
GRANT EXECUTE ON FUNCTION get_gallery_photos TO authenticated;
-- =====================================================
-- STEP 8: TEST THE SETUP
-- =====================================================
-- Test 1: Check bucket exists
SELECT *
FROM storage.buckets
WHERE name = 'gallery_photos';
-- Test 2: Check policies are active
SELECT *
FROM pg_policies
WHERE tablename = 'objects'
    AND policyname LIKE '%gallery%';
-- Test 3: Test helper function
SELECT *
FROM get_gallery_photos();
-- Test 4: Verify admin user
SELECT email
FROM security_keys
WHERE email = 'admin@yuva.com';
-- =====================================================
-- STEP 9: CLEANUP OLD DATA (OPTIONAL)
-- =====================================================
-- If you want to remove old Cloudinary-based data
-- WARNING: This will delete data! Only run if you're sure
-- Drop old tables if they exist (UNCOMMENT TO USE)
-- DROP TABLE IF EXISTS old_photo_metadata;
-- DROP TABLE IF EXISTS cloudinary_uploads;
-- =====================================================
-- STEP 10: MONITORING QUERIES
-- =====================================================
-- Query 1: Count photos by category
SELECT SPLIT_PART(name, '/', 2) as category,
    COUNT(*) as photo_count
FROM storage.objects
WHERE bucket_id = 'gallery_photos'
    AND name LIKE 'photos/%/%/%'
GROUP BY SPLIT_PART(name, '/', 2)
ORDER BY photo_count DESC;
-- Query 2: Count photos by year
SELECT SPLIT_PART(name, '/', 3) as year,
    COUNT(*) as photo_count
FROM storage.objects
WHERE bucket_id = 'gallery_photos'
    AND name LIKE 'photos/%/%/%'
GROUP BY SPLIT_PART(name, '/', 3)
ORDER BY year DESC;
-- Query 3: Total storage used
SELECT pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size,
    COUNT(*) as total_files
FROM storage.objects
WHERE bucket_id = 'gallery_photos';
-- Query 4: Recent uploads (last 7 days)
SELECT name,
    created_at,
    pg_size_pretty((metadata->>'size')::bigint) as file_size
FROM storage.objects
WHERE bucket_id = 'gallery_photos'
    AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Next steps:
-- 1. Create folder structure in Supabase Storage Dashboard:
--    - photos/vimarsh/
--    - photos/samarpan/
--    - photos/bharatparv/
--    - photos/events/
--    - photos/activities/
--
-- 2. Test upload via photo-admin.html
-- 3. Verify images appear in photo.html
-- 4. Review UserManual/PHOTO_GALLERY_USER_MANUAL.txt
-- =====================================================