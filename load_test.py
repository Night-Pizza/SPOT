import asyncio
import aiohttp
import time
import argparse
import csv
import json
import os
from datetime import datetime

# Endpoints will be dynamically built based on --base-url
SESSIONS_FILE = "sessions.json"

async def register_user(session, user_id, base_url):
    """Registers a test user and returns the cookies as a dict."""
    email = f"testuser_{user_id}@innopolis.university"
    test_register_url = f"{base_url}/auth/test-register"
    csrf_url = f"{base_url}/auth/csrf"
    try:
        start_time = time.time()
        async with session.post(test_register_url, params={"email": email}) as response:
            await response.read()
            
        # Also hit CSRF to get XSRF-TOKEN
        async with session.get(csrf_url) as response:
            await response.read()

        elapsed = time.time() - start_time
        
        cookies = {}
        for cookie in session.cookie_jar:
            cookies[cookie.key] = cookie.value
            
        return True, elapsed, None, cookies
    except Exception as e:
        return False, 0.0, str(e), {}

async def mark_attendance(session_id, password, worker_id, cookies, results, base_url):
    """Sends a request to mark attendance using the saved session cookies."""
    attendance_create_url = f"{base_url}/attendance/create"
    payload = {
        "sessionId": session_id,
        "payload": {
            "password": password
        }
    }
    
    headers = {}
    if 'XSRF-TOKEN' in cookies:
        headers['X-XSRF-TOKEN'] = cookies['XSRF-TOKEN']

    try:
        async with aiohttp.ClientSession(cookies=cookies) as http_session:
            start_time = time.time()
            async with http_session.post(attendance_create_url, json=payload, headers=headers) as response:
                text = await response.text()
                elapsed = time.time() - start_time
                if response.status == 202 or response.status == 200:
                    results.append({
                        "worker_id": worker_id,
                        "step": "attendance",
                        "success": True,
                        "time_s": elapsed,
                        "error": None,
                        "response": text
                    })
                else:
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

async def do_register(users, base_url):
    print(f"Registering {users} users on {base_url}...")
    start_time = time.time()
    all_cookies = {}
    
    async def worker(user_id):
        async with aiohttp.ClientSession() as http_session:
            success, _, _, cookies = await register_user(http_session, user_id, base_url)
            if success:
                all_cookies[user_id] = cookies

    tasks = [worker(i) for i in range(users)]
    await asyncio.gather(*tasks)

    with open(SESSIONS_FILE, "w") as f:
        json.dump(all_cookies, f)
        
    total_time = time.time() - start_time
    print(f"Registered {len(all_cookies)} users in {total_time:.2f} seconds.")
    print(f"Sessions saved to {SESSIONS_FILE}")

async def do_attendance(session_id, password, output, base_url):
    if not os.path.exists(SESSIONS_FILE):
        print(f"Error: {SESSIONS_FILE} not found. Please run --action register first.")
        return

    with open(SESSIONS_FILE, "r") as f:
        all_cookies = json.load(f)

    users_count = len(all_cookies)
    print(f"Found {users_count} saved sessions. Starting attendance load test on {base_url}...")
    
    results = []
    start_time = time.time()
    
    tasks = [mark_attendance(session_id, password, worker_id, cookies, results, base_url) for worker_id, cookies in all_cookies.items()]
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
    args = parser.parse_args()

    if args.action == "register":
        await do_register(args.users, args.base_url)
    elif args.action == "attendance":
        if args.session_id is None or args.password is None:
            print("Error: --session-id and --password are required for --action attendance")
            return
        await do_attendance(args.session_id, args.password, args.output, args.base_url)

if __name__ == "__main__":
    asyncio.run(main())
