import { PlusOutlined } from '@ant-design/icons';
import { Button, Empty, Flex, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AppShell from '../components/AppShell';
import GeolocationButton from '../components/GeolocationButton';
import { createSession } from '../api/Session';


export default function SessionsPage() {
    const [title, setTitle] = useState('');
    const [password, setPassword] = useState('');
    const [allowedRadius, setAllowedRadius] = useState('');
    const [validationTypes, setValidationTypes] = useState<string[]>([]);
    const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
    const navigate = useNavigate();

    const handleCreateSession = async () => {
        const sessionData = {
            title: title || "Default Session Name",
            password: password || "1234",
            latitude: coords?.lat ?? 0.0,
            longitude: coords?.long ?? 0.0,
            allowedRadius: parseInt(allowedRadius) || 100,
            validationTypes: validationTypes.length > 0 ? validationTypes : ["GPS"]
        };
        try {
            const response = await createSession(sessionData);
            console.log(response);
        } catch (error) {
            if (error instanceof Error) {
            console.error(`Failed to create session: ${error.message}`);
            } else {
            console.error("An unexpected error occurred");
            }
        };
    }
    return (
        <AppShell title="Sessions" showPageTitle={false} pageClassName="sessions-page">
            <Flex className="sessions-header" justify="space-between" align="center" gap={24} wrap="wrap">
                <div>
                    <Typography.Title level={1}>Sessions</Typography.Title>
                    <Typography.Paragraph>Manage your attendance sessions</Typography.Paragraph>
                </div>
                <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    className="primary-action new-session-button"
                    onClick={() => navigate('/sessions/create')}
                >
                    New Session
                </Button>
                <GeolocationButton onLocationSuccess={(coords) => setCoords(coords)} />
                <button 
                    onClick={handleCreateSession}
                    >
                    Create session
                </button>
            </Flex>

            <div className="sessions-empty-state">
                <Empty description="No sessions created yet" />
            </div>
        </AppShell>
    );
}
