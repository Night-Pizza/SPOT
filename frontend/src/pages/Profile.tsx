import AppShell from '../components/AppShell';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Button, Card, Modal, Form, Input, message, Alert, Spin } from 'antd';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FaceRegistrationModal from '../components/face/FaceRegistrationModal';
import { logoutUser } from '../api/Authentification';
import { startRegistration } from '@simplewebauthn/browser';
import { getRegistrationOptions, verifyRegistration } from '../api/WebAuth';
import { updatePassword } from '../api/User';

export default function Profile() {
    const { user, loading, error, refreshCurrentUser, markWebauthVerified } = useAuth();
    const { t } = useTheme();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
    const [registeringDevice, setRegisteringDevice] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
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
            localStorage.removeItem('spot_webauth_verified');
            sessionStorage.removeItem('spot_webauth_skipped');
            window.location.href = '/login';
        }
    };

    const handleChangePassword = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
        if (values.newPassword !== values.confirmPassword) {
            void messageApi.error(t('passwordMismatch'));
            return;
        }
        setChangingPassword(true);
        try {
            await updatePassword({
                currentPassword: values.oldPassword,
                newPassword: values.newPassword,
            });
            void messageApi.success(t('passwordChanged') || 'Password changed successfully');
            setIsPasswordModalOpen(false);
            form.resetFields();
        } catch (changeError: unknown) {
            void messageApi.error(changeError instanceof Error ? changeError.message : 'Failed to change password');
        } finally {
            setChangingPassword(false);
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

            regOptions.hints = ['client-device'];

            const attestationResponse = await startRegistration({
                optionsJSON: regOptions,
            });

            await verifyRegistration(JSON.stringify(attestationResponse));
            void messageApi.success('WebAuth device key registered successfully!');
            markWebauthVerified();
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
        <AppShell title={t('profile')} pageClassName="profile-page">
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
            <section className="profile-overview">
                <div className="profile-card">
                    <div className="profile-avatar-placeholder">
                        {loading ? <Spin size="small" /> : avatarText}
                    </div>
                    <div className="profile-info">
                        <p className="profile-name">{loading ? 'Loading...' : email}</p>
                        <p className="profile-email">{email}</p>
                    </div>
                </div>
            </section>

            <section className="profile-actions-section">
                <Card className="profile-actions-card" title="Account actions">
                    <div className="profile-actions-grid">
                        <Button
                            block
                            size="large"
                            className="profile-action-button change-password-btn"
                            onClick={() => setIsPasswordModalOpen(true)}
                        >
                            {t('changePassword')}
                        </Button>

                        {user.isSsoUser && (
                            <>
                                <Button
                                    block
                                    size="large"
                                    type="primary"
                                    className="profile-action-button primary-action"
                                    onClick={() => setIsFaceModalOpen(true)}
                                >
                                    Update Face Recognition
                                </Button>

                                <Button
                                    block
                                    size="large"
                                    className="profile-action-button change-password-btn"
                                    onClick={() => void handleRegisterDevice()}
                                    loading={registeringDevice}
                                    icon={<SafetyCertificateOutlined />}
                                >
                                    {user.webauthRegistered ? 'Change Biometric Device' : 'Register Biometric Device'}
                                </Button>
                            </>
                        )}

                        <button className="profile-logout-btn" onClick={handleLogout}>
                            {t('logout')}
                        </button>
                    </div>
                </Card>
            </section>

            <Modal
                title={t('changePassword')}
                open={isPasswordModalOpen}
                onCancel={() => {
                    if (!changingPassword) {
                        setIsPasswordModalOpen(false);
                    }
                }}
                footer={null}
                className="password-modal"
            >
                <Form form={form} layout="vertical" onFinish={handleChangePassword} autoComplete="off">
                    <Form.Item
                        label={t('currentPassword')}
                        name="oldPassword"
                        rules={[{ required: true, message: 'Please enter your current password' }]}
                    >
                        <Input.Password placeholder={t('currentPassword')} autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item
                        label={t('newPassword')}
                        name="newPassword"
                        rules={[
                            { required: true, message: 'Please enter a new password' },
                            { min: 8, message: 'Password must be at least 8 characters' },
                        ]}
                    >
                        <Input.Password placeholder={t('newPassword')} autoComplete="new-password" />
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
                        <Input.Password placeholder={t('confirmPassword')} autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            className="primary-action wide-button"
                            loading={changingPassword}
                            disabled={changingPassword}
                        >
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
