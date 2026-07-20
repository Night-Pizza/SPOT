import asyncio
import aiohttp
import time
import argparse
import csv
import json
import os
import base64
from datetime import datetime

# Endpoints will be dynamically built based on --base-url
SESSIONS_FILE = "sessions.json"
DUMMY_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

async def register_user(session, user_id, base_url, test_face, face_base64):
    """Registers a test user and returns the cookies as a dict."""
    email = f"testuser_{user_id}@innopolis.university"
    test_register_url = f"{base_url}/auth/test-register"
    csrf_url = f"{base_url}/auth/csrf"
    add_face_url = f"{base_url}/user/face"
    try:
        start_time = time.time()
        async with session.post(test_register_url, params={"email": email}) as response:
            text = await response.text()
            if response.status != 200:
                return False, 0.0, f"Register failed: {response.status} {text}", {}
            
        # Also hit CSRF to get XSRF-TOKEN
        async with session.get(csrf_url) as response:
            await response.read()

        cookies = {}
        for cookie in session.cookie_jar:
            cookies[cookie.key] = cookie.value
            
        if test_face:
            headers = {}
            if 'XSRF-TOKEN' in cookies:
                headers['X-XSRF-TOKEN'] = cookies['XSRF-TOKEN']
                
            img_data = face_base64 if face_base64 else DUMMY_IMAGE
            payload = {"image": img_data}
            async with session.post(add_face_url, json=payload, headers=headers) as face_res:
                face_text = await face_res.text()
                if face_res.status == 202 or face_res.status == 200:
                    data = json.loads(face_text)
                    if "requestId" in data:
                        req_id = data["requestId"]
                        status_url = f"{base_url}/user/face/status/{req_id}"
                        while True:
                            await asyncio.sleep(0.5)
                            async with session.get(status_url, headers=headers) as status_res:
                                if status_res.status == 200:
                                    status_text = await status_res.text()
                                    s_data = json.loads(status_text)
                                    if s_data.get("status") == "SUCCESS":
                                        break
                                    elif s_data.get("status") == "FAILED":
                                        return False, 0.0, f"Face registration failed: {s_data.get('errorMessage')}", {}
                                else:
                                    return False, 0.0, f"Face polling error {status_res.status}", {}
                else:
                    return False, 0.0, f"Face API error {face_res.status}: {face_text}", {}

        elapsed = time.time() - start_time
        return True, elapsed, None, cookies
    except Exception as e:
        return False, 0.0, str(e), {}

async def mark_attendance(session_id, password, worker_id, cookies, results, base_url, lat, lon, test_face, face_base64):
    """Sends a request to mark attendance using the saved session cookies."""
    attendance_create_url = f"{base_url}/attendance/create"
    payload = {
        "sessionId": session_id,
        "payload": {
            "password": password
        }
    }
    
    if lat is not None and lon is not None:
        payload["payload"]["latitude"] = lat
        payload["payload"]["longitude"] = lon
        
    if test_face:
        img_data = face_base64 if face_base64 else DUMMY_IMAGE
        payload["payload"]["images"] = [img_data, img_data, img_data]
        
    headers = {}
    if 'XSRF-TOKEN' in cookies:
        headers['X-XSRF-TOKEN'] = cookies['XSRF-TOKEN']

    try:
        async with aiohttp.ClientSession(cookies=cookies) as http_session:
            start_time = time.time()
            async with http_session.post(attendance_create_url, json=payload, headers=headers) as response:
                text = await response.text()
                
                if response.status == 202 or response.status == 200:
                    try:
                        data = json.loads(text)
                    except:
                        data = {}
                        
                    # If it's an async face verification request, we need to poll
                    if "requestId" in data and test_face:
                        request_id = data["requestId"]
                        status_url = f"{base_url}/attendance/status/{request_id}"
                        
                        while True:
                            await asyncio.sleep(0.5)
                            async with http_session.get(status_url, headers=headers) as status_res:
                                status_text = await status_res.text()
                                if status_res.status == 200:
                                    status_data = json.loads(status_text)
                                    if status_data.get("status") == "SUCCESS":
                                        elapsed = time.time() - start_time
                                        results.append({"worker_id": worker_id, "step": "attendance", "success": True, "time_s": elapsed, "error": None, "response": status_text})
                                        return
                                    elif status_data.get("status") == "FAILED":
                                        elapsed = time.time() - start_time
                                        results.append({"worker_id": worker_id, "step": "attendance", "success": False, "time_s": elapsed, "error": status_data.get("errorMessage"), "response": status_text})
                                        return
                                else:
                                    elapsed = time.time() - start_time
                                    results.append({"worker_id": worker_id, "step": "attendance", "success": False, "time_s": elapsed, "error": f"Polling Error {status_res.status}", "response": status_text})
                                    return
                    else:
                        elapsed = time.time() - start_time
                        results.append({
                            "worker_id": worker_id,
                            "step": "attendance",
                            "success": True,
                            "time_s": elapsed,
                            "error": None,
                            "response": text
                        })
                else:
                    elapsed = time.time() - start_time
                    results.append({
                        "worker_id": worker_id,
                        "step": "attendance",
                        "success": False,
                        "time_s": elapsed,
                        "error": f"Status {response.status}: {text}",
                        "response": text
                    })
    except Exception as e:
        results.append({
            "worker_id": worker_id,
            "step": "attendance",
            "success": False,
            "time_s": 0.0,
            "error": str(e),
            "response": ""
        })

