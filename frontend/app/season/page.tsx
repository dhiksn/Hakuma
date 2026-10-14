import { Metadata } from 'next';
import { SeasonView } from './_season-view';

export const metadata: Metadata = {
  title: 'Season',
  description: 'Arsip penayangan anime per musim: Musim Semi, Musim Panas, Musim Gugur, dan Musim Dingin.',
};

export const revalidate = 3600;

// /season → current year
export default function SeasonPage() {
  const currentYear = new Date().getFullYear();
  return <SeasonView year={currentYear} />;
}
