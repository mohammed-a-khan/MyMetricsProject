/**
 * ADO Metrics Command Center - Comprehensive Error Handler
 * Advanced error handling, recovery strategies, and user experience optimization
 */

// Error Categories and Types
const ERROR_CATEGORIES = {
    NETWORK: 'network',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    TIMEOUT: 'timeout',
    RATE_LIMIT: 'rate_limit',
    VALIDATION: 'validation',
    SERVER: 'server',
    CLIENT: 'client',
    UNKNOWN: 'unknown'
};

const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

const RECOVERY_STRATEGIES = {
    RETRY: 'retry',
    REFRESH_TOKEN: 'refresh_token',
    FALLBACK: 'fallback',
    USER_ACTION: 'user_action',
    IGNORE: 'ignore'
};

/**
 * Comprehensive Error Handler Class
 */
class ErrorHandler {
    constructor() {
        this.errorQueue = [];
        this.retryAttempts = new Map();
        this.errorStats = new Map();
        this.performanceMetrics = {
            totalErrors: 0,
            errorsByCategory: new Map(),
            retrySuccessRate: 0,
            avgRetryTime: 0,
            errorFrequency: new Map()
        };
        this.rateLimitInfo = new Map();
        this.sessionWarnings = new Set();
        this.networkStatus = true;
        this.lastNetworkCheck = Date.now();
        
        this.init();
    }

    /**
     * Initialize error handler with global interceptors
     */
    async init() {
        try {
            this.setupGlobalErrorHandlers();
            this.setupFetchInterceptor();
            this.setupPromiseRejectionHandler();
            this.initializeUI();
            this.startNetworkMonitoring();
            this.startPerformanceMonitoring();
            
            console.log('[ERROR_HANDLER] Comprehensive error handling system initialized');
        } catch (error) {
            console.error('[ERROR_HANDLER] Failed to initialize:', error);
        }
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // JavaScript runtime errors
        window.addEventListener('error', (event) => {
            this.handleError({
                category: ERROR_CATEGORIES.CLIENT,
                severity: ERROR_SEVERITY.MEDIUM,
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            event.preventDefault(); // Prevent console error
            this.handleError({
                category: ERROR_CATEGORIES.CLIENT,
                severity: ERROR_SEVERITY.HIGH,
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                promise: true,
                timestamp: Date.now()
            });
        });

        // Network status changes
        window.addEventListener('online', () => this.handleNetworkReconnection());
        window.addEventListener('offline', () => this.handleNetworkDisconnection());
    }

    /**
     * Setup fetch interceptor for API calls
     */
    setupFetchInterceptor() {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            const startTime = Date.now();
            const url = args[0];
            const options = args[1] || {};
            
            try {
                // Add request timeout
                const timeoutMs = options.timeout || 30000;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                
                const response = await originalFetch(url, {
                    ...options,
                    signal: options.signal || controller.signal
                });
                
                clearTimeout(timeoutId);
                
                // Handle HTTP error responses
                if (!response.ok) {
                    await this.handleHttpError(response, url, Date.now() - startTime);
                }
                
                return response;
                
            } catch (error) {
                clearTimeout && clearTimeout();
                
                if (error.name === 'AbortError') {
                    this.handleError({
                        category: ERROR_CATEGORIES.TIMEOUT,
                        severity: ERROR_SEVERITY.MEDIUM,
                        message: `Request timeout: ${url}`,
                        url,
                        duration: Date.now() - startTime,
                        recoveryStrategy: RECOVERY_STRATEGIES.RETRY
                    });
                } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    this.handleError({
                        category: ERROR_CATEGORIES.NETWORK,
                        severity: ERROR_SEVERITY.HIGH,
                        message: `Network error: ${url}`,
                        url,
                        duration: Date.now() - startTime,
                        recoveryStrategy: RECOVERY_STRATEGIES.RETRY
                    });
                } else {
                    this.handleError({
                        category: ERROR_CATEGORIES.CLIENT,
                        severity: ERROR_SEVERITY.MEDIUM,
                        message: error.message,
                        url,
                        stack: error.stack,
                        duration: Date.now() - startTime
                    });
                }
                
                throw error;
            }
        };
    }

