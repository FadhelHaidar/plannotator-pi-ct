import { afterEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const hasDom = typeof document !== 'undefined';
const hookModule = hasDom ? await import('./useAgentSettings') : null;
const storage = hasDom ? await import('../utils/storage') : null;
type Settings = ReturnType<NonNullable<typeof hookModule>['useAgentSettings']>;

const latest: Settings[] = [];
function Harness({ index }: { index: number }) {
  latest[index] = hookModule!.useAgentSettings();
  return null;
}

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  latest.length = 0;
  storage?.resetStorageBackend();
});

describe.if(hasDom)('useAgentSettings Pi persistence', () => {
  test('keeps review and guide choices separate and synchronizes mounted consumers', async () => {
    const memory = new Map<string, string>();
    storage!.setStorageBackend({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
    });
    storage!.setItem('plannotator.agents', JSON.stringify({
      pi: { model: 'review-model', thinking: 'high' },
      guidePi: { model: 'guide-model', thinking: 'low' },
    }));
    root = createRoot(document.createElement('div'));
    await act(async () => root!.render(<><Harness index={0} /><Harness index={1} /></>));
    expect(latest[0].piModel).toBe('review-model');
    expect(latest[1].guidePiModel).toBe('guide-model');

    await act(async () => latest[0].setPiThinking('medium'));
    expect(latest[1].piThinking).toBe('medium');
    expect(latest[1].guidePiThinking).toBe('low');
    await act(async () => latest[1].setGuidePiModel('new-guide'));
    expect(latest[0].guidePiModel).toBe('new-guide');
    expect(latest[0].piModel).toBe('review-model');
    expect(JSON.parse(memory.get('plannotator.agents')!)).toMatchObject({
      piThinking: 'medium', guidePiModel: 'new-guide', piModel: 'review-model',
    });
  });
});
