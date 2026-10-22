"""Deterministic sample telemetry generator; not a full simulator service."""
import json, random
from datetime import datetime, timezone
rng = random.Random(365)
for i, watts in enumerate([35, 70, 110], start=1):
    on = bool(rng.getrandbits(1))
    print(json.dumps({"deviceId": f"SIM-{i:04d}", "timestamp": datetime.now(timezone.utc).isoformat(), "online": True, "reportedOn": on, "powerWatts": round(watts * rng.uniform(.97, 1.03), 2) if on else 0, "faultCodes": [], "source": "SIMULATOR"}))
