/**
 * Comprehensive Test Metrics Engine
 * Implements EXACT test case categorization system with 13 categories
 * Handles test case linking analysis and execution metrics
 */

class TestMetricsEngine {
    constructor() {
        // EXACT test categories from design document
        this.testCategories = {
            'manual-only': {
                name: 'Manual Only',
                icon: '👨‍💻',
                description: 'Tests that can only be executed manually',
                automatable: false
            },
            'automated': {
                name: 'Automated',
                icon: '🤖',
                description: 'Fully automated test cases',
                automatable: true
            },
            'semi-automated': {
                name: 'Semi-Automated',
                icon: '⚙️',
                description: 'Partially automated tests requiring manual intervention',
                automatable: true
            },
            'regression': {
                name: 'Regression',
                icon: '🔄',
                description: 'Tests verifying existing functionality',
                automatable: true
            },
            'smoke': {
                name: 'Smoke',
                icon: '💨',
                description: 'Basic functionality verification tests',
                automatable: true
            },
            'integration': {
                name: 'Integration',
                icon: '🔗',
                description: 'Tests verifying component integration',
                automatable: true
            },
            'unit': {
                name: 'Unit',
                icon: '🧪',
                description: 'Individual component/function tests',
                automatable: true
            },
            'e2e': {
                name: 'End-to-End',
                icon: '🎯',
                description: 'Complete user journey tests',
                automatable: true
            },
            'api': {
                name: 'API',
                icon: '🌐',
                description: 'API and service layer tests',
                automatable: true
            },
            'performance': {
                name: 'Performance',
                icon: '⚡',
                description: 'Performance and load testing',
                automatable: true
            },
            'security': {
                name: 'Security',
                icon: '🛡️',
                description: 'Security and vulnerability tests',
                automatable: true
            },
            'uat': {
                name: 'UAT',
                icon: '✅',
                description: 'User Acceptance Testing',
                automatable: false
            },
            'accessibility': {
                name: 'Accessibility',
                icon: '♿',
                description: 'Accessibility compliance tests',
                automatable: true
            }
        };

        this.testCases = [];
        this.testResults = [];
        this.workItems = [];
        this.linkingAnalysis = {};
        this.executionMetrics = {};
        this.coverageAnalysis = {};
        
        this.initialize();
    }

    initialize() {
        console.log('🧪 Initializing Test Metrics Engine...');
        console.log(`📊 Configured ${Object.keys(this.testCategories).length} test categories`);
        console.log('✅ Test Metrics Engine initialized');
    }

    // Core data loading methods
    async loadTestData() {
        if (!window.configManager || !window.configManager.isConfigured()) {
            console.warn('Configuration not ready for test data loading');
            return;
        }

        try {
            const config = window.configManager.getConnectionDetails();
            const boards = window.configManager.getSelectedBoards();
            const iteration = window.configManager.getSelectedIteration();

            console.log('🔄 Loading comprehensive test data...');

            // Load test data in parallel
            await Promise.all([
                this.loadTestCases(config, boards),
                this.loadWorkItems(config, boards, iteration),
                this.loadTestResults(config),
                this.loadTestPlans(config)
            ]);

            // Perform analysis
            this.analyzeTestCaseLinks();
            this.categorizeAllTests();
            this.calculateExecutionMetrics();
            this.calculateTestCoverage();

            console.log('✅ Test data loading and analysis complete');
            
        } catch (error) {
            console.error('Failed to load test data:', error);
            throw error;
        }
    }

