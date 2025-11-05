import os
import sys
import json
from google import genai
from google.genai import types

# requests は resolve_url.py で使用するため、ここでは不要

def search_articles(search_term, api_key):
    """
    Gemini APIを呼び出し、Groundingを使用して記事リストのJSONを生成する。
    """
    # 1. クライアントの初期化
    client = genai.Client(api_key=api_key)

    # 2. プロンプトの定義 (ファクトチェックフィルタリング指示を適用)
    prompt_text = f"""
        あなたは、SNS上の偽・誤情報のファクトチェックに必要な信頼できる情報源を収集する専門家です。
        以下の検索キーワード「{search_term}」について、インターネット上で「{search_term}」に関係する偽・誤情報についての情報を検索してください。

        検索の際、特に以下の**厳しい条件**を満たす記事や情報を優先して収集してください。
        1. 信頼性の高い情報源: 公的機関の発表、主要な報道機関、大学や研究機関、または特定の分野の専門家が発信する記事。
        2. 検証や解説を含む記事: **単なる速報ではなく、情報の真偽や科学的根拠について検証・解説している記事（ファクトチェック記事を優先）。**

        ## 出力形式

        収集した情報源の「記事タイトル」と「URL」を、信頼性が高い順に**最大5件**、以下の厳密なJSON配列の形式で出力してください。
        
        【最重要ルール】
        1. タイトル: 検索結果から取得した**元の記事のタイトルをそのまま引用**してください。**ただし、タイトルに含まれる二重引用符（"）は、必ずバックスラッシュ（\）でエスケープ（\"）してください。**
        2. URL: 検索で取得した元の記事のURLをそのまま引用してください。
        3. JSON: JSON配列以外のテキスト、説明、Markdown記法（例：```json）は**一切含めないでください**。
        4. 件数: 最大5つのオブジェクトを含む配列を出力してください。
        
        [
          {{"title": "記事タイトル1", "url": "URL1"}},
          {{"title": "記事タイトル2", "url": "URL2"}},
          {{"title": "", "url": ""}},  // 5件未満の場合の例
          // ... 最大5件まで続ける ...
        ]
    """

    # 3. API呼び出しの設定 (Groundingと創造性の抑制)
    # Python SDKでは、config内にToolsを設定
    generation_config = types.GenerateContentConfig(
        tools=[{"googleSearch": {}}], # 重要なGrounding設定
        temperature=0.0 # 創造性を抑制し、検索結果に忠実にする
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt_text)]
                )
            ],
            config=generation_config
        )
        
        # 4. 応答テキスト（モデルが生成したJSON）を標準出力
        # Ruby側で受け取れるよう、strip()で不要な空白を除去
        print(response.text.strip()) 
        sys.exit(0) # 正常終了

    except Exception as e:
        # エラー発生時は標準エラーに出力
        print(f"Python Error: {e}", file=sys.stderr)
        sys.exit(1) # エラーコードで終了

if __name__ == "__main__":
    # Railsから渡される引数（検索キーワードとAPIキー）を取得
    if len(sys.argv) < 3:
        sys.exit(1)

    search_term = sys.argv[1]
    api_key = sys.argv[2]
    search_articles(search_term, api_key)