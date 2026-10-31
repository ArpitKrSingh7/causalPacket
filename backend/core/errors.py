class AnalysisError(Exception):
    """An intentionally safe error suitable for a client response."""

    def __init__(self, code: str, message: str, status: int = 422):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status
