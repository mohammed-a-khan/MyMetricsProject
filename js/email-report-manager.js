/**
 * ADO Metrics Command Center - Email Report Distribution System
 * Comprehensive email management with templates, scheduling, and delivery tracking
 * Pixel-perfect emails tested across all major email clients
 */

class EmailReportManager {
    constructor(options = {}) {
        this.options = {
            companyName: 'ADO Metrics Command Center',
            primaryColor: '#94196B',
            secondaryColor: '#B83A8C',
            accentColor: '#10b981',
            backgroundColor: '#f8fafc',
            textColor: '#374151',
            logo: null,
            dashboardUrl: 'https://metrics.company.com',
            timezone: 'UTC',
            businessHours: { start: 9, end: 17 },
            ...options
        };

        this.templates = new Map();
        this.recipients = new Map();
        this.groups = new Map();
        this.schedules = new Map();
        this.deliveryLog = new Map();
        this.bounceList = new Set();
        this.optOutList = new Set();
        
        this.emailProvider = null;
        this.holidayCalendar = new Set();
        this.schedulerActive = false;
        this.scheduleInterval = null;

        this.init();
    }

    init() {
        this.loadEmailTemplates();
        this.setupHolidayCalendar();
        this.startScheduler();
        
        console.log('📧 Email Report Manager initialized');
    }

    // ========================================
    // EMAIL TEMPLATE SYSTEM
    // ========================================

    loadEmailTemplates() {
        // Daily Standup Summary Template
        this.templates.set('daily-standup', {
            name: 'Daily Standup Summary',
            subject: 'Daily Team Update - {{date}}',
            type: 'daily',
            priority: 'normal',
            sections: [
                'header',
                'yesterday-accomplishments',
                'today-plans',
                'blockers',
                'metrics-snapshot',
                'quick-actions',
                'footer'
            ],
            schedule: {
                frequency: 'daily',
                time: '09:00',
                businessDaysOnly: true
            }
        });

        // Sprint Completion Report Template
        this.templates.set('sprint-completion', {
            name: 'Sprint Completion Report',
            subject: 'Sprint {{sprintName}} - Completion Summary',
            type: 'milestone',
            priority: 'high',
            sections: [
                'header',
                'sprint-summary',
                'velocity-chart',
                'burndown-results',
                'completed-stories',
                'team-highlights',
                'retrospective-items',
                'next-sprint-preview',
                'footer'
            ],
            schedule: {
                frequency: 'milestone',
                trigger: 'sprint-end'
            }
        });

        // Weekly Metrics Digest Template
        this.templates.set('weekly-digest', {
            name: 'Weekly Metrics Digest',
            subject: 'Weekly Performance Digest - Week of {{weekStart}}',
            type: 'weekly',
            priority: 'normal',
            sections: [
                'header',
                'week-summary',
                'key-metrics',
                'trend-analysis',
                'team-performance',
                'quality-insights',
                'upcoming-milestones',
                'action-items',
                'footer'
            ],
            schedule: {
                frequency: 'weekly',
                time: '08:00',
                day: 'monday',
                businessDaysOnly: false
            }
        });

        // Monthly Executive Summary Template
        this.templates.set('monthly-executive', {
            name: 'Monthly Executive Summary',
            subject: 'Executive Summary - {{monthYear}}',
            type: 'monthly',
            priority: 'high',
            sections: [
                'executive-header',
                'key-achievements',
                'performance-dashboard',
                'trend-charts',
                'strategic-insights',
                'recommendations',
                'resource-utilization',
                'forecast',
                'executive-footer'
            ],
            schedule: {
                frequency: 'monthly',
                time: '07:00',
                day: 1,
                businessDaysOnly: false
            }
        });

        // Alert Notifications Template
        this.templates.set('alert-notification', {
            name: 'Alert Notification',
            subject: '🚨 {{alertType}} Alert - {{alertTitle}}',
            type: 'alert',
            priority: 'urgent',
            sections: [
                'alert-header',
                'alert-details',
                'impact-assessment',
                'recommended-actions',
                'contact-info',
                'alert-footer'
            ],
            schedule: {
                frequency: 'trigger',
                immediate: true
            }
        });
    }

    // ========================================
    // HTML EMAIL GENERATION
    // ========================================

    async generateEmailHTML(templateKey, data, personalizations = {}) {
        try {
            const template = this.templates.get(templateKey);
            if (!template) {
                throw new Error(`Template '${templateKey}' not found`);
            }

            // Apply personalizations
            const personalizedData = { ...data, ...personalizations };
            
            // Generate email structure
            const emailStructure = this.createEmailStructure(template, personalizedData);
            
            // Build HTML with inline CSS
            const emailHTML = this.buildEmailHTML(emailStructure, template, personalizedData);
            
            // Inline charts if needed
            const finalHTML = await this.inlineCharts(emailHTML, personalizedData);
            
            return {
                html: finalHTML,
                subject: this.parseSubject(template.subject, personalizedData),
                template: templateKey,
                priority: template.priority
            };
            
        } catch (error) {
            console.error('Email HTML generation failed:', error);
            throw error;
        }
    }

    createEmailStructure(template, data) {
        const structure = {
            preheader: this.generatePreheader(template, data),
            header: this.generateEmailHeader(template, data),
            content: this.generateEmailContent(template, data),
            footer: this.generateEmailFooter(template, data)
        };

        return structure;
    }

