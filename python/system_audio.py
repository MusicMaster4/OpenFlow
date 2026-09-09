import ctypes
import sys
import threading
import time
from ctypes import POINTER, byref, c_void_p
from ctypes import wintypes
from typing import Callable, Optional

import numpy as np

HRESULT = ctypes.HRESULT
DWORD = wintypes.DWORD
WORD = wintypes.WORD
BYTE = ctypes.c_ubyte
REFERENCE_TIME = ctypes.c_longlong
ULONG = ctypes.c_ulong

CLSCTX_ALL = 23
COINIT_MULTITHREADED = 0
E_RENDER = 0
E_CONSOLE = 0
AUDCLNT_SHAREMODE_SHARED = 0
AUDCLNT_STREAMFLAGS_LOOPBACK = 0x00020000
AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM = 0x80000000
AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY = 0x08000000
AUDCLNT_BUFFERFLAGS_SILENT = 0x1
REFTIMES_PER_SEC = 10_000_000
WAVE_FORMAT_PCM = 1
WAVE_FORMAT_IEEE_FLOAT = 3
WAVE_FORMAT_EXTENSIBLE = 0xFFFE
AUDCLNT_E_DEVICE_INVALIDATED = 0x88890004

OnFrame = Callable[[bytes], None]
OnError = Callable[[str], None]


class GUID(ctypes.Structure):
    _fields_ = [
        ("Data1", DWORD),
        ("Data2", WORD),
        ("Data3", WORD),
        ("Data4", BYTE * 8),
    ]

    @classmethod
    def from_str(cls, value: str) -> "GUID":
        hex_value = value.strip("{}").replace("-", "")
        data4 = (BYTE * 8)(*[int(hex_value[16 + index : 18 + index], 16) for index in range(0, 16, 2)])
        return cls(
            int(hex_value[0:8], 16),
            int(hex_value[8:12], 16),
            int(hex_value[12:16], 16),
            data4,
        )


class WAVEFORMATEX(ctypes.Structure):
    _fields_ = [
        ("wFormatTag", WORD),
        ("nChannels", WORD),
        ("nSamplesPerSec", DWORD),
        ("nAvgBytesPerSec", DWORD),
        ("nBlockAlign", WORD),
        ("wBitsPerSample", WORD),
        ("cbSize", WORD),
    ]


class WAVEFORMATEXTENSIBLE(ctypes.Structure):
    _fields_ = [
        ("Format", WAVEFORMATEX),
        ("Samples", WORD),
        ("dwChannelMask", DWORD),
        ("SubFormat", GUID),
    ]


CLSID_MMDEVICE_ENUMERATOR = GUID.from_str("BCDE0395-E52F-467C-8E3D-C4579291692E")
IID_IMMDEVICE_ENUMERATOR = GUID.from_str("A95664D2-9614-4F35-A746-DE8DB63617E6")
IID_IAUDIO_CLIENT = GUID.from_str("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2")
IID_IAUDIO_CAPTURE_CLIENT = GUID.from_str("C8ADBD64-E71E-48a0-A4DE-185C395CD317")

_ole32 = ctypes.windll.ole32 if sys.platform == "win32" else None
if _ole32 is not None:
    _ole32.CoInitializeEx.argtypes = [c_void_p, DWORD]
    _ole32.CoInitializeEx.restype = HRESULT
    _ole32.CoUninitialize.argtypes = []
    _ole32.CoUninitialize.restype = None
    _ole32.CoCreateInstance.argtypes = [
        POINTER(GUID),
        c_void_p,
        DWORD,
        POINTER(GUID),
        POINTER(c_void_p),
    ]
    _ole32.CoCreateInstance.restype = HRESULT
    _ole32.CoTaskMemFree.argtypes = [c_void_p]
    _ole32.CoTaskMemFree.restype = None


def _as_hresult(value) -> int:
    return ctypes.c_long(value).value


def _check(hr, label: str) -> int:
    code = _as_hresult(hr)
    if code < 0:
        raise OSError(f"{label} failed: 0x{code & 0xFFFFFFFF:08X}")
    return code


