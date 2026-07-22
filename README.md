# FFXIV Frontline Battle Analytics

GitHub Pagesで公開できる静的Webアプリです。

## 配置

リポジトリの公開ルートに、このフォルダ内のファイルをそのまま置いてください。

```text
index.html
assets/
.nojekyll
README.md
```

`index.html` からCSS、JavaScript、画像、ジョブアイコンはすべて `./assets/...` の相対パスで参照しています。

## GitHub Pages

1. GitHubリポジトリにこのフォルダの中身をアップロードします。
2. Settings > Pages を開きます。
3. Branch を選び、公開元を `/root` にします。
4. `index.html` が公開URLのトップで開きます。

## 動作

- CSVインポートはブラウザのFile APIで動作します。
- 戦績データはブラウザのIndexedDBに保存します。旧版のlocalStorageデータは初回起動時に自動移行されます。
- IndexedDBが利用できない環境ではlocalStorageへ自動的に切り替わります。
- サイトデータの削除や端末変更に備え、JSONバックアップを定期的に保存してください。
- CSV・JSONは保存前に日付、マップ、所属勢力、順位、ジョブ、各戦績値を検証します。
- 読み込んだ文字列はHTMLとして実行されないよう、表示時にエスケープします。
- ジョブアイコンは `assets/job-icons/` から相対パスで表示します。
- サーバー処理や外部CDNは使用しません。
