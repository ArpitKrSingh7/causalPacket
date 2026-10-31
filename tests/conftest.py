import pytest
from scripts.generate_samples import generate


@pytest.fixture
def captures(tmp_path):
    generate(tmp_path)
    return tmp_path
