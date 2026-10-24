# 変調比較サンドボックス

同じ正弦波キャリア／モジュレータで **AM・FM・PM・RM（リング変調）** を生成し、聴感と時間波形・振幅スペクトルの違いを並べて確認する Web アプリです。

## 構成

- `backend/` — FastAPI + NumPy。`POST /api/modulate` で 4 方式の PCM と可視化用データを返す
- `frontend/` — Vite + React。共有スライダと数値入力、再生、波形／スペクトル表示

## 起動方法（Windows / PowerShell）

### Docker Compose を使う（推奨）

Docker Desktop をインストールして起動し、リポジトリのルートで PowerShell を開いて実行します。初回はイメージのビルドに時間がかかります。

```powershell
docker compose up --build
```

起動後、ブラウザーで [http://127.0.0.1:5173](http://127.0.0.1:5173) を開きます。終了するときは `Ctrl+C` を押します。
コンテナも停止・削除する場合は次を実行します。

```powershell
docker compose down
```

Python と Node.js/npm を使って個別に起動する場合は、以下の手順を使います。
ターミナルを二つ起動します。

### 1. バックエンド

1つ目のターミナルで、仮想環境を作成して依存パッケージをインストールします。
初めにbackendディレクトリに移動します。

```powershell
cd backend
```

移動後に以下のコマンドを実行し、セットアップを行います。

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

セットアップ後、同じターミナルでバックエンドを起動します。

```powershell
uvicorn app.main:app --reload --port 8000
```

### 2. フロントエンド

別のターミナルをリポジトリのルートで開き、frontendディレクトリに移動します。
初回のみ依存パッケージをインストールします。

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

スライダ、入力欄は 4 方式で共通です。`modulator_level` の意味だけ以下のように方式ごとに異なります。

- AM: 変調度 `μ`
- FM: 最大周波数偏移 `Δf = modulator_level × 2000 Hz`、変調指数 `β = Δf / fm`
- PM: 最大位相偏移 `kp = modulator_level × π` rad
- RM: モジュレータ振幅（キャリアとの積）
