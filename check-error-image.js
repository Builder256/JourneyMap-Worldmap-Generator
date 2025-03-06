const sharp = require('sharp');

async function isError(image, headerHeight, transparencyThreshold) {

    // 画像のピクセルデータと情報を取得
    // 返値の形式は
    // {
    //   data: <Buffer 3c 3c 3c ff 36 36 36 ff 36 36 36 ff 3a 3a 3a ff 43 43 43 ff 43 43 43 ff 3d 3d 3d ff 3d 3d 3d ff 3d 3d 3d ff 40 40 40 ff 40 40 40 ff 45 45 45 ff 3c 3c ... 14100430 more bytes>,
    //   info: {
    //     format: 'raw',
    //     width: 2560,
    //     height: 1377,
    //     channels: 4,
    //     depth: 'uchar',
    //     premultiplied: false,
    //     size: 14100480
    //   }
    // }
    const { data, info } = await sharp(image)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const { width, height } = info;

    const dataArray = Array.from(data); // どうしてArrayLikeにはmap()メソッドがないのか、ｺﾚｶﾞﾜｶﾗﾅｲ
    // const hexDataArray = decimalToHexArray(dataArray); カラーコードが分かりやすいように16進数にする。今回はいらないのでコメントアウトしとく
    const pixels = chunkArray(dataArray, 4);
    const rows = chunkArray(pixels, width);

    let transparent = 0;
    let total = 0;

    for (let y = headerHeight; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const a = rows[y][x][3]
            if (a === 0) transparent++;
            total++;
        }
    }
    const transparentRate = transparent / total;
    return transparentRate >= transparencyThreshold;
}

function chunkArray(arr, n) {
    const result = [];
    for (let i = 0; i < arr.length; i += n) {
        result.push(arr.slice(i, i + n));
    }
    return result;
}

// Bufferの状態だと16進数なのになぜか取り出すと10進数になってしまします。どうして。
function decimalToHexArray(array) {
    return array.map(decimal => {
        return decimal.toString(16);
    })
}