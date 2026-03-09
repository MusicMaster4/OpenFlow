$ErrorActionPreference = 'Stop'

$coreAudioType = @"
using System;
using System.Runtime.InteropServices;

namespace MegaFala.Audio
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

    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioEndpointVolume
    {
        int RegisterControlChangeNotify(IntPtr notify);
        int UnregisterControlChangeNotify(IntPtr notify);
        int GetChannelCount(out uint channelCount);
        int SetMasterVolumeLevel(float levelDb, Guid eventContext);
        int SetMasterVolumeLevelScalar(float level, Guid eventContext);
        int GetMasterVolumeLevel(out float levelDb);
        int GetMasterVolumeLevelScalar(out float level);
        int SetChannelVolumeLevel(uint channelNumber, float levelDb, Guid eventContext);
        int SetChannelVolumeLevelScalar(uint channelNumber, float level, Guid eventContext);
        int GetChannelVolumeLevel(uint channelNumber, out float levelDb);
        int GetChannelVolumeLevelScalar(uint channelNumber, out float level);
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool isMuted, Guid eventContext);
        int GetMute(out bool isMuted);
        int GetVolumeStepInfo(out uint step, out uint stepCount);
        int VolumeStepUp(Guid eventContext);
        int VolumeStepDown(Guid eventContext);
        int QueryHardwareSupport(out uint hardwareSupportMask);
        int GetVolumeRange(out float volumeMinDb, out float volumeMaxDb, out float volumeIncrementDb);
    }

    [ComImport]
    [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    public class MMDeviceEnumeratorComObject
    {
    }

    public static class EndpointVolume
    {
        private static IAudioEndpointVolume GetDefault()
        {
            var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
            IMMDevice device;
            Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
            var iid = typeof(IAudioEndpointVolume).GUID;
            object endpoint;
            Marshal.ThrowExceptionForHR(device.Activate(ref iid, 23, IntPtr.Zero, out endpoint));
            return (IAudioEndpointVolume)endpoint;
        }

        public static bool GetMute()
        {
            bool isMuted;
            Marshal.ThrowExceptionForHR(GetDefault().GetMute(out isMuted));
            return isMuted;
        }

        public static void SetMute(bool isMuted)
        {
            Marshal.ThrowExceptionForHR(GetDefault().SetMute(isMuted, Guid.Empty));
        }
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'MegaFala.Audio.EndpointVolume').Type) {
    Add-Type -TypeDefinition $coreAudioType -Language CSharp
}

$state = @{
    CaptureActive = $false
    RestoreMuted = $null
    Running = $true
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

function Start-CaptureMute {
    if ($state.CaptureActive) {
        return
    }

    $wasMuted = [MegaFala.Audio.EndpointVolume]::GetMute()
    $state.RestoreMuted = $wasMuted

    if (-not $wasMuted) {
        [MegaFala.Audio.EndpointVolume]::SetMute($true)
    }

    $state.CaptureActive = $true
}

function Stop-CaptureMute {
    if (-not $state.CaptureActive) {
        return
    }

    $restoreMuted = $state.RestoreMuted
    $state.CaptureActive = $false
    $state.RestoreMuted = $null

    if ($restoreMuted -eq $false) {
        [MegaFala.Audio.EndpointVolume]::SetMute($false)
    }
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
            Emit-Event -Type 'error' -Payload @{ message = 'Comando JSON invalido recebido pelo controlador de audio.' }
            continue
        }

        switch ($command.type) {
            'capture-begin' {
                Start-CaptureMute
            }
            'capture-end' {
                Stop-CaptureMute
            }
            'shutdown' {
                Stop-CaptureMute
                $state.Running = $false
            }
            default {
                Emit-Event -Type 'warning' -Payload @{ message = "Comando desconhecido: $($command.type)" }
            }
        }
    }
} catch {
    Emit-Event -Type 'error' -Payload @{ message = $_.Exception.Message }
    throw
} finally {
    Stop-CaptureMute
}
