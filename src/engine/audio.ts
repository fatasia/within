import type { PaintingId } from '../types';
import { clamp, seededRandom } from './math';
import {
  composePhrase,
  phraseDuration,
  SOUND_PALETTES,
  type FieldEvent,
  type ScoreNote,
} from './audioScore';

type SoundContext = AudioContext | OfflineAudioContext;
export interface SoundMix {
  music: number;
  ambience: number;
}
interface SoundGraph {
  painting: PaintingId;
  music: GainNode;
  ambience: GainNode;
  output: GainNode;
  schedule(phrase: number, time: number): void;
  dispose(): void;
}

interface SoundBuffers {
  noise: AudioBuffer;
  impulse: AudioBuffer;
  reverb?: ConvolverNode;
}
function* noiseBufferSteps(
  context: SoundContext,
  seconds: number,
  seed: number,
): Generator<void, AudioBuffer> {
  const buffer = context.createBuffer(
    2,
    Math.ceil(context.sampleRate * seconds),
    context.sampleRate,
  );
  const random = seededRandom(seed);
  for (let channel = 0; channel < 2; channel++) {
    const samples = buffer.getChannelData(channel);
    let previous = 0;
    for (let i = 0; i < samples.length; i++) {
      if (i > 0 && i % 8192 === 0) yield;
      previous = previous * 0.85 + (random() * 2 - 1) * 0.15;
      samples[i] = previous;
    }
  }
  return buffer;
}

function* soundBufferSteps(context: SoundContext, id: PaintingId): Generator<void, SoundBuffers> {
  const palette = SOUND_PALETTES[id];
  const impulse = yield* noiseBufferSteps(context, 2.4, palette.seed * 12);
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      if (i > 0 && i % 8192 === 0) yield;
      data[i] *= Math.pow(1 - i / data.length, 3);
    }
  }
  const noise = yield* noiseBufferSteps(context, 8, palette.seed);
  return { impulse, noise };
}

