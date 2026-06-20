import {
    CloseOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    LeftOutlined,
    PlusOutlined,
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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import type { LocalSession } from './CreateSession';

type LocationState = {
    session?: LocalSession;
};

type Attendee = {
    id: string;
    name: string;
    email: string;
    time: string;
};

type ManualAddValues = {
    email: string;
};

function isLocalSession(value: unknown): value is LocalSession {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const session = value as Partial<LocalSession>;
    return typeof session.id === 'string' && typeof session.title === 'string';
}

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
    const state = location.state as LocationState | null;
    const session = isLocalSession(state?.session) ? state.session : null;
    const [form] = Form.useForm<ManualAddValues>();
    const [messageApi, contextHolder] = message.useMessage();

    // TODO: replace local attendees with backend attendance data when the API is available.
    const [attendees, setAttendees] = useState<Attendee[]>([
        { id: 'demo-1', name: 'Amir Seitkali', email: 'a.seitkali@innopolis.university', time: '10:02' },
        { id: 'demo-2', name: 'Daria Ivanova', email: 'd.ivanova@innopolis.university', time: '10:04' },
        { id: 'demo-3', name: 'Bekzod Tursunov', email: 'b.tursunov@innopolis.university', time: '10:05' },
        { id: 'demo-4', name: 'Lena Park', email: 'l.park@innopolis.university', time: '10:09' },
    ]);

    const columns = useMemo<ColumnsType<Attendee>>(
        () => [
            {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                width: 190,
                render: (name: string) => (
                    <Space size={12} className="student-name-cell">
                        <span className="attendee-avatar">{name.charAt(0)}</span>
                        <Typography.Text strong>{name}</Typography.Text>
                    </Space>
                ),
            },
            {
                title: 'Email',
                dataIndex: 'email',
                key: 'email',
                width: 250,
                render: (email: string) => <span className="student-email-cell">{email}</span>,
            },
            {
                title: 'Time',
                dataIndex: 'time',
                key: 'time',
                width: 100,
                render: (time: string) => (
                    <Space size={6} className="student-time-cell">
                        <ClockCircleOutlined className="muted-icon" />
                        <span>{time}</span>
                    </Space>
                ),
            },
            {
                title: 'Actions',
                key: 'actions',
                align: 'center',
                width: 72,
                render: (_, attendee) => (
                    <span className="student-action-cell">
                        <Popconfirm
                            title="Remove this attendee from the list?"
                            okText="Remove"
                            cancelText="Cancel"
                            onConfirm={() =>
                                setAttendees((current) => current.filter((item) => item.id !== attendee.id))
                            }
                        >
                            <Tooltip title="Remove attendee">
                                <Button
                                    shape="circle"
                                    danger
                                    type="text"
                                    icon={<CloseOutlined />}
                                    aria-label={`Remove ${attendee.name}`}
                                />
                            </Tooltip>
                        </Popconfirm>
                    </span>
                ),
            },
        ],
        [],
    );

    const addAttendee = ({ email }: ManualAddValues) => {
        const normalizedEmail = email.trim();
        const attendee: Attendee = {
            id: createLocalId('attendee'),
            name: getDisplayName(normalizedEmail),
            email: normalizedEmail,
            time: getCurrentTime(),
        };

        setAttendees((current) => [...current, attendee]);
        form.resetFields();
        void messageApi.success('Attendee added locally.');
    };

    if (!session) {
        return (
            <AppShell title="Active Session" pageClassName="active-session-page">
                <Card className="empty-route-card">
                    <Empty description="No local session data is available for this route.">
                        <Button type="primary" className="primary-action" onClick={() => navigate('/sessions/create')}>
                            Create New Session
                        </Button>
                    </Empty>
                </Card>
            </AppShell>
        );
    }

    return (
        <AppShell title={session.title} showPageTitle={false} pageClassName="active-session-page">
            {contextHolder}
            <div className="active-session-header">
                <Button
                    shape="circle"
                    size="large"
                    icon={<LeftOutlined />}
                    onClick={() => navigate('/sessions')}
                    aria-label="Back to sessions"
                />
                <div>
                    <Typography.Title level={1}>{session.title}</Typography.Title>
                    <Space size={12}>
                        <Tag color="success">Active</Tag>
                        <Typography.Text type="secondary">Session live</Typography.Text>
                    </Space>
                </div>
            </div>

            <div className="active-session-grid">
                <Card title="Session QR Code" className="active-card qr-card">
                    <div className="qr-placeholder" aria-label="Reserved QR code area" />

                    <div className="session-detail-list">
                        <Flex justify="space-between" gap={16}>
                            <Typography.Text type="secondary">Session Title</Typography.Text>
                            <Typography.Text strong>{session.title}</Typography.Text>
                        </Flex>
                        <Flex justify="space-between" gap={16}>
                            <Typography.Text type="secondary">Geolocation</Typography.Text>
                            <Typography.Text strong className={session.geolocationEnabled ? 'green-text' : undefined}>
                                {session.geolocationEnabled ? (
                                    <Space size={6}>
                                        <EnvironmentOutlined />
                                        Enabled{session.radius ? ` · ${session.radius}m` : ''}
                                    </Space>
                                ) : (
                                    'Disabled'
                                )}
                            </Typography.Text>
                        </Flex>
                    </div>
                </Card>

                <Card
                    title={
                        <Flex justify="space-between" align="center">
                            <span>Scanned Students</span>
                            <Tag color="success">{attendees.length}</Tag>
                        </Flex>
                    }
                    className="active-card scanned-card"
                >
                    <Table
                        columns={columns}
                        dataSource={attendees}
                        rowKey="id"
                        pagination={false}
                        scroll={{ x: 612 }}
                        locale={{ emptyText: <Empty description="No attendees yet" /> }}
                    />

                    <div className="manual-add-section">
                        <Typography.Title level={4}>
                            <Space size={8}>
                                <PlusOutlined />
                                Add Student Manually
                            </Space>
                        </Typography.Title>
                        <Form form={form} onFinish={addAttendee} className="manual-add-form">
                            <Form.Item
                                name="email"
                                rules={[
                                    { required: true, whitespace: true, message: 'Please enter an email.' },
                                    { type: 'email', message: 'Please enter a valid email.' },
                                ]}
                            >
                                <Input size="large" placeholder="student@innopolis.university" />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" size="large" className="primary-action">
                                Add
                            </Button>
                        </Form>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
