"""
这段代码是一个独立的 Python 脚本，目的是从多个来源（维基百科 API、本地中文 JSON、CDN 基础数据）抓取并整合周期表中每个元素的详细信息，
最终生成一个 periodic_table_enriched.json 文件，供前面讲解的 Flask 应用使用
"""

import os
import json
import time
import requests
import ssl
import warnings
from urllib3.exceptions import InsecureRequestWarning
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from bs4 import BeautifulSoup
from tqdm import tqdm
import urllib.parse
import logging
import concurrent.futures
import hashlib
import re

# 1. 强制使用 TLS 1.2 协议，解决握手失败
ssl._create_default_https_context = ssl._create_unverified_context
# 2. 关闭不安全请求警告（仅临时用，不影响功能）
warnings.simplefilter('ignore', InsecureRequestWarning)

# 3. 给 requests 配置代理（如果你的代理是 http://127.0.0.1:7890，按实际修改）
PROXIES = {
    "http": "http://127.0.0.1:7890",
    "https": "http://127.0.0.1:7890"
}

# --- 配置 ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("element_scraper.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)


# --- 网络健壮性配置 ---
def create_retry_session():
    """
    创建一个带有强大重试机制的 requests.Session 对象。
    """
    session = requests.Session()
    # 定义重试策略
    retry_strategy = Retry(
        total=5,  # 总重试次数
        backoff_factor=1,  # 退避因子: 第一次等1s, 第二次等2s, 第三次等4s...
        status_forcelist=[429, 500, 502, 503, 504],  # 对这些状态码进行重试
        allowed_methods=["HEAD", "GET", "OPTIONS"]  # 对这些请求方法重试
    )
    # 创建一个适配器并将重试策略挂载上去
    adapter = HTTPAdapter(max_retries=retry_strategy)
    # 为 http 和 https 都应用这个适配器
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


# 创建全局的 Session 对象，所有线程共享
SESSION = create_retry_session()
SESSION.headers.update({
    'User-Agent': 'ElementScraper/3.0 (Python; with-robust-retries) requests/2.28.1',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,application/json',
    'Connection': 'keep-alive',
})
# 配置代理
SESSION.proxies = PROXIES

# 本地中文数据文件的路径
LOCAL_ZH_DATA_FILE = "api_chinese_data.json"

MIME_TYPE_MAP = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
    'image/svg+xml': '.svg', 'image/webp': '.webp', 'text/xml': '.svg',
}
DEFAULT_EXTENSION = '.jpg'
DATA_URL = "https://cdn.jsdelivr.net/gh/Bowserinator/Periodic-Table-JSON@master/PeriodicTableJSON.json"
DATA_DIR = "periodic_table_data"
IMAGE_DIR = "static/images"
MODEL_DIR = "static/models"
# 降级为单线程，避免卡死
MAX_WORKERS = 1

# --- 创建目录 ---
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)


