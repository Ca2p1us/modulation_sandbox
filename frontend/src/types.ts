export type ModulationKind = "am" | "fm" | "pm" | "rm";

export type Waveform = {
  t: number[];
  y: number[];
};

export type Spectrum = {
  f: number[];
  mag: number[];
};

export type PackedSignal = {
  pcm_b64: string;
  waveform: Waveform;
  spectrum: Spectrum;
};

export type DerivedParams = {
  mu: number;
  delta_f: number;
  beta: number;
  kp: number;
  delta_f_max: number;
  kp_max: number;
};

export type ModulateResponse = {
  sample_rate: number;
  n_samples: number;
  derived: DerivedParams;
  signals: Record<ModulationKind, PackedSignal>;
};

export type ModulateRequest = {
  sample_rate: number;
  duration_sec: number;
  carrier_freq: number;
  carrier_level: number;
  modulator_freq: number;
  modulator_level: number;
};
