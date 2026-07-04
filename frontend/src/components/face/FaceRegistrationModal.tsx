import React, { useState } from 'react';
import { Modal } from 'antd';
import FaceCapture from './FaceCapture';
import FaceVerificationResult from './VerificationResult';
import { registerFace, checkFaceStatus } from '../../api/Face';
import { useAuth } from '../../contexts/AuthContext';

interface FaceRegistrationModalProps {
    visible: boolean;
    onSuccess: () => void;
    onCancel?: () => void;
}

const FaceRegistrationModal: React.FC<FaceRegistrationModalProps> = ({ visible, onSuccess, onCancel }) => {
    const { user, updateUser } = useAuth();
    const [step, setStep] = useState<'capture' | 'result'>('capture');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verified, setVerified] = useState(false);

    const handleCapture = async (photos: File[]) => {
        if (!user.id) return;
        setLoading(true);
        setError(null);
        try {
            const registerRes = await registerFace(photos);
            if (!registerRes.requestId) {
                throw new Error('No request ID returned from backend.');
            }

            // Poll status
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds max
            let registered = false;
            while (attempts < maxAttempts) {
                const statusRes = await checkFaceStatus(registerRes.requestId);
                if (statusRes.status === 'SUCCESS') {
                    registered = true;
                    break;
                } else if (statusRes.status === 'FAILED') {
                    throw new Error(statusRes.errorMessage || 'Face registration failed.');
                }
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (!registered) {
                throw new Error('Face registration timed out.');
            }

            setVerified(true);
            setStep('result');
            updateUser({ faceRegistered: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Face registration failed');
            setVerified(false);
            setStep('result');
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setStep('capture');
        setError(null);
    };

    const handleContinue = () => {
        onSuccess();
    };

    return (
        <Modal
            title="Face Registration"
            open={visible}
            footer={null}
            closable={false}
            maskClosable={false}
            width={600}
        >
            {step === 'capture' ? (
                <FaceCapture
                    onCapture={handleCapture}
                    onCancel={onCancel}
                    loading={loading}
                    error={error}
                    mode="single"
                />
            ) : (
                <FaceVerificationResult
                    verified={verified}
                    onContinue={handleContinue}
                    onRetry={handleRetry}
                />
            )}
        </Modal>
    );
};

export default FaceRegistrationModal;