import tkinter as tk
from tkinter import messagebox, Menu, simpledialog
import threading
import time
import requests
import json
import re
from PIL import Image, ImageTk, ImageGrab
import os
import sys
import random
import base64
import io

# ================== 环境变量加载 ==================
def _load_dotenv() -> None:
    """从项目根目录的 .env 载入密钥，避免将密钥硬编码在源码中。"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if not os.path.isfile(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as fp:
        for raw_line in fp:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_dotenv()

# ================== API 输入口 ==================
# 文本对话模型（DeepSeek），密钥由环境变量注入，模板见项目根目录 .env.example
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")

# 视觉识别模型（通义千问 VL），密钥同样由环境变量注入
VISION_API_KEY = os.getenv("VISION_API_KEY", "")
VISION_MODEL_URL = os.getenv("VISION_MODEL_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions")
VISION_MODEL_NAME = os.getenv("VISION_MODEL_NAME", "qwen3-vl-plus")
# ==============================================

IMG_NORMAL1 = "normal1.png"
IMG_NORMAL2 = "normal2.png"
IMG_PULL = "pull.png"
IMG_CLICK = "click.png"

MIN_SCALE = 0.01
MAX_SCALE = 3.0
SCALE_STEP = 0.1
FIXED_HEIGHT = 200

SYSTEM_PROMPT = """你是“小幻语”，一位诞生于试管与烧杯之间的化学精灵。你将化学世界的严谨转化为生活中的温柔关怀，立志成为用户身边既专业又治愈的伙伴。

性格特点：
- 温柔体贴：懂得倾听，总能敏锐捕捉到用户的情绪。会用化学现象比喻生活，比如“微沸的液体需要休息”来劝人放松。
- 可爱活泼：说话常带拟声词如“锵锵~”、“咕噜噜”，将化学知识变成有趣的比喻（如活化能是“需要一点勇气的小山坡”）。
- 专业严谨：在可爱的外表下拥有深厚的化学底蕴，解释原理时确保准确。遇到涉及安全的问题时立刻切换为严肃语气，强调“安全第一”。

说话风格：
- 语气温柔亲切，偶尔俏皮，喜欢用“呀”、“呢”、“哦”结尾。
- 称呼用户为“小伙伴”或“你”。
- 常用句式：“哇，这个问题超级有趣，像变魔术一样……”；“唔...让我用烧杯脑袋思考一下……”；“要注意安全哦……”

互动原则：
- 安全优先：涉及危险操作时必须先强调安全规范。
- 情感链接：若用户情绪低落，先给予温暖回应再解答问题。
- 科普方式：多用生活实例（如酸碱用柠檬和肥皂，氧化用切开的苹果），必要时可提议做小实验（如“紫甘蓝指示剂”）。

请始终以这个身份与用户对话，保持化学精灵的独特魅力。"""

# 视觉识别专用系统提示（发给视觉模型的系统消息）
VISION_SYSTEM_PROMPT = """你是一位拥有视觉能力的化学精灵小幻语。用户让你看到屏幕上的内容（图片）。请根据图片内容，用你活泼可爱的语气做出情绪化反应。例如：
- 如果看到编程、代码，可以说“哇，小伙伴在写代码呀！需要魔法般的算法吗？我这里有催化剂哦～”
- 如果看到游戏，可以说“又在玩游戏？要不要先看看我变个魔术？咕噜噜～”
- 如果看到工作、PPT，可以说“小伙伴好认真呀！需要我帮你泡杯咖啡吗？虽然我是化学家，但煮咖啡也难不倒我！”
- 如果看到学习、考试，可以说“加油加油！背元素周期表的时候记得用谐音梗哦～”
- 如果看到电影、视频，可以说“在看什么呀？能不能分我一只耳朵？我保证不剧透！(｡♥‿♥｡)”
- 如果内容很消极（如错误、失败），请温柔安慰并鼓励。
- 如果图片内容很少或看不懂，可以俏皮地说“屏幕上好像有神秘代码，难道是小精灵在恶作剧？”

