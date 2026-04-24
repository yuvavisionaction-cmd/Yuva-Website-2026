/**
 * ================================================
 * SUPABASE STORAGE CONFIGURATION FOR VIMARSH GALLERY
 * ================================================
 * 
 * Replace YOUR_PROJECT_ID with your actual Supabase project ID
 * Replace YOUR_ANON_KEY with your actual Supabase anonymous key
 * 
 * Find these in: Supabase Dashboard > Project Settings > API
 */

const SUPABASE_CONFIG = {
    // Your Supabase Project URL
    PROJECT_URL: 'https://jgsrsjwmywiirtibofth.supabase.co',
    
    // Your Supabase Anon/Public Key (Safe for frontend)
    ANON_KEY: 'sb_publishable_5KtvO0cEHfnECBoyp2CQnw_RC3_x2me',
    
    // Bucket name (must exist and be PUBLIC)
    BUCKET_NAME: 'gallery_photos',
    
    // Folder path for Vimarsh gallery (photos/vimarsh/{year}/)
    FOLDER_PATH: 'photos/vimarsh',
    
    // Full storage URL pattern
    STORAGE_URL: 'https://jgsrsjwmywiirtibofth.supabase.co/storage/v1/object/public/gallery_photos/photos/vimarsh/'
};

// ================================================
// SUPABASE STORAGE CLIENT
// ================================================
class SupabaseGalleryClient {
    constructor(config) {
        this.projectUrl = config.PROJECT_URL;
        this.anonKey = config.ANON_KEY;
        this.bucketName = config.BUCKET_NAME;
        this.folderPath = config.FOLDER_PATH;
        this.storageUrl = config.STORAGE_URL;
    }

    /**
     * Get public URL for a file in the Vimarsh folder
     * @param {string} fileName - Name of the file (can include year subfolder)
     * @returns {string} Public URL
     */
    getPublicUrl(fileName) {
        // fileName can be just "image.jpg" or "2025/image.jpg"
        return `${this.storageUrl}${fileName}`;
    }

    /**
     * Fetch all files from the Vimarsh folder (all years)
     * @returns {Promise<Array>} Array of file objects
     */
    async listFiles() {
        try {
            // Years to search (2020-2026)
            const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
            const allFiles = [];
            
            // Fetch from each year subfolder
            for (const year of years) {
                const yearPath = `${this.folderPath}/${year}`;
                console.log(`🔍 Checking ${year}:`, yearPath);
                
                const url = `${this.projectUrl}/storage/v1/object/list/${this.bucketName}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.anonKey}`,
                        'apikey': this.anonKey
                    },
                    body: JSON.stringify({
                        prefix: yearPath,
                        limit: 1000,
                        offset: 0,
                        sortBy: { column: 'created_at', order: 'desc' }
                    })
                });

                if (!response.ok) {
                    continue;
                }

                const files = await response.json();
                
                // Filter image files
                const imageFiles = files.filter(file => 
                    file.name && 
                    !file.name.endsWith('/') && 
                    this.isImageFile(file.name)
                );
                
                console.log(`  ✅ Found ${imageFiles.length} images in ${year}`);
                
                // Add full path (year folder) to each file
                const filesWithPath = imageFiles.map(file => ({
                    ...file,
                    name: `${year}/${file.name}`,  // Add year folder to path
                    year: year  // Store year for easy access
                }));
                
                allFiles.push(...filesWithPath);
            }
            
            console.log(`📦 Total images from all years: ${allFiles.length}`);
            
            // Process all files
            const processed = allFiles.map(file => {
                // file.name is now "2025/image.jpg" (includes year folder)
                const pathParts = file.name.split('/');
                const fileName = pathParts[pathParts.length - 1];
                const year = file.year; // Year already stored from loop
                
                const result = {
                    name: fileName,
                    fullPath: file.name,  // e.g., "2025/image.jpg"
                    relativePath: file.name, // e.g., "2025/image.jpg"
                    year: year,
                    url: this.getPublicUrl(file.name), // Pass full path with year
                    size: file.metadata?.size || 0,
                    createdAt: file.created_at,
                    updatedAt: file.updated_at
                };
                
                return result;
            });
            
            console.log('✨ Processed files:', processed.length);
            console.log('📅 Years in data:', [...new Set(processed.map(f => f.year))]);

            return processed;

        } catch (error) {
            console.error('Error fetching gallery files:', error);
            throw error;
        }
    }

    /**
     * Check if file is an image based on extension
     * @param {string} fileName 
     * @returns {boolean}
     */
    isImageFile(fileName) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return imageExtensions.includes(ext);
    }

    /**
     * Upload a file to the Vimarsh folder
     * @param {File} file - File object from input
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} Upload result with public URL
     */
    async uploadFile(file, onProgress = null) {
        try {
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const filePath = `${this.folderPath}/${fileName}`;
            
            const url = `${this.projectUrl}/storage/v1/object/${this.bucketName}/${filePath}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.anonKey}`,
                    'apikey': this.anonKey,
                    'Content-Type': file.type
                },
                body: file
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Upload failed');
            }

            const result = await response.json();
            
            return {
                success: true,
                fileName: fileName,
                fullPath: filePath,
                publicUrl: this.getPublicUrl(fileName),
                size: file.size,
                type: file.type
            };

        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    /**
     * Delete a file from the Vimarsh folder
     * @param {string} fileName - Name of the file to delete
     * @returns {Promise<Object>}
     */
    async deleteFile(fileName) {
        try {
            const filePath = `${this.folderPath}/${fileName}`;
            const url = `${this.projectUrl}/storage/v1/object/${this.bucketName}/${filePath}`;
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.anonKey}`,
                    'apikey': this.anonKey
                }
            });

            if (!response.ok) {
                throw new Error('Delete failed');
            }

            return { success: true, fileName };

        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }
}

// Initialize the client
const galleryClient = new SupabaseGalleryClient(SUPABASE_CONFIG);

// Expose shared config/client for browser scripts
if (typeof window !== 'undefined') {
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.galleryClient = galleryClient;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_CONFIG, SupabaseGalleryClient, galleryClient };
}
