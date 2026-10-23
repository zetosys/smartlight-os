# Command Lifecycle & Control Orchestration

## 1. Asynchronous Command State Machine

Commands dispatched through SmartLight OS do not block HTTP connections waiting for physical field relays to cycle. Instead, commands progress through a formal 6-stage asynchronous state machine:

```
                  +--------------------------------+
                  |             QUEUED             |  (Validated, permissions verified,
                  +---------------+----------------+   idempotency deduplication check)
                                  |
                                  v
                  +--------------------------------+
                  |              SENT              |  (Popped from BullMQ queue, passed
                  +---------------+----------------+   to DeviceAdapter for transport)
                                  |
                 +----------------+----------------+
                 |                                 |
                 v                                 v
+---------------------------------+      +---------------------------------+
|          ACKNOWLEDGED           |      |          FAILED/TIMEOUT         |  (Gateway unreachable,
+----------------+----------------+      +---------------------------------+   protocol error, invalid payload)
                 |
                 | (Continuous telemetry stream confirms reported state == desired state)
                 v
+---------------------------------+
|            CONFIRMED            |  (Contractor closed, physical power drawing,
+---------------------------------+   light output verified)
```

### State Definitions & Semantics

| State | Transition Trigger | Physical Meaning |
| :--- | :--- | :--- |
| **`QUEUED`** | `POST /commands` or `POST /commands/batch` received | Request validated, tenant permissions asserted, idempotency key reserved in DB. |
| **`SENT`** | BullMQ worker dispatches command to `DeviceAdapter` | Payload converted to protocol format and transmitted over MQTT / cellular socket. |
| **`ACKNOWLEDGED`**| Downstream gateway or broker returns delivery ACK | Transport receipt confirmed. **Important:** Relay may not have actuated yet. |
| **`CONFIRMED`** | Ingested telemetry confirms `reported_on == desired_on` | Physical light output confirmed via active current / wattage measurement. |
| **`FAILED`** | Adapter returns explicit error (e.g., CRC error, offline) | Command abandoned; error code and stack trace logged to audit log. |
| **`TIMED_OUT`** | No telemetry confirmation received within SLA window | Device flagged as unresponsive; diagnostic ticket auto-generated. |

---

## 2. Bulk CCMS Feeder Switching Engine

In municipal streetlight operations, streetlights are organized into electrical branch circuits powered by Centralized Control & Monitoring System (**CCMS**) feeder panels. Rather than blasting thousands of individual wireless packets, operators switch entire feeders or phases simultaneously.

### Batch Execution Pipeline (`submitBatchCommand`)
1. **Target Resolution**: The operator specifies `targetType: 'FEEDER'` or `'ZONE'` and `targetId`.
2. **Fleet Fan-out**: The `CommandsService` resolves all child devices under the feeder panel (e.g. 78 luminaires on Feeder `FDR-GBL-001`).
3. **Idempotency Guard**: The batch idempotency key is evaluated. If already submitted, the existing batch receipt is returned immediately.
4. **Feeder Relay Actuation**: The feeder contactor command is sent to the CCMS controller via `AdapterRegistry`.
5. **Bulk Desired State Update**: All connected luminaire records have their `desired_on` and `desired_brightness` updated in a single transaction.
6. **Telemetry Reconciliation**: As luminaires energize, incoming 30-second telemetry updates transition individual commands from `ACKNOWLEDGED` to `CONFIRMED`.

---

## 3. Idempotency Guarantees & Replay Safety

To prevent accidental double-switching or relay chatter during network retries or automated cron runs:
- The system enforces a compound unique constraint on `(ulb_id, idempotency_key)`.
- If a client resends a payload with an existing key, the backend returns the original command record with HTTP 200/202, including its current real-time state.
- Automated schedules generate deterministic keys incorporating the schedule ID, date, and time slot:  
  `sched-${schedule.id}-${dateIso}-${slot}`  
  (e.g. `sched-auto-sched-gbl-01-2026-10-23-NIGHTFALL`).
- This guarantees that even if a scheduler job is triggered multiple times in a distributed cluster, only a single physical actuation command is ever emitted to the field.
