import { readPublicAsset } from '@tripflix/api-client';

const assetCache = new Map<string, Promise<string>>();

function assetDataUrl(url: string): Promise<string> {
  let cached = assetCache.get(url);
  if (!cached) {
    cached = readPublicAsset(url)
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }),
      );
    assetCache.set(url, cached);
    void cached.catch(() => assetCache.delete(url));
  }
  return cached;
}

/** Chỉ tạo texture trong bộ nhớ trình duyệt; không gửi nội dung cuộc trò chuyện đi đâu. */
export async function snapshotChatPanel(panel: HTMLElement): Promise<HTMLCanvasElement> {
  const pending: Promise<unknown>[] = [];
  const viewport = panel.getBoundingClientRect();
  const cloneElement = (source: Element): Element => {
    const clone = source.cloneNode(false) as HTMLElement | SVGElement;
    const computed = getComputedStyle(source);
    for (const property of computed) clone.style.setProperty(property, computed.getPropertyValue(property));
    const rect = source.getBoundingClientRect();
    const outside =
      source instanceof HTMLElement &&
      rect.height > 0 &&
      (rect.bottom < viewport.top || rect.top > viewport.bottom);
    for (const child of outside ? [] : source.childNodes) {
      if (child instanceof Element) {
        if (child.tagName.toLowerCase() !== 'source') clone.appendChild(cloneElement(child));
      } else clone.appendChild(child.cloneNode(true));
    }
    if (source instanceof HTMLImageElement && clone instanceof HTMLImageElement) {
      clone.removeAttribute('srcset');
      clone.removeAttribute('sizes');
      clone.loading = 'eager';
      const url = source.currentSrc || source.src;
      if (url)
        pending.push(
          assetDataUrl(url)
            .then((data) => {
              clone.src = data;
            })
            .catch(() => {
              clone.removeAttribute('src');
            }),
        );
    }
    if (source instanceof HTMLTextAreaElement) clone.textContent = source.value;
    if (source instanceof HTMLInputElement) clone.setAttribute('value', source.value);
    if (source.scrollTop || source.scrollLeft) {
      for (const child of clone.children) {
        const style = (child as HTMLElement).style;
        const transform = style.transform === 'none' ? '' : style.transform;
        style.transform = `translate(${-source.scrollLeft}px, ${-source.scrollTop}px) ${transform}`;
      }
    }
    return clone;
  };

  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  const clone = cloneElement(panel) as HTMLElement;
  Object.assign(clone.style, {
    position: 'relative',
    left: '0',
    top: '0',
    right: 'auto',
    bottom: 'auto',
    margin: '0',
    width: `${width}px`,
    height: `${height}px`,
    transform: 'none',
    clipPath: 'none',
    opacity: '1',
    visibility: 'visible',
    boxShadow: 'none',
    animation: 'none',
  });
  const fonts = await Promise.all([
    assetDataUrl('/brand/regular.ttf'),
    assetDataUrl('/brand/bold.ttf'),
    ...pending,
  ]);
  const fontCss = `@font-face{font-family:'Be Vietnam Pro';src:url('${fonts[0]}');font-weight:400}@font-face{font-family:'Be Vietnam Pro';src:url('${fonts[1]}');font-weight:600 900}`;
  const markup = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${fontCss}</style>${markup}</div></foreignObject></svg>`;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.ceil(width * ratio);
  canvas.height = Math.ceil(height * ratio);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.getImageData(0, 0, 1, 1);
  return canvas;
}
