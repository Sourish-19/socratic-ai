import time
import diskcache
from typing import Optional
from transformers import pipeline

class SessionManager:
    def __init__(self, cache_dir: str = './session_cache'):
        # FREE replacement: diskcache — pure Python, persists to disk, zero infra!
        self.cache = diskcache.Cache(cache_dir)
        self.SESSION_TTL = 60 * 60 * 24  # 24 hours

    def create_session(self, session_id: str, topic: str):
        data = {'history': [], 'stage': 1, 'subject': topic, 'hints_given': 0, 'created': time.time()}
        self.cache.set(session_id, data, expire=self.SESSION_TTL)
        return data

    def get_session(self, session_id: str) -> Optional[dict]:
        return self.cache.get(session_id, default=None)

    def update_session(self, session_id: str, data: dict):
        self.cache.set(session_id, data, expire=self.SESSION_TTL)

    def delete_session(self, session_id: str):
        self.cache.delete(session_id)

PROMPT_TEMPLATES = {
    1: 'You are a Socratic tutor. NEVER reveal the answer if the student does not know it. If they answer correctly, warmly confirm it and move to the next concept. Otherwise, ask a broad exploratory question. Subject: {subject}.',
    2: 'You are a Socratic tutor. NEVER reveal the answer. If the student answers correctly, confirm it. Otherwise, ask for their initial hypothesis. Subject: {subject}.',
    3: 'You are a Socratic tutor. NEVER reveal the answer. If they answer correctly, confirm it. Otherwise, probe for misconceptions with a guiding question. Subject: {subject}.',
    4: 'You are a Socratic tutor teaching {subject}. The student needs a hint. Provide a structural framework hint without giving the answer. End with a question.',
    5: 'You are a Socratic tutor teaching {subject}. The student is very close. Give a near-direct hint, but require them to make the final connection. End with a question.',
    6: 'The student appears to understand {subject}. Ask them to explain the concept in their own words. Do NOT provide a model answer.',
    7: 'The student has successfully understood {subject}. Affirm their understanding and ask if they have any other questions.'
}

class ConfidenceScorer:
    def score(self, student_response: str) -> float:
        score = 0.5
        if len(student_response.split()) < 5: score -= 0.2
        if len(student_response.split()) > 20: score += 0.2
        for marker in ['because', 'therefore', 'so', 'means']:
            if marker in student_response.lower(): score += 0.1
        if '?' in student_response: score -= 0.1
        return max(0.0, min(1.0, score))

class HintProgressionEngine:
    def __init__(self):
        self.scorer = ConfidenceScorer()

    def determine_next_stage(self, current_stage, student_response):
        confidence = self.scorer.score(student_response)
        if current_stage == 1: return 2
        elif current_stage == 2: return 3 if confidence < 0.6 else 6
        elif current_stage == 3:
            if confidence < 0.4: return 4
            if confidence >= 0.6: return 6
            return 3
        elif current_stage == 4:
            if confidence < 0.5: return 5
            if confidence >= 0.6: return 6
            return 4
        elif current_stage == 5: return 6 if confidence >= 0.7 else 5
        elif current_stage == 6: return 7 if confidence >= 0.7 else 2
        return current_stage

class SocraticFilter:
    def __init__(self):
        # We explicitly lock it to CPU (-1) to avoid VRAM crashes!
        print("Loading Zero-shot Socratic Filter on CPU...")
        self.classifier = pipeline('zero-shot-classification', model='facebook/bart-large-mnli', device=-1)
        self.leak_hypothesis = 'provides the direct answer to a concept the student has not figured out yet'
        self.socratic_hypothesis = 'asks a guiding question or confirms a correct answer from the student'
        
    def blocks_direct_answer(self, ai_response: str) -> bool:
        res = self.classifier(ai_response[:512], [self.leak_hypothesis, self.socratic_hypothesis])
        
        # Only block if it's highly confident that it's leaking an unearned answer
        return res['labels'][0] == self.leak_hypothesis and res['scores'][0] > 0.6
    
