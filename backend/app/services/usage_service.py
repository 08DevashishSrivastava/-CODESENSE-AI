import time
import uuid
from typing import List, Dict, Any
from ..schemas.responses import UsageRecord

class UsageService:
    def __init__(self):
        # In-memory storage for guest mode or offline analytics
        self._records: List[Dict[str, Any]] = []

    def record_usage(
        self,
        analysis_type: str,
        language: str,
        processing_time_ms: int,
        user_id: str = None
    ) -> UsageRecord:
        record_id = str(uuid.uuid4())
        created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        item = {
            "id": record_id,
            "user_id": user_id,
            "analysis_type": analysis_type,
            "language": language,
            "processing_time_ms": processing_time_ms,
            "created_at": created_at
        }
        self._records.append(item)
        if len(self._records) > 500:
            self._records.pop(0) # Keep memory bounded

        return UsageRecord(
            id=record_id,
            analysis_type=analysis_type,
            language=language,
            processing_time_ms=processing_time_ms,
            created_at=created_at
        )

    def get_records(self, user_id: str = None) -> List[UsageRecord]:
        results = []
        for r in reversed(self._records):
            if user_id is None or r.get("user_id") == user_id:
                results.append(UsageRecord(**r))
        return results

usage_service = UsageService()
