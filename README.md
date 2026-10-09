# Airglow ✧

### Draw beyond the screen.

A small creative playground that turns hand movements into glowing artwork. Pinch your thumb and index finger to draw, open them to lift the brush, and export your creation as a PNG.

![Airglow drawing studio with lilac, rose, and mint neon strokes](docs/preview.png)

**[Get started](#get-started) · [Try the brushes](#your-toolkit) · [How it works](#under-the-glow) · [Project notes](#project-notes)**

## Why this project?

Computer vision can be playful. Airglow explores a simple question: what happens when your hand becomes the interface? The result is a cozy drawing studio with soft colors, glowing strokes, and a camera mode that lets you sketch in the air.

Try writing your initials, drawing a constellation, or making something abstract with the Aurora brush. The **Try a little inspiration** button adds three example curves to get you started.

## Get started

You need Python 3.9 or newer and a modern browser with WebAssembly support. The project includes the hand-tracking library and model. **There are no Python packages to install.**

### Windows

1. Download and extract the project ZIP.
2. Open the extracted `airglow` folder.
3. Double-click **start_windows.bat**.
4. Your browser opens at **http://127.0.0.1:5005**.

Or run this from CMD in the project folder:

```bat
py start.py
```

### macOS / Linux

```bash
python3 start.py
```

Keep the terminal open while drawing. Press **Ctrl+C** in that terminal to stop the app. Use the local address above rather than opening `index.html` directly.

## Your first air drawing

1. Click **Camera** and allow your browser to use the webcam.
2. Hold one hand in view with enough light and a simple background.
3. Bring your thumb and index finger together. Move your index fingertip to draw.
4. Separate your fingers to lift the brush and move to another spot.
5. Click **Export PNG** to save your artwork.

Camera mode tracks one hand at a time. **Mouse** mode is available immediately: click and drag on the canvas. Touch drawing also works through pointer events.

> Drawings live in memory. Export anything you want to keep before refreshing or closing the page.

## Your toolkit

| Tool | What it does |
| --- | --- |
| Neon glow | A luminous stroke with a soft halo |
| Soft ink | Clean lines without the glow |
| Aurora | Color shifts along the stroke |
| Eraser | Removes painted pixels while preserving undo history |
| Seven colors | Lilac, rose, peach, sunbeam, mint, sky, and snow |
| Brush size | Adjust thickness from 2 to 32 pixels |
| Canvas mood | Midnight, Daydream, or a transparent PNG export |
| Undo / redo | Step backward and forward through strokes, erasing, and clearing |
| Camera backdrop | Show or hide the live video behind your drawing |
| Expand canvas | Enter fullscreen drawing mode |

PNG export includes your drawing and selected background. Camera video, the tracking overlay, grid, and interface controls are excluded. Transparent export keeps erased areas transparent.

<details>
<summary><strong>Keyboard shortcuts</strong></summary>

| Shortcut | Action |
| --- | --- |
| Ctrl+Z / Cmd+Z | Undo |
| Ctrl+Y / Cmd+Y | Redo |
| Ctrl+Shift+Z / Cmd+Shift+Z | Redo |
| E | Export PNG |

</details>

## Under the glow

Airglow runs inference locally in your browser using Google's pretrained **MediaPipe Hand Landmarker**. It predicts 21 hand landmarks from camera frames. The app follows the index fingertip and compares thumb-to-index distance against palm size to decide whether you are pinching.

Separate start and release thresholds reduce rapid switching around the pinch boundary. Smoothing helps steady the brush, and camera coordinates are mirrored and adjusted to match the cropped video backdrop. Detection is capped at roughly 20 updates per second; actual speed depends on your device.

The drawing engine stores normalized stroke coordinates so artwork can be redrawn when the canvas changes size. Undo and redo operate on those strokes. A clear action adds a history marker, allowing the previous artwork to be restored.

| Part | Technology |
| --- | --- |
| Hand tracking | MediaPipe Tasks Vision 0.10.21 + pretrained Hand Landmarker |
| Rendering | HTML Canvas 2D |
| Interface | HTML, CSS, JavaScript modules |
| Local server | Python standard library |
| Unit tests | Node.js built-in test runner |

This project uses a pretrained model for inference. No model training or fine-tuning is performed.

## Camera and privacy

Camera access starts when you select **Camera**. The app requests video only, processes frames in your browser, and contains no frame-upload endpoint or analytics. Switching to Mouse or hiding the browser tab stops the camera stream. You can restart it by selecting Camera again.

All runtime assets are included. After downloading the project, the app makes no external network requests for hand tracking. Initial loading can take a few seconds. The bundled WebAssembly runtime and model account for most of the download size.

## Project notes

**AI assistance:** AI helped generate the initial implementation and visual design, debug the code, create tests, and draft documentation. This repository is an AI-assisted learning project. The bundled hand-tracking model is Google's pretrained model.

**Verified:** nine unit tests passed. Browser checks covered mouse drawing, undo/redo, undoable clearing, example curves, PNG downloads, mobile layout, and actual model initialization and inference using simulated camera frames. These checks do not validate physical webcam gesture accuracy. See [verification.json](reports/verification.json).

**Current limitations:** pinch thresholds are fixed; low light and occlusion can disrupt tracking. Model inference runs synchronously on the main thread, so slower hardware may feel less responsive. Long sessions accumulate stroke history in memory. Drawings are not automatically saved. This is a local creative demo.

## Explore the code

| File | Purpose |
| --- | --- |
| `index.html` | Studio layout and controls |
| `static/style.css` | Responsive styling |
| `static/app.js` | Camera lifecycle, gestures, UI, export |
| `static/core.js` | Stroke history, coordinate mapping, pinch logic, rendering |
| `start.py` | Local HTTP server |
| `start_windows.bat` | Windows launcher |
| `tests/core.test.js` | Drawing and gesture unit tests |
| `tests/browser_smoke.py` | Optional browser verification |
| `vendor/mediapipe/` | Bundled third-party runtime and model |

### Run the unit tests

Node.js 20 or newer is needed for development tests, but is not required to use the app.

```bash
npm test
```

Optional browser checks require Python Playwright:

```bash
python -m pip install playwright==1.51.0
python -m playwright install chromium
python tests/browser_smoke.py
```

## If something feels off

<details>
<summary><strong>The launcher closes or Python is missing</strong></summary>

Open CMD in the project folder and run `py start.py` to see the error. If the Python launcher is unavailable, try `python start.py`. Install Python if neither command is recognized.

</details>

<details>
<summary><strong>Camera access is denied or no webcam is found</strong></summary>

Use `http://127.0.0.1:5005`, allow camera access in the browser's site settings, and close other apps using the webcam. Mouse drawing remains available. If another computer accesses this app through a non-local address, camera permissions require HTTPS.

</details>

<details>
<summary><strong>Tracking is shaky or the brush keeps lifting</strong></summary>

Use brighter lighting, keep the full hand in frame, and pinch clearly. Try a slower movement and keep the hand away from the frame edges. Turning off the camera backdrop changes visibility, not inference speed.

</details>

<details>
<summary><strong>Port 5005 is already in use</strong></summary>

Close the previous Airglow terminal with Ctrl+C and start again. Alternatively, change `5005` consistently in `start.py` and open the matching address.

</details>

## Credits and license

Project code is available under the [MIT License](LICENSE). Bundled MediaPipe components retain their [Apache 2.0 license](vendor/mediapipe/LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for sources and attribution.

[MediaPipe Hand Landmarker documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js)

**Make something that only your hand could make. ✧**
