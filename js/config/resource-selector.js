/**
 * Resource Selector Component - Production Implementation
 * Handles multi-selection of team members from ADO with grouping and filtering
 */
class ResourceSelector {
    constructor(adoClient) {
        this.adoClient = adoClient;
        this.selectedResources = [];
        this.allResources = [];
        this.teams = [];
        this.isLoading = false;
    }

    async initialize() {
        try {
            this.showLoading();
            await this.loadTeamsAndMembers();
            this.renderResourcesList();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize ResourceSelector:', error);
            this.showError('Failed to load team members. Please check your connection.');
        }
    }

    async onBoardsChanged(selectedBoards) {
        if (selectedBoards.length === 0) {
            this.showEmptyState('Select boards to load team members');
            return;
        }

        try {
            this.showLoading();
            await this.loadTeamsAndMembers();
            this.renderResourcesList();
        } catch (error) {
            console.error('Failed to reload resources for boards:', error);
            this.showError('Failed to load team members for selected boards');
        }
    }

    async loadTeamsAndMembers() {
        if (!this.adoClient) {
            throw new Error('ADO Client not initialized');
        }

        try {
            // Get all teams for the project
            const teamsResponse = await this.adoClient.getTeams();
            this.teams = teamsResponse.value || [];
            
            // Get members for each team
            const memberPromises = this.teams.map(async (team) => {
                try {
                    const membersResponse = await this.adoClient.getTeamMembers(team.id);
                    return {
                        team: team,
                        members: membersResponse.value || []
                    };
                } catch (error) {
                    console.warn(`Failed to get members for team ${team.name}:`, error);
                    return { team: team, members: [] };
                }
            });

            const teamMemberResults = await Promise.all(memberPromises);
            
            // Flatten all members and remove duplicates
            const allMembers = [];
            const memberMap = new Map();

            teamMemberResults.forEach(result => {
                result.members.forEach(member => {
                    const key = member.uniqueName || member.id;
                    if (!memberMap.has(key)) {
                        memberMap.set(key, {
                            ...member,
                            teams: [result.team.name]
                        });
                        allMembers.push(memberMap.get(key));
                    } else {
                        // Add team to existing member
                        memberMap.get(key).teams.push(result.team.name);
                    }
                });
            });

            this.allResources = allMembers;
            console.log(`Loaded ${this.allResources.length} team members from ${this.teams.length} teams`);
            
            return this.allResources;
        } catch (error) {
            console.error('Failed to load teams and members:', error);
            throw error;
        }
    }

