/**
 * ADO Metrics Command Center - Real-Time Data Synchronization
 * Intelligent sync with incremental updates, change tracking, and offline support
 */

// Synchronization Configuration
const SYNC_CONFIG = {
    INTERVALS: {
        AUTO_REFRESH: 5 * 60 * 1000,      // 5 minutes default
        PRIORITY_SYNC: 30 * 1000,         // 30 seconds for viewed data
        BACKGROUND_SYNC: 10 * 60 * 1000,  // 10 minutes for background
        HEARTBEAT: 60 * 1000,             // 1 minute connectivity check
        RETRY_BASE: 2000                  // Base retry interval
    },
    BATCH_LIMITS: {
        UI_UPDATE_BATCH: 50,              // UI updates per batch
        SYNC_BATCH_SIZE: 100,             // Items per sync batch
        DEBOUNCE_DELAY: 300,              // UI update debounce
        MAX_RETRY_ATTEMPTS: 3             // Max retry attempts
    },
    STORAGE: {
        SYNC_TIMESTAMP_KEY: 'ado_last_sync',
        OFFLINE_QUEUE_KEY: 'ado_offline_queue',
        CACHE_VERSION_KEY: 'ado_cache_version',
        TTL_HOURS: 24                     // Cache TTL in hours
    },
    PRIORITIES: {
        CRITICAL: 1,    // Viewed data, user actions
        HIGH: 2,        // Recently accessed
        NORMAL: 3,      // Background data
        LOW: 4          // Archived/old data
    }
};

// Sync Status Constants
const SYNC_STATUS = {
    IDLE: 'idle',
    SYNCING: 'syncing',
    OFFLINE: 'offline',
    ERROR: 'error',
    PAUSED: 'paused'
};

/**
 * Change Tracker for detecting and managing data changes
 */
class ChangeTracker {
    constructor() {
        this.lastSyncTimestamp = this.getLastSyncTimestamp();
        this.changeHistory = new Map();
        this.conflictResolver = new ConflictResolver();
        this.pendingChanges = new Map();
    }

    getLastSyncTimestamp() {
        const stored = localStorage.getItem(SYNC_CONFIG.STORAGE.SYNC_TIMESTAMP_KEY);
        return stored ? new Date(stored) : new Date(0);
    }

    setLastSyncTimestamp(timestamp = new Date()) {
        this.lastSyncTimestamp = timestamp;
        localStorage.setItem(SYNC_CONFIG.STORAGE.SYNC_TIMESTAMP_KEY, timestamp.toISOString());
    }

    trackChange(itemId, itemType, changeType, data, timestamp = new Date()) {
        const changeKey = `${itemType}_${itemId}`;
        
        const change = {
            itemId,
            itemType,
            changeType, // 'created', 'updated', 'deleted'
            data,
            timestamp,
            local: false,
            synced: false
        };

        this.changeHistory.set(changeKey, change);
        this.pendingChanges.set(changeKey, change);
        
        console.log(`[CHANGE_TRACKER] Tracked ${changeType} for ${itemType} ${itemId}`);
        return change;
    }

    getChangedItemsSince(timestamp, itemType = null) {
        const changes = Array.from(this.changeHistory.values())
            .filter(change => {
                const afterTimestamp = change.timestamp > timestamp;
                const matchesType = !itemType || change.itemType === itemType;
                return afterTimestamp && matchesType;
            })
            .sort((a, b) => a.timestamp - b.timestamp);

        return changes;
    }

    detectChanges(currentItems, previousItems, itemType) {
        const changes = [];
        const currentMap = new Map(currentItems.map(item => [item.id, item]));
        const previousMap = new Map(previousItems.map(item => [item.id, item]));

        // Detect updates and creations
        for (const [id, currentItem] of currentMap) {
            const previousItem = previousMap.get(id);
            
            if (!previousItem) {
                // New item
                changes.push(this.trackChange(id, itemType, 'created', currentItem));
            } else if (this.hasItemChanged(currentItem, previousItem)) {
                // Updated item
                changes.push(this.trackChange(id, itemType, 'updated', {
                    current: currentItem,
                    previous: previousItem,
                    changes: this.getItemDifferences(currentItem, previousItem)
                }));
            }
        }

        // Detect deletions
        for (const [id, previousItem] of previousMap) {
            if (!currentMap.has(id)) {
                changes.push(this.trackChange(id, itemType, 'deleted', previousItem));
            }
        }

        return changes;
    }

    hasItemChanged(current, previous) {
        if (!previous) return true;
        
        // Compare modification dates
        const currentModified = new Date(current.changedDate || current.modifiedDate);
        const previousModified = new Date(previous.changedDate || previous.modifiedDate);
        
        if (currentModified > previousModified) return true;
        
        // Deep comparison of key fields
        const keyFields = ['state', 'assignedTo', 'storyPoints', 'title', 'description'];
        return keyFields.some(field => 
            JSON.stringify(current[field]) !== JSON.stringify(previous[field])
        );
    }

    getItemDifferences(current, previous) {
        const differences = {};
        
        for (const key in current) {
            if (current[key] !== previous[key]) {
                differences[key] = {
                    from: previous[key],
                    to: current[key]
                };
            }
        }
        
        return differences;
    }

