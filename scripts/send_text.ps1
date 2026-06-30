param(
  [Parameter(Mandatory = $true)]
  [string]$EncodedText
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

# Inject the paste keystroke at a low level. keybd_event is far more reliable than
# SendKeys across applications (especially Chromium/Electron targets and apps that
# debounce the higher-level WM_* messages SendKeys relies on).
if (-not ([System.Management.Automation.PSTypeName]'OpenFlow.Native.Keyboard').Type) {
  Add-Type -Namespace 'OpenFlow.Native' -Name 'Keyboard' -MemberDefinition @"
    [System.Runtime.InteropServices.DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, System.UIntPtr dwExtraInfo);

    [System.Runtime.InteropServices.DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
"@
}

$VK_CONTROL = [byte]0x11
$VK_MENU = [byte]0x12
$VK_SHIFT = [byte]0x10
$VK_LWIN = [byte]0x5B
$VK_RWIN = [byte]0x5C
$VK_V = [byte]0x56
$KEYEVENTF_KEYUP = [uint32]0x0002

function Release-Modifiers {
  # Lift any modifier the user may still be holding (e.g. the Ctrl+Alt+V hotkey) so
  # that the synthetic Ctrl+V is not contaminated into Ctrl+Alt+V or similar.
  foreach ($vk in @($VK_CONTROL, $VK_MENU, $VK_SHIFT, $VK_LWIN, $VK_RWIN)) {
    [OpenFlow.Native.Keyboard]::keybd_event($vk, 0, $KEYEVENTF_KEYUP, [System.UIntPtr]::Zero)
  }
}

function Send-Paste {
  Release-Modifiers
  Start-Sleep -Milliseconds 15
  [OpenFlow.Native.Keyboard]::keybd_event($VK_CONTROL, 0, 0, [System.UIntPtr]::Zero)
  Start-Sleep -Milliseconds 5
  [OpenFlow.Native.Keyboard]::keybd_event($VK_V, 0, 0, [System.UIntPtr]::Zero)
  Start-Sleep -Milliseconds 25
  [OpenFlow.Native.Keyboard]::keybd_event($VK_V, 0, $KEYEVENTF_KEYUP, [System.UIntPtr]::Zero)
  [OpenFlow.Native.Keyboard]::keybd_event($VK_CONTROL, 0, $KEYEVENTF_KEYUP, [System.UIntPtr]::Zero)
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
  throw "Clipboard was not ready for pasting."
}

try {
  Start-Sleep -Milliseconds 30
  Send-Paste
  [Console]::Out.WriteLine('__OPENFLOW_PASTE_OK__')
  [Console]::Out.Flush()
  # Give the target app time to read the clipboard before removing our temporary text.
  Start-Sleep -Milliseconds 180
} finally {
  try {
    Invoke-ClipboardAction -Operation 'clear-injected-text' -Action {
      if ([System.Windows.Forms.Clipboard]::ContainsText() -and [System.Windows.Forms.Clipboard]::GetText() -eq $Text) {
        [System.Windows.Forms.Clipboard]::Clear()
      }
    } | Out-Null
  } catch {
    try {
      Invoke-ClipboardAction -Operation 'clear' -Action {
        if ([System.Windows.Forms.Clipboard]::ContainsText() -and [System.Windows.Forms.Clipboard]::GetText() -eq $Text) {
          [System.Windows.Forms.Clipboard]::Clear()
        }
      } | Out-Null
    } catch {
      # Best effort: clipboard cleanup failures should not break the paste operation.
    }
  }
}
