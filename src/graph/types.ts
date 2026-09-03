export const GRAPH_SCHEMA_VERSION = 1 as const;

export const NODE_KINDS = [
  'time',
  'oscillator',
  'pointer',
  'audioLevel',
  'videoInput',
  'plasma',
  'cells',
  'warp',
  'blend',
  'trails',
  'colorGrade',
  'display',
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

export type PortType = 'frame.rgba' | 'control.f32';

export type OperatorDomain = 'control' | 'frame' | 'display';

export type GraphParamValue = number | string | boolean;

export type GraphParams = Record<string, GraphParamValue>;

export interface GraphPosition {
  x: number;
  y: number;
}
export interface GraphNode {
  id: string;
  kind: NodeKind;
  position: GraphPosition;
  params: GraphParams;
}

export interface GraphEndpoint {
  nodeId: string;
  portId: string;
}

export interface GraphEdge {
  id: string;
  source: GraphEndpoint;
  target: GraphEndpoint;
}

export interface GraphDocument {
  schemaVersion: typeof GRAPH_SCHEMA_VERSION;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PortDefinition {
  id: string;
  label: string;
  type: PortType;
  optional?: boolean;
}

export interface NumberParamDefinition {
  type: 'number';
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

export interface SelectParamOption {
  value: string;
  label: string;
}

export interface SelectParamDefinition {
  type: 'select';
  label: string;
  defaultValue: string;
  options: readonly SelectParamOption[];
}

export type OperatorParamDefinition =
  | NumberParamDefinition
  | SelectParamDefinition;

export interface OperatorDefinition {
  kind: NodeKind;
  title: string;
  summary: string;
  domain: OperatorDomain;
  inputs: readonly PortDefinition[];
  outputs: readonly PortDefinition[];
  params: Readonly<Record<string, OperatorParamDefinition>>;
}
