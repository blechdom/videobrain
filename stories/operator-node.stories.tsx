import { useCallback, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
} from '@xyflow/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  OperatorNode,
  type OperatorFlowNode,
} from '../src/components/OperatorNode';
import {
  NODE_KINDS,
  getDefaultParams,
  type GraphParamValue,
  type NodeKind,
} from '../src/graph';
import './catalog.css';

const NODE_TYPES = { operator: OperatorNode };

interface NodeCanvasProps {
  kinds: readonly NodeKind[];
  selectedKind?: NodeKind;
  unreachableKinds?: readonly NodeKind[];
  compact?: boolean;
}

function NodeCanvas({
  kinds,
  selectedKind,
  unreachableKinds = [],
  compact = false,
}: NodeCanvasProps) {
  const initialSelectedId = selectedKind ? `${selectedKind}-0` : null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [paramsByNode, setParamsByNode] = useState<Record<string, Record<string, GraphParamValue>>>(() =>
    Object.fromEntries(kinds.map((kind, index) => [`${kind}-${index}`, getDefaultParams(kind)])),
  );
  const [gesture, setGesture] = useState('Select a node or tune an inline value.');

  const handleParamChange = useCallback(
    (nodeId: string, paramId: string, value: GraphParamValue) => {
      setParamsByNode((current) => ({
        ...current,
        [nodeId]: {
          ...current[nodeId],
          [paramId]: value,
        },
      }));
      setGesture(`${nodeId} · ${paramId} = ${String(value)}`);
    },
    [],
  );

  const nodes = useMemo<OperatorFlowNode[]>(
    () => kinds.map((kind, index) => {
      const id = `${kind}-${index}`;
      const columns = compact ? 1 : 4;
      return {
        id,
        type: 'operator',
        position: {
          x: (index % columns) * 285,
          y: Math.floor(index / columns) * 390,
        },
        selected: id === selectedId,
        data: {
          kind,
          params: paramsByNode[id] ?? getDefaultParams(kind),
          reachable: !unreachableKinds.includes(kind),
          onParamChange: handleParamChange,
          onGestureStart: () => setGesture('Editing one undo gesture'),
          onGestureEnd: () => setGesture('Gesture committed'),
          onSelect: () => setSelectedId(id),
        },
      };
    }),
    [compact, handleParamChange, kinds, paramsByNode, selectedId, unreachableKinds],
  );

  return (
    <section className="vb-story">
      <div className={`vb-node-canvas ${compact ? 'vb-node-canvas--compact' : ''}`}>
        <ReactFlow<OperatorFlowNode>
          nodes={nodes}
          edges={[]}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_event, node) => setSelectedId(node.id)}
          fitView
          fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
          minZoom={0.18}
          maxZoom={1.8}
          snapToGrid
          snapGrid={[12, 12]}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>
      <output className="vb-story-event" aria-live="polite">{gesture}</output>
    </section>
  );
}

const meta = {
  title: 'Nodes/Operator Node',
  component: NodeCanvas,
  tags: ['autodocs'],
  args: {
    kinds: NODE_KINDS,
    unreachableKinds: [],
    compact: false,
  },
  argTypes: {
    kinds: { control: false },
    selectedKind: { control: false },
    unreachableKinds: { control: false },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Real production OperatorNode instances hosted by React Flow. Ports, selection, reachability, selects, and inline sliders retain their live graph behavior.',
      },
    },
  },
} satisfies Meta<typeof NodeCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllNodeKinds: Story = {};

export const SelectedNode: Story = {
  args: {
    kinds: ['colorGrade'],
    selectedKind: 'colorGrade',
    compact: true,
  },
};

export const InactiveNode: Story = {
  args: {
    kinds: ['warp'],
    unreachableKinds: ['warp'],
    compact: true,
  },
};

export const SourcesAndOutput: Story = {
  args: {
    kinds: ['pointer', 'videoInput', 'display'],
  },
  parameters: {
    docs: {
      description: {
        story: 'Source, device-presentation, and terminal nodes shown together. The camera choices are local values only and never open a device.',
      },
    },
  },
};
