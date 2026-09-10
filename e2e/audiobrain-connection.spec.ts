import { expect, test } from '@playwright/test';

interface HarnessState { peer: Window | null; seq: number; origin: string; nonce: string }
test('pairs a separate AudioBrain origin and controls the selected saved parameter', async ({ context, baseURL }) => {
  if (!baseURL) throw new Error('VideoBrain test origin is required.');
  const harnessUrl = 'http://127.0.0.1:5178/__brain-pairing-test';
  const nonce = 'a'.repeat(48);
  await context.route(harnessUrl, route => route.fulfill({ contentType: 'text/html', body: '<button id="open">Open VideoBrain</button>' }));
  const audio = await context.newPage(); await audio.goto(harnessUrl);
  const target = new URL(baseURL);
  target.hash = new URLSearchParams({ brainOrigin: new URL(harnessUrl).origin, brainNonce: nonce }).toString();
  await audio.evaluate(({ url, nonce }) => {
    const state: HarnessState = { peer: null, seq: 0, origin: new URL(url).origin, nonce };
    (window as unknown as { brainHarness: HarnessState }).brainHarness = state;
    window.addEventListener('message', event => {
      if (event.origin !== state.origin || event.source !== state.peer || typeof event.data !== 'string') return;
      const message = JSON.parse(event.data) as { type: string; session: string };
      if (message.type === 'hello' && message.session === nonce) state.peer?.postMessage(JSON.stringify({ protocol: 'brain.control.v1', session: nonce, seq: ++state.seq, type: 'ready' }), state.origin);
    });
    document.getElementById('open')!.onclick = () => { state.peer = window.open(url, '_blank'); };
  }, { url: target.href, nonce });
  const [video] = await Promise.all([audio.waitForEvent('popup'), audio.getByRole('button', { name: 'Open VideoBrain' }).click()]);
  const panel = video.getByRole('region', { name: 'AudioBrain connection' });
  await expect(panel).toBeVisible();
  const parameter = video.getByRole('slider', { name: 'XY Pad X', exact: true });
  const initialValue = await parameter.inputValue();
  await panel.getByRole('combobox', { name: 'Mapping 1 parameter' }).selectOption(JSON.stringify(['pad', 'x']));
  await panel.getByRole('button', { name: 'Pair AudioBrain' }).click();
  await expect(panel.getByRole('status')).toHaveText('Connected');
  const send = (value: number) => audio.evaluate(value => {
    const state = (window as unknown as { brainHarness: HarnessState }).brainHarness;
    state.peer?.postMessage(JSON.stringify({ protocol: 'brain.control.v1', session: state.nonce, seq: ++state.seq, type: 'control', channel: 'audiobrain-v1/value', value }), state.origin);
  }, value);
  await send(0.87); await expect(parameter).toHaveValue('0.87');
  await panel.getByRole('button', { name: 'Collapse AudioBrain connection' }).click();
  await send(0.37); await expect(parameter).toHaveValue('0.37');
  await panel.getByRole('button', { name: 'Expand AudioBrain connection' }).click();
  await panel.getByRole('button', { name: 'Disconnect' }).click();
  await send(0.9); await expect(parameter).toHaveValue('0.37');
  await panel.getByRole('button', { name: 'Restore starting values' }).click();
  await expect(parameter).toHaveValue(initialValue);
});
