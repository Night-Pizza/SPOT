import { BarChartOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Card, Typography, Alert, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import FaceRegistrationModal from '../components/face/FaceRegistrationModal';
import { getCreatedSessionsCount } from '../api/Session';
import { getAttendedSessionsCount } from '../api/Attendance';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const { t } = useTheme();
    const [registerModalOpen, setRegisterModalOpen] = useState(false);
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
