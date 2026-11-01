"""Explicit hosting settings; defaults preserve the local-only interface policy."""
import os
from urllib.parse import urlsplit

LOCAL_ORIGINS = ('http://localhost:3000', 'http://127.0.0.1:3000')


def allowed_origins():
    value = os.environ.get('CAUSALPACKET_ALLOWED_ORIGINS', '').strip()
    if not value:
        return LOCAL_ORIGINS
    origins = []
    for raw in value.split(','):
        try:
            raw = raw.strip()
            parts = urlsplit(raw)
            if (not raw or '*' in raw or any(char.isspace() for char in raw)
                    or parts.scheme not in ('http', 'https') or not parts.hostname
                    or parts.username is not None or parts.password is not None
                    or parts.path not in ('', '/') or parts.query or parts.fragment):
                raise ValueError()
            host = parts.hostname.encode('idna').decode('ascii').lower()
            port = parts.port
            if ':' in host:
                host = '[' + host + ']'
            origin = parts.scheme + '://' + host
            if port is not None and port != (443 if parts.scheme == 'https' else 80):
                origin += ':' + str(port)
        except (ValueError, UnicodeError):
            raise ValueError('CAUSALPACKET_ALLOWED_ORIGINS must contain comma-separated exact HTTP(S) origins, without credentials, wildcards, paths, queries or fragments.') from None
        if origin not in origins:
            origins.append(origin)
    if len(origins) > 32:
        raise ValueError('Configure at most 32 exact frontend origins.')
    return tuple(origins)


def lab_timeout_seconds():
    try:
        seconds = int(os.environ.get('CAUSALPACKET_LAB_TIMEOUT_SECONDS', '20'))
        if not 1 <= seconds <= 60:
            raise ValueError()
        return seconds
    except ValueError:
        raise ValueError('CAUSALPACKET_LAB_TIMEOUT_SECONDS must be an integer from 1 to 60.') from None
