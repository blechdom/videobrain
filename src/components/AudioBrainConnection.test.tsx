import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectStore, type ProjectStoreApi } from '../store/projectStore';
import { AudioBrainConnection } from './AudioBrainConnection';
import { BRAIN_PROTOCOL } from '../integrations/brainBridge';

const nonce = 'a'.repeat(48);
const stores: ProjectStoreApi[] = [];
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); stores.splice(0).forEach(store => store.dispose()); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.useRealTimers(); });
function fixture() {
  const store = createProjectStore({ storage: null }); stores.push(store);
  const nodeId = store.getState().addNode('xyPad', { x: 100, y: 100 });
  const frame = document.createElement('iframe'); document.body.append(frame);
  const peer = frame.contentWindow; if (!peer) throw new Error('Missing fixture window');
  const post = vi.spyOn(peer, 'postMessage').mockImplementation(() => undefined);
  return { store, nodeId, peer, post, pairing: { origin: 'https://audiobrain.org', nonce } };
}
describe('AudioBrain companion panel', () => {
  it('stays hidden without an allowed pairing and opener', () => {
    const { store, pairing, peer } = fixture();
    const result = render(<AudioBrainConnection store={store} pairing={pairing} peerWindow={null} />);
    expect(screen.queryByRole('region', { name: 'AudioBrain connection' })).not.toBeInTheDocument();
    result.unmount();
    render(<AudioBrainConnection store={store} pairing={{ ...pairing, origin: 'https://attacker.example' }} peerWindow={peer} />);
    expect(screen.queryByRole('region', { name: 'AudioBrain connection' })).not.toBeInTheDocument();
  });
  it('requires an explicit mapping and pair action before sending any messages', () => {
    const { store, peer, pairing, post } = fixture();
    render(<AudioBrainConnection store={store} pairing={pairing} peerWindow={peer} />);
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Pair AudioBrain' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a numeric parameter');
    expect(post).not.toHaveBeenCalled();
  });
  it('controls the real store while collapsed and can disconnect and restore its initial literal', async () => {
    const { store, nodeId, peer, pairing, post } = fixture();
    render(<AudioBrainConnection store={store} pairing={pairing} peerWindow={peer} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Mapping 1 parameter' }), { target: { value: JSON.stringify([nodeId, 'x']) } });
    fireEvent.click(screen.getByRole('button', { name: 'Pair AudioBrain' }));
    expect(post).toHaveBeenCalledOnce();
    const receive = (type: string, seq: number, value?: number) => act(() => window.dispatchEvent(new MessageEvent('message', {
      source: peer, origin: pairing.origin,
      data: JSON.stringify({ protocol: BRAIN_PROTOCOL, session: nonce, seq, type, channel: 'audiobrain-v1/value', value }),
    })));
    await receive('hello', 1); await receive('control', 2, 0.9);
    expect(store.getState().document.nodes.find(node => node.id === nodeId)?.params.x).toBe(0.9);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse AudioBrain connection' }));
    expect(screen.queryByRole('combobox', { name: 'Mapping 1 parameter' })).not.toBeInTheDocument();
    await receive('control', 3, 0.7);
    expect(store.getState().document.nodes.find(node => node.id === nodeId)?.params.x).toBe(0.7);
    fireEvent.click(screen.getByRole('button', { name: 'Expand AudioBrain connection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    await receive('control', 4, 0.2);
    expect(store.getState().document.nodes.find(node => node.id === nodeId)?.params.x).toBe(0.7);
    fireEvent.click(screen.getByRole('button', { name: 'Restore starting values' }));
    expect(store.getState().document.nodes.find(node => node.id === nodeId)?.params.x).toBe(0.5);
  });
});

it('revokes the old grant when a reset remounts a project that reuses node IDs', async () => {
  const { store, nodeId, peer, pairing } = fixture();
  const result = render(<AudioBrainConnection key="initial" store={store} pairing={pairing} peerWindow={peer} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Mapping 1 parameter' }), { target: { value: JSON.stringify([nodeId, 'x']) } });
  fireEvent.click(screen.getByRole('button', { name: 'Pair AudioBrain' }));
  const receive = (type: string, seq: number, value?: number) => act(() => window.dispatchEvent(new MessageEvent('message', {
    source: peer, origin: pairing.origin,
    data: JSON.stringify({ protocol: BRAIN_PROTOCOL, session: nonce, seq, type, channel: 'audiobrain-v1/value', value }),
  })));
  await receive('hello', 1); await receive('control', 2, 0.9);
  expect(store.getState().document.nodes.find(node => node.id === nodeId)?.params.x).toBe(0.9);
  const replacement = structuredClone(store.getState().document);
  const target = replacement.nodes.find(node => node.id === nodeId); if (!target) throw new Error('Missing mapped node');
  target.params.x = 0.25;
  act(() => { store.getState().importProject(replacement); });
  result.rerender(<AudioBrainConnection key="replacement" store={store} pairing={pairing} peerWindow={peer} />);
  await receive('control', 3, 0.75);
  expect(store.getState().document.nodes.find(node => node.id === nodeId)?.params.x).toBe(0.25);
  expect(screen.getByRole('button', { name: 'Pair AudioBrain' })).toBeVisible();
  expect(screen.getByRole('combobox', { name: 'Mapping 1 parameter' })).toHaveValue('');
});
