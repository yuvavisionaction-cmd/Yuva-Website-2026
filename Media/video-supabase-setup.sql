-- =====================================================
-- YUVA MEDIA VIDEOS - SUPABASE TABLE SETUP
-- =====================================================
-- Run this script in Supabase SQL Editor.
-- Purpose: replace Google Sheets-backed video manager storage
-- with a native Supabase table used by Media/video-manager.html.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.media_videos (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    year TEXT,
    title TEXT,
    description TEXT,
    published_at TIMESTAMPTZ,
    view_count TEXT,
    duration TEXT,
    thumbnail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_videos_category ON public.media_videos(category);
CREATE INDEX IF NOT EXISTS idx_media_videos_year ON public.media_videos(year);
CREATE INDEX IF NOT EXISTS idx_media_videos_created_at ON public.media_videos(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_media_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_media_videos_updated_at ON public.media_videos;
CREATE TRIGGER trg_media_videos_updated_at
BEFORE UPDATE ON public.media_videos
FOR EACH ROW
EXECUTE FUNCTION public.set_media_videos_updated_at();

ALTER TABLE public.media_videos ENABLE ROW LEVEL SECURITY;

-- Public read for website video page.
DROP POLICY IF EXISTS "Public read media videos" ON public.media_videos;
CREATE POLICY "Public read media videos"
ON public.media_videos
FOR SELECT
TO anon, authenticated
USING (true);

-- Public insert/update/delete for current front-end admin flow.
-- IMPORTANT: tighten these policies once admin auth is enforced.
DROP POLICY IF EXISTS "Public insert media videos" ON public.media_videos;
CREATE POLICY "Public insert media videos"
ON public.media_videos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Public update media videos" ON public.media_videos;
CREATE POLICY "Public update media videos"
ON public.media_videos
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete media videos" ON public.media_videos;
CREATE POLICY "Public delete media videos"
ON public.media_videos
FOR DELETE
TO anon, authenticated
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media_videos TO anon, authenticated;

-- =====================================================
-- Verification queries
-- =====================================================
-- SELECT * FROM public.media_videos ORDER BY created_at DESC LIMIT 20;
-- SELECT category, COUNT(*) FROM public.media_videos GROUP BY category ORDER BY COUNT(*) DESC;
