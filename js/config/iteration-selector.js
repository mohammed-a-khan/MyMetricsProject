/**
 * Iteration Selector Component - Production Implementation
 * Handles sprint/iteration selection with date ranges and comparison modes
 */
class IterationSelector {
    constructor(adoClient) {
        this.adoClient = adoClient;
        this.selectedIterations = [];
        this.allIterations = [];
        this.dateRangeType = 'current';
        this.customDateRange = null;
    }

    async initialize() {
        try {
            this.setupEventListeners();
            console.log('IterationSelector initialized');
        } catch (error) {
            console.error('Failed to initialize IterationSelector:', error);
        }
    }

    async onBoardsChanged(selectedBoards) {
        if (selectedBoards.length === 0) {
            this.showEmptyState('Select boards to load iterations');
            return;
        }

        try {
            this.showLoading();
            await this.loadIterations();
            this.renderIterationsList();
        } catch (error) {
            console.error('Failed to reload iterations for boards:', error);
            this.showError('Failed to load iterations for selected boards');
        }
    }

    async loadIterations() {
        if (!this.adoClient) {
            throw new Error('ADO Client not initialized');
        }

        try {
            const iterationsResponse = await this.adoClient.getIterations();
            this.allIterations = iterationsResponse.value || [];
            
            // Sort iterations by start date (newest first)
            this.allIterations.sort((a, b) => {
                const dateA = new Date(a.attributes?.startDate || '1970-01-01');
                const dateB = new Date(b.attributes?.startDate || '1970-01-01');
                return dateB - dateA;
            });

            console.log(`Loaded ${this.allIterations.length} iterations`);
            
            // Auto-select current iteration if none selected
            if (this.selectedIterations.length === 0) {
                this.autoSelectCurrentIteration();
            }
            
            return this.allIterations;
        } catch (error) {
            console.error('Failed to load iterations:', error);
            throw error;
        }
    }

    autoSelectCurrentIteration() {
        const now = new Date();
        const currentIteration = this.allIterations.find(iteration => {
            const startDate = new Date(iteration.attributes?.startDate || '1970-01-01');
            const finishDate = new Date(iteration.attributes?.finishDate || '2099-12-31');
            return now >= startDate && now <= finishDate;
        });

        if (currentIteration) {
            this.selectedIterations = [currentIteration];
            this.updateGlobalDisplay();
        }
    }

    renderIterationsList() {
        const container = document.getElementById('iterationsList');
        
        if (this.allIterations.length === 0) {
            this.showEmptyState('No iterations found');
            return;
        }

        const iterationsHTML = this.allIterations.map(iteration => 
            this.renderIterationItem(iteration)
        ).join('');

        container.innerHTML = `
            <div class="iteration-items">
                ${iterationsHTML}
            </div>
        `;

        this.updateSelectedDisplay();
    }

    renderIterationItem(iteration) {
        const isSelected = this.isIterationSelected(iteration.id);
        const startDate = iteration.attributes?.startDate ? 
            new Date(iteration.attributes.startDate).toLocaleDateString() : 'Not set';
        const finishDate = iteration.attributes?.finishDate ? 
            new Date(iteration.attributes.finishDate).toLocaleDateString() : 'Not set';
        
        const now = new Date();
        const start = new Date(iteration.attributes?.startDate || '1970-01-01');
        const finish = new Date(iteration.attributes?.finishDate || '2099-12-31');
        
        let status = 'future';
        if (now >= start && now <= finish) {
            status = 'current';
        } else if (now > finish) {
            status = 'past';
        }

        return `
            <div class="iteration-item ${isSelected ? 'selected' : ''} status-${status}" 
                 data-iteration-id="${iteration.id}">
                <div class="iteration-info">
                    <div class="iteration-header">
                        <div class="iteration-name">${iteration.name}</div>
                        <div class="iteration-status status-${status}">
                            ${status === 'current' ? '🏃 Current' : 
                              status === 'past' ? '✅ Completed' : '📅 Future'}
                        </div>
                    </div>
                    <div class="iteration-dates">
                        <span class="date-range">${startDate} - ${finishDate}</span>
                        ${this.getIterationDuration(iteration)}
                    </div>
                </div>
                <div class="iteration-actions">
                    <input type="checkbox" 
                           class="iteration-checkbox" 
                           data-iteration-id="${iteration.id}"
                           ${isSelected ? 'checked' : ''}
                           ${this.dateRangeType === 'current' && status !== 'current' ? 'disabled' : ''}>
                </div>
            </div>
        `;
    }

