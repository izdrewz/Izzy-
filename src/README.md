# Scholar's Quest Guided Study API

An ADHD-friendly guided study app focused on essay writing from PDF sources, exam-question scaffolding, contextual writing support, and rewards for progress.

## Features

- Add source text from PDFs into a clean source vault
- Link essay paragraphs to source text using shared context words
- Generate exam skeleton templates and actionable checklists from questions
- Get writing support prompts and track gamified rewards/badges
- View an organized dashboard of sources, drafts, and exam quests

## Getting Started

1. Install the dependencies:

   ```
   pip install -r requirements.txt
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - Guided app: http://localhost:8000/static/index.html
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint            | Description                                                  |
| ------ | ------------------- | ------------------------------------------------------------ |
| GET    | `/dashboard`        | Get organized study state (sources, drafts, exam quests)    |
| POST   | `/sources`          | Add a PDF source summary/text to the source vault           |
| POST   | `/essay/paragraph`  | Save paragraph and link it to selected sources by context   |
| POST   | `/exam-question`    | Generate essay skeleton template and checklist              |
| GET    | `/support/suggestions` | Get writing support prompts and current rewards         |

## Data Model

The application uses a simple in-memory model with meaningful identifiers:

1. **Sources** - Uses generated source IDs:

   - Title
   - Source type (PDF by default)
   - Extracted source text and keywords

2. **Essay Paragraphs** - Uses generated draft IDs:
   - Paragraph text
   - Linked source IDs
   - Similar-word context links to sources

3. **Exam Templates** - Uses generated quest IDs:
   - Exam question
   - Skeleton answer structure
   - Checklist items

4. **Rewards**:
   - XP points
   - Earned badges based on progress milestones

All data is stored in memory, which means data will be reset when the server restarts.
