# Compilacao do MegaFala

Este arquivo descreve como compilar o aplicativo e qual e o estado real de suporte por plataforma.

## Resumo rapido

- `Windows`: suportado no estado atual do projeto.
- `macOS`: ainda nao suportado no estado atual do projeto; exige adaptacoes de codigo antes de gerar um app funcional.

## Como o app empacotado funciona

- o Electron leva o runtime Node embutido no aplicativo final
- o usuario final nao precisa ter `Node.js`, `npm` ou `Next.js` instalados
- o backend de transcricao roda em workers Python separados
- no build de producao, esses workers Python sao convertidos em executaveis via `PyInstaller`
- os modelos do Whisper ficam fora do pacote, em cache local do usuario

## Diretorios importantes

- preferencias e historico: `%APPDATA%/MegaFala/store/settings.json`
- modelos baixados: `%APPDATA%/MegaFala/models`
- workers Python empacotados: `build/python-dist/`
- instaladores gerados: `dist/`

## Build para Windows

### 1. Pre-requisitos

Instale na maquina de build:

- `Python 3.12`
- `Node.js 20+`
- `npm`

Recomendado no Windows:

- abrir o terminal como administrador, ou
- ativar `Developer Mode` no Windows

Isso evita erro de permissao com links simbolicos durante o `electron-builder`.

### 2. Instalar dependencias do projeto

No diretorio raiz do projeto:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\python\requirements.txt
python -m pip install pyinstaller
npm install
```

### 3. Validar o codigo JavaScript

```powershell
npm run check
```

### 4. Gerar os workers Python de producao

```powershell
npm run build:python
```

Esse comando gera:

- `build/python-dist/dictation_service/`
- `build/python-dist/hotkey_listener/`

### 5. Gerar o instalador Windows

```powershell
npm run dist:win
```

Saidas esperadas:

- app desempacotado: `dist/win-unpacked/`
- instalador NSIS: `dist/`

### 6. Problema comum no Windows

Se o `npm run dist:win` falhar com erro parecido com:

```text
Cannot create symbolic link
O cliente nao tem o privilegio necessario
```

faca um destes:

1. Ative `Developer Mode` no Windows.
2. Rode o terminal como administrador.
3. Execute novamente `npm run dist:win`.

### 7. Teste do instalador

Depois de instalar:

1. abra o app
2. aguarde o carregamento do worker
3. no primeiro uso, o modelo default `small` pode ser baixado para `%APPDATA%/MegaFala/models`
4. teste o atalho global e a colagem em outro aplicativo

## Build para macOS

## Status atual

Hoje o projeto nao gera um app macOS funcional. O motivo nao e o Electron em si, e a camada nativa do app:

- [`scripts/send_text.ps1`](H:\Python\Tools\Wispr Flow Clone\scripts\send_text.ps1) e Windows-only
- [`scripts/system_audio_controller.ps1`](H:\Python\Tools\Wispr Flow Clone\scripts\system_audio_controller.ps1) e Windows-only
- o pipeline de build Python atual usa [`scripts/build-python.ps1`](H:\Python\Tools\Wispr Flow Clone\scripts\build-python.ps1), que e Windows-only
- o fluxo de hotkey global atual foi montado com foco em Windows

## O que precisa ser feito antes de compilar no macOS

1. Substituir a colagem de texto por uma implementacao macOS.
   Exemplo: AppleScript, `osascript`, `CGEvent` ou um helper nativo.

2. Substituir ou desativar o ducking de audio.
   Hoje isso depende de Core Audio via PowerShell/C# embutido para Windows.

3. Trocar o listener global de atalho por uma opcao compativel com macOS.
   O caminho mais simples tende a ser usar `globalShortcut` do Electron, ou criar um helper nativo para macOS.

4. Criar um script de build Python para macOS.
   Exemplo: `scripts/build-python.sh` usando `pyinstaller`.

5. Adicionar target macOS no `electron-builder`.
   Exemplo: `dmg` e/ou `zip`.

6. Configurar assinatura e notarizacao da Apple se o app for distribuido fora do ambiente local.

## Sequencia recomendada para habilitar macOS

Quando essas adaptacoes forem feitas, a sequencia de build deve ficar assim:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r ./python/requirements.txt
python -m pip install pyinstaller
npm install
npm run check
./scripts/build-python.sh
npx electron-builder --mac dmg
```

Mas isso ainda depende das trocas de implementacao listadas acima.

## Recomendacao pratica

- para entregar instalador agora: foque em `Windows`
- para suportar `macOS`: primeiro portar hotkeys, colagem de texto e controle de audio
- o worker de transcricao com `faster-whisper` e a logica de modelos sao aproveitaveis nas duas plataformas

