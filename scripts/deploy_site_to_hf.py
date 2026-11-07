#!/usr/bin/env python3
"""Upload dist/site to a static Hugging Face Space (HF_TOKEN, HF_SITE_REPO)."""
import os
from pathlib import Path
from huggingface_hub import HfApi

token = os.environ["HF_TOKEN"]
repo = os.environ.get("HF_SITE_REPO") or "wldud5192/writing-skill"
site = Path(__file__).resolve().parent.parent / "dist" / "site"
api = HfApi(token=token)
api.create_repo(repo_id=repo, repo_type="space", space_sdk="static", exist_ok=True)
api.upload_folder(repo_id=repo, repo_type="space", folder_path=str(site), commit_message="Deploy writing-skill site", delete_patterns=["*"])
sub = repo.split("/")
print(f"Deployed: https://huggingface.co/spaces/{repo}  ->  https://{sub[0]}-{sub[1].replace('_','-').replace('.','-')}.static.hf.space")
