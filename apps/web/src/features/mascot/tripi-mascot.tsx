import Image from 'next/image';
import { TRIPI_ANIMATIONS, TRIPI_ASSETS, type TripiAnimation, type TripiPose } from './tripi-assets';

type TripiMascotProps = {
  pose?: TripiPose;
  animation?: TripiAnimation;
  size?: number;
  alt?: string;
  className?: string;
};

/** Animation chỉ phát khi người dùng không yêu cầu giảm chuyển động. */
export function TripiMascot({
  pose = 'expr-curious',
  animation,
  size = 148,
  alt,
  className,
}: TripiMascotProps) {
  const motion = animation ? TRIPI_ANIMATIONS[animation] : undefined;
  const asset = TRIPI_ASSETS[motion?.fallback ?? pose];

  return (
    <picture>
      {motion && (
        <source media="(prefers-reduced-motion: no-preference)" srcSet={motion.src} type="image/webp" />
      )}
      <Image
        src={asset.src}
        alt={alt ?? asset.label}
        width={size}
        height={size}
        className={className}
        style={{ objectFit: 'contain' }}
        unoptimized={Boolean(motion)}
      />
    </picture>
  );
}
