from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.database import check_database_health
from backend.app.models.base import Base, Repository


def test_database_health_check_function():
    """Verify check_database_health returns a valid status string."""
    status = check_database_health()
    assert status in {"connected", "disconnected", "unconfigured"}


def test_repository_model_instantiation():
    """Verify that the foundational Repository model can be instantiated and mapped."""
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)

    TestSession = sessionmaker(bind=test_engine)
    session = TestSession()

    repo = Repository(
        name="test-org/codesentinel",
        remote_url="https://github.com/test-org/codesentinel.git",
        default_branch="main",
        description="Test portfolio repository",
    )
    session.add(repo)
    session.commit()

    saved_repo = session.query(Repository).filter_by(name="test-org/codesentinel").first()
    assert saved_repo is not None
    assert saved_repo.id is not None
    assert saved_repo.created_at is not None
    assert saved_repo.status == "registered"

    session.close()
