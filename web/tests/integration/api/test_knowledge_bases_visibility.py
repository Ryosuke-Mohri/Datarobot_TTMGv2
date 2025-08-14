# Copyright 2025 DataRobot, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# You may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
Knowledge Base Visibility Tests

These tests validate the access control and visibility rules for knowledge bases.
"""

from typing import Awaitable, Callable

import pytest
from fastapi.testclient import TestClient


@pytest.mark.asyncio
async def test_knowledge_bases_visibility_between_users(
    make_authenticated_client: Callable[..., Awaitable[TestClient]],
) -> None:
    """
    Validate that users can only access each other's knowledge bases if they are public.
    - Two users: A and B
    - A has one private and one public KB
    - B has one private KB
    Expectations:
      - As A: can see own private and public KBs, and other users' public KBs
      - As B: can see own private KB and other users' public KBs, but not their private KBs
      - Individual access: owners can get their own private KBs, others can get public KBs but not private
    """

    # Create two users through the authenticated client factory
    user_a_client = await make_authenticated_client(
        email="alice@example.com", first_name="Alice", last_name="UserA"
    )
    user_b_client = await make_authenticated_client(
        email="bob@example.com", first_name="Bob", last_name="UserB"
    )
    # Validate the clients work
    assert user_a_client.get("/api/v1/user/").json()["email"] == "alice@example.com"
    assert user_b_client.get("/api/v1/user/").json()["email"] == "bob@example.com"
    kb_priv_a_response = user_a_client.post(
        "/api/v1/knowledge-bases/",
        json={
            "title": "Alice Private KB",
            "description": "Alice's private knowledge base",
            "token_count": 0,
            "is_public": False,
        },
    )
    assert kb_priv_a_response.status_code == 201
    kb_priv_a = kb_priv_a_response.json()

    kb_pub_a_response = user_a_client.post(
        "/api/v1/knowledge-bases/",
        json={
            "title": "Alice Public KB",
            "description": "Alice's public knowledge base",
            "token_count": 0,
            "is_public": True,
        },
    )
    assert kb_pub_a_response.status_code == 201
    kb_pub_a = kb_pub_a_response.json()

    kb_priv_b_response = user_b_client.post(
        "/api/v1/knowledge-bases/",
        json={
            "title": "Bob Private KB",
            "description": "Bob's private knowledge base",
            "token_count": 0,
            "is_public": False,
        },
    )
    assert kb_priv_b_response.status_code == 201
    kb_priv_b = kb_priv_b_response.json()

    # Test User A listing - should see own KBs (both private and public) and B's public KBs
    response_a = user_a_client.get("/api/v1/knowledge-bases/")
    assert response_a.status_code == 200
    kb_list_a = response_a.json()["knowledge_bases"]

    assert {kb["uuid"] for kb in kb_list_a if kb["uuid"] != kb_priv_b["uuid"]} == {
        kb_priv_a["uuid"],
        kb_pub_a["uuid"],
    }

    # Test User B listing - should see own private KB and A's public KB but not A's private KB
    response_b = user_b_client.get("/api/v1/knowledge-bases/")
    assert response_b.status_code == 200
    kb_list_b = response_b.json()["knowledge_bases"]
    assert {kb["uuid"] for kb in kb_list_b if kb["uuid"] != kb_priv_a["uuid"]} == {
        kb_priv_b["uuid"],
        kb_pub_a["uuid"],
    }

    # Test individual KB access

    # User A can access their own private KB
    response = user_a_client.get(f"/api/v1/knowledge-bases/{kb_priv_a['uuid']}")
    assert response.status_code == 200

    # User A can access their own public KB
    response = user_a_client.get(f"/api/v1/knowledge-bases/{kb_pub_a['uuid']}")
    assert response.status_code == 200

    # User A cannot access B's private KB
    response = user_a_client.get(f"/api/v1/knowledge-bases/{kb_priv_b['uuid']}")
    assert response.status_code == 404  # Not found because private and not owned by A

    # User B can access their own private KB
    response = user_b_client.get(f"/api/v1/knowledge-bases/{kb_priv_b['uuid']}")
    assert response.status_code == 200

    # User B can access A's public KB
    response = user_b_client.get(f"/api/v1/knowledge-bases/{kb_pub_a['uuid']}")
    assert response.status_code == 200

    # User B cannot access A's private KB
    response = user_b_client.get(f"/api/v1/knowledge-bases/{kb_priv_a['uuid']}")
    assert response.status_code == 404  # Not found because private and not owned by B


@pytest.mark.asyncio
async def test_knowledge_base_ownership_edit_delete(
    make_authenticated_client: Callable[..., Awaitable[TestClient]],
) -> None:
    """
    Validate that only the owner of a knowledge base can edit or delete it.
    """

    # Create two users
    user_a_client = await make_authenticated_client(
        email="alice2@example.com", first_name="Alice", last_name="UserA"
    )
    user_b_client = await make_authenticated_client(
        email="bob2@example.com", first_name="Bob", last_name="UserB"
    )

    # Create a public and private KB owned by User A using API calls
    kb_public_a_response = user_a_client.post(
        "/api/v1/knowledge-bases/",
        json={
            "title": "Alice Public KB",
            "description": "Alice's public knowledge base",
            "token_count": 0,
            "is_public": True,
        },
    )
    assert kb_public_a_response.status_code == 201
    kb_public_a = kb_public_a_response.json()

    kb_private_a_response = user_a_client.post(
        "/api/v1/knowledge-bases/",
        json={
            "title": "Alice Private KB",
            "description": "Alice's private knowledge base",
            "token_count": 0,
            "is_public": False,
        },
    )
    assert kb_private_a_response.status_code == 201
    kb_private_a = kb_private_a_response.json()

    # Test UPDATE permissions

    # Owner can update their own public KB
    update_data = {"title": "Updated Public KB", "description": "Updated description"}
    response = user_a_client.put(
        f"/api/v1/knowledge-bases/{kb_public_a['uuid']}", json=update_data
    )
    assert response.status_code == 200
    updated_kb = response.json()
    assert updated_kb["title"] == "Updated Public KB"
    assert updated_kb["description"] == "Updated description"

    # Owner can update their own private KB
    update_data = {"title": "Updated Private KB"}
    response = user_a_client.put(
        f"/api/v1/knowledge-bases/{kb_private_a['uuid']}", json=update_data
    )
    assert response.status_code == 200
    updated_kb = response.json()
    assert updated_kb["title"] == "Updated Private KB"

    # Non-owner cannot update public KB (even if they can read it)
    update_data = {"title": "Should Not Work"}
    response = user_b_client.put(
        f"/api/v1/knowledge-bases/{kb_public_a['uuid']}", json=update_data
    )
    assert response.status_code == 403  # Forbidden

    # Non-owner cannot update private KB (can't even see it)
    update_data = {"title": "Should Not Work"}
    response = user_b_client.put(
        f"/api/v1/knowledge-bases/{kb_private_a['uuid']}", json=update_data
    )
    assert response.status_code == 404  # Not found because private and not owned

    # Test DELETE permissions

    # Non-owner cannot delete public KB (even if they can read it)
    response = user_b_client.delete(f"/api/v1/knowledge-bases/{kb_public_a['uuid']}")
    assert response.status_code == 404  # Not found for security reasons

    # Non-owner cannot delete private KB (can't even see it)
    response = user_b_client.delete(f"/api/v1/knowledge-bases/{kb_private_a['uuid']}")
    assert response.status_code == 404  # Not found because private and not owned

    # Owner can delete their own KBs
    response = user_a_client.delete(f"/api/v1/knowledge-bases/{kb_private_a['uuid']}")
    assert response.status_code == 200  # OK (successful deletion)

    response = user_a_client.delete(f"/api/v1/knowledge-bases/{kb_public_a['uuid']}")
    assert response.status_code == 200  # OK (successful deletion)

    # Verify KBs are actually deleted
    response = user_a_client.get(f"/api/v1/knowledge-bases/{kb_private_a['uuid']}")
    assert response.status_code == 404

    response = user_a_client.get(f"/api/v1/knowledge-bases/{kb_public_a['uuid']}")
    assert response.status_code == 404
