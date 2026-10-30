"""Isolated loopback test fixture: switch two unmodified builds at one /weiqi/ origin."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse, json
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--current',required=True);p.add_argument('--port',type=int,default=4220);a=p.parse_args()
roots=[Path(a.base).resolve(),Path(a.current).resolve()];active=0
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_GET(self):
        global active
        if urlsplit(self.path).path=='/__ai_test_switch_to_current__':
            active=1;self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'build':'current'}).encode());return
        super().do_GET()
    def translate_path(self,path):
        name=unquote(urlsplit(path).path).removeprefix('/weiqi/').lstrip('/') or 'index.html'
        target=(roots[active]/name).resolve()
        return str(target if target.is_relative_to(roots[active]) else roots[active]/'not-found')
    def end_headers(self): self.send_header('Cache-Control','no-cache');super().end_headers()
print('Isolated upgrade fixture on 127.0.0.1:'+str(a.port),flush=True)
ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
