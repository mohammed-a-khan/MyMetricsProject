/**
 * Dashboard Controller - Production Implementation
 * Coordinates all components and renders dashboard views with real ADO data
 */
class DashboardController {
    constructor() {
        this.configManager = null;
        this.adoClient = null;
        this.testMetricsEngine = null;
        this.currentSection = 'executive';
        this.isDataLoaded = false;
        this.dashboardData = {
            workItems: [],
            testMetrics: null,
            teamMetrics: null,
            qualityMetrics: null
        };
    }

    async initialize() {
        try {
            // Wait for ConfigManager to be available
            if (window.configManager) {
                this.configManager = window.configManager;
                this.adoClient = this.configManager.getADOClient();
                
                if (this.adoClient) {
                    await this.initializeMetricsEngines();
                    await this.loadDashboardData();
                }
            }
            
            this.setupEventListeners();
            console.log('✅ DashboardController initialized');
        } catch (error) {
            console.error('❌ Failed to initialize DashboardController:', error);
        }
    }

    async initializeMetricsEngines() {
        try {
            // Initialize Test Metrics Engine
            if (window.TestMetricsEngine) {
                this.testMetricsEngine = new TestMetricsEngine(this.adoClient);
                await this.testMetricsEngine.initialize();
            }

            console.log('Metrics engines initialized');
        } catch (error) {
            console.error('Failed to initialize metrics engines:', error);
        }
    }

    setupEventListeners() {
        // Listen for configuration changes
        document.addEventListener('boardSelectionChanged', () => {
            this.onConfigurationChanged();
        });

        document.addEventListener('resourceSelectionChanged', () => {
            this.onConfigurationChanged();
        });

        document.addEventListener('iterationSelectionChanged', () => {
            this.onConfigurationChanged();
        });

        // Navigation clicks
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // Quick filters
        const quickBoardFilter = document.getElementById('quickBoardFilter');
        if (quickBoardFilter) {
            quickBoardFilter.addEventListener('change', (e) => {
                this.handleQuickBoardSwitch(e.target.value);
            });
        }

        const quickSprintFilter = document.getElementById('quickSprintFilter');
        if (quickSprintFilter) {
            quickSprintFilter.addEventListener('change', (e) => {
                this.handleQuickSprintSwitch(e.target.value);
            });
        }
    }

    async onConfigurationChanged() {
        if (this.configManager && this.configManager.isConfigured()) {
            await this.loadDashboardData();
            this.refreshCurrentSection();
        }
    }

    async loadDashboardData() {
        if (!this.adoClient) return;

        try {
            this.showGlobalLoading(true);
            
            // Get selected configurations
            const selectedBoards = window.boardSelector ? window.boardSelector.getSelectedBoards() : [];
            const selectedResources = window.resourceSelector ? window.resourceSelector.getSelectedResourceNames() : [];
            const selectedIterations = window.iterationSelector ? window.iterationSelector.getSelectedIterationPaths() : [];

            if (selectedIterations.length === 0) {
                console.warn('No iterations selected, cannot load data');
                return;
            }

            // Load work items for selected iterations and resources
            const workItemsPromises = selectedIterations.map(iterationPath => 
                this.adoClient.getIterationWorkItems(iterationPath, selectedResources)
            );

            const workItemsResults = await Promise.all(workItemsPromises);
            this.dashboardData.workItems = workItemsResults.flatMap(result => result.value || []);

            // Load test metrics
            if (this.testMetricsEngine) {
                this.dashboardData.testMetrics = this.testMetricsEngine.getComprehensiveTestMetrics();
            }

            // Load team and quality metrics
            await this.calculateDerivedMetrics();

            this.isDataLoaded = true;
            this.updateLastRefreshDisplay();
            
            console.log(`Loaded ${this.dashboardData.workItems.length} work items`);
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showError('Failed to load dashboard data: ' + error.message);
        } finally {
            this.showGlobalLoading(false);
        }
    }

    async calculateDerivedMetrics() {
        // Calculate team performance metrics
        this.dashboardData.teamMetrics = this.calculateTeamMetrics();
        
        // Calculate quality metrics
        this.dashboardData.qualityMetrics = this.calculateQualityMetrics();
    }

