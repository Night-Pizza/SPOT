import { CameraOutlined, NumberOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
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
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import type { AttendancePayload } from '../api/Attendance';
import { useAuth } from '../contexts/AuthContext';
import FaceRegistrationModal from '../components/face/FaceRegistrationModal';
import FaceCapture from '../components/face/FaceCapture';
import { fileToBase64, checkAttendanceStatus } from '../api/Face';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { getAssertionOptions, verifyAssertion, getRegistrationOptions, verifyRegistration } from '../api/WebAuth';

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
    const { user, loading, refreshCurrentUser } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [scanOpen, setScanOpen] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanError, setScanError] = useState('');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const scannerControlsRef = useRef<IScannerControls | null>(null);
    const scanningRef = useRef(false);
    const scanRunRef = useRef(0);
    const [registerModalOpen, setRegisterModalOpen] = useState(false);

    // WebAuth Registration state
    const [registeringDevice, setRegisteringDevice] = useState(false);

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

    const handleRegisterDevice = async () => {
        setRegisteringDevice(true);
        try {
            const { optionsJson } = await getRegistrationOptions();
            const parsedOptions = JSON.parse(optionsJson);
            if (parsedOptions.extensions) {
                delete parsedOptions.extensions.appidExclude;
                delete parsedOptions.extensions.appid;
            }

            const attestationResponse = await startRegistration({
                ...parsedOptions,
            });

            await verifyRegistration(JSON.stringify(attestationResponse));
            void messageApi.success('Biometric device registered successfully!');
            await refreshCurrentUser();
        } catch (err: any) {
            console.error('Device registration failed:', err);
            let userFriendlyMsg = err.message || 'Biometric device registration failed.';
            if (err.name === 'InvalidStateError' || userFriendlyMsg.includes('previously registered') || userFriendlyMsg.includes('InvalidState') || userFriendlyMsg.includes('exclude')) {
                userFriendlyMsg = 'The device is already in use by someone else';
            }
            void messageApi.error(userFriendlyMsg);
        } finally {
            setRegisteringDevice(false);
        }
    };

    const handleDeviceAuthentication = async (): Promise<boolean> => {
        try {
            const { optionsJson } = await getAssertionOptions();
            const parsedOptions = JSON.parse(optionsJson);
            const authOptions = parsedOptions.publicKeyCredentialRequestOptions || parsedOptions.publicKey || parsedOptions;

            if (authOptions && authOptions.extensions) {
                delete authOptions.extensions.appidExclude;
                delete authOptions.extensions.appid;
            }

            const assertionResponse = await startAuthentication({
                optionsJSON: authOptions,
            });

            await verifyAssertion(JSON.stringify(assertionResponse));
            return true;
        } catch (err: any) {
            console.error('Device biometric check failed:', err);
            let errorMsg = err.message || 'Device biometric verification failed.';
            
            if (errorMsg.toLowerCase().includes('no credential') || errorMsg.toLowerCase().includes('not allowed')) {
                errorMsg = 'Passkey not found on this device. Please use the exact device you originally registered with.';
            }
            
            void messageApi.error(errorMsg);
            return false;
        }
    };

    const handleSubmit = async (values: CodeFormValues) => {
        setSubmitting(true);
        try {
            // Trigger biometrics check automatically before submitting session code
            const biometricsOk = await handleDeviceAuthentication();
            if (!biometricsOk) {
                setSubmitting(false);
                return;
            }

            let locationData: { latitude?: number, longitude?: number } = {};
            try {
                const loc = await getBrowserLocation();
                locationData = { latitude: loc.latitude, longitude: loc.longitude };
            } catch (err) {
                console.warn('Geolocation skipped or denied:', err);
            }

            const payload: AttendancePayload = {
                password: values.sessionCode,
                ...locationData,
            };

            await createAttendance(values.sessionId, payload);

            void messageApi.success('Attendance submitted');
            form.resetFields();
        } catch (error: unknown) {
            if (error instanceof ApiError && error.status === 'MISSING_FACE_RECOGNITION_DATA') {
                let locData: { latitude?: number, longitude?: number } = {};
                try {
                    const loc = await getBrowserLocation();
                    locData = { latitude: loc.latitude, longitude: loc.longitude };
                } catch (err) {
                    // Ignore
                }
                setPendingAttendance({
                    sessionId: values.sessionId,
                    payload: {
                        password: values.sessionCode,
                        ...locData,
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
            // Trigger biometrics check automatically after successful QR scan
            const biometricsOk = await handleDeviceAuthentication();
            if (!biometricsOk) {
                setScanLoading(false);
                return;
            }

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
    }, [scanOpen, startScanner, stopScanner]);

    const handleFaceCaptureSubmit = async (photos: File[]) => {
        if (!pendingAttendance) return;
        setFaceLoading(true);
        setFaceError(null);
        setFaceStep('verifying');
        try {
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

            const requestId = res?.payload?.requestId ?? res?.requestId;

            if (!requestId) {
                throw new Error('No verification request ID returned from server.');
            }

            let attempts = 0;
            const maxAttempts = 30;
            let verified = false;
            while (attempts < maxAttempts) {
                const statusRes = await checkAttendanceStatus(requestId);
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
            
            {/* Show Face Registration Warning only AFTER device key is set up */}
            {!loading && user.webauthRegistered && !user.faceRegistered && (
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

            {!loading && !user.webauthRegistered ? (
                <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
                    <Card style={{ borderRadius: 16 }}>
                        <Space direction="vertical" size={24} style={{ width: '100%' }}>
                            <SafetyCertificateOutlined style={{ fontSize: 48, color: '#fa8c16' }} />
                            <div>
                                <Typography.Title level={3}>Biometric Device Required</Typography.Title>
                                <Typography.Paragraph type="secondary">
                                    You must register this device with your biometrics before you can mark attendance.
                                </Typography.Paragraph>
                            </div>
                            <Button
                                type="primary"
                                size="large"
                                onClick={handleRegisterDevice}
                                loading={registeringDevice}
                                className="primary-action wide-button"
                            >
                                Register Device
                            </Button>
                        </Space>
                    </Card>
                </div>
            ) : (
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
            )}
            
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
