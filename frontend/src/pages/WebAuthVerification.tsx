import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Space, message } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

export default function WebAuthVerificationPage() {
    const { verifyWebauth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const from = (location.state as any)?.from?.pathname || '/dashboard';

    const triggerVerification = async () => {
        setVerifying(true);
        setError(null);
        try {
            const success = await verifyWebauth();
            if (success) {
                void message.success('Identity verified successfully!');
                navigate(from, { replace: true });
            } else {
                setError('Biometric verification failed. Please try again.');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during verification.');
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
                    <Typography.Title level={3} style={{ margin: 0 }}>Confirm Identity</Typography.Title>
                    <Typography.Text type="secondary">
                        Please confirm your identity using WebAuthn (Touch ID, Face ID or Windows Hello) to proceed.
                    </Typography.Text>
                    {error && <Typography.Text type="danger">{error}</Typography.Text>}
                    <Button 
                        type="primary" 
                        size="large" 
                        onClick={() => void triggerVerification()} 
                        loading={verifying}
                        style={{ width: '100%', background: '#5ec832', borderColor: '#5ec832' }}
                    >
                        {verifying ? 'Verifying...' : 'Verify Biometrics'}
                    </Button>
                </Space>
            </Card>
        </div>
    );
}