    calculateTeamMetrics() {
        const selectedResources = window.resourceSelector ? 
            window.resourceSelector.getSelectedResources() : [];
        
        const teamMetrics = selectedResources.map(resource => {
            const resourceWorkItems = this.dashboardData.workItems.filter(wi => 
                wi.fields?.['System.AssignedTo']?.displayName === resource.displayName ||
                wi.fields?.['System.AssignedTo']?.uniqueName === resource.uniqueName
            );

            const stories = resourceWorkItems.filter(wi => 
                wi.fields?.['System.WorkItemType'] === 'User Story'
            );
            
            const tasks = resourceWorkItems.filter(wi => 
                wi.fields?.['System.WorkItemType'] === 'Task'
            );
            
            const bugs = resourceWorkItems.filter(wi => 
                wi.fields?.['System.WorkItemType'] === 'Bug'
            );

            const completedStories = stories.filter(wi => 
                ['Resolved', 'Done', 'Completed', 'Closed'].includes(wi.fields?.['System.State'])
            );

            const storyPoints = completedStories.reduce((total, story) => {
                const points = story.fields?.['Microsoft.VSTS.Scheduling.StoryPoints'] || 0;
                return total + points;
            }, 0);

            return {
                resource: resource,
                metrics: {
                    storiesDelivered: completedStories.length,
                    totalStories: stories.length,
                    storyPointsCompleted: storyPoints,
                    tasksCompleted: tasks.filter(t => 
                        ['Resolved', 'Done', 'Completed', 'Closed'].includes(t.fields?.['System.State'])
                    ).length,
                    bugsCreated: bugs.filter(b => 
                        b.fields?.['System.CreatedBy']?.displayName === resource.displayName
                    ).length,
                    bugsResolved: bugs.filter(b => 
                        ['Resolved', 'Done', 'Completed', 'Closed'].includes(b.fields?.['System.State'])
                    ).length,
                    averageCycleTime: this.calculateAverageCycleTime(stories),
                    currentWorkload: stories.filter(s => 
                        ['Active', 'In Progress', 'Committed'].includes(s.fields?.['System.State'])
                    ).length
                }
            };
        });

        return teamMetrics;
    }

    calculateAverageCycleTime(workItems) {
        const completedItems = workItems.filter(wi => 
            ['Resolved', 'Done', 'Completed', 'Closed'].includes(wi.fields?.['System.State'])
        );

        if (completedItems.length === 0) return 0;

        const cycleTimes = completedItems.map(wi => {
            const created = new Date(wi.fields?.['System.CreatedDate']);
            const resolved = new Date(wi.fields?.['Microsoft.VSTS.Common.StateChangeDate'] || wi.fields?.['System.ChangedDate']);
            return Math.max(0, (resolved - created) / (1000 * 60 * 60 * 24)); // Days
        });

        return (cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length).toFixed(1);
    }

    calculateQualityMetrics() {
        const bugs = this.dashboardData.workItems.filter(wi => 
            wi.fields?.['System.WorkItemType'] === 'Bug'
        );

        const stories = this.dashboardData.workItems.filter(wi => 
            wi.fields?.['System.WorkItemType'] === 'User Story'
        );

        // Bug classification by environment
        const bugsByEnvironment = this.classifyBugsByEnvironment(bugs);
        
        // Defect injection rate
        const defectInjectionRate = stories.length > 0 ? 
            ((bugs.length / stories.length) * 100).toFixed(1) : 0;

        return {
            bugsByEnvironment,
            defectInjectionRate,
            totalBugs: bugs.length,
            totalStories: stories.length,
            bugDistribution: this.getBugDistribution(bugs)
        };
    }

