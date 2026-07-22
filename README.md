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
- CSVの標準列名はKOを `KO`、ダウンを `Down` とします。旧列名の `Kills`、`Deaths` も読み込み可能です。
- 使い方タブには、戦績スクリーンショットの撮影例とChatGPTへ渡すCSV作成依頼文を掲載しています。
- データタブでは登録済み戦績を50件ずつ確認でき、個別の編集・削除ができます。
- 読み込んだ文字列はHTMLとして実行されないよう、表示時にエスケープします。

## テスト

Node.jsが利用できる環境では、次のコマンドで入力検証と集計の回帰テストを実行できます。

```sh
node tests/run-tests.js
```
- ジョブアイコンは `assets/job-icons/` から相対パスで表示します。
- ロールアイコンはFFXIV公式ファンキットの素材を `assets/role-icons/` から相対パスで表示します。
- サーバー処理や外部CDNは使用しません。

## 権利表記

FINAL FANTASY XIV © SQUARE ENIX

本アプリは非公式の個人向け戦績分析ツールです。公式ファンキット素材の利用時は、最新の「ファイナルファンタジーXIV 著作物利用条件」を確認してください。
