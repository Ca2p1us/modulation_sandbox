import base64

import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.modulation import generate_modulations

client = TestClient(app)


def _band_peak(freqs: np.ndarray, mag: np.ndarray, center: float, half_width: float) -> float:
    mask = (freqs >= center - half_width) & (freqs <= center + half_width)
    assert np.any(mask), f"no bins near {center} Hz"
    return float(np.max(mag[mask]))


def test_sample_count_matches_duration() -> None:
    fs = 8000
    duration = 1.0
    result = generate_modulations(
        sample_rate=fs,
        duration_sec=duration,
        carrier_freq=1000,
        carrier_level=0.5,
        modulator_freq=100,
        modulator_level=0.5,
    )
    assert result["n_samples"] == fs * duration
    pcm = base64.b64decode(result["signals"]["am"]["pcm_b64"])
    samples = np.frombuffer(pcm, dtype=np.float32)
    assert samples.size == result["n_samples"]


def test_am_has_carrier_and_sidebands() -> None:
    fs = 8000
    fc, fm = 1000.0, 100.0
    result = generate_modulations(
        sample_rate=fs,
        duration_sec=1.0,
        carrier_freq=fc,
        carrier_level=0.5,
        modulator_freq=fm,
        modulator_level=0.5,
    )
    spec = result["signals"]["am"]["spectrum"]
    freqs = np.array(spec["f"])
    mag = np.array(spec["mag"])
    carrier = _band_peak(freqs, mag, fc, 8)
    upper = _band_peak(freqs, mag, fc + fm, 8)
    lower = _band_peak(freqs, mag, fc - fm, 8)
    far = _band_peak(freqs, mag, 2500, 40)
    assert carrier > upper
    assert upper > far * 8
    assert lower > far * 8


def test_rm_suppresses_carrier() -> None:
    fs = 8000
    fc, fm = 1000.0, 100.0
    result = generate_modulations(
        sample_rate=fs,
        duration_sec=1.0,
        carrier_freq=fc,
        carrier_level=0.5,
        modulator_freq=fm,
        modulator_level=0.5,
    )
    spec = result["signals"]["rm"]["spectrum"]
    freqs = np.array(spec["f"])
    mag = np.array(spec["mag"])
    carrier = _band_peak(freqs, mag, fc, 8)
    upper = _band_peak(freqs, mag, fc + fm, 8)
    lower = _band_peak(freqs, mag, fc - fm, 8)
    assert upper > carrier * 8
    assert lower > carrier * 8


def test_modulate_endpoint() -> None:
    response = client.post(
        "/api/modulate",
        json={
            "sample_rate": 8000,
            "duration_sec": 0.5,
            "carrier_freq": 440,
            "carrier_level": 0.5,
            "modulator_freq": 5,
            "modulator_level": 0.7,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body["signals"]) == {"am", "fm", "pm", "rm"}
    assert body["derived"]["mu"] == 0.7
    assert "pcm_b64" in body["signals"]["fm"]
    assert len(body["signals"]["am"]["waveform"]["y"]) > 10
    assert len(body["signals"]["am"]["spectrum"]["f"]) > 10
