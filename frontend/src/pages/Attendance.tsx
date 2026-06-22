import { CameraOutlined, NumberOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Space, Typography, message, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';

type CodeFormValues = {
    sessionCode: string;
};

export default function Attendance() {
    const [form] = Form.useForm<CodeFormValues>();
    const [messageApi, contextHolder] = message.useMessage();
    const sessionCode = Form.useWatch('sessionCode', form);
    const navigate = useNavigate();
    const { sessions } = useApp();
    const { t } = useTheme();

    const handleSubmit = () => {
        const code = form.getFieldValue('sessionCode');
        if (!code) return;
        // Ищем сессию по password (теперь это код)
        const session = sessions.find(s => s.password === code.trim().toUpperCase());
        if (!session) {
            void messageApi.error(t('sessionNotFoundError'));
            return;
        }
        navigate(`/attendance/verify?sessionId=${session.id}`);
    };

    const historyData = sessions.map(s => ({
        key: s.id,
        name: s.title,
        date: new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: new Date(s.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }));

    const columns = [
        { title: t('sessionName'), dataIndex: 'name', key: 'name' },
        { title: t('date'), dataIndex: 'date', key: 'date' },
        { title: t('time'), dataIndex: 'time', key: 'time' },
    ];

    return (
        <AppShell title={t('attendance')} showPageTitle={false} pageClassName="attendance-page">
            {contextHolder}
            <div className="attendance-actions-grid">
                <Card className="attendance-action-card scan-card">
                    <Space direction="vertical" align="center" size={18}>
                        <span className="large-action-icon green-icon"><CameraOutlined /></span>
                        <div className="centered-copy">
                            <Typography.Title level={2}>{t('scanQRCode')}</Typography.Title>
                            <Typography.Paragraph>{t('scanQRDesc')}</Typography.Paragraph>
                        </div>
                        <Button type="primary" size="large" className="primary-action wide-button">{t('openCamera')}</Button>
                    </Space>
                </Card>

                <Card className="attendance-action-card code-card">
                    <Space direction="vertical" size={24} className="full-width-space">
                        <Space size={18} align="start">
                            <span className="large-action-icon blue-icon"><NumberOutlined /></span>
                            <div>
                                <Typography.Title level={2}>{t('enterSessionCode')}</Typography.Title>
                                <Typography.Paragraph>{t('enterCodeDesc')}</Typography.Paragraph>
                            </div>
                        </Space>
                        <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark={false}>
                            <Form.Item
                                name="sessionCode"
                                rules={[{ required: true, whitespace: true, message: 'Please enter a session code.' }]}
                            >
                                <Input.Password size="large" placeholder="e.g. ML2026" />
                            </Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                className="primary-action wide-button"
                                disabled={!sessionCode?.trim()}
                            >
                                {t('submitCode')}
                            </Button>
                        </Form>
                    </Space>
                </Card>
            </div>

            <div style={{ marginTop: 48 }}>
                <Typography.Title level={3} style={{ marginBottom: 16 }}>
                    {t('attendanceHistory')}
                </Typography.Title>
                <Card>
                    <Table
                        columns={columns}
                        dataSource={historyData}
                        pagination={false}
                        locale={{
                            emptyText: <span className="empty-text-light">{t('noAttendanceRecords')}</span>
                        }}
                    />
                </Card>
            </div>
        </AppShell>
    );
}