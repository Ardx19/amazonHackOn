# lambdas/shared/db.py
# DynamoDB CRUD helpers. No business logic — just clean DynamoDB operations.

import boto3
from datetime import datetime
from boto3.dynamodb.conditions import Key

from shared.config import AWS_REGION

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)


def get_table(table_name: str):
    return dynamodb.Table(table_name)


def _serialize(obj):
    """Recursively convert datetime objects to ISO strings for DynamoDB."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(v) for v in obj]
    return obj


def put_item(table_name: str, item_dict: dict) -> bool:
    table = get_table(table_name)
    table.put_item(Item=_serialize(item_dict))
    return True


def get_item(table_name: str, pk_name: str, pk_value: str) -> dict | None:
    table = get_table(table_name)
    response = table.get_item(Key={pk_name: pk_value})
    return response.get("Item")


def query_by_pk(table_name: str, pk_name: str, pk_value: str) -> list[dict]:
    table = get_table(table_name)
    response = table.query(KeyConditionExpression=Key(pk_name).eq(pk_value))
    return response.get("Items", [])


def update_item_field(
    table_name: str, pk_name: str, pk_value: str, field_name: str, new_value
) -> bool:
    table = get_table(table_name)
    table.update_item(
        Key={pk_name: pk_value},
        UpdateExpression="SET #f = :v",
        ExpressionAttributeNames={"#f": field_name},
        ExpressionAttributeValues={":v": _serialize(new_value)},
    )
    return True


def delete_item(table_name: str, pk_name: str, pk_value: str) -> bool:
    table = get_table(table_name)
    table.delete_item(Key={pk_name: pk_value})
    return True


def scan_table(table_name: str) -> list[dict]:
    # WARNING: Full table scan. Demo volumes only — not for production.
    table = get_table(table_name)
    response = table.scan()
    items = response.get("Items", [])
    # Handle pagination for completeness (demo won't need it)
    while "LastEvaluatedKey" in response:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items", []))
    return items
