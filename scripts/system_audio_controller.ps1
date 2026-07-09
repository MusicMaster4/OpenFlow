param(
    [switch]$RecoverAudio,
    [switch]$SelfTest
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

    /// <summary>
    /// Live Core Audio session view used by pure restore matching (no COM required in tests).
    /// </summary>
    public class LiveAudioSession
    {
        public string SessionId { get; set; }
        public string InstanceId { get; set; }
        public int ProcessId { get; set; }
        public string ProcessName { get; set; }
        public float Volume { get; set; }
        public bool Muted { get; set; }
    }

    public class SnapshotRestoreMatch
    {
        public LiveAudioSession Live { get; set; }
        public AudioSessionSnapshot Snapshot { get; set; }
    }

    public class RestoreMatchPlan
    {
        public List<SnapshotRestoreMatch> Matches { get; set; }
        public List<AudioSessionSnapshot> Pending { get; set; }

        public RestoreMatchPlan()
        {
            Matches = new List<SnapshotRestoreMatch>();
            Pending = new List<AudioSessionSnapshot>();
        }
    }

    public static class SessionVolumeController
    {
        private const int ClsCtxAll = 23;
        private const float NearSilentVolume = 0.0001f;

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

        private static void AddSnapshotByProcessId(
            Dictionary<int, List<AudioSessionSnapshot>> map,
            int processId,
            AudioSessionSnapshot snapshot)
        {
            if (processId <= 0 || snapshot == null)
            {
                return;
            }

            List<AudioSessionSnapshot> list;
            if (!map.TryGetValue(processId, out list))
            {
                list = new List<AudioSessionSnapshot>();
                map[processId] = list;
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

                return snapshot;
            }

            return null;
        }

        private static AudioSessionSnapshot FindUnrestoredSnapshotByProcessName(
            Dictionary<string, List<AudioSessionSnapshot>> map,
            string processName,
            HashSet<AudioSessionSnapshot> restored)
        {
            if (string.IsNullOrEmpty(processName))
            {
                return null;
            }

            List<AudioSessionSnapshot> snapshots;
            if (!map.TryGetValue(processName, out snapshots))
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

        /// <summary>
        /// True when a live session still looks like it was ducked by us (muted or near-silent).
        /// Used so fuzzy process-name matching prefers stranded muted sessions over brand-new streams.
        /// </summary>
        public static bool LooksDucked(LiveAudioSession live)
        {
            if (live == null)
            {
                return false;
            }

            return live.Muted || live.Volume <= NearSilentVolume;
        }

        private static AudioSessionSnapshot FindRestoreSnapshotForLive(
            LiveAudioSession live,
            bool allowProcessNameFallback,
            Dictionary<string, List<AudioSessionSnapshot>> byInstanceId,
            Dictionary<string, List<AudioSessionSnapshot>> bySessionId,
            Dictionary<int, List<AudioSessionSnapshot>> byProcessId,
            Dictionary<string, List<AudioSessionSnapshot>> byProcessName,
            HashSet<AudioSessionSnapshot> restored)
        {
            if (live == null)
            {
                return null;
            }

            var snapshot = FindUnrestoredSnapshotByKey(byInstanceId, live.InstanceId, restored);
            if (snapshot != null)
            {
                return snapshot;
            }

            snapshot = FindUnrestoredSnapshotByKey(bySessionId, live.SessionId, restored);
            if (snapshot != null)
            {
                return snapshot;
            }

            snapshot = FindUnrestoredSnapshotByProcessId(byProcessId, live.ProcessId, live.ProcessName, restored);
            if (snapshot != null)
            {
                return snapshot;
            }

            // Process-name fallback: Chrome/media apps often recycle PID + instance id after a
            // long silence. Only use this when allowed (typically for still-ducked live sessions)
            // so we never leave a muted chrome.exe stranded while a new healthy stream steals the snapshot.
            if (allowProcessNameFallback)
            {
                return FindUnrestoredSnapshotByProcessName(byProcessName, live.ProcessName, restored);
            }

            return null;
        }

        private static void IndexSnapshots(
            List<AudioSessionSnapshot> snapshots,
            out Dictionary<string, List<AudioSessionSnapshot>> byInstanceId,
            out Dictionary<string, List<AudioSessionSnapshot>> bySessionId,
            out Dictionary<int, List<AudioSessionSnapshot>> byProcessId,
            out Dictionary<string, List<AudioSessionSnapshot>> byProcessName)
        {
            byInstanceId = new Dictionary<string, List<AudioSessionSnapshot>>(StringComparer.OrdinalIgnoreCase);
            bySessionId = new Dictionary<string, List<AudioSessionSnapshot>>(StringComparer.OrdinalIgnoreCase);
            byProcessId = new Dictionary<int, List<AudioSessionSnapshot>>();
            byProcessName = new Dictionary<string, List<AudioSessionSnapshot>>(StringComparer.OrdinalIgnoreCase);

            if (snapshots == null)
            {
                return;
            }

            foreach (var snapshot in snapshots)
            {
                if (snapshot == null)
                {
                    continue;
                }

                AddSnapshotByKey(byInstanceId, snapshot.InstanceId, snapshot);
                AddSnapshotByKey(bySessionId, snapshot.SessionId, snapshot);
                AddSnapshotByProcessId(byProcessId, snapshot.ProcessId, snapshot);
                AddSnapshotByKey(byProcessName, snapshot.ProcessName, snapshot);
            }
        }

        /// <summary>
        /// Pure restore matching: maps ducked snapshots onto live sessions without COM I/O.
        /// Pass 1 prioritises still-muted/silent sessions (instance → session → pid → process name).
        /// Pass 2 clears remaining snapshots against exact-ish identity on healthy sessions
        /// (instance → session → pid only — no process-name steal of a delayed muted twin).
        /// Unmatched snapshots stay pending for later retries when sessions reappear.
        /// </summary>
        public static RestoreMatchPlan MatchSnapshotsForRestore(
            List<AudioSessionSnapshot> snapshots,
            List<LiveAudioSession> liveSessions)
        {
            var plan = new RestoreMatchPlan();
            if (snapshots == null || snapshots.Count == 0)
            {
                return plan;
            }

            Dictionary<string, List<AudioSessionSnapshot>> byInstanceId;
            Dictionary<string, List<AudioSessionSnapshot>> bySessionId;
            Dictionary<int, List<AudioSessionSnapshot>> byProcessId;
            Dictionary<string, List<AudioSessionSnapshot>> byProcessName;
            IndexSnapshots(snapshots, out byInstanceId, out bySessionId, out byProcessId, out byProcessName);

            var restored = new HashSet<AudioSessionSnapshot>();
            var liveList = liveSessions ?? new List<LiveAudioSession>();

            // Pass 1: fix sessions that still look ducked, including process-name fallback for PID drift.
            foreach (var live in liveList)
            {
                if (live == null || !LooksDucked(live))
                {
                    continue;
                }

                var snapshot = FindRestoreSnapshotForLive(
                    live,
                    true,
                    byInstanceId,
                    bySessionId,
                    byProcessId,
                    byProcessName,
                    restored);
                if (snapshot == null)
                {
                    continue;
                }

                plan.Matches.Add(new SnapshotRestoreMatch { Live = live, Snapshot = snapshot });
                restored.Add(snapshot);
            }

            // Pass 2: identity matches on any remaining live sessions (session recreated unmuted).
            foreach (var live in liveList)
            {
                if (live == null)
                {
                    continue;
                }

                var snapshot = FindRestoreSnapshotForLive(
                    live,
                    false,
                    byInstanceId,
                    bySessionId,
                    byProcessId,
                    byProcessName,
                    restored);
                if (snapshot == null)
                {
                    continue;
                }

                plan.Matches.Add(new SnapshotRestoreMatch { Live = live, Snapshot = snapshot });
                restored.Add(snapshot);
            }

            foreach (var snapshot in snapshots)
            {
                if (snapshot != null && !restored.Contains(snapshot))
                {
                    plan.Pending.Add(snapshot);
                }
            }

            return plan;
        }

        /// <summary>
        /// True when a currently-muted live session matches a prior duck snapshot we still own.
        /// Prevents treating our leftover mutes as intentional user mutes on the next capture.
        /// </summary>
        public static bool IsPreviouslyDuckedSession(
            string instanceId,
            string sessionId,
            int processId,
            string processName,
            List<AudioSessionSnapshot> previouslyDucked)
        {
            if (previouslyDucked == null || previouslyDucked.Count == 0)
            {
                return false;
            }

            foreach (var prior in previouslyDucked)
            {
                if (prior == null)
                {
                    continue;
                }

                if (!string.IsNullOrEmpty(instanceId) &&
                    !string.IsNullOrEmpty(prior.InstanceId) &&
                    string.Equals(instanceId, prior.InstanceId, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                if (!string.IsNullOrEmpty(sessionId) &&
                    !string.IsNullOrEmpty(prior.SessionId) &&
                    string.Equals(sessionId, prior.SessionId, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                if (processId > 0 && prior.ProcessId == processId)
                {
                    if (string.IsNullOrEmpty(prior.ProcessName) ||
                        string.IsNullOrEmpty(processName) ||
                        string.Equals(prior.ProcessName, processName, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }

                if (!string.IsNullOrEmpty(processName) &&
                    !string.IsNullOrEmpty(prior.ProcessName) &&
                    string.Equals(processName, prior.ProcessName, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        public static AudioSessionSnapshot FindPriorDuckSnapshot(
            string instanceId,
            string sessionId,
            int processId,
            string processName,
            List<AudioSessionSnapshot> previouslyDucked)
        {
            if (previouslyDucked == null)
            {
                return null;
            }

            AudioSessionSnapshot byProcessName = null;
            foreach (var prior in previouslyDucked)
            {
                if (prior == null)
                {
                    continue;
                }

                if (!string.IsNullOrEmpty(instanceId) &&
                    !string.IsNullOrEmpty(prior.InstanceId) &&
                    string.Equals(instanceId, prior.InstanceId, StringComparison.OrdinalIgnoreCase))
                {
                    return prior;
                }

                if (!string.IsNullOrEmpty(sessionId) &&
                    !string.IsNullOrEmpty(prior.SessionId) &&
                    string.Equals(sessionId, prior.SessionId, StringComparison.OrdinalIgnoreCase))
                {
                    return prior;
                }

                if (processId > 0 && prior.ProcessId == processId)
                {
                    if (string.IsNullOrEmpty(prior.ProcessName) ||
                        string.IsNullOrEmpty(processName) ||
                        string.Equals(prior.ProcessName, processName, StringComparison.OrdinalIgnoreCase))
                    {
                        return prior;
                    }
                }

                if (byProcessName == null &&
                    !string.IsNullOrEmpty(processName) &&
                    !string.IsNullOrEmpty(prior.ProcessName) &&
                    string.Equals(processName, prior.ProcessName, StringComparison.OrdinalIgnoreCase))
                {
                    byProcessName = prior;
                }
            }

            return byProcessName;
        }

        // Silence every audio session except the excluded process ids by MUTING them.
        // Muting (instead of forcing the volume to 0) is fully reversible and never loses
        // the original volume level, so an app can never get stuck at a low volume even if
        // its audio session expires or changes identity before we restore it.
        //
        // previouslyDucked: snapshots still pending from a prior capture. Sessions we muted
        // before and that remain muted are re-owned (not treated as user mutes).
        public static List<AudioSessionSnapshot> DuckExcept(
            int[] excludedProcessIds,
            float duckVolume,
            List<AudioSessionSnapshot> previouslyDucked)
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

                        var processName = TryGetProcessName(processId);

                        bool originalMuted;
                        Marshal.ThrowExceptionForHR(volume.GetMute(out originalMuted));

                        float originalVolume;
                        Marshal.ThrowExceptionForHR(volume.GetMasterVolume(out originalVolume));

                        // Leave sessions the user already muted untouched — unless they match a
                        // prior duck we still own (failed restore left them muted).
                        if (originalMuted)
                        {
                            var prior = FindPriorDuckSnapshot(
                                instanceId,
                                sessionId,
                                processId,
                                processName,
                                previouslyDucked);
                            if (prior == null)
                            {
                                continue;
                            }

                            snapshots.Add(new AudioSessionSnapshot
                            {
                                SessionId = sessionId,
                                InstanceId = instanceId,
                                ProcessId = processId,
                                ProcessName = processName ?? prior.ProcessName,
                                // Prefer the volume we captured before our mute, not the live level.
                                Volume = prior.Volume > NearSilentVolume ? prior.Volume : originalVolume,
                                Muted = false,
                            });
                            continue;
                        }

                        snapshots.Add(new AudioSessionSnapshot
                        {
                            SessionId = sessionId,
                            InstanceId = instanceId,
                            ProcessId = processId,
                            ProcessName = processName,
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

        // Overload for callers that have no prior pending state.
        public static List<AudioSessionSnapshot> DuckExcept(int[] excludedProcessIds, float duckVolume)
        {
            return DuckExcept(excludedProcessIds, duckVolume, null);
        }

        public static void Restore(List<AudioSessionSnapshot> snapshots)
        {
            RestoreAndReturnPending(snapshots);
        }

        private static List<LiveAudioSession> EnumerateLiveSessions()
        {
            var liveSessions = new List<LiveAudioSession>();
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

                        float currentVolume = 1.0f;
                        bool currentMuted = false;
                        try
                        {
                            Marshal.ThrowExceptionForHR(volume.GetMasterVolume(out currentVolume));
                            Marshal.ThrowExceptionForHR(volume.GetMute(out currentMuted));
                        }
                        catch
                        {
                            // Keep defaults; matching can still use identity fields.
                        }

                        liveSessions.Add(new LiveAudioSession
                        {
                            SessionId = sessionId,
                            InstanceId = instanceId,
                            ProcessId = processId,
                            ProcessName = TryGetProcessName(processId),
                            Volume = currentVolume,
                            Muted = currentMuted,
                        });
                    }
                    catch
                    {
                        // Skip sessions that disappear mid-enumeration.
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

            return liveSessions;
        }

        /// <summary>
        /// Apply volume/mute restores in one COM enumeration, keyed by the live identities
        /// already chosen by MatchSnapshotsForRestore (instance → session → pid → process name).
        /// </summary>
        private static HashSet<AudioSessionSnapshot> ApplyRestoreMatches(List<SnapshotRestoreMatch> matches)
        {
            var applied = new HashSet<AudioSessionSnapshot>();
            if (matches == null || matches.Count == 0)
            {
                return applied;
            }

            // Index matches by the strongest live identity available.
            var byInstanceId = new Dictionary<string, SnapshotRestoreMatch>(StringComparer.OrdinalIgnoreCase);
            var bySessionAndPid = new Dictionary<string, SnapshotRestoreMatch>(StringComparer.OrdinalIgnoreCase);
            var byProcessId = new Dictionary<int, List<SnapshotRestoreMatch>>();
            var byProcessNameDucked = new Dictionary<string, List<SnapshotRestoreMatch>>(StringComparer.OrdinalIgnoreCase);

            foreach (var match in matches)
            {
                if (match == null || match.Live == null || match.Snapshot == null)
                {
                    continue;
                }

                var live = match.Live;
                if (!string.IsNullOrEmpty(live.InstanceId) && !byInstanceId.ContainsKey(live.InstanceId))
                {
                    byInstanceId[live.InstanceId] = match;
                }

                if (!string.IsNullOrEmpty(live.SessionId))
                {
                    var key = live.SessionId + "|" + live.ProcessId.ToString();
                    if (!bySessionAndPid.ContainsKey(key))
                    {
                        bySessionAndPid[key] = match;
                    }
                }

                if (live.ProcessId > 0)
                {
                    List<SnapshotRestoreMatch> list;
                    if (!byProcessId.TryGetValue(live.ProcessId, out list))
                    {
                        list = new List<SnapshotRestoreMatch>();
                        byProcessId[live.ProcessId] = list;
                    }
                    list.Add(match);
                }

                if (!string.IsNullOrEmpty(live.ProcessName) && LooksDucked(live))
                {
                    List<SnapshotRestoreMatch> list;
                    if (!byProcessNameDucked.TryGetValue(live.ProcessName, out list))
                    {
                        list = new List<SnapshotRestoreMatch>();
                        byProcessNameDucked[live.ProcessName] = list;
                    }
                    list.Add(match);
                }
            }

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

                        float currentVolume = 1.0f;
                        bool currentMuted = false;
                        try
                        {
                            Marshal.ThrowExceptionForHR(volume.GetMasterVolume(out currentVolume));
                            Marshal.ThrowExceptionForHR(volume.GetMute(out currentMuted));
                        }
                        catch
                        {
                        }

                        SnapshotRestoreMatch match = null;
                        if (!string.IsNullOrEmpty(instanceId))
                        {
                            byInstanceId.TryGetValue(instanceId, out match);
                        }

                        if (match == null && !string.IsNullOrEmpty(sessionId))
                        {
                            var key = sessionId + "|" + processId.ToString();
                            bySessionAndPid.TryGetValue(key, out match);
                            if (match != null && applied.Contains(match.Snapshot))
                            {
                                match = null;
                            }
                        }

                        if (match == null && processId > 0)
                        {
                            List<SnapshotRestoreMatch> list;
                            if (byProcessId.TryGetValue(processId, out list))
                            {
                                foreach (var candidate in list)
                                {
                                    if (candidate == null || candidate.Snapshot == null || applied.Contains(candidate.Snapshot))
                                    {
                                        continue;
                                    }

                                    match = candidate;
                                    break;
                                }
                            }
                        }

                        if (match == null && (currentMuted || currentVolume <= NearSilentVolume))
                        {
                            var processName = TryGetProcessName(processId);
                            if (!string.IsNullOrEmpty(processName))
                            {
                                List<SnapshotRestoreMatch> list;
                                if (byProcessNameDucked.TryGetValue(processName, out list))
                                {
                                    foreach (var candidate in list)
                                    {
                                        if (candidate == null || candidate.Snapshot == null || applied.Contains(candidate.Snapshot))
                                        {
                                            continue;
                                        }

                                        // Prefer the candidate whose live instance still matches this control.
                                        if (!string.IsNullOrEmpty(candidate.Live.InstanceId) &&
                                            !string.IsNullOrEmpty(instanceId) &&
                                            !string.Equals(candidate.Live.InstanceId, instanceId, StringComparison.OrdinalIgnoreCase))
                                        {
                                            continue;
                                        }

                                        match = candidate;
                                        break;
                                    }
                                }
                            }
                        }

                        if (match == null || match.Snapshot == null || applied.Contains(match.Snapshot))
                        {
                            continue;
                        }

                        var context = Guid.Empty;
                        // Restore recorded volume (covers older builds that lowered volume) and lift mute.
                        Marshal.ThrowExceptionForHR(volume.SetMasterVolume(match.Snapshot.Volume, ref context));
                        Marshal.ThrowExceptionForHR(volume.SetMute(match.Snapshot.Muted, ref context));
                        applied.Add(match.Snapshot);
                    }
                    catch
                    {
                        // Keep unmatched and continue; caller leaves them pending.
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

            return applied;
        }

        public static List<AudioSessionSnapshot> RestoreAndReturnPending(List<AudioSessionSnapshot> snapshots)
        {
            if (snapshots == null || snapshots.Count == 0)
            {
                return new List<AudioSessionSnapshot>();
            }

            List<LiveAudioSession> liveSessions;
            try
            {
                liveSessions = EnumerateLiveSessions();
            }
            catch
            {
                // If we cannot enumerate, keep everything pending for a later retry.
                return new List<AudioSessionSnapshot>(snapshots);
            }

            var plan = MatchSnapshotsForRestore(snapshots, liveSessions);
            HashSet<AudioSessionSnapshot> applied;
            try
            {
                applied = ApplyRestoreMatches(plan.Matches);
            }
            catch
            {
                applied = new HashSet<AudioSessionSnapshot>();
            }

            var pending = new List<AudioSessionSnapshot>();
            foreach (var snapshot in snapshots)
            {
                if (snapshot == null)
                {
                    continue;
                }

                if (applied.Contains(snapshot))
                {
                    continue;
                }

                pending.Add(snapshot);
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
        Emit-RestoreStatus -PendingCount 0 -Reason 'restore-pending-empty'
        return $false
    }

    $pending = Restore-SnapshotList -Snapshots $state.PendingSnapshots
    Set-PendingSnapshots -Snapshots $pending
    Emit-RestoreStatus -PendingCount $state.PendingSnapshots.Count -Reason 'restore-pending'
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

function Emit-RestoreStatus {
    param(
        [int]$PendingCount,
        [string]$Reason = 'restore'
    )

    Emit-Event -Type 'restore-complete' -Payload @{
        pending = [int]$PendingCount
        reason = $Reason
    }
}

function Start-CaptureDuck {
    if ($state.CaptureActive) {
        return
    }

    # Re-own leftover mutes from a prior failed restore so DuckExcept does not treat them
    # as intentional user mutes and abandon them for the rest of the session.
    $previouslyDucked = Get-CombinedSnapshotState
    $priorList = New-Object System.Collections.Generic.List[OpenFlow.Audio.AudioSessionSnapshot]
    foreach ($snapshot in @($previouslyDucked)) {
        if ($null -ne $snapshot) {
            [void]$priorList.Add($snapshot)
        }
    }

    $snapshots = [OpenFlow.Audio.SessionVolumeController]::DuckExcept(
        $state.ExcludedPids,
        $state.DuckVolume,
        $priorList
    )
    $state.Snapshots = New-SnapshotList
    foreach ($snapshot in $snapshots) {
        Add-SnapshotIfMissing -Target $state.Snapshots -Snapshot $snapshot
    }

    # Any prior pending identity that was not visible during duck stays pending so retries
    # can still restore it if the session reappears after a long silence.
    $carriedPending = New-SnapshotList
    foreach ($prior in @($state.PendingSnapshots)) {
        if ($null -eq $prior) {
            continue
        }

        $stillOwned = $false
        foreach ($owned in @($state.Snapshots)) {
            if ($null -eq $owned) {
                continue
            }

            if (-not [string]::IsNullOrEmpty($prior.InstanceId) -and $prior.InstanceId -eq $owned.InstanceId) {
                $stillOwned = $true
                break
            }
            if (-not [string]::IsNullOrEmpty($prior.SessionId) -and $prior.SessionId -eq $owned.SessionId) {
                $stillOwned = $true
                break
            }
            if ($prior.ProcessId -gt 0 -and $prior.ProcessId -eq $owned.ProcessId) {
                $stillOwned = $true
                break
            }
            if (-not [string]::IsNullOrEmpty($prior.ProcessName) -and
                -not [string]::IsNullOrEmpty($owned.ProcessName) -and
                $prior.ProcessName -eq $owned.ProcessName) {
                $stillOwned = $true
                break
            }
        }

        if (-not $stillOwned) {
            Add-SnapshotIfMissing -Target $carriedPending -Snapshot $prior
        }
    }

    $state.PendingSnapshots = $carriedPending
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
        Emit-RestoreStatus -PendingCount $state.PendingSnapshots.Count -Reason 'capture-end-idle'
        return
    }

    # Restore active + any still-pending snapshots together so a long capture never drops
    # earlier unmatched ducks when capture ends.
    $combined = Get-CombinedSnapshotState
    $state.Snapshots = New-SnapshotList
    $state.CaptureActive = $false

    try {
        $pending = Restore-SnapshotList -Snapshots $combined
        Set-PendingSnapshots -Snapshots $pending
        Emit-RestoreStatus -PendingCount $state.PendingSnapshots.Count -Reason 'capture-end'
    } catch {
        Set-PendingSnapshots -Snapshots $combined
        Emit-RestoreStatus -PendingCount $state.PendingSnapshots.Count -Reason 'capture-end-error'
        throw
    }
}

function New-TestSnapshot {
    param(
        [string]$InstanceId,
        [string]$SessionId,
        [int]$ProcessId,
        [string]$ProcessName,
        [float]$Volume = 0.8,
        [bool]$Muted = $false
    )

    $snapshot = New-Object OpenFlow.Audio.AudioSessionSnapshot
    $snapshot.InstanceId = $InstanceId
    $snapshot.SessionId = $SessionId
    $snapshot.ProcessId = $ProcessId
    $snapshot.ProcessName = $ProcessName
    $snapshot.Volume = $Volume
    $snapshot.Muted = $Muted
    return $snapshot
}

function New-TestLiveSession {
    param(
        [string]$InstanceId,
        [string]$SessionId,
        [int]$ProcessId,
        [string]$ProcessName,
        [float]$Volume = 0.8,
        [bool]$Muted = $false
    )

    $live = New-Object OpenFlow.Audio.LiveAudioSession
    $live.InstanceId = $InstanceId
    $live.SessionId = $SessionId
    $live.ProcessId = $ProcessId
    $live.ProcessName = $ProcessName
    $live.Volume = $Volume
    $live.Muted = $Muted
    return $live
}

function Assert-SelfTest {
    param(
        [string]$Name,
        [bool]$Condition,
        [System.Collections.Generic.List[string]]$Failures
    )

    if (-not $Condition) {
        [void]$Failures.Add($Name)
        Write-Output "FAIL: $Name"
    } else {
        Write-Output "PASS: $Name"
    }
}

function New-SnapshotListOf {
    param([Parameter(ValueFromRemainingArguments = $true)]$Items)

    $list = New-Object 'System.Collections.Generic.List[OpenFlow.Audio.AudioSessionSnapshot]'
    foreach ($item in @($Items)) {
        if ($null -ne $item) {
            [void]$list.Add($item)
        }
    }
    return ,$list
}

function New-LiveSessionListOf {
    param([Parameter(ValueFromRemainingArguments = $true)]$Items)

    $list = New-Object 'System.Collections.Generic.List[OpenFlow.Audio.LiveAudioSession]'
    foreach ($item in @($Items)) {
        if ($null -ne $item) {
            [void]$list.Add($item)
        }
    }
    return ,$list
}

function Invoke-DuckRestoreSelfTest {
    $failures = New-Object System.Collections.Generic.List[string]

    # 1) Exact instance match
    $snapExact = New-TestSnapshot -InstanceId 'inst-a' -SessionId 'sess-a' -ProcessId 100 -ProcessName 'chrome'
    $liveExact = New-TestLiveSession -InstanceId 'inst-a' -SessionId 'sess-a' -ProcessId 100 -ProcessName 'chrome' -Muted $true
    $planExact = [OpenFlow.Audio.SessionVolumeController]::MatchSnapshotsForRestore(
        (New-SnapshotListOf $snapExact),
        (New-LiveSessionListOf $liveExact)
    )
    Assert-SelfTest -Name 'exact-instance-match' -Condition ($planExact.Matches.Count -eq 1 -and $planExact.Pending.Count -eq 0) -Failures $failures

    # 2) PID/instance drift: same process name, new pid + instance, still muted
    $snapDrift = New-TestSnapshot -InstanceId 'inst-old' -SessionId 'sess-old' -ProcessId 200 -ProcessName 'chrome'
    $liveDrift = New-TestLiveSession -InstanceId 'inst-new' -SessionId 'sess-new' -ProcessId 201 -ProcessName 'chrome' -Muted $true -Volume 0.8
    $planDrift = [OpenFlow.Audio.SessionVolumeController]::MatchSnapshotsForRestore(
        (New-SnapshotListOf $snapDrift),
        (New-LiveSessionListOf $liveDrift)
    )
    Assert-SelfTest -Name 'process-name-fallback-on-pid-instance-drift' -Condition (
        $planDrift.Matches.Count -eq 1 -and
        $planDrift.Pending.Count -eq 0 -and
        $planDrift.Matches[0].Snapshot.InstanceId -eq 'inst-old' -and
        $planDrift.Matches[0].Live.InstanceId -eq 'inst-new'
    ) -Failures $failures

    # 3) Multi-session process: two chrome snapshots, two muted live sessions with new identities
    $snapMulti1 = New-TestSnapshot -InstanceId 'c1' -SessionId 's1' -ProcessId 10 -ProcessName 'chrome'
    $snapMulti2 = New-TestSnapshot -InstanceId 'c2' -SessionId 's2' -ProcessId 11 -ProcessName 'chrome'
    $liveMulti1 = New-TestLiveSession -InstanceId 'c1b' -SessionId 's1b' -ProcessId 12 -ProcessName 'chrome' -Muted $true
    $liveMulti2 = New-TestLiveSession -InstanceId 'c2b' -SessionId 's2b' -ProcessId 13 -ProcessName 'chrome' -Muted $true
    $planMulti = [OpenFlow.Audio.SessionVolumeController]::MatchSnapshotsForRestore(
        (New-SnapshotListOf $snapMulti1 $snapMulti2),
        (New-LiveSessionListOf $liveMulti1 $liveMulti2)
    )
    Assert-SelfTest -Name 'multi-session-process-name-restore' -Condition (
        $planMulti.Matches.Count -eq 2 -and $planMulti.Pending.Count -eq 0
    ) -Failures $failures

    # 4) Delayed reappearance: first miss leaves pending; later muted rebirth restores
    $snapLate = New-TestSnapshot -InstanceId 'late-old' -SessionId 'late-sess' -ProcessId 50 -ProcessName 'Spotify'
    $planMiss = [OpenFlow.Audio.SessionVolumeController]::MatchSnapshotsForRestore(
        (New-SnapshotListOf $snapLate),
        (New-LiveSessionListOf)
    )
    Assert-SelfTest -Name 'delayed-reappearance-first-miss-pending' -Condition (
        $planMiss.Matches.Count -eq 0 -and $planMiss.Pending.Count -eq 1
    ) -Failures $failures

    $liveLate = New-TestLiveSession -InstanceId 'late-new' -SessionId 'late-sess-2' -ProcessId 99 -ProcessName 'Spotify' -Muted $true
    $planLate = [OpenFlow.Audio.SessionVolumeController]::MatchSnapshotsForRestore(
        $planMiss.Pending,
        (New-LiveSessionListOf $liveLate)
    )
    Assert-SelfTest -Name 'delayed-reappearance-second-pass-restores' -Condition (
        $planLate.Matches.Count -eq 1 -and $planLate.Pending.Count -eq 0
    ) -Failures $failures

    # 5) Healthy new stream with same process name must NOT steal snapshot (keep pending for muted twin)
    $snapHold = New-TestSnapshot -InstanceId 'hold-old' -SessionId 'hold-sess' -ProcessId 70 -ProcessName 'chrome'
    $liveHealthy = New-TestLiveSession -InstanceId 'hold-new' -SessionId 'hold-new-sess' -ProcessId 71 -ProcessName 'chrome' -Muted $false -Volume 0.9
    $planHold = [OpenFlow.Audio.SessionVolumeController]::MatchSnapshotsForRestore(
        (New-SnapshotListOf $snapHold),
        (New-LiveSessionListOf $liveHealthy)
    )
    Assert-SelfTest -Name 'healthy-stream-does-not-steal-process-name-snapshot' -Condition (
        $planHold.Matches.Count -eq 0 -and $planHold.Pending.Count -eq 1
    ) -Failures $failures

    # 6) Previously-ducked detection for re-owning leftover mutes
    $prior = New-TestSnapshot -InstanceId 'p-old' -SessionId 'p-sess' -ProcessId 5 -ProcessName 'msedge' -Volume 0.55
    $priorList = New-SnapshotListOf $prior
    $isPrior = [OpenFlow.Audio.SessionVolumeController]::IsPreviouslyDuckedSession(
        'p-new', 'other-sess', 6, 'msedge', $priorList
    )
    Assert-SelfTest -Name 'previously-ducked-process-name-match' -Condition ($isPrior -eq $true) -Failures $failures

    $notPrior = [OpenFlow.Audio.SessionVolumeController]::IsPreviouslyDuckedSession(
        'x', 'y', 1, 'notepad', $priorList
    )
    Assert-SelfTest -Name 'previously-ducked-unrelated-process-skipped' -Condition ($notPrior -eq $false) -Failures $failures

    # 7) Same session id after instance recycle (common after silence)
    $snapSess = New-TestSnapshot -InstanceId 'si-1' -SessionId 'stable-sess' -ProcessId 30 -ProcessName 'firefox'
    $liveSess = New-TestLiveSession -InstanceId 'si-2' -SessionId 'stable-sess' -ProcessId 30 -ProcessName 'firefox' -Muted $true
    $planSess = [OpenFlow.Audio.SessionVolumeController]::MatchSnapshotsForRestore(
        (New-SnapshotListOf $snapSess),
        (New-LiveSessionListOf $liveSess)
    )
    Assert-SelfTest -Name 'stable-session-id-after-instance-recycle' -Condition (
        $planSess.Matches.Count -eq 1 -and $planSess.Pending.Count -eq 0
    ) -Failures $failures

    if ($failures.Count -gt 0) {
        Write-Output ("SELFTEST_FAILED count={0}" -f $failures.Count)
        exit 1
    }

    Write-Output 'SELFTEST_PASSED'
    exit 0
}

if ($SelfTest) {
    Invoke-DuckRestoreSelfTest
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
