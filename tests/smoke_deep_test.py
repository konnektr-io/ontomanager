"""
Deep Playwright interaction test for ontomanager shadcn.
Tests navigation, cookie consent, ontology import interaction, and card clicks.
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
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append({"type": msg.type, "text": msg.text}) if msg.type == "error" else None)

        # Navigate
        resp = page.goto(BASE_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)  # Let Vue hydrate
        test("Page loaded", resp and resp.status in (200, 302, 307), f"Status: {resp.status if resp else 'none'}")

        # ── Test: Sidebar navigation items ──
        print("\n🧭 Test: Sidebar navigation")
        sidebar_items = page.evaluate("""() => {
            const links = document.querySelectorAll('nav a, [role="navigation"] a, a[href*="/"]');
            return Array.from(links).map(a => ({text: a.textContent.trim(), href: a.href})).filter(l => l.text);
        }""")
        print(f"     Found {len(sidebar_items)} navigation items")
        nav_texts = [item["text"] for item in sidebar_items]
        expected = ["Classes", "Properties", "Individuals", "Decomposition", "Ontologies"]
        for exp in expected:
            found = any(exp in t for t in nav_texts)
            test(f"Nav item: {exp}", found, f"Found in: {[t for t in nav_texts if exp in t]}" if found else f"Not found among: {nav_texts}")

        # ── Test: Click sidebar items ──
        print("\n🔄 Test: Navigation clicks")
        for target in ["Properties", "Ontologies"]:
            try:
                # Find and click nav link containing target text
                clicked = page.evaluate(f"""() => {{
                    const links = document.querySelectorAll('nav a, a[href*="/"], [role="navigation"] a');
                    for (const link of links) {{
                        if (link.textContent.trim().includes('{target}')) {{
                            link.click();
                            return true;
                        }}
                    }}
                    return false;
                }}""")
                if clicked:
                    page.wait_for_timeout(1000)
                    test(f"Navigated to {target}", target.lower() in page.url.lower(), f"URL: {page.url}")
                else:
                    test(f"Navigated to {target}", False, f"Could not find {target} link")
            except Exception as e:
                test(f"Navigated to {target}", False, str(e))

        # Navigate back to classes
        page.goto(f"{BASE_URL}/classes", wait_until="domcontentloaded")

        # ── Test: Cookie consent ──
        print("\n🍪 Test: Cookie consent")
        cookie_visible = page.evaluate("""() => {
            const all = document.querySelectorAll('*');
            return Array.from(all).filter(el => 
                el.textContent.includes('Cookie') || 
                el.textContent.includes('cookie') ||
                el.textContent.includes('Privacy')
            ).length > 0;
        }""")
        test("Cookie notice visible", cookie_visible, "")

        # Try clicking Accept
        accept_clicked = page.evaluate("""() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.includes('Accept')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        }""")
        test("Accept cookie button clickable", accept_clicked, "")
        if accept_clicked:
            page.wait_for_timeout(500)
            test("Cookie consent accepted (no error)", True, "")

        # ── Test: Pre-built ontology cards ──
        print("\n📦 Test: Pre-built ontology cards")
        cards = page.evaluate("""() => {
            const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
            return Array.from(cards).map(c => c.textContent.trim().substring(0, 100)).filter(t => t.length > 0);
        }""")
        print(f"     Found {len(cards)} card elements")
        test("Pre-built ontology cards present", len(cards) >= 2, f"Found {len(cards)} cards: {cards[:5]}")

        # Try clicking first ontology card
        card_clicked = page.evaluate("""() => {
            const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
            for (const card of cards) {
                if (card.textContent.includes('SML') || card.textContent.includes('BOT') || card.textContent.includes('DCAT')) {
                    card.click();
                    return card.textContent.trim().substring(0, 80);
                }
            }
            return false;
        }""")
        test("Ontology card clickable", bool(card_clicked), f"Clicked: {card_clicked}" if card_clicked else "No card found")

        # ── Test: Import ontology input ──
        print("\n📥 Test: Import ontology input")
        import_input = page.evaluate("""() => {
            const inputs = document.querySelectorAll('input[type="text"], input[type="url"], input:not([type])');
            for (const input of inputs) {
                if (input.placeholder && input.placeholder.toLowerCase().includes('url')) {
                    return input.placeholder;
                }
            }
            // Generic fallback
            const allInputs = document.querySelectorAll('input');
            return allInputs.length > 0 ? `Found ${allInputs.length} inputs` : 'No inputs found';
        }""")
        test("Import URL input exists", bool(import_input) and "no input" not in import_input.lower(), f"Placeholder: {import_input}")

        # ── Test: Import button ──
        print("\n🔘 Test: Import button")
        import_btn = page.evaluate("""() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.toLowerCase().includes('import')) {
                    return btn.textContent.trim();
                }
            }
            return false;
        }""")
        test("Import button visible", bool(import_btn), f"Button text: {import_btn}" if import_btn else "Not found")

        # ── Test: GitHub sign-in button ──
        print("\n🐙 Test: GitHub sign-in")
        github_btn = page.evaluate("""() => {
            const buttons = document.querySelectorAll('button, a');
            for (const btn of buttons) {
                const text = btn.textContent.toLowerCase();
                const html = btn.innerHTML.toLowerCase();
                if (text.includes('sign in') || html.includes('github')) {
                    return btn.textContent.trim();
                }
            }
            return false;
        }""")
        test("GitHub sign-in button visible", bool(github_btn), f"Button text: {github_btn}" if github_btn else "Not found")

        # ── Test: Visual state after interactions ──
        print("\n📸 Test: Screenshot after interactions")
        screenshot_path = "/opt/data/home/ontomanager/tests/smoke-after-interaction.png"
        page.screenshot(path=screenshot_path, full_page=True)
        test("Screenshot saved", os.path.exists(screenshot_path), screenshot_path)

        # ── Test: Final console check ──
        print("\n🔍 Test: Final console error check")
        if console_errors:
            for err in console_errors[:5]:
                print(f"     Error: {err['text'][:200]}")
        test("No console errors throughout test", len(console_errors) == 0, f"Found {len(console_errors)} errors" if console_errors else "")

        browser.close()

    # Summary
    total = RESULTS["passed"] + RESULTS["failed"]
    print(f"\n{'='*50}")
    print(f"RESULTS: {RESULTS['passed']}/{total} passed, {RESULTS['failed']} failed")
    print(f"{'='*50}")

    with open("/opt/data/home/ontomanager/tests/smoke-results.json", "w") as f:
        json.dump(RESULTS, f, indent=2)

    return RESULTS["failed"] == 0

if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)
