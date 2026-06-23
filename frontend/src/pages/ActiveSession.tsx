import {
    CloseOutlined,
    ClockCircleOutlined,
    LeftOutlined,
    PlusOutlined,
    EnvironmentOutlined,
    ExpandOutlined,
    StopOutlined,
    EditOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Empty,
    Flex,
    Form,
    Input,
    Popconfirm,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    message,
    Modal,
    InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import L from 'leaflet';

import AppShell from '../components/AppShell';
import { useApp } from '../contexts/AppContext';
import type { Session } from '../contexts/AppContext';
import SessionMap from '../components/SessionMap';
import { useTheme } from '../contexts/ThemeContext';

type Attendee = {
    id: string;
    name: string;
    email: string;
    time: string;
};

type ManualAddValues = {
    email: string;
};

function createLocalId(prefix: string) {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}`;
}

function getDisplayName(email: string) {
    const [localPart] = email.split('@');
    return localPart
        .split(/[._-]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || email;
}

function getCurrentTime() {
    return new Intl.DateTimeFormat('en', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date());
}

export default function ActiveSessionPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { sessionId } = useParams<{ sessionId: string }>();
    const {
        getSessionById,
        getStudentsForSession,
        addStudentToSession,
        removeStudentFromSession,
        sessions,
        endSession,
        updateSession,
    } = useApp();
    const { t } = useTheme();
    const [form] = Form.useForm<ManualAddValues>();
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [mapModalOpen, setMapModalOpen] = useState(false);
    const [isEditingRadius, setIsEditingRadius] = useState(false);
    const [editRadius, setEditRadius] = useState<number | undefined>(undefined);
    const [mapKey, setMapKey] = useState(0);

    // Приоритет: сначала state, потом контекст
    const sessionFromState = (location.state as { session?: Session })?.session;
    const sessionFromUrl = sessionId ? getSessionById(sessionId) : undefined;
    const activeSession = sessionFromState || sessionFromUrl;

    const scannedStudents = useMemo(() => {
        if (!activeSession) return [];
        return getStudentsForSession(activeSession.id);
    }, [activeSession, getStudentsForSession]);

    useEffect(() => {
        if (activeSession) {
            setEditRadius(activeSession.radius);
        }
    }, [activeSession]);

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

    useEffect(() => {
        setLoading(false);
    }, [sessionId, sessions, sessionFromUrl, sessionFromState, activeSession]);

    useEffect(() => {
        if (!loading && !activeSession) {
            void messageApi.error(t('sessionNotFoundError'));
        }
    }, [loading, activeSession, messageApi, t]);

    const columns = useMemo<ColumnsType<Attendee>>(
        () => [
            {
                title: 'name',
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
                title: 'Time',
                dataIndex: 'time',
                key: 'time',
                render: (time: string) => (
                    <Space size={6} className="student-time-cell">
                        <ClockCircleOutlined className="muted-icon" />
                        <span>{time}</span>
                    </Space>
                ),
            },
            {
                title: 'Actions',
                align: 'center',
                width: 60,
                render: (_, attendee) => (
                    <span className="student-action-cell">
                        <Popconfirm
                            title="Remove this attendee from the list?"
                            okText="Remove"
                            cancelText="Cancel"
                            onConfirm={() =>{
                                if (activeSession) {
                                    removeStudentFromSession(activeSession.id, attendee.id);
                                }
                            }}
                        >
                            <Tooltip title={t('removeAttendee') || 'Remove attendee'}>
                                <Button
                                    shape="circle"
                                    danger
                                    type="text"
                                    icon={<CloseOutlined />}
                                    aria-label={`Remove ${attendee.name}`}
                                    size="small"
                                />
                            </Tooltip>
                        </Popconfirm>
                    </span>
                ),
            },
        ],
        [removeStudentFromSession, activeSession, t],
    );

    const addAttendee = ({ email }: ManualAddValues) => {
        const normalizedEmail = email.trim();
        if (!activeSession) return;
        addStudentToSession(activeSession.id,{
            id: createLocalId('attendee'),
            name: getDisplayName(normalizedEmail),
            email: normalizedEmail,
            time: getCurrentTime(),
        });

        form.resetFields();
        void messageApi.success(t('attendeeAdded') || 'Attendee added.');
    };

    const handleEndSession = () => {
        if (activeSession) {
            endSession(activeSession.id);
            void messageApi.success('Session ended');
            navigate('/sessions');
        }
    };

    const handleSaveRadius = () => {
        if (activeSession && editRadius !== undefined && editRadius > 0) {
            updateSession(activeSession.id, { radius: editRadius });
            setEditRadius(editRadius);
            setIsEditingRadius(false);
            setMapKey((prev) => prev + 1);
            void messageApi.success('Radius updated');
        } else {
            void messageApi.error('Please enter a valid radius');
        }
    };

    if (loading) {
        return (
            <AppShell title={t('loading')} showPageTitle={false}>
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Typography.Title level={3}>{t('loadingSession')}</Typography.Title>
                </div>
            </AppShell>
        );
    }

    if (!activeSession) {
        return (
            <AppShell title={t('sessionNotFound')} showPageTitle={false}>
                <Card style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
                    <Empty description={t('sessionNotFound')} />
                    <Button type="primary" onClick={() => navigate('/sessions')}>
                        {t('goToSessions')}
                    </Button>
                </Card>
            </AppShell>
        );
    }

    const hasLocation =
        activeSession.geolocationEnabled &&
        activeSession.lat !== undefined &&
        activeSession.lng !== undefined;

    const qrData = JSON.stringify({
        sessionId: activeSession.id,
        code: activeSession.password,
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        qrData
    )}`;
    const qrFullUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
        qrData
    )}`;

    const isActive = activeSession.isActive !== false;

    return (
        <AppShell
            title={activeSession.title}
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
                    <Typography.Title level={1}>{activeSession.title}</Typography.Title>
                    <Space size={12}>
                        <Tag color={isActive ? 'success' : 'default'}>
                            {isActive ? t('active') : 'Ended'}
                        </Tag>
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
                    {isMounted && (
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
                    )}

                    <div className="session-detail-list">
                        <Flex justify="space-between" gap={16}>
                            <Typography.Text type="secondary">{t('sessionCode')}</Typography.Text>
                            <Typography.Text strong>{activeSession.password}</Typography.Text>
                        </Flex>

                        {activeSession.validationTypes &&
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
                                className={activeSession.geolocationEnabled ? 'green-text' : undefined}
                            >
                                {activeSession.geolocationEnabled ? (
                                    <Space size={6}>
                                        <EnvironmentOutlined />
                                        {t('enabled')}
                                        {activeSession.radius ? ` · ${activeSession.radius}m` : ''}
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
                                    {activeSession.lat?.toFixed(5)}, {activeSession.lng?.toFixed(5)}
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
                                            value={editRadius}
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
                                                setEditRadius(activeSession.radius);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </Space>
                                ) : (
                                    <Space>
                                        <Typography.Text strong>
                                            {activeSession.radius ? `${activeSession.radius}m` : 'N/A'}
                                        </Typography.Text>
                                        {isActive && (
                                            <Button
                                                type="text"
                                                icon={<EditOutlined />}
                                                onClick={() => setIsEditingRadius(true)}
                                                size="small"
                                            />
                                        )}
                                    </Space>
                                )}
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
                                center={[activeSession.lat!, activeSession.lng!]}
                                radius={activeSession.radius || 100}
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
                                <Tag color="success">{scannedStudents.length}</Tag>
                                {isActive && (
                                    <Popconfirm
                                        title="Are you sure you want to end this session?"
                                        okText="Yes"
                                        cancelText="No"
                                        onConfirm={handleEndSession}
                                    >
                                        <Button danger size="small" icon={<StopOutlined />}>
                                            End Session
                                        </Button>
                                    </Popconfirm>
                                )}
                            </Space>
                        </Flex>
                    }
                    className="active-card scanned-card"
                >
                    <Table
                        columns={columns}
                        dataSource={scannedStudents}
                        rowKey="id"
                        pagination={false}
                        locale={{ emptyText: <Empty description={t('noAttendees')} /> }}
                        size="middle"
                        style={{ overflow: 'auto' }}
                    />

                    {isActive && (
                        <div className="manual-add-section">
                            <Typography.Title level={4}>
                                <Space size={8}>
                                    <PlusOutlined />
                                    {t('addStudentManually')}
                                </Space>
                            </Typography.Title>
                            <Form form={form} onFinish={addAttendee} className="manual-add-form">
                                <Form.Item
                                    name="email"
                                    rules={[
                                        { required: true, whitespace: true },
                                        { type: 'email', message: 'Please enter a valid email.' },
                                    ]}
                                >
                                    <Input size="large" placeholder="student@innopolis.university" />
                                </Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    className="primary-action"
                                >
                                    {t('add')}
                                </Button>
                            </Form>
                        </div>
                    )}
                </Card>
            </div>

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
                        {t('sessionCode')}: {activeSession.password}
                    </Typography.Text>
                </div>
            </Modal>

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
                        center={[activeSession.lat!, activeSession.lng!]}
                        radius={activeSession.radius || 100}
                    />
                </div>
            </Modal>
        </AppShell>
    );
}