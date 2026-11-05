'use client';

import Image from 'next/image';
import { useState } from 'react';

export function StayThumbnail({ url, name }: { url: string | null; name: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || !/^https?:\/\//i.test(url) || failedUrl === url) return null;

  return (
    <div className="trip-card-photo">
      <Image
        src={url}
        alt={name}
        width={640}
        height={360}
        unoptimized
        onError={() => setFailedUrl(url)}
      />
    </div>
  );
}
