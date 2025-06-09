/**
 * ADO Metrics Command Center - Comprehensive Azure DevOps API Client
 * Enterprise-grade API integration with authentication, queuing, caching, and error handling
 */

// API Configuration Constants
const API_CONFIG = {
    VERSION: '7.0',
    TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RATE_LIMIT_DELAY: 1000,
    MAX_CONCURRENT_REQUESTS: 5,
    CACHE_DURATIONS: {
        WORK_ITEMS: 5 * 60 * 1000,      // 5 minutes
        TEST_PLANS: 15 * 60 * 1000,     // 15 minutes
        TEST_CASES: 10 * 60 * 1000,     // 10 minutes
        BUGS: 5 * 60 * 1000,            // 5 minutes
        ITERATIONS: 30 * 60 * 1000,     // 30 minutes
        TEAM_MEMBERS: 60 * 60 * 1000,   // 1 hour
        TEST_RESULTS: 5 * 60 * 1000     // 5 minutes
    },
    BATCH_SIZE: {
        WORK_ITEMS: 200,
        TEST_CASES: 100,
        TEST_RESULTS: 100
    }
};

// WIQL Query Templates
const WIQL_TEMPLATES = {
    WORK_ITEMS: `
        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo],
               [System.CreatedDate], [System.ChangedDate], [System.WorkItemType],
               [Microsoft.VSTS.Common.Priority], [Microsoft.VSTS.Common.Severity],
               [System.AreaPath], [System.IterationPath], [System.Tags]
        FROM WorkItems
        WHERE [System.TeamProject] = @project
    `,
    BUGS: `
        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo],
               [Microsoft.VSTS.TCM.ReproSteps], [Microsoft.VSTS.Common.Severity],
               [System.CreatedDate], [System.ChangedDate], [System.AreaPath],
               [Microsoft.VSTS.Common.Priority], [Microsoft.VSTS.Build.FoundIn],
               [System.Tags], [System.Description]
        FROM WorkItems
        WHERE [System.WorkItemType] = 'Bug' AND [System.TeamProject] = @project
    `,
    USER_STORIES: `
        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo],
               [Microsoft.VSTS.Common.StoryPoints], [Microsoft.VSTS.Common.Priority],
               [System.CreatedDate], [System.ChangedDate], [System.AreaPath],
               [System.IterationPath], [System.Description], [System.Tags]
        FROM WorkItems
        WHERE [System.WorkItemType] IN ('User Story', 'Product Backlog Item', 'Feature')
               AND [System.TeamProject] = @project
    `,
    TASKS: `
        SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo],
               [Microsoft.VSTS.Scheduling.RemainingWork], [Microsoft.VSTS.Scheduling.CompletedWork],
               [Microsoft.VSTS.Scheduling.OriginalEstimate], [System.CreatedDate],
               [System.ChangedDate], [System.AreaPath], [System.IterationPath]
        FROM WorkItems
        WHERE [System.WorkItemType] = 'Task' AND [System.TeamProject] = @project
    `
};

/**
 * Request Queue Manager for rate limiting and request optimization
 */
class RequestQueue {
    constructor(maxConcurrent = API_CONFIG.MAX_CONCURRENT_REQUESTS) {
        this.queue = [];
        this.activeRequests = 0;
        this.maxConcurrent = maxConcurrent;
        this.rateLimitDelay = API_CONFIG.RATE_LIMIT_DELAY;
        this.lastRequestTime = 0;
    }

    async enqueue(requestFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        const { requestFn, resolve, reject } = this.queue.shift();
        this.activeRequests++;

        try {
            const timeSinceLastRequest = Date.now() - this.lastRequestTime;
            if (timeSinceLastRequest < this.rateLimitDelay) {
                await new Promise(r => setTimeout(r, this.rateLimitDelay - timeSinceLastRequest));
            }

            this.lastRequestTime = Date.now();
            const result = await requestFn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.activeRequests--;
            setTimeout(() => this.processQueue(), 10);
        }
    }

