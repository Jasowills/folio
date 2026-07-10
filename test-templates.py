from playwright.sync_api import sync_playwright
import time

SCREENSHOTS_DIR = '/Users/jasonamadi/Folio/test-screenshots'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    # 1. Test homepage loads
    print('1. Testing homepage...')
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    page.screenshot(path=f'{SCREENSHOTS_DIR}/01-homepage.png', full_page=True)
    print('   Homepage loaded OK')

    # 2. Test resume list / dashboard
    print('2. Testing dashboard...')
    page.goto('http://localhost:5173/resumes')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    page.screenshot(path=f'{SCREENSHOTS_DIR}/02-dashboard.png', full_page=True)
    print('   Dashboard loaded OK')

    # 3. Test builder page
    print('3. Testing builder...')
    page.goto('http://localhost:5173/resumes/builder')
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    page.screenshot(path=f'{SCREENSHOTS_DIR}/03-builder.png', full_page=True)
    print('   Builder loaded OK')

    # 4. Check for any console errors
    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    page.goto('http://localhost:5173/resumes/builder')
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    # 5. Test template gallery - check StylesPanel opens
    print('4. Testing Styles panel...')
    styles_btn = page.locator('button:has-text("Style")').first
    if styles_btn.is_visible():
        styles_btn.click()
        time.sleep(1)
        page.screenshot(path=f'{SCREENSHOTS_DIR}/04-styles-panel.png', full_page=True)
        print('   Styles panel opened OK')

        # 6. Click on Templates tab
        templates_tab = page.locator('button:has-text("Templates")').first
        if templates_tab.is_visible():
            templates_tab.click()
            time.sleep(1)
            page.screenshot(path=f'{SCREENSHOTS_DIR}/05-templates-tab.png', full_page=True)
            print('   Templates tab OK')

            # 7. Check template count
            template_btns = page.locator('[class*="rounded-lg border-2"]').all()
            print(f'   Found {len(template_btns)} template buttons')

            # 8. Click a new template
            if len(template_btns) > 5:
                template_btns[5].click()
                time.sleep(1)
                page.screenshot(path=f'{SCREENSHOTS_DIR}/06-template-selected.png', full_page=True)
                print('   Template selection OK')
    else:
        print('   Styles button not found')

    # 9. Test AI chat panel
    print('5. Testing AI chat...')
    ai_btn = page.locator('button:has-text("AI")').first
    if ai_btn.is_visible():
        ai_btn.click()
        time.sleep(1)
        page.screenshot(path=f'{SCREENSHOTS_DIR}/07-ai-chat.png', full_page=True)
        print('   AI chat panel opened OK')
    else:
        print('   AI button not found')

    # 10. Check for runtime errors
    if errors:
        print(f'\nConsole errors found: {len(errors)}')
        for e in errors[:5]:
            print(f'  - {e[:200]}')
    else:
        print('\nNo console errors found')

    browser.close()
    print('\nAll tests completed!')
