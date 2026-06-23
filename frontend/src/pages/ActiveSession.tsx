import {
    LeftOutlined,
    EnvironmentOutlined,
    ExpandOutlined,
    StopOutlined,
    EditOutlined,
    SaveOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Empty,
    Flex,
    Popconfirm,
    Space,
    Table,
    Tag,
    Typography,
    message,
    Modal,
    InputNumber,
    Alert,
    Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import L from 'leaflet';

import AppShell from '../components/AppShell';
import { useApp } from '../contexts/AppContext';
import type { Session } from '../contexts/AppContext';
import SessionMap from '../components/SessionMap';
import { useTheme } from '../contexts/ThemeContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type Attendee = {
    id: string;
    name: string;
    email: string;
};

type SessionUserResponse = {
    email: string;
};

function getDisplayName(email: string) {
    const [localPart] = email.split('@');
    return localPart
        .split(/[._-]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || email;
}

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const data = await response.json() as { message?: string; error?: string };
        return data.message || data.error || fallback;
    } catch {
        return fallback;
    }
}

export default function ActiveSessionPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { sessionId } = useParams<{ sessionId: string }>();
    const {
        getSessionById,
        updateSession,
    } = useApp();
    const { t } = useTheme();
    const [messageApi, contextHolder] = message.useMessage();
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [attendeesLoading, setAttendeesLoading] = useState(false);
    const [attendeesError, setAttendeesError] = useState('');
    const [endingSession, setEndingSession] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [mapModalOpen, setMapModalOpen] = useState(false);
    const [isEditingRadius, setIsEditingRadius] = useState(false);
    const [editRadius, setEditRadius] = useState<number | undefined>(undefined);
    const [mapKey, setMapKey] = useState(0);

    const sessionFromUrl = sessionId ? getSessionById(sessionId) : undefined;
    const numericSessionId = sessionId && /^\d+$/.test(sessionId) && Number(sessionId) > 0
        ? Number(sessionId)
        : null;

    // Безопасно достаем данные сессии
    const state = location.state as  { session?: Session } | null;
    const sessionFromState = state?.session;
    const activeSession = sessionFromUrl || sessionFromState;

    useEffect(() => {
        delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl:
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl:
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl:
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    }, []);

    const loadSessionUsers = useCallback(async () => {
        if (numericSessionId === null) {
            setAttendees([]);
            setAttendeesError('Session ID must be a positive number.');
            setAttendeesLoading(false);
            return;
        }

        setAttendeesLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/session/${numericSessionId}`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Failed to load checked-in users.'));
            }

            const users = await response.json() as SessionUserResponse[];
            setAttendees(
                users.map((user) => ({
                    id: user.email,
                    email: user.email,
                    name: getDisplayName(user.email),
                })),
            );
            setAttendeesError('');
        } catch (error: unknown) {
            setAttendeesError(error instanceof Error ? error.message : 'Failed to load checked-in users.');
        } finally {
            setAttendeesLoading(false);
        }
    }, [numericSessionId]);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            void loadSessionUsers();
        }, 0);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [loadSessionUsers]);

    const columns = useMemo<ColumnsType<Attendee>>(
        () => [
            {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                render: (name: string) => (
                    <Space size={8} className="student-name-cell">
                        <span className="attendee-avatar">{name.charAt(0)}</span>
                        <Typography.Text strong>{name}</Typography.Text>
                    </Space>
                ),
            },
            {
                title: 'Email',
                dataIndex: 'email',
                key: 'email',
                render: (email: string) => <span className="student-email-cell">{email}</span>,
            },
            {
                title: 'Actions',
                align: 'center',
                width: 60,
                render: () => (
                    <span className="student-action-cell">
                        <Typography.Text type="secondary">Unavailable</Typography.Text>
                    </span>
                ),
            },
        ],
        [],
    );

    const handleEndSession = async () => {
        if (numericSessionId === null) {
            void messageApi.error('Session ID must be a positive number.');
            return;
        }

        setEndingSession(true);
        try {
            const response = await fetch(`${API_BASE_URL}/session/close/${numericSessionId}`, {
                method: 'PATCH',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Failed to end session.'));
            }

            void messageApi.success('Session ended');
            navigate('/sessions');
        } catch (error: unknown) {
            void messageApi.error(error instanceof Error ? error.message : 'Failed to end session.');
        } finally {
            setEndingSession(false);
        }
    };

    const handleSaveRadius = () => {
        const nextRadius = editRadius ?? activeSession?.radius;

        if (activeSession && nextRadius !== undefined && nextRadius > 0) {
            updateSession(activeSession.id, { radius: nextRadius });
            setEditRadius(nextRadius);
            setIsEditingRadius(false);
            setMapKey((prev) => prev + 1);
            void messageApi.success('Radius updated');
        } else {
            void messageApi.error('Please enter a valid radius');
        }
    };

    if (numericSessionId === null) {
        return (
            <AppShell title={t('sessionNotFound')} showPageTitle={false}>
                <Card style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
                    <Empty description="Session ID must be a positive number." />
                    <Button type="primary" onClick={() => navigate('/sessions')}>
                        {t('goToSessions')}
                    </Button>
                </Card>
            </AppShell>
        );
    }

    const hasLocation =
        Boolean(activeSession?.geolocationEnabled) &&
        activeSession?.lat !== undefined &&
        activeSession?.lng !== undefined;

    const displayTitle = activeSession?.title || `Session ${numericSessionId}`;
    const sessionPassword = activeSession?.password || '';

    const qrData = JSON.stringify({
        sessionId: numericSessionId,
        code: sessionPassword,
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        qrData
    )}`;
    const qrFullUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
        qrData
    )}`;

    const isActive = activeSession?.isActive !== false;

    return (
        <AppShell
            title={displayTitle}
            showPageTitle={false}
            pageClassName="active-session-page"
        >
            {contextHolder}
            <div className="active-session-header">
                <Button
                    shape="circle"
                    size="large"
                    icon={<LeftOutlined />}
                    onClick={() => navigate('/sessions')}
                    aria-label={t('back')}
                />
                <div>
                    <Typography.Title level={1}>{displayTitle}</Typography.Title>
                    <Space size={12}>
                        <Tag color={isActive ? 'success' : 'default'}>
                            {isActive ? t('active') : 'Ended'}
                        </Tag>
                        <Typography.Text type="secondary">
                            Session ID: {sessionId}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                            {isActive ? t('sessionLive') : 'Session finished'}
                        </Typography.Text>
                    </Space>
                </div>
            </div>

            <div className="active-session-grid">
                <Card
                    title={t('sessionDetails')}
                    className="active-card qr-card"
                    extra={
                        <Button
                            type="text"
                            icon={<ExpandOutlined />}
                            onClick={() => setQrModalOpen(true)}
                            aria-label="Expand QR"
                        />
                    }
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: 24,
                            cursor: 'pointer',
                        }}
                        onClick={() => setQrModalOpen(true)}
                    >
                        <img src={qrUrl} alt="QR Code" style={{ width: 200, height: 200 }} />
                    </div>

                    <div className="session-detail-list">
                        <Flex justify="space-between" gap={16}>
                            <Typography.Text type="secondary">{t('sessionCode')}</Typography.Text>
                            <Typography.Text strong>{sessionPassword || 'Unavailable'}</Typography.Text>
                        </Flex>

                        {activeSession?.validationTypes &&
                            activeSession.validationTypes.length > 0 && (
                                <Flex justify="space-between" gap={16}>
                                    <Typography.Text type="secondary">
                                        Validation Methods
                                    </Typography.Text>
                                    <Typography.Text strong>
                                        {activeSession.validationTypes.join(', ')}
                                    </Typography.Text>
                                </Flex>
                            )}

                        <Flex justify="space-between" gap={16}>
                            <Typography.Text type="secondary">{t('geolocation')}</Typography.Text>
                            <Typography.Text
                                strong
                                className={activeSession?.geolocationEnabled ? 'green-text' : undefined}
                            >
                                {activeSession?.geolocationEnabled ? (
                                    <Space size={6}>
                                        <EnvironmentOutlined />
                                        {t('enabled')}
                                        {activeSession?.radius ? ` · ${activeSession.radius}m` : ''}
                                    </Space>
                                ) : (
                                    t('disabled')
                                )}
                            </Typography.Text>
                        </Flex>
                        {hasLocation && (
                            <Flex justify="space-between" gap={16}>
                                <Typography.Text type="secondary">{t('location')}</Typography.Text>
                                <Typography.Text strong>
                                    {activeSession?.lat?.toFixed(5)}, {activeSession?.lng?.toFixed(5)}
                                </Typography.Text>
                            </Flex>
                        )}
                        {hasLocation && isActive && (
                            <Flex justify="space-between" gap={16} align="center">
                                <Typography.Text type="secondary">Radius</Typography.Text>
                                {isEditingRadius ? (
                                    <Space>
                                        <InputNumber
                                            min={1}
                                            value={editRadius ?? activeSession?.radius}
                                            onChange={(val) => setEditRadius(val ?? undefined)}
                                            addonAfter="m"
                                            size="small"
                                        />
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<SaveOutlined />}
                                            onClick={handleSaveRadius}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                setIsEditingRadius(false);
                                                setEditRadius(undefined);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </Space>
                                ) : (
                                    <Space>
                                        <Typography.Text strong>
                                            {activeSession?.radius ? `${activeSession.radius}m` : 'N/A'}
                                        </Typography.Text>
                                        {isActive && (
                                            <Button
                                                type="text"
                                                icon={<EditOutlined />}
                                                onClick={() => {
                                                    setEditRadius(activeSession?.radius);
                                                    setIsEditingRadius(true);
                                                }}
                                                size="small"
                                            />
                                        )}
                                    </Space>
                                )}
                            </Flex>
                        )}
                    </div>

                    {hasLocation && (
                        <div
                            style={{
                                marginTop: 24,
                                height: 220,
                                borderRadius: 16,
                                overflow: 'hidden',
                                position: 'relative',
                            }}
                        >
                            <SessionMap
                                key={mapKey}
                                center={[activeSession!.lat!, activeSession!.lng!]}
                                radius={activeSession!.radius || 100}
                            />
                            <Button
                                type="primary"
                                shape="circle"
                                icon={<ExpandOutlined />}
                                style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}
                                onClick={() => setMapModalOpen(true)}
                                aria-label="Expand Map"
                            />
                        </div>
                    )}
                </Card>

                <Card
                    title={
                        <Flex justify="space-between" align="center">
                            <span>{t('scannedStudents')}</span>
                            <Space>
                                <Tag color="success">{attendees.length}</Tag>
                                <Button
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    onClick={() => void loadSessionUsers()}
                                    loading={attendeesLoading}
                                >
                                    Refresh
                                </Button>
                                {isActive && (
                                    <Popconfirm
                                        title="Are you sure you want to end this session?"
                                        okText="Yes"
                                        cancelText="No"
                                        onConfirm={handleEndSession}
                                    >
                                        <Button danger size="small" icon={<StopOutlined />} loading={endingSession}>
                                            End Session
                                        </Button>
                                    </Popconfirm>
                                )}
                            </Space>
                        </Flex>
                    }
                    className="active-card scanned-card"
                >
                    {attendeesError && (
                        <Alert
                            type="error"
                            showIcon
                            message={attendeesError}
                            style={{ margin: 16 }}
                        />
                    )}
                    {attendeesLoading && !attendees.length ? (
                        <div style={{ padding: 32, textAlign: 'center' }}>
                            <Spin />
                            <div style={{ marginTop: 12 }}>
                                <Typography.Text type="secondary">Loading checked-in users...</Typography.Text>
                            </div>
                        </div>
                    ) : null}
                    <Table
                        columns={columns}
                        dataSource={attendees}
                        rowKey="id"
                        pagination={false}
                        locale={{ emptyText: <Empty description={t('noAttendees')} /> }}
                        size="middle"
                        style={{ overflow: 'auto' }}
                    />
                </Card>
            </div>

            {/* Модалка QR */}
            <Modal
                open={qrModalOpen}
                footer={null}
                onCancel={() => setQrModalOpen(false)}
                width="80%"
                style={{ maxWidth: 600 }}
                centered
                closable
            >
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                    <img
                        src={qrFullUrl}
                        alt="QR Code Full"
                        style={{ width: '100%', maxWidth: 500, height: 'auto' }}
                    />
                </div>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <Typography.Text strong>
                        {t('sessionCode')}: {sessionPassword || 'Unavailable'}
                    </Typography.Text>
                </div>
            </Modal>

            {/* Модалка карты */}
            <Modal
                open={mapModalOpen}
                footer={null}
                onCancel={() => setMapModalOpen(false)}
                width="90%"
                style={{ maxWidth: 1200 }}
                centered
                className="map-modal"
                closable
                title="Session Location"
            >
                <div style={{ height: '80vh' }}>
                    <SessionMap
                        key={mapKey + 1000}
                        center={[activeSession!.lat!, activeSession!.lng!]}
                        radius={activeSession!.radius || 100}
                    />
                </div>
            </Modal>
        </AppShell>
    );
}
