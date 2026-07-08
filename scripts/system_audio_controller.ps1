param(
    [switch]$RecoverAudio
)

$ErrorActionPreference = 'Stop'

$coreAudioType = @"
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace OpenFlow.Audio
{
    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDeviceEnumerator
    {
        int NotImpl1();
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
        int NotImpl2();
        int NotImpl3();
        int NotImpl4();
        int NotImpl5();
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDevice
    {
        int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object interfacePointer);
    }

    [Guid("BFA971F1-4D5E-40BB-935E-967039BFBEE4")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionManager2
    {
        int GetAudioSessionControl(ref Guid audioSessionGuid, uint streamFlags, out IAudioSessionControl sessionControl);
        int GetSimpleAudioVolume(ref Guid audioSessionGuid, uint streamFlags, out ISimpleAudioVolume audioVolume);
        int GetSessionEnumerator(out IAudioSessionEnumerator sessionEnum);
        int RegisterSessionNotification(IntPtr sessionNotification);
        int UnregisterSessionNotification(IntPtr sessionNotification);
        int RegisterDuckNotification([MarshalAs(UnmanagedType.LPWStr)] string sessionId, IntPtr duckNotification);
        int UnregisterDuckNotification(IntPtr duckNotification);
    }

    [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionEnumerator
    {
        int GetCount(out int sessionCount);
        int GetSession(int sessionIndex, out IAudioSessionControl sessionControl);
    }

    [Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionControl
    {
        int GetState(out int state);
        int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string displayName);
        int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string displayName, ref Guid eventContext);
        int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string iconPath);
        int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string iconPath, ref Guid eventContext);
        int GetGroupingParam(out Guid groupingId);
        int SetGroupingParam(ref Guid groupingId, ref Guid eventContext);
        int RegisterAudioSessionNotification(IntPtr client);
        int UnregisterAudioSessionNotification(IntPtr client);
    }

    [Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionControl2
    {
        int GetState(out int state);
        int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string displayName);
        int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string displayName, ref Guid eventContext);
        int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string iconPath);
        int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string iconPath, ref Guid eventContext);
        int GetGroupingParam(out Guid groupingId);
        int SetGroupingParam(ref Guid groupingId, ref Guid eventContext);
        int RegisterAudioSessionNotification(IntPtr client);
        int UnregisterAudioSessionNotification(IntPtr client);
        int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string sessionIdentifier);
        int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string sessionInstanceIdentifier);
        int GetProcessId(out uint processId);
        int IsSystemSoundsSession();
        int SetDuckingPreference([MarshalAs(UnmanagedType.Bool)] bool optOut);
    }

    [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface ISimpleAudioVolume
    {
        int SetMasterVolume(float level, ref Guid eventContext);
        int GetMasterVolume(out float level);
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool isMuted, ref Guid eventContext);
        int GetMute(out bool isMuted);
    }

    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioEndpointVolume
    {
        int RegisterControlChangeNotify(IntPtr notify);
        int UnregisterControlChangeNotify(IntPtr notify);
        int GetChannelCount(out uint channelCount);
        int SetMasterVolumeLevel(float levelDb, ref Guid eventContext);
        int SetMasterVolumeLevelScalar(float level, ref Guid eventContext);
        int GetMasterVolumeLevel(out float levelDb);
        int GetMasterVolumeLevelScalar(out float level);
        int SetChannelVolumeLevel(uint channelNumber, float levelDb, ref Guid eventContext);
        int SetChannelVolumeLevelScalar(uint channelNumber, float level, ref Guid eventContext);
        int GetChannelVolumeLevel(uint channelNumber, out float levelDb);
        int GetChannelVolumeLevelScalar(uint channelNumber, out float level);
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool isMuted, ref Guid eventContext);
        int GetMute(out bool isMuted);
        int GetVolumeStepInfo(out uint step, out uint stepCount);
        int VolumeStepUp(ref Guid eventContext);
        int VolumeStepDown(ref Guid eventContext);
        int QueryHardwareSupport(out uint hardwareSupportMask);
        int GetVolumeRange(out float volumeMindB, out float volumeMaxdB, out float volumeIncrementdB);
    }

    [ComImport]
    [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    public class MMDeviceEnumeratorComObject
    {
    }

    public class AudioSessionSnapshot
    {
        public string SessionId { get; set; }
        public string InstanceId { get; set; }
        public int ProcessId { get; set; }
        public string ProcessName { get; set; }
        public float Volume { get; set; }
        public bool Muted { get; set; }
    }

    public static class SessionVolumeController
    {
        private const int ClsCtxAll = 23;

        private static IMMDevice GetDefaultDevice()
        {
            IMMDeviceEnumerator enumerator = null;
            IMMDevice device = null;

            try
            {
                enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
                Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
                return device;
            }
            finally
            {
                ReleaseCom(enumerator);
            }
        }

        private static IAudioSessionManager2 GetSessionManager(IMMDevice device)
        {
            object manager;
            var iid = typeof(IAudioSessionManager2).GUID;
            Marshal.ThrowExceptionForHR(device.Activate(ref iid, ClsCtxAll, IntPtr.Zero, out manager));
            return (IAudioSessionManager2)manager;
        }

        private static string TryGetProcessName(int processId)
        {
            if (processId <= 0)
            {
                return null;
            }

            try
            {
                using (var process = Process.GetProcessById(processId))
                {
                    return process.ProcessName;
                }
            }
            catch
            {
                return null;
            }
        }

        private static void AddSnapshotByKey(
            Dictionary<string, List<AudioSessionSnapshot>> map,
            string key,
            AudioSessionSnapshot snapshot)
        {
            if (string.IsNullOrEmpty(key) || snapshot == null)
            {
                return;
            }

            List<AudioSessionSnapshot> list;
            if (!map.TryGetValue(key, out list))
            {
                list = new List<AudioSessionSnapshot>();
                map[key] = list;
            }

            list.Add(snapshot);
        }

        private static AudioSessionSnapshot FindUnrestoredSnapshotByKey(
            Dictionary<string, List<AudioSessionSnapshot>> map,
            string key,
            HashSet<AudioSessionSnapshot> restored)
        {
            if (string.IsNullOrEmpty(key))
            {
                return null;
            }

            List<AudioSessionSnapshot> snapshots;
            if (!map.TryGetValue(key, out snapshots))
            {
                return null;
            }

            foreach (var snapshot in snapshots)
            {
                if (restored.Contains(snapshot))
                {
                    continue;
                }

                return snapshot;
            }

            return null;
        }

        private static AudioSessionSnapshot FindUnrestoredSnapshotByProcessId(
            Dictionary<int, List<AudioSessionSnapshot>> map,
            int processId,
            string processName,
            HashSet<AudioSessionSnapshot> restored)
        {
            if (processId <= 0)
            {
                return null;
            }

            List<AudioSessionSnapshot> snapshots;
            if (!map.TryGetValue(processId, out snapshots))
            {
                return null;
            }

            foreach (var snapshot in snapshots)
            {
                if (restored.Contains(snapshot))
                {
                    continue;
                }

                if (!string.IsNullOrEmpty(snapshot.ProcessName) &&
                    !string.IsNullOrEmpty(processName) &&
                    !string.Equals(snapshot.ProcessName, processName, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!restored.Contains(snapshot))
                {
                    return snapshot;
                }
            }

            return null;
        }

        private static AudioSessionSnapshot FindRestoreSnapshot(
            string instanceId,
            string sessionId,
            int processId,
            string processName,
            Dictionary<string, List<AudioSessionSnapshot>> byInstanceId,
            Dictionary<string, List<AudioSessionSnapshot>> bySessionId,
            Dictionary<int, List<AudioSessionSnapshot>> byProcessId,
            HashSet<AudioSessionSnapshot> restored)
        {
            var snapshot = FindUnrestoredSnapshotByKey(byInstanceId, instanceId, restored);
            if (snapshot != null)
            {
                return snapshot;
            }

            snapshot = FindUnrestoredSnapshotByKey(bySessionId, sessionId, restored);
            if (snapshot != null)
            {
                return snapshot;
            }

            return FindUnrestoredSnapshotByProcessId(byProcessId, processId, processName, restored);
        }

        // Silence every audio session except the excluded process ids by MUTING them.
        // Muting (instead of forcing the volume to 0) is fully reversible and never loses
        // the original volume level, so an app can never get stuck at a low volume even if
        // its audio session expires or changes identity before we restore it.
        public static List<AudioSessionSnapshot> DuckExcept(int[] excludedProcessIds, float duckVolume)
        {
            var excluded = new HashSet<int>(excludedProcessIds ?? new int[0]);
            var snapshots = new List<AudioSessionSnapshot>();
            IMMDevice device = null;
            IAudioSessionManager2 manager = null;
            IAudioSessionEnumerator enumerator = null;

            try
            {
                device = GetDefaultDevice();
                manager = GetSessionManager(device);
                Marshal.ThrowExceptionForHR(manager.GetSessionEnumerator(out enumerator));

                int count;
                Marshal.ThrowExceptionForHR(enumerator.GetCount(out count));

                for (var index = 0; index < count; index++)
                {
                    IAudioSessionControl control = null;
                    IAudioSessionControl2 control2 = null;
                    ISimpleAudioVolume volume = null;

                    try
                    {
                        Marshal.ThrowExceptionForHR(enumerator.GetSession(index, out control));
                        control2 = (IAudioSessionControl2)control;
                        volume = (ISimpleAudioVolume)control;

                        uint processIdRaw;
                        Marshal.ThrowExceptionForHR(control2.GetProcessId(out processIdRaw));
                        var processId = unchecked((int)processIdRaw);
                        if (excluded.Contains(processId))
                        {
                            continue;
                        }

                        bool originalMuted;
                        Marshal.ThrowExceptionForHR(volume.GetMute(out originalMuted));

                        // Leave sessions the user already muted untouched: we neither record
                        // nor unmute them later, so we never fight the user's own choice.
                        if (originalMuted)
                        {
                            continue;
                        }

                        string sessionId = null;
                        try
                        {
                            Marshal.ThrowExceptionForHR(control2.GetSessionIdentifier(out sessionId));
                        }
                        catch
                        {
                            sessionId = null;
                        }

                        string instanceId = null;
                        try
                        {
                            Marshal.ThrowExceptionForHR(control2.GetSessionInstanceIdentifier(out instanceId));
                        }
                        catch
                        {
                            instanceId = null;
                        }
                        if (string.IsNullOrEmpty(instanceId))
                        {
                            instanceId = processId.ToString() + ":" + index.ToString();
                        }

                        float originalVolume;
                        Marshal.ThrowExceptionForHR(volume.GetMasterVolume(out originalVolume));

                        snapshots.Add(new AudioSessionSnapshot
                        {
                            SessionId = sessionId,
                            InstanceId = instanceId,
                            ProcessId = processId,
                            ProcessName = TryGetProcessName(processId),
                            Volume = originalVolume,
                            Muted = false,
                        });

                        var context = Guid.Empty;
                        Marshal.ThrowExceptionForHR(volume.SetMute(true, ref context));
                    }
                    catch
                    {
                        // Audio sessions can disappear while we enumerate them. Keep the
                        // snapshots we already captured so one bad session cannot strand
                        // earlier sessions in a muted state.
                    }
                    finally
                    {
                        ReleaseCom(volume);
                        ReleaseCom(control2);
                        ReleaseCom(control);
                    }
                }

                return snapshots;
            }
            finally
            {
                ReleaseCom(enumerator);
                ReleaseCom(manager);
                ReleaseCom(device);
            }
        }

        public static void Restore(List<AudioSessionSnapshot> snapshots)
        {
            RestoreAndReturnPending(snapshots);
        }

        public static List<AudioSessionSnapshot> RestoreAndReturnPending(List<AudioSessionSnapshot> snapshots)
        {
            if (snapshots == null || snapshots.Count == 0)
            {
                return new List<AudioSessionSnapshot>();
            }

            var snapshotByInstanceId = new Dictionary<string, List<AudioSessionSnapshot>>(StringComparer.OrdinalIgnoreCase);
            var snapshotBySessionId = new Dictionary<string, List<AudioSessionSnapshot>>(StringComparer.OrdinalIgnoreCase);
            // Also index by process id so that a session which expired and was recreated with a
            // new instance identifier (very common once an app goes silent) is still restored.
            var snapshotByPid = new Dictionary<int, List<AudioSessionSnapshot>>();
            foreach (var snapshot in snapshots)
            {
                if (snapshot == null)
                {
                    continue;
                }

                AddSnapshotByKey(snapshotByInstanceId, snapshot.InstanceId, snapshot);
                AddSnapshotByKey(snapshotBySessionId, snapshot.SessionId, snapshot);

                if (snapshot.ProcessId > 0)
                {
                    List<AudioSessionSnapshot> byPid;
                    if (!snapshotByPid.TryGetValue(snapshot.ProcessId, out byPid))
                    {
                        byPid = new List<AudioSessionSnapshot>();
                        snapshotByPid[snapshot.ProcessId] = byPid;
                    }
                    byPid.Add(snapshot);
                }
            }

            var restored = new HashSet<AudioSessionSnapshot>();
            IMMDevice device = null;
            IAudioSessionManager2 manager = null;
            IAudioSessionEnumerator enumerator = null;

            try
            {
                device = GetDefaultDevice();
                manager = GetSessionManager(device);
                Marshal.ThrowExceptionForHR(manager.GetSessionEnumerator(out enumerator));

                int count;
                Marshal.ThrowExceptionForHR(enumerator.GetCount(out count));

                for (var index = 0; index < count; index++)
                {
                    IAudioSessionControl control = null;
                    IAudioSessionControl2 control2 = null;
                    ISimpleAudioVolume volume = null;

                    try
                    {
                        Marshal.ThrowExceptionForHR(enumerator.GetSession(index, out control));
                        control2 = (IAudioSessionControl2)control;
                        volume = (ISimpleAudioVolume)control;

                        string instanceId = null;
                        try
                        {
                            Marshal.ThrowExceptionForHR(control2.GetSessionInstanceIdentifier(out instanceId));
                        }
                        catch
                        {
                            instanceId = null;
                        }

                        string sessionId = null;
                        try
                        {
                            Marshal.ThrowExceptionForHR(control2.GetSessionIdentifier(out sessionId));
                        }
                        catch
                        {
                            sessionId = null;
                        }

                        var processId = 0;
                        try
                        {
                            uint processIdRaw;
                            Marshal.ThrowExceptionForHR(control2.GetProcessId(out processIdRaw));
                            processId = unchecked((int)processIdRaw);
                        }
                        catch
                        {
                            processId = 0;
                        }
                        var processName = TryGetProcessName(processId);

                        var snapshot = FindRestoreSnapshot(
                            instanceId,
                            sessionId,
                            processId,
                            processName,
                            snapshotByInstanceId,
                            snapshotBySessionId,
                            snapshotByPid,
                            restored);
                        if (snapshot == null)
                        {
                            continue;
                        }

                        var context = Guid.Empty;
                        // Restore the recorded volume (covers stale snapshots saved by older
                        // versions that lowered the volume) and always lift our mute.
                        Marshal.ThrowExceptionForHR(volume.SetMasterVolume(snapshot.Volume, ref context));
                        Marshal.ThrowExceptionForHR(volume.SetMute(snapshot.Muted, ref context));
                        restored.Add(snapshot);
                    }
                    catch
                    {
                        // Keep this snapshot pending and continue with the remaining sessions.
                    }
                    finally
                    {
                        ReleaseCom(volume);
                        ReleaseCom(control2);
                        ReleaseCom(control);
                    }
                }
            }
            finally
            {
                ReleaseCom(enumerator);
                ReleaseCom(manager);
                ReleaseCom(device);
            }

            var pending = new List<AudioSessionSnapshot>();
            foreach (var snapshot in snapshots)
            {
                if (snapshot != null && !restored.Contains(snapshot))
                {
                    pending.Add(snapshot);
                }
            }

            return pending;
        }

        public static int RecoverSilentSessions(float restoreVolume)
        {
            var recovered = 0;
            IMMDevice device = null;
            IAudioSessionManager2 manager = null;
            IAudioSessionEnumerator enumerator = null;

            try
            {
                device = GetDefaultDevice();
                manager = GetSessionManager(device);
                Marshal.ThrowExceptionForHR(manager.GetSessionEnumerator(out enumerator));

                int count;
                Marshal.ThrowExceptionForHR(enumerator.GetCount(out count));

                for (var index = 0; index < count; index++)
                {
                    IAudioSessionControl control = null;
                    ISimpleAudioVolume volume = null;

                    try
                    {
                        Marshal.ThrowExceptionForHR(enumerator.GetSession(index, out control));
                        volume = (ISimpleAudioVolume)control;

                        float currentVolume;
                        bool currentMuted;
                        Marshal.ThrowExceptionForHR(volume.GetMasterVolume(out currentVolume));
                        Marshal.ThrowExceptionForHR(volume.GetMute(out currentMuted));

                        if (currentVolume > 0.0001f && !currentMuted)
                        {
                            continue;
                        }

                        var context = Guid.Empty;
                        if (currentVolume <= 0.0001f)
                        {
                            Marshal.ThrowExceptionForHR(volume.SetMasterVolume(restoreVolume, ref context));
                        }
                        Marshal.ThrowExceptionForHR(volume.SetMute(false, ref context));
                        recovered++;
                    }
                    finally
                    {
                        ReleaseCom(volume);
                        ReleaseCom(control);
                    }
                }
            }
            finally
            {
                ReleaseCom(enumerator);
                ReleaseCom(manager);
                ReleaseCom(device);
            }

            return recovered;
        }

        public static void EnsureDefaultEndpointAudible(float minimumVolume)
        {
            IMMDevice device = null;
            IAudioEndpointVolume endpointVolume = null;

            try
            {
                device = GetDefaultDevice();
                object endpointObject;
                var iid = typeof(IAudioEndpointVolume).GUID;
                Marshal.ThrowExceptionForHR(device.Activate(ref iid, ClsCtxAll, IntPtr.Zero, out endpointObject));
                endpointVolume = (IAudioEndpointVolume)endpointObject;

                float currentVolume;
                Marshal.ThrowExceptionForHR(endpointVolume.GetMasterVolumeLevelScalar(out currentVolume));
                var context = Guid.Empty;
                Marshal.ThrowExceptionForHR(endpointVolume.SetMute(false, ref context));
                if (currentVolume <= 0.0001f)
                {
                    Marshal.ThrowExceptionForHR(endpointVolume.SetMasterVolumeLevelScalar(minimumVolume, ref context));
                }
            }
            finally
            {
                ReleaseCom(endpointVolume);
                ReleaseCom(device);
            }
        }

        private static void ReleaseCom(object value)
        {
            if (value != null && Marshal.IsComObject(value))
            {
                Marshal.ReleaseComObject(value);
            }
        }
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'OpenFlow.Audio.SessionVolumeController').Type) {
    Add-Type -TypeDefinition $coreAudioType -Language CSharp
}

$snapshotStatePath = Join-Path ([System.IO.Path]::GetTempPath()) 'OpenFlow.audio-duck-state.json'

$state = @{
    CaptureActive = $false
    Running = $true
    ExcludedPids = @()
    DuckVolume = 0.0
    Snapshots = New-Object System.Collections.Generic.List[OpenFlow.Audio.AudioSessionSnapshot]
    PendingSnapshots = New-Object System.Collections.Generic.List[OpenFlow.Audio.AudioSessionSnapshot]
}

function New-SnapshotList {
    return New-Object System.Collections.Generic.List[OpenFlow.Audio.AudioSessionSnapshot]
}

function Add-SnapshotIfMissing {
    param(
        [System.Collections.Generic.List[OpenFlow.Audio.AudioSessionSnapshot]]$Target,
        [OpenFlow.Audio.AudioSessionSnapshot]$Snapshot
    )

    if ($null -eq $Target -or $null -eq $Snapshot) {
        return
    }

    $snapshotKey = if (-not [string]::IsNullOrEmpty($Snapshot.InstanceId)) {
        "instance:$($Snapshot.InstanceId)"
    } elseif (-not [string]::IsNullOrEmpty($Snapshot.SessionId)) {
        "session:$($Snapshot.SessionId)"
    } elseif (-not [string]::IsNullOrEmpty($Snapshot.ProcessName)) {
        "process:$($Snapshot.ProcessName)"
    } elseif ($Snapshot.ProcessId -gt 0) {
        "pid:$($Snapshot.ProcessId)"
    } else {
        ""
    }

    foreach ($existing in $Target) {
        $existingKey = if (-not [string]::IsNullOrEmpty($existing.InstanceId)) {
            "instance:$($existing.InstanceId)"
        } elseif (-not [string]::IsNullOrEmpty($existing.SessionId)) {
            "session:$($existing.SessionId)"
        } elseif (-not [string]::IsNullOrEmpty($existing.ProcessName)) {
            "process:$($existing.ProcessName)"
        } elseif ($existing.ProcessId -gt 0) {
            "pid:$($existing.ProcessId)"
        } else {
            ""
        }

        if ($snapshotKey -ne "" -and $existingKey -eq $snapshotKey) {
            return
        }
    }

    [void]$Target.Add($Snapshot)
}

function ConvertTo-SnapshotList {
    param($Snapshots)

    $typedSnapshots = New-SnapshotList
    foreach ($snapshot in @($Snapshots)) {
        if ($null -ne $snapshot) {
            Add-SnapshotIfMissing -Target $typedSnapshots -Snapshot $snapshot
        }
    }

    return ,$typedSnapshots
}

function Get-CombinedSnapshotState {
    $combined = New-SnapshotList
    foreach ($snapshot in @($state.PendingSnapshots)) {
        Add-SnapshotIfMissing -Target $combined -Snapshot $snapshot
    }
    foreach ($snapshot in @($state.Snapshots)) {
        Add-SnapshotIfMissing -Target $combined -Snapshot $snapshot
    }

    return ,$combined
}

function Emit-Event {
    param(
        [string]$Type,
        [hashtable]$Payload = @{}
    )

    [Console]::Out.WriteLine((@{
        type = $Type
        payload = $Payload
    } | ConvertTo-Json -Compress))
    [Console]::Out.Flush()
}

function Save-SnapshotState {
    param(
        [System.Collections.Generic.List[OpenFlow.Audio.AudioSessionSnapshot]]$Snapshots
    )

    if ($null -eq $Snapshots -or $Snapshots.Count -eq 0) {
        Clear-SnapshotState
        return
    }

    $payload = @($Snapshots | ForEach-Object {
        @{
            SessionId = $_.SessionId
            InstanceId = $_.InstanceId
            ProcessId = $_.ProcessId
            ProcessName = $_.ProcessName
            Volume = $_.Volume
            Muted = $_.Muted
        }
    })

    Set-Content -Path $snapshotStatePath -Value ($payload | ConvertTo-Json -Compress) -Encoding UTF8
}

function Load-SnapshotState {
    if (-not (Test-Path $snapshotStatePath)) {
        return @()
    }

    $raw = Get-Content -Path $snapshotStatePath -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return @()
    }

    $converted = ConvertFrom-Json -InputObject $raw
    $items = @($converted)
    return @($items | ForEach-Object {
        try {
            $snapshot = New-Object OpenFlow.Audio.AudioSessionSnapshot
            if ($_.PSObject.Properties.Name -contains 'SessionId') {
                $snapshot.SessionId = [string]$_.SessionId
            }
            $snapshot.InstanceId = [string]$_.InstanceId
            if ($_.PSObject.Properties.Name -contains 'ProcessId') {
                $snapshot.ProcessId = [int]$_.ProcessId
            }
            if ($_.PSObject.Properties.Name -contains 'ProcessName') {
                $snapshot.ProcessName = [string]$_.ProcessName
            }
            $snapshot.Volume = [float]$_.Volume
            $snapshot.Muted = [bool]$_.Muted
            $snapshot
        } catch {
            $null
        }
    })
}

