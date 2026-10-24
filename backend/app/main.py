from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.modulation import generate_modulations

app = FastAPI(title="Modulation Sandbox")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ModulateRequest(BaseModel):
    sample_rate: int = Field(default=44100, ge=8000, le=48000)
    duration_sec: float = Field(default=1.5, ge=0.2, le=3.0)
    carrier_freq: float = Field(default=440.0, gt=1.0, le=12000.0)
    carrier_level: float = Field(default=0.5, ge=0.0, le=1.0)
    modulator_freq: float = Field(default=5.0, gt=0.1, le=8000.0)
    modulator_level: float = Field(default=0.7, ge=0.0, le=2.0)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/modulate")
def modulate(req: ModulateRequest) -> dict:
    nyquist = req.sample_rate / 2.0
    if req.carrier_freq >= nyquist:
        raise HTTPException(status_code=400, detail="carrier_freq must be below Nyquist")
    if req.modulator_freq >= nyquist:
        raise HTTPException(status_code=400, detail="modulator_freq must be below Nyquist")
    try:
        return generate_modulations(
            sample_rate=req.sample_rate,
            duration_sec=req.duration_sec,
            carrier_freq=req.carrier_freq,
            carrier_level=req.carrier_level,
            modulator_freq=req.modulator_freq,
            modulator_level=req.modulator_level,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