    markChangesSynced(changes) {
        changes.forEach(change => {
            const changeKey = `${change.itemType}_${change.itemId}`;
            if (this.pendingChanges.has(changeKey)) {
                this.pendingChanges.delete(changeKey);
            }
            
            const tracked = this.changeHistory.get(changeKey);
            if (tracked) {
                tracked.synced = true;
            }
        });
    }

    getPendingChanges() {
        return Array.from(this.pendingChanges.values());
    }

    clearChangeHistory(olderThan = null) {
        if (!olderThan) {
            olderThan = new Date(Date.now() - (SYNC_CONFIG.STORAGE.TTL_HOURS * 60 * 60 * 1000));
        }

        for (const [key, change] of this.changeHistory) {
            if (change.timestamp < olderThan && change.synced) {
                this.changeHistory.delete(key);
            }
        }
    }
}

/**
 * Conflict Resolver for handling concurrent modifications
 */
class ConflictResolver {
    constructor() {
        this.resolutionStrategies = new Map([
            ['automatic', this.resolveAutomatic.bind(this)],
            ['lastWriteWins', this.resolveLastWriteWins.bind(this)],
            ['fieldLevel', this.resolveFieldLevel.bind(this)],
            ['userPrompt', this.resolveWithUserPrompt.bind(this)]
        ]);
        
        this.defaultStrategy = 'fieldLevel';
    }

    resolveConflict(localItem, remoteItem, conflictType = 'concurrent') {
        console.log(`[CONFLICT_RESOLVER] Resolving ${conflictType} conflict for item ${localItem.id}`);
        
        const strategy = this.getResolutionStrategy(localItem, remoteItem, conflictType);
        return this.resolutionStrategies.get(strategy)(localItem, remoteItem);
    }

    getResolutionStrategy(localItem, remoteItem, conflictType) {
        // Determine strategy based on conflict type and data
        if (conflictType === 'concurrent' && this.canAutoResolve(localItem, remoteItem)) {
            return 'fieldLevel';
        }
        
        if (this.isSimpleUpdate(localItem, remoteItem)) {
            return 'lastWriteWins';
        }
        
        return this.defaultStrategy;
    }

    resolveAutomatic(localItem, remoteItem) {
        // Simple automatic resolution
        const resolved = { ...remoteItem };
        
        // Preserve local changes that don't conflict
        const nonConflictingFields = ['tags', 'description'];
        nonConflictingFields.forEach(field => {
            if (localItem[field] && localItem[field] !== remoteItem[field]) {
                resolved[field] = localItem[field];
            }
        });
        
        return {
            resolved,
            strategy: 'automatic',
            conflicts: []
        };
    }

    resolveLastWriteWins(localItem, remoteItem) {
        const localTime = new Date(localItem.changedDate || localItem.modifiedDate);
        const remoteTime = new Date(remoteItem.changedDate || remoteItem.modifiedDate);
        
        const winner = localTime > remoteTime ? localItem : remoteItem;
        
        return {
            resolved: winner,
            strategy: 'lastWriteWins',
            winner: localTime > remoteTime ? 'local' : 'remote'
        };
    }

    resolveFieldLevel(localItem, remoteItem) {
        const resolved = { ...remoteItem };
        const conflicts = [];
        
        // Field-level resolution rules
        const fieldRules = {
            'assignedTo': 'remote', // Server authoritative
            'state': 'remote',      // Server authoritative
            'storyPoints': 'local', // User input preferred
            'description': 'merge', // Attempt to merge
            'tags': 'merge'         // Merge tags
        };
        
        for (const [field, rule] of Object.entries(fieldRules)) {
            if (localItem[field] !== remoteItem[field]) {
                switch (rule) {
                    case 'local':
                        resolved[field] = localItem[field];
                        break;
                    case 'remote':
                        resolved[field] = remoteItem[field];
                        break;
                    case 'merge':
                        resolved[field] = this.mergeField(
                            localItem[field], 
                            remoteItem[field], 
                            field
                        );
                        break;
                }
                
                conflicts.push({
                    field,
                    local: localItem[field],
                    remote: remoteItem[field],
                    resolved: resolved[field],
                    rule
                });
            }
        }
        
        return {
            resolved,
            strategy: 'fieldLevel',
            conflicts
        };
    }

    resolveWithUserPrompt(localItem, remoteItem) {
        // Return data for UI to handle user resolution
        return {
            resolved: null,
            strategy: 'userPrompt',
            needsUserInput: true,
            localItem,
            remoteItem,
            conflicts: this.identifyConflicts(localItem, remoteItem)
        };
    }

    mergeField(localValue, remoteValue, fieldName) {
        if (fieldName === 'tags') {
            // Merge tags by combining unique values
            const localTags = (localValue || '').split(';').filter(t => t.trim());
            const remoteTags = (remoteValue || '').split(';').filter(t => t.trim());
            const mergedTags = [...new Set([...localTags, ...remoteTags])];
            return mergedTags.join('; ');
        }
        
        if (fieldName === 'description') {
            // Simple concatenation for descriptions
            if (localValue && remoteValue && localValue !== remoteValue) {
                return `${remoteValue}\n\n[Local addition]: ${localValue}`;
            }
        }
        
        // Default to remote value
        return remoteValue;
    }

    canAutoResolve(localItem, remoteItem) {
        // Check if conflicts can be resolved automatically
        const criticalFields = ['id', 'workItemType', 'state'];
        
        for (const field of criticalFields) {
            if (localItem[field] !== remoteItem[field] && 
                field !== 'state') { // State changes are common
                return false;
            }
        }
        
        return true;
    }

