#!/usr/bin/env python3
"""Publish every plugin.json at one commit to the catalog the Selects app lists.

The app reads the library through the Selects API, which reads this catalog,
instead of listing this repository through GitHub's API. Run by
`.github/workflows/publish-catalog.yml` after a push to `main`; never run it by
hand against the shared table without a maintainer's review.

A snapshot is written whole before `HEAD` points at it, so a reader sees one
commit or the previous one, never a mix. The previous snapshot is kept for a
reader that saw the old `HEAD`; older ones are deleted.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TABLE = 'SelectsGenerationTemplates'
REGION = 'us-west-2'
PARTITION = 'CATALOG#plugins#v1'
HEAD = 'HEAD'
# DynamoDB's item limit is 400 KB; leave room for keys and attribute names.
MAX_MANIFEST = 350 * 1024
PLUGIN_JSON = re.compile(r'plugins/([a-z0-9]+(?:-[a-z0-9]+)*)/plugin\.json')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def plugin_key(commit, pid=''):
    return f'COMMIT#{commit}#PLUGIN#{pid}'


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root).decode()


def read_snapshot(root, commit):
    """Every `plugins/<id>/plugin.json` blob at `commit`, as the app lists them."""
    require(re.fullmatch(r'[0-9a-f]{40}', commit), 'Invalid commit')
    names = git(root, 'ls-tree', '-r', '--name-only', '-z', commit, '--', 'plugins').split('\0')
    manifests = {}
    for name in names:
        match = PLUGIN_JSON.fullmatch(name)
        if not match:
            continue
        pid = match[1]
        text = git(root, 'show', f'{commit}:{name}')
        require(len(text.encode()) <= MAX_MANIFEST, f'{name}: too large for the catalog')
        manifest = json.loads(text)
        require(isinstance(manifest, dict) and manifest.get('id') == pid, f'{name}: id differs from its folder')
        manifests[pid] = text
    # UTC, so HEAD's ordering check can compare the text.
    seconds = int(git(root, 'show', '-s', '--format=%ct', commit))
    committed_at = datetime.fromtimestamp(seconds, timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    return committed_at, manifests


def plugin_items(commit, manifests):
    return [{'PK': {'S': PARTITION}, 'SK': {'S': plugin_key(commit, pid)},
             'id': {'S': pid}, 'commit': {'S': commit}, 'manifest': {'S': text}}
            for pid, text in sorted(manifests.items())]


def head_item(commit, committed_at, count):
    return {'PK': {'S': PARTITION}, 'SK': {'S': HEAD}, 'schemaVersion': {'N': '1'},
            'commit': {'S': commit}, 'committedAt': {'S': committed_at}, 'count': {'N': str(count)}}


def current_head(client):
    item = client.get_item(TableName=TABLE, Key={'PK': {'S': PARTITION}, 'SK': {'S': HEAD}},
                           ConsistentRead=True).get('Item')
    return item['commit']['S'] if item else None


def snapshot_keys(client):
    """Sort keys of every stored plugin item, by commit."""
    query = {'TableName': TABLE, 'KeyConditionExpression': 'PK = :pk AND begins_with(SK, :prefix)',
             'ExpressionAttributeValues': {':pk': {'S': PARTITION}, ':prefix': {'S': 'COMMIT#'}},
             'ProjectionExpression': 'SK', 'ConsistentRead': True}
    keys = {}
    while True:
        page = client.query(**query)
        for item in page.get('Items', []):
            key = item['SK']['S']
            keys.setdefault(key.split('#')[1], []).append(key)
        if 'LastEvaluatedKey' not in page:
            return keys
        query['ExclusiveStartKey'] = page['LastEvaluatedKey']


def publish(client, commit, committed_at, manifests):
    """Write the snapshot, point HEAD at it unless a later commit is already
    published, then delete snapshots other than HEAD's and the one it replaced."""
    previous = current_head(client)
    for item in plugin_items(commit, manifests):
        client.put_item(TableName=TABLE, Item=item)
    published = True
    try:
        client.put_item(
            TableName=TABLE, Item=head_item(commit, committed_at, len(manifests)),
            # Runs are serialized, but a re-run of an old push must not move HEAD back.
            ConditionExpression='attribute_not_exists(SK) OR committedAt <= :at',
            ExpressionAttributeValues={':at': {'S': committed_at}})
    except client.exceptions.ConditionalCheckFailedException:
        published = False
    head = current_head(client)
    keep = {head, previous if published else None}
    removed = 0
    for stored, keys in snapshot_keys(client).items():
        if stored not in keep:
            for key in keys:
                client.delete_item(TableName=TABLE, Key={'PK': {'S': PARTITION}, 'SK': {'S': key}})
                removed += 1
    return {'commit': commit, 'published': published, 'head': head,
            'plugins': len(manifests), 'removedItems': removed}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', required=True, help='Full SHA of the commit to publish')
    parser.add_argument('--dry-run', action='store_true', help='Read and validate only')
    args = parser.parse_args()
    committed_at, manifests = read_snapshot(ROOT, args.commit)
    if args.dry_run:
        result = {'commit': args.commit, 'committedAt': committed_at, 'plugins': sorted(manifests)}
    else:
        import boto3  # Only the publish job needs it.
        result = publish(boto3.client('dynamodb', region_name=REGION), args.commit, committed_at, manifests)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
