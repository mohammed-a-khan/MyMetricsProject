/**
 * Business Metrics Integration Example
 * Demonstrates how to integrate business value tracking and ROI analysis with ADO Command Center
 */

class BusinessMetricsIntegration {
    constructor(adoCommandCenter) {
        this.adoCommandCenter = adoCommandCenter;
        this.businessMetrics = new BusinessMetrics();
        this.isInitialized = false;
        this.updateInterval = null;
        this.dashboardContainer = null;
        
        this.initialize();
    }

    async initialize() {
        try {
            // Configure business metrics for organization
            await this.configureBusinessMetrics();
            
            // Set up UI components
            this.setupBusinessMetricsUI();
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            this.isInitialized = true;
            console.log('Business Metrics Integration initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Business Metrics Integration:', error);
        }
    }

    async configureBusinessMetrics() {
        // Set organizational defaults
        this.businessMetrics.setCurrency('USD');
        
        // Add custom business rules
        this.businessMetrics.addBusinessRule('compliance_multiplier', (workItem) => {
            // Compliance work gets 1.5x value multiplier
            return workItem.tags?.includes('compliance') ? 1.5 : 1.0;
        });
        
        this.businessMetrics.addBusinessRule('customer_critical_multiplier', (workItem) => {
            // Customer-critical items get 2x value multiplier
            return workItem.tags?.includes('customer-critical') ? 2.0 : 1.0;
        });
        
        // Configure organization-specific thresholds
        const orgConfig = {
            businessRules: {
                high_value_threshold: 10,
                critical_debt_percentage: 15,
                target_innovation_ratio: 35
            },
            customConfigurations: {
                hourly_rate: 85, // Higher rate for your market
                overhead_multiplier: 1.6, // Higher overhead
                debt_interest_rate: 0.025 // 2.5% per sprint
            }
        };
        
        this.businessMetrics.importConfiguration(orgConfig);
    }

    setupBusinessMetricsUI() {
        // Create business metrics dashboard section
        this.dashboardContainer = this.createDashboardContainer();
        
        // Add business metrics tab to existing UI
        this.addBusinessMetricsTab();
        
        // Create metric cards
        this.createMetricCards();
        
        // Add export/report functionality
        this.addReportingControls();
    }

    createDashboardContainer() {
        const container = document.createElement('div');
        container.id = 'business-metrics-dashboard';
        container.className = 'metrics-dashboard';
        container.innerHTML = `
            <div class="dashboard-header">
                <h2>Business Value & ROI Dashboard</h2>
                <div class="dashboard-controls">
                    <select id="timeframe-selector">
                        <option value="sprint">Current Sprint</option>
                        <option value="quarter">Quarterly</option>
                        <option value="half-year">Half Year</option>
                        <option value="year">Annual</option>
                    </select>
                    <button id="refresh-metrics" class="btn-primary">Refresh</button>
                    <button id="export-report" class="btn-secondary">Export Report</button>
                </div>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-section" id="business-value-section">
                    <h3>Business Value</h3>
                    <div class="metric-cards" id="value-cards"></div>
                </div>
                
                <div class="metric-section" id="roi-section">
                    <h3>ROI Analysis</h3>
                    <div class="metric-cards" id="roi-cards"></div>
                </div>
                
                <div class="metric-section" id="debt-section">
                    <h3>Technical Debt</h3>
                    <div class="metric-cards" id="debt-cards"></div>
                </div>
                
                <div class="metric-section" id="efficiency-section">
                    <h3>Process Efficiency</h3>
                    <div class="metric-cards" id="efficiency-cards"></div>
                </div>
            </div>
            
            <div class="executive-summary" id="executive-summary">
                <h3>Executive Summary</h3>
                <div id="summary-content"></div>
            </div>
            
            <div class="detailed-analysis" id="detailed-analysis">
                <div class="tabs">
                    <button class="tab-button active" data-tab="value-delivery">Value Delivery</button>
                    <button class="tab-button" data-tab="cost-analysis">Cost Analysis</button>
                    <button class="tab-button" data-tab="technical-health">Technical Health</button>
                    <button class="tab-button" data-tab="trends">Trends</button>
                </div>
                <div class="tab-content" id="tab-content"></div>
            </div>
        `;
        
        // Insert into main dashboard
        const mainContainer = document.querySelector('.main-content') || document.body;
        mainContainer.appendChild(container);
        
        // Add event listeners
        this.attachEventListeners();
        
        return container;
    }

