import AppShell from '../components/AppShell';
import { MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Typography, Modal, Form, Input, message, Alert, Spin } from 'antd';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import FaceRegistrationModal from '../components/face/FaceRegistrationModal';
import { logoutUser } from '../api/Authentification';
import { startRegistration } from '@simplewebauthn/browser';
import { getRegistrationOptions, verifyRegistration } from '../api/WebAuth';

export default function Profile() {
    const { user, loading, error, refreshCurrentUser } = useAuth();
    const { sessions } = useApp();
    const { t } = useTheme();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
    const [registeringDevice, setRegisteringDevice] = useState(false);
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const email = user.email || 'Unavailable';
    const avatarText = user.email.charAt(0).toUpperCase() || '?';

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Error while logout:", error);
        } finally {
            window.location.href = '/login';
        }
    };

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

            // Instruct browser to prioritize built-in platform authenticators
            regOptions.hints = ["client-device"];

            const attestationResponse = await startRegistration({
                optionsJSON: regOptions,
            });

            await verifyRegistration(JSON.stringify(attestationResponse));
            void messageApi.success('WebAuth device key registered successfully!');
            void refreshCurrentUser();
            if (user && !user.faceRegistered) {
                setIsFaceModalOpen(true);
            }
        } catch (err: any) {
            console.error('Device registration failed:', err);
            let userFriendlyMsg = err.message || 'WebAuth device key registration failed.';
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
            void messageApi.error(userFriendlyMsg);
        } finally {
            setRegisteringDevice(false);
        }
    };

    return (
        <AppShell title={t('profile')}>
            {contextHolder}
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message={error}
                    action={<Button size="small" onClick={() => void refreshCurrentUser()}>Retry</Button>}
                    style={{ marginBottom: 16 }}
                />
            )}
            <div className="profile-card">
                <div className="profile-avatar-placeholder">
                    {loading ? <Spin size="small" /> : avatarText}
                </div>
                <div className="profile-info">
                    <p className="profile-name">{loading ? 'Loading...' : email}</p>
                    <p className="profile-email">{email}</p>
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
                        <Typography.Text strong className="contact-value">{email}</Typography.Text>
                    </div>
                </Flex>
            </Card>

            <Button
                block
                size="large"
                className="change-password-btn"
                onClick={() => setIsPasswordModalOpen(true)}
                style={{ marginBottom: 16 }}
            >
                {t('changePassword')}
            </Button>

            <Button
                block
                size="large"
                type="primary"
                className="primary-action"
                onClick={() => setIsFaceModalOpen(true)}
                style={{ marginBottom: 16 }}
            >
                Update Face
            </Button>

            <Button
                block
                size="large"
                className="change-password-btn"
                onClick={handleRegisterDevice}
                loading={registeringDevice}
                icon={<SafetyCertificateOutlined />}
                style={{ marginBottom: 16 }}
            >
                {user.webauthRegistered ? 'Change Biometric Device' : 'Register Biometric Device'}
            </Button>

            <button className="profile-logout-btn" onClick={handleLogout}>
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

            <FaceRegistrationModal
                visible={isFaceModalOpen}
                onSuccess={() => {
                    setIsFaceModalOpen(false);
                    void messageApi.success('Face updated successfully');
                }}
                onCancel={() => setIsFaceModalOpen(false)}
            />
        </AppShell>
    );
}
