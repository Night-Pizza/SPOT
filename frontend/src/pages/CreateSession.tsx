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
    message
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AppShell from '../components/AppShell';
import { createSession } from '../api/Session';
import GeoButton from '../components/GeolocationButton'; // Убедись, что путь к кнопке верный

type CreateSessionFormValues = {
    title: string;
    geolocationEnabled?: boolean;
    radius?: number;
    sessionCode?: string;
};

export default function CreateSessionPage() {
    const [form] = Form.useForm<CreateSessionFormValues>();
    const navigate = useNavigate();
    const geolocationEnabled = Form.useWatch('geolocationEnabled', form);

    // Стейты для координат и индикации загрузки при запросе к API
    const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: CreateSessionFormValues) => {
        // Защита от дурака: если гео включено, но юзер не нажал кнопку
        if (values.geolocationEnabled && !coords) {
            message.error("Please set your location first!");
            return;
        }

        // Собираем правильный массив для бэкенда
        const validationTypes: string[] = [];
        if (values.geolocationEnabled) validationTypes.push('GPS');
        if (values.sessionCode?.trim()) validationTypes.push('PASSWORD');
        if (validationTypes.length === 0) validationTypes.push('NONE');

        // Подгоняем данные под твой SessionCreateDTO
        const sessionData = {
            title: values.title.trim(),
            password: values.sessionCode?.trim() || null,
            latitude: coords?.lat ?? 0.0,
            longitude: coords?.long ?? 0.0,
            allowedRadius: values.geolocationEnabled ? (values.radius ?? null) : null,
            validationTypes: validationTypes
        };

        try {
            setLoading(true);
            const response = await createSession(sessionData);
            message.success('Session created successfully!');
            navigate(`/sessions/${response.id}`, { state: { session: response } });
        } catch (error) {
            console.error(error);
            message.error('Failed to create session');
        } finally {
            setLoading(false);
        }
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

                    <div className="session-switch-row" style={{ marginBottom: 16 }}>
                        <Space size={16} align="center">
                            <span className="field-icon field-icon-green">
                                <EnvironmentOutlined />
                            </span>
                            <div>
                                <Typography.Text strong>Enable Geolocation</Typography.Text>
                                <Typography.Paragraph className="field-helper" style={{ margin: 0 }}>
                                    Restrict attendance to a physical location
                                </Typography.Paragraph>
                            </div>
                        </Space>
                        <Form.Item name="geolocationEnabled" valuePropName="checked" noStyle>
                            <Switch />
                        </Form.Item>
                    </div>

                    {geolocationEnabled && (
                        <>
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

                            <Form.Item label="Session Location" required>
                                <Flex align="center" gap="small">
                                    <GeoButton onLocationSuccess={(newCoords) => setCoords(newCoords)} />
                                    {coords && <Typography.Text type="success">Location set!</Typography.Text>}
                                </Flex>
                            </Form.Item>
                        </>
                    )}

                    <Form.Item
                        label={
                            <Space size={8}>
                                <KeyOutlined className="muted-icon" />
                                <span>Session Code</span>
                            </Space>
                        }
                        name="sessionCode"
                        extra="Participants can use this code to join the session. Leave blank for no password."
                    >
                        <Input.Password placeholder="Enter password (optional)" size="large" />
                    </Form.Item>

                    <Flex className="form-actions" gap={16} wrap="wrap">
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            className="primary-action"
                            loading={loading}
                        >
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