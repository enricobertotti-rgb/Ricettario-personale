"""Country index navigation, identity, search and responsive regression."""
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
   assert page.locator('#indexCategories [data-macro]').count() == 10
   assert page.locator('#indexCategories [data-country-index="open"]').count() == 1
   snapshot = page.evaluate('JSON.stringify(RECIPES)')
   page.locator('[data-country-index="open"]').click()
   assert page.locator('.indexTop h2').inner_text() == 'Per paese'
   countries = page.locator('[data-country]').evaluate_all('(ns)=>ns.map(n=>({country:n.dataset.country,count:parseInt(n.querySelector("small").textContent)}))')
   assert countries
   assert sum(row['count'] for row in countries) == page.evaluate('saporeVisibleRecipes().length')
   page.screenshot(path=str(out / f'countries-{width}.png'), full_page=True)
   # Every country must expose its exact existing IDs, once each.
   for row in countries:
    page.locator('[data-country]').evaluate_all("(ns,c)=>ns.find(n=>n.dataset.country===c).click()",row['country'])
    ids = page.locator('#searchResults [data-openid]').evaluate_all('(ns)=>ns.map(n=>n.dataset.openid)')
    expected = page.evaluate('saporeVisibleRecipes().filter(saporeCountryMatches).map(r=>r.id)')
    assert len(ids) == len(set(ids)) == row['count']
    assert set(ids) == set(expected)
    page.locator('[data-country-index="open"]').click()
   country = next(row['country'] for row in countries if row['country']!='__unknown' and row['count']>1)
   page.locator('[data-country]').evaluate_all("(ns,c)=>ns.find(n=>n.dataset.country===c).click()",country)
   ids = page.locator('#searchResults [data-openid]').evaluate_all('(ns)=>ns.map(n=>n.dataset.openid)')
   page.screenshot(path=str(out / f'country-recipes-{width}.png'), full_page=True)
   page.locator('#searchResults [data-openid]').first.click()
   assert page.locator('#printRecipe').is_visible()
   assert page.locator('.recipePosition').inner_text().endswith('/ '+str(len(ids)))
   assert page.evaluate('selected.id') == ids[0]
   page.locator('#nextRecipe').click()
   assert page.evaluate('selected.id') == ids[1]
   page.locator('#previousRecipe').click()
   assert page.evaluate('selected.id') == ids[0]
   page.locator('#categoryToggle').click()
   assert page.locator('.indexTop h2').inner_text() == country
   title = page.locator('#searchResults strong').first.inner_text()
   page.locator('#search').fill(title)
   assert page.locator('#searchResults [data-openid]').count() > 0
   assert page.evaluate("[...document.querySelectorAll('#searchResults [data-openid]')].every(n=>saporeCountryMatches(RECIPES.find(r=>r.id===n.dataset.openid)))")
   page.locator('#clearSearch').click()
   group = page.evaluate('saporeGroup(saporeVisibleRecipes().find(saporeCountryMatches))[0]')
   page.locator('#countryCategoryFilter').select_option(group)
   assert page.evaluate("[...document.querySelectorAll('#searchResults [data-openid]')].every(n=>saporeScope(RECIPES.find(r=>r.id===n.dataset.openid)))")
   assert page.locator('#searchResults [data-openid]').count() > 0
   assert page.evaluate('document.documentElement.scrollWidth-innerWidth') <= 2
   page.locator('#indexToggle').click()
   assert page.locator('#indexCategories [data-macro]').count() == 10
   assert page.evaluate("!saporeCountry&&!saporeMacro&&!saporeCountryIndex")
   page.locator('[data-macro="primi"]').click()
   assert page.locator('.saporeChips button').count() == 4
   page.locator('[data-sub="Riso e cereali"]').click()
   assert page.locator('#searchResults [data-openid]').count() > 1
   page.locator('#countryFilter').select_option('__unknown')
   assert page.evaluate("[...document.querySelectorAll('#searchResults [data-openid]')].every(n=>!saporeRecipeCountry(RECIPES.find(r=>r.id===n.dataset.openid)))")
   page.locator('#indexToggle').click()
   page.locator('#search').fill('curry')
   assert page.locator('#searchResults [data-openid]').count() > 0
   assert page.evaluate('JSON.stringify(RECIPES)') == snapshot
   assert not errors, errors
   report.append({'viewport':[width,height], 'ok':True, 'macro_count':10, 'countries':countries, 'recipes_unchanged':True,'country_identity_navigation_search':True})
   page.close()
  browser.close()
finally:
 server.shutdown()
 (out/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(json.dumps(report,indent=2,ensure_ascii=False))
