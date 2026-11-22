import { describe, expect, it } from 'vitest';
import { createTripPlanDraft } from './trip-plan';
import { parsePostDraftRecovery, type PostDraftRecovery } from './post-draft-recovery';

describe('device post draft recovery', () => {
  const saved: PostDraftRecovery = {
    version: 1,
    userId: 'owner',
    editorKey: 'new',
    postId: null,
    savedAt: 123,
    content: {
      title: 'Chuyến đi',
      body: 'Câu chuyện đang viết',
      hashtags: 'bien, cafe',
      visibility: 'private',
      hasTripPlan: true,
      tripDraft: createTripPlanDraft(),
      video: {
        uri: 'file:///temporary/video.mp4',
        durationMs: 12000,
        width: 720,
        height: 1280,
        mimeType: 'video/mp4',
        sizeBytes: 12345,
      },
    },
  };
  it('round trips all editable content, itinerary and media metadata without upload functions', () => {
    expect(parsePostDraftRecovery(JSON.stringify(saved), 'owner', 'new')).toEqual(saved);
  });
  it('never restores another account or another edited post', () => {
    expect(parsePostDraftRecovery(JSON.stringify(saved), 'other', 'new')).toBeNull();
    expect(parsePostDraftRecovery(JSON.stringify(saved), 'owner', 'post-2')).toBeNull();
    expect(
      parsePostDraftRecovery(
        JSON.stringify({ ...saved, editorKey: 'post-2', postId: 'post-other' }),
        'owner',
        'post-2',
      ),
    ).toBeNull();
  });
  it('rejects corrupt, obsolete and structurally unsafe drafts', () => {
    for (const raw of [
      '{',
      'null',
      JSON.stringify({ ...saved, version: 2 }),
      JSON.stringify({ ...saved, content: { ...saved.content, visibility: 'staff' } }),
      JSON.stringify({ ...saved, content: { ...saved.content, tripDraft: { days: null } } }),
      JSON.stringify({
        ...saved,
        content: { ...saved.content, tripDraft: { ...saved.content.tripDraft, days: [{ points: [null] }] } },
      }),
      JSON.stringify({ ...saved, content: { ...saved.content, video: { uri: 'file:///lost' } } }),
    ])
      expect(parsePostDraftRecovery(raw, 'owner', 'new')).toBeNull();
  });
});
