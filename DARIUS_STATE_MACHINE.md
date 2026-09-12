# DARIUS OSS — CORE STATE MACHINE

The central Task Engine operates on the following strict state machine for Tasks.

## States
1.  **CREATED**: Initial state before execution begins.
2.  **RUNNING**: Task is actively processing its execution loop.
3.  **PAUSED**: Task execution is suspended.
4.  **WAITING_APPROVAL**: Execution requires human intervention.
5.  **COMPLETED**: Terminal state. Execution finished successfully.
6.  **FAILED**: Terminal state. Execution aborted due to error or verification failure.
7.  **CANCELLED**: Terminal state. Execution stopped by user.

## Valid Transitions
* `CREATED` -> `RUNNING`
* `RUNNING` -> `PAUSED`
* `RUNNING` -> `WAITING_APPROVAL`
* `RUNNING` -> `COMPLETED`
* `RUNNING` -> `FAILED`
* `PAUSED` -> `RUNNING` (Resume)
* `PAUSED` -> `CANCELLED`
* `WAITING_APPROVAL` -> `RUNNING` (Approve)
* `WAITING_APPROVAL` -> `FAILED` (Reject)

## Invalid Transitions
* Any terminal state (`COMPLETED`, `FAILED`, `CANCELLED`) -> Any other state. Once terminal, a task cannot resurrect.
