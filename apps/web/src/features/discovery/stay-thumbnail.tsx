'use client';

import Image from 'next/image';
import { useState } from 'react';
import { StaySearchIcon } from './stay-search-icon';

export function StayThumbnail({ url, name }: { url: string | null; name: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || !/^https?:\/\//i.test(url) || failedUrl === url) {
    return (
      <div className="trip-card-photo" aria-hidden="true">
        <span className="flex h-full items-center justify-center text-teal-ink">
          <StaySearchIcon name="hotel" />
        </span>
      </div>
    );
  }

  return (
    <div className="trip-card-photo">
      <Image src={url} alt={name} width={640} height={360} unoptimized onError={() => setFailedUrl(url)} />
    </div>
  );
}
