import React, { useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface LightboxImage {
  src: string;
  alt: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

/**
 * Unified image lightbox using native <dialog> with:
 * - Focus trap (Tab cycles within dialog buttons)
 * - Escape to close
 * - Arrow key navigation for multiple images
 * - Focus restoration to trigger element
 * - Scroll lock
 */
export function ImageLightbox({ images, currentIndex, onClose, onNavigate }: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const hasMultiple = images.length > 1 && onNavigate;
  const image = currentIndex !== null ? images[currentIndex] : null;

  const close = useCallback(() => {
    dialogRef.current?.close();
    document.body.style.overflow = '';
    triggerRef.current?.focus();
    onClose();
  }, [onClose]);

  // Open/close the dialog when currentIndex changes
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (currentIndex !== null && image) {
      triggerRef.current = document.activeElement as HTMLElement;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      // Focus close button
      setTimeout(() => {
        dialog.querySelector<HTMLElement>('button[aria-label="Close"]')?.focus();
      }, 50);
    } else if (dialog.open) {
      dialog.close();
      document.body.style.overflow = '';
    }
  }, [currentIndex, image]);

  // Keyboard handling
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (hasMultiple && currentIndex !== null) {
        if (e.key === 'ArrowRight') onNavigate!((currentIndex + 1) % images.length);
        if (e.key === 'ArrowLeft') onNavigate!((currentIndex - 1 + images.length) % images.length);
      }
      // Focus trap
      if (e.key === 'Tab') {
        const focusable = dialog.querySelectorAll<HTMLElement>('button');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [close, currentIndex, hasMultiple, images.length, onNavigate]);

  return (
    <dialog
      ref={dialogRef}
      onClick={close}
      style={{
        position: 'fixed', inset: 0, width: '100vw', height: '100vh',
        maxWidth: '100vw', maxHeight: '100vh', margin: 0, padding: 0,
        border: 'none', background: 'rgba(0,0,0,0.88)', overflow: 'hidden',
      }}
    >
      {image && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            style={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {hasMultiple && currentIndex !== null && (
            <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}
              className="text-white/70 text-sm tabular-nums">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {hasMultiple && currentIndex !== null && (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate!((currentIndex - 1 + images.length) % images.length); }}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 20 }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {hasMultiple && currentIndex !== null && (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate!((currentIndex + 1) % images.length); }}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 20 }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <img
              src={image.src}
              alt={image.alt}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '88vw', maxHeight: '90vh', objectFit: 'contain', pointerEvents: 'auto', cursor: 'default' }}
            />
          </div>
        </>
      )}
    </dialog>
  );
}

/**
 * Simple hook for single-image lightbox usage (admin thumbnails, etc.)
 */
export function useSingleImageLightbox() {
  const [lightboxImage, setLightboxImage] = React.useState<LightboxImage | null>(null);

  const openLightbox = useCallback((src: string, alt: string = '') => {
    setLightboxImage({ src, alt });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  const lightboxElement = lightboxImage ? (
    <ImageLightbox
      images={[lightboxImage]}
      currentIndex={0}
      onClose={closeLightbox}
    />
  ) : null;

  return { openLightbox, closeLightbox, lightboxElement };
}