# --- 更新后的文件下载与网页处理函数 ---
# 所有函数都将使用全局的 SESSION 对象
def download_file(url, save_path):
    # 直接跳过所有文件下载
    return False
    if not url: return False
    if os.path.exists(save_path) and os.path.getsize(save_path) > 0: return True
    try:
        response = SESSION.get(url, stream=True, timeout=30)
        response.raise_for_status()
        with open(save_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except requests.exceptions.RequestException as e:
        logging.error(f"Gave up simple download for {url} after multiple retries. Error: {e}")
    return False


def download_and_save_image(url, base_filepath):
    # 直接跳过所有图片下载
    return None
    if not url: return None
    try:
        response = SESSION.get(url, stream=True, timeout=30)
        response.raise_for_status()
        content_type = response.headers.get('Content-Type', '').split(';')[0].strip()
        extension = MIME_TYPE_MAP.get(content_type, DEFAULT_EXTENSION)
        final_save_path = base_filepath + extension

        if os.path.exists(final_save_path) and os.path.getsize(final_save_path) > 0:
            return f"/static/{os.path.relpath(final_save_path, 'static')}".replace('\\', '/')

        with open(final_save_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return f"/static/{os.path.relpath(final_save_path, 'static')}".replace('\\', '/')
    except requests.exceptions.RequestException as e:
        logging.error(f"Gave up downloading image {url} after multiple retries. Error: {e}")
    return None


def extract_wiki_image_url(page_url):
    # 直接跳过提取图片URL
    return None
    if not page_url: return None
    try:
        response = SESSION.get(page_url, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'lxml')
        link_tag = soup.select_one('.fullMedia a, #file a')
        if link_tag and link_tag.get('href'):
            return urllib.parse.urljoin(page_url, link_tag['href'])
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to extract wiki image URL from {page_url} after multiple retries. Error: {e}")
    return None


def process_and_download_wiki_content(html_content, lang, element_number):
    """
    处理维基百科的HTML内容，优先下载最大尺寸的图片，并修复所有相关链接。
    """
    if not html_content: return ""
    soup = BeautifulSoup(html_content, 'lxml')
    base_url = f"https://{lang}.wikipedia.org"

    # 1. 修复普通的 /wiki/ 链接，让它们指向维基百科官网
    # 这个循环只处理非文件链接，图片链接在下面集中处理
    for a_tag in soup.find_all('a', href=True):
        href = a_tag['href']
        if href.startswith('/wiki/') and not href.startswith('/wiki/File:'):
            a_tag['href'] = urllib.parse.urljoin(base_url, href)

    # 2. 移除所有图片标签，避免下载
    for img_tag in soup.find_all('img'):
        img_tag.decompose()

    return str(soup)

def get_wikipedia_data_via_api(element_name, lang="en", element_number=0):
    api_url = f"https://{lang}.wikipedia.org/w/api.php"
    # 主API调用
    params = {"action": "parse", "page": element_name, "prop": "text|sections|displaytitle", "format": "json",
              "formatversion": 2, "redirects": True}
    try:
        response = SESSION.get(api_url, params=params, timeout=20)
        response.raise_for_status()
        data = response.json()
        if "error" in data:
            logging.warning(f"Wikipedia API returned an error for '{element_name}': {data['error']['info']}")
            return None, None

        parsed_data = data.get("parse", {})
        page_title = parsed_data.get("title")
        if not page_title: return None, None
        page_url = f"https://{lang}.wikipedia.org/wiki/{urllib.parse.quote(page_title)}"

        soup = BeautifulSoup(parsed_data.get("text", ""), 'lxml')
        infobox = {}

        processed_sections = []
        api_sections = parsed_data.get("sections", [])
        skip_keywords = ['see also', 'references', 'external links'] if lang == "en" else ['参见', '参考文献',
                                                                                           '外部链接']
        all_section_indices = ["0"] + [s["index"] for s in api_sections if
                                       not any(kw in s["line"].lower() for kw in skip_keywords)]

        for index in all_section_indices:
            # 分节内容调用
            section_params = {"action": "parse", "page": page_title, "prop": "text", "section": index, "format": "json",
                              "formatversion": 2}
            sec_res = SESSION.get(api_url, params=section_params, timeout=20)
            sec_res.raise_for_status()
            raw_html = sec_res.json().get("parse", {}).get("text", "")
            sec_info = next((s for s in api_sections if s["index"] == index), None)
            title = parsed_data.get("displaytitle") if index == "0" else sec_info['line']
            processed_content = process_and_download_wiki_content(raw_html, lang, element_number)
            processed_sections.append(
                {"id": sec_info['anchor'] if sec_info else "intro", "title": title, "content": processed_content})
        return {"infobox": infobox, "sections": processed_sections}, page_url
    except Exception as e:
        # 这个日志现在意味着“经过多次重试后，最终还是失败了”
        logging.error(
            f"Failed to get/process Wikipedia data for '{element_name}' ({lang}) after all retries. Error: {e}")
        return None, None


def get_main_image_url_from_page(element_name):
    # 直接跳过获取图片URL
    page_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(element_name.replace(' ', '_'))}"
    return None, page_url
    try:
        response = SESSION.get(page_url, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        final_url = response.url

        infobox = soup.find('table', class_='infobox')
        if infobox:
            parent_a = infobox.find('a', class_='image')
            if parent_a and parent_a.get('href'):
                file_page_url = urllib.parse.urljoin('https://en.wikipedia.org/', parent_a['href'])
                full_img_url = extract_wiki_image_url(file_page_url)
                if full_img_url: return full_img_url, final_url
        return None, final_url
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to get main image page for '{element_name}' after all retries. Error: {e}")
        return None, page_url


# --- 主处理逻辑 (无变化) ---
def process_element(element, element_zh_data):
    name = element.get('name', 'Unknown')
    number = element.get('number')
    symbol = element.get('symbol')
    logging.info(f"Processing: {name} (No. {number})")

    element_images = {}

    # 英文内容...
    main_img_url, en_wiki_url = get_main_image_url_from_page(name)
    element["wikipedia_url_en"] = en_wiki_url
    if main_img_url:
        base_filepath = os.path.join(IMAGE_DIR, f"{number}_{symbol}_main")
        saved_path = download_and_save_image(main_img_url, base_filepath)
        if saved_path: element_images["main"] = saved_path

    wikipedia_content = {}
    en_wiki_data, _ = get_wikipedia_data_via_api(name, "en", number)
    if en_wiki_data:
        wikipedia_content["en"] = en_wiki_data

    # 中文内容...
    if element_zh_data:
        zh_name = element_zh_data.get('zwmc')
        if zh_name:
            zh_wiki_data, zh_wiki_url = get_wikipedia_data_via_api(zh_name, "zh", number)
            element["wikipedia_url_zh"] = zh_wiki_url
            if zh_wiki_data:
                zh_wiki_data["infobox"] = element_zh_data
                wikipedia_content["zh"] = zh_wiki_data
        else:
            logging.warning(f"Local data for No. {number} exists but 'zwmc' (Chinese name) is missing.")
    else:
        logging.warning(f"Could not find local Chinese data for element No. {number}.")

    # 其他下载...
    spectral_page_url = f"https://commons.wikimedia.org/wiki/File:{number}_({symbol}_I)_NIST_ASD_emission_spectrum.png"
    final_spectral_url = extract_wiki_image_url(spectral_page_url)
    if final_spectral_url:
        base_filepath = os.path.join(IMAGE_DIR, f"{number}_{symbol}_spectrum")
        saved_path = download_and_save_image(final_spectral_url, base_filepath)
        if saved_path: element_images["spectrum"] = saved_path

    bohr_3d_url = element.get("bohr_model_3d")
    if bohr_3d_url:
        ext = os.path.splitext(urllib.parse.urlparse(bohr_3d_url).path)[1] or '.glb'
        filename = f"{number}_{symbol}_bohr_model{ext}"
        save_path = os.path.join(MODEL_DIR, filename)
        if download_file(bohr_3d_url, save_path):
            element["model_url"] = f"/static/models/{filename}"

    for key in ["bohr_model_image", "spectral_img", "bohr_model_3d", "image"]:
        element.pop(key, None)

    element["images"] = element_images
    element["wikipedia_content"] = wikipedia_content
    return element


# --- 主函数 (无变化) ---
def main():
    print("Step 1: Downloading main periodic table JSON data...")
    try:
        response = SESSION.get(DATA_URL, timeout=30)
        response.raise_for_status()
        json_data = response.json()
        elements_to_process = json_data["elements"]
    except Exception as e:
        logging.error(f"Fatal error downloading main JSON after all retries: {e}")
        return

    print(f"\nStep 2: Loading local Chinese element data from '{LOCAL_ZH_DATA_FILE}'...")
    zh_data_map = {}
    local_data_path = os.path.join(DATA_DIR, LOCAL_ZH_DATA_FILE)
    try:
        with open(local_data_path, "r", encoding="utf-8") as f:
            zh_data_map = json.load(f)
        print(f"Successfully loaded data for {len(zh_data_map)} elements from local file.")
    except FileNotFoundError:
        logging.error(f"'{local_data_path}' not found. Please run 'fetch_api_data.py' first to generate it.")
        return
    except json.JSONDecodeError:
        logging.error(f"'{local_data_path}' is not a valid JSON file. Please check or regenerate it.")
        return

    print(f"\nStep 3: Processing {len(elements_to_process)} elements with up to {MAX_WORKERS} threads...")
    processed_elements = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_element = {
            executor.submit(process_element, elem, zh_data_map.get(str(elem['number']))): elem
            for elem in elements_to_process
        }
        for future in tqdm(concurrent.futures.as_completed(future_to_element), total=len(elements_to_process),
                           desc="Processing Elements"):
            try:
                processed_elements.append(future.result())
            except Exception as exc:
                element_name = future_to_element[future]['name']
                logging.error(f"'{element_name}' generated an unhandled exception during processing: {exc}",
                              exc_info=True)

    processed_elements.sort(key=lambda x: x['number'])
    json_data["elements"] = processed_elements
    processed_json_path = os.path.join(DATA_DIR, "periodic_table_enriched.json")

    with open(processed_json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ All done! Processed data for {len(processed_elements)} elements saved to '{processed_json_path}'")


if __name__ == "__main__":
    main()
    

"""
脚本的整体流程概览:
1.下载基础 JSON 数据（从 Periodic-Table-JSON 仓库的 CDN 获取元素基本属性：名称、符号、原子序数、熔点、沸点等）。

2.加载本地中文数据文件（api_chinese_data.json，包含元素中文名、中文维基信息等）。

3.多线程处理每个元素：
    获取英文维基百科的详细内容（介绍、章节）。
    获取中文维基百科内容（若有）。
    下载主图片、光谱图、3D 玻尔模型等资源。
    将以上信息整合到元素对象中。

4.输出富化后的 JSON 文件（periodic_table_enriched.json），供后续 Web 应用使用
"""