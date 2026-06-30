const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  clipboard,
  globalShortcut,
  ipcMain,
  nativeImage,
  powerMonitor,
  safeStorage,
  screen,
  shell,
} = require('electron');
const { spawn, spawnSync } = require('child_process');
const readline = require('readline');

const DEFAULT_SHORTCUT = process.platform === 'darwin' ? 'option+space' : 'ctrl+windows';
const DEFAULT_PASTE_LAST_SHORTCUT =
  process.platform === 'darwin' ? 'command+option+v' : 'ctrl+alt+v';
const PASTE_SHORTCUT_SETTLE_DELAY_MS = process.platform === 'darwin' ? 90 : 70;
const DEFAULT_LANGUAGES = ['en'];
const DEFAULT_INTERFACE_LANGUAGE = 'en';
const DEFAULT_SHOW_OVERLAY_BAR = true;
const DEFAULT_SOUND_EFFECTS_ENABLED = true;
const DEFAULT_LAUNCH_AT_LOGIN = false;
const DEFAULT_KEEP_ALL_TRANSCRIPTIONS = false;
const DEFAULT_DUCK_AUDIO = true;
const DEFAULT_OVERLAY_OPACITY = 100;
const DEFAULT_OVERLAY_SCALE = 100;
const DEFAULT_OVERLAY_DYNAMIC_SIZE = true;
const DEFAULT_CLOUD_TRANSCRIPTION_ENABLED = false;
const DEFAULT_CLOUD_PRIVACY_NOTICE_ACCEPTED = false;
const DEFAULT_CLOUD_TRANSCRIPTION_MODEL = 'openai/whisper-large-v3';
const LOCAL_HISTORY_LIMIT = 100;
const PERSISTENCE_VERSION = 6;
const SERVICE_SHUTDOWN_TIMEOUT_MS = 2500;
const HANDS_FREE_SOUND_DELAY_MS = 250;
const WINDOWS_PASTE_READY_SIGNAL = '__OPENFLOW_PASTE_OK__';
const WINDOWS_PASTE_TIMEOUT_MS = 4000;
const OVERLAY_WIDTH = 96;
const OVERLAY_HEIGHT = 34;
const OVERLAY_MARGIN_BOTTOM = 22;
const APP_NAME = 'OpenFlow';
const APP_ID = 'com.openflow.app';
const UPDATE_REPO_OWNER = 'MusicMaster4';
const UPDATE_REPO_NAME = 'OpenFlow';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_STT_MODELS_URL = `${OPENROUTER_BASE_URL}/models?output_modalities=transcription`;
const OPENROUTER_STT_URL = `${OPENROUTER_BASE_URL}/audio/transcriptions`;
const OPENROUTER_DEFAULT_MODEL = DEFAULT_CLOUD_TRANSCRIPTION_MODEL;
const CLOUD_RETRY_LIMIT = 20;
const CLOUD_TRANSCRIPTION_TIMEOUT_MS = 120000;
const MODEL_OPTIONS = [
  {
    id: 'tiny',
    label: 'Lite',
    description: 'Minimum latency for quick tests.',
  },
  {
    id: 'base',
    label: 'Rapido',
    description: 'Better than tiny while staying very fast.',
  },
  {
    id: 'small',
    label: 'Equilibrado',
    description: 'A solid middle ground for daily use.',
  },
  {
    id: 'medium',
    label: 'Preciso',
    description: 'More quality with moderate latency.',
  },
  {
    id: 'large-v3',
    label: 'Maximo',
    description: 'Highest accuracy with a heavier local cost.',
  },
];

const SUPPORTED_INTERFACE_LANGUAGES = [
  'en',
  'pt-BR',
  'es',
  'fr',
  'de',
  'it',
  'nl',
  'el',
  'ru',
  'zh-CN',
  'ja',
  'ko',
  'ar',
  'hi',
  'tr',
];

const SUPPORTED_DETECTION_LANGUAGES = [
  'af',
  'am',
  'ar',
  'as',
  'az',
  'ba',
  'be',
  'bg',
  'bn',
  'bo',
  'br',
  'bs',
  'ca',
  'cs',
  'cy',
  'da',
  'de',
  'el',
  'en',
  'es',
  'et',
  'eu',
  'fa',
  'fi',
  'fo',
  'fr',
  'gl',
  'gu',
  'ha',
  'haw',
  'he',
  'hi',
  'hr',
  'ht',
  'hu',
  'hy',
  'id',
  'is',
  'it',
  'ja',
  'jw',
  'ka',
  'kk',
  'km',
  'kn',
  'ko',
  'la',
  'lb',
  'ln',
  'lo',
  'lt',
  'lv',
  'mg',
  'mi',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'ne',
  'nl',
  'nn',
  'no',
  'oc',
  'pa',
  'pl',
  'ps',
  'pt',
  'ro',
  'ru',
  'sa',
  'sd',
  'si',
  'sk',
  'sl',
  'sn',
  'so',
  'sq',
  'sr',
  'su',
  'sv',
  'sw',
  'ta',
  'te',
  'tg',
  'th',
  'tk',
  'tl',
  'tr',
  'tt',
  'uk',
  'ur',
  'uz',
  'vi',
  'yi',
  'yo',
  'zh',
  'yue',
];

const SUPPORTED_DICTIONARY_LANGUAGES = ['pt', 'en'];

const MAIN_TRANSLATIONS = {
  en: {
    activeLanguages: 'Detection languages: {summary}.',
    switchingModel: 'Switching to {model}...',
    overlayOn: 'Floating bar enabled.',
    overlayOff: 'Floating bar disabled.',
    soundOn: 'Sound feedback enabled.',
    soundOff: 'Sound feedback disabled.',
    dictionaryOn: 'Dictionary active with {count} rule(s).',
    dictionaryOff: 'Dictionary cleared.',
    modelStatsReset: 'Model stats reset.',
    interfaceLanguageChanged: 'Interface language: {language}.',
    handsFreeActive: 'Hands-free mode active. Press {shortcut} to finish and transcribe.',
    waitingSwitchHandsFree:
      'Switching to {model}. Hands-free mode will start when the new worker is ready.',
    waitingSwitchHold: 'Switching to {model}. Wait for the new worker to finish loading.',
    waitingBootHandsFree: 'The model is still loading. Hands-free mode will start when it is ready.',
    waitingBootHold: 'The model is still loading. Wait a few seconds.',
    transcriptionBusy: 'Wait for the current transcription to finish before starting a new dictation.',
    launchAtLoginOn: 'Start with the computer enabled.',
    launchAtLoginOff: 'Start with the computer disabled.',
    keepAllTranscriptionsOn: 'Saving all local transcriptions.',
    keepAllTranscriptionsOff: `Saving only the latest ${LOCAL_HISTORY_LIMIT} local messages.`,
    shortcutUpdated: 'Global shortcut updated.',
    pasteShortcutUpdated: 'Paste-last shortcut updated.',
    duckAudioOn: 'Other apps will be muted while you dictate.',
    duckAudioOff: 'Other apps will keep playing while you dictate.',
    cloudTranscriptionOn: 'Cloud transcription enabled.',
    cloudTranscriptionOff: 'Local transcription enabled.',
    cloudModelUpdated: 'Cloud transcription model updated.',
    openRouterKeySaved: 'OpenRouter API key saved securely.',
    openRouterKeyCleared: 'OpenRouter API key removed.',
    cloudRetrySaved: 'Cloud transcription failed. The recording was saved so you can retry.',
    cloudRetrySucceeded: 'Saved recording transcribed.',
    trayOpenApp: 'Open app',
    trayHideApp: 'Hide window',
    trayQuit: 'Quit',
  },
  'pt-BR': {
    activeLanguages: 'Idiomas de deteccao: {summary}.',
    switchingModel: 'Trocando para {model}...',
    overlayOn: 'Barra flutuante ativada.',
    overlayOff: 'Barra flutuante desativada.',
    soundOn: 'Feedback sonoro ativado.',
    soundOff: 'Feedback sonoro desativado.',
    dictionaryOn: 'Dicionario ativo com {count} regra(s).',
    dictionaryOff: 'Dicionario limpo.',
    modelStatsReset: 'Estatisticas de modelos resetadas.',
    interfaceLanguageChanged: 'Idioma da interface: {language}.',
    handsFreeActive: 'Modo hands-free ativo. Pressione {shortcut} para finalizar e transcrever.',
    waitingSwitchHandsFree:
      'Trocando para {model}. O modo hands-free sera ativado quando o novo worker ficar pronto.',
    waitingSwitchHold: 'Trocando para {model}. Aguarde o novo worker ficar pronto.',
    waitingBootHandsFree:
      'O modelo ainda esta carregando. O modo hands-free sera iniciado quando estiver pronto.',
    waitingBootHold: 'O modelo ainda esta carregando. Aguarde alguns segundos.',
    transcriptionBusy:
      'Aguarde a transcricao atual terminar antes de iniciar um novo ditado.',
    launchAtLoginOn: 'Inicializacao com o computador ativada.',
    launchAtLoginOff: 'Inicializacao com o computador desativada.',
    keepAllTranscriptionsOn: 'Salvando todas as transcricoes locais.',
    keepAllTranscriptionsOff: `Salvando apenas as ultimas ${LOCAL_HISTORY_LIMIT} mensagens locais.`,
    shortcutUpdated: 'Atalho global atualizado.',
    pasteShortcutUpdated: 'Atalho de colar atualizado.',
    duckAudioOn: 'Outros apps serao silenciados enquanto voce dita.',
    duckAudioOff: 'Outros apps continuarao tocando enquanto voce dita.',
    cloudTranscriptionOn: 'Transcricao na nuvem ativada.',
    cloudTranscriptionOff: 'Transcricao local ativada.',
    cloudModelUpdated: 'Modelo de transcricao na nuvem atualizado.',
    openRouterKeySaved: 'Chave da OpenRouter salva com seguranca.',
    openRouterKeyCleared: 'Chave da OpenRouter removida.',
    cloudRetrySaved: 'A transcricao na nuvem falhou. A gravacao foi salva para tentar de novo.',
    cloudRetrySucceeded: 'Gravacao salva transcrita.',
    trayOpenApp: 'Abrir OpenFlow',
    trayHideApp: 'Ocultar janela',
    trayQuit: 'Fechar',
  },
};

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let trayMenuSignature = '';
let serviceProcess = null;
let serviceReader = null;
let hotkeyProcess = null;
let hotkeyReader = null;
let audioProcess = null;
let audioReader = null;
let serviceToken = 0;
let hotkeyToken = 0;
let audioToken = 0;
let serviceRestartVersion = 0;
let hasPlayedLoadedFeedback = false;
let mainShortcutRegisteredAccelerator = null;
let mainShortcutRegisteredViaElectron = false;
let pasteLastRegisteredAccelerator = null;
let pasteLastRegisteredViaElectron = false;
let lastPasteLastRequestAt = 0;
const pendingOverlayFeedbacks = [];
let currentDictationStartedAt = 0;
let captureMuteDepth = 0;
let suppressStartSoundUntil = 0;
let suppressStartRequestsUntil = 0;
let ignoreNextHotkeyRelease = false;
let lastOverlayAudioBands = [];
let lastHotkeyActionHandling = {
  suppressEscape: null,
  suppressSpace: null,
};
let lastAudioControllerConfigSignature = '';
let isQuitting = false;
let shouldStartHiddenOnLaunch = process.argv.some((arg) => arg === '--background');
const activeCloudTranscriptionSessions = new Set();

function getDefaultModel() {
  return process.env.WHISPER_MODEL || 'small';
}

function normalizeLanguageSelection(input, supportedLanguages, fallbackLanguages) {
  const values = Array.isArray(input)
    ? input
    : String(input || '')
        .split(',')
        .map((value) => value.trim());

  const supportedSet = new Set(supportedLanguages);
  const languages = values
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value) => supportedSet.has(value));

  return languages.length > 0 ? [...new Set(languages)] : [...fallbackLanguages];
}

function normalizeDetectionLanguages(input) {
  return normalizeLanguageSelection(input, SUPPORTED_DETECTION_LANGUAGES, DEFAULT_LANGUAGES);
}

function normalizeDictionaryLanguages(input) {
  return normalizeLanguageSelection(input, SUPPORTED_DICTIONARY_LANGUAGES, DEFAULT_LANGUAGES);
}

function normalizeInterfaceLanguage(input) {
  const value = String(input || '').trim();
  return SUPPORTED_INTERFACE_LANGUAGES.includes(value) ? value : DEFAULT_INTERFACE_LANGUAGE;
}

function getTranslationBundle(language) {
  return MAIN_TRANSLATIONS[normalizeInterfaceLanguage(language)] || MAIN_TRANSLATIONS.en;
}

function translateMain(key, params = {}, language = state.interfaceLanguage) {
  const template =
    getTranslationBundle(language)[key] || MAIN_TRANSLATIONS.en[key] || String(key || '');

  return template.replace(/\{(\w+)\}/g, (_match, token) => String(params[token] ?? ''));
}

function capitalizeLabel(value, language = state.interfaceLanguage) {
  const text = String(value || '').trim();
  if (!text) {
    return text;
  }

  return text.replace(/^\p{L}/u, (match) => match.toLocaleUpperCase(language));
}

function getLocalizedDetectionLanguageName(code, language = state.interfaceLanguage) {
  const normalizedLanguage = normalizeInterfaceLanguage(language);
  const normalizedCode = String(code || '').trim().toLowerCase();

  try {
    return (
      new Intl.DisplayNames([normalizedLanguage], { type: 'language' }).of(normalizedCode) ||
      normalizedCode.toUpperCase()
    );
  } catch (_error) {
    return normalizedCode.toUpperCase();
  }
}

function formatDetectionLanguagesSummary(languages, language = state.interfaceLanguage) {
  const list = Array.isArray(languages) ? languages : [];
  const normalizedLanguage = normalizeInterfaceLanguage(language);

  if (list.length <= 3) {
    return list
      .map((code) =>
        capitalizeLabel(
          getLocalizedDetectionLanguageName(code, normalizedLanguage),
          normalizedLanguage,
        ),
      )
      .join(', ');
  }

  return normalizedLanguage === 'pt-BR' ? `${list.length} selecionados` : `${list.length} selected`;
}

function getLocalizedLanguageName(code, language = state.interfaceLanguage) {
  const normalizedCode = normalizeInterfaceLanguage(code);
  const normalizedLanguage = normalizeInterfaceLanguage(language);

  try {
    return new Intl.DisplayNames([normalizedLanguage], { type: 'language' }).of(normalizedCode);
  } catch (_error) {
    return normalizedCode;
  }
}

function normalizeModel(modelId) {
  const value = String(modelId || '').trim();
  return MODEL_OPTIONS.some((option) => option.id === value) ? value : getDefaultModel();
}

function normalizeCloudTranscriptionModel(modelId) {
  const value = String(modelId || '').trim();
  return value || OPENROUTER_DEFAULT_MODEL;
}

