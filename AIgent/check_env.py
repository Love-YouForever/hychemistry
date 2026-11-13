import sys
import subprocess

print("="*50)
print("Python 环境诊断")
print("="*50)

# 1. 查看当前 Python 解释器路径
print(f"1. 当前 Python 路径: {sys.executable}")
print(f"2. Python 版本: {sys.version}")

# 2. 检查关键库
print("\n3. 关键库安装状态:")
packages = ['paddle', 'paddleocr']
for pkg in packages:
    try:
        exec(f"import {pkg}")
        print(f"   ✓ {pkg} 已安装")
    except ImportError:
        print(f"   ✗ {pkg} 未安装")

# 3. 使用 pip 列表确认
print("\n4. 使用 pip 验证已安装包:")
try:
    result = subprocess.run(
        [sys.executable, "-m", "pip", "list"],
        capture_output=True, text=True
    )
    lines = result.stdout.split('\n')
    for line in lines:
        if 'paddle' in line.lower():
            print(f"   {line}")
except Exception as e:
    print(f"   执行失败: {e}")

print("\n" + "="*50)
input("按 Enter 键退出...")