function buildGraph(
  context: SoundContext,
  id: PaintingId,
  destination: AudioNode,
  start: number,
  buffers?: SoundBuffers,
): SoundGraph {
  const p = SOUND_PALETTES[id];
  const nodes = new Set<AudioNode>();
  const sources = new Set<AudioScheduledSourceNode>();
  const own = <T extends AudioNode>(node: T): T => {
    nodes.add(node);
    return node;
  };
  const run = <T extends AudioScheduledSourceNode>(source: T, at: number, end?: number): T => {
    own(source);
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      nodes.delete(source);
      source.disconnect();
    };
    source.start(at);
    if (end !== undefined) source.stop(end);
    return source;
  };
  const music = own(context.createGain());
  const ambience = own(context.createGain());
  const output = own(context.createGain());
  output.gain.setValueAtTime(0, start);
  output.gain.linearRampToValueAtTime(0.7, start + 1.5);
  const compressor = own(context.createDynamicsCompressor());
  compressor.threshold.value = -14;
  compressor.knee.value = 16;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.02;
  compressor.release.value = 0.3;
  music.connect(compressor);
  ambience.connect(compressor);
  compressor.connect(output);
  output.connect(destination);

  // Quiet diffuse reflections keep instruments behind the image, rather than in front of it.
  const reverb = buffers?.reverb ?? own(context.createConvolver());
  let prepared = buffers;
  if (!prepared) {
    const steps = soundBufferSteps(context, id);
    let step = steps.next();
    while (!step.done) step = steps.next();
    prepared = step.value;
  }
  if (!buffers?.reverb) reverb.buffer = prepared.impulse;
  const wet = own(context.createGain());
  wet.gain.value = 0.19;
  reverb.connect(wet);
  wet.connect(music);
  const noise = prepared.noise;

  function loopBed(kind: 'wind' | 'water' | 'rain', level: number): void {
    if (!level) return;
    const source = own(context.createBufferSource());
    source.buffer = noise;
    source.loop = true;
    const filter = own(context.createBiquadFilter());
    filter.type = kind === 'wind' ? 'bandpass' : kind === 'rain' ? 'highpass' : 'lowpass';
    filter.frequency.value = kind === 'wind' ? 390 : kind === 'rain' ? 2400 : 1850;
    filter.Q.value = kind === 'wind' ? 0.45 : 0.7;
    const gain = own(context.createGain());
    gain.gain.value = level * (kind === 'wind' ? 0.19 : 0.16);
    const swell = own(context.createOscillator());
    swell.frequency.value = kind === 'wind' ? 0.07 : 0.17;
    const depth = own(context.createGain());
    depth.gain.value = level * 0.035;
    swell.connect(depth);
    depth.connect(gain.gain);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ambience);
    run(source, start);
    run(swell, start);
  }
  loopBed('wind', p.wind);
  loopBed('water', p.water);
  loopBed('rain', p.rain ?? 0);
  if (p.market) {
    // Three soft, irregular bands evoke a distant crowd without fabricated speech.
    // All layers remain on the environmental bus, including their slow modulation.
    for (let layer = 0; layer < 3; layer++) {
      const source = own(context.createBufferSource());
      source.buffer = noise;
      source.loop = true;
      source.playbackRate.value = 0.83 + layer * 0.17;
      const filter = own(context.createBiquadFilter());
      filter.type = 'bandpass';
      filter.frequency.value = [290, 620, 1100][layer]!;
      filter.Q.value = 0.65;
      const gain = own(context.createGain());
      gain.gain.value = p.market * 0.12;
      const pan = own(context.createStereoPanner());
      pan.pan.value = (layer - 1) * 0.55;
      const swell = own(context.createOscillator());
      swell.frequency.value = 0.18 + layer * 0.071;
      const depth = own(context.createGain());
      depth.gain.value = p.market * 0.07;
      swell.connect(depth);
      depth.connect(gain.gain);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(pan);
      pan.connect(ambience);
      run(source, start);
      run(swell, start);
    }
  }

  function note(note: ScoreNote, base: number, environmental = false): void {
    const at = base + note.at,
      end = at + note.duration;
    const frequency = 440 * Math.pow(2, (note.midi - 69) / 12);
    const gain = own(context.createGain());
    const pan = own(context.createStereoPanner());
    pan.pan.value = note.pan;
    const filter = own(context.createBiquadFilter());
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(note.voice === 'bell' ? 4200 : 2400, at);
    filter.frequency.exponentialRampToValueAtTime(note.voice === 'pad' ? 480 : 950, end);
    gain.connect(filter);
    filter.connect(pan);
    pan.connect(environmental ? ambience : music);
    if (!environmental) pan.connect(reverb);
    const attack = note.voice === 'pad' ? 1.2 : note.voice === 'flute' ? 0.28 : 0.012;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(note.velocity, at + attack);
    if (note.voice === 'pad' || note.voice === 'flute') {
      gain.gain.setValueAtTime(note.velocity * 0.72, Math.max(at + attack, end - 0.7));
      gain.gain.linearRampToValueAtTime(0, end);
    } else gain.gain.exponentialRampToValueAtTime(0.00001, end);
    const partials =
      note.voice === 'bell'
        ? [
            [1, 1],
            [2.756, 0.13],
            [5.404, 0.025],
          ]
        : note.voice === 'pluck'
          ? [
              [1, 1],
              [2, 0.26],
              [3, 0.12],
            ]
          : [
              [1, 1],
              [2, 0.12],
            ];
    let remaining = partials.length;
    for (const [ratio, volume] of partials) {
      const oscillator = own(context.createOscillator());
      oscillator.type = note.voice === 'felt' || note.voice === 'pad' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency * ratio!, at);
      if (note.voice === 'flute')
        oscillator.frequency.linearRampToValueAtTime(frequency * ratio! * 1.0015, end);
      const partial = own(context.createGain());
      partial.gain.value = volume!;
      oscillator.connect(partial);
      partial.connect(gain);
      run(oscillator, at, end);
      oscillator.onended = () => {
        sources.delete(oscillator);
        nodes.delete(oscillator);
        oscillator.disconnect();
        partial.disconnect();
        nodes.delete(partial);
        if (--remaining === 0)
          for (const node of [gain, filter, pan]) {
            node.disconnect();
            nodes.delete(node);
          }
      };
    }
  }

  function field(event: FieldEvent, base: number): void {
    const at = base + event.at;
    if (event.kind === 'chime') {
      note(
        {
          at: event.at,
          midi: p.root + 24 + (event.variant > 0.5 ? 7 : 0),
          duration: 4,
          velocity: 0.018,
          pan: event.pan,
          voice: 'bell',
        },
        base,
        true,
      );
      return;
    }
    const gain = own(context.createGain()),
      pan = own(context.createStereoPanner());
    pan.pan.value = event.pan;
    gain.connect(pan);
    pan.connect(ambience);
    const duration =
      event.kind === 'insect'
        ? 1.28
        : event.kind === 'bird'
          ? 0.46
          : event.kind === 'oar'
            ? 1.6
            : 0.24;
    const volume =
      event.kind === 'insect'
        ? 0.007
        : event.kind === 'bird'
          ? 0.018
          : event.kind === 'wood'
            ? 0.055
            : 0.065;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + (event.kind === 'oar' ? 0.24 : 0.015));
    gain.gain.exponentialRampToValueAtTime(0.00001, at + duration);
    if (event.kind === 'insect') {
      gain.gain.cancelScheduledValues(at);
      for (let chirp = 0; chirp < 8; chirp++) {
        const time = at + chirp * 0.16;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(
          volume * (0.65 + Math.sin(chirp * 0.7) * 0.3),
          time + 0.025,
        );
        gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.11);
        gain.gain.setValueAtTime(0, time + 0.15);
      }
    }
    let source: AudioScheduledSourceNode;
    const filter = own(context.createBiquadFilter());
    filter.type = 'bandpass';
    if (event.kind === 'bird' || event.kind === 'drip' || event.kind === 'insect') {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      const pitch =
        event.kind === 'insect'
          ? 3400 + event.variant * 650
          : event.kind === 'bird'
            ? 1800 + event.variant * 1200
            : 720 + event.variant * 500;
      oscillator.frequency.setValueAtTime(pitch, at);
      oscillator.frequency.exponentialRampToValueAtTime(
        pitch * (event.kind === 'insect' ? 1.015 : event.kind === 'bird' ? 1.32 : 0.45),
        at + duration * 0.4,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        pitch * (event.kind === 'insect' ? 0.99 : 0.8),
        at + duration,
      );
      filter.frequency.value = pitch;
      filter.Q.value = 0.6;
      source = oscillator;
    } else {
      const buffer = context.createBufferSource();
      buffer.buffer = noise;
      filter.frequency.value = event.kind === 'wood' ? 470 + event.variant * 250 : 1300;
      filter.Q.value = event.kind === 'wood' ? 8 : 0.65;
      source = buffer;
    }
    source.connect(filter);
    filter.connect(gain);
    run(source, at, at + duration);
    source.onended = () => {
      sources.delete(source);
      for (const node of [source, filter, gain, pan]) {
        node.disconnect();
        nodes.delete(node);
      }
    };
  }

  return {
    painting: id,
    music,
    ambience,
    output,
    schedule(phrase, time) {
      const score = composePhrase(id, phrase);
      score.notes.forEach((item) => note(item, time));
      score.fields.forEach((item) => field(item, time));
    },
    dispose() {
      // Cached convolution kernels outlive their graph, not its output connection.
      if (buffers?.reverb) reverb.disconnect(wet);
      for (const source of sources) {
        source.onended = null;
        try {
          source.stop();
        } catch {
          /* Already ended. */
        }
      }
      for (const node of nodes) node.disconnect();
      sources.clear();
      nodes.clear();
    },
  };
}