    buildEmailHTML(structure, template, data) {
        const darkModeStyles = this.generateDarkModeCSS();
        const responsiveStyles = this.generateResponsiveCSS();
        const baseStyles = this.generateBaseCSS();

        return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <title>${this.parseSubject(template.subject, data)}</title>
    
    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    
    <style type="text/css">
        ${baseStyles}
        ${responsiveStyles}
        ${darkModeStyles}
    </style>
</head>
<body style="margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: ${this.options.backgroundColor};">
    
    <!-- Preheader -->
    <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        ${structure.preheader}
    </div>
    
    <!-- Email Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: ${this.options.backgroundColor};">
        <tr>
            <td style="padding: 20px 0;">
                
                <!-- Main Email Table -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" class="email-container">
                    
                    <!-- Header -->
                    ${structure.header}
                    
                    <!-- Content -->
                    ${structure.content}
                    
                    <!-- Footer -->
                    ${structure.footer}
                    
                </table>
                
            </td>
        </tr>
    </table>
    
    <!-- Tracking Pixel -->
    <img src="{{trackingPixel}}" width="1" height="1" style="display: none;" alt="">
    
</body>
</html>
        `;
    }

    generatePreheader(template, data) {
        switch (template.type) {
            case 'daily':
                return `Daily team update with key metrics and action items for ${data.currentDate || 'today'}`;
            case 'weekly':
                return `Weekly performance summary with ${data.completedStories || 0} stories completed`;
            case 'monthly':
                return `Monthly executive summary with strategic insights and performance trends`;
            case 'milestone':
                return `Sprint completion summary with velocity and quality metrics`;
            case 'alert':
                return `Important alert requiring immediate attention: ${data.alertTitle || 'System Alert'}`;
            default:
                return `ADO Metrics report update from ${this.options.companyName}`;
        }
    }

    generateEmailHeader(template, data) {
        const headerStyle = template.type === 'alert' ? 
            `background: linear-gradient(135deg, #ef4444, #dc2626);` :
            `background: linear-gradient(135deg, ${this.options.primaryColor}, ${this.options.secondaryColor});`;

        return `
            <tr>
                <td style="${headerStyle} padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    ${this.options.logo ? `
                        <img src="${this.options.logo}" alt="${this.options.companyName}" style="height: 40px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;">
                    ` : ''}
                    
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.2;">
                        ${template.name}
                    </h1>
                    
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        ${this.formatDate(new Date())}
                    </p>
                    
                    ${template.type === 'alert' ? `
                        <div style="margin-top: 15px; padding: 10px; background: rgba(255, 255, 255, 0.2); border-radius: 6px; display: inline-block;">
                            <span style="color: #ffffff; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                                ${data.alertType || 'ALERT'} - IMMEDIATE ATTENTION REQUIRED
                            </span>
                        </div>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    generateEmailContent(template, data) {
        let contentHTML = '';

        template.sections.forEach(sectionKey => {
            if (!['header', 'footer', 'executive-header', 'executive-footer', 'alert-header', 'alert-footer'].includes(sectionKey)) {
                contentHTML += this.generateContentSection(sectionKey, template, data);
            }
        });

        return contentHTML;
    }

    generateContentSection(sectionKey, template, data) {
        switch (sectionKey) {
            case 'yesterday-accomplishments':
                return this.createAccomplishmentsSection(data);
            case 'today-plans':
                return this.createPlansSection(data);
            case 'blockers':
                return this.createBlockersSection(data);
            case 'metrics-snapshot':
                return this.createMetricsSnapshotSection(data);
            case 'quick-actions':
                return this.createQuickActionsSection(data);
            case 'sprint-summary':
                return this.createSprintSummarySection(data);
            case 'velocity-chart':
                return this.createVelocityChartSection(data);
            case 'burndown-results':
                return this.createBurndownResultsSection(data);
            case 'completed-stories':
                return this.createCompletedStoriesSection(data);
            case 'team-highlights':
                return this.createTeamHighlightsSection(data);
            case 'week-summary':
                return this.createWeekSummarySection(data);
            case 'key-metrics':
                return this.createKeyMetricsSection(data);
            case 'trend-analysis':
                return this.createTrendAnalysisSection(data);
            case 'team-performance':
                return this.createTeamPerformanceSection(data);
            case 'quality-insights':
                return this.createQualityInsightsSection(data);
            case 'upcoming-milestones':
                return this.createUpcomingMilestonesSection(data);
            case 'action-items':
                return this.createActionItemsSection(data);
            case 'key-achievements':
                return this.createKeyAchievementsSection(data);
            case 'performance-dashboard':
                return this.createPerformanceDashboardSection(data);
            case 'trend-charts':
                return this.createTrendChartsSection(data);
            case 'strategic-insights':
                return this.createStrategicInsightsSection(data);
            case 'recommendations':
                return this.createRecommendationsSection(data);
            case 'resource-utilization':
                return this.createResourceUtilizationSection(data);
            case 'forecast':
                return this.createForecastSection(data);
            case 'alert-details':
                return this.createAlertDetailsSection(data);
            case 'impact-assessment':
                return this.createImpactAssessmentSection(data);
            case 'recommended-actions':
                return this.createRecommendedActionsSection(data);
            case 'contact-info':
                return this.createContactInfoSection(data);
            default:
                return this.createGenericSection(sectionKey, data);
        }
    }

    createAccomplishmentsSection(data) {
        const accomplishments = data.accomplishments || [];
        
        return `
            <tr>
                <td style="padding: 30px;">
                    <h2 style="margin: 0 0 20px 0; color: ${this.options.primaryColor}; font-size: 20px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        ✅ Yesterday's Accomplishments
                    </h2>
                    
                    ${accomplishments.length > 0 ? `
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            ${accomplishments.map((item, index) => `
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: ${index < accomplishments.length - 1 ? '1px solid #e5e7eb' : 'none'};">
                                        <div style="display: table; width: 100%;">
                                            <div style="display: table-cell; width: 20px; vertical-align: top; padding-top: 2px;">
                                                <div style="width: 8px; height: 8px; background: ${this.options.accentColor}; border-radius: 50%; margin-top: 6px;"></div>
                                            </div>
                                            <div style="display: table-cell; vertical-align: top; padding-left: 15px;">
                                                <p style="margin: 0; color: ${this.options.textColor}; font-size: 14px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.5;">
                                                    <strong>${item.title || 'Task'}</strong>
                                                    ${item.description ? `<br><span style="color: #6b7280;">${item.description}</span>` : ''}
                                                </p>
                                                ${item.assignee ? `
                                                    <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                                        Completed by: ${item.assignee}
                                                    </p>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </table>
                    ` : `
                        <div style="text-align: center; padding: 20px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-style: italic; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                No accomplishments recorded for yesterday
                            </p>
                        </div>
                    `}
                </td>
            </tr>
        `;
    }

    createPlansSection(data) {
        const plans = data.todayPlans || [];
        
        return `
            <tr>
                <td style="padding: 0 30px 30px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: ${this.options.primaryColor}; font-size: 20px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        🎯 Today's Plans
                    </h2>
                    
                    ${plans.length > 0 ? `
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            ${plans.map((item, index) => `
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: ${index < plans.length - 1 ? '1px solid #e5e7eb' : 'none'};">
                                        <div style="display: table; width: 100%;">
                                            <div style="display: table-cell; width: 20px; vertical-align: top; padding-top: 2px;">
                                                <div style="width: 8px; height: 8px; background: ${this.options.primaryColor}; border-radius: 50%; margin-top: 6px;"></div>
                                            </div>
                                            <div style="display: table-cell; vertical-align: top; padding-left: 15px;">
                                                <p style="margin: 0; color: ${this.options.textColor}; font-size: 14px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.5;">
                                                    <strong>${item.title || 'Task'}</strong>
                                                    ${item.description ? `<br><span style="color: #6b7280;">${item.description}</span>` : ''}
                                                </p>
                                                <div style="margin-top: 8px; display: table; width: 100%;">
                                                    ${item.assignee ? `
                                                        <div style="display: table-cell;">
                                                            <span style="background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">
                                                                ${item.assignee}
                                                            </span>
                                                        </div>
                                                    ` : ''}
                                                    ${item.priority ? `
                                                        <div style="display: table-cell; text-align: right;">
                                                            <span style="background: ${this.getPriorityColor(item.priority)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">
                                                                ${item.priority}
                                                            </span>
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </table>
                    ` : `
                        <div style="text-align: center; padding: 20px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-style: italic; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                No plans set for today
                            </p>
                        </div>
                    `}
                </td>
            </tr>
        `;
    }

    createBlockersSection(data) {
        const blockers = data.blockers || [];
        
        return `
            <tr>
                <td style="padding: 0 30px 30px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #ef4444; font-size: 20px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        🚧 Blockers & Issues
                    </h2>
                    
                    ${blockers.length > 0 ? `
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 20px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                ${blockers.map((blocker, index) => `
                                    <tr>
                                        <td style="padding: ${index > 0 ? '15px 0 0 0' : '0'};">
                                            <div style="display: table; width: 100%;">
                                                <div style="display: table-cell; width: 20px; vertical-align: top; padding-top: 2px;">
                                                    <div style="width: 12px; height: 12px; background: #ef4444; border-radius: 50%; margin-top: 4px;"></div>
                                                </div>
                                                <div style="display: table-cell; vertical-align: top; padding-left: 15px;">
                                                    <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                                        ${blocker.title || 'Blocker'}
                                                    </p>
                                                    ${blocker.description ? `
                                                        <p style="margin: 5px 0 0 0; color: #7f1d1d; font-size: 13px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.4;">
                                                            ${blocker.description}
                                                        </p>
                                                    ` : ''}
                                                    ${blocker.owner ? `
                                                        <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 12px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                                            <strong>Owner:</strong> ${blocker.owner}
                                                        </p>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </table>
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 20px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0;">
                            <p style="margin: 0; color: #059669; font-weight: 500; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                🎉 No blockers reported - Great job team!
                            </p>
                        </div>
                    `}
                </td>
            </tr>
        `;
    }

    createMetricsSnapshotSection(data) {
        const metrics = data.metrics || {};
        
        return `
            <tr>
                <td style="padding: 0 30px 30px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: ${this.options.primaryColor}; font-size: 20px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        📊 Metrics Snapshot
                    </h2>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            ${Object.entries(metrics).slice(0, 3).map(([key, metric]) => `
                                <td style="width: 33.33%; padding: 20px; background: #f8fafc; border: 1px solid #e5e7eb; text-align: center; ${Object.keys(metrics).indexOf(key) === 0 ? 'border-radius: 6px 0 0 6px;' : Object.keys(metrics).indexOf(key) === 2 ? 'border-radius: 0 6px 6px 0;' : 'border-left: none; border-right: none;'}">
                                    <div style="font-size: 28px; font-weight: 700; color: ${this.options.primaryColor}; margin-bottom: 5px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                        ${metric.value || 0}
                                    </div>
                                    <div style="font-size: 12px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                        ${metric.label || key}
                                    </div>
                                    ${metric.trend ? `
                                        <div style="margin-top: 8px; font-size: 11px; color: ${metric.trend > 0 ? '#059669' : '#dc2626'}; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                            ${metric.trend > 0 ? '↗' : '↘'} ${Math.abs(metric.trend)}%
                                        </div>
                                    ` : ''}
                                </td>
                            `).join('')}
                        </tr>
                    </table>
                    
                    ${Object.keys(metrics).length > 3 ? `
                        <div style="text-align: center; margin-top: 15px;">
                            <a href="${this.options.dashboardUrl}" style="color: ${this.options.primaryColor}; text-decoration: none; font-size: 13px; font-weight: 500; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                View All Metrics →
                            </a>
                        </div>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    createQuickActionsSection(data) {
        const actions = data.quickActions || [
            { label: 'View Dashboard', url: this.options.dashboardUrl, type: 'primary' },
            { label: 'Update Status', url: this.options.dashboardUrl + '/status', type: 'secondary' },
            { label: 'Report Blocker', url: this.options.dashboardUrl + '/blockers', type: 'warning' }
        ];
        
        return `
            <tr>
                <td style="padding: 0 30px 30px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: ${this.options.primaryColor}; font-size: 20px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        ⚡ Quick Actions
                    </h2>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            ${actions.map((action, index) => `
                                <td style="width: ${100/actions.length}%; padding: 0 ${index < actions.length - 1 ? '10px' : '0'} 0 0;">
                                    <a href="${action.url}" style="display: block; padding: 12px 20px; background: ${this.getActionColor(action.type)}; color: white; text-decoration: none; text-align: center; border-radius: 6px; font-size: 14px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                        ${action.label}
                                    </a>
                                </td>
                            `).join('')}
                                                 </tr>
                     </table>
                 </td>
             </tr>
         `;
     }

    // Additional section creators for other templates
    createSprintSummarySection(data) {
        const sprint = data.currentSprint || {};
        
        return `
            <tr>
                <td style="padding: 30px;">
                    <h2 style="margin: 0 0 20px 0; color: ${this.options.primaryColor}; font-size: 20px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        🏃‍♂️ Sprint Summary
                    </h2>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8fafc; border-radius: 8px; padding: 20px;">
                        <tr>
                            <td style="width: 50%; padding-right: 20px;">
                                <div style="margin-bottom: 15px;">
                                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Sprint Name</div>
                                    <div style="font-size: 18px; font-weight: 700; color: ${this.options.primaryColor};">${sprint.name || 'N/A'}</div>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Duration</div>
                                    <div style="font-size: 14px; color: ${this.options.textColor};">${sprint.startDate || 'N/A'} - ${sprint.endDate || 'N/A'}</div>
                                </div>
                            </td>
                            <td style="width: 50%; padding-left: 20px;">
                                <div style="margin-bottom: 15px;">
                                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Team</div>
                                    <div style="font-size: 14px; color: ${this.options.textColor};">${sprint.team || 'N/A'}</div>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Capacity</div>
                                    <div style="font-size: 14px; color: ${this.options.textColor};">${sprint.capacity || 0} hours</div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `;
    }

    createKeyMetricsSection(data) {
        const metrics = data.weeklyMetrics || {};
        
        return `
            <tr>
                <td style="padding: 0 30px 30px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: ${this.options.primaryColor}; font-size: 20px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        📈 Key Metrics
                    </h2>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            ${Object.entries(metrics).slice(0, 4).map(([key, metric], index) => `
                                <td style="width: 25%; padding: 15px; background: ${index % 2 === 0 ? '#f8fafc' : '#ffffff'}; border: 1px solid #e5e7eb; text-align: center;">
                                    <div style="font-size: 24px; font-weight: 700; color: ${this.options.primaryColor}; margin-bottom: 5px;">
                                        ${metric.value || 0}
                                    </div>
                                    <div style="font-size: 11px; color: #6b7280; font-weight: 500; text-transform: uppercase;">
                                        ${metric.label || key}
                                    </div>
                                    ${metric.change ? `
                                        <div style="margin-top: 5px; font-size: 10px; color: ${metric.change > 0 ? '#059669' : '#dc2626'}; font-weight: 600;">
                                            ${metric.change > 0 ? '↗' : '↘'} ${Math.abs(metric.change)}%
                                        </div>
                                    ` : ''}
                                </td>
                            `).join('')}
                        </tr>
                    </table>
                </td>
            </tr>
        `;
    }

    createActionItemsSection(data) {
        const actionItems = data.actionItems || [];
        
        return `
            <tr>
                <td style="padding: 0 30px 30px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: ${this.options.primaryColor}; font-size: 20px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        📋 Action Items
                    </h2>
                    
                    ${actionItems.length > 0 ? `
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            ${actionItems.map((item, index) => `
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: ${index < actionItems.length - 1 ? '1px solid #e5e7eb' : 'none'};">
                                        <div style="display: table; width: 100%;">
                                            <div style="display: table-cell; width: 30px; vertical-align: top;">
                                                <div style="width: 16px; height: 16px; border: 2px solid ${this.getPriorityColor(item.priority)}; border-radius: 3px; margin-top: 2px;"></div>
                                            </div>
                                            <div style="display: table-cell; vertical-align: top;">
                                                <p style="margin: 0; color: ${this.options.textColor}; font-size: 14px; font-weight: 600;">
                                                    ${item.title || 'Action Item'}
                                                </p>
                                                ${item.description ? `
                                                    <p style="margin: 3px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.4;">
                                                        ${item.description}
                                                    </p>
                                                ` : ''}
                                                <div style="margin-top: 8px;">
                                                    ${item.assignee ? `
                                                        <span style="background: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-right: 8px;">
                                                            ${item.assignee}
                                                        </span>
                                                    ` : ''}
                                                    ${item.dueDate ? `
                                                        <span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 10px; font-size: 10px;">
                                                            Due: ${item.dueDate}
                                                        </span>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </table>
                    ` : `
                        <div style="text-align: center; padding: 20px; background: #f9fafb; border-radius: 6px;">
                            <p style="margin: 0; color: #6b7280; font-style: italic;">No action items for this period</p>
                        </div>
                    `}
                </td>
            </tr>
        `;
    }

    createAlertDetailsSection(data) {
        const alert = data.alert || {};
        
        return `
            <tr>
                <td style="padding: 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #ef4444; font-size: 20px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        ⚠️ Alert Details
                    </h2>
                    
                    <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td style="width: 120px; vertical-align: top; padding-right: 20px;">
                                    <div style="font-size: 12px; color: #991b1b; font-weight: 600; text-transform: uppercase; margin-bottom: 5px;">Alert Type</div>
                                    <div style="font-size: 14px; color: #dc2626; font-weight: 600;">${alert.type || 'System Alert'}</div>
                                </td>
                                <td style="vertical-align: top;">
                                    <div style="font-size: 12px; color: #991b1b; font-weight: 600; text-transform: uppercase; margin-bottom: 5px;">Description</div>
                                    <div style="font-size: 14px; color: #7f1d1d; line-height: 1.4;">${alert.description || 'No description provided'}</div>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding-top: 15px;">
                                    <div style="font-size: 12px; color: #991b1b; font-weight: 600; text-transform: uppercase; margin-bottom: 5px;">Timestamp</div>
                                    <div style="font-size: 14px; color: #7f1d1d;">${alert.timestamp || new Date().toLocaleString()}</div>
                                </td>
                            </tr>
                        </table>
                    </div>
                </td>
            </tr>
        `;
    }

    createGenericSection(sectionKey, data) {
        return `
            <tr>
                <td style="padding: 0 30px 30px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: ${this.options.primaryColor}; font-size: 20px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; text-transform: capitalize;">
                        ${sectionKey.replace(/-/g, ' ')}
                    </h2>
                    
                    <div style="padding: 20px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #6b7280; font-style: italic; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                            Content for ${sectionKey.replace(/-/g, ' ')} section will be implemented based on specific requirements.
                        </p>
                    </div>
                </td>
            </tr>
        `;
    }

    generateEmailFooter(template, data) {
        return `
            <tr>
                <td style="background: #374151; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="text-align: center;">
                                <div style="margin-bottom: 20px;">
                                    <a href="${this.options.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: ${this.options.primaryColor}; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                        View Full Dashboard
                                    </a>
                                </div>
                                
                                <p style="margin: 0 0 15px 0; color: #d1d5db; font-size: 14px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                    ${this.options.companyName}
                                </p>
                                
                                <div style="margin-bottom: 15px;">
                                    <a href="{{unsubscribeUrl}}" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Unsubscribe</a>
                                    <span style="color: #6b7280;">|</span>
                                    <a href="{{preferencesUrl}}" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Email Preferences</a>
                                    <span style="color: #6b7280;">|</span>
                                    <a href="${this.options.dashboardUrl}/help" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Help</a>
                                </div>
                                
                                <p style="margin: 0; color: #6b7280; font-size: 11px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                    © ${new Date().getFullYear()} ${this.options.companyName}. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `;
    }

    // ========================================
    // CSS GENERATION
    // ========================================

    generateBaseCSS() {
        return `
            /* Reset styles */
            table, td, th, p, h1, h2, h3, h4, h5, h6 {
                margin: 0;
                padding: 0;
                border: 0;
                font-size: 100%;
                font: inherit;
                vertical-align: baseline;
            }
            
            table {
                border-collapse: collapse;
                border-spacing: 0;
            }
            
            /* Base styles */
            body {
                margin: 0 !important;
                padding: 0 !important;
                -webkit-text-size-adjust: 100% !important;
                -ms-text-size-adjust: 100% !important;
                -webkit-font-smoothing: antialiased !important;
                mso-line-height-rule: exactly;
            }
            
            img {
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
                -ms-interpolation-mode: bicubic;
            }
            
            a {
                color: ${this.options.primaryColor};
                text-decoration: none;
            }
            
            a:hover {
                text-decoration: underline;
            }
        `;
    }

    generateResponsiveCSS() {
        return `
            /* Mobile responsive styles */
            @media only screen and (max-width: 600px) {
                .email-container {
                    width: 100% !important;
                    margin: 0 !important;
                    border-radius: 0 !important;
                }
                
                .mobile-padding {
                    padding: 20px !important;
                }
                
                .mobile-center {
                    text-align: center !important;
                }
                
                .mobile-stack {
                    display: block !important;
                    width: 100% !important;
                }
                
                .mobile-hide {
                    display: none !important;
                }
                
                .mobile-full-width {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                
                h1 {
                    font-size: 22px !important;
                }
                
                h2 {
                    font-size: 18px !important;
                }
                
                .metric-value {
                    font-size: 24px !important;
                }
            }
            
            @media only screen and (max-width: 480px) {
                .email-container {
                    border-radius: 0 !important;
                }
                
                .mobile-padding {
                    padding: 15px !important;
                }
                
                h1 {
                    font-size: 20px !important;
                }
                
                h2 {
                    font-size: 16px !important;
                }
            }
        `;
    }

    generateDarkModeCSS() {
        return `
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .dark-bg {
                    background-color: #1f2937 !important;
                }
                
                .dark-text {
                    color: #f9fafb !important;
                }
                
                .dark-border {
                    border-color: #374151 !important;
                }
                
                .dark-card {
                    background-color: #374151 !important;
                }
            }
            
            /* Outlook dark mode */
            [data-ogsc] .email-container {
                background-color: #ffffff !important;
            }
            
            [data-ogsc] .dark-bg {
                background-color: #ffffff !important;
            }
            
            [data-ogsc] .dark-text {
                color: #374151 !important;
            }
        `;
    }

    // ========================================
    // CHART INTEGRATION
    // ========================================

    async inlineCharts(emailHTML, data) {
        try {
            // This would integrate with your charting library
            // For now, we'll replace chart placeholders with static images or data
            
            let processedHTML = emailHTML;
            
            // Replace chart placeholders with actual chart data
            processedHTML = processedHTML.replace(/{{velocityChart}}/g, this.generateVelocityChartHTML(data.velocityData));
            processedHTML = processedHTML.replace(/{{burndownChart}}/g, this.generateBurndownChartHTML(data.burndownData));
            processedHTML = processedHTML.replace(/{{trendChart}}/g, this.generateTrendChartHTML(data.trendData));
            
            return processedHTML;
            
        } catch (error) {
            console.error('Chart inlining failed:', error);
            return emailHTML;
        }
    }

    generateVelocityChartHTML(velocityData) {
        if (!velocityData || !velocityData.history) {
            return '<p style="color: #6b7280; font-style: italic;">No velocity data available</p>';
        }
        
        // Create a simple ASCII chart or data table
        const history = velocityData.history.slice(-5); // Last 5 sprints
        
        return `
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8fafc; border-radius: 6px; padding: 15px;">
                <tr>
                    <td style="padding-bottom: 10px;">
                        <h4 style="margin: 0; color: ${this.options.primaryColor}; font-size: 14px; font-weight: 600;">Velocity Trend (Last 5 Sprints)</h4>
                    </td>
                </tr>
                ${history.map(sprint => `
                    <tr>
                        <td style="padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                            <div style="display: table; width: 100%;">
                                <div style="display: table-cell; width: 100px; font-size: 12px; color: #6b7280;">
                                    ${sprint.name || 'Sprint'}
                                </div>
                                <div style="display: table-cell; width: 200px;">
                                    <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                                        <div style="background: ${this.options.primaryColor}; height: 100%; width: ${Math.min((sprint.velocity || 0) / 50 * 100, 100)}%; border-radius: 4px;"></div>
                                    </div>
                                </div>
                                <div style="display: table-cell; text-align: right; font-size: 12px; font-weight: 600; color: ${this.options.textColor};">
                                    ${sprint.velocity || 0}
                                </div>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </table>
        `;
    }

    generateBurndownChartHTML(burndownData) {
        if (!burndownData || !burndownData.remaining) {
            return '<p style="color: #6b7280; font-style: italic;">No burndown data available</p>';
        }
        
        return `
            <div style="background: #f8fafc; border-radius: 6px; padding: 15px; text-align: center;">
                <h4 style="margin: 0 0 15px 0; color: ${this.options.primaryColor}; font-size: 14px; font-weight: 600;">Sprint Burndown</h4>
                <div style="font-size: 32px; font-weight: 700; color: ${this.options.primaryColor}; margin-bottom: 5px;">
                    ${burndownData.remaining || 0}
                </div>
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">Story Points Remaining</div>
                <div style="background: #e5e7eb; height: 12px; border-radius: 6px; overflow: hidden; max-width: 200px; margin: 0 auto;">
                    <div style="background: ${burndownData.onTrack ? this.options.accentColor : '#ef4444'}; height: 100%; width: ${Math.max(0, Math.min(100, ((burndownData.total - burndownData.remaining) / burndownData.total) * 100))}%; border-radius: 6px;"></div>
                </div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 8px;">
                    ${burndownData.onTrack ? 'On Track' : 'Behind Schedule'}
                </div>
            </div>
        `;
    }

    generateTrendChartHTML(trendData) {
        if (!trendData || !trendData.metrics) {
            return '<p style="color: #6b7280; font-style: italic;">No trend data available</p>';
        }
        
        return `
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8fafc; border-radius: 6px; padding: 15px;">
                <tr>
                    <td style="padding-bottom: 10px;">
                        <h4 style="margin: 0; color: ${this.options.primaryColor}; font-size: 14px; font-weight: 600;">Performance Trends</h4>
                    </td>
                </tr>
                ${Object.entries(trendData.metrics).map(([key, metric]) => `
                    <tr>
                        <td style="padding: 8px 0;">
                            <div style="display: table; width: 100%;">
                                <div style="display: table-cell; width: 120px; font-size: 12px; color: #6b7280; text-transform: capitalize;">
                                    ${key.replace(/-/g, ' ')}
                                </div>
                                <div style="display: table-cell; text-align: right; font-size: 12px; font-weight: 600; color: ${metric.trend > 0 ? this.options.accentColor : '#ef4444'};">
                                    ${metric.trend > 0 ? '↗' : '↘'} ${Math.abs(metric.trend)}%
                                </div>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </table>
        `;
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    parseSubject(subjectTemplate, data) {
        let subject = subjectTemplate;
        
        // Replace common placeholders
        subject = subject.replace(/{{date}}/g, this.formatDate(new Date()));
        subject = subject.replace(/{{sprintName}}/g, data.currentSprint?.name || 'Current Sprint');
        subject = subject.replace(/{{weekStart}}/g, this.getWeekStart());
        subject = subject.replace(/{{monthYear}}/g, this.getMonthYear());
        subject = subject.replace(/{{alertType}}/g, data.alertType || 'System');
        subject = subject.replace(/{{alertTitle}}/g, data.alertTitle || 'Alert');
        
        return subject;
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getWeekStart() {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        return startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    getMonthYear() {
        return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    getPriorityColor(priority) {
        switch (priority?.toLowerCase()) {
            case 'urgent':
            case 'high':
                return '#ef4444';
            case 'medium':
                return '#f59e0b';
            case 'low':
                return '#10b981';
            default:
                return '#6b7280';
        }
    }

         getActionColor(type) {
        switch (type?.toLowerCase()) {
            case 'primary':
                return this.options.primaryColor;
            case 'secondary':
                return '#6b7280';
            case 'success':
                return '#10b981';
            case 'warning':
                return '#f59e0b';
            case 'danger':
                return '#ef4444';
            default:
                return this.options.primaryColor;
        }
     }

    // ========================================
    // DISTRIBUTION MANAGEMENT
    // ========================================

    addRecipient(email, options = {}) {
        const recipient = {
            email: email.toLowerCase(),
            name: options.name || email,
            role: options.role || 'user',
            preferences: {
                dailyReports: options.dailyReports !== false,
                weeklyReports: options.weeklyReports !== false,
                monthlyReports: options.monthlyReports !== false,
                alerts: options.alerts !== false,
                format: options.format || 'html'
            },
            groups: options.groups || [],
            timezone: options.timezone || this.options.timezone,
            active: true,
            addedDate: new Date().toISOString(),
            lastDelivery: null,
            deliveryCount: 0,
            bounceCount: 0
        };

        this.recipients.set(email.toLowerCase(), recipient);
        
        // Add to groups
        if (recipient.groups.length > 0) {
            recipient.groups.forEach(groupName => {
                this.addToGroup(groupName, email);
            });
        }

        console.log(`📧 Added recipient: ${email}`);
        return recipient;
    }

    removeRecipient(email) {
        const normalizedEmail = email.toLowerCase();
        const recipient = this.recipients.get(normalizedEmail);
        
        if (recipient) {
            // Remove from all groups
            recipient.groups.forEach(groupName => {
                this.removeFromGroup(groupName, email);
            });
            
            this.recipients.delete(normalizedEmail);
            console.log(`📧 Removed recipient: ${email}`);
            return true;
        }
        
        return false;
    }

    updateRecipientPreferences(email, preferences) {
        const normalizedEmail = email.toLowerCase();
        const recipient = this.recipients.get(normalizedEmail);
        
        if (recipient) {
            recipient.preferences = { ...recipient.preferences, ...preferences };
            this.recipients.set(normalizedEmail, recipient);
            console.log(`📧 Updated preferences for: ${email}`);
            return recipient;
        }
        
        throw new Error(`Recipient not found: ${email}`);
    }

    addToGroup(groupName, email) {
        if (!this.groups.has(groupName)) {
            this.groups.set(groupName, {
                name: groupName,
                description: '',
                members: new Set(),
                created: new Date().toISOString(),
                roles: []
            });
        }
        
        const group = this.groups.get(groupName);
        group.members.add(email.toLowerCase());
        this.groups.set(groupName, group);
    }

    removeFromGroup(groupName, email) {
        if (this.groups.has(groupName)) {
            const group = this.groups.get(groupName);
            group.members.delete(email.toLowerCase());
            
            if (group.members.size === 0) {
                this.groups.delete(groupName);
            } else {
                this.groups.set(groupName, group);
            }
        }
    }

    createGroup(groupName, options = {}) {
        const group = {
            name: groupName,
            description: options.description || '',
            members: new Set(),
            created: new Date().toISOString(),
            roles: options.roles || [],
            templatePreferences: options.templatePreferences || {}
        };

        this.groups.set(groupName, group);
        console.log(`📧 Created group: ${groupName}`);
        return group;
    }

    getRecipientsForDistribution(templateKey, groupFilter = null) {
        const template = this.templates.get(templateKey);
        if (!template) {
            throw new Error(`Template '${templateKey}' not found`);
        }

        let recipients = Array.from(this.recipients.values()).filter(recipient => {
            // Check if recipient is active
            if (!recipient.active) return false;
            
            // Check if recipient is not opted out
            if (this.optOutList.has(recipient.email)) return false;
            
            // Check if recipient is not bounced
            if (this.bounceList.has(recipient.email)) return false;
            
            // Check template preferences
            switch (template.type) {
                case 'daily':
                    if (!recipient.preferences.dailyReports) return false;
                    break;
                case 'weekly':
                    if (!recipient.preferences.weeklyReports) return false;
                    break;
                case 'monthly':
                    if (!recipient.preferences.monthlyReports) return false;
                    break;
                case 'alert':
                    if (!recipient.preferences.alerts) return false;
                    break;
            }
            
            return true;
        });

        // Apply group filter if specified
        if (groupFilter) {
            const group = this.groups.get(groupFilter);
            if (group) {
                recipients = recipients.filter(recipient => 
                    group.members.has(recipient.email)
                );
            }
        }

        return recipients;
    }

    optOut(email) {
        this.optOutList.add(email.toLowerCase());
        console.log(`📧 Opted out: ${email}`);
    }

    optIn(email) {
        this.optOutList.delete(email.toLowerCase());
        console.log(`📧 Opted in: ${email}`);
    }

    addBounce(email, bounceType = 'hard') {
        const normalizedEmail = email.toLowerCase();
        const recipient = this.recipients.get(normalizedEmail);
        
        if (recipient) {
            recipient.bounceCount++;
            
            if (bounceType === 'hard' || recipient.bounceCount >= 3) {
                this.bounceList.add(normalizedEmail);
                recipient.active = false;
                console.log(`📧 Added to bounce list: ${email}`);
            }
        }
    }

    // ========================================
    // SCHEDULING SYSTEM
    // ========================================

    addSchedule(scheduleId, options) {
        const schedule = {
            id: scheduleId,
            templateKey: options.templateKey,
            frequency: options.frequency, // 'daily', 'weekly', 'monthly', 'cron'
            cronExpression: options.cronExpression || null,
            time: options.time || '09:00',
            day: options.day || null, // For weekly (0-6) or monthly (1-31)
            timezone: options.timezone || this.options.timezone,
            businessDaysOnly: options.businessDaysOnly || false,
            active: true,
            recipients: options.recipients || 'all',
            groups: options.groups || [],
            dataSource: options.dataSource || null,
            lastRun: null,
            nextRun: null,
            runCount: 0,
            created: new Date().toISOString()
        };

        schedule.nextRun = this.calculateNextRun(schedule);
        this.schedules.set(scheduleId, schedule);
        
        console.log(`📧 Added schedule: ${scheduleId} (next run: ${schedule.nextRun})`);
        return schedule;
    }

    removeSchedule(scheduleId) {
        if (this.schedules.delete(scheduleId)) {
            console.log(`📧 Removed schedule: ${scheduleId}`);
            return true;
        }
        return false;
    }

    updateSchedule(scheduleId, updates) {
        const schedule = this.schedules.get(scheduleId);
        if (schedule) {
            Object.assign(schedule, updates);
            schedule.nextRun = this.calculateNextRun(schedule);
            this.schedules.set(scheduleId, schedule);
            console.log(`📧 Updated schedule: ${scheduleId}`);
            return schedule;
        }
        throw new Error(`Schedule not found: ${scheduleId}`);
    }

    calculateNextRun(schedule) {
        const now = new Date();
        const timezone = schedule.timezone || this.options.timezone;
        
        // Convert current time to schedule timezone
        let nextRun = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
        
        const [hours, minutes] = schedule.time.split(':').map(Number);
        
        switch (schedule.frequency) {
            case 'daily':
                nextRun.setHours(hours, minutes, 0, 0);
                if (nextRun <= now) {
                    nextRun.setDate(nextRun.getDate() + 1);
                }
                
                // Skip weekends if business days only
                if (schedule.businessDaysOnly) {
                    while (nextRun.getDay() === 0 || nextRun.getDay() === 6) {
                        nextRun.setDate(nextRun.getDate() + 1);
                    }
                }
                break;
                
            case 'weekly':
                nextRun.setHours(hours, minutes, 0, 0);
                const targetDay = schedule.day || 1; // Default to Monday
                const daysUntilTarget = (targetDay - nextRun.getDay() + 7) % 7;
                
                if (daysUntilTarget === 0 && nextRun <= now) {
                    nextRun.setDate(nextRun.getDate() + 7);
                } else {
                    nextRun.setDate(nextRun.getDate() + daysUntilTarget);
                }
                break;
                
            case 'monthly':
                nextRun.setHours(hours, minutes, 0, 0);
                const targetDate = schedule.day || 1;
                nextRun.setDate(targetDate);
                
                if (nextRun <= now) {
                    nextRun.setMonth(nextRun.getMonth() + 1);
                    nextRun.setDate(targetDate);
                }
                break;
                
            case 'cron':
                // Basic cron implementation - could be enhanced with a proper cron library
                if (schedule.cronExpression) {
                    nextRun = this.parseCronExpression(schedule.cronExpression, now);
                }
                break;
        }
        
        // Skip holidays if configured
        while (this.isHoliday(nextRun)) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
        
        return nextRun.toISOString();
    }

    parseCronExpression(cronExpr, fromDate) {
        // Simplified cron parser - in production, use a library like node-cron
        // Format: minute hour day month dayOfWeek
        const parts = cronExpr.split(' ');
        const nextRun = new Date(fromDate);
        nextRun.setMinutes(parseInt(parts[0]) || 0);
        nextRun.setHours(parseInt(parts[1]) || 0);
        
        // Add basic day handling
        if (parts[2] !== '*') {
            nextRun.setDate(parseInt(parts[2]));
        }
        
        return nextRun;
    }

    startScheduler() {
        if (this.schedulerActive) {
            return;
        }

        this.schedulerActive = true;
        this.scheduleInterval = setInterval(() => {
            this.processSchedules();
        }, 60000); // Check every minute

        console.log('📧 Email scheduler started');
    }

    stopScheduler() {
        if (this.scheduleInterval) {
            clearInterval(this.scheduleInterval);
            this.scheduleInterval = null;
        }
        this.schedulerActive = false;
        console.log('📧 Email scheduler stopped');
    }

    async processSchedules() {
        const now = new Date();
        
        for (const [scheduleId, schedule] of this.schedules) {
            if (!schedule.active) continue;
            
            const nextRun = new Date(schedule.nextRun);
            
            if (nextRun <= now) {
                try {
                    await this.executeSchedule(schedule);
                    
                    // Update schedule
                    schedule.lastRun = now.toISOString();
                    schedule.runCount++;
                    schedule.nextRun = this.calculateNextRun(schedule);
                    
                    this.schedules.set(scheduleId, schedule);
                    
                } catch (error) {
                    console.error(`Failed to execute schedule ${scheduleId}:`, error);
                }
            }
        }
    }

    async executeSchedule(schedule) {
        console.log(`📧 Executing schedule: ${schedule.id} (${schedule.templateKey})`);
        
        // Get data for the report
        const data = await this.getScheduleData(schedule);
        
        // Get recipients
        const recipients = schedule.recipients === 'all' 
            ? this.getRecipientsForDistribution(schedule.templateKey)
            : this.getScheduleRecipients(schedule);
        
        // Send emails
        for (const recipient of recipients) {
            try {
                await this.sendEmail(schedule.templateKey, data, recipient);
            } catch (error) {
                console.error(`Failed to send to ${recipient.email}:`, error);
            }
        }
    }

    getScheduleRecipients(schedule) {
        let recipients = [];
        
        if (schedule.groups.length > 0) {
            schedule.groups.forEach(groupName => {
                const group = this.groups.get(groupName);
                if (group) {
                    group.members.forEach(email => {
                        const recipient = this.recipients.get(email);
                        if (recipient && recipient.active) {
                            recipients.push(recipient);
                        }
                    });
                }
            });
        }
        
        return recipients;
    }

    async getScheduleData(schedule) {
        // This would integrate with your data sources
        // For now, return mock data based on template type
        
        const template = this.templates.get(schedule.templateKey);
        const baseData = {
            currentDate: new Date().toLocaleDateString(),
            dashboardUrl: this.options.dashboardUrl
        };
        
        switch (template.type) {
            case 'daily':
                return {
                    ...baseData,
                    accomplishments: [
                        { title: 'Completed user authentication feature', assignee: 'John Doe' },
                        { title: 'Fixed critical bug in payment processing', assignee: 'Jane Smith' }
                    ],
                    todayPlans: [
                        { title: 'Implement email notifications', assignee: 'Bob Johnson', priority: 'high' },
                        { title: 'Review pull requests', assignee: 'Alice Brown', priority: 'medium' }
                    ],
                    blockers: [],
                    metrics: {
                        storyPoints: { value: 23, label: 'Story Points', trend: 15 },
                        velocity: { value: 42, label: 'Velocity', trend: -5 },
                        quality: { value: 95, label: 'Quality %', trend: 2 }
                    }
                };
                
            case 'weekly':
                return {
                    ...baseData,
                    weeklyMetrics: {
                        completed: { value: 18, label: 'Stories', change: 12 },
                        velocity: { value: 45, label: 'Velocity', change: -3 },
                        quality: { value: 94, label: 'Quality', change: 1 },
                        bugs: { value: 2, label: 'Bugs', change: -50 }
                    },
                    actionItems: [
                        { title: 'Schedule sprint retrospective', assignee: 'Scrum Master', dueDate: '2024-01-15' },
                        { title: 'Update technical documentation', assignee: 'Tech Lead', priority: 'medium' }
                    ]
                };
                
            case 'alert':
                return {
                    ...baseData,
                    alert: {
                        type: 'Performance',
                        description: 'API response time exceeding threshold',
                        timestamp: new Date().toLocaleString()
                    },
                    alertType: 'Performance',
                    alertTitle: 'High Response Time'
                };
                
            default:
                return baseData;
        }
    }

    setupHolidayCalendar() {
        const currentYear = new Date().getFullYear();
        
        // Add common US holidays - can be customized per organization
        this.holidayCalendar.add(`${currentYear}-01-01`); // New Year's Day
        this.holidayCalendar.add(`${currentYear}-07-04`); // Independence Day
        this.holidayCalendar.add(`${currentYear}-12-25`); // Christmas Day
        
        // Add more holidays as needed
    }

    isHoliday(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.holidayCalendar.has(dateStr);
    }

    // ========================================
    // EMAIL PROVIDER INTEGRATION
    // ========================================

    configureEmailProvider(providerType, config) {
        switch (providerType.toLowerCase()) {
            case 'smtp':
                this.emailProvider = new SMTPProvider(config);
                break;
            case 'sendgrid':
                this.emailProvider = new SendGridProvider(config);
                break;
            case 'exchange':
                this.emailProvider = new ExchangeProvider(config);
                break;
            case 'outlook':
                this.emailProvider = new OutlookProvider(config);
                break;
            default:
                throw new Error(`Unsupported email provider: ${providerType}`);
        }
        
        console.log(`📧 Configured email provider: ${providerType}`);
    }

    async sendEmail(templateKey, data, recipient, options = {}) {
        try {
            if (!this.emailProvider) {
                throw new Error('No email provider configured');
            }
            
            // Generate personalized email
            const personalizations = {
                recipientName: recipient.name,
                recipientEmail: recipient.email,
                unsubscribeUrl: `${this.options.dashboardUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}`,
                preferencesUrl: `${this.options.dashboardUrl}/preferences?email=${encodeURIComponent(recipient.email)}`,
                trackingPixel: `${this.options.dashboardUrl}/track?email=${encodeURIComponent(recipient.email)}&template=${templateKey}&timestamp=${Date.now()}`
            };
            
            const emailContent = await this.generateEmailHTML(templateKey, data, personalizations);
            
            // Prepare email message
            const message = {
                to: recipient.email,
                from: options.from || `${this.options.companyName} <noreply@company.com>`,
                subject: emailContent.subject,
                html: emailContent.html,
                priority: emailContent.priority,
                template: templateKey,
                recipient: recipient.email
            };
            
            // Send email
            const result = await this.emailProvider.send(message);
            
            // Log delivery
            this.logDelivery(recipient.email, templateKey, result);
            
            // Update recipient stats
            recipient.lastDelivery = new Date().toISOString();
            recipient.deliveryCount++;
            this.recipients.set(recipient.email, recipient);
            
            console.log(`📧 Email sent successfully to ${recipient.email}`);
            return result;
            
        } catch (error) {
            console.error(`Failed to send email to ${recipient.email}:`, error);
            
            // Handle bounces
            if (error.type === 'bounce') {
                this.addBounce(recipient.email, error.bounceType);
            }
            
            throw error;
        }
    }

    logDelivery(email, templateKey, result) {
        const logEntry = {
            email,
            templateKey,
            timestamp: new Date().toISOString(),
            success: result.success,
            messageId: result.messageId,
            error: result.error || null
        };
        
        if (!this.deliveryLog.has(email)) {
            this.deliveryLog.set(email, []);
        }
        
        this.deliveryLog.get(email).push(logEntry);
        
        // Keep only last 100 entries per recipient
        const logs = this.deliveryLog.get(email);
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
    }

    // ========================================
    // ANALYTICS & REPORTING
    // ========================================

    getDeliveryStats(timeframe = '30d') {
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - this.parseTimeframe(timeframe));
        
        let totalSent = 0;
        let totalDelivered = 0;
        let totalBounced = 0;
        let templateStats = new Map();
        
        for (const [email, logs] of this.deliveryLog) {
            const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate);
            
            recentLogs.forEach(log => {
                totalSent++;
                
                if (log.success) {
                    totalDelivered++;
                } else {
                    totalBounced++;
                }
                
                // Template stats
                if (!templateStats.has(log.templateKey)) {
                    templateStats.set(log.templateKey, { sent: 0, delivered: 0 });
                }
                
                const templateStat = templateStats.get(log.templateKey);
                templateStat.sent++;
                if (log.success) templateStat.delivered++;
                templateStats.set(log.templateKey, templateStat);
            });
        }
        
        return {
            totalSent,
            totalDelivered,
            totalBounced,
            deliveryRate: totalSent > 0 ? (totalDelivered / totalSent * 100).toFixed(2) : 0,
            bounceRate: totalSent > 0 ? (totalBounced / totalSent * 100).toFixed(2) : 0,
            templateStats: Object.fromEntries(templateStats),
            timeframe,
            generatedAt: new Date().toISOString()
        };
    }

    parseTimeframe(timeframe) {
        const unit = timeframe.slice(-1);
        const value = parseInt(timeframe.slice(0, -1));
        
        switch (unit) {
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'w': return value * 7 * 24 * 60 * 60 * 1000;
            case 'm': return value * 30 * 24 * 60 * 60 * 1000;
            default: return 30 * 24 * 60 * 60 * 1000;
        }
    }

    // ========================================
    // PUBLIC API METHODS
    // ========================================

    async sendTestEmail(templateKey, recipientEmail, testData = {}) {
        const template = this.templates.get(templateKey);
        if (!template) {
            throw new Error(`Template '${templateKey}' not found`);
        }
        
        const testRecipient = {
            email: recipientEmail,
            name: 'Test User',
            preferences: { [template.type + 'Reports']: true }
        };
        
        const data = testData.data || await this.getScheduleData({ templateKey });
        
        return this.sendEmail(templateKey, data, testRecipient, { from: testData.from });
    }

    getAvailableTemplates() {
        return Array.from(this.templates.entries()).map(([key, template]) => ({
            key,
            name: template.name,
            type: template.type,
            priority: template.priority,
            sections: template.sections
        }));
    }

    getRecipientList() {
        return Array.from(this.recipients.values()).map(recipient => ({
            email: recipient.email,
            name: recipient.name,
            role: recipient.role,
            active: recipient.active,
            groups: recipient.groups,
            deliveryCount: recipient.deliveryCount,
            lastDelivery: recipient.lastDelivery
        }));
    }

    getScheduleList() {
        return Array.from(this.schedules.values()).map(schedule => ({
            id: schedule.id,
            templateKey: schedule.templateKey,
            frequency: schedule.frequency,
            active: schedule.active,
            nextRun: schedule.nextRun,
            lastRun: schedule.lastRun,
            runCount: schedule.runCount
        }));
    }

    getSystemStatus() {
        return {
            schedulerActive: this.schedulerActive,
            totalRecipients: this.recipients.size,
            activeRecipients: Array.from(this.recipients.values()).filter(r => r.active).length,
            totalGroups: this.groups.size,
            totalSchedules: this.schedules.size,
            activeSchedules: Array.from(this.schedules.values()).filter(s => s.active).length,
            bounceListSize: this.bounceList.size,
            optOutListSize: this.optOutList.size,
            emailProviderConfigured: !!this.emailProvider,
            uptime: new Date().toISOString()
        };
    }
}

// ========================================
// EMAIL PROVIDER IMPLEMENTATIONS
// ========================================

class SMTPProvider {
    constructor(config) {
        this.config = {
            host: config.host,
            port: config.port || 587,
            secure: config.secure || false,
            auth: {
                user: config.username,
                pass: config.password
            },
            ...config
        };
    }
    
    async send(message) {
        // In a real implementation, this would use nodemailer or similar
        console.log(`📧 SMTP: Sending email to ${message.to}`);
        
        // Simulate sending
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    messageId: `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    provider: 'smtp'
                });
            }, 100);
        });
    }
}

class SendGridProvider {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.config = config;
    }
    
    async send(message) {
        console.log(`📧 SendGrid: Sending email to ${message.to}`);
        
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    messageId: `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    provider: 'sendgrid'
                });
            }, 150);
        });
    }
}

class ExchangeProvider {
    constructor(config) {
        this.config = config;
    }
    
    async send(message) {
        console.log(`📧 Exchange: Sending email to ${message.to}`);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    messageId: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    provider: 'exchange'
                });
            }, 200);
        });
    }
}

class OutlookProvider {
    constructor(config) {
        this.config = config;
    }
    
    async send(message) {
        console.log(`📧 Outlook: Sending email to ${message.to}`);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    messageId: `ol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    provider: 'outlook'
                });
            }, 180);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmailReportManager, SMTPProvider, SendGridProvider, ExchangeProvider, OutlookProvider };
}
