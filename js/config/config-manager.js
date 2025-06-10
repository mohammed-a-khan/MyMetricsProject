/**
 * Comprehensive Azure DevOps Configuration Manager
 * Handles all configuration aspects: connection, boards, resources, iterations, preferences
 */

class ConfigurationManager {
    constructor() {
        // Enhanced configuration structure with all required components
        this.currentTab = 'connection';
        this.isConnected = false;
        this.connectionStatus = 'offline';
        this.config = {
            connection: {
                organization: '',
                project: '',
                patToken: '',
                proxyUrl: ''
            },
            boards: {
                available: [],
                selected: [],
                preferences: {
                    saveSelection: true,
                    autoSwitch: false
                }
            },
            resources: {
                available: [],
                selected: [],
                groups: {
                    developers: [],
                    testers: [],
                    others: []
                }
            },
            iterations: {
                available: [],
                selected: null,
                comparison: [],
                dateRange: {
                    preset: 'current',
                    customStart: null,
                    customEnd: null
                }
            },
            preferences: {
                refreshInterval: 15,
                display: {
                    showTrends: true,
                    showTooltips: true,
                    enableAnimations: true,
                    compactMode: false
                },
                export: {
                    defaultFormat: 'excel',
                    includeCharts: true
                }
            }
        };
        
        this.currentTab = 'connection';
        this.isConnected = false;
        this.connectionStatus = 'offline';
        
        this.initialize();
    }

    initialize() {
        console.log('🔧 Initializing Configuration Manager...');
        this.loadSavedConfiguration();
        this.setupEventListeners();
        this.updateUI();
        console.log('✅ Configuration Manager initialized');
    }

