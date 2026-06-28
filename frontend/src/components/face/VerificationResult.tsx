import React from 'react';
import { Result, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface FaceVerificationResultProps {
    verified: boolean;
    onContinue: () => void;
    onRetry: () => void;
}

const FaceVerificationResult: React.FC<FaceVerificationResultProps> = ({ verified, onContinue, onRetry }) => {
    return (
        <Result
            icon={verified ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            title={verified ? 'Face Verified!' : 'Face Verification Failed'}
            subTitle={verified ? 'Your face has been successfully registered.' : 'Please try again or ensure good lighting.'}
            extra={[
                <Button type="primary" key="continue" onClick={onContinue}>
                    {verified ? 'Continue' : 'Retry'}
                </Button>,
                !verified && <Button key="retry" onClick={onRetry}>Retake Photos</Button>,
            ]}
        />
    );
};

export default FaceVerificationResult;