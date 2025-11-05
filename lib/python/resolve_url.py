import sys
import requests

def resolve_url(url):
    """リダイレクトを追跡し、最終的な安定URLを返す"""
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
    }
    
    # URLが不正な場合は元のURLをそのまま返す
    if not url.startswith('http'):
        return url
        
    try:
        # requests.get を使ってリダイレクトを追跡 (5秒タイムアウト)
        # r = requests.get(url, allow_redirects=True, timeout=5)
        r = requests.get(url, allow_redirects=True, timeout=5, headers=headers)
        
        # 最終的な URL を返す
        return r.url
    except requests.exceptions.RequestException as e:
        # リンク切れやタイムアウトの場合は、元の不安定なURLをフォールバックとして返す
        # Railsログに出力されるように、エラー内容を stderr に出力
        print(f"URL Resolution Failed (using fallback): {url} - {e}", file=sys.stderr)
        return url 

if __name__ == "__main__":
    # Railsから渡されたURLを取得し、解決後のURLを標準出力に出力
    if len(sys.argv) > 1:
        original_url = sys.argv[1]
        resolved_url = resolve_url(original_url)
        print(resolved_url)
    else:
        # 引数がない場合はエラー終了
        sys.exit(1)