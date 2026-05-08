import * as fs from 'fs';

// PRNG
let seed = 14322;
function random() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
}

const p = new Float32Array(512);
for(let i=0; i<256; i++) {
    p[i] = Math.floor(random() * 256);
}
for(let i=0; i<256; i++) {
    p[256+i] = p[i];
}

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t: number, a: number, b: number) { return a + t * (b - a); }
function grad(hash: number, x: number, y: number) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function perlin(x: number, y: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = fade(x);
    const v = fade(y);

    const a = p[X  ] + Y;
    const aa = p[a];
    const ab = p[a+1];
    const b = p[X+1] + Y;
    const ba = p[b];
    const bb = p[b+1];

    return lerp(v, lerp(u, grad(p[aa], x, y), grad(p[ba], x-1, y)),
                   lerp(u, grad(p[ab], x, y-1), grad(p[bb], x-1, y-1)));
}

const WIDTH = 64;
const HEIGHT = 64;
const TILE = 16;
const SVG_W = WIDTH * TILE;
const SVG_H = HEIGHT * TILE;

const colors = {
    waterDeep: '#114099',
    water: '#1e5cc2',
    waterShallow: '#2c76e3',
    sand: '#e0c784',
    grassLight: '#4caf50',
    grass: '#43ab38',
    grassDark: '#38922c',
    forest: '#1b7a2d',
    forestDark: '#12541e',
    mountain: '#9c6636',
    mountainSnow: '#dbccbe',
    town: '#bfbfbf',
    townRoof: '#993333'
};

let rects = [];
// Water Base
rects.push(`<rect width="${SVG_W}" height="${SVG_H}" fill="${colors.water}" />`);

for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
        // use perlin for organic seamless noise
        let scale = 0.08;
        
        // to make it seamless, we map 2D coordinates to 4D cylinder or just sample 3D with z/w mapped to circle.
        // Or simple hack for seamless tile: blend opposites!
        function seamlessNoise(nx: number, ny: number) {
           return (
               perlin(nx, ny) * (WIDTH - x) * (HEIGHT - y) +
               perlin(nx - WIDTH * scale, ny) * x * (HEIGHT - y) +
               perlin(nx, ny - HEIGHT * scale) * (WIDTH - x) * y +
               perlin(nx - WIDTH * scale, ny - HEIGHT * scale) * x * y
           ) / (WIDTH * HEIGHT);
        }

        let e = seamlessNoise(x * scale, y * scale);
        // add detail octave
        e += seamlessNoise(x * scale * 2, y * scale * 2) * 0.5;
        e += seamlessNoise(x * scale * 4, y * scale * 4) * 0.25;
        
        let m = seamlessNoise(x * scale + 100, y * scale + 100);

        // Normalize approx -1 to 1 into 0 to 1
        e = (e + 0.5); 
        m = (m + 0.5);

        let c = null;
        let details = '';
        
        const px = x * TILE;
        const py = y * TILE;

        if (e < 0.2) c = colors.waterDeep;
        else if (e < 0.35) c = colors.water;
        else if (e < 0.40) c = colors.waterShallow;
        else if (e < 0.45) {
            c = colors.sand;
            if(random() > 0.8) details += `<rect x="${px+4}" y="${py+4}" width="2" height="2" fill="#cca854" />`;
            if(random() > 0.8) details += `<rect x="${px+10}" y="${py+10}" width="2" height="2" fill="#cca854" />`;
        }
        else if (e > 0.8) {
            c = colors.grassDark;
            details += `<path d="M${px+8},${py+2} L${px+15},${py+14} L${px+1},${py+14} Z" fill="${colors.mountainSnow}" />`;
            details += `<path d="M${px+8},${py+2} L${px+11},${py+6} L${px+5},${py+8} Z" fill="#ffffff" />`; 
        }
        else if (e > 0.7) {
            c = colors.grass;
            details += `<path d="M${px+8},${py+2} L${px+15},${py+14} L${px+1},${py+14} Z" fill="${colors.mountain}" />`;
            details += `<path d="M${px+8},${py+2} L${px+11},${py+6} L${px+5},${py+8} Z" fill="${colors.mountainSnow}" />`; 
        }
        else {
            if (m > 0.65) {
                c = colors.grass;
                details += `<path d="M${px+8},${py+2} L${px+14},${py+10} L${px+12},${py+10} L${px+14},${py+14} L${px+2},${py+14} L${px+4},${py+10} L${px+2},${py+10} Z" fill="${colors.forestDark}" />`;
            }
            else if (m > 0.5) {
                c = colors.grassLight;
                details += `<path d="M${px+8},${py+2} L${px+14},${py+10} L${px+12},${py+10} L${px+14},${py+14} L${px+2},${py+14} L${px+4},${py+10} L${px+2},${py+10} Z" fill="${colors.forest}" />`;
            }
            else {
                c = colors.grass;
                if(random() > 0.7) details += `<rect x="${px+4}" y="${py+4}" width="2" height="2" fill="${colors.grassDark}" />`;
                if(random() > 0.7) details += `<rect x="${px+12}" y="${py+8}" width="2" height="2" fill="${colors.grassDark}" />`;
            }
        }
        
        if (c !== colors.water && c !== null) {
            rects.push(`<rect x="${px}" y="${py}" width="${TILE}" height="${TILE}" fill="${c}" />`);
        }
        if (details) {
            rects.push(details);
        }
    }
}

// Add a few towns randomly on grass
for(let i=0; i<8; i++) {
   const tx = Math.floor(random() * (WIDTH-4)) + 2;
   const ty = Math.floor(random() * (HEIGHT-4)) + 2;
   const px = tx * TILE, py = ty * TILE;
   
   rects.push(`<rect x="${px}" y="${py}" width="${TILE*2}" height="${TILE*2}" fill="${colors.grass}" />`);
   rects.push(`<rect x="${px+4}" y="${py+8}" width="24" height="16" fill="${colors.town}" />`);
   rects.push(`<path d="M ${px+2} ${py+8} L ${px+16} ${py-2} L ${px+30} ${py+8} Z" fill="${colors.townRoof}" />`);
   rects.push(`<rect x="${px+12}" y="${py+16}" width="8" height="8" fill="#000" />`);
   rects.push(`<rect x="${px-10}" y="${py-10}" width="${TILE}" height="${TILE}" fill="${colors.grass}" />`);
   rects.push(`<rect x="${px+30}" y="${py+10}" width="${TILE}" height="${TILE}" fill="${colors.grass}" />`);
}

const svg = Object.assign([
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}">`,
    ...rects,
    `</svg>`
]).join('');

fs.writeFileSync('./public/bg-map.svg', svg);
console.log('Map SVG generated!');
