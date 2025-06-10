/**
 * Production Integration Manager
 * Orchestrates all dashboard components, ensures production readiness, and handles global error boundaries
 */
class ProductionIntegrationManager {
    constructor() {
        this.isInitialized = false;
        this.initializationAttempts = 0;
        this.maxInitAttempts = 3;
        this.modules = new Map();
        this.dependencies = new Map();
        this.healthChecks = new Map();
        this.fallbackData = new Map();
        
        this.initialize();
    }

    async initialize() {
        console.log('🚀 Starting Production Integration Manager...');
        
        try {
            this.initializationAttempts++;
            
            // Setup global error boundary
            this.setupGlobalErrorBoundary();
            
            // Initialize core modules in dependency order
            await this.initializeCoreModules();
            
            // Setup health monitoring
            this.setupHealthMonitoring();
            
            // Setup fallback mechanisms
            this.setupFallbackMechanisms();
            
            // Validate production readiness
            await this.validateProductionReadiness();
            
            this.isInitialized = true;
            console.log('✅ Production Integration Manager initialized successfully');
            
            // Dispatch ready event
            this.dispatchReadyEvent();
            
        } catch (error) {
            console.error('❌ Failed to initialize Production Integration Manager:', error);
            
            if (this.initializationAttempts < this.maxInitAttempts) {
                console.log(`🔄 Retrying initialization (attempt ${this.initializationAttempts + 1}/${this.maxInitAttempts})...`);
                setTimeout(() => this.initialize(), 2000);
            } else {
                this.handleInitializationFailure(error);
            }
        }
    }

    async initializeCoreModules() {
        console.log('📦 Initializing core modules...');
        
        // Define module initialization order based on dependencies
        const moduleInitOrder = [
            { name: 'Security Manager', init: () => this.initializeSecurityManager() },
            { name: 'Performance Monitor', init: () => this.initializePerformanceMonitor() },
            { name: 'Configuration Manager', init: () => this.initializeConfigurationManager() },
            { name: 'ADO Client', init: () => this.initializeADOClient() },
            { name: 'Error Handler', init: () => this.initializeErrorHandler() },
            { name: 'Storage Manager', init: () => this.initializeStorageManager() },
            { name: 'Chart Manager', init: () => this.initializeChartManager() },
            { name: 'Test Metrics Engine', init: () => this.initializeTestMetricsEngine() },
            { name: 'Business Metrics Integration', init: () => this.initializeBusinessMetrics() },
            { name: 'Predictive Analytics', init: () => this.initializePredictiveAnalytics() },
            { name: 'Insight Engine', init: () => this.initializeInsightEngine() },
            { name: 'Report Generator', init: () => this.initializeReportGenerator() },
            { name: 'Email Report Manager', init: () => this.initializeEmailReportManager() },
            { name: 'Data Sync Manager', init: () => this.initializeDataSyncManager() },
            { name: 'Dashboard Integration', init: () => this.initializeDashboardIntegration() }
        ];

        for (const module of moduleInitOrder) {
            try {
                console.log(`  📦 Initializing ${module.name}...`);
                const result = await module.init();
                
                this.modules.set(module.name, {
                    instance: result,
                    initialized: true,
                    lastHealthCheck: Date.now(),
                    status: 'healthy'
                });
                
                console.log(`  ✅ ${module.name} initialized successfully`);
                
            } catch (error) {
                console.error(`  ❌ Failed to initialize ${module.name}:`, error);
                
                this.modules.set(module.name, {
                    instance: null,
                    initialized: false,
                    error: error.message,
                    status: 'failed'
                });
                
                // For critical modules, throw error to halt initialization
                if (this.isCriticalModule(module.name)) {
                    throw new Error(`Critical module ${module.name} failed to initialize: ${error.message}`);
                }
            }
        }
    }

    // Module Initialization Methods
    async initializeSecurityManager() {
        if (!window.SecurityManager) {
            await this.loadScript('js/security-manager.js');
        }
        
        if (window.securityManager) {
            return window.securityManager;
        }
        
        window.securityManager = new SecurityManager();
        return window.securityManager;
    }

    async initializePerformanceMonitor() {
        if (!window.PerformanceMonitor) {
            await this.loadScript('js/performance-monitor.js');
        }
        
        if (window.performanceMonitor) {
            return window.performanceMonitor;
        }
        
        window.performanceMonitor = new PerformanceMonitor();
        return window.performanceMonitor;
    }

    async initializeConfigurationManager() {
        this.ensureModuleLoaded('js/config/config-manager.js');
        
        if (!window.configManager) {
            const ConfigurationManager = window.ConfigurationManager;
            if (!ConfigurationManager) {
                throw new Error('ConfigurationManager class not found');
            }
            window.configManager = new ConfigurationManager();
        }
        
        return window.configManager;
    }