    clear() {
        this.queue.forEach(({ reject }) => {
            reject(new Error('Request queue cleared'));
        });
        this.queue = [];
    }
}

/**
 * Data Cache Manager
 */
class ADOCache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }

    set(key, data, ttl) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });

        const timer = setTimeout(() => {
            this.cache.delete(key);
            this.timers.delete(key);
        }, ttl);

        this.timers.set(key, timer);
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.timers.delete(key);
            return null;
        }

        return entry.data;
    }

    has(key) {
        return this.get(key) !== null;
    }

    clear() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.cache.clear();
        this.timers.clear();
    }

    clearPattern(pattern) {
        const keys = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
        keys.forEach(key => {
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
                this.timers.delete(key);
            }
            this.cache.delete(key);
        });
    }

    getStats() {
        return {
            entries: this.cache.size,
            totalSize: JSON.stringify(Array.from(this.cache.values())).length,
            keys: Array.from(this.cache.keys())
        };
    }
}

/**
 * Comprehensive ADO API Client
 */
class ADOClient {
    constructor() {
        this.config = null;
        this.baseUrl = null;
        this.headers = null;
        this.requestQueue = new RequestQueue();
        this.cache = new ADOCache();
        this.proxyConfig = null;
        this.retryDelays = [1000, 2000, 4000];
        
        this.init();
    }

    init() {
        this.loadConfiguration();
        console.log('[ADO_API] Comprehensive ADO API Client initialized');
    }

    loadConfiguration() {
        if (window.configManager) {
            const config = window.configManager.getConfiguration();
            if (config && config.adoConnection) {
                this.setConfiguration(config.adoConnection);
            }
            if (config && config.proxy && config.proxy.enabled) {
                this.setProxyConfiguration(config.proxy);
            }
        }
    }

    setConfiguration(config) {
        this.config = config;
        this.baseUrl = this.buildBaseUrl(config.organization);
        this.headers = this.createHeaders(config.personalAccessToken);
        this.cache.clear();
        console.log('[ADO_API] Configuration updated for:', config.organization);
    }

    setProxyConfiguration(proxyConfig) {
        this.proxyConfig = proxyConfig;
        console.log('[ADO_API] Proxy configuration set');
    }

    buildBaseUrl(organization) {
        if (!organization) throw new Error('Organization is required');
        
        if (organization.startsWith('http')) {
            const url = new URL(organization);
            return `${url.protocol}//${url.host}${url.pathname}`;
        } else {
            return `https://dev.azure.com/${organization}`;
        }
    }

    createHeaders(token) {
        if (!token) throw new Error('Personal Access Token is required');
        
        return {
            'Authorization': `Basic ${btoa(`:${token}`)}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ADO-Metrics-Command-Center/1.0'
        };
    }

    isConfigured() {
        return !!(this.config && this.baseUrl && this.headers);
    }

    async makeRequest(endpoint, options = {}) {
        if (!this.isConfigured()) {
            throw errorHandler.createValidationError('ADO API client not configured');
        }

        const cacheKey = this.generateCacheKey(endpoint, options);
        
        if (options.useCache !== false) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                console.log('[ADO_API] Cache hit:', endpoint);
                return cached;
            }
        }

        return this.requestQueue.enqueue(async () => {
            return this.executeRequest(endpoint, options, cacheKey);
        });
    }

    async executeRequest(endpoint, options, cacheKey) {
        const url = this.buildUrl(endpoint, options.params);
        let lastError;

        for (let attempt = 0; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
            try {
                const response = await this.performRequest(url, options);
                
                if (options.cacheTTL && response) {
                    this.cache.set(cacheKey, response, options.cacheTTL);
                }
                
                return response;
                
            } catch (error) {
                lastError = error;
                
                if (this.shouldNotRetry(error) || attempt === API_CONFIG.MAX_RETRIES) {
                    break;
                }
                
                const delay = this.retryDelays[attempt] || 4000;
                console.log(`[ADO_API] Retry ${attempt + 1} after ${delay}ms for:`, endpoint);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return this.handleRequestError(lastError, endpoint);
    }

    async performRequest(url, options) {
        const requestOptions = {
            method: options.method || 'GET',
            headers: { ...this.headers, ...options.headers },
            timeout: options.timeout || API_CONFIG.TIMEOUT
        };

        if (options.body) {
            requestOptions.body = typeof options.body === 'string' 
                ? options.body 
                : JSON.stringify(options.body);
        }

        console.log(`[ADO_API] ${requestOptions.method} ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);
        
        try {
            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw await this.createErrorFromResponse(response);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw errorHandler.createTimeoutError(url, requestOptions.timeout);
            }
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw errorHandler.createNetworkError(url);
            }
            
