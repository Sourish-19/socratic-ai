from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
load_dotenv()

from socratic_layer import SessionManager, HintProgressionEngine, SocraticFilter, PROMPT_TEMPLATES
from inference import TutorInference
from document_parser import extract_text_from_base64
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_manager = SessionManager()
hint_engine = HintProgressionEngine()
socratic_filter = SocraticFilter()
tutor_inference = TutorInference()

class NewSessionRequest(BaseModel):
    student_id: str
    topic: str

class ChatRequest(BaseModel):
    session_id: str
    student_id: str
    message: str
    file_data: Optional[str] = None
    file_type: Optional[str] = None
    system_prompt: Optional[str] = None


@app.post("/v1/session/new")
def new_session(req: NewSessionRequest):
    # Using student_id as session_id for simplicity or generate a new one
    import uuid
    session_id = str(uuid.uuid4())
    session_manager.create_session(session_id, req.topic)
    return {"session_id": session_id}

@app.post("/v1/chat")
async def chat(request: ChatRequest):
    session = session_manager.get_session(request.session_id)
    if not session:
        # Auto-create the session if the frontend didn't explicitly create it
        session = session_manager.create_session(request.session_id, "general")

    stage = session['stage']
    subject = session.get('subject', 'general')
    
    # Format the prompt using the new ChatML format logic
    if request.system_prompt:
        system_content = request.system_prompt
    else:
        template = PROMPT_TEMPLATES.get(stage, PROMPT_TEMPLATES[1])
        system_content = template.format(subject=subject)
 
    # Build ChatML messages array
    messages = [{'role': 'system', 'content': system_content}]
    messages += session['history']
    
    # Process attached files
    user_message_content = request.message
    is_vision = False
    
    if request.file_data and request.file_type:
        ext = request.file_type.lower()
        if ext in ['pdf', 'docx', 'doc', 'pptx', 'txt']:
            # Extract text
            doc_text = extract_text_from_base64(request.file_data, ext)
            if doc_text:
                user_message_content += f"\n\n[Attached Document Content]:\n{doc_text}"
        elif ext in ['png', 'jpg', 'jpeg', 'webp', 'gif']:
            # Multimodal Vision Format
            is_vision = True
            # The frontend should pass the full data URI (data:image/jpeg;base64,...), 
            # but if it didn't, we'd need to prefix it. Assuming it does for now.
            user_content = [
                {"type": "text", "text": user_message_content},
                {"type": "image_url", "image_url": {"url": request.file_data}}
            ]
            messages.append({'role': 'user', 'content': user_content})

    if not is_vision:
        messages.append({'role': 'user', 'content': user_message_content})
 
    # 1. Generate primary response from Colab vLLM server
    response = await tutor_inference.generate(messages, stage=stage)
 
    # 2. Run the upgraded BART-MNLI Socratic Filter
    if socratic_filter.blocks_direct_answer(response):
        print("[FILTER] Model leaked answer! Intervening and requesting guiding question...")
        # If leaked, we inject a prompt correction to force a Socratic response
        messages.append({'role': 'assistant', 'content': response}) # The bad response
        messages.append({'role': 'user', 'content': 'That was too direct. Please try again and ask a guiding question instead without revealing the answer.'})
        response = await tutor_inference.generate(messages, stage=stage)
 
    # 3. Update Session State
    if is_vision:
        session['history'].append({'role': 'user', 'content': user_content})
    else:
        session['history'].append({'role': 'user', 'content': user_message_content})
    session['history'].append({'role': 'assistant', 'content': response})
    
    next_stage = hint_engine.determine_next_stage(stage, request.message)
    session['stage'] = next_stage
    
    if next_stage in [3, 4, 5]:
        session['hints_given'] += 1

    session_manager.update_session(request.session_id, session)
    
    confidence = hint_engine.scorer.score(request.message)

    return {
        "response": response, 
        "stage": next_stage,
        "hints_given": session['hints_given'],
        "confidence": confidence
    }

@app.get("/v1/session/{session_id}")
def get_session(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": True}

if __name__ == "__main__":
    # We must run the FastAPI server on port 8000. 
    # However, to avoid conflicts if anything else is on 8000, 
    # it's recommended to run frontend on 5173, FastAPI on 8000, Colab on public URL.
    uvicorn.run(app, host="0.0.0.0", port=8000)
