import { Button, message } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useGeolocation } from '../hooks/Geolocation';
import { useTheme } from '../contexts/ThemeContext';

interface GeoButtonProps {
    onLocationSuccess: (coords: { lat: number; long: number }) => void;
}

export default function GeoButton({ onLocationSuccess }: GeoButtonProps) {
    const { getPosition, loading } = useGeolocation();
    const { t } = useTheme();

    const handleClick = async () => {
        try {
            const coords = await getPosition();
            onLocationSuccess(coords);
            message.success(t('locationAcquired'));
        } catch (e) {
            console.error(e);
            message.error(t('locationPermissionError'));
        }
    };

    return (
        <Button
            type="default"
            icon={<EnvironmentOutlined />}
            onClick={handleClick}
            loading={loading}
        >
            {loading ? t('locating') : t('getLocation')}
        </Button>
    );
}
