import cv2
import numpy as np
from insightface.app import FaceAnalysis
import gc

class FaceEmbeddingExtractor:
    def __init__(self, model_name='buffalo_l'):
        import onnxruntime as ort
        available_providers = ort.get_available_providers()
        print(f"Available ONNX Runtime providers: {available_providers}")
        
        if 'CUDAExecutionProvider' in available_providers:
            providers = ['CUDAExecutionProvider']
            ctx_id = 0
            print("Using CUDAExecutionProvider (GPU)")
        else:
            providers = ['CPUExecutionProvider']
            ctx_id = -1
            print("Using CPUExecutionProvider (CPU)")

        self.app = FaceAnalysis(name=model_name, providers=providers)
        self.app.prepare(ctx_id=ctx_id, det_size=(640, 640))

    def get_face_vector(self, image_bytes):
        """
        Extracts face embedding from image bytes.
        
        Args:
            image_bytes (bytes): The raw bytes of the image.
            
        Returns:
            dict: A dictionary containing success status and either the embedding or an error message.
        """
        img = None
        try:
            # Decode the image from bytes
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {"success": False, "error": "Invalid image data"}
            
            h, w = img.shape[:2]
            if w > 800:
                img = cv2.resize(img, (800, int(h * 800 / w)))

            # Perform face recognition
            faces = self.app.get(img)

            if not faces:
                return {"success": False, "error": "No face detected"}

            # Get the first detected face's embedding
            embedding = faces[0].normed_embedding

            # Convert the embedding to a list
            embedding_list = embedding.tolist()

            return {"success": True, "embedding": embedding_list}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            if img is not None:
                del img
            gc.collect()
