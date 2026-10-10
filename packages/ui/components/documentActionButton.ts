const BASE =
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors';
const REST = 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground';
const ON = 'bg-primary text-primary-foreground';

/** Shared chrome for the document action bar (plan review + HTML review).
 *  `active` paints the pressed/on state (diff toggle, open attachments,
 *  open global comment); the resting chip is identical either way. `extra`
 *  carries per-surface additive utilities only (e.g. `cursor-pointer`). */
export function documentActionButtonClass(active = false, extra = ''): string {
  return [BASE, active ? ON : REST, extra].filter(Boolean).join(' ');
}
