# Orderhive Attendance API — Integration Guide

**Base URL:** `https://orderhive.indglobalrealty.com`  
**OpenAPI spec:** [`openapi.yaml`](./openapi.yaml) · [`openapi.json`](./openapi.json)  
**Postman collection:** [`postman-collection.json`](./postman-collection.json)

---

## Overview

The attendance module exposes two groups of endpoints:

| Group                                   | Path prefix    | Protocol                | Auth                                    |
| --------------------------------------- | -------------- | ----------------------- | --------------------------------------- |
| [iClock / ADMS](#iclock--adms-protocol) | `/iclock/`     | ZKTeco iClock HTTP Push | Device serial number (`SN` query param) |
| [REST API](#rest-api)                   | `/api/zkteco/` | JSON over HTTPS         | Bearer token                            |

---

## iClock / ADMS Protocol

The ZKTeco iClock (ADMS) protocol is the native push protocol used by ZKTeco biometric devices. Any software that speaks iClock can integrate with these endpoints.

The flow is:

1. **Handshake** — client sends `GET /iclock/cdata?SN=<serial>` → server replies with configuration.
2. **Push** — client sends `POST /iclock/cdata?SN=<serial>&table=ATTLOG` with punch data in plain text.
3. **Heartbeat** — client periodically polls `GET /iclock/getrequest?SN=<serial>` for server commands.

### Device / Client Registration

Before a device or software client can push data, its serial number must be added to the server's `ZKTECO_DEVICE_SN` environment variable (comma-separated):

```
ZKTECO_DEVICE_SN=JJA1253301000,CQZ7231961458,YOUR_NEW_SN
```

Requests with an unregistered `SN` are rejected with `401 Unauthorized`.

### Employee Code Mapping

Each punch record contains a `userID` field (the employee ID as enrolled on the device). This must exactly match the `code` field of an employee record in the Orderhive system (e.g. `INDG0194`).

- Codes are **case-sensitive** and must match exactly (watch for `O` vs `0`)
- Punches with unrecognised codes are stored unresolved (with `employeeEmail: null`)
- Unresolved punches can be back-filled after adding the employee by triggering "Sync Unprocessed" in the Attendance admin panel

---

### GET /iclock/cdata — Handshake

The client sends this on startup and periodically to retrieve server configuration.

**Request**

```
GET /iclock/cdata?SN=JJA1253301000&options=all
```

**Response** `200 OK` — `Content-Type: text/plain`

```
GET OPTION FROM: JJA1253301000
ATTLOGStamp=9999
OPERLOGStamp=9999
ATTPHOTOStamp=9999
ErrorDelay=30
Delay=10
TransTimes=00:00;23:59
TransInterval=1
TransFlag=TransData AttLog
TimeZone=4.00
Realtime=1
Encrypt=None
```

**Errors**

| Status             | Reason            |
| ------------------ | ----------------- |
| `401 Unauthorized` | SN not registered |

---

### POST /iclock/cdata — Push Attendance Punches

The client sends this to deliver attendance records.

**Request**

```
POST /iclock/cdata?SN=JJA1253301000&table=ATTLOG
Content-Type: text/plain

INDG0194	2026-06-12 08:57:42	0	1
INDG0194	2026-06-12 18:03:11	1	1
INDG0226	2026-06-12 09:05:00	0	15
```

**Body format** — one punch per line, fields separated by a single tab (`\t`):

```
userID<TAB>YYYY-MM-DD HH:mm:ss<TAB>inOutMode<TAB>verifyType
```

**inOutMode**

| Value | Meaning      |
| ----- | ------------ |
| `0`   | Check-in     |
| `1`   | Check-out    |
| `2`   | Break out    |
| `3`   | Break in     |
| `4`   | Overtime in  |
| `5`   | Overtime out |

**verifyType**

| Value | Meaning          |
| ----- | ---------------- |
| `1`   | Fingerprint      |
| `2`   | Password         |
| `3`   | Card             |
| `15`  | Face recognition |

**Response** `200 OK` — `Content-Type: text/plain`

```
OK: 3
```

The number is the count of valid punch lines processed. Invalid or malformed lines are silently skipped.

**Idempotency** — each punch is stored with a deterministic document ID (`{SN}_{userID}_{timestamp_compact}`). Re-posting the same punch has no effect.

**Errors**

| Status             | Reason            |
| ------------------ | ----------------- |
| `401 Unauthorized` | SN not registered |

**cURL example**

```bash
curl -X POST "https://orderhive.indglobalrealty.com/iclock/cdata?SN=JJA1253301000&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  --data-binary $'INDG0194\t2026-06-12 08:57:42\t0\t1\nINDG0194\t2026-06-12 18:03:11\t1\t1'
```

---

### GET /iclock/getrequest — Heartbeat / Command Poll

The client polls this periodically to check for pending commands from the server.

**Request**

```
GET /iclock/getrequest?SN=JJA1253301000&INFO=Ver+8.0.4.3-20220708,148,263,29324,192.168.1.10
```

**Response** `200 OK` — `Content-Type: text/plain`

```
OK
```

---

## REST API

### POST /api/zkteco/reconcile — Reconcile Attendance

Intended to run as a nightly scheduled job (e.g. Google Cloud Scheduler, cron). Performs two steps:

1. **Reconcile punched employees** — for every employee with a biometric punch on the given date, re-computes their attendance log entry (punchIn, punchOut, workingMinutes, status).
2. **Mark remaining employees** — for every active employee with no attendance log for that date:
   - `holiday` — if a holiday is configured for that date
   - `on-leave` — if an approved leave request exists for that date
   - `absent` — otherwise

Records previously marked `corrected: true` are never overwritten.

**Authentication** — `Authorization: Bearer <ZKTECO_CRON_SECRET>`

**Request**

```
POST /api/zkteco/reconcile
Authorization: Bearer d38d64d27bf93604dd146e7f...
Content-Type: application/json

{
  "date": "2026-06-11"
}
```

Omit the `date` field to default to **yesterday** (server local time).

**Response** `200 OK`

```json
{
	"date": "2026-06-11",
	"reconciled": 18,
	"absent": 3,
	"onLeave": 1,
	"holiday": false
}
```

**Response fields**

| Field        | Type         | Description                                    |
| ------------ | ------------ | ---------------------------------------------- |
| `date`       | `YYYY-MM-DD` | The date that was processed                    |
| `reconciled` | integer      | Employees whose attendance log was updated     |
| `absent`     | integer      | Employees marked absent (includes on-leave)    |
| `onLeave`    | integer      | Subset of absent — employees on approved leave |
| `holiday`    | boolean      | Whether the date was a configured holiday      |

**Errors**

| Status             | Reason                                       |
| ------------------ | -------------------------------------------- |
| `401 Unauthorized` | Missing, wrong, or unconfigured Bearer token |

**cURL example**

```bash
curl -X POST "https://orderhive.indglobalrealty.com/api/zkteco/reconcile" \
  -H "Authorization: Bearer YOUR_ZKTECO_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-11"}'
```

**Reconcile yesterday (no body)**

```bash
curl -X POST "https://orderhive.indglobalrealty.com/api/zkteco/reconcile" \
  -H "Authorization: Bearer YOUR_ZKTECO_CRON_SECRET"
```

---

## Data Schemas

### BiometricPunch

Raw punch record stored in the system.

| Field           | Type                  | Description                                                 |
| --------------- | --------------------- | ----------------------------------------------------------- |
| `id`            | string                | Deterministic key: `{SN}_{userID}_{timestamp_compact}`      |
| `deviceSn`      | string                | Device serial number                                        |
| `deviceUserId`  | string                | Employee code as enrolled on the device (e.g. `INDG0194`)   |
| `employeeEmail` | string \| null        | Resolved employee email. `null` if code not matched.        |
| `employeeName`  | string \| null        | Resolved employee display name                              |
| `date`          | `YYYY-MM-DD`          | Date of punch                                               |
| `timeStr`       | `HH:MM`               | Time of punch                                               |
| `timestamp`     | `YYYY-MM-DD HH:mm:ss` | Full timestamp as received from device                      |
| `inOutMode`     | integer               | See inOutMode table above                                   |
| `verifyType`    | integer               | See verifyType table above                                  |
| `branch`        | string?               | Office name (derived from `ZKTECO_DEVICE_BRANCHES` mapping) |
| `processed`     | boolean               | `true` once reconciled into an attendance log               |

### AttendanceLog

Computed attendance record for an employee on a given date.

| Field             | Type            | Description                                                        |
| ----------------- | --------------- | ------------------------------------------------------------------ |
| `id`              | string          | `{email_normalised}_{YYYY-MM-DD}`                                  |
| `employeeEmail`   | string          |                                                                    |
| `employeeName`    | string          |                                                                    |
| `employeeCode`    | string          |                                                                    |
| `date`            | `YYYY-MM-DD`    |                                                                    |
| `branch`          | string?         | Office/location                                                    |
| `punchIn`         | `HH:MM` \| null | First punch of day                                                 |
| `punchOut`        | `HH:MM` \| null | Last punch of day                                                  |
| `workingMinutes`  | integer         | `punchOut − punchIn`                                               |
| `overtimeMinutes` | integer         | `max(0, workingMinutes − 480)`                                     |
| `shortByMinutes`  | integer         | `max(0, 480 − workingMinutes)`                                     |
| `status`          | enum            | `present` \| `late` \| `absent` \| `on-leave` \| `holiday`         |
| `source`          | enum            | `biometric` \| `manual` \| `import`                                |
| `corrected`       | boolean?        | If `true`, biometric reconciliation will not overwrite this record |

---

## Environment Configuration Reference

| Variable                 | Required | Description                                                              |
| ------------------------ | -------- | ------------------------------------------------------------------------ |
| `ZKTECO_DEVICE_SN`       | Yes      | Comma-separated whitelist of device serial numbers                       |
| `ZKTECO_DEVICE_BRANCHES` | No       | Map SNs to office names: `SN1=Branch A,SN2=Branch B`                     |
| `ZKTECO_TIMEZONE`        | No       | UTC offset for device clock sync response (default `4.00` = Dubai UTC+4) |
| `LATE_THRESHOLD_TIME`    | No       | `HH:MM` threshold for `late` status (default `09:00`)                    |
| `ZKTECO_CRON_SECRET`     | Yes      | Bearer token for `/api/zkteco/reconcile` (min 16 chars)                  |

---

## Reconciliation Logic

```
punchIn  = first punch of day (HH:MM)
punchOut = last punch of day  (HH:MM)  — null if only one punch

if punchOut exists:
  workingMinutes  = punchOut_minutes − punchIn_minutes  (min 0)
  overtimeMinutes = max(0, workingMinutes − 480)
  shortByMinutes  = max(0, 480 − workingMinutes)
else:
  workingMinutes  = 0
  shortByMinutes  = 480

status = punchIn_minutes ≤ LATE_THRESHOLD_MINUTES ? 'present' : 'late'
```

Standard workday = **480 minutes (8 hours)**.  
`LATE_THRESHOLD_TIME` default = `09:00`.

---

## Quick Reference

```bash
# Test handshake
curl "https://orderhive.indglobalrealty.com/iclock/cdata?SN=YOUR_SN&options=all"

# Test heartbeat
curl "https://orderhive.indglobalrealty.com/iclock/getrequest?SN=YOUR_SN"

# Push a test punch
curl -X POST "https://orderhive.indglobalrealty.com/iclock/cdata?SN=YOUR_SN&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  --data-binary $'INDG0001\t2026-06-12 09:00:00\t0\t1'

# Reconcile a specific date
curl -X POST "https://orderhive.indglobalrealty.com/api/zkteco/reconcile" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-12"}'
```
