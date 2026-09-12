import hashlib
import os
import zlib


class FingerprintService:
    @staticmethod
    def compute_fingerprint(file_path: str, column_count: int = 0) -> str:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found for fingerprinting: {file_path}")

        file_size = os.path.getsize(file_path)

        # 1. Read first 64KB for header SHA256
        with open(file_path, "rb") as f:
            header_bytes = f.read(65536)
            header_hash = hashlib.sha256(header_bytes).hexdigest()

            # 2. Read last 64KB for tail CRC32
            if file_size > 65536:
                f.seek(max(0, file_size - 65536))
                tail_bytes = f.read(65536)
            else:
                tail_bytes = header_bytes
            tail_crc = zlib.crc32(tail_bytes)

        # 3. Composite formulation
        raw_composite = f"{header_hash}:{file_size}:{column_count}:{tail_crc}".encode()
        return hashlib.sha256(raw_composite).hexdigest()