    addBusinessMetricsTab() {
        // Add to existing tab system if available
        const tabContainer = document.querySelector('.tab-navigation');
        if (tabContainer) {
            const businessTab = document.createElement('button');
            businessTab.className = 'tab-button';
            businessTab.textContent = 'Business Metrics';
            businessTab.dataset.tab = 'business-metrics';
            
            businessTab.addEventListener('click', () => {
                this.showBusinessMetricsDashboard();
            });
            
            tabContainer.appendChild(businessTab);
        }
    }

    createMetricCards() {
        // Business Value Cards
        this.createValueCards();
        
        // ROI Cards
        this.createROICards();
        
        // Technical Debt Cards
        this.createDebtCards();
        
        // Efficiency Cards
        this.createEfficiencyCards();
    }

    createValueCards() {
        const container = document.getElementById('value-cards');
        
        const cards = [
            { id: 'total-business-value', title: 'Total Business Value', value: '$0', trend: '0%' },
            { id: 'value-per-point', title: 'Value per Story Point', value: '$0', trend: '0%' },
            { id: 'customer-value', title: 'Customer Value', value: '$0', trend: '0%' },
            { id: 'strategic-alignment', title: 'Strategic Alignment', value: '0%', trend: '0%' }
        ];
        
        container.innerHTML = cards.map(card => `
            <div class="metric-card" id="${card.id}">
                <div class="metric-title">${card.title}</div>
                <div class="metric-value">${card.value}</div>
                <div class="metric-trend">${card.trend}</div>
            </div>
        `).join('');
    }

    createROICards() {
        const container = document.getElementById('roi-cards');
        
        const cards = [
            { id: 'portfolio-roi', title: 'Portfolio ROI', value: '0%', trend: '0%' },
            { id: 'payback-period', title: 'Payback Period', value: '0 months', trend: '0%' },
            { id: 'npv', title: 'Net Present Value', value: '$0', trend: '0%' },
            { id: 'value-investment-ratio', title: 'Value/Investment', value: '0x', trend: '0%' }
        ];
        
        container.innerHTML = cards.map(card => `
            <div class="metric-card" id="${card.id}">
                <div class="metric-title">${card.title}</div>
                <div class="metric-value">${card.value}</div>
                <div class="metric-trend">${card.trend}</div>
            </div>
        `).join('');
    }

    createDebtCards() {
        const container = document.getElementById('debt-cards');
        
        const cards = [
            { id: 'debt-ratio', title: 'Debt Ratio', value: '0%', grade: 'A' },
            { id: 'technical-health', title: 'Technical Health', value: '100', grade: 'A' },
            { id: 'debt-interest', title: 'Monthly Debt Cost', value: '$0', trend: '0%' },
            { id: 'payoff-time', title: 'Debt Payoff Time', value: '0 sprints', trend: '0%' }
        ];
        
        container.innerHTML = cards.map(card => `
            <div class="metric-card" id="${card.id}">
                <div class="metric-title">${card.title}</div>
                <div class="metric-value">${card.value}</div>
                <div class="metric-grade">${card.grade}</div>
            </div>
        `).join('');
    }

    createEfficiencyCards() {
        const container = document.getElementById('efficiency-cards');
        
        const cards = [
            { id: 'flow-efficiency', title: 'Flow Efficiency', value: '0%', grade: 'A' },
            { id: 'lead-time', title: 'Average Lead Time', value: '0 days', trend: '0%' },
            { id: 'cycle-time', title: 'Average Cycle Time', value: '0 days', trend: '0%' },
            { id: 'waste-impact', title: 'Waste Impact', value: '0%', trend: '0%' }
        ];
        
        container.innerHTML = cards.map(card => `
            <div class="metric-card" id="${card.id}">
                <div class="metric-title">${card.title}</div>
                <div class="metric-value">${card.value}</div>
                <div class="metric-grade">${card.grade || ''}</div>
            </div>
        `).join('');
    }

