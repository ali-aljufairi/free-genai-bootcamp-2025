import unittest

from PIL import Image, ImageDraw

from core import (
    calculate_ink_ratio,
    extract_cjk_text,
    preprocess_kanji_for_ocr,
    score_kanji_attempt,
    select_best_kanji_candidate,
)


class KanjiCoreUtilsTests(unittest.TestCase):
    def test_extract_cjk_text_includes_extensions(self) -> None:
        extension_char = chr(0x20000)
        text = f"上バ{extension_char}A名"
        self.assertEqual(extract_cjk_text(text), f"上{extension_char}名")

    def test_calculate_ink_ratio_detects_non_empty_canvas(self) -> None:
        blank = Image.new("RGB", (100, 100), "white")
        self.assertEqual(calculate_ink_ratio(blank), 0.0)

        drawn = Image.new("RGB", (100, 100), "white")
        draw = ImageDraw.Draw(drawn)
        draw.line((10, 10, 90, 90), fill="black", width=3)
        self.assertGreater(calculate_ink_ratio(drawn), 0.003)

    def test_preprocess_kanji_for_ocr_upscales_and_normalizes(self) -> None:
        source = Image.new("RGBA", (32, 24), (255, 255, 255, 0))
        processed = preprocess_kanji_for_ocr(source)
        self.assertEqual(processed.mode, "L")
        self.assertEqual(processed.size, (64, 48))

    def test_select_best_kanji_candidate_prefers_exact_match(self) -> None:
        candidates = [
            {"variant": "original", "raw_text": "火"},
            {"variant": "preprocessed", "raw_text": "名"},
            {"variant": "autocontrast", "raw_text": "名字"},
        ]
        best = select_best_kanji_candidate(candidates, target_character="名")
        self.assertEqual(best["variant"], "preprocessed")
        self.assertEqual(best["cjk_text"], "名")
        self.assertGreaterEqual(best["ocr_confidence"], 0.9)

    def test_score_kanji_attempt_handles_empty_no_ocr_and_exact(self) -> None:
        empty_score = score_kanji_attempt("名", "", 0.001)
        self.assertEqual(empty_score["accuracy"], 0.0)
        self.assertEqual(empty_score["detection_mode"], "empty_canvas")

        no_ocr_score = score_kanji_attempt("名", "", 0.01)
        self.assertGreater(no_ocr_score["accuracy"], 0.0)
        self.assertEqual(no_ocr_score["detection_mode"], "no_cjk_detected")

        exact_score = score_kanji_attempt("名", "名", 0.01)
        self.assertEqual(exact_score["accuracy"], 100.0)
        self.assertEqual(exact_score["grade"], "S")
        self.assertEqual(exact_score["detection_mode"], "exact_match")


if __name__ == "__main__":
    unittest.main()
