from pathlib import Path
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict



class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Core Application
    PROJECT_NAME: str = "CodeSentinel AI"
    SERVICE_NAME: str = "codesentinel-api"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = Field(default="development", description="Environment: development, test, staging, production")
    DEBUG: bool = Field(default=False, description="Enable debug mode")

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/codesentinel",
        description="SQLAlchemy database connection URL",
    )
    DB_POOL_SIZE: int = Field(default=5, ge=1, le=50)
    DB_MAX_OVERFLOW: int = Field(default=10, ge=0, le=50)
    DB_POOL_TIMEOUT: int = Field(default=30, ge=1, le=120)

    # Security, Keys & Secrets
    SECRET_KEY: str = Field(
        default="codesentinel-dev-secret-key-change-in-production-min32chars",
        description="Secret key for cryptographically signing sessions and tokens",
    )
    CI_WEBHOOK_SECRET: str = Field(
        default="codesentinel-ci-default-secret",
        description="HMAC secret for verifying external CI/CD audit webhooks",
    )
    CORS_ORIGINS: Union[List[str], str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
        description="Allowed CORS origin domains",
    )

    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL")
    LOG_FORMAT: str = Field(default="json", description="Log format: json or text")

    # Phase 1: Repository Ingestion & Limits
    LOCAL_REPOSITORY_ROOTS: Union[List[str], str] = Field(
        default_factory=list,
        description="Allowed root paths for local repository ingestion. Comma-separated or JSON list.",
    )
    MAX_REPOSITORY_DOWNLOAD_BYTES: int = Field(
        default=52428800,  # 50 MB
        description="Maximum allowed compressed archive download size in bytes",
    )
    MAX_REPOSITORY_EXTRACTED_BYTES: int = Field(
        default=157286400,  # 150 MB
        description="Maximum allowed extracted repository size in bytes",
    )
    MAX_REPOSITORY_FILES: int = Field(
        default=10000,
        description="Maximum number of discovered files per repository",
    )
    MAX_REPOSITORY_FILE_BYTES: int = Field(
        default=2097152,  # 2 MB
        description="Maximum individual file size in bytes for line counting and hashing",
    )
    REPOSITORY_INGESTION_TIMEOUT_SECONDS: int = Field(
        default=60,
        description="Maximum duration allowed for an ingestion operation in seconds",
    )
    REPOSITORY_HTTP_TIMEOUT_SECONDS: int = Field(
        default=20,
        description="HTTP request timeout for GitHub downloads in seconds",
    )
    MAX_ARCHIVE_EXPANSION_RATIO: float = Field(
        default=10.0,
        description="Maximum allowed ratio between extracted size and archive size",
    )

    # Phase 2: Static Analysis Limits & Thresholds
    MAX_ANALYSIS_FILES: int = Field(
        default=1000,
        description="Maximum number of source files analyzed in a single analysis run",
    )
    MAX_ANALYSIS_FILE_BYTES: int = Field(
        default=1048576,  # 1 MB
        description="Maximum individual file size in bytes for AST parsing",
    )
    MAX_ANALYSIS_TOTAL_BYTES: int = Field(
        default=52428800,  # 50 MB
        description="Maximum cumulative file bytes read during an analysis run",
    )
    ANALYSIS_TIMEOUT_SECONDS: int = Field(
        default=60,
        description="Maximum duration allowed for an analysis operation in seconds",
    )
    RULE_COMPLEXITY_DEFAULT_THRESHOLD: int = Field(
        default=10,
        description="Default cyclomatic complexity threshold (triggers when complexity > threshold)",
    )
    RULE_FUNCTION_LENGTH_DEFAULT_THRESHOLD: int = Field(
        default=50,
        description="Default function length threshold in lines (triggers when lines > threshold)",
    )
    RULE_SET_VERSION: str = Field(
        default="1.0.0",
        description="Current static analysis rule set version",
    )

    # Phase 6: Code Indexing, Search & Evidence-Backed Q&A
    INDEX_VERSION: str = Field(
        default="1.0.0",
        description="Current code index schema and chunking version",
    )
    MAX_INDEX_FILES: int = Field(
        default=1000,
        description="Maximum number of files indexed per repository snapshot",
    )
    MAX_CHUNKS_PER_FILE: int = Field(
        default=500,
        description="Maximum number of syntax/text chunks per file",
    )
    MAX_CHUNK_BYTES: int = Field(
        default=8192,
        description="Maximum byte size for a single code chunk",
    )
    MAX_TOTAL_INDEX_BYTES: int = Field(
        default=52428800,  # 50 MB
        description="Maximum cumulative file bytes indexed during an indexing run",
    )
    INDEXING_OVERLAP_LINES: int = Field(
        default=5,
        description="Overlap lines for fallback window chunking",
    )
    EMBEDDING_PROVIDER: str = Field(
        default="none",
        description="Semantic embedding provider: none, local, test, openai_compatible, ollama",
    )
    EMBEDDING_API_URL: Optional[str] = Field(
        default=None,
        description="Base URL for external or local embedding API",
    )
    EMBEDDING_API_KEY: Optional[str] = Field(
        default=None,
        description="API key for optional embedding provider (never exposed to frontend)",
    )
    EMBEDDING_MODEL: str = Field(
        default="text-embedding-3-small",
        description="Embedding model identifier",
    )
    EMBEDDING_DIMENSION: int = Field(
        default=384,
        description="Expected vector dimension for embeddings",
    )
    LLM_PROVIDER: str = Field(
        default="none",
        description="LLM provider for Q&A answer generation: none, test, openai_compatible, ollama",
    )
    LLM_API_URL: Optional[str] = Field(
        default=None,
        description="Base URL for external or local LLM API",
    )
    LLM_API_KEY: Optional[str] = Field(
        default=None,
        description="API key for optional LLM provider (never exposed to frontend)",
    )
    LLM_MODEL: str = Field(
        default="gpt-4o-mini",
        description="LLM model identifier",
    )
    LLM_TIMEOUT_SECONDS: int = Field(
        default=30,
        description="Timeout for LLM question-answering requests in seconds",
    )
    QA_MAX_EVIDENCE_CHUNKS: int = Field(
        default=8,
        description="Maximum number of retrieved evidence chunks passed to Q&A synthesis",
    )
    QA_RELEVANCE_THRESHOLD: float = Field(
        default=0.05,
        description="Minimum score threshold for evidence to be considered sufficient",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [str(v)]

    @field_validator("LOCAL_REPOSITORY_ROOTS", mode="before")
    @classmethod
    def assemble_local_roots(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [str(v)]

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        valid_envs = {"development", "test", "staging", "production"}
        lower_v = v.strip().lower()
        if lower_v not in valid_envs:
            raise ValueError(f"Invalid ENVIRONMENT '{v}'. Must be one of {sorted(valid_envs)}")
        return lower_v

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper_v = v.upper()
        if upper_v not in valid_levels:
            raise ValueError(f"Invalid LOG_LEVEL '{v}'. Must be one of {valid_levels}")
        return upper_v

    def get_allowed_local_roots(self) -> List[Path]:
        """Return resolved Path objects for configured LOCAL_REPOSITORY_ROOTS."""
        roots: List[Path] = []
        raw_roots = self.LOCAL_REPOSITORY_ROOTS
        if isinstance(raw_roots, str):
            raw_roots = [r.strip() for r in raw_roots.split(",") if r.strip()]
        for r in raw_roots:
            try:
                p = Path(r).resolve()
                if p.exists():
                    roots.append(p)
            except Exception:
                continue
        return roots

    def validate_production_settings(self) -> None:
        """Enforces strict security validation when running in production or staging."""
        env = self.ENVIRONMENT.lower()

        # External provider URL requirements
        if self.EMBEDDING_PROVIDER in ("openai_compatible", "ollama"):
            if not self.EMBEDDING_API_URL or not self.EMBEDDING_API_URL.startswith(("http://", "https://")):
                raise ValueError(
                    f"Configuration error: EMBEDDING_API_URL (http/https) is required when EMBEDDING_PROVIDER is '{self.EMBEDDING_PROVIDER}'."
                )

        if self.LLM_PROVIDER in ("openai_compatible", "ollama"):
            if not self.LLM_API_URL or not self.LLM_API_URL.startswith(("http://", "https://")):
                raise ValueError(
                    f"Configuration error: LLM_API_URL (http/https) is required when LLM_PROVIDER is '{self.LLM_PROVIDER}'."
                )

        if env == "staging":
            if self.DEBUG:
                raise ValueError("Staging configuration error: DEBUG mode must be False in staging.")
            if "change-in-production" in self.SECRET_KEY or "codesentinel-dev-secret" in self.SECRET_KEY or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "Staging configuration error: SECRET_KEY must be a dedicated random secret of at least 32 characters in staging."
                )
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError("Staging configuration error: DATABASE_URL must point to PostgreSQL, not SQLite in staging.")

        elif env == "production":
            if self.DEBUG:
                raise ValueError("Production configuration error: DEBUG mode must be False in production.")
            if "change-in-production" in self.SECRET_KEY or "codesentinel-dev-secret" in self.SECRET_KEY or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "Production configuration error: SECRET_KEY must be a unique, cryptographically random secret of at least 32 characters in production."
                )
            if self.CI_WEBHOOK_SECRET == "codesentinel-ci-default-secret" or len(self.CI_WEBHOOK_SECRET) < 16:
                raise ValueError(
                    "Production configuration error: CI_WEBHOOK_SECRET must be configured with a dedicated random secret of at least 16 characters in production."
                )
            if "localhost" in self.DATABASE_URL or "127.0.0.1" in self.DATABASE_URL or "postgres:postgres" in self.DATABASE_URL or self.DATABASE_URL.startswith("sqlite"):
                raise ValueError(
                    "Production configuration error: DATABASE_URL must point to a hardened production database, not localhost, default credentials, or sqlite."
                )
            # Ensure CORS does not allow wildcard in production
            cors = self.CORS_ORIGINS if isinstance(self.CORS_ORIGINS, list) else [self.CORS_ORIGINS]
            if "*" in cors:
                raise ValueError("Production configuration error: CORS_ORIGINS cannot contain wildcard '*' in production.")


settings = Settings()