    attachEventListeners() {
        // Refresh button
        document.getElementById('refresh-metrics')?.addEventListener('click', () => {
            this.refreshMetrics();
        });
        
        // Export button
        document.getElementById('export-report')?.addEventListener('click', () => {
            this.exportReport();
        });
        
        // Timeframe selector
        document.getElementById('timeframe-selector')?.addEventListener('change', (e) => {
            this.changeTimeframe(e.target.value);
        });
        
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    async refreshMetrics() {
        try {
            this.showLoadingState();
            
            // Get current data from ADO Command Center
            const data = await this.collectCurrentData();
            
            // Generate comprehensive business metrics report
            const report = await this.businessMetrics.generateComprehensiveReport(data, {
                timeframe: this.getCurrentTimeframe(),
                currency: 'USD'
            });
            
            // Update UI with new metrics
            this.updateMetricsUI(report);
            
            // Update charts and visualizations
            this.updateCharts(report);
            
            // Update executive summary
            this.updateExecutiveSummary(report);
            
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Failed to refresh metrics:', error);
            this.showError('Failed to refresh metrics: ' + error.message);
        }
    }

    async collectCurrentData() {
        // Collect data from various ADO Command Center components
        const workItems = this.adoCommandCenter.dataManager?.workItems || [];
        const sprints = this.adoCommandCenter.dataManager?.sprints || [];
        const currentSprint = this.adoCommandCenter.dataManager?.currentSprint || {};
        
        // Get team metrics
        const teamMetrics = {
            teamSize: 8, // Could be configured or detected
            averageVelocity: this.calculateAverageVelocity(sprints),
            averageValuePerPoint: 1000 // Could be calculated from historical data
        };
        
        // Business context
        const businessContext = {
            strategicPriorities: ['revenue_growth', 'customer_satisfaction', 'operational_efficiency'],
            currentQuarter: this.getCurrentQuarter()
        };
        
        // Overhead costs (could be configured)
        const overheadCosts = {
            cloudServices: 8000,
            tooling: 3500,
            licenses: 5000,
            facilities: 6000
        };
        
        return {
            workItems,
            sprints,
            currentSprint,
            teamMetrics,
            businessContext,
            overheadCosts,
            timeframe: this.getCurrentTimeframe()
        };
    }

    updateMetricsUI(report) {
        // Update business value cards
        this.updateValueCards(report.businessValue);
        
        // Update ROI cards
        this.updateROICards(report.roi);
        
        // Update technical debt cards
        if (report.technicalDebt) {
            this.updateDebtCards(report.technicalDebt);
        }
        
        // Update efficiency cards
        if (report.processEfficiency) {
            this.updateEfficiencyCards(report.processEfficiency);
        }
    }

    updateValueCards(businessValue) {
        const formatter = this.businessMetrics.currencyFormatter;
        
        // Total Business Value
        const totalValueCard = document.getElementById('total-business-value');
        if (totalValueCard) {
            totalValueCard.querySelector('.metric-value').textContent = 
                formatter.format(businessValue.totalBusinessValue);
        }
        
        // Value per Story Point
        const valuePerPointCard = document.getElementById('value-per-point');
        if (valuePerPointCard) {
            valuePerPointCard.querySelector('.metric-value').textContent = 
                formatter.format(businessValue.averageValuePerItem);
        }
        
        // Customer Value
        const customerValueCard = document.getElementById('customer-value');
        if (customerValueCard) {
            customerValueCard.querySelector('.metric-value').textContent = 
                formatter.format(businessValue.totalCustomerValue);
        }
    }

    updateROICards(roi) {
        const formatter = this.businessMetrics.currencyFormatter;
        
        // Portfolio ROI
        const roiCard = document.getElementById('portfolio-roi');
        if (roiCard) {
            roiCard.querySelector('.metric-value').textContent = `${roi.roi.toFixed(1)}%`;
        }
        
        // Payback Period
        const paybackCard = document.getElementById('payback-period');
        if (paybackCard && roi.paybackPeriod) {
            paybackCard.querySelector('.metric-value').textContent = `${roi.paybackPeriod.toFixed(1)} months`;
        }
        
        // NPV
        const npvCard = document.getElementById('npv');
        if (npvCard) {
            npvCard.querySelector('.metric-value').textContent = formatter.format(roi.npv);
        }
        
        // Value/Investment Ratio
        const ratioCard = document.getElementById('value-investment-ratio');
        if (ratioCard) {
            ratioCard.querySelector('.metric-value').textContent = `${roi.valueToInvestmentRatio.toFixed(1)}x`;
        }
    }

    updateDebtCards(technicalDebt) {
        // Debt Ratio
        const debtRatioCard = document.getElementById('debt-ratio');
        if (debtRatioCard) {
            debtRatioCard.querySelector('.metric-value').textContent = 
                `${technicalDebt.debtToValueRatio.ratio.toFixed(1)}%`;
            debtRatioCard.querySelector('.metric-grade').textContent = 
                technicalDebt.debtToValueRatio.classification.toUpperCase();
        }
        
        // Technical Health
        const healthCard = document.getElementById('technical-health');
        if (healthCard) {
            healthCard.querySelector('.metric-value').textContent = 
                technicalDebt.healthScore.score.toFixed(0);
            healthCard.querySelector('.metric-grade').textContent = 
                technicalDebt.healthScore.grade;
        }
        
        // Debt Interest Cost
        const interestCard = document.getElementById('debt-interest');
        if (interestCard) {
            const formatter = this.businessMetrics.currencyFormatter;
            interestCard.querySelector('.metric-value').textContent = 
                formatter.format(technicalDebt.interestCalculation.monthlyInterestCost);
        }
        
        // Payoff Time
        const payoffCard = document.getElementById('payoff-time');
        if (payoffCard) {
            payoffCard.querySelector('.metric-value').textContent = 
                `${technicalDebt.interestCalculation.estimatedPayoffSprints} sprints`;
        }
    }

    updateEfficiencyCards(processEfficiency) {
        // Flow Efficiency
        const flowCard = document.getElementById('flow-efficiency');
        if (flowCard) {
            const efficiency = (processEfficiency.flowEfficiency.average * 100).toFixed(1);
            flowCard.querySelector('.metric-value').textContent = `${efficiency}%`;
            flowCard.querySelector('.metric-grade').textContent = 
                processEfficiency.flowEfficiency.grade;
        }
        
        // Lead Time
        const leadTimeCard = document.getElementById('lead-time');
        if (leadTimeCard) {
            leadTimeCard.querySelector('.metric-value').textContent = 
                `${processEfficiency.leadTime.average.toFixed(1)} days`;
        }
        
        // Cycle Time
        const cycleTimeCard = document.getElementById('cycle-time');
        if (cycleTimeCard) {
            cycleTimeCard.querySelector('.metric-value').textContent = 
                `${processEfficiency.cycleTime.average.toFixed(1)} days`;
        }
        
        // Waste Impact
        const wasteCard = document.getElementById('waste-impact');
        if (wasteCard) {
            wasteCard.querySelector('.metric-value').textContent = 
                `${processEfficiency.waste.totalWasteImpact.toFixed(1)}%`;
        }
    }

    updateExecutiveSummary(report) {
        const summaryContainer = document.getElementById('summary-content');
        if (!summaryContainer) return;
        
        const summary = this.generateExecutiveSummary(report);
        
        summaryContainer.innerHTML = `
            <div class="summary-grid">
                <div class="summary-section">
                    <h4>Key Performance Indicators</h4>
                    <ul>
                        <li>Portfolio ROI: <strong>${report.roi.roi.toFixed(1)}%</strong></li>
                        <li>Business Value Delivered: <strong>${this.businessMetrics.currencyFormatter.format(report.businessValue.totalBusinessValue)}</strong></li>
                        <li>Technical Health Grade: <strong>${report.technicalDebt?.healthScore.grade || 'N/A'}</strong></li>
                        <li>Process Efficiency: <strong>${report.processEfficiency?.overallEfficiency.grade || 'N/A'}</strong></li>
                    </ul>
                </div>
                
                <div class="summary-section">
                    <h4>Key Insights</h4>
                    <ul>
                        ${summary.insights.map(insight => `<li>${insight}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="summary-section">
                    <h4>Recommended Actions</h4>
                    <ul>
                        ${summary.actions.map(action => `<li>${action}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    generateExecutiveSummary(report) {
        const insights = [];
        const actions = [];
        
        // Business Value Insights
        if (report.businessValue.totalBusinessValue > 100000) {
            insights.push('Strong business value delivery this period');
        } else {
            insights.push('Business value delivery below expectations');
            actions.push('Review and prioritize high-value work items');
        }
        
        // ROI Insights
        if (report.roi.roi > 20) {
            insights.push('Portfolio ROI exceeds industry benchmarks');
        } else if (report.roi.roi < 10) {
            insights.push('Portfolio ROI below target threshold');
            actions.push('Optimize cost structure and focus on high-value initiatives');
        }
        
        // Technical Debt Insights
        if (report.technicalDebt?.healthScore.score < 70) {
            insights.push('Technical debt requires immediate attention');
            actions.push('Allocate 20% of capacity to debt reduction');
        }
        
        // Process Efficiency Insights
        if (report.processEfficiency?.overallEfficiency.score > 0.8) {
            insights.push('Excellent process efficiency maintained');
        } else if (report.processEfficiency?.overallEfficiency.score < 0.6) {
            insights.push('Process efficiency issues identified');
            actions.push('Implement lean process improvements');
        }
        
        return { insights, actions };
    }

    async exportReport() {
        try {
            const data = await this.collectCurrentData();
            const report = await this.businessMetrics.generateComprehensiveReport(data);
            
            // Create comprehensive report
            const reportData = {
                generatedDate: new Date().toISOString(),
                organization: 'Your Organization',
                timeframe: this.getCurrentTimeframe(),
                ...report
            };
            
            // Generate different export formats
            const formats = {
                json: () => this.exportAsJSON(reportData),
                csv: () => this.exportAsCSV(reportData),
                pdf: () => this.exportAsPDF(reportData),
                excel: () => this.exportAsExcel(reportData)
            };
            
            // Show export options
            this.showExportDialog(formats);
            
        } catch (error) {
            console.error('Failed to export report:', error);
            this.showError('Failed to export report: ' + error.message);
        }
    }

    showExportDialog(formats) {
        const dialog = document.createElement('div');
        dialog.className = 'export-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Export Business Metrics Report</h3>
                <div class="export-options">
                    <button class="export-btn" data-format="json">JSON</button>
                    <button class="export-btn" data-format="csv">CSV</button>
                    <button class="export-btn" data-format="pdf">PDF</button>
                    <button class="export-btn" data-format="excel">Excel</button>
                </div>
                <div class="dialog-actions">
                    <button class="btn-secondary" id="cancel-export">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners
        dialog.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.dataset.format;
                formats[format]();
                document.body.removeChild(dialog);
            });
        });
        
        dialog.querySelector('#cancel-export').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }

    exportAsJSON(reportData) {
        const blob = new Blob([JSON.stringify(reportData, null, 2)], {
            type: 'application/json'
        });
        this.downloadFile(blob, `business-metrics-${Date.now()}.json`);
    }

    exportAsCSV(reportData) {
        // Convert key metrics to CSV format
        const csvData = this.convertToCSV(reportData);
        const blob = new Blob([csvData], { type: 'text/csv' });
        this.downloadFile(blob, `business-metrics-${Date.now()}.csv`);
    }

    convertToCSV(reportData) {
        const rows = [
            ['Metric', 'Value', 'Category'],
            ['Total Business Value', reportData.businessValue.totalBusinessValue, 'Business Value'],
            ['Portfolio ROI', `${reportData.roi.roi}%`, 'ROI'],
            ['Payback Period', `${reportData.roi.paybackPeriod} months`, 'ROI'],
            ['Technical Health Score', reportData.technicalDebt?.healthScore.score || 'N/A', 'Technical Debt'],
            ['Flow Efficiency', `${(reportData.processEfficiency?.flowEfficiency.average * 100).toFixed(1)}%`, 'Process Efficiency']
        ];
        
        return rows.map(row => row.join(',')).join('\n');
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    startPeriodicUpdates() {
        // Update metrics every 5 minutes
        this.updateInterval = setInterval(() => {
            this.refreshMetrics();
        }, 5 * 60 * 1000);
    }

    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Utility methods
    calculateAverageVelocity(sprints) {
        if (!sprints || sprints.length === 0) return 20; // Default
        
        const velocities = sprints
            .filter(sprint => sprint.completedStoryPoints)
            .map(sprint => sprint.completedStoryPoints);
        
        return velocities.length > 0 ? 
            velocities.reduce((sum, v) => sum + v, 0) / velocities.length : 20;
    }

    getCurrentTimeframe() {
        const selector = document.getElementById('timeframe-selector');
        return selector ? selector.value : 'sprint';
    }

    getCurrentQuarter() {
        const month = new Date().getMonth();
        return Math.floor(month / 3) + 1;
    }

    showLoadingState() {
        document.querySelectorAll('.metric-card').forEach(card => {
            card.classList.add('loading');
        });
    }

    hideLoadingState() {
        document.querySelectorAll('.metric-card').forEach(card => {
            card.classList.remove('loading');
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const container = this.dashboardContainer;
        if (container) {
            container.insertBefore(errorDiv, container.firstChild);
            
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        }
    }

    showBusinessMetricsDashboard() {
        // Show the business metrics dashboard
        if (this.dashboardContainer) {
            this.dashboardContainer.style.display = 'block';
            this.refreshMetrics();
        }
    }

    destroy() {
        this.stopPeriodicUpdates();
        
        if (this.dashboardContainer && this.dashboardContainer.parentNode) {
            this.dashboardContainer.parentNode.removeChild(this.dashboardContainer);
        }
        
        this.isInitialized = false;
    }
}

// Integration with existing ADO Command Center
class ADOCommandCenterEnhanced {
    constructor() {
        this.originalCommandCenter = new ADOCommandCenter(); // Assuming this exists
        this.businessMetricsIntegration = null;
        
        this.initializeEnhancements();
    }

    async initializeEnhancements() {
        // Wait for original command center to initialize
        await this.originalCommandCenter.initialize();
        
        // Add business metrics integration
        this.businessMetricsIntegration = new BusinessMetricsIntegration(this.originalCommandCenter);
        
        // Enhance existing features
        this.enhanceExistingFeatures();
    }

    enhanceExistingFeatures() {
        // Add business value indicators to work item displays
        this.addBusinessValueIndicators();
        
        // Add ROI calculations to project views
        this.addROICalculations();
        
        // Add technical debt warnings
        this.addTechnicalDebtWarnings();
        
        // Enhance dashboard with business metrics
        this.enhanceDashboard();
    }

    addBusinessValueIndicators() {
        // Add value indicators to work item cards/lists
        const workItemElements = document.querySelectorAll('.work-item');
        workItemElements.forEach(element => {
            const workItemId = element.dataset.workItemId;
            if (workItemId) {
                this.addValueIndicator(element, workItemId);
            }
        });
    }

    addValueIndicator(element, workItemId) {
        const valueIndicator = document.createElement('div');
        valueIndicator.className = 'business-value-indicator';
        
        // Calculate business value for this work item
        // This would use cached calculations or quick estimation
        const estimatedValue = this.estimateBusinessValue(workItemId);
        
        valueIndicator.innerHTML = `
            <span class="value-badge ${estimatedValue.category}">${estimatedValue.category.toUpperCase()}</span>
            <span class="value-amount">${estimatedValue.formatted}</span>
        `;
        
        element.appendChild(valueIndicator);
    }

    estimateBusinessValue(workItemId) {
        // Quick business value estimation
        // In practice, this would use cached calculations
        return {
            category: 'medium',
            value: 5000,
            formatted: '$5,000'
        };
    }
}

// Usage Example
/*
// Initialize enhanced ADO Command Center with business metrics
const enhancedCommandCenter = new ADOCommandCenterEnhanced();

// Or add to existing command center
const existingCommandCenter = new ADOCommandCenter();
const businessMetrics = new BusinessMetricsIntegration(existingCommandCenter);

// Access business metrics data
const businessReport = await businessMetrics.businessMetrics.generateComprehensiveReport(data);
console.log('Business Value:', businessReport.businessValue);
console.log('ROI:', businessReport.roi);
console.log('Technical Debt:', businessReport.technicalDebt);
*/

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BusinessMetricsIntegration,
        ADOCommandCenterEnhanced
    };
} 