    async initializeADOClient() {
        this.ensureModuleLoaded('js/api/ado-client.js');
        
        if (!window.ADOClient) {
            throw new Error('ADOClient class not found');
        }
        
        // ADO Client will be instantiated when configuration is provided
        return window.ADOClient;
    }

    async initializeErrorHandler() {
        this.ensureModuleLoaded('js/error-handler.js');
        return window.errorHandler;
    }

    async initializeStorageManager() {
        this.ensureModuleLoaded('js/storage-manager.js');
        return window.storageManager;
    }

    async initializeChartManager() {
        this.ensureModuleLoaded('js/chart-manager.js');
        return window.chartManager;
    }

    async initializeTestMetricsEngine() {
        this.ensureModuleLoaded('js/metrics/test-metrics-engine.js');
        return window.testMetricsEngine;
    }

    async initializeBusinessMetrics() {
        this.ensureModuleLoaded('js/business-metrics-integration.js');
        return window.businessMetricsIntegration;
    }

    async initializePredictiveAnalytics() {
        this.ensureModuleLoaded('js/predictive-analytics.js');
        return window.predictiveAnalytics;
    }

    async initializeInsightEngine() {
        this.ensureModuleLoaded('js/ai/insight-engine.js');
        return window.insightEngine;
    }

    async initializeReportGenerator() {
        this.ensureModuleLoaded('js/export/report-generator.js');
        return window.reportGenerator;
    }

    async initializeEmailReportManager() {
        this.ensureModuleLoaded('js/email-report-manager.js');
        return window.emailReportManager;
    }

    async initializeDataSyncManager() {
        this.ensureModuleLoaded('js/data-sync-manager.js');
        return window.dataSyncManager;
    }

    async initializeDashboardIntegration() {
        this.ensureModuleLoaded('js/dashboard-integration.js');
        return window.dashboardIntegration;
    }

