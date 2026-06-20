import { CameraOutlined, NumberOutlined } from '@ant-design/icons';
import {
    Button,
    Card,
    Form,
    Input,
    Space,
    Typography,
    message,
} from 'antd';
import AppShell from '../components/AppShell';

type CodeFormValues = {
    sessionCode: string;
};

export default function Attendance() {
    const [form] = Form.useForm<CodeFormValues>();
    const [messageApi, contextHolder] = message.useMessage();
    const sessionCode = Form.useWatch('sessionCode', form);

    const handleSubmit = () => {
        form.resetFields();
        void messageApi.success('Session code submitted.');
    };

    return (
        <AppShell title="Attendance" showPageTitle={false} pageClassName="attendance-page">
            {contextHolder}
            <div className="attendance-actions-grid">
                <Card className="attendance-action-card scan-card">
                    <Space direction="vertical" align="center" size={18}>
                        <span className="large-action-icon green-icon">
                            <CameraOutlined />
                        </span>
                        <div className="centered-copy">
                            <Typography.Title level={2}>Scan QR Code</Typography.Title>
                            <Typography.Paragraph>
                                Use your camera to scan the session QR code
                            </Typography.Paragraph>
                        </div>
                        <Button type="primary" size="large" className="primary-action wide-button">
                            Open Camera
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
                                <Typography.Title level={2}>Enter Session Code</Typography.Title>
                                <Typography.Paragraph>
                                    Enter the code shared for this session
                                </Typography.Paragraph>
                            </div>
                        </Space>

                        <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark={false}>
                            <Form.Item
                                name="sessionCode"
                                rules={[
                                    { required: true, whitespace: true, message: 'Please enter a session code.' },
                                ]}
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
                                Submit Code
                            </Button>
                        </Form>
                    </Space>
                </Card>
            </div>
        </AppShell>
    );
}
