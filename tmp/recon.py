from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()

    logs = []

    def on_console(msg):
        if msg.type in ('error', 'warning'):
            logs.append(f"[{msg.type}] {msg.text}")

    page.on("console", on_console)
    page.on("pageerror", lambda err: logs.append(f"[PAGE_ERROR] {err}"))

    # 1. Root /
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(2000)
    page.screenshot(path='/tmp/01-root.png', full_page=True)
    print(f"Root URL: {page.url}")
    print(f"Root title: {page.title()}")

    # 2. Dashboard
    page.goto('http://localhost:5173/dashboard', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(2000)
    page.screenshot(path='/tmp/02-dashboard.png', full_page=True)
    print(f"\nDashboard URL: {page.url}")
    
    # 3. Login
    page.goto('http://localhost:5173/login', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(2000)
    page.screenshot(path='/tmp/03-login.png', full_page=True)
    print(f"\nLogin URL: {page.url}")

    # Check login page content
    login_content = page.content()
    # Find form elements
    buttons = page.locator('button').all()
    inputs = page.locator('input').all()
    print(f"\nLogin buttons ({len(buttons)}):")
    for b in buttons:
        print(f"  - '{b.text_content().strip()}' tag={b.tag_name}")
    print(f"\nLogin inputs ({len(inputs)}):")
    for i in inputs:
        name = i.get_attribute('name') or ''
        type_ = i.get_attribute('type') or ''
        placeholder = i.get_attribute('placeholder') or ''
        print(f"  - name='{name}' type='{type_}' placeholder='{placeholder}'")

    # 4. Builder page (unauthenticated — should redirect to /login)
    page.goto('http://localhost:5173/resumes/builder', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(3000)
    page.screenshot(path='/tmp/04-builder-redirect.png', full_page=True)
    print(f"\nBuilder URL: {page.url}")

    print("\n=== Console logs ===")
    for log in logs:
        print(log)

    # Save logs
    with open('/tmp/recon_logs.json', 'w') as f:
        json.dump({'urls': {
            'root': page.url,
        }, 'logs': logs}, f)

    browser.close()
    print("\nDone. Screenshots at /tmp/01-*.png")
