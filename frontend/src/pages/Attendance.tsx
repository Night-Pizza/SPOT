import { CameraOutlined, NumberOutlined } from '@ant-design/icons';
import {
    Button,
    Card,
    Form,
    Input,
    InputNumber,
    Modal,
    Space,
    Typography,
    message,
} from 'antd';
import AppShell from '../components/AppShell';
import { useTheme } from '../contexts/ThemeContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createAttendance, scanQrAttendance } from '../api/Attendance';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';

type CodeFormValues = {
    sessionId: number;
    sessionCode: string;
};

const SCAN_ERRORS = {
    permissionDenied: 'Camera access was denied. Allow camera permission in your browser and try again.',
    noCamera: 'No camera was found on this device.',
    insecureContext: 'Camera scanning requires HTTPS or localhost. Open this site through HTTPS or localhost and try again.',
    unsupportedApi: 'This browser does not support the camera APIs required by this app.',
    initializationFailed: 'Could not start the QR scanner. Close the modal and try again.',
    readFailed: 'Failed to read QR code from camera.',
} as const;

const RECOVERABLE_SCAN_ERROR_KINDS = new Set([
    'NotFoundException',
    'ChecksumException',
    'FormatException',
]);

function isLocalhost(hostname: string) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isCameraSecureContext() {
    return window.isSecureContext || isLocalhost(window.location.hostname);
}

function getScannerPreflightError() {
    if (!isCameraSecureContext()) {
        return SCAN_ERRORS.insecureContext;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        return SCAN_ERRORS.unsupportedApi;
    }

    return '';
}

function isRecoverableScanError(error: unknown) {
    if (typeof error !== 'object' || error === null) return false;

    const errorRecord = error as {
        name?: unknown;
        getKind?: unknown;
        constructor?: { name?: string; kind?: string };
    };
    const kind = typeof errorRecord.getKind === 'function'
        ? errorRecord.getKind()
        : errorRecord.constructor?.kind;
    const errorName = typeof errorRecord.name === 'string'
        ? errorRecord.name
        : errorRecord.constructor?.name;

    return (typeof kind === 'string' && RECOVERABLE_SCAN_ERROR_KINDS.has(kind))
        || (typeof errorName === 'string' && RECOVERABLE_SCAN_ERROR_KINDS.has(errorName));
}

function logScannerError(error: unknown) {
    if (import.meta.env.DEV) {
        console.error('QR scanner error:', error);
    }
}

function getCameraErrorMessage(error: unknown) {
    if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            return SCAN_ERRORS.permissionDenied;
        }

        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            return SCAN_ERRORS.noCamera;
        }

        if (error.name === 'SecurityError') {
            return isCameraSecureContext() ? SCAN_ERRORS.permissionDenied : SCAN_ERRORS.insecureContext;
        }
    }

    return SCAN_ERRORS.initializationFailed;
}

function extractQrToken(rawValue: string) {
    try {
        const parsed = JSON.parse(rawValue) as { token?: unknown };
        if (typeof parsed.token === 'string' && parsed.token.trim()) return parsed.token.trim();
    } catch {
        // The QR can also be a raw token or a URL containing token.
    }

    try {
        const url = new URL(rawValue);
        const token = url.searchParams.get('token');
        if (token?.trim()) return token.trim();
    } catch {
        // Ignore non-URL QR content.
    }

    return rawValue.trim();
}

async function getBrowserLocation() {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Геолокация не поддерживается вашим браузером.'));
        } else {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
            });
        }
    });

    return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
    };
}

