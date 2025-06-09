/**
 * Comprehensive Dashboard Integration Controller
 * Orchestrates all advanced modules and implements complete design requirements
 */

class DashboardIntegrationController {
    constructor() {
        this.currentSection = 'executive';
        this.isDataLoaded = false;
        this.lastRefreshTime = null;
        this.refreshInterval = null;
        
        // Data caches
        this.executiveData = {};
        this.sprintData = {};
        this.qualityData = {};
        this.teamData = {};
        this.aiInsights = {};
        
        this.initialize();
    }

    initialize() {
        console.log('🚀 Initializing Comprehensive Dashboard Integration...');
        this.setupEventListeners();
        this.setupPeriodicRefresh();
        console.log('✅ Dashboard Integration Controller initialized');
    }

    setupEventListeners() {
        // Global filter change handlers
        document.addEventListener('change', (e) => {
            if (e.target.matches('.global-filter')) {
                this.handleGlobalFilterChange(e.target);
            }
        });

        // Export button handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="export"]')) {
                this.handleExportRequest(e.target);
            }
        });

        // Table filter handlers
        document.addEventListener('input', (e) => {
            if (e.target.matches('.table-filter')) {
                this.handleTableFilter(e.target);
            }
        });
    }

    setupPeriodicRefresh() {
        const refreshInterval = window.configManager?.getConfiguration()?.preferences?.refreshInterval || 15;
        
        if (refreshInterval > 0) {
            this.refreshInterval = setInterval(() => {
                this.refreshCurrentSection();
            }, refreshInterval * 60 * 1000);
            
            console.log(`⏰ Auto-refresh enabled: ${refreshInterval} minutes`);
        }
    }

    // Main data loading orchestration
    async loadAllDashboardData() {
        if (!window.configManager || !window.configManager.isConfigured()) {
            console.warn('Dashboard not configured - cannot load data');
            this.showConfigurationPrompt();
            return;
        }

        try {
            console.log('🔄 Loading comprehensive dashboard data...');
            this.showGlobalLoading(true);

            // Load data from all modules in parallel
            await Promise.all([
                this.loadExecutiveData(),
                this.loadSprintData(), 
                this.loadQualityData(),
                this.loadTeamData(),
                this.loadAIInsights()
            ]);

            this.isDataLoaded = true;
            this.lastRefreshTime = new Date();
            this.updateLastRefreshDisplay();
            
            // Render current section
            this.renderCurrentSection();
            
            console.log('✅ All dashboard data loaded successfully');
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showErrorNotification('Failed to load dashboard data', error.message);
        } finally {
            this.showGlobalLoading(false);
        }
    }

    async loadExecutiveData() {
        console.log('📊 Loading executive dashboard data...');
        
        try {
            // Use business metrics integration for executive data
            if (window.businessMetricsIntegration) {
                await window.businessMetricsIntegration.calculateExecutiveMetrics();
                this.executiveData = window.businessMetricsIntegration.getExecutiveMetrics();
            }

            // Use predictive analytics for forecasting
            if (window.predictiveAnalytics) {
                await window.predictiveAnalytics.generateExecutiveForecasts();
                this.executiveData.forecasts = window.predictiveAnalytics.getExecutiveForecasts();
            }

            // Calculate project health score
            this.executiveData.projectHealth = this.calculateProjectHealthScore();
            
        } catch (error) {
            console.error('Failed to load executive data:', error);
            throw error;
        }
    }

    async loadSprintData() {
        console.log('🏃‍♂️ Loading sprint analytics data...');
        
        try {
            const iteration = window.configManager.getSelectedIteration();
            if (!iteration) {
                console.warn('No iteration selected for sprint data');
                return;
            }

            // Load sprint work items
            if (window.adoClient) {
                this.sprintData.workItems = await window.adoClient.getSprintWorkItems(iteration.id);
                this.sprintData.burndown = await this.calculateSprintBurndown(this.sprintData.workItems);
                this.sprintData.velocity = await this.calculateSprintVelocity();
                this.sprintData.scopeChanges = await this.trackScopeChanges(iteration.id);
            }

            // Generate predictive sprint insights
            if (window.predictiveAnalytics) {
                this.sprintData.completion = await window.predictiveAnalytics.predictSprintCompletion();
                this.sprintData.risks = await window.predictiveAnalytics.identifySprintRisks();
            }
            
        } catch (error) {
            console.error('Failed to load sprint data:', error);
            throw error;
        }
    }

    async loadQualityData() {
        console.log('🛡️ Loading quality metrics data...');
        
        try {
            // Load comprehensive test data with exact categorization
            if (window.testMetricsEngine) {
                await window.testMetricsEngine.loadTestData();
                
                this.qualityData = {
                    categories: window.testMetricsEngine.getTestCategoriesDefinition(),
                    executionMetrics: window.testMetricsEngine.getExecutionMetricsByCategory(),
                    linkingAnalysis: window.testMetricsEngine.getLinkingAnalysis(),
                    coverageAnalysis: window.testMetricsEngine.getCoverageAnalysis(),
                    summary: window.testMetricsEngine.generateTestMetricsSummary()
                };
            }

            // Load bug metrics with environment classification
            this.qualityData.bugs = await this.loadBugMetricsWithEnvironmentClassification();
            
            // Calculate quality gates
            this.qualityData.qualityGates = this.calculateQualityGateStatus();
            
        } catch (error) {
            console.error('Failed to load quality data:', error);
            throw error;
        }
    }

    async loadTeamData() {
        console.log('👥 Loading team performance data...');
        
        try {
            const selectedResources = window.configManager.getSelectedResources();
            if (selectedResources.length === 0) {
                console.warn('No team members selected');
                return;
            }

            // Load individual performance metrics for each team member
            this.teamData.members = [];
            for (const resource of selectedResources) {
                const memberMetrics = await this.loadIndividualPerformanceMetrics(resource);
                this.teamData.members.push(memberMetrics);
            }

            // Calculate team-level metrics
            if (window.businessMetrics) {
                this.teamData.teamVelocity = await window.businessMetrics.calculateTeamVelocity();
                this.teamData.workloadDistribution = await window.businessMetrics.calculateWorkloadDistribution();
                this.teamData.cycleTimeAnalysis = await window.businessMetrics.calculateCycleTimeAnalysis();
            }

            // Generate skills matrix if data available
            this.teamData.skillsMatrix = this.generateSkillsMatrix(this.teamData.members);
            
        } catch (error) {
            console.error('Failed to load team data:', error);
            throw error;
        }
    }

    async loadAIInsights() {
        console.log('🤖 Loading AI insights...');
        
        try {
            if (window.insightEngine) {
                // Generate comprehensive AI insights
                this.aiInsights = {
                    storyAnalysis: await window.insightEngine.analyzeStoryContent(),
                    sprintSummary: await window.insightEngine.generateSprintSummary(),
                    keyAccomplishments: await window.insightEngine.categorizeAccomplishments(),
                    executiveSummary: await window.insightEngine.generateExecutiveSummary(),
                    trendPredictions: await window.insightEngine.generateTrendPredictions()
                };
            }
        } catch (error) {
            console.error('Failed to load AI insights:', error);
            // AI insights are optional - don't throw
        }
    }

    // Section rendering methods
    renderCurrentSection() {
        switch (this.currentSection) {
            case 'executive':
                this.renderExecutiveSection();
                break;
            case 'sprint':
                this.renderSprintSection();
                break;
            case 'quality':
                this.renderQualitySection();
                break;
            case 'team':
                this.renderTeamSection();
                break;
            case 'ai':
                this.renderAISection();
                break;
            case 'reports':
                this.renderReportsSection();
                break;
        }
    }

    renderExecutiveSection() {
        console.log('📊 Rendering executive dashboard...');
        
        // Update metric cards
        this.updateExecutiveMetricCards();
        
        // Render executive charts
        if (window.chartManager && this.executiveData) {
            window.chartManager.renderExecutiveCharts(this.executiveData);
        }
    }

    updateExecutiveMetricCards() {
        const data = this.executiveData;
        
        // Project Health Score
        if (data.projectHealth) {
            document.getElementById('projectHealth').textContent = `${data.projectHealth.score}%`;
            document.getElementById('projectHealth').className = `metric-value ${data.projectHealth.status}`;
        }

        // Sprint Velocity
        if (data.velocity) {
            document.getElementById('sprintVelocity').textContent = data.velocity.current;
            const trend = data.velocity.trend > 0 ? '↗️' : data.velocity.trend < 0 ? '↘️' : '➡️';
            document.querySelector('#sprintVelocity').nextElementSibling.textContent = `${trend} ${data.velocity.change}%`;
        }

        // Test Coverage
        if (this.qualityData.summary) {
            document.getElementById('testCoverage').textContent = `${this.qualityData.summary.coveragePercentage}%`;
        }

        // Quality Gate
        if (this.qualityData.qualityGates) {
            const status = this.qualityData.qualityGates.overall;
            document.getElementById('qualityGate').textContent = status.status;
            document.getElementById('qualityGate').className = `metric-value ${status.status.toLowerCase()}`;
        }
    }

    renderQualitySection() {
        console.log('🛡️ Rendering quality metrics section...');
        
        if (!this.qualityData.categories) {
            console.warn('Quality data not available');
            return;
        }

        // Render test categories grid
        this.renderTestCategoriesGrid();
        
        // Render test execution summary table
        this.renderTestExecutionTable();
        
        // Render bug classification table
        this.renderBugClassificationTable();
        
        // Render test case details table
        this.renderTestCaseDetailsTable();
        
        // Render quality charts
        if (window.chartManager) {
            window.chartManager.renderQualityCharts(this.qualityData);
        }
    }

    renderTestCategoriesGrid() {
        const container = document.getElementById('categoriesGrid');
        if (!container) return;

        const categories = this.qualityData.categories;
        const executionMetrics = this.qualityData.executionMetrics;
        
        container.innerHTML = Object.keys(categories).map(categoryKey => {
            const category = categories[categoryKey];
            const metrics = executionMetrics[categoryKey] || {};
            
            return `
                <div class="category-card" data-category="${categoryKey}">
                    <div class="category-header">
                        <span class="category-icon">${category.icon}</span>
                        <h4>${category.name}</h4>
                    </div>
                    <div class="category-metrics">
                        <div class="metric">
                            <span class="metric-label">Total Tests</span>
                            <span class="metric-value">${metrics.total || 0}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Pass Rate</span>
                            <span class="metric-value">${metrics.passRate || 0}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Automation</span>
                            <span class="metric-value">${metrics.automationROI || 0}%</span>
                        </div>
                    </div>
                    <div class="category-description">
                        ${category.description}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTestExecutionTable() {
        const tableBody = document.getElementById('testExecutionTableBody');
        if (!tableBody) return;

        const executionMetrics = this.qualityData.executionMetrics;
        const categories = this.qualityData.categories;
        
        tableBody.innerHTML = Object.keys(categories).map(categoryKey => {
            const category = categories[categoryKey];
            const metrics = executionMetrics[categoryKey] || {};
            
            return `
                <tr data-category="${categoryKey}">
                    <td>
                        <span class="category-badge">
                            ${category.icon} ${category.name}
                        </span>
                    </td>
                    <td>${metrics.total || 0}</td>
                    <td>${metrics.executed || 0}</td>
                    <td>${metrics.passed || 0}</td>
                    <td>${metrics.failed || 0}</td>
                    <td>
                        <span class="pass-rate ${this.getPassRateClass(metrics.passRate)}">
                            ${metrics.passRate || 0}%
                        </span>
                    </td>
                    <td>${metrics.averageDuration || 0}s</td>
                    <td>${metrics.automationROI || 0}%</td>
                    <td>
                        <span class="stability-score ${this.getStabilityClass(metrics.stabilityScore)}">
                            ${metrics.stabilityScore || 0}%
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderTeamSection() {
        console.log('👥 Rendering team performance section...');
        
        if (!this.teamData.members || this.teamData.members.length === 0) {
            document.getElementById('teamPerformanceTableBody').innerHTML = 
                '<tr><td colspan="9" class="loading-cell">No team members selected</td></tr>';
            return;
        }

        // Render individual performance cards
        this.renderTeamMemberCards();
        
        // Render team performance table
        this.renderTeamPerformanceTable();
        
        // Render team charts
        if (window.chartManager) {
            window.chartManager.renderTeamCharts(this.teamData);
        }
    }

    renderTeamMemberCards() {
        const container = document.getElementById('teamMembersGrid');
        if (!container) return;

        container.innerHTML = this.teamData.members.map(member => {
            const efficiency = this.calculateMemberEfficiency(member);
            const initials = member.displayName.split(' ').map(n => n[0]).join('').substring(0, 2);
            
            return `
                <div class="team-member-card" data-member-id="${member.id}">
                    <div class="member-header">
                        <div class="member-avatar">${initials}</div>
                        <div class="member-info">
                            <h4>${member.displayName}</h4>
                            <p>${member.role || 'Team Member'}</p>
                        </div>
                    </div>
                    <div class="member-metrics">
                        <div class="metric-row">
                            <span class="metric-label">Stories Delivered</span>
                            <span class="metric-value">${member.storiesDelivered || 0}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Story Points</span>
                            <span class="metric-value">${member.storyPoints || 0}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Bugs Created/Resolved</span>
                            <span class="metric-value">${member.bugsCreated || 0}/${member.bugsResolved || 0}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Test Cases Authored</span>
                            <span class="metric-value">${member.testCasesAuthored || 0}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Avg Cycle Time</span>
                            <span class="metric-value">${member.averageCycleTime || 0} days</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Current Workload</span>
                            <span class="metric-value workload-${this.getWorkloadLevel(member.currentWorkload)}">
                                ${member.currentWorkload || 0} items
                            </span>
                        </div>
                    </div>
                    <div class="member-efficiency">
                        <div class="efficiency-bar">
                            <div class="efficiency-fill" style="width: ${efficiency}%"></div>
                        </div>
                        <span class="efficiency-label">${efficiency}% Efficiency</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Export functionality implementation
    async exportExecutiveReport() {
        console.log('📤 Exporting executive report...');
        
        if (!window.reportGenerator) {
            console.error('Report generator not available');
            return;
        }

        try {
            const format = this.getDefaultExportFormat();
            await window.reportGenerator.generateExecutiveReport(this.executiveData, format);
            this.showSuccessNotification('Executive report exported successfully');
        } catch (error) {
            console.error('Failed to export executive report:', error);
            this.showErrorNotification('Export failed', error.message);
        }
    }

    async exportQualityReport() {
        console.log('📤 Exporting quality metrics report...');
        
        try {
            const format = this.getDefaultExportFormat();
            await window.reportGenerator.generateQualityReport(this.qualityData, format);
            this.showSuccessNotification('Quality report exported successfully');
        } catch (error) {
            console.error('Failed to export quality report:', error);
            this.showErrorNotification('Export failed', error.message);
        }
    }

    async exportTeamReport() {
        console.log('📤 Exporting team performance report...');
        
        try {
            const format = this.getDefaultExportFormat();
            await window.reportGenerator.generateTeamReport(this.teamData, format);
            this.showSuccessNotification('Team report exported successfully');
        } catch (error) {
            console.error('Failed to export team report:', error);
            this.showErrorNotification('Export failed', error.message);
        }
    }

    // Filtering and search functionality
    handleTableFilter(filterInput) {
        const filterValue = filterInput.value.toLowerCase();
        const tableId = filterInput.getAttribute('data-table') || 
                       filterInput.closest('.data-table-container').querySelector('table').id;
        
        const table = document.getElementById(tableId);
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(filterValue) ? '' : 'none';
        });
    }

    handleGlobalFilterChange(filterElement) {
        // Handle changes to global filters (board, resource, iteration selection)
        console.log('🔄 Global filter changed, refreshing data...');
        this.refreshCurrentSection();
    }

    // Utility methods
    calculateProjectHealthScore() {
        // Comprehensive project health calculation
        let score = 0;
        let factors = 0;

        // Velocity factor (25%)
        if (this.sprintData.velocity) {
            const velocityHealth = Math.min(100, this.sprintData.velocity.consistency * 100);
            score += velocityHealth * 0.25;
            factors++;
        }

        // Quality factor (25%)
        if (this.qualityData.summary) {
            const qualityHealth = parseFloat(this.qualityData.summary.overallPassRate);
            score += qualityHealth * 0.25;
            factors++;
        }

        // Test coverage factor (25%)
        if (this.qualityData.summary) {
            const coverageHealth = parseFloat(this.qualityData.summary.coveragePercentage);
            score += coverageHealth * 0.25;
            factors++;
        }

        // Team performance factor (25%)
        if (this.teamData.members) {
            const teamHealth = this.teamData.members.reduce((avg, member) => 
                avg + this.calculateMemberEfficiency(member), 0) / this.teamData.members.length;
            score += teamHealth * 0.25;
            factors++;
        }

        const finalScore = factors > 0 ? Math.round(score / factors * 100) / 100 : 0;
        
        return {
            score: Math.round(finalScore),
            status: finalScore >= 80 ? 'excellent' : finalScore >= 60 ? 'good' : finalScore >= 40 ? 'warning' : 'poor'
        };
    }

    calculateMemberEfficiency(member) {
        // Simple efficiency calculation based on delivered vs committed work
        const delivered = member.storyPoints || 0;
        const committed = member.committedPoints || delivered;
        const bugsRatio = member.bugsCreated > 0 ? member.bugsResolved / member.bugsCreated : 1;
        
        let efficiency = committed > 0 ? (delivered / committed) * 100 : 0;
        efficiency *= bugsRatio; // Adjust for bug resolution rate
        
        return Math.min(100, Math.max(0, Math.round(efficiency)));
    }

    getDefaultExportFormat() {
        return window.configManager?.getConfiguration()?.preferences?.export?.defaultFormat || 'excel';
    }

    getPassRateClass(passRate) {
        if (passRate >= 95) return 'excellent';
        if (passRate >= 85) return 'good';
        if (passRate >= 70) return 'warning';
        return 'poor';
    }

    getStabilityClass(stabilityScore) {
        if (stabilityScore >= 90) return 'stable';
        if (stabilityScore >= 75) return 'moderate';
        return 'unstable';
    }

    getWorkloadLevel(workload) {
        if (workload <= 3) return 'low';
        if (workload <= 6) return 'medium';
        return 'high';
    }

    // Notification methods
    showSuccessNotification(message) {
        this.showNotification(message, 'success');
    }

    showErrorNotification(title, message) {
        this.showNotification(`${title}: ${message}`, 'error');
    }

    showNotification(message, type = 'info') {
        // Use existing notification system
        if (window.configManager && window.configManager.showNotification) {
            window.configManager.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    showGlobalLoading(show) {
        const loaders = document.querySelectorAll('.loading');
        loaders.forEach(loader => {
            loader.style.display = show ? 'block' : 'none';
        });
    }

    updateLastRefreshDisplay() {
        const element = document.getElementById('lastRefresh');
        if (element && this.lastRefreshTime) {
            element.textContent = `Last updated: ${this.lastRefreshTime.toLocaleTimeString()}`;
        }
    }

    showConfigurationPrompt() {
        const message = 'Dashboard not configured. Please configure your Azure DevOps connection.';
        this.showNotification(message, 'warning');
        
        // Show all loading states with configuration message
        document.querySelectorAll('.loading').forEach(loader => {
            loader.textContent = 'Configure Azure DevOps connection to load data';
            loader.style.display = 'block';
        });
    }

    // Public API for external calls
    refreshCurrentSection() {
        switch (this.currentSection) {
            case 'executive':
                this.loadExecutiveData().then(() => this.renderExecutiveSection());
                break;
            case 'sprint':
                this.loadSprintData().then(() => this.renderSprintSection());
                break;
            case 'quality':
                this.loadQualityData().then(() => this.renderQualitySection());
                break;
            case 'team':
                this.loadTeamData().then(() => this.renderTeamSection());
                break;
            case 'ai':
                this.loadAIInsights().then(() => this.renderAISection());
                break;
        }
    }

    switchToSection(sectionName) {
        this.currentSection = sectionName;
        this.renderCurrentSection();
    }

    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Global instance
window.dashboardIntegration = new DashboardIntegrationController();

// Enhanced global functions for HTML integration
window.refreshExecutiveData = () => window.dashboardIntegration.refreshCurrentSection();
window.refreshSprintData = () => window.dashboardIntegration.refreshCurrentSection();
window.refreshQualityData = () => window.dashboardIntegration.refreshCurrentSection();
window.refreshTeamData = () => window.dashboardIntegration.refreshCurrentSection();

window.exportExecutiveReport = () => window.dashboardIntegration.exportExecutiveReport();
window.exportSprintReport = () => window.dashboardIntegration.exportSprintReport();
window.exportQualityReport = () => window.dashboardIntegration.exportQualityReport();
window.exportTeamReport = () => window.dashboardIntegration.exportTeamReport();

// Initialize dashboard when configuration is ready
window.addEventListener('configurationReady', () => {
    window.dashboardIntegration.loadAllDashboardData();
});

// Switch section handler
const originalSwitchSection = window.switchSection;
window.switchSection = function(sectionName) {
    originalSwitchSection(sectionName);
    window.dashboardIntegration.switchToSection(sectionName);
};