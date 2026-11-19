import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ModerationPartsEvidence } from './moderation-parts';
import type { ModerationPartsDto } from '@tripflix/api-client/core-api/model/index';
vi.stubGlobal('React', React);
it('separates caption, image verdicts and retryable failures without claiming failed scans are clean', () => {
  const base = {
    id: 'part',
    kind: 'image' as const,
    assetId: 'asset',
    mediaKind: 'image' as const,
    text: null,
    previewUrl: null,
    attempts: 8,
    model: 'qa-model',
    categories: {},
    scores: {},
    errorCode: null,
    updatedAt: null,
  };
  const data: ModerationPartsDto = {
    contentVersion: 'v1:test',
    imagePolicy: 'review_only',
    items: [
      { ...base, id: 'caption', kind: 'caption', text: 'Nội dung caption', status: 'passed' },
      {
        ...base,
        id: 'image1',
        status: 'flagged',
        categories: { violence: true },
        scores: { violence: 0.92 },
      },
      { ...base, id: 'image2', status: 'failed', errorCode: 'provider_timeout' },
      { ...base, id: 'poster', mediaKind: 'video', status: 'waiting' },
    ],
  };
  const html = renderToStaticMarkup(<ModerationPartsEvidence data={data} onRetry={() => {}} />);
  for (const label of [
    'Nội dung caption',
    'Ảnh 1',
    'Ảnh 2',
    'Cần xem xét',
    'Bạo lực',
    '92%',
    'Quét thất bại',
    'AI phản hồi quá thời gian.',
    'Thử quét lại',
    'Poster video',
    'Chờ media sẵn sàng',
  ])
    expect(html).toContain(label);
  expect(html.match(/Chưa phát hiện vi phạm/g)).toHaveLength(1);
  expect(html.match(/Thử quét lại/g)).toHaveLength(1);
});
