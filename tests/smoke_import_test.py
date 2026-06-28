"""
Playwright import and render test for ontomanager shadcn.
Tests importing .ttl files, class tree rendering, property rendering.
"""
import sys
import json
import os

sys.path.insert(0, "/opt/data/home/.local/lib/python3.13/site-packages")

from playwright_bootstrap import sync_playwright

BASE_URL = "https://ontomanager.local.raes.konnektr.io"
RESULTS = {"passed": 0, "failed": 0, "tests": []}

def test(name, passed, detail=""):
    RESULTS["tests"].append({"name": name, "passed": passed, "detail": detail})
    if passed:
        RESULTS["passed"] += 1
        print(f"  ✅ {name}")
    else:
        RESULTS["failed"] += 1
        print(f"  ❌ {name} — {detail}")

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            ignore_https_errors=True,
        )

        # Clear local storage to start fresh
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append({"type": msg.type, "text": msg.text}) if msg.type == "error" else None)
        api_errors = []
        page.on("response", lambda resp: api_errors.append({"url": resp.url, "status": resp.status}) if resp.status >= 400 and "/api/" in resp.url else None)

        # Navigate
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
        test("Page loaded", True, "")

        # ── Test: Import a public ontology from raw URL ──
        print("\n📥 Test: Import ontology from raw URL")
        
        # The app's own example uses pizza.ttl. Use raw.githubusercontent.com URL
        # (not github.com blob URL) so it uses the plain axios.get path (no auth needed)
        TEST_ONTOLOGY_URL = "https://raw.githubusercontent.com/konnektr-io/ontologies/main/pizza.ttl"
        
        # Find the import URL input and type the URL
        typed = page.evaluate(f"""() => {{
            const inputs = document.querySelectorAll('input');
            for (const input of inputs) {{
                if (input.placeholder && input.placeholder.toLowerCase().includes('url')) {{
                    input.value = '{TEST_ONTOLOGY_URL}';
                    input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    return true;
                }}
            }}
            return false;
        }}""")
        test("Typed URL into import input", typed, "")
        
        page.wait_for_timeout(500)

        # Find and click Import button
        clicked = page.evaluate("""() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.trim() === 'Import') {
                    btn.click();
                    return true;
                }
            }
            return false;
        }""")
        test("Clicked Import button", clicked, "")

        # Wait for the ontology to load (this triggers navigation to OntologyManagerView)
        # The import may take a few seconds for the pizza ontology
        page.wait_for_timeout(5000)
        
        # Check where we ended up — may stay on LoadOntologyView or navigate to OntologyManagerView
        current_url = page.url
        test("URL after import", "classes" in current_url or "load" in current_url, f"URL: {current_url}")

        # ── Test: Check if ontology data loaded ──
        print("\n🌳 Test: Ontology rendering")
        page.screenshot(path="/opt/data/home/ontomanager/tests/smoke-after-import.png", full_page=True)
        test("Screenshot after import saved", True, "")

        # Check for "No data" text disappearance
        page_content = page.evaluate("() => document.body.innerText")
        has_no_data = "No data" in page_content
        test("No more 'No data' state", not has_no_data, "Still showing 'No data'" if has_no_data else "Data loaded!")

        # Check for ontology-specific content
        has_pizza = "pizza" in page_content.lower()
        test("Pizza ontology content visible", has_pizza, "")

        # Check for class names from pizza ontology
        has_class_names = any(term in page_content for term in ["Pizza", "Topping", "PizzaBase", "Cheese", "Tomato"])
        test("Class names visible (Pizza, Topping, etc.)", has_class_names, "")

        # Check sidebar for loaded ontologies
        has_ontology_in_sidebar = page.evaluate(f"""() => {{
            const nav = document.querySelectorAll('nav *, [role="navigation"] *, .sidebar *');
            return Array.from(nav).some(el => 
                el.textContent.toLowerCase().includes('pizza') || 
                el.textContent.toLowerCase().includes('ontology')
            );
        }}""")
        test("Ontology appears in sidebar", has_ontology_in_sidebar, "")

        # ── Test: Click sidebar navigation items ──
        print("\n🧭 Test: Navigate ontology views")
        
        for section in ["Properties", "Individuals", "Decomposition", "Classes"]:
            try:
                clicked = page.evaluate(f"""() => {{
                    const links = document.querySelectorAll('a, button, [role="button"]');
                    for (const link of links) {{
                        if (link.textContent.trim() === '{section}') {{
                            link.click();
                            return true;
                        }}
                    }}
                    return false;
                }}""")
                if clicked:
                    page.wait_for_timeout(1500)
                    test(f"Navigated to {section}", True, f"URL: {page.url[:120]}")
                else:
                    test(f"Navigated to {section}", False, "Link not found")
            except Exception as e:
                test(f"Navigated to {section}", False, str(e))

        # ── Test: Screenshot in each section ──
        for section in ["Classes", "Properties"]:
            page.evaluate(f"""() => {{
                const links = document.querySelectorAll('a, button, [role="button"]');
                for (const link of links) {{
                    if (link.textContent.trim() === '{section}') {{
                        link.click();
                        return true;
                    }}
                }}
                return false;
            }}""")
            page.wait_for_timeout(1500)
            page.screenshot(path=f"/opt/data/home/ontomanager/tests/smoke-{section.lower()}.png", full_page=True)
            test(f"Screenshot in {section} view", True, "")

        # ── Test: Final console check ──
        print("\n🔍 Test: Final console errors")
        if console_errors:
            for err in console_errors[:10]:
                print(f"     Console Error: {err['text'][:200]}")
        test("No console errors throughout test", len(console_errors) == 0, f"Found {len(console_errors)} errors" if console_errors else "")

        # ── Test: API errors ──
        print("\n🌐 Test: API errors")
        import_related_errors = [e for e in api_errors if 'pizza' in e['url'] or 'ttl' in e['url']]
        test("No API errors for import", len(import_related_errors) == 0, f"API errors: {import_related_errors[:3]}" if import_related_errors else "")

        browser.close()

    # Summary
    total = RESULTS["passed"] + RESULTS["failed"]
    print(f"\n{'='*50}")
    print(f"RESULTS: {RESULTS['passed']}/{total} passed, {RESULTS['failed']} failed")
    print(f"{'='*50}")

    with open("/opt/data/home/ontomanager/tests/smoke-import-results.json", "w") as f:
        json.dump(RESULTS, f, indent=2)

    return RESULTS["failed"] == 0

if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)
