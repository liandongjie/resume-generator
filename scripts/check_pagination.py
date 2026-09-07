from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image
from playwright.sync_api import Page, sync_playwright

from playwright_runtime import chromium_launch_options


ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "styles" / "resume.css"
FIXTURES = sorted((ROOT / "tests" / "fixtures").glob("pagination-*.html"))
COLORS = [
    (255, 0, 0),
    (0, 160, 0),
    (0, 64, 255),
    (255, 0, 255),
    (255, 128, 0),
    (0, 180, 180),
]


def fixture_html(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("{{RESUME_CSS}}", CSS.read_text(encoding="utf-8"))


def targets(page: Page) -> list[dict[str, object]]:
    return page.eval_on_selector_all(
        "[data-page-token]",
        """elements => elements.map(element => ({
          token: element.dataset.pageToken,
          expectedPage: Number(element.dataset.expectedPage)
        }))""",
    )


def render(page: Page, html: str, output: Path, marker_colors: dict[str, tuple[int, int, int]] | None) -> list[dict[str, object]]:
    page.set_content(html, wait_until="load", timeout=60_000)
    page.emulate_media(media="print")
    page.wait_for_timeout(100)
    expected = targets(page)
    if marker_colors:
        page.eval_on_selector_all(
            "[data-page-token]",
            """(elements, colors) => elements.forEach(element => {
              element.style.backgroundColor = colors[element.dataset.pageToken];
            })""",
            {token: f"rgb({red}, {green}, {blue})" for token, (red, green, blue) in marker_colors.items()},
        )
    page.pdf(path=str(output), format="A4", print_background=True, prefer_css_page_size=True)
    return expected


def text_assignments(pdf: Path, expected: list[dict[str, object]], pdftotext: str) -> dict[str, list[int]]:
    pages = []
    for page_number in (1, 2):
        raw = subprocess.run(
            [pdftotext, "-f", str(page_number), "-l", str(page_number), str(pdf), "-"],
            check=True,
            capture_output=True,
        ).stdout
        pages.append(raw.decode("utf-8", errors="replace"))
    return {
        str(item["token"]): [index for index, text in enumerate(pages, 1) if str(item["token"]) in text]
        for item in expected
    }


def marker_assignments(pdf: Path, colors: dict[str, tuple[int, int, int]], work: Path, pdftoppm: str) -> dict[str, list[int]]:
    prefix = work / "page"
    subprocess.run([pdftoppm, "-png", "-r", "144", str(pdf), str(prefix)], check=True, stdout=subprocess.DEVNULL)
    pages = sorted(work.glob("page-*.png"))
    if len(pages) != 2:
        raise RuntimeError(f"Expected 2 fixture pages, got {len(pages)} for {pdf.name}")

    assignments: dict[str, list[int]] = {}
    for token, color in colors.items():
        found = []
        for page_number, image_path in enumerate(pages, 1):
            image = Image.open(image_path).convert("RGB")
            matching = sum(
                1
                for pixel in image.get_flattened_data()
                if all(abs(pixel[channel] - color[channel]) <= 12 for channel in range(3))
            )
            if matching >= 20:
                found.append(page_number)
        assignments[token] = found
    return assignments


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path)
    args = parser.parse_args()
    if len(FIXTURES) < 2:
        raise SystemExit("Expected at least two pagination behavior fixtures")
    pdftotext = shutil.which("pdftotext")
    pdftoppm = shutil.which("pdftoppm")
    if not pdftotext and not pdftoppm:
        raise SystemExit("Pagination behavior check requires pdftotext or pdftoppm")

    artifact_pages = None
    if args.pdf:
        pdf = args.pdf.resolve()
        if not pdf.is_file():
            raise SystemExit(f"Missing generated PDF: {pdf}")
        pdfinfo = shutil.which("pdfinfo")
        if not pdfinfo:
            raise SystemExit("Pagination artifact check requires pdfinfo")
        info = subprocess.run([pdfinfo, str(pdf)], check=True, capture_output=True).stdout
        match = re.search(rb"^Pages:\s+(\d+)", info, re.MULTILINE)
        artifact_pages = int(match.group(1)) if match else None
        if artifact_pages != 2:
            raise SystemExit(f"Expected 2 artifact pages, got {artifact_pages}")

    reports = []
    with tempfile.TemporaryDirectory(prefix="resume-pagination-") as directory, sync_playwright() as pw:
        browser = pw.chromium.launch(**chromium_launch_options())
        try:
            for fixture in FIXTURES:
                work = Path(directory) / fixture.stem
                work.mkdir()
                pdf = work / "fixture.pdf"
                page = browser.new_page(viewport={"width": 794, "height": 1123})
                try:
                    html = fixture_html(fixture)
                    initial = render(page, html, pdf, None)
                    colors = {str(item["token"]): COLORS[index] for index, item in enumerate(initial)}
                    expected = initial
                    method = "pdftotext"
                    if pdftotext:
                        try:
                            assignments = text_assignments(pdf, expected, pdftotext)
                            text_is_reliable = all(
                                assignments[str(item["token"])] == [int(item["expectedPage"])] for item in expected
                            )
                            if not text_is_reliable and pdftoppm:
                                method = "pdftoppm-markers"
                                expected = render(page, html, pdf, colors)
                                assignments = marker_assignments(pdf, colors, work, pdftoppm)
                        except (OSError, subprocess.CalledProcessError):
                            if not pdftoppm:
                                raise
                            method = "pdftoppm-markers"
                            expected = render(page, html, pdf, colors)
                            assignments = marker_assignments(pdf, colors, work, pdftoppm)
                    else:
                        method = "pdftoppm-markers"
                        expected = render(page, html, pdf, colors)
                        assignments = marker_assignments(pdf, colors, work, pdftoppm)
                finally:
                    page.close()

                failures = []
                for item in expected:
                    token = str(item["token"])
                    wanted = [int(item["expectedPage"])]
                    if assignments[token] != wanted:
                        failures.append(f"{token}: expected page {wanted}, got {assignments[token]}")
                reports.append({"fixture": fixture.name, "method": method, "assignments": assignments})
                if failures:
                    raise SystemExit("Pagination behavior failed: " + "; ".join(failures))
        finally:
            browser.close()

    print(json.dumps({"ok": True, "artifactPages": artifact_pages, "fixtures": reports}, ensure_ascii=False))


if __name__ == "__main__":
    main()
