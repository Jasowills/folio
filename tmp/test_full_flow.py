from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()

    errors = []
    def on_console(msg):
        if msg.type in ('error', 'warning'):
            errors.append(f"[{msg.type}] {msg.text[:200]}")
    def on_pageerror(err):
        errors.append(f"[PAGE_CRASH] {err}")

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)

    def sep(label):
        print(f"\n{'='*60}")
        print(f"  {label}")
        print(f"{'='*60}")

    def dump(label):
        print(f"\n--- {label} ---")
        print(f"URL: {page.url}")
        print(f"Title: {page.title()}")
        btns = page.locator('button').all()
        vis_btns = [(i, (b.text_content() or '').strip()[:60]) for i, b in enumerate(btns) if b.is_visible()]
        print(f"Buttons visible: {[t for _, t in vis_btns]}")
        h1s = [h.text_content().strip() for h in page.locator('h1').all() if h.is_visible()]
        h2s = [h.text_content().strip() for h in page.locator('h2').all() if h.is_visible()]
        if h1s: print(f"H1: {h1s}")
        if h2s: print(f"H2: {h2s}")

    # =========== STEP 1: Sign up ===========
    sep("STEP 1: SIGN UP")
    page.goto('http://localhost:3000/signup', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(2000)
    dump("Signup page")
    
    # Fill signup form
    inputs = page.locator('input').all()
    print(f"\nSignup inputs found: {len(inputs)}")
    test_email = f"testuser{int(time.time())}@test.com"
    for inp in inputs:
        ph = inp.get_attribute('placeholder') or ''
        inp_type = inp.get_attribute('type') or ''
        if 'name' in ph.lower() or inp_type == 'text':
            inp.fill('Test User')
            print(f"  Filled name field: '{ph}'")
        elif 'email' in ph.lower() or inp_type == 'email':
            inp.fill(test_email)
            print(f"  Filled email: {test_email}")
        elif 'password' in ph.lower() or inp_type == 'password':
            inp.fill('TestPassword123!')
            print(f"  Filled password field: '{ph}'")

    # Click signup button
    signup_btn = page.locator('button:has-text("Sign up"), button:has-text("Create"), button:has-text("Get started")')
    if signup_btn.count():
        print(f"  Clicking: '{signup_btn.text_content().strip()}'")
        signup_btn.click()
    else:
        # Try clicking the submit button
        btns = page.locator('button').all()
        for b in btns:
            if b.is_visible():
                print(f"  Clicking button: '{b.text_content().strip()}'")
                b.click()
                break

    page.wait_for_timeout(3000)
    dump("After signup")
    page.screenshot(path='/tmp/s1-signup-result.png', full_page=True)

    # =========== STEP 2: Navigate to dashboard ===========
    sep("STEP 2: DASHBOARD")
    page.goto('http://localhost:3000/dashboard', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(2000)
    dump("Dashboard")
    page.screenshot(path='/tmp/s2-dashboard.png', full_page=True)

    # Find "Build from scratch" button
    all_links = page.locator('a').all()
    all_buttons = page.locator('button').all()
    print("\nAll links:")
    for l in all_links:
        href = l.get_attribute('href') or ''
        txt = (l.text_content() or '').strip()[:80]
        if href and txt:
            print(f"  '{txt}' -> {href}")
    print("\nAll buttons:")
    for b in all_buttons:
        txt = (b.text_content() or '').strip()[:80]
        if txt:
            print(f"  '{txt}'")
    
    # =========== STEP 3: Builder page ===========
    sep("STEP 3: BUILDER")
    page.goto('http://localhost:3000/resumes/builder', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(3000)
    dump("Builder - template selection")
    page.screenshot(path='/tmp/s3-builder-template-select.png', full_page=True)

    # Check template cards
    btns = page.locator('button').all()
    print(f"\nTotal buttons: {len(btns)}")
    for i, b in enumerate(btns):
        txt = (b.text_content() or '').strip()[:100]
        vis = b.is_visible()
        if vis and txt:
            print(f"  [{i}] '{txt}'")

    # Try clicking a template
    for b in btns:
        txt = (b.text_content() or '').strip()
        if 'Use this template' in txt or 'Minimal' in txt:
            print(f"\nClicking: '{txt}'")
            b.click()
            break

    page.wait_for_timeout(3000)
    dump("After template click")
    page.screenshot(path='/tmp/s3-after-template.png', full_page=True)

    # =========== STEP 4: Mode selection ===========
    sep("STEP 4: MODE SELECTION")
    btns = page.locator('button').all()
    print(f"\nAll buttons:")
    for i, b in enumerate(btns):
        txt = (b.text_content() or '').strip()[:80]
        vis = b.is_visible()
        if vis and txt:
            print(f"  [{i}] '{txt}'")

    # Try "Chat with AI"
    for b in btns:
        txt = (b.text_content() or '').strip()
        if 'Chat with AI' in txt:
            print(f"\nClicking: 'Chat with AI'")
            b.click()
            break
    
    page.wait_for_timeout(3000)
    dump("After chat mode click")
    page.screenshot(path='/tmp/s4-chat-mode.png', full_page=True)

    # =========== STEP 5: Check chat interface ===========
    sep("STEP 5: CHAT INTERFACE")
    dump("Chat interface")
    page.screenshot(path='/tmp/s5-chat-interface.png', full_page=True)
    
    # Find the chat input
    inputs = page.locator('input, textarea, [contenteditable]').all()
    print(f"\nInputs/Textareas: {len(inputs)}")
    for i, inp in enumerate(inputs):
        ph = inp.get_attribute('placeholder') or ''
        tag = inp.evaluate("el => el.tagName")
        contenteditable = inp.get_attribute('contenteditable') or ''
        vis = inp.is_visible()
        print(f"  [{i}] <{tag}> placeholder='{ph}' contenteditable='{contenteditable}' visible={vis}")

    # Try sending a message
    page.wait_for_timeout(2000)

    # =========== ERRORS ===========
    sep("CONSOLE ERRORS")
    for e in errors:
        print(f"  {e}")

    browser.close()
    print(f"\nTest email used: {test_email}")
    print("Done. Screenshots at /tmp/s*.png")
