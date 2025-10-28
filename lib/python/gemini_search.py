import os
import sys
import json
# 🚨 公式Python SDKのインポート
from google import genai
from google.genai import types

def search_articles(search_term, api_key):
    """
    Gemini APIを呼び出し、リアルタイム検索（Grounding）を使用して記事リストを生成する。
    """
    # 1. クライアントの初期化
    client = genai.Client(api_key=api_key)

    # 2. プロンプトの定義 (Ruby側のものをPython形式に変換)
    prompt_text = f"""
        あなたは、SNS上の偽・誤情報のファクトチェックに必要な信頼できる情報源を収集する専門家です。
        以下の検索キーワード「{search_term}」について、インターネット上で情報を検索してください。

        検索の際、特に以下の条件を満たす記事や情報を優先して収集してください。
        1.  **信頼性の高い情報源**: 公的機関の発表、主要な報道機関、大学や研究機関、または特定の分野の専門家が発信する記事。
        2.  **検証や解説を含む記事**: 単なるニュースの速報ではなく、情報の真偽や科学的根拠について検証・解説している記事。

        ## 出力形式

        収集した情報源の「記事タイトル」と「URL」を、信頼性が高い順に最大5件まで、以下の厳密な形式でリストアップしてください。
        それ以外のテキストは一切含めないでください。

        例:
        - [記事タイトル1] - [URL1]
        - [記事タイトル2] - [URL2]
        - [記事タイトル3] - [URL3]
    """

    # 3. API呼び出しの設定 (Groundingを有効化)
    # Python SDKでは、config内にToolsを設定
    generation_config = types.GenerateContentConfig(
        tools=[{"googleSearch": {}}] # 🚨 重要なGrounding設定
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        # 🚨 修正: text= を付けてキーワード引数として渡す 🚨
                        types.Part.from_text(text=prompt_text)
                    ]
                )
            ],
            config=generation_config
        )
        
        # 4. 応答テキストを標準出力に出力
        # Ruby側で受け取れるよう、strip()で不要な空白を除去
        print(response.text.strip()) 
        
    except Exception as e:
        # エラー発生時は標準エラーに出力
        print(f"Python Error: {e}", file=sys.stderr)
        sys.exit(1) # エラーコードで終了

if __name__ == "__main__":
    # Railsから渡される引数（検索キーワードとAPIキー）を取得
    if len(sys.argv) < 3:
        # print("Usage: python3 gemini_search.py <search_term> <api_key>", file=sys.stderr)
        sys.exit(1)

    search_term = sys.argv[1]
    api_key = sys.argv[2]
    search_articles(search_term, api_key)