/**
 * Production Azure DevOps API Client
 * Handles all ADO REST API communications with proper authentication and error handling
 */
class ADOClient {
    constructor(organization, project, pat) {
        this.organization = organization;
        this.project = project;
        this.pat = pat;
        this.baseUrl = `https://dev.azure.com/${organization}`;
        this.apiVersion = '7.1-preview';
        this.authHeader = 'Basic ' + btoa(':' + pat);
        this.requestCache = new Map();
        this.rateLimiter = {
            requests: 0,
            resetTime: Date.now() + 60000,
            maxRequests: 200
        };
    }

    async makeRequest(endpoint, options = {}) {
        // Rate limiting check
        if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
            if (Date.now() < this.rateLimiter.resetTime) {
                await this.delay(this.rateLimiter.resetTime - Date.now());
            }
            this.resetRateLimit();
        }

        // Cache check for GET requests
        const cacheKey = `${endpoint}_${JSON.stringify(options.params || {})}`;
        if (options.method !== 'POST' && this.requestCache.has(cacheKey)) {
            const cached = this.requestCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 min cache
                return cached.data;
            }
        }

        const requestOptions = {
            method: 'GET',
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            ...options
        };

        const url = this.buildUrl(endpoint, options.params);
        
        try {
            this.rateLimiter.requests++;
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData}`);
            }
            
            const data = await response.json();
            
            // Cache successful GET requests
            if (requestOptions.method === 'GET') {
                this.requestCache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }
            
            return data;
        } catch (error) {
            console.error('ADO API Error:', error);
            throw error;
        }
    }

    resetRateLimit() {
        this.rateLimiter.requests = 0;
        this.rateLimiter.resetTime = Date.now() + 60000;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    buildUrl(endpoint, params = {}) {
        let url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        
        if (!url.includes('api-version')) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}api-version=${this.apiVersion}`;
        }
        
        if (Object.keys(params).length > 0) {
            const separator = url.includes('?') ? '&' : '?';
            const paramString = Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            url += separator + paramString;
        }
        
        return url;
    }

    // Core API Methods
    async getProjects() {
        return this.makeRequest('/_apis/projects');
    }

    async getTeams() {
        return this.makeRequest(`/_apis/projects/${this.project}/teams`);
    }

    async getBoards() {
        return this.makeRequest(`/${this.project}/_apis/work/boards`);
    }

    async getIterations() {
        return this.makeRequest(`/${this.project}/default/_apis/work/teamsettings/iterations`);
    }

    async getWorkItemsByQuery(wiql) {
        return this.makeRequest(`/${this.project}/_apis/wit/wiql`, {
            method: 'POST',
            body: JSON.stringify({ query: wiql })
        });
    }

    async getWorkItems(ids, fields = []) {
        if (!Array.isArray(ids) || ids.length === 0) {
            return { value: [] };
        }
        
        const idsParam = ids.join(',');
        const fieldsParam = fields.length > 0 ? fields.join(',') : undefined;
        
        return this.makeRequest('/_apis/wit/workitems', {
            params: {
                ids: idsParam,
                ...(fieldsParam && { fields: fieldsParam }),
                '$expand': 'all'
            }
        });
    }

    // Sprint-specific methods
    async getSprintWorkItems(iterationId, teamName = 'default') {
        try {
            const iterationWorkItems = await this.makeRequest(
                `/${this.project}/${teamName}/_apis/work/teamsettings/iterations/${iterationId}/workitems`,
                { params: { '$expand': 'all' } }
            );
            
            if (iterationWorkItems.workItemRelations && iterationWorkItems.workItemRelations.length > 0) {
                const workItemIds = iterationWorkItems.workItemRelations.map(wi => wi.target.id);
                return await this.getWorkItems(workItemIds);
            }
            
            return { value: [] };
        } catch (error) {
            console.warn('Failed to get sprint work items:', error);
            return { value: [] };
        }
    }

    async getSprintCapacity(iterationId, teamName = 'default') {
        try {
            return await this.makeRequest(
                `/${this.project}/${teamName}/_apis/work/teamsettings/iterations/${iterationId}/capacities`
            );
        } catch (error) {
            console.warn('Failed to get sprint capacity:', error);
            return { value: [] };
        }
    }

    async getWorkItemRevisions(workItemId) {
        try {
            return await this.makeRequest(`/_apis/wit/workitems/${workItemId}/revisions`);
        } catch (error) {
            console.warn(`Failed to get revisions for work item ${workItemId}:`, error);
            return { value: [] };
        }
    }

    // Test case methods
    async getTestCases(planId) {
        try {
            return await this.makeRequest(`/${this.project}/_apis/test/plans/${planId}/testcases`);
        } catch (error) {
            console.warn('Failed to get test cases:', error);
            return { value: [] };
        }
    }

    async getTestRuns(buildId) {
        try {
            return await this.makeRequest(`/${this.project}/_apis/test/runs`, {
                params: { buildUri: buildId }
            });
        } catch (error) {
            console.warn('Failed to get test runs:', error);
            return { value: [] };
        }
    }

    // Enhanced work item queries
    async getWorkItemsByIteration(iterationPath, workItemTypes = ['User Story', 'Bug', 'Task']) {
        const wiqlQuery = `
            SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], 
                   [System.AssignedTo], [System.CreatedDate], [System.ChangedDate],
                   [Microsoft.VSTS.Scheduling.StoryPoints], [Microsoft.VSTS.Common.Priority],
                   [Microsoft.VSTS.Common.Severity], [System.Tags], [System.AreaPath]
            FROM WorkItems 
            WHERE [System.TeamProject] = '${this.project}'
                AND [System.IterationPath] = '${iterationPath}'
                AND [System.WorkItemType] IN (${workItemTypes.map(t => `'${t}'`).join(', ')})
            ORDER BY [System.ChangedDate] DESC
        `;
        
        try {
            const queryResult = await this.getWorkItemsByQuery(wiqlQuery);
            if (queryResult.workItems && queryResult.workItems.length > 0) {
                const ids = queryResult.workItems.map(wi => wi.id);
                return await this.getWorkItems(ids);
            }
            return { value: [] };
        } catch (error) {
            console.error('Failed to get work items by iteration:', error);
            throw error;
        }
    }

    async getWorkItemsByAssignee(assignedTo, workItemTypes = ['User Story', 'Bug', 'Task']) {
        const wiqlQuery = `
            SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], 
                   [System.AssignedTo], [System.CreatedDate], [System.ChangedDate],
                   [Microsoft.VSTS.Scheduling.StoryPoints], [Microsoft.VSTS.Common.Priority]
            FROM WorkItems 
            WHERE [System.TeamProject] = '${this.project}'
                AND [System.AssignedTo] = '${assignedTo}'
                AND [System.WorkItemType] IN (${workItemTypes.map(t => `'${t}'`).join(', ')})
                AND [System.State] <> 'Removed'
            ORDER BY [System.ChangedDate] DESC
        `;
        
        try {
            const queryResult = await this.getWorkItemsByQuery(wiqlQuery);
            if (queryResult.workItems && queryResult.workItems.length > 0) {
                const ids = queryResult.workItems.map(wi => wi.id);
                return await this.getWorkItems(ids);
            }
            return { value: [] };
        } catch (error) {
            console.error('Failed to get work items by assignee:', error);
            throw error;
        }
    }

    async getBugsByEnvironment() {
        const wiqlQuery = `
            SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], 
                   [System.CreatedDate], [System.Tags], [System.AreaPath],
                   [Microsoft.VSTS.Common.Severity], [Microsoft.VSTS.Common.Priority]
            FROM WorkItems 
            WHERE [System.TeamProject] = '${this.project}'
                AND [System.WorkItemType] = 'Bug'
                AND [System.State] <> 'Removed'
            ORDER BY [Microsoft.VSTS.Common.Severity] ASC, [System.CreatedDate] DESC
        `;
        
        try {
            const queryResult = await this.getWorkItemsByQuery(wiqlQuery);
            if (queryResult.workItems && queryResult.workItems.length > 0) {
                const ids = queryResult.workItems.map(wi => wi.id);
                return await this.getWorkItems(ids);
            }
            return { value: [] };
        } catch (error) {
            console.error('Failed to get bugs by environment:', error);
            throw error;
        }
    }

    // Team member performance methods
    async getTeamMemberActivity(memberEmail, days = 30) {
        const fromDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
        const wiqlQuery = `
            SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
                   [System.CreatedDate], [System.ChangedDate], 
                   [Microsoft.VSTS.Scheduling.StoryPoints]
            FROM WorkItems 
            WHERE [System.TeamProject] = '${this.project}'
                AND ([System.AssignedTo] = '${memberEmail}' 
                     OR [System.CreatedBy] = '${memberEmail}')
                AND [System.ChangedDate] >= '${fromDate}'
            ORDER BY [System.ChangedDate] DESC
        `;
        
        try {
            const queryResult = await this.getWorkItemsByQuery(wiqlQuery);
            if (queryResult.workItems && queryResult.workItems.length > 0) {
                const ids = queryResult.workItems.map(wi => wi.id);
                return await this.getWorkItems(ids);
            }
            return { value: [] };
        } catch (error) {
            console.error('Failed to get team member activity:', error);
            throw error;
        }
    }

    // Repository and build methods
    async getRepositories() {
        try {
            return await this.makeRequest(`/${this.project}/_apis/git/repositories`);
        } catch (error) {
            console.warn('Failed to get repositories:', error);
            return { value: [] };
        }
    }

    async getBuildDefinitions() {
        try {
            return await this.makeRequest(`/${this.project}/_apis/build/definitions`);
        } catch (error) {
            console.warn('Failed to get build definitions:', error);
            return { value: [] };
        }
    }

    async getRecentBuilds(definitionId, count = 10) {
        try {
            return await this.makeRequest(`/${this.project}/_apis/build/builds`, {
                params: {
                    definitions: definitionId,
                    '$top': count,
                    statusFilter: 'completed'
                }
            });
        } catch (error) {
            console.warn('Failed to get recent builds:', error);
            return { value: [] };
        }
    }

    // Utility methods
    async testConnection() {
        try {
            const response = await this.getProjects();
            return {
                success: true,
                project: response,
                message: 'Connection successful'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Connection failed'
            };
        }
    }

    clearCache() {
        this.requestCache.clear();
    }

    getConnectionInfo() {
        return {
            organization: this.organization,
            project: this.project,
            baseUrl: this.baseUrl,
            connected: !!this.pat
        };
    }
}

window.ADOClient = ADOClient;
