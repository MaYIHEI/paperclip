#!/usr/bin/env python3
"""NodeSeek attendance relay — CF bypass via server-side curl POST"""
import os, json, subprocess, base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

API_KEY  = os.environ.get('NS_KEY', '')
PORT     = int(os.environ.get('NS_PORT', '3001'))
UA_DEF   = ('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) '
            'AppleWebKit/605.1.15 (KHTML, like Gecko) '
            'Version/18.5 Mobile/15E148 Safari/604.1')


def attend(cookie, ua, random_val, rid='-'):
    rand = 'true' if random_val else 'false'
    url  = 'https://www.nodeseek.com/api/attendance?random=' + rand
    r = subprocess.run(
        ['curl', '-s', '-X', 'POST',
         '-H', 'Cookie: '     + cookie,
         '-H', 'User-Agent: ' + ua,
         '-H', 'Content-Type: text/plain;charset=UTF-8',
         '-H', 'Origin: https://www.nodeseek.com',
         '-H', 'Referer: https://www.nodeseek.com/',
         '-d', '', url,
         '-w', '\n===CODE:%{http_code}===',
         '--max-time', '25'],
        capture_output=True, timeout=35)
    raw = r.stdout.decode('utf-8', 'replace')
    parts = raw.rsplit('\n===CODE:', 1)
    body = parts[0].strip() if len(parts) == 2 else raw.strip()
    code = parts[1].rstrip('=').strip() if len(parts) == 2 else '?'
    print(f'[attend] rid={rid} code={code} body={body[:200]!r}', flush=True)
    return body


def normalize_body(body):
    try:
        data = json.loads(body or '{}')
    except Exception:
        return json.dumps({
            'state': 'unconfirmed',
            'raw_b64': base64.b64encode((body or '').encode()).decode(),
        }, separators=(',', ':')).encode()

    msg = data.get('message')
    if isinstance(msg, str):
        data['message_b64'] = base64.b64encode(msg.encode()).decode()
        data.pop('message', None)

    if data.get('success') is True:
        data['state'] = 'success'
    elif data.get('success') is False:
        data['state'] = 'failed'
    elif not data:
        data['state'] = 'empty'
    else:
        data['state'] = 'unconfirmed'

    return json.dumps(data, ensure_ascii=True, separators=(',', ':')).encode()


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.request.settimeout(12)

    def log_message(self, *a): pass

    def do_GET(self):
        if self.path in ('/health', '/attend'):
            return self._send(200, b'{"ok":true,"service":"ns-relay"}')
        return self._send(404, b'{"error":"not found"}')

    def do_POST(self):
        if self.path != '/attend':
            return self._send(404, b'{"error":"not found"}')
        if self.headers.get('x-api-key') != API_KEY:
            return self._send(401, b'{"error":"unauthorized"}')
        n = int(self.headers.get('content-length', 0))
        try:
            req = json.loads(self.rfile.read(n))
        except Exception:
            return self._send(400, b'{"error":"bad json"}')
        cookie = req.get('cookie', '')
        ua     = req.get('ua', UA_DEF)
        rand   = req.get('random', False)
        rid    = req.get('rid', '-')
        if not cookie or 'pjwt' not in cookie:
            return self._send(400, b'{"error":"missing pjwt"}')
        try:
            body = attend(cookie, ua, rand, rid)
            if 'challenge-platform' in body or 'Just a moment' in body:
                return self._send(502, b'{"error":"cf_block"}')
            payload = normalize_body(body)
            print(f'[relay] rid={rid} send_len={len(payload)} send_body={payload[:200]!r}', flush=True)
            self._send(200, payload)
        except Exception as e:
            self._send(500, json.dumps({'error': str(e)[:120]}).encode())

    def _send(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    if not API_KEY:
        raise SystemExit('NS_KEY env var required')
    server = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print('[ns-relay] :' + str(PORT))
    server.serve_forever()
