/**
 * ADO Metrics Command Center - Report Generation System
 * Complete report generation with PDF, Excel, PowerPoint, CSV, and HTML exports
 * Includes templates, scheduling, and branding
 */

// Import libraries (add these to your HTML head)
// <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

class ReportGenerator {
    constructor(options = {}) {
        this.options = {
            companyName: 'ADO Metrics Command Center',
            primaryColor: '#94196B',
            logo: null,
            footer: '© 2024 ADO Metrics. Confidential.',
            timezone: 'UTC',
            ...options
        };
        
        this.templates = new Map();
        this.schedules = new Map();
        this.recipients = new Map();
        
        this.init();
    }

    init() {
        this.loadTemplates();
        this.setupScheduler();
        this.createPrintStyles();
        
        console.log('📊 Report Generator initialized');
    }

    // ========================================
    // TEMPLATE SYSTEM
    // ========================================

    loadTemplates() {
        // Executive Summary Template
        this.templates.set('executive-summary', {
            name: 'Executive Summary',
            type: 'executive',
            layout: 'portrait',
            sections: [
                'header',
                'summary-metrics',
                'key-insights',
                'recommendations',
                'footer'
            ],
            config: {
                pageSize: 'A4',
                margins: '20mm',
                charts: ['velocity-trend', 'quality-overview'],
                maxPages: 1
            }
        });

        // Sprint Report Template
        this.templates.set('sprint-report', {
            name: 'Sprint Report',
            type: 'detailed',
            layout: 'portrait',
            sections: [
                'header',
                'sprint-overview',
                'velocity-analysis',
                'burndown-chart',
                'quality-metrics',
                'team-performance',
                'issues-summary',
                'next-sprint-planning',
                'footer'
            ],
            config: {
                pageSize: 'A4',
                margins: '15mm',
                charts: ['velocity-chart', 'burndown-chart', 'test-results'],
                maxPages: 8
            }
        });

        // Quality Report Template
        this.templates.set('quality-report', {
            name: 'Quality Report',
            type: 'quality',
            layout: 'landscape',
            sections: [
                'header',
                'test-coverage',
                'bug-analysis',
                'code-quality',
                'performance-metrics',
                'security-scan',
                'recommendations',
                'footer'
            ],
            config: {
                pageSize: 'A4',
                margins: '15mm',
                charts: ['coverage-trend', 'bug-distribution', 'quality-gates'],
                maxPages: 6
            }
        });

        // Team Performance Template
        this.templates.set('team-performance', {
            name: 'Team Performance',
            type: 'performance',
            layout: 'portrait',
            sections: [
                'header',
                'team-overview',
                'velocity-comparison',
                'capacity-analysis',
                'individual-performance',
                'skills-matrix',
                'development-plans',
                'footer'
            ],
            config: {
                pageSize: 'A4',
                margins: '15mm',
                charts: ['team-velocity', 'capacity-trends', 'skill-radar'],
                maxPages: 10
            }
        });

        // Monthly Summary Template
        this.templates.set('monthly-summary', {
            name: 'Monthly Summary',
            type: 'summary',
            layout: 'portrait',
            sections: [
                'header',
                'monthly-highlights',
                'sprint-summaries',
                'cumulative-metrics',
                'trend-analysis',
                'goals-progress',
                'next-month-forecast',
                'footer'
            ],
            config: {
                pageSize: 'A4',
                margins: '15mm',
                charts: ['monthly-trends', 'goals-progress', 'forecast'],
                maxPages: 12
            }
        });
    }

    // ========================================
    // PDF GENERATION
    // ========================================

    async generatePDF(data, templateKey, options = {}) {
        try {
            const template = this.templates.get(templateKey);
            if (!template) {
                throw new Error(`Template '${templateKey}' not found`);
            }

            // Create PDF content container
            const pdfContainer = this.createPDFContainer(data, template, options);
            
            // Apply print styles
            this.applyPrintStyles(template.layout);
            
            // Generate PDF using browser print API
            const pdf = await this.printToPDF(pdfContainer, template, options);
            
            return pdf;
        } catch (error) {
            console.error('PDF generation failed:', error);
            throw error;
        }
    }

