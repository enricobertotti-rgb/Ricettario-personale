"""Read-only browser QA for the public Sapore GitHub Pages site.

No GitHub writes, private recipe reads, release approvals, or synthetic
publication. Any unavailable check fails closed.
"""
import json
import hashlib
import pathlib
import sys
import traceback
from playwright.sync_api import sync_playwright

URL = "https://enricobertotti-rgb.github.io/Ricettario-personale/app/"
OUT = pathlib.Path("qa-artifacts")
OUT.mkdir(exist_ok=True)
report = {"url": URL, "modes": {}, "ok": False}
target_path = pathlib.Path("config/publication-qa-target.json")
TARGET = json.loads(target_path.read_text()) if target_path.exists() else None
if not TARGET or not TARGET.get('public_commit'):
    raise RuntimeError('Missing public deployment target')
report['provenance'] = {key: TARGET.get(key) for key in (
    'public_commit', 'pages_run_id', 'qa_repository', 'qa_run_id', 'scope', 'asset_sha256')}
report['target_ids'] = [row['source_id'] for row in TARGET['recipes']]
report['absent_ids'] = TARGET['absent_ids']


def check(value, name):
    if not value:
        raise AssertionError(name)


def run_mode(browser, label, width, height, mobile=False):
    context = browser.new_context(
        viewport={"width": width, "height": height},
        is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1,
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    record = {"http": None, "categories": None, "curry_results": None,
              "steps": None, "print_handler": False, "pantry": False,
              "deep_link": False, "search_navigation": False}
    report["modes"][label] = record
    try:
        for path, expected in TARGET['asset_sha256'].items():
            asset_url = URL + path.removeprefix('app/')
            asset = context.request.get(asset_url, timeout=60000)
            check(asset.status == 200, 'public asset unavailable: ' + path)
            check(hashlib.sha256(asset.body()).hexdigest() == expected,
                  'live deployment differs from target: ' + path)
        record['deployment_assets_match'] = True
        response = page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        check(response is not None, "missing HTTP response")
        record["http"] = response.status
        check(response.status == 200, "HTTP status not 200")
        page.wait_for_selector("#indexToggle", timeout=20000)
        check("Sapore" in page.title(), "wrong document title")

        page.locator("#indexToggle").click()
        page.wait_for_selector("#indexCategories .categoryCard", timeout=20000)
        record["categories"] = page.locator("#indexCategories .categoryCard").count()
        check(record["categories"] >= 15, "missing category cards")

        page.locator("#search").fill("curry")
        page.wait_for_timeout(350)
        results = page.locator("#searchResults button[data-openid]")
        record["curry_results"] = results.count()
        check(record["curry_results"] > 0, "curry search has zero results")
        result_ids = results.evaluate_all("(nodes)=>nodes.map(n=>n.dataset.openid)")
        chosen_id = result_ids[0]
        results.first.click()
        page.wait_for_selector("#printRecipe", timeout=20000)
        record["steps"] = page.locator(".step").count()
        check(record["steps"] > 0, "recipe steps not rendered")

        # Navigation from search must remain inside the search result set.
        # Known historical bug: it navigates full category instead.
        next_button = page.locator("#nextRecipe")
        previous_button = page.locator("#previousRecipe")
        next_label = next_button.get_attribute("aria-label") or ""
        prev_label = previous_button.get_attribute("aria-label") or ""
        if record["curry_results"] == 1:
            record["search_navigation"] = next_button.is_disabled() and previous_button.is_disabled()
        else:
            # A source search must not expose a category-sized counter.
            position = page.locator(".recipePosition").inner_text()
            record["search_navigation"] = position.endswith("/ " + str(record["curry_results"]))
        if not record["search_navigation"]:
            record["navigation_issue"] = "SEARCH_NAVIGATION_OUTSIDE_RESULT_SET"

        if record["curry_results"] > 1:
            page.locator("#nextRecipe").click()
            record["search_next_ok"] = (
                page.locator(".recipePosition").inner_text()
                == "2 / " + str(record["curry_results"])
            )
            check(record["search_next_ok"], "NEXT_RECIPE_OUTSIDE_SEARCH_RESULTS")
            check(page.evaluate("selected && selected.id") in result_ids, "next recipe escaped search results")
            page.locator("#previousRecipe").click()
            check(page.evaluate("selected && selected.id") == chosen_id, "previous recipe did not restore search result")

        page.evaluate("window.__saporePrintCalled=false;window.print=()=>{window.__saporePrintCalled=true}")
        page.locator("#printRecipe").click()
        record["print_handler"] = page.evaluate("window.__saporePrintCalled === true")
        check(record["print_handler"], "print handler not called")
        if label == "desktop":
            pdf = page.pdf(format="A4", print_background=True)
            check(len(pdf) > 3000, "print PDF empty")
            (OUT / "desktop-print.pdf").write_bytes(pdf)

        page.goto(URL + "#recipe=" + chosen_id, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector("#printRecipe", timeout=20000)
        record["deep_link"] = page.locator(".step").count() > 0
        check(record["deep_link"], "direct recipe deep link missing")

        page.locator("#pantryToggle").click()
        page.wait_for_selector("#ingredientInput", timeout=10000)
        page.locator("#ingredientInput").fill("farina")
        page.wait_for_timeout(350)
        record["pantry"] = page.locator("#pantryResults").count() == 1
        check(record["pantry"], "pantry results panel absent")
        for target in (TARGET.get("recipes", [TARGET]) if TARGET else []):
            page.goto(URL + "#recipe=" + target["source_id"], wait_until="domcontentloaded", timeout=60000)
            page.wait_for_function("window.__saporePublicationImport?.status === 'loaded'", timeout=20000)
            check(page.locator("#recipeTitle").inner_text() == target["title"], "published recipe title missing")
            actual = page.evaluate("id=>RECIPES.filter(r=>r.id===id)", target["source_id"])
            check(len(actual) == 1, "published recipe missing or duplicated")
            recipe = actual[0]
            check(recipe["reviewedRecordSha256"] == target["reviewed_digest"], "published digest mismatch")
            check(recipe["ingredients"] == target["ingredients"] and recipe["steps"] == target["steps"], "published culinary content differs")
            check(page.locator(".step").count() == len(target["steps"]), "published steps not rendered")
            check(page.locator("#ingredientTitle").is_visible(), "published ingredients not visible")
            check(recipe.get("photo") is None, "unexpected published image")
            result = {"id":target["source_id"], "digest":target["reviewed_digest"], "ok":True}
            record.setdefault("published_recipes", []).append(result)
            record["published_recipe"] = result
        if TARGET and TARGET.get("absent_ids"):
            check(page.evaluate("ids=>ids.every(id=>!RECIPES.some(r=>r.id===id))", TARGET["absent_ids"]), "quarantined recipe remains in live catalog")
        if mobile:
            overflow = page.evaluate("document.documentElement.scrollWidth - innerWidth")
            record["overflow_px"] = overflow
            check(overflow <= 2, "mobile horizontal overflow")
        check(not errors, "uncaught JS exceptions: " + repr(errors[:3]))
        check(record["search_navigation"], "SEARCH_NAVIGATION_OUTSIDE_RESULT_SET")
        record["ok"] = True
    except Exception as exc:
        record["ok"] = False
        record["error"] = str(exc)
        record["trace"] = traceback.format_exc()[-2000:]
        raise
    finally:
        try:
            page.screenshot(path=str(OUT / (label + ".png")), full_page=True, timeout=10000)
        except Exception as exc:
            record["screenshot_error"] = str(exc)
        context.close()


def main():
    failures = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox"])
        for label, width, height, mobile in [
            ("desktop", 1440, 900, False),
            ("mobile", 390, 844, True),
        ]:
            try:
                run_mode(browser, label, width, height, mobile)
            except Exception as exc:
                failures.append(label + ": " + str(exc))
        browser.close()
    report["ok"] = not failures
    report["failures"] = failures
    (OUT / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

