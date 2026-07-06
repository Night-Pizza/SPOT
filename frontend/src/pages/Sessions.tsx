import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Flex, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useTheme } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { getCreatedSessions, getSessionAttendees, type CreatedSessionHistoryItem } from '../api/Session';

type ParticipantCountState = {
    count: number;
    failed: boolean;
};

function formatSessionDate(timestamp: string) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(timestamp));
}

export default function SessionsPage() {
    const navigate = useNavigate();
    const { t } = useTheme();
    const [sessions, setSessions] = useState<CreatedSessionHistoryItem[]>([]);
    const [participantCounts, setParticipantCounts] = useState<Record<number, ParticipantCountState>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function loadSessions() {
            setLoading(true);
            setError('');
            setParticipantCounts({});

            try {
                const createdSessions = await getCreatedSessions();

                if (cancelled) return;
                setSessions(createdSessions);
                setLoading(false);

                const counts = await Promise.all(
                    createdSessions.map(async (session) => {
                        try {
                            const attendees = await getSessionAttendees(session.id);
                            return [session.id, { count: attendees.length, failed: false }] as const;
                        } catch {
                            return [session.id, { count: 0, failed: true }] as const;
                        }
                    })
                );

                if (!cancelled) {
                    setParticipantCounts(Object.fromEntries(counts));
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'Failed to load sessions');
                    setLoading(false);
                }
            }
        }

        void loadSessions();

        return () => {
            cancelled = true;
        };
    }, []);

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

                {/* Эта кнопка просто переводит на твой готовый CreateSessionPage */}
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

            {loading ? (
                <div className="sessions-empty-state">
                    <Spin />
                    <Typography.Text style={{ fontWeight: 400, marginLeft: 12 }}>Loading sessions...</Typography.Text>
                </div>
            ) : error ? (
                <Alert
                    message={error}
                    type="error"
                    showIcon
                    style={{ maxWidth: 1380, margin: '0 auto' }}
                />
            ) : sessions.length === 0 ? (
                <div className="sessions-empty-state">
                    <Typography.Title level={3} style={{ fontWeight: 600 }}>Create your first session</Typography.Title>
                    <Typography.Text style={{ fontWeight: 400 }}>{t('noSessions')}</Typography.Text>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                    {sessions.map((session) => (
                        <Card
                            key={session.id}
                            hoverable
                            className="session-grid-card"
                            onClick={() => navigate(`/sessions/${session.id}`, {
                                state: {
                                    session: {
                                        id: String(session.id),
                                        title: session.title,
                                        password: '',
                                        geolocationEnabled: false,
                                        createdAt: session.timestamp,
                                        isActive: true,
                                    },
                                },
                            })}
                        >
                            <div>
                                <Typography.Title level={4} style={{ marginBottom: 8, fontWeight: 500 }}>
                                    {session.title}
                                </Typography.Title>
                                <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                                    {formatSessionDate(session.timestamp)}
                                </Typography.Text>
                            </div>
                            <div style={{ marginTop: 18 }}>
                                <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                                    Participants
                                </Typography.Text>
                                <Typography.Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                                    {participantCounts[session.id]?.failed
                                        ? 'Unavailable'
                                        : participantCounts[session.id]?.count ?? 'Loading...'}
                                </Typography.Title>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </AppShell>
    );
}
