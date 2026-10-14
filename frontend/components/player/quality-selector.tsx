'use client';

import React from 'react';
import { PlayerSource } from '@/types/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QualitySelectorProps {
  sources: PlayerSource[];
  activeSource: PlayerSource | null;
  onSelect: (source: PlayerSource) => void;
}

export function QualitySelector({
  sources,
  activeSource,
  onSelect,
}: QualitySelectorProps) {
  if (sources.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px] text-white hover:bg-white/20"
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="font-mono">{activeSource?.quality || 'Kualitas'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px] bg-black border-white/20">
        {sources.map((src) => {
          const isSelected = activeSource?.url === src.url;
          return (
            <DropdownMenuItem
              key={src.url || src.quality}
              onClick={() => onSelect(src)}
              className="flex items-center justify-between text-xs cursor-pointer py-1.5 focus:bg-white focus:text-black"
            >
              <span className="font-mono">{src.quality}</span>
              {isSelected && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
