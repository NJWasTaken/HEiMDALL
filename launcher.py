"""
launcher.py

Starts the bundled Flask app (using Waitress) in a background thread,
waits until the server is reachable, then opens the default browser to the
app. This file is intended to be packaged with PyInstaller into a single EXE.
"""
import threading
import time
import socket
import webbrowser
import os
import sys


def find_free_port(default_port=8000):
    # Try default_port, otherwise find a free one
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('127.0.0.1', default_port))
        s.close()
        return default_port
    except OSError:
        s.close()
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
        s.close()
        return port


def is_port_free(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('127.0.0.1', port))
        s.close()
        return True
    except OSError:
        try:
            s.close()
        except Exception:
            pass
        return False


def wait_for_port(host, port, timeout=10.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.1)
    return False


def main():
    # Choose a port. You can make this configurable later.
    port_env = os.environ.get('PORT')
    if port_env:
        # If caller explicitly set PORT, prefer it and fail if it's already in use.
        try:
            port = int(port_env)
        except ValueError:
            print(f'Invalid PORT value: {port_env}. Falling back to 8000.')
            port = 8000

        if not is_port_free(port):
            print(f'ERROR: Requested port {port} is already in use. Exiting.')
            sys.exit(1)
    else:
        # No explicit PORT requested: try default (8000) and fall back to a free port if needed
        port = 8000
        try:
            port = find_free_port(port)
        except Exception:
            pass

    # Ensure the backend directory is on sys.path so imports inside backend
    # that expect to be run with backend as the CWD (like `from models.user ...`)
    # will resolve when we import backend as a package.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Ensure project root (script_dir) is on sys.path so `import backend.app`
    # resolves to the package inside the repo.
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)

    # Make sure current working directory is the project root (script_dir)
    os.chdir(script_dir)

    # Import the Flask app object directly from the backend.app module.
    from backend.app import app as flask_app

    # If running from PyInstaller bundle, ensure the app uses the extracted frontend
    if getattr(sys, 'frozen', False):
        base = sys._MEIPASS
        frontend_path = os.path.join(base, 'frontend')
        if os.path.isdir(frontend_path):
            flask_app.template_folder = frontend_path
            flask_app.static_folder = frontend_path
            flask_app.static_url_path = ''

    def run_server():
        # Use waitress for a production-ready server on Windows
        try:
            from waitress import serve
        except Exception:
            print('waitress not installed. Please install requirements.')
            # Fall back to Flask built-in server (not recommended for production)
            flask_app.run(host='127.0.0.1', port=port)
            return

        serve(flask_app, host='127.0.0.1', port=port)

    t = threading.Thread(target=run_server, daemon=True)
    t.start()

    host = '127.0.0.1'
    started = wait_for_port(host, port, timeout=15.0)
    url = f'http://{host}:{port}/'

    if started:
        print(f'Application running at {url}')
        # Only open the default browser when explicitly requested via
        # environment variable OPEN_BROWSER (useful for local testing).
        # Also respect NO_BROWSER which, if set, prevents opening the browser
        # (Electron sets NO_BROWSER when spawning the backend). By default
        # we DO NOT open the system browser so the Electron UI can host the app.
        no_browser = os.environ.get('NO_BROWSER', '').lower() in ('1', 'true', 'yes')
        open_browser = os.environ.get('OPEN_BROWSER', '').lower() in ('1', 'true', 'yes')
        if open_browser and not no_browser:
            try:
                webbrowser.open(url)
            except Exception:
                # Don't crash the launcher if opening the browser fails
                print('Failed to open system browser. Continuing without it.')
    else:
        print('Server failed to start within timeout. Check logs for details.')

    # Keep the main thread alive while the server runs. Ctrl+C will exit.
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print('Exiting...')


if __name__ == '__main__':
    main()
