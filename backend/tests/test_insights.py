"""Insights engine + theme feature backend tests (iteration 5)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://continuous-monitor.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SECTIONS = ["cfo", "controller", "audit", "compliance", "my-cases", "cases", "evidence"]
EXT_BLOCKED = ["cfo", "controller", "compliance", "my-cases", "cases"]
EXT_ALLOWED = ["evidence", "audit"]

USERS = {
    "cfo": ("cfo@onetouch.ai", "demo1234"),
    "controller": ("controller@onetouch.ai", "demo1234"),
    "auditor": ("auditor@onetouch.ai", "demo1234"),
    "compliance": ("compliance@onetouch.ai", "demo1234"),
    "owner": ("owner@onetouch.ai", "demo1234"),
    "ext": ("external.auditor@bigfour.example", "demo1234"),
}


def _login(email, pwd):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pwd}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def tokens():
    return {k: _login(e, p) for k, (e, p) in USERS.items()}


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Section coverage ----------
@pytest.mark.parametrize("section", SECTIONS)
def test_insights_returns_200_and_shape(tokens, section):
    # pick the right persona
    persona = {
        "cfo": "cfo", "controller": "controller", "audit": "auditor",
        "compliance": "compliance", "my-cases": "owner",
        "cases": "cfo", "evidence": "auditor"
    }[section]
    r = requests.get(f"{API}/insights/{section}", headers=_hdr(tokens[persona]), timeout=30)
    assert r.status_code == 200, f"{section}: {r.status_code} {r.text[:300]}"
    d = r.json()
    for k in ("insights", "recommendations", "action_items", "source", "section_label", "cached", "cache_age_sec"):
        assert k in d, f"{section} missing key {k} — got {list(d.keys())}"
    assert isinstance(d["insights"], list)
    assert isinstance(d["recommendations"], list)
    assert isinstance(d["action_items"], list)
    assert d["source"] in ("heuristic", "gemini-3-flash-preview") or d["source"].startswith("gemini")
    # Shape contract
    for ins in d["insights"]:
        assert "title" in ins and "detail" in ins and "severity" in ins, f"{section} insight missing keys: {ins}"
    for rec in d["recommendations"]:
        assert "title" in rec and "detail" in rec and "impact" in rec, f"{section} rec missing keys: {rec}"
    for a in d["action_items"]:
        assert "title" in a and "priority" in a, f"{section} action missing keys: {a}"


# ---------- Invalid section ----------
def test_insights_invalid_section_400(tokens):
    r = requests.get(f"{API}/insights/does-not-exist", headers=_hdr(tokens["cfo"]), timeout=15)
    assert r.status_code == 400, r.text


# ---------- RBAC: external auditor blocked on sensitive sections ----------
@pytest.mark.parametrize("section", EXT_BLOCKED)
def test_insights_external_auditor_403(tokens, section):
    r = requests.get(f"{API}/insights/{section}", headers=_hdr(tokens["ext"]), timeout=15)
    assert r.status_code == 403, f"{section}: expected 403 got {r.status_code} {r.text[:200]}"


@pytest.mark.parametrize("section", EXT_ALLOWED)
def test_insights_external_auditor_200_allowed(tokens, section):
    r = requests.get(f"{API}/insights/{section}", headers=_hdr(tokens["ext"]), timeout=30)
    assert r.status_code == 200, f"{section}: {r.status_code} {r.text[:200]}"


# ---------- Auth required ----------
def test_insights_requires_auth():
    r = requests.get(f"{API}/insights/cfo", timeout=15)
    assert r.status_code in (401, 403)


# ---------- Cache behaviour ----------
def test_insights_cache_then_refresh(tokens):
    # prime cache
    r1 = requests.get(f"{API}/insights/cfo", headers=_hdr(tokens["cfo"]), timeout=30)
    assert r1.status_code == 200
    time.sleep(1)
    # Second plain call: should be cached=True
    r2 = requests.get(f"{API}/insights/cfo", headers=_hdr(tokens["cfo"]), timeout=30)
    assert r2.status_code == 200
    assert r2.json().get("cached") is True, f"expected cached=True, got {r2.json().get('cached')}"
    # Third call with refresh=true: must bypass cache
    r3 = requests.get(f"{API}/insights/cfo?refresh=true", headers=_hdr(tokens["cfo"]), timeout=30)
    assert r3.status_code == 200
    assert r3.json().get("cached") is False, f"expected cached=False after refresh=true, got {r3.json().get('cached')}"


# ---------- Heuristic fallback path observed ----------
def test_insights_source_is_heuristic_or_gemini(tokens):
    r = requests.get(f"{API}/insights/cfo?refresh=true", headers=_hdr(tokens["cfo"]), timeout=30)
    assert r.status_code == 200
    src = r.json()["source"]
    # Per review request, env is heuristic-fallback; accept either
    assert src in ("heuristic",) or src.startswith("gemini"), f"unexpected source: {src}"


# ---------- No regression sanity: key phase2 endpoints still work ----------
def test_no_regression_cfo_cockpit(tokens):
    r = requests.get(f"{API}/dashboard/cfo", headers=_hdr(tokens["cfo"]), timeout=20)
    assert r.status_code == 200


def test_no_regression_controls_list(tokens):
    r = requests.get(f"{API}/controls", headers=_hdr(tokens["cfo"]), timeout=20)
    assert r.status_code == 200
    assert len(r.json()) >= 23  # phase2 = 23 controls