    /**
     * Handle HTTP error responses
     */
    async handleHttpError(response, url, duration) {
        const isADOAPI = url.includes('dev.azure.com') || url.includes('visualstudio.com');
        let errorData = null;
        
        try {
            errorData = await response.clone().json();
        } catch (e) {
            errorData = { message: response.statusText };
        }
        
        let category, severity, recoveryStrategy, userMessage;
        
        switch (response.status) {
            case 401:
                category = ERROR_CATEGORIES.AUTHENTICATION;
                severity = ERROR_SEVERITY.HIGH;
                recoveryStrategy = RECOVERY_STRATEGIES.REFRESH_TOKEN;
                userMessage = 'Your session has expired. Please check your Personal Access Token.';
                break;
                
            case 403:
                category = ERROR_CATEGORIES.AUTHORIZATION;
                severity = ERROR_SEVERITY.HIGH;
                recoveryStrategy = RECOVERY_STRATEGIES.USER_ACTION;
                userMessage = 'Access denied. Please check your permissions for this resource.';
                break;
                
            case 429:
                category = ERROR_CATEGORIES.RATE_LIMIT;
                severity = ERROR_SEVERITY.MEDIUM;
                recoveryStrategy = RECOVERY_STRATEGIES.RETRY;
                userMessage = 'Too many requests. Please wait a moment before trying again.';
                await this.handleRateLimit(response, url);
                break;
                
            case 408:
            case 504:
                category = ERROR_CATEGORIES.TIMEOUT;
                severity = ERROR_SEVERITY.MEDIUM;
                recoveryStrategy = RECOVERY_STRATEGIES.RETRY;
                userMessage = 'Request timed out. Retrying automatically...';
                break;
                
            case 500:
            case 502:
            case 503:
                category = ERROR_CATEGORIES.SERVER;
                severity = ERROR_SEVERITY.HIGH;
                recoveryStrategy = RECOVERY_STRATEGIES.RETRY;
                userMessage = 'Server error. We\'ll retry automatically.';
                break;
                
            default:
                category = ERROR_CATEGORIES.SERVER;
                severity = ERROR_SEVERITY.MEDIUM;
                recoveryStrategy = RECOVERY_STRATEGIES.USER_ACTION;
                userMessage = `Server returned error ${response.status}. Please try again.`;
        }
        
        this.handleError({
            category,
            severity,
            message: `HTTP ${response.status}: ${errorData.message || response.statusText}`,
            url,
            status: response.status,
            duration,
            recoveryStrategy,
            userMessage,
            isADOAPI,
            errorData
        });
    }

    /**
     * Handle rate limiting
     */
    async handleRateLimit(response, url) {
        const retryAfter = response.headers.get('Retry-After') || 
                          response.headers.get('X-RateLimit-Reset') || 
                          '60';
        
        const resetTime = Date.now() + (parseInt(retryAfter) * 1000);
        this.rateLimitInfo.set(url, {
            resetTime,
            retryAfter: parseInt(retryAfter)
        });
        
        this.showRateLimitWarning(parseInt(retryAfter));
    }

    /**
     * Main error handling method
     */
    async handleError(error, options = {}) {
        const normalizedError = this.normalizeError(error);
        
        // Check if error should be suppressed
        if (!options.force && this.shouldSuppressError(normalizedError)) {
            return null;
        }
        
        const errorId = this.generateErrorId();
        
        // Add to error queue
        const errorEntry = {
            ...normalizedError,
            id: errorId,
            timestamp: Date.now(),
            options
        };
        
        this.errorQueue.push(errorEntry);
        this.updatePerformanceMetrics(normalizedError);
        
        // Log error
        this.logError(normalizedError);
        
        // Handle recovery strategy
        const shouldHandle = await this.executeRecoveryStrategy(normalizedError, options);
        
        // Show user notification if not handled automatically
        if (shouldHandle && !options.silent) {
            this.showUserNotification(normalizedError, options);
        }
        
        // Cleanup old errors
        this.cleanupErrorQueue();
        
        return errorId;
    }

