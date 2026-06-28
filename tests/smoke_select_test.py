"""
Test: Select ontology from dropdown after import.
"""
import sys, json, os
sys.path.insert(0, "/opt/data/home/.local/lib/python3.13/site-packages")
from playwright_bootstrap import sync_playwright

BASE_URL = "https://ontomanager.local.raes.konnektr.io"
RESULTS = {"passed": 0, "failed": 0, "tests": []}

def test(name, passed, detail=""):
    RESULTS["tests"].append({"name": name, "passed": passed, "detail": detail})
    if passed: RESULTS["passed"] += 1; print(f"  ✅ {name}")
    else: RESULTS["failed"] += 1; print(f"  ❌ {name} — {detail}")

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"])
        context = browser.new_context(viewport={"width": 1440, "height": 900}, ignore_https_errors=True)
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # Import pizza ontology
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
        page.evaluate("""() => {
            const inputs = document.querySelectorAll('input');
            for (const input of inputs) {
                if (input.placeholder && input.placeholder.toLowerCase().includes('url')) {
                    input.value = 'https://raw.githubusercontent.com/konnektr-io/ontologies/main/pizza.ttl';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    return true;
                }
            }
            return false;
        }""")
        page.wait_for_timeout(500)
        page.evaluate("""() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.trim() === 'Import') { btn.click(); return true; }
            }
            return false;
        }""")
        page.wait_for_timeout(5000)

        # Navigate to Classes
        page.evaluate("""() => {
            const all = document.querySelectorAll('nav a, a');
            for (const link of all) {
                if (link.textContent.trim() === 'Classes') { link.click(); return true; }
            }
            return false;
        }""")
        page.wait_for_timeout(1500)

        # ── Try to interact with the "Select Ontology to Edit" dropdown ──
        print("\n📋 Test: Select ontology dropdown")
        dropdown_info = page.evaluate("""() => {
            const selects = document.querySelectorAll('select');
            const result = [];
            for (const sel of selects) result.push({id: sel.id, name: sel.name, options: Array.from(sel.options).map(o => o.text)});
            
            // Also look for combobox/trigger patterns (shadcn Select)
            const triggers = document.querySelectorAll('[role="combobox"], [role="listbox"], [class*="trigger"], [class*="Trigger"]');
            for (const t of triggers) result.push({role: t.getAttribute('role'), text: t.textContent.trim(), class: t.className.slice(0, 100)});
            
            // Look for any element that seems like a select/dropdown
            const all = document.querySelectorAll('*');
            const selectTexts = [];
            for (const el of all) {
                const t = el.textContent.trim();
                if (t === 'Select Ontology to Edit') selectTexts.push(el.tagName + '.' + (el.className || '').slice(0, 50));
            }
            result.push({selectTextMatches: selectTexts.slice(0, 5)});
            
            return result;
        }""")
        print(f"     Dropdown elements: {json.dumps(dropdown_info, indent=2)[:500]}")

        # Try clicking the dropdown trigger
        clicked_dropdown = page.evaluate("""() => {
            // Look for the shadcn select trigger containing "Select Ontology to Edit"
            const all = document.querySelectorAll('*');
            for (const el of all) {
                if (el.textContent.trim() === 'Select Ontology to Edit' && (el.tagName === 'SPAN' || el.getAttribute('role') === 'combobox')) {
                    el.click();
                    return 'Clicked span/combobox: ' + el.tagName;
                }
            }
            return false;
        }""")
        test("Clicked ontology dropdown", bool(clicked_dropdown), str(clicked_dropdown) if clicked_dropdown else "Not found")
        page.wait_for_timeout(1000)

        # Screenshot
        page.screenshot(path="/opt/data/home/ontomanager/tests/smoke-dropdown-clicked.png", full_page=True)
        test("Screenshot after dropdown click", True, "")

        # ── Now try clicking CheesyPizza after selecting ontology ──
        print("\n🖱️  Test: Click CheesyPizza")
        clicked_class = page.evaluate("""() => {
            const all = document.querySelectorAll('*');
            for (const el of all) {
                if (el.textContent.trim() === 'CheesyPizza') {
                    el.click();
                    return 'Clicked: ' + el.tagName;
                }
            }
            return false;
        }""")
        test("Clicked CheesyPizza", bool(clicked_class), str(clicked_class) if clicked_class else "Not found")
        page.wait_for_timeout(2000)

        page.screenshot(path="/opt/data/home/ontomanager/tests/smoke-after-select-click.png", full_page=True)
        test("Screenshot after class click with selection", True, "")

        # Check what's in the right panel now
        right_panel = page.evaluate("""() => {
            const body = document.body.innerText;
            // Look for detail-related content
            const checks = {
                hasCreateImport: body.includes('Create or import ontologies'),
                hasProperty: body.includes('Property') || body.includes('property'),
                hasRestriction: body.includes('Restriction') || body.includes('restriction'),
                hasType: body.includes('rdf:type') || body.includes('a owl') || body.includes('rdfs:'),
                hasCheesy: body.includes('CheesyPizza'),
                hasSubClass: body.includes('SubClass') || body.includes('subClass') || body.includes('subclass'),
            };
            return checks;
        }""")
        for k, v in right_panel.items():
            test(f"Right panel: {k}", v, "")

        # Final
        test("No console errors", len(console_errors) == 0, f"{len(console_errors)} errors" if console_errors else "")
        browser.close()

    total = RESULTS["passed"] + RESULTS["failed"]
    print(f"\n{'='*50}")
    print(f"RESULTS: {RESULTS['passed']}/{total} passed, {RESULTS['failed']} failed")
    print(f"{'='*50}")
    with open("/opt/data/home/ontomanager/tests/smoke-select-results.json", "w") as f:
        json.dump(RESULTS, f, indent=2)
    return RESULTS["failed"] == 0

if __name__ == "__main__":
    sys.exit(0 if run() else 1)
