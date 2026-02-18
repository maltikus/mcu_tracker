import { cn } from '../lib/utils';

interface Props {
  src: string | null | undefined;
  alt: string;
  variant?: 'poster' | 'still';
  className?: string;
}

export const MediaThumb = ({ src, alt, variant = 'poster', className }: Props) => {
  const fallback =
    variant === 'poster'
      ? 'https://placehold.co/342x513?text=No+Poster'
      : 'https://placehold.co/780x439?text=No+Still';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl bg-slate-800/60',
        variant === 'poster' ? 'aspect-[2/3]' : 'aspect-video',
        className
      )}
    >
      <img
        src={src || fallback}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
};
