import pytest
from pydantic import ValidationError
from backend.app.core.config import Settings


def test_default_configuration_loads():
    """Verify that settings can be instantiated with default values."""
    config = Settings()
    assert config.PROJECT_NAME == "CodeSentinel AI"
    assert config.SERVICE_NAME == "codesentinel-api"
    assert config.VERSION == "0.1.0"
    assert config.API_PREFIX == "/api"
    assert isinstance(config.CORS_ORIGINS, list)
    assert len(config.CORS_ORIGINS) > 0


def test_custom_cors_string_assembly():
    """Verify comma-separated CORS string is correctly assembled into a list."""
    config = Settings(CORS_ORIGINS="http://example.com, https://app.example.com")
    assert config.CORS_ORIGINS == ["http://example.com", "https://app.example.com"]


def test_invalid_log_level_fails_safely():
    """Verify that an invalid log level fails validation with a clear error."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(LOG_LEVEL="INVALID_LEVEL")
    assert "LOG_LEVEL" in str(exc_info.value)


def test_invalid_pool_size_fails_safely():
    """Verify that out-of-bounds DB pool configuration fails validation."""
    with pytest.raises(ValidationError):
        Settings(DB_POOL_SIZE=0)  # ge=1

    with pytest.raises(ValidationError):
        Settings(DB_POOL_SIZE=100)  # le=50


def test_environment_validation_accepts_valid_environments():
    """Verify that allowed environment names are accepted case-insensitively."""
    for env in ["development", "test", "staging", "production", "DEVELOPMENT", "Staging"]:
        cfg = Settings(ENVIRONMENT=env)
        assert cfg.ENVIRONMENT.lower() == env.lower()


def test_environment_validation_rejects_invalid_environments():
    """Verify that unknown environment names are strictly rejected."""
    for invalid in ["prod", "dev", "qa", "local", "invalid_env"]:
        with pytest.raises(ValidationError) as exc:
            Settings(ENVIRONMENT=invalid)
        assert "ENVIRONMENT" in str(exc.value)


def test_staging_validation_rejects_debug_mode():
    """Staging configuration must reject DEBUG=True."""
    cfg = Settings(
        ENVIRONMENT="staging",
        DEBUG=True,
        SECRET_KEY="staging-secret-key-that-is-at-least-32-chars-long",
        DATABASE_URL="postgresql+psycopg://app:pass@staging-db:5432/codesentinel",
    )
    with pytest.raises(ValueError, match="DEBUG mode must be False in staging"):
        cfg.validate_production_settings()


def test_staging_validation_rejects_default_secret():
    """Staging configuration must reject default or weak secret keys."""
    cfg = Settings(
        ENVIRONMENT="staging",
        DEBUG=False,
        SECRET_KEY="codesentinel-dev-secret-key-change-in-production-min32chars",
        DATABASE_URL="postgresql+psycopg://app:pass@staging-db:5432/codesentinel",
    )
    with pytest.raises(ValueError, match="SECRET_KEY must be a dedicated random secret"):
        cfg.validate_production_settings()


def test_staging_validation_rejects_sqlite():
    """Staging configuration must reject SQLite database."""
    cfg = Settings(
        ENVIRONMENT="staging",
        DEBUG=False,
        SECRET_KEY="staging-secret-key-that-is-at-least-32-chars-long",
        DATABASE_URL="sqlite:///staging.db",
    )
    with pytest.raises(ValueError, match="DATABASE_URL must point to PostgreSQL, not SQLite in staging"):
        cfg.validate_production_settings()


def test_production_validation_rejects_default_secrets_and_localhost_db():
    """Production configuration must reject default secrets, localhost database, and debug mode."""
    # 1. DEBUG = True in production
    cfg_debug = Settings(
        ENVIRONMENT="production",
        DEBUG=True,
        SECRET_KEY="a" * 32,
        CI_WEBHOOK_SECRET="b" * 16,
        DATABASE_URL="postgresql+psycopg://prod:strongpass@remote-rds:5432/codesentinel",
    )
    with pytest.raises(ValueError, match="DEBUG mode must be False in production"):
        cfg_debug.validate_production_settings()

    # 2. Default SECRET_KEY
    cfg_secret = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="codesentinel-dev-secret-key-change-in-production-min32chars",
        CI_WEBHOOK_SECRET="b" * 16,
        DATABASE_URL="postgresql+psycopg://prod:strongpass@remote-rds:5432/codesentinel",
    )
    with pytest.raises(ValueError, match="SECRET_KEY must be a unique"):
        cfg_secret.validate_production_settings()

    # 3. Default CI_WEBHOOK_SECRET
    cfg_webhook = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="a" * 32,
        CI_WEBHOOK_SECRET="codesentinel-ci-default-secret",
        DATABASE_URL="postgresql+psycopg://prod:strongpass@remote-rds:5432/codesentinel",
    )
    with pytest.raises(ValueError, match="CI_WEBHOOK_SECRET must be configured with a dedicated random secret"):
        cfg_webhook.validate_production_settings()

    # 4. Localhost or postgres:postgres DATABASE_URL in production
    cfg_db = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="a" * 32,
        CI_WEBHOOK_SECRET="b" * 16,
        DATABASE_URL="postgresql+psycopg://postgres:postgres@remote-db:5432/codesentinel",
    )
    with pytest.raises(ValueError, match="DATABASE_URL must point to a hardened production database"):
        cfg_db.validate_production_settings()

    # 5. Wildcard CORS in production
    cfg_cors = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="a" * 32,
        CI_WEBHOOK_SECRET="b" * 16,
        DATABASE_URL="postgresql+psycopg://prod_user:hardened_pwd@prod-aurora.internal:5432/codesentinel",
        CORS_ORIGINS="*",
    )
    with pytest.raises(ValueError, match="CORS_ORIGINS cannot contain wildcard"):
        cfg_cors.validate_production_settings()


def test_production_validation_passes_with_hardened_settings():
    """Production configuration must pass validation when properly configured."""
    cfg = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="super-secure-production-random-key-32-chars-long",
        CI_WEBHOOK_SECRET="super-secure-ci-hmac-secret-min16",
        DATABASE_URL="postgresql+psycopg://cs_user:hardened_pwd_9876@prod-aurora.internal:5432/codesentinel_prod",
        CORS_ORIGINS=["https://app.codesentinel.ai", "https://admin.codesentinel.ai"],
    )
    cfg.validate_production_settings()  # Should not raise


def test_external_provider_url_validation():
    """Embedding and LLM providers must validate required API URLs."""
    cfg_no_url = Settings(
        EMBEDDING_PROVIDER="openai_compatible",
        EMBEDDING_API_URL=None,
    )
    with pytest.raises(ValueError, match="EMBEDDING_API_URL"):
        cfg_no_url.validate_production_settings()

    cfg_llm_no_url = Settings(
        LLM_PROVIDER="ollama",
        LLM_API_URL="",
    )
    with pytest.raises(ValueError, match="LLM_API_URL"):
        cfg_llm_no_url.validate_production_settings()