async def do_register(users, base_url, test_face, face_image_path):
    print(f"Registering {users} users on {base_url}...")
    
    face_base64 = None
    if test_face and face_image_path:
        try:
            with open(face_image_path, "rb") as img_file:
                face_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        except Exception as e:
            print(f"Error reading face image: {e}")
            return
            
    if test_face:
        print("Facial registration ENABLED (polling mode). This will stress the ML queue.")

    start_time = time.time()
    all_cookies = {}
    
    # Use a semaphore to pace registration and avoid Traefik 429 Rate Limits
    sem = asyncio.Semaphore(20)
    
    async def worker(user_id):
        async with sem:
            async with aiohttp.ClientSession() as http_session:
                success, _, error, cookies = await register_user(http_session, user_id, base_url, test_face, face_base64)
                if success:
                    all_cookies[user_id] = cookies
                else:
                    print(f"User {user_id} registration failed: {error}")

    tasks = [worker(i) for i in range(users)]
    await asyncio.gather(*tasks)

    with open(SESSIONS_FILE, "w") as f:
        json.dump(all_cookies, f)
        
    total_time = time.time() - start_time
    print(f"Registered {len(all_cookies)} users in {total_time:.2f} seconds.")
    print(f"Sessions saved to {SESSIONS_FILE}")

async def do_attendance(session_id, password, output, base_url, lat, lon, test_face, face_image_path):
    if not os.path.exists(SESSIONS_FILE):
        print(f"Error: {SESSIONS_FILE} not found. Please run --action register first.")
        return

    face_base64 = None
    if test_face and face_image_path:
        try:
            with open(face_image_path, "rb") as img_file:
                # SPOT's python backend might expect raw base64 or prefixed. Let's send raw base64.
                face_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        except Exception as e:
            print(f"Error reading face image: {e}")
            return

    with open(SESSIONS_FILE, "r") as f:
        all_cookies = json.load(f)

    users_count = len(all_cookies)
    print(f"Found {users_count} saved sessions. Starting attendance load test on {base_url}...")
    if test_face:
        print("Facial recognition testing ENABLED (polling mode).")
    if lat is not None and lon is not None:
        print(f"GPS testing ENABLED (lat: {lat}, lon: {lon}).")
    
    results = []
    start_time = time.time()
    
    tasks = [mark_attendance(session_id, password, worker_id, cookies, results, base_url, lat, lon, test_face, face_base64) for worker_id, cookies in all_cookies.items()]
    await asyncio.gather(*tasks)

    total_time = time.time() - start_time
    print(f"Attendance load test completed in {total_time:.2f} seconds.")

    successes = len([r for r in results if r["success"]])
    failures = len([r for r in results if not r["success"]])
    
    print("\n--- Summary ---")
    print(f"Total Requests: {users_count}")
    print(f"Successful Attendances: {successes}")
    print(f"Failed Attendances: {failures}")
    print(f"Requests per second (overall): {users_count / total_time:.2f} req/s")

    with open(output, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["worker_id", "step", "success", "time_s", "error", "response"])
        writer.writeheader()
        for r in results:
            writer.writerow(r)
    
    print(f"\nDetailed results saved to {output}")

async def main():
    parser = argparse.ArgumentParser(description="Load testing script for SPOT attendance.")
    parser.add_argument("--action", type=str, choices=["register", "attendance"], required=True, help="Action to perform: register users or mark attendance")
    parser.add_argument("--users", type=int, default=100, help="Number of concurrent users to register (only used with --action register)")
    parser.add_argument("--session-id", type=int, help="Session ID to mark attendance for (only used with --action attendance)")
    parser.add_argument("--password", type=str, help="Password for the session (only used with --action attendance)")
    parser.add_argument("--output", type=str, default="load_test_results.csv", help="Output CSV file for results")
    parser.add_argument("--base-url", type=str, default="http://localhost:8080", help="Base URL of the SPOT backend")
    
    # New arguments for testing additional validation types
    parser.add_argument("--lat", type=float, help="Latitude for GPS validation")
    parser.add_argument("--lon", type=float, help="Longitude for GPS validation")
    parser.add_argument("--test-face", action="store_true", help="Enable testing facial recognition (will poll for status)")
    parser.add_argument("--face-image", type=str, default="test_face.jpg", help="Path to a valid face image (JPEG/PNG) to encode and send for facial recognition testing")
    
    args = parser.parse_args()

    if args.action == "register":
        await do_register(args.users, args.base_url, args.test_face, args.face_image)
    elif args.action == "attendance":
        if args.session_id is None or args.password is None:
            print("Error: --session-id and --password are required for --action attendance")
            return
        await do_attendance(args.session_id, args.password, args.output, args.base_url, args.lat, args.lon, args.test_face, args.face_image)

if __name__ == "__main__":
    asyncio.run(main())