    /**
     * Normalize error object
     */
    normalizeError(error) {
        if (typeof error === 'string') {
            return {
                category: ERROR_CATEGORIES.UNKNOWN,
                severity: ERROR_SEVERITY.MEDIUM,
                message: error,
                timestamp: Date.now()
            };
        }
        
        if (error instanceof Error) {
            return {
                category: ERROR_CATEGORIES.CLIENT,
                severity: ERROR_SEVERITY.MEDIUM,
                message: error.message,
                stack: error.stack,
                name: error.name,
                timestamp: Date.now()
            };
        }
        
        return {
            category: error.category || ERROR_CATEGORIES.UNKNOWN,
            severity: error.severity || ERROR_SEVERITY.MEDIUM,
            message: error.message || 'Unknown error occurred',
            ...error,
            timestamp: error.timestamp || Date.now()
        };
    }

    /**
     * Execute recovery strategy
     */
    async executeRecoveryStrategy(error, options) {
        const strategy = error.recoveryStrategy || options.recoveryStrategy;
        
        switch (strategy) {
            case RECOVERY_STRATEGIES.RETRY:
                return await this.handleRetryStrategy(error, options);
                
            case RECOVERY_STRATEGIES.REFRESH_TOKEN:
                return await this.handleTokenRefresh(error);
                
            case RECOVERY_STRATEGIES.FALLBACK:
                return await this.handleFallbackStrategy(error);
                
            case RECOVERY_STRATEGIES.IGNORE:
                return false;
                
            default:
                return true; // Show notification
        }
    }

    /**
     * Handle retry strategy with exponential backoff
     */
    async handleRetryStrategy(error, options) {
        const retryKey = this.getRetryKey(error);
        const currentAttempts = this.retryAttempts.get(retryKey) || 0;
        const maxRetries = options.maxRetries || 3;
        
        if (currentAttempts >= maxRetries) {
            this.retryAttempts.delete(retryKey);
            return true; // Show final error notification
        }
        
        // Calculate exponential backoff delay
        const baseDelay = 1000; // 1 second
        const delay = baseDelay * Math.pow(2, currentAttempts);
        const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
        const totalDelay = Math.min(delay + jitter, 30000); // Max 30 seconds
        
        this.retryAttempts.set(retryKey, currentAttempts + 1);
        
        // Show retry notification
        this.showRetryNotification(currentAttempts + 1, maxRetries, totalDelay);
        
        // Schedule retry
        setTimeout(async () => {
            try {
                if (options.retryCallback) {
                    await options.retryCallback();
                    this.retryAttempts.delete(retryKey);
                    this.showSuccessNotification('Operation completed successfully after retry');
                    this.updateRetrySuccessMetrics(true);
                }
            } catch (retryError) {
                this.updateRetrySuccessMetrics(false);
                // This will trigger another retry attempt or final failure
                await this.handleError(retryError, options);
            }
        }, totalDelay);
        
        return false; // Don't show main error notification
    }

    /**
     * Handle token refresh strategy
     */
    async handleTokenRefresh(error) {
        if (this.sessionWarnings.has('token_expired')) {
            return false; // Already handling
        }
        
        this.sessionWarnings.add('token_expired');
        this.showSessionTimeoutWarning();
        
        // Clear after 5 minutes
        setTimeout(() => {
            this.sessionWarnings.delete('token_expired');
        }, 5 * 60 * 1000);
        
        return false;
    }

    /**
     * Handle network disconnection
     */
    handleNetworkDisconnection() {
        this.networkStatus = false;
        this.showNetworkErrorPrompt();
    }

