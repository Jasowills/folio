from playwright.sync_api import sync_playwright
import time

SCREENSHOTS_DIR = '/Users/jasonamadi/Folio/test-screenshots'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)

    # 1. Test builder page
    print('1. Testing builder...')
    page.goto('http://localhost:5173/resumes/builder')
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    # Dump all buttons and their text
    print('\n--- All buttons ---')
    buttons = page.locator('button').all()
    for btn in buttons:
        text = btn.inner_text().strip()
        visible = btn.is_visible()
        if text and visible:
            print(f'  "{text}"')

    # Dump all clickable elements with tabler icons
    print('\n--- Elements with icon classes ---')
    icons = page.locator('[class*="tabler"]').all()
    for icon in icons[:20]:
        tag = icon.evaluate('el => el.tagName')
        cls = icon.get_attribute('class') or ''
        visible = icon.is_visible()
        if visible:
            parent_text = icon.evaluate('el => el.parentElement?.innerText?.trim() || ""')
            print(f'  <{tag}> class="{cls[:60]}" parent="{parent_text[:40]}"')

    # Check for sections panel, styles panel buttons
    print('\n--- Looking for panel triggers ---')
    for text in ['Style', 'Section', 'AI', 'Design', 'Template', 'Chat']:
        found = page.locator(f'text="{text}"').all()
        print(f'  "{text}": {len(found)} matches, visible: {found[0].is_visible() if found else "N/A"}')

    # Check if there's a resume preview
    print('\n--- Resume preview ---')
    preview = page.locator('[class*="resume"], [class*="paper"], [class*="preview"]').all()
    print(f'  Found {len(preview)} preview elements')

    # Check for template gallery in the page
    print('\n--- Template elements ---')
    template_els = page.locator('[class*="template"]').all()
    print(f'  Found {len(template_els)} template-related elements')

    browser.close()

    if errors:
        print(f'\nConsole errors: {len(errors)}')
        for e in errors[:10]:
            print(f'  - {e[:200]}')
    else:
        print('\nNo console errors')
