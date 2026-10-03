import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('publish_catalog', Path(__file__).resolve().parents[1] / 'tools/publish_catalog.py')
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)


class ConditionalCheckFailed(Exception):
    pass


class FakeDynamo:
    """The few calls the publisher makes, against one in-memory partition."""

    class exceptions:
        ConditionalCheckFailedException = ConditionalCheckFailed

    def __init__(self):
        self.items = {}

    def get_item(self, TableName, Key, ConsistentRead):
        item = self.items.get((Key['PK']['S'], Key['SK']['S']))
        return {'Item': item} if item else {}

    def put_item(self, TableName, Item, ConditionExpression=None, ExpressionAttributeValues=None):
        key = (Item['PK']['S'], Item['SK']['S'])
        if ConditionExpression:
            existing = self.items.get(key)
            if existing and not existing['committedAt']['S'] <= ExpressionAttributeValues[':at']['S']:
                raise ConditionalCheckFailed()
        self.items[key] = Item

    def delete_item(self, TableName, Key):
        del self.items[(Key['PK']['S'], Key['SK']['S'])]

    def query(self, TableName, KeyConditionExpression, ExpressionAttributeValues, ProjectionExpression,
              ConsistentRead, ExclusiveStartKey=None):
        pk, prefix = ExpressionAttributeValues[':pk']['S'], ExpressionAttributeValues[':prefix']['S']
        keys = sorted(sk for p, sk in self.items if p == pk and sk.startswith(prefix))
        start = keys.index(ExclusiveStartKey['SK']['S']) + 1 if ExclusiveStartKey else 0
        page = keys[start:start + 2]  # Small pages, so paging is exercised.
        result = {'Items': [{'SK': {'S': sk}} for sk in page]}
        if start + 2 < len(keys):
            result['LastEvaluatedKey'] = {'PK': {'S': pk}, 'SK': {'S': page[-1]}}
        return result

    def snapshot(self, commit):
        prefix = catalog.plugin_key(commit)
        return {sk[len(prefix):]: item for (pk, sk), item in self.items.items() if sk.startswith(prefix)}

    def head(self):
        return self.items.get((catalog.PARTITION, catalog.HEAD))


class PublishCatalogTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.com')
        self.git('config', 'user.name', 'Test')

    def git(self, *args, env=None):
        return subprocess.check_output(['git', *args], cwd=self.root, env=env).decode().strip()

    def commit(self, manifests, date):
        for pid, manifest in manifests.items():
            path = self.root / 'plugins' / pid / 'plugin.json'
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(manifest if isinstance(manifest, str) else json.dumps(manifest, indent=2))
        self.git('add', '-A')
        env = {'GIT_AUTHOR_DATE': date, 'GIT_COMMITTER_DATE': date, 'PATH': '/usr/bin:/bin:/usr/local/bin'}
        self.git('commit', '-q', '--allow-empty', '-m', date, env=env)
        return self.git('rev-parse', 'HEAD')

    def remove(self, pid):
        self.git('rm', '-q', '-r', f'plugins/{pid}')

    def publish(self, client, commit):
        committed_at, manifests = catalog.read_snapshot(self.root, commit)
        return catalog.publish(client, commit, committed_at, manifests)

    def test_snapshot_keeps_published_text_and_lists_only_plugin_manifests(self):
        text = '{\n  "id": "alpha",\n  "aspect": 0.5625,\n  "localized": {"ko": {"name": "a"}}\n}\n'
        (self.root / 'plugins/alpha').mkdir(parents=True)
        (self.root / 'plugins/alpha/plugin.json').write_text(text)
        (self.root / 'plugins/alpha/nested').mkdir()
        (self.root / 'plugins/alpha/nested/plugin.json').write_text('{"id": "nested"}')
        (self.root / 'plugins/Not_An_Id').mkdir()
        (self.root / 'plugins/Not_An_Id/plugin.json').write_text('{"id": "Not_An_Id"}')
        commit = self.commit({}, '2026-10-01T00:00:00+00:00')
        client = FakeDynamo()
        result = self.publish(client, commit)
        self.assertEqual(result, {'commit': commit, 'published': True, 'head': commit,
                                  'plugins': 1, 'removedItems': 0})
        stored = client.snapshot(commit)
        self.assertEqual(list(stored), ['alpha'])
        self.assertEqual(stored['alpha']['manifest']['S'], text)
        self.assertEqual(stored['alpha']['commit']['S'], commit)
        head = client.head()
        self.assertEqual(head['commit']['S'], commit)
        self.assertEqual(head['count']['N'], '1')
        self.assertEqual(head['schemaVersion']['N'], '1')

    def test_keeps_head_and_the_snapshot_it_replaced_and_drops_older(self):
        client = FakeDynamo()
        first = self.commit({'alpha': {'id': 'alpha'}, 'beta': {'id': 'beta'}}, '2026-10-01T00:00:00+00:00')
        self.publish(client, first)
        second = self.commit({'alpha': {'id': 'alpha', 'version': '2'}}, '2026-10-02T00:00:00+00:00')
        self.publish(client, second)
        self.remove('beta')
        third = self.commit({}, '2026-10-03T00:00:00+00:00')
        result = self.publish(client, third)
        self.assertEqual(result['removedItems'], 2)
        self.assertEqual(client.snapshot(first), {})
        self.assertEqual(sorted(client.snapshot(second)), ['alpha', 'beta'])
        self.assertEqual(sorted(client.snapshot(third)), ['alpha'])
        self.assertEqual(client.head()['count']['N'], '1')

    def test_an_older_commit_never_moves_head_back(self):
        client = FakeDynamo()
        old = self.commit({'alpha': {'id': 'alpha'}}, '2026-10-01T00:00:00+00:00')
        new = self.commit({'beta': {'id': 'beta'}}, '2026-10-02T00:00:00+00:00')
        self.publish(client, new)
        result = self.publish(client, old)
        self.assertFalse(result['published'])
        self.assertEqual(result['head'], new)
        self.assertEqual(client.head()['commit']['S'], new)
        self.assertEqual(client.snapshot(old), {})

    def test_republishing_head_is_idempotent(self):
        client = FakeDynamo()
        commit = self.commit({'alpha': {'id': 'alpha'}}, '2026-10-01T00:00:00+00:00')
        self.publish(client, commit)
        result = self.publish(client, commit)
        self.assertTrue(result['published'])
        self.assertEqual(list(client.snapshot(commit)), ['alpha'])

    def test_refuses_a_manifest_whose_id_differs_from_its_folder(self):
        commit = self.commit({'alpha': {'id': 'beta'}}, '2026-10-01T00:00:00+00:00')
        with self.assertRaisesRegex(ValueError, 'id differs'):
            catalog.read_snapshot(self.root, commit)

    def test_refuses_a_manifest_too_large_for_one_item(self):
        commit = self.commit({'alpha': {'id': 'alpha', 'pad': 'x' * catalog.MAX_MANIFEST}},
                             '2026-10-01T00:00:00+00:00')
        with self.assertRaisesRegex(ValueError, 'too large'):
            catalog.read_snapshot(self.root, commit)

    def test_commit_time_is_utc_so_head_order_holds_across_zones(self):
        client = FakeDynamo()
        # 01:00 in Seoul is the previous day, 16:00, in UTC.
        seoul = self.commit({'alpha': {'id': 'alpha'}}, '2026-10-02T01:00:00+09:00')
        utc = self.commit({'beta': {'id': 'beta'}}, '2026-10-01T17:00:00+00:00')
        self.assertEqual(catalog.read_snapshot(self.root, seoul)[0], '2026-10-01T16:00:00Z')
        self.publish(client, seoul)
        self.assertTrue(self.publish(client, utc)['published'])

    def test_refuses_anything_but_a_full_commit(self):
        with self.assertRaisesRegex(ValueError, 'Invalid commit'):
            catalog.read_snapshot(self.root, 'main')


if __name__ == '__main__':
    unittest.main()
