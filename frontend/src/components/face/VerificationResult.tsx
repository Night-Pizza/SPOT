import React from 'react';
import { Result, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';

interface FaceVerificationResultProps {
    verified: boolean;
    onContinue: () => void;
    onRetry: () => void;
}

const FaceVerificationResult: React.FC<FaceVerificationResultProps> = ({ verified, onContinue, onRetry }) => {
    const { t } = useTheme();

    return (
        <Result
            icon={verified ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            title={verified ? t('faceVerified') : t('faceVerificationFailed')}
            subTitle={verified ? t('faceRegisteredSuccess') : t('faceRetryHint')}
            extra={[
                <Button type="primary" key="continue" onClick={onContinue}>
                    {verified ? t('continue') : t('retry')}
                </Button>,
                !verified && <Button key="retry" onClick={onRetry}>{t('retakePhotos')}</Button>,
            ]}
        />
    );
};

export default FaceVerificationResult;
