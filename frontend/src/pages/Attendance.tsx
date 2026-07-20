import { CameraOutlined, NumberOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined, SafetyCertificateOutlined, EnvironmentOutlined } from '@ant-design/icons';
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
    Spin,
    Flex,
    Select,
    DatePicker
} from 'antd';
import type { Dayjs } from 'dayjs';
import AppShell from '../components/AppShell';
import { useTheme } from '../contexts/ThemeContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createAttendance, scanQrAttendance, ApiError, getAttendedSessions, type AttendancePayload, type AttendedSessionHistoryItem } from '../api/Attendance';
import { getSessionPublicDetails, getSessionPublicDetailsByQrToken, type SessionPublicDetails } from '../api/Session';
import SessionMap from '../components/SessionMap';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { useAuth } from '../contexts/AuthContext';
import FaceRegistrationModal from '../components/face/FaceRegistrationModal';
import FaceCapture from '../components/face/FaceCapture';
import { fileToBase64, checkAttendanceStatus } from '../api/Face';
import { startRegistration } from '@simplewebauthn/browser';
import { getRegistrationOptions, verifyRegistration } from '../api/WebAuth';

type CodeFormValues = {
    sessionId: number;
    sessionCode: string;
};

function formatAttendanceDate(timestamp: string) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(timestamp));
}



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
    const { user, loading, refreshCurrentUser, markWebauthVerified, clearWebauthVerification } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
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

    const [history, setHistory] = useState<AttendedSessionHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState('');

    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

    const [currentSessionDetails, setCurrentSessionDetails] = useState<SessionPublicDetails | null>(null);
    const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [fetchingDetails, setFetchingDetails] = useState(false);
    const [isGeoModalOpen, setIsGeoModalOpen] = useState(false);

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError('');

        try {
            const attendedSessions = await getAttendedSessions();
            setHistory(attendedSessions);
        } catch (error) {
            setHistoryError(error instanceof Error ? error.message : 'Failed to load attendance history');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadHistory();
    }, [loadHistory]);

    const filteredAndSortedHistory = [...history]
        .filter(s => {
            if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (dateRange && dateRange[0] && dateRange[1]) {
                const sessionTime = new Date(s.timestamp).getTime();
                const start = dateRange[0].startOf('day').valueOf();
                const end = dateRange[1].endOf('day').valueOf();
                if (sessionTime < start || sessionTime > end) {
                    return false;
                }
            }
            return true;
        })
        .sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            if (sortBy === 'newest') {
                return timeB - timeA;
            } else {
                return timeA - timeB;
            }
        });

    useEffect(() => {
        if (!sessionId || typeof sessionId !== 'number' || sessionId <= 0) {
            setCurrentSessionDetails(null);
            setUserCoords(null);
            return;
        }

        const fetchDetails = async () => {
            setFetchingDetails(true);
            try {
                const details = await getSessionPublicDetails(sessionId);
                setCurrentSessionDetails(details);
            } catch (err) {
                console.error('Failed to fetch session public details:', err);
                setCurrentSessionDetails(null);
                setUserCoords(null);
            } finally {
                setFetchingDetails(false);
            }
        };

        const timer = setTimeout(fetchDetails, 500); // Debounce typing
        return () => clearTimeout(timer);
    }, [sessionId]);

    useEffect(() => {
        if (currentSessionDetails?.validationTypes.includes('GPS')) {
            const fetchUserLocation = async () => {
                try {
                    const loc = await getBrowserLocation();
                    setUserCoords(loc);
                } catch (err) {
                    console.error('Failed to get user location:', err);
                }
            };
            void fetchUserLocation();
        }
    }, [currentSessionDetails]);

    useEffect(() => {
        if (isGeoModalOpen && !userCoords) {
            getBrowserLocation()
                .then(setUserCoords)
                .catch(err => console.error('Failed to get user location on modal open:', err));
        }
    }, [isGeoModalOpen, userCoords]);

    const handleRegisterDevice = async () => {
        setRegisteringDevice(true);
        try {
            const { optionsJson } = await getRegistrationOptions();
            const parsedOptions = JSON.parse(optionsJson);
            const regOptions = parsedOptions.publicKeyCredentialCreationOptions || parsedOptions.publicKey || parsedOptions;

            if (regOptions.extensions) {
                delete regOptions.extensions.appidExclude;
                delete regOptions.extensions.appid;
            }

            regOptions.hints = ['client-device'];

            const attestationResponse = await startRegistration({
                optionsJSON: regOptions,
            });

            await verifyRegistration(JSON.stringify(attestationResponse));
            void messageApi.success('Biometric device registered successfully!');
            markWebauthVerified();
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

    const handleSubmit = async (values: CodeFormValues) => {
        setSubmitting(true);
        try {

            let locationData: { latitude?: number, longitude?: number } = {};
            if (currentSessionDetails?.validationTypes.includes('GPS')) {
                let loc = userCoords;
                if (!loc) {
                    try {
                        loc = await getBrowserLocation();
                        setUserCoords(loc);
                    } catch (err) {
                        console.warn('Geolocation skipped or denied:', err);
                    }
                }
                if (loc) {
                    locationData = { latitude: loc.latitude, longitude: loc.longitude };
                }
            }

            const payload: AttendancePayload = {
                password: values.sessionCode,
                ...locationData,
            };

            await createAttendance(values.sessionId, payload);

            void messageApi.success(t('attendanceSubmitted'));
            form.resetFields();
            setCurrentSessionDetails(null);
            setUserCoords(null);
            void loadHistory();
        } catch (error: unknown) {
            if (error instanceof ApiError && error.status === 'MISSING_FACE_RECOGNITION_DATA') {
                let locData: { latitude?: number, longitude?: number } = {};
                if (currentSessionDetails?.validationTypes.includes('GPS')) {
                    const loc = userCoords || { latitude: undefined, longitude: undefined };
                    locData = { latitude: loc.latitude, longitude: loc.longitude };
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
                void messageApi.error(t('locationPermissionError'));
            } else {
                if (error instanceof Error && error.message.includes('WebAuthn verification is required')) {
                    clearWebauthVerification();
                } else {
                    void messageApi.error(error instanceof Error ? error.message : 'Failed to submit attendance.');
                }
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
            setScanError(t('qrNoToken'));
            return;
        }

        setScanLoading(true);
        try {
            // Fetch session public details associated with the token first
            const details = await getSessionPublicDetailsByQrToken(token);
            setCurrentSessionDetails(details);

            let payload: AttendancePayload = {};
            let fetchedLoc = null;
            if (details.validationTypes.includes('GPS')) {
                try {
                    fetchedLoc = await getBrowserLocation();
                    setUserCoords(fetchedLoc);
                    payload = { latitude: fetchedLoc.latitude, longitude: fetchedLoc.longitude };
                } catch (err) {
                    console.warn('Geolocation skipped or denied:', err);
                }
            }

            await scanQrAttendance(token, payload);
            void messageApi.success(t('qrAttendanceSubmitted'));
            setScanOpen(false);
            setCurrentSessionDetails(null);
            setUserCoords(null);
            void loadHistory();
        } catch (error: unknown) {
            if (error instanceof ApiError && error.status === 'MISSING_FACE_RECOGNITION_DATA') {
                setScanOpen(false);
                let locPayload: AttendancePayload = {};
                // If we got the details earlier and fetched location, use it
                try {
                    const details = await getSessionPublicDetailsByQrToken(token);
                    if (details.validationTypes.includes('GPS')) {
                        const loc = await getBrowserLocation();
                        setUserCoords(loc);
                        locPayload = { latitude: loc.latitude, longitude: loc.longitude };
                    }
                } catch (err) {
                    // ignore
                }
                setPendingAttendance({
                    token,
                    payload: locPayload
                });
                setFaceStep('capture');
                setFaceModalOpen(true);
            } else {
                if (error instanceof Error && error.message.includes('WebAuthn verification is required')) {
                    clearWebauthVerification();
                } else {
                    void messageApi.error(error instanceof Error ? error.message : 'Failed to submit QR attendance.');
                    setScanError(error instanceof Error ? error.message : 'Failed to submit QR attendance.');
                }
            }
        } finally {
            setScanLoading(false);
        }
    }, [messageApi, loadHistory]);

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

            const requestId = res?.requestId;

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
                    throw new Error(statusRes.errorMessage || t('faceVerificationFailed'));
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
        void loadHistory();
    };

    const handleFaceRetry = () => {
        setFaceStep('capture');
        setFaceError(null);
    };

    return (
        <AppShell title={t('attendance')} showPageTitle={false} pageClassName="attendance-page">
            {contextHolder}
            
            {/* Show Face Registration Warning only AFTER device key is set up */}
            {!loading && user.isSsoUser && user.webauthRegistered && !user.faceRegistered && (
                <Alert
                    message={t('faceRegistrationRequired')}
                    description={t('faceRegistrationRequiredDescription')}
                    type="warning"
                    showIcon
                    action={
                        <Button size="small" type="primary" className="primary-action alert-action-button" onClick={() => setRegisterModalOpen(true)}>
                            {t('registerFace')}
                        </Button>
                    }
                    style={{ marginBottom: 24 }}
                />
            )}

            {false ? (
                <div className="attendance-blocked-card">
                    <Card style={{ borderRadius: 16 }}>
                        <Space direction="vertical" size={24} style={{ width: '100%' }}>
                            <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
                            <div>
                                <Typography.Title level={3}>Access Denied</Typography.Title>
                                <Typography.Paragraph type="secondary">
                                    Only students (SSO users) can mark their own attendance. You can only create sessions to collect attendance.
                                </Typography.Paragraph>
                            </div>
                        </Space>
                    </Card>
                </div>
            ) : false ? (
                <div className="attendance-blocked-card">
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
            ) : false ? (
                <div className="attendance-blocked-card">
                    <Card style={{ borderRadius: 16 }}>
                        <Space direction="vertical" size={24} style={{ width: '100%' }}>
                            <SafetyCertificateOutlined style={{ fontSize: 48, color: '#fa8c16' }} />
                            <div>
                                <Typography.Title level={3}>Biometric Verification Required</Typography.Title>
                                <Typography.Paragraph type="secondary">
                                    You skipped biometric verification at login. You must verify your identity to mark attendance.
                                </Typography.Paragraph>
                            </div>
                            <Button
                                type="primary"
                                size="large"
                                onClick={() => {
                                    sessionStorage.removeItem('spot_webauth_skipped');
                                    navigate('/webauth-verify', { state: { from: location } });
                                }}
                                className="primary-action wide-button"
                            >
                                Verify Now
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
                                    Scan a session QR code to mark your attendance.
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

                            <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark={false} autoComplete="off">
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
                                    <Input size="large" placeholder="Session code" autoComplete="off" />
                                </Form.Item>
                                <Button type="dashed" block style={{ marginBottom: 24 }} onClick={() => setIsGeoModalOpen(true)}>
                                    <EnvironmentOutlined /> View Geolocation Map
                                </Button>
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
                className="attendance-map-modal"
                title={
                    <Flex justify="space-between" align="center" gap={12} wrap="wrap" style={{ width: '100%', paddingRight: 24 }}>
                        <span>{t('sessionLocation') || 'Session Location'}{currentSessionDetails ? `: ${currentSessionDetails.title}` : ''}</span>
                            <Space size={8}>
                                <Button
                                    size="small"
                                    icon={<EnvironmentOutlined />}
                                    onClick={async () => {
                                        try {
                                            const loc = await getBrowserLocation();
                                            setUserCoords(loc);
                                            void messageApi.success('Location updated!');
                                        } catch (e) {
                                            void messageApi.error(t('locationPermissionError') || 'Failed to get location');
                                        }
                                    }}
                                >
                                    {t('getLocation') || 'Get Location'}
                                </Button>
                                {fetchingDetails && <Spin size="small" />}
                            </Space>
                        </Flex>
                    }
                    open={isGeoModalOpen}
                    onCancel={() => setIsGeoModalOpen(false)}
                    footer={[
                        <Button key="ok" type="primary" onClick={() => setIsGeoModalOpen(false)}>
                            OK
                        </Button>
                    ]}
                    width={800}
                    destroyOnClose
                >
                <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                    {currentSessionDetails 
                        ? (currentSessionDetails.validationTypes.includes('GPS') 
                            ? 'This session requires geolocation check-in. You must be inside the designated radius.'
                            : 'This session does not require geolocation check-in, but you can still view the session location.')
                        : 'You can check your current location here.'}
                </Typography.Paragraph>
                <div style={{ height: 350, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
                    {currentSessionDetails && currentSessionDetails.latitude !== undefined && currentSessionDetails.longitude !== undefined && userCoords ? (
                        <SessionMap
                            center={[currentSessionDetails.latitude, currentSessionDetails.longitude]}
                            radius={currentSessionDetails.allowedRadius || 100}
                            userLocation={[userCoords.latitude, userCoords.longitude]}
                        />
                    ) : userCoords ? (
                        <SessionMap
                            center={[userCoords.latitude, userCoords.longitude]}
                            radius={20}
                            userLocation={[userCoords.latitude, userCoords.longitude]}
                        />
                    ) : (
                        <Flex align="center" justify="center" style={{ height: '100%', background: '#f5f5f5' }}>
                            <Space direction="vertical" align="center">
                                <Spin />
                                <Typography.Text type="secondary">Acquiring your location...</Typography.Text>
                            </Space>
                        </Flex>
                    )}
                </div>
            </Modal>


            <section className="attendance-history-section">
                <Flex justify="space-between" align="start" wrap="wrap" gap={16} style={{ marginBottom: 24 }}>
                    <div style={{ width: '100%' }}>
                        <Typography.Title level={2} className="section-kicker" style={{ margin: 0 }}>
                            Attended Sessions
                        </Typography.Title>
                    </div>
                    <Space size="middle" wrap style={{ marginTop: 8 }}>
                        <Input.Search 
                            placeholder="Search sessions..." 
                            allowClear 
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: 200 }}
                        />
                        <DatePicker.RangePicker 
                            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                        />
                        <Select
                            value={sortBy}
                            onChange={(value) => setSortBy(value as any)}
                            style={{ width: 140 }}
                            options={[
                                { value: 'newest', label: 'Newest First' },
                                { value: 'oldest', label: 'Oldest First' },
                            ]}
                        />
                    </Space>
                </Flex>

                {historyLoading ? (
                    <Card className="attendance-history-card">
                        <Space>
                            <Spin />
                            <Typography.Text type="secondary">Loading attendance history...</Typography.Text>
                        </Space>
                    </Card>
                ) : historyError ? (
                    <Alert
                        message={historyError}
                        type="error"
                        showIcon
                        style={{ maxWidth: 1380, margin: '0 auto' }}
                    />
                ) : history.length === 0 ? (
                    <Card className="attendance-history-card">
                        <Typography.Title level={4} style={{ marginTop: 0 }}>No attended sessions yet</Typography.Title>
                        <Typography.Text type="secondary">
                            You have not attended any sessions yet.
                        </Typography.Text>
                    </Card>
                ) : (
                    <div className="attendance-history-grid">
                        {filteredAndSortedHistory.length === 0 ? (
                            <Typography.Text type="secondary">No sessions match your search criteria.</Typography.Text>
                        ) : (
                            filteredAndSortedHistory.map((session) => (
                                <Card key={session.id} className="session-grid-card">
                                    <div>
                                        <Typography.Title level={4} style={{ marginBottom: 8, fontWeight: 500 }}>
                                            {session.title}
                                        </Typography.Title>
                                        <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                                            Owner: {session.ownerEmail}
                                        </Typography.Text>
                                    </div>
                                    <div style={{ marginTop: 18 }}>
                                        <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                                            Attended
                                        </Typography.Text>
                                        <Typography.Paragraph style={{ margin: 0, fontWeight: 600 }}>
                                            {formatAttendanceDate(session.timestamp)}
                                        </Typography.Paragraph>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </section>
            
            <Modal
                title={t('scanQRCode')}
                open={scanOpen}
                onCancel={() => setScanOpen(false)}
                afterOpenChange={handleScannerModalOpenChange}
                footer={null}
                centered
                className="responsive-modal camera-modal"
            >
                <Space direction="vertical" size={16} className="full-width-space">
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        style={{ width: '100%', borderRadius: 16, background: '#000' }}
                    />
                    {scanError && <Typography.Text type="danger">{scanError}</Typography.Text>}
                    {scanLoading && <Typography.Text type="secondary">{t('submittingAttendance')}</Typography.Text>}
                </Space>
            </Modal>

            {/* Face Registration Modal */}
            <FaceRegistrationModal
                visible={registerModalOpen}
                onSuccess={() => {
                    setRegisterModalOpen(false);
                    void messageApi.success(t('faceRegisteredSuccess'));
                }}
                onCancel={() => setRegisterModalOpen(false)}
            />

            {/* Face Attendance Verification Modal */}
            <Modal
                title={t('faceVerificationRequired')}
                open={faceModalOpen}
                footer={null}
                closable={faceStep !== 'verifying'}
                maskClosable={false}
                width={600}
                onCancel={() => setFaceModalOpen(false)}
                className="responsive-modal face-attendance-modal"
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
                        <Typography.Title level={4} style={{ marginTop: 24 }}>{t('verifyingFace')}</Typography.Title>
                        <Typography.Paragraph type="secondary">{t('verifyingFaceDescription')}</Typography.Paragraph>
                    </div>
                )}
                {faceStep === 'success' && (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
                        <Typography.Title level={3} style={{ marginTop: 24 }}>{t('faceVerified')}</Typography.Title>
                        <Typography.Paragraph>{t('faceAttendanceSuccess')}</Typography.Paragraph>
                        <Button type="primary" size="large" onClick={handleFaceContinue} className="primary-action wide-button" style={{ marginTop: 16 }}>
                            {t('continue')}
                        </Button>
                    </div>
                )}
                {faceStep === 'failed' && (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <CloseCircleOutlined style={{ fontSize: 64, color: '#f5222d' }} />
                        <Typography.Title level={3} style={{ marginTop: 24 }}>{t('faceVerificationFailed')}</Typography.Title>
                        <Typography.Paragraph type="danger">{faceError || t('faceNotRecognized')}</Typography.Paragraph>
                        <Space style={{ marginTop: 16 }} wrap className="modal-action-stack">
                            <Button type="primary" size="large" onClick={handleFaceRetry} className="primary-action">
                                {t('tryAgain')}
                            </Button>
                            <Button size="large" onClick={() => setFaceModalOpen(false)}>
                                {t('cancel')}
                            </Button>
                        </Space>
                    </div>
                )}
            </Modal>
        </AppShell>
    );
}