function createDictionaryEntryId() {
  return `dict_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getModelOption(modelId) {
  return MODEL_OPTIONS.find((option) => option.id === modelId) || null;
}

function getModelDisplayName(modelId, language = state.interfaceLanguage) {
  const option = getModelOption(modelId);
  if (!option) {
    return modelId || 'model';
  }

  if (normalizeInterfaceLanguage(language) === 'pt-BR') {
    return option.label || modelId || 'modelo';
  }

  const labels = {
    tiny: 'Lite',
    base: 'Fast',
    small: 'Balanced',
    medium: 'Precise',
    'large-v3': 'Maximum',
  };

  return labels[option.id] || option.label || modelId || 'model';
}

function createEmptyStats() {
  return Object.fromEntries(
    MODEL_OPTIONS.map((option) => [
      option.id,
      {
        count: 0,
        totalMs: 0,
        averageMs: 0,
        lastMs: 0,
      },
    ]),
  );
}

function createEmptyUsageStats() {
  return {
    activeDays: [],
    totalWords: 0,
    totalAudioMs: 0,
    firstUsedAt: null,
  };
}

function isValidDayKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function toDayKey(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function countWords(text) {
  const normalized = String(text || '').trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}

function getDayDiff(previousDayKey, nextDayKey) {
  const previous = new Date(`${previousDayKey}T00:00:00`);
  const next = new Date(`${nextDayKey}T00:00:00`);

  return Math.round((next.getTime() - previous.getTime()) / 86400000);
}

function buildUsageSummary(usageStats) {
  const activeDays = usageStats.activeDays || [];
  let streakDays = 0;

  if (activeDays.length > 0) {
    streakDays = 1;
    for (let index = activeDays.length - 1; index > 0; index -= 1) {
      if (getDayDiff(activeDays[index - 1], activeDays[index]) !== 1) {
        break;
      }
      streakDays += 1;
    }
  }

  return {
    streakDays,
    totalDays: activeDays.length,
    totalWords: usageStats.totalWords || 0,
    averageWpm:
      usageStats.totalAudioMs > 0 ? (usageStats.totalWords * 60000) / usageStats.totalAudioMs : 0,
  };
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const text = String(entry.text || '').trim();
      if (!text) {
        return null;
      }

      const timestamp = String(entry.timestamp || '');
      const engine = entry.engine === 'cloud' ? 'cloud' : 'local';
      return {
        model: engine === 'cloud' ? normalizeCloudTranscriptionModel(entry.model) : normalizeModel(entry.model),
        engine,
        text,
        language: String(entry.language || 'unknown'),
        transcriptionMs: Number(entry.transcriptionMs) || 0,
        audioDurationMs: Number(entry.audioDurationMs) || 0,
        wordCount: Number(entry.wordCount) || countWords(text),
        costUsd: Number(entry.costUsd) || 0,
        timestamp: timestamp || new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

function applyHistoryRetention(history, keepAllTranscriptions = DEFAULT_KEEP_ALL_TRANSCRIPTIONS) {
  const list = Array.isArray(history) ? history : [];
  return keepAllTranscriptions ? list : list.slice(0, LOCAL_HISTORY_LIMIT);
}

function normalizeDictionaryEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const sourceValues = (Array.isArray(entry.sources) ? entry.sources : [entry.source])
    .flatMap((value) => String(value || '').split(/\r?\n|;/))
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const sources = [];
  const seenSources = new Set();

  for (const value of sourceValues) {
    const key = value.toLocaleLowerCase('pt-BR');
    if (seenSources.has(key)) {
      continue;
    }

    seenSources.add(key);
    sources.push(value);
  }
  const target = String(entry.target || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (sources.length === 0 || !target) {
    return null;
  }

  return {
    id: String(entry.id || createDictionaryEntryId()),
    sources,
    target,
    languages: normalizeDictionaryLanguages(entry.languages),
  };
}

function normalizeDictionaryEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const seen = new Set();
  return entries
    .map((entry) => normalizeDictionaryEntry(entry))
    .filter((entry) => {
      if (!entry) {
        return false;
      }

      const key =
        `${entry.sources.map((value) => value.toLocaleLowerCase('pt-BR')).join('|')}` +
        `__${entry.target}__${entry.languages.join(',')}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildDictionaryPattern(source) {
  const normalizedSource = String(source || '').trim();
  const escapedSource = escapeRegExp(normalizedSource).replace(/\s+/g, '\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapedSource}(?![\\p{L}\\p{N}_])`, 'giu');
}

function createDictionaryReplacementIndex(entries) {
  const buckets = {
    all: [],
    pt: [],
    en: [],
  };

  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || !Array.isArray(entry.sources) || !entry.target) {
      continue;
    }

    for (const source of entry.sources) {
      const normalizedSource = String(source || '').trim();
      if (!normalizedSource) {
        continue;
      }

      const compiledEntry = {
        source: normalizedSource,
        sourceLength: normalizedSource.length,
        target: entry.target,
        pattern: buildDictionaryPattern(normalizedSource),
      };

      buckets.all.push(compiledEntry);

      for (const language of Array.isArray(entry.languages) ? entry.languages : []) {
        if (language === 'pt' || language === 'en') {
          buckets[language].push(compiledEntry);
        }
      }
    }
  }

  for (const bucket of Object.values(buckets)) {
    bucket.sort((left, right) => right.sourceLength - left.sourceLength);
  }

  return buckets;
}

let dictionaryReplacementIndex = createDictionaryReplacementIndex([]);

function normalizeUsageStats(stats) {
  const source = stats && typeof stats === 'object' ? stats : {};
  const activeDays = [...new Set((source.activeDays || []).map((value) => String(value).trim()))]
    .filter(isValidDayKey)
    .sort();

  return {
    activeDays,
    totalWords: Math.max(0, Number(source.totalWords) || 0),
    totalAudioMs: Math.max(0, Number(source.totalAudioMs) || 0),
    firstUsedAt: source.firstUsedAt ? String(source.firstUsedAt) : null,
  };
}

function recordUsage(usageStats, entry) {
  const dayKey = toDayKey(entry.timestamp) || toDayKey();
  const activeDays = dayKey ? [...new Set([...usageStats.activeDays, dayKey])].sort() : [...usageStats.activeDays];

  return {
    activeDays,
    totalWords: usageStats.totalWords + (Number(entry.wordCount) || 0),
    totalAudioMs: usageStats.totalAudioMs + Math.max(0, Number(entry.audioDurationMs) || 0),
    firstUsedAt: usageStats.firstUsedAt || entry.timestamp || new Date().toISOString(),
  };
}

function normalizeStats(stats) {
  const empty = createEmptyStats();
  const source = stats && typeof stats === 'object' ? stats : {};

  for (const option of MODEL_OPTIONS) {
    const raw = source[option.id] || {};
    const count = Number(raw.count) || 0;
    const totalMs = Number(raw.totalMs) || 0;
    const lastMs = Number(raw.lastMs) || 0;
    empty[option.id] = {
      count,
      totalMs,
      averageMs: count > 0 ? totalMs / count : 0,
      lastMs,
    };
  }

  return empty;
}

function normalizeOverlayPosition(position) {
  if (!position || typeof position !== 'object') {
    return null;
  }

  const x = Number(position.x);
  const y = Number(position.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeBooleanPreference(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeOverlayOpacity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return DEFAULT_OVERLAY_OPACITY;
  }

  return Math.round(clamp(number, 0, 100));
}

function normalizeOverlayScale(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return DEFAULT_OVERLAY_SCALE;
  }

  return Math.round(clamp(number, 10, 100));
}

function getShortcutFromEnv(name, fallback) {
  const value = String(process.env[name] || '')
    .trim()
    .toLowerCase();
  return value || fallback;
}

function formatShortcutForDisplay(shortcut, platform = process.platform) {
  const labels = String(shortcut || '')
    .split('+')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .map((token) => {
      if (token === 'commandorcontrol') {
        return platform === 'darwin' ? 'Command' : 'Ctrl';
      }

      if (token === 'control' || token === 'ctrl') {
        return platform === 'darwin' ? 'Control' : 'Ctrl';
      }

      if (token === 'command' || token === 'cmd') {
        return 'Command';
      }

      if (token === 'option' || token === 'alt') {
        return platform === 'darwin' ? 'Option' : 'Alt';
      }

      if (token === 'windows' || token === 'super') {
        return platform === 'darwin' ? 'Command' : 'Win';
      }

      if (token === 'shift') {
        return 'Shift';
      }

      if (token === 'space') {
        return 'Space';
      }

      const specialLabels = {
        tab: 'Tab',
        enter: 'Enter',
        return: 'Enter',
        backspace: 'Backspace',
        delete: 'Delete',
        del: 'Delete',
        insert: 'Insert',
        ins: 'Insert',
        home: 'Home',
        end: 'End',
        pageup: 'PageUp',
        pagedown: 'PageDown',
        up: 'Up',
        down: 'Down',
        left: 'Left',
        right: 'Right',
      };
      if (specialLabels[token]) {
        return specialLabels[token];
      }

      if (/^f([1-9]|1[0-9]|2[0-4])$/.test(token)) {
        return token.toUpperCase();
      }

      return token.length === 1 ? token.toUpperCase() : token;
    });

  return labels.join('+');
}

function isElectronAcceleratorCompatible(shortcut) {
  const tokens = String(shortcut || '')
    .split('+')
    .map((token) => normalizeShortcutToken(token))
    .filter(Boolean);
  const keys = tokens.filter((token) => !SHORTCUT_MODIFIER_SET.has(token));

  return keys.length <= 1;
}

function shortcutToElectronAccelerator(shortcut) {
  const tokens = String(shortcut || '')
    .split('+')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    return '';
  }

  const acceleratorTokens = tokens.map((token) => {
    switch (token) {
      case 'commandorcontrol':
      case 'control':
      case 'ctrl':
        return 'CommandOrControl';
      case 'command':
      case 'cmd':
        return 'Command';
      case 'option':
        return 'Option';
      case 'alt':
        return process.platform === 'darwin' ? 'Option' : 'Alt';
      case 'windows':
      case 'super':
        return 'Super';
      case 'shift':
        return 'Shift';
      case 'space':
        return 'Space';
      case 'tab':
        return 'Tab';
      case 'escape':
      case 'esc':
        return 'Esc';
      case 'enter':
      case 'return':
        return 'Enter';
      case 'backspace':
        return 'Backspace';
      case 'delete':
      case 'del':
        return 'Delete';
      case 'insert':
      case 'ins':
        return 'Insert';
      case 'home':
        return 'Home';
      case 'end':
        return 'End';
      case 'pageup':
        return 'PageUp';
      case 'pagedown':
        return 'PageDown';
      case 'up':
        return 'Up';
      case 'down':
        return 'Down';
      case 'left':
        return 'Left';
      case 'right':
        return 'Right';
      default:
        if (token.length === 1) return token.toUpperCase();
        if (/^f([1-9]|1[0-9]|2[0-4])$/.test(token)) return token.toUpperCase();
        return '';
    }
  });

  if (acceleratorTokens.some((token) => !token)) {
    return '';
  }

  return acceleratorTokens.join('+');
}

// Canonical modifier order used when storing/displaying shortcuts. Only one of
// windows/command is meaningful per platform, so listing both is harmless.
const SHORTCUT_MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'windows', 'command'];
const SHORTCUT_MODIFIER_SET = new Set(SHORTCUT_MODIFIER_ORDER);

function normalizeShortcutToken(token) {
  const value = String(token || '').trim().toLowerCase();
  const aliases = {
    control: 'ctrl',
    cmd: 'command',
    option: 'alt',
    meta: process.platform === 'darwin' ? 'command' : 'windows',
    os: process.platform === 'darwin' ? 'command' : 'windows',
    super: process.platform === 'darwin' ? 'command' : 'windows',
    win: 'windows',
    commandorcontrol: process.platform === 'darwin' ? 'command' : 'ctrl',
    esc: 'escape',
    return: 'enter',
    del: 'delete',
    ins: 'insert',
    pgup: 'pageup',
    page_up: 'pageup',
    pgdn: 'pagedown',
    page_down: 'pagedown',
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right',
  };
  return aliases[value] || value;
}

function isValidShortcutKeyToken(token) {
  return (
    /^[a-z0-9]$/.test(token) ||
    /^f([1-9]|1[0-9]|2[0-4])$/.test(token) ||
    token === 'space' ||
    token === 'enter' ||
    token === 'tab' ||
    token === 'backspace' ||
    token === 'delete' ||
    token === 'insert' ||
    token === 'home' ||
    token === 'end' ||
    token === 'pageup' ||
    token === 'pagedown' ||
    token === 'up' ||
    token === 'down' ||
    token === 'left' ||
    token === 'right'
  );
}

// Returns a cleaned, canonical shortcut string (e.g. "ctrl+alt+v") or the fallback when
// the input cannot make a sane global shortcut. Esc is reserved for cancelling capture.
function normalizeShortcut(input, fallback) {
  const rawTokens = String(input || '')
    .split('+')
    .map((token) => normalizeShortcutToken(token))
    .filter(Boolean);

  if (rawTokens.length === 0) {
    return fallback;
  }

  const seen = new Set();
  const modifiers = [];
  const keys = [];

  for (const token of rawTokens) {
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);

    if (token === 'escape') {
      return fallback;
    }

    if (SHORTCUT_MODIFIER_SET.has(token)) {
      modifiers.push(token);
    } else if (isValidShortcutKeyToken(token)) {
      keys.push(token);
    } else {
      return fallback;
    }
  }

  const orderedModifiers = SHORTCUT_MODIFIER_ORDER.filter((modifier) => modifiers.includes(modifier));
  return [...orderedModifiers, ...keys].join('+');
}

function getDefaultsFromEnv() {
  return {
    shortcut: getShortcutFromEnv('FLOW_HOTKEY', DEFAULT_SHORTCUT),
    pasteLastShortcut: getShortcutFromEnv(
      'FLOW_PASTE_LAST_HOTKEY',
      DEFAULT_PASTE_LAST_SHORTCUT,
    ),
    allowedLanguages: normalizeDetectionLanguages(
      process.env.ALLOWED_LANGUAGES || DEFAULT_LANGUAGES.join(','),
    ),
    interfaceLanguage: normalizeInterfaceLanguage(process.env.INTERFACE_LANGUAGE),
    model: normalizeModel(getDefaultModel()),
    showOverlayBar: DEFAULT_SHOW_OVERLAY_BAR,
    soundEffectsEnabled: DEFAULT_SOUND_EFFECTS_ENABLED,
    launchAtLogin: normalizeLaunchAtLoginPreference(DEFAULT_LAUNCH_AT_LOGIN),
    keepAllTranscriptions: DEFAULT_KEEP_ALL_TRANSCRIPTIONS,
    duckAudioEnabled: DEFAULT_DUCK_AUDIO,
    overlayOpacity: DEFAULT_OVERLAY_OPACITY,
    overlayScale: DEFAULT_OVERLAY_SCALE,
    overlayDynamicSize: DEFAULT_OVERLAY_DYNAMIC_SIZE,
    cloudTranscriptionEnabled: DEFAULT_CLOUD_TRANSCRIPTION_ENABLED,
    cloudPrivacyNoticeAccepted: DEFAULT_CLOUD_PRIVACY_NOTICE_ACCEPTED,
    cloudTranscriptionModel: DEFAULT_CLOUD_TRANSCRIPTION_MODEL,
    dictionaryEntries: [],
    overlayPosition: null,
  };
}

function canConfigureLaunchAtLogin() {
  if (process.platform === 'win32') {
    return app.isPackaged;
  }

  return true;
}

function normalizeLaunchAtLoginPreference(value) {
  return canConfigureLaunchAtLogin() && value === true;
}

const defaults = getDefaultsFromEnv();

const state = {
  engineReady: false,
  listening: false,
  phase: 'booting',
  shortcut: defaults.shortcut,
  pasteLastShortcut: defaults.pasteLastShortcut,
  allowedLanguages: defaults.allowedLanguages,
  partial: '',
  latestFinal: '',
  latestLanguage: null,
  supportedDetectionLanguages: SUPPORTED_DETECTION_LANGUAGES,
  interfaceLanguage: defaults.interfaceLanguage,
  model: defaults.model,
  availableModels: MODEL_OPTIONS,
  modelStats: createEmptyStats(),
  device: 'unknown',
  deviceNote: '',
  serviceOnline: false,
  hotkeyOnline: false,
  hotkeyPressed: false,
  pendingStartMode: null,
  captureMode: null,
  dictationSessionId: null,
  switchingModel: false,
  notice: '',
  error: '',
  history: [],
  usageStats: createEmptyUsageStats(),
  showOverlayBar: defaults.showOverlayBar,
  soundEffectsEnabled: defaults.soundEffectsEnabled,
  launchAtLogin: defaults.launchAtLogin,
  keepAllTranscriptions: defaults.keepAllTranscriptions,
  duckAudioEnabled: defaults.duckAudioEnabled,
  overlayOpacity: defaults.overlayOpacity,
  overlayScale: defaults.overlayScale,
  overlayDynamicSize: defaults.overlayDynamicSize,
  cloudTranscriptionEnabled: defaults.cloudTranscriptionEnabled,
  cloudPrivacyNoticeAccepted: defaults.cloudPrivacyNoticeAccepted,
  cloudTranscriptionModel: defaults.cloudTranscriptionModel,
  openRouterApiKeyConfigured: false,
  openRouterModels: [],
  openRouterModelsStatus: 'idle',
  openRouterModelsError: '',
  cloudRetries: [],
  dictionaryEntries: defaults.dictionaryEntries,
  overlayPosition: defaults.overlayPosition,
  pendingPaste: false,
  audioLevel: 0,
};

rebuildDictionaryReplacementIndex(defaults.dictionaryEntries);

app.setName(APP_NAME);

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

function getAppCodePath() {
  return app.getAppPath();
}

function getRuntimeBasePath() {
  return app.isPackaged ? process.resourcesPath : getAppCodePath();
}

function getProjectRoot() {
  return getAppCodePath();
}

function getPythonBin() {
  const venvPython = process.platform === 'win32'
    ? path.join(getProjectRoot(), '.venv', 'Scripts', 'python.exe')
    : path.join(getProjectRoot(), '.venv', 'bin', 'python');
  return process.env.PYTHON_BIN || (fs.existsSync(venvPython) ? venvPython : 'python');
}

function getWorkerExecutableName(workerName) {
  return process.platform === 'win32' ? `${workerName}.exe` : workerName;
}

function getWorkerLaunchSpec(workerName) {
  if (app.isPackaged) {
    return {
      command: path.join(getRuntimeBasePath(), 'bin', workerName, getWorkerExecutableName(workerName)),
      args: [],
    };
  }

  return {
    command: getPythonBin(),
    args: ['-u', path.join(getProjectRoot(), 'python', `${workerName}.py`)],
  };
}