    /**
     * Handle network reconnection
     */
    handleNetworkReconnection() {
        this.networkStatus = true;
        this.hideNetworkErrorPrompt();
        this.showSuccessNotification('Network connection restored');
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get retry key for error
     */
    getRetryKey(error) {
        return `${error.category}_${error.url || error.source || 'unknown'}`;
    }

    /**
     * Log error with stack traces
     */
    logError(error) {
        const logData = {
            timestamp: new Date().toISOString(),
            category: error.category,
            severity: error.severity,
            message: error.message,
            stack: error.stack,
            url: error.url,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`
        };
        
        // Console logging based on severity
        switch (error.severity) {
            case ERROR_SEVERITY.CRITICAL:
            case ERROR_SEVERITY.HIGH:
                console.error('[ERROR]', logData);
                break;
            case ERROR_SEVERITY.MEDIUM:
                console.warn('[WARNING]', logData);
                break;
            default:
                console.info('[INFO]', logData);
        }
        
        // Store error log for debugging
        this.storeErrorLog(logData);
    }

    /**
     * Store error log in localStorage
     */
    storeErrorLog(logData) {
        try {
            const logs = JSON.parse(localStorage.getItem('ado_error_logs') || '[]');
            logs.push(logData);
            
            // Keep only last 100 errors
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            localStorage.setItem('ado_error_logs', JSON.stringify(logs));
        } catch (e) {
            console.warn('Failed to store error log:', e);
        }
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(error) {
        this.performanceMetrics.totalErrors++;
        
        const category = error.category;
        const currentCount = this.performanceMetrics.errorsByCategory.get(category) || 0;
        this.performanceMetrics.errorsByCategory.set(category, currentCount + 1);
        
        // Track error frequency (errors per hour)
        const hour = Math.floor(Date.now() / (1000 * 60 * 60));
        const hourlyCount = this.performanceMetrics.errorFrequency.get(hour) || 0;
        this.performanceMetrics.errorFrequency.set(hour, hourlyCount + 1);
    }

    /**
     * Update retry success metrics
     */
    updateRetrySuccessMetrics(success) {
        const currentSuccesses = this.performanceMetrics.retrySuccesses || 0;
        const currentTotal = this.performanceMetrics.retryTotal || 0;
        
        this.performanceMetrics.retrySuccesses = currentSuccesses + (success ? 1 : 0);
        this.performanceMetrics.retryTotal = currentTotal + 1;
        this.performanceMetrics.retrySuccessRate = 
            (this.performanceMetrics.retrySuccesses / this.performanceMetrics.retryTotal) * 100;
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        this.createNotificationContainers();
        this.createNetworkErrorPrompt();
        this.createSessionTimeoutWarning();
    }

    /**
     * Create notification containers
     */
    createNotificationContainers() {
        // Error toast container
        if (!document.getElementById('errorToastContainer')) {
            const container = document.createElement('div');
            container.id = 'errorToastContainer';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1070';
            document.body.appendChild(container);
        }
        
        // Inline error container
        if (!document.getElementById('inlineErrorContainer')) {
            const container = document.createElement('div');
            container.id = 'inlineErrorContainer';
            container.className = 'alert alert-danger d-none';
            container.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <span class="error-message"></span>
                <button type="button" class="btn-close" aria-label="Close"></button>
            `;
            document.body.appendChild(container);
        }
    }

    /**
     * Show user notification based on error type
     */
    showUserNotification(error, options = {}) {
        const userMessage = this.getUserFriendlyMessage(error);
        const duration = this.getNotificationDuration(error.severity);
        
        this.showErrorToast(userMessage, error.severity, duration, options);
    }

    /**
     * Show error toast notification
     */
    showErrorToast(message, severity = ERROR_SEVERITY.MEDIUM, duration = 8000, options = {}) {
        const container = document.getElementById('errorToastContainer');
        if (!container) return;
        
        const toastId = `toast-${Date.now()}`;
        const severityClass = this.getSeverityClass(severity);
        const icon = this.getSeverityIcon(severity);
        
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast ${severityClass}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-header">
                <i class="${icon} me-2"></i>
                <strong class="me-auto">${this.getSeverityTitle(severity)}</strong>
                <small class="text-muted">Just now</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
                ${options.actionButton ? `
                    <div class="mt-2">
                        <button class="btn btn-sm btn-primary" onclick="${options.actionCallback}">
                            ${options.actionButton}
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        container.appendChild(toast);
        
        // Initialize Bootstrap toast
        const bsToast = new bootstrap.Toast(toast, {
            delay: duration,
            autohide: true
        });
        
        bsToast.show();
        
        // Clean up after toast is hidden
        toast.addEventListener('hidden.bs.toast', () => {
            container.removeChild(toast);
        });
    }

    /**
     * Show retry notification
     */
    showRetryNotification(attempt, maxAttempts, delay) {
        const message = `Retrying operation (${attempt}/${maxAttempts}) in ${Math.ceil(delay / 1000)} seconds...`;
        this.showErrorToast(message, ERROR_SEVERITY.LOW, delay);
    }

    /**
     * Show rate limit warning
     */
    showRateLimitWarning(retryAfter) {
        const message = `Rate limit exceeded. Please wait ${retryAfter} seconds before making more requests.`;
        this.showErrorToast(message, ERROR_SEVERITY.MEDIUM, retryAfter * 1000);
    }

    /**
     * Show network error prompt
     */
    showNetworkErrorPrompt() {
        let prompt = document.getElementById('networkErrorPrompt');
        if (!prompt) {
            prompt = document.createElement('div');
            prompt.id = 'networkErrorPrompt';
            prompt.className = 'position-fixed top-50 start-50 translate-middle';
            prompt.style.zIndex = '1080';
            prompt.innerHTML = `
                <div class="alert alert-danger alert-dismissible">
                    <i class="fas fa-wifi-slash me-2"></i>
                    <strong>Network Connection Lost</strong>
                    <p class="mb-2">Please check your internet connection and try again.</p>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.location.reload()">
                        <i class="fas fa-refresh me-1"></i>Reload Page
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            document.body.appendChild(prompt);
        }
        prompt.style.display = 'block';
    }

    /**
     * Hide network error prompt
     */
    hideNetworkErrorPrompt() {
        const prompt = document.getElementById('networkErrorPrompt');
        if (prompt) {
            prompt.style.display = 'none';
        }
    }

    /**
     * Show session timeout warning
     */
    showSessionTimeoutWarning() {
        let warning = document.getElementById('sessionTimeoutWarning');
        if (!warning) {
            warning = document.createElement('div');
            warning.id = 'sessionTimeoutWarning';
            warning.className = 'position-fixed top-0 start-0 w-100';
            warning.style.zIndex = '1075';
            warning.innerHTML = `
                <div class="alert alert-warning alert-dismissible mb-0">
                    <i class="fas fa-clock me-2"></i>
                    <strong>Session Expired</strong>
                    Your Personal Access Token has expired or is invalid. Please update your configuration.
                    <button class="btn btn-sm btn-warning ms-2" onclick="dashboard.showConfigurationModal()">
                        <i class="fas fa-cog me-1"></i>Update Settings
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            document.body.appendChild(warning);
        }
        warning.style.display = 'block';
    }

    /**
     * Show success notification
     */
    showSuccessNotification(message, duration = 4000) {
        this.showErrorToast(message, 'success', duration);
    }

    /**
     * Show inline error message for forms
     */
    showInlineError(element, message, duration = 5000) {
        // Remove existing error
        this.clearInlineError(element);
        
        // Add error class to element
        element.classList.add('is-invalid');
        
        // Create error feedback element
        const errorFeedback = document.createElement('div');
        errorFeedback.className = 'invalid-feedback d-block';
        errorFeedback.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>${message}`;
        errorFeedback.setAttribute('data-error-id', Date.now());
        
        // Insert after the element
        element.parentNode.insertBefore(errorFeedback, element.nextSibling);
        
        // Auto-clear after duration
        if (duration > 0) {
            setTimeout(() => {
                this.clearInlineError(element);
            }, duration);
        }
    }

    /**
     * Clear inline error for element
     */
    clearInlineError(element) {
        element.classList.remove('is-invalid');
        
        // Remove error feedback
        let nextElement = element.nextSibling;
        while (nextElement) {
            if (nextElement.classList && nextElement.classList.contains('invalid-feedback')) {
                nextElement.remove();
                break;
            }
            nextElement = nextElement.nextSibling;
        }
    }

    /**
     * Clear all inline errors in a form
     */
    clearFormErrors(form) {
        const invalidElements = form.querySelectorAll('.is-invalid');
        invalidElements.forEach(element => this.clearInlineError(element));
        
        const errorFeedbacks = form.querySelectorAll('.invalid-feedback');
        errorFeedbacks.forEach(feedback => feedback.remove());
    }

    /**
     * Validate form and show errors
     */
    validateForm(form, validationRules = {}) {
        this.clearFormErrors(form);
        
        const errors = [];
        const formData = new FormData(form);
        
        for (const [fieldName, rules] of Object.entries(validationRules)) {
            const element = form.querySelector(`[name="${fieldName}"]`);
            const value = formData.get(fieldName);
            
            if (!element) continue;
            
            // Required validation
            if (rules.required && (!value || value.trim() === '')) {
                this.showInlineError(element, rules.requiredMessage || `${fieldName} is required`);
                errors.push(`${fieldName} is required`);
                continue;
            }
            
            // Skip other validations if empty and not required
            if (!value || value.trim() === '') continue;
            
            // Length validation
            if (rules.minLength && value.length < rules.minLength) {
                this.showInlineError(element, `Minimum ${rules.minLength} characters required`);
                errors.push(`${fieldName} too short`);
            }
            
            if (rules.maxLength && value.length > rules.maxLength) {
                this.showInlineError(element, `Maximum ${rules.maxLength} characters allowed`);
                errors.push(`${fieldName} too long`);
            }
            
            // Pattern validation
            if (rules.pattern && !rules.pattern.test(value)) {
                this.showInlineError(element, rules.patternMessage || 'Invalid format');
                errors.push(`${fieldName} invalid format`);
            }
            
            // Email validation
            if (rules.email) {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(value)) {
                    this.showInlineError(element, 'Please enter a valid email address');
                    errors.push(`${fieldName} invalid email`);
                }
            }
            
            // URL validation
            if (rules.url) {
                try {
                    new URL(value);
                } catch (e) {
                    this.showInlineError(element, 'Please enter a valid URL');
                    errors.push(`${fieldName} invalid URL`);
                }
            }
            
            // Number validation
            if (rules.number) {
                const num = parseFloat(value);
                if (isNaN(num)) {
                    this.showInlineError(element, 'Please enter a valid number');
                    errors.push(`${fieldName} invalid number`);
                } else {
                    if (rules.min !== undefined && num < rules.min) {
                        this.showInlineError(element, `Minimum value is ${rules.min}`);
                        errors.push(`${fieldName} below minimum`);
                    }
                    if (rules.max !== undefined && num > rules.max) {
                        this.showInlineError(element, `Maximum value is ${rules.max}`);
                        errors.push(`${fieldName} above maximum`);
                    }
                }
            }
        }
        
        return errors;
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(error) {
        if (error.userMessage) {
            return error.userMessage;
        }
        
        switch (error.category) {
            case ERROR_CATEGORIES.NETWORK:
                return 'Unable to connect to the server. Please check your internet connection.';
                
            case ERROR_CATEGORIES.AUTHENTICATION:
                return 'Authentication failed. Please check your Personal Access Token.';
                
            case ERROR_CATEGORIES.AUTHORIZATION:
                return 'Access denied. You don\'t have permission to access this resource.';
                
            case ERROR_CATEGORIES.TIMEOUT:
                return 'The request is taking too long. We\'ll try again automatically.';
                
            case ERROR_CATEGORIES.RATE_LIMIT:
                return 'Too many requests. Please wait a moment before trying again.';
                
            case ERROR_CATEGORIES.VALIDATION:
                return 'Please check your input and try again.';
                
            case ERROR_CATEGORIES.SERVER:
                return 'Server error occurred. Our team has been notified.';
                
            default:
                return error.message || 'An unexpected error occurred. Please try again.';
        }
    }

    /**
     * Get notification duration based on severity
     */
    getNotificationDuration(severity) {
        switch (severity) {
            case ERROR_SEVERITY.CRITICAL:
                return 12000; // 12 seconds
            case ERROR_SEVERITY.HIGH:
                return 8000;  // 8 seconds
            case ERROR_SEVERITY.MEDIUM:
                return 6000;  // 6 seconds
            default:
                return 4000;  // 4 seconds
        }
    }

    /**
     * Get CSS class for severity
     */
    getSeverityClass(severity) {
        switch (severity) {
            case ERROR_SEVERITY.CRITICAL:
            case ERROR_SEVERITY.HIGH:
                return 'bg-danger text-white';
            case ERROR_SEVERITY.MEDIUM:
                return 'bg-warning text-dark';
            case 'success':
                return 'bg-success text-white';
            default:
                return 'bg-info text-white';
        }
    }

    /**
     * Get icon for severity
     */
    getSeverityIcon(severity) {
        switch (severity) {
            case ERROR_SEVERITY.CRITICAL:
                return 'fas fa-exclamation-circle';
            case ERROR_SEVERITY.HIGH:
                return 'fas fa-exclamation-triangle';
            case ERROR_SEVERITY.MEDIUM:
                return 'fas fa-info-circle';
            case 'success':
                return 'fas fa-check-circle';
            default:
                return 'fas fa-info';
        }
    }

    /**
     * Get title for severity
     */
    getSeverityTitle(severity) {
        switch (severity) {
            case ERROR_SEVERITY.CRITICAL:
                return 'Critical Error';
            case ERROR_SEVERITY.HIGH:
                return 'Error';
            case ERROR_SEVERITY.MEDIUM:
                return 'Warning';
            case 'success':
                return 'Success';
            default:
                return 'Information';
        }
    }

    /**
     * Start network monitoring
     */
    startNetworkMonitoring() {
        setInterval(() => {
            if (navigator.onLine !== this.networkStatus) {
                if (navigator.onLine) {
                    this.handleNetworkReconnection();
                } else {
                    this.handleNetworkDisconnection();
                }
            }
        }, 5000);
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            this.cleanupOldMetrics();
        }, 60000); // Clean up every minute
    }