            throw error;
        }
    }

    async createErrorFromResponse(response) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { message: response.statusText };
        }

        const error = errorHandler.createErrorFromResponse(response, errorData.message);
        error.details = errorData;
        return error;
    }

    handleRequestError(error, endpoint) {
        console.error('[ADO_API] Request failed after all retries:', endpoint, error);
        
        errorHandler.handleError(error, {
            context: `ADO API: ${endpoint}`,
            silent: false
        });
        
        throw error;
    }

    shouldNotRetry(error) {
        if (!error.status) return false;
        
        if (error.status >= 400 && error.status < 500) {
            return ![408, 429].includes(error.status);
        }
        
        return false;
    }

    buildUrl(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseUrl);
        
        const allParams = {
            'api-version': API_CONFIG.VERSION,
            ...params
        };

        Object.keys(allParams).forEach(key => {
            if (allParams[key] !== null && allParams[key] !== undefined) {
                url.searchParams.append(key, String(allParams[key]));
            }
        });

        return url.toString();
    }

    generateCacheKey(endpoint, options) {
        const key = `${endpoint}_${JSON.stringify(options.params || {})}_${options.method || 'GET'}`;
        return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
    }

    // ===== PUBLIC API METHODS =====

    async testConnection() {
        try {
            const project = await this.getProject(this.config.project);
            return {
                success: true,
                project: project,
                message: 'Connection successful',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error,
                message: this.getErrorMessage(error),
                timestamp: new Date().toISOString()
            };
        }
    }

    async getProject(projectName) {
        const endpoint = `/_apis/projects/${encodeURIComponent(projectName)}`;
        return this.makeRequest(endpoint, {
            cacheTTL: API_CONFIG.CACHE_DURATIONS.TEAM_MEMBERS
        });
    }

    async fetchWorkItems(options = {}) {
        const {
            types = ['User Story', 'Bug', 'Task', 'Feature'],
            states = null,
            assignedTo = null,
            dateRange = null,
            areas = null,
            iterations = null,
            tags = null,
            customFilters = null
        } = options;

        const wiqlQuery = this.buildWIQLQuery({
            project: this.config.project,
            types,
            states,
            assignedTo,
            dateRange,
            areas,
            iterations,
            tags,
            customFilters
        });

        try {
            const queryResult = await this.executeWIQLQuery(wiqlQuery);
            
            if (!queryResult.workItems || queryResult.workItems.length === 0) {
                return { workItems: [], count: 0 };
            }

            const workItemIds = queryResult.workItems.map(wi => wi.id);
            const workItems = await this.fetchWorkItemDetails(workItemIds);
            
            const processedWorkItems = this.processWorkItems(workItems);
            
            return {
                workItems: processedWorkItems,
                count: processedWorkItems.length,
                query: wiqlQuery
            };
            
        } catch (error) {
            console.error('[ADO_API] Failed to fetch work items:', error);
            throw error;
        }
    }

    async fetchTestPlans(options = {}) {
        const { includeTestSuites = true, includeTestCases = false } = options;
        
        try {
            const endpoint = `/${this.config.project}/_apis/testplan/plans`;
            const testPlans = await this.makeRequest(endpoint, {
                cacheTTL: API_CONFIG.CACHE_DURATIONS.TEST_PLANS
            });

            if (!includeTestSuites) {
                return this.processTestPlans(testPlans.value);
            }

            const plansWithSuites = await Promise.all(
                testPlans.value.map(async (plan) => {
                    const suites = await this.fetchTestSuites(plan.id, includeTestCases);
                    return {
                        ...plan,
                        testSuites: suites
                    };
                })
            );

            return this.processTestPlans(plansWithSuites);
            
        } catch (error) {
            console.error('[ADO_API] Failed to fetch test plans:', error);
            throw error;
        }
    }

    async fetchTestSuites(planId, includeTestCases = false) {
        try {
            const endpoint = `/${this.config.project}/_apis/testplan/Plans/${planId}/suites`;
            const testSuites = await this.makeRequest(endpoint, {
                cacheTTL: API_CONFIG.CACHE_DURATIONS.TEST_PLANS
            });

            if (!includeTestCases) {
                return testSuites.value;
            }

            const suitesWithCases = await Promise.all(
                testSuites.value.map(async (suite) => {
                    const testCases = await this.fetchTestCasesForSuite(planId, suite.id);
                    return {
                        ...suite,
                        testCases: testCases
                    };
                })
            );

            return suitesWithCases;
            
        } catch (error) {
            console.error('[ADO_API] Failed to fetch test suites:', error);
            return [];
        }
    }

    async fetchTestCases(options = {}) {
        const { planId = null, suiteId = null, includeResults = true } = options;
        
        try {
            let testCases;
            
            if (planId && suiteId) {
                testCases = await this.fetchTestCasesForSuite(planId, suiteId);
            } else {
                const wiqlQuery = this.buildWIQLQuery({
                    project: this.config.project,
                    types: ['Test Case']
                });
                
                const queryResult = await this.executeWIQLQuery(wiqlQuery);
                const workItemIds = queryResult.workItems.map(wi => wi.id);
                testCases = await this.fetchWorkItemDetails(workItemIds);
            }

            if (includeResults && testCases.length > 0) {
                testCases = await Promise.all(
                    testCases.map(async (testCase) => {
                        const results = await this.fetchTestResults({ testCaseId: testCase.id });
                        return {
                            ...testCase,
                            testResults: results
                        };
                    })
                );
            }

            return this.processTestCases(testCases);
            
        } catch (error) {
            console.error('[ADO_API] Failed to fetch test cases:', error);
            throw error;
        }
    }

    async fetchTestCasesForSuite(planId, suiteId) {
        const endpoint = `/${this.config.project}/_apis/testplan/Plans/${planId}/Suites/${suiteId}/TestCase`;
        const response = await this.makeRequest(endpoint, {
            cacheTTL: API_CONFIG.CACHE_DURATIONS.TEST_CASES
        });
        
        return response.value || [];
    }

    async fetchBugs(options = {}) {
        const {
            states = null,
            severity = null,
            priority = null,
            assignedTo = null,
            dateRange = null,
            areas = null,
            iterations = null,
            environment = null
        } = options;

        const wiqlQuery = this.buildWIQLQuery({
            project: this.config.project,
            types: ['Bug'],
            states,
            assignedTo,
            dateRange,
            areas,
            iterations,
            customFilters: {
                severity,
                priority,
                environment
            }
        });

        try {
            const queryResult = await this.executeWIQLQuery(wiqlQuery);
            
            if (!queryResult.workItems || queryResult.workItems.length === 0) {
                return { bugs: [], count: 0 };
            }

            const workItemIds = queryResult.workItems.map(wi => wi.id);
            const bugs = await this.fetchWorkItemDetails(workItemIds);
            
            const processedBugs = this.processBugs(bugs);
            
            return {
                bugs: processedBugs,
                count: processedBugs.length,
                query: wiqlQuery
            };
            
        } catch (error) {
            console.error('[ADO_API] Failed to fetch bugs:', error);
            throw error;
        }
    }

    async fetchIterations(options = {}) {
        const { depth = 1, timeframe = null } = options;
        
        try {
            const endpoint = `/${this.config.project}/_apis/work/teamsettings/iterations`;
            const params = { '$depth': depth };
            
            if (timeframe) {
                params.timeframe = timeframe;
            }

            const response = await this.makeRequest(endpoint, {
                params,
                cacheTTL: API_CONFIG.CACHE_DURATIONS.ITERATIONS
            });

            return this.processIterations(response.value);
            
        } catch (error) {
            console.error('[ADO_API] Failed to fetch iterations:', error);
            throw error;
        }
    }

    async fetchTeamMembers(options = {}) {
        const { teamId = null } = options;
        
        try {
            let endpoint;
            if (teamId) {
                endpoint = `/_apis/projects/${this.config.project}/teams/${teamId}/members`;
            } else {
                endpoint = `/_apis/projects/${this.config.project}/teams`;
            }

            const response = await this.makeRequest(endpoint, {
                cacheTTL: API_CONFIG.CACHE_DURATIONS.TEAM_MEMBERS
            });

            if (teamId) {
                return this.processTeamMembers(response.value);
            } else {
                const teamsWithMembers = await Promise.all(
                    response.value.map(async (team) => {
                        const members = await this.fetchTeamMembers({ teamId: team.id });
                        return {
                            ...team,
                            members: members
                        };
                    })
                );
                
                return teamsWithMembers;
            }
            
        } catch (error) {
            console.error('[ADO_API] Failed to fetch team members:', error);
            throw error;
        }
    }

    async fetchTestResults(options = {}) {
        const {
            testCaseId = null,
            planId = null,
            runId = null,
            dateRange = null,
            outcomes = null
        } = options;
        
        try {
            let endpoint = `/${this.config.project}/_apis/test/results`;
            const params = {};
            
            if (testCaseId) {
                params.testCaseId = testCaseId;
            }
            if (planId) {
                params.planId = planId;
            }
            if (runId) {
                params.runId = runId;
            }
            if (outcomes) {
                params.outcomes = Array.isArray(outcomes) ? outcomes.join(',') : outcomes;
            }

            const response = await this.makeRequest(endpoint, {
                params,
                cacheTTL: API_CONFIG.CACHE_DURATIONS.TEST_RESULTS
            });

            return this.processTestResults(response.value);
            
        } catch (error) {
            console.error('[ADO_API] Failed to fetch test results:', error);
            throw error;
        }
    }

    // ===== WIQL QUERY BUILDING =====

    buildWIQLQuery(options) {
        const {
            project,
            types = [],
            states = null,
            assignedTo = null,
            dateRange = null,
            areas = null,
            iterations = null,
            tags = null,
            customFilters = null
        } = options;

        let query = WIQL_TEMPLATES.WORK_ITEMS;
        const conditions = [`[System.TeamProject] = '${project}'`];

        if (types.length > 0) {
            const typeCondition = types.map(type => `'${type}'`).join(', ');
            conditions.push(`[System.WorkItemType] IN (${typeCondition})`);
        }

        if (states && states.length > 0) {
            const stateCondition = states.map(state => `'${state}'`).join(', ');
            conditions.push(`[System.State] IN (${stateCondition})`);
        }

        if (assignedTo) {
            if (Array.isArray(assignedTo)) {
                const assigneeCondition = assignedTo.map(user => `'${user}'`).join(', ');
                conditions.push(`[System.AssignedTo] IN (${assigneeCondition})`);
            } else {
                conditions.push(`[System.AssignedTo] = '${assignedTo}'`);
            }
        }

        if (dateRange) {
            if (dateRange.start) {
                conditions.push(`[System.CreatedDate] >= '${dateRange.start}'`);
            }
            if (dateRange.end) {
                conditions.push(`[System.CreatedDate] <= '${dateRange.end}'`);
            }
        }

        if (areas && areas.length > 0) {
            const areaCondition = areas.map(area => `[System.AreaPath] UNDER '${area}'`).join(' OR ');
            conditions.push(`(${areaCondition})`);
        }

        if (iterations && iterations.length > 0) {
            const iterationCondition = iterations.map(iter => `[System.IterationPath] UNDER '${iter}'`).join(' OR ');
            conditions.push(`(${iterationCondition})`);
        }

        if (tags && tags.length > 0) {
            const tagCondition = tags.map(tag => `[System.Tags] CONTAINS '${tag}'`).join(' OR ');
            conditions.push(`(${tagCondition})`);
        }

        if (customFilters) {
            Object.entries(customFilters).forEach(([field, value]) => {
                if (value !== null && value !== undefined) {
                    if (Array.isArray(value)) {
                        const valueCondition = value.map(v => `'${v}'`).join(', ');
                        conditions.push(`[${field}] IN (${valueCondition})`);
                    } else {
                        conditions.push(`[${field}] = '${value}'`);
                    }
                }
            });
        }

        if (conditions.length > 1) {
            query = query.replace('WHERE [System.TeamProject] = @project', 
                                  `WHERE ${conditions.join(' AND ')}`);
        }

        query += ' ORDER BY [System.Id] DESC';

        return query;
    }

    async executeWIQLQuery(query) {
        const endpoint = `/${this.config.project}/_apis/wit/wiql`;
        
        return this.makeRequest(endpoint, {
            method: 'POST',
            body: { query },
            cacheTTL: API_CONFIG.CACHE_DURATIONS.WORK_ITEMS
        });
    }

    async fetchWorkItemDetails(workItemIds) {
        if (!workItemIds || workItemIds.length === 0) {
            return [];
        }

        const batches = [];
        for (let i = 0; i < workItemIds.length; i += API_CONFIG.BATCH_SIZE.WORK_ITEMS) {
            batches.push(workItemIds.slice(i, i + API_CONFIG.BATCH_SIZE.WORK_ITEMS));
        }

        const batchResults = await Promise.all(
            batches.map(batch => this.fetchWorkItemBatch(batch))
        );

        return batchResults.flat();
    }

    async fetchWorkItemBatch(ids) {
        const endpoint = '/_apis/wit/workitems';
        const params = {
            ids: ids.join(','),
            '$expand': 'all'
        };

        const response = await this.makeRequest(endpoint, {
            params,
            cacheTTL: API_CONFIG.CACHE_DURATIONS.WORK_ITEMS
        });

        return response.value || [];
    }

    // ===== DATA PROCESSING =====

    processWorkItems(workItems) {
        return workItems.map(item => this.normalizeWorkItem(item));
    }

    processBugs(bugs) {
        return bugs.map(bug => ({
            ...this.normalizeWorkItem(bug),
            severity: bug.fields['Microsoft.VSTS.Common.Severity'],
            priority: bug.fields['Microsoft.VSTS.Common.Priority'],
            reproSteps: bug.fields['Microsoft.VSTS.TCM.ReproSteps'],
            foundInBuild: bug.fields['Microsoft.VSTS.Build.FoundIn'],
            environment: this.classifyEnvironment(bug)
        }));
    }

    processTestPlans(testPlans) {
        return testPlans.map(plan => ({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            state: plan.state,
            startDate: plan.startDate,
            endDate: plan.endDate,
            revision: plan.revision,
            testSuites: plan.testSuites || []
        }));
    }

    processTestCases(testCases) {
        return testCases.map(testCase => ({
            ...this.normalizeWorkItem(testCase),
            automatedTestName: testCase.fields['Microsoft.VSTS.TCM.AutomatedTestName'],
            automatedTestType: testCase.fields['Microsoft.VSTS.TCM.AutomatedTestType'],
            priority: testCase.fields['Microsoft.VSTS.Common.Priority'],
            testResults: testCase.testResults || []
        }));
    }

    processIterations(iterations) {
        return iterations.map(iteration => ({
            id: iteration.id,
            name: iteration.name,
            path: iteration.path,
            startDate: iteration.attributes?.startDate,
            finishDate: iteration.attributes?.finishDate,
            timeFrame: iteration.attributes?.timeFrame
        }));
    }

    processTeamMembers(members) {
        return members.map(member => ({
            id: member.identity?.id,
            displayName: member.identity?.displayName,
            uniqueName: member.identity?.uniqueName,
            email: member.identity?.descriptor,
            isActive: member.isTeamAdmin || false
        }));
    }

    processTestResults(results) {
        return results.map(result => ({
            id: result.id,
            testCaseTitle: result.testCaseTitle,
            outcome: result.outcome,
            state: result.state,
            startedDate: result.startedDate,
            completedDate: result.completedDate,
            durationInMs: result.durationInMs,
            runBy: result.runBy?.displayName,
            errorMessage: result.errorMessage,
            stackTrace: result.stackTrace
        }));
    }

    normalizeWorkItem(item) {
        const fields = item.fields || {};
        
        return {
            id: item.id,
            title: fields['System.Title'],
            workItemType: fields['System.WorkItemType'],
            state: fields['System.State'],
            assignedTo: fields['System.AssignedTo']?.displayName,
            createdDate: fields['System.CreatedDate'],
            changedDate: fields['System.ChangedDate'],
            areaPath: fields['System.AreaPath'],
            iterationPath: fields['System.IterationPath'],
            tags: fields['System.Tags'],
            description: fields['System.Description'],
            priority: fields['Microsoft.VSTS.Common.Priority'],
            storyPoints: fields['Microsoft.VSTS.Common.StoryPoints'],
            originalEstimate: fields['Microsoft.VSTS.Scheduling.OriginalEstimate'],
            remainingWork: fields['Microsoft.VSTS.Scheduling.RemainingWork'],
            completedWork: fields['Microsoft.VSTS.Scheduling.CompletedWork'],
            url: item.url,
            raw: item
        };
    }

    classifyEnvironment(bug) {
        const title = bug.fields['System.Title']?.toLowerCase() || '';
        const description = bug.fields['System.Description']?.toLowerCase() || '';
        const tags = bug.fields['System.Tags']?.toLowerCase() || '';
        
        const content = `${title} ${description} ${tags}`;
        
        if (content.includes('prod') || content.includes('production')) {
            return 'Production';
        } else if (content.includes('stage') || content.includes('staging')) {
            return 'Staging';
        } else if (content.includes('test') || content.includes('qa')) {
            return 'Testing';
        } else if (content.includes('dev') || content.includes('development')) {
            return 'Development';
        } else {
            return 'Unknown';
        }
    }

    // ===== UTILITY METHODS =====

    getErrorMessage(error) {
        if (error.userMessage) return error.userMessage;
        if (error.message) return error.message;
        return 'Unknown error occurred';
    }

    clearCache() {
        this.cache.clear();
        console.log('[ADO_API] Cache cleared');
    }

    clearCachePattern(pattern) {
        this.cache.clearPattern(pattern);
        console.log('[ADO_API] Cache pattern cleared:', pattern);
    }

    getCacheStats() {
        return this.cache.getStats();
    }

    getStatus() {
        return {
            configured: this.isConfigured(),
            baseUrl: this.baseUrl,
            hasProxy: !!this.proxyConfig?.enabled,
            cacheStats: this.getCacheStats(),
            queueLength: this.requestQueue.queue.length,
            activeRequests: this.requestQueue.activeRequests
        };
    }
}

// Initialize and export
const adoApiClient = new ADOClient();

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ADOClient, adoApiClient };
} else {
    window.ADOClient = ADOClient;
    window.adoApiClient = adoApiClient;
} 