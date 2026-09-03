import {
  AudioWaveform,
  Blend,
  Clock3,
  Ghost,
  Grid3X3,
  Mic2,
  MonitorUp,
  MousePointer2,
  Palette,
  Sparkles,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { NodeKind, OperatorDomain } from '../graph';

interface OperatorMeta {
  accent: string;
  icon: LucideIcon;
  shortLabel: string;
}

export const DOMAIN_LABELS: Record<OperatorDomain, string> = {
  control: 'Signals',
  frame: 'Visuals',
  display: 'Outputs',
};
export const DOMAIN_ACCENTS: Record<OperatorDomain, string> = {
  control: '#d8ff5f',
  frame: '#65ddff',
  display: '#ff795c',
};

export const OPERATOR_META: Record<NodeKind, OperatorMeta> = {
  time: { accent: '#d8ff5f', icon: Clock3, shortLabel: 'Time' },
  oscillator: { accent: '#b8ef66', icon: AudioWaveform, shortLabel: 'LFO' },
  pointer: { accent: '#f2d65f', icon: MousePointer2, shortLabel: 'Pointer' },
  audioLevel: { accent: '#ffbd5f', icon: Mic2, shortLabel: 'Audio' },
  plasma: { accent: '#65ddff', icon: Sparkles, shortLabel: 'Field' },
  cells: { accent: '#70aaff', icon: Grid3X3, shortLabel: 'Cells' },
  warp: { accent: '#8d9cff', icon: Waves, shortLabel: 'Warp' },
  blend: { accent: '#a88cff', icon: Blend, shortLabel: 'Blend' },
  trails: { accent: '#df83ff', icon: Ghost, shortLabel: 'Trails' },
  colorGrade: { accent: '#ff80bb', icon: Palette, shortLabel: 'Grade' },
  display: { accent: '#ff795c', icon: MonitorUp, shortLabel: 'Display' },
};
