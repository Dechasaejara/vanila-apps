// js/app.js
const App = {
  currentView: null,
  searchTimeout: null,

  async init() {
    console.log("App initializing...");
    UI.init();
    UI.showLoading(); // Show skeleton loader

    try {
      await Store.init(); // Load data from localStorage or sample JSON
      TelegramService.init({
        onUserReady: (tgUser) => {
          AuthService.init(); // Initialize auth after TG user data is confirmed
          this.setupNavigation();
          this.handleInitialRoute(); // Route after everything is ready
        },
      });
    } catch (error) {
      console.error("Initialization failed:", error);
      UI.hideLoading();
      UI.renderPage(`<div class="p-6 text-center text-red-500">
                <h2 class="text-xl font-semibold mb-2">Initialization Error</h2>
                <p>Could not load CommunityVoice. Please try again later.</p>
                <p class="text-sm mt-2">${Utils.escapeHTML(error.message)}</p>
            </div>`);
      TelegramService.tg.MainButton.setText("Try Again")
        .onClick(() => window.location.reload())
        .show();
    }
  },

  setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const target = item.dataset.target;
        this.navigateTo(target);

        navItems.forEach((i) => i.classList.remove("active", "text-tg-link"));
        navItems.forEach((i) => i.classList.add("text-tg-hint"));

        item.classList.add("active", "text-tg-link");
        item.classList.remove("text-tg-hint");
        TelegramService.impactOccurred("light");
      });
    });

    // Handle hash changes for navigation (e.g. back/forward browser buttons, deep links)
    window.addEventListener("hashchange", this.handleHashChange.bind(this));
  },

  handleInitialRoute() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const [path, queryParams] = hash.split("?");
      const params = {};
      if (queryParams) {
        new URLSearchParams(queryParams).forEach((value, key) => {
          params[key] = value;
        });
      }
      // console.log("Initial route from hash:", path, params);
      this.route(path, params, true); // true for isInitialRoute
    } else {
      // console.log("No hash, navigating to default 'ideas'");
      this.navigateTo("ideas"); // Default view
    }
  },

  handleHashChange() {
    // This is triggered by Utils.pushHistory, Utils.popHistory, or browser navigation
    const hash = window.location.hash.substring(1);
    // console.log("Hash changed to:", hash);
    if (!hash) {
      // If hash becomes empty, go to default
      this.navigateTo("ideas"); // Or your default route
      return;
    }

    // Check if this hash matches the top of our history stack.
    // If not, it means browser navigation (back/forward) happened.
    const currentHistoryPath = Utils.getCurrentHistoryPath();
    if (
      hash !==
      currentHistoryPath.split("?")[0] +
        (currentHistoryPath.split("?")[1]
          ? "?" + currentHistoryPath.split("?")[1]
          : "")
    ) {
      // console.log("Hashchange doesn't match history top. Browser nav occurred. Re-routing.");
      const [path, queryParams] = hash.split("?");
      const params = {};
      if (queryParams) {
        new URLSearchParams(queryParams).forEach((value, key) => {
          params[key] = value;
        });
      }
      // We need to rebuild the history stack if the user jumped via browser history
      // For simplicity in MVP, we'll just route. A more robust solution might try to match to existing stack.
      Utils.historyStack = [{ path: hash, state: params }]; // Reset history to current hash
      this.route(path, params);
    } else {
      // console.log("Hashchange matches history top. Likely internal navigation. Routing.");
      const [path, queryParams] = hash.split("?");
      const params = {};
      if (queryParams) {
        new URLSearchParams(queryParams).forEach((value, key) => {
          params[key] = value;
        });
      }
      this.route(path, params);
    }
  },

  navigateTo(view, params = {}, replaceHistory = false) {
    const queryStr =
      Object.keys(params).length > 0
        ? "?" + new URLSearchParams(params).toString()
        : "";
    const fullPath = view + queryStr;

    if (replaceHistory || Utils.historyStack.length === 0) {
      Utils.historyStack = [{ path: fullPath, state: params }];
      window.location.hash = fullPath; // This will trigger hashchange if different
    } else {
      // Only push if it's a new path or params are different
      const currentPathObj = Utils.historyStack[Utils.historyStack.length - 1];
      if (currentPathObj.path !== fullPath) {
        Utils.pushHistory(fullPath, params); // This sets hash and triggers hashchange
      } else {
        // If same path, just re-route without adding to history (e.g. refresh)
        this.route(view, params);
      }
    }
    // Actual rendering happens in route() via hashchange
  },

  route(view, params = {}, isInitialRoute = false) {
    // console.log("Routing to:", view, "with params:", params);
    UI.showLoading(); // Show loading state before rendering new view
    this.currentView = view;
    this.currentParams = params;

    // Update active tab
    document.querySelectorAll(".nav-item").forEach((item) => {
      const mainView = view.split("/")[0]; // e.g. ideas/new -> ideas
      item.classList.toggle("active", item.dataset.target === mainView);
      item.classList.toggle("text-tg-link", item.dataset.target === mainView);
      item.classList.toggle("text-tg-hint", item.dataset.target !== mainView);
    });

    // Default: Hide MainButton, it will be shown by specific views if needed
    TelegramService.hideMainButton();

    // Basic routing logic
    setTimeout(() => {
      // Simulate network delay for loading effect
      try {
        switch (view) {
          case "ideas":
            this.renderIdeasPage();
            break;
          case "ideaDetail":
            this.renderIdeaDetailPage(params.id);
            break;
          case "newIdea":
            this.renderNewIdeaForm();
            break;
          case "petitions":
            this.renderPetitionsPage();
            break;
          case "petitionDetail":
            this.renderPetitionDetailPage(params.id);
            break;
          case "newPetition":
            this.renderNewPetitionForm();
            break;
          case "polls":
            this.renderPollsPage();
            break;
          case "pollDetail":
            this.renderPollDetailPage(params.id);
            break;
          case "newPoll":
            this.renderNewPollForm();
            break;
          case "projects":
            this.renderProjectsPage();
            break; // Placeholder
          case "profile":
            AuthService.renderProfilePage();
            break;
          default:
            UI.renderPage(
              `<div class="p-6 text-center">Page not found: ${Utils.escapeHTML(
                view
              )}</div>`
            );
            UI.setHeader("Not Found");
        }
      } catch (error) {
        console.error("Error rendering page:", view, error);
        TelegramService.notificationOccurred("error");
        UI.renderPage(
          `<div class="p-6 text-red-500">Error loading page: ${Utils.escapeHTML(
            error.message
          )}</div>`
        );
      } finally {
        this.updateBackButtonVisibility();
      }
    }, 100); // Small delay for skeleton visibility
  },

  updateBackButtonVisibility() {
    // console.log("History stack for back button:", Utils.historyStack);
    if (Utils.historyStack.length > 1) {
      // We have a history within the app
      // UI.showHTMLBackButton(); // Use this if you prefer an HTML back button
      TelegramService.showBackButton(); // Use Telegram's native back button
      UI.hideHTMLBackButton();
    } else {
      // No app history, Telegram will handle closing or going back from external link
      // UI.hideHTMLBackButton();
      TelegramService.hideBackButton();
    }
  },

  handleBackButton() {
    TelegramService.impactOccurred("light");
    const previous = Utils.popHistory(); // This will trigger hashchange, which calls route()
    if (!previous && Utils.historyStack.length <= 1) {
      // If popHistory returns null (stack was or became 1 deep),
      // and SDK BackButton was shown, it means Telegram should close the app.
      // The SDK's BackButton.onClick event handles this logic. If stack is empty, it closes.
      // For our HTML button, or if we want explicit close:
      // TelegramService.closeApp();
      // console.log("No more app history, Telegram will handle back (close).");
    }
  },

  // --- Page Rendering Functions ---
  createSearchBox(type, currentSearchTerm = "") {
    return `
            <div class="p-4 sticky top-0 bg-tg-bg z-10 -mx-0.5">
                <input type="search" id="${type}-search" placeholder="Search ${type}..." 
                       value="${Utils.escapeHTML(currentSearchTerm)}"
                       class="form-input w-full" 
                       oninput="App.handleSearch('${type}', this.value)">
            </div>
        `;
  },

  handleSearch(type, term) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      // Re-render the current list page with the search term
      // This assumes the list rendering function can accept a search term
      switch (type) {
        case "ideas":
          this.renderIdeasPage(term);
          break;
        case "petitions":
          this.renderPetitionsPage(term);
          break;
        case "polls":
          this.renderPollsPage(term);
          break;
        // Add other searchable types if needed
      }
    }, 300); // Debounce search input
  },

  renderIdeasPage(searchTerm = "") {
    UI.setHeader("Ideas", {
      text: "New Idea",
      onClick: () => this.navigateTo("newIdea"),
    });
    const ideas = Store.searchItems("ideas", searchTerm);
    let content = this.createSearchBox("ideas", searchTerm);
    if (ideas.length === 0) {
      content += `<p class="p-6 text-center text-tg-hint">${
        searchTerm
          ? "No ideas found matching your search."
          : "No ideas yet. Be the first to submit one!"
      }</p>`;
    } else {
      content +=
        `<div class="p-4 space-y-3">` +
        ideas.map((idea) => UI.createItemCard(idea, "idea")).join("") +
        `</div>`;
    }
    UI.renderPage(content);
    TelegramService.hideMainButton();
  },

  renderIdeaDetailPage(id) {
    const idea = Store.getById("ideas", id);
    if (!idea) {
      UI.renderPage('<p class="p-6">Idea not found.</p>');
      UI.setHeader("Error");
      return;
    }

    const user = Store.getUser();
    const hasUpvoted = user && idea.upvotes && idea.upvotes.includes(user.id);

    let content = `
        <div class="p-6">
            <h2 class="text-2xl font-bold mb-2 text-tg-text">${Utils.escapeHTML(
              idea.title
            )}</h2>
            <p class="text-sm text-tg-hint mb-4">By ${Utils.escapeHTML(
              idea.authorName
            )} on ${Utils.formatDate(idea.createdAt)}</p>
            <p class="text-tg-text mb-4 whitespace-pre-wrap">${Utils.escapeHTML(
              idea.description
            )}</p>
            <div class="flex items-center space-x-4 mb-6">
                <button id="upvoteBtn" class="button-primary flex items-center">
                    <span id="upvoteText">${
                      hasUpvoted ? "Upvoted" : "Upvote"
                    }</span>
                    (<span id="upvoteCount">${
                      (idea.upvotes || []).length
                    }</span>)
                </button>
                <button onclick="App.shareItem('idea', '${id}')" class="button-secondary">Share</button>
            </div>
            <h3 class="text-xl font-semibold mt-6 mb-3 text-tg-text">Comments (${
              (idea.comments || []).length
            })</h3>
            <div id="comments-list" class="space-y-2 mb-4">
                ${
                  idea.comments && idea.comments.length > 0
                    ? idea.comments.map((c) => UI.renderComment(c)).join("")
                    : '<p class="text-tg-hint">No comments yet.</p>'
                }
            </div>
            <textarea id="comment-text" class="form-input form-textarea" placeholder="Add your comment..."></textarea>
            <button id="addCommentBtn" class="button-primary mt-2 w-full">Add Comment</button>
        </div>
    `;
    UI.renderPage(content);
    UI.setHeader(
      Utils.escapeHTML(
        idea.title.substring(0, 25) + (idea.title.length > 25 ? "..." : "")
      )
    );

    setTimeout(() => {
      const upvoteBtn = document.getElementById("upvoteBtn");
      if (upvoteBtn) {
        upvoteBtn.addEventListener("click", () => {
          if (!user) {
            TelegramService.showAlert("Please login via Telegram to upvote.");
            return;
          }
          const currentlyUpvoted = Store.toggleUpvoteIdea(id, user.id);
          document.getElementById("upvoteText").textContent = currentlyUpvoted
            ? "Upvoted"
            : "Upvote";
          document.getElementById("upvoteCount").textContent = Store.getById(
            "ideas",
            id
          ).upvotes.length;
          TelegramService.impactOccurred(currentlyUpvoted ? "medium" : "light");
        });
      }

      const addCommentBtn = document.getElementById("addCommentBtn");
      if (addCommentBtn) {
        addCommentBtn.addEventListener("click", () => {
          if (!user) {
            TelegramService.showAlert("Please login via Telegram to comment.");
            return;
          }
          const commentText = document
            .getElementById("comment-text")
            .value.trim();
          if (commentText) {
            const newComment = Store.addComment(
              "ideas",
              id,
              commentText,
              user.id,
              (user.firstName + " " + user.lastName).trim()
            );
            if (newComment) {
              document
                .getElementById("comments-list")
                .insertAdjacentHTML("beforeend", UI.renderComment(newComment));
              document.getElementById("comment-text").value = "";
              TelegramService.impactOccurred("medium");
            }
          }
        });
      }
    }, 0);
  },

  renderNewIdeaForm() {
    UI.setHeader("Submit New Idea");
    const prefs = Store.getPreferences();
    let content = `
            <div class="p-6 space-y-4">
                <div>
                    <label for="idea-title" class="form-label">Title</label>
                    <input type="text" id="idea-title" class="form-input" placeholder="e.g., Community Cleanup Day">
                </div>
                <div>
                    <label for="idea-description" class="form-label">Description</label>
                    <textarea id="idea-description" class="form-input form-textarea" placeholder="Describe your idea in detail..."></textarea>
                </div>
                <div>
                    <label for="idea-tags" class="form-label">Tags (comma-separated)</label>
                    <input type="text" id="idea-tags" class="form-input" placeholder="e.g., environment, volunteering, park">
                </div>
                <div>
                    <label for="idea-location-name" class="form-label">Location Name (Optional)</label>
                    <input type="text" id="idea-location-name" class="form-input" placeholder="e.g., Central Park">
                </div>
                <div class="flex items-center">
                    <input type="checkbox" id="idea-use-geolocation" class="form-checkbox h-5 w-5 text-tg-link rounded focus:ring-tg-link mr-2" ${
                      prefs.locationEnabled ? "checked" : ""
                    }>
                    <label for="idea-use-geolocation" class="text-tg-text">Use current location (if available & permitted)</label>
                </div>
                 <p class="text-xs text-tg-hint -mt-2 mb-3">Note: Location preference can be changed in Profile.</p>
            </div>
        `;
    UI.renderPage(content);
    TelegramService.showMainButton(
      "Submit Idea",
      this.handleSubmitNewIdea.bind(this)
    );
  },

  handleSubmitNewIdea() {
    TelegramService.impactOccurred("heavy");
    const title = document.getElementById("idea-title").value.trim();
    const description = document
      .getElementById("idea-description")
      .value.trim();
    const tags = document
      .getElementById("idea-tags")
      .value.split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    const locationName = document
      .getElementById("idea-location-name")
      .value.trim();
    const useGeolocation = document.getElementById(
      "idea-use-geolocation"
    ).checked;

    if (!title || !description) {
      TelegramService.showAlert("Title and Description are required.");
      TelegramService.notificationOccurred("error");
      return;
    }

    const newIdeaData = {
      title,
      description,
      tags,
      location: { name: locationName },
      upvotes: [],
      comments: [],
    };

    const completeSubmission = (locationData = null) => {
      if (locationData) {
        newIdeaData.location.latitude = locationData.latitude;
        newIdeaData.location.longitude = locationData.longitude;
        if (!locationName) newIdeaData.location.name = "Current Location"; // Default name if GPS used and no manual name
      }
      const idea = Store.add("ideas", newIdeaData);
      TelegramService.notificationOccurred("success");
      TelegramService.showAlert("Idea submitted successfully!");
      this.navigateTo("ideaDetail", { id: idea.id }, true); // Replace history to prevent back to form
    };

    if (useGeolocation && Store.getPreferences().locationEnabled) {
      UI.showLoading(); // Show loading while getting location
      TelegramService.requestLocation((err, coords) => {
        UI.hideLoading();
        if (err) {
          TelegramService.showAlert(
            "Could not get location, submitting without precise coordinates. You can grant permission in your device settings or browser."
          );
          completeSubmission();
        } else {
          completeSubmission(coords);
        }
      });
    } else {
      completeSubmission();
    }
  },

  // Petitions
  renderPetitionsPage(searchTerm = "") {
    UI.setHeader("Petitions", {
      text: "New Petition",
      onClick: () => this.navigateTo("newPetition"),
    });
    const petitions = Store.searchItems("petitions", searchTerm);
    let content = this.createSearchBox("petitions", searchTerm);
    if (petitions.length === 0) {
      content += `<p class="p-6 text-center text-tg-hint">${
        searchTerm ? "No petitions found." : "No petitions yet. Start one!"
      }</p>`;
    } else {
      content +=
        `<div class="p-4 space-y-3">` +
        petitions.map((p) => UI.createItemCard(p, "petition")).join("") +
        `</div>`;
    }
    UI.renderPage(content);
    TelegramService.hideMainButton();
  },
  renderPetitionDetailPage(id) {
    const petition = Store.getById("petitions", id);
    if (!petition) {
      UI.renderPage('<p class="p-6">Petition not found.</p>');
      UI.setHeader("Error");
      return;
    }

    const user = Store.getUser();
    const hasSigned =
      user && petition.signatures && petition.signatures.includes(user.id);

    let content = `
            <div class="p-6">
                <h2 class="text-2xl font-bold mb-2 text-tg-text">${Utils.escapeHTML(
                  petition.title
                )}</h2>
                <p class="text-sm text-tg-hint mb-4">By ${Utils.escapeHTML(
                  petition.authorName
                )} on ${Utils.formatDate(petition.createdAt)}</p>
                <p class="text-tg-text mb-4 whitespace-pre-wrap">${Utils.escapeHTML(
                  petition.description
                )}</p>
                <button id="signPetitionBtn" class="button-primary w-full mb-4 ${
                  hasSigned ? "opacity-50 cursor-not-allowed" : ""
                }" ${hasSigned ? "disabled" : ""}>
                    ${hasSigned ? "You Signed This" : "Sign Petition"}
                </button>
                <button onclick="App.shareItem('petition', '${id}')" class="button-secondary w-full">Share Petition</button>
                <h3 class="text-xl font-semibold mt-6 mb-3 text-tg-text">Comments (${
                  (petition.comments || []).length
                })</h3>
                <div id="comments-list" class="space-y-2 mb-4">
                    ${
                      petition.comments && petition.comments.length > 0
                        ? petition.comments
                            .map((c) => UI.renderComment(c))
                            .join("")
                        : '<p class="text-tg-hint">No comments yet.</p>'
                    }
                </div>
                <textarea id="comment-text" class="form-input form-textarea" placeholder="Add your comment..."></textarea>
                <button id="addCommentBtnPet" class="button-primary mt-2 w-full">Add Comment</button>
            </div>
        `;
    UI.renderPage(content);
    UI.setHeader("Petition Details");

    setTimeout(() => {
      const signPetitionBtn = document.getElementById("signPetitionBtn");
      if (signPetitionBtn && !hasSigned) {
        signPetitionBtn.addEventListener("click", () => {
          if (!user) {
            TelegramService.showAlert("Please login via Telegram to sign.");
            return;
          }
          if (Store.signPetition(id, user.id)) {
            TelegramService.notificationOccurred("success");
            TelegramService.showAlert("Petition signed!");
            this.route("petitionDetail", { id }); // Re-render to update UI
          } else {
            TelegramService.notificationOccurred("error");
          }
        });
      }

      const addCommentBtnPet = document.getElementById("addCommentBtnPet");
      if (addCommentBtnPet) {
        addCommentBtnPet.addEventListener("click", () => {
          if (!user) {
            TelegramService.showAlert("Please login via Telegram to comment.");
            return;
          }
          const commentText = document
            .getElementById("comment-text")
            .value.trim();
          if (commentText) {
            const newComment = Store.addComment(
              "petitions",
              id,
              commentText,
              user.id,
              (user.firstName + " " + user.lastName).trim()
            );
            if (newComment) {
              document
                .getElementById("comments-list")
                .insertAdjacentHTML("beforeend", UI.renderComment(newComment));
              document.getElementById("comment-text").value = "";
              TelegramService.impactOccurred("medium");
            }
          }
        });
      }
    }, 0);
  },
  renderNewPetitionForm() {
    UI.setHeader("Create New Petition");
    let content = `
            <div class="p-6 space-y-4">
                <div>
                    <label for="petition-title" class="form-label">Petition Title</label>
                    <input type="text" id="petition-title" class="form-input" placeholder="e.g., Install Traffic Light at Elm & Oak">
                </div>
                <div>
                    <label for="petition-description" class="form-label">Reason for Petition</label>
                    <textarea id="petition-description" class="form-input form-textarea" placeholder="Explain the issue and desired outcome..."></textarea>
                </div>
                <div>
                    <label for="petition-target" class="form-label">Target Signatures</label>
                    <input type="number" id="petition-target" class="form-input" placeholder="e.g., 500" min="10">
                </div>
            </div>
        `;
    UI.renderPage(content);
    TelegramService.showMainButton(
      "Create Petition",
      this.handleSubmitNewPetition.bind(this)
    );
  },
  handleSubmitNewPetition() {
    TelegramService.impactOccurred("heavy");
    const title = document.getElementById("petition-title").value.trim();
    const description = document
      .getElementById("petition-description")
      .value.trim();
    const targetSignatures = parseInt(
      document.getElementById("petition-target").value,
      10
    );

    if (!title || !description || !targetSignatures || targetSignatures < 10) {
      TelegramService.showAlert(
        "All fields are required, and target signatures must be at least 10."
      );
      TelegramService.notificationOccurred("error");
      return;
    }
    const petition = Store.add("petitions", {
      title,
      description,
      targetSignatures,
      signatures: [],
    });
    TelegramService.notificationOccurred("success");
    TelegramService.showAlert("Petition created successfully!");
    this.navigateTo("petitionDetail", { id: petition.id }, true);
  },

  // Polls
  renderPollsPage(searchTerm = "") {
    UI.setHeader("Polls", {
      text: "New Poll",
      onClick: () => this.navigateTo("newPoll"),
    });
    const polls = Store.searchItems("polls", searchTerm);
    let content = this.createSearchBox("polls", searchTerm);
    if (polls.length === 0) {
      content += `<p class="p-6 text-center text-tg-hint">${
        searchTerm ? "No polls found." : "No polls yet. Create one!"
      }</p>`;
    } else {
      content +=
        `<div class="p-4 space-y-3">` +
        polls.map((p) => UI.createItemCard(p, "poll")).join("") +
        `</div>`;
    }
    UI.renderPage(content);
    TelegramService.hideMainButton();
  },
  renderPollDetailPage(id) {
    const poll = Store.getById("polls", id);
    if (!poll) {
      UI.renderPage('<p class="p-6">Poll not found.</p>');
      UI.setHeader("Error");
      return;
    }

    const user = Store.getUser();
    const hasVoted = user && poll.votedBy && poll.votedBy.includes(user.id);
    const totalVotesInPoll = poll.options.reduce(
      (sum, opt) => sum + (opt.votes ? opt.votes.length : 0),
      0
    );

    let optionsHtml = poll.options
      .map((opt) => {
        const votesForOption = opt.votes ? opt.votes.length : 0;
        const percentage =
          totalVotesInPoll > 0
            ? ((votesForOption / totalVotesInPoll) * 100).toFixed(1)
            : 0;
        return `
                <div class="mb-3 p-3 rounded-lg ${
                  hasVoted
                    ? "bg-tg-secondary-bg"
                    : "bg-tg-bg border border-tg-hint cursor-pointer hover:bg-tg-secondary-bg"
                }" 
                     data-option-id="${opt.id}" ${
          !hasVoted ? `onclick="App.handlePollVote('${id}', '${opt.id}')"` : ""
        }>
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-tg-text font-medium">${Utils.escapeHTML(
                          opt.text
                        )}</span>
                        ${
                          hasVoted
                            ? `<span class="text-sm text-tg-link">${percentage}% (${votesForOption})</span>`
                            : ""
                        }
                    </div>
                    ${
                      hasVoted
                        ? `
                        <div class="w-full bg-tg-hint rounded-full h-1.5">
                            <div class="bg-tg-link h-1.5 rounded-full" style="width: ${percentage}%"></div>
                        </div>
                    `
                        : ""
                    }
                </div>
            `;
      })
      .join("");

    let content = `
            <div class="p-6">
                <h2 class="text-xl font-bold mb-1 text-tg-text">${Utils.escapeHTML(
                  poll.question
                )}</h2>
                <p class="text-sm text-tg-hint mb-4">By ${Utils.escapeHTML(
                  poll.authorName
                )} on ${Utils.formatDate(
      poll.createdAt
    )} • ${totalVotesInPoll} total votes</p>
                
                <div id="poll-options-container" class="space-y-2">
                    ${optionsHtml}
                </div>
                ${
                  hasVoted
                    ? '<p class="text-center text-sm text-tg-hint mt-4">You have already voted in this poll.</p>'
                    : ""
                }
                
                <button onclick="App.shareItem('poll', '${id}')" class="button-secondary w-full mt-6">Share Poll</button>
    
                <!-- Comments section -->
                <h3 class="text-xl font-semibold mt-6 mb-3 text-tg-text">Comments (${
                  (poll.comments || []).length
                })</h3>
                <div id="comments-list" class="space-y-2 mb-4">
                    ${
                      poll.comments && poll.comments.length > 0
                        ? poll.comments.map((c) => UI.renderComment(c)).join("")
                        : '<p class="text-tg-hint">No comments yet.</p>'
                    }
                </div>
                <textarea id="comment-text" class="form-input form-textarea" placeholder="Add your comment..."></textarea>
                <button id="addCommentBtnPoll" class="button-primary mt-2 w-full">Add Comment</button>
            </div>
        `;
    UI.renderPage(content);
    UI.setHeader("Poll Details");

    // Attach the event listener after ensuring the element exists
    setTimeout(() => {
      const addCommentBtnPoll = document.getElementById("addCommentBtnPoll");
      if (addCommentBtnPoll) {
        addCommentBtnPoll.addEventListener("click", () => {
          if (!user) {
            TelegramService.showAlert("Please login via Telegram to comment.");
            return;
          }
          const commentText = document
            .getElementById("comment-text")
            .value.trim();
          if (commentText) {
            const newComment = Store.addComment(
              "polls",
              id,
              commentText,
              user.id,
              (user.firstName + " " + user.lastName).trim()
            );
            if (newComment) {
              document
                .getElementById("comments-list")
                .insertAdjacentHTML("beforeend", UI.renderComment(newComment));
              document.getElementById("comment-text").value = "";
              TelegramService.impactOccurred("medium");
            }
          }
        });
      }
    }, 0);
  },
  handlePollVote(pollId, optionId) {
    const user = Store.getUser();
    if (!user) {
      TelegramService.showAlert("Please login via Telegram to vote.");
      return;
    }

    TelegramService.impactOccurred("medium");
    if (Store.votePoll(pollId, optionId, user.id)) {
      TelegramService.notificationOccurred("success");
      this.route("pollDetail", { id: pollId }); // Re-render to show results
    } else {
      // Store.votePoll might show its own alert if already voted
      // TelegramService.notificationOccurred('warning');
    }
  },
  renderNewPollForm() {
    UI.setHeader("Create New Poll");
    let content = `
            <div class="p-6 space-y-4">
                <div>
                    <label for="poll-question" class="form-label">Poll Question</label>
                    <input type="text" id="poll-question" class="form-input" placeholder="e.g., What's your favorite park feature?">
                </div>
                <div id="poll-options">
                    <div>
                        <label class="form-label">Option 1</label>
                        <input type="text" name="poll-option" class="form-input poll-option-input" placeholder="Option text">
                    </div>
                    <div>
                        <label class="form-label">Option 2</label>
                        <input type="text" name="poll-option" class="form-input poll-option-input" placeholder="Option text">
                    </div>
                </div>
                <button id="add-poll-option" class="button-secondary text-sm py-2 w-full">Add Another Option</button>
            </div>
        `;
    UI.renderPage(content);

    // Attach the event listener after the DOM is updated
    setTimeout(() => {
      const addPollOptionButton = document.getElementById("add-poll-option");
      if (addPollOptionButton) {
        addPollOptionButton.addEventListener("click", () => {
          const optionCount =
            document.querySelectorAll(".poll-option-input").length + 1;
          if (optionCount > 10) {
            // Max 10 options
            TelegramService.showAlert("Maximum of 10 options allowed.");
            return;
          }
          const newOptionDiv = document.createElement("div");
          newOptionDiv.innerHTML = `
                        <label class="form-label">Option ${optionCount}</label>
                        <input type="text" name="poll-option" class="form-input poll-option-input" placeholder="Option text">
                    `;
          document.getElementById("poll-options").appendChild(newOptionDiv);
          TelegramService.impactOccurred("light");
        });
      }
    }, 0);

    TelegramService.showMainButton(
      "Create Poll",
      this.handleSubmitNewPoll.bind(this)
    );
  },
  handleSubmitNewPoll() {
    TelegramService.impactOccurred("heavy");
    const question = document.getElementById("poll-question").value.trim();
    const optionInputs = document.querySelectorAll(".poll-option-input");
    const options = Array.from(optionInputs)
      .map((input) => ({
        id: Utils.generateId(),
        text: input.value.trim(),
        votes: [],
      }))
      .filter((opt) => opt.text);

    if (!question || options.length < 2) {
      TelegramService.showAlert(
        "Question and at least two options are required."
      );
      TelegramService.notificationOccurred("error");
      return;
    }
    const poll = Store.add("polls", { question, options, votedBy: [] });
    TelegramService.notificationOccurred("success");
    TelegramService.showAlert("Poll created successfully!");
    this.navigateTo("pollDetail", { id: poll.id }, true);
  },

  // Projects (Placeholder)
  renderProjectsPage() {
    UI.setHeader("Project Hub");
    const projects = Store.getAll("projects"); // Basic projects for now
    let content = `
            <div class="p-6">
                <p class="text-tg-hint mb-4">This section will allow users to form project teams, assign tasks, and track progress for incubated ideas. (MVP: Basic List)</p>
        `;
    if (projects.length === 0) {
      content += `<p class="text-center text-tg-hint">No active projects yet.</p>`;
    } else {
      content += projects
        .map(
          (proj) => `
                <div class="card">
                    <h3 class="card-title">${Utils.escapeHTML(proj.title)}</h3>
                    <p class="card-description">${Utils.escapeHTML(
                      proj.description
                    )}</p>
                    <p class="card-meta">Status: ${Utils.escapeHTML(
                      proj.status
                    )} • Team: ${proj.team.length} members</p>
                    <p class="card-meta">Tasks: ${proj.tasks.length} tasks</p>
                </div>
            `
        )
        .join("");
    }
    content += `</div>`;
    UI.renderPage(content);
    TelegramService.hideMainButton();
  },

  shareItem(type, id) {
    const item = Store.getById(type + "s", id); // e.g. 'ideas', 'petitions'
    if (!item) return;

    let title = item.title || item.question;
    let text = `Check out this ${type} on CommunityVoice: "${title}"`;
    let url = `${window.location.origin}${window.location.pathname}#${type}Detail?id=${id}`;

    TelegramService.shareToTelegram(url, text);
    TelegramService.impactOccurred("light");
  },
};

// Initialize the app once the DOM is fully loaded
window.addEventListener("DOMContentLoaded", () => App.init());