/** The context is created only after a user gesture. */
export class AmbientAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private graph: SoundGraph | null = null;
  private painting: PaintingId = 'qianli';
  private enabled = false;
  private music = 0.72;
  private ambience = 0.85;
  private nextPhrase = 0;
  private nextTime = 0;
  private revision = 0;
  private buildRevision = 0;
  private graphPainting: PaintingId | null = null;
  private buildTask: Promise<void> = Promise.resolve();
  private buffers = new Map<string, SoundBuffers>();
  private retired = new Map<SoundGraph, ReturnType<typeof setTimeout>>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly visibility = (): void => {
    const context = this.context;
    if (!context) return;
    if (document.hidden) void context.suspend().catch(() => {});
    else if (this.enabled)
      void context
        .resume()
        .then(async () => {
          if ((document.hidden || !this.enabled) && context.state !== 'closed')
            await context.suspend();
        })
        .catch(() => {});
  };

  constructor() {
    document.addEventListener('visibilitychange', this.visibility);
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    const revision = ++this.revision;
    if (!enabled) {
      this.buildRevision++;
      const context = this.context;
      if (context && this.master) {
        this.master.gain.cancelAndHoldAtTime(context.currentTime);
        this.master.gain.linearRampToValueAtTime(0, context.currentTime + 0.12);
        await new Promise<void>((resolve) => setTimeout(resolve, 150));
        if (revision === this.revision && context.state !== 'closed') {
          await context.suspend();
          if (revision === this.revision && this.master) {
            this.master.gain.cancelScheduledValues(context.currentTime);
            this.master.gain.setValueAtTime(0, context.currentTime);
          }
        }
      }
      return;
    }
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);
    }
    const context = this.context;
    if (!document.hidden) {
      try {
        await context.resume();
      } catch (error) {
        if (context.state !== 'closed') throw error;
      }
    }
    if (
      revision === this.revision &&
      this.enabled &&
      this.context === context &&
      this.graphPainting !== this.painting
    ) {
      this.buildTask = this.rebuild();
      await this.buildTask;
    }
    if (revision === this.revision && this.master && this.context === context) {
      this.master.gain.cancelAndHoldAtTime(context.currentTime);
      this.master.gain.linearRampToValueAtTime(1, context.currentTime + 0.5);
    } else if (!this.enabled && context.state !== 'closed') {
      // A resume requested by an older click must not outlive a newer mute/dispose.
      await context.suspend();
    }
  }
  async start(): Promise<void> {
    await this.setEnabled(true);
  }
  async stop(): Promise<void> {
    await this.setEnabled(false);
  }
  async toggle(): Promise<void> {
    await this.setEnabled(!this.enabled);
  }

  setPainting(id: PaintingId): void {
    if (id === this.painting) return;
    this.painting = id;
    this.buildRevision++;
    if (this.context && this.enabled) {
      this.buildTask = this.rebuild();
      void this.buildTask.catch(() => {});
    }
  }
  setMix(music: number, ambience: number): void {
    this.music = clamp(music);
    this.ambience = clamp(ambience);
    if (this.context) {
      const graphs = this.graph ? [this.graph, ...this.retired.keys()] : [...this.retired.keys()];
      for (const graph of graphs) {
        for (const [param, value] of [
          [graph.music.gain, this.music],
          [graph.ambience.gain, this.ambience],
        ] as const) {
          param.cancelAndHoldAtTime(this.context.currentTime);
          if (this.context.state === 'running')
            param.linearRampToValueAtTime(value, this.context.currentTime + 0.2);
          else param.setValueAtTime(value, this.context.currentTime);
        }
      }
    }
  }
  setIntensity(progress: number): void {
    if (this.enabled && this.context && this.graph)
      this.graph.output.gain.setTargetAtTime(
        0.65 + Math.sin(clamp(progress) * Math.PI) * 0.07,
        this.context.currentTime,
        0.8,
      );
  }
  private async rebuild(): Promise<void> {
    const context = this.context,
      master = this.master,
      id = this.painting;
    if (!context || !master || !this.enabled) return;
    const revision = ++this.buildRevision;
    const current = (): boolean =>
      revision === this.buildRevision && this.context === context && this.enabled;
    // Always let the selection paint before constructing even a cached graph.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (!current()) return;
    const key = `${context.sampleRate}:${id}`;
    let buffers = this.buffers.get(key);
    if (!buffers) {
      const steps = soundBufferSteps(context, id);
      let step;
      let sliceStart = performance.now();
      do {
        step = steps.next();
        if (!step.done && performance.now() - sliceStart >= 4) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          if (!current()) {
            steps.return(undefined as never);
            return;
          }
          sliceStart = performance.now();
        }
      } while (!step.done);
      buffers = step.value;
      if (!current()) return;
    }
    this.buffers.delete(key);
    this.buffers.set(key, buffers);
    while (this.buffers.size > 3) this.buffers.delete(this.buffers.keys().next().value!);
    if (!buffers.reverb) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (!current()) return;
      buffers.reverb = context.createConvolver();
      // This browser-native FFT cannot be subdivided. Prepare it once per cached
      // scene, in its own task rather than adding it to graph/node scheduling.
      buffers.reverb.buffer = buffers.impulse;
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (!current()) return;
    }
    for (const [old, timer] of this.retired) {
      if (old.painting !== id) continue;
      clearTimeout(timer);
      old.dispose();
      this.retired.delete(old);
    }
    // Keep the previous graph audible until its replacement is ready to crossfade.
    const nextTime = context.currentTime + 0.06;
    const graph = buildGraph(context, id, master, nextTime, buffers);
    if (this.timer) clearInterval(this.timer);
    if (this.graph) {
      const old = this.graph;
      if (context.state === 'running') {
        old.output.gain.cancelAndHoldAtTime(context.currentTime);
        old.output.gain.linearRampToValueAtTime(0, context.currentTime + 0.25);
        this.retired.set(
          old,
          setTimeout(() => {
            old.dispose();
            this.retired.delete(old);
          }, 300),
        );
      } else old.dispose();
    }
    this.nextPhrase = 0;
    this.nextTime = nextTime;
    this.graph = graph;
    this.graphPainting = id;
    this.graph.music.gain.value = this.music;
    this.graph.ambience.gain.value = this.ambience;
    const schedule = (): void => {
      if (!this.context || !this.graph) return;
      // Scheduling one full phrase avoids timer jitter; buffers stop on a scene change.
      if (this.nextTime < this.context.currentTime + 2) {
        this.graph.schedule(this.nextPhrase++, this.nextTime);
        this.nextTime += phraseDuration(SOUND_PALETTES[id]);
      }
    };
    schedule();
    this.timer = setInterval(schedule, 750);
  }
  dispose(): void {
    this.revision++;
    this.buildRevision++;
    this.buffers.clear();
    this.graphPainting = null;
    document.removeEventListener('visibilitychange', this.visibility);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.graph?.dispose();
    this.graph = null;
    for (const [graph, timer] of this.retired) {
      clearTimeout(timer);
      graph.dispose();
    }
    this.retired.clear();
    this.master?.disconnect();
    this.master = null;
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.enabled = false;
  }
}

