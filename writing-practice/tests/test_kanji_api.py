import base64
import io
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

os.environ.setdefault("GOOGLE_API_KEY", "test-google-key")
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")

import api as writing_api


class KanjiFeedbackApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(writing_api.api)

    def setUp(self) -> None:
        writing_api.api.dependency_overrides[writing_api.verify_bearer] = lambda: {
            "sub": "test-user"
        }
        self.get_user_id_patch = patch.object(
            writing_api, "get_user_id_from_claims", return_value=1
        )
        self.save_trace_patch = patch.object(
            writing_api, "save_kanji_trace", return_value=None
        )
        self.get_user_id_patch.start()
        self.save_trace_patch.start()

    def tearDown(self) -> None:
        writing_api.api.dependency_overrides = {}
        self.get_user_id_patch.stop()
        self.save_trace_patch.stop()

    @staticmethod
    def _encoded_png() -> str:
        image = Image.new("RGB", (64, 64), "white")
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def test_kanji_feedback_blank_canvas_response(self) -> None:
        with patch.object(
            writing_api.japanese_app,
            "process_kanji_image",
            return_value=(0.0, "C", "Canvas appears empty.", None, "", 0.0, "empty_canvas"),
        ):
            response = self.client.post(
                "/api/writing/kanji/feedback",
                headers={"Authorization": "Bearer test-token"},
                json={
                    "image": self._encoded_png(),
                    "kanji_id": 1,
                    "character": "名",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["accuracy"], 0.0)
        self.assertEqual(payload["detection_mode"], "empty_canvas")

    def test_kanji_feedback_non_blank_no_ocr_is_non_zero(self) -> None:
        with patch.object(
            writing_api.japanese_app,
            "process_kanji_image",
            return_value=(15.0, "C", "Could not confidently recognize a kanji.", False, "", 0.1, "no_cjk_detected"),
        ):
            response = self.client.post(
                "/api/writing/kanji/feedback",
                headers={"Authorization": "Bearer test-token"},
                json={
                    "image": self._encoded_png(),
                    "kanji_id": 2,
                    "character": "上",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreater(payload["accuracy"], 0.0)
        self.assertEqual(payload["detection_mode"], "no_cjk_detected")

    def test_kanji_feedback_exact_match(self) -> None:
        with patch.object(
            writing_api.japanese_app,
            "process_kanji_image",
            return_value=(100.0, "S", "Perfect!", True, "名", 0.99, "exact_match"),
        ):
            response = self.client.post(
                "/api/writing/kanji/feedback",
                headers={"Authorization": "Bearer test-token"},
                json={
                    "image": self._encoded_png(),
                    "kanji_id": 3,
                    "character": "名",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["grade"], "S")
        self.assertEqual(payload["recognized_text"], "名")

    def test_kanji_feedback_rejects_invalid_base64(self) -> None:
        response = self.client.post(
            "/api/writing/kanji/feedback",
            headers={"Authorization": "Bearer test-token"},
            json={
                "image": "%%%NOT_BASE64%%%",
                "kanji_id": 4,
                "character": "名",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid base64 image payload", response.json()["detail"])

    def test_kanji_feedback_requires_character(self) -> None:
        response = self.client.post(
            "/api/writing/kanji/feedback",
            headers={"Authorization": "Bearer test-token"},
            json={
                "image": self._encoded_png(),
                "kanji_id": 5,
                "character": "   ",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Kanji character is required", response.json()["detail"])

    def test_kanji_feedback_rejects_non_image_payload(self) -> None:
        invalid_image = base64.b64encode(b"not-an-image").decode("utf-8")
        response = self.client.post(
            "/api/writing/kanji/feedback",
            headers={"Authorization": "Bearer test-token"},
            json={
                "image": invalid_image,
                "kanji_id": 6,
                "character": "名",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("not a valid image", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
