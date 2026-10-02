"""Static Windows checks for short-form-safe-zones: no shell in the runtime path, and Windows x64 declared."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from windows_static import check_manifest_and_docs, check_no_posix_shell

PLUGIN = "short-form-safe-zones"


class ShortFormSafeZonesWindowsTest(unittest.TestCase):
    def test_no_posix_shell_at_runtime(self):
        check_no_posix_shell(self, PLUGIN)

    def test_manifest_and_docs(self):
        check_manifest_and_docs(self, PLUGIN)


if __name__ == "__main__":
    unittest.main()