function Clear-SnapshotState {
    if (Test-Path $snapshotStatePath) {
        Remove-Item $snapshotStatePath -Force -ErrorAction SilentlyContinue
    }
}

function Save-CurrentSnapshotState {
    $combined = Get-CombinedSnapshotState
    Save-SnapshotState -Snapshots $combined
}

function Set-PendingSnapshots {
    param($Snapshots)

    $state.PendingSnapshots = ConvertTo-SnapshotList -Snapshots $Snapshots
    Save-CurrentSnapshotState
}

function Restore-SnapshotList {
    param($Snapshots)

    $typedSnapshots = ConvertTo-SnapshotList -Snapshots $Snapshots
    if ($typedSnapshots.Count -eq 0) {
        return ,(New-SnapshotList)
    }

    $pending = [OpenFlow.Audio.SessionVolumeController]::RestoreAndReturnPending($typedSnapshots)
    return ,(ConvertTo-SnapshotList -Snapshots $pending)
}

function Restore-StaleSnapshotState {
    $snapshots = Load-SnapshotState
    if ($snapshots.Count -eq 0) {
        Clear-SnapshotState
        return $false
    }

    $pending = Restore-SnapshotList -Snapshots $snapshots
    Set-PendingSnapshots -Snapshots $pending
    return $true
}

