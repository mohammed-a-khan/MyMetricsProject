/**
 * Main AI Content Analyzer Class
 * Orchestrates all AI analysis components with efficient batch processing
 */
class AIContentAnalyzer {
    constructor(options = {}) {
        this.options = {
            language: options.language || AI_CONFIG.LANGUAGES.DEFAULT,
            batchSize: options.batchSize || AI_CONFIG.PROCESSING.BATCH_SIZE,
            maxConcurrentBatches: options.maxConcurrentBatches || AI_CONFIG.PROCESSING.MAX_CONCURRENT_BATCHES,
            confidenceThreshold: options.confidenceThreshold || AI_CONFIG.SCORING.MEDIUM_CONFIDENCE,
            enableCaching: options.enableCaching !== false,
            ...options
        };
        
        // Initialize components
        this.textProcessor = new TextProcessor(this.options.language);
        this.tfidfAnalyzer = new TFIDFAnalyzer();
        this.contentCategorizer = new ContentCategorizer();
        this.summaryGenerator = new SummaryGenerator();
        this.confidenceScorer = new ConfidenceScorer();
        this.keyPhraseExtractor = new KeyPhraseExtractor();
        
        // Performance tracking
        this.performanceMetrics = {
            totalProcessed: 0,
            averageProcessingTime: 0,
            batchProcessingTimes: [],
            errorCount: 0,
            cacheHitRate: 0
        };
        
        // Caching system
        this.cache = new Map();
        this.cacheStats = { hits: 0, misses: 0 };
        
        // Custom dictionaries
        this.customDictionaries = {
            technical: new Set(),
            business: new Set(),
            domain: new Set()
        };
        
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('Initializing AI Content Analyzer...');
            
            // Load any custom dictionaries or configurations
            await this.loadCustomDictionaries();
            
            // Initialize language-specific components
            await this.initializeLanguageSupport();
            
            // Warm up components with sample data
            await this.warmUpComponents();
            
            this.isInitialized = true;
            console.log('AI Content Analyzer initialized successfully');
            
            return { success: true, message: 'Initialization complete' };
        } catch (error) {
            console.error('Failed to initialize AI Content Analyzer:', error);
            return { success: false, error: error.message };
        }
    }

    async analyzeWorkItems(workItems, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        const startTime = Date.now();
        
        try {
            console.log(`Starting analysis of ${workItems.length} work items...`);
            
            // Validate input
            const validatedItems = this.validateWorkItems(workItems);
            if (validatedItems.length === 0) {
                throw new Error('No valid work items to analyze');
            }
            
            // Prepare analysis options
            const analysisOptions = {
                includeKeywordExtraction: true,
                includeCategorization: true,
                includeSummaryGeneration: true,
                includeConfidenceScoring: true,
                generateInsights: true,
                ...options
            };
            
            // Perform batch analysis
            const analysisResults = await this.performBatchAnalysis(validatedItems, analysisOptions);
            
            // Generate comprehensive insights
            const insights = await this.generateInsights(analysisResults, analysisOptions);
            
            // Calculate performance metrics
            const processingTime = Date.now() - startTime;
            this.updatePerformanceMetrics(validatedItems.length, processingTime);
            
            const result = {
                metadata: {
                    totalItems: workItems.length,
                    validItems: validatedItems.length,
                    processingTime,
                    analysisOptions,
                    generatedAt: new Date().toISOString()
                },
                items: analysisResults,
                insights,
                performance: this.getPerformanceSnapshot(),
                recommendations: this.generateSystemRecommendations(analysisResults)
            };
            
            // Cache results if enabled
            if (this.options.enableCaching) {
                this.cacheResults(workItems, result);
            }
            
            console.log(`Analysis completed in ${processingTime}ms`);
            return result;
            
        } catch (error) {
            this.performanceMetrics.errorCount++;
            console.error('Analysis failed:', error);
            throw error;
        }
    }

    async performBatchAnalysis(workItems, options) {
        const batches = this.createBatches(workItems, this.options.batchSize);
        const results = [];
        
        console.log(`Processing ${batches.length} batches...`);
        
        // Process batches with concurrency control
        for (let i = 0; i < batches.length; i += this.options.maxConcurrentBatches) {
            const batchGroup = batches.slice(i, i + this.options.maxConcurrentBatches);
            
            const batchPromises = batchGroup.map((batch, batchIndex) => 
                this.processBatch(batch, i + batchIndex, options)
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.flat());
            
            // Progress reporting
            const processedBatches = Math.min(i + this.options.maxConcurrentBatches, batches.length);
            console.log(`Completed ${processedBatches}/${batches.length} batches`);
        }
        
        return results;
    }

    async processBatch(batch, batchIndex, options) {
        const batchStartTime = Date.now();
        
        try {
            // Build TF-IDF corpus for this batch
            await this.buildTFIDFCorpus(batch);
            
            // Process each item in the batch
            const batchResults = await Promise.all(
                batch.map(item => this.analyzeWorkItem(item, options))
            );
            
            const processingTime = Date.now() - batchStartTime;
            this.performanceMetrics.batchProcessingTimes.push(processingTime);
            
            console.log(`Batch ${batchIndex + 1} completed in ${processingTime}ms`);
            return batchResults;
            
        } catch (error) {
            console.error(`Batch ${batchIndex + 1} failed:`, error);
            // Return partial results with error indicators
            return batch.map(item => ({
                id: item.id,
                error: error.message,
                analysis: null
            }));
        }
    }

    async analyzeWorkItem(workItem, options) {
        const itemStartTime = Date.now();
        
        try {
            // Check cache first
            if (this.options.enableCaching) {
                const cached = this.getCachedAnalysis(workItem);
                if (cached) {
                    this.cacheStats.hits++;
                    return cached;
                }
                this.cacheStats.misses++;
            }
            
            // Extract text content
            const textContent = this.extractTextContent(workItem);
            
            // Initialize analysis result
            const analysis = {
                id: workItem.id,
                textContent,
                language: this.textProcessor.detectLanguage(textContent),
                processingTime: 0
            };
            
            // Keyword extraction
            if (options.includeKeywordExtraction) {
                analysis.keywords = await this.extractKeywords(textContent, workItem);
                analysis.technicalTerms = this.textProcessor.extractTechnicalTerms(textContent);
                analysis.businessKeywords = this.textProcessor.extractBusinessKeywords(textContent);
                analysis.namedEntities = this.textProcessor.extractNamedEntities(textContent);
                analysis.keyPhrases = this.keyPhraseExtractor.extractKeyPhrases(textContent);
            }
            
            // Content categorization
            if (options.includeCategorization) {
                const categorization = this.contentCategorizer.categorizeContent(textContent, workItem);
                analysis.category = categorization.category;
                analysis.categoryConfidence = categorization.confidence;
                analysis.categoryScores = categorization.scores;
                analysis.isBusinessFocused = categorization.isBusinessFocused;
                analysis.isTechnicalFocused = categorization.isTechnicalFocused;
            }
            
            // Summary generation (for significant items)
            if (options.includeSummaryGeneration && this.shouldGenerateSummary(workItem, analysis)) {
                analysis.summary = await this.generateItemSummary(workItem, analysis);
            }
            
            // Confidence scoring
            if (options.includeConfidenceScoring) {
                const confidence = this.confidenceScorer.calculateConfidenceScore(analysis, workItem);
                analysis.confidence = confidence;
            }
            
            // Additional insights
            if (options.generateInsights) {
                analysis.insights = this.generateItemInsights(workItem, analysis);
            }
            
            analysis.processingTime = Date.now() - itemStartTime;
            
            return {
                id: workItem.id,
                originalItem: workItem,
                analysis
            };
            
        } catch (error) {
            console.error(`Failed to analyze work item ${workItem.id}:`, error);
            return {
                id: workItem.id,
                originalItem: workItem,
                error: error.message,
                analysis: null
            };
        }
    }

    async extractKeywords(textContent, workItem) {
        // Get TF-IDF keywords
        const tfidfKeywords = this.tfidfAnalyzer.getTopTerms(workItem.id, 10);
        
        // Extract domain-specific keywords
        const domainKeywords = this.extractDomainKeywords(textContent);
        
        // Combine and score keywords
        const allKeywords = [
            ...tfidfKeywords.map(k => ({ ...k, source: 'tfidf' })),
            ...domainKeywords.map(k => ({ ...k, source: 'domain' }))
        ];
        
        // Remove duplicates and sort by relevance
        const uniqueKeywords = this.deduplicateKeywords(allKeywords);
        
        return uniqueKeywords
            .sort((a, b) => b.score - a.score)
            .slice(0, AI_CONFIG.PROCESSING.MAX_KEYWORDS_PER_ITEM);
    }

    extractDomainKeywords(textContent) {
        const keywords = [];
        
        // Custom domain dictionary matching
        this.customDictionaries.domain.forEach(term => {
            if (textContent.toLowerCase().includes(term.toLowerCase())) {
                keywords.push({
                    term,
                    score: 0.8,
                    frequency: (textContent.toLowerCase().match(new RegExp(term.toLowerCase(), 'g')) || []).length
                });
            }
        });
        
        return keywords;
    }

    deduplicateKeywords(keywords) {
        const keywordMap = new Map();
        
        keywords.forEach(keyword => {
            const normalizedTerm = keyword.term.toLowerCase();
            if (!keywordMap.has(normalizedTerm) || keywordMap.get(normalizedTerm).score < keyword.score) {
                keywordMap.set(normalizedTerm, keyword);
            }
        });
        
        return Array.from(keywordMap.values());
    }

    shouldGenerateSummary(workItem, analysis) {
        // Generate summaries for high-priority or complex items
        return workItem.priority === 'Critical' || 
               workItem.businessImpact === 'high' ||
               (workItem.storyPoints && workItem.storyPoints >= 5) ||
               (analysis.categoryConfidence && analysis.categoryConfidence >= AI_CONFIG.SCORING.HIGH_CONFIDENCE);
    }

    async generateItemSummary(workItem, analysis) {
        const textContent = analysis.textContent;
        
        if (textContent.length < 100) {
            return workItem.title || 'Brief work item';
        }
        
        // Extract key sentences
        const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length <= 2) {
            return textContent.substring(0, 200) + '...';
        }
        
        // Score sentences for importance
        const scoredSentences = sentences.map(sentence => ({
            sentence: sentence.trim(),
            score: this.scoreSentenceImportance(sentence, analysis)
        }));
        
        // Select top sentences
        const topSentences = scoredSentences
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(s => s.sentence);
        
        return topSentences.join('. ') + '.';
    }

    scoreSentenceImportance(sentence, analysis) {
        let score = 0;
        
        // Boost sentences with technical terms
        const technicalTerms = analysis.technicalTerms || [];
        technicalTerms.forEach(term => {
            if (sentence.toLowerCase().includes(term.toLowerCase())) {
                score += 2;
            }
        });
        
        // Boost sentences with business keywords
        const businessKeywords = analysis.businessKeywords || [];
        businessKeywords.forEach(keyword => {
            if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
                score += 1.5;
            }
        });
        
        // Boost sentences with extracted keywords
        const keywords = analysis.keywords || [];
        keywords.forEach(keyword => {
            if (sentence.toLowerCase().includes(keyword.term.toLowerCase())) {
                score += keyword.score;
            }
        });
        
        // Penalty for very long or very short sentences
        if (sentence.length < 20 || sentence.length > 200) {
            score *= 0.5;
        }
        
        return score;
    }

    generateItemInsights(workItem, analysis) {
        const insights = [];
        
        // Business value insights
        if (analysis.isBusinessFocused) {
            insights.push({
                type: 'business_focus',
                message: 'This item has strong business focus and customer impact',
                confidence: 0.8
            });
        }
        
        // Technical complexity insights
        if (analysis.technicalTerms && analysis.technicalTerms.length > 5) {
            insights.push({
                type: 'technical_complexity',
                message: 'This item involves significant technical complexity',
                confidence: 0.7
            });
        }
        
        // Category-specific insights
        if (analysis.category === 'SECURITY_UPDATE') {
            insights.push({
                type: 'security_priority',
                message: 'Security-related work item requiring priority attention',
                confidence: 0.9
            });
        }
        
        // Quality insights
        if (analysis.confidence && analysis.confidence.overall < AI_CONFIG.SCORING.MEDIUM_CONFIDENCE) {
            insights.push({
                type: 'data_quality',
                message: 'Work item may need more detailed description for better analysis',
                confidence: 0.6
            });
        }
        
        return insights;
    }

    async generateInsights(analysisResults, options) {
        console.log('Generating comprehensive insights...');
        
        const validResults = analysisResults.filter(r => r.analysis && !r.error);
        
        // Generate executive summary
        const executiveSummary = this.summaryGenerator.generateExecutiveSummary(validResults);
        
        // Category analysis
        const categoryAnalysis = this.contentCategorizer.generateCategoryReport(validResults);
        
        // Keyword trends
        const keywordTrends = this.analyzeKeywordTrends(validResults);
        
        // Technical vs business analysis
        const techBusinessAnalysis = this.analyzeTechnicalBusinessSplit(validResults);
        
        // Quality assessment
        const qualityAssessment = this.assessAnalysisQuality(validResults);
        
        // Actionable recommendations
        const recommendations = this.generateActionableRecommendations(validResults);
        
        return {
            executiveSummary,
            categoryAnalysis,
            keywordTrends,
            techBusinessAnalysis,
            qualityAssessment,
            recommendations,
            patterns: this.identifyPatterns(validResults),
            anomalies: this.detectAnomalies(validResults)
        };
    }

    analyzeKeywordTrends(analysisResults) {
        const allKeywords = [];
        const technicalTermFreq = {};
        const businessKeywordFreq = {};
        
        analysisResults.forEach(result => {
            if (result.analysis.keywords) {
                allKeywords.push(...result.analysis.keywords);
            }
            
            if (result.analysis.technicalTerms) {
                result.analysis.technicalTerms.forEach(term => {
                    technicalTermFreq[term] = (technicalTermFreq[term] || 0) + 1;
                });
            }
            
            if (result.analysis.businessKeywords) {
                result.analysis.businessKeywords.forEach(keyword => {
                    businessKeywordFreq[keyword] = (businessKeywordFreq[keyword] || 0) + 1;
                });
            }
        });
        
        // Get top trends
        const topTechnicalTerms = Object.entries(technicalTermFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([term, freq]) => ({ term, frequency: freq }));
        
        const topBusinessKeywords = Object.entries(businessKeywordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([keyword, freq]) => ({ keyword, frequency: freq }));
        
        // Get emerging keywords (appear frequently but with high average TF-IDF)
        const emergingKeywords = this.identifyEmergingKeywords(allKeywords);
        
        return {
            topTechnicalTerms,
            topBusinessKeywords,
            emergingKeywords,
            totalUniqueKeywords: new Set(allKeywords.map(k => k.term)).size
        };
    }

    identifyEmergingKeywords(allKeywords) {
        const keywordStats = {};
        
        allKeywords.forEach(keyword => {
            if (!keywordStats[keyword.term]) {
                keywordStats[keyword.term] = {
                    count: 0,
                    totalScore: 0,
                    avgScore: 0
                };
            }
            keywordStats[keyword.term].count++;
            keywordStats[keyword.term].totalScore += keyword.score;
        });
        
        // Calculate average scores and identify emerging keywords
        Object.keys(keywordStats).forEach(term => {
            const stats = keywordStats[term];
            stats.avgScore = stats.totalScore / stats.count;
        });
        
        return Object.entries(keywordStats)
            .filter(([, stats]) => stats.count >= 3 && stats.avgScore > 0.5)
            .sort(([,a], [,b]) => b.avgScore - a.avgScore)
            .slice(0, 10)
            .map(([term, stats]) => ({ term, ...stats }));
    }

    analyzeTechnicalBusinessSplit(analysisResults) {
        const businessItems = analysisResults.filter(r => r.analysis.isBusinessFocused);
        const technicalItems = analysisResults.filter(r => r.analysis.isTechnicalFocused);
        const mixedItems = analysisResults.filter(r => 
            !r.analysis.isBusinessFocused && !r.analysis.isTechnicalFocused
        );
        
        const total = analysisResults.length;
        
        return {
            business: {
                count: businessItems.length,
                percentage: (businessItems.length / total) * 100,
                topCategories: this.getTopCategories(businessItems)
            },
            technical: {
                count: technicalItems.length,
                percentage: (technicalItems.length / total) * 100,
                topCategories: this.getTopCategories(technicalItems)
            },
            mixed: {
                count: mixedItems.length,
                percentage: (mixedItems.length / total) * 100
            },
            balance: this.assessBusinessTechnicalBalance(businessItems.length, technicalItems.length)
        };
    }

    getTopCategories(items) {
        const categoryCount = {};
        items.forEach(item => {
            const category = item.analysis.category;
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
        
        return Object.entries(categoryCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));
    }

    assessBusinessTechnicalBalance(businessCount, technicalCount) {
        const total = businessCount + technicalCount;
        if (total === 0) return 'unknown';
        
        const businessRatio = businessCount / total;
        
        if (businessRatio > 0.7) return 'business_heavy';
        if (businessRatio < 0.3) return 'technical_heavy';
        return 'balanced';
    }

    assessAnalysisQuality(analysisResults) {
        const confidenceScores = analysisResults
            .filter(r => r.analysis.confidence)
            .map(r => r.analysis.confidence.overall);
        
        const avgConfidence = confidenceScores.length > 0 ? 
            confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length : 0;
        
        const highConfidenceItems = confidenceScores.filter(conf => 
            conf >= AI_CONFIG.SCORING.HIGH_CONFIDENCE
        ).length;
        
        const lowConfidenceItems = confidenceScores.filter(conf => 
            conf < AI_CONFIG.SCORING.LOW_CONFIDENCE
        ).length;
        
        return {
            averageConfidence: avgConfidence,
            highConfidenceItems,
            lowConfidenceItems,
            qualityGrade: this.getQualityGrade(avgConfidence),
            recommendations: this.generateQualityRecommendations(avgConfidence, lowConfidenceItems)
        };
    }

    getQualityGrade(avgConfidence) {
        if (avgConfidence >= 0.8) return 'A';
        if (avgConfidence >= 0.7) return 'B';
        if (avgConfidence >= 0.6) return 'C';
        if (avgConfidence >= 0.5) return 'D';
        return 'F';
    }

    generateQualityRecommendations(avgConfidence, lowConfidenceCount) {
        const recommendations = [];
        
        if (avgConfidence < 0.6) {
            recommendations.push('Improve work item descriptions with more detailed information');
        }
        
        if (lowConfidenceCount > 0) {
            recommendations.push(`Review ${lowConfidenceCount} items with low analysis confidence`);
        }
        
        return recommendations;
    }

    generateActionableRecommendations(analysisResults) {
        const recommendations = [];
        
        // Security recommendations
        const securityItems = analysisResults.filter(r => 
            r.analysis.category === 'SECURITY_UPDATE'
        );
        if (securityItems.length > 0) {
            recommendations.push({
                priority: 'high',
                category: 'security',
                message: `Prioritize ${securityItems.length} security-related work items`,
                items: securityItems.slice(0, 3).map(r => r.originalItem.title)
            });
        }
        
        // Performance recommendations
        const performanceItems = analysisResults.filter(r => 
            r.analysis.category === 'PERFORMANCE_OPTIMIZATION'
        );
        if (performanceItems.length > 3) {
            recommendations.push({
                priority: 'medium',
                category: 'performance',
                message: `Consider dedicated sprint for ${performanceItems.length} performance optimizations`,
                items: performanceItems.slice(0, 3).map(r => r.originalItem.title)
            });
        }
        
        // Technical debt recommendations
        const techDebtItems = analysisResults.filter(r => 
            r.analysis.category === 'TECHNICAL_IMPROVEMENT'
        );
        if (techDebtItems.length > 5) {
            recommendations.push({
                priority: 'medium',
                category: 'technical_debt',
                message: `Allocate capacity for technical debt reduction (${techDebtItems.length} items)`,
                items: techDebtItems.slice(0, 3).map(r => r.originalItem.title)
            });
        }
        
        return recommendations;
    }

    identifyPatterns(analysisResults) {
        // Identify recurring patterns in work items
        const patterns = [];
        
        // Common keyword patterns
        const keywordCombinations = this.findKeywordCombinations(analysisResults);
        if (keywordCombinations.length > 0) {
            patterns.push({
                type: 'keyword_patterns',
                description: 'Recurring keyword combinations identified',
                data: keywordCombinations.slice(0, 5)
            });
        }
        
        // Category clustering
        const categoryClusters = this.findCategoryClusters(analysisResults);
        if (categoryClusters.length > 0) {
            patterns.push({
                type: 'category_clusters',
                description: 'Work items tend to cluster in specific categories',
                data: categoryClusters
            });
        }
        
        return patterns;
    }

    detectAnomalies(analysisResults) {
        const anomalies = [];
        
        // Items with unusual keyword combinations
        const unusualItems = analysisResults.filter(r => {
            const keywords = r.analysis.keywords || [];
            const techTerms = r.analysis.technicalTerms || [];
            const businessKeywords = r.analysis.businessKeywords || [];
            
            // Anomaly: High technical content in business-focused item
            return r.analysis.isBusinessFocused && techTerms.length > businessKeywords.length * 2;
        });
        
        if (unusualItems.length > 0) {
            anomalies.push({
                type: 'classification_mismatch',
                description: 'Items with mismatched business/technical classification',
                count: unusualItems.length,
                examples: unusualItems.slice(0, 3).map(r => r.originalItem.title)
            });
        }
        
        // Low confidence but high complexity
        const complexLowConfidence = analysisResults.filter(r => 
            r.analysis.confidence && 
            r.analysis.confidence.overall < AI_CONFIG.SCORING.MEDIUM_CONFIDENCE &&
            (r.originalItem.storyPoints && r.originalItem.storyPoints > 5)
        );
        
        if (complexLowConfidence.length > 0) {
            anomalies.push({
                type: 'complex_low_confidence',
                description: 'Complex work items with low analysis confidence',
                count: complexLowConfidence.length,
                examples: complexLowConfidence.slice(0, 3).map(r => r.originalItem.title)
            });
        }
        
        return anomalies;
    }

    // Utility methods
    validateWorkItems(workItems) {
        return workItems.filter(item => {
            return item && 
                   typeof item === 'object' && 
                   item.id && 
                   (item.title || item.description);
        });
    }

    extractTextContent(workItem) {
        const textParts = [];
        
        if (workItem.title) textParts.push(workItem.title);
        if (workItem.description) textParts.push(workItem.description);
        if (workItem.acceptanceCriteria) {
            if (Array.isArray(workItem.acceptanceCriteria)) {
                textParts.push(...workItem.acceptanceCriteria);
            } else {
                textParts.push(workItem.acceptanceCriteria);
            }
        }
        if (workItem.comments && Array.isArray(workItem.comments)) {
            textParts.push(...workItem.comments.map(c => c.text || c));
        }
        
        return textParts.join(' ').trim();
    }

    async buildTFIDFCorpus(batch) {
        batch.forEach(item => {
            const textContent = this.extractTextContent(item);
            const tokens = this.textProcessor.tokenize(textContent);
            this.tfidfAnalyzer.addDocument(item.id, tokens);
        });
    }

    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    updatePerformanceMetrics(itemCount, processingTime) {
        this.performanceMetrics.totalProcessed += itemCount;
        
        const currentAvg = this.performanceMetrics.averageProcessingTime;
        const totalProcessed = this.performanceMetrics.totalProcessed;
        
        this.performanceMetrics.averageProcessingTime = 
            (currentAvg * (totalProcessed - itemCount) + processingTime) / totalProcessed;
        
        this.performanceMetrics.cacheHitRate = 
            this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100;
    }

    getPerformanceSnapshot() {
        return {
            ...this.performanceMetrics,
            itemsPerSecond: this.performanceMetrics.averageProcessingTime > 0 ? 
                1000 / (this.performanceMetrics.averageProcessingTime / this.performanceMetrics.totalProcessed) : 0,
            cacheHitRate: this.performanceMetrics.cacheHitRate,
            averageBatchTime: this.performanceMetrics.batchProcessingTimes.length > 0 ?
                this.performanceMetrics.batchProcessingTimes.reduce((sum, time) => sum + time, 0) / 
                this.performanceMetrics.batchProcessingTimes.length : 0
        };
    }

    // Configuration and customization
    addCustomDictionary(type, terms) {
        if (this.customDictionaries[type]) {
            terms.forEach(term => this.customDictionaries[type].add(term));
        }
    }

    addCustomCategorizationRule(name, rule) {
        this.contentCategorizer.addCustomRule(name, rule);
    }

    // Caching system
    getCachedAnalysis(workItem) {
        const cacheKey = this.generateCacheKey(workItem);
        return this.cache.get(cacheKey);
    }

    cacheResults(workItems, result) {
        // Cache individual item results
        result.items.forEach(item => {
            if (item.analysis) {
                const cacheKey = this.generateCacheKey(item.originalItem);
                this.cache.set(cacheKey, item);
            }
        });
        
        // Implement cache size management
        if (this.cache.size > 1000) {
            const keysToDelete = Array.from(this.cache.keys()).slice(0, 200);
            keysToDelete.forEach(key => this.cache.delete(key));
        }
    }

    generateCacheKey(workItem) {
        // Create cache key based on item content and version
        const content = this.extractTextContent(workItem);
        const metadata = JSON.stringify({
            id: workItem.id,
            changedDate: workItem.changedDate,
            revision: workItem.revision
        });
        
        return this.simpleHash(content + metadata);
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    // Async initialization helpers
    async loadCustomDictionaries() {
        // Load organization-specific terms
        // This could be from a configuration file or API
        const orgTerms = {
            technical: ['microservice', 'api gateway', 'kubernetes', 'docker'],
            business: ['customer journey', 'conversion rate', 'user engagement'],
            domain: ['patient record', 'medical device', 'compliance audit'] // Example for healthcare
        };
        
        Object.entries(orgTerms).forEach(([type, terms]) => {
            this.addCustomDictionary(type, terms);
        });
    }

    async initializeLanguageSupport() {
        // Initialize language-specific processing
        if (this.options.language !== 'en') {
            console.log(`Initializing support for language: ${this.options.language}`);
            // Load language-specific stop words and patterns
        }
    }

    async warmUpComponents() {
        // Warm up components with sample data to improve initial performance
        const sampleWorkItem = {
            id: 'sample',
            title: 'Sample work item for initialization',
            description: 'This is a sample work item used to warm up the analysis components.',
            workItemType: 'User Story'
        };
        
        try {
            await this.analyzeWorkItem(sampleWorkItem, {
                includeKeywordExtraction: true,
                includeCategorization: true,
                includeSummaryGeneration: false,
                includeConfidenceScoring: false
            });
        } catch (error) {
            console.warn('Warm-up failed, but initialization will continue:', error.message);
        }
    }

    generateSystemRecommendations(analysisResults) {
        const recommendations = [];
        
        const avgConfidence = analysisResults
            .filter(r => r.analysis && r.analysis.confidence)
            .reduce((sum, r) => sum + r.analysis.confidence.overall, 0) / analysisResults.length;
        
        if (avgConfidence < 0.7) {
            recommendations.push({
                type: 'data_quality',
                priority: 'high',
                message: 'Consider improving work item descriptions to enhance analysis accuracy',
                action: 'Provide training on writing effective user stories and requirements'
            });
        }
        
        const performanceMetrics = this.getPerformanceSnapshot();
        if (performanceMetrics.averageProcessingTime > 500) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'Analysis performance could be optimized',
                action: 'Consider adjusting batch size or enabling more aggressive caching'
            });
        }
        
        return recommendations;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AIContentAnalyzer,
        TextProcessor,
        TFIDFAnalyzer,
        ContentCategorizer,
        SummaryGenerator,
        ConfidenceScorer,
        KeyPhraseExtractor,
        AI_CONFIG,
        STOP_WORDS,
        TECHNICAL_TERMS,
        BUSINESS_KEYWORDS,
        CONTENT_CATEGORIES
    };
} 