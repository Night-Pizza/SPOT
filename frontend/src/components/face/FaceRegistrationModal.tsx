import React, { useState } from 'react';
import { Modal } from 'antd';
import FaceCapture from './FaceCapture';
import FaceVerificationResult from './VerificationResult';
import { registerFace } from '../../api/Face';
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
            await registerFace(user.id, photos);
            setVerified(true);
            setStep('result');
            updateUser({ faceRegistered: true });
            onSuccess();
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