/**
 * Board Selector Component - Production Implementation
 * Handles multi-board selection with ADO API integration
 */
class BoardSelector {
    constructor(adoClient) {
        this.adoClient = adoClient;
        this.selectedBoards = [];
        this.maxBoards = 3;
        this.boards = [];
    }

    async initialize() {
        try {
            await this.loadBoards();
            this.renderBoardsList();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize BoardSelector:', error);
            this.showError('Failed to load boards. Please check your connection.');
        }
    }

    async loadBoards() {
        if (!this.adoClient) {
            throw new Error('ADO Client not initialized');
        }

        try {
            const boardsResponse = await this.adoClient.getBoards();
            this.boards = boardsResponse.value || [];
            console.log(`Loaded ${this.boards.length} boards`);
            return this.boards;
        } catch (error) {
            console.error('Failed to load boards:', error);
            throw error;
        }
    }

    renderBoardsList() {
        const container = document.getElementById('boardsList');
        
        if (this.boards.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No boards found in this project.</p>
                    <button class="btn btn-secondary" onclick="boardSelector.loadBoards()">
                        Retry
                    </button>
                </div>
            `;
            return;
        }

        const boardsHTML = this.boards.map(board => `
            <div class="board-item ${this.isBoardSelected(board.id) ? 'selected' : ''}" 
                 data-board-id="${board.id}">
                <div class="board-info">
                    <div class="board-name">${board.name}</div>
                    <div class="board-details">
                        <span class="board-type">${board.boardType || 'Kanban'}</span>
                    </div>
                </div>
                <div class="board-actions">
                    <input type="checkbox" 
                           class="board-checkbox" 
                           data-board-id="${board.id}"
                           ${this.isBoardSelected(board.id) ? 'checked' : ''}
                           ${this.selectedBoards.length >= this.maxBoards && !this.isBoardSelected(board.id) ? 'disabled' : ''}>
                </div>
            </div>
        `).join('');

        container.innerHTML = boardsHTML;
        this.updateSelectedDisplay();
    }

    setupEventListeners() {
        const container = document.getElementById('boardsList');
        
        container.addEventListener('change', (event) => {
            if (event.target.classList.contains('board-checkbox')) {
                const boardId = event.target.dataset.boardId;
                const isChecked = event.target.checked;
                this.handleBoardSelection(boardId, isChecked);
            }
        });
    }

    handleBoardSelection(boardId, isSelected) {
        const board = this.boards.find(b => b.id === boardId);
        if (!board) return;

        if (isSelected) {
            if (this.selectedBoards.length < this.maxBoards) {
                this.selectedBoards.push(board);
            } else {
                const checkbox = document.querySelector(`[data-board-id="${boardId}"]`);
                if (checkbox) checkbox.checked = false;
                this.showNotification('Maximum 3 boards can be selected', 'warning');
                return;
            }
        } else {
            this.selectedBoards = this.selectedBoards.filter(b => b.id !== boardId);
        }

        this.updateUI();
        this.notifySelectionChange();
    }

    updateUI() {
        document.querySelectorAll('.board-item').forEach(item => {
            const boardId = item.dataset.boardId;
            const isSelected = this.isBoardSelected(boardId);
            item.classList.toggle('selected', isSelected);
        });

        document.querySelectorAll('.board-checkbox').forEach(checkbox => {
            const boardId = checkbox.dataset.boardId;
            const isSelected = this.isBoardSelected(boardId);
            checkbox.checked = isSelected;
            checkbox.disabled = this.selectedBoards.length >= this.maxBoards && !isSelected;
        });

        this.updateSelectedDisplay();
        this.updateGlobalDisplay();
    }

    updateSelectedDisplay() {
        const container = document.getElementById('selectedBoards');
        const countElement = container.previousElementSibling.querySelector('h4');
        
        countElement.textContent = `Selected Boards (${this.selectedBoards.length}/${this.maxBoards})`;
        
        if (this.selectedBoards.length === 0) {
            container.innerHTML = '<p class="no-selection">No boards selected</p>';
            return;
        }

        const selectedHTML = this.selectedBoards.map(board => `
            <div class="selected-item" data-board-id="${board.id}">
                <div class="item-info">
                    <div class="item-name">${board.name}</div>
                    <div class="item-type">${board.boardType || 'Kanban'}</div>
                </div>
                <button class="remove-btn" onclick="boardSelector.removeBoard('${board.id}')">
                    ×
                </button>
            </div>
        `).join('');

        container.innerHTML = selectedHTML;
    }

    updateGlobalDisplay() {
        const globalDisplay = document.getElementById('currentBoards');
        if (globalDisplay) {
            if (this.selectedBoards.length === 0) {
                globalDisplay.textContent = 'Not Selected';
                globalDisplay.className = 'value not-configured';
            } else {
                const names = this.selectedBoards.map(b => b.name);
                globalDisplay.textContent = names.join(', ');
                globalDisplay.className = 'value configured';
            }
        }

        this.updateQuickFilter();
    }

    updateQuickFilter() {
        const quickFilter = document.getElementById('quickBoardFilter');
        if (quickFilter) {
            quickFilter.innerHTML = '<option value="">Board Switcher</option>';
            
            this.selectedBoards.forEach(board => {
                const option = document.createElement('option');
                option.value = board.id;
                option.textContent = board.name;
                quickFilter.appendChild(option);
            });
        }
    }

    removeBoard(boardId) {
        this.selectedBoards = this.selectedBoards.filter(b => b.id !== boardId);
        this.updateUI();
        this.notifySelectionChange();
    }

    isBoardSelected(boardId) {
        return this.selectedBoards.some(board => board.id === boardId);
    }

    getSelectedBoards() {
        return [...this.selectedBoards];
    }

    notifySelectionChange() {
        const event = new CustomEvent('boardSelectionChanged', {
            detail: {
                selectedBoards: this.getSelectedBoards(),
                boardIds: this.selectedBoards.map(b => b.id)
            }
        });
        
        document.dispatchEvent(event);
        this.triggerDependentUpdates();
    }

    triggerDependentUpdates() {
        if (window.resourceSelector) {
            window.resourceSelector.onBoardsChanged(this.selectedBoards);
        }
        
        if (window.iterationSelector) {
            window.iterationSelector.onBoardsChanged(this.selectedBoards);
        }
    }

    showError(message) {
        const container = document.getElementById('boardsList');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
                <button class="btn btn-secondary" onclick="boardSelector.initialize()">
                    Retry
                </button>
            </div>
        `;
    }

    showNotification(message, type = 'info') {
        if (window.notificationManager) {
            window.notificationManager.show(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    saveToConfig(config) {
        config.selectedBoards = this.selectedBoards.map(board => ({
            id: board.id,
            name: board.name,
            boardType: board.boardType
        }));
    }

    loadFromConfig(config) {
        if (config.selectedBoards && Array.isArray(config.selectedBoards)) {
            this.selectedBoards = config.selectedBoards.slice(0, this.maxBoards);
            this.updateUI();
        }
    }
}

window.BoardSelector = BoardSelector; 