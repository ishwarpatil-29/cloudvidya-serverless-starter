"""
CloudVidya reference backend — a single Lambda function that routes every
request itself, the pattern taught in the Day 2 "Backend walkthrough" session.

Routes (see docs/project-guide.md for the full API design):
  GET    /health        -> confirm the API is running
  POST   /items          -> create a new submission
  GET    /items          -> list all submissions
  PATCH  /items/{id}     -> update status (OPTIONAL — not implemented here on
                             purpose; this is the Challenge 3 stretch goal for
                             those who extend it further. See the TODO near the bottom.)

Environment variables (set by template.yaml, read here — this is the
"environment variables" part of the Day 2 backend walkthrough):
  TABLE_NAME  -> the DynamoDB table this function reads/writes
"""

import json
import os
import uuid
from datetime import datetime, timezone

import boto3

TABLE_NAME = os.environ.get("TABLE_NAME")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
}


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }


def _health():
    return _response(200, {"status": "ok", "table": TABLE_NAME})


def _create_item(event):
    try:
        payload = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Request body must be valid JSON."})

    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    category = (payload.get("category") or "General").strip()
    participant_name = (payload.get("participantName") or "").strip()
    event_date = (payload.get("eventDate") or datetime.now(timezone.utc).date().isoformat()).strip()
    event_time = (payload.get("eventTime") or "18:00").strip()

    if not title or not description:
        return _response(400, {"error": "Both 'title' and 'description' are required."})

    item = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "category": category,
        "status": "OPEN",
        "participantName": participant_name,
        "eventDate": event_date,
        "eventTime": event_time,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    table.put_item(Item=item)

    # Anything printed here shows up in CloudWatch — this is exactly what the
    # Day 1 "Review CloudWatch logs" demo step, and the Day 2 "Testing and
    # troubleshooting" session, ask you to go look at.
    print(f"Created item: {json.dumps(item)}")

    return _response(200, {"message": "Created", "item": item})


def _list_items():
    result = table.scan(Limit=50)
    items = sorted(result.get("Items", []), key=lambda i: i.get("createdAt", ""), reverse=True)
    return _response(200, {"items": items})


def _update_item_status(event):
    # TODO (Challenge 3 stretch goal, optional): implement PATCH /items/{id}.
    #
    # This is intentionally left as an exercise. A working version needs to:
    #   1. Read the id from event["pathParameters"]["id"]
    #   2. Parse the new status from the request body
    #   3. Call table.update_item(...) with an UpdateExpression like
    #      "SET #s = :status" (","status" is a reserved word in DynamoDB,
    #      hence the ExpressionAttributeNames alias)
    #   4. Return the updated item
    #
    # Implementing this gets credit under "Working functionality" and
    # "Code quality and GitHub usage" in the evaluation rubric.
    return _response(501, {"error": "Not implemented yet — see the TODO in app.py."})


def handler(event, context):
    method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    # API Gateway sends a CORS preflight OPTIONS request before every
    # POST/PATCH from a browser — always answer it, or the browser will
    # block the real request before it's even sent.
    if method == "OPTIONS":
        return _response(200, {})

    if resource == "/health" and method == "GET":
        return _health()

    if resource == "/items" and method == "POST":
        return _create_item(event)

    if resource == "/items" and method == "GET":
        return _list_items()

    if resource == "/items/{id}" and method == "PATCH":
        return _update_item_status(event)

    return _response(404, {"error": f"No route for {method} {resource}"})
