import pytest


@pytest.mark.xfail(reason="Full ingestion requires vector DB and LLM mocks before it can be deterministic.")
def test_ingestion_pipeline_contract_placeholder():
    assert False