    isSimpleUpdate(localItem, remoteItem) {
        // Check if this is a simple update vs complex conflict
        const localTime = new Date(localItem.changedDate || 0);
        const remoteTime = new Date(remoteItem.changedDate || 0);
        
        // If times are very close, likely simple update
        return Math.abs(localTime - remoteTime) < 5000; // 5 seconds
    }

    identifyConflicts(localItem, remoteItem) {
        const conflicts = [];
        
        for (const key in localItem) {
            if (localItem[key] !== remoteItem[key]) {
                conflicts.push({
                    field: key,
                    local: localItem[key],
                    remote: remoteItem[key]
                });
            }
        }
        
        return conflicts;
    }
}

/**
 * Offline Queue Manager for handling offline scenarios
 */
class OfflineQueueManager {
    constructor() {
        this.queue = this.loadOfflineQueue();
        this.isOnline = navigator.onLine;
        this.setupNetworkListeners();
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('[OFFLINE_QUEUE] Back online, processing queue');
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('[OFFLINE_QUEUE] Gone offline, queuing updates');
        });
    }

    loadOfflineQueue() {
        try {
            const stored = localStorage.getItem(SYNC_CONFIG.STORAGE.OFFLINE_QUEUE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('[OFFLINE_QUEUE] Failed to load queue:', error);
            return [];
        }
    }

    saveOfflineQueue() {
        try {
            localStorage.setItem(
                SYNC_CONFIG.STORAGE.OFFLINE_QUEUE_KEY, 
                JSON.stringify(this.queue)
            );
        } catch (error) {
            console.error('[OFFLINE_QUEUE] Failed to save queue:', error);
        }
    }

    enqueue(operation) {
        const queueItem = {
            id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            operation,
            timestamp: new Date(),
            attempts: 0,
            priority: operation.priority || SYNC_CONFIG.PRIORITIES.NORMAL
        };

        this.queue.push(queueItem);
        this.queue.sort((a, b) => a.priority - b.priority); // Sort by priority
        this.saveOfflineQueue();
        
        console.log(`[OFFLINE_QUEUE] Queued operation: ${operation.type}`);
        
        // Try to process immediately if online
        if (this.isOnline) {
            this.processQueue();
        }
        
        return queueItem.id;
    }

    async processQueue() {
        if (!this.isOnline || this.queue.length === 0) {
            return;
        }

        console.log(`[OFFLINE_QUEUE] Processing ${this.queue.length} queued operations`);
        
        const processedItems = [];
        
        for (const item of this.queue) {
            try {
                await this.processQueueItem(item);
                processedItems.push(item);
            } catch (error) {
                item.attempts++;
                item.lastError = error.message;
                
                if (item.attempts >= SYNC_CONFIG.BATCH_LIMITS.MAX_RETRY_ATTEMPTS) {
                    console.error(`[OFFLINE_QUEUE] Failed to process item after ${item.attempts} attempts:`, error);
                    processedItems.push(item); // Remove failed items
                }
            }
        }

        // Remove processed items
        this.queue = this.queue.filter(item => !processedItems.includes(item));
        this.saveOfflineQueue();
        
        console.log(`[OFFLINE_QUEUE] Processed ${processedItems.length} operations, ${this.queue.length} remaining`);
    }

    async processQueueItem(item) {
        const { operation } = item;
        
        switch (operation.type) {
            case 'sync':
                return await this.processSyncOperation(operation);
            case 'update':
                return await this.processUpdateOperation(operation);
            case 'create':
                return await this.processCreateOperation(operation);
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }

    async processSyncOperation(operation) {
        // Delegate to sync manager
        if (window.dataSyncManager) {
            return await window.dataSyncManager.performSync(operation.options);
        }
        throw new Error('DataSyncManager not available');
    }

    async processUpdateOperation(operation) {
        // Process data update operation
        console.log(`[OFFLINE_QUEUE] Processing update for ${operation.itemType} ${operation.itemId}`);
        // Implementation would depend on the specific update type
        return { success: true, operation };
    }

    async processCreateOperation(operation) {
        // Process data creation operation
        console.log(`[OFFLINE_QUEUE] Processing creation of ${operation.itemType}`);
        // Implementation would depend on the specific creation type
        return { success: true, operation };
    }

    getQueueStatus() {
        return {
            isOnline: this.isOnline,
            queueLength: this.queue.length,
            pendingOperations: this.queue.map(item => ({
                id: item.id,
                type: item.operation.type,
                timestamp: item.timestamp,
                attempts: item.attempts,
                priority: item.priority
            }))
        };
    }

    clearQueue() {
        this.queue = [];
        this.saveOfflineQueue();
        console.log('[OFFLINE_QUEUE] Queue cleared');
    }

    removeQueueItem(itemId) {
        this.queue = this.queue.filter(item => item.id !== itemId);
        this.saveOfflineQueue();
    }
}

/**
 * UI Update Manager for smooth, batched UI updates
 */
class UIUpdateManager {
    constructor() {
        this.pendingUpdates = new Map();
        this.updateQueue = [];
        this.debounceTimer = null;
        this.isUpdating = false;
        this.animationQueue = [];
        
        this.setupAnimationFrame();
    }

    setupAnimationFrame() {
        this.rafCallback = () => {
            if (this.animationQueue.length > 0) {
                this.processAnimationQueue();
                requestAnimationFrame(this.rafCallback);
            }
        };
    }

    scheduleUpdate(itemType, itemId, updateData, priority = SYNC_CONFIG.PRIORITIES.NORMAL) {
        const updateKey = `${itemType}_${itemId}`;
        
        this.pendingUpdates.set(updateKey, {
            itemType,
            itemId,
            updateData,
            priority,
            timestamp: Date.now()
        });

        this.debounceUpdates();
    }

    debounceUpdates() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.processPendingUpdates();
        }, SYNC_CONFIG.BATCH_LIMITS.DEBOUNCE_DELAY);
    }

    async processPendingUpdates() {
        if (this.isUpdating || this.pendingUpdates.size === 0) {
            return;
        }

        this.isUpdating = true;
        console.log(`[UI_UPDATE] Processing ${this.pendingUpdates.size} pending updates`);

        try {
            // Sort updates by priority
            const updates = Array.from(this.pendingUpdates.values())
                .sort((a, b) => a.priority - b.priority);

            // Process in batches
            const batches = this.createBatches(updates, SYNC_CONFIG.BATCH_LIMITS.UI_UPDATE_BATCH);
            
            for (const batch of batches) {
                await this.processBatch(batch);
                await this.yieldToUI(); // Allow UI breathing room
            }

            this.pendingUpdates.clear();
            
        } catch (error) {
            console.error('[UI_UPDATE] Error processing updates:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    async processBatch(updates) {
        const animations = [];

        for (const update of updates) {
            try {
                const result = await this.applyUpdate(update);
                if (result.shouldAnimate) {
                    animations.push(result.animation);
                }
            } catch (error) {
                console.error(`[UI_UPDATE] Failed to apply update for ${update.itemType} ${update.itemId}:`, error);
            }
        }

        // Queue animations
        if (animations.length > 0) {
            this.queueAnimations(animations);
        }
    }

    async applyUpdate(update) {
        const { itemType, itemId, updateData } = update;
        
        // Find DOM elements to update
        const elements = this.findElementsForItem(itemType, itemId);
        const animations = [];

        for (const element of elements) {
            const animation = this.updateElement(element, updateData, itemType);
            if (animation) {
                animations.push(animation);
            }
        }

        return {
            shouldAnimate: animations.length > 0,
            animation: animations
        };
    }

    findElementsForItem(itemType, itemId) {
        const selectors = [
            `[data-item-id="${itemId}"]`,
            `[data-${itemType.toLowerCase()}-id="${itemId}"]`,
            `.item-${itemId}`,
            `#item-${itemId}`
        ];

        const elements = [];
        for (const selector of selectors) {
            elements.push(...document.querySelectorAll(selector));
        }

        return [...new Set(elements)]; // Remove duplicates
    }

    updateElement(element, updateData, itemType) {
        if (!element) return null;

        const animations = [];

        // Update text content
        if (updateData.title) {
            const titleEl = element.querySelector('.item-title, .title, h3, h4');
            if (titleEl && titleEl.textContent !== updateData.title) {
                this.animateTextChange(titleEl, updateData.title);
                animations.push({ type: 'text', element: titleEl });
            }
        }

        // Update state
        if (updateData.state) {
            const stateEl = element.querySelector('.item-state, .state, .status');
            if (stateEl) {
                this.updateStateElement(stateEl, updateData.state);
                animations.push({ type: 'state', element: stateEl });
            }
        }

        // Update assignee
        if (updateData.assignedTo) {
            const assigneeEl = element.querySelector('.item-assignee, .assignee');
            if (assigneeEl) {
                this.updateAssigneeElement(assigneeEl, updateData.assignedTo);
                animations.push({ type: 'assignee', element: assigneeEl });
            }
        }

        // Update story points
        if (updateData.storyPoints !== undefined) {
            const pointsEl = element.querySelector('.story-points, .points');
            if (pointsEl) {
                this.animateNumberChange(pointsEl, updateData.storyPoints);
                animations.push({ type: 'points', element: pointsEl });
            }
        }

        // Add update indicator
        this.addUpdateIndicator(element);

        return animations.length > 0 ? animations : null;
    }

    animateTextChange(element, newText) {
        element.style.transition = 'opacity 0.2s ease';
        element.style.opacity = '0.5';
        
        setTimeout(() => {
            element.textContent = newText;
            element.style.opacity = '1';
        }, 200);
    }

    animateNumberChange(element, newValue) {
        const currentValue = parseInt(element.textContent) || 0;
        
        if (currentValue !== newValue) {
            element.style.transition = 'transform 0.3s ease, color 0.3s ease';
            element.style.transform = 'scale(1.1)';
            element.style.color = newValue > currentValue ? '#28a745' : '#dc3545';
            
            setTimeout(() => {
                element.textContent = newValue;
                element.style.transform = 'scale(1)';
                element.style.color = '';
            }, 150);
        }
    }

    updateStateElement(element, newState) {
        element.textContent = newState;
        element.className = element.className.replace(/state-\w+/g, '');
        element.classList.add(`state-${newState.toLowerCase().replace(/\s+/g, '-')}`);
        
        // Flash animation
        element.style.transition = 'background-color 0.3s ease';
        element.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
        
        setTimeout(() => {
            element.style.backgroundColor = '';
        }, 300);
    }

    updateAssigneeElement(element, assignee) {
        const displayName = typeof assignee === 'object' ? assignee.displayName : assignee;
        element.textContent = displayName;
        
        // Pulse animation
        element.style.transition = 'opacity 0.2s ease';
        element.style.opacity = '0.7';
        
        setTimeout(() => {
            element.style.opacity = '1';
        }, 200);
    }

    addUpdateIndicator(element) {
        // Remove existing indicators
        const existingIndicator = element.querySelector('.update-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Add new indicator
        const indicator = document.createElement('div');
        indicator.className = 'update-indicator';
        indicator.innerHTML = '●';
        indicator.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            color: #28a745;
            font-size: 12px;
            animation: pulse 1s ease-in-out;
            z-index: 10;
        `;

        element.style.position = 'relative';
        element.appendChild(indicator);

        // Remove indicator after animation
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 2000);
    }

    queueAnimations(animations) {
        this.animationQueue.push(...animations);
        
        if (this.animationQueue.length > 0) {
            requestAnimationFrame(this.rafCallback);
        }
    }

    processAnimationQueue() {
        const batch = this.animationQueue.splice(0, 10); // Process 10 animations per frame
        
        batch.forEach(animation => {
            try {
                this.executeAnimation(animation);
            } catch (error) {
                console.error('[UI_UPDATE] Animation error:', error);
            }
        });
    }

    executeAnimation(animation) {
        // Additional animation logic if needed
        // Most animations are handled in the update methods
    }

    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    async yieldToUI() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    updateSyncStatus(status, lastSyncTime = null) {
        const statusElements = document.querySelectorAll('.sync-status');
        const timeElements = document.querySelectorAll('.last-sync-time');
        
        statusElements.forEach(el => {
            el.textContent = this.formatSyncStatus(status);
            el.className = `sync-status sync-${status}`;
        });

        if (lastSyncTime) {
            timeElements.forEach(el => {
                el.textContent = this.formatLastSyncTime(lastSyncTime);
            });
        }
    }

    formatSyncStatus(status) {
        const statusMap = {
            [SYNC_STATUS.IDLE]: '✓ Up to date',
            [SYNC_STATUS.SYNCING]: '⟲ Syncing...',
            [SYNC_STATUS.OFFLINE]: '⚠ Offline',
            [SYNC_STATUS.ERROR]: '✗ Sync error',
            [SYNC_STATUS.PAUSED]: '⏸ Paused'
        };
        
        return statusMap[status] || status;
    }

    formatLastSyncTime(timestamp) {
        const now = new Date();
        const syncTime = new Date(timestamp);
        const diffMs = now - syncTime;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        return syncTime.toLocaleDateString();
    }
}

/**
 * Main Data Synchronization Manager
 */
class DataSyncManager {
    constructor() {
        this.dataFetcher = window.dataFetcher;
        this.changeTracker = new ChangeTracker();
        this.offlineQueue = new OfflineQueueManager();
        this.uiUpdater = new UIUpdateManager();
        
        this.status = SYNC_STATUS.IDLE;
        this.syncInterval = null;
        this.priorityInterval = null;
        this.heartbeatInterval = null;
        
        this.currentData = new Map();
        this.syncCallbacks = new Map();
        this.priorityItems = new Set();
        
        this.config = {
            autoRefreshInterval: SYNC_CONFIG.INTERVALS.AUTO_REFRESH,
            prioritySyncInterval: SYNC_CONFIG.INTERVALS.PRIORITY_SYNC,
            enableBackgroundSync: true,
            enableIncrementalSync: true,
            enableDeltaSync: true,
            compressionEnabled: true
        };

        this.init();
    }

    async init() {
        console.log('[DATA_SYNC] Initializing DataSyncManager');
        
        try {
            // Load initial data
            await this.performFullSync();
            
            // Start sync intervals
            this.startAutoSync();
            this.startPrioritySync();
            this.startHeartbeat();
            
            // Setup WebSocket preparation
            this.prepareWebSocketSupport();
            
            console.log('[DATA_SYNC] DataSyncManager initialized successfully');
            
        } catch (error) {
            console.error('[DATA_SYNC] Initialization failed:', error);
            this.status = SYNC_STATUS.ERROR;
        }
    }

    /**
     * Sync Strategies Implementation
     */
    async performFullSync(options = {}) {
        console.log('[DATA_SYNC] Performing full sync');
        this.setStatus(SYNC_STATUS.SYNCING);
        
        try {
            const syncStartTime = Date.now();
            
            // Fetch all data
            const newData = await this.dataFetcher.fetchAllData(options);
            
            // Compare with current data and detect changes
            const changes = this.detectAllChanges(newData);
            
            // Update current data
            this.updateCurrentData(newData);
            
            // Update UI with changes
            await this.applyUIUpdates(changes);
            
            // Update sync timestamp
            this.changeTracker.setLastSyncTimestamp();
            
            const syncDuration = Date.now() - syncStartTime;
            console.log(`[DATA_SYNC] Full sync completed in ${syncDuration}ms, ${changes.length} changes detected`);
            
            this.setStatus(SYNC_STATUS.IDLE);
            this.notifySyncCallbacks('fullSync', { changes, duration: syncDuration });
            
            return { changes, duration: syncDuration };
            
        } catch (error) {
            console.error('[DATA_SYNC] Full sync failed:', error);
            this.setStatus(SYNC_STATUS.ERROR);
            this.handleSyncError(error, 'fullSync');
            throw error;
        }
    }

    async performIncrementalSync(options = {}) {
        if (!this.config.enableIncrementalSync) {
            return this.performFullSync(options);
        }

        console.log('[DATA_SYNC] Performing incremental sync');
        this.setStatus(SYNC_STATUS.SYNCING);
        
        try {
            const lastSync = this.changeTracker.lastSyncTimestamp;
            const syncOptions = {
                ...options,
                modifiedSince: lastSync.toISOString()
            };
            
            // Fetch only changed items
            const changedData = await this.fetchChangedItems(syncOptions);
            
            if (changedData.length === 0) {
                console.log('[DATA_SYNC] No changes detected in incremental sync');
                this.setStatus(SYNC_STATUS.IDLE);
                return { changes: [], duration: 0 };
            }
            
            // Process changes
            const changes = await this.processIncrementalChanges(changedData);
            
            // Update UI
            await this.applyUIUpdates(changes);
            
            // Update timestamp
            this.changeTracker.setLastSyncTimestamp();
            
            console.log(`[DATA_SYNC] Incremental sync completed, ${changes.length} changes processed`);
            this.setStatus(SYNC_STATUS.IDLE);
            this.notifySyncCallbacks('incrementalSync', { changes });
            
            return { changes };
            
        } catch (error) {
            console.error('[DATA_SYNC] Incremental sync failed:', error);
            this.setStatus(SYNC_STATUS.ERROR);
            this.handleSyncError(error, 'incrementalSync');
            throw error;
        }
    }

    async performDeltaSync(itemIds = []) {
        if (!this.config.enableDeltaSync || itemIds.length === 0) {
            return { changes: [] };
        }

        console.log(`[DATA_SYNC] Performing delta sync for ${itemIds.length} items`);
        
        try {
            // Fetch specific items
            const items = await this.fetchSpecificItems(itemIds);
            
            // Process delta changes
            const changes = await this.processDeltaChanges(items);
            
            // Update UI for changed items only
            await this.applyUIUpdates(changes);
            
            this.notifySyncCallbacks('deltaSync', { changes, itemIds });
            
            return { changes };
            
        } catch (error) {
            console.error('[DATA_SYNC] Delta sync failed:', error);
            this.handleSyncError(error, 'deltaSync');
            throw error;
        }
    }

    async performPrioritySync() {
        if (this.priorityItems.size === 0) {
            return;
        }

        console.log(`[DATA_SYNC] Performing priority sync for ${this.priorityItems.size} items`);
        
        const priorityItemIds = Array.from(this.priorityItems);
        this.priorityItems.clear();
        
        return this.performDeltaSync(priorityItemIds);
    }

    /**
     * Change Detection and Processing
     */
    detectAllChanges(newData) {
        const allChanges = [];
        
        // Detect work item changes
        if (newData.workItems?.workItems) {
            const currentWorkItems = this.currentData.get('workItems') || [];
            const workItemChanges = this.changeTracker.detectChanges(
                newData.workItems.workItems,
                currentWorkItems,
                'workItem'
            );
            allChanges.push(...workItemChanges);
        }
        
        // Detect bug changes
        if (newData.bugs?.bugs) {
            const currentBugs = this.currentData.get('bugs') || [];
            const bugChanges = this.changeTracker.detectChanges(
                newData.bugs.bugs,
                currentBugs,
                'bug'
            );
            allChanges.push(...bugChanges);
        }
        
        // Detect test case changes
        if (newData.testData?.testCases) {
            const currentTestCases = this.currentData.get('testCases') || [];
            const testChanges = this.changeTracker.detectChanges(
                newData.testData.testCases,
                currentTestCases,
                'testCase'
            );
            allChanges.push(...testChanges);
        }
        
        return allChanges;
    }

    async fetchChangedItems(options) {
        // This would need API support for modified-since queries
        // For now, fall back to full sync
        console.log('[DATA_SYNC] Modified-since API not available, performing full sync');
        const fullData = await this.dataFetcher.fetchAllData(options);
        return this.filterChangedItems(fullData, options.modifiedSince);
    }

    filterChangedItems(data, modifiedSince) {
        const cutoffDate = new Date(modifiedSince);
        const changedItems = [];
        
        // Filter work items
        if (data.workItems?.workItems) {
            const changedWorkItems = data.workItems.workItems.filter(item => 
                new Date(item.changedDate || item.modifiedDate) > cutoffDate
            );
            if (changedWorkItems.length > 0) {
                changedItems.push({ type: 'workItems', items: changedWorkItems });
            }
        }
        
        // Filter bugs
        if (data.bugs?.bugs) {
            const changedBugs = data.bugs.bugs.filter(item => 
                new Date(item.changedDate || item.modifiedDate) > cutoffDate
            );
            if (changedBugs.length > 0) {
                changedItems.push({ type: 'bugs', items: changedBugs });
            }
        }
        
        // Filter test cases
        if (data.testData?.testCases) {
            const changedTestCases = data.testData.testCases.filter(item => 
                new Date(item.changedDate || item.modifiedDate) > cutoffDate
            );
            if (changedTestCases.length > 0) {
                changedItems.push({ type: 'testCases', items: changedTestCases });
            }
        }
        
        return changedItems;
    }

    async fetchSpecificItems(itemIds) {
        // Fetch specific work items by ID
        const items = [];
        
        // This would use specific API calls for individual items
        // For now, filter from current data
        for (const itemId of itemIds) {
            const item = this.findItemById(itemId);
            if (item) {
                items.push(item);
            }
        }
        
        return items;
    }

    findItemById(itemId) {
        // Search through all current data for the item
        for (const [dataType, dataArray] of this.currentData) {
            if (Array.isArray(dataArray)) {
                const item = dataArray.find(item => item.id === itemId);
                if (item) {
                    return { ...item, dataType };
                }
            }
        }
        return null;
    }

    async processIncrementalChanges(changedData) {
        const allChanges = [];
        
        for (const dataGroup of changedData) {
            const { type, items } = dataGroup;
            const currentItems = this.currentData.get(type) || [];
            
            for (const newItem of items) {
                const existingItem = currentItems.find(item => item.id === newItem.id);
                
                if (!existingItem) {
                    // New item
                    allChanges.push(this.changeTracker.trackChange(
                        newItem.id, type, 'created', newItem
                    ));
                } else if (this.changeTracker.hasItemChanged(newItem, existingItem)) {
                    // Handle potential conflict
                    const resolved = await this.resolveConflict(existingItem, newItem);
                    allChanges.push(this.changeTracker.trackChange(
                        newItem.id, type, 'updated', {
                            current: resolved,
                            previous: existingItem,
                            changes: this.changeTracker.getItemDifferences(resolved, existingItem)
                        }
                    ));
                }
            }
        }
        
        return allChanges;
    }

    async processDeltaChanges(items) {
        const changes = [];
        
        for (const item of items) {
            const currentItem = this.findCurrentItem(item.id, item.dataType);
            
            if (currentItem && this.changeTracker.hasItemChanged(item, currentItem)) {
                const resolved = await this.resolveConflict(currentItem, item);
                changes.push(this.changeTracker.trackChange(
                    item.id, item.dataType, 'updated', {
                        current: resolved,
                        previous: currentItem,
                        changes: this.changeTracker.getItemDifferences(resolved, currentItem)
                    }
                ));
            }
        }
        
        return changes;
    }

    findCurrentItem(itemId, dataType) {
        const dataArray = this.currentData.get(dataType);
        return dataArray ? dataArray.find(item => item.id === itemId) : null;
    }

    async resolveConflict(localItem, remoteItem) {
        return this.changeTracker.conflictResolver.resolveConflict(localItem, remoteItem);
    }

    /**
     * Data Management
     */
    updateCurrentData(newData) {
        if (newData.workItems?.workItems) {
            this.currentData.set('workItems', newData.workItems.workItems);
        }
        
        if (newData.bugs?.bugs) {
            this.currentData.set('bugs', newData.bugs.bugs);
        }
        
        if (newData.testData?.testCases) {
            this.currentData.set('testCases', newData.testData.testCases);
        }
        
        // Update other data types as needed
        ['iterations', 'teamMembers', 'testResults'].forEach(key => {
            if (newData[key]) {
                this.currentData.set(key, newData[key]);
            }
        });
    }

    async applyUIUpdates(changes) {
        for (const change of changes) {
            this.uiUpdater.scheduleUpdate(
                change.itemType,
                change.itemId,
                change.changeType === 'updated' ? change.data.current : change.data,
                SYNC_CONFIG.PRIORITIES.HIGH
            );
        }
        
        // Update sync status in UI
        this.uiUpdater.updateSyncStatus(this.status, new Date());
    }

    /**
     * Sync Control Methods
     */
    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (this.status === SYNC_STATUS.IDLE && this.config.enableBackgroundSync) {
                this.performIncrementalSync().catch(error => {
                    console.error('[DATA_SYNC] Auto sync failed:', error);
                });
            }
        }, this.config.autoRefreshInterval);
        
        console.log(`[DATA_SYNC] Auto sync started (${this.config.autoRefreshInterval / 1000}s interval)`);
    }

    startPrioritySync() {
        if (this.priorityInterval) {
            clearInterval(this.priorityInterval);
        }
        
        this.priorityInterval = setInterval(() => {
            if (this.status === SYNC_STATUS.IDLE) {
                this.performPrioritySync().catch(error => {
                    console.error('[DATA_SYNC] Priority sync failed:', error);
                });
            }
        }, this.config.prioritySyncInterval);
        
        console.log(`[DATA_SYNC] Priority sync started (${this.config.prioritySyncInterval / 1000}s interval)`);
    }

    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        this.heartbeatInterval = setInterval(() => {
            this.checkConnectivity();
        }, SYNC_CONFIG.INTERVALS.HEARTBEAT);
        
        console.log(`[DATA_SYNC] Heartbeat started (${SYNC_CONFIG.INTERVALS.HEARTBEAT / 1000}s interval)`);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('[DATA_SYNC] Auto sync stopped');
        }
    }

    pauseSync() {
        this.setStatus(SYNC_STATUS.PAUSED);
        this.stopAutoSync();
        console.log('[DATA_SYNC] Sync paused');
    }

    resumeSync() {
        if (this.status === SYNC_STATUS.PAUSED) {
            this.setStatus(SYNC_STATUS.IDLE);
            this.startAutoSync();
            console.log('[DATA_SYNC] Sync resumed');
        }
    }

    async manualRefresh() {
        console.log('[DATA_SYNC] Manual refresh triggered');
        
        if (this.status === SYNC_STATUS.SYNCING) {
            console.log('[DATA_SYNC] Sync already in progress');
            return;
        }
        
        try {
            await this.performFullSync();
        } catch (error) {
            console.error('[DATA_SYNC] Manual refresh failed:', error);
            throw error;
        }
    }

    /**
     * Priority and Visibility Management
     */
    markItemAsViewed(itemId, itemType) {
        this.priorityItems.add(itemId);
        console.log(`[DATA_SYNC] Item ${itemId} marked for priority sync`);
    }

    markItemsAsViewed(itemIds) {
        itemIds.forEach(id => this.priorityItems.add(id));
        console.log(`[DATA_SYNC] ${itemIds.length} items marked for priority sync`);
    }

    setVisibleItems(itemIds) {
        // Clear current priority items and set new ones
        this.priorityItems.clear();
        itemIds.forEach(id => this.priorityItems.add(id));
        console.log(`[DATA_SYNC] ${itemIds.length} visible items set for priority sync`);
    }

    /**
     * Configuration and Status
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Restart intervals if timing changed
        if (newConfig.autoRefreshInterval || newConfig.prioritySyncInterval) {
            this.stopAutoSync();
            this.startAutoSync();
            this.startPrioritySync();
        }
        
        console.log('[DATA_SYNC] Configuration updated:', newConfig);
    }

    setStatus(newStatus) {
        if (this.status !== newStatus) {
            console.log(`[DATA_SYNC] Status changed: ${this.status} → ${newStatus}`);
            this.status = newStatus;
            this.uiUpdater.updateSyncStatus(newStatus);
            this.notifySyncCallbacks('statusChange', { status: newStatus });
        }
    }

    getStatus() {
        return {
            status: this.status,
            lastSync: this.changeTracker.lastSyncTimestamp,
            pendingChanges: this.changeTracker.getPendingChanges().length,
            priorityItems: this.priorityItems.size,
            offlineQueue: this.offlineQueue.getQueueStatus(),
            config: this.config
        };
    }

    /**
     * WebSocket Preparation (for future implementation)
     */
    prepareWebSocketSupport() {
        // Placeholder for WebSocket initialization
        this.webSocketConfig = {
            enabled: false,
            url: null,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5
        };
        
        console.log('[DATA_SYNC] WebSocket support prepared (not yet implemented)');
    }

    enableWebSocket(wsUrl) {
        this.webSocketConfig.enabled = true;
        this.webSocketConfig.url = wsUrl;
        
        // Future WebSocket implementation would go here
        console.log('[DATA_SYNC] WebSocket enabled for:', wsUrl);
    }

    /**
     * Utilities and Helpers
     */
    async checkConnectivity() {
        try {
            // Simple connectivity check
            const response = await fetch(window.location.origin, { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            if (response.ok && this.status === SYNC_STATUS.OFFLINE) {
                this.setStatus(SYNC_STATUS.IDLE);
                await this.offlineQueue.processQueue();
            }
        } catch (error) {
            if (this.status !== SYNC_STATUS.OFFLINE) {
                this.setStatus(SYNC_STATUS.OFFLINE);
            }
        }
    }

    handleSyncError(error, syncType) {
        console.error(`[DATA_SYNC] ${syncType} error:`, error);
        
        // Queue operation for retry if offline
        if (!navigator.onLine) {
            this.offlineQueue.enqueue({
                type: 'sync',
                syncType,
                timestamp: new Date(),
                priority: SYNC_CONFIG.PRIORITIES.HIGH
            });
        }
        
        this.notifySyncCallbacks('error', { error, syncType });
    }

    onSyncEvent(eventType, callback) {
        if (!this.syncCallbacks.has(eventType)) {
            this.syncCallbacks.set(eventType, []);
        }
        this.syncCallbacks.get(eventType).push(callback);
    }

    notifySyncCallbacks(eventType, data) {
        const callbacks = this.syncCallbacks.get(eventType);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[DATA_SYNC] Callback error for ${eventType}:`, error);
                }
            });
        }
    }

    destroy() {
        this.stopAutoSync();
        
        if (this.priorityInterval) {
            clearInterval(this.priorityInterval);
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        console.log('[DATA_SYNC] DataSyncManager destroyed');
    }
}

