const SUPPORTED_INTERFACE_LANGUAGES = [
  'en', 'pt-BR', 'es', 'fr', 'de', 'it', 'nl', 'el', 'ru', 'zh-CN', 'ja', 'ko', 'ar', 'hi', 'tr',
];

const DEFAULT_DETECTION_LANGUAGES = ['en'];
const DICTIONARY_LANGUAGE_CODES = ['pt', 'en'];

const TRANSLATIONS = {
  en: {
    appTagline: 'Write at the speed of thought.',
    globalShortcut: 'Global shortcut',
    pasteLastShortcut: 'Paste last',
    dictionary: 'Dictionary',
    settings: 'Settings',
    streak: 'Streak',
    daysUsed: 'Days used',
    wordsSpoken: 'Words spoken',
    averageWpm: 'Average WPM',
    latestTranscriptions: 'Latest transcriptions',
    historyCopyLimited: 'Local history for the latest {count} messages.',
    historyCopyUnlimited: 'Local history for all messages.',
    search: 'Search',
    historySearchPlaceholder: 'Search words in transcriptions...',
    noTranscriptions: 'No transcriptions yet.',
    noSearchResults: 'No transcriptions found for this search.',
    settingsCopy: 'Appearance, language, and AI model preferences.',
    interfaceLanguage: 'Interface language',
    interfaceLanguageCopy: 'Search and switch the app language instantly.',
    searchLanguage: 'Search language',
    languageSearchPlaceholder: 'Search your language...',
    noLanguageResults: 'No languages match your search.',
    selectedLanguage: 'Selected',
    appearance: 'Appearance',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    floatingBar: 'Floating bar',
    showOverlay: 'Show global overlay',
    showOverlayCopy: 'Display the recording indicator above any app.',
    startWithComputer: 'Start with the computer',
    startWithComputerCopy: 'Launch OpenFlow in the background when you sign in.',
    soundEffects: 'Sound feedback',
    soundEffectsCopy: 'Play sounds on load, start, stop, cancel, and hands-free activation.',
    shortcuts: 'Shortcuts',
    shortcutsCopy: 'Choose the keys you press to dictate and to paste.',
    globalShortcutCopy: 'Hold to dictate. Add Space while holding for hands-free.',
    pasteLastCopy: 'Paste your most recent transcription into any app.',
    shortcutHint: 'Click a shortcut, then press the key combination you want. Press Esc to cancel.',
    recordingShortcut: 'Press keys…',
    invalidShortcut: "That combination can't be used. Try adding a modifier key.",
    muteMusicTitle: 'Audio',
    muteMusic: 'Duck audio while dictating',
    muteMusicCopy: "Mute other apps' sound while you speak, then restore it afterwards.",
    advancedSettings: 'Advanced settings',
    advancedSettingsCopy: 'Shortcuts, model, history, and floating bar customization.',
    back: 'Back',
    floatingBarCustomization: 'Floating bar appearance',
    floatingBarCustomizationCopy: 'Fine-tune how the floating pill looks on screen.',
    overlayOpacity: 'Pill opacity',
    overlayOpacityCopy: 'Transparency of the pill background. The effects stay fully visible.',
    overlaySize: 'Pill size',
    overlaySizeCopy: 'Overall size of the floating pill (100% is the default).',
    overlayDynamicSize: 'Dynamic size',
    overlayDynamicSizeCopy: 'Shrink the pill to half size until you start speaking, then grow it to full size.',
    transcriptionHistory: 'Transcription history',
    transcriptionHistoryCopy:
      'Control whether the app stores only the latest local messages or every transcription.',
    keepAllTranscriptions: 'Keep all transcriptions',
    keepAllTranscriptionsCopy:
      'Save every local transcription without the {count}-message limit.',
    detectionLanguages: 'Detection languages',
    detectionLanguagesCopy: 'Pick the languages OpenFlow should consider while listening.',
    searchDetectionLanguage: 'Search language',
    detectionLanguageSearchPlaceholder: 'Search detection languages...',
    activeDetectionLanguage: 'Active',
    activeDetectionLanguageSingular: 'active language',
    activeDetectionLanguagePlural: 'active languages',
    removeDetectionLanguage: 'Remove',
    addDetectionLanguage: 'Add',
    showMoreLanguages: 'Show more languages',
    showLessLanguages: 'Show fewer languages',
    noDetectionLanguageResults: 'No detection languages match your search.',
    keepOneDetectionLanguage: 'Keep at least one detection language selected.',
    transcriptionModels: 'Transcription models',
    resetAverage: 'Reset average',
    systemDiagnostics: 'System diagnostics',
    activeModel: 'Active model',
    processing: 'Processing',
    backend: 'Backend',
    close: 'Close',
    noNotes: 'No notes.',
    dictionaryCopy: 'Replace terms automatically in the final text.',
    dictionaryFormIntro:
      'Create a rule: anything on the left is automatically rewritten to the text on the right.',
    dictionarySources: 'When you say',
    dictionarySourcesPlaceholder: 'One variation per line\nopen flow\nopenflow',
    dictionarySourcesHint: 'One variation per line — every line becomes the replacement.',
    dictionaryTarget: 'Replace with',
    dictionaryTargetPlaceholder: 'Example: OpenFlow',
    dictionaryTargetHint: 'The exact text inserted into your transcriptions.',
    dictionaryApplyTo: 'Apply to',
    activeLanguages: 'Active languages',
    cancelEditing: 'Cancel editing',
    addRule: 'Add rule',
    saveRule: 'Save rule',
    activeRules: 'Your rules',
    dictionaryRulesCopy: 'Replacement happens before the text enters history and the active field.',
    showRules: 'Show rules',
    hideRules: 'Hide rules',
    dictionarySearchLabel: 'Search active rule',
    dictionarySearchPlaceholder: 'Type a word from the input or output',
    noRules: 'No rules yet.',
    noRuleResults: 'No rules found for this search.',
    entries: 'Inputs',
    output: 'Output',
    edit: 'Edit',
    remove: 'Remove',
    fillRuleError: 'Fill in the inputs and the replacement.',
    copy: 'Copy',
    copied: 'Copied',
    loadingStatusTitle: 'Loading model',
    loadingStatusDetail: '',
    loadingStatusHint: '',
    switchingStatusTitle: 'Loading model',
    switchingStatusHint: '',
    errorStatusTitle: 'Something needs attention',
    errorStatusHint: 'Check the system diagnostics below if this keeps happening.',
    softwareUpdate: 'Software update',
    softwareUpdateCopy: 'Install the newest OpenFlow build straight from inside the app.',
    checkForUpdates: 'Check for updates',
    downloadUpdate: 'Update',
    installUpdate: 'Restart & install',
    updateIdle: 'Check whether a newer version is available.',
    updateChecking: 'Checking for updates...',
    updateUpToDate: "You're on the latest version.",
    updateAvailable: 'Version {version} is available.',
    updateDownloading: 'Downloading update... {percent}%',
    updateDownloaded: 'Version {version} is ready. Restart to finish installing.',
    updateError: 'Update failed: {message}',
    updateUnsupported: 'Updates are available only in the installed app.',
    updateMetadataUnavailable: 'Auto-update metadata was not found for the latest GitHub release.',
    updateMetadataUnavailableForVersion:
      'Version {version} is available, but auto-update metadata was not found for that GitHub release.',
    updateNotPackaged:
      'This installed version does not support in-app updates yet. Install the latest build once to enable them.',
  },
  'pt-BR': {
    appTagline: 'Escreva na velocidade do pensamento.',
    globalShortcut: 'Atalho global',
    pasteLastShortcut: 'Colar ultima',
    dictionary: 'Dicionário',
    settings: 'Configurações',
    streak: 'Sequência',
    daysUsed: 'Dias de uso',
    wordsSpoken: 'Palavras faladas',
    averageWpm: 'Média WPM',
    latestTranscriptions: 'Últimas transcrições',
    historyCopy: 'Histórico local das últimas 100 mensagens.',
    search: 'Pesquisar',
    historySearchPlaceholder: 'Buscar palavras nas transcrições...',
    noTranscriptions: 'Nenhuma transcrição ainda.',
    noSearchResults: 'Nenhuma transcrição encontrada para essa busca.',
    settingsCopy: 'Ajustes de aparência, idioma e modelo de IA.',
    interfaceLanguage: 'Idioma da interface',
    interfaceLanguageCopy: 'Pesquise e troque o idioma do app na hora.',
    searchLanguage: 'Pesquisar idioma',
    languageSearchPlaceholder: 'Pesquise seu idioma...',
    noLanguageResults: 'Nenhum idioma corresponde à busca.',
    selectedLanguage: 'Selecionado',
    appearance: 'Aparência',
    darkMode: 'Modo escuro',
    lightMode: 'Modo claro',
    floatingBar: 'Barra flutuante',
    showOverlay: 'Exibir overlay global',
    showOverlayCopy: 'Mostra o indicador de gravação acima de qualquer app.',
    startWithComputer: 'Iniciar com o computador',
    startWithComputerCopy: 'Abre o OpenFlow em segundo plano ao entrar no sistema.',
    soundEffects: 'Sons de feedback',
    soundEffectsCopy: 'Toca sons ao carregar, iniciar, encerrar, cancelar e ativar hands-free.',
    shortcuts: 'Atalhos',
    shortcutsCopy: 'Escolha as teclas que você pressiona para ditar e para colar.',
    globalShortcutCopy: 'Segure para ditar. Adicione Espaço enquanto segura para o modo hands-free.',
    pasteLastCopy: 'Cole sua transcrição mais recente em qualquer app.',
    shortcutHint: 'Clique em um atalho e pressione a combinação desejada. Pressione Esc para cancelar.',
    recordingShortcut: 'Pressione as teclas…',
    invalidShortcut: 'Essa combinação não pode ser usada. Tente adicionar uma tecla modificadora.',
    muteMusicTitle: 'Áudio',
    muteMusic: 'Abaixar o áudio ao ditar',
    muteMusicCopy: 'Silencia o som de outros apps enquanto você fala e restaura depois.',
    advancedSettings: 'Configurações avançadas',
    advancedSettingsCopy: 'Atalhos, modelo, histórico e personalização da barra flutuante.',
    back: 'Voltar',
    floatingBarCustomization: 'Aparência da barra flutuante',
    floatingBarCustomizationCopy: 'Ajuste como a barra flutuante aparece na tela.',
    overlayOpacity: 'Opacidade da barra',
    overlayOpacityCopy: 'Transparência do fundo da barra. Os efeitos continuam totalmente visíveis.',
    overlaySize: 'Tamanho da barra',
    overlaySizeCopy: 'Tamanho geral da barra flutuante (100% é o padrão).',
    overlayDynamicSize: 'Tamanho dinâmico',
    overlayDynamicSizeCopy: 'Reduz a barra para a metade do tamanho até você começar a falar e então cresce até o tamanho cheio.',
    detectionLanguages: 'Idiomas de detecção',
    detectionLanguagesCopy: 'Escolha os idiomas que o OpenFlow deve considerar enquanto escuta.',
    searchDetectionLanguage: 'Pesquisar idioma',
    detectionLanguageSearchPlaceholder: 'Pesquise os idiomas de detecção...',
    activeDetectionLanguage: 'Ativo',
    activeDetectionLanguageSingular: 'idioma ativo',
    activeDetectionLanguagePlural: 'idiomas ativos',
    removeDetectionLanguage: 'Remover',
    addDetectionLanguage: 'Adicionar',
    showMoreLanguages: 'Mostrar mais idiomas',
    showLessLanguages: 'Mostrar menos idiomas',
    noDetectionLanguageResults: 'Nenhum idioma de detecção corresponde à busca.',
    keepOneDetectionLanguage: 'Mantenha pelo menos um idioma de detecção ativo.',
    transcriptionModels: 'Modelos de transcrição',
    resetAverage: 'Resetar média',
    systemDiagnostics: 'Diagnóstico do sistema',
    activeModel: 'Modelo ativo',
    processing: 'Processamento',
    backend: 'Backend',
    close: 'Fechar',
    noNotes: 'Sem observações.',
    dictionaryCopy: 'Troque termos automaticamente no texto final.',
    dictionaryFormIntro:
      'Crie uma regra: tudo o que estiver à esquerda é reescrito automaticamente para o texto à direita.',
    dictionarySources: 'Quando você disser',
    dictionarySourcesPlaceholder: 'Uma variação por linha\nopen flow\nopenflow',
    dictionarySourcesHint: 'Uma variação por linha — cada linha vira a substituição.',
    dictionaryTarget: 'Substituir por',
    dictionaryTargetPlaceholder: 'Ex.: OpenFlow',
    dictionaryTargetHint: 'O texto exato inserido nas suas transcrições.',
    dictionaryApplyTo: 'Aplicar em',
    activeLanguages: 'Idiomas ativos',
    cancelEditing: 'Cancelar edição',
    addRule: 'Adicionar regra',
    saveRule: 'Salvar regra',
    activeRules: 'Suas regras',
    dictionaryRulesCopy: 'A substituição acontece antes do texto entrar no histórico e no campo ativo.',
    showRules: 'Mostrar regras',
    hideRules: 'Ocultar regras',
    dictionarySearchLabel: 'Pesquisar regra ativa',
    dictionarySearchPlaceholder: 'Digite uma palavra da entrada ou da saída',
    noRules: 'Nenhuma regra cadastrada.',
    noRuleResults: 'Nenhuma regra encontrada para essa busca.',
    entries: 'Entradas',
    output: 'Saída',
    edit: 'Editar',
    remove: 'Remover',
    fillRuleError: 'Preencha as entradas e a substituição.',
    copy: 'Copiar',
    copied: 'Copiado',
    loadingStatusTitle: 'Carregando o modelo',
    loadingStatusDetail: '',
    loadingStatusHint: '',
    switchingStatusTitle: 'Carregando o modelo',
    switchingStatusHint: '',
    errorStatusTitle: 'Algo precisa de atencao',
    errorStatusHint: 'Se isso continuar, verifique o diagnostico do sistema logo abaixo.',
    softwareUpdate: 'Atualização do app',
    softwareUpdateCopy: 'Instale a versão mais recente do OpenFlow direto pelo app.',
    checkForUpdates: 'Procurar atualizações',
    downloadUpdate: 'Atualizar',
    installUpdate: 'Reiniciar e instalar',
    updateIdle: 'Verifique se há uma versão mais nova disponível.',
    updateChecking: 'Procurando atualizações...',
    updateUpToDate: 'Você está na versão mais recente.',
    updateAvailable: 'A versão {version} está disponível.',
    updateDownloading: 'Baixando atualização... {percent}%',
    updateDownloaded: 'Versão {version} pronta. Reinicie para concluir a instalação.',
    updateError: 'Falha na atualização: {message}',
    updateUnsupported: 'As atualizações só estão disponíveis no app instalado.',
    updateMetadataUnavailable:
      'Os metadados de atualização não foram encontrados no release mais recente do GitHub.',
    updateMetadataUnavailableForVersion:
      'A versão {version} está disponível, mas os metadados de atualização não foram encontrados no release do GitHub.',
    updateNotPackaged:
      'Esta versão instalada ainda não suporta atualização pelo app. Instale a versão mais recente uma vez para habilitar.',
  },
};