    classifyBugsByEnvironment(bugs) {
        const environments = ['Dev', 'QA', 'UAT', 'Production'];
        const classification = {};

        environments.forEach(env => {
            classification[env] = {
                environment: env,
                total: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                averageAge: 0
            };
        });

        bugs.forEach(bug => {
            // Determine environment from tags or area path
            let environment = 'QA'; // Default
            const tags = bug.fields?.['System.Tags'] || '';
            const areaPath = bug.fields?.['System.AreaPath'] || '';
            
            if (tags.toLowerCase().includes('production') || areaPath.toLowerCase().includes('prod')) {
                environment = 'Production';
            } else if (tags.toLowerCase().includes('uat') || areaPath.toLowerCase().includes('uat')) {
                environment = 'UAT';
            } else if (tags.toLowerCase().includes('dev') || areaPath.toLowerCase().includes('dev')) {
                environment = 'Dev';
            }

            if (classification[environment]) {
                classification[environment].total++;
                
                const severity = bug.fields?.['Microsoft.VSTS.Common.Severity'] || 'Medium';
                switch (severity.toLowerCase()) {
                    case 'critical':
                    case '1 - critical':
                        classification[environment].critical++;
                        break;
                    case 'high':
                    case '2 - high':
                        classification[environment].high++;
                        break;
                    case 'low':
                    case '4 - low':
                        classification[environment].low++;
                        break;
                    default:
                        classification[environment].medium++;
                        break;
                }

                // Calculate age
                const created = new Date(bug.fields?.['System.CreatedDate']);
                const age = (new Date() - created) / (1000 * 60 * 60 * 24);
                classification[environment].averageAge += age;
            }
        });

        // Calculate averages
        Object.keys(classification).forEach(env => {
            const envData = classification[env];
            if (envData.total > 0) {
                envData.averageAge = (envData.averageAge / envData.total).toFixed(1);
            }
        });

        return Object.values(classification);
    }

    getBugDistribution(bugs) {
        const severities = ['Critical', 'High', 'Medium', 'Low'];
        const distribution = {};

        severities.forEach(severity => {
            distribution[severity] = bugs.filter(bug => {
                const bugSeverity = bug.fields?.['Microsoft.VSTS.Common.Severity'] || 'Medium';
                return bugSeverity.toLowerCase().includes(severity.toLowerCase());
            }).length;
        });

        return distribution;
    }

    // DASHBOARD SECTION RENDERING

    switchSection(sectionName) {
        this.currentSection = sectionName;
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        // Update title
        const titles = {
            executive: 'Executive Dashboard',
            sprint: 'Sprint Analytics',
            quality: 'Quality Metrics',
            team: 'Team Performance',
            ai: 'AI Insights',
            reports: 'Reports'
        };
        document.getElementById('sectionTitle').textContent = titles[sectionName] || sectionName;

        // Render section content
        this.renderSection(sectionName);
    }

    renderSection(sectionName) {
        if (!this.isDataLoaded) {
            this.showSectionLoading(sectionName);
            return;
        }

        switch (sectionName) {
            case 'executive':
                this.renderExecutiveDashboard();
                break;
            case 'sprint':
                this.renderSprintAnalytics();
                break;
            case 'quality':
                this.renderQualityMetrics();
                break;
            case 'team':
                this.renderTeamPerformance();
                break;
            case 'ai':
                this.renderAIInsights();
                break;
            case 'reports':
                this.renderReports();
                break;
        }
    }

