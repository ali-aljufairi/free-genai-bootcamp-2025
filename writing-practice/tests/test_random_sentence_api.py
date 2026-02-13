import os
import unittest
from unittest.mock import patch

import requests
from fastapi.testclient import TestClient

os.environ.setdefault("GOOGLE_API_KEY", "test-google-key")
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")

import api as writing_api


class RandomSentenceApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(writing_api.api)

    def setUp(self) -> None:
        writing_api.api.dependency_overrides[writing_api.verify_bearer] = lambda: {
            "sub": "test-user"
        }

    def tearDown(self) -> None:
        writing_api.api.dependency_overrides = {}

    def test_random_sentence_returns_fallback_when_word_service_unavailable(self) -> None:
        fallback = writing_api.FALLBACK_SENTENCE_POOL[0]

        with patch.object(
            writing_api.japanese_app,
            "get_random_word",
            side_effect=requests.exceptions.ConnectionError("connection refused"),
        ), patch("api.random.choice", return_value=fallback):
            response = self.client.get(
                "/api/writing/random-sentence",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), fallback)

    def test_random_word_sentence_returns_fallback_when_word_payload_invalid(self) -> None:
        fallback = writing_api.FALLBACK_SENTENCE_POOL[1]

        with patch.object(
            writing_api.japanese_app,
            "get_random_word",
            side_effect=ValueError("invalid word payload"),
        ), patch("api.random.choice", return_value=fallback):
            response = self.client.get(
                "/api/writing/random-word-sentence",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), fallback)

    def test_random_sentence_keeps_internal_errors_visible(self) -> None:
        with patch.object(
            writing_api.japanese_app,
            "get_random_word",
            side_effect=RuntimeError("unexpected crash"),
        ):
            response = self.client.get(
                "/api/writing/random-sentence",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 500)
        self.assertIn("Error generating random sentence", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
