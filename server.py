"""
MagangHub Explorer - FastAPI Backend Proxy Server
Handles asynchronous job queueing, CORS, and API proxying to MagangHub backend.
"""
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import time
import requests
import os

app = FastAPI(
    title="MagangHub Explorer Backend API",
    description="Backend Proxy & Task Queue Server for MagangHub Explorer",
    version="1.0.0"
)

# Enable CORS for local web app & production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-Memory Job Storage
jobs_db = {}

class StatusCheckRequest(BaseModel):
    email: str
    token: str = None

def worker_process_status(job_id: str, email: str, token: str):
    """
    Background Task: Executes HTTP request to target API
    """
    jobs_db[job_id]["status"] = "processing"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    target_url = "https://maganghub.kemnaker.go.id/be/v1/api/list/vacancies-aktif"

    try:
        # Simulate processing delay for queue visibility
        time.sleep(1)
        resp = requests.get(target_url, headers=headers, timeout=12)
        
        if resp.status_code == 200:
            jobs_db[job_id]["status"] = "completed"
            jobs_db[job_id]["result"] = resp.json()
        else:
            jobs_db[job_id]["status"] = "failed"
            jobs_db[job_id]["error"] = f"HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as e:
        jobs_db[job_id]["status"] = "failed"
        jobs_db[job_id]["error"] = str(e)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "MagangHub Explorer Backend Proxy",
        "version": "1.0.0"
    }

@app.post("/api/v1/check-status")
def submit_check_status(req: StatusCheckRequest, background_tasks: BackgroundTasks):
    job_id = f"job_cekstatus_{uuid.uuid4()}"
    jobs_db[job_id] = {
        "jobId": job_id,
        "status": "queued",
        "email": req.email,
        "createdAt": time.time(),
        "estimatedWait": 3
    }
    background_tasks.add_task(worker_process_status, job_id, req.email, req.token)
    
    return {
        "success": True,
        "jobId": job_id,
        "status": "queued",
        "estimatedWait": 3,
        "message": "Permintaan berhasil masuk antrian backend.",
        "statusUrl": f"/api/v1/check-status/jobs/{job_id}"
    }

@app.get("/api/v1/check-status/jobs/{job_id}")
def get_job_status(job_id: str):
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job ID tidak ditemukan")
    return jobs_db[job_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
