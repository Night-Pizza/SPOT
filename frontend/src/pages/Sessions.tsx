import { PlusOutlined } from '@ant-design/icons';
import { Button, Empty, Flex, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';

export default function SessionsPage() {
    const navigate = useNavigate();

    return (
        <AppShell title="Sessions" showPageTitle={false} pageClassName="sessions-page">
            <Flex className="sessions-header" justify="space-between" align="center" gap={24} wrap="wrap">
                <div>
                    <Typography.Title level={1}>Sessions</Typography.Title>
                    <Typography.Paragraph>Manage your attendance sessions</Typography.Paragraph>
                </div>

                {/* Эта кнопка просто переводит на твой готовый CreateSessionPage */}
                <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    className="primary-action new-session-button"
                    onClick={() => navigate('/sessions/create')}
                >
                    New Session
                </Button>
            </Flex>

            {/* В будущем вместо этого Empty ты будешь рендерить список сессий, полученный с бэка */}
            <div className="sessions-empty-state">
                <Empty description="No sessions created yet" />
            </div>
        </AppShell>
    );
}