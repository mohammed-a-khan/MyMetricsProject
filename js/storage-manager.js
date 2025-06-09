/**
 * ADO Metrics Command Center - Storage Manager
 * Handles local storage, session storage, encryption, and data persistence
 */

// Storage constants
const STORAGE_PREFIX = 'ado_metrics_';
const CACHE_PREFIX = 'cache_';
const METADATA_KEY = 'storage_metadata';
const COMPRESSION_THRESHOLD = 1024; // Compress data larger than 1KB
const DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_MEMORY_CACHE_SIZE = 10 * 1024 * 1024; // 10MB
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Data Compression Utility
 */
class CompressionManager {
    /**
     * Compress data using built-in compression
     */
    static async compress(data) {
        try {
            const jsonString = JSON.stringify(data);
            if (jsonString.length < COMPRESSION_THRESHOLD) {
                return { compressed: false, data: jsonString };
            }

            // Simple LZ-style compression for browser compatibility
            const compressed = this.lzCompress(jsonString);
            return { 
                compressed: true, 
                data: compressed,
                originalSize: jsonString.length,
                compressedSize: compressed.length,
                ratio: (compressed.length / jsonString.length * 100).toFixed(2)
            };
        } catch (error) {
            console.error('Compression failed:', error);
            return { compressed: false, data: JSON.stringify(data) };
        }
    }

    /**
     * Decompress data
     */
    static async decompress(compressedData) {
        try {
            if (!compressedData.compressed) {
                return JSON.parse(compressedData.data);
            }

            const decompressed = this.lzDecompress(compressedData.data);
            return JSON.parse(decompressed);
        } catch (error) {
            console.error('Decompression failed:', error);
            throw new Error('Failed to decompress data');
        }
    }

    /**
     * Simple LZ-style compression
     */
    static lzCompress(str) {
        const dict = {};
        let data = str.split('');
        let out = [];
        let currChar;
        let phrase = data[0];
        let code = 256;

        for (let i = 1; i < data.length; i++) {
            currChar = data[i];
            if (dict[phrase + currChar] != null) {
                phrase += currChar;
            } else {
                if (phrase.length > 1) {
                    out.push(dict[phrase]);
                } else {
                    out.push(phrase.charCodeAt(0));
                }
                dict[phrase + currChar] = code;
                code++;
                phrase = currChar;
            }
        }

        if (phrase.length > 1) {
            out.push(dict[phrase]);
        } else {
            out.push(phrase.charCodeAt(0));
        }

        return out.join(',');
    }

    /**
     * Simple LZ-style decompression
     */
    static lzDecompress(str) {
        const dict = {};
        let data = str.split(',').map(num => parseInt(num));
        let currChar = String.fromCharCode(data[0]);
        let oldPhrase = currChar;
        let out = [currChar];
        let code = 256;

        for (let i = 1; i < data.length; i++) {
            let currCode = data[i];
            if (currCode < 256) {
                currChar = String.fromCharCode(currCode);
            } else {
                currChar = dict[currCode] ? dict[currCode] : (oldPhrase + oldPhrase.charAt(0));
            }
            out.push(currChar);
            dict[code] = oldPhrase + currChar.charAt(0);
            code++;
            oldPhrase = currChar;
        }

        return out.join('');
    }
}

/**
 * Browser Fingerprint Generator for Encryption
 */
class SecureBrowserFingerprint {
    static async generateEncryptionKey() {
        const components = await this.collectFingerprints();
        const fingerprintString = components.join('|');
        
        // Create a more secure hash
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprintString + 'ADO_METRICS_SALT_2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('').substring(0, 32); // Use first 32 characters as key
    }

