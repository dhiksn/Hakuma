export const CHANNELS = [
  { value: 'all', label: 'Semua Channel' },
  { value: 'media', label: 'Media' },
  { value: 'nsfw-general', label: 'NSFW General' },
  { value: 'futa', label: 'Futa' },
  { value: 'yuri', label: 'Yuri' },
  { value: 'yaoi', label: 'Yaoi' },
  { value: 'traps', label: 'Traps' },
  { value: 'furry', label: 'Furry' },
  { value: 'irl-3d', label: 'IRL / 3D' },
];

export const VALID_CHANNELS = CHANNELS.map((c) => c.value).filter((c) => c !== 'all');

export function imagesHref(channel: string): string {
  return channel === 'all' ? '/images' : `/images/${channel}`;
}