Object.assign(TRANSLATIONS, {
  es: { settings: 'Configuración', interfaceLanguage: 'Idioma de la interfaz', interfaceLanguageCopy: 'Busca y cambia el idioma de la app al instante.', searchLanguage: 'Buscar idioma', languageSearchPlaceholder: 'Busca tu idioma...', selectedLanguage: 'Seleccionado', appearance: 'Apariencia', darkMode: 'Modo oscuro', lightMode: 'Modo claro', floatingBar: 'Barra flotante', detectionLanguages: 'Idiomas de detección', transcriptionModels: 'Modelos de transcripción', systemDiagnostics: 'Diagnóstico del sistema', close: 'Cerrar', dictionary: 'Diccionario' },
  fr: { settings: 'Paramètres', interfaceLanguage: "Langue de l'interface", interfaceLanguageCopy: "Recherchez et changez instantanément la langue de l'application.", searchLanguage: 'Rechercher une langue', languageSearchPlaceholder: 'Recherchez votre langue...', selectedLanguage: 'Sélectionné', appearance: 'Apparence', darkMode: 'Mode sombre', lightMode: 'Mode clair', floatingBar: 'Barre flottante', detectionLanguages: 'Langues de détection', transcriptionModels: 'Modèles de transcription', systemDiagnostics: 'Diagnostic système', close: 'Fermer', dictionary: 'Dictionnaire' },
  de: { settings: 'Einstellungen', interfaceLanguage: 'Sprache der Oberfläche', interfaceLanguageCopy: 'Suche und wechsle die App-Sprache sofort.', searchLanguage: 'Sprache suchen', languageSearchPlaceholder: 'Sprache suchen...', selectedLanguage: 'Ausgewählt', appearance: 'Darstellung', darkMode: 'Dunkelmodus', lightMode: 'Hellmodus', floatingBar: 'Schwebende Leiste', detectionLanguages: 'Erkennungssprachen', transcriptionModels: 'Transkriptionsmodelle', systemDiagnostics: 'Systemdiagnose', close: 'Schließen', dictionary: 'Wörterbuch' },
  it: { settings: 'Impostazioni', interfaceLanguage: "Lingua dell'interfaccia", interfaceLanguageCopy: "Cerca e cambia subito la lingua dell'app.", searchLanguage: 'Cerca lingua', languageSearchPlaceholder: 'Cerca la tua lingua...', selectedLanguage: 'Selezionato', appearance: 'Aspetto', darkMode: 'Modalità scura', lightMode: 'Modalità chiara', floatingBar: 'Barra flottante', detectionLanguages: 'Lingue di rilevamento', transcriptionModels: 'Modelli di trascrizione', systemDiagnostics: 'Diagnostica di sistema', close: 'Chiudi', dictionary: 'Dizionario' },
  nl: { settings: 'Instellingen', interfaceLanguage: 'Interfacetaal', interfaceLanguageCopy: 'Zoek en wissel direct van app-taal.', searchLanguage: 'Taal zoeken', languageSearchPlaceholder: 'Zoek je taal...', selectedLanguage: 'Geselecteerd', appearance: 'Weergave', darkMode: 'Donkere modus', lightMode: 'Lichte modus', floatingBar: 'Zwevende balk', detectionLanguages: 'Detectietalen', transcriptionModels: 'Transcriptiemodellen', systemDiagnostics: 'Systeemdiagnostiek', close: 'Sluiten', dictionary: 'Woordenboek' },
  el: { settings: 'Ρυθμίσεις', interfaceLanguage: 'Γλώσσα διεπαφής', interfaceLanguageCopy: 'Αναζητήστε και αλλάξτε άμεσα τη γλώσσα της εφαρμογής.', searchLanguage: 'Αναζήτηση γλώσσας', languageSearchPlaceholder: 'Αναζητήστε τη γλώσσα σας...', selectedLanguage: 'Επιλεγμένο', appearance: 'Εμφάνιση', darkMode: 'Σκούρο θέμα', lightMode: 'Ανοιχτό θέμα', floatingBar: 'Πλωτή μπάρα', detectionLanguages: 'Γλώσσες ανίχνευσης', transcriptionModels: 'Μοντέλα απομαγνητοφώνησης', systemDiagnostics: 'Διαγνωστικά συστήματος', close: 'Κλείσιμο', dictionary: 'Λεξικό' },
  ru: { settings: 'Настройки', interfaceLanguage: 'Язык интерфейса', interfaceLanguageCopy: 'Ищите и мгновенно переключайте язык приложения.', searchLanguage: 'Поиск языка', languageSearchPlaceholder: 'Найдите свой язык...', selectedLanguage: 'Выбран', appearance: 'Внешний вид', darkMode: 'Тёмная тема', lightMode: 'Светлая тема', floatingBar: 'Плавающая панель', detectionLanguages: 'Языки распознавания', transcriptionModels: 'Модели транскрипции', systemDiagnostics: 'Диагностика системы', close: 'Закрыть', dictionary: 'Словарь' },
  'zh-CN': { settings: '设置', interfaceLanguage: '界面语言', interfaceLanguageCopy: '搜索并立即切换应用语言。', searchLanguage: '搜索语言', languageSearchPlaceholder: '搜索你的语言...', selectedLanguage: '已选择', appearance: '外观', darkMode: '深色模式', lightMode: '浅色模式', floatingBar: '悬浮条', detectionLanguages: '检测语言', transcriptionModels: '转录模型', systemDiagnostics: '系统诊断', close: '关闭', dictionary: '词典' },
  ja: { settings: '設定', interfaceLanguage: 'インターフェース言語', interfaceLanguageCopy: '言語を検索してすぐに切り替えられます。', searchLanguage: '言語を検索', languageSearchPlaceholder: '言語を検索...', selectedLanguage: '選択中', appearance: '表示', darkMode: 'ダークモード', lightMode: 'ライトモード', floatingBar: 'フローティングバー', detectionLanguages: '検出言語', transcriptionModels: '文字起こしモデル', systemDiagnostics: 'システム診断', close: '閉じる', dictionary: '辞書' },
  ko: { settings: '설정', interfaceLanguage: '인터페이스 언어', interfaceLanguageCopy: '언어를 검색하고 즉시 앱 언어를 바꿀 수 있습니다.', searchLanguage: '언어 검색', languageSearchPlaceholder: '언어 검색...', selectedLanguage: '선택됨', appearance: '화면', darkMode: '다크 모드', lightMode: '라이트 모드', floatingBar: '플로팅 바', detectionLanguages: '감지 언어', transcriptionModels: '전사 모델', systemDiagnostics: '시스템 진단', close: '닫기', dictionary: '사전' },
  ar: { settings: 'الإعدادات', interfaceLanguage: 'لغة الواجهة', interfaceLanguageCopy: 'ابحث عن لغة التطبيق وبدلها فورًا.', searchLanguage: 'ابحث عن لغة', languageSearchPlaceholder: 'ابحث عن لغتك...', selectedLanguage: 'محدد', appearance: 'المظهر', darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح', floatingBar: 'الشريط العائم', detectionLanguages: 'لغات الاكتشاف', transcriptionModels: 'نماذج النسخ', systemDiagnostics: 'تشخيص النظام', close: 'إغلاق', dictionary: 'القاموس' },
  hi: { settings: 'सेटिंग्स', interfaceLanguage: 'इंटरफ़ेस भाषा', interfaceLanguageCopy: 'अपनी भाषा खोजें और तुरंत ऐप की भाषा बदलें।', searchLanguage: 'भाषा खोजें', languageSearchPlaceholder: 'अपनी भाषा खोजें...', selectedLanguage: 'चयनित', appearance: 'रूप', darkMode: 'डार्क मोड', lightMode: 'लाइट मोड', floatingBar: 'फ़्लोटिंग बार', detectionLanguages: 'पता लगाने की भाषाएँ', transcriptionModels: 'ट्रांसक्रिप्शन मॉडल', systemDiagnostics: 'सिस्टम डायग्नोस्टिक्स', close: 'बंद करें', dictionary: 'शब्दकोश' },
  tr: { settings: 'Ayarlar', interfaceLanguage: 'Arayüz dili', interfaceLanguageCopy: 'Dil arayın ve uygulama dilini anında değiştirin.', searchLanguage: 'Dil ara', languageSearchPlaceholder: 'Dilini ara...', selectedLanguage: 'Seçili', appearance: 'Görünüm', darkMode: 'Koyu mod', lightMode: 'Açık mod', floatingBar: 'Yüzen çubuk', detectionLanguages: 'Algılama dilleri', transcriptionModels: 'Döküm modelleri', systemDiagnostics: 'Sistem tanıları', close: 'Kapat', dictionary: 'Sözlük' },
});

Object.assign(TRANSLATIONS['pt-BR'], {
  historyCopyLimited: 'Historico local das ultimas {count} mensagens.',
  historyCopyUnlimited: 'Historico local de todas as mensagens.',
  transcriptionHistory: 'Historico de transcricoes',
  transcriptionHistoryCopy:
    'Controle se o app guarda apenas as ultimas mensagens locais ou todas as transcricoes.',
  keepAllTranscriptions: 'Guardar todas as transcricoes',
  keepAllTranscriptionsCopy:
    'Salva cada transcricao local sem o limite de {count} mensagens.',
});

const DETECTION_LANGUAGE_TRANSLATIONS = {
  es: {
    detectionLanguagesCopy: 'Elige los idiomas que OpenFlow debe considerar mientras escucha.',
    searchDetectionLanguage: 'Buscar idioma',
    detectionLanguageSearchPlaceholder: 'Buscar idiomas de deteccion...',
    activeDetectionLanguage: 'Activo',
    activeDetectionLanguageSingular: 'idioma activo',
    activeDetectionLanguagePlural: 'idiomas activos',
    removeDetectionLanguage: 'Quitar',
    addDetectionLanguage: 'Agregar',
    showMoreLanguages: 'Mostrar mas idiomas',
    showLessLanguages: 'Mostrar menos idiomas',
    noDetectionLanguageResults: 'Ningun idioma coincide con la busqueda.',
    keepOneDetectionLanguage: 'Mantén al menos un idioma de deteccion seleccionado.',
  },
  fr: {
    detectionLanguagesCopy: 'Choisissez les langues qu OpenFlow doit prendre en compte pendant l ecoute.',
    searchDetectionLanguage: 'Rechercher une langue',
    detectionLanguageSearchPlaceholder: 'Rechercher des langues de detection...',
    activeDetectionLanguage: 'Actif',
    activeDetectionLanguageSingular: 'langue active',
    activeDetectionLanguagePlural: 'langues actives',
    removeDetectionLanguage: 'Retirer',
    addDetectionLanguage: 'Ajouter',
    showMoreLanguages: 'Afficher plus de langues',
    showLessLanguages: 'Afficher moins de langues',
    noDetectionLanguageResults: 'Aucune langue ne correspond a cette recherche.',
    keepOneDetectionLanguage: 'Conservez au moins une langue de detection selectionnee.',
  },
  de: {
    detectionLanguagesCopy: 'Wahle die Sprachen, die OpenFlow beim Zuhoren berucksichtigen soll.',
    searchDetectionLanguage: 'Sprache suchen',
    detectionLanguageSearchPlaceholder: 'Erkennungssprachen suchen...',
    activeDetectionLanguage: 'Aktiv',
    activeDetectionLanguageSingular: 'aktive Sprache',
    activeDetectionLanguagePlural: 'aktive Sprachen',
    removeDetectionLanguage: 'Entfernen',
    addDetectionLanguage: 'Hinzufugen',
    showMoreLanguages: 'Mehr Sprachen anzeigen',
    showLessLanguages: 'Weniger Sprachen anzeigen',
    noDetectionLanguageResults: 'Keine Sprache passt zu dieser Suche.',
    keepOneDetectionLanguage: 'Mindestens eine Erkennungssprache muss ausgewahlt bleiben.',
  },
  it: {
    detectionLanguagesCopy: 'Scegli le lingue che OpenFlow deve considerare durante l ascolto.',
    searchDetectionLanguage: 'Cerca lingua',
    detectionLanguageSearchPlaceholder: 'Cerca lingue di rilevamento...',
    activeDetectionLanguage: 'Attiva',
    activeDetectionLanguageSingular: 'lingua attiva',
    activeDetectionLanguagePlural: 'lingue attive',
    removeDetectionLanguage: 'Rimuovi',
    addDetectionLanguage: 'Aggiungi',
    showMoreLanguages: 'Mostra altre lingue',
    showLessLanguages: 'Mostra meno lingue',
    noDetectionLanguageResults: 'Nessuna lingua corrisponde alla ricerca.',
    keepOneDetectionLanguage: 'Mantieni almeno una lingua di rilevamento selezionata.',
  },
  nl: {
    detectionLanguagesCopy: 'Kies de talen die OpenFlow moet meenemen tijdens het luisteren.',
    searchDetectionLanguage: 'Taal zoeken',
    detectionLanguageSearchPlaceholder: 'Detectietalen zoeken...',
    activeDetectionLanguage: 'Actief',
    activeDetectionLanguageSingular: 'actieve taal',
    activeDetectionLanguagePlural: 'actieve talen',
    removeDetectionLanguage: 'Verwijderen',
    addDetectionLanguage: 'Toevoegen',
    showMoreLanguages: 'Meer talen tonen',
    showLessLanguages: 'Minder talen tonen',
    noDetectionLanguageResults: 'Geen taal gevonden voor deze zoekopdracht.',
    keepOneDetectionLanguage: 'Houd minstens een detectietaal geselecteerd.',
  },
  el: {
    detectionLanguagesCopy: 'Επιλέξτε τις γλώσσες που θα λαμβάνει υπόψη το OpenFlow κατά την ακρόαση.',
    searchDetectionLanguage: 'Αναζήτηση γλώσσας',
    detectionLanguageSearchPlaceholder: 'Αναζήτηση γλωσσών ανίχνευσης...',
    activeDetectionLanguage: 'Ενεργή',
    activeDetectionLanguageSingular: 'ενεργή γλώσσα',
    activeDetectionLanguagePlural: 'ενεργές γλώσσες',
    removeDetectionLanguage: 'Αφαίρεση',
    addDetectionLanguage: 'Προσθήκη',
    showMoreLanguages: 'Εμφάνιση περισσότερων γλωσσών',
    showLessLanguages: 'Εμφάνιση λιγότερων γλωσσών',
    noDetectionLanguageResults: 'Καμία γλώσσα δεν ταιριάζει με την αναζήτηση.',
    keepOneDetectionLanguage: 'Κρατήστε επιλεγμένη τουλάχιστον μία γλώσσα ανίχνευσης.',
  },
  ru: {
    detectionLanguagesCopy: 'Выберите языки, которые OpenFlow должен учитывать во время прослушивания.',
    searchDetectionLanguage: 'Поиск языка',
    detectionLanguageSearchPlaceholder: 'Поиск языков распознавания...',
    activeDetectionLanguage: 'Активно',
    activeDetectionLanguageSingular: 'активный язык',
    activeDetectionLanguagePlural: 'активные языки',
    removeDetectionLanguage: 'Удалить',
    addDetectionLanguage: 'Добавить',
    showMoreLanguages: 'Показать больше языков',
    showLessLanguages: 'Показать меньше языков',
    noDetectionLanguageResults: 'Нет языков, подходящих под поиск.',
    keepOneDetectionLanguage: 'Оставьте выбранным хотя бы один язык распознавания.',
  },
  'zh-CN': {
    detectionLanguagesCopy: '选择 OpenFlow 在聆听时应考虑的语言。',
    searchDetectionLanguage: '搜索语言',
    detectionLanguageSearchPlaceholder: '搜索检测语言...',
    activeDetectionLanguage: '已启用',
    activeDetectionLanguageSingular: '启用的语言',
    activeDetectionLanguagePlural: '启用的语言',
    removeDetectionLanguage: '移除',
    addDetectionLanguage: '添加',
    showMoreLanguages: '显示更多语言',
    showLessLanguages: '显示更少语言',
    noDetectionLanguageResults: '没有匹配的检测语言。',
    keepOneDetectionLanguage: '请至少保留一种检测语言。',
  },
  ja: {
    detectionLanguagesCopy: 'OpenFlow が聞き取り時に考慮する言語を選びます。',
    searchDetectionLanguage: '言語を検索',
    detectionLanguageSearchPlaceholder: '検出言語を検索...',
    activeDetectionLanguage: '有効',
    activeDetectionLanguageSingular: '有効な言語',
    activeDetectionLanguagePlural: '有効な言語',
    removeDetectionLanguage: '削除',
    addDetectionLanguage: '追加',
    showMoreLanguages: '他の言語を表示',
    showLessLanguages: '表示を減らす',
    noDetectionLanguageResults: '検索に一致する検出言語がありません。',
    keepOneDetectionLanguage: '少なくとも 1 つの検出言語を選択してください。',
  },
  ko: {
    detectionLanguagesCopy: 'OpenFlow가 듣는 동안 고려할 언어를 선택하세요.',
    searchDetectionLanguage: '언어 검색',
    detectionLanguageSearchPlaceholder: '감지 언어 검색...',
    activeDetectionLanguage: '활성',
    activeDetectionLanguageSingular: '활성 언어',
    activeDetectionLanguagePlural: '활성 언어',
    removeDetectionLanguage: '제거',
    addDetectionLanguage: '추가',
    showMoreLanguages: '더 많은 언어 보기',
    showLessLanguages: '언어 적게 보기',
    noDetectionLanguageResults: '검색과 일치하는 감지 언어가 없습니다.',
    keepOneDetectionLanguage: '감지 언어를 하나 이상 선택하세요.',
  },
  ar: {
    detectionLanguagesCopy: 'اختر اللغات التي يجب أن يراعيها OpenFlow أثناء الاستماع.',
    searchDetectionLanguage: 'ابحث عن لغة',
    detectionLanguageSearchPlaceholder: 'ابحث في لغات الاكتشاف...',
    activeDetectionLanguage: 'نشطة',
    activeDetectionLanguageSingular: 'لغة نشطة',
    activeDetectionLanguagePlural: 'لغات نشطة',
    removeDetectionLanguage: 'إزالة',
    addDetectionLanguage: 'إضافة',
    showMoreLanguages: 'إظهار المزيد من اللغات',
    showLessLanguages: 'إظهار لغات أقل',
    noDetectionLanguageResults: 'لا توجد لغات مطابقة للبحث.',
    keepOneDetectionLanguage: 'أبق لغة اكتشاف واحدة على الأقل محددة.',
  },
  hi: {
    detectionLanguagesCopy: 'सुनते समय OpenFlow जिन भाषाओं पर विचार करे उन्हें चुनें।',
    searchDetectionLanguage: 'भाषा खोजें',
    detectionLanguageSearchPlaceholder: 'पता लगाने की भाषाएँ खोजें...',
    activeDetectionLanguage: 'सक्रिय',
    activeDetectionLanguageSingular: 'सक्रिय भाषा',
    activeDetectionLanguagePlural: 'सक्रिय भाषाएँ',
    removeDetectionLanguage: 'हटाएँ',
    addDetectionLanguage: 'जोड़ें',
    showMoreLanguages: 'और भाषाएँ दिखाएँ',
    showLessLanguages: 'कम भाषाएँ दिखाएँ',
    noDetectionLanguageResults: 'इस खोज से कोई भाषा नहीं मिली।',
    keepOneDetectionLanguage: 'कम से कम एक पता लगाने की भाषा चयनित रखें।',
  },
  tr: {
    detectionLanguagesCopy: 'OpenFlow un dinlerken dikkate alacağı dilleri seçin.',
    searchDetectionLanguage: 'Dil ara',
    detectionLanguageSearchPlaceholder: 'Algılama dillerini ara...',
    activeDetectionLanguage: 'Aktif',
    activeDetectionLanguageSingular: 'aktif dil',
    activeDetectionLanguagePlural: 'aktif diller',
    removeDetectionLanguage: 'Kaldır',
    addDetectionLanguage: 'Ekle',
    showMoreLanguages: 'Daha fazla dil göster',
    showLessLanguages: 'Daha az dil göster',
    noDetectionLanguageResults: 'Bu aramaya uygun algılama dili yok.',
    keepOneDetectionLanguage: 'En az bir algılama dili seçili kalmalı.',
  },
};

for (const code of SUPPORTED_INTERFACE_LANGUAGES) {
  if (code === 'en' || code === 'pt-BR') {
    continue;
  }

  Object.assign(TRANSLATIONS[code] || (TRANSLATIONS[code] = {}), {
    historyCopyLimited: 'Local history for the latest {count} messages.',
    historyCopyUnlimited: 'Local history for all messages.',
    transcriptionHistory: 'Transcription history',
    transcriptionHistoryCopy:
      'Control whether the app stores only the latest local messages or every transcription.',
    keepAllTranscriptions: 'Keep all transcriptions',
    keepAllTranscriptionsCopy:
      'Save every local transcription without the {count}-message limit.',
    ...(DETECTION_LANGUAGE_TRANSLATIONS[code] || {}),
  });
}

const MODEL_LABELS = {
  tiny: { en: 'Lite', 'pt-BR': 'Lite' },
  base: { en: 'Fast', 'pt-BR': 'Rápido' },
  small: { en: 'Balanced', 'pt-BR': 'Equilibrado' },
  medium: { en: 'Precise', 'pt-BR': 'Preciso' },
  'large-v3': { en: 'Maximum', 'pt-BR': 'Máximo' },
};

const MODEL_DESCRIPTIONS = {
  tiny: { en: 'Minimum latency for quick tests.', 'pt-BR': 'Latência mínima para testes rápidos.' },
  base: { en: 'Better than tiny while staying very fast.', 'pt-BR': 'Melhor que tiny, ainda bem ágil.' },
  small: { en: 'A solid middle ground for daily use.', 'pt-BR': 'Bom meio-termo para uso diário.' },
  medium: { en: 'More quality with moderate latency.', 'pt-BR': 'Mais qualidade com latência moderada.' },
  'large-v3': { en: 'Highest accuracy with a heavier local cost.', 'pt-BR': 'Maior precisão com custo local mais alto.' },
};

const els = {
  historyList: document.getElementById('history-list'),
  historyCount: document.getElementById('history-count'),
  historySearch: document.getElementById('history-search'),
  historyCopy: document.getElementById('history-copy'),
  shortcutLabel: document.getElementById('shortcut-label'),
  pasteShortcutLabel: document.getElementById('paste-shortcut-label'),
  noticeStrip: document.getElementById('notice-strip'),
  statusPanel: document.getElementById('status-panel'),
  statusPanelTitle: document.getElementById('status-panel-title'),
  statusPanelProgress: document.getElementById('status-panel-progress'),
  detectionLanguageDefaults: document.getElementById('detection-language-defaults'),
  detectionLanguageSummary: document.getElementById('detection-language-summary'),
  toggleDetectionLanguages: document.getElementById('toggle-detection-languages'),
  detectionLanguageMore: document.getElementById('detection-language-more'),
  detectionLanguageSearch: document.getElementById('detection-language-search'),
  detectionLanguageList: document.getElementById('detection-language-list'),
  modelList: document.getElementById('model-list'),
  resetStats: document.getElementById('reset-stats'),
  activeModelLabel: document.getElementById('active-model-label'),
  deviceLabel: document.getElementById('device-label'),
  deviceNote: document.getElementById('device-note'),
  streakValue: document.getElementById('streak-value'),
  daysUsedValue: document.getElementById('days-used-value'),
  wordsTotalValue: document.getElementById('words-total-value'),
  wpmValue: document.getElementById('wpm-value'),
  openDictionary: document.getElementById('open-dictionary'),
  closeDictionary: document.getElementById('close-dictionary'),
  dictionaryWindow: document.getElementById('dictionary-window'),
  dictionaryBackdrop: document.getElementById('dictionary-backdrop'),
  dictionaryForm: document.getElementById('dictionary-form'),
  dictionarySources: document.getElementById('dictionary-sources'),
  dictionaryTarget: document.getElementById('dictionary-target'),
  dictionaryLangPt: document.getElementById('dictionary-lang-pt'),
  dictionaryLangEn: document.getElementById('dictionary-lang-en'),
  dictionaryLangPtLabel: document.getElementById('dictionary-lang-pt-label'),
  dictionaryLangEnLabel: document.getElementById('dictionary-lang-en-label'),
  dictionaryList: document.getElementById('dictionary-list'),
  dictionaryCount: document.getElementById('dictionary-count'),
  dictionarySearch: document.getElementById('dictionary-search'),
  cancelDictionaryEdit: document.getElementById('cancel-dictionary-edit'),
  submitDictionaryRule: document.getElementById('submit-dictionary-rule'),
  openSettings: document.getElementById('open-settings'),
  closeSettings: document.getElementById('close-settings'),
  settingsDrawer: document.getElementById('settings-drawer'),
  settingsBackdrop: document.getElementById('settings-backdrop'),
  openAdvanced: document.getElementById('open-advanced'),
  closeAdvanced: document.getElementById('close-advanced'),
  advancedDrawer: document.getElementById('advanced-drawer'),
  advancedBackdrop: document.getElementById('advanced-backdrop'),
  captureShortcut: document.getElementById('capture-shortcut'),
  capturePasteShortcut: document.getElementById('capture-paste-shortcut'),
  shortcutCaptureKeys: document.getElementById('shortcut-capture-keys'),
  pasteShortcutCaptureKeys: document.getElementById('paste-shortcut-capture-keys'),
  duckAudio: document.getElementById('duck-audio'),
  overlayOpacity: document.getElementById('overlay-opacity'),
  overlayOpacityValue: document.getElementById('overlay-opacity-value'),
  overlayScale: document.getElementById('overlay-scale'),
  overlayScaleValue: document.getElementById('overlay-scale-value'),
  overlayDynamicSize: document.getElementById('overlay-dynamic-size'),
  showOverlayBar: document.getElementById('show-overlay-bar'),
  launchAtLogin: document.getElementById('launch-at-login'),
  soundEffectsEnabled: document.getElementById('sound-effects-enabled'),
  keepAllTranscriptions: document.getElementById('keep-all-transcriptions'),
  keepAllTranscriptionsCopy: document.getElementById('keep-all-transcriptions-copy'),
  transcriptionHistoryCopy: document.getElementById('transcription-history-copy'),
  themeRadios: document.querySelectorAll('input[name="theme"]'),
  interfaceLanguageSearch: document.getElementById('interface-language-search'),
  interfaceLanguageList: document.getElementById('interface-language-list'),
  updateVersion: document.getElementById('update-version'),
  updateStatusText: document.getElementById('update-status-text'),
  updateProgress: document.getElementById('update-progress'),
  updateProgressBar: document.getElementById('update-progress-bar'),
  updateAction: document.getElementById('update-action'),
  translatable: document.querySelectorAll('[data-i18n]'),
  translatablePlaceholders: document.querySelectorAll('[data-i18n-placeholder]'),
};

let renderedHistory = [];
let historyFilter = '';
let lastState = null;
let settingsOpen = false;
let settingsCloseTimer = null;
let advancedOpen = false;
let advancedCloseTimer = null;
let capturingShortcutTarget = null;
let captureHeldTokens = new Set();
let captureBestTokens = [];
let captureFinalizing = false;
let dictionaryOpen = false;
let dictionaryCloseTimer = null;
let detectionLanguagesExpanded = false;
let editingDictionaryRuleId = null;
let toastHideTimer = null;
let dictionaryFilter = '';
let lastUpdate = { status: 'idle', version: null, availableVersion: null, progress: 0, message: '' };
let installAfterDownload = false;
const renderCache = {
  translations: '',
  detectionLanguages: '',
  interfaceLanguages: '',
  history: '',
  dictionary: '',
  models: '',
  usage: '',
};

const SETTINGS_CLOSE_DELAY_MS = 500;
const TOAST_HIDE_DELAY_MS = 3200;

function locale() {
  return lastState?.interfaceLanguage || 'en';
}

function t(key) {
  return (TRANSLATIONS[locale()] && TRANSLATIONS[locale()][key]) || TRANSLATIONS.en[key] || key;
}

function template(key, replacements = {}) {
  return Object.entries(replacements).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    t(key),
  );
}

