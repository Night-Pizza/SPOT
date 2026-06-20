import { BarChartOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <AppShell title="Dashboard" showPageTitle={false} pageClassName="dashboard-page">
            <Typography.Title level={1} className="dashboard-greeting">
                Hello, <span>Enzhe Shaikhutdinova!</span>
            </Typography.Title>

            <Typography.Title level={2} className="section-kicker">
                QUICK ACTIONS
            </Typography.Title>

            <div className="quick-actions-grid">
                <Card
                    hoverable
                    className="quick-action-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/sessions/create')}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate('/sessions/create');
                        }
                    }}
                >
                    <span className="quick-action-icon green-icon">
                        <PlusOutlined />
                    </span>
                    <Typography.Title level={3}>Create Session</Typography.Title>
                    <Typography.Paragraph>
                        Start a new attendance session
                    </Typography.Paragraph>
                </Card>

                <Card className="quick-action-card">
                    <span className="quick-action-icon blue-icon">
                        <QrcodeOutlined />
                    </span>
                    <Typography.Title level={3}>Scan QR</Typography.Title>
                    <Typography.Paragraph>
                        Open camera to scan a session QR code
                    </Typography.Paragraph>
                </Card>

                <Card className="quick-action-card">
                    <span className="quick-action-icon purple-icon">
                        <BarChartOutlined />
                    </span>
                    <Typography.Title level={3}>View Attendance</Typography.Title>
                    <Typography.Paragraph>
                        Browse attendance records
                    </Typography.Paragraph>
                </Card>
            </div>
        </AppShell>
    );
}
