import { expect, test, type Locator, type Page } from '@playwright/test';

async function screenPointAtPathMidpoint(pathLocator: Locator) {
  return pathLocator.evaluate((element) => {
    const path = element as SVGPathElement;
    const matrix = path.getScreenCTM();
    if (!matrix) {
      throw new Error('Link does not have a screen transform.');
    }
    const point = path
      .getPointAtLength(path.getTotalLength() / 2)
      .matrixTransform(matrix);
    return { x: point.x, y: point.y };
  });
}

async function selectLink(page: Page, link: Locator) {
  const clickPoint = await screenPointAtPathMidpoint(
    link.locator('.react-flow__edge-interaction'),
  );
  await page.mouse.click(clickPoint.x, clickPoint.y);
  await expect(link).toHaveClass(/selected/);
}

async function cameraRequestCount(page: Page) {
  return page.evaluate(() =>
    Number(Reflect.get(window, '__videoBrainCameraRequestCount') ?? 0),
  );
}

async function connectHandles(source: Locator, target: Locator, page: Page) {
  const sourceBounds = await source.boundingBox();
  const targetBounds = await target.boundingBox();
  expect(sourceBounds).not.toBeNull();
  expect(targetBounds).not.toBeNull();

  await page.mouse.move(
    sourceBounds!.x + sourceBounds!.width / 2,
    sourceBounds!.y + sourceBounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBounds!.x + targetBounds!.width / 2,
    targetBounds!.y + targetBounds!.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
}

async function renderedColorSignal(page: Page) {
  return page.locator('canvas.preview-canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2');
    if (!gl || canvas.width < 1 || canvas.height < 1) {
      return 0;
    }

    const bounds = canvas.getBoundingClientRect();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + bounds.height / 2,
      }),
    );

    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(
      0,
      0,
      canvas.width,
      canvas.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    let maximumRgb = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      maximumRgb = Math.max(
        maximumRgb,
        pixels[index] ?? 0,
        pixels[index + 1] ?? 0,
        pixels[index + 2] ?? 0,
      );
    }
    return maximumRgb;
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const mediaDevices = navigator.mediaDevices;
    const originalGetUserMedia = mediaDevices?.getUserMedia.bind(mediaDevices);
    Reflect.set(window, '__videoBrainCameraRequestCount', 0);
    if (!mediaDevices || !originalGetUserMedia) {
      return;
    }
    Object.defineProperty(mediaDevices, 'getUserMedia', {
      configurable: true,
      value: (constraints: MediaStreamConstraints) => {
        if (constraints.video) {
          const current = Number(
            Reflect.get(window, '__videoBrainCameraRequestCount') ?? 0,
          );
          Reflect.set(window, '__videoBrainCameraRequestCount', current + 1);
        }
        return originalGetUserMedia(constraints);
      },
    });
  });
  await page.goto('/');
  await expect(page.getByText('Graph healthy')).toBeVisible();
});

test('boots a live GPU composition without permissions', async ({ page }) => {
  await expect(page.getByRole('region', { name: 'Live output' })).toBeVisible();
  await expect(page.getByText('running', { exact: true })).toBeVisible();
  const canvas = page.locator('canvas.preview-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-rendered', 'true');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-frame')))
    .toBeGreaterThan(1);
});

