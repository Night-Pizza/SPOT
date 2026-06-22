import {
    EnvironmentOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Checkbox,
    Flex,
    Form,
    Input,
    InputNumber,
    Space,
    Switch,
    Typography,
    message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AppShell from '../components/AppShell';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import GeolocationButton from '../components/GeolocationButton';
// import { createSession } from '../api/Session'; // для отправки на сервер

type CreateSessionFormValues = {
    title: string;
    geolocationEnabled?: boolean;
    radius?: number;
    password?: string;
    validationTypes?: string[];
};

function createLocalId() {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}`;
}

function generatePassword() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function CreateSessionPage() {
    const [form] = Form.useForm<CreateSessionFormValues>();
    const navigate = useNavigate();
    const { addSession } = useApp();
    const { t } = useTheme();
    const [messageApi, contextHolder] = message.useMessage();
    const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);

    const geolocationEnabled = Form.useWatch('geolocationEnabled', form);

    const handleSubmit = async (values: CreateSessionFormValues) => {
        let lat: number | undefined, lng: number | undefined;

        if (values.geolocationEnabled) {
            if (!coords) {
                void messageApi.error('Please get your location first.');
                return;
            }
            lat = coords.lat;
            lng = coords.long;
        }

        const session = {
            id: createLocalId(),
            title: values.title.trim(),
            password: values.password?.trim() || generatePassword(),
            geolocationEnabled: Boolean(values.geolocationEnabled),
            radius: values.geolocationEnabled ? values.radius : undefined,
            validationTypes: values.validationTypes || [],
            lat,
            lng,
            createdAt: new Date().toISOString(),
        };

        // (Опционально) отправка на сервер
        // try {
        //   await createSession({
        //     title: session.title,
        //     password: session.password,
        //     latitude: session.lat || 0,
        //     longitude: session.lng || 0,
        //     allowedRadius: session.radius || 100,
        //     validationTypes: session.validationTypes,
        //   });
        // } catch (error) {
        //   void messageApi.error('Failed to create session on server');
        //   return;
        // }

        addSession(session);
        navigate(`/sessions/${session.id}`, { state: { session } });
    };

    return (
        <AppShell
            title={t('createSession')}
            subtitle={t('sessionDetails')}
            pageClassName="create-session-page"
        >
            {contextHolder}
            <Card className="session-form-card">
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ geolocationEnabled: true, radius: 100, validationTypes: ['GPS'] }}
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        label={t('sessionTitle')}
                        name="title"
                        rules={[{ required: true, whitespace: true, message: 'Please enter a session title.' }]}
                    >
                        <Input placeholder="e.g. Machine Learning Lecture" size="large" />
                    </Form.Item>

                    <div className="session-switch-row">
                        <Space size={16} align="center">
              <span className="field-icon field-icon-green">
                <EnvironmentOutlined />
              </span>
                            <div>
                                <Typography.Text strong>{t('enableGeolocation')}</Typography.Text>
                                <Typography.Paragraph className="field-helper">
                                    {t('geolocation')}
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
                                label={t('allowedRadius')}
                                name="radius"
                                rules={[
                                    { required: true, message: 'Please enter an allowed radius.' },
                                    { type: 'number', min: 1 },
                                ]}
                            >
                                <InputNumber
                                    size="large"
                                    min={1}
                                    addonAfter={t('meters')}
                                    className="full-width-input"
                                />
                            </Form.Item>

                            <div style={{ marginBottom: 16 }}>
                                <GeolocationButton
                                    onLocationSuccess={(coords) => {
                                        setCoords(coords);
                                        void messageApi.success('Location obtained');
                                    }}
                                />
                                {coords && (
                                    <Typography.Text style={{ marginLeft: 12 }}>
                                        Lat: {coords.lat.toFixed(5)}, Lng: {coords.long.toFixed(5)}
                                    </Typography.Text>
                                )}
                            </div>

                            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                {t('geolocationHelp') || 'Students must be within this radius to mark attendance.'}
                            </Typography.Text>
                        </>
                    )}

                    <Form.Item
                        label="Session Code (Password)"
                        name="password"
                        extra="Participants will use this code to join the session. Leave blank to auto-generate."
                    >
                        <Input.Password placeholder="Enter session code (or leave blank)" size="large" />
                    </Form.Item>

                    <Form.Item
                        label="Validation Types"
                        name="validationTypes"
                        extra="Select which methods are allowed for attendance verification."
                    >
                        <Checkbox.Group options={['GPS', 'Wi-Fi', 'NFC']} />
                    </Form.Item>

                    <Flex className="form-actions" gap={16} wrap="wrap">
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            className="primary-action"
                        >
                            {t('createSession')}
                        </Button>
                        <Button size="large" onClick={() => navigate('/sessions')}>
                            {t('cancel')}
                        </Button>
                    </Flex>
                </Form>
            </Card>
        </AppShell>
    );
}