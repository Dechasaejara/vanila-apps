// js/auth.js
const AuthService = {
    init() {
        // This is called after TelegramService and Store are ready
        const tgUser = TelegramService.tg.initDataUnsafe.user;
        if (tgUser) {
            Store.setCurrentUser(tgUser);
        } else {
            // Handle case where user data might not be available (e.g. testing outside Telegram)
            // For now, we'll rely on sample data or allow anonymous interaction
            console.warn("Telegram user data not available. Using stored or default.");
        }
    },

    getUser() {
        return Store.getUser();
    },

    renderProfilePage() {
        const user = this.getUser();
        const prefs = Store.getPreferences();

        if (!user) {
            return `<div class="p-6 text-tg-hint">User data not available. Please open this app within Telegram.</div>`;
        }

        let profileHtml = `
            <div class="p-6 space-y-6">
                <div class="flex items-center space-x-4">
                    ${user.photoUrl ? 
                        `<img src="${user.photoUrl}" alt="${user.firstName}" class="w-20 h-20 rounded-full object-cover bg-tg-hint">` :
                        `<div class="w-20 h-20 rounded-full bg-tg-button flex items-center justify-center text-2xl font-bold text-tg-button-text">${user.firstName.charAt(0).toUpperCase()}</div>`
                    }
                    <div>
                        <h2 class="text-2xl font-semibold text-tg-text">${Utils.escapeHTML(user.firstName)} ${Utils.escapeHTML(user.lastName)}</h2>
                        ${user.username ? `<p class="text-tg-hint">@${Utils.escapeHTML(user.username)}</p>` : ''}
                        <p class="text-sm text-tg-hint">ID: ${user.id}</p>
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-medium text-tg-text mb-3">Preferences</h3>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between p-3 bg-tg-secondary-bg rounded-lg">
                            <label for="notifications" class="text-tg-text">Enable Notifications (In-app concept)</label>
                            <input type="checkbox" id="notifications" class="form-checkbox h-5 w-5 text-tg-link rounded focus:ring-tg-link" 
                                   ${prefs.notifications ? 'checked' : ''} onchange="AuthService.handlePreferenceChange('notifications', this.checked)">
                        </div>
                        <div class="flex items-center justify-between p-3 bg-tg-secondary-bg rounded-lg">
                            <label for="location" class="text-tg-text">Enable Location for Submissions</label>
                            <input type="checkbox" id="location" class="form-checkbox h-5 w-5 text-tg-link rounded focus:ring-tg-link"
                                   ${prefs.locationEnabled ? 'checked' : ''} onchange="AuthService.handlePreferenceChange('locationEnabled', this.checked)">
                        </div>
                         <div class="p-3 bg-tg-secondary-bg rounded-lg">
                            <label for="theme-select" class="text-tg-text block mb-1">App Theme Mode</label>
                            <select id="theme-select" class="form-input w-full" onchange="AuthService.handlePreferenceChange('theme', this.value)">
                                <option value="auto" ${prefs.theme === 'auto' ? 'selected' : ''}>Auto (Follow Telegram)</option>
                                <option value="light" ${prefs.theme === 'light' ? 'selected' : ''}>Light</option>
                                <option value="dark" ${prefs.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            </select>
                            <p class="text-xs text-tg-hint mt-1">Note: 'Auto' uses Telegram's theme. Manual selection here is illustrative for apps wanting to override.</p>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6">
                     <button onclick="TelegramService.shareToTelegram(window.location.href, 'Check out CommunityVoice on Telegram!')" class="w-full button-primary">Share App</button>
                </div>

                <div class="mt-6 border-t border-tg-hint pt-4">
                    <p class="text-xs text-tg-hint text-center">CommunityVoice v0.1.0 MVP</p>
                    <p class="text-xs text-tg-hint text-center">SDK Version: ${TelegramService.tg.version}</p>
                    <p class="text-xs text-tg-hint text-center">Platform: ${TelegramService.tg.platform}</p>
                </div>
            </div>
        `;
        UI.renderPage(profileHtml);
        UI.setHeader('My Profile');
        TelegramService.hideMainButton();
        App.updateBackButtonVisibility();
    },

    handlePreferenceChange(key, value) {
        const newPrefs = { ...Store.getPreferences(), [key]: value };
        Store.updatePreferences(newPrefs);
        TelegramService.impactOccurred('light');
        
        if (key === 'locationEnabled' && value === true) {
            // If user enables location, try to get it once to confirm
            TelegramService.requestLocation((err, coords) => {
                if (err) {
                    TelegramService.showAlert('Could not enable location. Please check permissions.');
                    Store.updatePreferences({ ...Store.getPreferences(), locationEnabled: false });
                    document.getElementById('location').checked = false; // Revert checkbox
                } else {
                    TelegramService.showAlert('Location access granted!');
                }
            });
        }
        // Apply theme preference if changed (illustrative for non-auto)
        if (key === 'theme') {
            if (value === 'light') document.body.classList.remove('dark');
            else if (value === 'dark') document.body.classList.add('dark');
            else TelegramService.applyTheme(); // Re-apply Telegram's theme for 'auto'
        }
        // Could re-render part of the profile page or just rely on checkbox state
    }
};