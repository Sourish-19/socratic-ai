import requests

BASE_URL = "http://localhost:8000"

print("1. Creating a new Socratic session...")
res = requests.post(f"{BASE_URL}/v1/session/new", json={
    "student_id": "student_123",
    "topic": "Newton's Laws of Motion"
})
session_id = res.json()["session_id"]
print(f"Session created: {session_id}\n")

print("2. Sending initial student query...")
chat_res = requests.post(f"{BASE_URL}/v1/chat", json={
    "session_id": session_id,
    "student_id": "student_123",
    "message": "Can you just tell me the formula for force?"
})
data = chat_res.json()
print(f"Tutor Response: {data['response']}")
print(f"Current Stage: S{data['stage']}")
print(f"Hints Given: {data['hints_given']}")
print(f"Confidence Score: {data['confidence']}\n")

print("3. Sending a partially correct student answer...")
chat_res = requests.post(f"{BASE_URL}/v1/chat", json={
    "session_id": session_id,
    "student_id": "student_123",
    "message": "I think it has to do with mass and acceleration, but I'm not sure."
})
data = chat_res.json()
print(f"Tutor Response: {data['response']}")
print(f"Current Stage: S{data['stage']}")
print(f"Hints Given: {data['hints_given']}")
print(f"Confidence Score: {data['confidence']}")
