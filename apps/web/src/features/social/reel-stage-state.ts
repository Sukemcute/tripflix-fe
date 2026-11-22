export type ReelStageState = 'loading' | 'error' | 'empty' | 'ready';

export function getReelStageState({
  isSessionReady,
  isListPending,
  isSwitchingMode,
  hasError,
  hasPost,
}: {
  isSessionReady: boolean;
  isListPending: boolean;
  isSwitchingMode: boolean;
  hasError: boolean;
  hasPost: boolean;
}): ReelStageState {
  if (!isSessionReady || isListPending || isSwitchingMode) return 'loading';
  if (hasError) return 'error';
  return hasPost ? 'ready' : 'empty';
}
