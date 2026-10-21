import { isStanfordImage } from "../lib/learning";

interface Props {
  src: string;
  alt: string;
  /** Hide the source link (its URL contains the breed name) until the answer is revealed. */
  hideSource?: boolean;
  onError?: () => void;
  className?: string;
}

export function DogImage({ src, alt, hideSource, onError, className }: Props) {
  const credit = isStanfordImage(src) ? "Stanford Dogs Dataset via Dog CEO" : "Dog CEO";
  return (
    <figure className={`dog-image ${className ?? ""}`}>
      <div className="dog-image-frame">
        <img src={src} alt={alt} loading="lazy" onError={onError} />
      </div>
      <figcaption className="credit">
        Photo:{" "}
        {hideSource ? (
          credit
        ) : (
          <a href={src} target="_blank" rel="noreferrer">
            {credit}
          </a>
        )}
      </figcaption>
    </figure>
  );
}
