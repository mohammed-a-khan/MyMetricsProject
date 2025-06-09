/**
 * ADO Metrics Command Center - Chart Manager
 * Advanced chart visualization system with Chart.js integration
 * Supports velocity, burndown, quality, and performance metrics
 */

// Import Chart.js and required plugins
// Note: In production, include these via CDN or npm:
// <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
// <script src="https://cdn.jsdelivr.net/npm/hammerjs"></script>
// <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom"></script>
// <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation"></script>

// ========================================
// CHART MANAGER CORE CLASS
// ========================================
class ChartManager {
    constructor() {
        this.charts = new Map();
        this.themes = this.initializeThemes();
        this.currentTheme = 'light';
        this.colorScheme = this.initializeColorScheme();
        this.animations = this.initializeAnimations();
        this.realTimeUpdates = new Map();
        this.updateInterval = 30000; // 30 seconds
        
        this.init();
    }

    init() {
        this.registerChartDefaults();
        this.setupResizeHandlers();
        this.initializeLazyLoading();
        this.startRealTimeUpdates();
        
        console.log('📊 Chart Manager initialized with advanced visualizations');
    }

    initializeThemes() {
        return {
            light: {
                background: '#FFFFFF',
                text: '#2E3440',
                grid: '#E5E7EB',
                surface: '#F9FAFB'
            },
            dark: {
                background: '#1F2937',
                text: '#F9FAFB',
                grid: '#374151',
                surface: '#111827'
            }
        };
    }

    initializeColorScheme() {
        return {
            primary: '#94196B',
            primaryLight: '#B83A8C',
            primaryDark: '#6A1354',
            secondary: '#2E3440',
            success: '#A3BE8C',
            warning: '#EBCB8B',
            error: '#BF616A',
            info: '#5E81AC',
            
            // Gradient definitions
            gradients: {
                primary: ['#94196B', '#B83A8C'],
                success: ['#A3BE8C', '#8FBCBB'],
                warning: ['#EBCB8B', '#D08770'],
                error: ['#BF616A', '#D08770'],
                info: ['#5E81AC', '#81A1C1']
            }
        };
    }

    initializeAnimations() {
        return {
            duration: 1000,
            easing: 'easeOutQuart',
            delay: (context) => context.dataIndex * 100,
            loop: false
        };
    }