function getAppIconPath() {
  if (process.platform === 'darwin') {
    return path.join(getProjectRoot(), 'src', 'assets', 'openflow.png');
  }

  return path.join(getProjectRoot(), 'src', 'assets', 'openflow.ico');
}

function getTrayIconAssetPath() {
  if (process.platform === 'darwin') {
    return path.join(getProjectRoot(), 'src', 'assets', 'openflow-trayTemplate.png');
  }

  return getAppIconPath();
}

function getTrayIconImage() {
  let image = nativeImage.createFromPath(getTrayIconAssetPath());
  if (image.isEmpty()) {
    image = nativeImage.createFromPath(getAppIconPath());
  }

  if (process.platform === 'darwin') {
    image.setTemplateImage(true);
    return image.resize({ width: 18, height: 18 });
  }

  return image.resize({ width: 16, height: 16 });
}

function getSettingsPath() {
  return path.join(getStorageDirectory(), 'settings.json');
}

function getSecretsPath() {
  return path.join(getStorageDirectory(), 'secrets.json');
}

function getLegacySettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function getStorageDirectory() {
  return path.join(app.getPath('userData'), 'store');
}

function getModelsDirectory() {
  return path.join(app.getPath('userData'), 'models');
}

function getHuggingFaceHomeDirectory() {
  return path.join(getModelsDirectory(), 'hf-home');
}

function getHuggingFaceHubCacheDirectory() {
  return path.join(getModelsDirectory(), 'hub');
}

function getChildProcessRegistryPath() {
  return path.join(getStorageDirectory(), 'child-processes.json');
}

function getCloudRetriesDirectory() {
  return path.join(getStorageDirectory(), 'cloud-retries');
}

function ensureRuntimeDirectories() {
  fs.mkdirSync(getStorageDirectory(), { recursive: true });
  fs.mkdirSync(getModelsDirectory(), { recursive: true });
  fs.mkdirSync(getHuggingFaceHomeDirectory(), { recursive: true });
  fs.mkdirSync(getHuggingFaceHubCacheDirectory(), { recursive: true });
  fs.mkdirSync(getCloudRetriesDirectory(), { recursive: true });
}

function readChildProcessRegistry() {
  const payload = readJsonFile(getChildProcessRegistryPath());
  return payload && typeof payload === 'object' ? payload : {};
}

function writeChildProcessRegistry(payload) {
  writeJsonFile(getChildProcessRegistryPath(), payload);
}

function trackChildProcess(kind, childProcess) {
  if (!childProcess || !childProcess.pid) {
    return;
  }

  const registry = readChildProcessRegistry();
  const entries = Array.isArray(registry[kind]) ? registry[kind] : [];
  if (!entries.includes(childProcess.pid)) {
    registry[kind] = [...entries, childProcess.pid];
    writeChildProcessRegistry(registry);
  }
}

function untrackChildProcess(kind, pid) {
  if (!pid) {
    return;
  }

  const registry = readChildProcessRegistry();
  const entries = Array.isArray(registry[kind]) ? registry[kind] : [];
  const nextEntries = entries.filter((value) => value !== pid);
  if (nextEntries.length > 0) {
    registry[kind] = nextEntries;
  } else {
    delete registry[kind];
  }
  writeChildProcessRegistry(registry);
}

function terminateTrackedPid(pid, expectedName = '') {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
    return;
  }

  if (process.platform !== 'darwin') {
    return;
  }

  try {
    process.kill(pid, 0);
  } catch (_error) {
    return;
  }

  if (expectedName) {
    try {
      const probe = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
        encoding: 'utf8',
        windowsHide: true,
      });
      const commandLine = String(probe.stdout || '').trim().toLowerCase();
      if (!commandLine.includes(String(expectedName).toLowerCase())) {
        return;
      }
    } catch (_error) {
      return;
    }
  }

  try {
    process.kill(pid);
  } catch (_error) {
    // Best effort.
  }
}

function cleanupTrackedChildProcesses() {
  const registry = readChildProcessRegistry();
  for (const [kind, entries] of Object.entries(registry)) {
    if (!Array.isArray(entries)) {
      continue;
    }

    for (const pid of entries) {
      terminateTrackedPid(Number(pid), kind);
    }
  }

  writeChildProcessRegistry({});
}

function createEmptyPersistedState() {
  return {
    version: PERSISTENCE_VERSION,
    preferences: {
      allowedLanguages: defaults.allowedLanguages,
      interfaceLanguage: defaults.interfaceLanguage,
      model: defaults.model,
      shortcut: defaults.shortcut,
      pasteLastShortcut: defaults.pasteLastShortcut,
      showOverlayBar: defaults.showOverlayBar,
      soundEffectsEnabled: defaults.soundEffectsEnabled,
      launchAtLogin: defaults.launchAtLogin,
      keepAllTranscriptions: defaults.keepAllTranscriptions,
      duckAudioEnabled: defaults.duckAudioEnabled,
      overlayOpacity: defaults.overlayOpacity,
      overlayScale: defaults.overlayScale,
      overlayDynamicSize: defaults.overlayDynamicSize,
      cloudTranscriptionEnabled: defaults.cloudTranscriptionEnabled,
      cloudPrivacyNoticeAccepted: defaults.cloudPrivacyNoticeAccepted,
      cloudTranscriptionModel: defaults.cloudTranscriptionModel,
      dictionaryEntries: defaults.dictionaryEntries,
      overlayPosition: defaults.overlayPosition,
    },
    modelStats: createEmptyStats(),
    history: [],
    usageStats: createEmptyUsageStats(),
  };
}

function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function normalizePersistedState(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const preferencesSource =
    source.preferences && typeof source.preferences === 'object' ? source.preferences : source;
  const shouldEnableLaunchAtLoginByDefault = Number(source.version) < PERSISTENCE_VERSION;
  const keepAllTranscriptions =
    typeof preferencesSource.keepAllTranscriptions === 'boolean'
      ? preferencesSource.keepAllTranscriptions
      : defaults.keepAllTranscriptions;

  return {
    version: PERSISTENCE_VERSION,
    preferences: {
      allowedLanguages: normalizeDetectionLanguages(preferencesSource.allowedLanguages),
      interfaceLanguage: normalizeInterfaceLanguage(preferencesSource.interfaceLanguage),
      model: normalizeModel(preferencesSource.model),
      shortcut: normalizeShortcut(preferencesSource.shortcut, defaults.shortcut),
      pasteLastShortcut: normalizeShortcut(
        preferencesSource.pasteLastShortcut,
        defaults.pasteLastShortcut,
      ),
      showOverlayBar:
        typeof preferencesSource.showOverlayBar === 'boolean'
          ? preferencesSource.showOverlayBar
          : defaults.showOverlayBar,
      soundEffectsEnabled:
        typeof preferencesSource.soundEffectsEnabled === 'boolean'
          ? preferencesSource.soundEffectsEnabled
          : defaults.soundEffectsEnabled,
      launchAtLogin: normalizeLaunchAtLoginPreference(
        typeof preferencesSource.launchAtLogin === 'boolean' && !shouldEnableLaunchAtLoginByDefault
          ? preferencesSource.launchAtLogin
          : defaults.launchAtLogin,
      ),
      keepAllTranscriptions,
      duckAudioEnabled: normalizeBooleanPreference(
        preferencesSource.duckAudioEnabled,
        defaults.duckAudioEnabled,
      ),
      overlayOpacity: normalizeOverlayOpacity(preferencesSource.overlayOpacity),
      overlayScale: normalizeOverlayScale(preferencesSource.overlayScale),
      overlayDynamicSize: normalizeBooleanPreference(
        preferencesSource.overlayDynamicSize,
        defaults.overlayDynamicSize,
      ),
      cloudTranscriptionEnabled: normalizeBooleanPreference(
        preferencesSource.cloudTranscriptionEnabled,
        defaults.cloudTranscriptionEnabled,
      ),
      cloudPrivacyNoticeAccepted: normalizeBooleanPreference(
        preferencesSource.cloudPrivacyNoticeAccepted,
        defaults.cloudPrivacyNoticeAccepted,
      ),
      cloudTranscriptionModel: normalizeCloudTranscriptionModel(
        preferencesSource.cloudTranscriptionModel,
      ),
      dictionaryEntries: normalizeDictionaryEntries(preferencesSource.dictionaryEntries),
      overlayPosition: defaults.overlayPosition,
    },
    modelStats: normalizeStats(source.modelStats),
    history: applyHistoryRetention(normalizeHistory(source.history), keepAllTranscriptions),
    usageStats: normalizeUsageStats(source.usageStats),
  };
}

function writeJsonFile(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function canUseSafeStorage() {
  try {
    return Boolean(safeStorage && safeStorage.isEncryptionAvailable());
  } catch (_error) {
    return false;
  }
}

function protectText(value) {
  const text = String(value || '');
  if (canUseSafeStorage()) {
    return {
      encrypted: true,
      data: safeStorage.encryptString(text).toString('base64'),
    };
  }

  return {
    encrypted: false,
    data: Buffer.from(text, 'utf8').toString('base64'),
  };
}

function unprotectText(record) {
  if (!record || typeof record !== 'object' || !record.data) {
    return '';
  }

  try {
    const buffer = Buffer.from(String(record.data), 'base64');
    if (record.encrypted) {
      return safeStorage.decryptString(buffer);
    }

    return buffer.toString('utf8');
  } catch (_error) {
    return '';
  }
}

function readSecrets() {
  const payload = readJsonFile(getSecretsPath());
  return payload && typeof payload === 'object' ? payload : {};
}

function writeSecrets(payload) {
  writeJsonFile(getSecretsPath(), payload && typeof payload === 'object' ? payload : {});
}

function readOpenRouterApiKey() {
  return unprotectText(readSecrets().openRouterApiKey).trim();
}

function hasOpenRouterApiKey() {
  return Boolean(readOpenRouterApiKey());
}

function saveOpenRouterApiKey(apiKey) {
  const value = String(apiKey || '').trim();
  if (!value) {
    throw new Error('OpenRouter API key is empty.');
  }

  const secrets = readSecrets();
  secrets.openRouterApiKey = protectText(value);
  writeSecrets(secrets);
  setState({
    openRouterApiKeyConfigured: true,
    notice: translateMain('openRouterKeySaved'),
    error: '',
  });
  void refreshOpenRouterModels();
  return snapshotState();
}

async function clearOpenRouterApiKey() {
  const wasCloudEnabled = state.cloudTranscriptionEnabled;
  const secrets = readSecrets();
  delete secrets.openRouterApiKey;
  writeSecrets(secrets);
  setState({
    openRouterApiKeyConfigured: false,
    cloudTranscriptionEnabled: false,
    openRouterModels: [],
    openRouterModelsStatus: 'idle',
    openRouterModelsError: '',
    notice: translateMain('openRouterKeyCleared'),
    error: '',
  });
  savePersistentState();
  if (wasCloudEnabled) {
    await restartDictationService();
  }
  return snapshotState();
}

function createCloudRetryId() {
  return `cloud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getCloudRetryPath(id) {
  return path.join(getCloudRetriesDirectory(), `${String(id || '').replace(/[^a-z0-9_-]/gi, '')}.json`);
}

function protectCloudRetryRecord(record) {
  return protectText(JSON.stringify(record));
}

function unprotectCloudRetryRecord(payload) {
  const text = unprotectText(payload);
  if (!text) {
    return null;
  }

  try {
    const record = JSON.parse(text);
    return record && typeof record === 'object' ? record : null;
  } catch (_error) {
    return null;
  }
}

function readCloudRetryRecord(id) {
  const protectedPayload = readJsonFile(getCloudRetryPath(id));
  return unprotectCloudRetryRecord(protectedPayload);
}

function getCloudRetryRecords() {
  try {
    return fs
      .readdirSync(getCloudRetriesDirectory(), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => readCloudRetryRecord(path.basename(entry.name, '.json')))
      .filter(Boolean)
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  } catch (_error) {
    return [];
  }
}

function getCloudRetrySnapshot() {
  return getCloudRetryRecords().map((record) => ({
    id: record.id,
    model: record.model,
    language: record.language || 'unknown',
    audioDurationMs: record.audioDurationMs || 0,
    createdAt: record.createdAt,
    error: record.error || '',
  }));
}

function pruneCloudRetries() {
  const records = getCloudRetryRecords();
  for (const record of records.slice(CLOUD_RETRY_LIMIT)) {
    try {
      fs.unlinkSync(getCloudRetryPath(record.id));
    } catch (_error) {
      // Best effort.
    }
  }
}

function saveCloudRetry(payload, error, options = {}) {
  const record = {
    id: createCloudRetryId(),
    model: normalizeCloudTranscriptionModel(payload.model || state.cloudTranscriptionModel),
    format: String(payload.format || 'wav').toLowerCase(),
    data: String(payload.data || ''),
    language: payload.language || 'unknown',
    audioDurationMs: Number(payload.audio_duration_ms || payload.audioDurationMs) || 0,
    createdAt: new Date().toISOString(),
    error: String((error && error.message) || error || ''),
  };

  writeJsonFile(getCloudRetryPath(record.id), protectCloudRetryRecord(record));
  pruneCloudRetries();
  if (!options.silent) {
    setState({
      cloudRetries: getCloudRetrySnapshot(),
    });
  }
  return record;
}

function updateCloudRetryError(id, error) {
  const record = readCloudRetryRecord(id);
  if (!record) {
    return null;
  }

  const updated = {
    ...record,
    error: String((error && error.message) || error || ''),
  };
  writeJsonFile(getCloudRetryPath(record.id), protectCloudRetryRecord(updated));
  setState({
    cloudRetries: getCloudRetrySnapshot(),
  });
  return updated;
}

function deleteCloudRetry(id) {
  try {
    fs.unlinkSync(getCloudRetryPath(id));
  } catch (_error) {
    // Best effort.
  }

  setState({
    cloudRetries: getCloudRetrySnapshot(),
  });
}

function formatOpenRouterPricing(pricing = {}, contextLength = 0) {
  const input = Number(pricing.prompt);
  const output = Number(pricing.completion);
  const hasInput = Number.isFinite(input) && input > 0;
  const hasOutput = Number.isFinite(output) && output > 0;

  if (!hasInput && !hasOutput) {
    return 'Price unavailable';
  }

  if (hasOutput || contextLength > 0) {
    const inputLabel = hasInput ? `$${(input * 1000000).toFixed(2)}/M input` : '$0/M input';
    const outputLabel = hasOutput ? `$${(output * 1000000).toFixed(2)}/M output` : '$0/M output';
    return `${inputLabel}, ${outputLabel}`;
  }

  return `$${input.toFixed(6)} input billing unit`;
}

function normalizeOpenRouterModel(rawModel) {
  const model = rawModel && typeof rawModel === 'object' ? rawModel : {};
  const id = normalizeCloudTranscriptionModel(model.id);
  const description = String(model.description || '').replace(/\s+/g, ' ').trim();

  return {
    id,
    name: String(model.name || id),
    description: description.length > 190 ? `${description.slice(0, 187)}...` : description,
    pricing: model.pricing || {},
    pricingLabel: formatOpenRouterPricing(model.pricing || {}, Number(model.context_length) || 0),
  };
}

async function fetchOpenRouterModelsFromApi() {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch is not available in this runtime.');
  }

  const apiKey = readOpenRouterApiKey();
  const headers = {
    Accept: 'application/json',
    'User-Agent': `${APP_NAME}/${app.getVersion()}`,
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(OPENROUTER_STT_MODELS_URL, { headers });
  if (!response.ok) {
    throw new Error(`OpenRouter model lookup failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const models = Array.isArray(payload.data) ? payload.data.map(normalizeOpenRouterModel) : [];
  if (models.length === 0) {
    throw new Error('OpenRouter returned no speech-to-text models.');
  }

  return models;
}

async function refreshOpenRouterModels() {
  if (!hasOpenRouterApiKey()) {
    setState({
      openRouterModels: [],
      openRouterModelsStatus: 'idle',
      openRouterModelsError: '',
      openRouterApiKeyConfigured: false,
    });
    return snapshotState();
  }

  setState({
    openRouterModelsStatus: 'loading',
    openRouterModelsError: '',
    openRouterApiKeyConfigured: true,
  });

  try {
    const models = await fetchOpenRouterModelsFromApi();
    const selectedModel = models.some((model) => model.id === state.cloudTranscriptionModel)
      ? state.cloudTranscriptionModel
      : models[0].id;
    setState({
      openRouterModels: models,
      cloudTranscriptionModel: selectedModel,
      openRouterModelsStatus: 'ready',
      openRouterModelsError: '',
    });
    savePersistentState();
  } catch (error) {
    setState({
      openRouterModelsStatus: 'error',
      openRouterModelsError: String((error && error.message) || error),
      error: String((error && error.message) || error),
    });
  }

  return snapshotState();
}

function getOpenRouterModelName(modelId) {
  const model = (state.openRouterModels || []).find((item) => item.id === modelId);
  return (model && model.name) || modelId;
}

function getSingleOpenRouterLanguage(languages) {
  const selectedLanguages = Array.isArray(languages) ? languages : [];
  if (selectedLanguages.length !== 1) {
    return null;
  }

  const language = String(selectedLanguages[0] || '').trim().toLowerCase();
  return /^[a-z]{2}$/.test(language) ? language : null;
}

function loadPersistentState() {
  const persisted = readJsonFile(getSettingsPath());
  if (persisted) {
    const normalized = normalizePersistedState(persisted);
    if (JSON.stringify(persisted) !== JSON.stringify(normalized)) {
      writeJsonFile(getSettingsPath(), normalized);
    }
    return normalized;
  }

  const legacy = readJsonFile(getLegacySettingsPath());
  if (legacy) {
    const migrated = normalizePersistedState(legacy);
    writeJsonFile(getSettingsPath(), migrated);
    return migrated;
  }

  return createEmptyPersistedState();
}

function savePersistentState() {
  const payload = {
    version: PERSISTENCE_VERSION,
    preferences: {
      allowedLanguages: state.allowedLanguages,
      interfaceLanguage: state.interfaceLanguage,
      model: state.model,
      shortcut: state.shortcut,
      pasteLastShortcut: state.pasteLastShortcut,
      showOverlayBar: state.showOverlayBar,
      soundEffectsEnabled: state.soundEffectsEnabled,
      launchAtLogin: state.launchAtLogin,
      keepAllTranscriptions: state.keepAllTranscriptions,
      duckAudioEnabled: state.duckAudioEnabled,
      overlayOpacity: state.overlayOpacity,
      overlayScale: state.overlayScale,
      overlayDynamicSize: state.overlayDynamicSize,
      cloudTranscriptionEnabled: state.cloudTranscriptionEnabled,
      cloudPrivacyNoticeAccepted: state.cloudPrivacyNoticeAccepted,
      cloudTranscriptionModel: state.cloudTranscriptionModel,
      dictionaryEntries: state.dictionaryEntries,
      overlayPosition: defaults.overlayPosition,
    },
    modelStats: state.modelStats,
    history: applyHistoryRetention(state.history, state.keepAllTranscriptions),
    usageStats: state.usageStats,
  };

  writeJsonFile(getSettingsPath(), payload);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 840,
    minWidth: 980,
    minHeight: 720,
    autoHideMenuBar: true,
    show: false,
    title: APP_NAME,
    icon: getAppIconPath(),
    backgroundColor: '#f4f1eb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  mainWindow.loadFile(path.join(getProjectRoot(), 'src', 'renderer', 'index.html'));
  mainWindow.webContents.on('did-finish-load', () => {
    syncAudioControllerConfig();
  });
  mainWindow.once('ready-to-show', () => {
    if (shouldStartHiddenOnLaunch) {
      hideMainWindow();
      return;
    }

    showMainWindow({ focus: false });
  });
  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    hideMainWindow();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    refreshTrayMenu();
  });
}

