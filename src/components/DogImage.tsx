import { useState } from "react";
import { isStanfordImage } from "../lib/learning";
import { ImageLightbox } from "./ImageLightbox";

interface Props {
  src: string;
  alt: string;
  caption?: string;
  /** Hide the source link (its URL contains the breed name) until the answer is revealed. */
  hideSource?: boolean;
  /** Clicking opens the photo large. Turn off where a click on the photo means something else. */
  zoomable?: boolean;
  onError?: () => void;
  className?: string;
}

export function DogImage({ src, alt, caption, hideSource, zoomable = true, onError, className }: Props) {
  const [zoomed, setZoomed] = useState(false);
  const creditName = isStanfordImage(src) ? "Stanford Dogs Dataset via Dog CEO" : "Dog CEO";
  const credit = (
    <>
      Photo:{" "}
      {hideSource ? (
        creditName
      ) : (
        <a href={src} target="_blank" rel="noreferrer">
          {creditName}
        </a>
      )}
    </>
  );
  const img = <img src={src} alt={alt} loading="lazy" onError={onError} />;
  return (
    <figure className={`dog-image ${className ?? ""}`}>
      {zoomable ? (
        <button
          type="button"
          className="dog-image-frame zoomable"
          aria-label={`Enlarge photo: ${alt}`}
          onClick={() => setZoomed(true)}
        >
          {img}
        </button>
      ) : (
        <div className="dog-image-frame">{img}</div>
      )}
      <figcaption>
        {caption && <span className="caption">{caption}</span>}
        <span className="credit">{credit}</span>
      </figcaption>
      {zoomed && (
        <ImageLightbox src={src} alt={alt} caption={caption} credit={credit} onClose={() => setZoomed(false)} />
      )}
    </figure>
  );
}
