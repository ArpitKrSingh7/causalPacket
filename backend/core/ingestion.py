"""Cap request bodies before multipart parsing can spool unbounded data."""
import asyncio
import json
from tempfile import SpooledTemporaryFile
from time import monotonic

from backend.core.config import DEFAULT_CONFIG


class BoundedBodyMiddleware:
    def __init__(self, app):
        self.app = app
        self.upload_gate = asyncio.Lock()

    async def reject(self, send, status, code, message):
        data = json.dumps({"error": {"code": code, "message": message}}).encode()
        await send({"type": "http.response.start", "status": status, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(data)).encode())]})
        await send({"type": "http.response.body", "body": data})

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST":
            return await self.app(scope, receive, send)
        origin = dict(scope["headers"]).get(b"origin")
        if origin is not None and origin not in (b"http://localhost:3000", b"http://127.0.0.1:3000"):
            return await self.reject(send, 403, "origin_not_allowed", "Use the local CausalPacket interface for analysis requests.")
        upload = scope["path"] == "/api/analyze"
        maximum = DEFAULT_CONFIG.max_file_bytes + 16 * 1024 if upload else 16 * 1024
        if upload and self.upload_gate.locked():
            return await self.reject(send, 429, "analysis_busy", "Another upload is being processed. Try again shortly.")
        if upload:
            await self.upload_gate.acquire()
        try:
            content_length = dict(scope["headers"]).get(b"content-length")
            if content_length is not None:
                try:
                    declared = int(content_length)
                    if declared < 0:
                        raise ValueError()
                except ValueError:
                    return await self.reject(send, 422, "invalid_request", "Invalid request length.")
                if declared > maximum:
                    return await self.reject(send, 413, "file_too_large", "Request exceeds its upload or context size limit.")
            with SpooledTemporaryFile(max_size=1024 * 1024, mode="w+b") as body:
                length, deadline = 0, monotonic() + 30
                while True:
                    try:
                        event = await asyncio.wait_for(receive(), max(.001, deadline - monotonic()))
                    except asyncio.TimeoutError:
                        return await self.reject(send, 408, "upload_timeout", "The request body took too long to arrive.")
                    if event["type"] == "http.disconnect":
                        return
                    chunk = event.get("body", b"")
                    length += len(chunk)
                    if length > maximum:
                        return await self.reject(send, 413, "file_too_large", "Request exceeds its upload or context size limit.")
                    body.write(chunk)
                    if not event.get("more_body", False):
                        break
                body.seek(0)
                replay_finished = False

                async def replay():
                    nonlocal replay_finished
                    if replay_finished:
                        return await receive()
                    chunk = body.read(65536)
                    more = body.tell() < length
                    replay_finished = not more
                    return {"type": "http.request", "body": chunk, "more_body": more}

                await self.app(scope, replay, send)
        finally:
            if upload:
                self.upload_gate.release()
