"""Guided study API for essay writing and exam prep."""

import os
import re
from pathlib import Path
from typing import Dict, List
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

app = FastAPI(
    title="Guided Study Companion API",
    description="All-in-one guided study app with writing, source, and exam support.",
)

app.mount(
    "/static",
    StaticFiles(directory=os.path.join(Path(__file__).parent, "static")),
    name="static",
)


class SourceCreate(BaseModel):
    title: str = Field(min_length=1)
    source_type: str = "pdf"
    content: str = Field(min_length=1)


class EssayParagraphCreate(BaseModel):
    text: str = Field(min_length=1)
    source_ids: List[str] = Field(min_length=1)


class ExamQuestionCreate(BaseModel):
    question: str = Field(min_length=1)
    guidance: str = ""


study_data: Dict[str, object] = {
    "sources": {},
    "essay_paragraphs": [],
    "exam_templates": [],
    "rewards": {"xp": 0, "badges": []},
}


def _add_xp(amount: int) -> None:
    study_data["rewards"]["xp"] += amount
    xp = study_data["rewards"]["xp"]
    badge_rules = [(30, "Scribe"), (60, "Archivist"), (90, "Knight of Focus")]
    for threshold, badge in badge_rules:
        if xp >= threshold and badge not in study_data["rewards"]["badges"]:
            study_data["rewards"]["badges"].append(badge)


def _keywords(text: str) -> List[str]:
    return [token for token in re.findall(r"[a-z]{4,}", text.lower())]


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/dashboard")
def get_dashboard():
    return {
        "sources": study_data["sources"],
        "essay_paragraphs": study_data["essay_paragraphs"],
        "exam_templates": study_data["exam_templates"],
        "rewards": study_data["rewards"],
        "file_organizer": {
            "sources": list(study_data["sources"].keys()),
            "draft_sections": [item["id"] for item in study_data["essay_paragraphs"]],
            "exam_quests": [item["id"] for item in study_data["exam_templates"]],
        },
    }


@app.post("/sources")
def add_source(payload: SourceCreate):
    source_id = f"src-{uuid4().hex[:8]}"
    study_data["sources"][source_id] = {
        "title": payload.title,
        "source_type": payload.source_type,
        "content": payload.content,
        "keywords": _keywords(payload.content),
    }
    _add_xp(10)
    return {"source_id": source_id, "message": "Source added to vault."}


@app.post("/essay/paragraph")
def add_essay_paragraph(payload: EssayParagraphCreate):
    missing_sources = [source_id for source_id in payload.source_ids if source_id not in study_data["sources"]]
    if missing_sources:
        raise HTTPException(status_code=404, detail=f"Unknown source ids: {', '.join(missing_sources)}")

    paragraph_keywords = set(_keywords(payload.text))
    context_links = []
    for source_id in payload.source_ids:
        source = study_data["sources"][source_id]
        overlap = sorted(paragraph_keywords.intersection(source["keywords"]))[:8]
        context_links.append({"source_id": source_id, "title": source["title"], "similar_words": overlap})

    paragraph = {
        "id": f"draft-{uuid4().hex[:8]}",
        "text": payload.text,
        "source_ids": payload.source_ids,
        "context_links": context_links,
    }
    study_data["essay_paragraphs"].append(paragraph)
    _add_xp(20)
    return {
        "message": "Paragraph saved and linked to sources.",
        "paragraph": paragraph,
        "support_tip": "Great step! Next, expand one sentence with evidence from the highlighted source words.",
    }


@app.post("/exam-question")
def create_exam_template(payload: ExamQuestionCreate):
    focus = payload.question.strip().rstrip("?")
    prompt_line = payload.guidance.strip() or "Use the source evidence and explain context before your conclusion."
    template = {
        "id": f"quest-{uuid4().hex[:8]}",
        "question": payload.question,
        "skeleton": [
            f"Hook: Restate the task about '{focus}'.",
            "Claim: State your answer in one clear sentence.",
            "Evidence: Add two source-backed points with short quotes.",
            "Context: Explain why each quote supports your claim.",
            "Conclusion: Link back to the exam question and final judgement.",
        ],
        "checklist": [
            "I answered every part of the question.",
            "Each paragraph includes evidence from a source.",
            "I explained context, not just copied quotes.",
            f"Guidance check: {prompt_line}",
        ],
    }
    study_data["exam_templates"].append(template)
    _add_xp(15)
    return template


@app.get("/support/suggestions")
def get_support_suggestions():
    paragraph_count = len(study_data["essay_paragraphs"])
    sources_count = len(study_data["sources"])
    suggestions = [
        "Start small: write one claim sentence, then attach one source.",
        "Use transition starters: 'This suggests...', 'In contrast...', 'Therefore...'.",
    ]
    if paragraph_count == 0:
        suggestions.append("You have no draft yet. Begin with your thesis sentence.")
    if sources_count == 0:
        suggestions.append("Add at least one PDF source to unlock context linking.")
    return {"suggestions": suggestions, "rewards": study_data["rewards"]}
