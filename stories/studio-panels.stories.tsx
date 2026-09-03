import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommandPalette as CommandPaletteComponent } from '../src/components/CommandPalette';
import { HelpDialog } from '../src/components/HelpDialog';
import { Inspector } from '../src/components/Inspector';
import { OperatorLibrary } from '../src/components/OperatorLibrary';
import {
  createGraphNode,
  type GraphNode,
  type GraphParamValue,
  type NodeKind,
} from '../src/graph';
import type { AudioInputState } from '../src/hooks/useAudioLevel';
import type {
  VideoFacingMode,
  VideoInputState,
} from '../src/hooks/useVideoInput';
import './catalog.css';

interface InspectorFixtureProps {
  kind?: NodeKind;
  audioState?: AudioInputState;
  videoState?: VideoInputState;
  videoError?: string | null;
  facingMode?: VideoFacingMode;
}

function InspectorFixture({
  kind,
  audioState = 'demo',
  videoState = 'idle',
  videoError = null,
  facingMode = 'user',
}: InspectorFixtureProps) {
  const [node, setNode] = useState<GraphNode | null>(() =>
    kind ? createGraphNode(kind, { x: 0, y: 0 }, {}, `${kind}-inspector`) : null,
  );
  const [currentAudioState, setCurrentAudioState] = useState(audioState);
  const [currentVideoState, setCurrentVideoState] = useState(videoState);
  const [currentFacingMode, setCurrentFacingMode] = useState(facingMode);

  const updateParam = (nodeId: string, paramId: string, value: GraphParamValue) => {
    if (
      paramId === 'facing' &&
      (value === 'user' || value === 'environment')
    ) {
      setCurrentFacingMode(value);
    }
    setNode((current) => current?.id === nodeId
      ? { ...current, params: { ...current.params, [paramId]: value } }
      : current);
  };

  return (
    <div className="vb-panel-frame">
      <Inspector
        node={node}
        audioInputState={currentAudioState}
        videoInputState={currentVideoState}
        videoInputError={videoError}
        videoFacingMode={currentFacingMode}
        onParamChange={updateParam}
        onGestureStart={() => undefined}
        onGestureEnd={() => undefined}
        onDelete={() => setNode(null)}
        onDuplicate={(source) => setNode({ ...source, id: `${source.id}-copy` })}
        onEnableMicrophone={() => {
          setCurrentAudioState('live');
          return Promise.resolve();
        }}
        onDisableMicrophone={() => setCurrentAudioState('demo')}
        onEnableCamera={(nextFacingMode) => {
          setCurrentFacingMode(nextFacingMode);
          setCurrentVideoState('live');
          return Promise.resolve();
        }}
        onDisableCamera={() => setCurrentVideoState('idle')}
      />
    </div>
  );
}

function LibraryFixture() {
  const [event, setEvent] = useState('No node added yet.');
  return (
    <section className="vb-story vb-story--narrow">
      <div className="vb-panel-frame">
        <OperatorLibrary onAdd={(kind) => setEvent(`Add ${kind}`)} />
      </div>
      <output className="vb-story-event" aria-live="polite">{event}</output>
    </section>
  );
}

function CommandPaletteFixture() {
  const [open, setOpen] = useState(true);
  const [event, setEvent] = useState('Search by node title, summary, or identifier.');
  return (
    <div className="vb-modal-story">
      <button type="button" className="primary-button vb-modal-reopen" onClick={() => setOpen(true)}>
        Open command palette
      </button>
      {open ? (
        <CommandPaletteComponent
          onAdd={(kind) => setEvent(`Selected ${kind}`)}
          onClose={() => setOpen(false)}
        />
      ) : null}
      <output className="vb-story-event" aria-live="polite">{event}</output>
    </div>
  );
}

function HelpFixture() {
  const [open, setOpen] = useState(true);
  return (
    <div className="vb-modal-story">
      <button type="button" className="primary-button vb-modal-reopen" onClick={() => setOpen(true)}>
        Open help
      </button>
      {open ? <HelpDialog onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

const meta = {
  title: 'Panels/Studio Panels',
  tags: ['autodocs'],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: 'Production panels in deterministic local-state fixtures. Device buttons simulate lifecycle changes and never call browser permission APIs.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyInspector: Story = {
  render: () => <InspectorFixture />,
};

export const NumericInspector: Story = {
  render: () => <InspectorFixture kind="plasma" />,
};

export const CameraOff: Story = {
  render: () => <InspectorFixture kind="videoInput" />,
};

export const CameraLive: Story = {
  render: () => <InspectorFixture kind="videoInput" videoState="live" />,
};

export const CameraBlocked: Story = {
  render: () => (
    <InspectorFixture
      kind="videoInput"
      videoState="denied"
      videoError="Camera access was blocked for this site."
    />
  ),
};

export const NodeLibrary: Story = {
  render: () => <LibraryFixture />,
};

export const CommandPalette: Story = {
  render: () => <CommandPaletteFixture />,
  parameters: { layout: 'fullscreen' },
};

export const HelpAndAbout: Story = {
  render: () => <HelpFixture />,
  parameters: { layout: 'fullscreen' },
};
