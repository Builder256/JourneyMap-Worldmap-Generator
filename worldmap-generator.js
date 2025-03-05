const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = 'img/';
const IMAGE_SIZE = 512;

// 出力されるファイル名は worldmap-YYYY-MM-DD.png のような形式になります。
const OUTPUT_FILE_NAME = 'worldmap';
const OUTPUT_EXTENSION = 'png';
const OUTPUT_DIR = 'output/'

const images = fs.readdirSync(INPUT_DIR);

if (images.length === 0) {
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


const gridSize = getGridSize(images);

sharp.cache(false);
sharp.concurrency(1);

createWorldMap(images, gridSize);

function getGridSize(images) {
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
        const [x, y] = parseFileName(image);
        const top = y - gridSize.minY;
        const left = x - gridSize.minX;

        return {
            input: `${OUTPUT_DIR}${INPUT_DIR}${image}`,
            top: top * IMAGE_SIZE,
            left: left * IMAGE_SIZE
        };
    });

    try {


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
            .toFile(output);

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