    // Configuration Tab Management
    switchConfigTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.config-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Hide all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(`${tabName}Tab`).classList.add('active');
        document.querySelector(`[onclick="switchConfigTab('${tabName}')"]`).classList.add('active');
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }

    loadTabData(tabName) {
        switch(tabName) {
            case 'boards':
                if (this.isConnected) {
                    this.loadAvailableBoards();
                }
                break;
            case 'resources':
                if (this.isConnected) {
                    this.loadAvailableResources();
                }
                break;
            case 'iterations':
                if (this.isConnected) {
                    this.loadAvailableIterations();
                }
                break;
        }
    }

    // Connection Management
    async testConnection() {
        const org = document.getElementById('organization').value;
        const project = document.getElementById('project').value;
        const pat = document.getElementById('patToken').value;
        const proxy = document.getElementById('proxyUrl').value;

        if (!org || !project || !pat) {
            this.showNotification('Please fill in all required connection details', 'error');
            return;
        }

        this.updateConnectionStatus('testing', 'Testing connection...');
        
        try {
            // Test basic connection with correct Azure DevOps API URL
            const testUrl = `https://dev.azure.com/${org}/_apis/projects/${project}?api-version=6.0`;
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${btoa(':' + pat)}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const projectData = await response.json();
                this.isConnected = true;
                this.updateConnectionStatus('online', `Connected to ${projectData.name || project}`);
                
                // Save connection details
                this.config.connection = { org, project, patToken: pat, proxyUrl: proxy };
                this.saveConfiguration();
                
                // Load initial data
                await this.loadInitialData();
                
                this.showNotification('Connection successful! Loading boards and teams...', 'success');
            } else {
                const errorText = await response.text();
                throw new Error(`Connection failed: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            this.isConnected = false;
            this.updateConnectionStatus('offline', 'Connection failed');
            this.showNotification(`Connection failed: ${error.message}`, 'error');
        }
    }

    async loadInitialData() {
        try {
            // Load boards, teams, and iterations in parallel
            await Promise.all([
                this.loadAvailableBoards(),
                this.loadAvailableResources(),
                this.loadAvailableIterations()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showNotification('Connected but failed to load some data', 'warning');
        }
    }

    // Board Management
    async loadAvailableBoards() {
        if (!this.isConnected) return;

        try {
            const { org, project, patToken } = this.config.connection;
            
            // First get the team to access boards
            const teamResponse = await fetch(`https://dev.azure.com/${org}/_apis/projects/${project}/teams?api-version=6.0`, {
                headers: {
                    'Authorization': `Basic ${btoa(':' + patToken)}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!teamResponse.ok) {
                throw new Error(`Failed to fetch teams: ${teamResponse.status}`);
            }

            const teamData = await teamResponse.json();
            const teams = teamData.value || [];

            if (teams.length === 0) {
                this.showNotification('No teams found in the project', 'warning');
                return;
            }

            // Get boards for the first team (or default team)
            const team = teams[0];
            const boardResponse = await fetch(`https://dev.azure.com/${org}/${project}/${team.id}/_apis/work/boards?api-version=6.0`, {
                headers: {
                    'Authorization': `Basic ${btoa(':' + patToken)}`,
                    'Content-Type': 'application/json'
                }
            });

            if (boardResponse.ok) {
                const boardData = await boardResponse.json();
                this.config.boards.available = boardData.value.map(board => ({
                    id: board.id,
                    name: board.name,
                    url: board.url,
                    teamId: team.id,
                    teamName: team.name,
                    columns: board.columns || []
                }));

                this.renderAvailableBoards();
                this.showNotification(`Found ${this.config.boards.available.length} boards`, 'success');
            } else {
                throw new Error(`Failed to fetch boards: ${boardResponse.status}`);
            }

        } catch (error) {
            console.error('Failed to load boards:', error);
            this.showNotification(`Failed to load boards: ${error.message}`, 'error');
        }
    }

    renderAvailableBoards() {
        const container = document.getElementById('availableBoardsList');
        const selectedContainer = document.getElementById('selectedBoardsList');
        
        if (this.config.boards.available.length === 0) {
            container.innerHTML = '<div class="loading-indicator">No boards found</div>';
            return;
        }

        // Render available boards
        container.innerHTML = this.config.boards.available
            .filter(board => !this.config.boards.selected.find(s => s.id === board.id))
            .map(board => this.createBoardItem(board, false))
            .join('');

        // Render selected boards
        if (this.config.boards.selected.length === 0) {
            selectedContainer.innerHTML = '<div class="empty-state">No boards selected</div>';
        } else {
            selectedContainer.innerHTML = this.config.boards.selected
                .map(board => this.createBoardItem(board, true))
                .join('');
        }

        // Update selected count
        document.querySelector('.selected-boards h4').textContent = 
            `Selected Boards (${this.config.boards.selected.length}/3)`;
    }

    createBoardItem(board, isSelected) {
        return `
            <div class="board-item ${isSelected ? 'selected' : ''}" 
                 onclick="configManager.${isSelected ? 'unselectBoard' : 'selectBoard'}('${board.id}')">
                <div class="board-info">
                    <h5>${board.name}</h5>
                    <p>${board.columns?.length || 0} columns</p>
                </div>
                <div class="board-actions">
                    ${isSelected ? '✓' : '+'}
                </div>
            </div>
        `;
    }

    selectBoard(boardId) {
        if (this.config.boards.selected.length >= 3) {
            this.showNotification('Maximum 3 boards can be selected', 'warning');
            return;
        }

        const board = this.config.boards.available.find(b => b.id === boardId);
        if (board && !this.config.boards.selected.find(s => s.id === boardId)) {
            this.config.boards.selected.push(board);
            this.renderAvailableBoards();
            this.updateCurrentBoardsDisplay();
        }
    }

    unselectBoard(boardId) {
        this.config.boards.selected = this.config.boards.selected.filter(b => b.id !== boardId);
        this.renderAvailableBoards();
        this.updateCurrentBoardsDisplay();
    }

    // Resource Management
    async loadAvailableResources() {
        if (!this.isConnected) return;

        try {
            const { org, project, patToken } = this.config.connection;
            
            // Get project teams and members
            const teamResponse = await fetch(`https://dev.azure.com/${org}/_apis/projects/${project}/teams?api-version=6.0`, {
                headers: {
                    'Authorization': `Basic ${btoa(':' + patToken)}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!teamResponse.ok) {
                throw new Error(`Failed to fetch teams: ${teamResponse.status}`);
            }

            const teamData = await teamResponse.json();
            const teams = teamData.value || [];

            let allMembers = [];
            
            // Get members for each team
            for (const team of teams) {
                try {
                    const memberResponse = await fetch(`https://dev.azure.com/${org}/_apis/projects/${project}/teams/${team.id}/members?api-version=6.0`, {
                        headers: {
                            'Authorization': `Basic ${btoa(':' + patToken)}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (memberResponse.ok) {
                        const memberData = await memberResponse.json();
                        const members = memberData.value.map(member => ({
                            id: member.identity.id,
                            name: member.identity.displayName,
                            email: member.identity.uniqueName || '',
                            teamId: team.id,
                            teamName: team.name,
                            isActive: member.identity.isActive !== false
                        }));
                        allMembers.push(...members);
                    }
                } catch (memberError) {
                    console.warn(`Failed to load members for team ${team.name}:`, memberError);
                }
            }

            // Remove duplicates by ID
            const uniqueMembers = allMembers.filter((member, index, self) => 
                index === self.findIndex(m => m.id === member.id)
            );

            this.config.resources.available = uniqueMembers;
            this.categorizeResources();
            this.renderAvailableResources();
            this.showNotification(`Found ${uniqueMembers.length} team members`, 'success');

        } catch (error) {
            console.error('Failed to load resources:', error);
            this.showNotification(`Failed to load team members: ${error.message}`, 'error');
        }
    }

    categorizeResources() {
        // Simple categorization based on display name patterns
        // In a real implementation, you might use additional ADO fields or external data
        this.config.resources.groups = {
            developers: [],
            testers: [],
            others: []
        };

        this.config.resources.available.forEach(resource => {
            const name = resource.name.toLowerCase();
            if (name.includes('dev') || name.includes('engineer') || name.includes('developer')) {
                this.config.resources.groups.developers.push(resource);
            } else if (name.includes('test') || name.includes('qa') || name.includes('quality')) {
                this.config.resources.groups.testers.push(resource);
            } else {
                this.config.resources.groups.others.push(resource);
            }
        });
    }

    renderAvailableResources() {
        // Render each group
        this.renderResourceGroup('developers', this.config.resources.groups.developers);
        this.renderResourceGroup('testers', this.config.resources.groups.testers);
        this.renderResourceGroup('others', this.config.resources.groups.others);
        
        // Update selection count
        this.updateResourceSelectionCount();
    }

    renderResourceGroup(groupName, resources) {
        const container = document.getElementById(`${groupName}List`);
        
        if (resources.length === 0) {
            container.innerHTML = '<div class="empty-state">No members in this group</div>';
            return;
        }

        container.innerHTML = resources.map(resource => {
            const isSelected = this.config.resources.selected.find(s => s.id === resource.id);
            const initials = resource.name.split(' ').map(n => n[0]).join('').substring(0, 2);
            
            return `
                <div class="resource-item ${isSelected ? 'selected' : ''}" 
                     onclick="configManager.toggleResource('${resource.id}')">
                    <div class="resource-avatar">${initials}</div>
                    <div class="resource-name">${resource.name}</div>
                </div>
            `;
        }).join('');
    }

    toggleResource(resourceId) {
        const resource = this.config.resources.available.find(r => r.id === resourceId);
        if (!resource) return;

        const existingIndex = this.config.resources.selected.findIndex(s => s.id === resourceId);
        if (existingIndex >= 0) {
            this.config.resources.selected.splice(existingIndex, 1);
        } else {
            this.config.resources.selected.push(resource);
        }

        this.renderAvailableResources();
        this.updateCurrentResourcesDisplay();
    }

    selectAllResources() {
        this.config.resources.selected = [...this.config.resources.available];
        this.renderAvailableResources();
        this.updateCurrentResourcesDisplay();
    }

    clearAllResources() {
        this.config.resources.selected = [];
        this.renderAvailableResources();
        this.updateCurrentResourcesDisplay();
    }

    updateResourceSelectionCount() {
        const count = this.config.resources.selected.length;
        const total = this.config.resources.available.length;
        document.querySelector('.selection-count').textContent = `${count} of ${total} selected`;
    }

    // Iteration Management
    async loadAvailableIterations() {
        if (!this.isConnected) return;

        try {
            const { org, project, patToken } = this.config.connection;
            
            // Get the default team first
            const teamResponse = await fetch(`https://dev.azure.com/${org}/_apis/projects/${project}/teams?api-version=6.0`, {
                headers: {
                    'Authorization': `Basic ${btoa(':' + patToken)}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!teamResponse.ok) {
                throw new Error(`Failed to fetch teams: ${teamResponse.status}`);
            }

            const teamData = await teamResponse.json();
            const teams = teamData.value || [];

            if (teams.length === 0) {
                this.showNotification('No teams found to load iterations', 'warning');
                return;
            }

            const team = teams[0]; // Use the first team

            // Get iterations for the team
            const iterationResponse = await fetch(`https://dev.azure.com/${org}/${project}/${team.id}/_apis/work/teamsettings/iterations?api-version=6.0`, {
                headers: {
                    'Authorization': `Basic ${btoa(':' + patToken)}`,
                    'Content-Type': 'application/json'
                }
            });

            if (iterationResponse.ok) {
                const iterationData = await iterationResponse.json();
                this.config.iterations.available = iterationData.value.map(iteration => ({
                    id: iteration.id,
                    name: iteration.name,
                    path: iteration.path,
                    startDate: iteration.attributes?.startDate,
                    finishDate: iteration.attributes?.finishDate,
                    timeFrame: iteration.attributes?.timeFrame || 'current'
                }));

                this.renderAvailableIterations();
                this.autoSelectCurrentSprint();
                this.showNotification(`Found ${this.config.iterations.available.length} iterations`, 'success');
            } else {
                throw new Error(`Failed to fetch iterations: ${iterationResponse.status}`);
            }

        } catch (error) {
            console.error('Failed to load iterations:', error);
            this.showNotification(`Failed to load iterations: ${error.message}`, 'error');
        }
    }

    renderAvailableIterations() {
        const sprintSelector = document.getElementById('sprintSelector');
        const comparisonSelector = document.getElementById('comparisonSprints');
        
        // Clear existing options
        sprintSelector.innerHTML = '<option value="">Select Sprint...</option>';
        comparisonSelector.innerHTML = '';
        
        // Add iterations to selectors
        this.config.iterations.available.forEach(iteration => {
            const option = new Option(iteration.name, iteration.id);
            const comparisonOption = new Option(iteration.name, iteration.id);
            
            sprintSelector.add(option.cloneNode(true));
            comparisonSelector.add(comparisonOption);
        });
    }

    autoSelectCurrentSprint() {
        // Auto-select the current sprint based on dates
        const now = new Date();
        const currentSprint = this.config.iterations.available.find(iteration => {
            if (!iteration.startDate || !iteration.finishDate) return false;
            const start = new Date(iteration.startDate);
            const end = new Date(iteration.finishDate);
            return now >= start && now <= end;
        });

        if (currentSprint) {
            document.getElementById('sprintSelector').value = currentSprint.id;
            this.config.iterations.selected = currentSprint;
            this.updateCurrentSprintDisplay();
        }
    }

    // UI Update Methods
    updateConnectionStatus(status, message) {
        this.connectionStatus = status;
        const indicator = document.querySelector('.status-indicator');
        const text = document.querySelector('.status-text');
        
        indicator.className = `status-indicator ${status}`;
        text.textContent = message;
    }

    updateCurrentBoardsDisplay() {
        const element = document.getElementById('currentBoards');
        if (this.config.boards.selected.length === 0) {
            element.textContent = 'Not Selected';
            element.className = 'value not-configured';
        } else {
            element.textContent = this.config.boards.selected.map(b => b.name).join(', ');
            element.className = 'value configured';
        }
    }

    updateCurrentResourcesDisplay() {
        const element = document.getElementById('currentResources');
        const count = this.config.resources.selected.length;
        if (count === 0) {
            element.textContent = '(0)';
            element.className = 'value not-configured';
        } else {
            element.textContent = `(${count})`;
            element.className = 'value configured';
        }
    }

    updateCurrentSprintDisplay() {
        const element = document.getElementById('currentSprint');
        if (!this.config.iterations.selected) {
            element.textContent = 'Not Selected';
            element.className = 'value not-configured';
        } else {
            element.textContent = this.config.iterations.selected.name;
            element.className = 'value configured';
        }
    }

    // Configuration Persistence
    saveConfiguration() {
        try {
            localStorage.setItem('adoMetricsConfig', JSON.stringify(this.config));
            this.showNotification('Configuration saved successfully', 'success');
            
            // Update all displays
            this.updateUI();
            
            // Trigger data refresh if connected
            if (this.isConnected && window.dashboardController) {
                window.dashboardController.refreshAllData();
            }
        } catch (error) {
            console.error('Failed to save configuration:', error);
            this.showNotification('Failed to save configuration', 'error');
        }
    }

    loadSavedConfiguration() {
        try {
            const saved = localStorage.getItem('adoMetricsConfig');
            if (saved) {
                const config = JSON.parse(saved);
                this.config = { ...this.config, ...config };
                
                // Restore form values
                if (this.config.connection.organization) {
                    document.getElementById('organization').value = this.config.connection.organization;
                }
                if (this.config.connection.project) {
                    document.getElementById('project').value = this.config.connection.project;
                }
                // Note: Don't restore PAT for security
            }
        } catch (error) {
            console.error('Failed to load saved configuration:', error);
        }
    }

    resetConfiguration() {
        if (confirm('Are you sure you want to reset all configuration? This cannot be undone.')) {
            localStorage.removeItem('adoMetricsConfig');
            location.reload();
        }
    }

    // Utility Methods
    async makeADORequest(url, options = {}) {
        const { proxyUrl } = this.config.connection;
        const finalUrl = proxyUrl ? `${proxyUrl}${url}` : `https://dev.azure.com${url}`;
        
        const response = await fetch(finalUrl, {
            ...options,
            mode: 'cors'
        });
        
        return response;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Also log to console
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    setupEventListeners() {
        // Date range preset buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('preset-btn')) {
                document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                const range = e.target.getAttribute('data-range');
                this.config.iterations.dateRange.preset = range;
                
                if (range === 'custom') {
                    document.getElementById('customDateRange').style.display = 'block';
                } else {
                    document.getElementById('customDateRange').style.display = 'none';
                }
            }
        });

        // Resource search
        document.getElementById('resourceSearch')?.addEventListener('input', (e) => {
            this.filterResources(e.target.value);
        });
    }

    filterResources(searchTerm) {
        const term = searchTerm.toLowerCase();
        document.querySelectorAll('.resource-item').forEach(item => {
            const name = item.querySelector('.resource-name').textContent.toLowerCase();
            item.style.display = name.includes(term) ? 'flex' : 'none';
        });
    }

    updateUI() {
        this.updateCurrentBoardsDisplay();
        this.updateCurrentResourcesDisplay();
        this.updateCurrentSprintDisplay();
    }

    // Public API for other modules
    getConfiguration() {
        return { ...this.config };
    }

    isConfigured() {
        return this.isConnected && 
               this.config.boards.selected.length > 0 && 
               this.config.resources.selected.length > 0 &&
               this.config.iterations.selected;
    }

    getSelectedBoards() {
        return this.config.boards.selected;
    }

    getSelectedResources() {
        return this.config.resources.selected;
    }

    getSelectedIteration() {
        return this.config.iterations.selected;
    }

    getConnectionDetails() {
        return this.config.connection;
    }
}

// Global instance
window.configManager = new ConfigurationManager();

// Global functions for HTML onclick handlers
window.switchConfigTab = (tabName) => window.configManager.switchConfigTab(tabName);
window.testConnection = () => window.configManager.testConnection();
window.saveConfiguration = () => window.configManager.saveConfiguration();
window.resetConfiguration = () => window.configManager.resetConfiguration();
window.selectAllResources = () => window.configManager.selectAllResources();
window.clearAllResources = () => window.configManager.clearAllResources();