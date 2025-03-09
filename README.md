# これはなに
[JourneyMap](https://www.curseforge.com/minecraft/mc-mods/journeymap)の地図の画像データから全体マップの画像を生成するソフトです

# なんでつくったの
数十km単位までワールドが広くなると、本来のワールドマップ出力機能が正常に動作せず、ほとんど破損した画像を出力して使い物にならないのでつくりました。

https://github.com/TeamJM/journeymap-tools というのもあるらしいですが、私の環境では書いてある通りにバイナリをインストールして実行しても、Javaをインストールして`java -jar`しても何も起こらなかったので、新しく作ることにしました。

# 使い方
ビルドとかよくわかんないのでNode.jsをインストールして適当に`node worldmap-generator.js`ってやればいいと思います。

# 機能
特に何もしていないので自分で中身を見た方が早いと思います。

# 開発環境
Node.js v20.17.0