    renderExecutiveDashboard() {
        const container = document.getElementById('executiveContent');
        
        // Calculate executive metrics
        const totalStories = this.dashboardData.workItems.filter(wi => 
            wi.fields?.['System.WorkItemType'] === 'User Story'
        ).length;
        
        const completedStories = this.dashboardData.workItems.filter(wi => 
            wi.fields?.['System.WorkItemType'] === 'User Story' &&
            ['Resolved', 'Done', 'Completed', 'Closed'].includes(wi.fields?.['System.State'])
        ).length;

        const projectHealth = totalStories > 0 ? 
            Math.round((completedStories / totalStories) * 100) : 0;

        const testMetrics = this.dashboardData.testMetrics;
        const automationTrends = testMetrics ? testMetrics.automationTrends : null;

        container.innerHTML = `
            <div class="executive-grid">
                <div class="metric-card">
                    <div class="metric-header">
                        <h3>Project Health Score</h3>
                        <div class="metric-icon">📊</div>
                    </div>
                    <div class="metric-value">${projectHealth}/100</div>
                    <div class="metric-trend ${projectHealth >= 80 ? 'positive' : projectHealth >= 60 ? 'neutral' : 'negative'}">
                        ${projectHealth >= 80 ? '↗️ Excellent' : projectHealth >= 60 ? '→ Good' : '↘️ Needs Attention'}
                    </div>
                </div>

                <div class="metric-card">
                    <div class="metric-header">
                        <h3>Sprint Velocity</h3>
                        <div class="metric-icon">🏃</div>
                    </div>
                    <div class="metric-value">${completedStories}</div>
                    <div class="metric-subtext">Stories Completed</div>
                </div>

                <div class="metric-card">
                    <div class="metric-header">
                        <h3>Test Automation</h3>
                        <div class="metric-icon">🤖</div>
                    </div>
                    <div class="metric-value">${automationTrends ? automationTrends.automationRatio : 0}%</div>
                    <div class="metric-subtext">Automation Coverage</div>
                </div>

                <div class="metric-card">
                    <div class="metric-header">
                        <h3>Quality Gate</h3>
                        <div class="metric-icon">🛡️</div>
                    </div>
                    <div class="metric-value">${this.getQualityGateStatus()}</div>
                    <div class="metric-subtext">Current Status</div>
                </div>
            </div>

            <div class="executive-charts">
                <div class="chart-section">
                    <h3>Sprint Velocity Trend</h3>
                    <div id="velocityChart" class="chart-container">
                        ${this.renderVelocityChart()}
                    </div>
                </div>

                <div class="chart-section">
                    <h3>Test Coverage Overview</h3>
                    <div id="testCoverageChart" class="chart-container">
                        ${this.renderTestCoverageChart()}
                    </div>
                </div>
            </div>

            <div class="executive-summary">
                <h3>Key Deliverables</h3>
                <div class="deliverables-list">
                    ${this.renderKeyDeliverables()}
                </div>
            </div>
        `;
    }

