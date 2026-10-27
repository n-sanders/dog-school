import { type ReactNode, useEffect, useRef } from "react";

interface Props {
  src: string;
  alt: string;
  caption?: string;
  credit: ReactNode;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, caption, credit, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (!dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="lightbox"
      aria-label={caption ?? alt}
      onClose={onClose}
      onClick={(e) => {
        // The backdrop belongs to the dialog element, so a click on it targets the dialog itself.
        if (e.target !== dialogRef.current) return;
        const r = dialogRef.current.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) onClose();
      }}
    >
      <button type="button" className="lightbox-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <img src={src} alt={alt} />
      {caption && <p className="lightbox-caption">{caption}</p>}
      <p className="credit">{credit}</p>
    </dialog>
  );
}
