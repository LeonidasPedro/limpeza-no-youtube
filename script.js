(function (window) {
    'use strict';

    class YoutubeCleanerEngine {
        constructor() {
            this.config = {
                minDurationSec: 65, 
                scanInterval: 2000,
                actionDelay: 500,  
                maxRetries: 3,    
                debug: true      
            };

            this.selectors = {
                item: 'ytd-grid-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-playlist-video-renderer, div[role="listitem"]',
                title: '#video-title, #video-title-link',
                duration: 'ytd-thumbnail-overlay-time-status-renderer, span.ytd-thumbnail-overlay-time-status-renderer',
                channel: '#channel-name, .ytd-channel-name, #text-container, a.yt-simple-endpoint.style-scope.yt-formatted-string',
                menuButton: 'button.dropdown-trigger, button[aria-label="Action menu"], button.ytd-menu-renderer',
                removeButton: 'ytd-menu-service-item-renderer, paper-item, yt-formatted-string'
            };

            this.isRunning = false;
            this.stats = { removed: 0, scanned: 0, errors: 0 };
            this.disallowedChannels = new Set([
                "Cortes do Flow", "Podpah", "Cortes do Podpah", "Inteligência Ltda.", 
                "Cortes Inteligentes", "Venus Podcast", "Cortes do Venus"
            ]);
        }

        init() {
            if (this.isRunning) return;
            this.isRunning = true;
            this.log('🚀 Youtube Cleaner Iniciado', 'color: #00ff00; font-weight: bold;');
            this.loop();
        }

        loop() {
            if (!this.isRunning) return;
            try {
                this.scanAndProcess();
            } catch (e) {
                console.error(e);
            }
            setTimeout(() => requestAnimationFrame(() => this.loop()), this.config.scanInterval);
        }

        scanAndProcess() {
            const items = document.querySelectorAll(this.selectors.item);
            items.forEach(item => {
                if (item.dataset.ycProcessed) return;
                const data = this.extractData(item);
                if (!data.title) return;

                let shouldRemove = false;
                let reason = '';

                if (data.durationMs > 0 && data.durationMs < (this.config.minDurationSec * 1000)) {
                    shouldRemove = true;
                    reason = `Short detectado (${data.durationStr})`;
                } else if (this.isShortsMetadata(item)) {
                    shouldRemove = true;
                    reason = 'Short detectado (Metadata)';
                } else if (this.disallowedChannels.has(data.channel)) {
                    shouldRemove = true;
                    reason = `Canal Bloqueado: ${data.channel}`;
                }

                if (shouldRemove) {
                    this.removeItem(item, data, reason);
                } else {
                    item.dataset.ycProcessed = "true";
                }
            });
        }

        extractData(item) {
            const titleEl = item.querySelector(this.selectors.title);
            const durationEl = item.querySelector(this.selectors.duration);
            const channelEl = item.querySelector(this.selectors.channel);
            const durationStr = durationEl ? durationEl.textContent.trim() : '';
            return {
                title: titleEl ? titleEl.textContent.trim() : '',
                durationStr: durationStr,
                durationMs: this.parseDuration(durationStr),
                channel: channelEl ? channelEl.textContent.trim() : ''
            };
        }

        parseDuration(str) {
            if (!str) return 0;
            const parts = str.replace(/\s/g, '').split(':').map(p => parseInt(p, 10));
            let seconds = 0;
            if (parts.length === 3) seconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
            else if (parts.length === 2) seconds = (parts[0] * 60) + parts[1];
            else if (parts.length === 1) seconds = parts[0];
            return seconds * 1000;
        }

        isShortsMetadata(item) {
            return !!item.querySelector('a[href*="/shorts/"]') || !!item.querySelector('[overlay-style="SHORTS"]');
        }

        async removeItem(item, data, reason) {
            item.dataset.ycProcessed = "true";
            this.stats.removed++;
            this.log(`[REMOVIDO] ${data.title} | ${reason}`, 'color: red; font-weight: bold;');
            try {
                const deleteBtn = item.querySelector('button[aria-label^="Remove"], button[aria-label^="Delete"]');
                if (deleteBtn) {
                    deleteBtn.click();
                    return;
                }
                const menuBtn = item.querySelector(this.selectors.menuButton);
                if (menuBtn) {
                    menuBtn.click();
                    await new Promise(r => setTimeout(r, 300));
                    const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer');
                    for (const menuItem of menuItems) {
                        const text = menuItem.textContent.toLowerCase();
                        if (text.includes('remover') || text.includes('remove') || text.includes('excluir')) {
                            menuItem.click();
                            return;
                        }
                    }
                }
                item.style.display = 'none';
            } catch (e) {
                item.style.display = 'none';
            }
        }

        log(msg, style) {
            if (this.config.debug) console.log(`%c[YoutubeCleaner] ${msg}`, style);
        }

        stop() { this.isRunning = false; }
        start() { if (!this.isRunning) this.init(); }
        status() { console.table(this.stats); }
        addChannel(name) { this.disallowedChannels.add(name); }
    }

    window.YoutubeCleaner = new YoutubeCleanerEngine();
    window.YoutubeCleaner.init();
})(window);