// Initialize and export
const dataSyncManager = new DataSyncManager();

// CSS for sync indicators
const syncStyles = `
<style>
.sync-status {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 3px;
    display: inline-block;
}

.sync-idle { color: #28a745; }
.sync-syncing { color: #007bff; }
.sync-offline { color: #ffc107; background: rgba(255, 193, 7, 0.1); }
.sync-error { color: #dc3545; background: rgba(220, 53, 69, 0.1); }
.sync-paused { color: #6c757d; }

.update-indicator {
    animation: pulse 1s ease-in-out;
}

@keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.2); }
    100% { opacity: 1; transform: scale(1); }
}

.last-sync-time {
    font-size: 11px;
    color: #6c757d;
    margin-left: 8px;
}
</style>
`;

// Inject styles
if (!document.getElementById('sync-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'sync-styles';
    styleEl.innerHTML = syncStyles;
    document.head.appendChild(styleEl);
}

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        DataSyncManager, 
        dataSyncManager, 
        ChangeTracker, 
        ConflictResolver, 
        OfflineQueueManager, 
        UIUpdateManager 
    };
} else {
    window.DataSyncManager = DataSyncManager;
    window.dataSyncManager = dataSyncManager;
    window.ChangeTracker = ChangeTracker;
    window.ConflictResolver = ConflictResolver;
    window.OfflineQueueManager = OfflineQueueManager;
    window.UIUpdateManager = UIUpdateManager;
} 