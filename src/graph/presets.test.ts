import { describe, expect, it } from 'vitest';

import { compileGraph } from './compiler';
import { createDefaultGraph } from './defaultGraph';
import { NODE_KINDS } from './types';
import {
  GRAPH_PRESETS,
  createGraphPreset,
  getGraphPreset,
} from './presets';

describe('graph presets', () => {
  it('provides unique, discoverable preset metadata', () => {
    expect(GRAPH_PRESETS).toHaveLength(8);
    expect(new Set(GRAPH_PRESETS.map(({ id }) => id)).size).toBe(
      GRAPH_PRESETS.length,
    );
    expect(new Set(GRAPH_PRESETS.map(({ title }) => title)).size).toBe(
      GRAPH_PRESETS.length,
    );
    expect(getGraphPreset('blank').title).toBe('Blank Canvas');
  });

  it.each(GRAPH_PRESETS)('$title creates a valid graph', ({ id }) => {
    const document = createGraphPreset(id);
    const compiled = compileGraph(document);

    expect(compiled.document).toEqual(document);
    expect(
      document.nodes.every((node) => NODE_KINDS.includes(node.kind)),
    ).toBe(true);
    expect(new Set(document.nodes.map(({ id: nodeId }) => nodeId)).size).toBe(
      document.nodes.length,
    );
    expect(new Set(document.edges.map(({ id: edgeId }) => edgeId)).size).toBe(
      document.edges.length,
    );
  });

  it.each(
    GRAPH_PRESETS.filter(({ id }) => id !== 'blank'),
  )('$title has a complete visible frame path', ({ id }) => {
    const document = createGraphPreset(id);
    const compiled = compileGraph(document);

    expect(compiled.displayNodes).toHaveLength(1);
    expect(compiled.frameNodes.length).toBeGreaterThan(0);
    expect(compiled.reachableNodeIds.size).toBe(document.nodes.length);
  });

  it('keeps Blank Canvas truly empty', () => {
    const blank = createGraphPreset('blank');

    expect(blank.nodes).toEqual([]);
    expect(blank.edges).toEqual([]);
  });

  it('maps Full Studio to the built-in composition', () => {
    expect(createGraphPreset('full-studio')).toEqual(createDefaultGraph());
  });

  it('crossfades the complete range between both mixer sources', () => {
    const mixer = createGraphPreset('two-world-mixer');
    const oscillator = mixer.nodes.find(({ id }) => id === 'mixer-wave');
    const blend = mixer.nodes.find(({ id }) => id === 'mixer-blend');

    expect(oscillator?.params).toMatchObject({ amplitude: 1, offset: 0 });
    expect(blend?.params.mode).toBe('normal');
    expect(mixer.edges).toContainEqual(
      expect.objectContaining({
        source: { nodeId: 'mixer-wave', portId: 'value' },
        target: { nodeId: 'mixer-blend', portId: 'mix' },
      }),
    );
  });

  it('returns a fresh graph for every selection', () => {
    const first = createGraphPreset('pointer-bend');
    const second = createGraphPreset('pointer-bend');
    const firstNode = first.nodes[0];
    const secondNode = second.nodes[0];

    expect(first).not.toBe(second);
    expect(firstNode).toBeDefined();
    expect(secondNode).toBeDefined();
    if (!firstNode || !secondNode) {
      return;
    }

    firstNode.position.x = 999;
    expect(secondNode.position.x).not.toBe(999);
  });
});
