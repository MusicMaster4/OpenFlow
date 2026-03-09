# MegaFala

App desktop com Electron na interface e Faster-Whisper rodando localmente.

## Plataformas

- Windows
- macOS

## Arquitetura

- a interface roda em Electron
- a transcricao roda em um worker Python separado
- o listener global de atalho roda em outro worker Python separado
- no app compilado, esses workers Python sao empacotados com `PyInstaller`

## Modelos

- o default do app e `small`
- no primeiro boot, se esse modelo ainda nao existir localmente, o app faz o download automatico
- quando o usuario troca de modelo na interface, o app baixa o novo modelo sob demanda, se necessario
- os modelos ficam salvos na pasta de dados do usuario

## Build

As instrucoes completas de compilacao estao em [COMPILACAO.md](H:\Python\Tools\Wispr%20Flow%20Clone\COMPILACAO.md).
