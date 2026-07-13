import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Space, Button, message, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import AppShell from '../components/AppShell';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function VerificationPage() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const { getSessionById } = useApp();
    const navigate = useNavigate();
    const { t } = useTheme();
    const [messageApi, contextHolder] = message.useMessage();

    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null);
    const [distance, setDistance] = useState<number | null>(null);

    const session = sessionId ? getSessionById(sessionId) : undefined;

    useEffect(() => {
        if (!session) {
            void messageApi.error(t('sessionNotFoundError'));
            navigate('/attendance');
            return;
        }

        if (!session.geolocationEnabled || !session.lat || !session.lng) {
            navigate(`/sessions/${session.id}`);
            return;
        }

        if (!navigator.geolocation) {
            void messageApi.error('Geolocation is not supported by your browser.');
            setLoading(false);
            setIsWithinRadius(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                setUserLocation([userLat, userLng]);

                const dist = getDistance(userLat, userLng, session.lat!, session.lng!);
                setDistance(dist);
                setIsWithinRadius(dist <= (session.radius || 100));

                setLoading(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                void messageApi.error(t('locationError'));
                setLoading(false);
                setIsWithinRadius(false);
            },
            { enableHighAccuracy: true }
        );
    }, [session, navigate, messageApi, t]);

    if (!session) {
        return null;
    }

    return (
        <AppShell title={t('locationVerification')} showPageTitle={false} pageClassName="verification-page">
            {contextHolder}
            <Card className="verification-card">
                <Typography.Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
                    {t('locationVerification')}
                </Typography.Title>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                        <Typography.Paragraph style={{ marginTop: 16 }}>
                            <EnvironmentOutlined spin style={{ marginRight: 8 }} />
                            {t('gettingLocation')}
                        </Typography.Paragraph>
                    </div>
                ) : (
                    <>
                        {userLocation && (
                            <div className="verification-map-frame">
                                <MapContainer
                                    center={[session.lat!, session.lng!]}
                                    zoom={16}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={false}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Circle
                                        center={[session.lat!, session.lng!]}
                                        radius={session.radius || 100}
                                        color="#5ec832"
                                        fillColor="#5ec832"
                                        fillOpacity={0.2}
                                    />
                                    <Marker position={[session.lat!, session.lng!]}>
                                        <Popup>{t('sessionLocation')}</Popup>
                                    </Marker>
                                    <Marker position={userLocation}>
                                        <Popup>{t('yourLocation')}</Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        )}

                        <div className="verification-result">
                            {isWithinRadius ? (
                                <Space size={12}>
                                    <CheckCircleOutlined style={{ color: '#5ec832', fontSize: 32 }} />
                                    <Typography.Text strong style={{ fontSize: 18, color: '#5ec832' }}>
                                        {t('withinAllowed')}
                                    </Typography.Text>
                                </Space>
                            ) : (
                                <Space size={12}>
                                    <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 32 }} />
                                    <Typography.Text strong style={{ fontSize: 18, color: '#ff4d4f' }}>
                                        {t('outsideAllowed')}
                                    </Typography.Text>
                                </Space>
                            )}

                            {distance !== null && (
                                <Typography.Text type="secondary">
                                    {t('distanceFromCenter')}: <strong>{Math.round(distance)} m</strong>
                                </Typography.Text>
                            )}

                            {isWithinRadius && (
                                <Button
                                    type="primary"
                                    size="large"
                                    className="primary-action verification-action-button"
                                    onClick={() => navigate(`/sessions/${session.id}`)}
                                >
                                    {t('proceedToSession')}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </Card>
        </AppShell>
    );
}