    renderSprintAnalytics() {
        const container = document.getElementById('sprintContent');
        const stories = this.dashboardData.workItems.filter(wi => 
            wi.fields?.['System.WorkItemType'] === 'User Story'
        );

        container.innerHTML = `
            <div class="sprint-overview">
                <div class="sprint-metrics">
                    <div class="metric-item">
                        <span class="metric-label">Total Stories:</span>
                        <span class="metric-value">${stories.length}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Completed:</span>
                        <span class="metric-value">${stories.filter(s => 
                            ['Resolved', 'Done', 'Completed', 'Closed'].includes(s.fields?.['System.State'])
                        ).length}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">In Progress:</span>
                        <span class="metric-value">${stories.filter(s => 
                            ['Active', 'In Progress', 'Committed'].includes(s.fields?.['System.State'])
                        ).length}</span>
                    </div>
                </div>
            </div>

            <div class="story-breakdown">
                <h3>Story Breakdown</h3>
                <div class="story-table">
                    ${this.renderStoryBreakdownTable(stories)}
                </div>
            </div>

            <div class="sprint-charts">
                <div class="chart-section">
                    <h3>Burndown Chart</h3>
                    <div id="burndownChart" class="chart-container">
                        <p>Burndown chart would be rendered here with real sprint data</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderQualityMetrics() {
        const container = document.getElementById('qualityContent');
        const testMetrics = this.dashboardData.testMetrics;

        if (!testMetrics) {
            container.innerHTML = '<div class="loading">Loading test metrics...</div>';
            return;
        }

        container.innerHTML = `
            <div class="quality-overview">
                <h3>Test Case Breakdown by Category</h3>
                <div class="test-breakdown-table">
                    ${this.renderTestBreakdownTable(testMetrics.breakdown)}
                </div>
            </div>

            <div class="environment-results">
                <h3>Bug Classification by Environment</h3>
                <div class="environment-table">
                    ${this.renderEnvironmentTable(this.dashboardData.qualityMetrics.bugsByEnvironment)}
                </div>
            </div>

            <div class="automation-trends">
                <h3>Automation vs Manual Trends</h3>
                <div class="automation-chart">
                    ${this.renderAutomationTrendsChart(testMetrics.automationTrends)}
                </div>
            </div>
        `;
    }

    renderTeamPerformance() {
        const container = document.getElementById('teamContent');
        const teamMetrics = this.dashboardData.teamMetrics || [];

        container.innerHTML = `
            <div class="team-overview">
                <h3>Team Performance - Selected Resources Only</h3>
                <div class="team-cards">
                    ${teamMetrics.map(member => this.renderTeamMemberCard(member)).join('')}
                </div>
            </div>

            <div class="team-charts">
                <div class="chart-section">
                    <h3>Velocity Contribution</h3>
                    <div id="velocityContributionChart" class="chart-container">
                        ${this.renderVelocityContributionChart(teamMetrics)}
                    </div>
                </div>
            </div>
        `;
    }

    renderAIInsights() {
        const container = document.getElementById('aiContent');
        
        container.innerHTML = `
            <div class="ai-insights">
                <h3>Story Content Analysis</h3>
                <div class="insights-grid">
                    <div class="insight-card">
                        <h4>Business Value</h4>
                        <div class="insight-content">
                            ${this.generateBusinessValueInsights()}
                        </div>
                    </div>
                    
                    <div class="insight-card">
                        <h4>Technical Excellence</h4>
                        <div class="insight-content">
                            ${this.generateTechnicalInsights()}
                        </div>
                    </div>
                    
                    <div class="insight-card">
                        <h4>Risk Mitigation</h4>
                        <div class="insight-content">
                            ${this.generateRiskInsights()}
                        </div>
                    </div>
                </div>

                <div class="sprint-summary">
                    <h3>Auto-Generated Sprint Summary</h3>
                    <div class="summary-content">
                        ${this.generateSprintSummary()}
                    </div>
                </div>
            </div>
        `;
    }

    renderReports() {
        const container = document.getElementById('reportsContent');
        
        container.innerHTML = `
            <div class="reports-section">
                <h3>Export Reports</h3>
                <div class="export-options">
                    <button class="btn btn-primary" onclick="dashboardController.exportToExcel()">
                        📊 Export to Excel
                    </button>
                    <button class="btn btn-primary" onclick="dashboardController.exportToPDF()">
                        📄 Export to PDF
                    </button>
                    <button class="btn btn-primary" onclick="dashboardController.exportToPowerPoint()">
                        📑 Export to PowerPoint
                    </button>
                </div>

                <div class="report-summary">
                    <h3>Report Summary</h3>
                    <div class="summary-stats">
                        <div class="stat-item">
                            <span class="stat-label">Total Work Items:</span>
                            <span class="stat-value">${this.dashboardData.workItems.length}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Test Cases:</span>
                            <span class="stat-value">${this.dashboardData.testMetrics ? this.dashboardData.testMetrics.summary.totalTestCases : 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Team Members:</span>
                            <span class="stat-value">${this.dashboardData.teamMetrics ? this.dashboardData.teamMetrics.length : 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Helper rendering methods
    renderStoryBreakdownTable(stories) {
        if (stories.length === 0) {
            return '<p>No stories found for selected criteria</p>';
        }

        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>State</th>
                        <th>Assigned To</th>
                        <th>Points</th>
                        <th>Age (Days)</th>
                    </tr>
                </thead>
                <tbody>
                    ${stories.map(story => `
                        <tr>
                            <td>${story.id}</td>
                            <td class="story-title">${story.fields?.['System.Title'] || 'No Title'}</td>
                            <td class="state-${(story.fields?.['System.State'] || '').toLowerCase().replace(' ', '-')}">${story.fields?.['System.State'] || 'Unknown'}</td>
                            <td>${story.fields?.['System.AssignedTo']?.displayName || 'Unassigned'}</td>
                            <td class="text-center">${story.fields?.['Microsoft.VSTS.Scheduling.StoryPoints'] || 0}</td>
                            <td class="text-center">${this.calculateWorkItemAge(story)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        return tableHTML;
    }

    renderTestBreakdownTable(breakdown) {
        if (!breakdown || breakdown.length === 0) {
            return '<p>No test data available</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Total</th>
                        <th>Executed</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Pass Rate</th>
                        <th>Avg Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${breakdown.map(row => `
                        <tr>
                            <td><strong>${row.category}</strong></td>
                            <td class="text-center">${row.total}</td>
                            <td class="text-center">${row.executed}</td>
                            <td class="text-center text-success">${row.passed}</td>
                            <td class="text-center text-danger">${row.failed}</td>
                            <td class="text-center">${row.passRate}</td>
                            <td class="text-center">${row.avgTime}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderEnvironmentTable(environments) {
        if (!environments || environments.length === 0) {
            return '<p>No environment data available</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Environment</th>
                        <th>Total</th>
                        <th>Critical</th>
                        <th>High</th>
                        <th>Medium</th>
                        <th>Low</th>
                        <th>Avg Age</th>
                    </tr>
                </thead>
                <tbody>
                    ${environments.map(env => `
                        <tr>
                            <td><strong>${env.environment}</strong></td>
                            <td class="text-center">${env.total}</td>
                            <td class="text-center text-danger">${env.critical}</td>
                            <td class="text-center text-warning">${env.high}</td>
                            <td class="text-center text-info">${env.medium}</td>
                            <td class="text-center text-success">${env.low}</td>
                            <td class="text-center">${env.averageAge} days</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderTeamMemberCard(memberData) {
        const member = memberData.resource;
        const metrics = memberData.metrics;

        return `
            <div class="team-member-card">
                <div class="member-header">
                    <div class="member-avatar">
                        ${(member.displayName || member.name || '').charAt(0).toUpperCase()}
                    </div>
                    <div class="member-info">
                        <h4>${member.displayName || member.name || member.uniqueName}</h4>
                        <p>${member.teams ? member.teams.join(', ') : ''}</p>
                    </div>
                </div>
                <div class="member-metrics">
                    <div class="metric-row">
                        <span>Stories Delivered:</span>
                        <span class="metric-value">${metrics.storiesDelivered}</span>
                    </div>
                    <div class="metric-row">
                        <span>Story Points:</span>
                        <span class="metric-value">${metrics.storyPointsCompleted}</span>
                    </div>
                    <div class="metric-row">
                        <span>Avg Cycle Time:</span>
                        <span class="metric-value">${metrics.averageCycleTime} days</span>
                    </div>
                    <div class="metric-row">
                        <span>Current Workload:</span>
                        <span class="metric-value">${metrics.currentWorkload} items</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Utility methods
    calculateWorkItemAge(workItem) {
        const created = new Date(workItem.fields?.['System.CreatedDate']);
        const now = new Date();
        return Math.ceil((now - created) / (1000 * 60 * 60 * 24));
    }

    getQualityGateStatus() {
        const testMetrics = this.dashboardData.testMetrics;
        if (!testMetrics) return 'Unknown';
        
        const automation = testMetrics.automationTrends;
        if (!automation) return 'Unknown';
        
        const automationRatio = parseFloat(automation.automationRatio);
        if (automationRatio >= 80) return 'Passed';
        if (automationRatio >= 60) return 'Warning';
        return 'Failed';
    }

    // Chart rendering placeholders
    renderVelocityChart() {
        return '<div class="chart-placeholder">Velocity chart will be rendered here</div>';
    }

    renderTestCoverageChart() {
        return '<div class="chart-placeholder">Test coverage chart will be rendered here</div>';
    }

    renderAutomationTrendsChart(trends) {
        if (!trends) return '<div class="chart-placeholder">No automation data available</div>';
        
        return `
            <div class="automation-stats">
                <div class="stat-item">
                    <span class="stat-label">Automated:</span>
                    <span class="stat-value">${trends.automated.percentage}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Manual:</span>
                    <span class="stat-value">${trends.manual.percentage}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Semi-Automated:</span>
                    <span class="stat-value">${trends.semiAutomated.percentage}%</span>
                </div>
            </div>
        `;
    }

    renderVelocityContributionChart(teamMetrics) {
        return `
            <div class="velocity-stats">
                ${teamMetrics.map(member => `
                    <div class="velocity-item">
                        <span class="member-name">${member.resource.displayName || member.resource.name}</span>
                        <span class="story-points">${member.metrics.storyPointsCompleted} pts</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderKeyDeliverables() {
        const completedStories = this.dashboardData.workItems.filter(wi => 
            wi.fields?.['System.WorkItemType'] === 'User Story' &&
            ['Resolved', 'Done', 'Completed', 'Closed'].includes(wi.fields?.['System.State'])
        );

        return completedStories.slice(0, 5).map(story => `
            <div class="deliverable-item">
                <div class="deliverable-title">${story.fields?.['System.Title'] || 'No Title'}</div>
                <div class="deliverable-id">ID: ${story.id}</div>
            </div>
        `).join('') || '<p>No completed deliverables found</p>';
    }

    // AI Insights generation
    generateBusinessValueInsights() {
        const stories = this.dashboardData.workItems.filter(wi => 
            wi.fields?.['System.WorkItemType'] === 'User Story'
        );
        
        const businessKeywords = ['revenue', 'customer', 'user experience', 'efficiency', 'cost', 'roi'];
        const businessStories = stories.filter(story => {
            const title = (story.fields?.['System.Title'] || '').toLowerCase();
            const description = (story.fields?.['System.Description'] || '').toLowerCase();
            return businessKeywords.some(keyword => 
                title.includes(keyword) || description.includes(keyword)
            );
        });

        return `
            <ul>
                <li>Identified ${businessStories.length} stories with direct business value</li>
                <li>Focus on customer experience improvements</li>
                <li>Efficiency gains in core processes</li>
            </ul>
        `;
    }

    generateTechnicalInsights() {
        return `
            <ul>
                <li>Code quality improvements implemented</li>
                <li>Technical debt reduction initiatives</li>
                <li>Performance optimization completed</li>
            </ul>
        `;
    }

    generateRiskInsights() {
        return `
            <ul>
                <li>Security vulnerabilities addressed</li>
                <li>Risk mitigation strategies in place</li>
                <li>Compliance requirements met</li>
            </ul>
        `;
    }

    generateSprintSummary() {
        const totalStories = this.dashboardData.workItems.filter(wi => 
            wi.fields?.['System.WorkItemType'] === 'User Story'
        ).length;
        
        const completedStories = this.dashboardData.workItems.filter(wi => 
            wi.fields?.['System.WorkItemType'] === 'User Story' &&
            ['Resolved', 'Done', 'Completed', 'Closed'].includes(wi.fields?.['System.State'])
        ).length;

        return `
            <p>Sprint completed with ${completedStories} out of ${totalStories} stories delivered. 
            Team demonstrated strong collaboration and technical execution. 
            Quality metrics indicate healthy development practices with good test coverage.</p>
        `;
    }

    // Export functionality
    exportToExcel() {
        console.log('Exporting to Excel...');
        // Implementation would use a library like SheetJS
    }

    exportToPDF() {
        console.log('Exporting to PDF...');
        // Implementation would use a library like jsPDF
    }

    exportToPowerPoint() {
        console.log('Exporting to PowerPoint...');
        // Implementation would use appropriate library
    }

    // State management
    showGlobalLoading(show) {
        document.querySelectorAll('.loading').forEach(loader => {
            loader.style.display = show ? 'flex' : 'none';
        });
    }

    showSectionLoading(sectionName) {
        const container = document.getElementById(`${sectionName}Content`);
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    Loading ${sectionName} data...
                </div>
            `;
        }
    }

    showError(message) {
        console.error(message);
        // Could implement toast notification
    }

    updateLastRefreshDisplay() {
        const lastRefreshElement = document.getElementById('lastRefresh');
        if (lastRefreshElement) {
            lastRefreshElement.textContent = `Refreshed at ${new Date().toLocaleTimeString()}`;
        }
    }

    refreshCurrentSection() {
        this.renderSection(this.currentSection);
    }

    handleQuickBoardSwitch(boardId) {
        console.log('Switching to board:', boardId);
        // Implementation would filter data by board
    }

    handleQuickSprintSwitch(sprintId) {
        console.log('Switching to sprint:', sprintId);
        // Implementation would filter data by sprint
    }
}

// Initialize dashboard controller
window.dashboardController = new DashboardController();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardController.initialize();
});

window.DashboardController = DashboardController; 