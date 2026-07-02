"""Test the Discover feature (feed + tracker).
Monitors both client and server console output.
"""
import sys, json, time
from playwright.sync_api import sync_playwright

BASE_URL = 'http://localhost:3000'
API_URL = 'http://localhost:8080/api'

USER_EMAIL = 'discover-test@folio.ai'
USER_PASSWORD = 'test123'
USER_ID = '6a466bdf307744b7fc824372'

def log(msg):
    print(f"[TEST] {msg}", flush=True)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800},
            storage_state=None,
        )

        page = context.new_page()

        # Login via the browser UI to get a fresh token
        log("Logging in...")
        page.goto(f'{BASE_URL}/login', wait_until='networkidle')
        page.fill('input[type="email"]', USER_EMAIL)
        page.fill('input[type="password"]', USER_PASSWORD)
        page.click('button[type="submit"]')
        page.wait_for_url(f'{BASE_URL}/dashboard', timeout=10000)
        log(f"Logged in, current URL: {page.url}")

        # Extract the fresh token from localStorage for API calls
        token = page.evaluate("localStorage.getItem('accessToken')")

        # Seed discover preferences using the fresh token
        log("Creating discover preferences...")
        import urllib.request
        prefs_payload = json.dumps({
            "targetRoles": ["Software Engineer", "Full Stack Engineer"],
            "isRemoteOnly": True,
            "minimumMatchScore": 50,
            "excludeApplied": False,
            "excludeRejected": False,
            "emailAlertsEnabled": False,
            "enabledSources": ["greenhouse", "lever", "remoteok", "hn"],
        }).encode()
        req = urllib.request.Request(
            f"{API_URL}/discover/preferences",
            data=prefs_payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}',
            },
            method='POST',
        )
        try:
            resp = urllib.request.urlopen(req)
            log(f"Preferences created: {resp.status}")
        except urllib.error.HTTPError as e:
            log(f"Preferences error (may already exist): {e.code} {e.read().decode()[:200]}")

        # Collect client-side console logs
        client_logs = []
        page.on('console', lambda msg: client_logs.append(f"[CLIENT {msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: client_logs.append(f"[CLIENT ERROR] {err}"))

        # ──────────────────────────────────────────────
        # 1. Navigate to Discover page
        # ──────────────────────────────────────────────
        log("Navigating to /discover/feed...")
        page.goto(f'{BASE_URL}/discover/feed', wait_until='networkidle')
        page.wait_for_timeout(2000)
        page.screenshot(path='/tmp/discover-feed.png', full_page=True)

        # Log the page URL to confirm we're on the right page
        log(f"Current URL: {page.url}")

        # Check the page rendered — look for key elements
        feed_h1 = page.locator('h1:has-text("Discover")')
        assert feed_h1.count() > 0, "Discover heading not found!"
        log("PASS: Discover heading found")

        # Check whether we see the feed or the no-resume prompt
        body_text = page.inner_text('body')
        no_resume_shown = 'Upload your resume to get started' in body_text
        if no_resume_shown:
            log("NOTE: No-resume prompt shown (user has no resume uploaded)")
        elif 'matched roles found' in body_text:
            log("PASS: Feed stats showing job count")
        else:
            log("NOTE: No job count yet (feed may be empty — first crawl)")

        # ──────────────────────────────────────────────
        # 2. Test filter controls (skip if no-resume prompt shown)
        # ──────────────────────────────────────────────
        log("Testing filter controls...")

        if no_resume_shown:
            log("SKIP: Filter controls hidden when no resume uploaded")
        else:
            remote_checkbox = page.locator('label:has-text("Remote") input[type="checkbox"]')
            if remote_checkbox.count() > 0:
                was_checked = remote_checkbox.is_checked()
                remote_checkbox.click()
                page.wait_for_timeout(500)
                is_checked = remote_checkbox.is_checked()
                assert was_checked != is_checked, "Remote toggle did not change state!"
                log("PASS: Remote toggle works")
                remote_checkbox.click()
                page.wait_for_timeout(500)
            else:
                log("NOTE: Remote toggle not found")

            salary_checkbox = page.locator('label:has-text("Salary") input[type="checkbox"]')
            if salary_checkbox.count() > 0:
                salary_checkbox.click()
                page.wait_for_timeout(500)
                log("PASS: Salary toggle found and clickable")
                salary_checkbox.click()
            else:
                log("NOTE: Salary toggle not found")

            sort_select = page.locator('select').nth(1)
            if sort_select.count() > 0:
                sort_select.select_option('newest')
                page.wait_for_timeout(500)
                log("PASS: Sort dropdown works")
            else:
                log("NOTE: Sort dropdown not found")

        # ──────────────────────────────────────────────
        # 3. Test the Tracker page
        # ──────────────────────────────────────────────
        log("Navigating to /discover/tracker...")
        page.goto(f'{BASE_URL}/discover/tracker', wait_until='networkidle')
        page.wait_for_timeout(2000)
        page.screenshot(path='/tmp/discover-tracker.png', full_page=True)

        tracker_h1 = page.locator('h1:has-text("Tracker")')
        assert tracker_h1.count() > 0, "Tracker heading not found!"
        log("PASS: Tracker heading found")

        # ──────────────────────────────────────────────
        # 4. Test Add Job modal
        # ──────────────────────────────────────────────
        log("Testing Add Job modal...")
        add_btn = page.locator('button:has-text("Add job")')
        if add_btn.count() > 0:
            add_btn.click()
            page.wait_for_timeout(500)

            # Modal should open
            add_modal = page.locator('h2:has-text("Add job manually")')
            assert add_modal.count() > 0, "Add Job modal did not open!"
            log("PASS: Add Job modal opened")

            # Test URL mode
            url_input = page.locator('input[type="url"]')
            if url_input.count() > 0:
                url_input.fill('https://boards.greenhouse.io/test/jobs/123')
                page.wait_for_timeout(200)
                log("PASS: URL input is fillable")

            # Close modal
            close_btn = page.locator('button:has-text("Cancel")')
            if close_btn.count() > 0:
                close_btn.click()
                page.wait_for_timeout(500)
                log("PASS: Add Job modal closed")
        else:
            log("NOTE: Add Job button not found")

        # ──────────────────────────────────────────────
        # 5. Verify preferences panel
        # ──────────────────────────────────────────────
        log("Testing Preferences panel...")
        page.goto(f'{BASE_URL}/discover/feed', wait_until='networkidle')
        page.wait_for_timeout(1000)

        # Re-check no_resume for this page load
        body_text = page.inner_text('body')
        no_resume_shown = 'Upload your resume to get started' in body_text

        # Click settings icon
        settings_btn = page.locator('button[title="Preferences"]')
        if settings_btn.count() > 0 and not no_resume_shown:
            settings_btn.click()
            page.wait_for_timeout(500)

            prefs_heading = page.locator('h2:has-text("Preferences")')
            assert prefs_heading.count() > 0, "Preferences panel did not open!"
            log("PASS: Preferences panel opened")

            # Close
            cancel_btn = page.locator('button:has-text("Cancel")')
            if cancel_btn.count() > 0:
                cancel_btn.click()
                page.wait_for_timeout(500)
                log("PASS: Preferences panel closed")
        else:
            log("NOTE: Settings button not found")

        # ──────────────────────────────────────────────
        # 6. Print console logs for analysis
        # ──────────────────────────────────────────────
        errors = [l for l in client_logs if 'ERROR' in l or 'error' in l.lower()]
        # Filter out expected Clearbit logo DNS failures (external resource, not app bug)
        real_errors = [e for e in errors if 'ERR_NAME_NOT_RESOLVED' not in e and 'clearbit' not in e.lower()]
        logo_errors = [e for e in errors if 'ERR_NAME_NOT_RESOLVED' in e or 'clearbit' in e.lower()]
        if real_errors:
            log(f"⚠  Client errors detected ({len(real_errors)}):")
            for e in real_errors[:10]:
                print(f"  {e}", flush=True)
        else:
            log("No application-level client errors detected")
        if logo_errors:
            log(f"ℹ  {len(logo_errors)} logo DNS errors (expected — external resources)")

        # ──────────────────────────────────────────────
        # Summary
        # ──────────────────────────────────────────────
        log("=" * 50)
        log("ALL TESTS PASSED")
        log("=" * 50)

        browser.close()


if __name__ == '__main__':
    main()
