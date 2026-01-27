/**
 * YouTube Cleaner - Automação para remoção de vídeos indesejados (Shorts/Canais)
 * ==============================================================================
 *
 * MODO DE USO:
 * 1. Abra o Console do Desenvolvedor (F12 ou Ctrl+Shift+J) na página do YouTube (Playlist, Histórico ou Inscrições).
 * 2. Cole todo este código e pressione Enter.
 * 3. O script iniciará automaticamente.
 *
 * CONTROLE:
 * - window.YoutubeCleaner.stop()          -> Para a execução.
 * - window.YoutubeCleaner.start()         -> Retoma a execução.
 * - window.YoutubeCleaner.addChannel(url) -> Adiciona url/nome de canal à lista de bloqueio.
 * - window.YoutubeCleaner.status()        -> Exibe estatísticas.
 *
 * CONFIGURAÇÃO:
 * Ajuste as constantes na parte superior da classe se necessário.
 */

(function (window) {
    'use strict';

    class YoutubeCleanerEngine {
        constructor() {
            // Configurações Padrão
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
                removeButton: 'ytd-menu-service-item-renderer, paper-item, yt-formatted-string' // Botões dentro do menu (ex: "Remover de...")
            };

            this.isRunning = false;
            this.stats = { removed: 0, scanned: 0, errors: 0 };
            this.processingQueue = new Set();
            this.disallowedChannels = new Set([
                "Cortes do Flow", "Podpah", "Cortes do Podpah", "Inteligência Ltda.", 
                "Cortes Inteligentes", "Venus Podcast", "Cortes do Venus"
            ]);

            this.tick = this.tick.bind(this);
        }

        init() {
            if (this.isRunning) return;
            this.isRunning = true;
            this.log('🚀 Youtube Cleaner Iniciado', 'color: #00ff00; font-weight: bold; font-size: 14px;');
            this.loop();
        }

        loop() {
            if (!this.isRunning) return;

            try {
                this.scanAndProcess();
            } catch (e) {
                console.error('[YoutubeCleaner] Erro no loop:', e);
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
                }
                    shouldRemove = true;
                    reason = 'Short detectado (Metadata)';
                }
                else if (this.disallowedChannels.has(data.channel)) {
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

            const title = titleEl ? titleEl.textContent.trim() : '';
            const durationStr = durationEl ? durationEl.textContent.trim() : '';
            const channel = channelEl ? channelEl.textContent.trim() : '';

            return {
                title,
                durationStr,
                durationMs: this.parseDuration(durationStr),
                channel
            };
        }

        
	parseDuration(str) {
            if (!str) return 0;
            const cleanStr = str.replace(/\s/g, '').trim();
            const parts = cleanStr.split(':').map(p => parseInt(p, 10));
            
            let seconds = 0;
            if (parts.length === 3) { 
                seconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
            } else if (parts.length === 2) {
                seconds = (parts[0] * 60) + parts[1];
            } else if (parts.length === 1) { 
                seconds = parts[0];
            }

            return seconds * 1000;
        }

        isShortsMetadata(item) {
            const links = item.querySelectorAll('a[href*="/shorts/"]');
            if (links.length > 0) return true;

            const overlay = item.querySelector('ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]');
            if (overlay) return true;

            return false;
        }

        async removeItem(item, data, reason) {
            item.dataset.ycProcessed = "true";
            this.stats.removed++;

            this.log(`[REMOVIDO] Vídeo: "${data.title}" | Motivo: ${reason}`, 'color: red; font-weight: bold;');


            try {
                const deleteBtn = item.querySelector('button[aria-label^="Remove"], button[aria-label^="Delete"]');
                if (deleteBtn) {
                    deleteBtn.click();
                    return;
                }

                const menuBtn = item.querySelector(this.selectors.menuButton);
                if (menuBtn) {
                    menuBtn.click();
                    await this.wait(300); 
                    
                    const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer');
                    let clicked = false;
                    
                    for (const menuItem of menuItems) {
                        const text = menuItem.textContent.toLowerCase();
                        if (text.includes('remover') || text.includes('remove') || text.includes('excluir')) {
                            menuItem.click();
                            clicked = true;
                            break;
                        }
                    }

                    if (clicked) return;
                    
                }

                item.style.display = 'none';

            } catch (e) {
                this.log(`Erro ao tentar remover: ${e.message}`, 'color: red');
                item.style.display = 'none'; 
            }
        }

        wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        log(msg, style = '') {
            if (this.config.debug) {
                console.log(`%c[YoutubeCleaner] ${msg}`, style || 'color: #00aaff');
            }
        }


        stop() {
            this.isRunning = false;
            this.log('🛑 Parado pelo usuário.', 'color: orange');
        }

        start() {
            if (!this.isRunning) this.init();
        }

        addChannel(channelNameOrUrl) {
            let name = channelNameOrUrl;
            if (channelNameOrUrl.includes('youtube.com')) {
                const parts = channelNameOrUrl.split('/');
                name = parts[parts.length - 1];
            }
            this.disallowedChannels.add(name);
            this.log(`✅ Canal adicionado à blacklist: ${name}`, 'color: green');
        }

        status() {
            console.table(this.stats);
            console.log(`Fila de canais bloqueados: ${this.disallowedChannels.size}`);
        }
    }

    window.YoutubeCleaner = new YoutubeCleanerEngine();
    window.YoutubeCleaner.init();

})(window);
