from fastapi import FastAPI

app = FastAPI(title="AI Talent Platform API")


@app.get("/health")
def health():
    return {"status": "ok"}
