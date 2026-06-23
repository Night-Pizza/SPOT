import { Button, message } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
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
            message.success('Location acquired!');
        } catch (e) {
            console.error(e);
            message.error('Failed to get location. Please check browser permissions.');
        }
    };

    return (
        <Button
            type="default"
            icon={<EnvironmentOutlined />}
            onClick={handleClick}
            loading={loading}
        >
            {loading ? 'Locating...' : 'Get Location'}
        </Button>
    );
}