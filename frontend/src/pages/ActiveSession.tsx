import {
    LeftOutlined,
    EnvironmentOutlined,
    ExpandOutlined,
    StopOutlined,
    ReloadOutlined,
    PlusOutlined,
    DeleteOutlined,
    DownloadOutlined,
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
    Input,
    Alert,
    Spin,
    Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import L from 'leaflet';

import AppShell from '../components/AppShell';
import { useApp, type Session } from '../contexts/AppContext';
import SessionMap from '../components/SessionMap';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToQrToken } from '../api/Qr';
import { closeSession, getActiveSessionIds, getSessionDetails, getSessionUsers } from '../api/Session';
import { addAttendeeByEmail, removeAttendeeByEmail } from '../api/Attendance';

type Attendee = {
    id: string;
    name: string;
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

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ActiveSessionPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { sessionId } = useParams<{ sessionId: string }>();
    const {
        getSessionById,
        endSession,
    } = useApp();
    const { t } = useTheme();
    const [messageApi, contextHolder] = message.useMessage();
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [attendeesLoading, setAttendeesLoading] = useState(false);
    const [attendeesError, setAttendeesError] = useState('');
    const [addAttendeeOpen, setAddAttendeeOpen] = useState(false);
    const [attendeeEmail, setAttendeeEmail] = useState('');
    const [addingAttendee, setAddingAttendee] = useState(false);
    const [removingAttendeeEmail, setRemovingAttendeeEmail] = useState<string | null>(null);
    const [endSessionModalOpen, setEndSessionModalOpen] = useState(false);
    const [endingSession, setEndingSession] = useState(false);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [mapModalOpen, setMapModalOpen] = useState(false);
    const mapKey = 0;
    const [isMounted, setIsMounted] = useState(false); //
    const [qrToken, setQrToken] = useState('');
    const [qrError, setQrError] = useState('');
    const [backendSessionActive, setBackendSessionActive] = useState<boolean | null>(null);
    const [fetchedSession, setFetchedSession] = useState<Session | null>(null);
    const attendeesRequestInFlightRef = useRef(false);

    const sessionFromUrl = sessionId ? getSessionById(sessionId) : undefined;
    const numericSessionId = sessionId && /^\d+$/.test(sessionId) && Number(sessionId) > 0
        ? Number(sessionId)
        : null;

    // Безопасно достаем данные сессии
    const state = location.state as  { session?: Session } | null;
    const sessionFromState = state?.session;
    const activeSession = fetchedSession || sessionFromUrl || sessionFromState;
    const isActive = !sessionEnded && (backendSessionActive ?? activeSession?.isActive !== false);

    const loadSessionDetails = useCallback(async () => {
        if (numericSessionId === null) return;
        try {
            const data = await getSessionDetails(numericSessionId);
            const validationTypes = data.validationTypes ?? [];
            const hasPassword = validationTypes.includes('PASSWORD');
            const sessionMode = hasPassword ? 'CODE' : 'QR';
            setFetchedSession({
                id: String(data.id),
                title: data.title,
                mode: sessionMode,
                password: data.password || '',
                geolocationEnabled: validationTypes.includes('GPS'),
                radius: data.allowedRadius ?? undefined,
                lat: data.latitude ?? undefined,
                lng: data.longitude ?? undefined,
                createdAt: data.createdAt,
                isActive: data.isActive,
                validationTypes,
            });
        } catch {
            // Keep fallback route state/context details if the backend details request fails.
        }
    }, [numericSessionId]);

    useEffect(() => {
        void loadSessionDetails();
    }, [loadSessionDetails]);

    useEffect(() => {
        if (numericSessionId === null) {
            setBackendSessionActive(false);
            return;
        }

        let cancelled = false;
        const currentSessionId = numericSessionId;

        async function loadActiveStatus() {
            try {
                const activeIds = await getActiveSessionIds();
                if (!cancelled) {
                    setBackendSessionActive(activeIds.includes(currentSessionId));
                }
            } catch {
                if (!cancelled) {
                    setBackendSessionActive(null);
                }
            }
        }

        void loadActiveStatus();

        return () => {
            cancelled = true;
        };
    }, [numericSessionId]);

    // Настройка иконок Leaflet + isMounted (как в первом файле)
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
        setIsMounted(true);
    }, []);

    const isQrSession = activeSession?.mode !== 'CODE';
    const shouldSubscribeQr = isActive && isQrSession;

    useEffect(() => {
        if (numericSessionId === null || !shouldSubscribeQr) {
            setQrToken('');
            setQrError('');
            return undefined;
        }

        return subscribeToQrToken(
            numericSessionId,
            (token) => {
                setQrToken(token);
                setQrError('');
            },
            (errorMessage) => {
                setQrError(errorMessage);
            },
        );
    }, [messageApi, numericSessionId, shouldSubscribeQr]);

    const loadSessionUsers = useCallback(async (options?: { skipIfLoading?: boolean }) => {
        if (numericSessionId === null) {
            setAttendees([]);
            setAttendeesError('Session ID must be a positive number.');
            setAttendeesLoading(false);
            return;
        }

        if (attendeesRequestInFlightRef.current) {
            if (!options?.skipIfLoading) {
                setAttendeesLoading(true);
            }
            return;
        }

        attendeesRequestInFlightRef.current = true;
        setAttendeesLoading(true);

        try {
            const users = await getSessionUsers(numericSessionId);
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
            attendeesRequestInFlightRef.current = false;
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

    useEffect(() => {
        if (numericSessionId === null || !isActive) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            void loadSessionUsers({ skipIfLoading: true });
        }, 10000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isActive, loadSessionUsers, numericSessionId]);

    const handleAddAttendee = useCallback(async () => {
        if (numericSessionId === null) {
            void messageApi.error('Session ID must be a positive number.');
            return;
        }

        const email = attendeeEmail.trim();

        if (!isValidEmail(email)) {
            void messageApi.error('Enter a valid email address.');
            return;
        }

        setAddingAttendee(true);
        try {
            await addAttendeeByEmail({
                sessionId: numericSessionId,
                email,
            });

            void messageApi.success(t('attendeeAdded'));
            setAddAttendeeOpen(false);
            setAttendeeEmail('');
            await loadSessionUsers();
        } catch (error: unknown) {
            void messageApi.error(error instanceof Error ? error.message : 'Failed to add attendee.');
        } finally {
            setAddingAttendee(false);
        }
    }, [attendeeEmail, loadSessionUsers, messageApi, numericSessionId, t]);

    const handleRemoveAttendee = useCallback(async (email: string) => {
        if (numericSessionId === null) {
            void messageApi.error('Session ID must be a positive number.');
            return;
        }

        setRemovingAttendeeEmail(email);
        try {
            await removeAttendeeByEmail({
                sessionId: numericSessionId,
                email,
            });

            void messageApi.success('Attendee removed.');
            await loadSessionUsers();
        } catch (error: unknown) {
            void messageApi.error(error instanceof Error ? error.message : 'Failed to remove attendee.');
        } finally {
            setRemovingAttendeeEmail(null);
        }
    }, [loadSessionUsers, messageApi, numericSessionId]);

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
                render: (_, attendee) => (
                    <span className="student-action-cell">
                        <Popconfirm
                            title={t('removeAttendee')}
                            okText={t('remove')}
                            cancelText={t('cancel')}
                            onConfirm={() => handleRemoveAttendee(attendee.email)}
                        >
                            <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                loading={removingAttendeeEmail === attendee.email}
                                aria-label={`${t('remove')} ${attendee.email}`}
                            />
                        </Popconfirm>
                    </span>
                ),
            },
        ],
        [handleRemoveAttendee, removingAttendeeEmail, t],
    );

    const handleEndSession = async () => {
        if (numericSessionId === null) {
            void messageApi.error('Session ID must be a positive number.');
            return;
        }

        setEndingSession(true);
        try {
            await closeSession(numericSessionId);
            setSessionEnded(true);
            setBackendSessionActive(false);
            setEndSessionModalOpen(false);
            setQrModalOpen(false);
            setMapModalOpen(false);
            setAddAttendeeOpen(false);
            if (activeSession) {
                endSession(activeSession.id);
            }
            setQrToken('');
            setQrError('');
            void messageApi.success('Session ended.');
            navigate('/sessions');
        } catch (error: unknown) {
            void messageApi.error(error instanceof Error ? error.message : 'Failed to end session.');
        } finally {
            setEndingSession(false);
        }
    };

    const handleExport = async (format: string) => {
        if (numericSessionId === null) return;
        try {
            const response = await fetch(`${API_BASE_URL}/attendance/export?sessionId=${numericSessionId}&format=${format}`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Failed to export attendance.'));
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const extension = format === 'txt' ? 'txt' : 'csv';
            a.download = `attendance_${numericSessionId}.${extension}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error: unknown) {
            void messageApi.error(error instanceof Error ? error.message : 'Failed to export.');
        }
    };

    const exportMenuItems: MenuProps['items'] = [
        {
            key: 'csv',
            label: 'Standard CSV',
            onClick: () => void handleExport('csv'),
        },
        {
            key: 'moodle',
            label: 'Moodle CSV',
            onClick: () => void handleExport('moodle'),
        },
        {
            key: 'txt',
            label: 'Plain Text',
            onClick: () => void handleExport('txt'),
        },
    ];

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
    const qrPayload = qrToken ? JSON.stringify({ token: qrToken }) : '';
    const qrUrl = qrPayload
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`
        : '';
    const qrFullUrl = qrPayload
        ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrPayload)}`
        : '';

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
                    style={{
                        width: 40,
                        height: 40,
                        minWidth: 40,
                        padding: 0,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                />
                <div>
                    <Typography.Title level={1}>{displayTitle}</Typography.Title>
                    <Space size={12} wrap className="active-session-meta">
                        <Tag color={isActive ? 'success' : 'default'}>
                            {isActive ? t('active') : 'Ended'}
                        </Tag>
                        <Typography.Text type="secondary">
                            Session ID: {numericSessionId}
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
                        isQrSession ? (
                            <Button
                                type="text"
                                icon={<ExpandOutlined />}
                                onClick={() => setQrModalOpen(true)}
                                aria-label="Expand QR"
                                disabled={!qrUrl}
                            />
                        ) : null
                    }
                >
                    {isQrSession && (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginBottom: 24,
                                cursor: qrUrl ? 'pointer' : 'default',
                                minHeight: 200,
                                alignItems: 'center',
                            }}
                            onClick={() => {
                                if (qrUrl) setQrModalOpen(true);
                            }}
                        >
                            {qrUrl ? (
                                <img src={qrUrl} alt="QR Code" style={{ width: 200, height: 200 }} />
                            ) : (
                                <Space direction="vertical" align="center">
                                    <Spin />
                                    <Typography.Text type="secondary">
                                        {qrError || 'Waiting for backend QR token...'}
                                    </Typography.Text>
                                </Space>
                            )}
                        </div>
                    )}



                    <div className="session-detail-list">
                        {!isQrSession && (
                            <Flex className="session-detail-row" justify="space-between" gap={16}>
                                <Typography.Text type="secondary">{t('sessionCode')}</Typography.Text>
                                <Typography.Text strong>{sessionPassword || 'Unavailable'}</Typography.Text>
                            </Flex>
                        )}

                        {activeSession?.validationTypes &&
                            activeSession.validationTypes.length > 0 && (
                                <Flex className="session-detail-row" justify="space-between" gap={16}>
                                    <Typography.Text type="secondary">
                                        Validation Methods
                                    </Typography.Text>
                                    <Typography.Text strong>
                                        {activeSession.validationTypes.join(', ')}
                                    </Typography.Text>
                                </Flex>
                            )}

                        <Flex className="session-detail-row" justify="space-between" gap={16}>
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
                            <Flex className="session-detail-row" justify="space-between" gap={16}>
                                <Typography.Text type="secondary">{t('location')}</Typography.Text>
                                <Typography.Text strong>
                                    {activeSession?.lat?.toFixed(5)}, {activeSession?.lng?.toFixed(5)}
                                </Typography.Text>
                            </Flex>
                        )}
                        {hasLocation && isActive && (
                            <Flex className="session-detail-row radius-edit-row" justify="space-between" gap={16} align="center">
                                <Typography.Text type="secondary">Radius</Typography.Text>
                                <Typography.Text strong>
                                    {activeSession?.radius ? `${activeSession.radius}m` : 'N/A'}
                                </Typography.Text>
                                {/* TODO: re-enable editing when PATCH /session/{id} accepts allowedRadius. */}
                            </Flex>
                        )}
                    </div>

                    {hasLocation && isMounted && (
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
                        <Flex justify="space-between" align="center" gap={12} wrap="wrap">
                            <span>{t('scannedStudents')}</span>
                            <Space wrap className="session-card-actions">
                                <Tag color="success">{attendees.length}</Tag>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => setAddAttendeeOpen(true)}
                                >
                                    Add attendee
                                </Button>
                                <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
                                    <Button size="small" icon={<DownloadOutlined />}>
                                        Export
                                    </Button>
                                </Dropdown>
                                <Button
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    onClick={() => void loadSessionUsers()}
                                    loading={attendeesLoading}
                                >
                                    Refresh
                                </Button>
                                {isActive && (
                                    <Button
                                        size="small"
                                        type="primary"
                                        danger
                                        icon={<StopOutlined />}
                                        className="end-session-btn"
                                        loading={endingSession}
                                        disabled={endingSession}
                                        onClick={() => setEndSessionModalOpen(true)}
                                    >
                                        End Session
                                    </Button>
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
                className="responsive-modal qr-modal"
            >
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                    {qrFullUrl ? (
                        <img
                            src={qrFullUrl}
                            alt="QR Code Full"
                            style={{ width: '100%', maxWidth: 500, height: 'auto' }}
                        />
                    ) : (
                        <Spin />
                    )}
                </div>
            </Modal>

            <Modal
                title="Add attendee"
                open={addAttendeeOpen}
                okText={t('add')}
                cancelText={t('cancel')}
                confirmLoading={addingAttendee}
                onOk={() => void handleAddAttendee()}
                onCancel={() => {
                    setAddAttendeeOpen(false);
                    setAttendeeEmail('');
                }}
                destroyOnHidden
                className="responsive-modal"
            >
                <Input
                    value={attendeeEmail}
                    onChange={(event) => setAttendeeEmail(event.target.value)}
                    onPressEnter={() => void handleAddAttendee()}
                    placeholder="student@example.com"
                    type="email"
                    autoComplete="off"
                    autoFocus
                />
            </Modal>

            <Modal
                title="End session?"
                open={endSessionModalOpen}
                okText="End Session"
                cancelText="Cancel"
                confirmLoading={endingSession}
                okButtonProps={{ danger: true, disabled: endingSession }}
                cancelButtonProps={{ disabled: endingSession }}
                onOk={() => void handleEndSession()}
                onCancel={() => {
                    if (!endingSession) {
                        setEndSessionModalOpen(false);
                    }
                }}
                centered
                destroyOnHidden
                className="responsive-modal end-session-modal"
            >
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                    QR/code attendance will stop after ending the session. Participants will no longer be able to check in using this session.
                </Typography.Paragraph>
            </Modal>

            <Modal
                open={mapModalOpen}
                footer={null}
                onCancel={() => setMapModalOpen(false)}
                width="90%"
                style={{ maxWidth: 1200 }}
                centered
                className="responsive-modal map-modal"
                closable
                title="Session Location"
            >
                <div className="map-modal-frame">
                    {isMounted && (
                        <SessionMap
                            key={mapKey + 1000}
                            center={[activeSession!.lat!, activeSession!.lng!]}
                            radius={activeSession!.radius || 100}
                        />
                    )}
                </div>
            </Modal>
        </AppShell>
    );
}
