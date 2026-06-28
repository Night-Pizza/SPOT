import { CameraOutlined, NumberOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
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
    Alert,
    Spin
} from 'antd';
import AppShell from '../components/AppShell';
import { useTheme } from '../contexts/ThemeContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createAttendance, scanQrAttendance, ApiError } from '../api/Attendance';
import type { AttendancePayload } from '../api/Attendance';
import { useAuth } from '../contexts/AuthContext';
import FaceRegistrationModal from '../components/face/FaceRegistrationModal';
import FaceCapture from '../components/face/FaceCapture';
import { fileToBase64, checkAttendanceStatus } from '../api/Face';

type CodeFormValues = {
    sessionId: number;
    sessionCode: string;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
    detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

declare global {
    interface Window {
        BarcodeDetector?: BarcodeDetectorConstructor;
    }
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
    const { user, loading } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [scanOpen, setScanOpen] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanError, setScanError] = useState('');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanningRef = useRef(false);

    // Register Modal
    const [registerModalOpen, setRegisterModalOpen] = useState(false);

    // Face Attendance Verification states
    const [faceModalOpen, setFaceModalOpen] = useState(false);
    const [pendingAttendance, setPendingAttendance] = useState<{
        sessionId?: number;
        token?: string;
        payload: AttendancePayload;
    } | null>(null);
    const [faceLoading, setFaceLoading] = useState(false);
    const [faceError, setFaceError] = useState<string | null>(null);
    const [faceStep, setFaceStep] = useState<'capture' | 'verifying' | 'success' | 'failed'>('capture');

    const handleSubmit = async (values: CodeFormValues) => {
        setSubmitting(true);
        try {
            const location = await getBrowserLocation();
            const payload: AttendancePayload = {
                password: values.sessionCode,
                latitude: location.latitude,
                longitude: location.longitude,
            };

            await createAttendance(values.sessionId, payload);

            void messageApi.success('Attendance submitted');
            form.resetFields();
        } catch (error: unknown) {
            if (error instanceof ApiError && error.status === 'MISSING_FACE_RECOGNITION_DATA') {
                const location = await getBrowserLocation();
                setPendingAttendance({
                    sessionId: values.sessionId,
                    payload: {
                        password: values.sessionCode,
                        latitude: location.latitude,
                        longitude: location.longitude,
                    }
                });
                setFaceStep('capture');
                setFaceModalOpen(true);
            } else if (error instanceof GeolocationPositionError) {
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
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    const submitScannedToken = useCallback(async (rawValue: string) => {
        const token = extractQrToken(rawValue);
        if (!token) {
            setScanError('QR code did not contain a token.');
            return;
        }

        setScanLoading(true);
        try {
            let payload: AttendancePayload = {};
            try {
                payload = await getBrowserLocation();
            } catch {
                payload = {};
            }

            await scanQrAttendance(token, payload);
            void messageApi.success('QR attendance submitted');
            setScanOpen(false);
        } catch (error: unknown) {
            if (error instanceof ApiError && error.status === 'MISSING_FACE_RECOGNITION_DATA') {
                setScanOpen(false);
                let payload: AttendancePayload = {};
                try {
                    payload = await getBrowserLocation();
                } catch {
                    payload = {};
                }
                setPendingAttendance({
                    token,
                    payload
                });
                setFaceStep('capture');
                setFaceModalOpen(true);
            } else {
                void messageApi.error(error instanceof Error ? error.message : 'Failed to submit QR attendance.');
                setScanError(error instanceof Error ? error.message : 'Failed to submit QR attendance.');
            }
        } finally {
            setScanLoading(false);
        }
    }, [messageApi]);

    const startScanner = useCallback(async () => {
        setScanError('');

        if (!window.BarcodeDetector) {
            setScanError('QR scanning is not supported by this browser.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            scanningRef.current = true;

            const scanFrame = async () => {
                if (!scanningRef.current || !videoRef.current) return;

                try {
                    const codes = await detector.detect(videoRef.current);
                    if (codes[0]?.rawValue) {
                        scanningRef.current = false;
                        await submitScannedToken(codes[0].rawValue);
                        return;
                    }
                } catch {
                    setScanError('Failed to read QR code from camera.');
                }

                window.setTimeout(() => {
                    void scanFrame();
                }, 300);
            };

            void scanFrame();
        } catch (error: unknown) {
            setScanError(error instanceof Error ? error.message : 'Failed to open camera.');
        }
    }, [submitScannedToken]);

    useEffect(() => {
        if (scanOpen) {
            void startScanner();
        } else {
            stopScanner();
        }

        return stopScanner;
    }, [scanOpen, startScanner, stopScanner]);

    const handleFaceCaptureSubmit = async (photos: File[]) => {
        if (!pendingAttendance) return;
        setFaceLoading(true);
        setFaceError(null);
        setFaceStep('verifying');
        try {
            // Convert files to base64
            const base64Images = await Promise.all(photos.map(p => fileToBase64(p)));
            
            const updatedPayload = {
                ...pendingAttendance.payload,
                images: base64Images
            };

            let res;
            if (pendingAttendance.token) {
                res = await scanQrAttendance(pendingAttendance.token, updatedPayload);
            } else if (pendingAttendance.sessionId) {
                res = await createAttendance(pendingAttendance.sessionId, updatedPayload);
            }

            if (!res || !res.requestId) {
                throw new Error('No verification request ID returned from server.');
            }

            // Start polling status
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds max
            let verified = false;
            while (attempts < maxAttempts) {
                const statusRes = await checkAttendanceStatus(res.requestId);
                if (statusRes.status === 'SUCCESS') {
                    verified = true;
                    break;
                } else if (statusRes.status === 'FAILED') {
                    throw new Error(statusRes.errorMessage || 'Face verification failed.');
                }
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (!verified) {
                throw new Error('Verification request timed out.');
            }

            setFaceStep('success');
        } catch (err) {
            setFaceError(err instanceof Error ? err.message : 'Face validation failed');
            setFaceStep('failed');
        } finally {
            setFaceLoading(false);
        }
    };

    const handleFaceContinue = () => {
        setFaceModalOpen(false);
        setPendingAttendance(null);
        form.resetFields();
        void messageApi.success('Attendance submitted successfully!');
    };

    const handleFaceRetry = () => {
        setFaceStep('capture');
        setFaceError(null);
    };

    return (
        <AppShell title={t('attendance')} showPageTitle={false} pageClassName="attendance-page">
            {contextHolder}
            
            {!loading && !user.faceRegistered && (
                <Alert
                    message="Face Registration Required"
                    description="You have not registered your face embedding yet. Please register your face to enable face recognition check-in."
                    type="warning"
                    showIcon
                    action={
                        <Button size="small" type="primary" onClick={() => setRegisterModalOpen(true)}>
                            Register Face
                        </Button>
                    }
                    style={{ marginBottom: 24 }}
                />
            )}

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

            {/* Face Registration Modal */}
            <FaceRegistrationModal
                visible={registerModalOpen}
                onSuccess={() => {
                    setRegisterModalOpen(false);
                    void messageApi.success('Face registered successfully!');
                }}
                onCancel={() => setRegisterModalOpen(false)}
            />

            {/* Face Attendance Verification Modal */}
            <Modal
                title="Face Verification Required"
                open={faceModalOpen}
                footer={null}
                closable={faceStep !== 'verifying'}
                maskClosable={false}
                width={600}
                onCancel={() => setFaceModalOpen(false)}
            >
                {faceStep === 'capture' && (
                    <FaceCapture
                        onCapture={handleFaceCaptureSubmit}
                        onCancel={() => setFaceModalOpen(false)}
                        loading={faceLoading}
                        error={faceError}
                        mode="triple"
                    />
                )}
                {faceStep === 'verifying' && (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
                        <Typography.Title level={4} style={{ marginTop: 24 }}>Verifying Face...</Typography.Title>
                        <Typography.Paragraph type="secondary">We are extracting your face embedding and validating attendance. Please wait.</Typography.Paragraph>
                    </div>
                )}
                {faceStep === 'success' && (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
                        <Typography.Title level={3} style={{ marginTop: 24 }}>Face Verified!</Typography.Title>
                        <Typography.Paragraph>Your face was successfully matched and attendance registered.</Typography.Paragraph>
                        <Button type="primary" size="large" onClick={handleFaceContinue} className="primary-action wide-button" style={{ marginTop: 16 }}>
                            Continue
                        </Button>
                    </div>
                )}
                {faceStep === 'failed' && (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <CloseCircleOutlined style={{ fontSize: 64, color: '#f5222d' }} />
                        <Typography.Title level={3} style={{ marginTop: 24 }}>Verification Failed</Typography.Title>
                        <Typography.Paragraph type="danger">{faceError || 'Face not recognized.'}</Typography.Paragraph>
                        <Space style={{ marginTop: 16 }}>
                            <Button type="primary" size="large" onClick={handleFaceRetry} className="primary-action">
                                Try Again
                            </Button>
                            <Button size="large" onClick={() => setFaceModalOpen(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </div>
                )}
            </Modal>
        </AppShell>
    );
}
