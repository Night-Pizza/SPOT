import { ArrowRightOutlined, BarChartOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Card, Typography, Alert, Button, message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect, type KeyboardEvent } from 'react';
import FaceRegistrationModal from '../components/face/FaceRegistrationModal';
import { startRegistration } from '@simplewebauthn/browser';
import { getRegistrationOptions, verifyRegistration } from '../api/WebAuth';
import { getCreatedSessionsCount } from '../api/Session';
import { getAttendedSessionsCount } from '../api/Attendance';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, loading, refreshCurrentUser } = useAuth();
    const { t } = useTheme();
    const [registerModalOpen, setRegisterModalOpen] = useState(false);
    const [tourVisible, setTourVisible] = useState(false);
    const [step, setStep] = useState(0);

    const tourSteps = [
        t('tour.welcome'),
        t('tour.step1'),
        t('tour.step2'),
        t('tour.step3'),
        t('tour.step4'),
        t('tour.step5'),
        t('tour.finish'),
    ];

    const nextStep = () => {
        if (step < tourSteps.length - 1) {
            setStep(step + 1);
        } else {
            setTourVisible(false);
            localStorage.setItem('tourSeen', 'true');
        }
    };

    useEffect(() => {
        if (!loading && user && !localStorage.getItem('tourSeen')) {
            setTourVisible(true);
        }
    }, [loading, user]);

    const showRegistrationRetryModal = (errorMsg: string) => {
        Modal.confirm({
            title: t('biometricRequired'),
            content: `${errorMsg}. ${t('retry')}?`,
            okText: t('retry'),
            cancelText: t('registerLater'),
            okButtonProps: { className: 'primary-action' },
            onOk() { void handleRegisterDevice(); },
            onCancel() { if (!user.faceRegistered) setRegisterModalOpen(true); }
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
            regOptions.hints = ['client-device'];
            const attestationResponse = await startRegistration({ optionsJSON: regOptions });
            await verifyRegistration(JSON.stringify(attestationResponse));
            void message.success(t('biometricRegistrationSuccess'));
            await refreshCurrentUser();
            if (!user.faceRegistered) setRegisterModalOpen(true);
        } catch (err: any) {
            console.error('Device registration failed:', err);
            let userFriendlyMsg = err.message || t('biometricRegistrationFailed') || 'Biometric device registration failed.';
            if (
                err.name === 'InvalidStateError' ||
                userFriendlyMsg.includes('previously registered') ||
                userFriendlyMsg.includes('InvalidState') ||
                userFriendlyMsg.includes('exclude') ||
                userFriendlyMsg.toLowerCase().includes('credential manager') ||
                userFriendlyMsg.toLowerCase().includes('unknown error')
            ) {
                userFriendlyMsg = t('deviceAlreadyInUse');
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

    const openAction = (path: string) => navigate(path);

    const handleActionKeyDown = (event: KeyboardEvent<HTMLElement>, path: string) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openAction(path);
        }
    };

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
                if (!cancelled) setStats({ created, attended });
            } catch (error) {
                if (!cancelled) setStatsError(error instanceof Error ? error.message : t('fetchError'));
            } finally {
                if (!cancelled) setStatsLoading(false);
            }
        }
        void loadStats();
        return () => { cancelled = true; };
    }, []);

    return (
        <AppShell title={t('dashboard')} showPageTitle={false} pageClassName="dashboard-page">
            <Typography.Title level={1} className="dashboard-greeting">
                {t('hello')}, <span>{loading ? t('loading') : user.email || t('profileTitle')}</span>
            </Typography.Title>

            {!loading && !user.webauthRegistered && (
                <Alert
                    message={t('biometricRequired')}
                    description={t('biometricNotRegistered')}
                    type="warning"
                    showIcon
                    className="dashboard-alert"
                    action={
                        <Button size="small" type="primary" className="primary-action alert-action-button" onClick={handleRegisterDevice}>
                            {t('registerDevice')}
                        </Button>
                    }
                />
            )}

            {!loading && !user.faceRegistered && (
                <Alert
                    message={t('faceRegistrationRequired')}
                    description={t('faceNotRegistered')}
                    type="warning"
                    showIcon
                    className="dashboard-alert"
                    action={
                        <Button size="small" type="primary" className="primary-action alert-action-button" onClick={() => setRegisterModalOpen(true)}>
                            {t('updateFace')}
                        </Button>
                    }
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
                    tabIndex={0}
                    onClick={() => openAction('/sessions/create')}
                    onKeyDown={(event) => handleActionKeyDown(event, '/sessions/create')}
                >
                    <span className="quick-action-icon green-icon">
                        <PlusOutlined />
                    </span>
                    <Typography.Title level={3}>{t('createSession')}</Typography.Title>
                    <Typography.Paragraph>{t('startSession')}</Typography.Paragraph>
                    <span className="quick-action-cta">
                        {t('create')} <ArrowRightOutlined />
                    </span>
                </Card>

                <Card
                    hoverable
                    className="quick-action-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => openAction('/attendance')}
                    onKeyDown={(event) => handleActionKeyDown(event, '/attendance')}
                >
                    <span className="quick-action-icon blue-icon">
                        <QrcodeOutlined />
                    </span>
                    <Typography.Title level={3}>{t('scanQR')}</Typography.Title>
                    <Typography.Paragraph>{t('markAttendance')}</Typography.Paragraph>
                    <span className="quick-action-cta">
                        {t('open')} <ArrowRightOutlined />
                    </span>
                </Card>

                <Card
                    hoverable
                    className="quick-action-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => openAction('/sessions')}
                    onKeyDown={(event) => handleActionKeyDown(event, '/sessions')}
                >
                    <span className="quick-action-icon purple-icon">
                        <BarChartOutlined />
                    </span>
                    <Typography.Title level={3}>{t('sessions')}</Typography.Title>
                    <Typography.Paragraph>{t('reviewRecords')}</Typography.Paragraph>
                    <span className="quick-action-cta">
                        {t('view')} <ArrowRightOutlined />
                    </span>
                </Card>
            </div>

            <div className="dashboard-stats-grid">
                <Card className="dashboard-stat-card">
                    <Typography.Text type="secondary">{t('sessionsCreated')}</Typography.Text>
                    <Typography.Title level={2} className="dashboard-stat-number">
                        {statsLoading ? t('loading') : stats.created}
                    </Typography.Title>
                </Card>
                <Card className="dashboard-stat-card">
                    <Typography.Text type="secondary">{t('sessionsAttended')}</Typography.Text>
                    <Typography.Title level={2} className="dashboard-stat-number">
                        {statsLoading ? t('loading') : stats.attended}
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

            {/* Tour Modal */}
            <Modal
                title={t('tour.welcome')}
                open={tourVisible}
                onCancel={() => {
                    setTourVisible(false);
                    localStorage.setItem('tourSeen', 'true');
                }}
                footer={[
                    <Button key="next" type="primary" onClick={nextStep} className="primary-action">
                        {step < tourSteps.length - 1 ? t('next') : t('finish')}
                    </Button>
                ]}
                centered
                className="tour-modal"
            >
                <Typography.Paragraph style={{ fontSize: 16, marginBottom: 0 }}>
                    {tourSteps[step]}
                </Typography.Paragraph>
                <Typography.Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
                    {step + 1} / {tourSteps.length}
                </Typography.Text>
            </Modal>
        </AppShell>
    );
}