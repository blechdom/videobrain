import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  GRAPH_SCHEMA_VERSION,
  createGraphNode,
  type GraphDocument,
  type GraphNode,
} from '../graph';
import type {
  VideoModelRuntime,
  VideoModelSessionState,
} from '../hooks/useVideoModel';
import { Inspector } from './Inspector';

function createRuntime(
  state: VideoModelSessionState = 'idle',
  hasCredential = false,
): VideoModelRuntime {
  return {
    frames: new Map(),
    getSession: () => ({
      state,
      error: null,
      hasCredential,
      lastFrameAt: null,
    }),
    setCredential: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    resetAll: vi.fn(),
    generate: vi.fn().mockResolvedValue(undefined),
  };
}

function graphForNode(node: GraphNode | null): GraphDocument {
  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: node ? [node] : [],
    edges: [],
  };
}

function renderInspector(
  overrides: Partial<Parameters<typeof Inspector>[0]> = {},
) {
  const node =
    'node' in overrides
      ? (overrides.node ?? null)
      : createGraphNode('videoInput', { x: 0, y: 0 }, {}, 'camera-1');
  const props: Parameters<typeof Inspector>[0] = {
    node,
    audioInputState: 'demo',
    videoInputState: 'idle',
    videoInputError: null,
    videoFacingMode: 'user',
    onParamChange: vi.fn(),
    onGestureStart: vi.fn(),
    onGestureEnd: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onEnableMicrophone: vi.fn().mockResolvedValue(undefined),
    onDisableMicrophone: vi.fn(),
    onEnableCamera: vi.fn().mockResolvedValue(undefined),
    onDisableCamera: vi.fn(),
    ...overrides,
    graphDocument: overrides.graphDocument ?? graphForNode(node),
    videoModelRuntime: overrides.videoModelRuntime ?? createRuntime(),
  };
  render(createElement(Inspector, props));
  return props;
}

describe('video input inspector', () => {
  it('keeps permission opt-in and starts the persisted camera facing mode', async () => {
    const user = userEvent.setup();
    const props = renderInspector();

    expect(screen.getByText('Camera off')).toBeVisible();
    expect(screen.getByText(/permission is requested only/i)).toBeVisible();
    expect(props.onEnableCamera).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Enable camera' }));

    expect(props.onEnableCamera).toHaveBeenCalledWith('user');
  });

  it('sends camera changes through the shared parameter handler', async () => {
    const user = userEvent.setup();
    const onParamChange = vi.fn();
    const onEnableCamera = vi.fn().mockResolvedValue(undefined);
    const onDisableCamera = vi.fn();
    renderInspector({
      videoInputState: 'live',
      onParamChange,
      onEnableCamera,
      onDisableCamera,
    });

    await user.selectOptions(screen.getByLabelText('Camera'), 'environment');

    expect(onParamChange).toHaveBeenCalledWith('camera-1', 'facing', 'environment');
    expect(onEnableCamera).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Stop camera' }));
    expect(onDisableCamera).toHaveBeenCalledOnce();
  });

  it('surfaces a useful camera error and allows retry', () => {
    renderInspector({
      videoInputState: 'denied',
      videoInputError: 'Camera access was blocked for this site.',
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Camera access was blocked');
    expect(screen.getByRole('button', { name: 'Try camera again' })).toBeEnabled();
  });
});

describe('model and text inspectors', () => {
  it('labels preview mode as a procedural stand-in without connection controls', () => {
    const node = createGraphNode(
      'videoModel',
      { x: 0, y: 0 },
      { runtime: 'preview' },
      'model-1',
    );

    renderInspector({
      node,
      graphDocument: graphForNode(node),
      videoModelRuntime: createRuntime('preview'),
    });

    expect(screen.getByText('Local preview')).toBeVisible();
    expect(screen.getByText(/procedural stand-in/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument();
  });

  it('keeps API credentials session-only and delegates HTTP generation', async () => {
    const user = userEvent.setup();
    const runtime = createRuntime('idle');
    const node = createGraphNode(
      'videoModel',
      { x: 0, y: 0 },
      {
        runtime: 'api',
        transport: 'http',
        endpoint: 'https://models.example.test/generate',
      },
      'model-1',
    );

    renderInspector({
      node,
      graphDocument: graphForNode(node),
      videoModelRuntime: runtime,
    });

    await user.type(screen.getByLabelText('Session API key'), 'temporary-key');
    expect(runtime.setCredential).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Apply key' }));
    await user.click(screen.getByRole('button', { name: 'Generate' }));

    expect(runtime.setCredential).toHaveBeenLastCalledWith(
      'model-1',
      'temporary-key',
    );
    expect(runtime.generate).toHaveBeenCalledWith('model-1');
    expect(screen.getByText(/never saved in the graph/i)).toBeVisible();
  });

  it('warns when a connected Source is not the direct camera stream transport', () => {
    const source = createGraphNode('plasma', { x: 0, y: 0 }, {}, 'source-1');
    const node = createGraphNode(
      'videoModel',
      { x: 0, y: 0 },
      {
        runtime: 'local',
        transport: 'websocket',
        endpoint: 'ws://127.0.0.1:8189/live',
      },
      'model-1',
    );
    const graph: GraphDocument = {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      nodes: [source, node],
      edges: [
        {
          id: 'source-model',
          source: { nodeId: source.id, portId: 'frame' },
          target: { nodeId: node.id, portId: 'source' },
        },
      ],
    };

    renderInspector({ node, graphDocument: graph });

    expect(screen.getByText('Source is graph-local.')).toBeVisible();
    expect(
      screen.getByText(/only when a Video Input is connected directly/i),
    ).toBeVisible();
  });

  it('disables duplicate generation while keeping disconnect available', async () => {
    const user = userEvent.setup();
    const runtime = createRuntime('generating');
    const node = createGraphNode(
      'videoModel',
      { x: 0, y: 0 },
      {
        runtime: 'local',
        transport: 'websocket',
        endpoint: 'ws://127.0.0.1:8189/live',
      },
      'model-1',
    );

    renderInspector({
      node,
      graphDocument: graphForNode(node),
      videoModelRuntime: runtime,
    });

    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled();
    const disconnect = screen.getByRole('button', { name: 'Disconnect' });
    await user.click(disconnect);
    expect(runtime.disconnect).toHaveBeenCalledWith('model-1');
  });

  it('edits AI Chat prompt text through the shared parameter handler', () => {
    const node = createGraphNode('aiPrompt', { x: 0, y: 0 }, {}, 'prompt-1');
    const onParamChange = vi.fn();

    renderInspector({
      node,
      graphDocument: graphForNode(node),
      onParamChange,
    });

    const prompt = screen.getByRole('textbox', { name: /Prompt/ });
    fireEvent.change(prompt, { target: { value: 'A slow amber wave' } });

    expect(onParamChange).toHaveBeenLastCalledWith(
      'prompt-1',
      'text',
      'A slow amber wave',
    );
  });
});
