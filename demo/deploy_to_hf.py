from pathlib import Path
import os
import shutil
import tempfile

from huggingface_hub import HfApi

ROOT = Path(__file__).resolve().parent.parent
DEMO = ROOT / "demo"

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
    space_sdk="gradio",
    exist_ok=True,
)

with tempfile.TemporaryDirectory() as tmp:
    stage = Path(tmp)

    shutil.copy2(DEMO / "app.py", stage / "app.py")
    shutil.copy2(DEMO / "requirements.txt", stage / "requirements.txt")
    shutil.copy2(DEMO / "SPACE_README.md", stage / "README.md")
    shutil.copy2(ROOT / "SKILL.md", stage / "SKILL.md")
    shutil.copy2(ROOT / "CHECKLIST.md", stage / "CHECKLIST.md")

    extension_dir = stage / "extensions"
    extension_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(
        ROOT / "extensions" / "WRITTEN_SPOKEN.md",
        extension_dir / "WRITTEN_SPOKEN.md",
    )

    api.upload_folder(
        repo_id=SPACE_REPO,
        repo_type="space",
        folder_path=str(stage),
        commit_message="Deploy hosted writing-skill playground",
    )

try:
    api.request_space_hardware(
        repo_id=SPACE_REPO,
        hardware="zero-a10g",
    )
except Exception as exc:
    raise SystemExit(
        "The app was uploaded, but Hugging Face did not grant ZeroGPU hardware. "
        "Free personal accounts must be in good standing, have a verified email, "
        "and be old enough to qualify for ZeroGPU hosting. Original error: "
        f"{exc}"
    ) from exc

print(f"Deployed: https://huggingface.co/spaces/{SPACE_REPO}")
print("Requested hardware: zero-a10g (Hugging Face ZeroGPU)")
