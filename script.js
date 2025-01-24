const ENABLED = true;
const MIN_DURATION_MS = 1000 * 60 * 1.5; 
const CHECK_FOR_CONFIRM_INTERVAL = 2800;
let CYCLE_INTERVAL = 3200;
const LONG_WAIT_CYCLE_ORIGINAL_INTERVAL = 15000;
let veryLongDuration = MIN_DURATION_MS * 10;
let wantCycling = true;
let longWait = LONG_WAIT_CYCLE_ORIGINAL_INTERVAL;
let alreadyRemoved = [];

const disallowedChannels = [
  "Flow Podcast",
  "Cortes do Flow",
  "Flow Fora de Contexto",
  "Podpah",
  "Cortes do Podpah",
  "Inteligência Ltda.",
  "Cortes Inteligentes",
  "Inteligência Ltda",
  "Cortes do Inteligência [OFICIAL]",
  "Canal Caixa Preta",
  "Mário Garcês",
  "Duda Garbi",
  "Cortes do Inteligência [OFICIAL]",
  "Bento Ribeiro | Chapado Crítico",
  "Cortes do Caixa Preta [OFICIAL]",
  "Canal do Barreto!",
  "O Melhor do Pretinho",
  "Bastidores do Pretinho",
  "Alcemar da Mascada",
  "CalangoLive",
  "Venus Podcast",
  "Cortes do Venus",
  "Ticaracaticast",
  // kkkkkkkkkkkkkkkkkkkkk que nome é esse 
  "Cortes do Ticaracaticast",
  "Planeta Podcast",
  "Cortes do Planeta Podcast",
  "Léo Lins Podcast",
  "Cortes do Léo Lins",
  "Groselha Talk",
  "Cortes do Groselha Talk",
  "Primocast",
  "Cortes do Primocast",
  "Podcast do Rafinha Bastos",
  "Rafi Bastos",
  "Cortes - Mais que 8 Minutos [OFICIAL]",
  "Talk Flow",
  "Podcast Três Irmãos",
  "Cortes dos Três Irmãos",
  "Não Ouvo",
  "Cortes do Não Ouvo",
  "Cortes do Empreendacast",
  "Nerdcast",
  "Cortes do Nerdcast",
  "Prosa Guiada",
  "Cortes da Prosa Guiada",
  "PodDelas",
  "Cortes do PodDelas",
  "Galãs Feios Podcast",
  "Cortes dos Galãs Feios"
];

const log = (...args) => {
  args[0] = `[auto-delete] ${args[0]}`;
  console.log(...args);
};

const durationString = (vidElement) => {
  const elt = vidElement.querySelector('[aria-label="Video duration"]');
  return elt ? elt.textContent.trim() : null;
};

const duration = (vidElement) => {
  const dString = durationString(vidElement);
  if (!dString) return veryLongDuration;
  if (dString.split(':').length > 2) return veryLongDuration;
  const [mins, secs] = dString.split(':').map(str => parseInt(str, 10));
  return mins * 60 * 1000 + secs * 1000;
};

const getIdentifiers = (videoElement) =>
  [...videoElement.getElementsByTagName('a')].map(anchor => anchor.textContent.trim());

const vidUniquifier = (videoName, channelName) => `${videoName}|${channelName}`;

const isPreviouslyRemoved = (videoElement) => {
  const [videoName, channelName] = getIdentifiers(videoElement);
  return alreadyRemoved.includes(vidUniquifier(videoName, channelName));
};

const isShort = (videoElement) => {
  try {
    return duration(videoElement) < MIN_DURATION_MS;
  } catch (e) {
    log(`Algum erro aqui:  ${e}`);
    return false;
  }
};

const isFromDisallowedChannel = (videoElement) => {
  const [videoName, channelName] = getIdentifiers(videoElement);
  // log(`🤔: ${channelName} - ${videoName}`);
  return disallowedChannels.includes(channelName);
};

class ItemGetter {
  previousCount = 0;
  
  next(ignorePrevious) {
    const items = [...document.querySelectorAll('div[role="listitem"]')];
    if (!ignorePrevious && items.length === this.previousCount) {
      log(`SE MEXE YOUTUBE.`);
      return null;
    }
    this.previousCount = items.length;
    return items.find(v => 
      (isShort(v) || isFromDisallowedChannel(v)) && !isPreviouslyRemoved(v)
    );
  }
}

const itemGetter = new ItemGetter();

function deleteOne(ignorePrevious) {
  const nextItem = itemGetter.next(ignorePrevious);
  if (nextItem) {
    try {
      const [videoName, channelName] = getIdentifiers(nextItem);
      const dString = durationString(nextItem) || "-no duration-";
      log(`Apagando-> ${videoName} : ${channelName} (${dString})...`);
      if (ENABLED) {
        const deleteButton = nextItem.getElementsByTagName('button')[0];
        deleteButton.click();
        alreadyRemoved.push(vidUniquifier(videoName, channelName));
      } else {
        log(`Delete action skipped. ENABLED is false.`);
      }
    } catch (e) {
      log(`Algum erro aqui: ${e}`);
    }
    
    if (wantCycling) {
      setTimeout(() => {
        const confirmationMenu = nextItem.querySelector('[aria-label="Activity options menu"]');
        if (confirmationMenu) {
          const confirmDeleteButton = confirmationMenu.querySelector('[aria-label="Delete activity item"]');
          if (confirmDeleteButton) confirmDeleteButton.click();
          setTimeout(deleteOne, CYCLE_INTERVAL);
        } else {
          setTimeout(deleteOne, CYCLE_INTERVAL - CHECK_FOR_CONFIRM_INTERVAL);
        }
      }, CHECK_FOR_CONFIRM_INTERVAL);
    }
    longWait = LONG_WAIT_CYCLE_ORIGINAL_INTERVAL;
  } else {
    log(`Ainda tá funcionando!! Está em um intervalo pra não bugar tudo.`);
    setTimeout(() => deleteOne(true), longWait);
    longWait *= 1.5; 
  }
}


setTimeout(() => {
  log("Iniciando...");
  deleteOne();
  setInterval(() => {
    alreadyRemoved = alreadyRemoved.slice(-45);
  }, 75000);
}, 2000);
