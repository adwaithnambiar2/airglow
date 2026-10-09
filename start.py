"""Serve Airglow on localhost using only Python's standard library."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import mimetypes
import webbrowser

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/javascript", ".mjs")

if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", 5005), handler)
    except OSError as error:
        raise SystemExit("Could not start port 5005. Stop another Airglow window and retry. " + str(error))
    print("Airglow is ready: http://127.0.0.1:5005")
    print("Keep this terminal open. Ctrl+C stops the server.")
    webbrowser.open("http://127.0.0.1:5005")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAirglow stopped.")
    finally:
        server.server_close()
