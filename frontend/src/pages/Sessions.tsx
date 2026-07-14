import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Flex, Spin, Typography, Select, Tag, Space, message, Dropdown, Input, DatePicker } from 'antd';
import type { MenuProps } from 'antd';
import type { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useTheme } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { getCreatedSessions, getSessionAttendees, exportSessionAttendance, type CreatedSessionHistoryItem } from '../api/Session';

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
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'active' | 'completed'>('newest');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [exportingId, setExportingId] = useState<number | null>(null);

    const handleExport = async (e: React.MouseEvent | React.KeyboardEvent, sessionId: number, format: string) => {
        e.stopPropagation();
        setExportingId(sessionId);
        try {
            await exportSessionAttendance(sessionId, format);
            message.success('Exported successfully');
        } catch (exportErr: any) {
            message.error(exportErr.message || 'Failed to export');
        } finally {
            setExportingId(null);
        }
    };

    const getExportMenuItems = (sessionId: number): MenuProps['items'] => [
        {
            key: 'csv',
            label: 'Standard CSV',
            onClick: ({ domEvent }) => void handleExport(domEvent as React.MouseEvent, sessionId, 'csv'),
        },
        {
            key: 'moodle',
            label: 'Moodle CSV',
            onClick: ({ domEvent }) => void handleExport(domEvent as React.MouseEvent, sessionId, 'moodle'),
        },
        {
            key: 'txt',
            label: 'Plain Text',
            onClick: ({ domEvent }) => void handleExport(domEvent as React.MouseEvent, sessionId, 'txt'),
        },
    ];

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

    const filteredAndSortedSessions = [...sessions]
        .filter(s => {
            if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (dateRange && dateRange[0] && dateRange[1]) {
                const sessionTime = new Date(s.timestamp).getTime();
                const start = dateRange[0].startOf('day').valueOf();
                const end = dateRange[1].endOf('day').valueOf();
                if (sessionTime < start || sessionTime > end) {
                    return false;
                }
            }
            if (sortBy === 'active') return s.isActive;
            if (sortBy === 'completed') return !s.isActive;
            return true;
        })
        .sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            if (sortBy === 'newest' || sortBy === 'active' || sortBy === 'completed') {
                return timeB - timeA;
            } else {
                return timeA - timeB;
            }
        });

    return (
        <AppShell title={t('sessions')} showPageTitle={false} pageClassName="sessions-page">
            <Flex className="sessions-header" justify="space-between" align="center" gap={24} wrap="wrap" style={{ marginBottom: 24 }}>
                <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                    <div>
                        <Typography.Title level={1} style={{ fontWeight: 600, margin: 0 }}>
                            {t('sessions')}
                        </Typography.Title>
                        <Typography.Paragraph style={{ fontWeight: 400, margin: 0, marginTop: 4 }}>
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

                <Space size="middle" wrap style={{ marginTop: 8 }}>
                    <Input.Search 
                        placeholder="Search sessions..." 
                        allowClear 
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: 200 }}
                    />
                    <DatePicker.RangePicker 
                        onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                    />
                    <Select
                        value={sortBy}
                        onChange={(value) => setSortBy(value as any)}
                        style={{ width: 160 }}
                        options={[
                            { value: 'newest', label: 'Newest First' },
                            { value: 'oldest', label: 'Oldest First' },
                            { value: 'active', label: 'Active Only' },
                            { value: 'completed', label: 'Completed Only' },
                        ]}
                    />
                </Space>
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
                <div className="sessions-grid">
                    {filteredAndSortedSessions.map((session) => (
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
                                        isActive: session.isActive,
                                    },
                                },
                            })}
                        >
                            <Flex justify="space-between" align="start">
                                <div>
                                    <Typography.Title level={4} style={{ marginBottom: 8, fontWeight: 500 }}>
                                        {session.title}
                                    </Typography.Title>
                                    <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                                        {formatSessionDate(session.timestamp)}
                                    </Typography.Text>
                                    <div style={{ marginTop: 8 }}>
                                        {session.isActive ? (
                                            <Tag color="green">Active</Tag>
                                        ) : (
                                            <Tag color="default">Completed</Tag>
                                        )}
                                    </div>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <Dropdown menu={{ items: getExportMenuItems(session.id) }} trigger={['click']}>
                                        <Button
                                            icon={<DownloadOutlined />}
                                            loading={exportingId === session.id}
                                        >
                                            Export
                                        </Button>
                                    </Dropdown>
                                </div>
                            </Flex>
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
