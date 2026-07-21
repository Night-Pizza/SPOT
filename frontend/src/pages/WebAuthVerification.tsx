import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Space, message } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function WebAuthVerificationPage() {
    const { verifyWebauth } = useAuth();
    const { t } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const from = (location.state as any)?.from?.pathname || '/dashboard';

    // Initiates the WebAuthn verification flow by calling the context method.
    // Handles UI state updates (loading spinners, error messages) and redirects the user back to their previous page upon success.
    const triggerVerification = async () => {
        setVerifying(true);
        setError(null);
        try {
            const success = await verifyWebauth();
            if (success) {
                void message.success(t('identityVerifiedSuccess'));
                navigate(from, { replace: true });
            } else {
                setError(t('biometricVerificationFailed'));
            }
        } catch (err: any) {
            setError(err.message || t('biometricVerificationError'));
        } finally {
            setVerifying(false);
        }
    };

    useEffect(() => {
        void triggerVerification();
    }, []);

    return (
        <div className="auth-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Card style={{ width: 400, textAlign: 'center', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                    <SafetyCertificateOutlined style={{ fontSize: 48, color: '#5ec832' }} />
                    <Typography.Title level={3} style={{ margin: 0 }}>{t('confirmIdentity')}</Typography.Title>
                    <Typography.Text type="secondary">
                        {t('confirmIdentityDescription')}
                    </Typography.Text>
                    {error && <Typography.Text type="danger">{error}</Typography.Text>}
                    <Button 
                        type="primary" 
                        size="large" 
                        onClick={() => void triggerVerification()} 
                        loading={verifying}
                        style={{ width: '100%', background: '#5ec832', borderColor: '#5ec832' }}
                    >
                        {verifying ? t('verifyingBiometrics') : t('verifyBiometrics')}
                    </Button>
                    <Button 
                        type="default" 
                        size="large" 
                        onClick={() => {
                            sessionStorage.setItem('spot_webauth_skipped', 'true');
                            navigate(from, { replace: true });
                        }}
                        disabled={verifying}
                        style={{ width: '100%' }}
                    >
                        {t('skipForNow')}
                    </Button>
                </Space>
            </Card>
        </div>
    );
}
