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
    message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AppShell from '../components/AppShell';
import { createSession } from '../api/Session';
import type { CreateSessionRequest } from '../api/Session';
import GeolocationButton from '../components/GeolocationButton';
import { useTheme } from '../contexts/ThemeContext';

type CreateSessionFormValues = {
    title: string;
    geolocationEnabled?: boolean;
    radius?: number;
    sessionCode?: string;
};

export default function CreateSessionPage() {
    const [form] = Form.useForm<CreateSessionFormValues>();
    const navigate = useNavigate();
    const { t } = useTheme(); // from V1
    const geolocationEnabled = Form.useWatch('geolocationEnabled', form);

    const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: CreateSessionFormValues) => {
        if (values.geolocationEnabled && !coords) {
            message.error(t('pleaseSetLocation') || 'Please set your location first.');
            return;
        }

        // Automatic validation types (V2 logic)
        const validationTypes: string[] = [];
        if (values.geolocationEnabled) validationTypes.push('GPS');
        if (values.sessionCode?.trim()) validationTypes.push('PASSWORD');
        if (validationTypes.length === 0) validationTypes.push('NONE');

        const sessionData: CreateSessionRequest = {
            title: values.title.trim(),
            password: values.sessionCode?.trim() || null,
            latitude: values.geolocationEnabled ? coords?.lat ?? null : null,
            longitude: values.geolocationEnabled ? coords?.long ?? null : null,
            allowedRadius: values.geolocationEnabled ? values.radius ?? null : null,
            validationTypes,
        };

        try {
            setLoading(true);
            const response = await createSession(sessionData);
            message.success(`${t('sessionCreated') || 'Session created successfully!'} ID: ${response.id}`);
            navigate(`/sessions/${response.id}`, { state: { session: response } });
        } catch (error) {
            console.error(error);
            message.error(error instanceof Error ? error.message : t('createFailed') || 'Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell
            title={t('createSession')}
            subtitle={t('sessionDetails')}
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
                        label={t('sessionTitle')}
                        name="title"
                        rules={[
                            { required: true, whitespace: true, message: t('titleRequired') || 'Please enter a session title.' },
                        ]}
                    >
                        <Input placeholder={t('titlePlaceholder') || 'e.g. Machine Learning Lecture'} size="large" />
                    </Form.Item>

                    <div className="session-switch-row" style={{ marginBottom: 16 }}>
                        <Space size={16} align="center">
                            <span className="field-icon field-icon-green">
                                <EnvironmentOutlined />
                            </span>
                            <div>
                                <Typography.Text strong>{t('enableGeolocation')}</Typography.Text>
                                <Typography.Paragraph className="field-helper" style={{ margin: 0 }}>
                                    {t('geolocationHelp') || 'Restrict attendance to a physical location'}
                                </Typography.Paragraph>
                            </div>
                        </Space>
                        <Form.Item name="geolocationEnabled" valuePropName="checked" noStyle>
                            <Switch
                                onChange={(checked) => {
                                    if (!checked) {
                                        setCoords(null);
                                    }
                                }}
                            />
                        </Form.Item>
                    </div>

                    {geolocationEnabled && (
                        <>
                            <Form.Item
                                label={t('allowedRadius')}
                                name="radius"
                                rules={[
                                    { required: true, message: t('radiusRequired') || 'Please enter an allowed radius.' },
                                    { type: 'number', min: 1, message: t('radiusMin') || 'Radius must be a positive number.' },
                                ]}
                            >
                                <InputNumber
                                    size="large"
                                    min={1}
                                    addonAfter={t('meters') || 'meters'}
                                    className="full-width-input"
                                />
                            </Form.Item>

                            <Form.Item label={t('sessionLocation') || 'Session Location'} required>
                                <Flex align="center" gap="small">
                                    <GeolocationButton
                                        onLocationSuccess={(newCoords) => {
                                            setCoords(newCoords);
                                            message.success(t('locationSet') || 'Location set!');
                                        }}
                                    />
                                    {coords && (
                                        <Typography.Text type="success">
                                            Lat: {coords.lat.toFixed(5)}, Lng: {coords.long.toFixed(5)}
                                        </Typography.Text>
                                    )}
                                </Flex>
                            </Form.Item>
                        </>
                    )}

                    <Form.Item
                        label={
                            <Space size={8}>
                                <KeyOutlined className="muted-icon" />
                                <span>{t('sessionCode') || 'Session Code'}</span>
                            </Space>
                        }
                        name="sessionCode"
                        extra={t('codeExtra') || 'Participants can use this code to join. Leave blank for no password.'}
                    >
                        <Input.Password placeholder={t('codePlaceholder') || 'Enter password (optional)'} size="large" />
                    </Form.Item>

                    {/* Optional: display computed validation types */}
                    <Form.Item label={t('validationMethods') || 'Validation Methods'}>
                        <Typography.Text type="secondary">
                            {geolocationEnabled && 'GPS'}
                            {geolocationEnabled && (form.getFieldValue('sessionCode')?.trim() ? ', ' : '')}
                            {form.getFieldValue('sessionCode')?.trim() && 'Password'}
                            {!geolocationEnabled && !form.getFieldValue('sessionCode')?.trim() && 'None'}
                        </Typography.Text>
                    </Form.Item>

                    <Flex className="form-actions" gap={16} wrap="wrap">
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            className="primary-action"
                            loading={loading}
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