    static async collectFingerprints() {
        const components = [];

        // Basic browser info
        components.push(navigator.userAgent);
        components.push(navigator.language);
        components.push(navigator.languages?.join(',') || '');
        components.push(navigator.platform);
        components.push(navigator.cookieEnabled.toString());

        // Screen info
        components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
        components.push(screen.pixelDepth.toString());

        // Timezone
        components.push(new Date().getTimezoneOffset().toString());
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

        // Hardware info
        components.push((navigator.hardwareConcurrency || 2).toString());
        components.push((navigator.maxTouchPoints || 0).toString());
        components.push((navigator.deviceMemory || 4).toString());

        // WebGL fingerprint
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
                    components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
                }
                components.push(gl.getParameter(gl.VERSION));
                components.push(gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
            }
        } catch (e) {
            components.push('webgl_unavailable');
        }

        // Canvas fingerprint
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('ADO Metrics Dashboard 🔒', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Secure Storage', 4, 45);
            components.push(canvas.toDataURL());
        } catch (e) {
            components.push('canvas_unavailable');
        }

        // Audio context fingerprint
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            components.push(audioContext.sampleRate.toString());
            components.push(audioContext.state);
            
            audioContext.close();
        } catch (e) {
            components.push('audio_unavailable');
        }

        return components;
    }
}

/**
 * Secure Storage Manager
 */
class SecureStorageManager {
    constructor() {
        this.encryptionKey = null;
        this.memoryCache = new Map();
        this.cacheMetadata = new Map();
        this.memoryCacheSize = 0;
        this.compressionEnabled = true;
        this.isInitialized = false;
        
        // Start cleanup interval
        this.startCleanupInterval();
    }

    /**
     * Initialize the storage manager
     */
    async initialize() {
        try {
            this.encryptionKey = await SecureBrowserFingerprint.generateEncryptionKey();
            await this.loadMetadata();
            await this.cleanupExpiredItems();
            this.isInitialized = true;
            console.log('SecureStorageManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SecureStorageManager:', error);
            throw error;
        }
    }

    /**
     * Store data securely
     */
    async setItem(key, value, ttl = DEFAULT_TTL) {
        if (!this.isInitialized) {
            throw new Error('StorageManager not initialized. Call initialize() first.');
        }

        try {
            const fullKey = STORAGE_PREFIX + key;
            const timestamp = Date.now();
            const expiresAt = timestamp + ttl;
            
            // Prepare data for storage
            const dataToStore = {
                value,
                timestamp,
                expiresAt,
                version: '1.0.0'
            };

            // Compress if enabled and data is large enough
            let compressedData = dataToStore;
            if (this.compressionEnabled) {
                compressedData = await CompressionManager.compress(dataToStore);
            }

            // Encrypt the data
            const encryptedData = await this.encrypt(compressedData);
            
            // Try to store in localStorage first
            try {
                localStorage.setItem(fullKey, JSON.stringify(encryptedData));
                
                // Update metadata
                await this.updateMetadata(key, {
                    stored: timestamp,
                    expires: expiresAt,
                    size: JSON.stringify(encryptedData).length
                });
                
            } catch (storageError) {
                console.warn('localStorage failed, using memory cache:', storageError);
                // Fallback to memory cache
                this.setMemoryCache(fullKey, encryptedData, ttl);
            }

            // Also cache in memory for faster access
            this.setMemoryCache(fullKey, compressedData, ttl);
            
            return true;
        } catch (error) {
            console.error('Failed to set item:', error);
            return false;
        }
    }