    /**
     * Cleanup old metrics
     */
    cleanupOldMetrics() {
        const hourAgo = Math.floor((Date.now() - 60 * 60 * 1000) / (1000 * 60 * 60));
        this.performanceMetrics.errorFrequency.delete(hourAgo);
    }

    /**
     * Cleanup error queue
     */
    cleanupErrorQueue() {
        const maxAge = 10 * 60 * 1000; // 10 minutes
        const cutoff = Date.now() - maxAge;
        this.errorQueue = this.errorQueue.filter(error => error.timestamp > cutoff);
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            totalErrors: this.performanceMetrics.totalErrors,
            errorsByCategory: Object.fromEntries(this.performanceMetrics.errorsByCategory),
            retrySuccessRate: this.performanceMetrics.retrySuccessRate,
            recentErrors: this.errorQueue.slice(-10),
            errorFrequency: Object.fromEntries(this.performanceMetrics.errorFrequency)
        };
    }

    /**
     * Clear all error data
     */
    clearErrorHistory() {
        this.errorQueue = [];
        this.retryAttempts.clear();
        this.performanceMetrics = {
            totalErrors: 0,
            errorsByCategory: new Map(),
            retrySuccessRate: 0,
            errorFrequency: new Map()
        };
        localStorage.removeItem('ado_error_logs');
    }

    /**
     * Export error logs for debugging
     */
    exportErrorLogs() {
        const logs = {
            errorQueue: this.errorQueue,
            performanceMetrics: this.getErrorStats(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            localStorage: this.getStoredErrorLogs()
        };
        
        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `ado-metrics-error-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    /**
     * Get stored error logs
     */
    getStoredErrorLogs() {
        try {
            return JSON.parse(localStorage.getItem('ado_error_logs') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Create error from fetch response
     */
    createErrorFromResponse(response, message = null) {
        let category, severity;
        
        switch (response.status) {
            case 401:
                category = ERROR_CATEGORIES.AUTHENTICATION;
                severity = ERROR_SEVERITY.HIGH;
                break;
            case 403:
                category = ERROR_CATEGORIES.AUTHORIZATION;
                severity = ERROR_SEVERITY.HIGH;
                break;
            case 429:
                category = ERROR_CATEGORIES.RATE_LIMIT;
                severity = ERROR_SEVERITY.MEDIUM;
                break;
            case 408:
            case 504:
                category = ERROR_CATEGORIES.TIMEOUT;
                severity = ERROR_SEVERITY.MEDIUM;
                break;
            case 500:
            case 502:
            case 503:
                category = ERROR_CATEGORIES.SERVER;
                severity = ERROR_SEVERITY.HIGH;
                break;
            default:
                category = ERROR_CATEGORIES.SERVER;
                severity = ERROR_SEVERITY.MEDIUM;
        }
        
        return {
            category,
            severity,
            message: message || `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            url: response.url,
            timestamp: Date.now()
        };
    }

    /**
     * Create network error
     */
    createNetworkError(url = null, message = null) {
        return {
            category: ERROR_CATEGORIES.NETWORK,
            severity: ERROR_SEVERITY.HIGH,
            message: message || 'Network connection failed',
            url,
            timestamp: Date.now(),
            recoveryStrategy: RECOVERY_STRATEGIES.RETRY
        };
    }

    /**
     * Create timeout error
     */
    createTimeoutError(url = null, duration = null) {
        return {
            category: ERROR_CATEGORIES.TIMEOUT,
            severity: ERROR_SEVERITY.MEDIUM,
            message: `Request timed out${duration ? ` after ${duration}ms` : ''}`,
            url,
            duration,
            timestamp: Date.now(),
            recoveryStrategy: RECOVERY_STRATEGIES.RETRY
        };
    }

    /**
     * Create validation error
     */
    createValidationError(message, field = null) {
        return {
            category: ERROR_CATEGORIES.VALIDATION,
            severity: ERROR_SEVERITY.LOW,
            message,
            field,
            timestamp: Date.now(),
            recoveryStrategy: RECOVERY_STRATEGIES.USER_ACTION
        };
    }

    /**
     * Get error trends for analytics
     */
    getErrorTrends() {
        const trends = {
            hourly: new Map(),
            daily: new Map(),
            byCategory: new Map(),
            bySeverity: new Map()
        };
        
        this.errorQueue.forEach(error => {
            const date = new Date(error.timestamp);
            const hour = date.getHours();
            const day = date.getDate();
            
            // Hourly trends
            trends.hourly.set(hour, (trends.hourly.get(hour) || 0) + 1);
            
            // Daily trends
            trends.daily.set(day, (trends.daily.get(day) || 0) + 1);
            
            // Category trends
            trends.byCategory.set(error.category, (trends.byCategory.get(error.category) || 0) + 1);
            
            // Severity trends
            trends.bySeverity.set(error.severity, (trends.bySeverity.get(error.severity) || 0) + 1);
        });
        
        return {
            hourly: Object.fromEntries(trends.hourly),
            daily: Object.fromEntries(trends.daily),
            byCategory: Object.fromEntries(trends.byCategory),
            bySeverity: Object.fromEntries(trends.bySeverity)
        };
    }

    /**
     * Check if error should be suppressed
     */
    shouldSuppressError(error) {
        // Suppress duplicate errors within 1 minute
        const recentErrors = this.errorQueue.filter(e => 
            Date.now() - e.timestamp < 60000 && 
            e.message === error.message && 
            e.category === error.category
        );
        
        return recentErrors.length > 3;
    }

    /**
     * Handle critical error - for system-breaking errors
     */
    handleCriticalError(error, options = {}) {
        error.severity = ERROR_SEVERITY.CRITICAL;
        
        // Always show critical errors
        options.silent = false;
        
        // Log to console immediately
        console.error('[CRITICAL ERROR]', error);
        
        // Show persistent notification
        this.showErrorToast(
            error.userMessage || this.getUserFriendlyMessage(error),
            ERROR_SEVERITY.CRITICAL,
            0, // Don't auto-hide
            {
                actionButton: 'Reload Page',
                actionCallback: 'window.location.reload()'
            }
        );
        
        return this.handleError(error, options);
    }
}

// Initialize error handler
const errorHandler = new ErrorHandler();

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorHandler, ERROR_CATEGORIES, ERROR_SEVERITY, RECOVERY_STRATEGIES };
} else {
    window.errorHandler = errorHandler;
    window.ERROR_CATEGORIES = ERROR_CATEGORIES;
    window.ERROR_SEVERITY = ERROR_SEVERITY;
    window.RECOVERY_STRATEGIES = RECOVERY_STRATEGIES;
} 