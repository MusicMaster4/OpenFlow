param(
  [Parameter(Mandatory = $true)]
  [string]$EncodedText,

  # How the text reaches the focused app. 'auto' inspects the foreground window
  # and picks the shortcut that app actually understands.
  [ValidateSet('auto', 'ctrl-v', 'shift-insert', 'ctrl-shift-v', 'type')]
  [string]$Method = 'auto',

  # How long to leave the transcription on the clipboard before restoring the
  # user's previous content. Slow apps (Electron, remote sessions) read the
  # clipboard asynchronously and need more than a few dozen milliseconds.
  [int]$RestoreDelayMs = 400
)

try {
  $Text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($EncodedText))
} catch {
  throw "Failed to decode UTF-8 text for sending."
}

if ([string]::IsNullOrEmpty($Text)) {
  exit 0
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Inject the paste keystroke at a low level. keybd_event is far more reliable than
# SendKeys across applications (especially Chromium/Electron targets and apps that
# debounce the higher-level WM_* messages SendKeys relies on).
if (-not ([System.Management.Automation.PSTypeName]'OpenFlow.Native.Keyboard').Type) {
  Add-Type -Namespace 'OpenFlow.Native' -Name 'Keyboard' -UsingNamespace 'System.Text' -MemberDefinition @"
    [System.Runtime.InteropServices.DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, System.UIntPtr dwExtraInfo);

    [System.Runtime.InteropServices.DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);

    [System.Runtime.InteropServices.DllImport("user32.dll")]
    public static extern uint MapVirtualKey(uint uCode, uint uMapType);

    [System.Runtime.InteropServices.DllImport("user32.dll")]
    public static extern System.IntPtr GetForegroundWindow();

    [System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Unicode)]
    public static extern int GetClassName(System.IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [System.Runtime.InteropServices.DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(System.IntPtr hWnd, out uint lpdwProcessId);
"@
}

$VK_LSHIFT = [byte]0xA0
$VK_RSHIFT = [byte]0xA1
$VK_LCONTROL = [byte]0xA2
$VK_RCONTROL = [byte]0xA3
$VK_LMENU = [byte]0xA4
$VK_RMENU = [byte]0xA5
$VK_LWIN = [byte]0x5B
$VK_RWIN = [byte]0x5C
$VK_V = [byte]0x56
$VK_INSERT = [byte]0x2D

$KEYEVENTF_EXTENDEDKEY = [uint32]0x0001
$KEYEVENTF_KEYUP = [uint32]0x0002

# Modifiers that can contaminate the synthetic paste if the user is still holding
# them (the dictation hotkey is Ctrl+Win, the paste-last hotkey is Ctrl+Alt+V).
$ModifierKeys = @($VK_LSHIFT, $VK_RSHIFT, $VK_LCONTROL, $VK_RCONTROL, $VK_LMENU, $VK_RMENU, $VK_LWIN, $VK_RWIN)

# Keys that live on the extended part of the keyboard. Injecting them without the
# extended flag makes apps that read the scan code (consoles in particular) see a
# different key than the one we mean.
$ExtendedKeys = @($VK_RCONTROL, $VK_RMENU, $VK_LWIN, $VK_RWIN, $VK_INSERT)

function Test-KeyDown {
  param([byte]$Vk)
  return ([OpenFlow.Native.Keyboard]::GetAsyncKeyState([int]$Vk) -band 0x8000) -ne 0
}

function Send-Key {
  param(
    [Parameter(Mandatory = $true)][byte]$Vk,
    [switch]$KeyUp
  )

  # Always ship a real scan code. Apps that inspect the scan code in the WM_KEYDOWN
  # lParam (terminals, games, remote-desktop and VM clients) ignore VK-only events,
  # which is the most common reason a paste silently does nothing.
  $scan = [byte]([OpenFlow.Native.Keyboard]::MapVirtualKey([uint32]$Vk, 0) -band 0xFF)

  $flags = [uint32]0
  if ($ExtendedKeys -contains $Vk) {
    $flags = $flags -bor $KEYEVENTF_EXTENDEDKEY
  }
  if ($KeyUp) {
    $flags = $flags -bor $KEYEVENTF_KEYUP
  }

  [OpenFlow.Native.Keyboard]::keybd_event($Vk, $scan, $flags, [System.UIntPtr]::Zero)
}

function Wait-ForModifiersReleased {
  param([int]$TimeoutMs = 700)

  # Prefer waiting for the user to physically let go of the hotkey over forcing a
  # synthetic key-up. Forcing it desynchronises the modifier state that console
  # hosts track, which is what makes a later Shift+Enter arrive as a bare Enter.
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  while ($watch.ElapsedMilliseconds -lt $TimeoutMs) {
    $stillDown = $false
    foreach ($vk in $ModifierKeys) {
      if (Test-KeyDown -Vk $vk) {
        $stillDown = $true
        break
      }
    }

    if (-not $stillDown) {
      return $true
    }

    Start-Sleep -Milliseconds 20
  }

  return $false
}

function Clear-StuckModifiers {
  # Last resort for a modifier the user really is still holding (hands-free mode
  # keeps Ctrl+Win down). Only release the exact left/right key that is down: a
  # blanket key-up on the generic VK_SHIFT/VK_CONTROL codes clears state for keys
  # that were never pressed and leaves consoles believing Shift is up forever.
  foreach ($vk in $ModifierKeys) {
    if (Test-KeyDown -Vk $vk) {
      Send-Key -Vk $vk -KeyUp
    }
  }
}

function Get-ForegroundTarget {
  $info = [ordered]@{
    Handle = [System.IntPtr]::Zero
    Class = ''
    Process = ''
    ProcessId = 0
    Inaccessible = $false
  }

  try {
    $hwnd = [OpenFlow.Native.Keyboard]::GetForegroundWindow()
    if ($hwnd -eq [System.IntPtr]::Zero) {
      return $info
    }

    $info.Handle = $hwnd

    $builder = New-Object System.Text.StringBuilder 256
    if ([OpenFlow.Native.Keyboard]::GetClassName($hwnd, $builder, $builder.Capacity) -gt 0) {
      $info.Class = $builder.ToString()
    }

    $targetProcessId = [uint32]0
    [void][OpenFlow.Native.Keyboard]::GetWindowThreadProcessId($hwnd, [ref]$targetProcessId)
    $info.ProcessId = [int]$targetProcessId

    if ($targetProcessId -ne 0) {
      $process = Get-Process -Id ([int]$targetProcessId) -ErrorAction Stop
      $info.Process = $process.ProcessName
      try {
        # Reading the image path of a process running at a higher integrity level
        # fails with access denied. Synthetic input into such a window is dropped
        # by Windows (UIPI), so this doubles as an elevation probe.
        $null = $process.MainModule.FileName
      } catch {
        $info.Inaccessible = $true
      }
    }
  } catch {
    # Best effort: an unknown target just means we fall back to Ctrl+V.
  }

  return $info
}

function Test-IsElevated {
  try {
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object System.Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch {
    return $false
  }
}

function Resolve-PasteMethod {
  param($Target)

  if ($Method -ne 'auto') {
    return $Method
  }

  $class = [string]$Target.Class
  $process = [string]$Target.Process

  # mintty (Git Bash, MSYS2, Cygwin) and the PuTTY family do not bind Ctrl+V at
  # all by default; Shift+Insert is their paste shortcut. These are exactly the
  # terminals where the transcription appears to vanish.
  if ($class -eq 'mintty' -or $process -eq 'mintty') {
    return 'shift-insert'
  }
  if ($class -like 'PuTTY*' -or $class -eq 'ZOC' -or $process -in @('putty', 'kitty', 'plink', 'superputty')) {
    return 'shift-insert'
  }

  return 'ctrl-v'
}

function Send-PasteShortcut {
  param([string]$PasteMethod)

  switch ($PasteMethod) {
    'shift-insert' {
      Send-Key -Vk $VK_LSHIFT
      Start-Sleep -Milliseconds 8
      Send-Key -Vk $VK_INSERT
      Start-Sleep -Milliseconds 30
      Send-Key -Vk $VK_INSERT -KeyUp
      Send-Key -Vk $VK_LSHIFT -KeyUp
    }
    'ctrl-shift-v' {
      Send-Key -Vk $VK_LCONTROL
      Start-Sleep -Milliseconds 8
      Send-Key -Vk $VK_LSHIFT
      Start-Sleep -Milliseconds 8
      Send-Key -Vk $VK_V
      Start-Sleep -Milliseconds 30
      Send-Key -Vk $VK_V -KeyUp
      Send-Key -Vk $VK_LSHIFT -KeyUp
      Send-Key -Vk $VK_LCONTROL -KeyUp
    }
    default {
      Send-Key -Vk $VK_LCONTROL
      Start-Sleep -Milliseconds 8
      Send-Key -Vk $VK_V
      Start-Sleep -Milliseconds 30
      Send-Key -Vk $VK_V -KeyUp
      Send-Key -Vk $VK_LCONTROL -KeyUp
    }
  }
}

function Send-TextAsKeystrokes {
  param([Parameter(Mandatory = $true)][string]$Value)

  # Clipboard-free fallback: synthesise the characters themselves with
  # KEYEVENTF_UNICODE. This works in apps that refuse clipboard paste entirely
  # and needs SendInput, so the interop type is only compiled when it is used.
  if (-not ([System.Management.Automation.PSTypeName]'OpenFlow.Native.Typist').Type) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace OpenFlow.Native {
  [StructLayout(LayoutKind.Sequential)]
  public struct MOUSEINPUT {
    public int dx;
    public int dy;
    public uint mouseData;
    public uint dwFlags;
    public uint time;
    public IntPtr dwExtraInfo;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct KEYBDINPUT {
    public ushort wVk;
    public ushort wScan;
    public uint dwFlags;
    public uint time;
    public IntPtr dwExtraInfo;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct HARDWAREINPUT {
    public uint uMsg;
    public ushort wParamL;
    public ushort wParamH;
  }

  [StructLayout(LayoutKind.Explicit)]
  public struct INPUTUNION {
    [FieldOffset(0)] public MOUSEINPUT mi;
    [FieldOffset(0)] public KEYBDINPUT ki;
    [FieldOffset(0)] public HARDWAREINPUT hi;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct INPUT {
    public uint type;
    public INPUTUNION u;
  }

  public static class Typist {
    const uint INPUT_KEYBOARD = 1;
    const uint KEYEVENTF_KEYUP = 0x0002;
    const uint KEYEVENTF_UNICODE = 0x0004;

    [DllImport("user32.dll", SetLastError = true)]
    static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    public static uint Type(string text) {
      INPUT[] inputs = new INPUT[text.Length * 2];
      for (int i = 0; i < text.Length; i++) {
        inputs[i * 2].type = INPUT_KEYBOARD;
        inputs[i * 2].u.ki.wScan = text[i];
        inputs[i * 2].u.ki.dwFlags = KEYEVENTF_UNICODE;

        inputs[i * 2 + 1].type = INPUT_KEYBOARD;
        inputs[i * 2 + 1].u.ki.wScan = text[i];
        inputs[i * 2 + 1].u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
      }

      return SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
    }
  }
}
"@
  }

  # Chunked so a long transcription does not overflow the target's input queue.
  $chunkSize = 200
  for ($offset = 0; $offset -lt $Value.Length; $offset += $chunkSize) {
    $length = [Math]::Min($chunkSize, $Value.Length - $offset)
    $expectedInputCount = [uint32]($length * 2)
    $sentInputCount = [OpenFlow.Native.Typist]::Type($Value.Substring($offset, $length))
    if ($sentInputCount -ne $expectedInputCount) {
      $nativeError = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
      throw "Windows accepted $sentInputCount of $expectedInputCount keyboard events (error $nativeError)."
    }
    Start-Sleep -Milliseconds 5
  }
}

function Invoke-ClipboardAction {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Action,

    [Parameter(Mandatory = $true)]
    [string]$Operation
  )

  $lastError = $null
  for ($attempt = 0; $attempt -lt 6; $attempt++) {
    try {
      return & $Action
    } catch {
      $lastError = $_
      Start-Sleep -Milliseconds (40 + ($attempt * 30))
    }
  }

  throw "Failed to access the clipboard during '$Operation': $($lastError.Exception.Message)"
}

function Get-ClipboardSnapshot {
  # Best-effort capture of what the user currently has on the clipboard so it can
  # be put back once the temporary paste payload has been consumed. Text, files
  # and images cover the common cases; anything else is treated as empty.
  try {
    return Invoke-ClipboardAction -Operation 'snapshot' -Action {
      $captured = @{}
      if ([System.Windows.Forms.Clipboard]::ContainsText()) {
        $captured['Text'] = [System.Windows.Forms.Clipboard]::GetText([System.Windows.Forms.TextDataFormat]::UnicodeText)
      }
      if ([System.Windows.Forms.Clipboard]::ContainsFileDropList()) {
        $captured['Files'] = [System.Windows.Forms.Clipboard]::GetFileDropList()
      }
      if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
        $captured['Image'] = [System.Windows.Forms.Clipboard]::GetImage()
      }
      $captured
    }
  } catch {
    return @{}
  }
}

function Restore-ClipboardSnapshot {
  param($Snapshot)

  if (-not $Snapshot -or $Snapshot.Count -eq 0) {
    [System.Windows.Forms.Clipboard]::Clear()
    return
  }

  $dataObject = New-Object System.Windows.Forms.DataObject
  if ($Snapshot.ContainsKey('Text')) {
    $dataObject.SetText($Snapshot['Text'], [System.Windows.Forms.TextDataFormat]::UnicodeText)
  }
  if ($Snapshot.ContainsKey('Files')) {
    $dataObject.SetFileDropList($Snapshot['Files'])
  }
  if ($Snapshot.ContainsKey('Image')) {
    $dataObject.SetImage($Snapshot['Image'])
  }
  # The restored item must not show up as a fresh entry in Windows clipboard
  # history (the user's original copy is already there); mark it excluded the
  # same way the temporary paste payload is.
  $disabledFlag = [System.BitConverter]::GetBytes([uint32]0)
  $dataObject.SetData('ExcludeClipboardContentFromMonitorProcessing', $false, [byte[]](1))
  $dataObject.SetData('CanIncludeInClipboardHistory', $false, $disabledFlag)
  $dataObject.SetData('CanUploadToCloudClipboard', $false, $disabledFlag)
  [System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)
}

function Set-ClipboardTextForPaste {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $dataObject = New-Object System.Windows.Forms.DataObject
  $dataObject.SetText($Value, [System.Windows.Forms.TextDataFormat]::UnicodeText)
  # Prevent this temporary paste payload from being captured by Windows clipboard
  # history or cloud clipboard. It must be written in the same clipboard object as
  # the text for Windows to treat the whole item as excluded.
  $disabledFlag = [System.BitConverter]::GetBytes([uint32]0)
  $dataObject.SetData('ExcludeClipboardContentFromMonitorProcessing', $false, [byte[]](1))
  $dataObject.SetData('CanIncludeInClipboardHistory', $false, $disabledFlag)
  $dataObject.SetData('CanUploadToCloudClipboard', $false, $disabledFlag)
  [System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)
}

$target = Get-ForegroundTarget
$targetLabel = if ($target.Process) { "$($target.Process) [$($target.Class)]" } else { 'the active app' }

# Windows silently discards injected input aimed at a window owned by a process
# running at a higher integrity level. Detect that up front and say so, instead of
# looking like the paste worked while nothing appears.
if ($target.Inaccessible -and -not (Test-IsElevated)) {
  try {
    Invoke-ClipboardAction -Operation 'set-text' -Action {
      Set-ClipboardTextForPaste -Value $Text
    } | Out-Null
  } catch {
    # The clipboard hand-off is a convenience; the error below is the real result.
  }

  throw "$targetLabel runs with higher privileges, so Windows blocks OpenFlow from pasting into it. Run OpenFlow as administrator, or press Ctrl+V yourself (the text is on the clipboard)."
}

if ($Method -eq 'type') {
  # Explicit clipboard-free mode: never touch the clipboard at all.
  Wait-ForModifiersReleased | Out-Null
  Clear-StuckModifiers
  Start-Sleep -Milliseconds 20
  Send-TextAsKeystrokes -Value $Text
  [Console]::Out.WriteLine('__OPENFLOW_PASTE_OK__')
  [Console]::Out.Flush()
  exit 0
}

$pasteMethod = Resolve-PasteMethod -Target $target

# Remember what the user had on the clipboard so it can be restored after the paste.
$previousClipboard = Get-ClipboardSnapshot

# Place the transcription on the clipboard and confirm it actually landed before we
# send the keystroke. The temporary clipboard item is marked so Windows should not
# add it to clipboard history or sync it through cloud clipboard.
$clipboardReady = $false
for ($attempt = 0; $attempt -lt 6; $attempt++) {
  try {
    Invoke-ClipboardAction -Operation 'set-text' -Action {
      Set-ClipboardTextForPaste -Value $Text
    } | Out-Null
    Start-Sleep -Milliseconds 60

    $current = Invoke-ClipboardAction -Operation 'verify' -Action {
      if ([System.Windows.Forms.Clipboard]::ContainsText()) {
        [System.Windows.Forms.Clipboard]::GetText()
      } else {
        $null
      }
    }

    if ($current -eq $Text) {
      $clipboardReady = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds (40 + ($attempt * 30))
  }
}

if (-not $clipboardReady) {
  # Another app is holding the clipboard open. Typing the text is slower but does
  # not need the clipboard at all, so the transcription still lands.
  try {
    Wait-ForModifiersReleased | Out-Null
    Clear-StuckModifiers
    Start-Sleep -Milliseconds 20
    Send-TextAsKeystrokes -Value $Text
    [Console]::Out.WriteLine('__OPENFLOW_PASTE_OK__')
    [Console]::Out.Flush()
    exit 0
  } catch {
    throw "Clipboard was not ready for pasting and typing the text failed: $($_.Exception.Message)"
  }
}

try {
  # Let go of the hotkey modifiers before injecting, otherwise the target sees
  # Ctrl+Win+V (or Ctrl+Alt+V) instead of a plain paste and ignores it.
  Wait-ForModifiersReleased | Out-Null
  Clear-StuckModifiers
  Start-Sleep -Milliseconds 30

  Send-PasteShortcut -PasteMethod $pasteMethod
  [Console]::Out.WriteLine('__OPENFLOW_PASTE_OK__')
  [Console]::Out.Flush()
  # Give the target app time to read the clipboard before removing our temporary
  # text. Chromium/Electron targets and remote sessions read it asynchronously.
  Start-Sleep -Milliseconds ([Math]::Max(120, $RestoreDelayMs))
} finally {
  # Put the user's previous clipboard contents back, but only while the clipboard
  # still holds our temporary text — if the user copied something newer in the
  # meantime, leave it alone.
  try {
    Invoke-ClipboardAction -Operation 'restore-previous-clipboard' -Action {
      if ([System.Windows.Forms.Clipboard]::ContainsText() -and [System.Windows.Forms.Clipboard]::GetText() -eq $Text) {
        Restore-ClipboardSnapshot -Snapshot $previousClipboard
      }
    } | Out-Null
  } catch {
    try {
      Invoke-ClipboardAction -Operation 'restore-retry' -Action {
        if ([System.Windows.Forms.Clipboard]::ContainsText() -and [System.Windows.Forms.Clipboard]::GetText() -eq $Text) {
          Restore-ClipboardSnapshot -Snapshot $previousClipboard
        }
      } | Out-Null
    } catch {
      # Best effort: clipboard restore failures should not break the paste operation.
    }
  }
}
