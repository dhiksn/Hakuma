import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface TagBadgeProps {
  tag: string;
  count?: number | null;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function TagBadge({
  tag,
  count,
  className = '',
  onClick,
  selected = false,
}: TagBadgeProps) {
  const content = (
    <Badge
      variant={selected ? 'solid' : 'default'}
      className={`cursor-pointer transition-all hover:border-white/50 ${
        selected ? 'bg-white text-black font-semibold' : 'bg-neutral-950 text-neutral-300 border-white/15'
      } ${className}`}
      onClick={onClick}
    >
      <span>{tag}</span>
      {count !== undefined && count !== null && (
        <span className={`ml-1 font-mono text-[9px] ${selected ? 'text-neutral-700' : 'text-neutral-500'}`}>
          ({count})
        </span>
      )}
    </Badge>
  );

  if (onClick) {
    return content;
  }

  return (
    <Link href={`/tags/${encodeURIComponent(tag.trim())}`}>
      {content}
    </Link>
  );
}
