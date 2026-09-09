import pytest
import httpx
from app.services.failure_policy import classify_failure, FailureClassification

def test_transient_network_failure():
    err = httpx.ConnectError("Connection refused")
    classification, reason = classify_failure(err)
    assert classification == FailureClassification.TRANSIENT
    assert "Network" in reason

def test_transient_http_failure():
    req = httpx.Request("GET", "http://test")
    resp = httpx.Response(502, request=req)
    err = httpx.HTTPStatusError("502 Bad Gateway", request=req, response=resp)
    classification, reason = classify_failure(err)
    assert classification == FailureClassification.TRANSIENT
    assert "502" in reason

def test_permanent_http_failure():
    req = httpx.Request("GET", "http://test")
    resp = httpx.Response(403, request=req)
    err = httpx.HTTPStatusError("403 Forbidden", request=req, response=resp)
    classification, reason = classify_failure(err)
    assert classification == FailureClassification.PERMANENT
    assert "403" in reason

def test_permanent_data_failure():
    err = ValueError("Invalid input schema")
    classification, reason = classify_failure(err)
    assert classification == FailureClassification.PERMANENT

def test_permanent_missing_artifact():
    err = FileNotFoundError("data/scenes/missing.tif")
    classification, reason = classify_failure(err)
    assert classification == FailureClassification.PERMANENT
    assert "missing" in reason.lower()
