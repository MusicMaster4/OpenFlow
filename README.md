# MegaFala

App desktop para Windows com Electron na interface e Faster-Whisper rodando localmente.

## Arquitetura atual

- a interface e o processo principal rodam em Electron
- a transcricao roda em um worker Python separado
- o listener de atalho global roda em outro worker Python
- no app compilado, o Electron continua levando o runtime Node embutido
- o que precisa ser empacotado explicitamente e o runtime Python dos workers

## Fluxo recomendado para modelos

- o default deve ser `small`, que corresponde ao perfil equilibrado
- o primeiro boot do app pode baixar automaticamente esse modelo para `%APPDATA%/MegaFala/models`
- os outros modelos devem aparecer nas configuracoes com status `Nao instalado`, `Baixando` ou `Instalado`
- o download pode ser feito pelo proprio app compilado, sem depender de Next.js e sem depender de Node instalado no sistema
- isso funciona porque o download acontece no worker Python via `faster-whisper` e `huggingface_hub`

## Onde os dados ficam

- preferencias e historico: `%APPDATA%/MegaFala/store/settings.json`
- cache local dos modelos: `%APPDATA%/MegaFala/models`

## Desenvolvimento

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\python\requirements.txt
python -m pip install pyinstaller
npm install
```

No Windows, o `requirements.txt` instala tambem `nvidia-cublas-cu12`, usado quando o backend CUDA do CTranslate2 estiver disponivel.

## Arquivo `.env`

Edite [`.env`](H:/Python/Tools/Wispr%20Flow%20Clone/.env) se quiser trocar os defaults:

```dotenv
WHISPER_MODEL=small
WHISPER_DEVICE=auto
WHISPER_COMPUTE_TYPE=
FLOW_HOTKEY=ctrl+windows
ALLOWED_LANGUAGES=pt,en
```

O modelo selecionado na interface continua sendo persistido e prevalece nas proximas execucoes.

## Rodar em dev

```powershell
.\.venv\Scripts\Activate.ps1
npm start
```

## Compilar o app Windows

1. Instale as dependencias de Node e Python:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\python\requirements.txt
python -m pip install pyinstaller
npm install
```

2. Gere os executaveis Python que serao embutidos no app:

```powershell
npm run build:python
```

3. Gere o instalador Windows:

```powershell
npm run dist:win
```

4. O instalador final ficara em `dist/`.

## O que o build faz

- `scripts/build-python.ps1` gera `dictation_service.exe` e `hotkey_listener.exe`
- `electron-builder` empacota o Electron e copia esses workers para `resources/bin`
- os scripts PowerShell usados para colagem de texto e controle de audio vao para `resources/scripts`
- em producao, o app passa a chamar esses executaveis, sem depender de Python instalado na maquina

## Observacoes

- se o runtime CUDA/cuBLAS nao estiver disponivel, o app faz fallback automatico para CPU
- modelos maiores melhoram a qualidade, mas aumentam latencia, uso de RAM e tempo de download
- se voce quiser um fluxo de UI com botao `Baixar`, o proximo passo e adicionar um pequeno manager de modelos no worker Python para instalar, remover e informar status para a interface