def _vtbl(obj: c_void_p):
    pointer = ctypes.cast(obj, POINTER(c_void_p))
    return ctypes.cast(pointer[0], POINTER(c_void_p))


def _vfunc(obj: c_void_p, index: int, restype, *argtypes):
    return ctypes.WINFUNCTYPE(restype, c_void_p, *argtypes)(_vtbl(obj)[index])


def _release(obj: Optional[c_void_p]) -> None:
    if not obj:
        return
    try:
        _vfunc(obj, 2, ULONG)(obj)
    except Exception:
        pass


class _PcmFrameAssembler:
    def __init__(self, frame_bytes: int) -> None:
        self.frame_bytes = frame_bytes
        self._buffer = bytearray()

    def push(self, chunk: bytes) -> list[bytes]:
        if not chunk:
            return []
        self._buffer.extend(chunk)
        frames: list[bytes] = []
        while len(self._buffer) >= self.frame_bytes:
            frames.append(bytes(self._buffer[: self.frame_bytes]))
            del self._buffer[: self.frame_bytes]
        return frames

    def flush(self) -> Optional[bytes]:
        if not self._buffer:
            return None
        padded = bytes(self._buffer) + bytes(self.frame_bytes - len(self._buffer))
        self._buffer.clear()
        return padded


def _pcm16_mono_waveformat(sample_rate: int) -> WAVEFORMATEX:
    block_align = 2
    return WAVEFORMATEX(
        WAVE_FORMAT_PCM,
        1,
        sample_rate,
        sample_rate * block_align,
        block_align,
        16,
        0,
    )


def _mix_format_is_float(mix: WAVEFORMATEX, mix_ptr: POINTER(WAVEFORMATEX)) -> bool:
    if mix.wFormatTag == WAVE_FORMAT_IEEE_FLOAT:
        return True
    if mix.wFormatTag != WAVE_FORMAT_EXTENSIBLE or mix.cbSize < 22:
        return False
    extensible = ctypes.cast(mix_ptr, POINTER(WAVEFORMATEXTENSIBLE)).contents
    return extensible.SubFormat.Data1 == WAVE_FORMAT_IEEE_FLOAT


