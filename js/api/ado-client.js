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
    }

    async makeRequest(endpoint, options = {}) {
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
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('ADO API Error:', error);
            throw error;
        }
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
}

window.ADOClient = ADOClient;
