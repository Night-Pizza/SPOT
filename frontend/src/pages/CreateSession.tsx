import { EnvironmentOutlined, KeyOutlined, QrcodeOutlined } from '@ant-design/icons';
import {
    Button,
    Card,
    Flex,
    Form,
    Input,
    InputNumber,
    Radio,
    Space,
    Switch,
    Typography,
    message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AppShell from '../components/AppShell';
import { createSession } from '../api/Session';
import GeolocationButton from '../components/GeolocationButton';
import SessionMap from '../components/SessionMap';
import { useTheme } from '../contexts/ThemeContext';

type CreateSessionFormValues = {
    title: string;
    sessionMode?: 'QR' | 'CODE';
    geolocationEnabled?: boolean;
    radius?: number;
    sessionCode?: string;
};

export default function CreateSessionPage() {
    const [form] = Form.useForm<CreateSessionFormValues>();
    const navigate = useNavigate();
    const { t } = useTheme();
    const geolocationEnabled = Form.useWatch('geolocationEnabled', form);
    const sessionMode = Form.useWatch('sessionMode', form);

    const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: CreateSessionFormValues) => {
        if (values.geolocationEnabled && !coords) {
            message.error(t('pleaseSetLocation') || 'Please set your location first.');
            return;
        }

        if (!values.sessionMode) {
            message.error('Please choose a session mode.');
            return;
        }

        const validationTypes: string[] = [];
        if (values.geolocationEnabled) validationTypes.push('GPS');
        if (values.sessionMode === 'CODE') validationTypes.push('PASSWORD');
        if (validationTypes.length === 0) validationTypes.push('NONE');

        const sessionData = {
            title: values.title.trim(),
            validationTypes,
        };

        if (values.sessionMode === 'CODE') {
            Object.assign(sessionData, { password: values.sessionCode?.trim() });
        }

        if (values.geolocationEnabled && coords) {
            Object.assign(sessionData, {
                latitude: coords.lat,
                longitude: coords.long,
                allowedRadius: values.radius,
            });
        }

        try {
            setLoading(true);
            const response = await createSession(sessionData);

            // Формируем объект сессии для передачи через state
            const sessionForState = {
                id: String(response.id),
                title: values.title.trim(),
                password: values.sessionMode === 'CODE' ? values.sessionCode?.trim() || '' : '',
                mode: values.sessionMode,
                geolocationEnabled: values.geolocationEnabled || false,
                radius: values.geolocationEnabled ? values.radius : undefined,
                lat: coords?.lat,
                lng: coords?.long,
                createdAt: new Date().toISOString(),
                validationTypes: validationTypes,
                isActive: true,
            };

            message.success(t('sessionCreated') || 'Session created successfully!');
            navigate(`/sessions/${response.id}`, { state: { session: sessionForState } });
        } catch (error) {
            console.error(error);
            message.error(t('createFailed') || 'Failed to create session');
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
                        label="Session Mode"
                        name="sessionMode"
                        rules={[{ required: true, message: 'Please choose a session mode.' }]}
                    >
                        <Radio.Group
                            size="large"
                            optionType="button"
                            buttonStyle="solid"
                            className="session-mode-choice"
                        >
                            <Radio.Button value="QR">
                                <Space size={8}>
                                    <QrcodeOutlined />
                                    QR Code session
                                </Space>
                            </Radio.Button>
                            <Radio.Button value="CODE">
                                <Space size={8}>
                                    <KeyOutlined />
                                    Code Word session
                                </Space>
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>

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
                            <Switch />
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

                            {coords && (
                                <Form.Item label="Location preview">
                                    <div style={{ height: 300, borderRadius: 16, overflow: 'hidden' }}>
                                        <SessionMap
                                            center={[coords.lat, coords.long]}
                                            radius={form.getFieldValue('radius') || 100}
                                        />
                                    </div>
                                </Form.Item>
                            )}
                        </>
                    )}

                    {sessionMode === 'CODE' && (
                        <Form.Item
                            label={
                                <Space size={8}>
                                    <KeyOutlined className="muted-icon" />
                                    <span>{t('sessionCode') || 'Session Code'}</span>
                                </Space>
                            }
                            name="sessionCode"
                            rules={[
                                { required: true, whitespace: true, message: 'Please enter a session code.' },
                            ]}
                            extra={t('codeExtra') || 'Participants can use this code to join.'}
                        >
                            <Input.Password placeholder={t('codePlaceholder') || 'Enter password'} size="large" />
                        </Form.Item>
                    )}

                    <Form.Item label={t('validationMethods') || 'Validation Methods'}>
                        <Typography.Text type="secondary">
                            {geolocationEnabled && 'GPS'}
                            {geolocationEnabled && sessionMode === 'CODE' && ', '}
                            {sessionMode === 'CODE' && 'Password'}
                            {sessionMode === 'QR' && !geolocationEnabled && 'None'}
                            {!sessionMode && 'Choose a session mode'}
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
