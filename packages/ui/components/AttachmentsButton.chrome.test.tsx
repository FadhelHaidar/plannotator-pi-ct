import { afterEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const hasDom = typeof document !== 'undefined';
const buttonModule = hasDom ? await import('./AttachmentsButton') : null;
// SAFETY: The suite is skipped without a DOM; every executed test therefore
// has the real module loaded before it renders.
const AttachmentsButton = buttonModule?.AttachmentsButton as typeof import('./AttachmentsButton')['AttachmentsButton'];

let root: Root | null = null;
let host: HTMLElement | null = null;

async function mount(variant: 'toolbar' | 'inline'): Promise<HTMLButtonElement> {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <AttachmentsButton
        images={[]}
        onAdd={() => {}}
        onRemove={() => {}}
        variant={variant}
      />,
    );
  });
  const trigger = host.querySelector<HTMLButtonElement>('button[title="Attachments"]');
  if (!trigger) throw new Error('Expected attachments trigger');
  return trigger;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host = null;
  if (hasDom) document.body.replaceChildren();
});

describe.if(hasDom)('AttachmentsButton chrome', () => {
  test('toolbar variant sits on the action-bar chip and turns accent while open', async () => {
    const trigger = await mount('toolbar');
    expect(trigger.classList.contains('bg-muted/50')).toBe(true);
    expect(trigger.classList.contains('bg-primary')).toBe(false);
    expect(trigger.classList.contains('px-2.5')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    await act(async () => trigger.click());
    expect(trigger.classList.contains('bg-primary')).toBe(true);
    expect(trigger.classList.contains('bg-muted/50')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    await act(async () => trigger.click());
    expect(trigger.classList.contains('bg-primary')).toBe(false);
    expect(trigger.classList.contains('bg-muted/50')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  test('inline variant keeps the flat composer-footer chrome', async () => {
    const trigger = await mount('inline');
    expect(trigger.classList.contains('bg-muted/50')).toBe(false);
    expect(trigger.classList.contains('bg-primary')).toBe(false);
    expect(trigger.classList.contains('px-2')).toBe(true);
    expect(trigger.classList.contains('hover:bg-muted/50')).toBe(true);
  });
});
