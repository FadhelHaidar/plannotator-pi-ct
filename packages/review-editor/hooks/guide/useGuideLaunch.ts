import type { AgentCapabilities } from '@plannotator/ui/types';
import type { AgentLaunchParams } from '@plannotator/ui/hooks/useAgentJobs';
import { useAgentSettings } from '@plannotator/ui/hooks/useAgentSettings';
import type { ReviewEngine } from '@plannotator/ui/hooks/useAgentSettings';
import { REVIEW_ENGINE_LABEL } from '@plannotator/ui/components/AgentsTab';

export const GUIDE_ENGINES = Object.keys(REVIEW_ENGINE_LABEL) as ReviewEngine[];

export type GuideModelOption = { value: string; label: string };

export interface GuideLaunchState {
  settings: ReturnType<typeof useAgentSettings>;
  guideAvailable: boolean;
  availableEngines: ReviewEngine[];
  engine: ReviewEngine;
  piOptions: GuideModelOption[];
  effectivePiModel: string;
  canLaunch: boolean;
  buildParams: (instructions?: string) => AgentLaunchParams;
}

export function useGuideLaunch(
  capabilities: AgentCapabilities | null,
  _options: { loadModels?: boolean } = {},
): GuideLaunchState {
  const settings = useAgentSettings();
  const guideAvailable = capabilities?.providers.some((provider) => provider.id === 'guide' && provider.available) ?? false;
  const piAvailable = capabilities?.providers.some((provider) => provider.id === 'pi' && provider.available) ?? false;
  const models = capabilities?.providers.find((provider) => provider.id === 'pi')?.models ?? [];
  const piOptions = [
    { value: '', label: 'Default' },
    ...models.map((model) => ({ value: model.id, label: model.label })),
  ];
  const effectivePiModel = piOptions.some((option) => option.value === settings.guidePiModel)
    ? settings.guidePiModel
    : '';
  const availableEngines: ReviewEngine[] = piAvailable ? ['pi'] : [];
  const engine: ReviewEngine = 'pi';

  const buildParams = (instructions?: string): AgentLaunchParams => ({
    provider: 'guide',
    label: 'Guided Review',
    engine: 'pi',
    ...(effectivePiModel ? { model: effectivePiModel } : {}),
    thinking: settings.guidePiThinking,
    ...(instructions?.trim() ? { instructions: instructions.trim() } : {}),
  });

  return {
    settings,
    guideAvailable,
    availableEngines,
    engine,
    piOptions,
    effectivePiModel,
    canLaunch: guideAvailable && piAvailable,
    buildParams,
  };
}
