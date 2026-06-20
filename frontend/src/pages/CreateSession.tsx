import { EnvironmentOutlined, KeyOutlined } from '@ant-design/icons';
import {
    Button,
    Card,
    Flex,
    Form,
    Input,
    InputNumber,
    Space,
    Switch,
    Typography,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';

export type LocalSession = {
    id: string;
    title: string;
    sessionCode: string;
    geolocationEnabled: boolean;
    radius?: number;
    createdAt: string;
};

type CreateSessionFormValues = {
    title: string;
    geolocationEnabled?: boolean;
    radius?: number;
    sessionCode?: string;
};

function createLocalId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }

    return `session-${Date.now()}`;
}

function createFallbackCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function CreateSessionPage() {
    const [form] = Form.useForm<CreateSessionFormValues>();
    const navigate = useNavigate();
    const geolocationEnabled = Form.useWatch('geolocationEnabled', form);

    const handleSubmit = (values: CreateSessionFormValues) => {
        const session: LocalSession = {
            id: createLocalId(),
            title: values.title.trim(),
            sessionCode: values.sessionCode?.trim() || createFallbackCode(),
            geolocationEnabled: Boolean(values.geolocationEnabled),
            radius: values.geolocationEnabled ? values.radius : undefined,
            createdAt: new Date().toISOString(),
        };

        navigate(`/sessions/${session.id}`, { state: { session } });
    };

    return (
        <AppShell
            title="Create Session"
            subtitle="Set up a new attendance session"
            pageClassName="create-session-page"
        >
            <Card className="session-form-card">
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ geolocationEnabled: true, radius: 100 }}
                    onFinish={handleSubmit}
                    requiredMark={false}
                >
                    <Form.Item
                        label="Session Title"
                        name="title"
                        rules={[
                            { required: true, whitespace: true, message: 'Please enter a session title.' },
                        ]}
                    >
                        <Input placeholder="e.g. Machine Learning Lecture" size="large" />
                    </Form.Item>

                    <div className="session-switch-row">
                        <Space size={16} align="center">
                            <span className="field-icon field-icon-green">
                                <EnvironmentOutlined />
                            </span>
                            <div>
                                <Typography.Text strong>Enable Geolocation</Typography.Text>
                                <Typography.Paragraph className="field-helper">
                                    Restrict attendance to a physical location
                                </Typography.Paragraph>
                            </div>
                        </Space>
                        <Form.Item name="geolocationEnabled" valuePropName="checked" noStyle>
                            <Switch />
                        </Form.Item>
                    </div>

                    {geolocationEnabled && (
                        <Form.Item
                            label="Allowed Radius"
                            name="radius"
                            rules={[
                                { required: true, message: 'Please enter an allowed radius.' },
                                {
                                    type: 'number',
                                    min: 1,
                                    message: 'Radius must be a positive number.',
                                },
                            ]}
                        >
                            <InputNumber
                                size="large"
                                min={1}
                                addonAfter="meters"
                                className="full-width-input"
                            />
                        </Form.Item>
                    )}

                    <Form.Item
                        label={
                            <Space size={8}>
                                <KeyOutlined className="muted-icon" />
                                <span>Session Code</span>
                            </Space>
                        }
                        name="sessionCode"
                        extra="Participants can use this code to join the session."
                    >
                        <Input.Password placeholder="Leave blank to generate" size="large" />
                    </Form.Item>

                    <Flex className="form-actions" gap={16} wrap="wrap">
                        <Button type="primary" htmlType="submit" size="large" className="primary-action">
                            Create Session
                        </Button>
                        <Button size="large" onClick={() => navigate('/sessions')}>
                            Cancel
                        </Button>
                    </Flex>
                </Form>
            </Card>
        </AppShell>
    );
}