function getOverlayBounds(preferredPosition = state.overlayPosition) {
  const normalizedPosition = normalizeOverlayPosition(preferredPosition);
  const point = normalizedPosition
    ? {
        x: normalizedPosition.x + Math.round(OVERLAY_WIDTH / 2),
        y: normalizedPosition.y + Math.round(OVERLAY_HEIGHT / 2),
      }
    : screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { workArea } = display;
  const defaultPosition = {
    x: Math.round(workArea.x + (workArea.width - OVERLAY_WIDTH) / 2),
    y: Math.round(workArea.y + workArea.height - OVERLAY_HEIGHT - OVERLAY_MARGIN_BOTTOM),
  };
  const target = normalizedPosition || defaultPosition;
  const maxX = workArea.x + Math.max(0, workArea.width - OVERLAY_WIDTH);
  const maxY = workArea.y + Math.max(0, workArea.height - OVERLAY_HEIGHT);

  return {
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    x: clamp(target.x, workArea.x, maxX),
    y: clamp(target.y, workArea.y, maxY),
  };
}

function positionOverlayWindow(preferredPosition = state.overlayPosition, persist = false) {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return null;
  }

  const normalizedPosition = normalizeOverlayPosition(preferredPosition);
  const hadPosition = Boolean(normalizedPosition);
  const bounds = getOverlayBounds(normalizedPosition);
  overlayWindow.setBounds(bounds, false);

  const wasClamped =
    normalizedPosition &&
    (normalizedPosition.x !== bounds.x || normalizedPosition.y !== bounds.y);

  if (!hadPosition) {
    state.overlayPosition = {
      x: bounds.x,
      y: bounds.y,
    };
  } else if (!persist && wasClamped) {
    state.overlayPosition = {
      x: bounds.x,
      y: bounds.y,
    };
  }

  if (persist) {
    setState({
      overlayPosition: {
        x: bounds.x,
        y: bounds.y,
      },
    });
  }

  return bounds;
}

function syncOverlayWindow() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  positionOverlayWindow();
  overlayWindow.setSkipTaskbar(true);

  if (state.showOverlayBar) {
    if (!overlayWindow.isVisible()) {
      overlayWindow.showInactive();
    }
  } else if (overlayWindow.isVisible()) {
    overlayWindow.hide();
  }
}

let overlayRecoveryPending = false;

// If the overlay renderer crashes or hangs, recreate it so the indicator pill and
// sound effects come back without the user having to restart the whole app.
function recoverOverlayWindow(delayMs = 400) {
  if (overlayRecoveryPending || isQuitting) {
    return;
  }

  overlayRecoveryPending = true;
  setTimeout(() => {
    overlayRecoveryPending = false;

    if (isQuitting) {
      return;
    }

    try {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.destroy();
      }
    } catch (_error) {
      // Best effort.
    }

    overlayWindow = null;
    createOverlayWindow();
  }, delayMs);
}

function resyncOverlayWindowPosition() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  positionOverlayWindow(state.overlayPosition);
  syncOverlayWindow();
}

function recoverOverlayWindowAfterResume() {
  if (isQuitting) {
    return;
  }

  setTimeout(resyncOverlayWindowPosition, 300);
  // Windows can keep the transparent always-on-top child window in a stale input
  // state after sleep/resume. Recreating it clears pointer capture and drag state.
  recoverOverlayWindow(900);
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    icon: getAppIconPath(),
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
      // The overlay spends most of its life hidden or occluded. Without this, Electron
      // throttles its timers and requestAnimationFrame loop, which silently freezes the
      // sound-effect queue and the indicator pill until the app is restarted.
      backgroundThrottling: false,
    },
  });

  overlayWindow.webContents.on('render-process-gone', () => {
    recoverOverlayWindow();
  });
  overlayWindow.webContents.on('unresponsive', () => {
    recoverOverlayWindow();
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.setSkipTaskbar(true);
  overlayWindow.setMenuBarVisibility(false);
  overlayWindow.loadFile(path.join(getProjectRoot(), 'src', 'renderer', 'overlay.html'));
  overlayWindow.webContents.on('did-finish-load', () => {
    flushPendingOverlayFeedbacks();
    syncAudioControllerConfig();
  });
  overlayWindow.on('show', () => {
    overlayWindow.setSkipTaskbar(true);
  });
  overlayWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    overlayWindow.setSkipTaskbar(true);
    syncOverlayWindow();
  });

  overlayWindow.on('ready-to-show', () => {
    syncOverlayWindow();
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function snapshotState() {
  return {
    ...state,
    platform: process.platform,
    historyTotal: state.history.length,
    historyLimit: LOCAL_HISTORY_LIMIT,
    usageSummary: buildUsageSummary(state.usageStats),
  };
}

function setState(patch) {
  Object.assign(state, patch);
  syncHotkeyActionHandling();
  const snapshot = snapshotState();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-state', snapshot);
  }

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('app-state', snapshot);
    syncOverlayWindow();
  }

  refreshTrayMenu();
}

function hasVisibleMainWindow() {
  return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
}

function showMainWindow(options = {}) {
  const { focus = true } = options;
  shouldStartHiddenOnLaunch = false;

  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (process.platform === 'darwin' && app.dock) {
    app.dock.show();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.setSkipTaskbar(false);

  if (focus) {
    mainWindow.focus();
  }

  refreshTrayMenu();
}

function hideMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.setSkipTaskbar(true);
  mainWindow.hide();

  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  refreshTrayMenu();
}

function toggleMainWindowVisibility() {
  if (hasVisibleMainWindow()) {
    hideMainWindow();
    return;
  }

  showMainWindow();
}

function createTray() {
  if (tray) {
    return tray;
  }

  tray = new Tray(getTrayIconImage());
  tray.setToolTip(APP_NAME);
  tray.on('click', () => {
    toggleMainWindowVisibility();
  });
  tray.on('double-click', () => {
    showMainWindow();
  });
  refreshTrayMenu(true);
  return tray;
}

