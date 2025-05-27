// js/telegram.js
const TelegramService = {
    tg: window.Telegram.WebApp,

    init(options = {}) {
        this.tg.ready();
        this.tg.expand(); // Expand the Mini App to full height

        // Apply theme colors
        this.applyTheme();
        this.tg.onEvent('themeChanged', this.applyTheme);

        // Back button handling
        this.tg.BackButton.onClick(() => App.handleBackButton());
        // Main button setup is usually context-specific
        
        // Viewport changed handling
        this.tg.onEvent('viewportChanged', this.handleViewportChanged);
        this.handleViewportChanged({isStateStable: true}); // Initial call

        console.log("Telegram Web App SDK Initialized");
        console.log("User:", this.tg.initDataUnsafe.user);
        console.log("Theme Params:", this.tg.themeParams);

        if (options.onUserReady) {
            options.onUserReady(this.tg.initDataUnsafe.user);
        }
    },

    applyTheme() {
        const themeParams = this.tg.themeParams;
        document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-hint-color', themeParams.hint_color || '#999999');
        document.documentElement.style.setProperty('--tg-theme-link-color', themeParams.link_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color || '#f1f1f1');
        
        // Custom derived variables if needed
        document.documentElement.style.setProperty('--tg-theme-header-bg-color', themeParams.header_bg_color || themeParams.secondary_bg_color || '#f1f1f1');
        document.documentElement.style.setProperty('--tg-theme-section-bg-color', themeParams.section_bg_color || themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-destructive-text-color', themeParams.destructive_text_color || '#ff3b30');
        document.documentElement.style.setProperty('--tg-theme-accent-text-color', themeParams.accent_text_color || themeParams.link_color || '#2481cc');

        // Update body class for dark/light mode if needed for Tailwind integration
        if (themeParams.bg_color) {
            const isDark = TelegramService.isColorDark(themeParams.bg_color);
            document.body.classList.toggle('dark', isDark); // Requires Tailwind 'dark:' variants
        }
    },

    isColorDark(hexColor) {
        // Basic check, can be more sophisticated
        const color = hexColor.substring(1); // strip #
        const rgb = parseInt(color, 16);   // convert rrggbb to decimal
        const r = (rgb >> 16) & 0xff;  // extract red
        const g = (rgb >>  8) & 0xff;  // extract green
        const b = (rgb >>  0) & 0xff;  // extract blue
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
        return luma < 128; // Arbitrary threshold for darkness
    },
    
    handleViewportChanged(event) {
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.style.height = this.tg.viewportStableHeight + 'px';
        }
        // You can also adjust content padding if header/footer visibility changes,
        // though typically they are fixed in Mini Apps.
    },

    showMainButton(text, onClickCallback, color = null, textColor = null) {
        this.tg.MainButton.setText(text);
        this.tg.MainButton.onClick(onClickCallback);
        if (color) this.tg.MainButton.setParams({color: color});
        if (textColor) this.tg.MainButton.setParams({text_color: textColor});
        this.tg.MainButton.show();
    },

    hideMainButton() {
        this.tg.MainButton.hide();
    },

    showBackButton() {
        this.tg.BackButton.show();
    },

    hideBackButton() {
        this.tg.BackButton.hide();
    },

    showAlert(message, callback) {
        this.tg.showAlert(message, callback);
    },

    showConfirm(message, callback) {
        this.tg.showConfirm(message, (ok) => {
            if (callback) callback(ok);
        });
    },

    impactOccurred(style) { // 'light', 'medium', 'heavy', 'rigid', 'soft'
        if (this.tg.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred(style);
        }
    },

    notificationOccurred(type) { // 'error', 'success', 'warning'
         if (this.tg.HapticFeedback) {
            this.tg.HapticFeedback.notificationOccurred(type);
        }
    },

    requestLocation(callback) {
        if (navigator.geolocation) {
            this.tg.showPopup({
                title: 'Location Access',
                message: 'CommunityVoice would like to access your location to tag submissions and help find local content. Is this okay?',
                buttons: [
                    { id: 'allow', type: 'default', text: 'Allow' },
                    { id: 'deny', type: 'destructive', text: 'Deny' }
                ]
            }, (buttonId) => {
                if (buttonId === 'allow') {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            callback(null, { 
                                latitude: position.coords.latitude, 
                                longitude: position.coords.longitude 
                            });
                        },
                        (error) => {
                            console.error("Geolocation error:", error);
                            this.showAlert(`Geolocation error: ${error.message}`);
                            callback(error, null);
                        }
                    );
                } else {
                     callback(new Error('Permission denied by user popup'), null);
                }
            });
        } else {
            this.showAlert("Geolocation is not supported by your browser or device.");
            callback(new Error('Geolocation not supported'), null);
        }
    },

    shareToTelegram(url, text) {
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        this.tg.openTelegramLink(shareUrl);
    },

    closeApp() {
        this.tg.close();
    }
};