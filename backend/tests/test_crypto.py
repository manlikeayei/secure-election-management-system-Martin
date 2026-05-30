"""Tests for AES-256 encryption utilities."""
import pytest
from crypto_utils import aes_encrypt, aes_decrypt, hash_sensitive_data


class TestCrypto:
    def test_encrypt_decrypt_roundtrip(self):
        plaintext = "John Doe's SSN: 123-45-6789"
        encrypted = aes_encrypt(plaintext)
        assert encrypted is not None
        assert encrypted != plaintext
        decrypted = aes_decrypt(encrypted)
        assert decrypted == plaintext
    
    def test_encrypt_empty(self):
        assert aes_encrypt('') is None
        assert aes_decrypt('') is None
    
    def test_encrypt_none(self):
        assert aes_encrypt(None) is None
        assert aes_decrypt(None) is None
    
    def test_encrypt_long_text(self):
        long_text = "A" * 10000
        encrypted = aes_encrypt(long_text)
        decrypted = aes_decrypt(encrypted)
        assert decrypted == long_text
    
    def test_encrypt_special_chars(self):
        text = "!@#$%^&*()_+-=[]{}|;':\",./<>?\n\t\r"
        encrypted = aes_encrypt(text)
        decrypted = aes_decrypt(encrypted)
        assert decrypted == text
    
    def test_hash_sensitive_data(self):
        data = "sensitive-data-123"
        h1 = hash_sensitive_data(data)
        h2 = hash_sensitive_data(data)
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex
        assert h1 != hash_sensitive_data("different-data")
    
    def test_decrypt_invalid_data(self):
        result = aes_decrypt("not-valid-base64!!!")
        assert result is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
