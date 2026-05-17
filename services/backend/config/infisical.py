import logging
import os

from infisical_sdk import InfisicalSDKClient

logger = logging.getLogger(__name__)


def inject_infisical_secrets(env: str | None) -> None:
    """
    - Loads infisical secrets from environment
    - Logs into client
    - Injects all secrets for the specified env into the local environment
    """
    client_id = os.getenv("INFISICAL_CLIENT_ID", "")
    client_secret = os.getenv("INFISICAL_CLIENT_SECRET", "")
    project_id = os.getenv("INFISICAL_PROJECT_ID", "")
    infisical_host = os.getenv("INFISICAL_HOST", "")
    environment = os.getenv("INFISICAL_ENVIRONMENT", env or "dev")

    print(environment)

    if not (client_id and client_secret and project_id):
        logger.warning("Infisical credentials not set, skipping secret injection")
        return

    logger.info(
        "Loading secrets from Infisical (project=%s, env=%s)", project_id, environment
    )
    client = InfisicalSDKClient(host=infisical_host)
    _ = client.auth.universal_auth.login(
        client_id=client_id, client_secret=client_secret
    )
    result = client.secrets.list_secrets(
        project_id=project_id,
        environment_slug=environment,
        secret_path="/",
    )
    injected = 0
    for secret in result.secrets:
        if (
            os.environ.setdefault(secret.secretKey, secret.secretValue)
            == secret.secretValue
        ):
            injected += 1
    logger.info(
        "Injected %d secrets from Infisical (%d already set locally)",
        injected,
        len(result.secrets) - injected,
    )
