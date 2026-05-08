const fs = require('fs');

const mapRaw = `
ffffffffffgggggggggggggggggggggM
fffffffffggggggggggggggggggggggM
fffffffffgggggggmggggggMMgggggMM
fffffffffgggggmmmmggggMMMMMgggMM
fffffffffggggMmmmMMgggMMMMMgggMM
ffffffffggggMMmmMMMggMMMMMMsggMM
ffffffggggggMMmMMMgggggMMsssggMM
ffffgggggggggMMMggggggcsssssggMM
ffgggggggggggggggggggssTsTsssgMM
fggggggMMMgggggggggggssssTssssgM
fgggggMMMMMMggggggggggssssssgggf
ggggggMMMMMMgggggggffgsssssggggf
ggggggMMMMMgggggfffffffsssggggff
gggggMMwMMggggTfffffffffssssggff
ggsssswwwwsggssffffffffffsssggff
gssssswwwwssssfffffffffffsgwwgff
gsssTswwwwwsssffffffffffwgwwwwgf
ggssswwwwwwwwTTTgfffffffwwwwwggf
ggMswwwwwwwwwsssgggggggwwwwwwggf
gMMMwwwwwMMwwwssggggggwwwwwwwgMM
gMMMwwwwwMMMwwssTgggggwwwwwgggMM
gMMwwwwwwwMMwwwssgggggwwwwwgggMM
gMwwwwwwwwwMwwwssshhggwwwwggggMM
gggwwwwwwwMwwwwwsshhgwwwwwggggMM
`;

const lines = mapRaw.trim().split('\n');

const TILE_SIZE = 16;
const width = lines[0].length * TILE_SIZE;
const height = lines.length * TILE_SIZE;

const colors = {
    'g': '#43ab38', // Grass
    'f': '#1b7a2d', // Forest
    'w': '#2866d3', // Water
    's': '#d2b568', // Sand
    'M': '#bf7b3f', // Mountain
    'm': '#a16531', // Mountain dark
    'T': '#b3b3b3', // Town
    'c': '#e6e6e6', // Castle
    'h': '#ffaaaa'  // house
};

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;

// Add base grass
svg += `<rect width="${width}" height="${height}" fill="${colors['g']}" />`;

for (let y = 0; y < lines.length; y++) {
    for (let x = 0; x < lines[y].length; x++) {
        const char = lines[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (char === 'g') {
            // Draw a few grass dots
            svg += `<rect x="${px + 4}" y="${py + 4}" width="2" height="2" fill="#38922c" />`;
            svg += `<rect x="${px + 10}" y="${py + 8}" width="2" height="2" fill="#38922c" />`;
            svg += `<rect x="${px + 2}" y="${py + 12}" width="2" height="2" fill="#38922c" />`;
        } else if (char === 'w') {
            svg += `<rect x="${px}" y="${py}" width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${colors['w']}" />`;
            svg += `<rect x="${px + 2}" y="${py + 2}" width="4" height="2" fill="#4d8cff" />`;
            svg += `<rect x="${px + 8}" y="${py + 8}" width="6" height="2" fill="#4d8cff" />`;
        } else if (char === 's') {
            svg += `<rect x="${px}" y="${py}" width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${colors['s']}" />`;
            svg += `<rect x="${px + 4}" y="${py + 4}" width="2" height="2" fill="#b99e59" />`;
            svg += `<rect x="${px + 10}" y="${py + 10}" width="2" height="2" fill="#b99e59" />`;
        } else if (char === 'f') {
            svg += `<rect x="${px}" y="${py}" width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${colors['g']}" />`;
            // Draw tree
            svg += `<path d="M${px+8},${py+2} L${px+14},${py+8} L${px+12},${py+8} L${px+14},${py+12} L${px+2},${py+12} L${px+4},${py+8} L${px+2},${py+8} Z" fill="${colors['f']}" />`;
            svg += `<rect x="${px+7}" y="${py+12}" width="2" height="4" fill="#583f2b" />`;
        } else if (char === 'M' || char === 'm') {
            svg += `<rect x="${px}" y="${py}" width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${colors['g']}" />`;
            const mC = colors[char];
            // SVG Mountain path
            svg += `<path d="M${px+8},${py+2} L${px+15},${py+14} L${px+1},${py+14} Z" fill="${mC}" />`;
            svg += `<path d="M${px+8},${py+2} L${px+11},${py+6} L${px+5},${py+8} Z" fill="#e6d2b3" />`; // snow cap
        } else if (char === 'T') {
            svg += `<rect x="${px}" y="${py}" width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${colors['g']}" />`;
            // Town icon
            svg += `<rect x="${px+2}" y="${py+6}" width="12" height="8" fill="${colors['T']}" />`;
            svg += `<rect x="${px+4}" y="${py+10}" width="3" height="4" fill="#000" />`; // door
            svg += `<path d="M${px+2},${py+6} L${px+8},${py+2} L${px+14},${py+6} Z" fill="#993333" />`; // roof
        } else if (char === 'c') {
            svg += `<rect x="${px}" y="${py}" width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${colors['g']}" />`;
            // Castle icon
            svg += `<rect x="${px+1}" y="${py+4}" width="14" height="10" fill="${colors['c']}" />`;
            svg += `<rect x="${px+1}" y="${py+2}" width="3" height="2" fill="${colors['c']}" />`;
            svg += `<rect x="${px+6}" y="${py+2}" width="4" height="2" fill="${colors['c']}" />`;
            svg += `<rect x="${px+12}" y="${py+2}" width="3" height="2" fill="${colors['c']}" />`;
            svg += `<path d="M${px+6},${py+14} L${px+6},${py+8} A2,2 0 0,1 ${px+10},${py+8} L${px+10},${py+14} Z" fill="#000" />`; // gate
        } else if (char === 'h') {
             svg += `<rect x="${px}" y="${py}" width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${colors['g']}" />`;
            // small house
            svg += `<rect x="${px+4}" y="${py+8}" width="8" height="6" fill="#f0dca8" />`;
            svg += `<path d="M${px+3},${py+8} L${px+8},${py+4} L${px+13},${py+8} Z" fill="#935b3e" />`;
            svg += `<rect x="${px+7}" y="${py+11}" width="2" height="3" fill="#000" />`; 
        }
    }
}

svg += `</svg>`;

fs.writeFileSync('./public/bg-map.svg', svg);
console.log('Map SVG generated!');
