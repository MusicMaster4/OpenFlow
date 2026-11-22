param(
  [string]$EncodedText,

  # Keep native interop compiled and receive arbitrarily long UTF-8 JSON over stdin.
  [switch]$Server,

  # How the text reaches the focused app. 'auto' inspects the foreground window
  # and picks the shortcut that app actually understands.
  [ValidateSet('auto', 'ctrl-v', 'shift-insert', 'ctrl-shift-v', 'type')]
  [string]$Method = 'auto',

  # Minimum time (from the shortcut) before restoring the user's previous
  # clipboard when the process that read the dictation is not the target app.
  [int]$RestoreDelayMs = 2000,

  # How long to wait for the target app to actually read the dictation from the
  # clipboard. Until it does, the previous clipboard is never put back.
  [int]$PasteConsumeTimeoutMs = 3000
)

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Inject the paste keystroke at a low level. keybd_event is far more reliable than
# SendKeys across applications (especially Chromium/Electron targets and apps that
# debounce the higher-level WM_* messages SendKeys relies on). Paste chords
# use checked SendInput batches; keybd_event is reserved for stuck modifiers.
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

  $mode = switch ($PasteMethod) {
    'shift-insert' { 1 }
    'ctrl-shift-v' { 2 }
    default { 0 }
  }
  # Submit the whole chord in one SendInput batch. Windows reports rejected input
  # instead of silently succeeding as keybd_event did.
  $expected = if ($mode -eq 2) { 6 } else { 4 }
  $sent = [OpenFlow.Native.Typist]::Paste($mode)
  if ($sent -ne $expected) {
    throw "Windows accepted $sent of $expected paste keyboard events. Check the target app's privileges."
  }
}

