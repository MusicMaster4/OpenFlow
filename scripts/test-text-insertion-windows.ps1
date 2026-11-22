# Exercise the real Windows clipboard pipeline against a private edit control.
# Dispatch is directed to that control so this check cannot type into the user's app.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'send_text.ps1') -EncodedText ''
# Clipboard monitors (WSLg msrdc, clipboard history) briefly hold the clipboard
# open after every change, so the test's own reads and writes must retry.
function Get-TestClipboardText {
  Invoke-ClipboardAction -Operation 'test read' -Action { [OpenFlow.Native.PasteClipboard]::ReadText() }
}
function Set-TestClipboardText([string]$Value) {
  Invoke-ClipboardAction -Operation 'test write' -Action { [System.Windows.Forms.Clipboard]::SetText($Value) }
}
$previousClipboard = [System.Windows.Forms.Clipboard]::GetDataObject()
$edit = New-Object System.Windows.Forms.TextBox
$edit.Multiline = $true
$edit.MaxLength = [int]::MaxValue
$edit.CreateControl()

function Get-ForegroundTarget {
  return @{ Process = 'test'; Class = 'EDIT'; ProcessId = $PID; Inaccessible = $false }
}
function Send-PasteShortcut {
  param([string]$PasteMethod)
  if ($PasteMethod -ne 'ctrl-v') { throw "Unexpected paste method: $PasteMethod" }
  # WM_PASTE invokes the edit control's real clipboard consumer without relying
  # on foreground focus. Post it, like a real app handling Ctrl+V from its queue.
  [void]$edit.BeginInvoke([Action]{ $edit.Paste() })
}

try {
  $phrase = 'Transcri' + [char]0xE7 + [char]0xE3 + 'o longa com a' + [char]0xE7 + [char]0xE3 + 'o. '
  foreach ($text in @('Short paste.', ($phrase * 2500), 'Consecutive paste after long text.')) {
    $edit.Clear()
    Set-TestClipboardText('original clipboard')
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    Invoke-TextInsertion -Text $text
    if ($edit.Text -cne $text) { throw "Pasted text mismatch: expected $($text.Length), received $($edit.Text.Length) characters." }
    if ((Get-TestClipboardText) -cne 'original clipboard') { throw "Clipboard was not restored after $($text.Length) characters." }
    Write-Output "PASS: $($text.Length) characters pasted intact in $($watch.ElapsedMilliseconds) ms, clipboard restored."
  }

  # Simulate the clipboard staying unavailable through every preparation attempt.
  # No shortcut or character input is safe until the complete text is ready.
  & {
    function Publish-ClipboardTextForPaste { throw 'temporarily locked' }
    function Send-TextAsKeystrokes { throw 'unexpected character input' }
    function Send-PasteShortcut { throw 'unexpected paste shortcut' }
    try {
      Invoke-TextInsertion -Text 'Blocked paste.'
      throw 'Expected clipboard error.'
    } catch {
      if ($_.Exception.Message -notmatch 'temporarily locked') { throw }
    }
  }
  Write-Output 'PASS: a locked clipboard reports failure without injecting any input.'

  # A busy target that reads the clipboard well after the shortcut (the old fixed
  # 400 ms restore window) must still receive the dictation, not the old clipboard.
  $lateTimer = New-Object System.Windows.Forms.Timer
  $lateTimer.Interval = 900
  $lateTimer.Add_Tick({ $lateTimer.Stop(); $edit.Paste() })
  function Send-PasteShortcut {
    param([string]$PasteMethod)
    $lateTimer.Start()
  }
  $edit.Clear()
  Set-TestClipboardText('original clipboard')
  Invoke-TextInsertion -Text 'Late reader gets the dictation.'
  $lateTimer.Dispose()
  if ($edit.Text -cne 'Late reader gets the dictation.') { throw "Late paste received '$($edit.Text)'." }
  if ((Get-TestClipboardText) -cne 'original clipboard') { throw "Clipboard was not restored after a late paste: '$((Get-TestClipboardText))'." }
  Write-Output 'PASS: a late clipboard read still pastes the dictation, then restores.'

  # A target that never reads the clipboard must not get the old content back
  # early. Clipboard monitors on the machine (WSLg msrdc, clipboard history) may
  # read the item; such unconfirmed reads only allow a restore after the full
  # safety window, otherwise the dictation stays on the clipboard as real data.
  $PasteConsumeTimeoutMs = 300
  function Send-PasteShortcut { param([string]$PasteMethod) }
  Set-TestClipboardText('original clipboard')
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  Invoke-TextInsertion -Text 'Unread dictation stays.'
  $elapsed = $watch.ElapsedMilliseconds
  $clipboardText = (Get-TestClipboardText)
  if ($clipboardText -ceq 'original clipboard') {
    if ($elapsed -lt $RestoreDelayMs) { throw "Unread dictation was replaced by the old clipboard after only $elapsed ms." }
  } elseif ($clipboardText -cne 'Unread dictation stays.') {
    throw "Unexpected clipboard after an unread paste: '$clipboardText'."
  }
  $PasteConsumeTimeoutMs = 3000
  Write-Output 'PASS: an unread dictation is never replaced before the safety window.'

  # A copy made while the target handles paste must survive cleanup.
  function Send-PasteShortcut {
    param([string]$PasteMethod)
    $edit.Paste()
    Set-TestClipboardText('new copy during paste')
  }
  Invoke-TextInsertion -Text 'Preserve a newer copy.'
  if ((Get-TestClipboardText) -cne 'new copy during paste') { throw 'Cleanup overwrote a newer copy.' }
  Write-Output 'PASS: clipboard cleanup preserves newer copies.'
} finally {
  $edit.Dispose()
  if ($previousClipboard) { [System.Windows.Forms.Clipboard]::SetDataObject($previousClipboard, $true) }
  else { [System.Windows.Forms.Clipboard]::Clear() }
}
