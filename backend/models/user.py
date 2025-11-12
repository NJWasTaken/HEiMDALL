import csv
import os
import json
import sys
import bcrypt


def default_data_dir():
    """Return a sensible per-user data directory for Heimdall.
    On Windows this is %APPDATA%\Heimdall. On other OSes, use ~/.local/share/Heimdall.
    """
    if os.name == 'nt':
        base = os.getenv('APPDATA') or os.path.expanduser('~')
        return os.path.join(base, 'Heimdall')
    else:
        base = os.getenv('XDG_DATA_HOME') or os.path.join(os.path.expanduser('~'), '.local', 'share')
        return os.path.join(base, 'heimdall')


class User:
    def __init__(self):
        # Determine a portable-first data directory.
        # Priority:
        # 1. HEIMDALL_DATA_DIR env var (explicit override)
        # 2. If running frozen (bundled exe) and the exe folder is writable -> use exe folder
        # 3. Fallback to per-user APPDATA / XDG data dir

        env_override = os.getenv('HEIMDALL_DATA_DIR')
        if env_override:
            data_dir = env_override
        else:
            # If bundled as an executable, prefer the exe directory when writable
            if getattr(sys, 'frozen', False):
                exe_dir = os.path.dirname(sys.executable)
                # allow forcing portable even if not writable
                force_portable = os.getenv('HEIMDALL_PORTABLE', '') in ('1', 'true', 'yes')
                if os.access(exe_dir, os.W_OK) or force_portable:
                    data_dir = exe_dir
                else:
                    data_dir = default_data_dir()
            else:
                # development: use repo-local models folder if explicitly requested,
                # otherwise use per-user data dir so dev and packaged behave similarly
                data_dir = default_data_dir()

        os.makedirs(data_dir, exist_ok=True)

        # Expose the data dir for diagnostics and possible overrides
        self.app_data_dir = data_dir

        self.file_path = os.path.join(self.app_data_dir, 'users.csv')
        self.profiles_path = os.path.join(self.app_data_dir, 'profiles.json')
        self._ensure_files_exist()

    def _ensure_files_exist(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['username', 'password'])

        if not os.path.exists(self.profiles_path):
            with open(self.profiles_path, 'w') as f:
                json.dump({}, f)
                
    def create_user(self, username, password):
        if self.get_user(username):
            return False, "Username already exists"
        
        with open(self.file_path, 'a', newline='') as f:
            writer = csv.writer(f)
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            writer.writerow([username, hashed_password])
        return True, "User created successfully"

    def get_user(self, username):
        with open(self.file_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['username'] == username:
                    return row
        return None

    def validate_login(self, username, password):
        user = self.get_user(username)
        if not user:
            return False

        stored = user.get('password', '')
        try:
            if isinstance(stored, str):
                stored_bytes = stored.encode('utf-8')
            else:
                stored_bytes = stored
            return bcrypt.checkpw(password.encode('utf-8'), stored_bytes)
        except (ValueError, TypeError):
            return False
    
    def get_profiles(self, username):
        with open(self.profiles_path, 'r') as f:
            profiles = json.load(f)
            return profiles.get(username, [])

    def save_profiles(self, username, profiles):
        with open(self.profiles_path, 'r') as f:
            all_profiles = json.load(f)
        
        all_profiles[username] = profiles
        
        with open(self.profiles_path, 'w') as f:
            json.dump(all_profiles, f)
        return True
