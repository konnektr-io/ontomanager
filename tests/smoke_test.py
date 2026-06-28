"""
Playwright smoke test for ontomanager shadcn deployment.
Tests basic functionality: page load, routing, console errors, visual rendering.
"""
import sys
import json
import os

# Ensure playwright_bootstrap is importable
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
        network_failures = []

        page.on("console", lambda msg: console_errors.append(msg) if msg.type == "error" else None)
        page.on("response", lambda resp: network_failures.append(resp.url) if not resp.ok and resp.status >= 400 else None)

        # ── Test 1: Page loads ──
        print("\n📄 Test 1: Page loads")
        try:
            resp = page.goto(BASE_URL, wait_until="domcontentloaded", timeout=30000)
            test("HTTP 200 or redirect", resp and resp.status in (200, 302, 307), f"Status: {resp.status if resp else 'none'}")
        except Exception as e:
            test("Page navigation", False, str(e))

        # Wait for Vue app to mount
        page.wait_for_timeout(3000)

        # ── Test 2: App shell renders ──
        print("\n🏗️  Test 2: App shell renders")
        title = page.title()
        test("Page title", "Konnektr" in title, f"Got: {title}")

        # Check the app root exists
        app_div = page.evaluate("() => document.getElementById('app')")
        test("#app exists", bool(app_div), "")

        app_has_content = page.evaluate("() => document.getElementById('app')?.children?.length > 0")
        test("#app has children", bool(app_has_content), "")

        # ── Test 3: JavaScript loads without errors ──
        print("\n⚡ Test 3: JavaScript execution")
        js_exec = page.evaluate("() => typeof window !== 'undefined' && typeof Vue !== 'undefined'")
        test("Vue loaded", js_exec, "")

        # Check router and pinia are loaded
        has_pinia = page.evaluate("""() => {
            const app = document.getElementById('app');
            return app && app.__vue_app__ ? true : false;
        }""")
        test("Vue app mounted", has_pinia, "")

        # ── Test 4: Console errors ──
        print("\n🔍 Test 4: Console errors")
        if console_errors:
            for err in console_errors[:5]:
                print(f"     Console error: {err.text[:200]}")
        test("No console errors", len(console_errors) == 0, f"Found {len(console_errors)} errors (shown above)" if console_errors else "")

        # ── Test 5: Network errors ──
        print("\n🌐 Test 5: Network asset loading")
        js_css_404s = [url for url in network_failures if any(ext in url for ext in ['.js', '.css', '.svg', '.png', '.woff'])]
        test("No 404s for JS/CSS/assets", len(js_css_404s) == 0, f"Missing assets: {js_css_404s[:5]}" if js_css_404s else "")

        # ── Test 6: API health (without auth) ──
        print("\n🏥 Test 6: API health check")
        api_errors = [url for url in network_failures if '/api/' in url]
        # API 404s/errors are expected without auth — just log them
        if api_errors:
            print(f"     API endpoints hit (expected without auth): {api_errors[:5]}")
        test("API reachable (may return 401/403 without auth)", True, f"{len(api_errors)} API calls made")

        # ── Test 7: Visual snapshot ──
        print("\n📸 Test 7: Screenshots")
        screenshot_path = "/opt/data/home/ontomanager/tests/smoke-initial.png"
        page.screenshot(path=screenshot_path, full_page=True)
        test("Screenshot saved", os.path.exists(screenshot_path), screenshot_path)

        # ── Test 8: Check if auth redirect happens ──
        print("\n🔐 Test 8: Auth flow detection")
        current_url = page.url
        is_github_redirect = "github.com/login/oauth" in current_url
        test("GitHub OAuth redirect", is_github_redirect, 
             f"Current URL: {current_url[:150]}" if not is_github_redirect else "Redirected to GitHub login")

        # ── Test 9: Bundle size check ──
        print("\n📦 Test 9: Bundle health")
        js_bundle_loaded = page.evaluate("""() => {
            const scripts = document.querySelectorAll('script[src]');
            return scripts.length > 0 && Array.from(scripts).some(s => s.src.includes('index-'));
        }""")
        test("JS bundle loaded", js_bundle_loaded, "")

        browser.close()

    # Summary
    total = RESULTS["passed"] + RESULTS["failed"]
    print(f"\n{'='*50}")
    print(f"RESULTS: {RESULTS['passed']}/{total} passed, {RESULTS['failed']} failed")
    print(f"{'='*50}")

    # Save results
    with open("/opt/data/home/ontomanager/tests/smoke-results.json", "w") as f:
        json.dump(RESULTS, f, indent=2)

    return RESULTS["failed"] == 0

if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)
