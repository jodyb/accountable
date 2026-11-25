"""Write the OpenAPI schema that the frontend's types are generated from.

Usage: uv run python -m accountable.openapi <output.json>
"""

import json
import sys
from pathlib import Path

from accountable.main import create_app


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "openapi.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    schema = create_app().openapi()
    out.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