    async loadTestCases(config, boards) {
        const { org, project, patToken } = config;
        
        try {
            // Get all test plans
            const testPlansResponse = await this.makeADORequest(
                `/${org}/${project}/_apis/test/plans`, 
                this.getAuthHeaders(patToken)
            );

            if (!testPlansResponse.ok) {
                throw new Error(`Failed to load test plans: ${testPlansResponse.status}`);
            }

            const testPlansData = await testPlansResponse.json();
            this.testCases = [];

            // Load test cases from each plan
            for (const plan of testPlansData.value) {
                await this.loadTestCasesFromPlan(config, plan.id);
            }

            console.log(`📋 Loaded ${this.testCases.length} test cases`);
            
        } catch (error) {
            console.error('Failed to load test cases:', error);
            throw error;
        }
    }

    async loadTestCasesFromPlan(config, planId) {
        const { org, project, patToken } = config;

        try {
            // Get test suites for the plan
            const suitesResponse = await this.makeADORequest(
                `/${org}/${project}/_apis/test/plans/${planId}/suites`,
                this.getAuthHeaders(patToken)
            );

            if (suitesResponse.ok) {
                const suitesData = await suitesResponse.json();
                
                for (const suite of suitesData.value) {
                    await this.loadTestCasesFromSuite(config, suite.id);
                }
            }
        } catch (error) {
            console.warn(`Failed to load test cases from plan ${planId}:`, error);
        }
    }

    async loadTestCasesFromSuite(config, suiteId) {
        const { org, project, patToken } = config;

        try {
            // Get test cases in suite
            const testCasesResponse = await this.makeADORequest(
                `/${org}/${project}/_apis/test/suites/${suiteId}/testcases`,
                this.getAuthHeaders(patToken)
            );

            if (testCasesResponse.ok) {
                const testCasesData = await testCasesResponse.json();
                
                // Get detailed test case information
                const testCaseIds = testCasesData.value.map(tc => tc.testCase.id);
                
                if (testCaseIds.length > 0) {
                    await this.loadTestCaseDetails(config, testCaseIds, suiteId);
                }
            }
        } catch (error) {
            console.warn(`Failed to load test cases from suite ${suiteId}:`, error);
        }
    }

    async loadTestCaseDetails(config, testCaseIds, suiteId) {
        const { org, project, patToken } = config;

        try {
            // Get work item details for test cases
            const workItemsResponse = await this.makeADORequest(
                `/${org}/${project}/_apis/wit/workitems?ids=${testCaseIds.join(',')}&$expand=all`,
                this.getAuthHeaders(patToken)
            );

            if (workItemsResponse.ok) {
                const workItemsData = await workItemsResponse.json();
                
                workItemsData.value.forEach(workItem => {
                    const testCase = {
                        id: workItem.id,
                        title: workItem.fields['System.Title'],
                        state: workItem.fields['System.State'],
                        tags: workItem.fields['System.Tags'] || '',
                        priority: workItem.fields['Microsoft.VSTS.Common.Priority'] || 2,
                        createdDate: workItem.fields['System.CreatedDate'],
                        changedDate: workItem.fields['System.ChangedDate'],
                        assignedTo: workItem.fields['System.AssignedTo']?.displayName || 'Unassigned',
                        automationStatus: workItem.fields['Microsoft.VSTS.TCM.AutomationStatus'] || 'Not Automated',
                        suiteId: suiteId,
                        links: workItem.relations || [],
                        steps: workItem.fields['Microsoft.VSTS.TCM.Steps'] || '',
                        categories: this.extractCategoriesFromTags(workItem.fields['System.Tags'] || ''),
                        linkedWorkItems: this.extractLinkedWorkItems(workItem.relations || [])
                    };
                    
                    this.testCases.push(testCase);
                });
            }
        } catch (error) {
            console.warn(`Failed to load test case details:`, error);
        }
    }

