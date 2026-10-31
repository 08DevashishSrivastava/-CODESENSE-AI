import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "ai_available" in data

@pytest.mark.asyncio
async def test_analyze_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "language": "python",
            "code": "def add(a, b):\n    return a +\n",
            "problem_context": {
                "title": "Two Sum",
                "description": "",
                "constraints": ""
            },
            "code_version": 1
        }
        res = await client.post("/api/v1/analyze", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["code_version"] == 1
        assert isinstance(data["diagnostics"], list)
        assert len(data["diagnostics"]) > 0

@pytest.mark.asyncio
async def test_invalid_language_returns_400():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "language": "ruby",
            "code": "puts 1",
            "problem_context": {},
            "code_version": 1
        }
        res = await client.post("/api/v1/analyze", json=payload)
        assert res.status_code == 400

@pytest.mark.asyncio
async def test_analyze_static_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "language": "python",
            "code": "def solve():\n    return 42\n    print('dead code')",
            "problem_context": {
                "title": "Dead Code Check",
                "description": "Check unreachable code",
                "constraints": ""
            },
            "code_version": 2
        }
        res = await client.post("/api/v1/analyze/static", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["code_version"] == 2
        assert len(data["diagnostics"]) > 0

@pytest.mark.asyncio
async def test_settings_crud_guest():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Get settings
        get_res = await client.get("/api/v1/settings")
        assert get_res.status_code == 200
        settings = get_res.json()
        assert "voice_enabled" in settings

        # Update settings
        put_res = await client.put("/api/v1/settings", json={"speech_rate": 1.25})
        assert put_res.status_code == 200
        updated = put_res.json()
        assert updated["speech_rate"] == 1.25

@pytest.mark.asyncio
async def test_usage_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/usage")
        assert res.status_code == 200
        data = res.json()
        assert "total_analyses" in data
        assert "records" in data