test('keeps inline values visible and edits the XY pad as one undo gesture', async ({
  page,
}) => {
  const timeNode = page.locator('article[aria-label="Time node"]');
  await expect(timeNode).not.toHaveClass(/selected/);
  await expect(
    timeNode.getByRole('slider', { name: 'Time Speed' }),
  ).toBeVisible();
  await expect(
    timeNode.getByRole('slider', { name: 'Time Offset' }),
  ).toBeVisible();

  const xyNode = page.locator('article[aria-label="XY Pad node"]');
  const pad = xyNode.getByRole('button', { name: 'XY Pad Position' });
  await expect(pad).toBeVisible();
  await expect(xyNode).toContainText('X 0.50 · Y 0.50');
  const bounds = await pad.boundingBox();
  expect(bounds).not.toBeNull();

  await page.mouse.move(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds!.x + bounds!.width * 0.8,
    bounds!.y + bounds!.height * 0.2,
    { steps: 8 },
  );
  await page.mouse.up();

  await expect(xyNode).toContainText('X 0.80 · Y 0.80');
  await expect(
    page.getByRole('complementary', { name: 'XY Pad inspector' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(xyNode).toContainText('X 0.50 · Y 0.50');
});

test('starts camera input only after opt-in and renders its live frame', async ({
  page,
}) => {
  await expect.poll(() => cameraRequestCount(page)).toBe(0);

  await page.getByTitle('Add Video Input').click();
  await expect(page.getByText(/13 nodes/).first()).toBeVisible();
  const inspector = page.getByRole('complementary', {
    name: 'Video Input inspector',
  });
  await expect(inspector).toBeVisible();
  await expect(inspector.getByText('Camera off', { exact: true })).toBeVisible();
  await expect.poll(() => cameraRequestCount(page)).toBe(0);

  const videoInputNode = page
    .locator('article[aria-label="Video Input node"]')
    .last();
  const inlineCamera = videoInputNode.getByRole('combobox', {
    name: 'Video Input Camera',
  });
  await inlineCamera.selectOption('environment');
  await expect(inspector.getByLabel('Camera')).toHaveValue('environment');
  await expect.poll(() => cameraRequestCount(page)).toBe(0);

  await inspector.getByRole('button', { name: 'Enable camera' }).click();
  await expect.poll(() => cameraRequestCount(page)).toBe(1);
  await expect(inspector.getByText('Camera live', { exact: true })).toBeVisible();
  await expect(
    page.locator('.preview-hud').getByText('camera', { exact: true }),
  ).toBeVisible();

  await inlineCamera.selectOption('user');
  await expect.poll(() => cameraRequestCount(page)).toBe(2);
  await expect(inspector.getByText('Camera live', { exact: true })).toBeVisible();
  await expect(inspector.getByLabel('Camera')).toHaveValue('user');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(inlineCamera).toHaveValue('environment');
  await expect(inspector.getByLabel('Camera')).toHaveValue('environment');
  await expect.poll(() => cameraRequestCount(page)).toBe(3);
  await expect(inspector.getByText('Camera live', { exact: true })).toBeVisible();

  const links = page.locator('[data-testid^="rf__edge-"]');
  await expect(links).toHaveCount(15);
  const initialLinkCount = await links.count();
  const previousDisplayLink = page.getByTestId('rf__edge-grade-display');
  await selectLink(page, previousDisplayLink);
  await page.keyboard.press('Delete');
  await expect(previousDisplayLink).toHaveCount(0);

  const source = videoInputNode.getByLabel('Frame output, frame.rgba');
  const target = page
    .locator('article[aria-label="Display node"]')
    .getByLabel('Source input, frame.rgba');
  await connectHandles(source, target, page);
  await expect(links).toHaveCount(initialLinkCount);
  await expect(page.locator('.preview-hud')).toContainText('2 passes');
  await expect(page.getByText('Graph healthy')).toBeVisible();

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('held', { exact: true })).toBeVisible();
  await expect
    .poll(() => renderedColorSignal(page), { timeout: 10_000 })
    .toBeGreaterThan(8);

  await videoInputNode.locator('.operator-node-header').click();
  await expect(inspector).toBeVisible();
  await inspector.getByRole('button', { name: 'Stop camera' }).click();
  await expect(inspector.getByText('Camera off', { exact: true })).toBeVisible();
  await expect(
    page.locator('.preview-hud').getByText('camera', { exact: true }),
  ).toHaveCount(0);
  await expect.poll(() => cameraRequestCount(page)).toBe(3);
  await expect
    .poll(() =>
      page.locator('video.video-input-element').evaluate(
        (video) => (video as HTMLVideoElement).srcObject === null,
      ),
    )
    .toBe(true);
  await expect(page.locator('canvas.preview-canvas')).toHaveAttribute(
    'data-rendered',
    'true',
  );
});

test('opens in-app help with current nodes, I/O guidance, and contribution link', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Help & about' }).click();
  const dialog = page.getByRole('dialog', { name: 'Build a live signal patch' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Two signal types, one graph')).toBeVisible();
  await expect(dialog.getByText('Video Input', { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole('heading', {
      name: 'Inputs, outputs, and device access',
    }),
  ).toBeVisible();
  await expect(dialog).toContainText('MIDI');
  await expect(dialog).toContainText('OSC');
  await expect(dialog).toContainText('explicit action');
  await expect(
    dialog.getByRole('link', { name: /Contribute on GitHub/ }),
  ).toHaveAttribute('href', 'https://github.com/blechdom/videobrain');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('adds, inspects, edits, and undoes a node', async ({ page }) => {
  await page.getByTitle('Add Flow Field').click();
  await expect(page.getByText(/13 nodes/).first()).toBeVisible();

  const addedNode = page.locator('article[aria-label="Flow Field node"]').last();
  await expect(page.getByRole('complementary', { name: 'Flow Field inspector' })).toBeVisible();

  const inlineScale = addedNode.getByRole('slider', { name: 'Flow Field Scale' });
  const inspectorScale = page
    .locator('.parameter-row')
    .filter({ hasText: 'Scale' })
    .locator('input');
  const before = Number(await inlineScale.inputValue());
  const nodePosition = await addedNode.evaluate(
    (element) => element.parentElement?.getAttribute('style'),
  );
  await inlineScale.focus();
  await inlineScale.press('ArrowRight');
  await expect
    .poll(async () => Number(await inlineScale.inputValue()))
    .toBeGreaterThan(before);
  await expect(inspectorScale).toHaveValue(await inlineScale.inputValue());
  await expect
    .poll(() =>
      addedNode.evaluate((element) => element.parentElement?.getAttribute('style')),
    )
    .toBe(nodePosition);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(inlineScale).toHaveValue(String(before));
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(/12 nodes/).first()).toBeVisible();
});

test('opens searchable node creation from the keyboard', async ({ page }) => {
  await page.keyboard.press('/');
  const dialog = page.getByRole('dialog', { name: 'Add a node' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Search nodes' }).fill('trail');
  await expect(dialog.getByRole('button', { name: /Trails/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('selects and deletes a link from the graph', async ({ page }) => {
  const links = page.locator('[data-testid^="rf__edge-"]');
  const initialLinkCount = await links.count();
  expect(initialLinkCount).toBeGreaterThan(0);

  const link = page.getByTestId('rf__edge-grade-display');
  await selectLink(page, link);

  await page.keyboard.press('Delete');
  await expect(links).toHaveCount(initialLinkCount - 1);
  await expect(page.locator('.graph-overlay')).toContainText(
    `${initialLinkCount - 1} links`,
  );
});

test('rewires a selected link to a compatible output', async ({ page }) => {
  const initialLinkCount = await page.locator('[data-testid^="rf__edge-"]').count();
  const link = page.getByTestId('rf__edge-field-blend');
  await selectLink(page, link);

  const updater = link.locator('.react-flow__edgeupdater-source');
  const destination = page
    .locator('article[aria-label="Cells node"]')
    .getByLabel('Frame output, frame.rgba');
  const updaterBounds = await updater.boundingBox();
  const destinationBounds = await destination.boundingBox();
  expect(updaterBounds).not.toBeNull();
  expect(destinationBounds).not.toBeNull();

  await page.mouse.move(
    updaterBounds!.x + updaterBounds!.width / 2,
    updaterBounds!.y + updaterBounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    destinationBounds!.x + destinationBounds!.width / 2,
    destinationBounds!.y + destinationBounds!.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();

  await expect(link).toHaveCount(0);
  await expect(
    page.getByRole('group', { name: 'Edge from cells to blend', exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-testid^="rf__edge-"]')).toHaveCount(initialLinkCount);
  await expect(page.getByText('Graph healthy')).toBeVisible();
});

test('explains why an incompatible link drop was rejected', async ({ page }) => {
  const source = page
    .locator('article[aria-label="Time node"]')
    .getByLabel('Time output, control.f32');
  const target = page
    .locator('article[aria-label="Warp node"]')
    .getByLabel('Source input, frame.rgba');
  const sourceBounds = await source.boundingBox();
  const targetBounds = await target.boundingBox();
  expect(sourceBounds).not.toBeNull();
  expect(targetBounds).not.toBeNull();

  await page.mouse.move(
    sourceBounds!.x + sourceBounds!.width / 2,
    sourceBounds!.y + sourceBounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBounds!.x + targetBounds!.width / 2,
    targetBounds!.y + targetBounds!.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();

  await expect(page.getByRole('alert')).toContainText(
    'Cannot connect control.f32 to frame.rgba.',
  );
});

test('autosaves project changes across reloads', async ({ page }) => {
  await page.getByTitle('Add Audio Level').click();
  await page.reload();
  await expect(page.getByText(/13 nodes/).first()).toBeVisible();
  await expect(page.getByText('Graph healthy')).toBeVisible();
  await expect(page.getByText('Signal Garden / saved')).toBeVisible();
});
