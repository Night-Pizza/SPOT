import { CameraOutlined, NumberOutlined } from '@ant-design/icons';
import {
    Button,
    Card,
    Form,
    Input,
    InputNumber,
    Space,
    Typography,
    message,
} from 'antd';
import AppShell from '../components/AppShell';
import { useTheme } from '../contexts/ThemeContext';
import { useState } from 'react';

type CodeFormValues = {
    sessionId: number;
    sessionCode: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const data = await response.json() as { message?: string; error?: string };
        return data.message || data.error || fallback;
    } catch {
        return fallback;
    }
}

export default function Attendance() {
    const [form] = Form.useForm<CodeFormValues>();
    const [messageApi, contextHolder] = message.useMessage();
    const sessionId = Form.useWatch('sessionId', form);
    const sessionCode = Form.useWatch('sessionCode', form);
    const { t } = useTheme();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (values: CodeFormValues) => {
        setSubmitting(true);
        try {
            // Запрашиваем геопозицию у браузера пользователя
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Геолокация не поддерживается вашим браузером.'));
                } else {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true, // Запрашиваем более точные координаты
                        timeout: 5000,            // Таймаут ожидания 5 секунд
                    });
                }
            });

            const { latitude, longitude } = position.coords;

            const response = await fetch(`${API_BASE_URL}/attendance/create`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: values.sessionId,
                    payload: {
                        password: values.sessionCode,
                        latitude: latitude,   // Передаем широту в payload
                        longitude: longitude, // Передаем долготу в payload
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Failed to submit attendance.'));
            }

            void messageApi.success('Attendance submitted');
            form.resetFields();
        } catch (error: unknown) {
            // Обрабатываем системную ошибку браузера, если пользователь запретил доступ к GPS
            if (error instanceof GeolocationPositionError) {
                void messageApi.error('Необходимо разрешить доступ к геоданным в браузере для отметки присутствия.');
            } else {
                void messageApi.error(error instanceof Error ? error.message : 'Failed to submit attendance.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AppShell title={t('attendance')} showPageTitle={false} pageClassName="attendance-page">
            {contextHolder}
            <div className="attendance-actions-grid">
                <Card className="attendance-action-card scan-card">
                    <Space direction="vertical" align="center" size={18}>
                        <span className="large-action-icon green-icon">
                            <CameraOutlined />
                        </span>
                        <div className="centered-copy">
                            <Typography.Title level={2}>{t('scanQRCode')}</Typography.Title>
                            <Typography.Paragraph>
                                {t('scanQRDesc')}
                            </Typography.Paragraph>
                        </div>
                        <Button type="primary" size="large" className="primary-action wide-button">
                            {t('openCamera')}
                        </Button>
                    </Space>
                </Card>

                <Card className="attendance-action-card code-card">
                    <Space direction="vertical" size={24} className="full-width-space">
                        <Space size={18} align="start">
                            <span className="large-action-icon blue-icon">
                                <NumberOutlined />
                            </span>
                            <div>
                                <Typography.Title level={2}>{t('enterSessionCode')}</Typography.Title>
                                <Typography.Paragraph>
                                    {t('enterCodeDesc')}
                                </Typography.Paragraph>
                            </div>
                        </Space>

                        <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark={false}>
                            <Form.Item
                                name="sessionId"
                                label="Session ID"
                                rules={[
                                    { required: true, message: 'Please enter a session ID.' },
                                    {
                                        type: 'integer',
                                        min: 1,
                                        message: 'Session ID must be a positive integer.',
                                    },
                                ]}
                            >
                                <InputNumber
                                    size="large"
                                    placeholder="123"
                                    min={1}
                                    precision={0}
                                    className="full-width-space"
                                />
                            </Form.Item>
                            <Form.Item
                                name="sessionCode"
                                label="Session Code"
                                rules={[
                                    { required: true, whitespace: true, message: 'Please enter a session code.' },
                                ]}
                            >
                                <Input.Password size="large" placeholder="Session password" />
                            </Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                className="primary-action wide-button"
                                loading={submitting}
                                disabled={!sessionId || !sessionCode?.trim()}
                            >
                                {t('submitCode')}
                            </Button>
                        </Form>
                    </Space>
                </Card>
            </div>
        </AppShell>
    );
}