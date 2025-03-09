const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = 'images/';
const IMAGE_SIZE = 512;

// 出力されるファイル名は worldmap-YYYY-MM-DD.png のような形式になります。
const OUTPUT_FILE_NAME = 'worldmap';
const OUTPUT_EXTENSION = 'png';
const OUTPUT_DIR = 'output/'

const allImages = fs.readdirSync(INPUT_DIR);

if (allImages.length === 0) {
    console.error('Error: No images found in the input directory.');
    process.exit(1);
}

// 定期的にメモリ使用量を吐き出す
setInterval(() => {
    const used = process.memoryUsage()
    const messages = []
    for (let key in used) {
        messages.push(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`)
    }
    console.log(new Date(), messages.join(', '))
}, 1000)

filterValidImages(allImages).then(validImages => {
    console.log('Filtering valid images conpleted');
    console.log('Valid images are: ' + validImages)
    const gridSize = getGridSize(validImages);
    sharp.cache(false);
    sharp.concurrency(1);

    createWorldMap(validImages, gridSize);
});

async function filterValidImages(images) {
    console.log('Filtering Valid Images...')
    let validImages = [];

    for (const image of images) {
        const isError = await isErrorImage(path.join(INPUT_DIR, image), 16, 1);
        if (!isError) {
            validImages.push(image); // エラー画像でなければ追加
            console.log('A valid image added!')
        }
    }
    console.log(validImages)
    return validImages;
}

async function isErrorImage(image, headerHeight, transparencyThreshold) {
    console.log(`Checking image: ${image}`)

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

function getGridSize(images) {
    console.log('Getting grid size...')
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

    const gridSize = [];

    images.forEach(image => {
        // 1,1.png のような形式の画像のファイル名からXY座標を取得
        const x = parseInt(parseFileName(image).x, 10);
        const y = parseInt(parseFileName(image).y, 10);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    });

    gridSize[0] = maxX - minX + 1;
    gridSize[1] = maxY - minY + 1;
    console.log(`Grid size: ${gridSize[0]}x${gridSize[1]}`);
    return {
        sizeX: gridSize[0],
        sizeY: gridSize[1],
        minX: minX,
        minY: minY,
        maxX: maxX,
        maxY: maxY
    }
}

async function createWorldMap(images, gridSize) {
    const time = new Date();
    const timeStamp = `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`;
    const output = `${OUTPUT_FILE_NAME}-${timeStamp}.${OUTPUT_EXTENSION}`;
    console.log(`Creating world map: ${output}`);

    const tiles = images.map(image => {
        const { x, y } = parseFileName(image);
        const top = y - gridSize.minY;
        const left = x - gridSize.minX;

        return {
            input: path.join(INPUT_DIR, image),
            top: top * IMAGE_SIZE,
            left: left * IMAGE_SIZE
        };
    });

    console.log('Generating tile data is completed');

    try {
        console.log('Generating worldmap...')
        await sharp({
            create: {
                width: gridSize.sizeX * IMAGE_SIZE,
                height: gridSize.sizeY * IMAGE_SIZE,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            },
            limitInputPixels: false
        })
            .composite(tiles)
            .toFile(path.join(OUTPUT_DIR, output));

        console.log(`Created ${output}`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        console.log('Closing process...')
        process.exit(0);
    }
}

/**
 * JourneyMapの地図の画像データの名前情報を解析
 * @param {string} fileName 解析するファイルパス
 * @returns {object} ext: 拡張子, name: 拡張子を含まないファイル名, x: X座標, y: Y座標
 */
function parseFileName(fileName) {
    console.log(`Parsing file name: ${fileName}`);
    const parsed = path.parse(fileName);

    const ext = parsed.ext;
    const name = parsed.name;
    const [x, y] = name.split(',');

    return {
        x: x,
        y: y,
        name: name,
        ext: ext
    }
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