    /**
     * Retrieve data securely
     */
    async getItem(key) {
        if (!this.isInitialized) {
            throw new Error('StorageManager not initialized. Call initialize() first.');
        }

        try {
            const fullKey = STORAGE_PREFIX + key;
            
            // Check memory cache first
            const memoryData = this.getMemoryCache(fullKey);
            if (memoryData) {
                const decompressed = this.compressionEnabled ? 
                    await CompressionManager.decompress(memoryData) : memoryData;
                return decompressed.value;
            }

            // Try localStorage
            const storedData = localStorage.getItem(fullKey);
            if (!storedData) {
                return null;
            }

            // Decrypt the data
            const encryptedData = JSON.parse(storedData);
            let decryptedData = await this.decrypt(encryptedData);
            
            // Decompress if needed
            if (this.compressionEnabled && decryptedData.compressed) {
                decryptedData = await CompressionManager.decompress(decryptedData);
            }

            // Check if expired
            if (decryptedData.expiresAt && Date.now() > decryptedData.expiresAt) {
                await this.removeItem(key);
                return null;
            }

            // Cache in memory for future access
            this.setMemoryCache(fullKey, decryptedData, decryptedData.expiresAt - Date.now());
            
            return decryptedData.value;
        } catch (error) {
            console.error('Failed to get item:', error);
            return null;
        }
    }

    /**
     * Remove item from storage
     */
    async removeItem(key) {
        try {
            const fullKey = STORAGE_PREFIX + key;
            
            // Remove from localStorage
            localStorage.removeItem(fullKey);
            
            // Remove from memory cache
            this.memoryCache.delete(fullKey);
            this.cacheMetadata.delete(fullKey);
            
            // Update metadata
            await this.removeFromMetadata(key);
            
            return true;
        } catch (error) {
            console.error('Failed to remove item:', error);
            return false;
        }
    }

    /**
     * Clear all stored data
     */
    async clear() {
        try {
            // Clear localStorage items with our prefix
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(STORAGE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Clear memory cache
            this.memoryCache.clear();
            this.cacheMetadata.clear();
            this.memoryCacheSize = 0;
            
            // Clear metadata
            await this.clearMetadata();
            
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        const stats = {
            localStorage: {
                used: 0,
                available: 0,
                items: 0
            },
            memoryCache: {
                used: this.memoryCacheSize,
                items: this.memoryCache.size,
                maxSize: MAX_MEMORY_CACHE_SIZE
            },
            compression: {
                enabled: this.compressionEnabled,
                threshold: COMPRESSION_THRESHOLD
            }
        };

        // Calculate localStorage usage
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(STORAGE_PREFIX)) {
                    const value = localStorage.getItem(key);
                    stats.localStorage.used += key.length + (value ? value.length : 0);
                    stats.localStorage.items++;
                }
            }
        } catch (error) {
            console.error('Failed to calculate localStorage stats:', error);
        }