function Restore-PendingSnapshots {
    if ($state.PendingSnapshots.Count -eq 0) {
        if (-not $state.CaptureActive -and (Test-Path $snapshotStatePath)) {
            $state.PendingSnapshots = ConvertTo-SnapshotList -Snapshots (Load-SnapshotState)
        }
    }

    if ($state.PendingSnapshots.Count -eq 0) {
        return $false
    }

    $pending = Restore-SnapshotList -Snapshots $state.PendingSnapshots
    Set-PendingSnapshots -Snapshots $pending
    return $true
}

function Recover-AudioOutput {
    $restoredSnapshot = Restore-StaleSnapshotState
    $recoveredSessions = [OpenFlow.Audio.SessionVolumeController]::RecoverSilentSessions([float]0.35)
    [OpenFlow.Audio.SessionVolumeController]::EnsureDefaultEndpointAudible([float]0.35)

    return @{
        restored_snapshot = [bool]$restoredSnapshot
        recovered_sessions = [int]$recoveredSessions
    }
}

function Configure-Controller {
    param($Payload)

    if ($null -eq $Payload) {
        return
    }

    $excluded = @()
    if ($Payload.PSObject.Properties.Name -contains 'excluded_pids') {
        $excluded = @($Payload.excluded_pids | ForEach-Object { [int]$_ } | Where-Object { $_ -gt 0 })
    }

    $state.ExcludedPids = $excluded

    if ($Payload.PSObject.Properties.Name -contains 'duck_volume') {
        $volume = [double]$Payload.duck_volume
        if ($volume -lt 0) { $volume = 0 }
        if ($volume -gt 1) { $volume = 1 }
        $state.DuckVolume = [float]$volume
    }
}

