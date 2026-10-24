# 変調比較サンドボックス

同じ正弦波キャリア／モジュレータで **AM・FM・PM・RM（リング変調）** を生成し、聴感と時間波形・振幅スペクトルの違いを並べて確認する Web アプリです。

## 構成

- `backend/` — FastAPI + NumPy。`POST /api/modulate` で 4 方式の PCM と可視化用データを返す
- `frontend/` — Vite + React。共有スライダと数値入力、再生、波形／スペクトル表示

## 起動方法（Windows / PowerShell）

Python と Node.js/npm をインストールしてください。リポジトリのルートで PowerShell を開き、初回のみ各ターミナルでセットアップを行います。

### 1. バックエンド

1つ目のターミナルで、仮想環境を作成して依存パッケージをインストールします。

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

セットアップ後、同じターミナルでバックエンドを起動します。

```powershell
uvicorn app.main:app --reload --port 8000
```

### 2. フロントエンド

別のターミナルをリポジトリのルートで開き、初回のみ依存パッケージをインストールします。

```powershell
cd frontend
npm ci
```

セットアップ後、同じターミナルでフロントエンドを起動します。

```powershell
npm run dev
```

### 3. アプリを開く

ブラウザで [http://127.0.0.1:5173](http://127.0.0.1:5173) を開きます。フロントエンドからの `/api` リクエストは、Vite がバックエンドの `http://127.0.0.1:8000` に中継します。終了するときは、それぞれのターミナルで `Ctrl+C` を押してください。

## バックエンドテスト

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -q
```

## パラメータの解釈

スライダは 4 方式で共通です。`modulator_level` の意味だけ方式ごとに異なります。

- AM: 変調度 `μ`
- FM: 最大周波数偏移 `Δf = modulator_level × 2000 Hz`、変調指数 `β = Δf / fm`
- PM: 最大位相偏移 `kp = modulator_level × π` rad
- RM: モジュレータ振幅（キャリアとの積）