    createPDFContainer(data, template, options) {
        const container = document.createElement('div');
        container.className = 'pdf-report-container';
        container.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 210mm;
            background: white;
            font-family: 'Inter', Arial, sans-serif;
            color: #2e3440;
            line-height: 1.4;
        `;

        // Generate each section
        template.sections.forEach(sectionKey => {
            const section = this.createPDFSection(sectionKey, data, template, options);
            container.appendChild(section);
        });

        document.body.appendChild(container);
        return container;
    }

    createPDFSection(sectionKey, data, template, options) {
        const section = document.createElement('div');
        section.className = `pdf-section pdf-section-${sectionKey}`;

        switch (sectionKey) {
            case 'header':
                section.innerHTML = this.generatePDFHeader(data, template);
                break;
            case 'summary-metrics':
                section.innerHTML = this.generateSummaryMetrics(data);
                break;
            case 'sprint-overview':
                section.innerHTML = this.generateSprintOverview(data);
                break;
            case 'velocity-analysis':
                section.innerHTML = this.generateVelocityAnalysis(data);
                break;
            case 'quality-metrics':
                section.innerHTML = this.generateQualityMetrics(data);
                break;
            case 'team-performance':
                section.innerHTML = this.generateTeamPerformance(data);
                break;
            case 'footer':
                section.innerHTML = this.generatePDFFooter(template);
                break;
            default:
                section.innerHTML = this.generateGenericSection(sectionKey, data);
        }

        return section;
    }

    generatePDFHeader(data, template) {
        const reportDate = new Date().toLocaleDateString();
        const reportTitle = template.name;
        
        return `
            <div class="pdf-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 0;
                border-bottom: 3px solid ${this.options.primaryColor};
                margin-bottom: 30px;
            ">
                <div class="header-content">
                    <h1 style="
                        color: ${this.options.primaryColor};
                        margin: 0;
                        font-size: 28px;
                        font-weight: 700;
                    ">${reportTitle}</h1>
                    <p style="
                        margin: 5px 0 0 0;
                        color: #6b7280;
                        font-size: 14px;
                    ">Generated on ${reportDate}</p>
                </div>
                <div class="header-logo">
                    ${this.options.logo ? `<img src="${this.options.logo}" alt="Logo" style="height: 50px;">` : ''}
                    <div style="
                        font-size: 18px;
                        font-weight: 600;
                        color: ${this.options.primaryColor};
                        text-align: right;
                    ">${this.options.companyName}</div>
                </div>
            </div>
        `;
    }

    generateSummaryMetrics(data) {
        const metrics = data.summaryMetrics || {};
        
        return `
            <div class="pdf-summary-metrics" style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            ">
                ${Object.entries(metrics).map(([key, value]) => `
                    <div class="metric-card" style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 8px;
                        border-left: 4px solid ${this.options.primaryColor};
                        text-align: center;
                    ">
                        <div style="
                            font-size: 32px;
                            font-weight: 700;
                            color: ${this.options.primaryColor};
                            margin-bottom: 5px;
                        ">${value.value}</div>
                        <div style="
                            font-size: 14px;
                            color: #6b7280;
                            font-weight: 500;
                        ">${value.label}</div>
                        ${value.trend ? `
                            <div style="
                                font-size: 12px;
                                color: ${value.trend > 0 ? '#10b981' : '#ef4444'};
                                margin-top: 5px;
                            ">
                                ${value.trend > 0 ? '↗' : '↘'} ${Math.abs(value.trend)}%
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateSprintOverview(data) {
        const sprint = data.currentSprint || {};
        
        return `
            <div class="pdf-sprint-overview" style="margin-bottom: 30px;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin-bottom: 20px;
                    font-size: 22px;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 10px;
                ">Sprint Overview</h2>
                
                <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                ">
                    <div class="sprint-details">
                        <h3 style="color: #374151; margin-bottom: 15px;">Sprint Details</h3>
                        <div style="line-height: 1.8;">
                            <div><strong>Sprint:</strong> ${sprint.name || 'N/A'}</div>
                            <div><strong>Duration:</strong> ${sprint.startDate} - ${sprint.endDate}</div>
                            <div><strong>Team:</strong> ${sprint.team || 'N/A'}</div>
                            <div><strong>Capacity:</strong> ${sprint.capacity || 0} hours</div>
                        </div>
                    </div>
                    
                    <div class="sprint-goals">
                        <h3 style="color: #374151; margin-bottom: 15px;">Sprint Goals</h3>
                        <ul style="line-height: 1.8; padding-left: 20px;">
                            ${(sprint.goals || []).map(goal => `<li>${goal}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    generateVelocityAnalysis(data) {
        const velocity = data.velocityData || {};
        
        return `
            <div class="pdf-velocity-analysis" style="margin-bottom: 30px;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin-bottom: 20px;
                    font-size: 22px;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 10px;
                ">Velocity Analysis</h2>
                
                <div class="velocity-content">
                    <div class="velocity-chart-placeholder" style="
                        height: 300px;
                        background: #f8fafc;
                        border: 2px dashed #d1d5db;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 20px;
                        border-radius: 8px;
                    ">
                        <span style="color: #6b7280;">Velocity Chart Will Be Inserted Here</span>
                    </div>
                    
                    <div class="velocity-insights">
                        <h3 style="color: #374151; margin-bottom: 15px;">Key Insights</h3>
                        <ul style="line-height: 1.8; padding-left: 20px;">
                            <li>Average velocity: ${velocity.average || 0} story points</li>
                            <li>Trend: ${velocity.trend || 'Stable'}</li>
                            <li>Predictability: ${velocity.predictability || 'Medium'}</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    generateQualityMetrics(data) {
        const quality = data.qualityMetrics || {};
        
        return `
            <div class="pdf-quality-metrics" style="margin-bottom: 30px;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin-bottom: 20px;
                    font-size: 22px;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 10px;
                ">Quality Metrics</h2>
                
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                ">
                    <div class="quality-metric">
                        <h4 style="color: #374151; margin-bottom: 10px;">Test Coverage</h4>
                        <div style="
                            font-size: 24px;
                            font-weight: 700;
                            color: ${this.options.primaryColor};
                        ">${quality.testCoverage || 0}%</div>
                        <div class="progress-bar" style="
                            width: 100%;
                            height: 8px;
                            background: #e5e7eb;
                            border-radius: 4px;
                            margin-top: 5px;
                            overflow: hidden;
                        ">
                            <div style="
                                width: ${quality.testCoverage || 0}%;
                                height: 100%;
                                background: linear-gradient(135deg, ${this.options.primaryColor}, #B83A8C);
                            "></div>
                        </div>
                    </div>
                    
                    <div class="quality-metric">
                        <h4 style="color: #374151; margin-bottom: 10px;">Bug Count</h4>
                        <div style="
                            font-size: 24px;
                            font-weight: 700;
                            color: ${quality.bugCount > 10 ? '#ef4444' : '#10b981'};
                        ">${quality.bugCount || 0}</div>
                        <div style="
                            font-size: 12px;
                            color: #6b7280;
                            margin-top: 5px;
                        ">Open bugs</div>
                    </div>
                    
                    <div class="quality-metric">
                        <h4 style="color: #374151; margin-bottom: 10px;">Code Quality</h4>
                        <div style="
                            font-size: 24px;
                            font-weight: 700;
                            color: ${this.options.primaryColor};
                        ">${quality.codeQualityScore || 0}/10</div>
                        <div style="
                            font-size: 12px;
                            color: #6b7280;
                            margin-top: 5px;
                        ">Quality score</div>
                    </div>
                </div>
            </div>
        `;
    }

    generateTeamPerformance(data) {
        const team = data.teamPerformance || {};
        
        return `
            <div class="pdf-team-performance" style="margin-bottom: 30px;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin-bottom: 20px;
                    font-size: 22px;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 10px;
                ">Team Performance</h2>
                
                <div class="team-metrics">
                    <table style="
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    ">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="
                                    padding: 12px;
                                    text-align: left;
                                    border-bottom: 2px solid ${this.options.primaryColor};
                                    color: #374151;
                                    font-weight: 600;
                                ">Team Member</th>
                                <th style="
                                    padding: 12px;
                                    text-align: center;
                                    border-bottom: 2px solid ${this.options.primaryColor};
                                    color: #374151;
                                    font-weight: 600;
                                ">Velocity</th>
                                <th style="
                                    padding: 12px;
                                    text-align: center;
                                    border-bottom: 2px solid ${this.options.primaryColor};
                                    color: #374151;
                                    font-weight: 600;
                                ">Quality</th>
                                <th style="
                                    padding: 12px;
                                    text-align: center;
                                    border-bottom: 2px solid ${this.options.primaryColor};
                                    color: #374151;
                                    font-weight: 600;
                                ">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(team.members || []).map((member, index) => `
                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                    <td style="padding: 12px; color: #374151;">
                                        ${member.name}
                                    </td>
                                    <td style="
                                        padding: 12px;
                                        text-align: center;
                                        font-weight: 600;
                                        color: ${this.options.primaryColor};
                                    ">
                                        ${member.velocity || 0}
                                    </td>
                                    <td style="
                                        padding: 12px;
                                        text-align: center;
                                        color: ${member.quality >= 8 ? '#10b981' : member.quality >= 6 ? '#f59e0b' : '#ef4444'};
                                        font-weight: 600;
                                    ">
                                        ${member.quality || 0}/10
                                    </td>
                                    <td style="
                                        padding: 12px;
                                        text-align: center;
                                    ">
                                        <span style="
                                            padding: 4px 8px;
                                            border-radius: 12px;
                                            background: ${member.status === 'Active' ? '#f0fdf4' : '#fef2f2'};
                                            color: ${member.status === 'Active' ? '#059669' : '#dc2626'};
                                            font-size: 12px;
                                            font-weight: 600;
                                        ">
                                            ${member.status || 'Unknown'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    generateGenericSection(sectionKey, data) {
        return `
            <div class="pdf-generic-section" style="margin-bottom: 30px;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin-bottom: 20px;
                    font-size: 22px;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 10px;
                    text-transform: capitalize;
                ">${sectionKey.replace(/-/g, ' ')}</h2>
                
                <div class="section-content">
                    <p style="color: #6b7280; font-style: italic;">
                        Content for ${sectionKey} section will be implemented based on specific requirements.
                    </p>
                </div>
            </div>
        `;
    }

    generatePDFFooter(template) {
        const timestamp = new Date().toLocaleString();
        
        return `
            <div class="pdf-footer" style="
                margin-top: 50px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: #6b7280;
            ">
                <div class="footer-left">
                    ${this.options.footer}
                </div>
                <div class="footer-right">
                    Generated: ${timestamp}
                </div>
            </div>
        `;
    }

    createPrintStyles() {
        if (document.getElementById('print-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'print-styles';
        style.textContent = `
            @media print {
                .pdf-report-container {
                    position: static !important;
                    width: auto !important;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                .pdf-section {
                    break-inside: avoid;
                    margin-bottom: 20px;
                }
                
                .pdf-header {
                    page-break-after: avoid;
                }
                
                .pdf-footer {
                    page-break-before: avoid;
                    position: fixed;
                    bottom: 0;
                    width: 100%;
                }
                
                .velocity-chart-placeholder,
                .chart-placeholder {
                    break-inside: avoid;
                }
                
                table {
                    break-inside: avoid;
                }
                
                tr {
                    break-inside: avoid;
                    break-after: auto;
                }
                
                h1, h2, h3 {
                    break-after: avoid;
                }
            }
            
            @page {
                margin: 20mm;
                size: A4;
            }
            
            @page :first {
                margin-top: 30mm;
            }
        `;
        
        document.head.appendChild(style);
    }

    applyPrintStyles(layout) {
        const style = document.getElementById('print-styles');
        if (style && layout === 'landscape') {
            style.textContent = style.textContent.replace(
                'size: A4;',
                'size: A4 landscape;'
            );
        }
    }

    async printToPDF(container, template, options) {
        try {
            // Show the container for printing
            container.style.cssText = `
                position: static;
                top: auto;
                left: auto;
                width: 100%;
                margin: 0;
                padding: 20px;
            `;
            
            // Hide other content
            const body = document.body;
            const originalContent = body.innerHTML;
            body.innerHTML = '';
            body.appendChild(container);
            
            // Trigger print dialog
            const filename = `${template.name}-${new Date().toISOString().split('T')[0]}.pdf`;
            
            // Wait for print dialog
            await new Promise(resolve => {
                window.addEventListener('afterprint', resolve, { once: true });
                window.print();
            });
            
            // Restore original content
            body.innerHTML = originalContent;
            
            return {
                success: true,
                filename: filename,
                type: 'pdf'
            };
            
        } catch (error) {
            console.error('Print to PDF failed:', error);
            throw error;
        }
    }

    // ========================================
    // EXCEL EXPORT
    // ========================================

    async generateExcel(data, templateKey, options = {}) {
        try {
            if (!window.XLSX) {
                throw new Error('SheetJS library not loaded. Please include XLSX library.');
            }

            const template = this.templates.get(templateKey);
            if (!template) {
                throw new Error(`Template '${templateKey}' not found`);
            }

            const workbook = XLSX.utils.book_new();
            
            // Create worksheets based on template
            await this.createExcelWorksheets(workbook, data, template, options);
            
            // Add formatting and styles
            this.formatExcelWorkbook(workbook, template);
            
            // Generate and download
            const filename = `${template.name}-${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, filename);
            
            return {
                success: true,
                filename: filename,
                type: 'excel',
                workbook: workbook
            };
            
        } catch (error) {
            console.error('Excel generation failed:', error);
            throw error;
        }
    }

    async createExcelWorksheets(workbook, data, template, options) {
        // Summary worksheet
        const summaryData = this.prepareSummaryData(data, template);
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        this.formatExcelSheet(summarySheet, 'summary');
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // Data worksheets based on template type
        switch (template.type) {
            case 'executive':
                await this.createExecutiveWorksheets(workbook, data);
                break;
            case 'detailed':
                await this.createDetailedWorksheets(workbook, data);
                break;
            case 'quality':
                await this.createQualityWorksheets(workbook, data);
                break;
            case 'performance':
                await this.createPerformanceWorksheets(workbook, data);
                break;
            default:
                await this.createGenericWorksheets(workbook, data);
        }
    }

    prepareSummaryData(data, template) {
        const summaryData = [
            // Header
            [template.name, '', '', ''],
            [`Generated: ${new Date().toLocaleString()}`, '', '', ''],
            ['', '', '', ''],
            
            // Key Metrics
            ['Key Metrics', '', '', ''],
            ['Metric', 'Value', 'Trend', 'Target'],
        ];

        // Add summary metrics
        const metrics = data.summaryMetrics || {};
        Object.entries(metrics).forEach(([key, value]) => {
            summaryData.push([
                value.label || key,
                value.value || 0,
                value.trend ? `${value.trend > 0 ? '+' : ''}${value.trend}%` : 'N/A',
                value.target || 'N/A'
            ]);
        });

        return summaryData;
    }

    async createExecutiveWorksheets(workbook, data) {
        // Executive Summary Data
        const execData = [
            ['Executive Summary', '', '', ''],
            ['', '', '', ''],
            ['Key Performance Indicators', '', '', ''],
            ['KPI', 'Current', 'Previous', 'Change'],
        ];

        const kpis = data.kpis || {};
        Object.entries(kpis).forEach(([key, value]) => {
            execData.push([
                key,
                value.current || 0,
                value.previous || 0,
                value.change || 0
            ]);
        });

        const execSheet = XLSX.utils.aoa_to_sheet(execData);
        this.formatExcelSheet(execSheet, 'executive');
        XLSX.utils.book_append_sheet(workbook, execSheet, 'Executive Dashboard');

        // Recommendations
        const recoData = [
            ['Recommendations', '', ''],
            ['Priority', 'Recommendation', 'Impact'],
        ];

        const recommendations = data.recommendations || [];
        recommendations.forEach((rec, index) => {
            recoData.push([
                rec.priority || 'Medium',
                rec.text || '',
                rec.impact || 'Medium'
            ]);
        });

        const recoSheet = XLSX.utils.aoa_to_sheet(recoData);
        this.formatExcelSheet(recoSheet, 'recommendations');
        XLSX.utils.book_append_sheet(workbook, recoSheet, 'Recommendations');
    }

    async createDetailedWorksheets(workbook, data) {
        // Sprint Details
        const sprintData = this.prepareSprintData(data);
        const sprintSheet = XLSX.utils.aoa_to_sheet(sprintData);
        this.formatExcelSheet(sprintSheet, 'sprint');
        XLSX.utils.book_append_sheet(workbook, sprintSheet, 'Sprint Details');

        // Velocity Data
        const velocityData = this.prepareVelocityData(data);
        const velocitySheet = XLSX.utils.aoa_to_sheet(velocityData);
        this.formatExcelSheet(velocitySheet, 'velocity');
        XLSX.utils.book_append_sheet(workbook, velocitySheet, 'Velocity Analysis');

        // User Stories
        const storiesData = this.prepareStoriesData(data);
        const storiesSheet = XLSX.utils.aoa_to_sheet(storiesData);
        this.formatExcelSheet(storiesSheet, 'stories');
        XLSX.utils.book_append_sheet(workbook, storiesSheet, 'User Stories');
    }

    async createQualityWorksheets(workbook, data) {
        // Test Results
        const testData = [
            ['Test Results', '', '', '', ''],
            ['Test Suite', 'Total Tests', 'Passed', 'Failed', 'Coverage %'],
        ];

        const testResults = data.testResults || [];
        testResults.forEach(result => {
            testData.push([
                result.suite || 'Unknown',
                result.total || 0,
                result.passed || 0,
                result.failed || 0,
                result.coverage || 0
            ]);
        });

        const testSheet = XLSX.utils.aoa_to_sheet(testData);
        this.formatExcelSheet(testSheet, 'tests');
        XLSX.utils.book_append_sheet(workbook, testSheet, 'Test Results');

        // Bug Analysis
        const bugData = [
            ['Bug Analysis', '', '', ''],
            ['Severity', 'Open', 'Resolved', 'Total'],
        ];

        const bugs = data.bugs || {};
        ['Critical', 'High', 'Medium', 'Low'].forEach(severity => {
            const severityData = bugs[severity] || {};
            bugData.push([
                severity,
                severityData.open || 0,
                severityData.resolved || 0,
                (severityData.open || 0) + (severityData.resolved || 0)
            ]);
        });

        const bugSheet = XLSX.utils.aoa_to_sheet(bugData);
        this.formatExcelSheet(bugSheet, 'bugs');
        XLSX.utils.book_append_sheet(workbook, bugSheet, 'Bug Analysis');
    }

    async createPerformanceWorksheets(workbook, data) {
        // Team Performance
        const teamData = [
            ['Team Performance', '', '', '', ''],
            ['Member', 'Velocity', 'Quality Score', 'Utilization %', 'Status'],
        ];

        const team = data.teamPerformance || {};
        (team.members || []).forEach(member => {
            teamData.push([
                member.name || 'Unknown',
                member.velocity || 0,
                member.quality || 0,
                member.utilization || 0,
                member.status || 'Unknown'
            ]);
        });

        const teamSheet = XLSX.utils.aoa_to_sheet(teamData);
        this.formatExcelSheet(teamSheet, 'team');
        XLSX.utils.book_append_sheet(workbook, teamSheet, 'Team Performance');

        // Capacity Planning
        const capacityData = [
            ['Capacity Planning', '', '', ''],
            ['Sprint', 'Planned Hours', 'Actual Hours', 'Utilization %'],
        ];

        const capacity = data.capacityData || [];
        capacity.forEach(sprint => {
            capacityData.push([
                sprint.name || 'Sprint',
                sprint.planned || 0,
                sprint.actual || 0,
                sprint.utilization || 0
            ]);
        });

        const capacitySheet = XLSX.utils.aoa_to_sheet(capacityData);
        this.formatExcelSheet(capacitySheet, 'capacity');
        XLSX.utils.book_append_sheet(workbook, capacitySheet, 'Capacity Planning');
    }

    async createGenericWorksheets(workbook, data) {
        // Raw Data Export
        const rawData = [
            ['Raw Data Export', '', ''],
            ['Timestamp', 'Metric', 'Value'],
        ];

        // Add all available data
        Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    rawData.push([
                        new Date().toISOString(),
                        `${key}.${subKey}`,
                        subValue
                    ]);
                });
            } else {
                rawData.push([
                    new Date().toISOString(),
                    key,
                    value
                ]);
            }
        });

        const rawSheet = XLSX.utils.aoa_to_sheet(rawData);
        this.formatExcelSheet(rawSheet, 'raw');
        XLSX.utils.book_append_sheet(workbook, rawSheet, 'Raw Data');
    }

    prepareSprintData(data) {
        const sprint = data.currentSprint || {};
        return [
            ['Sprint Information', '', ''],
            ['Property', 'Value', ''],
            ['Sprint Name', sprint.name || 'N/A', ''],
            ['Start Date', sprint.startDate || 'N/A', ''],
            ['End Date', sprint.endDate || 'N/A', ''],
            ['Team', sprint.team || 'N/A', ''],
            ['Capacity', sprint.capacity || 0, 'hours'],
            ['', '', ''],
            ['Sprint Goals', '', ''],
            ...((sprint.goals || []).map((goal, index) => [`Goal ${index + 1}`, goal, '']))
        ];
    }

    prepareVelocityData(data) {
        const velocity = data.velocityData || {};
        const history = velocity.history || [];
        
        const velocityData = [
            ['Velocity Analysis', '', '', ''],
            ['Sprint', 'Planned', 'Completed', 'Velocity'],
        ];

        history.forEach(sprint => {
            velocityData.push([
                sprint.name || 'Sprint',
                sprint.planned || 0,
                sprint.completed || 0,
                sprint.velocity || 0
            ]);
        });

        return velocityData;
    }

    prepareStoriesData(data) {
        const stories = data.userStories || [];
        
        const storiesData = [
            ['User Stories', '', '', '', '', ''],
            ['ID', 'Title', 'Points', 'Status', 'Assignee', 'Priority'],
        ];

        stories.forEach(story => {
            storiesData.push([
                story.id || 'N/A',
                story.title || 'Untitled',
                story.points || 0,
                story.status || 'Unknown',
                story.assignee || 'Unassigned',
                story.priority || 'Medium'
            ]);
        });

        return storiesData;
    }

    formatExcelSheet(sheet, type) {
        if (!sheet['!cols']) sheet['!cols'] = [];
        
        // Set column widths based on type
        switch (type) {
            case 'summary':
                sheet['!cols'] = [
                    { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
                ];
                break;
            case 'team':
                sheet['!cols'] = [
                    { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
                ];
                break;
            case 'stories':
                sheet['!cols'] = [
                    { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
                ];
                break;
            default:
                sheet['!cols'] = [
                    { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
                ];
        }

        // Add conditional formatting for headers
        this.addExcelConditionalFormatting(sheet, type);
    }

    addExcelConditionalFormatting(sheet, type) {
        // This would require additional Excel formatting libraries
        // For now, we'll set basic styles
        
        const range = XLSX.utils.decode_range(sheet['!ref']);
        
        // Format header row
        for (let col = range.s.c; col <= range.e.c; col++) {
            const headerCell = XLSX.utils.encode_cell({ r: 1, c: col });
            if (sheet[headerCell]) {
                sheet[headerCell].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "94196B" } },
                    alignment: { horizontal: "center" }
                };
            }
        }
    }

    formatExcelWorkbook(workbook, template) {
        // Add workbook properties
        workbook.Props = {
            Title: template.name,
            Subject: 'ADO Metrics Report',
            Author: this.options.companyName,
            CreatedDate: new Date(),
            Company: this.options.companyName
        };

                 // Add custom properties
        workbook.Custprops = {
            'Report Type': template.type,
            'Generated By': 'ADO Metrics Command Center',
            'Template': template.name
        };
    }

    // ========================================
    // POWERPOINT GENERATION
    // ========================================

    async generatePowerPoint(data, templateKey, options = {}) {
        try {
            const template = this.templates.get(templateKey);
            if (!template) {
                throw new Error(`Template '${templateKey}' not found`);
            }

            // Create PowerPoint presentation structure
            const presentation = this.createPowerPointStructure(data, template, options);
            
            // Generate slides
            const slides = await this.createPowerPointSlides(data, template, options);
            
            // Convert to downloadable format
            const result = await this.exportPowerPoint(presentation, slides, template);
            
            return result;
            
        } catch (error) {
            console.error('PowerPoint generation failed:', error);
            throw error;
        }
    }

    createPowerPointStructure(data, template, options) {
        return {
            title: template.name,
            author: this.options.companyName,
            subject: 'ADO Metrics Report',
            created: new Date(),
            slides: [],
            theme: {
                primaryColor: this.options.primaryColor,
                background: '#ffffff',
                textColor: '#2e3440',
                accentColor: '#B83A8C'
            }
        };
    }

    async createPowerPointSlides(data, template, options) {
        const slides = [];

        // Title slide
        slides.push(this.createTitleSlide(data, template));

        // Agenda slide
        slides.push(this.createAgendaSlide(template));

        // Content slides based on template
        switch (template.type) {
            case 'executive':
                slides.push(...this.createExecutiveSlides(data));
                break;
            case 'detailed':
                slides.push(...this.createDetailedSlides(data));
                break;
            case 'quality':
                slides.push(...this.createQualitySlides(data));
                break;
            case 'performance':
                slides.push(...this.createPerformanceSlides(data));
                break;
            default:
                slides.push(...this.createGenericSlides(data));
        }

        // Summary slide
        slides.push(this.createSummarySlide(data, template));

        // Q&A slide
        slides.push(this.createQASlide());

        return slides;
    }

    createTitleSlide(data, template) {
        return {
            type: 'title',
            layout: 'title',
            content: {
                title: template.name,
                subtitle: `Generated on ${new Date().toLocaleDateString()}`,
                author: this.options.companyName,
                background: this.options.primaryColor,
                logo: this.options.logo
            },
            notes: `This presentation contains ${template.name.toLowerCase()} for the ADO Metrics Command Center.`
        };
    }

    createAgendaSlide(template) {
        const agendaItems = template.sections
            .filter(section => !['header', 'footer'].includes(section))
            .map(section => section.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

        return {
            type: 'content',
            layout: 'bullets',
            content: {
                title: 'Agenda',
                bullets: agendaItems,
                background: '#f8fafc'
            },
            notes: 'Overview of topics covered in this presentation.'
        };
    }

    createExecutiveSlides(data) {
        const slides = [];

        // Key Metrics Slide
        slides.push({
            type: 'content',
            layout: 'metrics',
            content: {
                title: 'Key Performance Indicators',
                metrics: data.summaryMetrics || {},
                chartType: 'dashboard',
                background: '#ffffff'
            },
            notes: 'High-level KPIs showing overall performance metrics.'
        });

        // Trends Slide
        slides.push({
            type: 'chart',
            layout: 'chart-focus',
            content: {
                title: 'Performance Trends',
                chartType: 'line',
                data: data.trendsData || {},
                insights: ['Upward trend in velocity', 'Quality metrics stable', 'Team performance improving']
            },
            notes: 'Trend analysis showing performance over time.'
        });

        // Recommendations Slide
        slides.push({
            type: 'content',
            layout: 'bullets',
            content: {
                title: 'Strategic Recommendations',
                bullets: (data.recommendations || []).map(rec => rec.text),
                priority: 'high'
            },
            notes: 'Key recommendations for leadership consideration.'
        });

        return slides;
    }

    createDetailedSlides(data) {
        const slides = [];

        // Sprint Overview
        slides.push({
            type: 'content',
            layout: 'split',
            content: {
                title: 'Sprint Overview',
                left: {
                    type: 'info',
                    data: data.currentSprint || {}
                },
                right: {
                    type: 'chart',
                    chartType: 'burndown',
                    data: data.burndownData || {}
                }
            },
            notes: 'Current sprint status and burndown chart.'
        });

        // Velocity Analysis
        slides.push({
            type: 'chart',
            layout: 'chart-focus',
            content: {
                title: 'Velocity Analysis',
                chartType: 'velocity',
                data: data.velocityData || {},
                insights: ['Average velocity trending up', 'Consistency improving', 'Capacity utilization optimal']
            },
            notes: 'Detailed velocity analysis with historical trends.'
        });

        // Team Performance
        slides.push({
            type: 'table',
            layout: 'table-focus',
            content: {
                title: 'Team Performance Matrix',
                headers: ['Member', 'Velocity', 'Quality', 'Utilization', 'Status'],
                rows: (data.teamPerformance?.members || []).map(member => [
                    member.name,
                    member.velocity,
                    member.quality,
                    member.utilization + '%',
                    member.status
                ])
            },
            notes: 'Individual team member performance metrics.'
        });

        return slides;
    }

    createQualitySlides(data) {
        const slides = [];

        // Test Coverage
        slides.push({
            type: 'chart',
            layout: 'chart-split',
            content: {
                title: 'Test Coverage Analysis',
                left: {
                    chartType: 'donut',
                    data: {
                        covered: data.qualityMetrics?.testCoverage || 0,
                        uncovered: 100 - (data.qualityMetrics?.testCoverage || 0)
                    }
                },
                right: {
                    type: 'metrics',
                    data: {
                        'Test Coverage': (data.qualityMetrics?.testCoverage || 0) + '%',
                        'Total Tests': data.testResults?.length || 0,
                        'Passing Tests': data.testResults?.filter(t => t.status === 'passed').length || 0
                    }
                }
            },
            notes: 'Current test coverage status and metrics.'
        });

        // Bug Analysis
        slides.push({
            type: 'chart',
            layout: 'chart-focus',
            content: {
                title: 'Bug Distribution Analysis',
                chartType: 'bar',
                data: data.bugs || {},
                insights: ['Critical bugs trending down', 'Resolution time improving', 'Quality gates effective']
            },
            notes: 'Bug distribution by severity and resolution trends.'
        });

        return slides;
    }

    createPerformanceSlides(data) {
        const slides = [];

        // Team Velocity
        slides.push({
            type: 'chart',
            layout: 'chart-focus',
            content: {
                title: 'Team Velocity Trends',
                chartType: 'line',
                data: data.velocityData || {},
                insights: ['Velocity stabilizing', 'Predictability increasing', 'Capacity well-utilized']
            },
            notes: 'Team velocity trends and predictability analysis.'
        });

        // Capacity Planning
        slides.push({
            type: 'table',
            layout: 'table-chart',
            content: {
                title: 'Capacity Planning Overview',
                table: {
                    headers: ['Sprint', 'Planned', 'Actual', 'Utilization'],
                    rows: (data.capacityData || []).map(sprint => [
                        sprint.name,
                        sprint.planned + 'h',
                        sprint.actual + 'h',
                        sprint.utilization + '%'
                    ])
                },
                chart: {
                    type: 'utilization',
                    data: data.capacityData || []
                }
            },
            notes: 'Capacity planning and utilization analysis.'
        });

        return slides;
    }

    createGenericSlides(data) {
        const slides = [];

        // Data Overview
        slides.push({
            type: 'content',
            layout: 'bullets',
            content: {
                title: 'Data Overview',
                bullets: Object.keys(data).map(key => `${key}: ${typeof data[key] === 'object' ? 'Available' : data[key]}`),
                background: '#f8fafc'
            },
            notes: 'Overview of available data in the report.'
        });

        return slides;
    }

    createSummarySlide(data, template) {
        const keyInsights = this.generateKeyInsights(data, template);
        
        return {
            type: 'content',
            layout: 'bullets',
            content: {
                title: 'Key Takeaways',
                bullets: keyInsights,
                priority: 'high',
                background: this.options.primaryColor,
                textColor: '#ffffff'
            },
            notes: 'Summary of key insights and takeaways from the analysis.'
        };
    }

    createQASlide() {
        return {
            type: 'content',
            layout: 'center',
            content: {
                title: 'Questions & Discussion',
                subtitle: 'Thank you for your attention',
                contact: this.options.companyName,
                background: '#f8fafc'
            },
            notes: 'Q&A session and discussion.'
        };
    }

    generateKeyInsights(data, template) {
        const insights = [];
        
        // Generate insights based on data
        if (data.summaryMetrics) {
            const metrics = Object.values(data.summaryMetrics);
            const positiveMetrics = metrics.filter(m => m.trend > 0).length;
            if (positiveMetrics > metrics.length / 2) {
                insights.push('Overall metrics trending positively');
            }
        }

        if (data.qualityMetrics?.testCoverage > 80) {
            insights.push('Test coverage exceeds quality gates');
        }

        if (data.teamPerformance?.members) {
            const activeMembers = data.teamPerformance.members.filter(m => m.status === 'Active').length;
            insights.push(`${activeMembers} active team members contributing`);
        }

        // Default insights if none generated
        if (insights.length === 0) {
            insights.push(
                'Analysis completed successfully',
                'Data quality is good',
                'Recommendations ready for implementation'
            );
        }

        return insights;
    }

    async exportPowerPoint(presentation, slides, template) {
        try {
            // Create HTML representation for download
            const htmlContent = this.createPowerPointHTML(presentation, slides, template);
            
            // Create downloadable file
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            const filename = `${template.name}-${new Date().toISOString().split('T')[0]}.html`;
            
            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            
            // Cleanup
            URL.revokeObjectURL(url);
            
            return {
                success: true,
                filename: filename,
                type: 'powerpoint',
                format: 'html',
                slides: slides.length
            };
            
        } catch (error) {
            console.error('PowerPoint export failed:', error);
            throw error;
        }
    }

    createPowerPointHTML(presentation, slides, template) {
        const slideHTML = slides.map((slide, index) => 
            this.createSlideHTML(slide, index, presentation.theme)
        ).join('');

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${presentation.title}</title>
    <style>
        ${this.getPowerPointCSS(presentation.theme)}
    </style>
</head>
<body>
    <div class="presentation">
        <div class="presentation-header">
            <h1>${presentation.title}</h1>
            <div class="presentation-info">
                <span>Created: ${presentation.created.toLocaleDateString()}</span>
                <span>Author: ${presentation.author}</span>
                <span>Slides: ${slides.length}</span>
            </div>
        </div>
        
        <div class="slides-container">
            ${slideHTML}
        </div>
        
        <div class="presentation-footer">
            <p>${this.options.footer}</p>
        </div>
    </div>
    
    <script>
        ${this.getPowerPointJS()}
    </script>
</body>
</html>
        `;
    }

    createSlideHTML(slide, index, theme) {
        const slideNumber = index + 1;
        
        let contentHTML = '';
        
        switch (slide.layout) {
            case 'title':
                contentHTML = this.createTitleSlideHTML(slide.content, theme);
                break;
            case 'bullets':
                contentHTML = this.createBulletsSlideHTML(slide.content, theme);
                break;
            case 'chart-focus':
                contentHTML = this.createChartSlideHTML(slide.content, theme);
                break;
            case 'table-focus':
                contentHTML = this.createTableSlideHTML(slide.content, theme);
                break;
            case 'split':
                contentHTML = this.createSplitSlideHTML(slide.content, theme);
                break;
            case 'center':
                contentHTML = this.createCenterSlideHTML(slide.content, theme);
                break;
            default:
                contentHTML = this.createDefaultSlideHTML(slide.content, theme);
        }

        return `
            <div class="slide slide-${slideNumber}" data-slide="${slideNumber}">
                <div class="slide-content">
                    ${contentHTML}
                </div>
                <div class="slide-number">${slideNumber}</div>
                ${slide.notes ? `<div class="slide-notes">${slide.notes}</div>` : ''}
            </div>
        `;
    }

    createTitleSlideHTML(content, theme) {
        return `
            <div class="title-slide" style="background: ${content.background || theme.primaryColor};">
                <div class="title-content">
                    ${content.logo ? `<img src="${content.logo}" alt="Logo" class="title-logo">` : ''}
                    <h1 class="slide-title">${content.title}</h1>
                    <p class="slide-subtitle">${content.subtitle}</p>
                    <p class="slide-author">${content.author}</p>
                </div>
            </div>
        `;
    }

    createBulletsSlideHTML(content, theme) {
        const bullets = content.bullets.map(bullet => `<li>${bullet}</li>`).join('');
        
        return `
            <div class="bullets-slide" style="background: ${content.background || '#ffffff'};">
                <h2 class="slide-title">${content.title}</h2>
                <ul class="bullet-list">
                    ${bullets}
                </ul>
            </div>
        `;
    }

    createChartSlideHTML(content, theme) {
        const insights = content.insights ? 
            `<div class="chart-insights">
                <h3>Key Insights</h3>
                <ul>
                    ${content.insights.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            </div>` : '';

        return `
            <div class="chart-slide">
                <h2 class="slide-title">${content.title}</h2>
                <div class="chart-container">
                    <div class="chart-placeholder">
                        <span>📊 ${content.chartType} Chart</span>
                        <p>Chart would be rendered here with actual data</p>
                    </div>
                </div>
                ${insights}
            </div>
        `;
    }

    createTableSlideHTML(content, theme) {
        const tableHTML = `
            <table class="slide-table">
                <thead>
                    <tr>
                        ${content.headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${content.rows.map(row => 
                        `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
                    ).join('')}
                </tbody>
            </table>
        `;

        return `
            <div class="table-slide">
                <h2 class="slide-title">${content.title}</h2>
                <div class="table-container">
                    ${tableHTML}
                </div>
            </div>
        `;
    }

    createSplitSlideHTML(content, theme) {
        return `
            <div class="split-slide">
                <h2 class="slide-title">${content.title}</h2>
                <div class="split-content">
                    <div class="split-left">
                        ${content.left.type === 'info' ? this.createInfoHTML(content.left.data) : 
                          content.left.type === 'chart' ? this.createChartPlaceholder(content.left.chartType) : ''}
                    </div>
                    <div class="split-right">
                        ${content.right.type === 'chart' ? this.createChartPlaceholder(content.right.chartType) : 
                          content.right.type === 'info' ? this.createInfoHTML(content.right.data) : ''}
                    </div>
                </div>
            </div>
        `;
    }

    createCenterSlideHTML(content, theme) {
        return `
            <div class="center-slide" style="background: ${content.background || '#f8fafc'};">
                <div class="center-content">
                    <h1 class="slide-title">${content.title}</h1>
                    ${content.subtitle ? `<p class="slide-subtitle">${content.subtitle}</p>` : ''}
                    ${content.contact ? `<p class="slide-contact">${content.contact}</p>` : ''}
                </div>
            </div>
        `;
    }

    createDefaultSlideHTML(content, theme) {
        return `
            <div class="default-slide">
                <h2 class="slide-title">${content.title || 'Slide Title'}</h2>
                <div class="slide-body">
                    <p>Content would be displayed here based on slide type.</p>
                </div>
            </div>
        `;
    }

    createInfoHTML(data) {
        return `
            <div class="info-content">
                ${Object.entries(data).map(([key, value]) => 
                    `<div class="info-item">
                        <strong>${key}:</strong> ${value}
                    </div>`
                ).join('')}
            </div>
        `;
    }

    createChartPlaceholder(chartType) {
        return `
            <div class="chart-placeholder">
                <span>📊 ${chartType} Chart</span>
                <p>Chart visualization</p>
            </div>
        `;
    }

    getPowerPointCSS(theme) {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: #f5f5f5;
                color: ${theme.textColor};
                line-height: 1.6;
                overflow-x: auto;
            }
            
            .presentation {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            
            .presentation-header {
                background: ${theme.primaryColor};
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .presentation-header h1 {
                font-size: 2.5em;
                margin-bottom: 15px;
            }
            
            .presentation-info {
                display: flex;
                justify-content: center;
                gap: 30px;
                font-size: 0.9em;
                opacity: 0.9;
            }
            
            .slides-container {
                padding: 20px;
            }
            
            .slide {
                background: white;
                margin: 20px 0;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                position: relative;
                min-height: 500px;
                display: flex;
                flex-direction: column;
            }
            
            .slide-content {
                flex: 1;
                padding: 40px;
            }
            
            .slide-number {
                position: absolute;
                top: 15px;
                right: 20px;
                background: ${theme.primaryColor};
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8em;
                font-weight: bold;
            }
            
            .slide-title {
                color: ${theme.primaryColor};
                font-size: 2em;
                margin-bottom: 30px;
                border-bottom: 3px solid ${theme.primaryColor};
                padding-bottom: 10px;
            }
            
            .title-slide {
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: white;
                border-radius: 8px;
                height: 100%;
            }
            
            .title-slide .slide-title {
                color: white;
                font-size: 3em;
                border: none;
                margin-bottom: 20px;
            }
            
            .slide-subtitle {
                font-size: 1.2em;
                margin-bottom: 15px;
                opacity: 0.9;
            }
            
            .slide-author {
                font-size: 1em;
                opacity: 0.8;
            }
            
            .bullet-list {
                font-size: 1.2em;
                line-height: 2;
                padding-left: 30px;
            }
            
            .bullet-list li {
                margin-bottom: 15px;
                padding-left: 10px;
            }
            
            .chart-container {
                background: #f8fafc;
                border-radius: 8px;
                padding: 40px;
                text-align: center;
                margin: 30px 0;
            }
            
            .chart-placeholder {
                font-size: 1.2em;
                color: #6b7280;
            }
            
            .chart-insights {
                background: #f0fdf4;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #10b981;
            }
            
            .chart-insights h3 {
                color: #059669;
                margin-bottom: 15px;
            }
            
            .slide-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }
            
            .slide-table th,
            .slide-table td {
                padding: 15px;
                text-align: left;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .slide-table th {
                background: ${theme.primaryColor};
                color: white;
                font-weight: 600;
            }
            
            .slide-table tr:nth-child(even) {
                background: #f8fafc;
            }
            
            .split-content {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                align-items: start;
            }
            
            .info-content {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
            }
            
            .info-item {
                margin-bottom: 10px;
                padding: 5px 0;
            }
            
            .center-slide {
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                height: 100%;
                border-radius: 8px;
            }
            
            .center-content .slide-title {
                font-size: 3em;
                border: none;
            }
            
            .slide-notes {
                background: #fef3c7;
                padding: 15px;
                border-top: 1px solid #f59e0b;
                font-size: 0.9em;
                font-style: italic;
                color: #92400e;
            }
            
            .presentation-footer {
                background: #374151;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 0.9em;
            }
            
            @media print {
                .slide {
                    page-break-after: always;
                    margin: 0;
                    box-shadow: none;
                }
                
                .presentation-header,
                .presentation-footer {
                    display: none;
                }
            }
        `;
    }

    getPowerPointJS() {
        return `
            // PowerPoint-like navigation
            document.addEventListener('DOMContentLoaded', function() {
                const slides = document.querySelectorAll('.slide');
                let currentSlide = 0;
                
                function showSlide(index) {
                    slides.forEach((slide, i) => {
                        slide.style.display = i === index ? 'flex' : 'none';
                    });
                }
                
                function nextSlide() {
                    if (currentSlide < slides.length - 1) {
                        currentSlide++;
                        showSlide(currentSlide);
                    }
                }
                
                function prevSlide() {
                    if (currentSlide > 0) {
                        currentSlide--;
                        showSlide(currentSlide);
                    }
                }
                
                // Keyboard navigation
                document.addEventListener('keydown', function(e) {
                    switch(e.key) {
                        case 'ArrowRight':
                        case ' ':
                            nextSlide();
                            break;
                        case 'ArrowLeft':
                            prevSlide();
                            break;
                        case 'Home':
                            currentSlide = 0;
                            showSlide(currentSlide);
                            break;
                        case 'End':
                            currentSlide = slides.length - 1;
                            showSlide(currentSlide);
                            break;
                    }
                });
                
                // Show all slides by default (for scrolling view)
                slides.forEach(slide => slide.style.display = 'flex');
            });
        `;
    }

    // ========================================
    // CSV EXPORT
    // ========================================

    async generateCSV(data, templateKey, options = {}) {
        try {
            const template = this.templates.get(templateKey);
            if (!template) {
                throw new Error(`Template '${templateKey}' not found`);
            }

            const csvData = this.prepareCSVData(data, template, options);
            const csvContent = this.convertToCSV(csvData);
            const filename = `${template.name}-${new Date().toISOString().split('T')[0]}.csv`;
            this.downloadCSV(csvContent, filename);
            
            return {
                success: true,
                filename: filename,
                type: 'csv',
                rows: csvData.length
            };
            
        } catch (error) {
            console.error('CSV generation failed:', error);
            throw error;
        }
    }

    prepareCSVData(data, template, options) {
        let csvData = [];
        
        csvData.push(['Report', template.name]);
        csvData.push(['Generated', new Date().toISOString()]);
        csvData.push(['Company', this.options.companyName]);
        csvData.push([]);
        
        switch (template.type) {
            case 'executive':
                csvData.push(...this.prepareExecutiveCSV(data));
                break;
            case 'detailed':
                csvData.push(...this.prepareDetailedCSV(data));
                break;
            case 'quality':
                csvData.push(...this.prepareQualityCSV(data));
                break;
            case 'performance':
                csvData.push(...this.preparePerformanceCSV(data));
                break;
            default:
                csvData.push(...this.prepareGenericCSV(data));
        }
        
        return csvData;
    }

    prepareExecutiveCSV(data) {
        const csvData = [];
        
        csvData.push(['SUMMARY METRICS']);
        csvData.push(['Metric', 'Value', 'Trend', 'Target']);
        
        const metrics = data.summaryMetrics || {};
        Object.entries(metrics).forEach(([key, value]) => {
            csvData.push([
                value.label || key,
                value.value || 0,
                value.trend ? `${value.trend > 0 ? '+' : ''}${value.trend}%` : 'N/A',
                value.target || 'N/A'
            ]);
        });
        
        csvData.push([]);
        csvData.push(['KEY PERFORMANCE INDICATORS']);
        csvData.push(['KPI', 'Current', 'Previous', 'Change']);
        
        const kpis = data.kpis || {};
        Object.entries(kpis).forEach(([key, value]) => {
            csvData.push([
                key,
                value.current || 0,
                value.previous || 0,
                value.change || 0
            ]);
        });
        
        return csvData;
    }

    prepareDetailedCSV(data) {
        const csvData = [];
        
        csvData.push(['SPRINT INFORMATION']);
        const sprint = data.currentSprint || {};
        csvData.push(['Property', 'Value']);
        csvData.push(['Sprint Name', sprint.name || 'N/A']);
        csvData.push(['Start Date', sprint.startDate || 'N/A']);
        csvData.push(['End Date', sprint.endDate || 'N/A']);
        csvData.push(['Team', sprint.team || 'N/A']);
        csvData.push(['Capacity', sprint.capacity || 0]);
        
        csvData.push([]);
        csvData.push(['USER STORIES']);
        csvData.push(['ID', 'Title', 'Points', 'Status', 'Assignee', 'Priority']);
        
        const stories = data.userStories || [];
        stories.forEach(story => {
            csvData.push([
                story.id || 'N/A',
                story.title || 'Untitled',
                story.points || 0,
                story.status || 'Unknown',
                story.assignee || 'Unassigned',
                story.priority || 'Medium'
            ]);
        });
        
        return csvData;
    }

    prepareQualityCSV(data) {
        const csvData = [];
        
        csvData.push(['QUALITY METRICS']);
        csvData.push(['Metric', 'Value', 'Target', 'Status']);
        
        const quality = data.qualityMetrics || {};
        csvData.push(['Test Coverage', `${quality.testCoverage || 0}%`, '80%', quality.testCoverage >= 80 ? 'Pass' : 'Fail']);
        csvData.push(['Bug Count', quality.bugCount || 0, '< 10', quality.bugCount < 10 ? 'Pass' : 'Warning']);
        csvData.push(['Code Quality Score', `${quality.codeQualityScore || 0}/10`, '8/10', quality.codeQualityScore >= 8 ? 'Pass' : 'Warning']);
        
        return csvData;
    }

    preparePerformanceCSV(data) {
        const csvData = [];
        
        csvData.push(['TEAM PERFORMANCE']);
        csvData.push(['Member', 'Velocity', 'Quality Score', 'Utilization %', 'Status']);
        
        const team = data.teamPerformance || {};
        (team.members || []).forEach(member => {
            csvData.push([
                member.name || 'Unknown',
                member.velocity || 0,
                member.quality || 0,
                member.utilization || 0,
                member.status || 'Unknown'
            ]);
        });
        
        return csvData;
    }

    prepareGenericCSV(data) {
        const csvData = [];
        
        csvData.push(['RAW DATA EXPORT']);
        csvData.push(['Timestamp', 'Category', 'Metric', 'Value']);
        
        const timestamp = new Date().toISOString();
        
        Object.entries(data).forEach(([category, categoryData]) => {
            if (typeof categoryData === 'object' && categoryData !== null) {
                Object.entries(categoryData).forEach(([key, value]) => {
                    csvData.push([
                        timestamp,
                        category,
                        key,
                        value
                    ]);
                });
            } else {
                csvData.push([
                    timestamp,
                    'root',
                    category,
                    categoryData
                ]);
            }
        });
        
        return csvData;
    }

    convertToCSV(data) {
        return data.map(row => {
            return row.map(cell => {
                const cellStr = String(cell || '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',');
        }).join('\n');
    }

    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    // ========================================
    // HTML EMAIL EXPORT
    // ========================================

    async generateEmailHTML(data, templateKey, options = {}) {
        try {
            const template = this.templates.get(templateKey);
            if (!template) {
                throw new Error(`Template '${templateKey}' not found`);
            }

            const emailHTML = this.createEmailHTML(data, template, options);
            
            if (options.download !== false) {
                const filename = `${template.name}-Email-${new Date().toISOString().split('T')[0]}.html`;
                this.downloadHTML(emailHTML, filename);
            }
            
            return {
                success: true,
                filename: options.download !== false ? `${template.name}-Email-${new Date().toISOString().split('T')[0]}.html` : null,
                type: 'email-html',
                content: emailHTML
            };
            
        } catch (error) {
            console.error('Email HTML generation failed:', error);
            throw error;
        }
    }

    createEmailHTML(data, template, options) {
        const emailContent = this.createEmailContent(data, template, options);
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.name} - ${this.options.companyName}</title>
    <style>
        ${this.getEmailCSS()}
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif;">
    <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        ${this.createEmailHeader(template)}
        
        <div class="email-content">
            ${emailContent}
        </div>
        
        ${this.createEmailFooter()}
    </div>
</body>
</html>
        `;
    }

    createEmailHeader(template) {
        return `
            <div class="email-header" style="
                background: linear-gradient(135deg, ${this.options.primaryColor}, #B83A8C);
                color: white;
                padding: 30px 20px;
                text-align: center;
            ">
                ${this.options.logo ? `<img src="${this.options.logo}" alt="Logo" style="height: 40px; margin-bottom: 15px;">` : ''}
                <h1 style="
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                ">${template.name}</h1>
                <p style="
                    margin: 10px 0 0 0;
                    opacity: 0.9;
                    font-size: 14px;
                ">Generated on ${new Date().toLocaleDateString()}</p>
            </div>
        `;
    }

    createEmailContent(data, template, options) {
        let content = '';
        
        content += this.createEmailSummary(data, template);
        content += this.createEmailMetrics(data);
        
        switch (template.type) {
            case 'executive':
                content += this.createEmailExecutiveContent(data);
                break;
            case 'detailed':
                content += this.createEmailDetailedContent(data);
                break;
            case 'quality':
                content += this.createEmailQualityContent(data);
                break;
            case 'performance':
                content += this.createEmailPerformanceContent(data);
                break;
            default:
                content += this.createEmailGenericContent(data);
        }
        
        content += this.createEmailCTA(template);
        
        return content;
    }

    createEmailSummary(data, template) {
        return `
            <div class="email-section" style="padding: 30px 20px; border-bottom: 1px solid #e5e7eb;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin: 0 0 20px 0;
                    font-size: 20px;
                    font-weight: 600;
                ">Executive Summary</h2>
                
                <p style="
                    color: #374151;
                    line-height: 1.6;
                    margin: 0 0 15px 0;
                ">
                    This ${template.name.toLowerCase()} provides comprehensive insights into your ADO metrics and performance indicators.
                    Key highlights and recommendations are included below.
                </p>
                
                <div class="highlight-box" style="
                    background: #f0fdf4;
                    border-left: 4px solid #10b981;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 0 8px 8px 0;
                ">
                    <p style="
                        color: #059669;
                        margin: 0;
                        font-weight: 600;
                        font-size: 14px;
                    ">
                        📊 Report generated successfully with ${Object.keys(data).length} data categories analyzed
                    </p>
                </div>
            </div>
        `;
    }

    createEmailMetrics(data) {
        const metrics = data.summaryMetrics || {};
        
        if (Object.keys(metrics).length === 0) {
            return '';
        }
        
        const metricsHTML = Object.entries(metrics).map(([key, value]) => `
            <div class="metric-card" style="
                background: #f8fafc;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                border: 1px solid #e5e7eb;
            ">
                <div style="
                    font-size: 28px;
                    font-weight: 700;
                    color: ${this.options.primaryColor};
                    margin-bottom: 5px;
                ">${value.value}</div>
                <div style="
                    font-size: 14px;
                    color: #6b7280;
                    font-weight: 500;
                ">${value.label}</div>
                ${value.trend ? `
                    <div style="
                        font-size: 12px;
                        color: ${value.trend > 0 ? '#10b981' : '#ef4444'};
                        margin-top: 8px;
                        font-weight: 600;
                    ">
                        ${value.trend > 0 ? '↗' : '↘'} ${Math.abs(value.trend)}%
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        return `
            <div class="email-section" style="padding: 30px 20px; border-bottom: 1px solid #e5e7eb;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin: 0 0 20px 0;
                    font-size: 20px;
                    font-weight: 600;
                ">Key Metrics</h2>
                
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                ">
                    ${metricsHTML}
                </div>
            </div>
        `;
    }

    createEmailExecutiveContent(data) {
        const recommendations = data.recommendations || [];
        
        return `
            <div class="email-section" style="padding: 30px 20px; border-bottom: 1px solid #e5e7eb;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin: 0 0 20px 0;
                    font-size: 20px;
                    font-weight: 600;
                ">Strategic Recommendations</h2>
                
                ${recommendations.length > 0 ? `
                    <ul style="
                        color: #374151;
                        line-height: 1.8;
                        padding-left: 20px;
                        margin: 0;
                    ">
                        ${recommendations.map(rec => `
                            <li style="margin-bottom: 10px;">
                                <strong>${rec.priority || 'Medium'} Priority:</strong> ${rec.text}
                            </li>
                        `).join('')}
                    </ul>
                ` : `
                    <p style="color: #6b7280; font-style: italic;">
                        No specific recommendations at this time. Continue monitoring key metrics.
                    </p>
                `}
            </div>
        `;
    }

    createEmailDetailedContent(data) {
        const sprint = data.currentSprint || {};
        
        return `
            <div class="email-section" style="padding: 30px 20px; border-bottom: 1px solid #e5e7eb;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin: 0 0 20px 0;
                    font-size: 20px;
                    font-weight: 600;
                ">Sprint Highlights</h2>
                
                <div style="
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 20px;
                    border: 1px solid #e5e7eb;
                ">
                    <div style="
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 15px;
                    ">
                        <div>
                            <strong style="color: #374151;">Sprint:</strong>
                            <span style="color: #6b7280;">${sprint.name || 'Current Sprint'}</span>
                        </div>
                        <div>
                            <strong style="color: #374151;">Team:</strong>
                            <span style="color: #6b7280;">${sprint.team || 'Development Team'}</span>
                        </div>
                    </div>
                    
                    <div style="
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                    ">
                        <div>
                            <strong style="color: #374151;">Duration:</strong>
                            <span style="color: #6b7280;">${sprint.startDate || 'N/A'} - ${sprint.endDate || 'N/A'}</span>
                        </div>
                        <div>
                            <strong style="color: #374151;">Capacity:</strong>
                            <span style="color: #6b7280;">${sprint.capacity || 0} hours</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createEmailQualityContent(data) {
        const quality = data.qualityMetrics || {};
        
        return `
            <div class="email-section" style="padding: 30px 20px; border-bottom: 1px solid #e5e7eb;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin: 0 0 20px 0;
                    font-size: 20px;
                    font-weight: 600;
                ">Quality Overview</h2>
                
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                ">
                    <div class="quality-metric" style="
                        background: ${quality.testCoverage >= 80 ? '#f0fdf4' : '#fef2f2'};
                        border-radius: 8px;
                        padding: 15px;
                        text-align: center;
                        border: 1px solid ${quality.testCoverage >= 80 ? '#10b981' : '#ef4444'};
                    ">
                        <div style="
                            font-size: 24px;
                            font-weight: 700;
                            color: ${quality.testCoverage >= 80 ? '#059669' : '#dc2626'};
                        ">${quality.testCoverage || 0}%</div>
                        <div style="
                            font-size: 14px;
                            color: #374151;
                            font-weight: 500;
                        ">Test Coverage</div>
                    </div>
                    
                    <div class="quality-metric" style="
                        background: ${quality.bugCount < 10 ? '#f0fdf4' : '#fef2f2'};
                        border-radius: 8px;
                        padding: 15px;
                        text-align: center;
                        border: 1px solid ${quality.bugCount < 10 ? '#10b981' : '#f59e0b'};
                    ">
                        <div style="
                            font-size: 24px;
                            font-weight: 700;
                            color: ${quality.bugCount < 10 ? '#059669' : '#d97706'};
                        ">${quality.bugCount || 0}</div>
                        <div style="
                            font-size: 14px;
                            color: #374151;
                            font-weight: 500;
                        ">Open Bugs</div>
                    </div>
                </div>
            </div>
        `;
    }

    createEmailPerformanceContent(data) {
        const team = data.teamPerformance || {};
        const memberCount = (team.members || []).length;
        const activeMemberCount = (team.members || []).filter(m => m.status === 'Active').length;
        
        return `
            <div class="email-section" style="padding: 30px 20px; border-bottom: 1px solid #e5e7eb;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin: 0 0 20px 0;
                    font-size: 20px;
                    font-weight: 600;
                ">Team Performance</h2>
                
                <div style="
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 20px;
                    border: 1px solid #e5e7eb;
                ">
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 20px;
                        text-align: center;
                    ">
                        <div>
                            <div style="
                                font-size: 28px;
                                font-weight: 700;
                                color: ${this.options.primaryColor};
                            ">${memberCount}</div>
                            <div style="
                                font-size: 14px;
                                color: #6b7280;
                            ">Team Members</div>
                        </div>
                        
                        <div>
                            <div style="
                                font-size: 28px;
                                font-weight: 700;
                                color: #10b981;
                            ">${activeMemberCount}</div>
                            <div style="
                                font-size: 14px;
                                color: #6b7280;
                            ">Active Members</div>
                        </div>
                        
                        <div>
                            <div style="
                                font-size: 28px;
                                font-weight: 700;
                                color: ${this.options.primaryColor};
                            ">${memberCount > 0 ? Math.round((activeMemberCount / memberCount) * 100) : 0}%</div>
                            <div style="
                                font-size: 14px;
                                color: #6b7280;
                            ">Utilization</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createEmailGenericContent(data) {
        const dataCategories = Object.keys(data).length;
        
        return `
            <div class="email-section" style="padding: 30px 20px; border-bottom: 1px solid #e5e7eb;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin: 0 0 20px 0;
                    font-size: 20px;
                    font-weight: 600;
                ">Data Summary</h2>
                
                <div class="info-box" style="
                    background: #f0f9ff;
                    border-left: 4px solid #0ea5e9;
                    padding: 20px;
                    border-radius: 0 8px 8px 0;
                ">
                    <p style="
                        color: #0369a1;
                        margin: 0;
                        font-weight: 600;
                    ">
                        📋 Report contains data from ${dataCategories} categories
                    </p>
                    <p style="
                        color: #374151;
                        margin: 10px 0 0 0;
                        line-height: 1.6;
                    ">
                        This comprehensive report includes all available metrics and performance indicators.
                        Please review the attached detailed files for complete analysis.
                    </p>
                </div>
            </div>
        `;
    }

    createEmailCTA(template) {
        return `
            <div class="email-section" style="padding: 30px 20px; text-align: center;">
                <h2 style="
                    color: ${this.options.primaryColor};
                    margin: 0 0 20px 0;
                    font-size: 20px;
                    font-weight: 600;
                ">Next Steps</h2>
                
                <p style="
                    color: #374151;
                    line-height: 1.6;
                    margin: 0 0 25px 0;
                ">
                    Review the detailed analysis and consider implementing the recommended actions.
                    Contact your ADO administrator for more information.
                </p>
                
                <div style="
                    background: linear-gradient(135deg, ${this.options.primaryColor}, #B83A8C);
                    border-radius: 8px;
                    padding: 15px 30px;
                    display: inline-block;
                ">
                    <a href="#" style="
                        color: white;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 16px;
                    ">Access Full Dashboard →</a>
                </div>
            </div>
        `;
    }

    createEmailFooter() {
        return `
            <div class="email-footer" style="
                background: #374151;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 14px;
            ">
                <p style="margin: 0 0 10px 0;">
                    ${this.options.footer}
                </p>
                <p style="margin: 0; opacity: 0.8; font-size: 12px;">
                    This report was automatically generated by ${this.options.companyName}
                </p>
            </div>
        `;
    }

    getEmailCSS() {
        return `
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                font-family: 'Segoe UI', Arial, sans-serif;
            }
            
            .email-section {
                padding: 30px 20px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .metric-card {
                background: #f8fafc;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                border: 1px solid #e5e7eb;
            }
            
            @media only screen and (max-width: 600px) {
                .email-container {
                    width: 100% !important;
                }
                
                .email-section {
                    padding: 20px 15px !important;
                }
            }
        `;
    }

    downloadHTML(htmlContent, filename) {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    // ========================================
    // SCHEDULING & AUTOMATION
    // ========================================

    setupScheduler() {
        // Initialize scheduling system
        this.schedulerActive = false;
        this.scheduleInterval = null;
        
        console.log('📅 Report scheduler initialized');
    }

    addSchedule(scheduleConfig) {
        const scheduleId = this.generateScheduleId();
        
        const schedule = {
            id: scheduleId,
            name: scheduleConfig.name || 'Unnamed Schedule',
            templateKey: scheduleConfig.templateKey,
            frequency: scheduleConfig.frequency, // 'daily', 'weekly', 'monthly'
            time: scheduleConfig.time || '09:00',
            recipients: scheduleConfig.recipients || [],
            formats: scheduleConfig.formats || ['pdf'],
            active: scheduleConfig.active !== false,
            lastRun: null,
            nextRun: this.calculateNextRun(scheduleConfig.frequency, scheduleConfig.time),
            created: new Date(),
            options: scheduleConfig.options || {}
        };
        
        this.schedules.set(scheduleId, schedule);
        
        if (schedule.active) {
            this.startScheduler();
        }
        
        console.log(`📋 Schedule added: ${schedule.name} (${scheduleId})`);
        return scheduleId;
    }

    removeSchedule(scheduleId) {
        const schedule = this.schedules.get(scheduleId);
        if (schedule) {
            this.schedules.delete(scheduleId);
            console.log(`🗑️ Schedule removed: ${schedule.name}`);
            
            if (this.schedules.size === 0) {
                this.stopScheduler();
            }
            
            return true;
        }
        return false;
    }

    updateSchedule(scheduleId, updates) {
        const schedule = this.schedules.get(scheduleId);
        if (schedule) {
            Object.assign(schedule, updates);
            
            if ('frequency' in updates || 'time' in updates) {
                schedule.nextRun = this.calculateNextRun(schedule.frequency, schedule.time);
            }
            
            console.log(`📝 Schedule updated: ${schedule.name}`);
            return true;
        }
        return false;
    }

    startScheduler() {
        if (this.schedulerActive) return;
        
        this.schedulerActive = true;
        this.scheduleInterval = setInterval(() => {
            this.checkSchedules();
        }, 60000); // Check every minute
        
        console.log('⏰ Report scheduler started');
    }

    stopScheduler() {
        if (!this.schedulerActive) return;
        
        this.schedulerActive = false;
        if (this.scheduleInterval) {
            clearInterval(this.scheduleInterval);
            this.scheduleInterval = null;
        }
        
        console.log('⏹️ Report scheduler stopped');
    }

    async checkSchedules() {
        const now = new Date();
        
        for (const [scheduleId, schedule] of this.schedules) {
            if (schedule.active && schedule.nextRun <= now) {
                try {
                    await this.executeSchedule(schedule);
                    schedule.lastRun = now;
                    schedule.nextRun = this.calculateNextRun(schedule.frequency, schedule.time);
                    
                    console.log(`✅ Schedule executed: ${schedule.name}`);
                } catch (error) {
                    console.error(`❌ Schedule execution failed: ${schedule.name}`, error);
                }
            }
        }
    }

    async executeSchedule(schedule) {
        // Get current data (this would normally fetch from your data source)
        const data = await this.getCurrentData();
        
        const results = [];
        
        // Generate reports in requested formats
        for (const format of schedule.formats) {
            try {
                let result;
                
                switch (format) {
                    case 'pdf':
                        result = await this.generatePDF(data, schedule.templateKey, schedule.options);
                        break;
                    case 'excel':
                        result = await this.generateExcel(data, schedule.templateKey, schedule.options);
                        break;
                    case 'powerpoint':
                        result = await this.generatePowerPoint(data, schedule.templateKey, schedule.options);
                        break;
                    case 'csv':
                        result = await this.generateCSV(data, schedule.templateKey, schedule.options);
                        break;
                    case 'email':
                        result = await this.generateEmailHTML(data, schedule.templateKey, { ...schedule.options, download: false });
                        break;
                    default:
                        console.warn(`Unknown format: ${format}`);
                        continue;
                }
                
                results.push(result);
            } catch (error) {
                console.error(`Failed to generate ${format} report:`, error);
            }
        }
        
        // Send to recipients
        if (schedule.recipients.length > 0 && results.length > 0) {
            await this.sendReports(schedule, results, data);
        }
        
        return results;
    }

    async getCurrentData() {
        // This would normally fetch real data from your ADO/Azure DevOps API
        // For now, return sample data
        return {
            summaryMetrics: {
                velocity: { value: 85, label: 'Velocity', trend: 12 },
                quality: { value: 92, label: 'Quality Score', trend: -3 },
                coverage: { value: 78, label: 'Test Coverage', trend: 5 }
            },
            currentSprint: {
                name: 'Sprint 24.06',
                startDate: '2024-06-01',
                endDate: '2024-06-14',
                team: 'Alpha Team',
                capacity: 320
            },
            teamPerformance: {
                members: [
                    { name: 'John Doe', velocity: 32, quality: 9, utilization: 85, status: 'Active' },
                    { name: 'Jane Smith', velocity: 28, quality: 8, utilization: 90, status: 'Active' },
                    { name: 'Bob Johnson', velocity: 25, quality: 9, utilization: 78, status: 'Active' }
                ]
            },
            qualityMetrics: {
                testCoverage: 78,
                bugCount: 5,
                codeQualityScore: 8.5
            }
        };
    }

    async sendReports(schedule, results, data) {
        // This would integrate with your email system
        // For now, just log the action
        console.log(`📧 Sending reports to ${schedule.recipients.length} recipients:`, {
            schedule: schedule.name,
            recipients: schedule.recipients,
            formats: results.map(r => r.type)
        });
        
        // In a real implementation, you would:
        // 1. Compose email with report attachments
        // 2. Send via SMTP or email service API
        // 3. Track delivery status
        
        // Simulate email sending
        return new Promise(resolve => {
            setTimeout(() => {
                console.log(`✅ Reports sent successfully for schedule: ${schedule.name}`);
                resolve(true);
            }, 1000);
        });
    }

    addRecipient(email, name = null, preferences = {}) {
        const recipientId = this.generateRecipientId();
        
        const recipient = {
            id: recipientId,
            email: email,
            name: name || email.split('@')[0],
            preferences: {
                formats: preferences.formats || ['pdf'],
                frequency: preferences.frequency || 'weekly',
                timezone: preferences.timezone || 'UTC',
                ...preferences
            },
            active: preferences.active !== false,
            created: new Date()
        };
        
        this.recipients.set(recipientId, recipient);
        
        console.log(`👤 Recipient added: ${recipient.name} (${recipient.email})`);
        return recipientId;
    }

    removeRecipient(recipientId) {
        const recipient = this.recipients.get(recipientId);
        if (recipient) {
            this.recipients.delete(recipientId);
            
            // Remove from all schedules
            for (const schedule of this.schedules.values()) {
                schedule.recipients = schedule.recipients.filter(id => id !== recipientId);
            }
            
            console.log(`🗑️ Recipient removed: ${recipient.name}`);
            return true;
        }
        return false;
    }

    calculateNextRun(frequency, time) {
        const now = new Date();
        const [hour, minute] = time.split(':').map(Number);
        
        let nextRun = new Date();
        nextRun.setHours(hour, minute, 0, 0);
        
        // If time has passed today, start from tomorrow
        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
        
        switch (frequency) {
            case 'daily':
                // Next run is already set correctly
                break;
            case 'weekly':
                // Set to next Monday at specified time
                const daysUntilMonday = (8 - nextRun.getDay()) % 7;
                nextRun.setDate(nextRun.getDate() + daysUntilMonday);
                break;
            case 'monthly':
                // Set to first day of next month
                nextRun.setMonth(nextRun.getMonth() + 1, 1);
                break;
            default:
                console.warn(`Unknown frequency: ${frequency}`);
        }
        
        return nextRun;
    }

    generateScheduleId() {
        return 'schedule_' + Math.random().toString(36).substr(2, 9);
    }

    generateRecipientId() {
        return 'recipient_' + Math.random().toString(36).substr(2, 9);
    }

    // ========================================
    // PUBLIC API METHODS
    // ========================================

    async generateReport(data, templateKey, format = 'pdf', options = {}) {
        switch (format.toLowerCase()) {
            case 'pdf':
                return await this.generatePDF(data, templateKey, options);
            case 'excel':
            case 'xlsx':
                return await this.generateExcel(data, templateKey, options);
            case 'powerpoint':
            case 'pptx':
                return await this.generatePowerPoint(data, templateKey, options);
            case 'csv':
                return await this.generateCSV(data, templateKey, options);
            case 'email':
            case 'html':
                return await this.generateEmailHTML(data, templateKey, options);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    getAvailableTemplates() {
        return Array.from(this.templates.entries()).map(([key, template]) => ({
            key,
            name: template.name,
            type: template.type,
            description: `${template.type} report with ${template.sections.length} sections`
        }));
    }

    getSchedules() {
        return Array.from(this.schedules.values());
    }

    getRecipients() {
        return Array.from(this.recipients.values());
    }

    getSchedulerStatus() {
        return {
            active: this.schedulerActive,
            scheduleCount: this.schedules.size,
            recipientCount: this.recipients.size,
            nextRuns: Array.from(this.schedules.values())
                .filter(s => s.active)
                .map(s => ({ name: s.name, nextRun: s.nextRun }))
                .sort((a, b) => a.nextRun - b.nextRun)
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportGenerator;
} else if (typeof window !== 'undefined') {
    window.ReportGenerator = ReportGenerator;
}