    // Global Error Boundary
    setupGlobalErrorBoundary() {
        window.addEventListener('error', (event) => {
            this.handleGlobalError('javascript_error', event.error, {
                filename: event.filename,
                line: event.lineno,
                column: event.colno
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError('promise_rejection', event.reason, {
                type: 'unhandled_promise_rejection'
            });
        });

        // Custom error boundary for React-like components
        window.reportComponentError = (componentName, error, errorInfo) => {
            this.handleGlobalError('component_error', error, {
                component: componentName,
                ...errorInfo
            });
        };
    }

    handleGlobalError(type, error, context = {}) {
        console.error(`🚨 Global Error [${type}]:`, error, context);
        
        // Record error in performance monitor
        if (window.performanceMonitor) {
            window.performanceMonitor.recordError({
                type,
                message: error?.message || String(error),
                stack: error?.stack,
                context,
                timestamp: new Date()
            });
        }
        
        // Attempt recovery based on error type
        this.attemptErrorRecovery(type, error, context);
        
        // Show user-friendly error message
        this.showUserErrorNotification(type, error);
    }

    attemptErrorRecovery(type, error, context) {
        switch (type) {
            case 'component_error':
                this.recoverFromComponentError(context.component, error);
                break;
            case 'api_error':
                this.recoverFromAPIError(error);
                break;
            case 'javascript_error':
                this.recoverFromJSError(error, context);
                break;
            default:
                console.log('No specific recovery mechanism for error type:', type);
        }
    }

    recoverFromComponentError(componentName, error) {
        console.log(`🔧 Attempting recovery for component: ${componentName}`);
        
        // Try to reload the component with fallback data
        if (this.fallbackData.has(componentName)) {
            const fallbackData = this.fallbackData.get(componentName);
            this.renderComponentWithFallback(componentName, fallbackData);
        }
    }

    recoverFromAPIError(error) {
        console.log('🔧 Attempting API error recovery...');
        
        // Clear API cache and retry
        if (window.adoClient) {
            window.adoClient.clearCache();
        }
        
        // Switch to offline mode if available
        if (window.storageManager) {
            window.storageManager.enableOfflineMode();
        }
    }

    recoverFromJSError(error, context) {
        console.log('🔧 Attempting JavaScript error recovery...');
        
        // If error is in a specific file, try to reload it
        if (context.filename && context.filename.includes('.js')) {
            console.log(`Attempting to reload script: ${context.filename}`);
        }
    }

    // Health Monitoring
    setupHealthMonitoring() {
        setInterval(() => {
            this.performHealthChecks();
        }, 60000); // Every minute
    }

    async performHealthChecks() {
        for (const [moduleName, moduleInfo] of this.modules.entries()) {
            try {
                const health = await this.checkModuleHealth(moduleName, moduleInfo);
                moduleInfo.status = health.status;
                moduleInfo.lastHealthCheck = Date.now();
                
                if (health.status === 'unhealthy') {
                    console.warn(`🏥 Module ${moduleName} is unhealthy:`, health.issues);
                    await this.attemptModuleRecovery(moduleName, moduleInfo);
                }
            } catch (error) {
                console.error(`Failed to check health for ${moduleName}:`, error);
                moduleInfo.status = 'unknown';
            }
        }
    }

    async checkModuleHealth(moduleName, moduleInfo) {
        if (!moduleInfo.initialized || !moduleInfo.instance) {
            return { status: 'unhealthy', issues: ['Module not initialized'] };
        }

        const issues = [];
        
        // Module-specific health checks
        switch (moduleName) {
            case 'ADO Client':
                if (window.adoClient && !window.configManager?.isConfigured()) {
                    issues.push('ADO Client not configured');
                }
                break;
                
            case 'Performance Monitor':
                if (window.performanceMonitor && !window.performanceMonitor.isMonitoring) {
                    issues.push('Performance monitoring not active');
                }
                break;
                
            case 'Security Manager':
                if (window.securityManager && window.securityManager.isSessionExpired()) {
                    issues.push('User session expired');
                }
                break;
        }
        
        return {
            status: issues.length === 0 ? 'healthy' : 'unhealthy',
            issues
        };
    }

    async attemptModuleRecovery(moduleName, moduleInfo) {
        console.log(`🔧 Attempting recovery for module: ${moduleName}`);
        
        try {
            // Try to reinitialize the module
            const moduleInit = this.getModuleInitializer(moduleName);
            if (moduleInit) {
                const newInstance = await moduleInit();
                moduleInfo.instance = newInstance;
                moduleInfo.initialized = true;
                moduleInfo.status = 'healthy';
                console.log(`✅ Successfully recovered module: ${moduleName}`);
            }
        } catch (error) {
            console.error(`❌ Failed to recover module ${moduleName}:`, error);
            moduleInfo.status = 'failed';
        }
    }

    // Fallback Mechanisms
    setupFallbackMechanisms() {
        // Setup fallback data for critical components
        this.fallbackData.set('Executive Dashboard', {
            projectHealth: { score: 0, status: 'unknown' },
            velocity: { current: 0, trend: 0 },
            testCoverage: 0,
            qualityGate: 'unknown'
        });
        
        this.fallbackData.set('Sprint Analytics', {
            totalStories: 0,
            completed: 0,
            inProgress: 0,
            burndown: { remaining: 0, total: 0 }
        });
        
        this.fallbackData.set('Quality Metrics', {
            categories: {},
            testExecution: [],
            bugClassification: []
        });
        
        this.fallbackData.set('Team Performance', {
            members: [],
            teamMetrics: {}
        });
    }

    renderComponentWithFallback(componentName, fallbackData) {
        console.log(`🔄 Rendering ${componentName} with fallback data`);
        
        // Render basic fallback UI
        const container = this.getComponentContainer(componentName);
        if (container) {
            container.innerHTML = `
                <div class="fallback-notice">
                    <h3>⚠️ Limited Data Available</h3>
                    <p>Some features may be unavailable. Showing cached data.</p>
                    <button onclick="window.productionIntegrationManager.retryComponentLoad('${componentName}')">
                        🔄 Retry
                    </button>
                </div>
                <div class="fallback-content">
                    ${this.generateFallbackHTML(componentName, fallbackData)}
                </div>
            `;
        }
    }

    getComponentContainer(componentName) {
        const containerMap = {
            'Executive Dashboard': document.getElementById('executiveContent'),
            'Sprint Analytics': document.getElementById('sprintContent'),
            'Quality Metrics': document.getElementById('qualityContent'),
            'Team Performance': document.getElementById('teamContent')
        };
        
        return containerMap[componentName];
    }

    generateFallbackHTML(componentName, data) {
        // Generate basic HTML representation of fallback data
        return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }

    // Production Readiness Validation
    async validateProductionReadiness() {
        console.log('🔍 Validating production readiness...');
        
        const checks = [
            { name: 'Security Configuration', check: () => this.validateSecurity() },
            { name: 'Performance Monitoring', check: () => this.validatePerformance() },
            { name: 'Error Handling', check: () => this.validateErrorHandling() },
            { name: 'Data Validation', check: () => this.validateDataHandling() },
            { name: 'Module Dependencies', check: () => this.validateDependencies() }
        ];
        
        const results = [];
        for (const check of checks) {
            try {
                const result = await check.check();
                results.push({ name: check.name, status: 'passed', ...result });
                console.log(`  ✅ ${check.name}: PASSED`);
            } catch (error) {
                results.push({ name: check.name, status: 'failed', error: error.message });
                console.warn(`  ⚠️ ${check.name}: FAILED - ${error.message}`);
            }
        }
        
        const failedChecks = results.filter(r => r.status === 'failed');
        if (failedChecks.length > 0) {
            console.warn('⚠️ Some production readiness checks failed:', failedChecks);
        } else {
            console.log('✅ All production readiness checks passed');
        }
        
        return results;
    }

    validateSecurity() {
        if (!window.securityManager) {
            throw new Error('Security Manager not initialized');
        }
        return { validated: true };
    }

    validatePerformance() {
        if (!window.performanceMonitor) {
            throw new Error('Performance Monitor not initialized');
        }
        return { validated: true };
    }

    validateErrorHandling() {
        if (!window.errorHandler) {
            throw new Error('Error Handler not initialized');
        }
        return { validated: true };
    }

    validateDataHandling() {
        if (!window.storageManager) {
            throw new Error('Storage Manager not initialized');
        }
        return { validated: true };
    }

    validateDependencies() {
        const criticalModules = ['Configuration Manager', 'ADO Client', 'Dashboard Integration'];
        const missingModules = criticalModules.filter(name => !this.modules.has(name) || !this.modules.get(name).initialized);
        
        if (missingModules.length > 0) {
            throw new Error(`Critical modules not initialized: ${missingModules.join(', ')}`);
        }
        
        return { validated: true, criticalModules };
    }

    // Utility Methods
    ensureModuleLoaded(scriptPath) {
        const scriptElement = document.querySelector(`script[src="${scriptPath}"]`);
        if (!scriptElement) {
            console.warn(`Script ${scriptPath} not found in DOM - module may not be loaded`);
        }
    }

    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    isCriticalModule(moduleName) {
        const criticalModules = [
            'Security Manager',
            'Configuration Manager', 
            'ADO Client',
            'Error Handler',
            'Dashboard Integration'
        ];
        return criticalModules.includes(moduleName);
    }

    getModuleInitializer(moduleName) {
        const initializers = {
            'Security Manager': () => this.initializeSecurityManager(),
            'Performance Monitor': () => this.initializePerformanceMonitor(),
            'Configuration Manager': () => this.initializeConfigurationManager(),
            'ADO Client': () => this.initializeADOClient(),
            'Dashboard Integration': () => this.initializeDashboardIntegration()
        };
        
        return initializers[moduleName];
    }

    handleInitializationFailure(error) {
        console.error('💥 Production Integration Manager failed to initialize:', error);
        
        // Show critical error to user
        document.body.innerHTML = `
            <div style="padding: 20px; background: #fee; border: 1px solid #f00; margin: 20px; border-radius: 5px;">
                <h2>🚨 System Initialization Failed</h2>
                <p>The dashboard could not be initialized properly. Please contact your system administrator.</p>
                <details>
                    <summary>Technical Details</summary>
                    <pre>${error.stack || error.message}</pre>
                </details>
                <button onclick="location.reload()">🔄 Retry</button>
            </div>
        `;
    }

    dispatchReadyEvent() {
        const event = new CustomEvent('productionSystemReady', {
            detail: {
                modules: Array.from(this.modules.keys()),
                initializationTime: Date.now(),
                version: '1.0.0'
            }
        });
        
        window.dispatchEvent(event);
    }

    showUserErrorNotification(type, error) {
        const userFriendlyMessages = {
            'javascript_error': 'An unexpected error occurred. The system is attempting to recover.',
            'promise_rejection': 'A background operation failed. Some features may be temporarily unavailable.',
            'component_error': 'A dashboard component encountered an error. Refreshing the section may help.',
            'api_error': 'Unable to connect to Azure DevOps. Please check your connection and try again.'
        };
        
        const message = userFriendlyMessages[type] || 'An error occurred. Please try refreshing the page.';
        
        if (window.configManager && window.configManager.showNotification) {
            window.configManager.showNotification(message, 'error');
        } else {
            console.error('User Error:', message);
        }
    }

    // Public API
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            modules: Object.fromEntries(
                Array.from(this.modules.entries()).map(([name, info]) => [
                    name, 
                    { 
                        status: info.status, 
                        initialized: info.initialized,
                        lastHealthCheck: info.lastHealthCheck 
                    }
                ])
            ),
            initializationAttempts: this.initializationAttempts
        };
    }

    retryComponentLoad(componentName) {
        console.log(`🔄 Retrying component load: ${componentName}`);
        
        // Attempt to reload the component
        if (window.dashboardIntegration) {
            window.dashboardIntegration.refreshCurrentSection();
        }
    }

    async forceModuleReinitialization(moduleName) {
        console.log(`🔄 Force reinitializing module: ${moduleName}`);
        
        const moduleInfo = this.modules.get(moduleName);
        if (moduleInfo) {
            await this.attemptModuleRecovery(moduleName, moduleInfo);
        }
    }
}

// Global instance - Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.productionIntegrationManager = new ProductionIntegrationManager();
    });
} else {
    window.productionIntegrationManager = new ProductionIntegrationManager();
} 