function intFmt(value) {
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function compactFmt(value) {
  return new Intl.NumberFormat(locale(), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

function langName(code, displayLocale = locale()) {
  try {
    return new Intl.DisplayNames([displayLocale], { type: 'language' }).of(code) || code;
  } catch (_error) {
    return code;
  }
}

function capitalizeLanguageLabel(value, displayLocale = locale()) {
  const text = String(value || '').trim();
  if (!text) return text;
  return text.replace(/^\p{L}/u, (match) => match.toLocaleUpperCase(displayLocale));
}

function getSupportedDetectionLanguages() {
  const fromState = Array.isArray(lastState?.supportedDetectionLanguages)
    ? lastState.supportedDetectionLanguages
    : [];
  const unique = [...new Set(fromState.map((code) => String(code || '').trim().toLowerCase()).filter(Boolean))];

  for (const code of DEFAULT_DETECTION_LANGUAGES) {
    if (!unique.includes(code)) {
      unique.push(code);
    }
  }

  return unique;
}

function getSelectedDetectionLanguages() {
  const fromState = Array.isArray(lastState?.allowedLanguages) ? lastState.allowedLanguages : [];
  const list = [...new Set(fromState.map((code) => String(code || '').trim().toLowerCase()).filter(Boolean))];
  return list.length > 0 ? list : [...DEFAULT_DETECTION_LANGUAGES];
}

function getDictionaryFallbackLanguages() {
  const selected = getSelectedDetectionLanguages().filter((code) => DICTIONARY_LANGUAGE_CODES.includes(code));
  return selected.length > 0 ? selected : ['pt'];
}

function detectionLanguageSummary(selectedLanguages) {
  const count = Array.isArray(selectedLanguages) ? selectedLanguages.length : 0;
  return countLabel(
    count,
    t('activeDetectionLanguageSingular'),
    t('activeDetectionLanguagePlural'),
  );
}

function buildSelectedDetectionLanguageCard(code, canRemove) {
  const nativeName = capitalizeLanguageLabel(langName(code, code), code);
  const localName = capitalizeLanguageLabel(langName(code));
  const showLocalName = localName && localName !== nativeName;

  return `
    <article class="detection-language-card detection-language-card--selected">
      <div class="detection-language-card__copy">
        <strong>${esc(nativeName)}</strong>
        <span>${esc(showLocalName ? localName : code.toUpperCase())}</span>
      </div>
      <div class="detection-language-card__side">
        <span class="detection-language-card__meta">${esc(code.toUpperCase())}</span>
        ${
          canRemove
            ? `<button class="detection-language-remove" data-detection-remove="${esc(code)}" type="button" aria-label="${esc(t('removeDetectionLanguage'))} ${esc(localName || nativeName)}">&times;</button>`
            : `<span class="detection-language-lock">${esc(t('activeDetectionLanguage'))}</span>`
        }
      </div>
    </article>
  `;
}

function buildDetectionLanguageOption(code) {
  const nativeName = capitalizeLanguageLabel(langName(code, code), code);
  const localName = capitalizeLanguageLabel(langName(code));
  const showLocalName = localName && localName !== nativeName;

  return `
    <button class="detection-language-card detection-language-card--add" data-detection-add="${esc(code)}" type="button">
      <div class="detection-language-card__copy">
        <strong>${esc(nativeName)}</strong>
        <span>${esc(showLocalName ? localName : code.toUpperCase())}</span>
      </div>
      <span class="detection-language-add">+ ${esc(t('addDetectionLanguage'))}</span>
    </button>
  `;
}

function renderDetectionLanguages() {
  const supported = getSupportedDetectionLanguages();
  const selected = new Set(getSelectedDetectionLanguages());
  const query = String(els.detectionLanguageSearch.value || '').trim().toLocaleLowerCase(locale());
  const signature = [
    locale(),
    detectionLanguagesExpanded ? 'expanded' : 'compact',
    query,
    supported.join(','),
    [...selected].sort().join(','),
  ].join('|');
  if (renderCache.detectionLanguages === signature) {
    return;
  }
  renderCache.detectionLanguages = signature;

  const selectedLanguages = [...selected];
  const extraLanguages = supported
    .filter((code) => !selected.has(code))
    .map((code) => ({
      code,
      label: capitalizeLanguageLabel(langName(code)),
      nativeName: capitalizeLanguageLabel(langName(code, code), code),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, locale()));
  const filteredExtras = extraLanguages.filter((item) => {
    const searchText = `${item.code} ${item.label} ${item.nativeName}`.toLocaleLowerCase(locale());
    return !query || searchText.includes(query);
  });

  els.detectionLanguageDefaults.innerHTML = selectedLanguages
    .map((code) => buildSelectedDetectionLanguageCard(code, selected.size > 1))
    .join('');
  els.detectionLanguageSummary.textContent = detectionLanguageSummary(selectedLanguages);
  els.toggleDetectionLanguages.textContent = detectionLanguagesExpanded
    ? t('showLessLanguages')
    : `${t('showMoreLanguages')} (${intFmt(extraLanguages.length)})`;
  els.toggleDetectionLanguages.classList.toggle('hidden', extraLanguages.length === 0);
  els.detectionLanguageMore.classList.toggle('hidden', !detectionLanguagesExpanded);

  if (filteredExtras.length === 0) {
    els.detectionLanguageList.innerHTML = `<div class="history-empty">${esc(t('noDetectionLanguageResults'))}</div>`;
    return;
  }

  els.detectionLanguageList.innerHTML = filteredExtras
    .map((item) => buildDetectionLanguageOption(item.code))
    .join('');
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function countLabel(count, singular, plural) {
  return `${intFmt(count)} ${count === 1 ? singular : plural}`;
}

function modelLabel(modelId) {
  return (MODEL_LABELS[modelId] && (MODEL_LABELS[modelId][locale()] || MODEL_LABELS[modelId].en)) || modelId || '--';
}

function modelDescription(modelId) {
  return (MODEL_DESCRIPTIONS[modelId] && (MODEL_DESCRIPTIONS[modelId][locale()] || MODEL_DESCRIPTIONS[modelId].en)) || modelId || '--';
}

function formatMs(ms) {
  const value = Number(ms) || 0;
  return value > 0 ? `${Math.round(value)} ms` : '--';
}

function formatShortcut(shortcut, platform = 'win32') {
  return String(shortcut || '')
    .split('+')
    .map((part) => {
      const token = part.trim().toLowerCase();
      if (token === 'commandorcontrol') return platform === 'darwin' ? 'Command' : 'Ctrl';
      if (token === 'ctrl' || token === 'control') return platform === 'darwin' ? 'Control' : 'Ctrl';
      if (token === 'command' || token === 'cmd') return 'Command';
      if (token === 'shift') return 'Shift';
      if (token === 'space') return 'Space';
      if (token === 'enter') return 'Enter';
      const specialLabels = {
        tab: 'Tab',
        backspace: 'Backspace',
        delete: 'Delete',
        insert: 'Insert',
        home: 'Home',
        end: 'End',
        pageup: 'PageUp',
        pagedown: 'PageDown',
        up: 'Up',
        down: 'Down',
        left: 'Left',
        right: 'Right',
      };
      if (specialLabels[token]) return specialLabels[token];
      if (token === 'alt' || token === 'option') return platform === 'darwin' ? 'Option' : 'Alt';
      if (token === 'windows' || token === 'super' || token === 'left windows' || token === 'right windows') {
        return platform === 'darwin' ? 'Command' : 'Win';
      }
      if (/^f([1-9]|1[0-9]|2[0-4])$/.test(token)) return token.toUpperCase();
      return token.length === 1 ? token.toUpperCase() : token;
    })
    .join('+');
}

function getStatusPanelData(state) {
  if (state.error) {
    return {
      tone: 'error',
      icon: '!',
      title: state.error || t('errorStatusTitle'),
      showProgress: false,
    };
  }

  const isLoading = state.switchingModel || state.phase === 'booting';
  if (!isLoading) {
    return null;
  }

  const modelName = modelLabel(state.model);
  const title = `${state.switchingModel ? t('switchingStatusTitle') : t('loadingStatusTitle')}: ${modelName}`;

  return {
    tone: 'loading',
    icon: '',
    title,
    showProgress: true,
  };
}

function renderStatusPanel(state) {
  const panelState = getStatusPanelData(state);
  if (!panelState) {
    els.statusPanel.classList.add('hidden');
    els.statusPanel.classList.remove('status-panel--loading', 'status-panel--error');
    return;
  }

  els.statusPanel.classList.remove('hidden');
  els.statusPanel.classList.toggle('status-panel--loading', panelState.tone === 'loading');
  els.statusPanel.classList.toggle('status-panel--error', panelState.tone === 'error');
  els.statusPanelTitle.textContent = panelState.title;
  els.statusPanelProgress.classList.toggle('hidden', !panelState.showProgress);

  const spinner = els.statusPanel.querySelector('.status-panel__spinner');
  if (spinner) {
    spinner.textContent = panelState.icon;
  }
}

function initTheme() {
const savedTheme = localStorage.getItem('openflow-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  for (const radio of els.themeRadios) {
    if (radio.value === savedTheme) {
      radio.checked = true;
    }
    radio.addEventListener('change', (event) => {
      if (event.target.checked) {
        document.documentElement.setAttribute('data-theme', event.target.value);
  localStorage.setItem('openflow-theme', event.target.value);
      }
    });
  }
}

function updateHistoryCopy() {
  if (!els.historyCopy) {
    return;
  }

  const historyLimit = intFmt(lastState?.historyLimit || 100);
  els.historyCopy.textContent = lastState?.keepAllTranscriptions
    ? t('historyCopyUnlimited')
    : template('historyCopyLimited', { count: historyLimit });
}

function updateHistorySettingsCopy() {
  const historyLimit = intFmt(lastState?.historyLimit || 100);

  if (els.transcriptionHistoryCopy) {
    els.transcriptionHistoryCopy.textContent = t('transcriptionHistoryCopy');
  }

  if (els.keepAllTranscriptionsCopy) {
    els.keepAllTranscriptionsCopy.textContent = template('keepAllTranscriptionsCopy', {
      count: historyLimit,
    });
  }
}

function applyTranslations() {
  const signature = [
    locale(),
    lastState?.historyLimit || '',
    lastState?.keepAllTranscriptions ? 'all' : 'limited',
    editingDictionaryRuleId || '',
    lastUpdate?.status || '',
    lastUpdate?.version || '',
    lastUpdate?.availableVersion || '',
    lastUpdate?.progress || 0,
    lastUpdate?.message || '',
  ].join('|');
  if (renderCache.translations === signature) {
    return;
  }
  renderCache.translations = signature;

  document.documentElement.lang = locale();
  document.documentElement.dir = locale() === 'ar' ? 'rtl' : 'ltr';
  localStorage.setItem('openflow-interface-language', locale());

  for (const element of els.translatable) {
    element.textContent = t(element.dataset.i18n);
  }

  for (const element of els.translatablePlaceholders) {
    element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
  }

  els.dictionaryLangPtLabel.textContent = capitalizeLanguageLabel(langName('pt'));
  els.dictionaryLangEnLabel.textContent = capitalizeLanguageLabel(langName('en'));
  updateDictionaryFormMode();
  const dictionarySearchLabel = els.dictionarySearch.previousElementSibling;
  if (dictionarySearchLabel) {
    dictionarySearchLabel.textContent = t('dictionarySearchLabel');
  }
  els.dictionarySearch.setAttribute('placeholder', t('dictionarySearchPlaceholder'));
  updateHistoryCopy();
  updateHistorySettingsCopy();
  renderUpdateState();
}

function renderUsageSummary(summary = {}) {
  const signature = [
    locale(),
    summary.streakDays || 0,
    summary.totalDays || 0,
    summary.totalWords || 0,
    Math.round(summary.averageWpm || 0),
  ].join('|');
  if (renderCache.usage === signature) {
    return;
  }
  renderCache.usage = signature;

  const singularDay = locale() === 'pt-BR' ? 'dia' : 'day';
  const pluralDay = locale() === 'pt-BR' ? 'dias' : 'days';
  const wordsLabel = locale() === 'pt-BR' ? 'palavras' : 'words';
  const words = Number(summary.totalWords) || 0;

  els.streakValue.textContent = countLabel(summary.streakDays || 0, singularDay, pluralDay);
  els.daysUsedValue.textContent = countLabel(summary.totalDays || 0, singularDay, pluralDay);
  els.wordsTotalValue.textContent = `${words >= 1000 ? compactFmt(words) : intFmt(words)} ${wordsLabel}`;
  els.wpmValue.textContent = `${intFmt(Math.round(summary.averageWpm || 0))} WPM`;
}

function renderInterfaceLanguages() {
  const query = String(els.interfaceLanguageSearch.value || '').trim().toLocaleLowerCase(locale());
  const signature = `${locale()}|${query}`;
  if (renderCache.interfaceLanguages === signature) {
    return;
  }
  renderCache.interfaceLanguages = signature;

  const items = SUPPORTED_INTERFACE_LANGUAGES
    .map((code) => ({
      code,
      nativeName: capitalizeLanguageLabel(langName(code, code)),
      localName: capitalizeLanguageLabel(langName(code)),
    }))
    .filter((item) => {
      const searchText = `${item.code} ${item.nativeName} ${item.localName}`.toLocaleLowerCase(locale());
      return !query || searchText.includes(query);
    });

  if (items.length === 0) {
    els.interfaceLanguageList.innerHTML = `<div class="history-empty">${esc(t('noLanguageResults'))}</div>`;
    return;
  }

  els.interfaceLanguageList.innerHTML = items
    .map((item) => `
      <button
        class="interface-language-card${item.code === locale() ? ' interface-language-card--active' : ''}"
        data-interface-language="${esc(item.code)}"
        type="button"
      >
        <div class="interface-language-card__copy">
          <strong>${esc(item.nativeName)}</strong>
          <span>${esc(item.localName)}</span>
        </div>
        <span class="interface-language-card__meta">${esc(item.code === locale() ? t('selectedLanguage') : item.code)}</span>
      </button>
    `)
    .join('');
}

function renderHistory(history, total) {
  const list = Array.isArray(history) ? history : [];
  const signature = [
    locale(),
    historyFilter.trim(),
    total || 0,
    list.length,
    list
      .map(
        (entry) =>
          `${entry.timestamp || ''}:${entry.model || ''}:${entry.language || ''}:${entry.transcriptionMs || 0}:${entry.wordCount || 0}:${entry.text || ''}`,
      )
      .join('|'),
  ].join('|');
  if (renderCache.history === signature) {
    return;
  }
  renderCache.history = signature;

  const query = historyFilter.trim().toLocaleLowerCase(locale());
  renderedHistory = !query
    ? list
    : list.filter((entry) => String(entry.text || '').toLocaleLowerCase(locale()).includes(query));

  const messageSingular = locale() === 'pt-BR' ? 'mensagem' : 'message';
  const messagePlural = locale() === 'pt-BR' ? 'mensagens' : 'messages';
  const resultSingular = locale() === 'pt-BR' ? 'resultado' : 'result';
  const resultPlural = locale() === 'pt-BR' ? 'resultados' : 'results';
  const wordsLabel = locale() === 'pt-BR' ? 'palavras' : 'words';

  if (list.length === 0) {
    els.historyList.innerHTML = `<div class="history-empty">${esc(t('noTranscriptions'))}</div>`;
    els.historyCount.textContent = countLabel(0, messageSingular, messagePlural);
    return;
  }

  if (renderedHistory.length === 0) {
    els.historyList.innerHTML = `<div class="history-empty">${esc(t('noSearchResults'))}</div>`;
    els.historyCount.textContent = countLabel(0, resultSingular, resultPlural);
    return;
  }

  els.historyCount.textContent = historyFilter.trim()
    ? countLabel(renderedHistory.length, resultSingular, resultPlural)
    : countLabel(total || renderedHistory.length, messageSingular, messagePlural);

  els.historyList.innerHTML = renderedHistory
    .map((entry, index) => {
      const timestamp = new Date(entry.timestamp);
      return `
        <article class="history-item">
          <div class="history-item__time">
            <strong>${timestamp.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}</strong>
            <span>${timestamp.toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' })}</span>
          </div>
          <div class="history-item__body">
            <p>${esc(entry.text)}</p>
            <div class="history-item__meta">
              <span>${esc(modelLabel(entry.model))}</span>
              <span>${esc(capitalizeLanguageLabel(langName(entry.language || 'en')))}</span>
              <span>${esc(formatMs(entry.transcriptionMs))}</span>
              <span>${intFmt(entry.wordCount || 0)} ${wordsLabel}</span>
            </div>
          </div>
          <button class="copy-button" data-history-index="${index}" type="button">${esc(t('copy'))}</button>
        </article>
      `;
    })
    .join('');
}

function renderDictionary(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const signature = [
    locale(),
    dictionaryFilter.trim(),
    list.length,
    list
      .map(
        (entry) =>
          `${entry.id || ''}:${(entry.sources || []).join(',')}:${entry.target || ''}:${(entry.languages || []).join(',')}`,
      )
      .join('|'),
  ].join('|');
  if (renderCache.dictionary === signature) {
    return;
  }
  renderCache.dictionary = signature;

  const query = dictionaryFilter.trim().toLocaleLowerCase(locale());
  const filteredList = !query
    ? list
    : list.filter((entry) => {
      const searchText = `${(entry.sources || []).join(' ')} ${entry.target || ''}`.toLocaleLowerCase(locale());
      return searchText.includes(query);
    });
  const ruleSingular = locale() === 'pt-BR' ? 'regra' : 'rule';
  const rulePlural = locale() === 'pt-BR' ? 'regras' : 'rules';

  els.dictionaryCount.textContent = countLabel(list.length, ruleSingular, rulePlural);

  const searchContainer = els.dictionarySearch.closest('.dictionary-search');
  if (searchContainer) {
    searchContainer.classList.toggle('hidden', list.length === 0);
  }

  if (list.length === 0) {
    els.dictionaryList.innerHTML = `<div class="history-empty">${esc(t('noRules'))}</div>`;
    return;
  }

  if (filteredList.length === 0) {
    els.dictionaryList.innerHTML = `<div class="history-empty">${esc(t('noRuleResults'))}</div>`;
    return;
  }

  els.dictionaryList.innerHTML = filteredList
    .map((entry) => `
      <article class="dictionary-item">
        <div class="dictionary-item__content">
          <div class="dictionary-item__panel">
            <span class="dictionary-item__label">${esc(t('entries'))}</span>
            <div class="dictionary-chip-list">
              ${(entry.sources || []).map((source) => `<span class="dictionary-source-chip">${esc(source)}</span>`).join('')}
            </div>
          </div>
          <div class="dictionary-item__panel">
            <span class="dictionary-item__label">${esc(t('output'))}</span>
            <strong class="dictionary-item__target">${esc(entry.target)}</strong>
          </div>
          <div class="dictionary-item__meta">
            ${(entry.languages || []).map((language) => `<span class="dictionary-chip">${esc(capitalizeLanguageLabel(langName(language)))}</span>`).join('')}
          </div>
        </div>
        <div class="dictionary-item__actions">
          <button class="secondary-button" data-dictionary-edit="${esc(entry.id)}" type="button">${esc(t('edit'))}</button>
          <button class="copy-button" data-dictionary-remove="${esc(entry.id)}" type="button">${esc(t('remove'))}</button>
        </div>
      </article>
    `)
    .join('');
}

function updateDictionaryFormMode() {
  const editing = Boolean(editingDictionaryRuleId);
  els.submitDictionaryRule.textContent = editing ? t('saveRule') : t('addRule');
  els.cancelDictionaryEdit.classList.toggle('hidden', !editing);
}

function renderModels(state) {
  const signature = [
    locale(),
    state.model,
    state.phase,
    state.switchingModel ? 'switching' : 'steady',
    JSON.stringify(state.modelStats || {}),
  ].join('|');
  if (renderCache.models === signature) {
    return;
  }
  renderCache.models = signature;

  const stats = state.modelStats || {};
  const isBusy = state.switchingModel || state.phase === 'booting';
  const avgLabel = locale() === 'pt-BR' ? 'Média' : 'Avg';
  const useSingular = locale() === 'pt-BR' ? 'uso' : 'use';
  const usePlural = locale() === 'pt-BR' ? 'usos' : 'uses';

  els.modelList.innerHTML = (state.availableModels || [])
    .map((option) => {
      const itemStats = stats[option.id] || {};
      return `
        <button class="model-card${option.id === state.model ? ' model-card--active' : ''}${isBusy ? ' model-card--disabled' : ''}" data-model="${option.id}" type="button" ${isBusy ? 'disabled' : ''}>
          <div class="model-card__top">
            <strong>${esc(modelLabel(option.id))}</strong>
            <span>${esc(option.id)}</span>
          </div>
          <p>${esc(modelDescription(option.id))}</p>
          <div class="model-card__stats">
            <span>${avgLabel} ${esc(formatMs(itemStats.averageMs))}</span>
            <span>${countLabel(itemStats.count || 0, useSingular, usePlural)}</span>
          </div>
        </button>
      `;
    })
    .join('');

  for (const button of els.modelList.querySelectorAll('[data-model]')) {
    button.addEventListener('click', async () => {
      if (isBusy) return;
      renderState(await window.flowLocal.updateSettings({ model: button.getAttribute('data-model') }));
    });
  }
}

function describeUpdate(update) {
  switch (update?.status) {
    case 'checking':
      return { text: t('updateChecking'), action: 'check', busy: true, error: false };
    case 'available':
      return {
        text: template('updateAvailable', { version: update.availableVersion || '' }),
        action: 'update',
        busy: false,
        error: false,
      };
    case 'downloading':
      return {
        text: template('updateDownloading', { percent: Math.round(update.progress || 0) }),
        action: 'download',
        busy: true,
        error: false,
      };
    case 'downloaded':
      return {
        text: template('updateDownloaded', { version: update.availableVersion || '' }),
        action: 'install',
        busy: false,
        error: false,
      };
    case 'not-available':
      return { text: t('updateUpToDate'), action: 'check', busy: false, error: false };
    case 'unsupported':
      return { text: t('updateUnsupported'), action: 'check', busy: false, error: false };
    case 'error': {
      const message = update.message || '';
      // A release can exist without the electron-updater metadata files.
      if (/(app-update\.yml|latest(?:-mac)?\.yml|latest\.yml)/i.test(message)) {
        return {
          text: update.availableVersion
            ? template('updateMetadataUnavailableForVersion', { version: update.availableVersion })
            : t('updateMetadataUnavailable'),
          action: 'check',
          busy: false,
          error: false,
        };
      }
      return {
        text: template('updateError', { message }),
        action: 'check',
        busy: false,
        error: true,
      };
    }
    default:
      return { text: t('updateIdle'), action: 'check', busy: false, error: false };
  }
}

function renderUpdateState(update = lastUpdate) {
  lastUpdate = update || lastUpdate;
  if (!els.updateAction) {
    return;
  }

  if (installAfterDownload && lastUpdate.status === 'downloaded') {
    installAfterDownload = false;
    window.flowLocal.installUpdate();
  }

  const info = describeUpdate(lastUpdate);
  const version = lastUpdate.version ? `v${lastUpdate.version}` : 'v--';

  els.updateVersion.textContent = version;
  els.updateStatusText.textContent = info.text;
  els.updateStatusText.classList.toggle('update-card__status--error', info.error);

  const buttonLabel =
    info.action === 'update'
      ? t('downloadUpdate')
      : info.action === 'install'
        ? t('installUpdate')
        : t('checkForUpdates');
  els.updateAction.textContent = buttonLabel;
  els.updateAction.dataset.updateAction = info.action;
  els.updateAction.disabled = info.busy;

  const showProgress = lastUpdate.status === 'downloading';
  els.updateProgress.classList.toggle('hidden', !showProgress);
  els.updateProgressBar.style.width = `${Math.max(0, Math.min(100, Math.round(lastUpdate.progress || 0)))}%`;
}

function hideToast() {
  if (toastHideTimer) {
    window.clearTimeout(toastHideTimer);
    toastHideTimer = null;
  }
  els.noticeStrip.classList.remove('is-visible', 'toast--error');
  els.noticeStrip.classList.add('hidden');
  els.noticeStrip.textContent = '';
}

function showToast(message, autoHide = true) {
  if (!message) {
    hideToast();
    return;
  }
  if (toastHideTimer) {
    window.clearTimeout(toastHideTimer);
    toastHideTimer = null;
  }
  els.noticeStrip.textContent = message;
  els.noticeStrip.classList.remove('hidden', 'toast--error');
  els.noticeStrip.classList.add('toast--error');
  window.requestAnimationFrame(() => els.noticeStrip.classList.add('is-visible'));
  if (autoHide) {
    toastHideTimer = window.setTimeout(hideToast, TOAST_HIDE_DELAY_MS);
  }
}

function renderState(state) {
  lastState = state;
  applyTranslations();
  renderInterfaceLanguages();
  renderDetectionLanguages();
  hideToast();
  renderStatusPanel(state);

  els.shortcutLabel.textContent = formatShortcut(state.shortcut, state.platform) || '--';
  els.pasteShortcutLabel.textContent = formatShortcut(state.pasteLastShortcut, state.platform) || '--';
  els.activeModelLabel.textContent = `${modelLabel(state.model)} (${state.model})`;
  els.deviceLabel.textContent = state.device ? String(state.device).toUpperCase() : '--';
  els.deviceNote.textContent = state.deviceNote || t('noNotes');
  els.showOverlayBar.checked = Boolean(state.showOverlayBar);
  els.launchAtLogin.checked = Boolean(state.launchAtLogin);
  els.soundEffectsEnabled.checked = Boolean(state.soundEffectsEnabled);
  els.keepAllTranscriptions.checked = Boolean(state.keepAllTranscriptions);
  els.duckAudio.checked = Boolean(state.duckAudioEnabled);
  els.overlayDynamicSize.checked = Boolean(state.overlayDynamicSize);

  // Don't fight the user while they are dragging a slider or recording a shortcut.
  const overlayOpacity = Number.isFinite(Number(state.overlayOpacity)) ? Number(state.overlayOpacity) : 100;
  const overlayScale = Number.isFinite(Number(state.overlayScale)) ? Number(state.overlayScale) : 100;
  if (document.activeElement !== els.overlayOpacity) {
    els.overlayOpacity.value = String(overlayOpacity);
  }
  els.overlayOpacityValue.textContent = `${overlayOpacity}%`;
  if (document.activeElement !== els.overlayScale) {
    els.overlayScale.value = String(overlayScale);
  }
  els.overlayScaleValue.textContent = `${overlayScale}%`;
  if (!capturingShortcutTarget) {
    refreshShortcutLabels();
  }

  renderUsageSummary(state.usageSummary || {});
  renderHistory(state.history, state.historyTotal);
  renderDictionary(state.dictionaryEntries);
  renderModels(state);
}

function setSettingsOpen(open) {
  if (settingsCloseTimer) {
    window.clearTimeout(settingsCloseTimer);
    settingsCloseTimer = null;
  }
  settingsOpen = Boolean(open);
  document.body.classList.toggle('settings-open', settingsOpen);

  if (settingsOpen) {
    els.settingsDrawer.classList.remove('hidden');
    els.settingsBackdrop.classList.remove('hidden');
    window.requestAnimationFrame(() => {
      els.settingsDrawer.classList.add('is-visible');
      els.settingsBackdrop.classList.add('is-visible');
      els.settingsDrawer.setAttribute('aria-hidden', 'false');
    });
    return;
  }

  els.settingsDrawer.classList.remove('is-visible');
  els.settingsBackdrop.classList.remove('is-visible');
  els.settingsDrawer.setAttribute('aria-hidden', 'true');
  settingsCloseTimer = window.setTimeout(() => {
    els.settingsDrawer.classList.add('hidden');
    els.settingsBackdrop.classList.add('hidden');
    settingsCloseTimer = null;
  }, SETTINGS_CLOSE_DELAY_MS);
}

function setAdvancedOpen(open) {
  if (advancedCloseTimer) {
    window.clearTimeout(advancedCloseTimer);
    advancedCloseTimer = null;
  }
  advancedOpen = Boolean(open);

  if (advancedOpen) {
    els.advancedDrawer.classList.remove('hidden');
    els.advancedBackdrop.classList.remove('hidden');
    window.requestAnimationFrame(() => {
      els.advancedDrawer.classList.add('is-visible');
      els.advancedBackdrop.classList.add('is-visible');
      els.advancedDrawer.setAttribute('aria-hidden', 'false');
    });
    return;
  }

  els.advancedDrawer.classList.remove('is-visible');
  els.advancedBackdrop.classList.remove('is-visible');
  els.advancedDrawer.setAttribute('aria-hidden', 'true');
  advancedCloseTimer = window.setTimeout(() => {
    els.advancedDrawer.classList.add('hidden');
    els.advancedBackdrop.classList.add('hidden');
    advancedCloseTimer = null;
  }, SETTINGS_CLOSE_DELAY_MS);
}

const SHORTCUT_MODIFIER_TOKENS = ['ctrl', 'alt', 'shift', 'windows', 'command'];
const SHORTCUT_KEY_ALIASES = {
  ' ': 'space',
  Spacebar: 'space',
  Space: 'space',
  Enter: 'enter',
  Return: 'enter',
  Tab: 'tab',
  Backspace: 'backspace',
  Delete: 'delete',
  Del: 'delete',
  Insert: 'insert',
  Ins: 'insert',
  Home: 'home',
  End: 'end',
  PageUp: 'pageup',
  PageDown: 'pagedown',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
};

function shortcutTokenFromEvent(event) {
  const key = event.key;
  if (key === 'Control') return 'ctrl';
  if (key === 'Alt' || key === 'AltGraph') return 'alt';
  if (key === 'Shift') return 'shift';
  if (key === 'Meta' || key === 'OS') {
    return lastState?.platform === 'darwin' ? 'command' : 'windows';
  }
  if (key === 'Escape') return 'escape';
  if (SHORTCUT_KEY_ALIASES[key]) return SHORTCUT_KEY_ALIASES[key];
  if (/^[a-zA-Z0-9]$/.test(key)) return key.toLowerCase();
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(key)) return key.toLowerCase();
  return null;
}

function orderShortcutTokens(tokenSet) {
  const modifiers = SHORTCUT_MODIFIER_TOKENS.filter((token) => tokenSet.has(token));
  const keys = [...tokenSet].filter((token) => !SHORTCUT_MODIFIER_TOKENS.includes(token));
  return [...modifiers, ...keys];
}

function isValidCapturedShortcut(tokens) {
  if (!tokens.length) return false;
  const keys = tokens.filter((token) => !SHORTCUT_MODIFIER_TOKENS.includes(token));
  // Esc stays reserved for cancelling. Other captured keys can be combined freely.
  if (keys.includes('escape')) return false;
  return true;
}

function getCaptureButton(target) {
  return target === 'pasteLastShortcut' ? els.capturePasteShortcut : els.captureShortcut;
}

function refreshShortcutLabels() {
  if (!lastState) return;
  els.shortcutCaptureKeys.textContent = formatShortcut(lastState.shortcut, lastState.platform) || '--';
  els.pasteShortcutCaptureKeys.textContent =
    formatShortcut(lastState.pasteLastShortcut, lastState.platform) || '--';
}

function startShortcutCapture(target) {
  if (capturingShortcutTarget === target) return;
  if (capturingShortcutTarget) stopShortcutCapture();

  capturingShortcutTarget = target;
  captureHeldTokens = new Set();
  captureBestTokens = [];
  captureFinalizing = false;

  const button = getCaptureButton(target);
  button.classList.add('shortcut-capture--recording');
  const keysEl = button.querySelector('.shortcut-capture__keys');
  if (keysEl) keysEl.textContent = t('recordingShortcut');
}

function stopShortcutCapture() {
  if (!capturingShortcutTarget) return;
  capturingShortcutTarget = null;
  captureHeldTokens = new Set();
  captureBestTokens = [];
  captureFinalizing = false;

  for (const button of [els.captureShortcut, els.capturePasteShortcut]) {
    if (button) button.classList.remove('shortcut-capture--recording');
  }
  refreshShortcutLabels();
}

async function finalizeShortcutCapture() {
  if (captureFinalizing) return;
  const target = capturingShortcutTarget;
  const tokens = captureBestTokens.slice();
  if (!target) return;
  captureFinalizing = true;

  if (!isValidCapturedShortcut(tokens)) {
    showToast(t('invalidShortcut'));
    stopShortcutCapture();
    return;
  }

  stopShortcutCapture();
  try {
    renderState(await window.flowLocal.updateSettings({ [target]: tokens.join('+') }));
  } catch (error) {
    showToast(error?.message || t('invalidShortcut'));
  }
}

function handleShortcutCaptureKeydown(event) {
  if (!capturingShortcutTarget) return;
  event.preventDefault();
  event.stopPropagation();

  const token = shortcutTokenFromEvent(event);
  if (token === 'escape') {
    stopShortcutCapture();
    return;
  }
  if (!token) return;

  captureHeldTokens.add(token);
  const ordered = orderShortcutTokens(captureHeldTokens);
  if (ordered.length >= captureBestTokens.length) {
    captureBestTokens = ordered;
  }

  const button = getCaptureButton(capturingShortcutTarget);
  const keysEl = button.querySelector('.shortcut-capture__keys');
  if (keysEl) {
    keysEl.textContent =
      formatShortcut(captureBestTokens.join('+'), lastState?.platform) || t('recordingShortcut');
  }
}

function handleShortcutCaptureKeyup(event) {
  if (!capturingShortcutTarget) return;
  event.preventDefault();
  event.stopPropagation();

  const token = shortcutTokenFromEvent(event);
  if (token) captureHeldTokens.delete(token);
  if (captureBestTokens.length > 0 && isValidCapturedShortcut(captureBestTokens)) {
    finalizeShortcutCapture();
  }
}

function setDictionaryOpen(open) {
  if (dictionaryCloseTimer) {
    window.clearTimeout(dictionaryCloseTimer);
    dictionaryCloseTimer = null;
  }
  dictionaryOpen = Boolean(open);
  document.body.classList.toggle('dictionary-open', dictionaryOpen);

  if (dictionaryOpen) {
    resetDictionaryForm(getDictionaryFallbackLanguages());
    els.dictionaryWindow.classList.remove('hidden');
    els.dictionaryBackdrop.classList.remove('hidden');
    window.requestAnimationFrame(() => {
      els.dictionaryWindow.classList.add('is-visible');
      els.dictionaryBackdrop.classList.add('is-visible');
      els.dictionaryWindow.setAttribute('aria-hidden', 'false');
      els.dictionarySources.focus();
    });
    return;
  }

  els.dictionaryWindow.classList.remove('is-visible');
  els.dictionaryBackdrop.classList.remove('is-visible');
  els.dictionaryWindow.setAttribute('aria-hidden', 'true');
  dictionaryCloseTimer = window.setTimeout(() => {
    els.dictionaryWindow.classList.add('hidden');
    els.dictionaryBackdrop.classList.add('hidden');
    dictionaryCloseTimer = null;
  }, SETTINGS_CLOSE_DELAY_MS);
}

function parseDictionarySources(value) {
  const nextSources = [];
  const seenSources = new Set();
  for (const item of String(value || '')
    .split(/\r?\n|;/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)) {
    const key = item.toLocaleLowerCase(locale());
    if (seenSources.has(key)) continue;
    seenSources.add(key);
    nextSources.push(item);
  }
  return nextSources;
}

function resetDictionaryForm(fallbackLanguages) {
  els.dictionaryForm.reset();
  editingDictionaryRuleId = null;
  els.dictionaryLangPt.checked = fallbackLanguages.includes('pt');
  els.dictionaryLangEn.checked = fallbackLanguages.includes('en');
  applyTranslations();
}

function selectedDictionaryLanguages(fallbackLanguages) {
  const list = [els.dictionaryLangPt.checked ? 'pt' : null, els.dictionaryLangEn.checked ? 'en' : null].filter(Boolean);
  return list.length > 0 ? list : fallbackLanguages;
}

function setupHandlers() {
  const updateDetectionLanguages = async (languages) => {
    const selected = [...new Set(languages.map((code) => String(code || '').trim().toLowerCase()).filter(Boolean))];
    if (selected.length === 0) {
      showToast(t('keepOneDetectionLanguage'));
      return;
    }

    renderState(await window.flowLocal.updateSettings({ allowedLanguages: selected }));
  };

  els.detectionLanguageDefaults.addEventListener('click', (event) => {
    const button = event.target.closest('[data-detection-remove]');
    if (!button) {
      return;
    }

    const code = button.getAttribute('data-detection-remove');
    const next = getSelectedDetectionLanguages().filter((language) => language !== code);
    updateDetectionLanguages(next);
  });

  els.detectionLanguageList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-detection-add]');
    if (!button) {
      return;
    }

    const code = button.getAttribute('data-detection-add');
    updateDetectionLanguages([...getSelectedDetectionLanguages(), code]);
  });

  els.toggleDetectionLanguages.addEventListener('click', () => {
    detectionLanguagesExpanded = !detectionLanguagesExpanded;
    if (!detectionLanguagesExpanded) {
      els.detectionLanguageSearch.value = '';
    }
    renderDetectionLanguages();
    if (detectionLanguagesExpanded) {
      els.detectionLanguageSearch.focus();
    }
  });
  els.detectionLanguageSearch.addEventListener('input', renderDetectionLanguages);

  els.interfaceLanguageSearch.addEventListener('input', renderInterfaceLanguages);
  els.interfaceLanguageList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-interface-language]');
    if (!button) return;
    const nextLanguage = button.getAttribute('data-interface-language');
    if (nextLanguage && nextLanguage !== locale()) {
      renderState(await window.flowLocal.updateSettings({ interfaceLanguage: nextLanguage }));
    }
  });

  els.resetStats.addEventListener('click', async () => {
    renderState(await window.flowLocal.resetModelStats());
  });

  els.updateAction.addEventListener('click', async () => {
    const action = els.updateAction.dataset.updateAction || 'check';
    if (action === 'update') {
      installAfterDownload = true;
      const update = await window.flowLocal.downloadUpdate();
      renderUpdateState(update);
      if (update?.status !== 'downloaded' && update?.status !== 'downloading') {
        installAfterDownload = false;
      }
      return;
    }
    if (action === 'install') {
      await window.flowLocal.installUpdate();
      return;
    }
    renderUpdateState(await window.flowLocal.checkForUpdates());
  });
  els.openSettings.addEventListener('click', () => setSettingsOpen(true));
  els.closeSettings.addEventListener('click', () => setSettingsOpen(false));
  els.settingsBackdrop.addEventListener('click', () => setSettingsOpen(false));
  els.openAdvanced.addEventListener('click', () => setAdvancedOpen(true));
  els.closeAdvanced.addEventListener('click', () => setAdvancedOpen(false));
  els.advancedBackdrop.addEventListener('click', () => setAdvancedOpen(false));
  els.openDictionary.addEventListener('click', () => setDictionaryOpen(true));
  els.closeDictionary.addEventListener('click', () => setDictionaryOpen(false));
  els.dictionaryBackdrop.addEventListener('click', () => setDictionaryOpen(false));
  els.dictionarySearch.addEventListener('input', () => {
    dictionaryFilter = els.dictionarySearch.value || '';
    if (lastState) renderDictionary(lastState.dictionaryEntries);
  });

  els.showOverlayBar.addEventListener('change', async () => {
    renderState(await window.flowLocal.updateSettings({ showOverlayBar: els.showOverlayBar.checked }));
  });
  els.launchAtLogin.addEventListener('change', async () => {
    renderState(await window.flowLocal.updateSettings({ launchAtLogin: els.launchAtLogin.checked }));
  });
  els.soundEffectsEnabled.addEventListener('change', async () => {
    renderState(await window.flowLocal.updateSettings({ soundEffectsEnabled: els.soundEffectsEnabled.checked }));
  });
  els.keepAllTranscriptions.addEventListener('change', async () => {
    renderState(await window.flowLocal.updateSettings({
      keepAllTranscriptions: els.keepAllTranscriptions.checked,
    }));
  });
  els.duckAudio.addEventListener('change', async () => {
    renderState(await window.flowLocal.updateSettings({ duckAudioEnabled: els.duckAudio.checked }));
  });

  els.overlayOpacity.addEventListener('input', () => {
    els.overlayOpacityValue.textContent = `${els.overlayOpacity.value}%`;
    window.flowLocal.previewOverlayStyle({ overlayOpacity: Number(els.overlayOpacity.value) });
  });
  els.overlayOpacity.addEventListener('change', async () => {
    renderState(await window.flowLocal.updateSettings({ overlayOpacity: Number(els.overlayOpacity.value) }));
  });
  els.overlayScale.addEventListener('input', () => {
    els.overlayScaleValue.textContent = `${els.overlayScale.value}%`;
    window.flowLocal.previewOverlayStyle({ overlayScale: Number(els.overlayScale.value) });
  });
  els.overlayScale.addEventListener('change', async () => {
    renderState(await window.flowLocal.updateSettings({ overlayScale: Number(els.overlayScale.value) }));
  });
  els.overlayDynamicSize.addEventListener('change', async () => {
    renderState(await window.flowLocal.updateSettings({ overlayDynamicSize: els.overlayDynamicSize.checked }));
  });

  els.captureShortcut.addEventListener('click', () => startShortcutCapture('shortcut'));
  els.capturePasteShortcut.addEventListener('click', () => startShortcutCapture('pasteLastShortcut'));
  // Capture phase so we intercept the keys before the app's other shortcuts/handlers.
  window.addEventListener('keydown', handleShortcutCaptureKeydown, true);
  window.addEventListener('keyup', handleShortcutCaptureKeyup, true);
  // Clicking anywhere outside the active capture button cancels recording.
  window.addEventListener(
    'mousedown',
    (event) => {
      if (!capturingShortcutTarget) return;
      const activeButton = getCaptureButton(capturingShortcutTarget);
      if (activeButton && activeButton.contains(event.target)) return;
      stopShortcutCapture();
    },
    true,
  );

  els.historySearch.addEventListener('input', () => {
    historyFilter = els.historySearch.value || '';
    if (lastState) renderHistory(lastState.history, lastState.historyTotal);
  });

  els.historyList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-history-index]');
    if (!button) return;
    const entry = renderedHistory[Number(button.getAttribute('data-history-index'))];
    if (!entry) return;
    await window.flowLocal.copyText(entry.text);
    const originalLabel = button.textContent;
    button.textContent = t('copied');
    window.setTimeout(() => {
      if (button.isConnected) button.textContent = originalLabel;
    }, 1200);
  });

  els.dictionaryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const sources = parseDictionarySources(els.dictionarySources.value);
    const target = (els.dictionaryTarget.value || '').trim();
    const fallbackLanguages = getDictionaryFallbackLanguages();
    const languages = selectedDictionaryLanguages(fallbackLanguages);

    if (!sources.length || !target) {
      return;
    }

    const currentEntries = [...(lastState?.dictionaryEntries || [])];
    const nextEntry = { id: editingDictionaryRuleId || undefined, sources, target, languages };
    const nextEntries = editingDictionaryRuleId
      ? currentEntries.map((entry) => (entry.id === editingDictionaryRuleId ? nextEntry : entry))
      : [...currentEntries, nextEntry];

    renderState(await window.flowLocal.updateSettings({ dictionaryEntries: nextEntries }));
    resetDictionaryForm(languages);
    els.dictionarySources.focus();
  });

  els.dictionaryList.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-dictionary-edit]');
    if (editButton) {
      const entry = (lastState?.dictionaryEntries || []).find((item) => item.id === editButton.getAttribute('data-dictionary-edit'));
      if (!entry) return;
      editingDictionaryRuleId = entry.id;
      els.dictionarySources.value = (entry.sources || []).join('\n');
      els.dictionaryTarget.value = entry.target || '';
      els.dictionaryLangPt.checked = (entry.languages || []).includes('pt');
      els.dictionaryLangEn.checked = (entry.languages || []).includes('en');
      applyTranslations();
      els.dictionarySources.focus();
      return;
    }

    const removeButton = event.target.closest('[data-dictionary-remove]');
    if (!removeButton) return;

    const entryId = removeButton.getAttribute('data-dictionary-remove');
    renderState(await window.flowLocal.updateSettings({
      dictionaryEntries: (lastState?.dictionaryEntries || []).filter((entry) => entry.id !== entryId),
    }));
    if (editingDictionaryRuleId === entryId) {
      resetDictionaryForm(getDictionaryFallbackLanguages());
    }
  });

  els.cancelDictionaryEdit.addEventListener('click', () => {
    resetDictionaryForm(getDictionaryFallbackLanguages());
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    // While recording a shortcut, Esc is handled by the capture listener (it cancels
    // recording) and never reaches here because that listener stops propagation.
    if (dictionaryOpen) {
      setDictionaryOpen(false);
      return;
    }
    if (advancedOpen) {
      setAdvancedOpen(false);
      return;
    }
    if (settingsOpen) {
      setSettingsOpen(false);
    }
  });
}

async function bootstrap() {
  initTheme();
  renderState(await window.flowLocal.getState());
  window.flowLocal.onStateUpdate((state) => renderState(state));
  window.flowLocal.onUpdateStatus((update) => renderUpdateState(update));
  setupHandlers();

  try {
    renderUpdateState(await window.flowLocal.getUpdateState());
  } catch (_error) {
    // Update channel is optional; ignore if unavailable.
  }
}

bootstrap();
