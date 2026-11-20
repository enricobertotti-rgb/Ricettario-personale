"""Focused UI regression for the macrocategory and country index."""
import functools
import http.server
import json
import os
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / 'layout-qa-artifacts'
out.mkdir(exist_ok=True)
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/app/'
report = []
try:
 with sync_playwright() as p:
  browser = p.chromium.launch(channel='chrome', headless=True, args=['--no-sandbox'])
  for width, height in [(1440, 900), (390, 844), (768, 1024)]:
   page = browser.new_page(viewport={'width': width, 'height': height})
   errors = []
   page.on('pageerror', lambda e: errors.append(str(e)))
   page.goto(url)
   page.wait_for_function("window.__saporePublicationImport?.status === 'loaded'")
   assert page.locator('#indexCategories .categoryCard').count() == 10
   snapshot = page.evaluate('JSON.stringify(RECIPES)')
   assert page.evaluate("SAPORE_GROUPS.reduce((n,g)=>n+RECIPES.filter(r=>!r.aliasOf&&saporeGroup(r)[0]===g[0]).length,0)===visibleRecipeCount()")
   page.screenshot(path=str(out / f'index-{width}.png'), full_page=True)
   page.locator('[data-macro="primi"]').click()
   assert page.locator('.saporeChips button').count() == 4
   page.locator('[data-sub="Riso e cereali"]').click()
   ids = page.locator('#searchResults button').evaluate_all('(ns)=>ns.map(n=>n.dataset.openid)')
   assert len(ids) > 1
   page.locator('#searchResults button').first.click()
   assert page.locator('#printRecipe').is_visible()
   assert page.locator('.recipePosition').inner_text().endswith('/ ' + str(len(ids)))
   page.locator('#nextRecipe').click()
   assert page.evaluate('selected.id') == ids[1]
   page.locator('#previousRecipe').click()
   assert page.evaluate('selected.id') == ids[0]
   page.locator('#categoryToggle').click()
   assert page.locator('[data-sub="Riso e cereali"]').get_attribute('aria-pressed') == 'true'
   page.locator('#indexToggle').click()
   page.locator('#search').fill('curry')
   assert page.locator('#searchResults button').count() > 0
   page.locator('#clearSearch').click()
   page.locator('#countryFilter').select_option('__unknown')
   assert page.locator('.categoryCard').count() == 10
   page.locator('[data-macro="primi"]').click()
   page.locator('#search').fill('riso')
   assert page.locator('#searchResults button').count() > 0
   assert page.evaluate("[...document.querySelectorAll('#searchResults [data-openid]')].every(n=>!saporeRecipeCountry(RECIPES.find(r=>r.id===n.dataset.openid)))")
   assert page.evaluate('document.documentElement.scrollWidth-innerWidth') <= 2
   page.locator('#indexToggle').click()
   page.locator('#countryFilter').select_option('')
   countries = page.locator('#countryFilter option').evaluate_all('(ns)=>ns.map(n=>n.value).filter(v=>v&&v!=="__unknown")')
   if countries:
    page.locator('#countryFilter').select_option(countries[0])
    assert page.evaluate("[...document.querySelectorAll('#indexCategories button')].reduce((n,b)=>n+parseInt(b.querySelector('small').textContent),0)===RECIPES.filter(r=>!r.aliasOf&&saporeRecipeCountry(r)===saporeCountry).length")
   assert page.evaluate('JSON.stringify(RECIPES)') == snapshot
   assert not errors, errors
   report.append({'viewport': [width, height], 'ok': True, 'macro_count': 10, 'countries': countries, 'recipes_unchanged': True})
   page.close()
  browser.close()
finally:
 server.shutdown()
 (out / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
print(json.dumps(report, indent=2, ensure_ascii=False))