    renderResourcesList() {
        const container = document.getElementById('resourcesList');
        
        if (this.allResources.length === 0) {
            this.showEmptyState('No team members found');
            return;
        }

        // Group resources by team
        const groupedResources = this.groupResourcesByTeam();
        
        let resourcesHTML = '';
        
        Object.entries(groupedResources).forEach(([teamName, members]) => {
            resourcesHTML += `
                <div class="resource-group">
                    <div class="group-header">
                        <h4>${teamName}</h4>
                        <div class="group-actions">
                            <button class="btn btn-xs" onclick="resourceSelector.selectTeam('${teamName}')">
                                Select All
                            </button>
                            <button class="btn btn-xs" onclick="resourceSelector.deselectTeam('${teamName}')">
                                Clear
                            </button>
                        </div>
                    </div>
                    <div class="resource-items">
                        ${members.map(member => this.renderResourceItem(member)).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = resourcesHTML;
        this.updateSelectedDisplay();
    }

    renderResourceItem(member) {
        const isSelected = this.isResourceSelected(member.uniqueName || member.id);
        const displayName = member.displayName || member.name || member.uniqueName;
        const email = member.uniqueName || '';
        const teams = member.teams ? member.teams.join(', ') : '';

        return `
            <div class="resource-item ${isSelected ? 'selected' : ''}" 
                 data-resource-id="${member.uniqueName || member.id}">
                <div class="resource-info">
                    <div class="resource-avatar">
                        ${displayName.charAt(0).toUpperCase()}
                    </div>
                    <div class="resource-details">
                        <div class="resource-name">${displayName}</div>
                        <div class="resource-email">${email}</div>
                        <div class="resource-teams">${teams}</div>
                    </div>
                </div>
                <div class="resource-actions">
                    <input type="checkbox" 
                           class="resource-checkbox" 
                           data-resource-id="${member.uniqueName || member.id}"
                           ${isSelected ? 'checked' : ''}>
                </div>
            </div>
        `;
    }

    groupResourcesByTeam() {
        const grouped = {};
        
        this.allResources.forEach(member => {
            const primaryTeam = member.teams && member.teams.length > 0 ? member.teams[0] : 'Unassigned';
            
            if (!grouped[primaryTeam]) {
                grouped[primaryTeam] = [];
            }
            
            grouped[primaryTeam].push(member);
        });
        
        // Sort teams alphabetically
        const sortedGroups = {};
        Object.keys(grouped).sort().forEach(teamName => {
            sortedGroups[teamName] = grouped[teamName].sort((a, b) => 
                (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '')
            );
        });
        
        return sortedGroups;
    }

    setupEventListeners() {
        const container = document.getElementById('resourcesList');
        
        container.addEventListener('change', (event) => {
            if (event.target.classList.contains('resource-checkbox')) {
                const resourceId = event.target.dataset.resourceId;
                const isChecked = event.target.checked;
                this.handleResourceSelection(resourceId, isChecked);
            }
        });

        container.addEventListener('click', (event) => {
            if (event.target.closest('.resource-item')) {
                const resourceItem = event.target.closest('.resource-item');
                const checkbox = resourceItem.querySelector('.resource-checkbox');
                
                if (event.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.handleResourceSelection(checkbox.dataset.resourceId, checkbox.checked);
                }
            }
        });
    }

    handleResourceSelection(resourceId, isSelected) {
        const resource = this.allResources.find(r => 
            (r.uniqueName || r.id) === resourceId
        );
        
        if (!resource) return;

        if (isSelected) {
            if (!this.isResourceSelected(resourceId)) {
                this.selectedResources.push(resource);
            }
        } else {
            this.selectedResources = this.selectedResources.filter(r => 
                (r.uniqueName || r.id) !== resourceId
            );
        }

        this.updateUI();
        this.notifySelectionChange();
    }

    updateUI() {
        // Update resource items visual state
        document.querySelectorAll('.resource-item').forEach(item => {
            const resourceId = item.dataset.resourceId;
            const isSelected = this.isResourceSelected(resourceId);
            item.classList.toggle('selected', isSelected);
        });

        // Update checkboxes state
        document.querySelectorAll('.resource-checkbox').forEach(checkbox => {
            const resourceId = checkbox.dataset.resourceId;
            checkbox.checked = this.isResourceSelected(resourceId);
        });

        this.updateSelectedDisplay();
        this.updateGlobalDisplay();
    }

    updateSelectedDisplay() {
        const container = document.getElementById('selectedResources');
        const countElement = document.getElementById('resourceCount');
        
        if (countElement) {
            countElement.textContent = this.selectedResources.length;
        }
        
        if (this.selectedResources.length === 0) {
            container.innerHTML = '<p class="no-selection">No resources selected</p>';
            return;
        }

        const selectedHTML = this.selectedResources.map(resource => `
            <div class="selected-item" data-resource-id="${resource.uniqueName || resource.id}">
                <div class="item-info">
                    <div class="item-avatar">
                        ${(resource.displayName || resource.name || '').charAt(0).toUpperCase()}
                    </div>
                    <div class="item-details">
                        <div class="item-name">${resource.displayName || resource.name || resource.uniqueName}</div>
                        <div class="item-teams">${resource.teams ? resource.teams.join(', ') : ''}</div>
                    </div>
                </div>
                <button class="remove-btn" onclick="resourceSelector.removeResource('${resource.uniqueName || resource.id}')">
                    ×
                </button>
            </div>
        `).join('');

        container.innerHTML = selectedHTML;
    }

    updateGlobalDisplay() {
        const globalDisplay = document.getElementById('currentResources');
        if (globalDisplay) {
            if (this.selectedResources.length === 0) {
                globalDisplay.textContent = '(0)';
                globalDisplay.className = 'value not-configured';
            } else {
                globalDisplay.textContent = `(${this.selectedResources.length})`;
                globalDisplay.className = 'value configured';
            }
        }
    }

    // Helper methods
    selectTeam(teamName) {
        const teamMembers = this.allResources.filter(member => 
            member.teams && member.teams.includes(teamName)
        );
        
        teamMembers.forEach(member => {
            if (!this.isResourceSelected(member.uniqueName || member.id)) {
                this.selectedResources.push(member);
            }
        });
        
        this.updateUI();
        this.notifySelectionChange();
    }

    deselectTeam(teamName) {
        this.selectedResources = this.selectedResources.filter(resource => 
            !resource.teams || !resource.teams.includes(teamName)
        );
        
        this.updateUI();
        this.notifySelectionChange();
    }

    selectAllResources() {
        this.selectedResources = [...this.allResources];
        this.updateUI();
        this.notifySelectionChange();
    }

    clearAllResources() {
        this.selectedResources = [];
        this.updateUI();
        this.notifySelectionChange();
    }

    removeResource(resourceId) {
        this.selectedResources = this.selectedResources.filter(r => 
            (r.uniqueName || r.id) !== resourceId
        );
        this.updateUI();
        this.notifySelectionChange();
    }

    isResourceSelected(resourceId) {
        return this.selectedResources.some(resource => 
            (resource.uniqueName || resource.id) === resourceId
        );
    }

    getSelectedResources() {
        return [...this.selectedResources];
    }

    getSelectedResourceNames() {
        return this.selectedResources.map(r => r.displayName || r.name || r.uniqueName);
    }

    notifySelectionChange() {
        const event = new CustomEvent('resourceSelectionChanged', {
            detail: {
                selectedResources: this.getSelectedResources(),
                resourceIds: this.selectedResources.map(r => r.uniqueName || r.id),
                count: this.selectedResources.length
            }
        });
        
        document.dispatchEvent(event);
    }

    // State management
    showLoading() {
        const container = document.getElementById('resourcesList');
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                Loading team members...
            </div>
        `;
    }

    showEmptyState(message) {
        const container = document.getElementById('resourcesList');
        container.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('resourcesList');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
                <button class="btn btn-secondary" onclick="resourceSelector.initialize()">
                    Retry
                </button>
            </div>
        `;
    }

    // Configuration persistence
    saveToConfig(config) {
        config.selectedResources = this.selectedResources.map(resource => ({
            id: resource.id,
            uniqueName: resource.uniqueName,
            displayName: resource.displayName || resource.name,
            teams: resource.teams
        }));
    }

    loadFromConfig(config) {
        if (config.selectedResources && Array.isArray(config.selectedResources)) {
            this.selectedResources = config.selectedResources;
            this.updateUI();
        }
    }
}

window.ResourceSelector = ResourceSelector; 