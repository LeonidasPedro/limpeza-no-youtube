(async function cleanYouTubeHistory() {
    const CONFIG = {
        MAX_DURATION_SECONDS: 150, // 2 minutos e 30 segundos
        SCROLL_DELAY: 2500,        // Tempo para carregar novos itens
        CLICK_DELAY: 800,          // Tempo entre deleções
        MAX_SCROLL_ATTEMPTS: 15    // Quantas vezes tentar scrollar se não achar nada
    };

    const disallowedChannels = [
        "Flow Podcast", "Cortes do Flow", "Flow Fora de Contexto",
        "Podpah", "Cortes do Podpah",
        "Inteligência Ltda.", "Cortes Inteligentes", "Inteligência Ltda", "Cortes do Inteligência [OFICIAL]",
        "Canal Caixa Preta", "Mário Garcês", "Duda Garbi", "Cortes do Caixa Preta [OFICIAL]",
        "Bento Ribeiro | Chapado Crítico", "Canal do Barreto!",
        "O Melhor do Pretinho", "Bastidores do Pretinho", "Alcemar da Mascada",
        "CalangoLive", "Venus Podcast", "Cortes do Venus",
        "Ticaracaticast", "Cortes do Ticaracaticast",
        "Planeta Podcast", "Cortes do Planeta Podcast",
        "Léo Lins Podcast", "Cortes do Léo Lins",
        "Groselha Talk", "Cortes do Groselha Talk",
        "Primocast", "Cortes do Primocast",
        "Podcast do Rafinha Bastos", "Rafi Bastos", "Cortes - Mais que 8 Minutos [OFICIAL]",
        "Talk Flow", "Podcast Três Irmãos", "Cortes dos Três Irmãos",
        "Não Ouvo", "Cortes do Não Ouvo", "Cortes do Empreendacast",
        "Nerdcast", "Cortes do Nerdcast",
        "Prosa Guiada", "Cortes da Prosa Guiada",
        "PodDelas", "Cortes do PodDelas",
        "Galãs Feios Podcast", "Cortes dos Galãs Feios",
        "Maicon Kuster", "Maicon Küster", "Cortes do Maicon Küster",
        "Davi", "Viniccius13", "Orochinho", "orochidois", "Near", 
        "Cortes", "Clipes", "Games"
    ];

    const log = (msg) => console.log(`%c[Cleaner] %c${msg}`, "color: #ff5555; font-weight: bold;", "color: white;");
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function parseDurationInSeconds(text) {
        if (!text) return null;
        const match = text.match(/(\d+):(\d+)(?::(\d+))?/);
        if (!match) return null;

        let h = 0, m = 0, s = 0;
        if (match[3]) {
            h = parseInt(match[1], 10);
            m = parseInt(match[2], 10);
            s = parseInt(match[3], 10);
        } else { 
            m = parseInt(match[1], 10);
            s = parseInt(match[2], 10);
        }
        return (h * 3600) + (m * 60) + s;
    }

    log(`Iniciando varredura. Critérios: < 2m30s OU Lista de Canais (${disallowedChannels.length} itens)...`);

    async function processVisibleItems() {
        const deleteButtons = Array.from(document.querySelectorAll('button[aria-label*="Delete"]'));
        
        if (deleteButtons.length === 0) {
            log("⚠️ Nenhum botão 'Delete' encontrado. O Google pode ter mudado o layout ou a página não carregou.");
            return 0;
        }

        let deletedCount = 0;

        for (const btn of deleteButtons) {
            const container = btn.closest('div[role="listitem"]') || btn.closest('li') || btn.parentElement.parentElement.parentElement;
            
            if (!container) continue;

            const textContent = container.innerText;
            
            const hasDisallowedChannel = disallowedChannels.some(channel => 
                textContent.includes(channel)
            );

            let isShortDuration = false;
            let durationSecs = null;

            const durationElement = Array.from(container.querySelectorAll('*')).find(el => 
                el.innerText && /\b\d+:\d+\b/.test(el.innerText) && el.innerText.length < 10
            ) || container.querySelector('[aria-label*="duration"]');

            if (durationElement) {
                const durationText = durationElement.getAttribute('aria-label') || durationElement.innerText;
                durationSecs = parseDurationInSeconds(durationText);
                
                if (durationSecs !== null && durationSecs < CONFIG.MAX_DURATION_SECONDS) {
                    isShortDuration = true;
                }
            }

            if (hasDisallowedChannel || isShortDuration) {
                let reason = "";
                if (hasDisallowedChannel) reason = `🚫 Canal que não quero mais`;
                else if (isShortDuration) reason = `⏱️ Curto (${durationSecs}s)`;

                const videoTitle = textContent.split('\n').find(l => l.length > 3) || "Vídeo sem título";
                
                log(`[DEL] ${reason} -> ${videoTitle.substring(0, 40)}...`);
                
                btn.click();
                deletedCount++;
                
                await wait(CONFIG.CLICK_DELAY);
            }
        }
        return deletedCount;
    }

    let emptyScrolls = 0;

    while (true) {
        const removed = await processVisibleItems();
        
        if (removed > 0) {
            log(`✅ ${removed} itens removidos neste lote. Processando...`);
            emptyScrolls = 0;
        } else {
            emptyScrolls++;
            log(`Nenhum alvo visível. Scrollando... (${emptyScrolls}/${CONFIG.MAX_SCROLL_ATTEMPTS})`);
        }

        const prevHeight = document.documentElement.scrollHeight;
        window.scrollTo(0, document.documentElement.scrollHeight);
        await wait(CONFIG.SCROLL_DELAY);

        if (document.documentElement.scrollHeight === prevHeight && emptyScrolls >= CONFIG.MAX_SCROLL_ATTEMPTS) {
            log("🏁 Fim do histórico alcançado ou timeout de carregamento.");
            break;
        }
    }
})();
