from fastapi.testclient import TestClient

from src.app import app, study_data


client = TestClient(app)


def reset_data():
    study_data["sources"].clear()
    study_data["essay_paragraphs"].clear()
    study_data["exam_templates"].clear()
    study_data["rewards"]["xp"] = 0
    study_data["rewards"]["badges"] = []


def test_root_redirects_to_static_app():
    reset_data()
    response = client.get("/", follow_redirects=False)
    assert response.status_code in (307, 302)
    assert response.headers["location"] == "/static/index.html"


def test_source_creation_and_dashboard_listing():
    reset_data()
    response = client.post(
        "/sources",
        json={
            "title": "Medieval farming notes",
            "source_type": "pdf",
            "content": "Medieval villagers used crop rotation for stable harvests.",
        },
    )
    assert response.status_code == 200
    source_id = response.json()["source_id"]

    dashboard = client.get("/dashboard")
    assert dashboard.status_code == 200
    assert source_id in dashboard.json()["sources"]


def test_paragraph_requires_known_sources():
    reset_data()
    response = client.post(
        "/essay/paragraph",
        json={"text": "Farming methods improved over time.", "source_ids": ["src-missing"]},
    )
    assert response.status_code == 404
    assert "Unknown source ids" in response.json()["detail"]


def test_exam_template_generation_returns_skeleton_and_checklist():
    reset_data()
    response = client.post(
        "/exam-question",
        json={"question": "How did castles shape medieval society?", "guidance": "Use source context."},
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["skeleton"]) > 0
    assert len(payload["checklist"]) > 0


def test_rewards_progression_across_core_actions():
    reset_data()
    source_response = client.post(
        "/sources",
        json={
            "title": "Castle records",
            "source_type": "pdf",
            "content": "Castles protected trade routes and controlled local land.",
        },
    )
    source_id = source_response.json()["source_id"]

    paragraph_response = client.post(
        "/essay/paragraph",
        json={
            "text": "Castles controlled land and protected markets in nearby towns.",
            "source_ids": [source_id],
        },
    )
    assert paragraph_response.status_code == 200

    exam_response = client.post(
        "/exam-question",
        json={"question": "Explain the role of castles in political power."},
    )
    assert exam_response.status_code == 200

    rewards = client.get("/dashboard").json()["rewards"]
    assert rewards["xp"] == 45
    assert "Scribe" in rewards["badges"]
