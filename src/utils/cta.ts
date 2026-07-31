declare global {
  interface Window {
    mraid?: {
      open: (url: string) => void;
    };
  }
}

export function openCta(url: string): void {
  if (typeof window.mraid !== 'undefined' && window.mraid.open) {
    window.mraid.open(url);
  } else {
    window.open(url, '_blank');
  }
}
