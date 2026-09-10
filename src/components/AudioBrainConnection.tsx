import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { getOperatorDefinition } from '../graph';
import type { ProjectStoreApi } from '../store/projectStore';
import {
  AUDIOBRAIN_ORIGINS, connectMappedBrainParameters, readBrainPairing,
  type BrainBridge, type BrainBridgeStatus, type BrainPairing, type BrainParameterMapping,
} from '../integrations/brainBridge';
import './AudioBrainConnection.css';

interface Props {
  store: ProjectStoreApi;
  pairing?: BrainPairing | null;
  peerWindow?: Window | null;
  connector?: typeof connectMappedBrainParameters;
}
interface Row { id: number; channel: string; direction: 'in' | 'out'; target: string }
function opener(): Window | null {
  const candidate: unknown = window.opener;
  return candidate && typeof candidate === 'object' && 'postMessage' in candidate && typeof candidate.postMessage === 'function' ? candidate as Window : null;
}
/** Pairing is session-only and appears only for an explicitly opened companion window. */
export function AudioBrainConnection({ store, pairing: suppliedPairing, peerWindow: suppliedPeer, connector = connectMappedBrainParameters }: Props) {
  const [pairing] = useState(() => suppliedPairing === undefined ? readBrainPairing(window.location.hash, AUDIOBRAIN_ORIGINS) : suppliedPairing);
  const [peer] = useState(() => suppliedPeer === undefined ? opener() : suppliedPeer);
  if (!pairing || !peer || !(AUDIOBRAIN_ORIGINS as readonly string[]).includes(pairing.origin)) return null;
  return <AudioBrainMappingPanel store={store} pairing={pairing} peer={peer} connector={connector} />;
}
function AudioBrainMappingPanel({ store, pairing, peer, connector }: {
  store: ProjectStoreApi; pairing: BrainPairing; peer: Window; connector: typeof connectMappedBrainParameters;
}) {
  const document = useStore(store, state => state.document);
  const targets = useMemo(() => document.nodes.flatMap(node => Object.entries(getOperatorDefinition(node.kind).params)
    .filter(([, parameter]) => parameter.type === 'number')
    .map(([paramId, parameter]) => ({ key: JSON.stringify([node.id, paramId]), nodeId: node.id, paramId,
      label: `${getOperatorDefinition(node.kind).title} · ${parameter.label} (${node.id})` }))), [document]);
  const [rows, setRows] = useState<Row[]>([{ id: 1, channel: 'audiobrain-v1/value', direction: 'in', target: '' }]);
  const nextId = useRef(1);
  const bridge = useRef<BrainBridge | null>(null);
  const initialValues = useRef<{ nodeId: string; paramId: string; value: number }[]>([]);
  const mounted = useRef(true);
  const [status, setStatus] = useState<BrainBridgeStatus>('disconnected');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [canRestore, setCanRestore] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; bridge.current?.dispose(); };
  }, []);
  const active = status !== 'disconnected';
  const update = (id: number, patch: Partial<Row>) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  function disconnect() { bridge.current?.dispose(); bridge.current = null; setStatus('disconnected'); }
  function connect() {
    if (!pairing || !peer) return;
    try {
      const mappings: BrainParameterMapping[] = rows.map(row => {
        const target = targets.find(candidate => candidate.key === row.target);
        if (!target) throw new Error('Choose a numeric parameter for each mapping.');
        return { channel: row.channel, direction: row.direction, nodeId: target.nodeId, paramId: target.paramId };
      });
      if (!mappings.length) throw new Error('Add at least one parameter mapping.');
      disconnect(); setError('');
      initialValues.current = mappings.filter(mapping => mapping.direction === 'in').flatMap(mapping => {
        const value = store.getState().document.nodes.find(node => node.id === mapping.nodeId)?.params[mapping.paramId];
        return typeof value === 'number' ? [{ nodeId: mapping.nodeId, paramId: mapping.paramId, value }] : [];
      });
      setCanRestore(initialValues.current.length > 0);
      bridge.current = connector({ store, pairing, peerWindow: peer, mappings,
        onStatus(next) { if (mounted.current) setStatus(next); },
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not pair AudioBrain.'); }
  }
  function restore() {
    disconnect();
    store.getState().beginGesture();
    try {
      for (const initial of initialValues.current) {
        const node = store.getState().document.nodes.find(candidate => candidate.id === initial.nodeId);
        if (node && getOperatorDefinition(node.kind).params[initial.paramId]?.type === 'number') store.getState().setNodeParam(initial.nodeId, initial.paramId, initial.value);
      }
    } finally { store.getState().endGesture(); }
    setCanRestore(false);
  }
  return <section className="audiobrain-connection" aria-label="AudioBrain connection">
    <header>
      <button type="button" className="audiobrain-connection-toggle" aria-label={expanded ? 'Collapse AudioBrain connection' : 'Expand AudioBrain connection'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
        <strong>AudioBrain</strong><span role="status">{status === 'connected' ? 'Connected' : status === 'pairing' ? 'Pairing…' : 'Ready to pair'}</span>
        <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
    </header>
    {expanded && <div className="audiobrain-connection-body">
      <p>Map named controls with <strong>{pairing.origin}</strong>.</p>
      <p>Incoming values edit saved parameters. Outgoing values are the selected saved literals.</p>
      <div className="audiobrain-connection-mappings">
        {rows.map((row, index) => <fieldset key={row.id} disabled={active}>
          <legend>Mapping {index + 1}</legend>
          <label>Direction<select aria-label={`Mapping ${index + 1} direction`} value={row.direction} onChange={event => update(row.id, { direction: event.target.value as Row['direction'] })}>
            <option value="in">From AudioBrain</option><option value="out">To AudioBrain</option>
          </select></label>
          <label>Channel<input aria-label={`Mapping ${index + 1} channel`} maxLength={128} value={row.channel} onChange={event => update(row.id, { channel: event.target.value })} /></label>
          <label>Parameter<select aria-label={`Mapping ${index + 1} parameter`} value={row.target} onChange={event => update(row.id, { target: event.target.value })}>
            <option value="">Choose a numeric parameter</option>
            {targets.map(target => <option key={target.key} value={target.key}>{target.label}</option>)}
          </select></label>
          <button type="button" onClick={() => setRows(current => current.filter(candidate => candidate.id !== row.id))}>Remove mapping {index + 1}</button>
        </fieldset>)}
      </div>
      <div className="audiobrain-connection-actions">
        <button type="button" disabled={active || rows.length >= 8} onClick={() => { nextId.current += 1; setRows(current => [...current, { id: nextId.current, channel: 'audiobrain-v1/value', direction: 'out', target: '' }]); }}>Add mapping</button>
        {active ? <button type="button" onClick={disconnect}>Disconnect</button> : <button type="button" onClick={connect}>Pair AudioBrain</button>}
        {canRestore && <button type="button" onClick={restore}>Restore starting values</button>}
      </div>
      {error && <p role="alert" className="audiobrain-connection-error">{error}</p>}
      <p className="audiobrain-connection-note">Disconnect keeps the last values. Restore returns incoming parameters to their values before pairing.</p>
    </div>}
  </section>;
}
