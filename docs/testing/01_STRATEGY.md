# Testing Strategy and Test Matrix

## 1. Scope and Priorities
Prompt 0 establishes the foundation testing suite covering:
1. **Adapter Contract Verification**: Validating that `SimulatorAdapter` implements `DeviceAdapter` without deviations.
2. **Command Lifecycle State Transitions**: Verifying transitions from `QUEUED` -> `SENT` -> `ACKNOWLEDGED` -> `CONFIRMED` and `FAILED`.
3. **Idempotency Enforcement**: Verifying that duplicate command submissions return existing commands and do not duplicate dispatches.
4. **ULB Scoping & Authorization**: Verifying that unauthorized cross-ULB queries and commands are blocked with HTTP 403.
5. **Deterministic Seed Integrity**: Verifying that the initial dataset seeds both Ganderbal and Katra ULBs with correct wattage distribution.

## 2. Test Execution
```bash
# Run all unit and integration tests across monorepo
pnpm test

# Run API tests specifically
pnpm --filter smartlight-api test

# Run simulator tests specifically
pnpm --filter smartlight-simulator test
```
