/// <reference path="../globals.d.ts" />
import type React from 'react';
/** Pi icon — extracted from apps/marketing/public/assets/icon-pi.svg */
export const PiIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" className={className}>
    <path fill="currentColor" fillRule="evenodd" d="M165.29 165.29H517.36V400H400V517.36H282.65V634.72H165.29ZM282.65 282.65V400H400V282.65Z"/>
    <path fill="currentColor" d="M517.36 400H634.72V634.72H517.36Z"/>
  </svg>
);

/** Generic fallback icon for unknown providers */
const GenericProviderIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M12 21a8.966 8.966 0 005.982-2.275M12 21a8.966 8.966 0 01-5.982-2.275M12 21V14.5" />
  </svg>
);

/** "Ask this session": a speech bubble, since the answer comes from the agent session itself. */
const SessionIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-7 6 2.5-3H18a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3z" />
  </svg>
);

/** Provider metadata: maps provider type name to display label and icon component. */
export const PROVIDER_META: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  'pi-sdk': { label: 'Pi', icon: PiIcon },
  'session-bridge': { label: 'Ask this session', icon: SessionIcon },
};

/**
 * Get provider metadata, with fallback for unknown providers. A server-sent
 * `label` (e.g. "Ask this session · Pi") overrides the name lookup.
 */
export function getProviderMeta(providerName: string, label?: string): { label: string; icon: React.FC<{ className?: string }> } {
  const meta = PROVIDER_META[providerName] ?? { label: providerName, icon: GenericProviderIcon };
  return label ? { ...meta, label } : meta;
}
