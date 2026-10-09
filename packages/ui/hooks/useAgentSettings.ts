import { useCallback, useEffect, useRef, useState } from 'react';
import { getItem, setItem } from '../utils/storage';

const COOKIE_KEY = 'plannotator.agents';
const BUILTIN_DEFAULT_PROFILE = 'builtin:default';

const settingsListeners = new Set<(settings: AgentSettingsState) => void>();

export type AgentMode = 'review' | 'tour' | 'guide';
export type AgentEngine = 'pi';
export type ReviewEngine = 'pi';

interface AgentSettingsState {
  selectedMode: AgentMode;
  reviewProfileId: string;
  piModel: string;
  piThinking: string;
  guidePiModel: string;
  guidePiThinking: string;
}

const initialState: AgentSettingsState = {
  selectedMode: 'review',
  reviewProfileId: BUILTIN_DEFAULT_PROFILE,
  piModel: '',
  piThinking: 'medium',
  guidePiModel: '',
  guidePiThinking: 'medium',
};

export function parseAgentSettings(raw: string | null): AgentSettingsState {
  if (!raw) return initialState;
  try {
    const parsed = JSON.parse(raw);
    const mode = parsed.selectedMode;
    return {
      selectedMode: mode === 'review' || mode === 'tour' || mode === 'guide' ? mode : initialState.selectedMode,
      reviewProfileId: typeof parsed.reviewProfileByEngine?.pi === 'string'
        ? parsed.reviewProfileByEngine.pi
        : typeof parsed.reviewProfileId === 'string'
          ? parsed.reviewProfileId
          : BUILTIN_DEFAULT_PROFILE,
      piModel: typeof parsed.piModel === 'string' ? parsed.piModel : typeof parsed.pi?.model === 'string' ? parsed.pi.model : '',
      piThinking: typeof parsed.piThinking === 'string' ? parsed.piThinking : typeof parsed.pi?.thinking === 'string' ? parsed.pi.thinking : 'medium',
      guidePiModel: typeof parsed.guidePiModel === 'string' ? parsed.guidePiModel : typeof parsed.guidePi?.model === 'string' ? parsed.guidePi.model : '',
      guidePiThinking: typeof parsed.guidePiThinking === 'string' ? parsed.guidePiThinking : typeof parsed.guidePi?.thinking === 'string' ? parsed.guidePi.thinking : 'medium',
    };
  } catch {
    return initialState;
  }
}

function readCookie(): AgentSettingsState {
  return parseAgentSettings(getItem(COOKIE_KEY));
}

export function useAgentSettings() {
  const [state, setState] = useState<AgentSettingsState>(readCookie);
  const lastSyncedJsonRef = useRef<string | null>(null);
  const ownListenerRef = useRef<((settings: AgentSettingsState) => void) | null>(null);

  useEffect(() => {
    const listener = (next: AgentSettingsState) => {
      lastSyncedJsonRef.current = JSON.stringify(next);
      setState(next);
    };
    ownListenerRef.current = listener;
    settingsListeners.add(listener);
    return () => {
      settingsListeners.delete(listener);
      ownListenerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const json = JSON.stringify(state);
    if (json === lastSyncedJsonRef.current) return;
    lastSyncedJsonRef.current = json;
    setItem(COOKIE_KEY, json);
    for (const listener of settingsListeners) {
      if (listener !== ownListenerRef.current) listener(state);
    }
  }, [state]);

  const update = useCallback((patch: Partial<AgentSettingsState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  return {
    ...state,
    setSelectedMode: (selectedMode: AgentMode) => update({ selectedMode }),
    setReviewProfileId: (reviewProfileId: string) => update({ reviewProfileId }),
    setPiModel: (piModel: string) => update({ piModel }),
    setPiThinking: (piThinking: string) => update({ piThinking }),
    setGuidePiModel: (guidePiModel: string) => update({ guidePiModel }),
    setGuidePiThinking: (guidePiThinking: string) => update({ guidePiThinking }),
  };
}
