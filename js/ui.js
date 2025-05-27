// js/ui.js
const UI = {
    contentArea: document.getElementById('content-area'),
    headerTitle: document.getElementById('header-title'),
    headerActionButton: document.getElementById('header-action-button'),
    backButton: document.getElementById('back-button'), // HTML back button, not Telegram's
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    modalConfirmBtn: document.getElementById('modal-confirm'),
    modalCancelBtn: document.getElementById('modal-cancel'),
    loadingState: document.getElementById('loading-state'),

    init() {
        this.backButton.addEventListener('click', () => App.handleBackButton());
        this.modalCancelBtn.addEventListener('click', () => this.hideModal());
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) this.hideModal();
        });
    },

    setHeader(title, action = null) {
        this.headerTitle.textContent = title;
        if (action && action.text && action.onClick) {
            this.headerActionButton.textContent = action.text;
            this.headerActionButton.onclick = action.onClick; // Overwrite previous
            this.headerActionButton.classList.remove('hidden');
        } else {
            this.headerActionButton.classList.add('hidden');
            this.headerActionButton.onclick = null;
        }
    },

    showHTMLBackButton() {
        this.backButton.classList.remove('hidden');
        TelegramService.hideBackButton(); // Hide SDK one if our HTML one is shown
    },

    hideHTMLBackButton() {
        this.backButton.classList.add('hidden');
        // SDK back button visibility managed by App based on history stack
    },

    showLoading() {
        this.contentArea.innerHTML = ''; // Clear previous content
        this.loadingState.classList.remove('hidden');
        this.contentArea.appendChild(this.loadingState);
    },

    hideLoading() {
       if (this.contentArea.contains(this.loadingState)) {
            this.contentArea.removeChild(this.loadingState);
        }
    },

    renderPage(htmlContent) {
        this.hideLoading();
        // Basic transition - fade out old, fade in new
        this.contentArea.style.opacity = '0';
        setTimeout(() => {
            this.contentArea.innerHTML = htmlContent;
            this.contentArea.scrollTop = 0; // Scroll to top of new content
            this.contentArea.style.opacity = '1';
        }, 150); // Match this with CSS transition duration if any
    },

    showModal(title, bodyContent, confirmText = "OK", confirmCallback = null, showCancel = true) {
        this.modalTitle.textContent = title;
        if (typeof bodyContent === 'string') {
            this.modalBody.innerHTML = bodyContent;
        } else {
            this.modalBody.innerHTML = '';
            this.modalBody.appendChild(bodyContent);
        }
        this.modalConfirmBtn.textContent = confirmText;
        this.modalConfirmBtn.onclick = () => {
            if (confirmCallback) confirmCallback();
            this.hideModal();
        };
        this.modalCancelBtn.style.display = showCancel ? 'inline-block' : 'none';
        this.modalOverlay.classList.remove('hidden');
        TelegramService.impactOccurred('light');
    },

    hideModal() {
        this.modalOverlay.classList.add('hidden');
    },

    // --- Component Rendering Functions ---

    createItemCard(item, type) {
        let metaInfo = '';
        let actions = '';
        const user = Store.getUser();

        switch (type) {
            case 'idea':
                metaInfo = `
                    <div class="flex items-center text-sm text-tg-hint mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1"><path d="M1 5.75A.75.75 0 011.75 5h16.5a.75.75 0 010 1.5H1.75A.75.75 0 011 5.75zm0 5A.75.75 0 011.75 10h16.5a.75.75 0 010 1.5H1.75a.75.75 0 01-.75-.75zM1.75 15a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H1.75z" /></svg>
                        ${(item.upvotes || []).length} Upvotes   
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v10.25a.75.75 0 00.53.714l3.5 1.75a.75.75 0 00.94-.098l2.06-2.061a.75.75 0 00.03-.03l4.75-4.75a1.813 1.813 0 000-2.564l-2.563-2.564A1.813 1.813 0 0012.25 3H4.5zm4.751 8.11a.75.75 0 001.06 0l2.563-2.563a.312.312 0 000-.442L10.31 4.544a.75.75 0 00-1.06 0L6.688 7.107a.313.313 0 000 .442l2.563 2.562z" clip-rule="evenodd" /></svg>
                        ${(item.tags || []).join(', ')}
                    </div>`;
                actions = `<button class="text-tg-link text-sm mt-3" onclick="App.navigateTo('ideaDetail', { id: '${item.id}' })">View Details →</button>`;
                break;
            case 'petition':
                metaInfo = `
                    <div class="text-sm text-tg-hint mt-2">
                        ${(item.signatures || []).length} / ${item.targetSignatures || '?'} Signatures
                    </div>
                    <div class="w-full bg-tg-hint rounded-full h-1.5 mt-1 mb-2"><div class="bg-tg-link h-1.5 rounded-full" style="width: ${((item.signatures || []).length / (item.targetSignatures || 100)) * 100}%"></div></div>
                `;
                actions = `<button class="text-tg-link text-sm mt-3" onclick="App.navigateTo('petitionDetail', { id: '${item.id}' })">View & Sign →</button>`;
                break;
            case 'poll':
                const totalVotes = (item.options || []).reduce((sum, opt) => sum + (opt.votes || []).length, 0);
                metaInfo = `<div class="text-sm text-tg-hint mt-2">${totalVotes} Votes Cast</div>`;
                actions = `<button class="text-tg-link text-sm mt-3" onclick="App.navigateTo('pollDetail', { id: '${item.id}' })">View & Vote →</button>`;
                break;
        }

        return `
            <div class="card" data-id="${item.id}">
                <h3 class="card-title">${Utils.escapeHTML(item.title || item.question)}</h3>
                ${item.description ? `<p class="card-description">${Utils.escapeHTML(item.description.substring(0, 100))}${item.description.length > 100 ? '...' : ''}</p>` : ''}
                <p class="card-meta">By ${Utils.escapeHTML(item.authorName)} on ${Utils.formatDate(item.createdAt)}</p>
                ${metaInfo}
                ${actions}
            </div>
        `;
    },
    
    renderComment(comment) {
        return `
            <div class="comment p-3 mb-2 border-t border-tg-hint bg-tg-bg rounded-md">
                <p class="text-sm text-tg-text">${Utils.escapeHTML(comment.text)}</p>
                <p class="text-xs text-tg-hint mt-1">By ${Utils.escapeHTML(comment.userName)} on ${Utils.formatDate(comment.createdAt)}</p>
            </div>
        `;
    }
};