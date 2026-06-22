import { MailOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Typography, Modal, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AppShell from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Profile() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { sessions } = useApp();
    const { t } = useTheme();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();

    const handleChangePassword = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
        if (values.newPassword !== values.confirmPassword) {
            void messageApi.error(t('passwordMismatch'));
            return;
        }
        try {
            console.log('Change password:', values);
            void messageApi.success(t('passwordChanged'));
            setIsPasswordModalOpen(false);
            form.resetFields();
        } catch {
            void messageApi.error('Failed to change password');
        }
    };

    return (
        <AppShell title={t('profile')}>
            {contextHolder}
            <div className="profile-card">
                <div className="profile-avatar-placeholder">
                    {user.name.split(' ').map(part => part.charAt(0).toUpperCase()).join('')}
                </div>
                <div className="profile-info">
                    <p className="profile-name">{user.name}</p>
                    <p className="profile-email">{user.email}</p>
                </div>
            </div>

            <Flex gap={16} className="profile-stats-row" wrap="wrap">
                <Card className="profile-stat-card">
                    <Typography.Title level={2} className="profile-stat-number">{sessions.length}</Typography.Title>
                    <Typography.Text type="secondary">{t('sessionsCreated')}</Typography.Text>
                </Card>
                <Card className="profile-stat-card">
                    <Typography.Title level={2} className="profile-stat-number">{user.attendedSessions}</Typography.Title>
                    <Typography.Text type="secondary">{t('sessionsAttended')}</Typography.Text>
                </Card>
            </Flex>

            <Card className="profile-contact-card" title={t('contactInformation')}>
                <Flex align="center" gap={14}>
                    <span className="contact-icon"><MailOutlined /></span>
                    <div>
                        <Typography.Text type="secondary" className="contact-label">{t('email')}</Typography.Text>
                        <Typography.Text strong className="contact-value">{user.email}</Typography.Text>
                    </div>
                </Flex>
            </Card>

            <Button
                block
                size="large"
                className="change-password-btn"
                onClick={() => setIsPasswordModalOpen(true)}
            >
                {t('changePassword')}
            </Button>

            <button className="profile-logout-btn" onClick={() => navigate('/login')}>
                {t('logout')}
            </button>

            <Modal
                title={t('changePassword')}
                open={isPasswordModalOpen}
                onCancel={() => setIsPasswordModalOpen(false)}
                footer={null}
                className="password-modal"
            >
                <Form form={form} layout="vertical" onFinish={handleChangePassword}>
                    <Form.Item
                        label={t('currentPassword')}
                        name="oldPassword"
                        rules={[{ required: true, message: 'Please enter your current password' }]}
                    >
                        <Input.Password placeholder={t('currentPassword')} />
                    </Form.Item>
                    <Form.Item
                        label={t('newPassword')}
                        name="newPassword"
                        rules={[
                            { required: true, message: 'Please enter a new password' },
                            { min: 8, message: 'Password must be at least 8 characters' },
                        ]}
                    >
                        <Input.Password placeholder={t('newPassword')} />
                    </Form.Item>
                    <Form.Item
                        label={t('confirmPassword')}
                        name="confirmPassword"
                        rules={[
                            { required: true, message: 'Please confirm your new password' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(t('passwordMismatch')));
                                },
                            }),
                        ]}
                    >
                        <Input.Password placeholder={t('confirmPassword')} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" className="primary-action wide-button">
                            {t('changePassword')}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}