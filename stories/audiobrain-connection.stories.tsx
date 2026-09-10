import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AudioBrainConnection } from '../src/components/AudioBrainConnection';
import { createProjectStore } from '../src/store/projectStore';

function PairingFixture() {
  const [store] = useState(() => {
    const next = createProjectStore({ storage: null });
    next.getState().addNode('xyPad', { x: 100, y: 100 });
    return next;
  });
  useEffect(() => () => store.dispose(), [store]);
  const peer = { postMessage: () => undefined, closed: false } as unknown as Window;
  return <div style={{ width: 780, minHeight: 600 }}><AudioBrainConnection store={store}
    pairing={{ origin: 'https://audiobrain.org', nonce: 'a'.repeat(48) }} peerWindow={peer}
    connector={options => {
      options.onStatus?.('connected');
      return { sendControl: () => false, dispose: () => options.onStatus?.('disconnected') };
    }} /></div>;
}
const meta = {
  title: 'Panels/AudioBrain connection', component: PairingFixture,
  parameters: { docs: { description: { component: 'Explicit channel mappings for a paired AudioBrain window. Incoming messages edit selected saved numeric literals; outgoing values are saved literals. This fixture uses a deterministic peer and never opens a window or network connection.' } } },
} satisfies Meta<typeof PairingFixture>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ReadyToPair: Story = {};
