/**
 * ================================================
 * VIMARSH SPEAKERS - SUPABASE LOADER
 * ================================================
 * 
 * This script handles speaker images from Supabase Storage
 * To use: Upload speaker images to gallery_photos/vimarsh26/speakers/ folder
 * 
 * Name format: speaker_[name].[ext]
 * Example: speaker_manish_tripathi.jpg
 */

// Speaker image mapping
// If you have speaker images in Supabase, map them here
// Otherwise, keep using local files or upload to Supabase
const SPEAKERS_CONFIG = {
    // Example: Map speaker names to their Supabase Storage filenames
    // Format: 'Speaker Display Name': 'filename-in-supabase.jpg'
    
    // If images are in: gallery_photos/vimarsh26/speakers/
    // They will be fetched with: https://[PROJECT].supabase.co/storage/v1/object/public/gallery_photos/vimarsh26/speakers/[filename]
    
    // Uncomment and configure if you upload speaker images to Supabase:
    /*
    'Mr. Manish Tripathi': 'speaker_manish_tripathi.png',
    'Miss. Nehmat Mongia': 'speaker_nehmat_mongia.jpg',
    'Mrs. Vinita Sidhartha': 'speaker_vinita_sidhartha.jpg',
    // Add more speakers as needed...
    */
};

// Function to get speaker image URL from Supabase
function getSpeakerImageUrl(speakerName) {
    const filename = SPEAKERS_CONFIG[speakerName];
    
    if (!filename) {
        // If not configured, return null (will use existing img src)
        return null;
    }
    
    // Construct Supabase URL
    return `${SUPABASE_CONFIG.STORAGE_URL}speakers/${filename}`;
}

// Initialize speaker images on page load
function initSpeakerImages() {
    const speakerCards = document.querySelectorAll('.speaker-card');
    
    speakerCards.forEach(card => {
        const img = card.querySelector('.speaker-front img');
        const speakerName = card.querySelector('.speaker-back h3')?.textContent.trim();
        
        if (img && speakerName) {
            const supabaseUrl = getSpeakerImageUrl(speakerName);
            
            if (supabaseUrl) {
                // Replace Cloudinary URL with Supabase URL
                img.src = supabaseUrl;
                img.setAttribute('data-original-src', img.src);
                
                // Handle load error
                img.onerror = function() {
                    console.warn(`Failed to load speaker image from Supabase: ${speakerName}`);
                    // Fallback to data-original-src if available
                };
            }
        }
    });
}

// Auto-initialize if SPEAKERS_CONFIG is not empty
if (Object.keys(SPEAKERS_CONFIG).length > 0) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSpeakerImages);
    } else {
        initSpeakerImages();
    }
}

/**
 * ================================================
 * INSTRUCTIONS FOR USING SPEAKER IMAGES
 * ================================================
 * 
 * 1. Upload speaker images to Supabase Storage:
 *    - Bucket: gallery_photos
 *    - Folder: vimarsh26/speakers/
 *    - Make sure bucket is PUBLIC
 * 
 * 2. Name files clearly:
 *    - Example: speaker_manish_tripathi.jpg
 *    - Example: speaker_nehmat_mongia.png
 * 
 * 3. Update SPEAKERS_CONFIG above:
 *    - Add mapping: 'Display Name': 'filename.ext'
 * 
 * 4. Or, manually replace Cloudinary URLs in HTML with:
 *    https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/gallery_photos/vimarsh26/speakers/filename.jpg
 * 
 * ================================================
 */