function refreshTrayMenu(force = false) {
  if (!tray) {
    return;
  }

  const visible = hasVisibleMainWindow();
  const signature = `${visible ? 'visible' : 'hidden'}:${state.interfaceLanguage}`;
  if (!force && signature === trayMenuSignature) {
    return;
  }
  trayMenuSignature = signature;

  const menu = Menu.buildFromTemplate([
    {
      label: translateMain(visible ? 'trayHideApp' : 'trayOpenApp'),
      click: () => {
        if (visible) {
          hideMainWindow();
          return;
        }

        showMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: translateMain('trayQuit'),
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
}

function syncLaunchAtLoginSetting() {
  const shouldOpenAtLogin = normalizeLaunchAtLoginPreference(state.launchAtLogin);

  app.setLoginItemSettings({
    openAtLogin: shouldOpenAtLogin,
    openAsHidden: shouldOpenAtLogin,
    args: ['--background'],
  });
}

function setOverlayAudioLevel(level) {
  const nextLevel = clamp(Number(level) || 0, 0, 1);
  const changed = Math.abs(nextLevel - state.audioLevel) >= 0.015 || (nextLevel === 0) !== (state.audioLevel === 0);
  state.audioLevel = nextLevel;
  if (nextLevel === 0) {
    lastOverlayAudioBands = [];
  }

  if (!changed || !overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  overlayWindow.webContents.send('overlay-audio-level', nextLevel);
}

function setOverlayAudioBands(bands) {
  if (!Array.isArray(bands) || bands.length === 0) {
    return;
  }

  const normalizedBands = bands.map((value) => clamp(Number(value) || 0, 0, 3));
  const changed =
    normalizedBands.length !== lastOverlayAudioBands.length ||
    normalizedBands.some(
      (value, index) => Math.abs(value - (lastOverlayAudioBands[index] || 0)) >= 0.08,
    );
  if (!changed) {
    return;
  }
  lastOverlayAudioBands = normalizedBands;

  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  overlayWindow.webContents.send('overlay-audio-bands', normalizedBands);
}

function getServiceEnv() {
  const macOverrides =
    process.platform === 'darwin'
      ? {
          WHISPER_DEVICE: 'cpu',
          WHISPER_COMPUTE_TYPE: 'int8',
          WHISPER_CPU_THREADS: '4',
          OMP_NUM_THREADS: '4',
        }
      : {};

  return {
    ...process.env,
    WHISPER_MODEL: state.model,
    FLOW_TRANSCRIPTION_ENGINE: state.cloudTranscriptionEnabled ? 'cloud' : 'local',
    WHISPER_MODEL_DIR: getModelsDirectory(),
    ALLOWED_LANGUAGES: state.allowedLanguages.join(','),
    FLOW_HOTKEY: state.shortcut,
    FLOW_PASTE_LAST_HOTKEY: state.pasteLastShortcut,
    HF_HOME: getHuggingFaceHomeDirectory(),
    HUGGINGFACE_HUB_CACHE: getHuggingFaceHubCacheDirectory(),
    HF_HUB_DISABLE_SYMLINKS_WARNING: '1',
    HF_HUB_DISABLE_PROGRESS_BARS: '1',
    OBJC_DISABLE_INITIALIZE_FORK_SAFETY: 'YES',
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1',
    ...macOverrides,
  };
}

function sendServiceCommand(type, payload = {}) {
  if (!serviceProcess || !serviceProcess.stdin.writable) {
    return;
  }

  serviceProcess.stdin.write(`${JSON.stringify({ type, payload })}\n`);
}

function sendHotkeyCommand(type, payload = {}) {
  if (!hotkeyProcess || !hotkeyProcess.stdin.writable) {
    return;
  }

  hotkeyProcess.stdin.write(`${JSON.stringify({ type, payload })}\n`);
}

function getHotkeyActionHandlingState() {
  const hasLiveCapture =
    state.captureMode !== null || state.pendingStartMode !== null || state.listening;
  const canConsumeEscape =
    hasLiveCapture ||
    state.dictationSessionId !== null ||
    state.pendingPaste ||
    state.phase === 'transcribing';

  return {
    suppressEscape: canConsumeEscape,
    suppressSpace: false,
  };
}

function syncHotkeyActionHandling(force = false) {
  const next = getHotkeyActionHandlingState();
  const unchanged =
    next.suppressEscape === lastHotkeyActionHandling.suppressEscape &&
    next.suppressSpace === lastHotkeyActionHandling.suppressSpace;

  if (!force && unchanged) {
    return;
  }

  lastHotkeyActionHandling = next;
  sendHotkeyCommand('set-action-key-handling', {
    suppress_escape: next.suppressEscape,
    suppress_space: next.suppressSpace,
  });
}

function normalizeTextForPaste(text) {
  const trimmed = String(text || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return '';
  }

  return /[.,!?;:\n]$/.test(trimmed) ? trimmed : `${trimmed} `;
}

function rebuildDictionaryReplacementIndex(entries = state.dictionaryEntries) {
  dictionaryReplacementIndex = createDictionaryReplacementIndex(entries);
}

function applyDictionaryReplacements(text, detectedLanguage) {
  const input = String(text || '').trim();
  if (!input || !Array.isArray(state.dictionaryEntries) || state.dictionaryEntries.length === 0) {
    return input;
  }

  const language = String(detectedLanguage || '')
    .trim()
    .toLowerCase();
  const scopedSources =
    !language || language === 'unknown'
      ? dictionaryReplacementIndex.all
      : dictionaryReplacementIndex[language] || dictionaryReplacementIndex.all;

  if (scopedSources.length === 0) {
    return input;
  }

  let output = input;
  const tokenPrefix = `__OPENFLOW_DICT_${Date.now().toString(36)}__`;
  const replacements = [];

  for (const entry of scopedSources) {
    output = output.replace(entry.pattern, () => {
      const token = `${tokenPrefix}${replacements.length}__`;
      replacements.push({
        token,
        target: entry.target,
      });
      return token;
    });
  }

  for (const replacement of replacements) {
    output = output.replaceAll(replacement.token, replacement.target);
  }

  return output;
}

function getNextDictationSessionId() {
  return Number(state.dictationSessionId || 0) + 1;
}

function normalizeCaptureMode(mode) {
  return mode === 'hands-free' ? 'hands-free' : 'hold';
}

function getWaitingNotice(captureMode) {
  if (state.switchingModel) {
    return captureMode === 'hands-free'
      ? translateMain('waitingSwitchHandsFree', {
          model: getModelDisplayName(state.model),
        })
      : translateMain('waitingSwitchHold', {
          model: getModelDisplayName(state.model),
        });
  }

  return captureMode === 'hands-free'
    ? translateMain('waitingBootHandsFree')
    : translateMain('waitingBootHold');
}

function isHandsFreeNotice(notice) {
  return String(notice || '').toLowerCase().includes('hands-free');
}

function clearHandsFreeNotice(notice = state.notice) {
  return isHandsFreeNotice(notice) ? '' : notice;
}

function extractSessionId(payload) {
  const value = Number(payload?.session_id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function isCurrentDictationSession(sessionId) {
  return sessionId === null || sessionId === state.dictationSessionId;
}

function hasOngoingTranscription() {
  return (
    state.phase === 'transcribing' ||
    state.pendingPaste ||
    (state.dictationSessionId !== null && !state.listening)
  );
}

// Paste operations are serialized: a transcription auto-paste and a manual
// "paste last" shortcut must never run their clipboard swaps concurrently, or one
// process restores the old clipboard while the other is mid-paste, which leaves the
// target app pasting stale/empty text and breaks subsequent pastes too.
let pasteChain = Promise.resolve();

function insertTextIntoFocusedApp(text) {
  const run = () => runTextInsertion(text);
  const next = pasteChain.then(run, run);
  // Keep the chain alive even when a paste rejects, but don't surface that rejection
  // to the chain's own consumers (each caller still gets its own result/rejection).
  pasteChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

// Snapshot every common clipboard format before we hijack the clipboard for a
// paste, so non-text content (images, formatted text) survives the swap. Reading
// only plain text — as the old code did — meant an image or rich-text clipboard
// was wiped (readText() returns '' for those, so the restore branch cleared it).
function captureClipboardSnapshot() {
  let formats = [];
  try {
    formats = clipboard.availableFormats() || [];
  } catch (_error) {
    formats = [];
  }

  const snapshot = { wasEmpty: formats.length === 0, data: {} };

  try {
    const text = clipboard.readText();
    if (text) {
      snapshot.data.text = text;
    }
  } catch (_error) {
    // ignore unreadable format
  }
  try {
    const html = clipboard.readHTML();
    if (html) {
      snapshot.data.html = html;
    }
  } catch (_error) {
    // ignore unreadable format
  }
  try {
    const rtf = clipboard.readRTF();
    if (rtf) {
      snapshot.data.rtf = rtf;
    }
  } catch (_error) {
    // ignore unreadable format
  }
  try {
    const image = clipboard.readImage();
    if (image && !image.isEmpty()) {
      snapshot.data.image = image;
    }
  } catch (_error) {
    // ignore unreadable format
  }

  return snapshot;
}

function restoreClipboardSnapshot(snapshot) {
  if (!snapshot) {
    return;
  }

  try {
    if (snapshot.wasEmpty) {
      clipboard.clear();
      return;
    }

    const data = snapshot.data || {};
    if (Object.keys(data).length > 0) {
      clipboard.write(data);
    } else {
      // The previous clipboard held only formats we could not capture (e.g. file
      // references). Clearing avoids leaving our injected text behind, which is the
      // lesser of the two evils.
      clipboard.clear();
    }
  } catch (_error) {
    // Best effort: a restore failure must never break the paste flow.
  }
}

function runTextInsertion(text) {
  return new Promise((resolve, reject) => {
    if (process.platform === 'darwin') {
      const clipboardSnapshot = captureClipboardSnapshot();
      clipboard.writeText(String(text || ''));

      const appleScript = [
        'tell application "System Events"',
        '  keystroke "v" using command down',
        'end tell',
      ];
      const osascript = spawn('osascript', appleScript.flatMap((line) => ['-e', line]));
      let stderr = '';

      osascript.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      osascript.on('error', (error) => {
        restoreClipboardSnapshot(clipboardSnapshot);
        reject(error);
      });

      osascript.on('close', (code) => {
        setTimeout(() => {
          restoreClipboardSnapshot(clipboardSnapshot);
        }, 120);

        if (code === 0) {
          resolve();
          return;
        }

        if (/not authorized|not permitted|assistive access|system events got an error/i.test(stderr)) {
          reject(
            new Error(
              'Allow OpenFlow in Privacy & Security > Accessibility and Automation to paste into the active app.',
            ),
          );
          return;
        }

        reject(new Error(stderr || `osascript exited with code ${code}`));
      });
      return;
    }

    const scriptPath = path.join(getRuntimeBasePath(), 'scripts', 'send_text.ps1');
    const encodedText = Buffer.from(text, 'utf8').toString('base64');
    const powershell = spawn(
      'powershell.exe',
      ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-EncodedText', encodedText],
      { windowsHide: true },
    );

    let stderr = '';
    let stdout = '';
    let settled = false;
    let pasteTimeout = null;

    const cleanup = () => {
      if (pasteTimeout) {
        clearTimeout(pasteTimeout);
        pasteTimeout = null;
      }
    };

    const resolveOnce = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };

    const rejectOnce = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    };

    if (powershell.stdout) {
      powershell.stdout.setEncoding('utf8');
      powershell.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        if (stdout.includes(WINDOWS_PASTE_READY_SIGNAL)) {
          resolveOnce();
        }
      });
    }

    powershell.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    powershell.on('error', (error) => {
      rejectOnce(error);
    });

    powershell.on('close', (code) => {
      if (settled) {
        return;
      }

      if (code === 0) {
        resolveOnce();
        return;
      }

      rejectOnce(new Error(stderr || `PowerShell exited with code ${code}`));
    });

    pasteTimeout = setTimeout(() => {
      try {
        powershell.kill();
      } catch (_error) {
        // Best effort.
      }

        rejectOnce(new Error('Timed out while pasting text into the active app.'));
    }, WINDOWS_PASTE_TIMEOUT_MS);
  });
}

function getSystemAudioControllerScriptPath() {
  return path.join(getRuntimeBasePath(), 'scripts', 'system_audio_controller.ps1');
}

function sendOverlayFeedback(type, payload = {}) {
  const message = { type, payload };
  syncAudioControllerConfig();

  if (!overlayWindow || overlayWindow.isDestroyed() || overlayWindow.webContents.isLoading()) {
    pendingOverlayFeedbacks.push(message);
    return;
  }

  overlayWindow.webContents.send('overlay-feedback', message);
}

function resetDictationFeedbackState() {
  currentDictationStartedAt = 0;
}

function playHandsFreeSoundIfEligible() {
  if (!currentDictationStartedAt) {
    return;
  }

  if (Date.now() - currentDictationStartedAt < HANDS_FREE_SOUND_DELAY_MS) {
    return;
  }

  sendOverlayFeedback('play-sound', { sound: 'handsfree' });
}

function flushPendingOverlayFeedbacks() {
  if (!overlayWindow || overlayWindow.isDestroyed() || overlayWindow.webContents.isLoading()) {
    return;
  }

  while (pendingOverlayFeedbacks.length > 0) {
    overlayWindow.webContents.send('overlay-feedback', pendingOverlayFeedbacks.shift());
  }
}

function collectAppAudioPids() {
  const pids = new Set([process.pid]);

  try {
    for (const metric of app.getAppMetrics()) {
      const pid = Number(metric?.pid);
      if (Number.isInteger(pid) && pid > 0) {
        pids.add(pid);
      }
    }
  } catch (_error) {
    // Best effort. Fallback to known window processes below.
  }

  for (const windowRef of [mainWindow, overlayWindow]) {
    if (!windowRef || windowRef.isDestroyed()) {
      continue;
    }

    const pid = Number(windowRef.webContents.getOSProcessId());
    if (Number.isInteger(pid) && pid > 0) {
      pids.add(pid);
    }
  }

  return [...pids];
}

function syncAudioControllerConfig(force = false) {
  const payload = {
    excluded_pids: collectAppAudioPids(),
    duck_volume: 0,
  };
  const signature = JSON.stringify(payload);
  if (!force && signature === lastAudioControllerConfigSignature) {
    return;
  }

  lastAudioControllerConfigSignature = signature;
  sendAudioCommand('configure', payload);
}

function sendAudioCommand(type, payload = {}) {
  if (!audioProcess || !audioProcess.stdin.writable) {
    return;
  }

  audioProcess.stdin.write(`${JSON.stringify({ type, payload })}\n`);
}

function engageCaptureMute() {
  if (process.platform === 'win32') {
    if (!state.duckAudioEnabled) {
      return;
    }
    captureMuteDepth += 1;
    if (captureMuteDepth > 1) {
      return;
    }
    sendAudioCommand('capture-begin');
  }
}

function releaseCaptureMute(force = false) {
  if (process.platform === 'win32') {
    if (force) {
      const shouldNotify = captureMuteDepth > 0;
      captureMuteDepth = 0;
      if (shouldNotify) {
        sendAudioCommand('capture-end');
      }
      return;
    }

    if (captureMuteDepth <= 0) {
      return;
    }

    captureMuteDepth -= 1;
    if (captureMuteDepth > 0) {
      return;
    }
    sendAudioCommand('capture-end');
  }
}

function getLatestSavedTranscriptionText() {
  const latestHistoryEntry = state.history[0];
  if (latestHistoryEntry && typeof latestHistoryEntry.text === 'string' && latestHistoryEntry.text.trim()) {
    return latestHistoryEntry.text.trim();
  }

  if (typeof state.latestFinal === 'string' && state.latestFinal.trim()) {
    return state.latestFinal.trim();
  }

  return '';
}

function getLatestPersistedTranscriptionText() {
  try {
    const persisted = loadPersistentState();
    const latestHistoryEntry = persisted.history[0];
    if (latestHistoryEntry && typeof latestHistoryEntry.text === 'string' && latestHistoryEntry.text.trim()) {
      return latestHistoryEntry.text.trim();
    }
  } catch (_error) {
    // Best effort fallback for the paste-last shortcut.
  }

  return '';
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requestPasteLatestTranscription(source = 'unknown') {
  const now = Date.now();
  if (now - lastPasteLastRequestAt < 300) {
    return;
  }

  lastPasteLastRequestAt = now;
  void pasteLatestTranscription(source);
}

async function pasteLatestTranscription() {
  const nextPhase = state.listening ? 'listening' : 'idle';

  setOverlayAudioLevel(0);
  setState({
    pendingPaste: true,
    phase: 'transcribing',
    error: '',
  });

  try {
    await delay(PASTE_SHORTCUT_SETTLE_DELAY_MS);
    const latestText = getLatestSavedTranscriptionText() || getLatestPersistedTranscriptionText();
    if (!latestText) {
      setState({
        error: 'Nenhuma transcricao salva disponivel para colar.',
      });
      return;
    }

    await insertTextIntoFocusedApp(normalizeTextForPaste(latestText));
    if (state.error === 'Nenhuma transcricao salva disponivel para colar.') {
      setState({
        error: '',
      });
    }
  } catch (error) {
    setState({
      error: `Failed to paste the last transcription: ${error.message}`,
    });
  } finally {
    setState({
      pendingPaste: false,
      phase: nextPhase,
    });
  }
}

function startListening(mode = 'hold') {
  const captureMode = normalizeCaptureMode(mode);

  if (Date.now() < suppressStartRequestsUntil) {
    return snapshotState();
  }

  if (!state.engineReady || !state.serviceOnline) {
    setState({
      pendingStartMode: captureMode,
      notice: getWaitingNotice(captureMode),
      error: '',
    });
    return snapshotState();
  }

  if (hasOngoingTranscription()) {
    releaseCaptureMute(true);
    setState({
      pendingStartMode: null,
      notice: translateMain('transcriptionBusy'),
      error: '',
    });
    return snapshotState();
  }

  if (state.listening || state.captureMode !== null) {
    if (captureMode === 'hands-free' && state.captureMode !== 'hands-free') {
      setState({
        captureMode,
        notice: translateMain('handsFreeActive', {
          shortcut: formatShortcutForDisplay(state.shortcut),
        }),
        error: '',
      });
      playHandsFreeSoundIfEligible();
    }
    return snapshotState();
  }

  const sessionId = getNextDictationSessionId();
  currentDictationStartedAt = Date.now();
  setOverlayAudioLevel(0);
  setState({
    captureMode,
    dictationSessionId: sessionId,
    pendingStartMode: null,
    notice:
      captureMode === 'hands-free'
        ? translateMain('handsFreeActive', {
            shortcut: formatShortcutForDisplay(state.shortcut),
          })
        : clearHandsFreeNotice(),
    error: '',
  });
  if (Date.now() >= suppressStartSoundUntil) {
    sendOverlayFeedback('play-sound', { sound: 'start', interrupt: true });
  }
  suppressStartSoundUntil = 0;
  suppressStartRequestsUntil = 0;
  engageCaptureMute();
  sendServiceCommand('start', { session_id: sessionId });
  return snapshotState();
}

function stopListening() {
  const nextNotice = clearHandsFreeNotice();
  const hadLiveCapture =
    state.captureMode !== null || state.listening || state.dictationSessionId !== null;
  resetDictationFeedbackState();
  releaseCaptureMute(true);

  if (!state.listening && !state.pendingStartMode && state.dictationSessionId === null) {
    setOverlayAudioLevel(0);
    setState({
      captureMode: null,
      notice: nextNotice,
    });
    return snapshotState();
  }

  if (!state.serviceOnline || !state.engineReady) {
    setOverlayAudioLevel(0);
    setState({
      pendingStartMode: null,
      captureMode: null,
      notice: nextNotice,
    });
    return snapshotState();
  }

  setState({
    pendingStartMode: null,
    captureMode: null,
    notice: nextNotice,
  });
  if (hadLiveCapture) {
    sendOverlayFeedback('play-sound', { sound: 'close', interrupt: true });
  }
  setOverlayAudioLevel(0);
  if (state.dictationSessionId !== null) {
    sendServiceCommand('stop', { session_id: state.dictationSessionId });
  }
  return snapshotState();
}

function cancelDictation(source = 'escape') {
  const hadActiveDictation =
    state.listening ||
    state.pendingStartMode !== null ||
    state.pendingPaste ||
    state.phase === 'transcribing' ||
    state.dictationSessionId !== null;

  if (!hadActiveDictation) {
    return snapshotState();
  }

  const nextNotice =
    source === 'escape' ? 'Ditado cancelado por Esc.' : 'Ditado cancelado.';
  const sessionId = state.dictationSessionId;
  if (sessionId !== null) {
    activeCloudTranscriptionSessions.delete(sessionId);
  }
  resetDictationFeedbackState();

  setState({
    hotkeyPressed: false,
    listening: false,
    pendingStartMode: null,
    captureMode: null,
    dictationSessionId: null,
    pendingPaste: false,
    partial: '',
    phase: 'idle',
    notice: nextNotice,
    error: '',
  });
  setOverlayAudioLevel(0);
  releaseCaptureMute(true);
  sendOverlayFeedback('play-sound', { sound: 'cancel', interrupt: true });

  if (state.serviceOnline && state.engineReady && sessionId !== null) {
    sendServiceCommand('cancel', { session_id: sessionId });
  }

  return snapshotState();
}

function recordModelTiming(modelId, transcriptionMs) {
  const normalizedModel = normalizeModel(modelId);
  const ms = Number(transcriptionMs) || 0;
  if (!ms) {
    return state.modelStats;
  }

  const current = state.modelStats[normalizedModel] || {
    count: 0,
    totalMs: 0,
    averageMs: 0,
    lastMs: 0,
  };
  const updated = {
    count: current.count + 1,
    totalMs: current.totalMs + ms,
    lastMs: ms,
  };
  updated.averageMs = updated.totalMs / updated.count;

  return {
    ...state.modelStats,
    [normalizedModel]: updated,
  };
}

function classifyWarning(message) {
  const text = String(message || '');
  if (!text) {
    return;
  }

  if (text.includes('GPU') || text.includes('CUDA') || text.includes('cuBLAS')) {
    setState({
      deviceNote: text,
      notice: '',
    });
    return;
  }

  setState({
    notice: text,
  });
}

async function commitTranscription(payload, sessionId, options = {}) {
  const text = String(payload.text || '').trim();
  if (!text) {
    return;
  }

  const shouldPaste = options.paste !== false;
  const isCloud = payload.engine === 'cloud';
  const resolvedText = applyDictionaryReplacements(text, payload.language);
  const pasteText = normalizeTextForPaste(resolvedText);
  const entry = {
    model: payload.model || (isCloud ? state.cloudTranscriptionModel : state.model),
    engine: isCloud ? 'cloud' : 'local',
    text: resolvedText,
    language: payload.language || 'unknown',
    transcriptionMs: payload.transcription_ms || payload.transcriptionMs || 0,
    audioDurationMs: payload.audio_duration_ms || payload.audioDurationMs || 0,
    wordCount: countWords(resolvedText),
    timestamp: new Date().toISOString(),
    costUsd: Number(payload.cost_usd || payload.costUsd) || 0,
  };
  const history = applyHistoryRetention([entry, ...state.history], state.keepAllTranscriptions);
  const usageStats = recordUsage(state.usageStats, entry);
  const modelStats = isCloud
    ? state.modelStats
    : recordModelTiming(payload.model || state.model, entry.transcriptionMs);

  setState({
    latestFinal: resolvedText,
    latestLanguage: payload.language || 'unknown',
    partial: '',
    history,
    usageStats,
    modelStats,
    dictationSessionId: sessionId,
    pendingPaste: shouldPaste,
    phase: shouldPaste ? 'transcribing' : state.listening ? 'listening' : 'idle',
    error: '',
  });
  savePersistentState();

  if (!shouldPaste) {
    return;
  }

  try {
    await insertTextIntoFocusedApp(pasteText);
  } catch (error) {
    setState({
      error: `Failed to paste text into the active field: ${error.message}`,
    });
  } finally {
    setState({
      dictationSessionId: state.listening ? state.dictationSessionId : null,
      pendingPaste: false,
      phase: state.listening ? 'listening' : 'idle',
    });
  }
}

async function transcribeWithOpenRouter(audioPayload, options = {}) {
  const apiKey = readOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured.');
  }

  const model = normalizeCloudTranscriptionModel(
    audioPayload.model || options.model || state.cloudTranscriptionModel,
  );
  const body = {
    model,
    input_audio: {
      data: String(audioPayload.data || ''),
      format: String(audioPayload.format || 'wav').toLowerCase(),
    },
    temperature: 0,
  };
  const requestLanguage = getSingleOpenRouterLanguage(state.allowedLanguages);
  if (requestLanguage) {
    body.language = requestLanguage;
  }

  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, CLOUD_TRANSCRIPTION_TIMEOUT_MS);
  let response = null;

  try {
    response = await fetch(OPENROUTER_STT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': `${APP_NAME}/${app.getVersion()}`,
      },
      body: JSON.stringify(body),
      signal: abortController.signal,
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('OpenRouter transcription timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  let result = null;
  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch (_error) {
    result = {};
  }

  if (!response.ok) {
    const message = result && (result.error?.message || result.message);
    throw new Error(message || `OpenRouter transcription failed with HTTP ${response.status}.`);
  }

  const text = String((result && result.text) || '').trim();
  if (!text) {
    throw new Error('OpenRouter returned an empty transcription.');
  }

  return {
    engine: 'cloud',
    model,
    text,
    language: requestLanguage || 'unknown',
    transcription_ms: Date.now() - startedAt,
    audio_duration_ms:
      Number(audioPayload.audio_duration_ms || audioPayload.audioDurationMs) ||
      Number(result?.usage?.seconds || 0) * 1000 ||
      0,
    cost_usd: Number(result?.usage?.cost) || 0,
  };
}

async function handleCloudAudioPayload(payload, sessionId) {
  if (!isCurrentDictationSession(sessionId)) {
    return;
  }

  const retryRecord = saveCloudRetry(
    {
      ...payload,
      model: state.cloudTranscriptionModel,
    },
    '',
    { silent: true },
  );

  if (sessionId !== null) {
    activeCloudTranscriptionSessions.add(sessionId);
  }
  setState({
    phase: 'transcribing',
    partial: '',
    error: '',
  });

  try {
    const result = await transcribeWithOpenRouter(payload);
    if (!isCurrentDictationSession(sessionId)) {
      deleteCloudRetry(retryRecord.id);
      return;
    }
    await commitTranscription(result, sessionId, { paste: true });
    deleteCloudRetry(retryRecord.id);
  } catch (error) {
    if (!isCurrentDictationSession(sessionId)) {
      deleteCloudRetry(retryRecord.id);
      return;
    }
    updateCloudRetryError(retryRecord.id, error);
    resetDictationFeedbackState();
    releaseCaptureMute(true);
    setState({
      notice: translateMain('cloudRetrySaved'),
      error: String((error && error.message) || error),
      pendingPaste: false,
      pendingStartMode: null,
      captureMode: null,
      dictationSessionId: null,
      phase: 'idle',
    });
  } finally {
    if (sessionId !== null) {
      activeCloudTranscriptionSessions.delete(sessionId);
    }
  }
}

async function retryCloudTranscription(id) {
  const record = readCloudRetryRecord(id);
  if (!record) {
    throw new Error('Saved recording was not found.');
  }

  setState({
    phase: 'transcribing',
    error: '',
  });

  try {
    const result = await transcribeWithOpenRouter(record, { model: record.model });
    await commitTranscription(result, null, { paste: false });
    deleteCloudRetry(record.id);
    setState({
      notice: translateMain('cloudRetrySucceeded'),
      phase: state.listening ? 'listening' : 'idle',
    });
  } catch (error) {
    const updated = {
      ...record,
      error: String((error && error.message) || error),
    };
    writeJsonFile(getCloudRetryPath(record.id), protectCloudRetryRecord(updated));
    setState({
      cloudRetries: getCloudRetrySnapshot(),
      error: updated.error,
      phase: state.listening ? 'listening' : 'idle',
    });
  }

  return snapshotState();
}

async function handleServiceEvent(event) {
  const payload = event.payload || {};
  const sessionId = extractSessionId(payload);

  switch (event.type) {
    case 'ready':
      {
        const pendingStartMode = state.pendingStartMode;
        const shouldPlayLoadedFeedback = !hasPlayedLoadedFeedback;
        setOverlayAudioLevel(0);
        setState({
          engineReady: true,
          phase: 'idle',
          serviceOnline: true,
          model: state.cloudTranscriptionEnabled ? state.model : payload.model || state.model,
          device: payload.device || state.device,
          deviceNote: payload.note || state.deviceNote,
          switchingModel: false,
          pendingPaste: false,
          notice: pendingStartMode !== 'hands-free' ? '' : state.notice,
          error: '',
        });
        if (shouldPlayLoadedFeedback) {
          hasPlayedLoadedFeedback = true;
          sendOverlayFeedback('loaded-ready', {
            sound: 'loaded',
          });
        }
        if (pendingStartMode === 'hands-free' || (pendingStartMode === 'hold' && state.hotkeyPressed)) {
          startListening(pendingStartMode);
        }
        break;
      }
    case 'state':
      if (!isCurrentDictationSession(sessionId)) {
        break;
      }
      if (sessionId !== null && activeCloudTranscriptionSessions.has(sessionId)) {
        setState({
          listening: Boolean(payload.listening),
          dictationSessionId: sessionId,
          phase: 'transcribing',
        });
        break;
      }
      if (!payload.listening || payload.phase !== 'listening') {
        setOverlayAudioLevel(0);
      }
      setState({
        listening: Boolean(payload.listening),
        dictationSessionId: payload.listening ? sessionId || state.dictationSessionId : state.dictationSessionId,
        phase:
          state.pendingPaste && (payload.phase === 'idle' || payload.phase === 'transcribing')
            ? 'transcribing'
            : payload.phase || state.phase,
      });

      if (!payload.listening && payload.phase === 'idle' && sessionId !== null) {
        setState({
          dictationSessionId: null,
        });
      }
      break;
    case 'level':
      if (!isCurrentDictationSession(sessionId)) {
        break;
      }
      setOverlayAudioLevel(payload.level);
      setOverlayAudioBands(payload.bands);
      break;
    case 'partial':
      if (!isCurrentDictationSession(sessionId)) {
        break;
      }
      setState({
        partial: payload.text || '',
      });
      break;
    case 'audio':
      await handleCloudAudioPayload(payload, sessionId);
      break;
    case 'final': {
      if (!isCurrentDictationSession(sessionId)) {
        break;
      }
      await commitTranscription({ ...payload, engine: 'local' }, sessionId, { paste: true });
      break;
    }
    case 'warning':
      classifyWarning(payload.message || 'Aviso do motor de ditado.');
      break;
    case 'error':
      resetDictationFeedbackState();
      releaseCaptureMute(true);
      setState({
        notice: '',
        error: payload.message || 'Erro no motor de ditado.',
        pendingPaste: false,
        pendingStartMode: null,
        captureMode: null,
        dictationSessionId: null,
        phase: 'error',
      });
      setOverlayAudioLevel(0);
      break;
    default:
      break;
  }
}

function handleHotkeyEvent(event) {
  const payload = event.payload || {};
  const hotkeyMode = normalizeCaptureMode(payload.mode);

  switch (event.type) {
    case 'ready':
      setState({
        hotkeyOnline: true,
        shortcut: payload.shortcut || state.shortcut,
        pasteLastShortcut:
          payload.paste_last_shortcut || payload.pasteLastShortcut || state.pasteLastShortcut,
      });
      break;
    case 'hotkey-pressed':
      if (hasOngoingTranscription()) {
        ignoreNextHotkeyRelease = true;
        releaseCaptureMute(true);
        setState({
          hotkeyPressed: false,
          notice: translateMain('transcriptionBusy'),
          error: '',
        });
        break;
      }
      setState({
        hotkeyPressed: true,
      });
      if (state.captureMode === 'hands-free' || state.pendingStartMode === 'hands-free') {
        suppressStartSoundUntil = Date.now() + 1200;
        suppressStartRequestsUntil = Date.now() + 450;
        ignoreNextHotkeyRelease = true;
        stopListening();
        break;
      }

      ignoreNextHotkeyRelease = false;
      startListening(hotkeyMode);
      break;
    case 'hotkey-mode-changed':
      startListening(hotkeyMode);
      break;
    case 'hotkey-released':
      setState({
        hotkeyPressed: false,
      });
      if (ignoreNextHotkeyRelease) {
        ignoreNextHotkeyRelease = false;
        break;
      }
      if (state.captureMode === 'hands-free' || state.pendingStartMode === 'hands-free') {
        break;
      }

      if (state.pendingStartMode === 'hold') {
        setState({
          pendingStartMode: null,
          notice: clearHandsFreeNotice(),
        });
      }
      stopListening();
      break;
    case 'cancel-requested':
      cancelDictation(payload.source || 'escape');
      break;
    case 'paste-last-requested':
      if (!pasteLastRegisteredViaElectron) {
        requestPasteLatestTranscription('python-hotkey-listener');
      }
      break;
    case 'warning':
      classifyWarning(payload.message || state.notice);
      break;
    case 'error':
      setState({
        error: payload.message || 'Erro no listener de atalho global.',
      });
      break;
    default:
      break;
  }
}

function handleAudioControllerEvent(event) {
  const message = event?.payload?.message;

  switch (event.type) {
    case 'ready':
      syncAudioControllerConfig(true);
      if (captureMuteDepth > 0) {
        sendAudioCommand('capture-begin');
      }
      break;
    case 'warning':
      if (message) {
        console.warn('[audio-mute]', message);
      }
      break;
    case 'error':
      console.warn('[audio-mute]', message || 'Falha no controlador de audio do sistema.');
      break;
    default:
      break;
  }
}

function attachJsonReader(childProcess, onEvent, onInvalidJson) {
  if (childProcess.stdout) {
    childProcess.stdout.setEncoding('utf8');
  }

  const reader = readline.createInterface({
    input: childProcess.stdout,
    crlfDelay: Infinity,
  });

  reader.on('line', (line) => {
    if (!line.trim()) {
      return;
    }

    try {
      onEvent(JSON.parse(line));
    } catch (error) {
      onInvalidJson(error);
    }
  });

  return reader;
}

function configureTextPipes(childProcess) {
  if (childProcess.stdout) {
    childProcess.stdout.setEncoding('utf8');
  }

  if (childProcess.stderr) {
    childProcess.stderr.setEncoding('utf8');
  }
}

function unregisterPasteLastShortcut() {
  if (pasteLastRegisteredAccelerator) {
    globalShortcut.unregister(pasteLastRegisteredAccelerator);
    pasteLastRegisteredAccelerator = null;
  }

  pasteLastRegisteredViaElectron = false;
}

function unregisterMainShortcut() {
  if (mainShortcutRegisteredAccelerator) {
    globalShortcut.unregister(mainShortcutRegisteredAccelerator);
    mainShortcutRegisteredAccelerator = null;
  }

  mainShortcutRegisteredViaElectron = false;
}

function togglePrimaryShortcutCapture() {
  if (hasOngoingTranscription()) {
    releaseCaptureMute(true);
    setState({
      notice: translateMain('transcriptionBusy'),
      error: '',
    });
    return;
  }

  const hasPendingOrActiveCapture =
    state.captureMode !== null || state.pendingStartMode !== null || state.dictationSessionId !== null;

  if (state.listening || hasPendingOrActiveCapture) {
    suppressStartSoundUntil = Date.now() + 1200;
    suppressStartRequestsUntil = Date.now() + 450;
    stopListening();
    return;
  }

  startListening(process.platform === 'darwin' ? 'hands-free' : 'hold');
}

function registerMainShortcut() {
  unregisterMainShortcut();

  if (!isElectronAcceleratorCompatible(state.shortcut)) {
    mainShortcutRegisteredViaElectron = false;
    return false;
  }

  const accelerator = shortcutToElectronAccelerator(state.shortcut);
  if (!accelerator) {
    setState({
      hotkeyOnline: false,
      error: `Atalho invalido para o ditado: ${state.shortcut}`,
    });
    return false;
  }

  try {
    const registered = globalShortcut.register(accelerator, () => {
      togglePrimaryShortcutCapture();
    });

    mainShortcutRegisteredViaElectron = registered;
    if (!registered) {
      setState({
        hotkeyOnline: false,
        error: `Nao foi possivel registrar o atalho global ${state.shortcut} para iniciar o ditado.`,
      });
      return false;
    }

    mainShortcutRegisteredAccelerator = accelerator;
    setState({
      hotkeyOnline: true,
    });
    return true;
  } catch (error) {
    mainShortcutRegisteredViaElectron = false;
    setState({
      hotkeyOnline: false,
      error: `Failed to register shortcut ${state.shortcut}: ${error.message}`,
    });
    return false;
  }
}

function registerPasteLastShortcut() {
  unregisterPasteLastShortcut();

  if (!isElectronAcceleratorCompatible(state.pasteLastShortcut)) {
    pasteLastRegisteredViaElectron = false;
    return false;
  }

  const accelerator = shortcutToElectronAccelerator(state.pasteLastShortcut);
  if (!accelerator) {
    setState({
      error: `Atalho invalido para colar a ultima transcricao: ${state.pasteLastShortcut}`,
    });
    return false;
  }

  try {
    const registered = globalShortcut.register(accelerator, () => {
      requestPasteLatestTranscription('electron-global-shortcut');
    });

    pasteLastRegisteredViaElectron = registered;
    if (!registered) {
      setState({
        error: `Nao foi possivel registrar o atalho global ${state.pasteLastShortcut} para colar a ultima transcricao.`,
      });
      return false;
    }

    pasteLastRegisteredAccelerator = accelerator;
    return true;
  } catch (error) {
    pasteLastRegisteredViaElectron = false;
    setState({
      error: `Failed to register shortcut ${state.pasteLastShortcut}: ${error.message}`,
    });
    return false;
  }
}

function bootAudioController() {
  if (process.platform !== 'win32') {
    return;
  }

  if (audioProcess && !audioProcess.killed) {
    return;
  }

  lastAudioControllerConfigSignature = '';
  const powershellScript = getSystemAudioControllerScriptPath();
  const localToken = ++audioToken;
  const localProcess = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', powershellScript],
    {
      cwd: getRuntimeBasePath(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );

  configureTextPipes(localProcess);
  audioProcess = localProcess;
  audioReader = attachJsonReader(
    localProcess,
    (event) => {
      if (localToken !== audioToken) {
        return;
      }
      handleAudioControllerEvent(event);
    },
    (error) => {
      if (localToken !== audioToken) {
        return;
      }
      console.warn('[audio-mute] Saida invalida do controlador de audio:', error.message);
    },
  );

  localProcess.stderr.on('data', (chunk) => {
    if (localToken !== audioToken) {
      return;
    }

    const message = String(chunk || '').trim();
    if (message) {
      console.warn('[audio-mute]', message);
    }
  });

  localProcess.on('error', (error) => {
    if (localToken !== audioToken) {
      return;
    }

    console.warn('[audio-mute] Nao foi possivel iniciar o controlador de audio:', error.message);
  });

  localProcess.on('close', (code) => {
    if (localToken !== audioToken) {
      return;
    }

    audioProcess = null;
    audioReader = null;

    if (!isQuitting) {
      setTimeout(() => {
        if (isQuitting || audioToken !== localToken) {
          return;
        }
        bootAudioController();
      }, 2000);
    }
  });
}

function bootDictationService() {
  if (serviceProcess && !serviceProcess.killed) {
    return;
  }

  const launchSpec = getWorkerLaunchSpec('dictation_service');
  const localToken = ++serviceToken;
  const localProcess = spawn(launchSpec.command, launchSpec.args, {
    cwd: getRuntimeBasePath(),
    env: getServiceEnv(),
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  configureTextPipes(localProcess);
  serviceProcess = localProcess;
  trackChildProcess('dictation_service', localProcess);
  setOverlayAudioLevel(0);
  setState({
    phase: 'booting',
    serviceOnline: true,
    engineReady: false,
    listening: false,
    captureMode: null,
    dictationSessionId: null,
    pendingPaste: false,
    partial: '',
    notice: state.switchingModel ? state.notice : '',
    error: '',
  });

  serviceReader = attachJsonReader(
    localProcess,
    (event) => {
      if (localToken !== serviceToken) {
        return;
      }
      void handleServiceEvent(event);
    },
    (error) => {
      if (localToken !== serviceToken) {
        return;
      }
      setOverlayAudioLevel(0);
      setState({
        error: `Saida invalida do worker Python: ${error.message}`,
      });
    },
  );

  localProcess.stderr.on('data', (chunk) => {
    if (localToken !== serviceToken) {
      return;
    }

    const message = String(chunk || '').trim();
    if (!message) {
      return;
    }

    if (
      message.includes('UserWarning') ||
      message.includes('Warning:') ||
      message.includes('huggingface_hub')
    ) {
      return;
    }

    setState({
      error: message,
    });
  });

  localProcess.on('error', (error) => {
    if (localToken !== serviceToken) {
      return;
    }

    setOverlayAudioLevel(0);
    releaseCaptureMute(true);
    setState({
      serviceOnline: false,
      engineReady: false,
      phase: 'error',
      pendingStartMode: null,
      captureMode: null,
      dictationSessionId: null,
      error: `Nao foi possivel iniciar o worker Python: ${error.message}`,
    });
  });

  localProcess.on('close', (code) => {
    if (localToken !== serviceToken) {
      return;
    }

    untrackChildProcess('dictation_service', localProcess.pid);
    serviceProcess = null;
    setOverlayAudioLevel(0);
    releaseCaptureMute(true);
    setState({
      serviceOnline: false,
      engineReady: false,
      listening: false,
      pendingStartMode: null,
      captureMode: null,
      dictationSessionId: null,
      phase: 'offline',
      partial: '',
      error: code === 0 ? state.error : `Worker Python encerrado com codigo ${code}.`,
    });
  });
}

function bootHotkeyListener() {
  if (hotkeyProcess && !hotkeyProcess.killed) {
    return;
  }

  const launchSpec = getWorkerLaunchSpec('hotkey_listener');
  const localToken = ++hotkeyToken;
  const localProcess = spawn(launchSpec.command, launchSpec.args, {
    cwd: getRuntimeBasePath(),
    env: getServiceEnv(),
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  configureTextPipes(localProcess);
  hotkeyProcess = localProcess;
  lastHotkeyActionHandling = {
    suppressEscape: null,
    suppressSpace: null,
  };
  syncHotkeyActionHandling(true);
  trackChildProcess('hotkey_listener', localProcess);
  hotkeyReader = attachJsonReader(
    localProcess,
    (event) => {
      if (localToken !== hotkeyToken) {
        return;
      }
      handleHotkeyEvent(event);
    },
    (error) => {
      if (localToken !== hotkeyToken) {
        return;
      }
      setState({
        error: `Saida invalida do listener de atalho: ${error.message}`,
      });
    },
  );

  localProcess.stderr.on('data', (chunk) => {
    if (localToken !== hotkeyToken) {
      return;
    }

    const message = String(chunk || '').trim();
    if (!message) {
      return;
    }

    setState({
      error: message,
    });
  });

  localProcess.on('error', (error) => {
    if (localToken !== hotkeyToken) {
      return;
    }

    setState({
      hotkeyOnline: false,
      error: `Nao foi possivel iniciar o listener de atalho global: ${error.message}`,
    });
  });

  localProcess.on('close', (code) => {
    if (localToken !== hotkeyToken) {
      return;
    }

    untrackChildProcess('hotkey_listener', localProcess.pid);
    hotkeyProcess = null;
    lastHotkeyActionHandling = {
      suppressEscape: null,
      suppressSpace: null,
    };
    setState({
      hotkeyOnline: false,
      error: code === 0 ? state.error : `Listener de atalho encerrado com codigo ${code}.`,
    });
  });
}

// Restart the global hotkey listener so it picks up a freshly changed shortcut.
// Bumping the token first makes the dying process's async handlers no-ops, then we
// ask it to shut down cleanly and hard-kill it shortly after as a safety net.
function restartHotkeyListener() {
  const dying = hotkeyProcess;
  if (dying) {
    const dyingPid = dying.pid;
    hotkeyToken += 1;
    hotkeyProcess = null;
    hotkeyReader = null;

    try {
      if (dying.stdin && dying.stdin.writable) {
        dying.stdin.write(`${JSON.stringify({ type: 'shutdown', payload: {} })}\n`);
      }
    } catch (_error) {
      // Best effort.
    }

    setTimeout(() => {
      try {
        if (!dying.killed) {
          dying.kill();
        }
      } catch (_error) {
        // Best effort.
      }
      untrackChildProcess('hotkey_listener', dyingPid);
    }, 500);
  }

  bootHotkeyListener();
}

async function shutdownServiceForRestart() {
  const currentProcess = serviceProcess;
  if (!currentProcess) {
    return;
  }

  const currentPid = currentProcess.pid;
  serviceToken += 1;
  serviceProcess = null;
  serviceReader = null;

  await new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve();
    };

    const timeout = setTimeout(() => {
      try {
        currentProcess.kill();
      } catch (_error) {
        // Best effort.
      }
      untrackChildProcess('dictation_service', currentPid);
      finish();
    }, SERVICE_SHUTDOWN_TIMEOUT_MS);

    currentProcess.once('close', () => {
      clearTimeout(timeout);
      untrackChildProcess('dictation_service', currentPid);
      finish();
    });

    try {
      if (currentProcess.stdin && currentProcess.stdin.writable) {
        currentProcess.stdin.write(`${JSON.stringify({ type: 'shutdown', payload: {} })}\n`);
      } else {
        currentProcess.kill();
      }
    } catch (_error) {
      clearTimeout(timeout);
      untrackChildProcess('dictation_service', currentPid);
      finish();
    }
  });
}

async function restartDictationService() {
  const restartVersion = ++serviceRestartVersion;
  activeCloudTranscriptionSessions.clear();
  resetDictationFeedbackState();
  releaseCaptureMute(true);
  setState({
    engineReady: false,
    serviceOnline: false,
    listening: false,
    hotkeyPressed: false,
    pendingStartMode: null,
    captureMode: null,
    dictationSessionId: null,
    pendingPaste: false,
    partial: '',
    phase: 'booting',
    switchingModel: true,
  });

  await shutdownServiceForRestart();
  if (restartVersion !== serviceRestartVersion) {
    return;
  }
  bootDictationService();
}

async function applySettings(patch) {
  const nextLanguages = Object.prototype.hasOwnProperty.call(patch, 'allowedLanguages')
    ? normalizeDetectionLanguages(patch.allowedLanguages)
    : state.allowedLanguages;
  const nextInterfaceLanguage = Object.prototype.hasOwnProperty.call(patch, 'interfaceLanguage')
    ? normalizeInterfaceLanguage(patch.interfaceLanguage)
    : state.interfaceLanguage;
  const nextModel = patch.model ? normalizeModel(patch.model) : state.model;
  const nextShowOverlayBar =
    typeof patch.showOverlayBar === 'boolean' ? patch.showOverlayBar : state.showOverlayBar;
  const nextSoundEffectsEnabled =
    typeof patch.soundEffectsEnabled === 'boolean'
      ? patch.soundEffectsEnabled
      : state.soundEffectsEnabled;
  const nextLaunchAtLogin = normalizeLaunchAtLoginPreference(
    typeof patch.launchAtLogin === 'boolean' ? patch.launchAtLogin : state.launchAtLogin,
  );
  const nextKeepAllTranscriptions =
    typeof patch.keepAllTranscriptions === 'boolean'
      ? patch.keepAllTranscriptions
      : state.keepAllTranscriptions;
  const nextDictionaryEntries = Object.prototype.hasOwnProperty.call(patch, 'dictionaryEntries')
    ? normalizeDictionaryEntries(patch.dictionaryEntries)
    : state.dictionaryEntries;
  const nextShortcut = Object.prototype.hasOwnProperty.call(patch, 'shortcut')
    ? normalizeShortcut(patch.shortcut, state.shortcut)
    : state.shortcut;
  const nextPasteLastShortcut = Object.prototype.hasOwnProperty.call(patch, 'pasteLastShortcut')
    ? normalizeShortcut(patch.pasteLastShortcut, state.pasteLastShortcut)
    : state.pasteLastShortcut;
  const nextDuckAudioEnabled =
    typeof patch.duckAudioEnabled === 'boolean' ? patch.duckAudioEnabled : state.duckAudioEnabled;
  const nextOverlayOpacity = Object.prototype.hasOwnProperty.call(patch, 'overlayOpacity')
    ? normalizeOverlayOpacity(patch.overlayOpacity)
    : state.overlayOpacity;
  const nextOverlayScale = Object.prototype.hasOwnProperty.call(patch, 'overlayScale')
    ? normalizeOverlayScale(patch.overlayScale)
    : state.overlayScale;
  const nextOverlayDynamicSize =
    typeof patch.overlayDynamicSize === 'boolean'
      ? patch.overlayDynamicSize
      : state.overlayDynamicSize;
  const nextCloudPrivacyNoticeAccepted =
    typeof patch.cloudPrivacyNoticeAccepted === 'boolean'
      ? patch.cloudPrivacyNoticeAccepted
      : state.cloudPrivacyNoticeAccepted;
  const nextCloudTranscriptionEnabled =
    typeof patch.cloudTranscriptionEnabled === 'boolean'
      ? patch.cloudTranscriptionEnabled
      : state.cloudTranscriptionEnabled;
  const nextCloudTranscriptionModel = Object.prototype.hasOwnProperty.call(
    patch,
    'cloudTranscriptionModel',
  )
    ? normalizeCloudTranscriptionModel(patch.cloudTranscriptionModel)
    : state.cloudTranscriptionModel;

  if (nextCloudTranscriptionEnabled && !nextCloudPrivacyNoticeAccepted) {
    throw new Error('Cloud transcription requires privacy notice acceptance.');
  }
  if (nextCloudTranscriptionEnabled && !hasOpenRouterApiKey()) {
    throw new Error('OpenRouter API key is required for cloud transcription.');
  }

  const nextHistory = applyHistoryRetention(state.history, nextKeepAllTranscriptions);

  const modelChanged = nextModel !== state.model;
  const cloudEngineChanged = nextCloudTranscriptionEnabled !== state.cloudTranscriptionEnabled;
  const cloudModelChanged = nextCloudTranscriptionModel !== state.cloudTranscriptionModel;
  const languagesChanged = nextLanguages.join(',') !== state.allowedLanguages.join(',');
  const interfaceLanguageChanged = nextInterfaceLanguage !== state.interfaceLanguage;
  const overlayChanged = nextShowOverlayBar !== state.showOverlayBar;
  const soundEffectsChanged = nextSoundEffectsEnabled !== state.soundEffectsEnabled;
  const launchAtLoginChanged = nextLaunchAtLogin !== state.launchAtLogin;
  const keepAllTranscriptionsChanged =
    nextKeepAllTranscriptions !== state.keepAllTranscriptions;
  const shortcutChanged = nextShortcut !== state.shortcut;
  const pasteLastShortcutChanged = nextPasteLastShortcut !== state.pasteLastShortcut;
  const duckAudioChanged = nextDuckAudioEnabled !== state.duckAudioEnabled;
  const dictionaryChanged =
    JSON.stringify(nextDictionaryEntries) !== JSON.stringify(state.dictionaryEntries);

  let notice = state.notice;
  if (languagesChanged) {
    notice = translateMain(
      'activeLanguages',
      {
        summary: formatDetectionLanguagesSummary(nextLanguages, nextInterfaceLanguage),
      },
      nextInterfaceLanguage,
    );
  } else if (modelChanged) {
    notice = translateMain(
      'switchingModel',
      { model: getModelDisplayName(nextModel, nextInterfaceLanguage) },
      nextInterfaceLanguage,
    );
  } else if (cloudEngineChanged) {
    notice = translateMain(
      nextCloudTranscriptionEnabled ? 'cloudTranscriptionOn' : 'cloudTranscriptionOff',
      {},
      nextInterfaceLanguage,
    );
  } else if (cloudModelChanged) {
    notice = translateMain('cloudModelUpdated', {}, nextInterfaceLanguage);
  } else if (overlayChanged) {
    notice = translateMain(
      nextShowOverlayBar ? 'overlayOn' : 'overlayOff',
      {},
      nextInterfaceLanguage,
    );
  } else if (soundEffectsChanged) {
    notice = translateMain(
      nextSoundEffectsEnabled ? 'soundOn' : 'soundOff',
      {},
      nextInterfaceLanguage,
    );
  } else if (launchAtLoginChanged) {
    notice = translateMain(
      nextLaunchAtLogin ? 'launchAtLoginOn' : 'launchAtLoginOff',
      {},
      nextInterfaceLanguage,
    );
  } else if (keepAllTranscriptionsChanged) {
    notice = translateMain(
      nextKeepAllTranscriptions ? 'keepAllTranscriptionsOn' : 'keepAllTranscriptionsOff',
      {},
      nextInterfaceLanguage,
    );
  } else if (shortcutChanged) {
    notice = translateMain('shortcutUpdated', {}, nextInterfaceLanguage);
  } else if (pasteLastShortcutChanged) {
    notice = translateMain('pasteShortcutUpdated', {}, nextInterfaceLanguage);
  } else if (duckAudioChanged) {
    notice = translateMain(
      nextDuckAudioEnabled ? 'duckAudioOn' : 'duckAudioOff',
      {},
      nextInterfaceLanguage,
    );
  } else if (dictionaryChanged) {
    notice =
      nextDictionaryEntries.length > 0
        ? `Dicionário ativo com ${nextDictionaryEntries.length} regra(s).`
        : 'Dicionário limpo.';
  }

  if (dictionaryChanged) {
    notice = nextDictionaryEntries.length > 0
      ? translateMain(
          'dictionaryOn',
          { count: nextDictionaryEntries.length },
          nextInterfaceLanguage,
        )
      : translateMain('dictionaryOff', {}, nextInterfaceLanguage);
  }

  setState({
    allowedLanguages: nextLanguages,
    interfaceLanguage: nextInterfaceLanguage,
    model: nextModel,
    shortcut: nextShortcut,
    pasteLastShortcut: nextPasteLastShortcut,
    showOverlayBar: nextShowOverlayBar,
    soundEffectsEnabled: nextSoundEffectsEnabled,
    launchAtLogin: nextLaunchAtLogin,
    keepAllTranscriptions: nextKeepAllTranscriptions,
    duckAudioEnabled: nextDuckAudioEnabled,
    overlayOpacity: nextOverlayOpacity,
    overlayScale: nextOverlayScale,
    overlayDynamicSize: nextOverlayDynamicSize,
    cloudTranscriptionEnabled: nextCloudTranscriptionEnabled,
    cloudPrivacyNoticeAccepted: nextCloudPrivacyNoticeAccepted,
    cloudTranscriptionModel: nextCloudTranscriptionModel,
    openRouterApiKeyConfigured: hasOpenRouterApiKey(),
    history: nextHistory,
    dictionaryEntries: nextDictionaryEntries,
    notice,
    error: '',
  });
  if (dictionaryChanged) {
    rebuildDictionaryReplacementIndex(nextDictionaryEntries);
  }

  savePersistentState();

  if (launchAtLoginChanged) {
    syncLaunchAtLoginSetting();
  }

  // Turning ducking off mid-dictation should immediately give other apps their sound back.
  if (duckAudioChanged && !nextDuckAudioEnabled) {
    releaseCaptureMute(true);
  }

  // A new shortcut needs the Electron paste-last binding re-registered and the global
  // hotkey listener restarted so it reads the new combination from its environment.
  if (shortcutChanged || pasteLastShortcutChanged) {
    registerPasteLastShortcut();
    restartHotkeyListener();
  }

  if (cloudEngineChanged || (modelChanged && !nextCloudTranscriptionEnabled)) {
    await restartDictationService();
  } else if (languagesChanged) {
    sendServiceCommand('configure', {
      allowed_languages: nextLanguages,
    });
  }

  return snapshotState();
}

function resetModelStats() {
  setState({
    modelStats: createEmptyStats(),
    notice: translateMain('modelStatsReset'),
  });
  savePersistentState();
  return snapshotState();
}

ipcMain.handle('copy-text', async (_event, text) => {
  clipboard.writeText(String(text || ''));
  return true;
});

function shutdownChildren() {
  resetDictationFeedbackState();
  releaseCaptureMute(true);

  try {
    sendServiceCommand('shutdown');
  } catch (_error) {
    // Best effort.
  }

  try {
    sendHotkeyCommand('shutdown');
  } catch (_error) {
    // Best effort.
  }

  try {
    sendAudioCommand('shutdown');
  } catch (_error) {
    // Best effort.
  }
}

// ----- In-app auto-update (GitHub Releases via electron-updater) -----
let autoUpdater = null;
let autoUpdaterInitialized = false;
let updateState = {
  status: 'idle', // idle | checking | available | manual-download | not-available | downloading | downloaded | error | not-packaged | updater-unavailable
  availableVersion: null,
  progress: 0,
  message: '',
  releaseUrl: null,
  downloadUrl: null,
};

function getUpdateSnapshot() {
  return {
    ...updateState,
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    supported: app.isPackaged,
  };
}

function setUpdateState(patch) {
  updateState = { ...updateState, ...patch };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', getUpdateSnapshot());
  }
}

function normalizeReleaseVersion(version) {
  return String(version || '')
    .trim()
    .replace(/^v/i, '')
    .split(/[+-]/)[0];
}

function toSemverCompatibleVersion(version) {
  const parts = normalizeReleaseVersion(version).split('.').map((part) => Number.parseInt(part, 10) || 0);
  while (parts.length < 3) {
    parts.push(0);
  }

  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function formatDisplayVersion(version) {
  const normalized = normalizeReleaseVersion(version);
  const parts = normalized.split('.');
  if (parts.length < 3) {
    return normalized;
  }

  const major = Number.parseInt(parts[0], 10);
  const minor = Number.parseInt(parts[1], 10);
  const patch = Number.parseInt(parts[2], 10);
  if ([major, minor, patch].some((part) => Number.isNaN(part))) {
    return normalized;
  }

  return `${major}.${minor}.${String(patch).padStart(3, '0')}`;
}

function compareReleaseVersions(left, right) {
  const leftParts = normalizeReleaseVersion(left).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = normalizeReleaseVersion(right).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length, 3);

  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) {
      return delta > 0 ? 1 : -1;
    }
  }

  return 0;
}

function isMissingUpdateMetadataError(error) {
  const message = String((error && error.message) || error || '');
  return /(app-update\.yml|latest(?:-[a-z0-9_-]+)?(?:-mac)?\.yml)/i.test(message);
}

function getUpdateChannel() {
  if (process.platform === 'darwin' && (process.arch === 'arm64' || process.arch === 'x64')) {
    return `latest-${process.arch}`;
  }

  return 'latest';
}

function getGithubReleaseVersion(release) {
  return normalizeReleaseVersion((release && (release.tag_name || release.name)) || '');
}

function isStableGithubRelease(release) {
  return release && !release.draft && !release.prerelease && getGithubReleaseVersion(release);
}

function getGithubReleasesUrl() {
  return `https://github.com/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}/releases/latest`;
}

function getGithubReleaseUrl(release) {
  return (release && release.html_url) || getGithubReleasesUrl();
}

function getGithubAssetScore(assetName) {
  const name = String(assetName || '').toLowerCase();
  if (!name || /\.(yml|yaml|blockmap|sha256|sig)$/i.test(name)) {
    return -1;
  }

  if (process.platform === 'win32') {
    if (!name.endsWith('.exe') && !name.endsWith('.msi')) {
      return -1;
    }

    return (
      (name.includes('openflow') ? 30 : 0) +
      (name.includes('setup') || name.includes('installer') ? 20 : 0) +
      (name.endsWith('.exe') ? 10 : 0)
    );
  }

  if (process.platform === 'darwin') {
    if (!name.endsWith('.dmg') && !name.endsWith('.zip')) {
      return -1;
    }

    const archScore =
      (process.arch === 'arm64' && name.includes('arm64')) ||
      (process.arch === 'x64' && (name.includes('x64') || name.includes('x86_64')))
        ? 30
        : name.includes('universal')
          ? 20
          : 0;
    return archScore + (name.endsWith('.dmg') ? 10 : 5);
  }

  if (process.platform === 'linux') {
    if (!/\.(appimage|deb|rpm|tar\.gz)$/i.test(name)) {
      return -1;
    }

    return name.endsWith('.appimage') ? 20 : 10;
  }

  return -1;
}

function getGithubReleaseDownloadUrl(release) {
  const assets = Array.isArray(release && release.assets) ? release.assets : [];
  const bestAsset = assets
    .map((asset) => ({
      asset,
      score: getGithubAssetScore(asset && asset.name),
    }))
    .filter((entry) => entry.score >= 0 && entry.asset && entry.asset.browser_download_url)
    .sort((left, right) => right.score - left.score)[0];

  return bestAsset ? bestAsset.asset.browser_download_url : null;
}

function getUpdaterCacheDir() {
  const homeDir = require('os').homedir();
  if (process.platform === 'win32') {
    return process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
  }
  if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Caches');
  }
  return process.env.XDG_CACHE_HOME || path.join(homeDir, '.cache');
}

function createAutoUpdaterAppAdapter() {
  const updaterVersion = toSemverCompatibleVersion(app.getVersion());
  return {
    whenReady: () => app.whenReady(),
    get version() {
      return updaterVersion;
    },
    get name() {
      return app.getName();
    },
    get isPackaged() {
      return app.isPackaged === true;
    },
    get appUpdateConfigPath() {
      return this.isPackaged
        ? path.join(process.resourcesPath, 'app-update.yml')
        : path.join(app.getAppPath(), 'dev-app-update.yml');
    },
    get userDataPath() {
      return app.getPath('userData');
    },
    get baseCachePath() {
      return getUpdaterCacheDir();
    },
    quit: () => app.quit(),
    relaunch: () => app.relaunch(),
    onQuit: (handler) => app.once('quit', (_event, exitCode) => handler(exitCode)),
  };
}

function attachAutoUpdaterHttpExecutor(updater) {
  const { ElectronHttpExecutor } = require('electron-updater/out/electronHttpExecutor');
  updater.httpExecutor = new ElectronHttpExecutor((authInfo, callback) =>
    updater.emit('login', authInfo, callback),
  );
  return updater;
}

function createAutoUpdater() {
  const updaterModule = require('electron-updater');
  const updaterApp = createAutoUpdaterAppAdapter();
  let updater = null;

  if (process.platform === 'win32') {
    updater = new updaterModule.NsisUpdater(null, updaterApp);
  } else if (process.platform === 'darwin') {
    updater = new updaterModule.MacUpdater(null, updaterApp);
  } else {
    const packageTypePath = path.join(process.resourcesPath || '', 'package-type');
    if (fs.existsSync(packageTypePath)) {
      const packageType = fs.readFileSync(packageTypePath, 'utf8').trim();
      if (packageType === 'deb') {
        updater = new updaterModule.DebUpdater(null, updaterApp);
      } else if (packageType === 'rpm') {
        updater = new updaterModule.RpmUpdater(null, updaterApp);
      } else if (packageType === 'pacman') {
        updater = new updaterModule.PacmanUpdater(null, updaterApp);
      }
    }
    updater = updater || new updaterModule.AppImageUpdater(null, updaterApp);
  }

  return attachAutoUpdaterHttpExecutor(updater);
}

async function fetchGithubReleases(pathname) {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch is not available in this runtime.');
  }

  const response = await fetch(
    `https://api.github.com/repos/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}${pathname}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `${APP_NAME}/${app.getVersion()}`,
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed with HTTP ${response.status}.`);
  }

  return response.json();
}

async function getLatestGithubRelease() {
  const releases = await fetchGithubReleases('/releases?per_page=30');
  if (Array.isArray(releases)) {
    return releases
      .filter(isStableGithubRelease)
      .sort((left, right) =>
        compareReleaseVersions(getGithubReleaseVersion(right), getGithubReleaseVersion(left)),
      )[0] || null;
  }

  return null;
}

async function getLatestGithubReleaseVersion() {
  const release = await getLatestGithubRelease();
  return release ? getGithubReleaseVersion(release) : null;
}

async function handleMissingUpdateMetadata(error) {
  if (!isMissingUpdateMetadataError(error)) {
    return false;
  }

  const latestRelease = await getLatestGithubRelease();
  const latestVersion = getGithubReleaseVersion(latestRelease);
  if (!latestVersion || compareReleaseVersions(latestVersion, app.getVersion()) <= 0) {
    setUpdateState({
      status: 'not-available',
      availableVersion: null,
      progress: 0,
      message: '',
      releaseUrl: null,
      downloadUrl: null,
    });
    return true;
  }

  setUpdateState({
    status: 'manual-download',
    availableVersion: formatDisplayVersion(latestVersion),
    progress: 0,
    message: '',
    releaseUrl: getGithubReleaseUrl(latestRelease),
    downloadUrl: getGithubReleaseDownloadUrl(latestRelease),
  });
  return true;
}

async function openUpdateDownloadTarget() {
  let url = updateState.downloadUrl || updateState.releaseUrl;

  if (!url) {
    const latestRelease = await getLatestGithubRelease();
    const latestVersion = getGithubReleaseVersion(latestRelease);
    if (latestVersion && compareReleaseVersions(latestVersion, app.getVersion()) > 0) {
      url = getGithubReleaseDownloadUrl(latestRelease) || getGithubReleaseUrl(latestRelease);
      setUpdateState({
        status: 'manual-download',
        availableVersion: formatDisplayVersion(latestVersion),
        progress: 0,
        message: '',
        releaseUrl: getGithubReleaseUrl(latestRelease),
        downloadUrl: getGithubReleaseDownloadUrl(latestRelease),
      });
    }
  }

  if (!url) {
    url = getGithubReleasesUrl();
  }

  await shell.openExternal(url);
  return getUpdateSnapshot();
}

function loadAutoUpdater() {
  if (autoUpdaterInitialized) {
    return autoUpdater;
  }

  autoUpdaterInitialized = true;

  try {
    autoUpdater = createAutoUpdater();
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.channel = getUpdateChannel();
    // macOS publishes one update metadata file per CPU architecture so Intel and
    // Apple Silicon builds never overwrite each other in the same GitHub release.
    autoUpdater.on('checking-for-update', () => setUpdateState({ status: 'checking', message: '' }));
    autoUpdater.on('update-available', (info) =>
      setUpdateState({
        status: 'available',
        availableVersion: formatDisplayVersion((info && info.version) || null),
        progress: 0,
        message: '',
        releaseUrl: null,
        downloadUrl: null,
      }),
    );
    autoUpdater.on('update-not-available', () =>
      setUpdateState({
        status: 'not-available',
        availableVersion: null,
        message: '',
        releaseUrl: null,
        downloadUrl: null,
      }),
    );
    autoUpdater.on('download-progress', (progress) =>
      setUpdateState({
        status: 'downloading',
        progress: Math.max(0, Math.min(100, Math.round((progress && progress.percent) || 0))),
      }),
    );
    autoUpdater.on('update-downloaded', (info) =>
      setUpdateState({
        status: 'downloaded',
        availableVersion: formatDisplayVersion((info && info.version) || updateState.availableVersion),
        progress: 100,
        message: '',
      }),
    );
    autoUpdater.on('error', (error) => {
      handleMissingUpdateMetadata(error).catch(() =>
        setUpdateState({ status: 'error', message: String((error && error.message) || error || 'Update error') }),
      );
    });
  } catch (error) {
    autoUpdater = null;
    setUpdateState({
      status: 'updater-unavailable',
      message: String((error && error.message) || error),
      releaseUrl: getGithubReleasesUrl(),
      downloadUrl: null,
    });
  }

  return autoUpdater;
}

ipcMain.handle('get-update-state', async () => getUpdateSnapshot());
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) {
    setUpdateState({
      status: 'not-packaged',
      message: 'Updates are only available in the installed app.',
      releaseUrl: getGithubReleasesUrl(),
      downloadUrl: null,
    });
    return getUpdateSnapshot();
  }

  const updater = loadAutoUpdater();
  if (!updater) {
    return getUpdateSnapshot();
  }

  try {
    setUpdateState({ status: 'checking', message: '' });
    await updater.checkForUpdates();
  } catch (error) {
    try {
      if (!(await handleMissingUpdateMetadata(error))) {
        setUpdateState({ status: 'error', message: String((error && error.message) || error) });
      }
    } catch (_fallbackError) {
      setUpdateState({ status: 'error', message: String((error && error.message) || error) });
    }
  }

  return getUpdateSnapshot();
});
ipcMain.handle('download-update', async () => {
  const updater = loadAutoUpdater();
  if (!updater) {
    return getUpdateSnapshot();
  }

  try {
    setUpdateState({ status: 'downloading', progress: 0, message: '' });
    await updater.downloadUpdate();
  } catch (error) {
    try {
      if (!(await handleMissingUpdateMetadata(error))) {
        setUpdateState({ status: 'error', message: String((error && error.message) || error) });
      }
    } catch (_fallbackError) {
      setUpdateState({ status: 'error', message: String((error && error.message) || error) });
    }
  }

  return getUpdateSnapshot();
});
ipcMain.handle('open-update-download', async () => openUpdateDownloadTarget());
ipcMain.handle('install-update', async () => {
  const updater = loadAutoUpdater();
  if (!updater) {
    return getUpdateSnapshot();
  }

  isQuitting = true;
  // Defer so the IPC reply is delivered before the app starts quitting to install.
  setImmediate(() => {
    try {
      updater.quitAndInstall();
    } catch (error) {
      isQuitting = false;
      setUpdateState({ status: 'error', message: String((error && error.message) || error) });
    }
  });

  return getUpdateSnapshot();
});

