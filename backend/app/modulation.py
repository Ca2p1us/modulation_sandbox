from __future__ import annotations

import base64
from typing import Any

import numpy as np

DELTA_F_MAX_HZ = 2000.0
KP_MAX_RAD = float(np.pi)
WAVEFORM_POINTS = 2000
SPECTRUM_BINS = 512


def _downsample_series(x: np.ndarray, y: np.ndarray, n_points: int) -> dict[str, list[float]]:
    if y.size <= n_points:
        return {"t": x.tolist(), "y": y.astype(float).tolist()}
    # Min/max per bucket so AM envelopes stay visible after thinning.
    n_buckets = max(1, n_points // 2)
    edges = np.linspace(0, y.size, n_buckets + 1).astype(int)
    t_out: list[float] = []
    y_out: list[float] = []
    for start, end in zip(edges[:-1], edges[1:]):
        if end <= start:
            continue
        sl = y[start:end]
        imin = int(np.argmin(sl))
        imax = int(np.argmax(sl))
        pair = (imin, imax) if imin < imax else (imax, imin)
        for local in pair:
            t_out.append(float(x[start + local]))
            y_out.append(float(sl[local]))
    return {"t": t_out, "y": y_out}


def _display_f_max(
    sample_rate: int, carrier_freq: float, modulator_freq: float, delta_f: float
) -> float:
    nyquist = sample_rate / 2.0
    needed = carrier_freq + abs(delta_f) + 8.0 * modulator_freq + 400.0
    return float(min(nyquist, max(4000.0, needed)))


def _amplitude_spectrum(
    y: np.ndarray,
    sample_rate: int,
    f_max: float,
    n_bins: int = SPECTRUM_BINS,
) -> dict[str, list[float]]:
    window = np.hanning(y.size)
    mag = np.abs(np.fft.rfft(y * window))
    freqs = np.fft.rfftfreq(y.size, d=1.0 / sample_rate)
    band = freqs <= f_max
    mag = mag[band]
    freqs = freqs[band]
    if mag.size <= n_bins:
        return {"f": freqs.tolist(), "mag": mag.astype(float).tolist()}

    edges = np.linspace(0, mag.size, n_bins + 1).astype(int)
    binned_f: list[float] = []
    binned_m: list[float] = []
    for start, end in zip(edges[:-1], edges[1:]):
        if end <= start:
            continue
        sl = mag[start:end]
        fl = freqs[start:end]
        peak = int(np.argmax(sl))
        binned_f.append(float(fl[peak]))
        binned_m.append(float(sl[peak]))
    return {"f": binned_f, "mag": binned_m}


def _pack_signal(
    y: np.ndarray, t: np.ndarray, sample_rate: int, f_max: float
) -> dict[str, Any]:
    pcm = np.ascontiguousarray(y.astype(np.float32))
    return {
        "pcm_b64": base64.b64encode(pcm.tobytes()).decode("ascii"),
        "waveform": _downsample_series(t, y, WAVEFORM_POINTS),
        "spectrum": _amplitude_spectrum(y, sample_rate, f_max),
    }


def generate_modulations(
    sample_rate: int,
    duration_sec: float,
    carrier_freq: float,
    carrier_level: float,
    modulator_freq: float,
    modulator_level: float,
) -> dict[str, Any]:
    n = int(round(sample_rate * duration_sec))
    if n < 16:
        raise ValueError("duration produces too few samples")

    t = np.arange(n, dtype=np.float64) / sample_rate
    two_pi = 2.0 * np.pi
    m = np.cos(two_pi * modulator_freq * t)
    carrier_phase = two_pi * carrier_freq * t
    carrier = np.cos(carrier_phase)

    mu = float(modulator_level)
    delta_f = float(modulator_level * DELTA_F_MAX_HZ)
    beta = float(delta_f / modulator_freq) if modulator_freq > 0 else 0.0
    kp = float(modulator_level * KP_MAX_RAD)

    am = carrier_level * (1.0 + mu * m) * carrier
    fm = carrier_level * np.cos(carrier_phase + beta * np.sin(two_pi * modulator_freq * t))
    pm = carrier_level * np.cos(carrier_phase + kp * m)
    rm = carrier_level * modulator_level * carrier * m

    derived = {
        "mu": mu,
        "delta_f": delta_f,
        "beta": beta,
        "kp": kp,
        "delta_f_max": DELTA_F_MAX_HZ,
        "kp_max": KP_MAX_RAD,
    }
    f_max = _display_f_max(sample_rate, carrier_freq, modulator_freq, delta_f)

    return {
        "sample_rate": sample_rate,
        "n_samples": n,
        "derived": derived,
        "signals": {
            "am": _pack_signal(am, t, sample_rate, f_max),
            "fm": _pack_signal(fm, t, sample_rate, f_max),
            "pm": _pack_signal(pm, t, sample_rate, f_max),
            "rm": _pack_signal(rm, t, sample_rate, f_max),
        },
    }
