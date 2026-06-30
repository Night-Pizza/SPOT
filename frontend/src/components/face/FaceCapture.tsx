import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button, Space, Typography, Alert } from 'antd';
import { CameraOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons';

interface FaceCaptureProps {
    onCapture: (photos: File[]) => void;
    onCancel?: () => void;
    loading?: boolean;
    error?: string | null;
    mode?: 'single' | 'triple';
}
function applyFilter(imageSrc: string, filterType: 'original' | 'brightness' | 'grayscale'): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            if (filterType === 'brightness') {
                // Увеличиваем яркость на 50 пунктов (каждый канал)
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] + 50);     // R
                    data[i+1] = Math.min(255, data[i+1] + 50); // G
                    data[i+2] = Math.min(255, data[i+2] + 50); // B
                }
            } else if (filterType === 'grayscale') {
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.34 * data[i] + 0.5 * data[i+1] + 0.16 * data[i+2];
                    data[i] = gray;
                    data[i+1] = gray;
                    data[i+2] = gray;
                }
            }
            // оригинал – ничего не делаем

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.src = imageSrc;
    });
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ onCapture, onCancel, loading, error, mode = 'triple' }) => {
    const webcamRef = useRef<Webcam>(null);
    const [photos, setPhotos] = useState<File[]>([]);
    const [capturing, setCapturing] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);

    const capture = useCallback(async () => {
        if (!webcamRef.current) return;
        setCapturing(true);
        const newPhotos: File[] = [];

        if (mode === 'single') {
            setCountdown(1);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                const response = await fetch(imageSrc);
                const blob = await response.blob();
                const file = new File([blob], `face_${Date.now()}_0.jpg`, { type: 'image/jpeg' });
                newPhotos.push(file);
            }
        } else {
            // Массив фильтров: оригинал, яркость, ч/б
            const filters: ('original' | 'brightness' | 'grayscale')[] = ['original', 'brightness', 'grayscale'];

            for (let i = 0; i < 3; i++) {
                setCountdown(3 - i);
                await new Promise(resolve => setTimeout(resolve, 1000));
                const imageSrc = webcamRef.current.getScreenshot();
                if (imageSrc) {
                    // Применяем фильтр
                    const filteredSrc = await applyFilter(imageSrc, filters[i]);
                    const response = await fetch(filteredSrc);
                    const blob = await response.blob();
                    const file = new File([blob], `face_${Date.now()}_${i}.jpg`, { type: 'image/jpeg' });
                    newPhotos.push(file);
                }
            }
        }
        setPhotos(newPhotos);
        setCapturing(false);
        setCountdown(null);
    }, [mode]);

    const handleSubmit = () => {
        if (photos.length === (mode === 'single' ? 1 : 3)) {
            onCapture(photos);
        }
    };

    const handleRetake = () => {
        setPhotos([]);
    };

    return (
        <div style={{ textAlign: 'center' }}>
            {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
            {photos.length === 0 ? (
                <>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: 'user' }}
                            style={{ width: '100%', maxWidth: 500, borderRadius: 16 }}
                        />
                        {countdown !== null && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: 48,
                                color: 'white',
                                background: 'rgba(0,0,0,0.5)',
                                padding: 20,
                                borderRadius: '50%',
                            }}>
                                {countdown}
                            </div>
                        )}
                    </div>
                    <Space style={{ marginTop: 16 }}>
                        <Button
                            type="primary"
                            icon={<CameraOutlined />}
                            onClick={capture}
                            loading={capturing}
                            disabled={capturing}
                        >
                            {mode === 'single' ? 'Capture Photo' : 'Capture 3 Photos'}
                        </Button>
                        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
                    </Space>
                    {capturing && <Typography.Text>Capturing... please wait</Typography.Text>}
                </>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {photos.map((file, index) => (
                            <img
                                key={index}
                                src={URL.createObjectURL(file)}
                                alt={`Face ${index+1}`}
                                style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }}
                            />
                        ))}
                    </div>
                    <Space style={{ marginTop: 16 }}>
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={handleSubmit}
                            loading={loading}
                        >
                            Submit Photos
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={handleRetake} disabled={loading}>
                            Retake
                        </Button>
                        {onCancel && <Button onClick={onCancel} disabled={loading}>Cancel</Button>}
                    </Space>
                </>
            )}
        </div>
    );
};

export default FaceCapture;