        return stats;
    }

    /**
     * Export configuration data
     */
    async exportData(includeCache = false) {
        const exportData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            data: {}
        };

        try {
            // Export main configuration data
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(STORAGE_PREFIX) && !key.includes(CACHE_PREFIX)) {
                    const originalKey = key.replace(STORAGE_PREFIX, '');
                    const value = await this.getItem(originalKey);
                    if (value) {
                        exportData.data[originalKey] = value;
                    }
                }
            }

            // Include cache data if requested
            if (includeCache) {
                exportData.cache = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(STORAGE_PREFIX + CACHE_PREFIX)) {
                        const originalKey = key.replace(STORAGE_PREFIX + CACHE_PREFIX, '');
                        const value = await this.getItem(CACHE_PREFIX + originalKey);
                        if (value) {
                            exportData.cache[originalKey] = value;
                        }
                    }
                }
            }

            return exportData;
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    /**
     * Import configuration data
     */
    async importData(importData) {
        try {
            if (!importData.version || !importData.data) {
                throw new Error('Invalid import data format');
            }

            // Import main data
            for (const [key, value] of Object.entries(importData.data)) {
                await this.setItem(key, value);
            }

            // Import cache data if present
            if (importData.cache) {
                for (const [key, value] of Object.entries(importData.cache)) {
                    await this.setItem(CACHE_PREFIX + key, value);
                }
            }

            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    /**
     * Encrypt data using XOR with browser fingerprint
     */
    async encrypt(data) {
        try {
            const dataString = JSON.stringify(data);
            const encrypted = this.xorEncrypt(dataString, this.encryptionKey);
            
            return {
                encrypted: true,
                data: encrypted,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    /**
     * Decrypt data using XOR with browser fingerprint
     */
    async decrypt(encryptedData) {
        try {
            if (!encryptedData.encrypted) {
                return encryptedData;
            }

            const decrypted = this.xorDecrypt(encryptedData.data, this.encryptionKey);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }

    /**
     * XOR encryption implementation
     */
    xorEncrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return btoa(result);
    }

    /**
     * XOR decryption implementation
     */
    xorDecrypt(encryptedText, key) {
        const text = atob(encryptedText);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return result;
    }

    /**
     * Memory cache management
     */
    setMemoryCache(key, value, ttl) {
        const dataSize = JSON.stringify(value).length;
        
        // Check if we need to free up space
        while (this.memoryCacheSize + dataSize > MAX_MEMORY_CACHE_SIZE && this.memoryCache.size > 0) {
            this.evictOldestFromMemoryCache();
        }

        const expiresAt = Date.now() + ttl;
        this.memoryCache.set(key, value);
        this.cacheMetadata.set(key, {
            expiresAt,
            size: dataSize,
            accessCount: 0,
            lastAccess: Date.now()
        });
        
        this.memoryCacheSize += dataSize;
    }

    getMemoryCache(key) {
        const metadata = this.cacheMetadata.get(key);
        if (!metadata) {
            return null;
        }

        // Check if expired
        if (Date.now() > metadata.expiresAt) {
            this.memoryCache.delete(key);
            this.cacheMetadata.delete(key);
            this.memoryCacheSize -= metadata.size;
            return null;
        }

        // Update access statistics
        metadata.accessCount++;
        metadata.lastAccess = Date.now();

        return this.memoryCache.get(key);
    }

    evictOldestFromMemoryCache() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, metadata] of this.cacheMetadata.entries()) {
            if (metadata.lastAccess < oldestTime) {
                oldestTime = metadata.lastAccess;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            const metadata = this.cacheMetadata.get(oldestKey);
            this.memoryCache.delete(oldestKey);
            this.cacheMetadata.delete(oldestKey);
            this.memoryCacheSize -= metadata.size;
        }
    }

    /**
     * Metadata management
     */
    async loadMetadata() {
        try {
            const metadataString = localStorage.getItem(STORAGE_PREFIX + METADATA_KEY);
            if (metadataString) {
                const metadata = JSON.parse(metadataString);
                // Process existing metadata if needed
            }
        } catch (error) {
            console.warn('Failed to load metadata:', error);
        }
    }

    async updateMetadata(key, info) {
        // Implementation for metadata tracking
        // This could include storage usage, access patterns, etc.
    }

    async removeFromMetadata(key) {
        // Implementation for removing metadata entries
    }

    async clearMetadata() {
        localStorage.removeItem(STORAGE_PREFIX + METADATA_KEY);
    }

    /**
     * Cleanup expired items
     */
    async cleanupExpiredItems() {
        const keysToRemove = [];
        
        // Check localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.expiresAt && Date.now() > data.expiresAt) {
                        keysToRemove.push(key);
                    }
                } catch (error) {
                    // Invalid data, remove it
                    keysToRemove.push(key);
                }
            }
        }

        // Remove expired items
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Cleanup memory cache
        for (const [key, metadata] of this.cacheMetadata.entries()) {
            if (Date.now() > metadata.expiresAt) {
                this.memoryCache.delete(key);
                this.cacheMetadata.delete(key);
                this.memoryCacheSize -= metadata.size;
            }
        }
    }

    /**
     * Start periodic cleanup
     */
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupExpiredItems();
        }, CLEANUP_INTERVAL);
    }
}

// Export the classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SecureStorageManager,
        CompressionManager,
        SecureBrowserFingerprint
    };
} else {
    window.SecureStorageManager = SecureStorageManager;
    window.CompressionManager = CompressionManager;
    window.SecureBrowserFingerprint = SecureBrowserFingerprint;
} 