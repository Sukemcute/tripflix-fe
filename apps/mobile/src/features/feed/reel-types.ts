import type { ReelPlayback } from '@tripflix/app-core';
import type { FeedCardDto } from '@tripflix/api-client/core-api/model/index';

export interface ReelItem {
  id: string;
  title: string;
  body?: string;
  postId?: string;
  playback: ReelPlayback;
  social?: Pick<FeedCardDto, 'author' | 'counts' | 'viewerState'>;
}
