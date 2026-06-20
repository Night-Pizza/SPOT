import { useGeolocation } from '../hooks/Geolocation';

interface GeoButtonProps {
  onLocationSuccess: (coords: { lat: number; long: number }) => void;
}

export default function GeoButton({ onLocationSuccess }: GeoButtonProps) {
  const { getPosition, loading } = useGeolocation();

  const handleClick = async () => {
    try {
      const coords = await getPosition();
      onLocationSuccess(coords);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Sending...' : '📍 Send geolocation'}
    </button>
  );
}