function scheduleStartupUpdateCheck() {
  if (!app.isPackaged) {
    return;
  }

  const updater = loadAutoUpdater();
  if (!updater) {
    return;
  }

  setTimeout(() => {
    updater
      .checkForUpdates()
      .catch(async (error) => {
        try {
          if (!(await handleMissingUpdateMetadata(error))) {
            setUpdateState({ status: 'error', message: String((error && error.message) || error) });
          }
        } catch (_fallbackError) {
          setUpdateState({ status: 'error', message: String((error && error.message) || error) });
        }
      });
  }, 8000);
}

ipcMain.handle('get-state', async () => snapshotState());
ipcMain.handle('update-settings', async (_event, patch) => applySettings(patch || {}));
ipcMain.handle('reset-model-stats', async () => resetModelStats());
ipcMain.handle('save-openrouter-api-key', async (_event, apiKey) => saveOpenRouterApiKey(apiKey));
ipcMain.handle('clear-openrouter-api-key', async () => clearOpenRouterApiKey());
ipcMain.handle('refresh-openrouter-models', async () => refreshOpenRouterModels());
ipcMain.handle('retry-cloud-transcription', async (_event, retryId) =>
  retryCloudTranscription(retryId),
);
ipcMain.on('overlay-drag-move', (_event, position) => {
  positionOverlayWindow(position);
});
ipcMain.on('overlay-drag-end', (_event, position) => {
  positionOverlayWindow(position, true);
});
// Live preview while a slider is being dragged: update the overlay in place without
// persisting or broadcasting to the main window (the slider's "change" event commits).
ipcMain.on('preview-overlay-style', (_event, patch) => {
  if (!patch || typeof patch !== 'object') {
    return;
  }

  const next = {};
  if (Object.prototype.hasOwnProperty.call(patch, 'overlayOpacity')) {
    next.overlayOpacity = normalizeOverlayOpacity(patch.overlayOpacity);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'overlayScale')) {
    next.overlayScale = normalizeOverlayScale(patch.overlayScale);
  }
  if (typeof patch.overlayDynamicSize === 'boolean') {
    next.overlayDynamicSize = patch.overlayDynamicSize;
  }

  if (Object.keys(next).length === 0) {
    return;
  }

  Object.assign(state, next);
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('app-state', snapshotState());
    syncOverlayWindow();
  }
});