export default function Attendance() {
    const [form] = Form.useForm<CodeFormValues>();
    const [messageApi, contextHolder] = message.useMessage();
    const sessionId = Form.useWatch('sessionId', form);
    const sessionCode = Form.useWatch('sessionCode', form);
    const { t } = useTheme();
    const [submitting, setSubmitting] = useState(false);
    const [scanOpen, setScanOpen] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanError, setScanError] = useState('');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const scannerControlsRef = useRef<IScannerControls | null>(null);
    const scanningRef = useRef(false);
    const scanRunRef = useRef(0);

    const handleSubmit = async (values: CodeFormValues) => {
        setSubmitting(true);
        try {
            const location = await getBrowserLocation();

            await createAttendance(values.sessionId, {
                password: values.sessionCode,
                latitude: location.latitude,
                longitude: location.longitude,
            });

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

    const stopScanner = useCallback(() => {
        scanningRef.current = false;
        scanRunRef.current += 1;
        scannerControlsRef.current?.stop();
        scannerControlsRef.current = null;

        if (videoRef.current) {
            const stream = videoRef.current.srcObject;
            if (stream instanceof MediaStream) {
                stream.getTracks().forEach((track) => track.stop());
            }

            videoRef.current.pause();
            videoRef.current.srcObject = null;
            videoRef.current.removeAttribute('src');
            videoRef.current.load();
        }
    }, []);

    const submitScannedToken = useCallback(async (rawValue: string) => {
        const token = extractQrToken(rawValue);
        if (!token) {
            setScanError('QR code did not contain a token.');
            return;
        }

        setScanLoading(true);
        try {
            let payload = {};
            try {
                payload = await getBrowserLocation();
            } catch {
                payload = {};
            }

            await scanQrAttendance(token, payload);
            void messageApi.success('QR attendance submitted');
            setScanOpen(false);
        } catch (error: unknown) {
            void messageApi.error(error instanceof Error ? error.message : 'Failed to submit QR attendance.');
            setScanError(error instanceof Error ? error.message : 'Failed to submit QR attendance.');
        } finally {
            setScanLoading(false);
        }
    }, [messageApi]);

    const startScanner = useCallback(async () => {
        setScanError('');

        const preflightError = getScannerPreflightError();
        if (preflightError) {
            setScanError(preflightError);
            return;
        }

        if (!videoRef.current) {
            const error = new Error('QR scanner video element is not mounted.');
            logScannerError(error);
            setScanError(SCAN_ERRORS.initializationFailed);
            return;
        }

        const scanRun = scanRunRef.current + 1;
        scanRunRef.current = scanRun;
        scanningRef.current = true;

        try {
            const videoElement = videoRef.current;
            const codeReader = new BrowserQRCodeReader(undefined, {
                delayBetweenScanAttempts: 300,
                delayBetweenScanSuccess: 300,
            });
            const controls = await codeReader.decodeFromConstraints({
                video: { facingMode: 'environment' },
            }, videoElement, (result, error, controls) => {
                if (!scanningRef.current || scanRun !== scanRunRef.current) return;

                const rawValue = result?.getText();
                if (rawValue) {
                    scanningRef.current = false;
                    controls.stop();
                    scannerControlsRef.current = null;
                    void submitScannedToken(rawValue);
                    return;
                }

                if (error && !isRecoverableScanError(error)) {
                    logScannerError(error);
                    scanningRef.current = false;
                    controls.stop();
                    scannerControlsRef.current = null;
                }
            });

            if (scanRun !== scanRunRef.current || !scanningRef.current) {
                controls.stop();
                return;
            }

            if (videoElement.paused) {
                await videoElement.play();
            }

            scannerControlsRef.current = controls;
        } catch (error: unknown) {
            logScannerError(error);
            scanningRef.current = false;
            setScanError(getCameraErrorMessage(error));
            stopScanner();
        }
    }, [stopScanner, submitScannedToken]);

    const handleScannerModalOpenChange = useCallback((open: boolean) => {
        if (open) {
            void startScanner();
        } else {
            stopScanner();
        }
    }, [startScanner, stopScanner]);

    useEffect(() => {
        if (!scanOpen) {
            stopScanner();
        }

        return stopScanner;
    }, [scanOpen, stopScanner]);

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
                        <Button
                            type="primary"
                            size="large"
                            className="primary-action wide-button"
                            onClick={() => setScanOpen(true)}
                            loading={scanLoading}
                        >
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
            <Modal
                title={t('scanQRCode')}
                open={scanOpen}
                onCancel={() => setScanOpen(false)}
                afterOpenChange={handleScannerModalOpenChange}
                footer={null}
                centered
            >
                <Space direction="vertical" size={16} className="full-width-space">
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        style={{ width: '100%', borderRadius: 16, background: '#000' }}
                    />
                    {scanError && <Typography.Text type="danger">{scanError}</Typography.Text>}
                    {scanLoading && <Typography.Text type="secondary">Submitting attendance...</Typography.Text>}
                </Space>
            </Modal>
        </AppShell>
    );
}
