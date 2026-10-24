import { useCallback, useEffect, useMemo, useState } from "react";
import { decodePcmBase64, playPcm, stopPlayback } from "./audio";
import { SpectrumCanvas, WaveformCanvas } from "./charts";
import type { ModulationKind, ModulateRequest, ModulateResponse } from "./types";

const KINDS: {
  id: ModulationKind;
  title: string;
  color: string;
  hint: string;
}[] = [
  {
    id: "am",
    title: "AM 振幅変調",
    color: "#7dd3fc",
    hint: "包絡線がモジュレータに追従。スペクトルにキャリアと fc±fm の側波帯。",
  },
  {
    id: "fm",
    title: "FM 周波数変調",
    color: "#86efac",
    hint: "包絡はほぼ一定。瞬時周波数は cos で動く。側波帯はベッセル分布。",
  },
  {
    id: "pm",
    title: "PM 位相変調",
    color: "#fcd34d",
    hint: "包絡はほぼ一定。正弦波モジュレータでは FM とスペクトルが似るが、瞬時周波数は 90° ずれる。",
  },
  {
    id: "rm",
    title: "RM リング変調",
    color: "#f9a8d4",
    hint: "積変調（平衡変調）。キャリアは消え、側波帯 fc±fm のみ。",
  },
];

const DEFAULT_PARAMS: ModulateRequest = {
  sample_rate: 44100,
  duration_sec: 1.5,
  carrier_freq: 440,
  carrier_level: 0.5,
  modulator_freq: 5,
  modulator_level: 0.7,
};

function formatHz(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function derivedLabel(kind: ModulationKind, result: ModulateResponse): string {
  const d = result.derived;
  if (kind === "am") return `μ = ${d.mu.toFixed(2)}（1 超で過変調）`;
  if (kind === "fm") {
    return `Δf = ${d.delta_f.toFixed(0)} Hz, β = ${d.beta.toFixed(2)}`;
  }
  if (kind === "pm") return `kp = ${d.kp.toFixed(2)} rad`;
  return `振幅積 Ac × ${d.mu.toFixed(2)}`;
}

export default function App() {
  const [params, setParams] = useState<ModulateRequest>(DEFAULT_PARAMS);
  const [result, setResult] = useState<ModulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<ModulationKind | null>(null);

  const pcmByKind = useMemo(() => {
    if (!result) return null;
    const map = {} as Record<ModulationKind, Float32Array>;
    for (const kind of KINDS) {
      map[kind.id] = decodePcmBase64(result.signals[kind.id].pcm_b64);
    }
    return map;
  }, [result]);

  const generate = useCallback(async (body: ModulateRequest) => {
    setLoading(true);
    setError(null);
    stopPlayback();
    setPlaying(null);
    try {
      const response = await fetch("/api/modulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `HTTP ${response.status}`);
      }
      const data = (await response.json()) as ModulateResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void generate(DEFAULT_PARAMS);
    return () => stopPlayback();
  }, [generate]);

  const onPlay = async (kind: ModulationKind) => {
    if (!result || !pcmByKind) return;
    if (playing === kind) {
      stopPlayback();
      setPlaying(null);
      return;
    }
    setPlaying(kind);
    await playPcm(pcmByKind[kind], result.sample_rate, () => {
      setPlaying((current) => (current === kind ? null : current));
    });
  };

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Modulation sandbox</p>
        <h1>変調比較サンドボックス</h1>
        <p className="lede">
          同じキャリア／モジュレータで AM・FM・PM・RM を生成し、聴感と波形・スペクトルの違いを並べて確認します。
          正弦波モジュレータでは FM と PM のスペクトルは似ることがありますが、瞬時周波数の時間変化は 90° ずれます。
        </p>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>共有パラメータ</h2>
          <button
            type="button"
            className="primary"
            onClick={() => void generate(params)}
            disabled={loading}
          >
            {loading ? "生成中…" : "生成"}
          </button>
        </div>

        <div className="sliders">
          <label>
            <span>キャリア周波数 fc {formatHz(params.carrier_freq)} Hz</span>
            <input
              type="range"
              min={80}
              max={2000}
              step={1}
              value={params.carrier_freq}
              onChange={(e) =>
                setParams((p) => ({ ...p, carrier_freq: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            <span>キャリアレベル Ac {params.carrier_level.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={params.carrier_level}
              onChange={(e) =>
                setParams((p) => ({ ...p, carrier_level: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            <span>モジュレータ周波数 fm {formatHz(params.modulator_freq)} Hz</span>
            <input
              type="range"
              min={0.5}
              max={400}
              step={0.5}
              value={params.modulator_freq}
              onChange={(e) =>
                setParams((p) => ({ ...p, modulator_freq: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            <span>変調の深さ {params.modulator_level.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.01}
              value={params.modulator_level}
              onChange={(e) =>
                setParams((p) => ({ ...p, modulator_level: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            <span>長さ {params.duration_sec.toFixed(1)} s</span>
            <input
              type="range"
              min={0.4}
              max={3}
              step={0.1}
              value={params.duration_sec}
              onChange={(e) =>
                setParams((p) => ({ ...p, duration_sec: Number(e.target.value) }))
              }
            />
          </label>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="grid">
        {KINDS.map((kind) => {
          const signal = result?.signals[kind.id];
          return (
            <article key={kind.id} className="card" style={{ borderColor: kind.color }}>
              <div className="card-head">
                <div>
                  <h3>{kind.title}</h3>
                  <p className="derived">
                    {result ? derivedLabel(kind.id, result) : "生成待ち"}
                  </p>
                </div>
                <button
                  type="button"
                  className={playing === kind.id ? "playing" : ""}
                  onClick={() => void onPlay(kind.id)}
                  disabled={!signal || loading}
                >
                  {playing === kind.id ? "停止" : "再生"}
                </button>
              </div>
              <p className="hint">{kind.hint}</p>
              {signal ? (
                <>
                  <p className="plot-label">時間波形</p>
                  <WaveformCanvas data={signal.waveform} color={kind.color} />
                  <p className="plot-label">振幅スペクトル (dB)</p>
                  <SpectrumCanvas data={signal.spectrum} color={kind.color} />
                </>
              ) : (
                <p className="placeholder">まだ信号がありません</p>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
