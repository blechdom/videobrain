import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { GraphEditor } from '../src/components/GraphEditor';
import {
  GRAPH_SCHEMA_VERSION,
  createGraphNode,
  validateConnection,
  type GraphDocument,
  type GraphEdge,
  type GraphEndpoint,
  type GraphParamValue,
  type GraphPosition,
} from '../src/graph';
import './catalog.css';

const edge = (
  id: string,
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
): GraphEdge => ({
  id,
  source: { nodeId: sourceNodeId, portId: sourcePortId },
  target: { nodeId: targetNodeId, portId: targetPortId },
});

function createStoryGraph(): GraphDocument {
  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: [
      createGraphNode('time', { x: 0, y: 30 }, {}, 'clock-story'),
      createGraphNode('plasma', { x: 285, y: 0 }, {}, 'field-story'),
      createGraphNode('colorGrade', { x: 585, y: 0 }, {}, 'grade-story'),
      createGraphNode('display', { x: 900, y: 80 }, {}, 'display-story'),
      createGraphNode('oscillator', { x: 0, y: 390 }, {}, 'idle-story'),
    ],
    edges: [
      edge('clock-field-story', 'clock-story', 'value', 'field-story', 'time'),
      edge('field-grade-story', 'field-story', 'frame', 'grade-story', 'source'),
      edge('grade-display-story', 'grade-story', 'frame', 'display-story', 'source'),
    ],
  };
}

function GraphFixture({ playing }: { playing: boolean }) {
  const [document, setDocument] = useState(createStoryGraph);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('field-story');
  const [event, setEvent] = useState('Tune a node, move it, or reconnect a compatible port.');
  const nextEdgeId = useRef(1);

  const moveNode = (nodeId: string, position: GraphPosition) => {
    setDocument((current) => ({
      ...current,
      nodes: current.nodes.map((node) => node.id === nodeId ? { ...node, position } : node),
    }));
  };

  const deleteNode = (nodeId: string) => {
    setDocument((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== nodeId),
      edges: current.edges.filter(
        (candidate) => candidate.source.nodeId !== nodeId && candidate.target.nodeId !== nodeId,
      ),
    }));
    setSelectedNodeId((current) => current === nodeId ? null : current);
  };

  const disconnect = (edgeId: string) => {
    setDocument((current) => ({
      ...current,
      edges: current.edges.filter((candidate) => candidate.id !== edgeId),
    }));
  };

  const connect = (source: GraphEndpoint, target: GraphEndpoint) => {
    const validation = validateConnection(document, source, target);
    if (validation.valid) {
      setDocument((current) => ({
        ...current,
        edges: [
          ...current.edges,
          { id: `story-edge-${nextEdgeId.current++}`, source, target },
        ],
      }));
      setEvent(`Connected ${source.nodeId} to ${target.nodeId}`);
    }
    return validation;
  };

  const changeParam = (nodeId: string, paramId: string, value: GraphParamValue) => {
    setDocument((current) => ({
      ...current,
      nodes: current.nodes.map((node) => node.id === nodeId
        ? { ...node, params: { ...node.params, [paramId]: value } }
        : node),
    }));
    setEvent(`${nodeId} · ${paramId} = ${String(value)}`);
  };

  return (
    <section className="vb-story">
      <div className="vb-graph-canvas">
        <GraphEditor
          document={document}
          selectedNodeId={selectedNodeId}
          playing={playing}
          onMoveNode={moveNode}
          onDeleteNode={deleteNode}
          onDisconnect={disconnect}
          onConnect={connect}
          onSelectNode={setSelectedNodeId}
          onParamChange={changeParam}
          onGestureStart={() => setEvent('Editing one undo gesture')}
          onGestureEnd={() => setEvent('Gesture committed')}
          onConnectionRejected={(message) => setEvent(message)}
        />
      </div>
      <output className="vb-story-event" aria-live="polite">{event}</output>
    </section>
  );
}

const meta = {
  title: 'Workspace/Graph Editor',
  component: GraphFixture,
  tags: ['autodocs'],
  args: {
    playing: true,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The production graph editor with a deterministic five-node fixture. It exercises typed ports, reachability, selection, movement, reconnection, and inline parameters without starting the GPU or any device.',
      },
    },
  },
} satisfies Meta<typeof GraphFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RunningPatch: Story = {};

export const PausedPatch: Story = {
  args: { playing: false },
};
