"""End-to-end backend tests for One Touch Audit AI.

Covers: auth, dashboards, controls, exceptions, cases, evidence, copilot,
admin, ingestion, readiness. Uses live backend via REACT_APP_BACKEND_URL.
"""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback: read frontend/.env since tests run outside react env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"')
                    break
    except Exception:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

CFO = {"email": "cfo@onetouch.ai", "password": "demo1234"}
OWNER = {"email": "owner@onetouch.ai", "password": "demo1234"}


# --------------- Fixtures ---------------
@pytest.fixture(scope="session")
def cfo_token():
    r = requests.post(f"{API}/auth/login", json=CFO, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def owner_token():
    r = requests.post(f"{API}/auth/login", json=OWNER, timeout=30)
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="session")
def cfo_headers(cfo_token):
    return {"Authorization": f"Bearer {cfo_token}"}


@pytest.fixture(scope="session")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


# --------------- Auth ---------------
class TestAuth:
    def test_login_valid(self):
        r = requests.post(f"{API}/auth/login", json=CFO, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["user"]["email"] == "cfo@onetouch.ai"
        assert data["user"]["role"] == "CFO"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": "cfo@onetouch.ai", "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_me(self, cfo_headers):
        r = requests.get(f"{API}/auth/me", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == "cfo@onetouch.ai"

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code in (401, 403)


# --------------- Dashboards ---------------
class TestDashboards:
    def test_cfo_cockpit(self, cfo_headers):
        r = requests.get(f"{API}/dashboard/cfo", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        for k in ("kpis", "heatmap", "top_risks", "trends", "top_failing_controls"):
            assert k in data, f"missing {k}"
        # Heatmap is entity × process; Phase 2 may add processes, so avoid hardcoding.
        assert len(data["heatmap"]) >= 20, f"expected at least baseline heatmap cells, got {len(data['heatmap'])}"
        assert len(data["top_risks"]) <= 10
        assert len(data["trends"]) == 8

    def test_controller(self, cfo_headers):
        r = requests.get(f"{API}/dashboard/controller", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "kpis" in data
        assert "reconciliations" in data
        assert "ap_exceptions" in data

    def test_audit(self, cfo_headers):
        r = requests.get(f"{API}/dashboard/audit", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "controls" in data and len(data["controls"]) >= 12
        assert "recent_runs" in data

    def test_compliance(self, cfo_headers):
        r = requests.get(f"{API}/dashboard/compliance", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        for k in ("kpis", "sod_conflicts", "access_violations", "exception_aging"):
            assert k in data

    def test_my_cases(self, owner_headers):
        r = requests.get(f"{API}/dashboard/my-cases", headers=owner_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "kpis" in data and "cases" in data
        for c in data["cases"]:
            assert c["owner_email"] == "owner@onetouch.ai"

    def test_readiness(self, cfo_headers):
        r = requests.get(f"{API}/readiness", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --------------- Controls ---------------
EXPECTED_CONTROLS = {
    "C-AP-001", "C-AP-002", "C-AP-003", "C-AP-004", "C-AP-005",
    "C-GL-001", "C-GL-002", "C-GL-003",
    "C-ACC-001", "C-ACC-002",
    "C-TR-001", "C-TX-001",
}


class TestControls:
    def test_list_controls(self, cfo_headers):
        r = requests.get(f"{API}/controls", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        controls = r.json()
        codes = {c["code"] for c in controls}
        assert EXPECTED_CONTROLS.issubset(codes), f"missing: {EXPECTED_CONTROLS - codes}"

    def test_run_single_control(self, cfo_headers):
        controls = requests.get(f"{API}/controls", headers=cfo_headers, timeout=30).json()
        cid = controls[0]["id"]
        r = requests.post(f"{API}/controls/{cid}/run", headers=cfo_headers, timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert "run_id" in data
        assert "exceptions" in data
        assert data.get("status") == "success"

    def test_run_all(self, cfo_headers):
        r = requests.post(f"{API}/controls/run-all", headers=cfo_headers, timeout=120)
        assert r.status_code == 200
        data = r.json()
        assert data.get("total_exceptions", 0) > 0


# --------------- Exceptions + Cases ---------------
class TestExceptionsAndCases:
    def test_list_exceptions(self, cfo_headers):
        r = requests.get(f"{API}/exceptions?limit=500", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        lst = r.json()
        assert len(lst) > 100, f"expected many exceptions, got {len(lst)}"

    def test_filter_exceptions(self, cfo_headers):
        r = requests.get(f"{API}/exceptions?severity=high&limit=50",
                         headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        for e in r.json():
            assert e["severity"] == "high"

    def test_exception_detail(self, cfo_headers):
        lst = requests.get(f"{API}/exceptions?limit=5", headers=cfo_headers, timeout=30).json()
        eid = lst[0]["id"]
        r = requests.get(f"{API}/exceptions/{eid}", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["exception"]["id"] == eid

    def test_promote_exception_to_case(self, cfo_headers):
        # find an exception without a case
        lst = requests.get(f"{API}/exceptions?status=open&limit=100",
                           headers=cfo_headers, timeout=30).json()
        assert lst, "no open exceptions"
        eid = None
        for e in lst:
            det = requests.get(f"{API}/exceptions/{e['id']}", headers=cfo_headers, timeout=30).json()
            if not det.get("case"):
                eid = e["id"]
                break
        assert eid, "could not find open exception without a case"
        r = requests.post(f"{API}/cases/from-exception?exception_id={eid}",
                          headers=cfo_headers, timeout=30)
        assert r.status_code == 200, r.text
        case = r.json()
        assert case["exception_id"] == eid
        assert case["status"] == "open"
        # idempotent
        r2 = requests.post(f"{API}/cases/from-exception?exception_id={eid}",
                           headers=cfo_headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["id"] == case["id"]

    def test_case_update_and_comment(self, cfo_headers):
        # pick first case
        cases = requests.get(f"{API}/cases?limit=5", headers=cfo_headers, timeout=30).json()
        assert cases
        cid = cases[0]["id"]
        # comment
        r = requests.post(f"{API}/cases/{cid}/comments",
                         headers=cfo_headers, json={"comment": "TEST_comment_auto"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["comment"] == "TEST_comment_auto"
        # update status to closed
        r = requests.patch(f"{API}/cases/{cid}", headers=cfo_headers,
                          json={"status": "closed"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["status"] == "closed"
        assert r.json().get("closed_at") is not None
        # verify detail returns comments + history
        det = requests.get(f"{API}/cases/{cid}", headers=cfo_headers, timeout=30).json()
        assert any(c["comment"] == "TEST_comment_auto" for c in det["comments"])
        assert det["case"]["status"] == "closed"
        # exception was also closed
        assert det["exception"]["status"] == "closed"


# --------------- Evidence ---------------
class TestEvidence:
    def test_evidence_graph(self, cfo_headers):
        lst = requests.get(f"{API}/exceptions?limit=3", headers=cfo_headers, timeout=30).json()
        eid = lst[0]["id"]
        r = requests.get(f"{API}/evidence/{eid}", headers=cfo_headers, timeout=30)
        assert r.status_code == 200, r.text
        g = r.json()
        assert "nodes" in g and "edges" in g
        assert len(g["nodes"]) >= 1
        types = {n.get("type") for n in g["nodes"]}
        # at least control + exception nodes
        assert {"control", "exception"}.issubset(types)


# --------------- Copilot ---------------
class TestCopilot:
    def test_copilot_ask(self, cfo_headers):
        r = requests.post(f"{API}/copilot/ask", headers=cfo_headers,
                          json={"question": "What are the top duplicate payment exposures?"},
                          timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("answer", "citations", "confidence", "model", "needs_human_review"):
            assert k in data, f"missing {k}: got {list(data.keys())}"
        assert isinstance(data["answer"], str) and len(data["answer"]) > 10
        assert isinstance(data["citations"], list)

    def test_copilot_sessions(self, cfo_headers):
        r = requests.get(f"{API}/copilot/sessions", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --------------- Admin ---------------
class TestAdmin:
    def test_models(self, cfo_headers):
        r = requests.get(f"{API}/admin/models", headers=cfo_headers, timeout=30)
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_prompts(self, cfo_headers):
        r = requests.get(f"{API}/admin/prompts", headers=cfo_headers, timeout=30)
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_audit_logs(self, cfo_headers):
        r = requests.get(f"{API}/admin/audit-logs", headers=cfo_headers, timeout=30)
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_summary(self, cfo_headers):
        r = requests.get(f"{API}/admin/summary", headers=cfo_headers, timeout=30)
        assert r.status_code == 200
        assert "collections" in r.json()

    def test_ingestion_runs(self, cfo_headers):
        r = requests.get(f"{API}/admin/ingestion-runs", headers=cfo_headers, timeout=30)
        assert r.status_code == 200

    def test_seed_reset_forbidden_for_owner(self, owner_headers):
        r = requests.post(f"{API}/admin/seed-reset", headers=owner_headers, timeout=60)
        assert r.status_code == 403


# --------------- Ingestion ---------------
class TestIngestion:
    def test_csv_invoices(self, cfo_headers):
        csv_body = (
            "invoice_number,vendor_id,vendor_name,entity,invoice_date,amount,tax_amount,"
            "expected_tax_amount,status\n"
            "TEST_INV_001,V-1000,TEST Vendor,US-HQ,2026-01-05,1500.0,270.0,270.0,posted\n"
            "TEST_INV_002,V-1000,TEST Vendor,US-HQ,2026-01-05,3000.0,540.0,540.0,posted\n"
        )
        files = {"file": ("invoices.csv", io.BytesIO(csv_body.encode()), "text/csv")}
        data = {"dataset": "invoices"}
        r = requests.post(f"{API}/ingest/csv", headers=cfo_headers,
                          files=files, data=data, timeout=30)
        assert r.status_code == 200, r.text
        res = r.json()
        assert res["dataset"] == "invoices"
        assert res["rows_ingested"] == 2
        assert "lineage_id" in res

    def test_csv_bad_dataset(self, cfo_headers):
        files = {"file": ("x.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")}
        r = requests.post(f"{API}/ingest/csv", headers=cfo_headers,
                          files=files, data={"dataset": "bogus"}, timeout=30)
        assert r.status_code == 400
