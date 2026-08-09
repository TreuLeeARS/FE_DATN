export const HeroImage = ({ src, alt, imageRef }) => {
  return (
    <div
      ref={imageRef}
      className="relative h-96 sm:h-full rounded-lg overflow-hidden"
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
      />
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
    </div>
  )
}
