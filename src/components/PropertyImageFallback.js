export default function PropertyImageFallback() {
  return (
    <img
      src="/property-cover.jpg"
      alt="매물 이미지"
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}