    getIterationDuration(iteration) {
        if (!iteration.attributes?.startDate || !iteration.attributes?.finishDate) {
            return '';
        }

        const start = new Date(iteration.attributes.startDate);
        const finish = new Date(iteration.attributes.finishDate);
        const duration = Math.ceil((finish - start) / (1000 * 60 * 60 * 24));
        
        return `<span class="duration">(${duration} days)</span>`;
    }

    setupEventListeners() {
        // Date range type change
        const dateRangeSelect = document.getElementById('dateRangeType');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                this.handleDateRangeChange(e.target.value);
            });
        }

        // Custom date range inputs
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', () => this.handleCustomDateChange());
            endDateInput.addEventListener('change', () => this.handleCustomDateChange());
        }

        // Iteration selection
        document.addEventListener('change', (event) => {
            if (event.target.classList.contains('iteration-checkbox')) {
                const iterationId = event.target.dataset.iterationId;
                const isChecked = event.target.checked;
                this.handleIterationSelection(iterationId, isChecked);
            }
        });
    }

    handleDateRangeChange(rangeType) {
        this.dateRangeType = rangeType;
        
        // Show/hide custom date range
        const customDateRange = document.getElementById('customDateRange');
        if (customDateRange) {
            customDateRange.style.display = rangeType === 'custom' ? 'block' : 'none';
        }

        // Auto-select iterations based on range type
        this.autoSelectForDateRange(rangeType);
        
        // Update iteration list display
        if (this.allIterations.length > 0) {
            this.renderIterationsList();
        }
    }

    autoSelectForDateRange(rangeType) {
        let selectedIterations = [];
        const now = new Date();

        switch (rangeType) {
            case 'current':
                selectedIterations = this.allIterations.filter(iteration => {
                    const start = new Date(iteration.attributes?.startDate || '1970-01-01');
                    const finish = new Date(iteration.attributes?.finishDate || '2099-12-31');
                    return now >= start && now <= finish;
                });
                break;
                
            case 'last':
                const completedIterations = this.allIterations.filter(iteration => {
                    const finish = new Date(iteration.attributes?.finishDate || '2099-12-31');
                    return now > finish;
                });
                selectedIterations = completedIterations.slice(0, 1);
                break;
                
            case 'last3':
                selectedIterations = this.allIterations.slice(0, 3);
                break;
                
            case 'last6':
                selectedIterations = this.allIterations.slice(0, 6);
                break;
                
            case 'monthly':
                // Select iterations within current month
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                selectedIterations = this.allIterations.filter(iteration => {
                    const start = new Date(iteration.attributes?.startDate || '1970-01-01');
                    const finish = new Date(iteration.attributes?.finishDate || '2099-12-31');
                    return (start <= monthEnd && finish >= monthStart);
                });
                break;
                
            case 'quarterly':
                // Select iterations within current quarter
                const quarter = Math.floor(now.getMonth() / 3);
                const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
                const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                selectedIterations = this.allIterations.filter(iteration => {
                    const start = new Date(iteration.attributes?.startDate || '1970-01-01');
                    const finish = new Date(iteration.attributes?.finishDate || '2099-12-31');
                    return (start <= quarterEnd && finish >= quarterStart);
                });
                break;
        }

        this.selectedIterations = selectedIterations.slice(0, 6); // Max 6 for performance
        this.updateGlobalDisplay();
        this.notifySelectionChange();
    }

    handleCustomDateChange() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate) {
            this.customDateRange = { startDate, endDate };
            
            // Filter iterations within custom range
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            const selectedIterations = this.allIterations.filter(iteration => {
                const iterStart = new Date(iteration.attributes?.startDate || '1970-01-01');
                const iterEnd = new Date(iteration.attributes?.finishDate || '2099-12-31');
                return (iterStart <= end && iterEnd >= start);
            });

            this.selectedIterations = selectedIterations;
            this.updateGlobalDisplay();
            this.notifySelectionChange();
            
            if (this.allIterations.length > 0) {
                this.renderIterationsList();
            }
        }
    }

    handleIterationSelection(iterationId, isSelected) {
        const iteration = this.allIterations.find(i => i.id === iterationId);
        if (!iteration) return;

        if (isSelected) {
            if (!this.isIterationSelected(iterationId)) {
                this.selectedIterations.push(iteration);
            }
        } else {
            this.selectedIterations = this.selectedIterations.filter(i => i.id !== iterationId);
        }

        this.updateUI();
        this.notifySelectionChange();
    }

    updateUI() {
        // Update iteration items visual state
        document.querySelectorAll('.iteration-item').forEach(item => {
            const iterationId = item.dataset.iterationId;
            const isSelected = this.isIterationSelected(iterationId);
            item.classList.toggle('selected', isSelected);
        });

        // Update checkboxes state
        document.querySelectorAll('.iteration-checkbox').forEach(checkbox => {
            const iterationId = checkbox.dataset.iterationId;
            checkbox.checked = this.isIterationSelected(iterationId);
        });

        this.updateGlobalDisplay();
    }

    updateSelectedDisplay() {
        // Update the quick sprint filter dropdown
        const quickFilter = document.getElementById('quickSprintFilter');
        if (quickFilter) {
            quickFilter.innerHTML = '<option value="">Sprint Switcher</option>';
            
            this.selectedIterations.forEach(iteration => {
                const option = document.createElement('option');
                option.value = iteration.id;
                option.textContent = iteration.name;
                quickFilter.appendChild(option);
            });
        }
    }

    updateGlobalDisplay() {
        const globalDisplay = document.getElementById('currentSprint');
        if (globalDisplay) {
            if (this.selectedIterations.length === 0) {
                globalDisplay.textContent = 'Not Selected';
                globalDisplay.className = 'value not-configured';
            } else if (this.selectedIterations.length === 1) {
                globalDisplay.textContent = this.selectedIterations[0].name;
                globalDisplay.className = 'value configured';
            } else {
                globalDisplay.textContent = `${this.selectedIterations.length} Sprints`;
                globalDisplay.className = 'value configured';
            }
        }

        this.updateSelectedDisplay();
    }

    isIterationSelected(iterationId) {
        return this.selectedIterations.some(iteration => iteration.id === iterationId);
    }

    getSelectedIterations() {
        return [...this.selectedIterations];
    }

    getSelectedIterationPaths() {
        return this.selectedIterations.map(i => i.path);
    }

    notifySelectionChange() {
        const event = new CustomEvent('iterationSelectionChanged', {
            detail: {
                selectedIterations: this.getSelectedIterations(),
                iterationPaths: this.getSelectedIterationPaths(),
                dateRangeType: this.dateRangeType,
                customDateRange: this.customDateRange
            }
        });
        
        document.dispatchEvent(event);
    }

    // State management
    showLoading() {
        const container = document.getElementById('iterationsList');
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                Loading iterations...
            </div>
        `;
    }

    showEmptyState(message) {
        const container = document.getElementById('iterationsList');
        container.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('iterationsList');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
                <button class="btn btn-secondary" onclick="iterationSelector.initialize()">
                    Retry
                </button>
            </div>
        `;
    }

    // Configuration persistence
    saveToConfig(config) {
        config.selectedIterations = this.selectedIterations.map(iteration => ({
            id: iteration.id,
            name: iteration.name,
            path: iteration.path,
            startDate: iteration.attributes?.startDate,
            finishDate: iteration.attributes?.finishDate
        }));
        config.dateRangeType = this.dateRangeType;
        config.customDateRange = this.customDateRange;
    }

    loadFromConfig(config) {
        if (config.selectedIterations && Array.isArray(config.selectedIterations)) {
            this.selectedIterations = config.selectedIterations;
        }
        if (config.dateRangeType) {
            this.dateRangeType = config.dateRangeType;
        }
        if (config.customDateRange) {
            this.customDateRange = config.customDateRange;
        }
        this.updateGlobalDisplay();
    }
}

window.IterationSelector = IterationSelector; 