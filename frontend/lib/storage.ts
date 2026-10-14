const AGE_GATE_KEY = 'hakuma_age_verified';
const isBrowser = typeof window !== 'undefined';

// Clean up any leftover age gate key from localStorage on load
if (isBrowser) {
  try { localStorage.removeItem(AGE_GATE_KEY); } catch { /* ignore */ }
}

// Age gate removed — kept for backwards compatibility only, always returns true
export function getAgeGateConsent(): boolean {
  return true;
}

export function setAgeGateConsent(_consent: boolean): void {
  // no-op
}
