# Exercise the real Windows clipboard pipeline against a private edit control.
# Dispatch is directed to that control so this check cannot type into the user's app.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'send_text.ps1') -EncodedText ''
$previousClipboard = [System.Windows.Forms.Clipboard]::GetDataObject()
$edit = New-Object System.Windows.Forms.TextBox
$edit.Multiline = $true
$edit.MaxLength = [int]::MaxValue
$edit.CreateControl()

function Get-ForegroundTarget {
  return @{ Process = 'test'; Class = 'EDIT'; Inaccessible = $false }
}
function Send-PasteShortcut {
  param([string]$PasteMethod)
  if ($PasteMethod -ne 'ctrl-v') { throw "Unexpected paste method: $PasteMethod" }
  # WM_PASTE invokes the edit control's real clipboard consumer synchronously,
  # without relying on foreground focus in a background test process.
  $edit.Paste()
}

try {
  $phrase = 'Transcri' + [char]0xE7 + [char]0xE3 + 'o longa com a' + [char]0xE7 + [char]0xE3 + 'o. '
  foreach ($text in @('Short paste.', ($phrase * 2500), 'Consecutive paste after long text.')) {
    $edit.Clear()
    [System.Windows.Forms.Clipboard]::SetText('original clipboard')
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    Invoke-TextInsertion -Text $text
    if ($edit.Text -cne $text) { throw "Pasted text mismatch: expected $($text.Length), received $($edit.Text.Length) characters." }
    if ([System.Windows.Forms.Clipboard]::GetText() -cne 'original clipboard') { throw "Clipboard was not restored after $($text.Length) characters." }
    Write-Output "PASS: $($text.Length) characters pasted intact in $($watch.ElapsedMilliseconds) ms, clipboard restored."
  }

  # A copy made while the target handles paste must survive cleanup.
  function Send-PasteShortcut {
    param([string]$PasteMethod)
    $edit.Paste()
    [System.Windows.Forms.Clipboard]::SetText('new copy during paste')
  }
  Invoke-TextInsertion -Text 'Preserve a newer copy.'
  if ([System.Windows.Forms.Clipboard]::GetText() -cne 'new copy during paste') { throw 'Cleanup overwrote a newer copy.' }
  Write-Output 'PASS: clipboard cleanup preserves newer copies.'
} finally {
  $edit.Dispose()
  if ($previousClipboard) { [System.Windows.Forms.Clipboard]::SetDataObject($previousClipboard, $true) }
  else { [System.Windows.Forms.Clipboard]::Clear() }
}
