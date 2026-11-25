"""Offline browser checks for catalog recovery using the public app snapshot.

Run directly with Python. Only manifest HTTP responses are fault-injected;
the production DOM, loader, validation, caches and navigation execute unchanged.
No external website or physical iOS device is exercised by this test.
"""
from __future__ import annotations

import functools
import hashlib
import http.server
import json
import os
import re
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("SAPORE_BROWSER_ARTIFACTS", "/tmp/sapore-catalog-browser-qa"))
CHROMIUM = os.environ.get("SAPORE_CHROMIUM", "/usr/bin/chromium")
R41 = "/app/data/approved-r4-1.json"
R15 = "/app/data/published-r15.json"
HTML = (ROOT / "app/index.html").read_text(encoding="utf-8")
INLINE = json.loads(re.search(r"const RECIPES=(\[.*?\]);", HTML, re.S)[1])
EDITORIAL = json.loads((ROOT / "app/data/approved-r4-1.json").read_text(encoding="utf-8"))["recipes"]
PUBLISHED = json.loads((ROOT / "app/data/published-r15.json").read_text(encoding="utf-8"))["recipes"]
INLINE_BY_ID = {row["id"]: row for row in INLINE}
EDITORIAL_ID = EDITORIAL[0]["id"]
OVERLAY = next(row for row in PUBLISHED if row.get("publicationUpdate") and row["id"] in INLINE_BY_ID
               and not INLINE_BY_ID[row["id"]].get("aliasOf"))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def catalog(page):
    rows = page.evaluate("RECIPES")
    assert len(rows) == len({row["id"] for row in rows}), "duplicate catalog IDs"
    return {row["id"]: row for row in rows}


