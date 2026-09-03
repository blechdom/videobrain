import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { NodeParameterControls } from '../src/components/NodeParameterControls';
import {
  getDefaultParams,
  getOperatorDefinition,
  type GraphParamValue,
} from '../src/graph';
import './catalog.css';

type ParameterProps = Parameters<typeof NodeParameterControls>[0];

function StatefulParameters({ definition, nodeId, params }: ParameterProps) {
  const [values, setValues] = useState<Record<string, GraphParamValue>>(() => ({ ...params }));
  const [gesture, setGesture] = useState('Ready for input');

  return (
    <section className="vb-story vb-story--narrow">
      <div>
        <h1>{definition.title} parameters</h1>
        <p className="vb-story-intro">
          This is the same metadata-driven control surface rendered inside a graph node.
          Numeric values are sliders; finite choices remain compact selects.
        </p>
      </div>
      <div
        className="vb-inline-control-frame"
        style={{ '--node-accent': definition.domain === 'control' ? 'var(--acid)' : 'var(--cyan)' } as React.CSSProperties}
      >
        <NodeParameterControls
          nodeId={nodeId}
          definition={definition}
          params={values}
          onParamChange={(_changedNodeId, paramId, value) => {
            setValues((current) => ({ ...current, [paramId]: value }));
            setGesture(`${paramId} = ${String(value)}`);
          }}
          onGestureStart={() => setGesture('Editing one undo gesture')}
          onGestureEnd={() => setGesture('Gesture committed')}
        />
      </div>
      <output className="vb-story-event" aria-live="polite">{gesture}</output>
    </section>
  );
}

const flowDefinition = getOperatorDefinition('plasma');

const meta = {
  title: 'Controls/Inline Node Parameters',
  component: NodeParameterControls,
  tags: ['autodocs'],
  render: (args) => <StatefulParameters {...args} />,
  args: {
    nodeId: 'field-story',
    definition: flowDefinition,
    params: getDefaultParams('plasma'),
    onParamChange: () => undefined,
    onGestureStart: () => undefined,
    onGestureEnd: () => undefined,
  },
  argTypes: {
    nodeId: { control: false },
    definition: { control: false },
    onParamChange: { table: { disable: true } },
    onGestureStart: { table: { disable: true } },
    onGestureEnd: { table: { disable: true } },
    onSelect: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: 'The production inline parameter renderer used by graph nodes. It derives every control from the operator registry and never owns graph state.',
      },
    },
  },
} satisfies Meta<typeof NodeParameterControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NumericSliders: Story = {};

export const MixedParameters: Story = {
  args: {
    nodeId: 'oscillator-story',
    definition: getOperatorDefinition('oscillator'),
    params: getDefaultParams('oscillator'),
  },
};

export const TwoAxisPad: Story = {
  args: {
    nodeId: 'xy-pad-story',
    definition: getOperatorDefinition('xyPad'),
    params: getDefaultParams('xyPad'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Drag anywhere in the pad to edit X and Y together, or use the native axis sliders for precise independent changes. The pad supports arrow keys, with Shift for coarser steps.',
      },
    },
  },
};

export const EnumeratedParameters: Story = {
  args: {
    nodeId: 'camera-story',
    definition: getOperatorDefinition('videoInput'),
    params: getDefaultParams('videoInput'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Changing these presentation choices only updates local story state; no camera permission is requested.',
      },
    },
  },
};

export const BoundaryValues: Story = {
  args: {
    nodeId: 'warp-story',
    definition: getOperatorDefinition('warp'),
    params: {
      amount: 0,
      frequency: 20,
      speed: -3,
    },
  },
};