function Start-CaptureDuck {
    if ($state.CaptureActive) {
        return
    }

    $snapshots = [OpenFlow.Audio.SessionVolumeController]::DuckExcept($state.ExcludedPids, $state.DuckVolume)
    $state.Snapshots = New-SnapshotList
    foreach ($snapshot in $snapshots) {
        Add-SnapshotIfMissing -Target $state.Snapshots -Snapshot $snapshot
    }
    Save-CurrentSnapshotState

    $state.CaptureActive = $true
}

function Stop-CaptureDuck {
    if (-not $state.CaptureActive) {
        if (Test-Path $snapshotStatePath) {
            Restore-StaleSnapshotState | Out-Null
        } else {
            Restore-PendingSnapshots | Out-Null
        }
        return
    }

    $activeSnapshots = ConvertTo-SnapshotList -Snapshots $state.Snapshots
    $state.Snapshots = New-SnapshotList
    $state.CaptureActive = $false

    try {
        $pendingActive = Restore-SnapshotList -Snapshots $activeSnapshots
        $combinedPending = ConvertTo-SnapshotList -Snapshots $state.PendingSnapshots
        foreach ($snapshot in @($pendingActive)) {
            Add-SnapshotIfMissing -Target $combinedPending -Snapshot $snapshot
        }
        Set-PendingSnapshots -Snapshots $combinedPending
    } catch {
        $combinedPending = ConvertTo-SnapshotList -Snapshots $state.PendingSnapshots
        foreach ($snapshot in @($activeSnapshots)) {
            Add-SnapshotIfMissing -Target $combinedPending -Snapshot $snapshot
        }
        Set-PendingSnapshots -Snapshots $combinedPending
        throw
    }
}

