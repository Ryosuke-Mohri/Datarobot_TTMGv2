# Copyright 2025 DataRobot, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import pytest

from app.db import DBCtx
from app.files import FileCreate, FileRepository
from app.knowledge_bases import KnowledgeBaseCreate, KnowledgeBaseRepository
from app.users.user import UserCreate, UserRepository


class TestFileRepository:
    """Test FileRepository operations."""

    @pytest.mark.asyncio
    async def test_delete_file_with_knowledge_base(self, db_ctx: DBCtx) -> None:
        """Test deleting a file that has an attached knowledge base updates token count."""

        # Create a test user
        user_repo = UserRepository(db_ctx)
        user_data = UserCreate(
            first_name="Test", last_name="User", email="test@example.com"
        )
        user = await user_repo.create_user(user_data)
        assert user.id is not None

        # Create a test knowledge base
        kb_repo = KnowledgeBaseRepository(db_ctx)
        kb_data = KnowledgeBaseCreate(
            title="Test KB",
            description="Test knowledge base",
            path="/test",
            token_count=1000,  # Start with some tokens
        )
        kb = await kb_repo.create_knowledge_base(kb_data, owner_id=user.id)
        assert kb.id is not None

        # Create a test file attached to the knowledge base
        file_repo = FileRepository(db_ctx)
        file_data = FileCreate(
            filename="test.txt",
            source="local",
            file_path="/tmp/test.txt",
            size_tokens=100,  # File has 100 tokens
            knowledge_base_id=kb.id,
        )
        file = await file_repo.create_file(file_data, owner_id=user.id)
        assert file.id is not None

        # Update the knowledge base to include the file's tokens
        await kb_repo.update_knowledge_base_token_count(kb, 1100)  # 1000 + 100

        # Verify the initial state
        updated_kb = await kb_repo.get_knowledge_base(
            user=user, knowledge_base_uuid=kb.uuid
        )
        assert updated_kb is not None
        assert updated_kb.token_count == 1100

        # Delete the file - this should update the knowledge base token count
        success = await file_repo.delete_file(file.id, owner_id=user.id)
        assert success is True

        # Verify the knowledge base token count was reduced
        final_kb = await kb_repo.get_knowledge_base(
            user=user, knowledge_base_uuid=kb.uuid
        )
        assert final_kb is not None
        assert final_kb.token_count == 1000  # Should be back to original 1000

        # Verify the file was actually deleted
        deleted_file = await file_repo.get_file(file_id=file.id)
        assert deleted_file is None

    @pytest.mark.asyncio
    async def test_delete_file_without_knowledge_base(self, db_ctx: DBCtx) -> None:
        """Test deleting a file that has no knowledge base attached."""

        # Create a test user
        user_repo = UserRepository(db_ctx)
        user_data = UserCreate(
            first_name="Test", last_name="User", email="test2@example.com"
        )
        user = await user_repo.create_user(user_data)
        assert user.id is not None

        # Create a test file without a knowledge base
        file_repo = FileRepository(db_ctx)
        file_data = FileCreate(
            filename="test2.txt",
            source="local",
            file_path="/tmp/test2.txt",
            size_tokens=50,
            knowledge_base_id=None,  # No knowledge base
        )
        file = await file_repo.create_file(file_data, owner_id=user.id)
        assert file.id is not None

        # Delete the file - this should work without issues
        success = await file_repo.delete_file(file.id, owner_id=user.id)
        assert success is True

        # Verify the file was deleted
        deleted_file = await file_repo.get_file(file_id=file.id)
        assert deleted_file is None

    @pytest.mark.asyncio
    async def test_delete_file_not_owned_by_user(self, db_ctx: DBCtx) -> None:
        """Test that deleting a file not owned by the user fails."""

        # Create two test users
        user_repo = UserRepository(db_ctx)
        user1_data = UserCreate(
            first_name="User", last_name="One", email="user1@example.com"
        )
        user1 = await user_repo.create_user(user1_data)
        assert user1.id is not None

        user2_data = UserCreate(
            first_name="User", last_name="Two", email="user2@example.com"
        )
        user2 = await user_repo.create_user(user2_data)
        assert user2.id is not None

        # Create a file owned by user1
        file_repo = FileRepository(db_ctx)
        file_data = FileCreate(
            filename="test3.txt",
            source="local",
            file_path="/tmp/test3.txt",
            size_tokens=25,
        )
        file = await file_repo.create_file(file_data, owner_id=user1.id)
        assert file.id is not None

        # Try to delete as user2 - should fail
        success = await file_repo.delete_file(file.id, owner_id=user2.id)
        assert success is False

        # Verify the file still exists
        existing_file = await file_repo.get_file(file_id=file.id)
        assert existing_file is not None
        assert existing_file.id == file.id

    @pytest.mark.asyncio
    async def test_delete_nonexistent_file(self, db_ctx: DBCtx) -> None:
        """Test that deleting a non-existent file returns False."""

        # Create a test user
        user_repo = UserRepository(db_ctx)
        user_data = UserCreate(
            first_name="Test", last_name="User", email="test4@example.com"
        )
        user = await user_repo.create_user(user_data)
        assert user.id is not None

        file_repo = FileRepository(db_ctx)

        # Try to delete a file that doesn't exist
        success = await file_repo.delete_file(99999, owner_id=user.id)
        assert success is False
