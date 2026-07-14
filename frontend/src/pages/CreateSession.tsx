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
    Modal,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import AppShell from '../components/AppShell';
import { createSession /*, type CreateSessionRequest */ } from '../api/Session';
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

type ValidationType = 'GPS' | 'PASSWORD' | 'FACE' | 'NONE';
interface CreateSessionRequest {
    title: string;
    validationTypes: ValidationType[];
    password?: string;
    latitude?: number;
    longitude?: number;
    allowedRadius?: number;
}

export default function CreateSessionPage() {
    const [form] = Form.useForm<CreateSessionFormValues>();
    const navigate = useNavigate();
    const { t } = useTheme();

    const geolocationEnabled = Form.useWatch('geolocationEnabled', form);
    const faceRecognitionEnabled = Form.useWatch('faceRecognitionEnabled', form);
    const sessionMode = Form.useWatch('sessionMode', form);

    const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);
    const [loading, setLoading] = useState(false);

    const [mapOpen, setMapOpen] = useState(false);

    const { getPosition, loading: geoLoading } = useGeolocation();
    const fetchingRef = useRef(false);

    useEffect(() => {
        if (geolocationEnabled && !coords && !fetchingRef.current) {
            fetchingRef.current = true;
            const fetchLocation = async () => {
                try {
                    const result = await getPosition();
                    setCoords(result);
                    message.success(t('locationSet'));
                } catch (e) {
                    console.error(e);
                    message.error(t('locationPermissionError'));
                } finally {
                    fetchingRef.current = false;
                }
            };
            void fetchLocation();
        }
    }, [geolocationEnabled, coords, getPosition, t]);

    const handleSubmit = async (values: CreateSessionFormValues) => {
        if (values.geolocationEnabled && !coords) {
            message.error(t('pleaseSetLocation'));
            return;
        }
        if (!values.sessionMode) {
            message.error(t('checkInMethod'));
            return;
        }

        const validationTypes: ValidationType[] = [];
        if (values.geolocationEnabled) validationTypes.push('GPS');
        if (values.sessionMode === 'CODE') validationTypes.push('PASSWORD');
        if (values.faceRecognitionEnabled) validationTypes.push('FACE');
        if (validationTypes.length === 0) validationTypes.push('NONE');

        const rawRadius = Number(values.radius);
        const safeRadius = Number.isNaN(rawRadius) ? undefined : Math.max(rawRadius, 10);

        const sessionData: CreateSessionRequest = {
            title: values.title.trim(),
            validationTypes,
        };

        if (values.sessionMode === 'CODE' && values.sessionCode?.trim()) {
            sessionData.password = values.sessionCode.trim();
        }
        if (values.geolocationEnabled && coords) {
            sessionData.latitude = coords.lat;
            sessionData.longitude = coords.long;
            if (safeRadius !== undefined) sessionData.allowedRadius = safeRadius;
        }

        try {
            setLoading(true);
            const response = await createSession(sessionData);

            const sessionForState = {
                id: String(response.id),
                title: values.title.trim(),
                password: values.sessionMode === 'CODE' ? values.sessionCode?.trim() || '' : '',
                mode: values.sessionMode,
                geolocationEnabled: values.geolocationEnabled || false,
                faceRecognitionEnabled: values.faceRecognitionEnabled || false,
                radius: values.geolocationEnabled ? safeRadius : undefined,
                lat: coords?.lat,
                lng: coords?.long,
                createdAt: new Date().toISOString(),
                validationTypes,
                isActive: true,
            };

            message.success(t('sessionCreated'));
            navigate(`/sessions/${response.id}`, { state: { session: sessionForState } });
        } catch (error) {
            console.error(error);
            message.error(t('createFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell title={t('createSession')} subtitle={t('sessionDetails')} pageClassName="create-session-page">
            <Card className="session-form-card">
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ geolocationEnabled: false, faceRecognitionEnabled: false, radius: 100 }}
                    onFinish={handleSubmit}
                    requiredMark={false}
                    autoComplete="off"
                >
                    <Form.Item
                        label={t('checkInMethod')}
                        name="sessionMode"
                        rules={[{ required: true, message: t('checkInMethod') }]}
                        style={{ marginBottom: 12 }}
                    >
                        <Radio.Group size="large" optionType="button" buttonStyle="solid" className="session-mode-choice">
                            <Radio.Button value="QR">
                                <Space size={8}>
                                    <QrcodeOutlined />
                                    {t('scanQR')}
                                </Space>
                            </Radio.Button>
                            <Radio.Button value="CODE">
                                <Space size={8}>
                                    <KeyOutlined />
                                    {t('sessionCode')}
                                </Space>
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item
                        label={t('sessionTitle')}
                        name="title"
                        rules={[{ required: true, whitespace: true, message: t('titleRequired') }]}
                        style={{ marginBottom: 12 }}
                    >
                        <Input placeholder={t('titlePlaceholder')} size="large" autoComplete="off" />
                    </Form.Item>

                    <div className="session-switch-row" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size={12} align="center">
                            <span className="field-icon field-icon-green"><EnvironmentOutlined /></span>
                            <div>
                                <Typography.Text strong>{t('limitByLocation')}</Typography.Text>
                                <Typography.Paragraph className="field-helper" style={{ margin: 0 }}>
                                    {t('onlyNearCheckIn')}
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
                                    { required: true, message: t('radiusRequired') },
                                    { type: 'number', min: 1, message: t('radiusMin') },
                                ]}
                                style={{ marginBottom: 8 }}
                            >
                                <InputNumber size="large" min={1} addonAfter={t('meters')} className="full-width-input" />
                            </Form.Item>

                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                                <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                                    {coords ? `Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.long.toFixed(5)}` : t('locationNotSet')}
                                </Typography.Text>
                                <Button
                                    size="small"
                                    icon={<EnvironmentOutlined />}
                                    onClick={async () => {
                                        try {
                                            const result = await getPosition();
                                            setCoords(result);
                                            message.success(t('locationSet'));
                                        } catch (e) {
                                            console.error(e);
                                            message.error(t('locationPermissionError'));
                                        }
                                    }}
                                    loading={geoLoading}
                                >
                                    {t('useDeviceLocation')}
                                </Button>

                                <Button size="small" onClick={() => setMapOpen(true)}>
                                    {t('pickOnMap')}
                                </Button>
                            </div>

                            {geoLoading && !coords && (
                                <div style={{ marginBottom: 6 }}>
                                    <Spin size="small" /> <Typography.Text type="secondary">{t('gettingLocation')}</Typography.Text>
                                </div>
                            )}
                        </>
                    )}

                    <div className="session-switch-row" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size={12} align="center">
                            {/* камера с тем же стилем, что и гео */}
                            <span className="field-icon field-icon-green"><CameraOutlined /></span>
                            <div>
                                <Typography.Text strong>{t('faceRecognition')}</Typography.Text>
                                <Typography.Paragraph className="field-helper" style={{ margin: 0 }}>
                                    {t('faceRecognitionHelp')}
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
                                    <span>{t('sessionCode')}</span>
                                </Space>
                            }
                            name="sessionCode"
                            rules={[{ required: true, whitespace: true, message: t('sessionCode') }]}
                            extra={t('codeExtra')}
                            style={{ marginBottom: 8 }}
                        >
                            <Input.Password placeholder={t('codePlaceholder')} size="large" autoComplete="new-password" />
                        </Form.Item>
                    )}

                    <Form.Item label={t('validationMethods')} style={{ marginBottom: 12 }}>
                        <Typography.Text type="secondary">
                            {[
                                geolocationEnabled && t('gps'),
                                sessionMode === 'CODE' && t('password'),
                                faceRecognitionEnabled && t('faceRecShort')
                            ].filter(Boolean).join(', ') || t('none')}
                        </Typography.Text>
                    </Form.Item>

                    <Flex className="form-actions" gap={12} wrap="wrap">
                        <Button type="primary" htmlType="submit" size="large" className="primary-action" loading={loading}>
                            {t('createSession')}
                        </Button>
                        <Button size="large" onClick={() => navigate('/sessions')}>
                            {t('cancel')}
                        </Button>
                    </Flex>
                </Form>
            </Card>

            <Modal
                title={t('pickLocation')}
                open={mapOpen}
                onCancel={() => setMapOpen(false)}
                onOk={() => setMapOpen(false)}
                okText={t('done')}
                width={720}
                bodyStyle={{ padding: 0 }}
                destroyOnClose
            >
                <div style={{ height: 420, overflow: 'hidden', borderRadius: 12 }}>
                    <SessionMap
                        center={[coords?.lat || 0, coords?.long || 0]}
                        radius={form.getFieldValue('radius') || 100}
                        onCenterChange={(c) => setCoords({ lat: c[0], long: c[1] })}
                    />
                </div>
                <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Typography.Text type="secondary">
                        {t('mapHint')}
                    </Typography.Text>
                    <Space size={8} align="center" wrap>
                        <Typography.Text type="secondary">{t('allowedRadiusShort')}:</Typography.Text>
                        <InputNumber
                            size="small"
                            min={10}
                            value={form.getFieldValue('radius') || 100}
                            onChange={(val) => {
                                const r = Number(val);
                                if (!Number.isNaN(r)) form.setFieldsValue({ radius: Math.max(r, 10) });
                            }}
                            addonAfter={t('metersShort')}
                            style={{ width: 140 }}
                        />
                        <Button
                            size="small"
                            icon={<EnvironmentOutlined />}
                            onClick={async () => {
                                try {
                                    const result = await getPosition();
                                    setCoords(result);
                                    message.success(t('locationSet'));
                                } catch (e) {
                                    console.error(e);
                                    message.error(t('locationPermissionError'));
                                }
                            }}
                            loading={geoLoading}
                        >
                            {t('useDeviceLocation')}
                        </Button>
                    </Space>
                </div>
            </Modal>
        </AppShell>
    );
}
