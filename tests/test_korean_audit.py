import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from korean_audit import audit


class KoreanAuditTest(unittest.TestCase):
    def test_reports_line_and_column(self):
        results = audit("좋은 문장\n이 문제에 있어서 개선이 필요하다")
        self.assertEqual([(r["line"], r["column"], r["category"]) for r in results],
                         [(2, 5, "translationese_location")])

    def test_protected_blocks(self):
        source = (
            "```python\n"
            "print('결론적으로')\n"
            "```\n"
            "`결론적으로` 그대로\n"
            "> 결론적으로 인용문\n"
            '그는 "결론적으로"라고 말했다\n'
            "실제 본문: 결론적으로 중요하다\n"
        )
        result = audit(source)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["line"], 7)

    def test_preserves_nonmatches(self):
        self.assertEqual(audit("AI를 통해 효율을 높일 수 있다."), [])

    def test_conservative_quoted_text(self):
        self.assertEqual(audit("“시사하는 바가 크다”라고 인용했다."), [])

    def test_double_passive(self):
        self.assertEqual(audit("판단되어진다.").pop()["category"], "double_passive")


if __name__ == "__main__":
    unittest.main()
