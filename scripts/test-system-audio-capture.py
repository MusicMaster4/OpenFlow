import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))

from system_audio import SystemAudioCapture, _PcmFrameAssembler, _convert_mix_chunk  # noqa: E402
import numpy as np  # noqa: E402


def test_frame_assembler_splits_and_pads():
    assembler = _PcmFrameAssembler(4)
    frames = assembler.push(b"\x01\x02\x03\x04\x05\x06")
    assert frames == [b"\x01\x02\x03\x04"]
    flushed = assembler.flush()
    assert flushed == b"\x05\x06\x00\x00"


def test_mix_chunk_stereo_float_downsamples_to_16k_mono():
    # 6 stereo frames at 48 kHz -> 2 mono frames at 16 kHz.
    stereo = np.array(
        [
            [0.5, -0.5],
            [0.5, -0.5],
            [0.5, -0.5],
            [0.25, 0.25],
            [0.25, 0.25],
            [0.25, 0.25],
        ],
        dtype=np.float32,
    )
    converted, leftover = _convert_mix_chunk(
        stereo.tobytes(),
        channels=2,
        sample_rate=48000,
        bits=32,
        is_float=True,
        leftover=np.zeros(0, dtype=np.float32),
        target_rate=16000,
    )
    samples = np.frombuffer(converted, dtype=np.int16)
    assert leftover.size == 0
    assert samples.size == 2
    assert samples[0] == 0
    assert 7000 < samples[1] < 9000


def test_wasapi_loopback_emits_pcm_frames():
    if sys.platform != "win32":
        print("SKIP WASAPI loopback capture (Windows only)")
        return

    frames = []
    errors = []
    ready = threading.Event()

    def on_frame(frame: bytes) -> None:
        frames.append(frame)
        if len(frames) >= 8:
            ready.set()

    capture = SystemAudioCapture(
        sample_rate=16000,
        frame_samples=480,
        on_frame=on_frame,
        on_error=lambda message: errors.append(message),
    )
    capture.start()
    ready.wait(timeout=2)
    capture.stop()
    assert not errors, errors
    assert frames, "WASAPI loopback produced no audio frames"
    assert all(len(frame) == 960 for frame in frames)


def main() -> int:
    test_frame_assembler_splits_and_pads()
    print("PASS test_frame_assembler_splits_and_pads")
    test_mix_chunk_stereo_float_downsamples_to_16k_mono()
    print("PASS test_mix_chunk_stereo_float_downsamples_to_16k_mono")
    test_wasapi_loopback_emits_pcm_frames()
    print("PASS test_wasapi_loopback_emits_pcm_frames")
    print("PASS system-audio capture tests")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