if ($RecoverAudio) {
    $result = Recover-AudioOutput
    Emit-Event -Type 'recovered' -Payload $result
    exit 0
}

try {
    Restore-StaleSnapshotState | Out-Null
} catch {
    Emit-Event -Type 'warning' -Payload @{ message = "Startup restore failed: $($_.Exception.Message)" }
}
Emit-Event -Type 'ready'

try {
    while ($state.Running) {
        $line = [Console]::In.ReadLine()
        if ($null -eq $line) {
            break
        }

        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        try {
            $command = $line | ConvertFrom-Json
        } catch {
            Emit-Event -Type 'error' -Payload @{ message = 'Audio controller received an invalid JSON command.' }
            continue
        }

        switch ($command.type) {
            'configure' {
                try {
                    Configure-Controller $command.payload
                } catch {
                    Emit-Event -Type 'warning' -Payload @{ message = "Configure failed: $($_.Exception.Message)" }
                }
            }
            'capture-begin' {
                try {
                    Start-CaptureDuck
                } catch {
                    Emit-Event -Type 'error' -Payload @{ message = "Duck failed: $($_.Exception.Message)" }
                }
            }
            'capture-end' {
                try {
                    Stop-CaptureDuck
                } catch {
                    Emit-Event -Type 'warning' -Payload @{ message = "Restore failed: $($_.Exception.Message)" }
                }
            }
            'restore-pending' {
                try {
                    Restore-PendingSnapshots | Out-Null
                } catch {
                    Emit-Event -Type 'warning' -Payload @{ message = "Pending restore failed: $($_.Exception.Message)" }
                }
            }
            'shutdown' {
                try {
                    Stop-CaptureDuck
                } catch {
                    # Best effort on shutdown.
                }
                $state.Running = $false
            }
            default {
                Emit-Event -Type 'warning' -Payload @{ message = "Unknown command: $($command.type)" }
            }
        }
    }
} catch {
    Emit-Event -Type 'error' -Payload @{ message = $_.Exception.Message }
} finally {
    try {
        Stop-CaptureDuck
    } catch {
        # Best effort cleanup.
    }
}