    registerChartDefaults() {
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            Chart.defaults.font.size = 12;
            Chart.defaults.color = this.themes[this.currentTheme].text;
            Chart.defaults.borderColor = this.themes[this.currentTheme].grid;
            Chart.defaults.backgroundColor = this.themes[this.currentTheme].background;
        }
    }

    setupResizeHandlers() {
        window.addEventListener('resize', this.debounce(() => {
            this.charts.forEach(chart => {
                chart.resize();
            });
        }, 300));
    }

    initializeLazyLoading() {
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const chartContainer = entry.target;
                    const chartType = chartContainer.dataset.chartType;
                    const chartConfig = chartContainer.dataset.chartConfig;
                    
                    if (chartType && !this.charts.has(chartContainer.id)) {
                        this.createChart(chartContainer.id, chartType, JSON.parse(chartConfig || '{}'));
                    }
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
    }

    startRealTimeUpdates() {
        setInterval(() => {
            this.updateAllCharts();
        }, this.updateInterval);
    }

    // ========================================
    // VELOCITY TREND CHART
    // ========================================
    createVelocityChart(containerId, data = null) {
        const ctx = document.getElementById(containerId);
        if (!ctx || typeof Chart === 'undefined') return null;

        const sampleData = data || this.generateVelocityData();
        
        const config = {
            type: 'line',
            data: {
                labels: sampleData.labels,
                datasets: [
                    {
                        label: 'Actual Velocity',
                        data: sampleData.actual,
                        borderColor: this.colorScheme.primary,
                        backgroundColor: this.createGradient(ctx, this.colorScheme.gradients.primary, 0.3),
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: this.colorScheme.primary,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Target Velocity',
                        data: sampleData.target,
                        borderColor: this.colorScheme.info,
                        backgroundColor: this.createGradient(ctx, this.colorScheme.gradients.info, 0.2),
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: this.colorScheme.info
                    },
                    {
                        label: '6-Sprint Average',
                        data: sampleData.average,
                        borderColor: this.colorScheme.warning,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Team Velocity Trend',
                        font: { size: 16, weight: 'bold' },
                        padding: 20
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        onClick: this.legendClickHandler.bind(this)
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (tooltipItems) => {
                                return `Sprint ${tooltipItems[0].label}`;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                const dataset = context.dataset.label;
                                return `${dataset}: ${value} story points`;
                            },
                            afterBody: (tooltipItems) => {
                                const sprint = tooltipItems[0].label;
                                return [
                                    '',
                                    `Sprint Goal: ${this.getSprintGoal(sprint)} points`,
                                    `Team Capacity: ${this.getTeamCapacity(sprint)} hours`
                                ];
                            }
                        },
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: this.colorScheme.primary,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Sprint',
                            font: { weight: 'bold' }
                        },
                        grid: {
                            color: this.themes[this.currentTheme].grid,
                            lineWidth: 1
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Story Points',
                            font: { weight: 'bold' }
                        },
                        beginAtZero: true,
                        grid: {
                            color: this.themes[this.currentTheme].grid,
                            lineWidth: 1
                        }
                    }
                },
                animation: this.animations,
                onHover: this.chartHoverHandler.bind(this),
                onClick: this.velocityClickHandler.bind(this)
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(containerId, chart);
        this.realTimeUpdates.set(containerId, 'velocity');
        
        return chart;
    }

    // ========================================
    // SPRINT BURNDOWN CHART
    // ========================================
    createBurndownChart(containerId, data = null) {
        const ctx = document.getElementById(containerId);
        if (!ctx || typeof Chart === 'undefined') return null;

        const sampleData = data || this.generateBurndownData();
        
        const config = {
            type: 'line',
            data: {
                labels: sampleData.labels,
                datasets: [
                    {
                        label: 'Ideal Burndown',
                        data: sampleData.ideal,
                        borderColor: this.colorScheme.success,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        fill: false,
                        tension: 0,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: 'Actual Burndown',
                        data: sampleData.actual,
                        borderColor: this.colorScheme.primary,
                        backgroundColor: this.createGradient(ctx, this.colorScheme.gradients.primary, 0.2),
                        borderWidth: 3,
                        fill: true,
                        tension: 0.2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: this.colorScheme.primary,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Scope Changes',
                        data: sampleData.scopeChanges,
                        borderColor: this.colorScheme.warning,
                        backgroundColor: this.colorScheme.warning,
                        borderWidth: 0,
                        fill: false,
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        pointStyle: 'triangle',
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Sprint Burndown Chart',
                        font: { size: 16, weight: 'bold' },
                        padding: 20
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems) => {
                                return `Day ${tooltipItems[0].label}`;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                const dataset = context.dataset.label;
                                if (dataset === 'Scope Changes') {
                                    return `Scope change: +${value} points`;
                                }
                                return `${dataset}: ${value} hours remaining`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Sprint Day',
                            font: { weight: 'bold' }
                        },
                        grid: {
                            color: this.themes[this.currentTheme].grid
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Remaining Work (Hours)',
                            font: { weight: 'bold' }
                        },
                        beginAtZero: true,
                        grid: {
                            color: this.themes[this.currentTheme].grid
                        }
                    }
                },
                animation: this.animations,
                onClick: this.burndownClickHandler.bind(this)
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(containerId, chart);
        this.realTimeUpdates.set(containerId, 'burndown');
        
        return chart;
    }

    // ========================================
    // QUALITY METRICS CHARTS
    // ========================================
    createTestResultsChart(containerId, data = null) {
        const ctx = document.getElementById(containerId);
        if (!ctx || typeof Chart === 'undefined') return null;

        const sampleData = data || this.generateTestResultsData();
        
        const config = {
            type: 'bar',
            data: {
                labels: sampleData.labels,
                datasets: [
                    {
                        label: 'Passed',
                        data: sampleData.passed,
                        backgroundColor: this.colorScheme.success,
                        borderColor: this.colorScheme.success,
                        borderWidth: 1
                    },
                    {
                        label: 'Failed',
                        data: sampleData.failed,
                        backgroundColor: this.colorScheme.error,
                        borderColor: this.colorScheme.error,
                        borderWidth: 1
                    },
                    {
                        label: 'Skipped',
                        data: sampleData.skipped,
                        backgroundColor: this.colorScheme.warning,
                        borderColor: this.colorScheme.warning,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Test Suites'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Number of Tests'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Test Results by Suite',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.chart.data.datasets.reduce((sum, dataset) => {
                                    return sum + dataset.data[context.dataIndex];
                                }, 0);
                                const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                return `${context.dataset.label}: ${context.parsed.y} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: this.animations
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(containerId, chart);
        this.realTimeUpdates.set(containerId, 'testResults');
        
        return chart;
    }

    createTestTypesChart(containerId, data = null) {
        const ctx = document.getElementById(containerId);
        if (!ctx || typeof Chart === 'undefined') return null;

        const sampleData = data || this.generateTestTypesData();
        
        const config = {
            type: 'doughnut',
            data: {
                labels: sampleData.labels,
                datasets: [{
                    data: sampleData.values,
                    backgroundColor: [
                        this.colorScheme.primary,
                        this.colorScheme.info,
                        this.colorScheme.success,
                        this.colorScheme.warning,
                        this.colorScheme.error
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverBorderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    title: {
                        display: true,
                        text: 'Test Distribution by Type',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                },
                onClick: this.testTypeClickHandler.bind(this)
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(containerId, chart);
        this.realTimeUpdates.set(containerId, 'testTypes');
        
        return chart;
    }

    createCoverageHeatmap(containerId, data = null) {
        const ctx = document.getElementById(containerId);
        if (!ctx || typeof Chart === 'undefined') return null;

        const sampleData = data || this.generateCoverageData();
        
        const config = {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Code Coverage',
                    data: sampleData.data,
                    backgroundColor: (context) => {
                        const value = context.parsed.coverage || 0;
                        return this.getHeatmapColor(value);
                    },
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 1,
                    pointRadius: 15,
                    pointHoverRadius: 18
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'category',
                        labels: sampleData.xLabels,
                        title: {
                            display: true,
                            text: 'Modules'
                        }
                    },
                    y: {
                        type: 'category',
                        labels: sampleData.yLabels,
                        title: {
                            display: true,
                            text: 'Test Types'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Test Coverage Heatmap',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: () => '',
                            label: (context) => {
                                const module = sampleData.xLabels[context.parsed.x];
                                const testType = sampleData.yLabels[context.parsed.y];
                                const coverage = context.parsed.coverage || 0;
                                return [
                                    `Module: ${module}`,
                                    `Test Type: ${testType}`,
                                    `Coverage: ${coverage}%`
                                ];
                            }
                        }
                    }
                },
                animation: this.animations
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(containerId, chart);
        this.realTimeUpdates.set(containerId, 'coverage');
        
        return chart;
    }

    // ========================================
    // BUG DISTRIBUTION CHARTS
    // ========================================
    createBugSeverityChart(containerId, data = null) {
        const ctx = document.getElementById(containerId);
        if (!ctx || typeof Chart === 'undefined') return null;

        const sampleData = data || this.generateBugSeverityData();
        
        const config = {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Bug Distribution',
                    data: sampleData.data,
                    backgroundColor: (context) => {
                        const severity = context.parsed.severity || 'Low';
                        return this.getSeverityColor(severity);
                    },
                    borderColor: (context) => {
                        const severity = context.parsed.severity || 'Low';
                        return this.getSeverityColor(severity, 0.8);
                    },
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Days Since Opened'
                        },
                        beginAtZero: true
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Priority Level'
                        },
                        min: 1,
                        max: 5
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Bug Severity vs Age Distribution',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: () => '',
                            label: (context) => {
                                const bug = context.raw;
                                return [
                                    `Bug ID: ${bug.id}`,
                                    `Severity: ${bug.severity}`,
                                    `Priority: ${context.parsed.y}`,
                                    `Age: ${context.parsed.x} days`,
                                    `Component: ${bug.component}`
                                ];
                            }
                        }
                    }
                },
                animation: this.animations,
                onClick: this.bugClickHandler.bind(this)
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(containerId, chart);
        this.realTimeUpdates.set(containerId, 'bugSeverity');
        
        return chart;
    }

    // ========================================
    // TEAM PERFORMANCE MATRIX
    // ========================================
    createTeamPerformanceChart(containerId, data = null) {
        const ctx = document.getElementById(containerId);
        if (!ctx || typeof Chart === 'undefined') return null;

        const sampleData = data || this.generateTeamPerformanceData();
        
        const config = {
            type: 'radar',
            data: {
                labels: sampleData.labels,
                datasets: sampleData.teams.map((team, index) => ({
                    label: team.name,
                    data: team.metrics,
                    backgroundColor: this.getTeamColor(index, 0.2),
                    borderColor: this.getTeamColor(index),
                    borderWidth: 2,
                    pointBackgroundColor: this.getTeamColor(index),
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            color: this.themes[this.currentTheme].grid
                        },
                        grid: {
                            color: this.themes[this.currentTheme].grid
                        },
                        pointLabels: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            beginAtZero: true,
                            max: 100,
                            stepSize: 20,
                            backdropColor: 'transparent'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Team Performance Matrix',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const metric = context.label;
                                const value = context.parsed.r;
                                const team = context.dataset.label;
                                return `${team} - ${metric}: ${value}%`;
                            }
                        }
                    }
                },
                animation: this.animations,
                onClick: this.teamPerformanceClickHandler.bind(this)
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(containerId, chart);
        this.realTimeUpdates.set(containerId, 'teamPerformance');
        
        return chart;
    }

    // ========================================
    // UTILITY METHODS
    // ========================================
    createGradient(ctx, colors, alpha = 1) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, this.hexToRgba(colors[0], alpha));
        gradient.addColorStop(1, this.hexToRgba(colors[1], alpha * 0.3));
        return gradient;
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    getHeatmapColor(value) {
        const intensity = value / 100;
        const red = Math.round(255 * (1 - intensity));
        const green = Math.round(255 * intensity);
        return `rgba(${red}, ${green}, 0, 0.7)`;
    }

    getSeverityColor(severity, alpha = 0.7) {
        const colors = {
            'Critical': this.colorScheme.error,
            'High': '#FF6B6B',
            'Medium': this.colorScheme.warning,
            'Low': this.colorScheme.info,
            'Trivial': this.colorScheme.success
        };
        const color = colors[severity] || this.colorScheme.secondary;
        return this.hexToRgba(color, alpha);
    }

    getTeamColor(index, alpha = 1) {
        const colors = [
            this.colorScheme.primary,
            this.colorScheme.info,
            this.colorScheme.success,
            this.colorScheme.warning,
            this.colorScheme.error
        ];
        const color = colors[index % colors.length];
        return this.hexToRgba(color, alpha);
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================
    legendClickHandler(event, legendItem, legend) {
        const index = legendItem.datasetIndex;
        const chart = legend.chart;
        const meta = chart.getDatasetMeta(index);
        
        meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
        chart.update();
        
        this.trackInteraction('legend_toggle', {
            chart: chart.canvas.id,
            dataset: legendItem.text,
            visible: !meta.hidden
        });
    }

    chartHoverHandler(event, activeElements, chart) {
        chart.canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
    }

    velocityClickHandler(event, activeElements, chart) {
        if (activeElements.length > 0) {
            const element = activeElements[0];
            const sprintIndex = element.index;
            const sprint = chart.data.labels[sprintIndex];
            
            this.drillDownToSprint(sprint);
        }
    }

    burndownClickHandler(event, activeElements, chart) {
        if (activeElements.length > 0) {
            const element = activeElements[0];
            const day = element.index;
            
            this.showDayDetails(day);
        }
    }

    testTypeClickHandler(event, activeElements, chart) {
        if (activeElements.length > 0) {
            const element = activeElements[0];
            const testType = chart.data.labels[element.index];
            
            this.drillDownToTestType(testType);
        }
    }

    bugClickHandler(event, activeElements, chart) {
        if (activeElements.length > 0) {
            const element = activeElements[0];
            const bugData = element.element.$context.raw;
            
            this.showBugDetails(bugData.id);
        }
    }

    teamPerformanceClickHandler(event, activeElements, chart) {
        if (activeElements.length > 0) {
            const element = activeElements[0];
            const team = chart.data.datasets[element.datasetIndex].label;
            
            this.drillDownToTeam(team);
        }
    }

    // ========================================
    // CHART MANAGEMENT
    // ========================================
    createChart(containerId, chartType, options = {}) {
        const methodMap = {
            'velocity': this.createVelocityChart,
            'burndown': this.createBurndownChart,
            'testResults': this.createTestResultsChart,
            'testTypes': this.createTestTypesChart,
            'coverage': this.createCoverageHeatmap,
            'bugSeverity': this.createBugSeverityChart,
            'teamPerformance': this.createTeamPerformanceChart
        };

        const method = methodMap[chartType];
        if (method) {
            return method.call(this, containerId, options.data);
        } else {
            console.warn(`Unknown chart type: ${chartType}`);
            return null;
        }
    }

    updateChart(chartId, newData) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        chart.data.datasets.forEach((dataset, index) => {
            if (newData.datasets && newData.datasets[index]) {
                dataset.data = newData.datasets[index].data;
            }
        });

        if (newData.labels) {
            chart.data.labels = newData.labels;
        }

        chart.update('active');
    }

    updateAllCharts() {
        this.realTimeUpdates.forEach((chartType, chartId) => {
            this.fetchAndUpdateChart(chartId, chartType);
        });
    }

    async fetchAndUpdateChart(chartId, chartType) {
        try {
            const newData = await this.fetchChartData(chartType);
            this.updateChart(chartId, newData);
        } catch (error) {
            console.error(`Failed to update chart ${chartId}:`, error);
        }
    }

    async fetchChartData(chartType) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const generators = {
                    'velocity': this.generateVelocityData,
                    'burndown': this.generateBurndownData,
                    'testResults': this.generateTestResultsData,
                    'testTypes': this.generateTestTypesData,
                    'coverage': this.generateCoverageData,
                    'bugSeverity': this.generateBugSeverityData,
                    'teamPerformance': this.generateTeamPerformanceData
                };
                
                const generator = generators[chartType];
                resolve(generator ? generator.call(this) : {});
            }, 100);
        });
    }

    destroyChart(chartId) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.destroy();
            this.charts.delete(chartId);
            this.realTimeUpdates.delete(chartId);
        }
    }

    exportChart(chartId, format = 'png') {
        const chart = this.charts.get(chartId);
        if (!chart) return null;

        const url = chart.toBase64Image(format, 1);
        
        const link = document.createElement('a');
        link.download = `${chartId}_chart.${format}`;
        link.href = url;
        link.click();
        
        return url;
    }

    toggleFullscreen(chartId) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        const container = chart.canvas.parentElement;
        
        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => {
                container.classList.add('fullscreen-chart');
                setTimeout(() => chart.resize(), 100);
            });
        } else {
            document.exitFullscreen().then(() => {
                container.classList.remove('fullscreen-chart');
                setTimeout(() => chart.resize(), 100);
            });
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.registerChartDefaults();
        
        this.charts.forEach(chart => {
            chart.options.color = this.themes[theme].text;
            chart.options.borderColor = this.themes[theme].grid;
            chart.update();
        });
    }

    // ========================================
    // DATA GENERATORS
    // ========================================
    generateVelocityData() {
        const labels = Array.from({length: 12}, (_, i) => `Sprint ${i + 1}`);
        const targetVelocity = 25;
        
        return {
            labels,
            actual: labels.map(() => Math.round(targetVelocity + (Math.random() - 0.5) * 10)),
            target: labels.map(() => targetVelocity),
            average: labels.map((_, i) => {
                if (i < 5) return null;
                return Math.round(targetVelocity + (Math.random() - 0.5) * 5);
            })
        };
    }

    generateBurndownData() {
        const labels = Array.from({length: 10}, (_, i) => i + 1);
        const totalWork = 120;
        
        return {
            labels,
            ideal: labels.map((day, i) => totalWork - (totalWork / 9) * i),
            actual: [120, 115, 108, 95, 88, 85, 78, 65, 52, 35],
            scopeChanges: [null, null, null, 15, null, null, 8, null, null, null]
        };
    }

    generateTestResultsData() {
        const suites = ['Unit Tests', 'Integration', 'E2E', 'Performance', 'Security'];
        
        return {
            labels: suites,
            passed: suites.map(() => Math.floor(Math.random() * 100) + 50),
            failed: suites.map(() => Math.floor(Math.random() * 20)),
            skipped: suites.map(() => Math.floor(Math.random() * 10))
        };
    }

    generateTestTypesData() {
        return {
            labels: ['Unit', 'Integration', 'E2E', 'Performance', 'Security'],
            values: [450, 230, 125, 80, 45]
        };
    }

    generateCoverageData() {
        const modules = ['Auth', 'Dashboard', 'Reports', 'API', 'Utils'];
        const testTypes = ['Unit', 'Integration', 'E2E'];
        const data = [];
        
        modules.forEach((module, x) => {
            testTypes.forEach((testType, y) => {
                data.push({
                    x,
                    y,
                    coverage: Math.floor(Math.random() * 100)
                });
            });
        });
        
        return {
            data,
            xLabels: modules,
            yLabels: testTypes
        };
    }

    generateBugSeverityData() {
        const severities = ['Critical', 'High', 'Medium', 'Low', 'Trivial'];
        const components = ['Frontend', 'Backend', 'Database', 'API', 'Mobile'];
        
        return {
            data: Array.from({length: 50}, (_, i) => ({
                x: Math.floor(Math.random() * 30) + 1,
                y: Math.floor(Math.random() * 5) + 1,
                r: Math.floor(Math.random() * 15) + 5,
                id: `BUG-${1000 + i}`,
                severity: severities[Math.floor(Math.random() * severities.length)],
                component: components[Math.floor(Math.random() * components.length)]
            }))
        };
    }

    generateTeamPerformanceData() {
        const metrics = ['Velocity', 'Quality', 'Delivery', 'Innovation', 'Collaboration'];
        
        return {
            labels: metrics,
            teams: [
                {
                    name: 'Team Alpha',
                    metrics: [85, 92, 78, 88, 95]
                },
                {
                    name: 'Team Beta',
                    metrics: [78, 85, 92, 82, 87]
                },
                {
                    name: 'Team Gamma',
                    metrics: [92, 88, 85, 95, 83]
                }
            ]
        };
    }

    // ========================================
    // DRILL-DOWN METHODS
    // ========================================
    drillDownToSprint(sprint) {
        console.log(`Drilling down to ${sprint} details`);
    }

    showDayDetails(day) {
        console.log(`Showing details for day ${day}`);
    }

    drillDownToTestType(testType) {
        console.log(`Drilling down to ${testType} tests`);
    }

    showBugDetails(bugId) {
        console.log(`Showing details for bug ${bugId}`);
    }

    drillDownToTeam(team) {
        console.log(`Drilling down to ${team} performance`);
    }

    // ========================================
    // HELPER METHODS
    // ========================================
    getCurrentSprintDay() {
        return Math.floor(Math.random() * 10) + 1;
    }

    getSprintGoal(sprint) {
        return Math.floor(Math.random() * 20) + 20;
    }

    getTeamCapacity(sprint) {
        return Math.floor(Math.random() * 100) + 150;
    }

    trackInteraction(action, data) {
        console.log(`Chart interaction: ${action}`, data);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ========================================
    // PUBLIC API
    // ========================================
    initializeChartContainer(containerId, chartType, options = {}) {
        const container = document.getElementById(containerId);
        if (container) {
            container.dataset.chartType = chartType;
            container.dataset.chartConfig = JSON.stringify(options);
            this.intersectionObserver.observe(container);
        }
    }

    getChart(chartId) {
        return this.charts.get(chartId);
    }

    getAllCharts() {
        return Array.from(this.charts.values());
    }

    setUpdateInterval(interval) {
        this.updateInterval = interval;
    }

    pauseRealTimeUpdates() {
        this.realTimeUpdates.clear();
    }

    resumeRealTimeUpdates() {
        this.charts.forEach((chart, chartId) => {
            const chartType = this.detectChartType(chart);
            if (chartType) {
                this.realTimeUpdates.set(chartId, chartType);
            }
        });
    }

    detectChartType(chart) {
        const title = chart.options.plugins?.title?.text || '';
        
        if (title.includes('Velocity')) return 'velocity';
        if (title.includes('Burndown')) return 'burndown';
        if (title.includes('Test Results')) return 'testResults';
        if (title.includes('Test Distribution')) return 'testTypes';
        if (title.includes('Coverage')) return 'coverage';
        if (title.includes('Bug')) return 'bugSeverity';
        if (title.includes('Team Performance')) return 'teamPerformance';
        
        return null;
    }
}

// ========================================
// INITIALIZE CHART MANAGER
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    window.ChartManager = new ChartManager();
    console.log('📊 Chart Manager ready for advanced visualizations');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartManager;
}
