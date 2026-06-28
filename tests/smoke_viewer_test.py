"""
Final verification: import pizza, click a class, screenshot the resource viewer.
"""
import sys
sys.path.insert(0, "/opt/data/home/.local/lib/python3.13/site-packages")
from playwright_bootstrap import sync_playwright

BASE_URL = "https://ontomanager.local.raes.konnektr.io"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"])
    context = browser.new_context(viewport={"width": 1440, "height": 900}, ignore_https_errors=True)
    page = context.new_page()

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
        const all = document.querySelectorAll('nav a, a, [role="button"]');
        for (const link of all) {
            if (link.textContent.trim() === 'Classes') { link.click(); return true; }
        }
        return false;
    }""")
    page.wait_for_timeout(1500)

    # Click CheesyPizza using proper event dispatch (which we verified works)
    page.evaluate("""() => {
        const all = document.querySelectorAll('*');
        for (const el of all) {
            if (el.textContent.trim() === 'CheesyPizza' && el.tagName === 'SPAN') {
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                return true;
            }
        }
        return false;
    }""")
    page.wait_for_timeout(3000)

    # Read the page state
    state = page.evaluate("""() => {
        const app = document.querySelector('#app');
        const vueApp = app && app.__vue_app__;
        if (!vueApp) return {error: 'No Vue app'};
        const pinia = vueApp.config.globalProperties.$pinia;
        if (!pinia) return {error: 'No Pinia'};
        const graphStore = pinia.state.value.graph;
        
        // Check what the main content area shows
        return {
            selectedResource: graphStore.selectedResource,
            rightPanelTextStart: document.querySelector('.overflow-auto.bg-background:last-child')?.textContent?.trim().slice(0, 200) || 'NOT FOUND'
        };
    }""")
    
    print(f"selectedResource: {state.get('selectedResource', 'N/A')}")
    print(f"Right panel text (first 200 chars): {state.get('rightPanelTextStart', 'N/A')}")
    
    # Take screenshot
    page.screenshot(path="/opt/data/home/ontomanager/tests/smoke-resource-viewer.png", full_page=True)
    print("\n📸 Screenshot saved to tests/smoke-resource-viewer.png")

    # Close and do NOT re-use the closed browser
    context.close()
    browser.close()
