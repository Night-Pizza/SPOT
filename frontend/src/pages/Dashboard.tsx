import { BarChartOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Dashboard() {
    const navigate = useNavigate();
    const { sessions } = useApp();
    const { user } = useAuth();
    const { t } = useTheme();

    return (
        <AppShell title={t('dashboard')} showPageTitle={false} pageClassName="dashboard-page">
            <Typography.Title level={1} className="dashboard-greeting">
                {t('hello')}, <span>{user.name}</span>
            </Typography.Title>

            <Typography.Title level={2} className="section-kicker">{t('quickActions')}</Typography.Title>

            <div className="quick-actions-grid">
                <Card hoverable className="quick-action-card" role="button" onClick={() => navigate('/sessions/create')}>
                    <span className="quick-action-icon green-icon"><PlusOutlined /></span>
                    <Typography.Title level={3}>{t('createSession')}</Typography.Title>
                    <Typography.Paragraph>{t('newSession')}</Typography.Paragraph>
                </Card>
                <Card className="quick-action-card" onClick={() => navigate('/attendance')}>
                    <span className="quick-action-icon blue-icon"><QrcodeOutlined /></span>
                    <Typography.Title level={3}>{t('scanQR')}</Typography.Title>
                    <Typography.Paragraph>{t('scanQRDesc')}</Typography.Paragraph>
                </Card>
                <Card className="quick-action-card" onClick={() => navigate('/sessions')}>
                    <span className="quick-action-icon purple-icon"><BarChartOutlined /></span>
                    <Typography.Title level={3}>{t('viewAttendance')}</Typography.Title>
                    <Typography.Paragraph>{t('manageSessions')}</Typography.Paragraph>
                </Card>
            </div>

            <div style={{ marginTop: 48, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <Card style={{ flex: 1, minWidth: 200 }}>
                    <Typography.Text type="secondary">{t('sessionsCreated')}</Typography.Text>
                    <Typography.Title level={2} style={{ margin: 0 }}>{sessions.length}</Typography.Title>
                </Card>
                <Card style={{ flex: 1, minWidth: 200 }}>
                    <Typography.Text type="secondary">{t('sessionsAttended')}</Typography.Text>
                    <Typography.Title level={2} style={{ margin: 0 }}>{user.attendedSessions}</Typography.Title>
                </Card>
            </div>
        </AppShell>
    );
}