def _convert_mix_chunk(
    raw: bytes,
    *,
    channels: int,
    sample_rate: int,
    bits: int,
    is_float: bool,
    leftover: np.ndarray,
    target_rate: int,
) -> tuple[bytes, np.ndarray]:
    if not raw:
        return b"", leftover

    if is_float:
        samples = np.frombuffer(raw, dtype=np.float32)
    elif bits == 16:
        samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    elif bits == 32:
        samples = np.frombuffer(raw, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        raise RuntimeError(f"Unsupported loopback sample format: {bits}-bit")

    if channels <= 0:
        raise RuntimeError("Loopback device reported no audio channels.")
    if samples.size % channels:
        samples = samples[: samples.size - (samples.size % channels)]
    mono = samples.reshape(-1, channels).mean(axis=1) if channels > 1 else samples
    if leftover.size:
        mono = np.concatenate([leftover, mono])

    if sample_rate == target_rate:
        pcm = np.clip(np.round(mono * 32767.0), -32768, 32767).astype(np.int16)
        return pcm.tobytes(), np.zeros(0, dtype=np.float32)

    ratio = sample_rate / float(target_rate)
    out_len = int(len(mono) / ratio)
    if out_len <= 0:
        return b"", mono.astype(np.float32, copy=False)

    positions = np.arange(out_len, dtype=np.float64) * ratio
    left = np.floor(positions).astype(np.int64)
    left = np.clip(left, 0, max(0, len(mono) - 2))
    frac = positions - left
    resampled = mono[left] * (1.0 - frac) + mono[left + 1] * frac
    consumed = min(len(mono), int(np.floor(out_len * ratio)))
    pcm = np.clip(np.round(resampled * 32767.0), -32768, 32767).astype(np.int16)
    return pcm.tobytes(), mono[consumed:].astype(np.float32, copy=False)


class SystemAudioCapture:
    def __init__(
        self,
        *,
        sample_rate: int,
        frame_samples: int,
        on_frame: OnFrame,
        on_error: Optional[OnError] = None,
    ) -> None:
        self.sample_rate = sample_rate
        self.frame_samples = frame_samples
        self.on_frame = on_frame
        self.on_error = on_error
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._started = threading.Event()
        self._start_error: Optional[str] = None

    def start(self) -> None:
        if sys.platform != "win32":
            raise RuntimeError("Computer-audio capture is available on Windows only.")
        if self._thread is not None:
            return

        self._stop.clear()
        self._started.clear()
        self._start_error = None
        self._thread = threading.Thread(target=self._run, name="openflow-wasapi-loopback", daemon=True)
        self._thread.start()
        if not self._started.wait(timeout=4):
            self.stop()
            raise RuntimeError("Timed out while starting computer-audio capture.")
        if self._start_error:
            message = self._start_error
            self.stop()
            raise RuntimeError(message)

    def stop(self) -> None:
        self._stop.set()
        thread = self._thread
        self._thread = None
        if thread is not None and thread is not threading.current_thread():
            thread.join(timeout=2)

    def _emit_error(self, message: str) -> None:
        if self.on_error:
            self.on_error(message)

    def _run(self) -> None:
        com_ready = False
        enumerator = c_void_p()
        device = c_void_p()
        client = c_void_p()
        capture = c_void_p()
        mix_ptr = POINTER(WAVEFORMATEX)()
        assembler = _PcmFrameAssembler(self.frame_samples * 2)
        leftover = np.zeros(0, dtype=np.float32)
        use_mix = False
        mix_channels = 2
        mix_rate = 48000
        mix_bits = 32
        mix_float = True
        mix_block_align = 8

        try:
            hr = _ole32.CoInitializeEx(None, COINIT_MULTITHREADED)
            code = _as_hresult(hr)
            if code < 0 and code != -2147417850:  # RPC_E_CHANGED_MODE
                raise OSError(f"CoInitializeEx failed: 0x{code & 0xFFFFFFFF:08X}")
            com_ready = code >= 0

            _check(
                _ole32.CoCreateInstance(
                    byref(CLSID_MMDEVICE_ENUMERATOR),
                    None,
                    CLSCTX_ALL,
                    byref(IID_IMMDEVICE_ENUMERATOR),
                    byref(enumerator),
                ),
                "CoCreateInstance(MMDeviceEnumerator)",
            )
            _check(
                _vfunc(enumerator, 4, HRESULT, ctypes.c_int, ctypes.c_int, POINTER(c_void_p))(
                    enumerator, E_RENDER, E_CONSOLE, byref(device)
                ),
                "GetDefaultAudioEndpoint",
            )
            _check(
                _vfunc(device, 3, HRESULT, POINTER(GUID), DWORD, c_void_p, POINTER(c_void_p))(
                    device, byref(IID_IAUDIO_CLIENT), CLSCTX_ALL, None, byref(client)
                ),
                "Activate(IAudioClient)",
            )
            _check(
                _vfunc(client, 8, HRESULT, POINTER(POINTER(WAVEFORMATEX)))(client, byref(mix_ptr)),
                "GetMixFormat",
            )

            requested = _pcm16_mono_waveformat(self.sample_rate)
            flags = (
                AUDCLNT_STREAMFLAGS_LOOPBACK
                | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM
                | AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY
            )
            hr = _vfunc(
                client,
                3,
                HRESULT,
                ctypes.c_int,
                DWORD,
                REFERENCE_TIME,
                REFERENCE_TIME,
                POINTER(WAVEFORMATEX),
                c_void_p,
            )(client, AUDCLNT_SHAREMODE_SHARED, flags, REFTIMES_PER_SEC, 0, byref(requested), None)
            if _as_hresult(hr) < 0:
                mix = mix_ptr.contents
                mix_channels = int(mix.nChannels or 1)
                mix_rate = int(mix.nSamplesPerSec or 48000)
                mix_bits = int(mix.wBitsPerSample or 32)
                mix_block_align = int(mix.nBlockAlign or (mix_channels * max(1, mix_bits // 8)))
                mix_float = _mix_format_is_float(mix, mix_ptr)
                _check(
                    _vfunc(
                        client,
                        3,
                        HRESULT,
                        ctypes.c_int,
                        DWORD,
                        REFERENCE_TIME,
                        REFERENCE_TIME,
                        POINTER(WAVEFORMATEX),
                        c_void_p,
                    )(
                        client,
                        AUDCLNT_SHAREMODE_SHARED,
                        AUDCLNT_STREAMFLAGS_LOOPBACK,
                        REFTIMES_PER_SEC,
                        0,
                        mix_ptr,
                        None,
                    ),
                    "Initialize(WASAPI loopback)",
                )
                use_mix = True

            _check(
                _vfunc(client, 14, HRESULT, POINTER(GUID), POINTER(c_void_p))(
                    client, byref(IID_IAUDIO_CAPTURE_CLIENT), byref(capture)
                ),
                "GetService(IAudioCaptureClient)",
            )
            _check(_vfunc(client, 10, HRESULT)(client), "IAudioClient.Start")
            self._started.set()

            while not self._stop.is_set():
                packet = DWORD(0)
                hr = _vfunc(capture, 5, HRESULT, POINTER(DWORD))(capture, byref(packet))
                code = _as_hresult(hr)
                if code < 0:
                    if (code & 0xFFFFFFFF) == AUDCLNT_E_DEVICE_INVALIDATED:
                        raise RuntimeError("The audio output device changed. Start computer-audio capture again.")
                    raise OSError(f"GetNextPacketSize failed: 0x{code & 0xFFFFFFFF:08X}")
                if packet.value == 0:
                    time.sleep(0.005)
                    continue

                data = c_void_p()
                frames = DWORD(0)
                flags_out = DWORD(0)
                hr = _vfunc(
                    capture,
                    3,
                    HRESULT,
                    POINTER(c_void_p),
                    POINTER(DWORD),
                    POINTER(DWORD),
                    c_void_p,
                    c_void_p,
                )(capture, byref(data), byref(frames), byref(flags_out), None, None)
                code = _as_hresult(hr)
                if code < 0:
                    raise OSError(f"GetBuffer failed: 0x{code & 0xFFFFFFFF:08X}")

                try:
                    frame_count = int(frames.value)
                    if frame_count <= 0:
                        continue
                    silent = bool(flags_out.value & AUDCLNT_BUFFERFLAGS_SILENT)
                    if use_mix:
                        byte_count = frame_count * mix_block_align
                        raw = bytes(byte_count) if silent or not data else ctypes.string_at(data, byte_count)
                        converted, leftover = _convert_mix_chunk(
                            raw,
                            channels=mix_channels,
                            sample_rate=mix_rate,
                            bits=mix_bits,
                            is_float=mix_float,
                            leftover=leftover,
                            target_rate=self.sample_rate,
                        )
                        chunk = converted
                    else:
                        byte_count = frame_count * 2
                        chunk = bytes(byte_count) if silent or not data else ctypes.string_at(data, byte_count)
                finally:
                    _vfunc(capture, 4, HRESULT, DWORD)(capture, frames)

                for frame in assembler.push(chunk):
                    self.on_frame(frame)
        except Exception as error:
            message = str(error) or error.__class__.__name__
            self._start_error = message
            if self._started.is_set():
                self._emit_error(f"Computer-audio capture failed: {message}")
        finally:
            flushed = assembler.flush()
            if flushed and self._started.is_set() and not self._start_error:
                try:
                    self.on_frame(flushed)
                except Exception:
                    pass
            try:
                if client:
                    _vfunc(client, 11, HRESULT)(client)
            except Exception:
                pass
            if mix_ptr:
                try:
                    _ole32.CoTaskMemFree(mix_ptr)
                except Exception:
                    pass
            _release(capture)
            _release(client)
            _release(device)
            _release(enumerator)
            if com_ready:
                try:
                    _ole32.CoUninitialize()
                except Exception:
                    pass
            self._started.set()
