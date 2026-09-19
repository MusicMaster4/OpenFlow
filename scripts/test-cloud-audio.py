"""Check lossless round trips, fallback and encoding cost without microphone access."""
import base64
import sys
import time
import os
import json
import subprocess
from pathlib import Path
from unittest.mock import patch

import av
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
from cloud_audio import encode_cloud_audio, cloud_audio_to_wav, pcm_wav


def check(samples):
    expected = pcm_wav((np.clip(samples, -1, 1) * 32767).astype(np.int16), 16000)
    started = time.perf_counter()
    encoded = encode_cloud_audio(samples, 16000)
    elapsed = (time.perf_counter() - started) * 1000
    restored = cloud_audio_to_wav(encoded) if encoded["format"] == "flac" else encoded
    assert base64.b64decode(restored["data"]) == expected
    assert len(base64.b64decode(encoded["data"])) <= len(expected)
    return encoded, elapsed


rng = np.random.default_rng(2026)
for samples in [np.zeros(16000, np.float32), np.array([-1, 1, -2, 2, 0], np.float32),
                rng.uniform(-1, 1, 16000).astype(np.float32),
                (np.sin(np.arange(16000 * 60) * .037) * .5).astype(np.float32)]:
    check(samples)

with patch('cloud_audio.av.open', side_effect=RuntimeError('Encoder unavailable')):
    encoded = encode_cloud_audio(np.zeros(16000, np.float32), 16000)
    assert encoded['format'] == 'wav'

# Exercise the real worker queue and event contract without opening capture devices.
from dictation_service import DictationService
service = DictationService()
service.cloud_mode = True
events = []
service.emit = lambda event, payload=None: events.append((event, payload))
samples = (np.sin(np.arange(16000) * .037) * .5).astype(np.float32)
service.pending_segments = [samples]
assert service._queue_pending_transcription(42, 12345)
service.segment_queue.put(None)
service._transcribe_loop()
payload = next(payload for event, payload in events if event == 'audio')
assert payload['session_id'] == 42 and payload['stopped_at_ms'] == 12345
assert payload['audio_duration_ms'] == 1000 and payload['encoding_ms'] >= 0
restored = cloud_audio_to_wav(payload)
assert base64.b64decode(restored['data']) == pcm_wav((samples * 32767).astype(np.int16), 16000)

commands = [
    {'type': 'convert-cloud-audio', 'payload': {'data': payload['data'], 'request_id': 'test-conversion'}},
    {'type': 'shutdown'},
]
worker = subprocess.run([sys.executable, str(Path(__file__).resolve().parents[1] / 'python' / 'dictation_service.py')],
                        input='\n'.join(json.dumps(command) for command in commands) + '\n',
                        capture_output=True, text=True, timeout=30,
                        env={**os.environ, 'FLOW_TRANSCRIPTION_ENGINE': 'cloud'})
assert worker.returncode == 0, worker.stderr
messages = [json.loads(line) for line in worker.stdout.splitlines()]
converted = next(message['payload'] for message in messages if message['type'] == 'cloud-audio-converted')
assert converted['request_id'] == 'test-conversion' and converted['data'] == restored['data']

if len(sys.argv) > 1:
    source = Path(sys.argv[1])
    with av.open(str(source)) as container:
        resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
        frames = [part.to_ndarray().reshape(-1) for frame in container.decode(audio=0)
                  for part in resampler.resample(frame)]
        frames.extend(part.to_ndarray().reshape(-1) for part in resampler.resample(None))
    samples = np.concatenate(frames).astype(np.float32) / 32768.0
    encoded, elapsed = check(samples)
    wav = pcm_wav((samples * 32767).astype(np.int16), 16000)
    source.with_name('baseline.wav').write_bytes(wav)
    source.with_name('optimized.' + encoded['format']).write_bytes(base64.b64decode(encoded['data']))
    summary = {'durationMs': len(samples) / 16, 'encodingMs': round(elapsed, 2),
               'wavBytes': len(wav), 'wavBase64Bytes': len(base64.b64encode(wav)),
               'optimizedBytes': len(base64.b64decode(encoded['data'])), 'format': encoded['format'],
               'pcmIdentical': True}
    source.with_name('encoding.json').write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary))

print('cloud-audio-ok: exact PCM, clipping boundaries, noise, long audio, WAV fallback')
