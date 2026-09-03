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

test.beforeEach(async ({ page }) => {
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

test('adds, inspects, edits, and undoes a node', async ({ page }) => {
  await page.getByTitle('Add Flow Field').click();
  await expect(page.getByText(/12 nodes/).first()).toBeVisible();

  const addedNode = page.locator('article[aria-label="Flow Field node"]').last();
  await addedNode.click({ force: true });
  await expect(page.getByRole('complementary', { name: 'Flow Field inspector' })).toBeVisible();

  const scale = page.locator('.parameter-row').filter({ hasText: 'Scale' }).locator('input');
  const before = Number(await scale.inputValue());
  await scale.focus();
  await scale.press('ArrowRight');
  await expect.poll(async () => Number(await scale.inputValue())).toBeGreaterThan(before);

  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(/11 nodes/).first()).toBeVisible();
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
  await expect(page.getByText(/12 nodes/).first()).toBeVisible();
  await expect(page.getByText('Graph healthy')).toBeVisible();
  await expect(page.getByText('Signal Garden / saved')).toBeVisible();
});
