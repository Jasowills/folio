from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = ctx.new_page()

    errors = []

    def on_console(msg):
        if msg.type in ('error', 'warning'):
            errors.append(f"[{msg.type}] {msg.text}")
    def on_pageerror(err):
        errors.append(f"[PAGE_CRASH] {err}")

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)

    def dump_state(label, url):
        print(f"\n{'='*60}")
        print(f"{label}")
        print(f"URL: {url}")
        print(f"{'='*60}")
        # Title
        print(f"Title: {page.title()}")
        # All visible text (body text content, trimmed)
        body = page.locator('body')
        text = body.text_content().strip() if body.count() else ''
        # Show first 1200 chars of text
        print(f"\n--- Page text (first 1500 chars) ---")
        print(text[:1500])
        # Buttons
        btns = page.locator('button').all()
        if btns:
            print(f"\n--- Buttons ({len(btns)}) ---")
            for i, b in enumerate(btns):
                txt = (b.text_content() or '').strip()[:60]
                visible = b.is_visible()
                print(f"  [{i}] '{txt}' visible={visible}")
        # Inputs
        inputs = page.locator('input').all()
        if inputs:
            print(f"\n--- Inputs ({len(inputs)}) ---")
            for i_, inp in enumerate(inputs):
                ph = inp.get_attribute('placeholder') or ''
                name = inp.get_attribute('name') or ''
                type_ = inp.get_attribute('type') or ''
                visible = inp.is_visible()
                print(f"  [{i_}] type='{type_}' name='{name}' placeholder='{ph}' visible={visible}")
        # Links
        links = page.locator('a').all()
        if links:
            print(f"\n--- Links ({len(links)}) ---")
            for l in links[:15]:
                href = l.get_attribute('href') or ''
                txt = (l.text_content() or '').strip()[:50]
                if href or txt:
                    print(f"  href='{href}' text='{txt}'")
        # Visible errors in DOM
        err_el = page.locator('.error, [role=alert], .text-red, .bg-red')
        for e in err_el.all():
            if e.is_visible():
                print(f"\n  [!] Visible error: {(e.text_content() or '').strip()[:100]}")
        print()

    # 1. Root
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(1500)
    dump_state("ROOT", page.url)

    # 2. Login
    page.goto('http://localhost:5173/login', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(2000)
    dump_state("LOGIN", page.url)

    # 3. Builder (unauthenticated)
    page.goto('http://localhost:5173/resumes/builder', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(3000)
    dump_state("BUILDER (UNAUTH)", page.url)

    # Print errors
    print(f"\n{'='*60}")
    print(f"CONSOLE ERRORS ({len(errors)})")
    for e in errors:
        print(f"  {e}")

    browser.close()
    print("\nDone")
