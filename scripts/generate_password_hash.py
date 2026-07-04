"""
Generate a bcrypt hash of your dashboard password.
Store the result as DASHBOARD_PASSWORD_HASH in your Replit Secrets and GitHub Secrets.

Usage:
  pip install bcrypt
  python scripts/generate_password_hash.py
"""

import getpass

try:
    import bcrypt
except ImportError:
    print("Install bcrypt: pip install bcrypt")
    raise

password = getpass.getpass("Enter dashboard password: ")
confirm = getpass.getpass("Confirm password: ")

if password != confirm:
    print("Passwords do not match!")
    exit(1)

hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
print("\n" + "="*60)
print("Your DASHBOARD_PASSWORD_HASH (save as GitHub/Replit Secret):")
print("="*60)
print(hashed)
print("="*60)
