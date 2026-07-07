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
- 戦績データはブラウザのlocalStorageに保存します。
- ジョブアイコンは `assets/job-icons/` から相対パスで表示します。
- サーバー処理や外部CDNは使用しません。
