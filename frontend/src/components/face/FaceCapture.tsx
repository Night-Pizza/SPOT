import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Space, Typography, Alert, Spin, Button } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useTheme } from '../../contexts/ThemeContext';

interface FaceCaptureProps {
    onCapture: (photos: File[]) => void;
    onCancel?: () => void;
    loading?: boolean;
    error?: string | null;
    mode?: 'single' | 'triple';
}

// Applies a visual filter (brightness or grayscale) to the raw camera frame using an HTML canvas.
// This is used to create artificial variations of the captured face image to improve the dataset for the face recognition model.
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

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.src = imageSrc;
    });
}

type LivenessAction = 'mouth';
type FaceBlendshapeCategory = {
    categoryName: string;
    score: number;
};

const LIVENESS_ACTIONS: { type: LivenessAction; label: string }[] = [
    { type: 'mouth', label: 'Please open your mouth' }
];

const TRIPLE_CAPTURE_INTERVAL_MS = 300;

let sharedLandmarker: FaceLandmarker | null = null;
let loadingPromise: Promise<FaceLandmarker> | null = null;

// Singleton pattern implementation to ensure MediaPipe FaceLandmarker model is loaded only once.
// It caches the Promise during loading to prevent concurrent instantiation requests.
async function getFaceLandmarker(): Promise<FaceLandmarker> {
    if (sharedLandmarker) return sharedLandmarker;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
            );
            sharedLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 1
            });
            return sharedLandmarker;
        } catch (error) {
            loadingPromise = null;
            sharedLandmarker = null;
            throw error;
        }
    })();

    return loadingPromise;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ onCapture, onCancel, loading, error, mode = 'triple' }) => {
    const { t } = useTheme();
    const webcamRef = useRef<Webcam>(null);
    const [photos, setPhotos] = useState<File[]>([]);
    const [modelLoading, setModelLoading] = useState(!sharedLandmarker);
    const [livenessStatus, setLivenessStatus] = useState<'loading' | 'active' | 'success' | 'failed'>('loading');
    const [currentAction, setCurrentAction] = useState<LivenessAction>('mouth');
    const [challengePhase, setChallengePhase] = useState<'initial' | 'action'>('initial');
    const challengePhaseRef = useRef<'initial' | 'action'>('initial');
    const [timeLeft, setTimeLeft] = useState<number>(10);
    const [retryTimeLeft, setRetryTimeLeft] = useState<number>(3);
    const [capturing, setCapturing] = useState(false);
    const [captureProgress, setCaptureProgress] = useState<string>('');
    const [currentCaptureIndex, setCurrentCaptureIndex] = useState<number>(0);
    const [livenessError, setLivenessError] = useState<string | null>(null);

    const requestRef = useRef<number | null>(null);
    const activeRef = useRef<boolean>(false);

    const updatePhase = useCallback((phase: 'initial' | 'action') => {
        challengePhaseRef.current = phase;
        setChallengePhase(phase);
    }, []);

    const startLivenessCheck = useCallback(() => {
        const randomChallenge = LIVENESS_ACTIONS[Math.floor(Math.random() * LIVENESS_ACTIONS.length)];
        setCurrentAction(randomChallenge.type);
        setLivenessStatus('active');
        challengePhaseRef.current = 'initial';
        setChallengePhase('initial');
        setTimeLeft(10);
        setPhotos([]);
    }, []);

    const handleLivenessFail = useCallback(() => {
        activeRef.current = false;
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
        setLivenessStatus('failed');
        setRetryTimeLeft(3);
    }, []);

    // Load Model
    useEffect(() => {
        let isMounted = true;
        getFaceLandmarker()
            .then(() => {
                if (isMounted) {
                    setModelLoading(false);
                    startLivenessCheck();
                }
            })
            .catch((err) => {
                console.error("Error loading FaceLandmarker:", err);
                if (isMounted) {
                    setLivenessError(t('livenessModelFailed'));
                    setModelLoading(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, [startLivenessCheck]);

    // Automatically captures the required number of photos (single or triple) once liveness is confirmed.
    // For triple mode, it applies 'brightness' and 'grayscale' filters to generate augmented image variants.
    const autoCaptureAndSubmit = useCallback(async () => {
        if (!webcamRef.current) return;
        setCapturing(true);
        const newPhotos: File[] = [];
        setCurrentCaptureIndex(0);

        try {
            if (mode === 'single') {
                setCaptureProgress(t('capturingPhoto'));
                setCurrentCaptureIndex(1);
                const imageSrc = webcamRef.current.getScreenshot();
                if (imageSrc) {
                    const response = await fetch(imageSrc);
                    const blob = await response.blob();
                    const file = new File([blob], `face_${Date.now()}_0.jpg`, { type: 'image/jpeg' });
                    newPhotos.push(file);
                }
            } else {
                const filters: ('original' | 'brightness' | 'grayscale')[] = ['original', 'brightness', 'grayscale'];
                for (let i = 0; i < 3; i++) {
                    setCurrentCaptureIndex(i + 1);
                    setCaptureProgress(t('capturingPhotoOf')
                        .replace('{current}', String(i + 1))
                        .replace('{total}', '3'));
                    const imageSrc = webcamRef.current.getScreenshot();
                    if (imageSrc) {
                        const filteredSrc = await applyFilter(imageSrc, filters[i]);
                        const response = await fetch(filteredSrc);
                        const blob = await response.blob();
                        const file = new File([blob], `face_${Date.now()}_${i}.jpg`, { type: 'image/jpeg' });
                        newPhotos.push(file);
                    }
                    if (i < 2) {
                        await new Promise(resolve => setTimeout(resolve, TRIPLE_CAPTURE_INTERVAL_MS));
                    }
                }
            }

            setPhotos(newPhotos);
            setCaptureProgress(t('submittingToServer'));
            onCapture(newPhotos);
        } catch (err) {
            console.error("Auto capture error:", err);
            setLivenessError(t('failedCapturePhotos'));
            setLivenessStatus('failed');
            setRetryTimeLeft(3);
        } finally {
            setCapturing(false);
        }
    }, [mode, onCapture, t]);

    // Active Liveness Detection Frame Loop
    // Core liveness detection frame loop: continuously captures frames from the webcam and runs them through the MediaPipe model.
    // It verifies if the user performs the requested action (e.g., opening their mouth) by checking the 'jawOpen' blendshape score.
    useEffect(() => {
        if (livenessStatus !== 'active' || modelLoading) return;

        activeRef.current = true;

        const runDetection = () => {
            if (!activeRef.current) return;

            const webcam = webcamRef.current;
            const landmarker = sharedLandmarker;

            if (webcam && webcam.video && landmarker && webcam.video.readyState === 4) {
                const video = webcam.video;
                try {
                    const results = landmarker.detectForVideo(video, performance.now());
                    if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                        const blendshapes = results.faceBlendshapes[0].categories as FaceBlendshapeCategory[];
                        const jawOpen = blendshapes.find(c => c.categoryName === 'jawOpen')?.score || 0;

                        let success = false;
                        if (currentAction === 'mouth') {
                            if (challengePhaseRef.current === 'initial') {
                                if (jawOpen < 0.1) {
                                    updatePhase('action');
                                }
                            } else if (challengePhaseRef.current === 'action') {
                                if (jawOpen > 0.35) {
                                    success = true;
                                }
                            }
                        }

                        if (success) {
                            activeRef.current = false;
                            setLivenessStatus('success');
                            void autoCaptureAndSubmit();
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Detection error:", e);
                }
            }

            if (activeRef.current) {
                requestRef.current = requestAnimationFrame(runDetection);
            }
        };

        requestRef.current = requestAnimationFrame(runDetection);

        return () => {
            activeRef.current = false;
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [livenessStatus, currentAction, modelLoading, autoCaptureAndSubmit, updatePhase]);

    // Challenge Timeout countdown
    useEffect(() => {
        if (livenessStatus !== 'active') return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleLivenessFail();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [livenessStatus, handleLivenessFail]);

    // Retry countdown on failure
    useEffect(() => {
        if (livenessStatus !== 'failed') return;

        const timer = setInterval(() => {
            setRetryTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    startLivenessCheck();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [livenessStatus, startLivenessCheck]);

    const getInstructionLabel = () => {
        return challengePhase === 'initial'
            ? t('lookAtCameraMouthClosed')
            : t('openYourMouth');
    };

    return (
        <div className="face-capture">
            {(error || livenessError) && (
                <Alert
                    type="error"
                    message={error || livenessError}
                    style={{ marginBottom: 16 }}
                    showIcon
                />
            )}

            {modelLoading ? (
                <div style={{ padding: '40px 0' }}>
                    <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
                    <Typography.Paragraph style={{ marginTop: 16 }}>
                        {t('loadingLivenessModel')}
                    </Typography.Paragraph>
                </div>
            ) : (
                <>
                    <div className="face-camera-frame">
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: 'user' }}
                            style={{ width: '100%', borderRadius: 16 }}
                        />

                        {/* Status overlays */}
                        {livenessStatus === 'active' && (
                            <div style={{
                                position: 'absolute',
                                bottom: 16,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0, 0, 0, 0.75)',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: 30,
                                fontSize: 14,
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                border: '2px solid #1890ff',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                width: '90%',
                                maxWidth: 400
                            }}>
                                <Spin size="small" style={{ marginRight: 4 }} />
                                <span style={{ textAlign: 'center' }}>
                                    {getInstructionLabel()} ({timeLeft}s)
                                </span>
                            </div>
                        )}

                        {livenessStatus === 'success' && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: 'rgba(76, 175, 80, 0.9)',
                                color: 'white',
                                padding: '24px 40px',
                                borderRadius: 16,
                                textAlign: 'center',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                            }}>
                                <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 8 }} />
                                <Typography.Title level={4} style={{ color: 'white', margin: 0 }}>
                                    {t('livenessVerified')}
                                </Typography.Title>
                                {capturing && mode !== 'single' ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                                        {[1, 2, 3].map((num) => {
                                            const active = currentCaptureIndex >= num;
                                            return (
                                                <div
                                                    key={num}
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: '50%',
                                                        background: active ? '#fff' : 'rgba(255,255,255,0.3)',
                                                        color: active ? '#4caf50' : 'rgba(255,255,255,0.7)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 'bold',
                                                        fontSize: 16,
                                                        boxShadow: active ? '0 0 8px #fff' : 'none',
                                                        transform: currentCaptureIndex === num ? 'scale(1.25)' : 'scale(1.0)',
                                                        transition: 'all 0.2s ease-in-out',
                                                    }}
                                                >
                                                    {num}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <Typography.Paragraph style={{ color: 'white', margin: '8px 0 0 0' }}>
                                        {capturing ? captureProgress : t('capturingPhotos')}
                                    </Typography.Paragraph>
                                )}
                            </div>
                        )}

                        {livenessStatus === 'failed' && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: 'rgba(244, 67, 54, 0.9)',
                                color: 'white',
                                padding: '24px 40px',
                                borderRadius: 16,
                                textAlign: 'center',
                                width: '80%',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                            }}>
                                <ExclamationCircleOutlined style={{ fontSize: 48, marginBottom: 8 }} />
                                <Typography.Title level={4} style={{ color: 'white', margin: 0 }}>
                                    {t('livenessFailed')}
                                </Typography.Title>
                                <Typography.Paragraph style={{ color: 'white', margin: '8px 0 0 0' }}>
                                    {t('retryingInSeconds').replace('{seconds}', String(retryTimeLeft))}
                                </Typography.Paragraph>
                            </div>
                        )}
                    </div>

                    {/* Previews while loading/verifying (without manual buttons) */}
                    {photos.length > 0 && (
                        <div className="face-preview-section">
                            <div className="face-preview-grid">
                                {photos.map((file, index) => (
                                    <img
                                        key={index}
                                        src={URL.createObjectURL(file)}
                                        alt={`Face ${index+1}`}
                                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
                                    />
                                ))}
                            </div>
                            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                {loading ? t('sendingVerificationRequest') : t('processing')}
                            </Typography.Text>
                        </div>
                    )}                </>
            )}

            {onCancel && (
                <div style={{ marginTop: 16 }}>
                    <Space>
                        <Button
                            onClick={onCancel}
                            disabled={loading || capturing}
                        >
                            {t('cancel')}
                        </Button>
                    </Space>
                </div>
            )}
        </div>
    );
};

export default FaceCapture;
