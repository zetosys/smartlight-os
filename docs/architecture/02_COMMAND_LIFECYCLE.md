# Asynchronous Command Lifecycle Specification

## 1. Lifecycle State Machine

A command submitted to SmartLight OS transitions through the following discrete, auditable states:

```
                  +----------------+
                  |     QUEUED     |  (Received, validated, idempotency verified)
                  +-------+--------+
                          |
                          v
                  +----------------+
                  |      SENT      |  (Dispatched to DeviceAdapter/Transport)
                  +-------+--------+
                          |
         +----------------+----------------+
         |                                 |
         v                                 v
+------------------+             +-------------------+
|   ACKNOWLEDGED   |             |   FAILED/TIMEOUT  |  (Adapter rejected or
+--------+---------+             +-------------------+   gateway unreachable)
         |
         | (Telemetry event confirms reported state == desired state)
         v
+------------------+
|    CONFIRMED     |
+------------------+
```

### State Definitions

1. **`QUEUED`**: The API has received the command, validated operator permissions, verified target device capabilities, and stored the command with a unique `(ulb_id, idempotency_key)`.
2. **`SENT`**: The command has been popped from the command queue and forwarded to the appropriate `DeviceAdapter`.
3. **`ACKNOWLEDGED`**: The adapter or field gateway has received the command and replied with an acceptance code. **Crucial Note:** ACKNOWLEDGED does **NOT** equal physical switching. It only confirms the transport delivery.
4. **`CONFIRMED`**: Telemetry reporting from the device indicates the luminaire's physical state (`reportedOn`) matches the commanded desired state.
5. **`FAILED`**: The adapter or transport explicitly rejected the command (e.g. invalid syntax, offline controller).
6. **`TIMED_OUT`**: No acknowledgment or telemetry confirmation was received within the SLA threshold window (configurable, default 60s).

## 2. Idempotency Guarantees
- The API enforces a compound unique constraint on `(ulb_id, idempotency_key)`.
- If an operator or automated schedule re-submits a command with the same idempotency key within the deduplication window, the server returns the existing command record with HTTP 200 (or HTTP 202) instead of queuing a duplicate physical operation.
