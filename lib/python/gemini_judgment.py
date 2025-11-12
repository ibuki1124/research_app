# research/research_app/lib/python/gemini_judgment.py

import sys
import json
from google import genai
from google.genai import types

def generate_judgment(full_prompt, api_key):
    client = genai.Client(api_key=api_key)

    # 判定はファクトベースで行うため、Groundingは不要（情報が既にプロンプトに含まれるため）
    # ただし、厳密なJSON出力のため temperature=0.0 は維持
    generation_config = types.GenerateContentConfig(
        temperature=0.0
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash", # またはより強力なモデル (例: gemini-2.5-pro)
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=full_prompt)])],
            config=generation_config
        )
        
        # 応答テキスト（モデルが生成したJSON）を標準出力
        # Ruby側で受け取れるよう、strip()で不要な空白を除去
        print(response.text.strip()) 
        sys.exit(0)

    except Exception as e:
        print(f"Python Judgment Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # 引数: [0]スクリプト名, [1]プロンプト, [2]APIキー
    if len(sys.argv) < 3:
        sys.exit(1)
        
    full_prompt = sys.argv[1]
    api_key = sys.argv[2]
    generate_judgment(full_prompt, api_key)