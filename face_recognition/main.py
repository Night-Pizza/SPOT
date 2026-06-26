import cv2
import numpy as np
from insightface.app import FaceAnalysis
import gc
import json
import base64
import os
import time
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError

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

def main():
    kafka_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'kafka:9092')
    request_topic = os.getenv('KAFKA_REQUEST_TOPIC', 'face.recognition.requests')
    response_topic = os.getenv('KAFKA_RESPONSE_TOPIC', 'system.events')
    
    print(f"Initializing Face Embedding Extractor...")
    extractor = FaceEmbeddingExtractor()
    
    print(f"Connecting to Kafka at {kafka_servers}...")
    
    # Retry connecting to Kafka
    while True:
        try:
            producer = KafkaProducer(
                bootstrap_servers=kafka_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            
            consumer = KafkaConsumer(
                request_topic,
                bootstrap_servers=kafka_servers,
                group_id='face-recognition-group',
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                auto_offset_reset='earliest'
            )
            print("Successfully connected to Kafka.")
            break
        except KafkaError as e:
            print(f"Failed to connect to Kafka: {e}. Retrying in 5 seconds...")
            time.sleep(5)
            
    print(f"Listening for requests on topic: {request_topic}")
    
    for message in consumer:
        data = message.value
        user_id = data.get('user_id')
        base64_image = data.get('image_base64')
        
        if not base64_image:
            print(f"Received message without image_base64 for user_id: {user_id}")
            continue
            
        print(f"Processing image for user_id: {user_id}")
        
        try:
            # Decode base64 to bytes
            image_bytes = base64.b64decode(base64_image)
            
            # Extract embedding
            result = extractor.get_face_vector(image_bytes)
            
            # Prepare response payload
            response_payload = {
                "user_id": user_id,
                "success": result["success"],
            }
            if result["success"]:
                response_payload["embedding"] = result["embedding"]
            else:
                response_payload["error"] = result["error"]
                
            # Send result back
            producer.send(response_topic, response_payload)
            producer.flush()
            
            print(f"Successfully processed and sent result for user_id: {user_id}")
            
        except Exception as e:
            print(f"Error processing message for user_id {user_id}: {e}")

if __name__ == "__main__":
    main()