export function encodeWav(channels: readonly Float32Array[], sampleRate: number): Blob {
  if (!channels.length || channels.some((channel) => channel.length !== channels[0]!.length))
    throw new Error('音频声道长度不一致');
  const frames = channels[0]!.length;
  const buffer = new ArrayBuffer(44 + frames * channels.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string): void => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels.length * 2, true);
  view.setUint16(32, channels.length * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, buffer.byteLength - 44, true);
  let offset = 44;
  for (let i = 0; i < frames; i++)
    for (const channel of channels) {
      const value = Math.max(-1, Math.min(1, channel[i]!));
      view.setInt16(offset, Math.round(value * (value < 0 ? 32768 : 32767)), true);
      offset += 2;
    }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Same score and sound field as the live scene, suitable for video muxing. */
export async function renderSoundtrack(
  id: PaintingId,
  duration: number,
  sampleRate = 48000,
  mix: Partial<SoundMix> = {},
): Promise<Blob> {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 600)
    throw new RangeError('音轨时长须在 0 至 600 秒之间');
  if (![22050, 44100, 48000].includes(sampleRate)) throw new RangeError('不支持的采样率');
  const context = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
  const graph = buildGraph(context, id, context.destination, 0);
  graph.music.gain.value = clamp(mix.music ?? 0.72);
  graph.ambience.gain.value = clamp(mix.ambience ?? 0.85);
  const length = phraseDuration(SOUND_PALETTES[id]);
  for (let i = 0; i * length < duration; i++) graph.schedule(i, i * length);
  const fadeIn = Math.min(1.5, duration / 4);
  graph.output.gain.cancelScheduledValues(0);
  graph.output.gain.setValueAtTime(0, 0);
  graph.output.gain.linearRampToValueAtTime(0.7, fadeIn);
  graph.output.gain.setValueAtTime(0.7, Math.max(fadeIn, duration - 1.8));
  graph.output.gain.linearRampToValueAtTime(0, duration);
  try {
    const result = await context.startRendering();
    return encodeWav(
      Array.from({ length: result.numberOfChannels }, (_, i) => result.getChannelData(i)),
      sampleRate,
    );
  } finally {
    graph.dispose();
  }
}
