#!/usr/bin/env python3
import json
import mimetypes
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
HOST = os.environ.get("HYPERCUBE_HOST", "127.0.0.1")
PORT = int(os.environ.get("HYPERCUBE_PORT", "8000"))


class HyperCubeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/lmstudio/models":
            self.handle_models_proxy(parsed)
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/lmstudio/chat":
            self.handle_chat_proxy()
            return
        self.send_error(404, "Unknown endpoint")

    def guess_type(self, path):
        if path.endswith(".mjs"):
            return "text/javascript"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"

    def handle_models_proxy(self, parsed):
        target = parse_qs(parsed.query).get("target", [""])[0].strip()
        if not target:
            self.write_json({"error": "Missing target query parameter."}, status=400)
            return

        models_url = self.derive_models_url(target)
        self.forward_json_request("GET", models_url)

    def handle_chat_proxy(self):
        content_length = int(self.headers.get("Content-Length", "0") or "0")
        raw_body = self.rfile.read(content_length) if content_length else b""

        try:
            body = json.loads(raw_body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self.write_json({"error": "Invalid JSON body."}, status=400)
            return

        target = str(body.get("target", "")).strip()
        payload = body.get("payload")
        if not target or not isinstance(payload, dict):
            self.write_json({"error": "Expected JSON body with target and payload."}, status=400)
            return

        self.forward_json_request("POST", target, payload)

    def derive_models_url(self, target):
        parsed = urlparse(target)
        path = parsed.path or "/v1/chat/completions"
        if path.endswith("/chat/completions"):
            path = path[: -len("/chat/completions")] + "/models"
        else:
            path = "/v1/models"
        return parsed._replace(path=path, query="").geturl()

    def forward_json_request(self, method, url, payload=None):
        data = None
        headers = {"Accept": "application/json"}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = Request(url, data=data, headers=headers, method=method)
        try:
            with urlopen(req, timeout=180) as response:
                body = response.read()
                status = response.status
                content_type = response.headers.get("Content-Type", "application/json")
        except HTTPError as error:
            body = error.read() or json.dumps({"error": str(error)}).encode("utf-8")
            status = error.code
            content_type = error.headers.get("Content-Type", "application/json")
        except URLError as error:
            self.write_json({"error": str(error.reason)}, status=502)
            return
        except Exception as error:
            self.write_json({"error": str(error)}, status=500)
            return

        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def write_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    server = ThreadingHTTPServer((HOST, PORT), HyperCubeHandler)
    print(f"HyperCube server running at http://{HOST}:{PORT}")
    print("LM Studio proxy endpoints:")
    print(f"  GET  http://{HOST}:{PORT}/api/lmstudio/models?target=http://127.0.0.1:1234/v1/chat/completions")
    print(f"  POST http://{HOST}:{PORT}/api/lmstudio/chat")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
