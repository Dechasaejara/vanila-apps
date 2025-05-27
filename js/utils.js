// js/utils.js
const Utils = {
    generateId: () => Math.random().toString(36).substr(2, 9),

    formatDate: (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    },

    // Basic debounce function
    debounce: (func, delay) => {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    },

    // Escape HTML to prevent XSS
    escapeHTML: (str) => {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, function (match) {
            return {
                '&': '&',
                '<': '<',
                '>': '>',
                '"': '"',
                "'": "'"
            }[match];
        });
    },

    // Get query parameter
    getQueryParam: (name) => {
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        return urlParams.get(name);
    },

    // Simple history stack
    historyStack: [],
    pushHistory: (path, state = {}) => {
        Utils.historyStack.push({ path, state });
        window.location.hash = path;
        // console.log('Pushed to history:', path, Utils.historyStack);
    },
    popHistory: () => {
        if (Utils.historyStack.length > 1) {
            Utils.historyStack.pop(); // Pop current
            const previous = Utils.historyStack[Utils.historyStack.length - 1]; // Get previous
            window.location.hash = previous.path; // This will trigger hashchange
            // console.log('Popped. New path:', previous.path, Utils.historyStack);
            return previous;
        } else if (Utils.historyStack.length === 1) {
            // If only one item, it means we are at a main tab.
            // Closing the app is handled by Telegram's BackButton if stack is empty.
            // console.log('History stack has 1 item. Let Telegram handle back.');
            return null; 
        }
        return null;
    },
    clearHistory: (basePath) => {
        Utils.historyStack = [{ path: basePath, state: {} }];
        window.location.hash = basePath;
        // console.log('History cleared to:', basePath, Utils.historyStack);
    },
    getCurrentHistoryPath: () => {
        return Utils.historyStack.length > 0 ? Utils.historyStack[Utils.historyStack.length - 1].path : '';
    }
};