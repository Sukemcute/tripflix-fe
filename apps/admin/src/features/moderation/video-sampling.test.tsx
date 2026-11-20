import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import type { ModerationPartsDto } from '@tripflix/api-client/core-api/model/index';
import { frameTimestamp, VideoSamplingCoverage, ModerationPartsEvidence } from './moderation-parts';
vi.stubGlobal('React', React);
const base = {
  id: 'frame',
  kind: 'image' as const,
  assetId: 'video',
  mediaKind: 'video' as const,
  text: null,
  previewUrl: null,
  attempts: 1,
  model: 'qa',
  categories: {},
  scores: {},
  errorCode: null,
  updatedAt: null,
  modality: 'video_frame' as const,
  sampleDurationMs: 10000,
  sampleCount: 3,
  playbackUrl: 'https://cdn.test/master.m3u8',
};
const data: ModerationPartsDto = {
  contentVersion: 'v1:test',
  imagePolicy: 'review_only',
  items: [
    { ...base, id: 'a', timestampMs: 0, status: 'passed' },
    { ...base, id: 'b', timestampMs: 4950, status: 'flagged', categories: { violence: true } },
    { ...base, id: 'c', timestampMs: 9900, status: 'deferred' },
  ],
};
it('shows sampled coverage and never calls a partially scanned video clean', () => {
  const html = renderToStaticMarkup(<VideoSamplingCoverage data={data} />);
  expect(html).toContain('2/3 khung hình đã có kết quả');
  expect(html).toContain('4.95');
  expect(html).toContain('bỏ sót');
  expect(html).toContain('chữ chỉ được đọc trên ảnh bìa video');
  expect(html).not.toContain('100%');
});
it('shows poster OCR as its own review-only evidence with text and retryable error', () => {
  const html = renderToStaticMarkup(
    <ModerationPartsEvidence
      data={{
        ...data,
        items: [
          {
            ...base,
            id: 'cover-ocr',
            modality: 'video_cover_ocr',
            status: 'flagged',
            text: 'Chữ xúc phạm trên bìa',
            categories: { harassment: true },
          },
          {
            ...base,
            id: 'cover-ocr-failed',
            assetId: 'other-video',
            modality: 'video_cover_ocr',
            status: 'failed',
            errorCode: 'ocr_unavailable',
          },
        ],
      }}
      onRetry={() => {}}
    />,
  );
  expect(html).toContain('Chữ trên ảnh bìa video');
  expect(html).toContain('Chữ xúc phạm trên bìa');
  expect(html).toContain('Không đọc chữ ở các khung hình khác');
  expect(html).toContain('Chưa đọc được chữ trên ảnh bìa');
  expect(html).toContain('Thử quét lại');
});
it('shows the flagged middle timestamp, playback action and preserved retry state', () => {
  const html = renderToStaticMarkup(<ModerationPartsEvidence data={data} onRetry={() => {}} />);
  expect(html).toContain('0:04.950');
  expect(html).toContain('Xem video tại');
  expect(html).toContain('Cần xem xét');
  expect(html).toContain('Chờ thử lại');
  expect(frameTimestamp(125010)).toBe('2:05.010');
});
it('missing extraction results stay waiting rather than showing zero coverage as a clean result', () => {
  const html = renderToStaticMarkup(
    <VideoSamplingCoverage
      data={{
        ...data,
        items: [
          { ...base, modality: 'video_sampling', status: 'waiting', sampleDurationMs: null, sampleCount: 0 },
        ],
      }}
    />,
  );
  expect(html).toContain('Chưa có kết quả kiểm tra video');
  expect(html).not.toContain('0/0');
});