app.on('second-instance', () => {
  showMainWindow();
});

app.whenReady().then(() => {
  app.setAppUserModelId(APP_ID);
  ensureRuntimeDirectories();
  cleanupTrackedChildProcesses();

  const persistedState = loadPersistentState();
  const openRouterApiKeyConfigured = hasOpenRouterApiKey();
  setState({
    allowedLanguages: persistedState.preferences.allowedLanguages,
    interfaceLanguage: persistedState.preferences.interfaceLanguage,
    model: persistedState.preferences.model,
    shortcut: persistedState.preferences.shortcut,
    pasteLastShortcut: persistedState.preferences.pasteLastShortcut,
    modelStats: persistedState.modelStats,
    history: persistedState.history,
    usageStats: persistedState.usageStats,
    showOverlayBar: persistedState.preferences.showOverlayBar,
    soundEffectsEnabled: persistedState.preferences.soundEffectsEnabled,
    launchAtLogin: persistedState.preferences.launchAtLogin,
    keepAllTranscriptions: persistedState.preferences.keepAllTranscriptions,
    duckAudioEnabled: persistedState.preferences.duckAudioEnabled,
    overlayOpacity: persistedState.preferences.overlayOpacity,
    overlayScale: persistedState.preferences.overlayScale,
    overlayDynamicSize: persistedState.preferences.overlayDynamicSize,
    cloudTranscriptionEnabled:
      persistedState.preferences.cloudTranscriptionEnabled && openRouterApiKeyConfigured,
    cloudPrivacyNoticeAccepted: persistedState.preferences.cloudPrivacyNoticeAccepted,
    cloudTranscriptionModel: persistedState.preferences.cloudTranscriptionModel,
    openRouterApiKeyConfigured,
    cloudRetries: getCloudRetrySnapshot(),
    dictionaryEntries: persistedState.preferences.dictionaryEntries,
    overlayPosition: defaults.overlayPosition,
  });
  if (persistedState.preferences.cloudTranscriptionEnabled && !openRouterApiKeyConfigured) {
    savePersistentState();
  }
  shouldStartHiddenOnLaunch =
    shouldStartHiddenOnLaunch || Boolean(app.getLoginItemSettings().wasOpenedAsHidden);
  rebuildDictionaryReplacementIndex(persistedState.preferences.dictionaryEntries);
  syncLaunchAtLoginSetting();
  registerPasteLastShortcut();

  createTray();
  createWindow();
  createOverlayWindow();
  bootAudioController();
  bootDictationService();
  bootHotkeyListener();
  scheduleStartupUpdateCheck();
  if (hasOpenRouterApiKey()) {
    void refreshOpenRouterModels();
  }

  screen.on('display-added', resyncOverlayWindowPosition);
  screen.on('display-removed', resyncOverlayWindowPosition);
  screen.on('display-metrics-changed', resyncOverlayWindowPosition);
  powerMonitor.on('resume', recoverOverlayWindowAfterResume);
  powerMonitor.on('unlock-screen', recoverOverlayWindowAfterResume);

  app.on('activate', () => {
    showMainWindow();
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      createOverlayWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  unregisterMainShortcut();
  unregisterPasteLastShortcut();
  shutdownChildren();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});
