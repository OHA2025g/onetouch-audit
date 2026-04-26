from app.services.case_service import case_from_exception


def test_case_from_exception_shape() -> None:
    ex = {
        "id": "ex-1",
        "control_code": "C-1",
        "control_name": "Test",
        "title": "T",
        "summary": "S",
        "severity": "critical",
        "financial_exposure": 1.0,
        "entity": "E1",
        "process": "P2P",
        "detected_at": "2020-01-01T00:00:00+00:00",
    }
    c = case_from_exception(ex, "a@b.com", "A B")
    assert c["status"] == "open"
    assert c["owner_email"] == "a@b.com"
    assert c["exception_id"] == "ex-1"
    assert c["priority"] == "P1"
