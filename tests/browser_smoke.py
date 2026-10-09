import json, threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
    page=browser.new_page(viewport={'width':1440,'height':1020},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}')
    page.wait_for_selector('.swatch')
    page.screenshot(path=str(root/'docs/welcome.png'),full_page=True)
    r=page.locator('#stage').bounding_box()
    page.mouse.move(r['x']+r['width']*.2,r['y']+r['height']*.3)
    page.mouse.down()
    page.mouse.move(r['x']+r['width']*.6,r['y']+r['height']*.7,steps=20)
    page.mouse.up()
    assert page.locator('#stroke-count').inner_text()=='1 stroke'
    page.locator('#undo').click()
    assert page.locator('#stroke-count').inner_text()=='0 strokes'
    page.locator('#redo').click()
    assert page.locator('#stroke-count').inner_text()=='1 stroke'
    page.locator('#clear').click();page.locator('#confirm-clear').click()
    assert page.locator('#stroke-count').inner_text()=='0 strokes'
    page.locator('#undo').click()
    assert page.locator('#stroke-count').inner_text()=='1 stroke'
    page.locator('#clear').click();page.locator('#confirm-clear').click()
    page.locator('#demo').click()
    assert page.locator('#stroke-count').inner_text()=='3 strokes'
    page.locator('#toast').evaluate("e=>e.classList.remove('visible')")
    page.mouse.move(0,0)
    page.wait_for_timeout(300)
    page.screenshot(path=str(root/'docs/preview.png'),full_page=True)
    with page.expect_download() as download:
        page.locator('#export').click()
    download.value.save_as(str(root/'reports/export-test.png'))
    page.locator('#paper').select_option('transparent')
    with page.expect_download() as download:
        page.locator('#export').click()
    download.value.save_as(str(root/'reports/transparent-test.png'))
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(root/'reports/mobile-test.png'),full_page=True)
    print(json.dumps({'browser_errors':errors,'mouse_history_clear_demo_export_mobile':'passed'}))
    assert not errors
    # Verify the pinned browser library can initialize the actual model.
    page.set_default_timeout(60000)
    page.locator('#camera-mode').click()
    page.wait_for_function("document.querySelector('#camera-mode').disabled===false",timeout=90000)
    page.wait_for_function("document.querySelector('#gesture-label').textContent==='LOOKING FOR YOUR HAND'",timeout=30000)
    print('Actual bundled model initialized; inference on simulated camera frames passed.')
    page.locator('#pointer-mode').click()
    assert page.locator('#mode-label').inner_text()=='MOUSE STUDIO'
    assert page.locator('#video').evaluate('e=>e.srcObject===null')
    browser.close()
server.shutdown()