    async loadWorkItems(config, boards, iteration) {
        const { org, project, patToken } = config;
        const resources = window.configManager.getSelectedResources();
        
        try {
            // Build WIQL query for work items
            const wiql = this.buildWorkItemQuery(boards, iteration, resources);
            
            const queryResponse = await this.makeADORequest(
                `/${org}/${project}/_apis/wit/wiql`,
                {
                    ...this.getAuthHeaders(patToken),
                    method: 'POST',
                    body: JSON.stringify({ query: wiql })
                }
            );

            if (queryResponse.ok) {
                const queryData = await queryResponse.json();
                const workItemIds = queryData.workItems.map(wi => wi.id);
                
                if (workItemIds.length > 0) {
                    await this.loadWorkItemDetails(config, workItemIds);
                }
            }

            console.log(`📝 Loaded ${this.workItems.length} work items`);
            
        } catch (error) {
            console.error('Failed to load work items:', error);
            throw error;
        }
    }

    buildWorkItemQuery(boards, iteration, resources) {
        const resourceNames = resources.map(r => `'${r.displayName}'`).join(',');
        const iterationPath = iteration ? `'${iteration.path}'` : '@CurrentIteration';
        
        return `
            SELECT [System.Id], [System.Title], [System.State], 
                   [System.AssignedTo], [Microsoft.VSTS.Scheduling.StoryPoints],
                   [System.Tags], [System.WorkItemType], [System.IterationPath],
                   [Microsoft.VSTS.Common.Priority], [System.CreatedDate],
                   [System.ChangedDate], [Microsoft.VSTS.Common.StateChangeDate],
                   [System.BoardColumn], [System.BoardLane]
            FROM WorkItems 
            WHERE [System.TeamProject] = @project
            AND [System.IterationPath] UNDER ${iterationPath}
            ${resources.length > 0 ? `AND [System.AssignedTo] IN (${resourceNames})` : ''}
            AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task', 'Feature')
            ORDER BY [System.ChangedDate] DESC
        `;
    }

