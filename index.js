// Icons from https://thoseawesomeguys.com/prompts/
//   via JHent
const fs = require('fs');
var Jimp = require('jimp');

const express = require('express')
const app = express()
const port = 5150
const MAX_SIZE = 30;

let files = {};

function read_config() {
    return JSON.parse(fs.readFileSync('./dpad.json', 'utf8'));
}

let images = {};
const WIDTH = 50;
const HEIGHT = 50;

async function read_images() {
    for(const [key, file] of Object.entries(files)) {
        //console.log(file);
        let a = await Jimp.read(file)
            .then(im => { return im; })
            .catch(err => {
                console.error(err);
            });
        a.resize(WIDTH, HEIGHT);
        images[key] = a;
    }
    return images;
}

async function init() {
    files = read_config();
    //console.log("INIT")
    images = await read_images();
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    });
}

function pixel_over(a, b) {
    let v = Jimp.intToRGBA(a);
    v.r = (b.r * b.a) + (v.r * (1.0 -  b.a));
    v.g = (b.g * b.a) + (v.g * (1.0 -  b.a));
    v.b = (b.b * b.a) + (v.b * (1.0 -  b.a));
    v.a = v.a + b.a * (1.0 - v.a);
    return Jimp.rgbaToInt(v.r, v.g, v.b, v.a);

}

function alpha_circle(out, x0, y0) {
    let S = 8;
    for(let k = -S; k <= S; k++) {
        for(let j = -S; j <= S; j++) {
            let R2 = k*k + j*j;
            let A = 0.5;
            if(R2 >= S*S) {
                A -= 0.5 * (R2/(S*S) - 1)**(1/4);
            }
            let v = pixel_over(out.getPixelColor(x0+j, y0+k), {r:255, g:255, b: 255, a: A});
            out.setPixelColor(v, x0 + j, y0 + k);
        }
    }
}

async function main(combo) {
    const D = 15;
    if(combo.length > MAX_SIZE * 2) {
        return undefined;
    }
    let keys = combo.split('');

    keys = keys.filter(x => (x in files));
    let n = keys.length;
    if(n == 0 || n > MAX_SIZE) {
        return undefined;
    }
    let out = new Jimp(n*WIDTH, HEIGHT, (err, image) => { });
    out.background(0xFFFFFFFF);

    let x = 0;
    for(let i = 0; i < keys.length; i++) {
        const a = images[keys[i]];
        out.blit(a, x, 0);
        let K = keys[i].toUpperCase();
        if(K == 'N') {
            alpha_circle(out, x + 25, 25-D);
        } else if(K == 'S') {
            alpha_circle(out, x + 25, 25+D);
        } else if(K == 'E') {
            alpha_circle(out, x + 25 + D, 25);
        } else if(K == 'W') {
            alpha_circle(out, x + 25 - D, 25);
        }
        x += WIDTH;
    }
    return out.getBufferAsync(Jimp.MIME_PNG);
}

app.get('/dpad/:combo.png', async (req, res, next) => {
    const combo = req.params.combo;
    try {
        let buf = await main(combo);
        if(!buf) {
            res.send("Error interpreting input, valid characters are u, d, l, r and _");
        }
        if(buf) {
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': buf.length
            });
            res.end(buf);
        }
    } catch (error) {
        return next(error);
    }
});

init();
