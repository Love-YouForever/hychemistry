from flask import Flask
from flask_cors import CORS
import subprocess

app = Flask(__name__)
CORS(app) # 允许跨域

@app.route('/start-pet')
def start_pet():
    # 运行你的 bat 或者 exe
    subprocess.Popen(r"C:\Users\16952\Desktop\Element\AIgent\oc.exe", creationflags=subprocess.CREATE_NEW_CONSOLE)
    return "Started!"

if __name__ == '__main__':
    app.run(port=5000)
