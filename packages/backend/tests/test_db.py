import os
import tempfile
import unittest

from db.connection import init_db
from db.repositories.workspace_repo import WorkspaceRepository


class TestDatabaseRepositories(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        os.environ["DATA_VIS_DATA_DIR"] = self.temp_dir.name
        await init_db()

    async def asyncTearDown(self):
        self.temp_dir.cleanup()

    async def test_workspace_crud(self):
        ws = await WorkspaceRepository.create("Test Workspace", "Analytical workspace test")
        self.assertIsNotNone(ws["id"])
        self.assertEqual(ws["name"], "Test Workspace")

        # Get workspace
        fetched = await WorkspaceRepository.get_by_id(ws["id"])
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["name"], "Test Workspace")

        # List workspaces
        all_ws = await WorkspaceRepository.list_all()
        self.assertEqual(len(all_ws), 1)

        # Update layout
        updated = await WorkspaceRepository.update_layout(ws["id"], {"grid": "12col"})
        self.assertTrue(updated)

        # Delete workspace
        deleted = await WorkspaceRepository.delete(ws["id"])
        self.assertTrue(deleted)
        self.assertIsNone(await WorkspaceRepository.get_by_id(ws["id"]))


if __name__ == "__main__":
    unittest.main()
