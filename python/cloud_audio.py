"""Lossless cloud transport; the PCM samples match the existing WAV encoder."""

import base64
import io
import wave

import av
import numpy as np


def pcm_wav(pcm: np.ndarray, sample_rate: int) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(pcm.astype("<i2", copy=False).tobytes())
    return buffer.getvalue()


def encode_cloud_audio(segment: np.ndarray, sample_rate: int) -> dict:
    pcm = (np.clip(segment, -1.0, 1.0) * 32767.0).astype(np.int16)
    audio_format = "wav"
    try:
        buffer = io.BytesIO()
        with av.open(buffer, "w", format="flac") as output:
            stream = output.add_stream("flac", rate=sample_rate)
            stream.layout = "mono"
            stream.codec_context.format = "s16"
            # Fast lossless compression; no resampling or speech segmentation.
            stream.codec_context.options = {"compression_level": "0"}
            frame = av.AudioFrame.from_ndarray(pcm.reshape(1, -1), format="s16", layout="mono")
            frame.sample_rate = sample_rate
            for packet in stream.encode(frame):
                output.mux(packet)
            for packet in stream.encode(None):
                output.mux(packet)
        data = buffer.getvalue()
        if len(data) < pcm.nbytes + 44:
            audio_format = "flac"
        else:
            data = pcm_wav(pcm, sample_rate)
    except Exception:
        # An unavailable encoder must never prevent dictation.
        data = pcm_wav(pcm, sample_rate)
    return {"format": audio_format, "data": base64.b64encode(data).decode("ascii")}


def cloud_audio_to_wav(payload: dict) -> dict:
    data = base64.b64decode(payload["data"], validate=True)
    with av.open(io.BytesIO(data), "r") as source:
        frames = list(source.decode(audio=0))
    if not frames or any(frame.format.name != "s16" or len(frame.layout.channels) != 1 for frame in frames):
        raise ValueError("Expected mono 16-bit cloud audio")
    pcm = np.concatenate([frame.to_ndarray().reshape(-1) for frame in frames])
    return {"format": "wav", "data": base64.b64encode(pcm_wav(pcm, frames[0].sample_rate)).decode("ascii")}
