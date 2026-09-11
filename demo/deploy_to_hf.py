from pathlib import Path
import os
import shutil
import tempfile

from huggingface_hub import HfApi

ROOT = Path(__file__).resolve().parent.parent
DEMO = ROOT / "demo"
STATIC = DEMO / "static"

TOKEN = os.environ.get("HF_TOKEN")
SPACE_REPO = os.environ.get("HF_SPACE_REPO")

if not TOKEN:
    raise SystemExit("Missing HF_TOKEN environment variable.")
if not SPACE_REPO:
    raise SystemExit("Missing HF_SPACE_REPO, e.g. your-user/writing-skill-approach-lab.")

api = HfApi(token=TOKEN)
api.create_repo(
    repo_id=SPACE_REPO,
    repo_type="space",
    space_sdk="static",
    exist_ok=True,
)

with tempfile.TemporaryDirectory() as tmp:
    stage = Path(tmp)

    for source in STATIC.iterdir():
        if source.is_file():
            shutil.copy2(source, stage / source.name)

    shutil.copy2(DEMO / "SPACE_README.md", stage / "README.md")
    shutil.copy2(ROOT / "SKILL.md", stage / "SKILL.md")
    shutil.copy2(ROOT / "CHECKLIST.md", stage / "CHECKLIST.md")

    api.upload_folder(
        repo_id=SPACE_REPO,
        repo_type="space",
        folder_path=str(stage),
        commit_message="Deploy free browser writing-skill approach lab",
    )

print(f"Deployed: https://huggingface.co/spaces/{SPACE_REPO}")