function Initialize-InputType {

  # Clipboard-free fallback: synthesise the characters themselves with
  # KEYEVENTF_UNICODE. Compile once at worker startup so both paste shortcuts and
  # the clipboard-free fallback are ready before the first request.
  if (-not ([System.Management.Automation.PSTypeName]'OpenFlow.Native.Typist').Type) {
    Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
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

  public static class PasteClipboard {
    [DllImport("user32.dll", SetLastError = true)] static extern bool OpenClipboard(IntPtr owner);
    [DllImport("user32.dll")] static extern bool CloseClipboard();
    [DllImport("user32.dll", SetLastError = true)] static extern bool EmptyClipboard();
    [DllImport("user32.dll", SetLastError = true)] static extern IntPtr SetClipboardData(uint format, IntPtr memory);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern uint RegisterClipboardFormat(string name);
    [DllImport("user32.dll")] public static extern IntPtr GetClipboardOwner();
    [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr GlobalAlloc(uint flags, UIntPtr bytes);
    [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr GlobalLock(IntPtr memory);
    [DllImport("kernel32.dll")] static extern bool GlobalUnlock(IntPtr memory);
    [DllImport("kernel32.dll")] static extern IntPtr GlobalFree(IntPtr memory);

    [DllImport("user32.dll")] static extern bool IsClipboardFormatAvailable(uint format);
    [DllImport("user32.dll", SetLastError = true)] static extern IntPtr GetClipboardData(uint format);

    public static string ReadText() {
      if (!OpenClipboard(IntPtr.Zero)) throw new System.ComponentModel.Win32Exception();
      try {
        if (!IsClipboardFormatAvailable(13)) return null;
        IntPtr memory = GetClipboardData(13);
        if (memory == IntPtr.Zero) throw new System.ComponentModel.Win32Exception();
        IntPtr address = GlobalLock(memory);
        if (address == IntPtr.Zero) throw new System.ComponentModel.Win32Exception();
        try { return Marshal.PtrToStringUni(address); }
        finally { GlobalUnlock(memory); }
      } finally { CloseClipboard(); }
    }

    internal static void SetBytes(uint format, byte[] bytes) {
      IntPtr memory = GlobalAlloc(2 /* GMEM_MOVEABLE */, (UIntPtr)bytes.Length);
      if (memory == IntPtr.Zero) throw new System.ComponentModel.Win32Exception();
      try {
        IntPtr address = GlobalLock(memory);
        if (address == IntPtr.Zero) throw new System.ComponentModel.Win32Exception();
        try { Marshal.Copy(bytes, 0, address, bytes.Length); }
        finally { GlobalUnlock(memory); }
        if (SetClipboardData(format, memory) == IntPtr.Zero) throw new System.ComponentModel.Win32Exception();
        memory = IntPtr.Zero; // Windows owns the handle after a successful transfer.
      } finally {
        if (memory != IntPtr.Zero) GlobalFree(memory);
      }
    }

    static void SetFlag(string name, uint value) {
      uint format = RegisterClipboardFormat(name);
      if (format == 0) throw new System.ComponentModel.Win32Exception();
      SetBytes(format, BitConverter.GetBytes(value));
    }

    internal static void SetFlags() {
      SetFlag("ExcludeClipboardContentFromMonitorProcessing", 1);
      SetFlag("CanIncludeInClipboardHistory", 0);
      SetFlag("CanUploadToCloudClipboard", 0);
    }

    public static void Write(IntPtr owner, string text) {
      if (!OpenClipboard(owner)) throw new System.ComponentModel.Win32Exception();
      try {
        if (!EmptyClipboard()) throw new System.ComponentModel.Win32Exception();
        SetFlags();
        SetBytes(13 /* CF_UNICODETEXT */, System.Text.Encoding.Unicode.GetBytes(text + "\0"));
      } finally { CloseClipboard(); }
    }
  }

  // Owns the dictation clipboard item with delayed rendering, so Windows asks
  // this worker for the text (WM_RENDERFORMAT) at the moment an app reads it.
  // Restoring the previous clipboard on a fixed timer let busy targets read the
  // restored content instead of the dictation. Clipboard monitors (WSLg/RDP
  // msrdc, the clipboard history service) read every new item regardless of the
  // exclusion flags; reads before the shortcut are declined so the first render
  // after it normally comes from the paste target itself.
  public sealed class PasteOwner : System.Windows.Forms.NativeWindow {
    const int WM_RENDERFORMAT = 0x0305;
    const int WM_RENDERALLFORMATS = 0x0306;
    const int WM_DESTROYCLIPBOARD = 0x0307;
    const uint CF_UNICODETEXT = 13;

    [DllImport("user32.dll", SetLastError = true)] static extern bool OpenClipboard(IntPtr owner);
    [DllImport("user32.dll")] static extern bool CloseClipboard();
    [DllImport("user32.dll", SetLastError = true)] static extern bool EmptyClipboard();
    [DllImport("user32.dll", SetLastError = true)] static extern IntPtr SetClipboardData(uint format, IntPtr memory);
    [DllImport("user32.dll")] static extern IntPtr GetClipboardOwner();
    [DllImport("user32.dll")] static extern IntPtr GetOpenClipboardWindow();
    [DllImport("user32.dll")] static extern bool IsClipboardFormatAvailable(uint format);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);

    string pending;
    volatile bool rendered;
    bool armed;
    uint targetProcessId;
    readonly System.Collections.Generic.HashSet<uint> monitors = new System.Collections.Generic.HashSet<uint>();

    public PasteOwner() { CreateHandle(new System.Windows.Forms.CreateParams()); }

    public bool Rendered { get { return rendered; } }

    // The render was requested by the process that owns the paste target window.
    public bool RenderedForTarget { get; private set; }

    public bool OwnsClipboard { get { return GetClipboardOwner() == Handle; } }

    public void Publish(string text, uint targetPid) {
      if (!OpenClipboard(Handle)) throw new System.ComponentModel.Win32Exception();
      try {
        if (!EmptyClipboard()) throw new System.ComponentModel.Win32Exception();
        PasteClipboard.SetFlags();
        pending = text;
        rendered = false;
        armed = false;
        RenderedForTarget = false;
        targetProcessId = targetPid;
        monitors.Clear();
        SetClipboardData(CF_UNICODETEXT, IntPtr.Zero); // NULL handle = render on demand
        if (!IsClipboardFormatAvailable(CF_UNICODETEXT)) {
          pending = null;
          throw new InvalidOperationException("Windows did not accept the clipboard text.");
        }
      } finally { CloseClipboard(); }
    }

    // Call right before the paste shortcut: from now on reads are served.
    public void Arm() { armed = true; }

    // True while the clipboard still offers exactly the text we published.
    public bool IsPublished() {
      return pending != null && !rendered && OwnsClipboard && IsClipboardFormatAvailable(CF_UNICODETEXT);
    }

    // Turn a still-unread delayed item into real data so nobody blocks on this
    // worker once it stops pumping messages.
    public void Materialize() {
      if (pending == null || rendered) return;
      if (!OpenClipboard(Handle)) throw new System.ComponentModel.Win32Exception();
      try {
        if (OwnsClipboard && !rendered) Render();
      } finally { CloseClipboard(); }
    }

    void Render() {
      PasteClipboard.SetBytes(CF_UNICODETEXT, System.Text.Encoding.Unicode.GetBytes(pending + "\0"));
      rendered = true;
    }

    static uint ReaderProcessId() {
      uint processId = 0;
      IntPtr window = GetOpenClipboardWindow();
      if (window != IntPtr.Zero) GetWindowThreadProcessId(window, out processId);
      return processId;
    }

    public void Pump(int milliseconds) {
      Stopwatch watch = Stopwatch.StartNew();
      do {
        System.Windows.Forms.Application.DoEvents();
        System.Threading.Thread.Sleep(2);
      } while (watch.ElapsedMilliseconds < milliseconds);
    }

    public bool WaitForRender(int timeoutMs) {
      Stopwatch watch = Stopwatch.StartNew();
      while (!rendered && pending != null && watch.ElapsedMilliseconds < timeoutMs) {
        System.Windows.Forms.Application.DoEvents();
        System.Threading.Thread.Sleep(2);
      }
      return rendered;
    }

    protected override void WndProc(ref System.Windows.Forms.Message m) {
      if (m.Msg == WM_RENDERFORMAT) {
        // The reader already holds the clipboard open: do not open it here.
        if ((uint)m.WParam.ToInt64() == CF_UNICODETEXT && pending != null && !rendered) {
          uint reader = ReaderProcessId();
          bool isTarget = reader != 0 && reader == targetProcessId;
          if (!armed) {
            // Nothing can be pasting yet: this is a monitor. Decline; the item
            // stays pending and the monitor retries later.
            if (reader != 0) monitors.Add(reader);
          } else if (isTarget || !monitors.Contains(reader)) {
            Render();
            RenderedForTarget = isTarget;
          }
        }
        m.Result = IntPtr.Zero;
        return;
      }
      if (m.Msg == WM_RENDERALLFORMATS) {
        try { Materialize(); } catch { }
        m.Result = IntPtr.Zero;
        return;
      }
      if (m.Msg == WM_DESTROYCLIPBOARD) {
        // Someone replaced the clipboard; our item is gone.
        pending = null;
      }
      base.WndProc(ref m);
    }
  }

  public static class Typist {
    const uint INPUT_KEYBOARD = 1;
    const uint KEYEVENTF_KEYUP = 0x0002;
    const uint KEYEVENTF_UNICODE = 0x0004;

    [DllImport("user32.dll", SetLastError = true)]
    static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [DllImport("user32.dll")]
    static extern uint MapVirtualKey(uint code, uint mapType);

    static INPUT Key(ushort vk, bool up) {
      INPUT input = new INPUT();
      input.type = INPUT_KEYBOARD;
      input.u.ki.wVk = vk;
      input.u.ki.wScan = (ushort)MapVirtualKey(vk, 0);
      input.u.ki.dwFlags = (up ? KEYEVENTF_KEYUP : 0) | (vk == 0x2D ? 1u : 0u);
      return input;
    }

    public static uint Paste(int mode) {
      ushort modifier = (ushort)(mode == 1 ? 0xA0 : 0xA2);
      ushort key = (ushort)(mode == 1 ? 0x2D : 0x56);
      INPUT[] inputs = mode == 2
        ? new INPUT[] { Key(modifier, false), Key(0xA0, false), Key(key, false),
            Key(key, true), Key(0xA0, true), Key(modifier, true) }
        : new INPUT[] { Key(modifier, false), Key(key, false), Key(key, true), Key(modifier, true) };
      return SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
    }

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
"@ -ReferencedAssemblies ([System.Windows.Forms.Form].Assembly.Location)
  }

}

function Send-TextAsKeystrokes {
  param([Parameter(Mandatory = $true)][string]$Value)

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
      $savedText = [OpenFlow.Native.PasteClipboard]::ReadText()
      if ($null -ne $savedText) { $captured['Text'] = $savedText }
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

  if ($Snapshot.Count -eq 1 -and $Snapshot.ContainsKey('Text') -and $Snapshot['Text']) {
    Set-ClipboardTextForPaste -Value $Snapshot['Text']
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

  # A real window handle is required to own the clipboard after EmptyClipboard.
  # Reuse this invisible control on the worker's STA thread.
  if (-not $script:pasteClipboardOwner) {
    $script:pasteClipboardOwner = New-Object System.Windows.Forms.Control
  }
  [OpenFlow.Native.PasteClipboard]::Write($script:pasteClipboardOwner.Handle, $Value)
}

function Publish-ClipboardTextForPaste {
  param($Owner, [string]$Value, [int]$TargetProcessId)
  $Owner.Publish($Value, [uint32][Math]::Max(0, $TargetProcessId))
}

function Invoke-TextInsertion {
  param(
    [string]$Text,
    [ValidateSet('auto', 'ctrl-v', 'shift-insert', 'ctrl-shift-v', 'type')]
    [string]$Method = 'auto'
  )
  if ([string]::IsNullOrEmpty($Text)) { return }

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
    return
  }

  $pasteMethod = Resolve-PasteMethod -Target $target

  Wait-ForModifiersReleased | Out-Null
  Clear-StuckModifiers

  $previousClipboard = Get-ClipboardSnapshot
  if (-not $script:pasteOwner) {
    $script:pasteOwner = New-Object OpenFlow.Native.PasteOwner
  }
  $owner = $script:pasteOwner
  $dispatched = $false
  $consumed = $false
  try {
    # Publish the text with delayed rendering so we learn exactly when the target
    # reads it. Retry only preparation: repeating a shortcut can paste twice.
    Invoke-ClipboardAction -Operation 'prepare paste' -Action {
      Publish-ClipboardTextForPaste -Owner $owner -Value $Text -TargetProcessId $target.ProcessId
    }
    # Let clipboard monitors react to WM_CLIPBOARDUPDATE (their reads are declined).
    $owner.Pump(40)
    if (-not $owner.IsPublished()) {
      throw 'Clipboard text changed before paste. Please retry.'
    }

    $owner.Arm()
    $dispatchWatch = [System.Diagnostics.Stopwatch]::StartNew()
    Send-PasteShortcut -PasteMethod $pasteMethod
    $dispatched = $true

    # Never restore before the target has read the dictation: a busy target that
    # reads late would otherwise paste the user's previous clipboard instead.
    $consumed = $owner.WaitForRender($PasteConsumeTimeoutMs)
    if ($consumed) {
      # The reader holds the clipboard open while copying; give it a moment. When
      # the reader could not be identified as the target app, keep the text for
      # a longer safety window in case the target has yet to read it.
      $hold = 150
      if (-not $owner.RenderedForTarget) {
        $hold = [Math]::Max($hold, $RestoreDelayMs - [int]$dispatchWatch.ElapsedMilliseconds)
      }
      $owner.Pump($hold)
    }
  } finally {
    try {
      if ($dispatched -and -not $consumed) {
        # The target never read the dictation. Keep it on the clipboard as real
        # data so nothing stale gets pasted and the user can paste it manually.
        Invoke-ClipboardAction -Operation 'keep-dictation' -Action { $owner.Materialize() } | Out-Null
      } else {
        Invoke-ClipboardAction -Operation 'restore-previous-clipboard' -Action {
          if ($owner.OwnsClipboard) {
            Restore-ClipboardSnapshot -Snapshot $previousClipboard
          }
        } | Out-Null
      }
    } catch {
      # Clipboard restoration is best effort after dispatch, but never leave an
      # unrendered item behind once this worker stops pumping messages.
      try { Invoke-ClipboardAction -Operation 'keep-dictation' -Action { $owner.Materialize() } | Out-Null } catch { }
    }
    if ($previousClipboard -and $previousClipboard.ContainsKey('Image')) {
      $previousClipboard['Image'].Dispose()
    }
  }
}

# Warm up both interop types once, before announcing readiness.
Initialize-InputType

if ($Server) {
  [Console]::Out.WriteLine('{"event":"ready"}')
  [Console]::Out.Flush()
  while ($null -ne ($line = [Console]::In.ReadLine())) {
    $request = $null
    try {
      $request = ConvertFrom-Json -InputObject $line
      Invoke-TextInsertion -Text ([string]$request.text) -Method ([string]$request.method)
      # Only release the JS queue after the clipboard has been restored. This
      # prevents a previous paste from clearing the next request's payload.
      $response = @{ id = $request.id }
    } catch {
      $response = @{ id = $request.id; error = $_.Exception.Message }
    }
    [Console]::Out.WriteLine(($response | ConvertTo-Json -Compress))
    [Console]::Out.Flush()
  }
} else {
  try {
    $text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($EncodedText))
  } catch {
    throw 'Failed to decode UTF-8 text for sending.'
  }
  Invoke-TextInsertion -Text $text -Method $Method
  [Console]::Out.WriteLine('__OPENFLOW_PASTE_OK__')
}
