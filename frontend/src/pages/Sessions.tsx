import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';

export default function SessionsPage() {
    const navigate = useNavigate();
    const { sessions } = useApp();
    const { t } = useTheme();

    return (
        <AppShell title={t('sessions')} showPageTitle={false} pageClassName="sessions-page">
            <Flex className="sessions-header" justify="space-between" align="center" gap={24} wrap="wrap">
                <div>
                    <Typography.Title level={1} style={{ fontWeight: 600 }}>
                        {t('sessions')}
                    </Typography.Title>
                    <Typography.Paragraph style={{ fontWeight: 400 }}>
                        {t('manageSessions')}
                    </Typography.Paragraph>
                </div>
                <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    className="primary-action new-session-button"
                    onClick={() => navigate('/sessions/create')}
                >
                    {t('newSession')}
                </Button>
            </Flex>

            {sessions.length === 0 ? (
                <div className="sessions-empty-state">
                    <Typography.Text style={{ fontWeight: 400 }}>{t('noSessions')}</Typography.Text>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                    {sessions.map((session) => (
                        <Card
                            key={session.id}
                            hoverable
                            onClick={() => navigate(`/sessions/${session.id}`)}
                            style={{ borderRadius: 16 }}
                        >
                            <Typography.Title level={4} style={{ marginBottom: 8, fontWeight: 500 }}>
                                {session.title}
                            </Typography.Title>
                            <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                                {new Date(session.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </Typography.Text>
                            <div style={{ marginTop: 12 }}>
                                {session.isActive !== false ? (
                                    <Tag color="green" style={{ fontWeight: 400 }}>Active</Tag>
                                ) : (
                                    <Tag color="default" style={{ fontWeight: 400 }}>Ended</Tag>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </AppShell>
    );
}