    async loadWorkItemDetails(config, workItemIds) {
        const { org, project, patToken } = config;

        try {
            const chunks = this.chunkArray(workItemIds, 200); // ADO has limits on batch size
            
            for (const chunk of chunks) {
                const response = await this.makeADORequest(
                    `/${org}/${project}/_apis/wit/workitems?ids=${chunk.join(',')}&$expand=relations`,
                    this.getAuthHeaders(patToken)
                );

                if (response.ok) {
                    const data = await response.json();
                    data.value.forEach(workItem => {
                        this.workItems.push({
                            id: workItem.id,
                            title: workItem.fields['System.Title'],
                            state: workItem.fields['System.State'],
                            workItemType: workItem.fields['System.WorkItemType'],
                            assignedTo: workItem.fields['System.AssignedTo']?.displayName || 'Unassigned',
                            storyPoints: workItem.fields['Microsoft.VSTS.Scheduling.StoryPoints'] || 0,
                            priority: workItem.fields['Microsoft.VSTS.Common.Priority'] || 2,
                            tags: workItem.fields['System.Tags'] || '',
                            iterationPath: workItem.fields['System.IterationPath'],
                            createdDate: workItem.fields['System.CreatedDate'],
                            changedDate: workItem.fields['System.ChangedDate'],
                            boardColumn: workItem.fields['System.BoardColumn'],
                            links: workItem.relations || []
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load work item details:', error);
            throw error;
        }
    }

    async loadTestResults(config) {
        const { org, project, patToken } = config;
        
        try {
            // Get recent test runs
            const testRunsResponse = await this.makeADORequest(
                `/${org}/${project}/_apis/test/runs?$top=100`,
                this.getAuthHeaders(patToken)
            );

            if (testRunsResponse.ok) {
                const testRunsData = await testRunsResponse.json();
                this.testResults = [];
                
                // Load results for each run
                for (const run of testRunsData.value.slice(0, 10)) { // Limit to recent 10 runs
                    await this.loadTestRunResults(config, run.id);
                }
            }

            console.log(`📊 Loaded ${this.testResults.length} test results`);
            
        } catch (error) {
            console.error('Failed to load test results:', error);
            // Don't throw - test results are optional
        }
    }

    async loadTestRunResults(config, runId) {
        const { org, project, patToken } = config;
        
        try {
            const resultsResponse = await this.makeADORequest(
                `/${org}/${project}/_apis/test/runs/${runId}/results`,
                this.getAuthHeaders(patToken)
            );

            if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                resultsData.value.forEach(result => {
                    this.testResults.push({
                        testCaseId: result.testCase?.id,
                        testCaseTitle: result.testCaseTitle,
                        outcome: result.outcome,
                        runId: runId,
                        duration: result.durationInMs,
                        startedDate: result.startedDate,
                        completedDate: result.completedDate,
                        environment: result.build?.environment || 'Unknown'
                    });
                });
            }
        } catch (error) {
            console.warn(`Failed to load results for test run ${runId}:`, error);
        }
    }

    // Test categorization methods
    extractCategoriesFromTags(tagString) {
        const tags = tagString.toLowerCase().split(';').map(tag => tag.trim());
        const categories = [];
        
        Object.keys(this.testCategories).forEach(categoryKey => {
            if (tags.includes(categoryKey)) {
                categories.push(categoryKey);
            }
        });
        
        // If no explicit categories found, try to infer from other tags
        if (categories.length === 0) {
            categories.push(this.inferCategoryFromTags(tags));
        }
        
        return categories;
    }

    inferCategoryFromTags(tags) {
        // Inference rules for when explicit categorization tags are missing
        if (tags.some(tag => tag.includes('manual'))) return 'manual-only';
        if (tags.some(tag => tag.includes('auto'))) return 'automated';
        if (tags.some(tag => tag.includes('smoke'))) return 'smoke';
        if (tags.some(tag => tag.includes('regression'))) return 'regression';
        if (tags.some(tag => tag.includes('integration'))) return 'integration';
        if (tags.some(tag => tag.includes('api'))) return 'api';
        if (tags.some(tag => tag.includes('e2e') || tag.includes('end-to-end'))) return 'e2e';
        if (tags.some(tag => tag.includes('performance') || tag.includes('load'))) return 'performance';
        if (tags.some(tag => tag.includes('security'))) return 'security';
        if (tags.some(tag => tag.includes('unit'))) return 'unit';
        if (tags.some(tag => tag.includes('uat'))) return 'uat';
        if (tags.some(tag => tag.includes('accessibility') || tag.includes('a11y'))) return 'accessibility';
        
        // Default to manual-only if no category can be inferred
        return 'manual-only';
    }

    categorizeAllTests() {
        this.testCases.forEach(testCase => {
            if (!testCase.categories || testCase.categories.length === 0) {
                testCase.categories = [this.inferCategoryFromTags(
                    testCase.tags.toLowerCase().split(';').map(tag => tag.trim())
                )];
            }
        });
        
        console.log('📊 Test categorization complete');
    }

    // Test linking analysis
    extractLinkedWorkItems(relations) {
        if (!relations) return [];
        
        return relations
            .filter(rel => rel.rel === 'Microsoft.VSTS.Common.TestedBy-Reverse' || 
                          rel.rel === 'System.LinkTypes.Related' ||
                          rel.rel === 'Microsoft.VSTS.Common.Affects-Forward')
            .map(rel => ({
                id: this.extractIdFromUrl(rel.url),
                type: rel.rel,
                url: rel.url
            }));
    }

    analyzeTestCaseLinks() {
        console.log('🔗 Analyzing test case links...');
        
        this.linkingAnalysis = {
            linkedToStories: [],
            linkedToTasks: [],
            orphanedTests: [],
            sitTestingPattern: [],
            linkingStats: {}
        };

        this.testCases.forEach(testCase => {
            const linkedWorkItems = testCase.linkedWorkItems;
            
            if (linkedWorkItems.length === 0) {
                this.linkingAnalysis.orphanedTests.push(testCase);
            } else {
                // Analyze link types
                const storyLinks = linkedWorkItems.filter(link => {
                    const workItem = this.workItems.find(wi => wi.id.toString() === link.id.toString());
                    return workItem && workItem.workItemType === 'User Story';
                });
                
                const taskLinks = linkedWorkItems.filter(link => {
                    const workItem = this.workItems.find(wi => wi.id.toString() === link.id.toString());
                    return workItem && workItem.workItemType === 'Task';
                });
                
                if (storyLinks.length > 0) {
                    this.linkingAnalysis.linkedToStories.push({
                        testCase: testCase,
                        linkedStories: storyLinks
                    });
                }
                
                if (taskLinks.length > 0) {
                    this.linkingAnalysis.linkedToTasks.push({
                        testCase: testCase,
                        linkedTasks: taskLinks
                    });
                    
                    // Check for SIT Testing pattern
                    const sitTasks = taskLinks.filter(link => {
                        const workItem = this.workItems.find(wi => wi.id.toString() === link.id.toString());
                        return workItem && workItem.title.toLowerCase().includes('sit testing');
                    });
                    
                    if (sitTasks.length > 0) {
                        this.linkingAnalysis.sitTestingPattern.push({
                            testCase: testCase,
                            sitTasks: sitTasks
                        });
                    }
                }
            }
        });

        // Calculate linking statistics
        this.linkingAnalysis.linkingStats = {
            totalTests: this.testCases.length,
            linkedToStories: this.linkingAnalysis.linkedToStories.length,
            linkedToTasks: this.linkingAnalysis.linkedToTasks.length,
            orphanedTests: this.linkingAnalysis.orphanedTests.length,
            sitTestingPattern: this.linkingAnalysis.sitTestingPattern.length,
            linkingPercentage: ((this.testCases.length - this.linkingAnalysis.orphanedTests.length) / this.testCases.length * 100).toFixed(1)
        };

        console.log('✅ Test linking analysis complete');
        console.log(`📊 Linking stats: ${this.linkingAnalysis.linkingStats.linkingPercentage}% tests linked`);
    }

    // Execution metrics calculation
    calculateExecutionMetrics() {
        console.log('📊 Calculating execution metrics by category...');
        
        this.executionMetrics = {};
        
        // Initialize metrics for each category
        Object.keys(this.testCategories).forEach(category => {
            this.executionMetrics[category] = {
                total: 0,
                executed: 0,
                passed: 0,
                failed: 0,
                blocked: 0,
                notRun: 0,
                passRate: 0,
                averageDuration: 0,
                automationROI: 0,
                stabilityScore: 0
            };
        });

        // Count tests by category
        this.testCases.forEach(testCase => {
            testCase.categories.forEach(category => {
                if (this.executionMetrics[category]) {
                    this.executionMetrics[category].total++;
                    
                    // Find latest execution result for this test case
                    const latestResult = this.testResults
                        .filter(result => result.testCaseId === testCase.id)
                        .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))[0];
                    
                    if (latestResult) {
                        this.executionMetrics[category].executed++;
                        
                        switch (latestResult.outcome) {
                            case 'Passed':
                                this.executionMetrics[category].passed++;
                                break;
                            case 'Failed':
                                this.executionMetrics[category].failed++;
                                break;
                            case 'Blocked':
                                this.executionMetrics[category].blocked++;
                                break;
                            default:
                                this.executionMetrics[category].notRun++;
                        }
                    } else {
                        this.executionMetrics[category].notRun++;
                    }
                }
            });
        });

        // Calculate derived metrics
        Object.keys(this.executionMetrics).forEach(category => {
            const metrics = this.executionMetrics[category];
            
            // Pass rate
            if (metrics.executed > 0) {
                metrics.passRate = (metrics.passed / metrics.executed * 100).toFixed(1);
            }
            
            // Average duration
            const categoryResults = this.testResults.filter(result => {
                const testCase = this.testCases.find(tc => tc.id === result.testCaseId);
                return testCase && testCase.categories.includes(category);
            });
            
            if (categoryResults.length > 0) {
                const totalDuration = categoryResults.reduce((sum, result) => sum + (result.duration || 0), 0);
                metrics.averageDuration = Math.round(totalDuration / categoryResults.length / 1000); // Convert to seconds
            }
            
            // Automation ROI (simplified calculation)
            if (this.testCategories[category].automatable && metrics.total > 0) {
                const automatedTests = this.testCases.filter(tc => 
                    tc.categories.includes(category) && 
                    tc.automationStatus === 'Automated'
                ).length;
                metrics.automationROI = (automatedTests / metrics.total * 100).toFixed(1);
            }
            
            // Stability score (based on pass rate and consistency)
            if (metrics.executed >= 5) {
                metrics.stabilityScore = Math.min(100, metrics.passRate * 0.8 + 20).toFixed(1);
            }
        });

        console.log('✅ Execution metrics calculation complete');
    }

    // Test coverage analysis
    calculateTestCoverage() {
        console.log('🎯 Calculating test coverage...');
        
        this.coverageAnalysis = {
            storyTestCoverage: [],
            overallCoverage: {
                totalStories: 0,
                coveredStories: 0,
                coveragePercentage: 0,
                testCasesPerStory: 0
            },
            categoryDistribution: {},
            missingCoverageAreas: []
        };

        // Analyze coverage for each story
        const stories = this.workItems.filter(wi => wi.workItemType === 'User Story');
        
        stories.forEach(story => {
            const linkedTestCases = this.findTestCasesForStory(story.id);
            const testCategories = this.getTestCategoriesForStory(linkedTestCases);
            const coveragePercent = this.calculateStoryCoveragePercentage(story, linkedTestCases);
            const missingCategories = this.identifyMissingTestCategories(story.tags, testCategories);
            
            const storyCoverage = {
                storyId: story.id,
                storyTitle: story.title,
                storyPoints: story.storyPoints,
                linkedTestCases: linkedTestCases,
                testCategories: testCategories,
                coveragePercent: coveragePercent,
                missingCategories: missingCategories,
                testCaseCount: linkedTestCases.length
            };
            
            this.coverageAnalysis.storyTestCoverage.push(storyCoverage);
        });

        // Calculate overall coverage metrics
        this.coverageAnalysis.overallCoverage.totalStories = stories.length;
        this.coverageAnalysis.overallCoverage.coveredStories = 
            this.coverageAnalysis.storyTestCoverage.filter(sc => sc.testCaseCount > 0).length;
        
        if (stories.length > 0) {
            this.coverageAnalysis.overallCoverage.coveragePercentage = 
                (this.coverageAnalysis.overallCoverage.coveredStories / stories.length * 100).toFixed(1);
            
            const totalTestCases = this.coverageAnalysis.storyTestCoverage.reduce((sum, sc) => sum + sc.testCaseCount, 0);
            this.coverageAnalysis.overallCoverage.testCasesPerStory = 
                (totalTestCases / stories.length).toFixed(1);
        }

        // Calculate category distribution
        Object.keys(this.testCategories).forEach(category => {
            this.coverageAnalysis.categoryDistribution[category] = {
                testCaseCount: this.testCases.filter(tc => tc.categories.includes(category)).length,
                storiesCovered: this.coverageAnalysis.storyTestCoverage.filter(sc => 
                    sc.testCategories.includes(category)
                ).length
            };
        });

        console.log('✅ Test coverage analysis complete');
        console.log(`📊 Overall coverage: ${this.coverageAnalysis.overallCoverage.coveragePercentage}%`);
    }

    findTestCasesForStory(storyId) {
        return this.testCases.filter(testCase => 
            testCase.linkedWorkItems.some(link => link.id.toString() === storyId.toString())
        );
    }

    getTestCategoriesForStory(testCases) {
        const categories = new Set();
        testCases.forEach(testCase => {
            testCase.categories.forEach(category => categories.add(category));
        });
        return Array.from(categories);
    }

    calculateStoryCoveragePercentage(story, linkedTestCases) {
        // Simple coverage calculation based on test case count
        // In a real implementation, this could be more sophisticated
        if (linkedTestCases.length === 0) return 0;
        if (linkedTestCases.length >= 3) return 100;
        return (linkedTestCases.length / 3 * 100).toFixed(1);
    }

    identifyMissingTestCategories(storyTags, existingCategories) {
        const tags = storyTags.toLowerCase().split(';').map(tag => tag.trim());
        const missing = [];
        
        // Basic rules for identifying missing test types
        if (!existingCategories.includes('smoke') && tags.includes('critical')) {
            missing.push('smoke');
        }
        if (!existingCategories.includes('regression') && tags.includes('release')) {
            missing.push('regression');
        }
        if (!existingCategories.includes('integration') && tags.includes('api')) {
            missing.push('integration');
        }
        
        return missing;
    }

    // Utility methods
    getAuthHeaders(patToken) {
        return {
            headers: {
                'Authorization': `Basic ${btoa(':' + patToken)}`,
                'Content-Type': 'application/json'
            }
        };
    }

    async makeADORequest(url, options = {}) {
        const baseUrl = 'https://dev.azure.com';
        const fullUrl = `${baseUrl}${url}?api-version=7.0`;
        
        return fetch(fullUrl, options);
    }

    extractIdFromUrl(url) {
        const match = url.match(/\/(\d+)$/);
        return match ? parseInt(match[1]) : null;
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // Public API methods for dashboard integration
    getTestCategoriesDefinition() {
        return this.testCategories;
    }

    getExecutionMetricsByCategory() {
        return this.executionMetrics;
    }

    getLinkingAnalysis() {
        return this.linkingAnalysis;
    }

    getCoverageAnalysis() {
        return this.coverageAnalysis;
    }

    getTestCasesByCategory(category) {
        return this.testCases.filter(tc => tc.categories.includes(category));
    }

    getOrphanedTestCases() {
        return this.linkingAnalysis.orphanedTests || [];
    }

    getStoriesWithoutTests() {
        const stories = this.workItems.filter(wi => wi.workItemType === 'User Story');
        return stories.filter(story => {
            const linkedTests = this.findTestCasesForStory(story.id);
            return linkedTests.length === 0;
        });
    }

    // Generate summary for dashboard display
    generateTestMetricsSummary() {
        return {
            totalTestCases: this.testCases.length,
            categoriesCount: Object.keys(this.testCategories).length,
            overallPassRate: this.calculateOverallPassRate(),
            automationCoverage: this.calculateAutomationCoverage(),
            linkingPercentage: this.linkingAnalysis.linkingStats?.linkingPercentage || 0,
            coveragePercentage: this.coverageAnalysis.overallCoverage?.coveragePercentage || 0,
            orphanedTests: this.linkingAnalysis.orphanedTests?.length || 0,
            sitTestingCases: this.linkingAnalysis.sitTestingPattern?.length || 0
        };
    }

    calculateOverallPassRate() {
        const totalExecuted = Object.values(this.executionMetrics).reduce((sum, metrics) => sum + metrics.executed, 0);
        const totalPassed = Object.values(this.executionMetrics).reduce((sum, metrics) => sum + metrics.passed, 0);
        
        return totalExecuted > 0 ? (totalPassed / totalExecuted * 100).toFixed(1) : 0;
    }

    calculateAutomationCoverage() {
        const automatedTests = this.testCases.filter(tc => tc.automationStatus === 'Automated').length;
        return this.testCases.length > 0 ? (automatedTests / this.testCases.length * 100).toFixed(1) : 0;
    }
}

// Global instance
window.testMetricsEngine = new TestMetricsEngine();