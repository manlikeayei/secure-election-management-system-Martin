"""AES-256 encryption utilities for securing sensitive data."""
import base64
import hashlib
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from config import Config


def _get_key():
    """Derive a 32-byte AES-256 key from the configured key material."""
    key_material = Config.AES_KEY.encode('utf-8')
    return hashlib.sha256(key_material).digest()


def aes_encrypt(plaintext: str) -> str:
    """Encrypt plaintext using AES-256-GCM and return base64 encoded ciphertext."""
    if not plaintext:
        return None
    
    key = _get_key()
    iv = os.urandom(12)  # 96-bit IV for GCM
    
    encryptor = Cipher(
        algorithms.AES(key),
        modes.GCM(iv),
        backend=default_backend()
    ).encryptor()
    
    ciphertext = encryptor.update(plaintext.encode('utf-8')) + encryptor.finalize()
    
    # Combine IV + tag + ciphertext
    combined = iv + encryptor.tag + ciphertext
    return base64.b64encode(combined).decode('utf-8')


def aes_decrypt(encoded_data: str) -> str:
    """Decrypt AES-256-GCM encrypted data from base64 string."""
    if not encoded_data:
        return None
    
    try:
        combined = base64.b64decode(encoded_data.encode('utf-8'))
        
        iv = combined[:12]
        tag = combined[12:28]
        ciphertext = combined[28:]
        
        key = _get_key()
        
        decryptor = Cipher(
            algorithms.AES(key),
            modes.GCM(iv, tag),
            backend=default_backend()
        ).decryptor()
        
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        return plaintext.decode('utf-8')
    except Exception:
        return None


def hash_sensitive_data(data: str) -> str:
    """Create a SHA-256 hash of sensitive data for integrity verification."""
    return hashlib.sha256(data.encode('utf-8')).hexdigest()
