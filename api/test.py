"""Simple test endpoint for Vercel Python Functions"""

from http.server import BaseHTTPRequestHandler
import json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        response = {
            'status': 'ok',
            'message': 'Python API is working!',
            'runtime': 'python'
        }

        self.wfile.write(json.dumps(response).encode())
        return

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)

        try:
            body = json.loads(post_data.decode())

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            response = {
                'status': 'ok',
                'received': body,
                'message': 'Python POST is working!'
            }

            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            error_response = {
                'status': 'error',
                'error': str(e)
            }

            self.wfile.write(json.dumps(error_response).encode())

        return
