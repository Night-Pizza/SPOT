import { BarChartOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Card, Typography, Alert, Button, message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';
import FaceRegistrationModal from '../components/face/FaceRegistrationModal';
import { startRegistration } from '@simplewebauthn/browser';
import { getRegistrationOptions, verifyRegistration } from '../api/WebAuth';
import { getCreatedSessionsCount } from '../api/Session';
import { getAttendedSessionsCount } from '../api/Attendance';

export default function Dashboard() {
    const navigate = useNavigate();
    const { sessions } = useApp();
    const { user, loading, refreshCurrentUser } = useAuth();
    const { t } = useTheme();
    const [registerModalOpen, setRegisterModalOpen] = useState(false);

    const showRegistrationRetryModal = (errorMsg: string) => {
        Modal.confirm({
            title: 'Biometric Registration Failed',
            content: `${errorMsg}. Would you like to try registering your device again or register it later?`,
            okText: 'Try Again',
            cancelText: 'Register Later',
            okButtonProps: { className: 'primary-action' },
            onOk() {
                void handleRegisterDevice();
            },
            onCancel() {
                // If they choose to register device later, trigger face registration popup
                if (!user.faceRegistered) {
                    setRegisterModalOpen(true);
                }
            }
        });
    };

    const handleRegisterDevice = async () => {
        try {
            const { optionsJson } = await getRegistrationOptions();
            const parsedOptions = JSON.parse(optionsJson);
            const regOptions = parsedOptions.publicKeyCredentialCreationOptions || parsedOptions.publicKey || parsedOptions;

            if (regOptions.extensions) {
                delete regOptions.extensions.appidExclude;
                delete regOptions.extensions.appid;
            }

            // Instruct browser to prioritize built-in platform authenticators
            regOptions.hints = ["client-device"];

            const attestationResponse = await startRegistration({
                optionsJSON: regOptions,
            });

            await verifyRegistration(JSON.stringify(attestationResponse));
            void message.success('Biometric device registered successfully!');
            await refreshCurrentUser();
            
            // Auto trigger face registration after successful device registration
            if (!user.faceRegistered) {
                setRegisterModalOpen(true);
            }
        } catch (err: any) {
            console.error('Device registration failed:', err);
            let userFriendlyMsg = err.message || 'Biometric device registration failed.';
            if (
                err.name === 'InvalidStateError' || 
                userFriendlyMsg.includes('previously registered') || 
                userFriendlyMsg.includes('InvalidState') || 
                userFriendlyMsg.includes('exclude') ||
                userFriendlyMsg.toLowerCase().includes('credential manager') ||
                userFriendlyMsg.toLowerCase().includes('unknown error')
            ) {
                userFriendlyMsg = 'The device is already in use by someone else';
            }
            showRegistrationRetryModal(userFriendlyMsg);
        }
    };

    useEffect(() => {
        if (!loading && user) {
            const triggerDevice = localStorage.getItem('trigger_device_registration');
            if (triggerDevice === 'true') {
                localStorage.removeItem('trigger_device_registration');
                void handleRegisterDevice();
            } else {
                const triggerFace = localStorage.getItem('trigger_face_registration');
                if (triggerFace === 'true' && user.webauthRegistered && !user.faceRegistered) {
                    localStorage.removeItem('trigger_face_registration');
                    setRegisterModalOpen(true);
                }
            }
        }
    }, [loading, user]);
    const [stats, setStats] = useState({ created: 0, attended: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function loadStats() {
            setStatsLoading(true);
            setStatsError('');

            try {
                const [created, attended] = await Promise.all([
                    getCreatedSessionsCount(),
                    getAttendedSessionsCount(),
                ]);

                if (!cancelled) {
                    setStats({ created, attended });
                }
            } catch (error) {
                if (!cancelled) {
                    setStatsError(error instanceof Error ? error.message : 'Failed to load dashboard statistics');
                }
            } finally {
                if (!cancelled) {
                    setStatsLoading(false);
                }
            }
        }

        void loadStats();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <AppShell title={t('dashboard')} showPageTitle={false} pageClassName="dashboard-page">
            <Typography.Title level={1} className="dashboard-greeting">
                {t('hello')}, <span>{loading ? 'Loading...' : user.email || 'Profile'}</span>
            </Typography.Title>

            {!loading && !user.webauthRegistered && (
                <Alert
                    message="Biometric Device Required"
                    description="You have not registered your biometric device yet. Please register your device to enable biometric verification."
                    type="warning"
                    showIcon
                    action={
                        <Button size="small" type="primary" className="primary-action" onClick={handleRegisterDevice} style={{ width: 140 }}>
                            Register Device
                        </Button>
                    }
                    style={{ marginBottom: 24 }}
                />
            )}

            {!loading && !user.faceRegistered && (
                <Alert
                    message="Face Registration Required"
                    description="You have not registered your face embedding yet. Please register your face to enable face recognition check-in."
                    type="warning"
                    showIcon
                    action={
                        <Button size="small" type="primary" className="primary-action" onClick={() => setRegisterModalOpen(true)} style={{ width: 140 }}>
                            Register Face
                        </Button>
                    }
                    style={{ marginBottom: 24 }}
                />
            )}

            <Typography.Title level={2} className="section-kicker">
                {t('quickActions')}
            </Typography.Title>

            <div className="quick-actions-grid">
                <Card
                    hoverable
                    className="quick-action-card"
                    role="button"
                    onClick={() => navigate('/sessions/create')}>
                    <span className="quick-action-icon green-icon">
                        <PlusOutlined />
                    </span>
                    <Typography.Title level={3}>{t('createSession')}</Typography.Title>
                    <Typography.Paragraph>
                        {t('newSession')}
                    </Typography.Paragraph>
                </Card>

                <Card className="quick-action-card"
                      onClick={() => navigate('/attendance')}>
                    <span className="quick-action-icon blue-icon">
                        <QrcodeOutlined />
                    </span>
                    <Typography.Title level={3}>{t('scanQR')}</Typography.Title>
                    <Typography.Paragraph>
                        {t('scanQRDesc')}
                    </Typography.Paragraph>
                </Card>

                <Card className="quick-action-card"
                      onClick={() => navigate('/sessions')}>
                    <span className="quick-action-icon purple-icon">
                        <BarChartOutlined />
                    </span>
                    <Typography.Title level={3}>{t('viewAttendance')}</Typography.Title>
                    <Typography.Paragraph>
                        {t('manageSessions')}
                    </Typography.Paragraph>
                </Card>
            </div>

            <div style={{ marginTop: 48, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <Card style={{ flex: 1, minWidth: 200 }}>
                    <Typography.Text type="secondary">{t('sessionsCreated')}</Typography.Text>
                    <Typography.Title level={2} style={{ margin: 0 }}>
                        {statsLoading ? 'Loading...' : stats.created}
                    </Typography.Title>
                </Card>
                <Card style={{ flex: 1, minWidth: 200 }}>
                    <Typography.Text type="secondary">{t('sessionsAttended')}</Typography.Text>
                    <Typography.Title level={2} style={{ margin: 0 }}>
                        {statsLoading ? 'Loading...' : stats.attended}
                    </Typography.Title>
                </Card>
            </div>
            {statsError && (
                <Alert
                    message={statsError}
                    type="error"
                    showIcon
                    style={{ maxWidth: 1380, margin: '16px auto 0' }}
                />
            )}

            <FaceRegistrationModal
                visible={registerModalOpen}
                onSuccess={() => setRegisterModalOpen(false)}
                onCancel={() => setRegisterModalOpen(false)}
            />
        </AppShell>
    );
}
