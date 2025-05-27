// js/store.js
const Store = {
    DB_KEY: 'communityVoiceData',
    data: {
        user: null,
        preferences: { notifications: true, locationEnabled: false, theme: 'auto' },
        ideas: [],
        petitions: [],
        polls: [],
        projects: [] // Basic project tracking
    },

    async init() {
        try {
            const localData = localStorage.getItem(this.DB_KEY);
            if (localData) {
                this.data = JSON.parse(localData);
            } else {
                // Load sample data if nothing in localStorage
                const response = await fetch('sample-data.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const sampleData = await response.json();
                this.data = { ...this.data, ...sampleData }; // Merge, keeping existing user/prefs if any
                this.save();
            }
        } catch (error) {
            console.error("Error initializing store:", error);
            // Fallback to empty structure or default sample data in case of fetch error
            this.data = {
                user: null, preferences: { notifications: true, locationEnabled: false, theme: 'auto' },
                ideas: [], petitions: [], polls: [], projects: []
            };
        }
    },

    save() {
        try {
            localStorage.setItem(this.DB_KEY, JSON.stringify(this.data));
        } catch (error) {
            console.error("Error saving to localStorage:", error);
            TelegramService.showAlert("Could not save data. Storage might be full.");
        }
    },

    // --- User & Preferences ---
    setCurrentUser(tgUser) {
        this.data.user = {
            id: tgUser.id,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name || '',
            username: tgUser.username || '',
            photoUrl: tgUser.photo_url || null
        };
        this.save();
    },
    getUser() {
        return this.data.user;
    },
    updatePreferences(newPrefs) {
        this.data.preferences = { ...this.data.preferences, ...newPrefs };
        this.save();
        // console.log("Preferences updated:", this.data.preferences);
    },
    getPreferences() {
        return this.data.preferences;
    },

    // --- Generic CRUD ---
    _getCollection(type) {
        if (!this.data[type]) {
            console.error(`Collection type "${type}" does not exist.`);
            this.data[type] = []; // Create if not exist
        }
        return this.data[type];
    },

    getAll(type) {
        return this._getCollection(type);
    },

    getById(type, id) {
        return this._getCollection(type).find(item => item.id === id);
    },

    add(type, item) {
        const collection = this._getCollection(type);
        const newItem = { 
            id: Utils.generateId(), 
            createdAt: new Date().toISOString(),
            authorId: this.data.user ? this.data.user.id : 'anonymous',
            authorName: this.data.user ? (this.data.user.firstName + ' ' + this.data.user.lastName).trim() : 'Anonymous',
            ...item 
        };
        collection.push(newItem);
        this.save();
        TelegramService.impactOccurred('light');
        return newItem;
    },

    update(type, id, updates) {
        const collection = this._getCollection(type);
        const index = collection.findIndex(item => item.id === id);
        if (index !== -1) {
            collection[index] = { ...collection[index], ...updates, updatedAt: new Date().toISOString() };
            this.save();
            TelegramService.impactOccurred('light');
            return collection[index];
        }
        return null;
    },

    delete(type, id) {
        const collection = this._getCollection(type);
        const initialLength = collection.length;
        this.data[type] = collection.filter(item => item.id !== id);
        if (this.data[type].length < initialLength) {
            this.save();
            TelegramService.impactOccurred('rigid');
            return true;
        }
        return false;
    },

    // --- Specific Actions ---
    // Example: Upvote an idea
    toggleUpvoteIdea(ideaId, userId) {
        const idea = this.getById('ideas', ideaId);
        if (idea) {
            if (!idea.upvotes) idea.upvotes = [];
            const userIndex = idea.upvotes.indexOf(userId);
            if (userIndex > -1) {
                idea.upvotes.splice(userIndex, 1); // Remove upvote
            } else {
                idea.upvotes.push(userId); // Add upvote
            }
            this.update('ideas', ideaId, { upvotes: idea.upvotes });
            return idea.upvotes.includes(userId);
        }
        return false;
    },

    addComment(type, itemId, commentText, userId, userName) {
        const item = this.getById(type, itemId);
        if (item) {
            if (!item.comments) item.comments = [];
            const newComment = {
                id: Utils.generateId(),
                userId: userId,
                userName: userName,
                text: commentText,
                createdAt: new Date().toISOString()
            };
            item.comments.push(newComment);
            this.update(type, itemId, { comments: item.comments });
            return newComment;
        }
        return null;
    },

    signPetition(petitionId, userId) {
        const petition = this.getById('petitions', petitionId);
        if (petition) {
            if (!petition.signatures) petition.signatures = [];
            if (!petition.signatures.includes(userId)) {
                petition.signatures.push(userId);
                this.update('petitions', petitionId, { signatures: petition.signatures });
                return true;
            }
        }
        return false;
    },
    
    votePoll(pollId, optionId, userId) {
        const poll = this.getById('polls', pollId);
        if (poll) {
            if(!poll.votedBy) poll.votedBy = [];
            if (poll.votedBy.includes(userId)) {
                TelegramService.showAlert("You have already voted in this poll.");
                return false; // User already voted
            }

            const option = poll.options.find(opt => opt.id === optionId);
            if (option) {
                if(!option.votes) option.votes = [];
                option.votes.push(userId);
                poll.votedBy.push(userId);
                this.update('polls', pollId, { options: poll.options, votedBy: poll.votedBy });
                return true;
            }
        }
        return false;
    },

    // --- Search & Filter (Basic examples) ---
    searchItems(type, searchTerm) {
        const collection = this.getAll(type);
        if (!searchTerm) return collection;
        searchTerm = searchTerm.toLowerCase();
        return collection.filter(item => 
            (item.title && item.title.toLowerCase().includes(searchTerm)) ||
            (item.description && item.description.toLowerCase().includes(searchTerm)) ||
            (item.question && item.question.toLowerCase().includes(searchTerm)) // For polls
        );
    }
};