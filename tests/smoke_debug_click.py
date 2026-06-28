"""
Debug: test class click interaction and check if selectedResource changes.
"""
import sys, json
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

        # Step 1: Check initial state
        initial_state = page.evaluate("""() => {
            // Access Pinia store via internal Vue app
            const app = document.querySelector('#app');
            // Try to get Vue app instance
            const vueApp = app && app.__vue_app__;
            if (!vueApp) return {error: 'No Vue app found'};
            
            const pinia = vueApp.config.globalProperties.$pinia;
            if (!pinia) return {error: 'No Pinia found'};
            
            const graphStore = pinia.state.value.graph;
            return {
                selectedResource: graphStore.selectedResource,
                selectedOntologyUrl: graphStore.selectedOntology ? graphStore.selectedOntology.url : null,
                userGraphCount: graphStore.userGraphs ? graphStore.userGraphs.length : 0,
                userGraphUrls: graphStore.userGraphs ? graphStore.userGraphs.map(g => g.url).slice(0, 3) : [],
            };
        }""")
        print(f"\n📊 Initial store state: {json.dumps(initial_state, indent=2)[:500]}")
        test("Store accessible", "error" not in initial_state, str(initial_state.get('error', '')))
        test("Ontology imported (userGraphs > 0)", initial_state.get('userGraphCount', 0) > 0, f"Graphs: {initial_state.get('userGraphCount', 0)}")

        # Step 2: Find the tree element for CheesyPizza and click it properly
        print("\n🖱️  Finding and clicking CheesyPizza in tree...")
        
        # First, examine the tree structure
        tree_html = page.evaluate("""() => {
            // Find the tree container
            const allDivs = document.querySelectorAll('div');
            let treeFound = false;
            let info = [];
            for (const div of allDivs) {
                if (div.getAttribute('role') === 'tree') {
                    treeFound = true;
                    // List all leaf items with their text and classes
                    const items = div.querySelectorAll('div');
                    for (const item of items) {
                        const text = item.textContent.trim();
                        if (text && text.length < 50) {
                            info.push({
                                text: text,
                                class: item.className.slice(0,60),
                                tag: item.tagName,
                                hasClickHandler: item.hasAttribute('@click') || !!item.onclick
                            });
                        }
                    }
                }
            }
            if (!treeFound) {
                // Try looking for the tree differently
                const treeItems = document.querySelectorAll('[class*="ml-5"], [class*="tree"], [class*="Tree"]');
                info.push({fallback: 'treeItems count: ' + treeItems.length});
                for (const ti of treeItems) {
                    if (ti.textContent.trim().length < 50) {
                        info.push({text: ti.textContent.trim(), class: ti.className.slice(0,60)});
                    }
                }
            }
            return info;
        }""")
        print("     Tree items found:")
        for t in tree_html[:15]:
            print(f"       {t}")

        # Now try clicking by coordinates (the CheesyPizza element)
        click_result = page.evaluate("""() => {
            const all = document.querySelectorAll('*');
            // Find the specific span with CheesyPizza text
            for (const el of all) {
                if (el.textContent.trim() === 'CheesyPizza' && el.tagName === 'SPAN') {
                    const rect = el.getBoundingClientRect();
                    // Click the center of the span
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    return { 
                        clicked: true, 
                        tagName: el.tagName, 
                        className: el.className.slice(0,80),
                        parentTag: el.parentElement?.tagName,
                        rect: {x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)}
                    };
                }
            }
            // Try finding by any element containing CheesyPizza
            for (const el of all) {
                if (el.textContent.trim() === 'CheesyPizza') {
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    return { clicked: true, tagName: el.tagName, className: el.className.slice(0,80) };
                }
            }
            return { clicked: false };
        }""")
        print(f"\n     Click result: {json.dumps(click_result)[:200]}")
        page.wait_for_timeout(1500)

        # Step 3: Check store state after click
        after_state = page.evaluate("""() => {
            const app = document.querySelector('#app');
            const vueApp = app && app.__vue_app__;
            if (!vueApp) return {error: 'No Vue app found'};
            const pinia = vueApp.config.globalProperties.$pinia;
            if (!pinia) return {error: 'No Pinia found'};
            const graphStore = pinia.state.value.graph;
            return {
                selectedResource: graphStore.selectedResource,
                selectedOntologyUrl: graphStore.selectedOntology ? graphStore.selectedOntology.url : null,
            };
        }""")
        print(f"\n📊 After click state: {json.dumps(after_state, indent=2)[:300]}")
        
        test("selectedResource changed", after_state.get('selectedResource') != initial_state.get('selectedResource'), 
             f"Before: {initial_state.get('selectedResource')} → After: {after_state.get('selectedResource')}")

        # Check what the right panel shows
        right_panel = after_state.get('selectedResource', '')
        if right_panel and right_panel != initial_state.get('selectedResource', ''):
            test("ResourceViewer visible (selectedResource set)", True, f"URI: {right_panel[:100]}")
        else:
            test("ResourceViewer NOT visible", False, "selectedResource didn't change after click")

        # Step 4: Try clicking with Playwright's built-in click on coordinates
        if 'rect' in click_result:
            print(f"\n🖱️  Trying Playwright click at coordinates...")
            page.mouse.click(click_result['rect']['x'] + 5, click_result['rect']['y'] + 5)
            page.wait_for_timeout(1500)
            
            after_coord_state = page.evaluate("""() => {
                const app = document.querySelector('#app');
                const vueApp = app && app.__vue_app__;
                if (!vueApp) return {error: 'No Vue app found'};
                const pinia = vueApp.config.globalProperties.$pinia;
                const graphStore = pinia.state.value.graph;
                return { selectedResource: graphStore.selectedResource };
            }""")
            print(f"     After coord click: {json.dumps(after_coord_state)[:200]}")

        browser.close()
        page.wait_for_timeout(1000)

    total = RESULTS["passed"] + RESULTS["failed"]
    print(f"\n{'='*50}")
    print(f"RESULTS: {RESULTS['passed']}/{total} passed, {RESULTS['failed']} failed")
    print(f"{'='*50}")
    return RESULTS["failed"] == 0

if __name__ == "__main__":
    sys.exit(0 if run() else 1)
