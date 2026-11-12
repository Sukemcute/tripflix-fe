import { AssistantDialog } from '@/features/assistant/assistant-chat';
import { ReelsScreen } from '@/features/feed/reels-screen';

export default function ReelsRoute() {
  return (
    <>
      <ReelsScreen />
      <AssistantDialog />
    </>
  );
}
