"""
Playwright interaction test — click on a class and verify the resource viewer opens.
"""
import sys, json, os
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
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"])
        context = browser.new_context(viewport={"width": 1440, "height": 900}, ignore_https_errors=True)
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # Import the pizza ontology first
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
            const links = document.querySelectorAll('a, button, [role="button"]');
            for (const link of links) {
                if (link.textContent.trim() === 'Classes') { link.click(); return true; }
            }
            return false;
        }""")
        page.wait_for_timeout(1500)

        # ── Test: Click on a class name ──
        print("\n🖱️  Test: Click on 'CheesyPizza' class")

        # Check how many clickable class items exist
        class_items = page.evaluate("""() => {
            const items = document.querySelectorAll('[class*="tree"] div, [class*="Tree"] div, li');
            return Array.from(items).map(el => el.textContent.trim()).filter(t => t && t.length > 0 && t.length < 50).slice(0, 30);
        }""")
        print(f"     Found items: {class_items[:10]}")

        # Try clicking a class label
        clicked = page.evaluate("""() => {
            // Try finding tree items by traversing DOM
            const all = document.querySelectorAll('*');
            const candidates = [];
            for (const el of all) {
                const text = el.textContent.trim();
                if (text === 'CheesyPizza' || text === 'SpicyPizza') {
                    if (el.tagName === 'DIV' || el.tagName === 'SPAN' || el.tagName === 'LI' || el.tagName === 'A') {
                        el.click();
                        return 'Clicked: ' + text;
                    }
                }
            }
            return 'Not found';
        }""")
        test("Clicked on a class name", "Clicked" in str(clicked), str(clicked))
        page.wait_for_timeout(2000)

        # Screenshot after clicking
        page.screenshot(path="/opt/data/home/ontomanager/tests/smoke-class-clicked.png", full_page=True)
        test("Screenshot after class click saved", True, "")

        # Check if something changed in the UI
        page_content = page.evaluate("() => document.body.innerText")
        has_class_detail = "CheesyPizza" in page_content
        test("Class name still visible in page", has_class_detail, "")

        # Check for detail panel (properties section, restrictions, etc.)
        has_property_section = any(term in page_content for term in ["Property", "property", "Restriction", "restriction", "SubClass", "subclass"])
        test("Detail panel with properties/restrictions visible", has_property_section, "")

        # Check for expandable tree items (DomainThing / ValuePartition)
        tree_expandable = page.evaluate("""() => {
            const all = document.querySelectorAll('*');
            for (const el of all) {
                if (el.textContent.trim() === 'DomainThing' || el.textContent.trim() === 'ValuePartition') {
                    return el.textContent.trim() + ' found';
                }
            }
            return false;
        }""")
        test("Tree structure visible (DomainThing/ValuePartition)", bool(tree_expandable), str(tree_expandable) if tree_expandable else "")

        # Close
        test("No console errors", len(console_errors) == 0, f"{len(console_errors)} errors: {console_errors[:3]}" if console_errors else "")
        browser.close()

    total = RESULTS["passed"] + RESULTS["failed"]
    print(f"\n{'='*50}")
    print(f"RESULTS: {RESULTS['passed']}/{total} passed, {RESULTS['failed']} failed")
    print(f"{'='*50}")
    with open("/opt/data/home/ontomanager/tests/smoke-click-results.json", "w") as f:
        json.dump(RESULTS, f, indent=2)
    return RESULTS["failed"] == 0

if __name__ == "__main__":
    sys.exit(0 if run() else 1)