def fingerprint(rows):
    raw = json.dumps(rows, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()


def wait_catalog(page):
    page.wait_for_function("window.__saporeCatalogReady !== undefined")
    state = page.evaluate("window.__saporeCatalogReady")
    assert state["status"] in ("loaded", "partial"), state
    assert page.evaluate("document.documentElement.scrollWidth - innerWidth") <= 2
    return state


def fresh(browser, width, height, url, *, r41=False, r15=False, hash_id=None,
          held_r15=None, wait=True):
    context = browser.new_context(viewport={"width": width, "height": height})
    page = context.new_page()
    faults = {R41: r41, R15: r15}
    calls = {R41: 0, R15: 0}
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def route(request):
        path = request.request.url.split("?", 1)[0]
        for manifest in (R41, R15):
            if path.endswith(manifest):
                calls[manifest] += 1
                if faults[manifest]:
                    request.fulfill(status=503, content_type="application/json", body="{}")
                elif manifest == R15 and held_r15 is not None:
                    held_r15.append(request)
                else:
                    request.continue_()
                return
        # Photos are unrelated to this fault test; their bundles are not copied
        # into the test checkout. Empty bundles exercise the app's fallback.
        if "/data/drive-photos-" in path:
            request.fulfill(status=200, content_type="application/json", body="{}")
        elif request.request.url.startswith(url.split("/app/")[0]):
            request.continue_()
        else:
            request.abort()

    page.route("**/*", route)
    page.goto(url + ("#recipe=" + hash_id if hash_id else ""))
    if wait:
        wait_catalog(page)
    return context, page, faults, calls, errors


def retry(page):
    assert page.locator("#saporeCatalogRetry").is_visible()
    assert page.locator("#saporeCatalogRetry").is_enabled()
    page.locator("#saporeCatalogRetry").click()
    return wait_catalog(page)


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0),
        functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/app/"
    report = {"scope": "local Chromium public-snapshot recovery", "checks": [],
              "viewports": [[1440, 900], [390, 844]], "external_network": False,
              "photos": "empty bundle fallback; not a photo verification", "ok": False}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=CHROMIUM, headless=True,
                                                  args=["--no-sandbox"])
            report["browser"] = browser.version
            for width, height in report["viewports"]:
                # Healthy load establishes the exact current content authority.
                context, page, faults, calls, errors = fresh(browser, width, height, url)
                assert page.evaluate("window.__saporeCatalogLoad.status") == "loaded"
                assert not page.locator("#saporeCatalogStatus").is_visible()
                healthy = catalog(page)
                expected_ids = {r["id"] for r in INLINE + EDITORIAL + PUBLISHED}
                assert set(healthy) == expected_ids
                assert not errors, errors
                report["checks"].append({"viewport": width, "case": "healthy", "count": len(healthy),
                                         "catalog_sha256": fingerprint(healthy), "ok": True})
                context.close()

                # R41 fails, but independent R15 rows and inline overlays load.
                context, page, faults, calls, errors = fresh(browser, width, height, url, r41=True)
                partial = catalog(page)
                assert calls[R15] == 1
                assert len(partial) == len(healthy) - len(EDITORIAL)
                assert page.locator("#saporeCatalogStatus").is_visible()
                assert page.locator("#saporeCatalogStatus").evaluate("node => node.parentElement.id") == "app"
                page.screenshot(path=str(OUT / f"catalog-partial-{width}.png"))
                if width == 390:
                    page.emulate_media(color_scheme="dark")
                    page.screenshot(path=str(OUT / "catalog-partial-mobile-dark.png"))
                    page.emulate_media(color_scheme="light")
                page.locator("#pantryToggle").click()
                assert page.locator("#saporeCatalogStatus").is_visible()
                page.locator("#ingredientInput").fill("uova, latte")
                page.locator("#addIngredient").click()
                page.locator("#ingredientInput").fill("farina")
                stock_before = page.evaluate("JSON.stringify(stock)")
                faults[R41] = False
                assert retry(page)["status"] == "loaded"
                assert page.evaluate("pantry") is True
                assert page.evaluate("JSON.stringify(stock)") == stock_before
                assert page.locator("#ingredientInput").input_value() == "farina"
                assert not page.locator("#saporeCatalogStatus").is_visible()
                recovered = catalog(page)
                assert recovered == healthy
                assert calls[R41] == calls[R15] == 2
                assert not errors, errors
                report["checks"].append({"viewport": width, "case": "R41 failure and pantry-preserving recovery",
                                         "partial_count": len(partial), "recovered_count": len(recovered),
                                         "content_equal_to_healthy": True, "ok": True})
                context.close()

                # R15 fails; choose an existing inline recipe from a search.
                # Retry must update its object without discarding navigation.
                context, page, faults, calls, errors = fresh(browser, width, height, url, r15=True)
                assert len(catalog(page)) == len(INLINE) + len(EDITORIAL)
                baseline_title = INLINE_BY_ID[OVERLAY["id"]]["name"]
                page.locator("#search").fill(baseline_title)
                page.locator(f'[data-openid="{OVERLAY["id"]}"]').click()
                before = page.evaluate("({id:selected.id, filter, searchNavIds:[...(searchNavIds||[])]})")
                faults[R15] = False
                assert retry(page)["status"] == "loaded"
                after = page.evaluate("({id:selected.id, filter, searchNavIds:[...(searchNavIds||[])]})")
                assert before == after
                assert page.evaluate("selected === RECIPES.find(row => row.id === selected.id)")
                assert page.locator("#recipeTitle").inner_text() == OVERLAY["name"]
                assert catalog(page) == healthy
                assert calls[R41] == 1 and calls[R15] == 2
                assert not errors, errors
                report["checks"].append({"viewport": width, "case": "R15 recovery preserves selection and search navigation",
                                         "selected_id": OVERLAY["id"], "ok": True})
                context.close()

                # An unresolved initial deep link is resumed by the retry button.
                context, page, faults, calls, errors = fresh(browser, width, height, url, r41=True, hash_id=EDITORIAL_ID)
                assert page.evaluate("selected === null")
                faults[R41] = False
                assert retry(page)["status"] == "loaded"
                assert page.evaluate("selected.id") == EDITORIAL_ID
                assert not errors, errors
                report["checks"].append({"viewport": width, "case": "initial unresolved deep link resumes", "ok": True})
                context.close()

                # A user who changed views must not be sent back to the old hash.
                context, page, faults, calls, errors = fresh(browser, width, height, url, r41=True, hash_id=EDITORIAL_ID)
                page.locator("#pantryToggle").click()
                faults[R41] = False
                assert retry(page)["status"] == "loaded"
                assert page.evaluate("pantry && selected === null")
                assert not errors, errors
                report["checks"].append({"viewport": width, "case": "user navigation cancels pending deep link", "ok": True})
                context.close()

                # A new hash arriving while R15 is pending replaces the old
                # unresolved target. The late response must open the new ID.
                held = []
                context, page, faults, calls, errors = fresh(
                    browser, width, height, url, hash_id=EDITORIAL_ID,
                    held_r15=held, wait=False)
                page.wait_for_function("window.__saporeEditorialImport?.status === 'loaded' && window.__saporeCatalogLoad?.status === 'loading'")
                inline_editorial_ids = {row["id"] for row in INLINE + EDITORIAL}
                target = next(row["id"] for row in PUBLISHED if row["id"] not in inline_editorial_ids)
                assert held, "the R15 HTTP response is held by the test"
                page.evaluate("""id => new Promise(resolve => {
                    window.addEventListener('hashchange', () => resolve(), {once:true});
                    window.location.hash = '#recipe=' + id;
                })""", target)
                held[0].fulfill(status=200, content_type="application/json",
                                body=(ROOT / "app/data/published-r15.json").read_text(encoding="utf-8"))
                assert wait_catalog(page)["status"] == "loaded"
                assert page.evaluate("selected.id") == target
                assert not errors, errors
                report["checks"].append({"viewport": width, "case": "hashchange while loading resolves the new target", "ok": True})
                context.close()

            # A visible manual control stops after the documented total budget.
            context, page, faults, calls, errors = fresh(browser, 390, 844, url, r41=True)
            assert retry(page)["attempts"] == 2
            final_state = retry(page)
            assert final_state["attempts"] == 3 and final_state["canRetry"] is False
            assert page.locator("#saporeCatalogStatus").is_visible()
            assert not page.locator("#saporeCatalogRetry").is_visible()
            assert "Ricarica la pagina" in page.locator("#saporeCatalogMessage").inner_text()
            assert calls[R41] == calls[R15] == 3
            assert not errors, errors
            report["checks"].append({"viewport": 390, "case": "manual retry budget visible and bounded", "ok": True})
            context.close()
            browser.close()
        report["ok"] = True
    except Exception as error:
        report["error"] = f"{type(error).__name__}: {error}"[:1500]
        raise
    finally:
        server.shutdown()
        (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": report["ok"], "checks": len(report["checks"]), "report": str(OUT / "report.json")}))


if __name__ == "__main__":
    run()
