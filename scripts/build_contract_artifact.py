from pathlib import Path

import python_minifier


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = PROJECT_ROOT / "contracts" / "credence_claims.py"
ARTIFACT_PATH = PROJECT_ROOT / "contracts" / "credence_claims.deploy.py"


def main() -> None:
    source = SOURCE_PATH.read_text(encoding="utf-8")
    header, body = source.split("\n", 1)
    if not header.startswith('# { "Depends": "py-genlayer:'):
        raise RuntimeError("The contract must pin its GenVM runner on line one")

    compact = python_minifier.minify(
        body,
        filename=str(SOURCE_PATH),
        remove_annotations=False,
        hoist_literals=False,
        rename_locals=False,
        rename_globals=True,
        preserve_globals=["CredrepForecasts", "gl"],
    )
    ARTIFACT_PATH.write_text(f"{header}\n{compact}\n", encoding="utf-8")
    print(
        f"Built {ARTIFACT_PATH.relative_to(PROJECT_ROOT)} "
        f"({ARTIFACT_PATH.stat().st_size} bytes)"
    )


if __name__ == "__main__":
    main()
