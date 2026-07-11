import { EnvironmentOutlined, KeyOutlined, QrcodeOutlined, CameraOutlined } from '@ant-design/icons';
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
    Spin,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { createSession } from '../api/Session';
import { useGeolocation } from '../hooks/Geolocation';
import SessionMap from '../components/SessionMap';
import { useTheme } from '../contexts/ThemeContext';

type CreateSessionFormValues = {
    title: string;
    sessionMode?: 'QR' | 'CODE';
    geolocationEnabled?: boolean;
    faceRecognitionEnabled?: boolean;
    radius?: number;
    sessionCode?: string;
};

export default function CreateSessionPage() {
    const [form] = Form.useForm<CreateSessionFormValues>();
    const navigate = useNavigate();
    const { t } = useTheme();
    const geolocationEnabled = Form.useWatch('geolocationEnabled', form);
    const faceRecognitionEnabled = Form.useWatch('faceRecognitionEnabled', form);
    const sessionMode = Form.useWatch('sessionMode', form);

    const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
    const [loading, setLoading] = useState(false);

    const { getPosition, loading: geoLoading } = useGeolocation();

    useEffect(() => {
        if (geolocationEnabled && !coords) {
            const fetchLocation = async () => {
                try {
                    const result = await getPosition();
                    setCoords(result);
                    message.success(t('locationSet') || 'Location set!');
                } catch (e) {
                    console.error(e);
                    message.error(t('locationPermissionError') || 'Failed to acquire location. Please grant permission.');
                }
            };
            void fetchLocation();
        }
    }, [geolocationEnabled, coords, getPosition, t]);

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
        if (values.faceRecognitionEnabled) validationTypes.push('FACE');
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
                faceRecognitionEnabled: values.faceRecognitionEnabled || false,
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
                    initialValues={{ geolocationEnabled: false, faceRecognitionEnabled: false, radius: 100 }}
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

                            {geoLoading && !coords && (
                                <div style={{ marginBottom: 16 }}>
                                    <Spin size="small" /> <Typography.Text type="secondary">Acquiring location...</Typography.Text>
                                </div>
                            )}

                            {coords && (
                                <>
                                    <Form.Item label={t('sessionLocation') || 'Session Location'}>
                                        <Space size={12} align="center">
                                            <Typography.Text type="success">
                                                Lat: {coords.lat.toFixed(5)}, Lng: {coords.long.toFixed(5)}
                                            </Typography.Text>
                                            <Button
                                                size="small"
                                                icon={<EnvironmentOutlined />}
                                                onClick={async () => {
                                                    try {
                                                        const result = await getPosition();
                                                        setCoords(result);
                                                        message.success(t('locationSet') || 'Location set!');
                                                    } catch (e) {
                                                        console.error(e);
                                                        message.error(t('locationPermissionError') || 'Failed to acquire location.');
                                                    }
                                                }}
                                                loading={geoLoading}
                                            >
                                                {t('getLocation') || 'Get Location'}
                                            </Button>
                                        </Space>
                                        <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                                            Drag the marker or click on the map to adjust the central location.
                                        </Typography.Paragraph>
                                    </Form.Item>

                                    <Form.Item label="Location preview">
                                        <div style={{ height: 300, borderRadius: 16, overflow: 'hidden' }}>
                                            <SessionMap
                                                center={[coords.lat, coords.long]}
                                                radius={form.getFieldValue('radius') || 100}
                                                onCenterChange={(newCenter) => {
                                                    setCoords({ lat: newCenter[0], long: newCenter[1] });
                                                }}
                                            />
                                        </div>
                                    </Form.Item>
                                </>
                            )}
                        </>
                    )}

                    <div className="session-switch-row" style={{ marginBottom: 16 }}>
                        <Space size={16} align="center">
                            <span className="field-icon field-icon-blue">
                                <CameraOutlined />
                            </span>
                            <div>
                                <Typography.Text strong>Require Face Recognition</Typography.Text>
                                <Typography.Paragraph className="field-helper" style={{ margin: 0 }}>
                                    Students must scan their face to mark attendance
                                </Typography.Paragraph>
                            </div>
                        </Space>
                        <Form.Item name="faceRecognitionEnabled" valuePropName="checked" noStyle>
                            <Switch />
                        </Form.Item>
                    </div>

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

                    <Form.Item label="Validation Methods">
                        <Typography.Text type="secondary">
                            {[
                                geolocationEnabled && 'GPS',
                                sessionMode === 'CODE' && 'Password',
                                faceRecognitionEnabled && 'Face Recognition'
                            ].filter(Boolean).join(', ') || 'None'}
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