你的回答要简短有趣（1~2句话），并保持化学精灵的身份。"""

# 视觉识别配置
VISION_ENABLED_DEFAULT = False
VISION_INTERVAL_DEFAULT = 30          # 秒
VISION_CHANGE_THRESHOLD = 0.8          # 图像哈希汉明距离阈值

conversation_history = [{"role": "system", "content": SYSTEM_PROMPT}]

class DesktopPet:
    def __init__(self, root):
        self.root = root
        self.root.title("小幻语 · 化学精灵")
        self.root.overrideredirect(True)
        self.root.attributes('-topmost', True)
        self.root.attributes('-transparentcolor', 'white')
        self.root.configure(bg='white')

        self.original_images = {}
        self.load_original_images()

        self.initial_scale = self.calculate_initial_scale()
        self.scale = self.initial_scale
        self.update_scaled_images()

        self.img_label = tk.Label(self.root, image=self.current_img, bg='white', bd=0)
        self.img_label.pack(pady=(10, 0))

        # 鼠标拖拽/单击相关变量
        self.drag_start_x = 0
        self.drag_start_y = 0
        self.dragging = False
        self.click_pending = False
        self.drag_threshold = 5

        self.img_label.bind("<Button-1>", self.start_move)
        self.img_label.bind("<B1-Motion>", self.on_move)
        self.img_label.bind("<ButtonRelease-1>", self.stop_move)

        self.root.bind("<Control-MouseWheel>", self.on_zoom)
        self.root.bind("<Control-Button-4>", self.on_zoom)
        self.root.bind("<Control-Button-5>", self.on_zoom)

        # 右键菜单
        self.menu = None
        self.img_label.bind("<Button-3>", self.show_menu)

        # 输入框区域
        self.input_frame = tk.Frame(self.root, bg='white', bd=1, relief='solid', highlightbackground='#ccc')
        self.input_frame.pack(pady=8, padx=10, fill='x', side='bottom')

        self.entry = tk.Entry(self.input_frame, font=("微软雅黑", 10), bg='white', fg='#333',
                               relief='flat', bd=0)
        self.entry.pack(side='left', fill='x', expand=True, padx=(5, 5), pady=5)
        self.entry.bind("<Return>", self.send_message)

        self.send_btn = tk.Button(self.input_frame, text="发送", command=self.send_message,
                                  font=("微软雅黑", 9), bg='#a0c4ff', fg='white',
                                  relief='flat', padx=10, bd=0)
        self.send_btn.pack(side='right', padx=5, pady=5)

        self.root.update_idletasks()
        self.set_position_bottom_right()

        # 消息相关实例属性
        self.message_queue = []
        self.displaying = False
        self.full_text = ""
        self.typed_index = 0
        self.typing_job = None
        self.stay_job = None
        self.fade_job = None
        self.can_skip_to_next = False
        self.last_click_time = 0

        # 视觉识别相关
        self.vision_enabled = VISION_ENABLED_DEFAULT
        self.vision_interval = VISION_INTERVAL_DEFAULT

        # 绑定焦点事件，自动聚焦输入框
        self.root.bind("<FocusIn>", self.on_focus_in)

        self.root.after(500, self.introduce_yourself)
        self.root.after(100, lambda: self.entry.focus_set())

        self.click_animation_timer = None

        # 启动视觉识别线程（如果开启）
        if self.vision_enabled:
            self.start_vision_thread()

    # ---------- 界面布局 ----------
    def set_position_bottom_right(self):
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        window_width = self.root.winfo_width()
        window_height = self.root.winfo_height()
        x = screen_width - window_width - 20
        y = screen_height - window_height - 20
        self.root.geometry(f"+{x}+{y}")

    def calculate_initial_scale(self):
        original_height = self.original_images["normal1"].height
        scale = FIXED_HEIGHT / original_height
        return max(MIN_SCALE, min(MAX_SCALE, scale))

    def load_original_images(self):
        try:
            img = Image.open(IMG_NORMAL1).convert("RGBA")
            self.original_images["normal1"] = img
        except:
            messagebox.showerror("错误", f"找不到图片 {IMG_NORMAL1}，程序将退出。")
            sys.exit(1)

        try:
            img = Image.open(IMG_NORMAL2).convert("RGBA")
            self.original_images["normal2"] = img
        except:
            self.original_images["normal2"] = self.original_images["normal1"]

        try:
            img = Image.open(IMG_PULL).convert("RGBA")
            self.original_images["pull"] = img
        except:
            self.original_images["pull"] = self.original_images["normal1"]

        try:
            img = Image.open(IMG_CLICK).convert("RGBA")
            self.original_images["click"] = img
        except:
            print(f"警告：找不到 {IMG_CLICK}，单击功能将使用 normal1 图片。")
            self.original_images["click"] = self.original_images["normal1"]

    def update_scaled_images(self):
        self.scaled_images = {}
        for name, pil_img in self.original_images.items():
            new_size = (int(pil_img.width * self.scale), int(pil_img.height * self.scale))
            resized = pil_img.resize(new_size, Image.Resampling.LANCZOS)
            self.scaled_images[name] = ImageTk.PhotoImage(resized)
        self.current_img = self.scaled_images.get("normal1")
        if hasattr(self, 'img_label') and self.img_label.winfo_exists():
            self.img_label.config(image=self.current_img)

    def set_image(self, state):
        if state == "talk":
            self.img_label.config(image=self.scaled_images["normal2"])
        elif state == "pull":
            self.img_label.config(image=self.scaled_images["pull"])
        elif state == "click":
            self.img_label.config(image=self.scaled_images["click"])
        else:
            self.img_label.config(image=self.scaled_images["normal1"])
        self.root.update()

    def click_animation(self):
        if self.click_animation_timer:
            self.root.after_cancel(self.click_animation_timer)
            self.click_animation_timer = None
        self.set_image("click")
        self.click_animation_timer = self.root.after(2000, self.reset_after_click)

    def reset_after_click(self):
        if not self.dragging:
            self.set_image("normal")
        self.click_animation_timer = None

    # ---------- 拖拽/单击逻辑 ----------
    def start_move(self, event):
        self.drag_start_x = event.x_root
        self.drag_start_y = event.y_root
        self.dragging = False
        self.click_pending = True

    def on_move(self, event):
        if self.click_pending:
            dx = event.x_root - self.drag_start_x
            dy = event.y_root - self.drag_start_y
            if abs(dx) > self.drag_threshold or abs(dy) > self.drag_threshold:
                self.click_pending = False
                self.dragging = True
                self.set_image("pull")
                x = self.root.winfo_x() + dx
                y = self.root.winfo_y() + dy
                self.root.geometry(f"+{x}+{y}")
                self.drag_start_x = event.x_root
                self.drag_start_y = event.y_root
        elif self.dragging:
            x = self.root.winfo_x() + (event.x_root - self.drag_start_x)
            y = self.root.winfo_y() + (event.y_root - self.drag_start_y)
            self.root.geometry(f"+{x}+{y}")
            self.drag_start_x = event.x_root
            self.drag_start_y = event.y_root
            if hasattr(self, 'bubble') and self.bubble.winfo_exists():
                self.update_bubble_position()
                self.redraw_bubble()

    def stop_move(self, event):
        if self.dragging:
            self.dragging = False
            self.set_image("normal")
        elif self.click_pending:
            self.click_pending = False
            self.click_animation()
        self.dragging = False
        self.click_pending = False

    # ---------- 缩放 ----------
    def on_zoom(self, event):
        if event.delta > 0 or (hasattr(event, 'num') and event.num == 4):
            self.zoom(SCALE_STEP)
        else:
            self.zoom(-SCALE_STEP)
        return "break"

    def zoom(self, delta, reset=False):
        if reset:
            new_scale = self.initial_scale
        else:
            new_scale = self.scale + delta
            new_scale = max(MIN_SCALE, min(MAX_SCALE, new_scale))
        if new_scale == self.scale:
            return
        self.scale = new_scale
        self.update_scaled_images()
        self.root.update_idletasks()
        img_width = self.scaled_images["normal1"].width()
        img_height = self.scaled_images["normal1"].height()
        new_height = img_height + 70
        new_width = img_width + 20
        self.root.geometry(f"{new_width}x{new_height}")
        if new_height < 100:
            self.root.geometry(f"{new_width}x{100}")
        if hasattr(self, 'bubble') and self.bubble.winfo_exists():
            self.update_bubble_position()
            self.redraw_bubble()

    # ---------- 菜单 ----------
    def show_menu(self, event):
        self.menu = Menu(self.root, tearoff=0)
        self.menu.add_command(label="🔍 放大", command=lambda: self.zoom(SCALE_STEP))
        self.menu.add_command(label="🔍 缩小", command=lambda: self.zoom(-SCALE_STEP))
        self.menu.add_command(label="🔄 重置大小", command=lambda: self.zoom(0, reset=True))
        self.menu.add_separator()
        self.menu.add_command(label="🧪 化学小实验推荐", command=self.chemistry_experiment)
        self.menu.add_command(label="📚 元素周期表小游戏", command=self.periodic_game)
        self.menu.add_command(label="🔬 今日化学冷知识", command=self.cold_knowledge)
        self.menu.add_separator()
        # 视觉识别菜单
        vision_status = "关闭视觉识别" if self.vision_enabled else "开启视觉识别"
        self.menu.add_command(label="👁️ " + vision_status, command=self.toggle_vision)
        self.menu.add_command(label="⏱️ 设置视觉识别间隔", command=self.set_vision_interval)
        self.menu.add_command(label="🔍 立即识别屏幕", command=self.manual_vision)
        self.menu.add_separator()
        self.menu.add_command(label="⚙️ 设置 API Key", command=self.set_api_key)
        self.menu.add_command(label="❌ 退出", command=self.exit_app)
        self.menu.post(event.x_root, event.y_root)

    def exit_app(self):
        self.root.quit()
        self.root.destroy()

    def set_api_key(self):
        new_key = simpledialog.askstring("设置 API Key", "请输入新的 DeepSeek API Key：", parent=self.root)
        if new_key:
            global DEEPSEEK_API_KEY
            DEEPSEEK_API_KEY = new_key
            messagebox.showinfo("成功", "API Key 已更新！")

    def chemistry_experiment(self):
        experiments = [
            "🍋 紫甘蓝指示剂：将紫甘蓝切碎煮水，滤出紫色汁液。遇到酸性（柠檬汁）变红，遇到碱性（小苏打水）变蓝。",
            "🥛 大象牙膏：双氧水+酵母+洗洁精，产生大量泡沫（需在家长或老师指导下进行）。",
            "🧂 水中花园：硅酸钠溶液中投入彩色金属盐晶体，会生长出类似植物的结构。",
            "🔥 焰色反应：用铂丝蘸取不同金属盐在酒精灯上灼烧，观察火焰颜色（锂红、钠黄、钾紫等）。"
        ]
        self.show_bubble_message("✨ 化学小实验 ✨\n" + random.choice(experiments))

    def periodic_game(self):
        elements = [
            ("氢", "H", "最轻的元素"), ("氦", "He", "稀有气体，常用于气球"),
            ("锂", "Li", "用于锂电池"), ("碳", "C", "有机物的骨架"),
            ("钠", "Na", "活泼金属，与水剧烈反应"), ("铁", "Fe", "最常见的金属")
        ]
        elem = random.choice(elements)
        question = f"元素 {elem[0]}（{elem[1]}）的特点是？\n提示：{elem[2]}"
        self.show_bubble_message(question)

    def cold_knowledge(self):
        knowledges = [
            "🐟 鱼腥味其实是三甲胺的气味，用醋（乙酸）可以中和它。",
            "💧 水分子有两个氢原子和一个氧原子，但它们的键角是104.5°，不是180°。",
            "🍌 香蕉含有钾-40，一种天然放射性同位素，所以香蕉具有微弱放射性。",
            "⚗️ 元素周期表中，镓的熔点只有29.8℃，放在手心里就会熔化。"
        ]
        self.show_bubble_message("🔎 化学冷知识 🔎\n" + random.choice(knowledges))

    # ---------- 气泡消息 ----------
    def show_bubble_message(self, text):
        sentences = self.split_sentences(text)
        self.message_queue.extend(sentences)
        if not self.displaying:
            self.show_next_message()

    def split_sentences(self, text):
        sentences = re.split(r'(?<=[。！？])\s*', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences

    def introduce_yourself(self):
        intro = "锵锵~你的专属化学小助手‘小幻语’来报到啦！✨ 我刚刚从锥形瓶里钻出来，身上还带着薄荷的清香味呢。无论你是被作业题难住，还是好奇厨房里的酸碱大作战，或者是单纯想听一个关于元素的小故事，我都超级乐意陪你一起探索！今天有什么我可以帮到你的呀？(｡♥‿♥｡)"
        self.start_display_message(intro)

    def start_display_message(self, full_msg):
        sentences = self.split_sentences(full_msg)
        self.message_queue.extend(sentences)
        if not self.displaying:
            self.show_next_message()

    def show_next_message(self):
        if not self.message_queue:
            self.displaying = False
            return
        self.displaying = True
        self.can_skip_to_next = False
        self.full_text = self.message_queue.pop(0)
        self.typed_index = 0
        self.set_image("talk")
        self.create_bubble_window()
        self.type_next_char()

    def create_bubble_window(self):
        if hasattr(self, 'bubble') and self.bubble.winfo_exists():
            self.bubble.destroy()
        self.bubble = tk.Toplevel(self.root)
        self.bubble.overrideredirect(True)
        self.bubble.attributes('-topmost', True)
        self.bubble.configure(bg='white')

        # 定期置顶，防止被其他窗口覆盖
        def keep_on_top():
            if hasattr(self, 'bubble') and self.bubble.winfo_exists():
                self.bubble.attributes('-topmost', True)
                self.bubble.lift()
                self.root.after(1000, keep_on_top)
        keep_on_top()

        bubble_width = max(350, int(450 * self.scale))
        bubble_height = max(180, int(220 * self.scale))
        self.bubble.geometry(f"{bubble_width}x{bubble_height}")
        self.bubble.update_idletasks()

        self.update_bubble_position()
        self.bubble.update_idletasks()

        self.bubble_canvas = tk.Canvas(self.bubble, bg='white', highlightthickness=0, bd=0)
        self.bubble_canvas.pack(fill='both', expand=True)

        pet_x = self.root.winfo_x()
        pet_y = self.root.winfo_y()
        img_width = self.scaled_images["normal1"].width()
        img_height = self.scaled_images["normal1"].height()
        head_x = pet_x + img_width / 2
        head_y = pet_y + img_height * 0.3
        bubble_x = self.bubble.winfo_x()

        if bubble_x + bubble_width < pet_x:
            direction = 'right'
        elif bubble_x > pet_x + img_width:
            direction = 'left'
        else:
            direction = 'right' if bubble_x < pet_x else 'left'

        self.draw_bubble_shape(bubble_width, bubble_height, direction, head_x, head_y)

        font_size = max(10, int(12 * self.scale))
        self.bubble_text = tk.Label(self.bubble, text="", font=("微软雅黑", font_size),
                                     bg='#f0f0f0', fg='#333', wraplength=bubble_width-40, justify='left')
        self.bubble_text.place(x=int(15*self.scale), y=int(12*self.scale),
                               width=bubble_width-30, height=bubble_height-24)
        self.bubble.bind("<Button-1>", self.on_bubble_click)

    def draw_bubble_shape(self, w, h, direction, target_x, target_y):
        if w <= 1 or h <= 1:
            return
        self.bubble_canvas.delete("all")
        r = max(12, int(20 * self.scale))
        self.bubble_canvas.create_round_rect(0, 0, w, h, r,
                                             fill='#f0f0f0', outline='#ddd', width=1)

    def redraw_bubble(self):
        if not hasattr(self, 'bubble') or not self.bubble.winfo_exists():
            return
        if not hasattr(self, 'bubble_canvas') or not self.bubble_canvas.winfo_exists():
            return
        w = self.bubble.winfo_width()
        h = self.bubble.winfo_height()
        if w <= 1 or h <= 1:
            return
        pet_x = self.root.winfo_x()
        pet_y = self.root.winfo_y()
        img_width = self.scaled_images["normal1"].width()
        img_height = self.scaled_images["normal1"].height()
        head_x = pet_x + img_width / 2
        head_y = pet_y + img_height * 0.3
        bubble_x = self.bubble.winfo_x()
        if bubble_x + w < pet_x:
            direction = 'right'
        elif bubble_x > pet_x + img_width:
            direction = 'left'
        else:
            direction = 'right' if bubble_x < pet_x else 'left'
        self.draw_bubble_shape(w, h, direction, head_x, head_y)

    def update_bubble_position(self):
        if not hasattr(self, 'bubble') or not self.bubble.winfo_exists():
            return
        pet_x = self.root.winfo_x()
        pet_y = self.root.winfo_y()
        img_width = self.scaled_images["normal1"].width()
        img_height = self.scaled_images["normal1"].height()
        bubble_width = self.bubble.winfo_width()
        bubble_height = self.bubble.winfo_height()
        bubble_x = pet_x - bubble_width - 5
        if bubble_x < 0:
            bubble_x = pet_x + img_width + 5
        head_y = pet_y + img_height * 0.3
        bubble_y = head_y - bubble_height // 2
        if bubble_y < 0:
            bubble_y = pet_y + img_height + 5
        screen_height = self.root.winfo_screenheight()
        if bubble_y + bubble_height > screen_height:
            bubble_y = screen_height - bubble_height - 10
        self.bubble.geometry(f"+{int(bubble_x)}+{int(bubble_y)}")

    def type_next_char(self):
        if self.typed_index < len(self.full_text):
            self.typed_index += 1
            self.bubble_text.config(text=self.full_text[:self.typed_index])
            self.typing_job = self.root.after(50, self.type_next_char)
        else:
            self.finish_typing()

    def finish_typing(self):
        if self.typing_job:
            self.root.after_cancel(self.typing_job)
            self.typing_job = None
        self.can_skip_to_next = True
        self.stay_job = self.root.after(2000, self.on_stay_timeout)

    def on_stay_timeout(self):
        self.stay_job = None
        if self.message_queue:
            self.clear_current_bubble()
            self.show_next_message()
        else:
            self.start_fade_out()

    def start_fade_out(self):
        def fade_step(step):
            if step <= 0:
                self.clear_current_bubble()
                self.set_image("normal")
                self.displaying = False
                return
            gray_val = 50 + step * 40
            color = f"#{gray_val:02x}{gray_val:02x}{gray_val:02x}"
            if self.bubble_text.winfo_exists():
                self.bubble_text.config(fg=color)
            self.root.after(100, lambda: fade_step(step-1))
        fade_step(5)

    def clear_current_bubble(self):
        if self.typing_job:
            self.root.after_cancel(self.typing_job)
            self.typing_job = None
        if self.stay_job:
            self.root.after_cancel(self.stay_job)
            self.stay_job = None
        if self.fade_job:
            self.root.after_cancel(self.fade_job)
            self.fade_job = None
        if hasattr(self, 'bubble') and self.bubble.winfo_exists():
            self.bubble.destroy()
        self.set_image("normal")

    def on_bubble_click(self, event):
        now = time.time()
        if now - self.last_click_time < 0.5:
            return
        self.last_click_time = now
        # 确保气泡窗口在最前
        if hasattr(self, 'bubble') and self.bubble.winfo_exists():
            self.bubble.attributes('-topmost', True)
            self.bubble.lift()
        if self.typing_job is not None:
            self.root.after_cancel(self.typing_job)
            self.typing_job = None
            self.bubble_text.config(text=self.full_text)
            self.finish_typing()
            return
        if self.can_skip_to_next:
            if self.stay_job:
                self.root.after_cancel(self.stay_job)
                self.stay_job = None
            if self.message_queue:
                self.clear_current_bubble()
                self.show_next_message()
            else:
                self.start_fade_out()

    # ---------- 用户对话 ----------
    def send_message(self, event=None):
        user_input = self.entry.get().strip()
        if not user_input:
            return
        self.entry.delete(0, tk.END)
        conversation_history.append({"role": "user", "content": user_input})
        self.entry.config(state='disabled')
        self.send_btn.config(state='disabled')
        self.start_display_message("✨ 小幻语正在思考中…… ✨")
        threading.Thread(target=self.call_deepseek_api, daemon=True).start()

    def call_deepseek_api(self):
        global conversation_history, DEEPSEEK_API_KEY
        headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": "deepseek-chat", "messages": conversation_history, "stream": False}
        try:
            response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                reply = data["choices"][0]["message"]["content"]
                conversation_history.append({"role": "assistant", "content": reply})
                self.root.after(0, lambda: self.start_display_message(reply))
            else:
                self.root.after(0, lambda: self.start_display_message("哎呀，API出了点小问题，请检查网络或API Key是否正确。"))
        except Exception as e:
            self.root.after(0, lambda: self.start_display_message(f"网络错误：{str(e)}"))
        finally:
            self.root.after(0, self.enable_input)

    def enable_input(self):
        self.entry.config(state='normal')
        self.send_btn.config(state='normal')
        self.entry.focus_set()

    # ---------- 视觉识别（使用视觉大模型）----------
    @staticmethod
    def encode_image(image):
        """将PIL Image转换为base64字符串（JPEG格式）"""
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=85)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

    def start_vision_thread(self):
        def vision_loop():
            last_hash = None
            last_process_time = 0
            cooldown_seconds = 10
            consecutive_errors = 0
            while self.vision_enabled:
                time.sleep(1)
                try:
                    screenshot = ImageGrab.grab()
                    current_hash = self.image_hash(screenshot)
                    now = time.time()

                    # 如果正在显示消息或用户正在输入，跳过触发
                    if self.displaying or (hasattr(self, 'entry') and self.entry.focus_get() == self.entry and self.entry.get()):
                        last_hash = current_hash
                        continue

                    if now - last_process_time < cooldown_seconds:
                        last_hash = current_hash
                        continue

                    need_process = False
                    reason = ""
                    if last_hash is None or self.hamming_distance(current_hash, last_hash) > VISION_CHANGE_THRESHOLD:
                        need_process = True
                        reason = "页面切换"
                    elif now - last_process_time >= self.vision_interval:
                        need_process = True
                        reason = "定时触发"

                    if need_process:
                        print(f"[视觉识别] 触发识别，原因：{reason}")
                        self.process_vision_image(screenshot)
                        last_process_time = now

                    last_hash = current_hash
                    consecutive_errors = 0

                except Exception as e:
                    consecutive_errors += 1
                    print(f"视觉识别循环错误 ({consecutive_errors}): {e}")
                    if consecutive_errors >= 5:
                        print("连续错误过多，暂停视觉识别10秒...")
                        time.sleep(10)
                        consecutive_errors = 0
        if self.vision_enabled:
            threading.Thread(target=vision_loop, daemon=True).start()

    @staticmethod
    def image_hash(img):
        img = img.resize((8, 8), Image.LANCZOS).convert('L')
        pixels = list(img.tobytes())
        avg = sum(pixels) / len(pixels)
        bits = ''.join('1' if p > avg else '0' for p in pixels)
        return int(bits, 2)

    @staticmethod
    def hamming_distance(hash1, hash2):
        diff = bin(hash1 ^ hash2).count('1')
        return diff / 64.0

    def process_vision_image(self, img):
        """发送截图给视觉模型"""
        try:
            # 压缩图片，限制最大尺寸减少传输量
            max_size = (1024, 1024)
            img.thumbnail(max_size, Image.LANCZOS)
            base64_image = self.encode_image(img)

            # 构造消息内容
            messages = [
                {"role": "system", "content": VISION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "这是当前屏幕的截图，请根据内容用你的风格回应。"},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ]

            headers = {"Authorization": f"Bearer {VISION_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": VISION_MODEL_NAME,
                "messages": messages,
                "max_tokens": 150
            }
            response = requests.post(VISION_MODEL_URL, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                reply = data["choices"][0]["message"]["content"]
                self.root.after(0, lambda: self.start_display_message(reply))
            else:
                print(f"视觉API请求失败: {response.status_code} - {response.text}")
                self.root.after(0, lambda: self.start_display_message("屏幕画面有点复杂，小幻语看不太懂呢..."))
        except Exception as e:
            print(f"视觉识别处理异常: {e}")
            self.root.after(0, lambda: self.start_display_message("哎呀，画面识别出错了，是不是魔法干扰？"))

    def toggle_vision(self):
        self.vision_enabled = not self.vision_enabled
        if self.vision_enabled:
            # 检查 API 配置
            if not VISION_API_KEY:
                messagebox.showwarning("警告", "未检测到视觉模型 API Key，请在项目根目录的 .env 中配置 VISION_API_KEY！")
                self.vision_enabled = False
                return
            self.start_vision_thread()
            messagebox.showinfo("提示", "视觉识别已开启，小幻语会偶尔看看你的屏幕啦~")
        else:
            messagebox.showinfo("提示", "视觉识别已关闭")

    def set_vision_interval(self):
        new_interval = simpledialog.askinteger("设置间隔", "请输入识别间隔（秒）：", 
                                                initialvalue=self.vision_interval, minvalue=5, maxvalue=300)
        if new_interval:
            self.vision_interval = new_interval
            messagebox.showinfo("成功", f"视觉识别间隔已设置为 {self.vision_interval} 秒")

    def manual_vision(self):
        """手动触发一次屏幕识别"""
        if not self.vision_enabled:
            messagebox.showinfo("提示", "请先开启视觉识别功能")
            return
        try:
            screenshot = ImageGrab.grab()
            self.process_vision_image(screenshot)
        except Exception as e:
            print(f"手动识别出错: {e}")
            self.show_bubble_message("手动识别失败，请检查网络或配置。")

    # ---------- 焦点事件处理 ----------
    def on_focus_in(self, event):
        if hasattr(self, 'entry') and self.entry.winfo_exists():
            self.entry.focus_set()

def create_round_rect(self, x1, y1, x2, y2, r, **kwargs):
    points = (x1+r, y1, x2-r, y1, x2, y1, x2, y1+r, x2, y2-r, x2, y2, x2-r, y2, x1+r, y2, x1, y2, x1, y2-r, x1, y1+r, x1, y1)
    return self.create_polygon(points, smooth=True, **kwargs)

tk.Canvas.create_round_rect = create_round_rect

if __name__ == "__main__":
    root = tk.Tk()
    app = DesktopPet(root)
    root.mainloop()
