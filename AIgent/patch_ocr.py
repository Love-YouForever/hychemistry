import re

with open('oc.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换 init_ocr 方法中的相关行
pattern = r'(def init_ocr\(self\):.*?)(self\.ocr = PaddleOCR\([^)]+\))'
replacement = r'\1        try:\n            self.ocr = PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)\n        except TypeError:\n            self.ocr = PaddleOCR(use_angle_cls=True, lang="ch")'
new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('oc.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("修复完成！请重新运行 run.bat")
input("按 Enter 键退出...")
