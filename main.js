class GameObject {
    constructor(options = {}) {
        this.hp = options.hp || 1;
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.images = {};
        this.boolean = {};
        this.obj = document.createElement('img');
        this.obj.classList.add('game-object');
        this.obj.style.width = `${options.width}px` || 'auto';
        this.obj.style.height = `${options.height}px` || 'auto';
        this.name = options.name;

        Game.objects.push(this);
        Game.element.append(this.obj);
    }

    get width() {
        return +(window.getComputedStyle(this.obj).width.replace('px', ''));
    }

    get height() {
        return +(window.getComputedStyle(this.obj).height.replace('px', ''));
    }

    changeImageToNext(name) {
        this.obj.src = Game.getImageData(this.images[name].next());
    }

    changeImageToFirst(name) {
        this.obj.src = Game.getImageData(this.images[name].first());
    }

    changeImageToInit() {
        this.obj.src = Game.getImageData(this.images['move'].first());
    }

    resetImageIndex(name) {
        this.images[name].reset();
    }

    update() {
        this.x = Math.max(0, Math.min(this.x, Game.element.clientWidth - this.obj.width));

        this.obj.style.left = `${this.x}px`;
        this.obj.style.top = `${this.y}px`;

        for (let object of Game.objects) {
            if (object != this && this.name != 'block') {
                if (this.isCollide(object)) {
                    this.collide(object);
                }
            }

        }

        if (this.hp <= 0)
            this.destroy();
    }

    isCollide(object) {
        let [x1, y1] = [this.x, this.y];
        let [x2, y2] = [object.x, object.y];

        if (x1 < x2) {
            x1 += this.width * 0.8;
        } else {
            [x1, x2] = [x2 + object.width * 0.8, x1];
        }

        if (y1 < y2) {
            y1 += this.height * 0.8;
        } else {
            [y1, y2] = [y2 + object.height * 0.8, y1];
        }

        return x1 >= x2 && y1 >= y2;
    }

    destroy() {}

    collide(target) {

    }
}

class Pika extends GameObject {
    constructor(keyMap = {}, options = {}) {
        super({
            width: options.width || 125,
            height: options.height || 125,
            y: options.y || 768 - (options.height || 125),
            x: options.x || 0,
            name: 'pika'
        });
        this.initSpeed = 13;
        this.speedX = this.initSpeed;
        this.dir = options.dir || 0; // 0 = left, 1 = right
        this.jumpCount = 20;
        this.jumpLevel = 0;

        this.images.move = new ImageGenerator([
            'pikaToRight3',
            'pikaToRight4',
            'pikaToRight5',
            'pikaToRight1',
            'pikaToRight2'
        ]);
        this.images.jump = new ImageGenerator([
            'jump1',
            'jump2',
            'jump3',
            'jump4',
            'jump5'
        ]);
        this.images.pu = new ImageGenerator([
            'pikaPu1',
            'pikaPu2',
            'pikaPu3'
        ]);
        this.images.attack = new ImageGenerator([
            'pikaAt1',
            'pikaAt2',
            'pikaAt3',
            'pikaAt4',
            'pikaAt5'
        ]);

        this.boolean.jump = false;
        this.boolean.attack = false;
        this.boolean.pu = false;
        this.boolean.collidePu = false;

        this.obj.src = Game.getImageData(this.images.move.first());
        this.keyCodeSet = new Set();
        this.keyCodeArray = [];

        this.keyMap = {
            'left': keyMap.left || 37,
            'top': keyMap.top || 38,
            'right': keyMap.right || 39,
            'down': keyMap.down || 40,
            'enter': keyMap.enter || 13
        }

        document.addEventListener('keydown', e => {
            if (Object.values(this.keyMap).indexOf(e.keyCode) !== -1)
                this.keyCodeSet.add(e.keyCode);
        });

        document.addEventListener('keyup', e => {
            this.keyCodeSet.delete(e.keyCode);
        });

        this.update = (() => {
            let func = this.update;
            return () => {
                this.updateAction();
                return func.apply(this, arguments);
            }
        })();
    }

    updateAction() {
        this.keyCodeArray = Array.from(this.keyCodeSet);

        if (this.keyCodeSet.has(this.keyMap.left) && this.keyCodeArray.indexOf(this.keyMap.left) > this.keyCodeArray.indexOf(this.keyMap.right) && !this.boolean.collidePu) {
            this.dir = 1;
            this.move(-this.speedX);
        }

        if (this.keyCodeSet.has(this.keyMap.right) && this.keyCodeArray.indexOf(this.keyMap.right) > this.keyCodeArray.indexOf(this.keyMap.left) && !this.boolean.collidePu) {
            this.dir = 0;
            this.move(this.speedX);
        }

        if (this.keyCodeSet.size == 0 && this.noAction())
            this.changeImageToInit();

        if (this.keyCodeSet.has(this.keyMap.top) && this.noAction()) {
            this.boolean.jump = true;
            this.jumpLevel = 0;
            this.jump(7, 0.3, this.jumpCount, 0.15).then(() => {
                this.boolean.jump = false;
            });
        }

        if (this.boolean.jump && !this.boolean.collidePu && !this.boolean.pu && !this.boolean.attack) {
            this.changeImageToNext('jump');
        }

        if (!this.boolean.jump && !this.boolean.pu && this.keyCodeSet.has(this.keyMap.enter)) {
            this.boolean.pu = true;
            this.puAction().then(() => {
                this.boolean.pu = false;
            });
        }


        if (this.boolean.jump && !this.boolean.attack && this.keyCodeSet.has(this.keyMap.enter)) {
            this.resetImageIndex('attack');
            this.boolean.attack = true;
            setTimeout(() => {
                this.attack([0.5, 1, 1.5, 2]).then(() => {
                    setTimeout(() => {
                        this.boolean.attack = false;
                    }, 100);
                })
            }, 10);
        }

        this.obj.style.transform = `rotateY(${180*this.dir}deg)`;
    }

    move(x) {
        if (!this.boolean.jump && !this.boolean.pu)
            this.changeImageToNext('move');

        this.x += x;
    }

    jump(speed, addSpeed, count, time) {
        return new Promise(resolve => {
            if (this.jumpLevel == count) {
                setTimeout(() => {
                    return resolve();
                }, 50);
            } else {
                setTimeout(() => {
                    this.y -= speed + (this.jumpLevel * addSpeed);
                    this.jumpLevel++;
                    this.jump(speed, addSpeed, count, time).then(() => {
                            return new Promise(resolve => {
                                setTimeout(() => {
                                    return resolve();
                                }, time * 100);
                            });
                        })
                        .then(() => {
                            setTimeout(() => {
                                this.jumpLevel--;
                                this.y += speed + (this.jumpLevel * addSpeed);
                                return resolve();
                            }, time * 100);
                        });
                }, time * 100);
            }
        })

    }

    attack(times, i = 0) {
        return new Promise(resolve => {
            if (i == times.length)
                return resolve();

            setTimeout(() => {
                this.changeImageToNext('attack');
                this.attack(times, i + 1).then(() => {
                    return resolve();
                })
            }, times[i] * 100);
        });
    }

    puAction(speedScale = 1, timeScale = 1) {
        this.resetImageIndex('pu');
        this.changeImageToNext('pu');
        this.speedX = 0;

        let flyX = this.initSpeed * 8 * speedScale;
        let flyStepX = this.initSpeed * 8 / 7 * speedScale;
        let moveX = this.initSpeed * 8 * speedScale;
        let moveStepX = this.initSpeed * 5 / 6 * speedScale;
        let time = 0.4 * timeScale;

        return this.pu(flyX, flyStepX, moveX, moveStepX, time).then(() => this.speedX = this.initSpeed);
    }

    pu(flyX, flxStepX, moveX, moveStepX, time) {
        return new Promise(resolve => {
            if (flyX <= 0) {
                if (moveX !== 0 && moveStepX !== 0) {
                    this.changeImageToNext('pu');
                    return this.pu(moveX, moveStepX, 0, 0, time).then(() => {
                        return resolve();
                    });
                } else {
                    this.changeImageToInit();
                    return resolve();
                }
            }
            setTimeout(() => {
                this.x += flxStepX * (this.dir == 0 ? 1 : -1);
                this.pu(flyX - flxStepX, flxStepX, moveX, moveStepX, time).then(() => {
                    return resolve();
                });
            }, time * 100);
        });
    }

    noAction() {
        return Object.keys(this.boolean).every(x => this.boolean[x] === false);
    }

    collidePuAction(target, speedScale = 1, timeScale = 1) {
        this.boolean.collidePu = true;
        if (this.x < target.x) {
            this.dir = 1;
            target.dir = 0;
        } else {
            this.dir = 0;
            target.dir = 1;
        }
        this.puAction(speedScale, timeScale).then(() => this.boolean.collidePu = false);
    }

    collide(target) {
        if (target.name == 'pika') {
            if (!this.boolean.attack && !this.boolean.collidePu && !target.boolean.attack) {
                this.collidePuAction(target);
            }
            if (this.boolean.attack && !target.boolean.collidePu) {
                target.boolean.collidePu = true;
                if (this.x < target.x) {
                    target.dir = 0;
                } else {
                    target.dir = 1;
                }
                target.puAction(2, 0.8).then(() => target.boolean.collidePu = false);
            }
        }
    }

}

class Ball extends GameObject {
    constructor(options = {}) {
        options.name = 'ball';
        super(options);
        this.obj.src = Game.getImageData('pikaBall');
        this.x -= this.width / 2;

        this.addSpeed = options.addSpeed || 0.48;
        this.downCount = 0;
        this.speedCount = 0;
        this.angle = 0;
        this.boolean.canCollide = true;
        this.boolean.attack = false;
        this.attackNo = -1;
        this.enable = false;

        this.update = (() => {
            let func = this.update;
            return () => {
                if (this.enable) {
                    this.updateAction();
                }
                return func.apply(this, arguments);
            }
        })();
    }

    updateAction() {
        this.y += this.addSpeed * this.downCount;
        this.x += this.speedCount * 1;

        this.angle += 1 + Math.abs(this.speedCount) / 10;
        this.obj.style.transform = `rotate(${this.angle}deg)`;

        this.downCount++;
        if (this.speedCount > 0) {
            this.speedCount *= 0.99;
        } else if (this.speedCount < 0) {
            this.speedCount *= 1.01;
        }

        if (this.x <= 0) {
            this.speedCount *= -1;
        } else if (this.x >= Game.element.clientWidth - this.width) {
            this.speedCount *= -1;
        }

        if (this.y < 0) {
            this.y = 0;
            this.downCount *= -0.5
            this.boolean.attack = false;
        } else if (this.y > Game.element.clientHeight - this.height) {
            // GG
            if (Game.finish) {
                this.y = Game.element.clientHeight - this.height;
                this.downCount *= -0.77;
                this.boolean.attack = false;
            } else {
                this.destroy();
                Game.loseBall();
            }
        }

    }

    collide(target) {
        if (target.name == 'pika' && this.boolean.canCollide) {
            if (this.boolean.attack && this.attackNo != Game.getIndex(target) && !target.boolean.collidePu) {
                target.boolean.collidePu = true;
                if (this.speedCount > 0) {
                    target.dir = 0;
                } else {
                    target.dir = 1;
                }
                target.puAction(2, 0.8).then(() => target.boolean.collidePu = false);
                return;
            }
            this.boolean.attack = false;
            this.boolean.canCollide = false;
            new Promise(resolve => {
                let interval = setInterval(() => {
                    if (!this.isCollide(target)) {
                        this.boolean.canCollide = true;
                        clearInterval(interval);
                        resolve();
                    }
                }, 10);
            }).then(() => this.boolean.canCollide = true);
            if (target.jumpLevel == 0) {
                this.downCount = -(this.downCount * 0.95);
            } else {
                this.downCount = -(this.downCount * 0.95 + 0.3 * (target.jumpCount - target.jumpLevel));
            }

            if (target.boolean.attack) {
                this.boolean.attack = true;
                this.attackNo = Game.getIndex(target);
                if (target.keyCodeSet.has(target.keyMap.down)) {
                    this.downCount = Math.abs(this.downCount) * 1.5;
                } else if (target.keyCodeSet.has(target.keyMap.top)) {
                    this.downCount = -Math.abs(this.downCount) * 1.5;
                }
                this.speedCount = (this.x - target.x);
            } else {
                this.speedCount = (this.x - target.x) / 3;
            }

            if (target.boolean.pu || target.boolean.collidePu) {
                this.downCount = -Math.abs(this.downCount * 1.3) - 30;
            }
        } else if (target.name == 'block' && this.boolean.canCollide) {
            this.boolean.attack = false;
            new Promise(resolve => {
                let interval = setInterval(() => {
                    if (Game.objects.filter(obj => obj.name == 'block').every(obj => !this.isCollide(obj))) {
                        this.boolean.canCollide = true;
                        clearInterval(interval);
                        resolve();
                    }
                }, 10);
            }).then(() => this.boolean.canCollide = true);
            this.speedCount = (this.x - target.x) / 3;
            this.downCount *= -1;
            target.collide(this);
            target.hp--;
        }

        if (Math.abs(this.downCount) >= 50) {
            this.downCount *= 50 / Math.abs(this.downCount);
        }
    }

    destroy() {
        Game.remove(this);
        this.obj.remove();
    }
}

class ImageGenerator {
    constructor(images) {
        this.images = images;
        this.index = 0;
    }

    first() {
        return this.images[0];
    }

    last() {
        return this.images[this.images.length - 1];
    }

    next() {
        return this.images[++this.index % this.images.length];
    }

    reset() {
        this.index = 0;
    }
}


class Block extends GameObject {
    constructor(options = {}) {
        options.name = 'block';
        super(options);
        this.obj.style.border = '1px solid #333';
    }

    destroy() {
        Game.remove(this);
        this.obj.remove();
    }
}

class WhiteBlock extends Block {
    constructor(x, y) {
        super({
            width: 40,
            height: 25,
            x,
            y
        });

        this.obj.style.background = '#fff';
    }
}

class BlackBlock extends Block {
    constructor(x, y) {
        super({
            width: 40,
            height: 25,
            x,
            y,
            hp: 2
        });

        this.obj.style.background = '#333';

    }

    collide() {
        this.obj.style.background = '#aaa';
    }
}

class Game {

    static async initialize(id, hp = 3) {
        Game.images = [{
            "name": "jump1",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADyUlEQVR4Xu2b23XkIAyGcSWeTjal7FSypWRLyXayUwk5XAcwQgJL2Dl2nnLhIn38EgImi7r413Jx/9UN4FbAxQncIXBxAdxJ8A6BOwTmENDANIcrcIYBmfM6+Wmpzz7DprgesyazbqfOQ8KrQElthJRkhhvyZajTjqghg7AeFda1ACZtu3zqarzD8aLrqrV+gcOljlNUkw7UC0ISQE2uyXw5hLfhq2rBoS6CHw/1D21AnbBoV0182/hek24vUo7osWdZzPivpo9SAGzOoya+Hqd622JKkAQwFYJzdBs+RwMIC6Z7k9nISptJluWxySEtCJgCQixj7Sj2ikII+cVBWLJ8wgFguNBIyOiaRCnkKG2wmgHaHpGVdVtV797aNrhdA1CcpVSRUMiVasCkHWVbEMb6tfyYEApwLTEMIHjEoAZRAJiCegG4rbxS0w2CONR5d77IiyOClOGYHQgLWQCEcyObAoADCLJbyCXA6mEYVm5ERVCAdZW0crSwEIJQ86QAUDsbUAGYMlMrRTuwIOUnCSaWzDZ/RwB45zcK7QAQpvyltf7XtO9sABLnOQDYQwd4oYEdPlp9u1e97NBIgpBdAwpo5wQcAD2n7AaSDMANAKsPMLD60xv3u3XNyURgz2EIMQG61iLc0K5KfxbXghIwMEViK4WtQZbRscmKwaIKykm4QFDskQCAFEPRXRCAacEBYcad4J5zwqbv32I5eCBY4OBC71AAXtG1K0O8PxZ/1L9LJEFyNWdW9eksLWGTx6A6CrWTANAshoIhQdJPewLNALA4b2IcekR53xF6+sAbwY4QcAWNKwi27AvnSwUwAXjPW7+zcA8vAVJNCXsBBAsyEGkymyF/6E3AUvceBkAj9wHUELQQQoX3/+NDPb6+avGftePa8pyzLtZKNaQQJAHEkAgQzC98/Kch0Nz/OYAAqx4WMlM9VwikKtHKv3mGUteHQYAgXgGmaijku/FXAoCbc1X6z0uph7cgQliVmnEGiMu9uOss81pUK4jkAJgdonA2QDAhwlHl0ZKT26KOAOByQgWC9ENpDuZYAHGbzBJj5Rmbtpojrc4BYKOG5xQIbeerSWGEcUefGBJXBRBrBfuN6HUYvvpHKCCrFy4OQPI+4C0taPurloUdsczVlOVUuDWGJv+jQyBukbyhkDmP+ihZCXaohCsc+pxH6XR4wNF01wcrW+9/LeNOooDURPcK3bNNUu7/IQgnBOB9R2qE4tMpw2r+sQDiNuZvgX7KP0z05IqKBt6fLi9vg0fD4KwKIIAyucJ8ZS+s3f58A94KbFBy4o39AAAAAElFTkSuQmCC"
        }, {
            "name": "jump2",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAENklEQVR4Xu2b23XbMAyGwR3c18ozpAtklHqTdpJ0FC+QrtC4r/YO6gFFSCBF8CZSUmP5nLRNQ4nExx8XXqLgyT/qye2HA8ChgCcncLjAkwvgCIKHCxwu8OQEtnCBeybzL6x96FneLrmLtQFoA/oeTikjVAoevF3f6+98zz7UZEkWiDUB0OxpA4wxXg7MmGA7z8PZIDYDANBB399GGxYY7YNIIKJqWBMADhRVwCTcAQBCGP4OqSLFZZw2SRDWBJDl/wUGFymhNYAxagcCWBVbyYVcFSml1SXa2QoAS1fdift6FWs9L0EAfd+DUmcrtgBA0BVaAzD+bge8FhAmBcwhsHQ6C4qtAFDA89qaWgfkgOJZREizXiW0BCCN/94CAHaWkEofSnUnHhM+FYAJguxyxh1GV9gAQNevERQl+W0NAOUv1fM5Ll/cdg8AkhZCRRZyPQ+gZ589AGijAG38D/Nl7HYg+NLhBjEA2mSB0RKEYGAwAFIt4APgbjpEV1SZcl0VwJAadTmMewtJhRAPVHx9jW+qAWMDAHqKkgEgMUxV+AAPWNmbDYIy2mUCHgf8/p+kADNuLwRN0lRcC9Swei0gjjkWBCW5zkrK3DjwZtT1XUhXme8LNQ+ONQWAlLaWKuFOEGj0DWBEJyoGQIoHNGa9a1vkEh28v93gBZ//AIAzm8NaIGKbIXrsiVKj7ayaapgpgIOoAcGt+ryVYSIAahYCEZWb09csvvwy0/Hx+grn6xUqQIi6aaoCXE5SKstJlU3qAXtjZCyAxBqmFADFhpmAaBYvQuExPVAnFcZ2gszPrRMmMwadxhcAmNf0ZDy+OAKgXTHEpoTKYHf/ga8LSgHMDOD++/PP9Tfc4FsgvjSRP/XHt8iH3eLZSMbYsASAta5Pl74eTBMAQ9rDz3TKxFzEdYNFLmAZkCF9bTz+wYugCtEeTM73Hq+xOJCzFggmyNEFuPEJvq8BuBWg21MuEOlUiL9XqglKXcA7k9ThpQOMAV+F5bMIINfwnBqmBYCh/w7etaRNWTtCGNIgfaxbHiusARw2eFqkcvYDctgOQY2e8MnbpEQC9hdhtZxte/RDCmgNgPq8QwfaQB/Ci/nPyvcAIrO1LoAJhBPp+Sgvzu2QbL1lPaABPNQQKatlgZQhzNKdDSF8Tyilg3ib8Oxr14i/ZGELDJJDRtC5n5a86A7tXSE8++sAmPjp+DB+e+te2p4Rxmd/bQCulJqUw1Mn/wcAHG+Ds8Jx9SMGPwLVPgYEQ4i49b4w8KTN/tYuYIysDcEy3pv6ON2NFUBDqQXBivpR43eigHE+7gDFV+qKzzB3ogC9QVIaEHN3o634shsAOKrU22PuNfolp9Z7AYD2R+8Ssy0v79K2JHXsCYDeaseLDJI7pJz05ELYGQAeEPHf+lIjAqFiKXrS81kAcDvY7xjIV11yDaf2/wCYWJ9QZ2C6kgAAAABJRU5ErkJggg=="
        }, {
            "name": "jump3",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEEklEQVR4Xu2bbY7bIBCGhxtspfRvyRl6ouYme5PshXbPUPdvInVvQDWYwRgDA47BbONIlRqHxMwz73wAXgFP/hJPbj8cAA4FPDmBIwSeXABHEjxC4AiBJyfQUwjcIr747lyPjcEh7rhst+4NYGaQUnByZy6EBIDhTteU0v+bjTGf3cVkSRGIvQBYw32j0aDRcHwNYIzO9WgxiNYAooZPHpSg1JBrcGwcgWDV0AqAK3UtYfSsI1ttSKG3OUhZEFoDcOJ3E08/DKEVAJwoqsAC2NjbVk3+75pEGrWzFQAdAqGEx7kw93MMJ6UUCHH2c0gyFBoBkGqDxJZkQfkkBEEIoFK6SIq1AZDnY/U718HsuIyEGlRCTQC3ROPCGrRmgAshkmPuQsgTwGDtrgXAlD158qWPSalmOIwQ4vcw4WBDoQYAqvmU8W0rC4D0MVk93OisEYj+TksA7iSJOIZFqJdfbVDpF1sASM2pLgBXz+PCafHqAUCdiqCNfzX/jN0ehFA5rJEDOFXWUYEFQLd/BXAAxHqB/wyApwK74LL7Cs0boZAaqihAnAFe4AX+Dp/TPecrTqxG3QDYLA9MLTCA+CZBfZoSG47/LgCg8ZuoYFwATQ7337vy87M/fbZHDtAArmZp/CtSrrhM6nreGuMBma7P9xbNda2GvQDMINBES2CEvB2+po13lTJbFO0HQML7dYCfaPxvADg7LudA5Bu/2GZrthjiFBxUgAuCg+DFd3A/MZAjFpVgPwUEEuGbN5tcCOnkZ1eGzfcDOBVUqQSJ/h8/6qYMViuFCQDBM4K9QqDpblGsB+DKYOog0gfNnsB4X9hE/lyMOf1BsA1OASjxUNYJzFcDgPtquJWN5NgdnJTEAl664dbYFaZtsdxsn+vxwLiok5gckA2hRAW2DY4ZVAPIA2sBqbt1Tg0FKogCqGE4lwdKqkD0aJsamAvYExi6byg5LgDUNHycCB6Zic32A3QMu1vbfgdH1ntAEMYNJPzBNUB9o2kW43JzSwC6iRnDAuBNwMlfzPixPQexPCx5ILllfLUOALqxlvNFwoedyQA/aK0fm90lcXKTYVHhEA3gLsYNhCqtMKrB/+ExXxi5hxRy2f6JkACYtPdTjVAh5cRwCe/0Ka3/8X1DAFHvtwEwsVm01nWPyXjvtwbgy6TyeuBrAEAobKtdHo92pzUp/70VoMtpnYco8rzfA4CiRVeeEmbGB0uf+zslrXDe/VeNyl50Mb8+q/ms8Z0owNqknyNc+fwgbXdHnwaLketEAQ/lgsVef4kIuwGAk87tC5yzfrK1dEvOMuoFgK4IHATnMfroHl+J93vLAboi4B9IxEoj99xvqfEdAiATRhD0zgmNkq23LB49hUBswrOnzHFpu/bvg0I3+Adl3oVQxPR9qAAAAABJRU5ErkJggg=="
        }, {
            "name": "jump4",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEOklEQVR4Xu2a23XbMAyGwR3c1yozpAtklHqTdpJklC6QrtC4r/YO6gFJUCAF3iRSUmP7nJzcKBH49ONCUgru/KPu3H94AHgo4M4JPELgzgXwSIKPEHiEwJ0T2CMErpXMv7DxqWv5uOIptgagHRhHOJVYqBTc+Lhx1L9J197U5EkViC0B0NPTDlhnRA7MmeQ44eJqELsBABhgHC/OhxVOSxAJRFYNWwJAQ1EFTMIDACAE8z2lipKQCcYUQdgSQFX8L3B4kRJ6A3BZO5HAGvkq38Ym0mgo9ALAytVw4rHe1Vt7c6W8/JIMhd4AbLz7Ca8nhCmZTnOycjpTQi8AlPBEX0v7gCWgEtVEVEJPADH7rzsBQHtmED4lgHEcQSklltUwKe4AYBh7JkUMAQPgyWu0SI57A0D5x/r5JSEfaaXjSfcIAIoWQs1oBDfCEglwccrfOgT6KYB7YlQ2+0jlcGsAujw2rwLOix8AgF+43PT9j/UCEoBw0yG7oqqUa0cAzBILgPUFuLdQ1AhxmfL1Nd69BYzDA8DlKZYqJMYTVvVmQ0QZ7fOApGM5BIoUYO0WIYjdVGUIEOD6y1JXpJNgdEGUS4Ixud6UGk68nFR6c3216voeydiV90sNT9paAiDWuBTtuCQscxBoTAcYWRtzAGL5gGzWu7Y209YlyAHeXy/wjNd/AMATI9UKRNj0iL1BodRoO6ulGmYK4CBaQMjtBumHVwiAhqVA1OaFWX55C6xpAKFFCIiIYqWsplS27wemcKRKhn0/Ha6IIVqrAEZDXtbSUzyDPtVJ5YUmAPgOUHjWwPKTd8JkndC2rQAw7+m5hNMAoj1GZUSmhxs486UxXxcsBTALAXL+4+UFfv759Rsu8C1VApsviNhkpArcezAbJDNLXG5YA8Bb11dIH61pIv/QLVv29J/J6WAxxC9ZFQKeA+XS1/PrSkKdIP7cINsDOS8dr1kIxavBkjh0IRCWrpLkx52XJqsFwiUfMz7WEywNAfFJ0uTnATAHfI1UgVkDRNfVOl7ypGhMDwDm3gO8a0nbttZBMGWQPt5bHqECejpuDNDb5E1DIITvdpEkeduwIGB/EVZ/p8lEUwJ6A6DZrjCAdlCS59n+sfF7AJlI2BbABCLI9NzKs9Cc1MRz3VgN4IYnRaV7gnX3j4+elTsfQvo9oTZGpJ++Do02EyXugknSVARd+2nJi+HQPxTST38bABMbnR/cr5fhuecZIR0MxJIf2dFfAYkQ6bke+F8AIJ4OZ4Vu9RNNfkdQANrQ/oxAe5ZPfkcB0AGC57xY+nhU7pkDmB2tNki8rJ91fusqkKu4+i3ShaVx8RnmZ1BAduc3Rf4gAMwmSWlZtJsfNwB9PJfbfE0q7ygAdDLMQTCO42ed0wdMgs6k5AlUyVFXLtGE/z+SArht3lsqLDRWxbsE56gAQhjeixqN3lTRc/wDhXOUUNk4HI8AAAAASUVORK5CYII="
        }, {
            "name": "jump5",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAD7UlEQVR4Xu2a/3njIAyG5Q1ug3SUjnAjNKPcJLkRboSO0m7QDXwPYH4LJIwA90nzV5tgI736JAT2Bk/+2Z7cf/gB8KOAJycwOwX2gPfsudFQrzAihGCNWmGHnnvFxBiAZSBGAihFOvt+P77ZvDUj7YpSYeREpUirOaPfLAAnA2PVSNschNGTFOWeOp1WqFlqmAogdNo6WAMxA8JoACqwTgWYs8rJBjVgS1mXD10XM3soDYCKNAWhNFevSmYAMP7XFj9V8bYb7Psnk2k+7CyIWQCYEOh0oAgdINh+sQdSEzN+3wH6osyYw6yf2w0APlm+sQZxJ2aMI1OBcQ/WEK4SWgGoTG69JjT4OwO47apIcckWwjQcQFhMOba2RNMZz7kxAmCK8wBqJTG1hmPnKQCtheaAMRGAX02o5bEFgCKr0+DkpmUCANNwbNtL1lOU1NAIIG9oODKbp4AFABrSYaICtqz1HqaAhnQYDsAGA2upS81RdwqE1Z5Ih3EAQi8Kew4hBcRFEN2bFk9z6GtZLV46CAshAkEIAL2rI2qCvAoYAGrKbE0B1q7OQDD7kiRg0wEI9wHOHdKRKwA4Cp+r02jKnso7c1EVAg5gQh1I8p/qU86kALm7q+/HB0EoRHI0gEwJ1IRKOY/D2DfimKxDnaYAMZ4v9CrgDAC9WXskx3/SMDjOY1X6DPSoFlBV1+4LrArSCSVAcJ2XAIAWwqD6lhTm0gAj3gthOQC37pQPJzNwfzeAj9dXeHl/15fPgtBbA6pLoXLqbmiMb4gQKXGU0A2gdNStnFeflQA4K0EvgGJD5ADoI/pIAWQXyanEtSdJ6fPGWl8iASCDYJ3/AIA/eQqIADDRNXTxh67xb1K7wVJw3FMf67wdiKSAGAAvcfyJk12SkzdQoqBLKUCrAH7d4PEVdzgJAN37+R7gN7zt/ziKJ8ekzvqVyPylIGAqkARgINwAwi7vHteA6vovuPy5tAgaM7TvkQaQQTgUoCd/JO8GhWHtXffDe3G2wU4hpLbODYgi7SAk6pCIeM28GX1ApSiGue76AZ3/ktEuA1APSLTAqyofkQLWpqTgGQjUmyLnBIddtR6AAxHu/O6TXpJQ5Wa1AsKwRKvDHAjXAhCtDs8KwEA4PmNrAS/6ZIWUK0jZnUTb4fjuhjEn/xcCGHUy3Ob8QgBqakkI8fEyN/qLAUhB8M4fjjf5NbIR4paQjnpgnd/c2QDV+aVGfWMAofPOrWZ/mi/ghpU/Lq0F/Hcxmc8gqqZcAAD2kNVD8E76U5/wO+47wSUKVwDgGqS4OcqVIBHxK9aAeM+g/zPHSJpM4+NufuqZkVdRQMnuxH0PRsr2/74zjFBMoWBlAAAAAElFTkSuQmCC"
        }, {
            "name": "pa",
            "data": "data:image/png;base64,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"
        }, {
            "name": "pikaAt1",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAESUlEQVR4Xu1awZUbIQwVPWyuma0haWBLiUtJJU4pbmDTQta52j2QBwOMAAk0eMDOenxyNmDQ19eXBCh48o96cvthB2BnwJMjsIfAkxNgF8E9BPYQ6I/AhVniS/+l6yv0DgFv/IvZitZhQ1dFrzwclN4AGIstCM54CwTzoUDBgHBMMj/XDNwIALy9UiDseKXgioEqAIiBWw3ESACcPZPW+myMI9mAQwOFTD2YAZqA6AUARVfkHQtCMGoxegL8d4nVxBgPhIgNPQCghI+I7wkx4IwFstHuaNpVKfP756p91QGNu/HxXhK9xp8WTxMxoRcAa9RfbNHagU5Ii6HQE4Cg/oIUuNY26fgqC0YAYNmgNa36Uksk45Sa7LBEYE3GYVkwDACA6aWU/iQG1sYwKbSYHkcBgGuAmh3N/+8B0FqDUq8zE5CFCmxxFbFhMAB9QyEDAJZaA3SoLj8vAK6Edjpg6mlHJteEUVlhJAOMEJrP3WqDRwCgn/HYlUvbHenJnQEoN0HNymd5T8zOQSBrgnRq2sSIGgr55uMmSD6vMlIAwFwj5L1BBgCK07SB2QKMPgVRBQBnPFkQEVNJqjb12oTfhgPgUqM/XMmcyGQBNl6rtXWZrIN0IIn/UlNUSoOct8S9NgNGHxbwyBedVgOAy9u3MOFydLXADyZdbSaOyzFZazNUpKyNKxdj6wRygvfjGb5hQzuAIXKSpBKsneaKFkq8GliQensrICSHIVwJwTGwBMRaXWABMItjEFwK892k+NC0BwAeGK6mX5MqMyH8lXDx4PuYdp0QMVMSAgQj6IrOG3Eg+u40BKgTIqsntmCLrtGaNTG9XKFOhhoByPt67MG1AMxCusmdQNL8RL8p6gUkaGch4I3/eHuDn39Ov+EM3ws/FM03Mb7BZQi7nAE3vpSN7wtaGMDGr8DzZqNhfrI5CfhNY9A6GQtuBmAl9TMAFovmE10rAOiz8n6QBCjRgpuPxAKFCeUuHkH7q3JfCaYpj9p9+o6gBZDWXqBEN1sTYEP84MMERgO+MmfxxfwvAaQlBnoAMO9jgncLRFLWOi3we40eOWDQjGi+nk523FYVIM0i+jDEjG3RgHSNcIpEMmKuCTxgfwf0AMn+zB2BYkNzCwD8gheYIDMwhIb7cuzs7dj6uYwcBcACBK8PoD9aorh1zn0AMLvlRTJ+LdZqmXCeBeCq5lRCtuxbhgC1qeWUeYKXo0vxhw5lb7543ftbiaDEGzMQTiNMp9eSzyULLWPq3h8JQKQP5h993wvIvH8PAAIQOwDdLkrDCUpR/LwneotgKWw73RbL6X/PEMChYL5vdGscGc+mPuyVezJgYxAi1RcZ/wgMiLJD4wOKmy5xH4EBmJHhma20TpAef3Ni9GgA2DK6liLx42oA+/J83c0UQuNRARAJI7r6/lQAWBaYh5XOu6aGjr4nDy5FFyD/UwgISv7JVTvhALU5DP4BENWmUF4RicYAAAAASUVORK5CYII="
        }, {
            "name": "pikaAt2",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEY0lEQVR4Xu2awXXbMAyGoXSPyB4i506Rez1JR0nvnqLnDmEre6Tsg0TIEE0QICnKfrV9qdtSMvHx/wFQYgcP/ukePH54Angq4MEJPC3w4AJ4JsGnBZ4WaE1gBy76E+f7sF9bC1Dw5wmB8yjwr/t9BMsNoLQFgDF6CKcTfpU/USgciKQkvGUFuPYAKGYjCBreBQqRAC7AFYDYDgBF9tK709cgqqFjMyLLWNJUKYg2AGJy5avz0jv3NcxxXYLuwbnLv1sCD8fMIIxqWB9AJPHF/d2zuQ9zgiwJOgrhWw/wd1DjUwcUTchDcKeiq1e5yKqENgAysn9ttGSfWL4YE6lihXYAWPbXSmAtBLw+BsKiAhnAxcv1kHbgWttBqh6aCnQAlY3GuLoI87OHVPmrVQGvJACXpKqVRxmAL1VzQ2IsK8lAgvJXG3R4/cUGDroOZTcA33F02IoGcSQVQLJddGU1IBpb4QoAsJ7CAcTskAQQJq9qNTQGMCVD7C+8BSg6vwnLA+C9GyYvzVOirHfgtqgGKVvlA0h4NtsWrVefazn+BCLTAl4B2qqZQSiboKqEGDNyAEHqCfQab5SuKT8Iipp8i5/CPYEBQCfsDXQAOK+X3sHrAJoa1M5LsAFmb2pl+XezKgQAlBB9LxJti20A5pl8dyf3W9zLrwGAMnnWtjgSRQdTNZiDFxq6TACTGvhenq+S1nbitVI3GK58apMTVUYkCc7dYaQBonvkA0jkBBWAUFppMxPd0TF7mC3BBmqqzAeQqA5WAB/+KfEPlqlT3s9WgwegBT+CL6E6XhM+1qKHmJZW+R3cx3H5ywgDk1bK+zkJ0hJ8HYAgo5tWn2LegSMVcAwH9u5AWhgrBKnshfctV0AMgJBpr4IRAOA4CwSLaq0LshqAKXb2xidlhUg/8MvP5NADOJ8jLIFKY8a5GB6MlgFQ2loVhLIv0HKBFYwlD+QDMLbGOElc1UOsBhs2RlavazA0K+QD8BVAe7w1S/odAI6s2mQAXANCGwC+F8A/YvuDRfB/gsdQhtVfdJdKadQUoOWCMgXwXw1eglDwY0YvlL8WVO7/p1RQD4CpIaztVwA8LD6Od4O5gVnHtwdghZCo/xRMCyDbACAIb1MovNWdlZAA0CJwgrodAPrFd3A/j8sTISOEtyUYHN4y8Gk6Drp9J74jXCcHhGZErwfBYos7KmOToGlC03ZzewDMDgsrGDY71sRmG3dLADTDwPdrbXasAM5whj0eSRP2Jm0soFjiAPVHYXQA+uqP9tBvtNIIlhe2UYEDbfW3BcB6hTE3Nz0+Y1v97QGwvPDwALSXLOXGm1bfIv/bKcDboQ0Eu/xvC6AJBBb8JAM1yasDyqVovDLjAUn6jizrG4O/vQJYUsSvJZa4OoVqWHUO8vYK4LNhx2ytB6Wtz/8l9dwXAJ8XtBLJzwSOr6ozV/1+FZCZGMf3/7vhPwNAHeMnO03+yo67BQcuLc/+U8nz/ixgKR6YK+jtUaUF/gGCcfpQbJPufwAAAABJRU5ErkJggg=="
        }, {
            "name": "pikaAt3",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAERElEQVR4Xu2aS5LTMBCGWwOXoKjCzgW4DXtyDljOPcKeK1GVx4LdHIApJqJaVjttRY9WLMnDxF4wQ8ax1F///ZAsBXd+qTu3H1YAqwLunMAaAncugDUJriGwhsCdE1g2BHrQXv4Hlpv4PfzzQo5rD8AxWu+nlqh3HcCn4/jhfg/QA8ABADabgNUzwLQDwAx3jUazlOqsdUfQfl0ExMLA3ACiPoCI4WocvQOtL16/Rd0ThWSAqAdgGrvGJvTsxejBzBxvS8CMIIQQ6gPAGY3XfE+XhlAPAM4UVcAAlPZ2DIZRAibU8zFqYz0ANgR8CU/iRek9FFI+uAqrRiIU6gF46LR+mZfYpBCGKoL/TkNMkg/KA7Cep/qdY8Sce0MVJaWCsgB60K0NJ2ih6pIqj+UAUNk7XGd6bHLm1nmJOi75QINSaiixzEI1tJQTm8sAGI2308SB6DphJsZ6Xz8fXAHg1LAH8STFsgD4gETahsVQFetfQ0tt22myzrbW9QBI7OpB1y6JqWm8bQBcy4HF1OIAqlUIXyA7EEI9QZkckNIe/b1WGAgAmH0GT1v8pgFMegNPCTQdpNR5Re5rqICJYVR+POuCtgAeOr1/OdYph54kOCog4P32CrBL5Frl0HR60AEc2Z6iji+L2yrAAtjZPYKvGXt/sRCcND/sRlP2TCca3hNoDwAn+AX07ufUJCkMMtZ42lz+TVRjPF6L7QfEXNaDJhXw20IQaK0fMtY3VGoZTN9ZRgEBADgpF8ItK0mjkv6Y9P40CYbe0vjwCndcgyLwlMMf1hXSUAg9m4BJdoMuADI2MqQPjvYNlbbLXLVI5noJgYwaLY2vHAXMbbRCoZKa6zQHCCFIyMaML70oiuWJPAC2TuOP1CRTD27lfawQsfcNKWeFqwAlxVMHvu1t79taSXKstR6IxFDMWekyiCACEGhMyuBbvuflg2Gh8h5gbtaX5I55ACgsIhAIAE1mAoJ3Y5H6T9+tAWQ+AJwdS5Cu/H1d3RUMVEQP+vE3wMfna7/VMHzs9iLvCNMhwOf60GlzesNdYLAmCg3E6+kM8Pnv8DtXhAugpuHD6BrURgW7wjwAkoBjMLgyth+GLz8+AXz7I3lQiXuG5WZbADRvBPEeYPfrYsi2woGIOKYlATAQFBb40ffnNq/JSP4HOMAGT1cFSnT5EPC5xIYFxf/WeY1dQuzXz0h734RHncE9T2U9QCsAKe+3BYCjJY7KlXOGzPvtAbC8UGtjlGI/lf1pKu1CgLtXuOq8TRGD9yXyX04BOHI1CHgwLZ75OdhlFMB7BcHSW6YEZvggAZFtoptkE5hxF7bY57wzwjTa1bJcaPiyOYCzytiPdBGnNjskLlleAZkHKse3PXSkPtPjLpTlAbD+IFYaxzc9GfH9fyiAJ8RTB6G3x6EDDhIjY/e8DgU4OYH/l1RRIt59IF4fABcGP24fec9/qxL+AUNyuVBWYxHhAAAAAElFTkSuQmCC"
        }, {
            "name": "pikaAt4",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAD4ElEQVR4Xu2aQXbjIAyGRece4+QQPUr3k5Nl9nOoxL1HyzzZ4MgEkGSDyas9q3kNxujTLyGBDez8n9m5/XAAOBSwcwJHCOxcAEcSPELgCIGdE3j9EDiBffLRvVzuqgcgtvCc2qhR5NnbDeBEnrsDwPkcTLQCSB0AzgB7k8WXCQwKjc5zI0AWgCgPwHsPXQUA9lnAkz2GvD03ToJxpgwFiOoAQggljY6BmUAIIZQHgKtCFTgFxBa51tucIgYIvzqA7561jx3Avezpd2X8q+cXPiBVQhkAmawtXG+VYUNyZUJhHQC61d07sLavYoh2UmPGtUhUUAbAFO/tIaDxAOiIcS2cCtYB8AkvdNFnB7evflbAaL24dPwDwLgFc9vjegCplZ7ASguhpcbGnsNt1loLxuACeqBFs8GSMsgJVQFoKrpSEB4AzLyJsBANh3oAXHi0gwAP77tqNJYP6gIgOaIFiFBVbQD4VdTOCdSVif6jLYC3zlbbGWI6DiCkaoL6IUB1WEsFAgCpeuBHA6Cd51CURMriHwtgZpg/UmoOYKs84Lc9TyHhfYzObRXgtsUtK0SuIWoC4Oqapz+Z47ISlSFnfBsF4Fs/wF7/zU2UwBjLXBkaifHtAJzAehVQc2QQsN1FEPmzB9PsSEzioAQAfFQCYfCcO/RIvU4PQHORITxxTbKIFER/XTaSAuAg6ELgBFbarEgnzgqhYEWYU4JkrY9dQLFHc8dMbBQUBMApgVvrfBsUQpCQzclfqjYWJBmQUoIOgKJ/5ybWxL/EUF/Xc1dt4e+cs9KFkE+KiQPOxbe0K+XPgYgpIecsWSXIhIbP4JdM0zF42UGlNYAm61Ol5IqiEMJ6APjmt87ar3jx4QH4BU4g8A/BvX+sANIWQ378rN2dxdH8fqIMALJVhvLPGTXA8BAKFECSfBGOyRVFshDwM5K8MLt59X9/B/A1PkLyETEpgvzup1waAnIQFszZJO8IdQAkb/0Yj+PDZufinr0qyl3J6/Jjxs5pWwBULYHHEYK0m1tvPM7QEgABQXPEthDwO407nPGrqkT/Uj4EYq7DHEHUcHE3t2W8nJqF9/4QHnUXQWYnELZRAe/9bQGQQmiITuEndMscJPP+9gBIXtg9gBod4ch39D6X/LwvtssBoZYVhzC6MJDFfnsAJCeUUQMxfJSAyLmiQToPLBj91ln47hcVSU9tudDw11CAU8FSBXCHHRJXtFeA8svS6cvyzw7gdy+WegpGewAkF+S2xtkn9UqZ55TwGgAECXHxGSQTB68DgBRJw39R4riru1OoEvEeY/F6AOgqw8/uM/f8koQXG/MftbyjUACmNVUAAAAASUVORK5CYII="
        }, {
            "name": "pikaAt5",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEaklEQVR4Xu2aTXbbIBDHh/QelX2IrJsjdJN9fZIeJd1n0yOk6x7Cdu+R0DcIpBEBZkYC7PdsbaLYWDA//vMBwsCNX+bG7Yc7gLsCbpzA3QVuXAD3IHh3gbsLtCSwA5t8/Ol6XK+dCwTjTyMC61Hgv/t9AsuFoLQDgDZ6CMcj3uavJBQKJKckfORGcG0BBJuFIEJzEykkB3ABbiWIPgCCZQ+DPb6fs2owZDTBZSQhaguI+gBScqWz8zBY+36e7JqNHsDa+XOJ4XGbCYRCDXUBJAJf2r8HMvbzFCDXGJ2E8GUA+DiLbBM1Ug3MQ7BH1a+qNtYooT4ARfSvajUAoDuF2OECqcAV2gAg0Z9LgbUgxLFEqoI0gNmXtwPage3hDqkMIlFBGUCFQsMVQ/8GKKW/GiowBrPICYwx6aoz4w5pAD5VTQWJwJdYI6L0x7ZXNhj934IxKLllOi25Q1YBQbaLqmwLiMauMAOYFUAZ5twhCyAOXpvV0BgAGkuzQCwgHQCfyuLgtbrk3IHtlQ1ynqMHUPBZtVu0nn2q4/QOBOgBCGZNDIJZBCnj3bJ5yokjCPogqCxkRPGhVRYQADCFtQFf6DwMFr6egfNhtvJq5QYMAKwPYHfOlsU8gElw3+zR/smu5a8RwGR8oaBTAAAALjCW6gRBTFkdCwpBkCuHdQAKRnAdOeNauUGGHKtKrB3U1DMQpABe/C7xj0y6Uo9ng/GueFrVYbytFTYxJaXyM9iX12WvtWFIZj6MYB2ASMqi2SepNagghl8LhGY89QBIl847sDkA+IgaELoDGG0nb3yYbBCvMX4ZgNPTE+ze3pwotkJwYxFujOoVwJS1LIhOmUAaB3QAFLkcZ/WA78NiNXQC4CK8YGNUBwCfKljYoPF4HZ4B4JVkGgXAUnYqrvt937g7LFGBHoAvaPBPan2wMP5vpIBKs+9KXHelX6qEDVIJhHUASErD2xDUgvFu9jvIfzQ0/UqNfrd+OSypkvwWekhtIZp/AhC1A/gOP+xvSQ9sm1ERn9UQlHC0PkMlstM2BURKoPnd+T91ASb/10h/VPouCKJ14WCCalucZZ5ogDP8OH4eSl2nAryw8wKArXmfjobGB/d5yhXJD+oogI7gGezP1xn8BOFxBhOa1zQ8npJpm3yPVVZ+zVMfgFcCXfAc/OheKlR5cnGOy03THcAoO+cOMQTNqQ+5obmWlwRAguMiMJLTYtsN5J5g4QQn2OORtK4uEI8rUsMhk7c5c3Tfy2bfuYjuwStbEwgYD9q7gmz2+wEIccHza3teQD77fQGQuHDzALiXLCsdDZ3L11188At99IkBicDYBoJO/pdxAeIKdSEQ47EPyQ51tyyQ03SlDRKU/pTzFcZfVgFECXi7Rg2fTqEKZ53Ox2ViQEoR/i007mNJ64TSa29pIL0eAL5W4FIkPQ/ILXUlEK4OgNQVps2OFbK/TheIYgIersSDGe7Ce3/RA5eSXV9OBdelAG60+D3Gig+88XCYHR/ukf8BEEjxUKkIv2wAAAAASUVORK5CYII="
        }, {
            "name": "pikaBall",
            "data": "data:image/png;base64,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"
        }, {
            "name": "pikaPu1",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEBUlEQVR4Xu1a23XbMAwF2z1qeYh+d4r+15N0lOQ/U3QSx9mjZQ8kkQbBF0iRlE5s/SRH5gO4uHiRUvDgj3pw/eEJwJMBD47A0wUenADPIPh0gcO7wAR6lvHjBPDv1txgzRdsAigqjQp/u8H1CjABwDsAnM/zP01lbrpYK+WN0ma9Xsrj+scC4MtJX//eZovTR3WwvFn/WABMoPXVVb6n9Q/GgB/6qv8Mtf44ADCoxYLXGvBC1O9t/TEArH59/hpIYxNoHvBGBD4nvjSJ3LFFiILWmmbsxwlCVrfBqWPgGwoAD2oSwEdQv38WSNA7B0LPtMf37pMG1/L16NbvEwRX5V+QxwDwa6nkRc9I6vdxgYTyKsI1vQI0/74U/X1YGTFB281+gn55c3e6mLp2ZQT+apSeKUgluI9tK1eCf202Qst/X3ahAFxMr7EUQvNDlQ/J5aVLzgjTHocnF+tTPMHbd1X+99vCYPNY5fEFCYrG4jkgcJoHBoBtj7kcztgCN9oOAKO9oziVkjU6Sp1A61uUnNQ1JGCZhUqB2AbABNpEexTAU57T9Z37vwvCXek0OJKUIs0o9QBIlWe+72eDk9UnxQiJ0kG3CPUgZGAcAN967lhC/RTt0ZFLKFyjaGpOjglhAFgZ6y0SUz4UoYXRv4XiC7t890mV1j4AkRreLkKof1k3e2WrXNZ0R9+bdy0Uja2BAGitQSmMuPcAm2KBK7qxIClaTO6eAbChdvFbugkHwZTAI0G4p1gEQbkFV6S99gAINTALsmnbSQBAUHLpbwtDeIClMsfS4x2ADe0rCi0FAMeOAiFkNO4OCwAblTdWMyDwDpC/lzBqOxPitQQNiqqV8pQFewOQA88FYAmczR60duoMoLf1JYooUhx5DNgq4O4A0LAeMSxngO3W5tTGbmYkiJaM2Qpwcq9QWcdACAdBs2rgaqpEOcnYvQGg9J8zkiP0JwcA0y9MN+fYbTgASx2QL6wkbPLGJFzAKo+TyIHJ5wKAc5r5f6gp2gWAriyIUCfWEO0GQBXFKycVdYOx29rKvXefVn4gMiATjEQld88oPhAZKXSrvXLW9+uAgQVRKyVD65QcjUfPBHuXxL0AkFid7i06FO0lrCNIg+KoVPm4C+Av6/ngyKxQcm0WMkou4AXnZK3b6LQouw8ZUANE7fW67GZoBzaYahH/5g5sTG9hT667XY4eEAjeWJXGARkDOH93ACJ0WxzrKktAqAOA1Au1QTL0yUyO6tQtZhHYV9U1n9ZvA4BkC/y3FgyDpw1khHGxeiQY9OjdpDAObAeAuge7HJUAEvoKxB5YZFytpOKLZaG2AERiRTYF5qyVALYm8ucrwazEOw/IfbtQIF5fBhQIstfQhwfgP5bbyVDqCKSJAAAAAElFTkSuQmCC"
        }, {
            "name": "pikaPu2",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEMUlEQVR4Xu2aXXacMAyFRbqPzGRRfW9Wlu6ni5jQfST0yFiMxsiWbAPGSfvSljFgfbr6sc0A2p+ny+SGfI6DNrTH39NGXWG63WazXl4C897hSwBRAUweADf/nQPpHEQRAIIxoCq+M4BFCR1DqFIAKqF3CCoATIJXJb33DEHP5FdwZVAD0SsEHQB535fElBp6hGAHgCAMaugNQh4Agxq+BwCvBikv9NYblCmAKYF3ir15H83YDECPxtcBYFWhV+PLAQQlMRn3seU0VpS/lzmYGi61y0PAqgACgIY+j/fFE17/BIAnn1AaQSgH4CsBJcFoGJChOJ6MpSSKALDLnEZ4+XFpooRqALwUihBQ6u9e6gAwTSMMw/3/CACvuXsbQKgDEKhAXB0uOWD2Nhrrkg+DQNdaQNgfgJO+j3cFwALwQCVsDkCsCEwF5G2uAn7taAh1APziSE2EpAJUwMccArEwoN+OCodqACbjySqvBA6htRLyAHiPu41Q1gcM+BTcKLDsDT5dphBAFgSaw6Ij9g/L+4P77ACEM4I31CkAvNIuiWUCERUQhDAfPFSWxM5U6Va9DYCwG4Ref/M0HQCL8SwUbh+juNcolUfJ2bFruSDMAMIDEid7mCFkA/BJUQqFHGNTY60LNHVXmF4iAShWwAEArOU0DiBc8Q3YxVH5AoALwJuvaNEcICUsWgE+jyAdu22lgIdymjjBkgFEYh4BOOlz4+lNPwHgz+P0MUm++kukll8MIgHdyug5LC9Lu03PTS3XHwEkdn3x4QRgkb5/2e8AIxpNxoW/7Q1gmiYYhusDhFQ+uE9d2fenpDdTnVdzvGTFDJWuE8ytPL942lszQxgWJ7gSGwmD+RaD8ZpcLQD29L4zMlAin3OsPC4AQm9QgrJ66wwAQgiS08JwiCZBBIBNidSZxaRLEMjTOE66ZoVaGiKxZCglxTUAwxlgDYC9jbdA4/lABFBTn9HjXAHhhE4BgG24fD0A3CLfc6ycwCrCqg/QvgOwSCw1JjevZL1PymgBhHQSxP5B+CosaxLK4NYAhmC/caWArwqAKgNc2eHM6nD0AAVQrdYaqyLVRUJgaZCEjZvDFTADyOsvsmAkkqDUDjcBsDsEgVhsQdQMQJZXKwfbVoOGRVHlPJrcrm2Nbd4INbEy8VLtm6VN1wJnM97lGuWD7uRq8IwGWeeUKn38GacGULpwCu+zJ0FCU7EktnrIOi7c5ZHu401VDJqtDPKnGz6LtRqx97gYJHFLLDjB0k+GTqSGXJDLoS3dKBzf6QB8f4B/7b1UzjXQMr6sCsSe3FFYoAlaE+TKpIXiaszOIFbSLZqkv0k5tS4DsHO1sHiuhoneB+Q8nR2AbpEjjjS+PASUHEE/W4A8nNgksnWOT3LG1oWA9qbU9zz83pyvS7R3Zv6+L4DMybQY/h9AC+pneuc/0kIoX+1DBcoAAAAASUVORK5CYII="
        }, {
            "name": "pikaPu3",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADmklEQVR4Xu2aPZLbMAyFoewNUqWK7JlcIXVOsX10khzF6fcUW+cQtrfITIqUKRNmQBEyRPMHtElKHlHVrkxReh8eQFJUBxs/uo3rhwagOWDjBFoKbNwArQi2FGgpsHECLQU2boA2CrQUaCmwcQItBR7CADtQ+jnfeoB/56xBy9pZVpgoGgV/PMPxCLADgBMA7Pf6j2zPna2j3OJJNPVbQjz2vT4A73p1/HvWEedHlzny1Pf6AOxAqeNcfKnor9ABX9RRvVaLfl0AWNR8xcsUPJf1S0a/HgCT1/snxzC2A2UXvNKFb1ZbslZvV2dM4BRNavfWgyvqU4EqVPiqA7CLmgR6aevXGQUC9o5BKDXs2fctNwya6euao1+uCBrxB/QxAHwdZ/Kio5b1y6VAQHzn8ZsygPTv46S/nDPtGaYoLCmNnkEdXuYXDDSvNY7AX0m0tiGXe2lbBUK+m2DkP4/CGYBfA8AHfXKcCOmDi3exvRoubUfQ8th9cZKmpMZeIxjx315GB9Mx8MUWK4oU8RgI7OcKBsC0PLafZ9ZWmEZ5AFi2H54B4Icjl62FTtf1oNTZy5WnhgQWdZQC4n4AO1BU7fEBWL6Pfdt2Pdn5P4dwER2GIylLkhHlPgAh8Qrewx5+6we1cv96NOgnPSFHSEQ708K1BjEN7wPArD+M0b4MYQo+AcBP2MMfBJBi4VuEhq4JOeF2ALZ4fALKfVcYBNU/t3Den29qfRsAZv0B0L5jITvMRwAd9e/sDuiSpZzgc0E6ACpqJ8rbUbwtFs/RFHgtEFwuSAMQWd1xoT4ACCU2/JVKhfsACJa2UgAocAkIrjSQOUAgnqJGEOwVoH0eh8Il6oHtgjiABPEIYW0AbNC2C0QAUl9qIITQO4Ba0fdNpbkLwgASo8/TYGkAoXUEd4EfwI3iJRW8tAMkiyhyQRBAqvUl4scRYJkC6JoZugEUjP7DACgVfYrCki4I14DC0S8KgPwceQsdHgUc29PS3E5tl9UFdjJ7IMTnARUBpALztveVcgtCfCpcyf7ZhE/55OmRAZAthx8x+j4I9mYLtnO8Kb6Y51GjPxvczT9C8XpI1pfcsZGZ3c6eDl3barHVpPyt8INaP7TBIt1n7DD6Vx8imij4Pl2pFXXpfXzukDnAAMCbXX2FeUNdoJuuBV7sQ4v57o1rP43t7EQ/ZqKQYT/muiVByBwg9RkVS7bFPV0a2tNnu8Ipt8rSVvCtwX8vpYdQgoRg0wAAAABJRU5ErkJggg=="
        }, {
            "name": "pikaToRight1",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEM0lEQVR4Xu2bTXIbIRCFGSUrbbXULlU5SXyP+CQ5i30P5zjaxVtlkxIpYEDA0PCaP6lK0sJllxjo/njdNAxexIN/lgf3XzwBPBXw4ASeITBQAJLo+66gjzImcF56fy3pEUfZUZzfkQNrt33nKWsSUHy7KCWp7prtb+6giFgIGIT2KLIoB9BrW+1H9YOA42GT5Sjl5UQ+5juOqMbvqAVEbwApuV7HiCA4w5ejyMFBYa/9sXxiNS4Ykkx8m/hejtdu5AnKESgAHUK7oxDyBPsFNwSNYMU72Ce7GUcJvQHoxI9mf7ZnmQeU0zZ33BqANVNyk1ktEOXw5XIWuy/fXS5BIaQUYGO5hzqmQHAAdvurCsBckAPQo9CQolOGz6ljTXy6CVF1kpO5/WJdqlrW1o2xhRqgVvr2udJymguHpAKiZOLGaTB0aCiUiqhqABvC9bX3UAC2hKaSLheACaVETVcZFsOdLymTDyATs1Flh6wUQwH88yz4Suwb+QAIBRAbkPxqMTAB+s5b21IQagCQYRDLDQqLQRAQAKWCKC/h5SgFuGEpDDQkDEoAkMlBYlgIYAbvDQCaqzAAOsrpA42SzKhVpZS9ke9zSRCwi3WmRsoYGWgkBAoUcjaAK8CMkqsPSn3Jt9XSn7ljTmTagTaI83WbHepYC6kSD3v59nkOzB8BA3W+DkCkAlD+1mmngngSe4Fg2sPKAc4J7pbTc5YEoNr0gDAdAHPDFOQQJdU3eRIvLz/Ex8fvIgDVHjk95kAoJa5QqXg9QIVXc0HUGwIHAGz8+yLEq0EX9g8ABBK8PvouKQFVAQcAVBEq59Xn9bAX4vMc9w9DLIEoQRgDYK0FTEGwNTFyPlZAN+f9vJN9dwgcjPIUEPocnP9b5/Xsd5K/redLTlLhgKigBYAWgvphKzybzRMAml6WFM/8iJwwA8AGghf/fggEoGrX/JwiUjlhFgADQSU9pYa11F1VYCEkC6Dawkc5Rp1ZJoq0rMpbQyDMCoe9/PX5V3wzkWFzgQGTSes1IOIZj/+W8ix2Oz0pEwGsSvA3PFoJh71ThuVQ43TMkHohopxXn1sAcOEQQ5i5Fb41ADtRLu5VUST/hNvgTEQ0f3UvADZqUOEw+pU5x/ligmieCtOBXiFUSLxOeFN8jwBcraB/GXgcxnV+lgJcThjpvIGLZ39rVN86gIqZTtvgXEha59HlbyaA7rvAFIia2Z8RAtOcXxZTimunvKuZpUQ+OgSGA7Az7wOIQEwthWPgwwHkZnjmbpC2Y0ICTA2OOD8jB0xbAmMI9wbALNP5Kyzq0FVddF4z2fV3bv2AOj9TAdapzf8MgMbqC5fIZQ3Oe8H5APSI4T0DzpK1ytzpqOEV3XXJLK2Tg74PrtByZ82zSYdVw/NVL0f7MVF3kHR2wP/BYTO4ucdUXc9UP9iPwm17engA/wE4MtVQoe0gqwAAAABJRU5ErkJggg=="
        }, {
            "name": "pikaToRight2",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEM0lEQVR4Xu2bS3LUMBCG21NFqKwo2MwuV+BM5Aw5BmcYzsQB2GRFNlSxSgHFiGrZbdoaPX69bKcms0rGsqX+1P13S/IMdOWf4crtp1cArx5w5QReQ+DKHaC7CJoA4N14Xs+BLIw36r/B32vPsQQdvXen1mxtfGgkHih6bCFP4sdV2VB1c4Z+wCCsRc6oYgBV2yJbim7KMNxtahBjBrqjs3nM6qYURA8APned+xnozmjjeOBssKFHKFRSVCYQsF1ww1TH03Wv8AVEb34kohFg/7bZYbBAIdugRjmds+aVuHBmH8nmqCf0AGCFH1X/pCUZDXjmJby2BiDDjopehm3Jpmz83/M3OhzezFqCQOjlAXrAq0BgY8/nP/sEsIYmaKENVJ3eyfZ9KUre1Dvc9Jf06cwGAiAEOxQOXgBMcEol1aWmsqNrKIQ8QPqHARgzKnjqxswJGpNCrKIveKB7CxsZ6gMGMKWvphB6uz/CLgtABwhdZ/+sAvkQ8LJqALklpjMr3QBo46VPH4QmAKwijrRLMkQXCAiA2NogaIgrhg2EcRMAqWwWncnGEFYHoIwPem0xgAJN6AKAxxETwdTSOBnLMS9QmgDpwhbpMKVZSQC+lOjLu6mO5J7TtFT+1LkoQgUbAoBAQAHQkczpaYmwBwx0PDAAGXIoJNAOuSQ+EdGPm1v68Pt5QaIViIyxFOVzrrdrSmULIPRpAWH3ANwFy5eB6Ovbd/Tx109qAQCNf0i53ZnyhUAO8TVWhTJmZFxNNADpSIHsVg+4k4WMKwsAUBmmvKra+Nia3wWQKoJSg73QqQZFUTUAqUCRo7NVPYCFTD734x/B7bZIEoAu6f3/2A3NAYRqAW085/eH989ETxcAbOrUKbBG8VtByNIATVuHgwbAbQIe4M3/IQiIgWib2DlhMYAJho3pAAA3DBYAJO8LVB+IlOClriP1QC0APto25vhIbn3veIGhI120QUKAjYwdrMQgGDOeFMV2sKoBzGHhLHLuj8Q6IJ0v4h8x3JfTY1ve7jU23maM1QBMy1wtcpMXzLbUnguEZtv3/RYA2NBxkeRxd4bR4oyQhY8/7lsme/CARZJgez/f3Bp3ycsgaj1BiiF+rcZSdzZX0NmPigNUkaCNjqNnsFCyNpjv6I1l7fYHYLRjnqcWHhBCk2P8eh4wjXaNTdFdA+i9FyDGI+lPPKhdHYCFa/Vq0JcFpGtn9iEPf3EA5plz3gVg44fBVn2bvycY9YWWOiCLIZl5AYAsg7cKgTFtNzoUkbM/eV7qINQ3M2uHwByuvgIGk5FlK/1u0JxsMh60BYDZA1IrvQw7suJeP3dTAFamE8vdHAg5sb+lBlzogHbjWn3IhbCFB3iFUA28SiSRrfCtQ+B/3XL5QyqZkCIILykLWAh2O21a0rrbVs61VG1hr6M/ktiLB+ToW7e2/wDwLtZQaHUbQAAAAABJRU5ErkJggg=="
        }, {
            "name": "pikaToRight3",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEMklEQVR4Xu2bz3LUMAzGlR047JUDF2b6YjAD7FPwNKUHeDEODMOBI71AzCixsopjW/IfbUp399JCnNj66dNnOW0HuPLPcOXxww3ATQFXTuBWAlcugJsJWpeASyjMel61sC0XsgresX8N8Vkt15IEYj2pG+AORvdNzEgECl9bSkn43KYYmm4WozoPmALgKsjdG8LI3cfGVsVSdVNB4OFQpwxGDYsmqAVhASAm12WeAe4cLwlauLZUJPj+eeq41AOlif31qPGFksZgHcy+0Ctwvr4SCL0BTKVuEZQyAcswLQQLALtBOAznHWdvAJSJrOmVZlXaOcZxhMPhsBioBkJKAVTLzQoJTa9n0GHdWwBobjTQE0p6gFpA3GgTXWc0mUkF4EOwprxbNyth6oNy/Vxt5P6+FICgT9jEkQUwpX89ogWEKQCWrGgT5a+XA2jttFhiTQFQslIqSxliLqPRBVe2nObBSxXUDQBOxOWmPI2ZAvjD0vgi4TOlJTAbt2BaBSDEZ0kZTF3nwQ/DK3DuF8Qg1ChABSEwymRJWfUDHABBCgHkGiKNq6v3caHzMlGBBEDyLA0AdVu7FwCq1O/v3sKbL1+XEtCUaAkAPLquzvKFR1ATBeAaUAUE4WXgW9J54JIAsgBrTVC6ryuA+WAQV4E0kV+ou/fffDRsi6X2d6VciWDi+krOGLx/y6NR1ALhAAB/hwFOY38aqX0/jEez4BiDFQDtZKSCBwD4AQO8BgeOpOMc9FKFUo3TcroAkLaaFcEjuIdHgBE7Spi//vQwcFwPCOYABB+QwG52g88sDT0AsOZMTLA4IKJ/cTsTFCHeX+lLm9s0SigFoF48ZvU0LymcQ/2MVhAWAFR7OUk6BGB1HkiBMgFATo5fY6dFDB7N7cMRAB43ClBln7/eDoPLXdtscbP2siovLYHVHJhRfGdIICh43OI+HR0CqJI/Zi4GtyR4rRE2AeBqwA6PtrVJAdv6nxogGpPa8lLB4/hSABoIPQBM1QBHgPvHc4C+/s8S9Ps/NUAcBIfRK/skVckHegGYIfgPdnrY4AQQVi0wNULvI6e3mPxzysjtFpcEQOtYSZ1BAASDHwy+pARqpD+b9PyjspwR9lTAAoCXA/4n7Qiak2As0zUAMPjJN3YAsJQDzzgqQXrJSgR5wDXBU/b3BJAsBy0EOmJrfsEq5gF7K4CvabVD4PaohZAzt9w1bfBZc6idPHHfAuF0BHC/Oz89eNxTBLD4wlyfdgBKgr+kAhZPsAy+xPxoQRbbYL48L5B9jfs/awB+71cp/NkogGq/JPsqQgZ2pXonUDrv/wRg9qrOXlDq/nt5gOluIJ38Yqq6tAesOsSeKqgJfi8PmCD0fEFaG/yuALwUqrwg+Ll/Uxx7lsDiB7XtcUvm9zbBjR/VlkQrhKeggJUxpvZ//kcW5+y1/yrvP+wZzlAOWaceAAAAAElFTkSuQmCC"
        }, {
            "name": "pikaToRight4",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEPklEQVR4Xu2bTZoSMRCGq1uYjT7CCVjquWQO4NIreInhXrry4QIy6sphiE+lU00ISary1zAy7IB0J99bVV9+aDq48Vd34/rhFcBrBtw4gdcSuPEEaG6CKgD4ajKv5UBOxCvrXefvteVYgoneulMt2xYfGokHij22UCbh7Yo0FF2c4B9iEFqRM6oYQKttlpasixKEu02VREwHKziobVI3uSBaAPCl69hPBytli8OBo2AFW1GpcFQMCLEucUOuY/O91/gCpjfeUuIRwv51s77TQEXaRI1SOkfPy0nhxD7Y5tJMaAFAG7/U/VklCQ0w8lRelwZAw46aXoI2timKfz78gL7vRy+RQGiVAfaAJ4GAYg+Hw3UCmMITbKMNrDq9wfZ9SE5eNTvc6Y/N6cQGBCAEO1QOXgBI0EwlxUtNS0fTUghlAPUvBqDU4ODchYkBGiaF2Io+44buJSgy1IcYgJm+qkJonf4SdkkAGkBoGv29VcizQJYVA0hdYjpRaQbAFk99+iBUAaAdcaCdM0M0gSABENsbBIW4ZljBGC8CgJvNopGsDKEJgCe9nT59UQlY4oNZmw0gwxOaAMBxIARS6NY/tzVmazmWBZYniHzhEtMh51ksAN+U6Jt3uY7omo3ZKn9qvCiSGrYIgASCFAAsQW12Aw5lLlof6tOQjkcMgCIYKglph6h7AwC/5zN4t38+SaZaIBLGkjWf43q7ZKmsAeDr2+IOPvx6qg7h6gG4G5ZN38H393MNY+osqFICKcSn2BVSSknGdXUAYlta3+wT+6w6AMHKkFsPsIsh+2Q3VbDbnlsEcYM967/CoigKICY+JzMmzQA0MnrdDy4XPG4LLaRipzk5p0nVAYTWArb4P7M38PntHmB3BkBTwSnQXQBx0eW+L/GBZBP0QbAB4PeBDBjnfwLQmbCuI88QlIjHsXA+kA3AgNA1HQBwWgbWEpgWQDTnh0TWMESuDEoBAMBKwXILD4+nt3KyYEx/yiDaDIXEl0Z+2L8MvxTFTrAqADCSlqBsCPcLhT5AnY8AMPpfd3/HsnWF0vl+junZXqDUsMTu+/lEAMw298H6hcJkwTgu5sxetysVfvSo6QHo8esBLEGXBJkcfoRGV1NgzPmHfi4DYAwA1t2XxZ36+HhMdz1DZDz/w4l1v5eKj9ZGaqfR9sshM/AgZL0EUD+r3v3sZtcHwGT/sT7bAUgRP10GHPWym6FSNDcNgMRLpj8CXW8dIAtd0wxwoi/K8P8GAIrvOr3oSfr9cmoAwxRd+RScIn+zAMZ6PoZTHFhxQ1mJi1pVzwDcNerUAv2AdZKmpMYieXyjagCsbUe2qb9YAL5dI7f398XmEgDw8fiTR+ZjSeOJ8uD0gT1FKoSLADACVMp/BKTnBC8GgBV18ZPlHAQrW8SBFTfkva2sBZaFcfHxHySU6vS56QHHXO3veFcDoAxf/tX/AH5Q01CaGf8RAAAAAElFTkSuQmCC"
        }, {
            "name": "pikaToRight5",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEe0lEQVR4Xu1bS5YUIRDM6mefwdlYnsKFSy+i/byJJ3H0Ii69R7vRM7Q284CiIItfUAVUOz21ct4wQEZGRiYJDnTn33Dn9tMLAC8MuHMEXkKgHQEGEZ5b3BTojTbDjRfCYjEMoSX3A6URAMr3ymrH9ijZfFBcQGJMUrNv3v/mCYAQgoGQcy3BcNmzXMuOXQ9EDwCmfY9CiDPEgpTRoQm2AFEZgBBdXe9wEPTGJUFGSoEDsEwNmeYrsqlocHojYeFzvCO3SERvnGnOkEagAGgQRiI6w3bBA7FNaBBKKYzNjY+aEg1kGzQIX1r5YBcQpNEm45SEQgMADFyD6MUEafD1+psOh3ezlqAgBKuSyYQK4PQBwQLwMIcfqgUpABSfy+jvjRa1FD61D23sL5VR3MJLa4HKNFE7vF8MNIqrOJNTsW4FQaa5ZA2wEeRprzrDhNJpKhyCDLBiwra2AYi2oeBWjyHdWQ3ALGfW9JUgtAXAFEEx0S0FIJrKV4ZFr2SQKbPDOhD0qNGBcN098wI8jbX1/l/HgleRDkQ1BriA8BI3lS3aCaBrvNlbCIQ1AMAVLXYSawMCAkCuIEqKmgwFQdiBJbNQEx3IAYA4B1L1lCbYTJEqONroQAoA3lgpKIRiUpoWxnS1JQ9ITShARCkRzNG/tNSN2oAs1BKEqNOA3gAUAs4CQRBQAB51n5Q+RdLV1pKYZymsMVIKAC1DARGaeWNHEo8X/dO/qar6fK2PBnoSLA0BYwdjAeb9WSqFYYELgvx3LSBKukErAeCCVsQAGhgAS8rXCI3uAPA0qOqnVFgx9hyGkb7Smb6//0Aff/6opg0lIBRqQL6iSzPCssft4dUUv8UJNmtfdkAuA4Q2/20gOgU7MRqA1sar2NaWZe3LDuAG5hkgjZff6UhEF7YBRX+p0DUuQeK53+0O50EoBEBNKM0I9v658V51mO0Pmn4DcqGaChveIk/XA2sAmNbm/X9jvPJ+kP65u0HsJhnVC6lFRnHXHoeBtTQIJrcbNfcBiJ8FpLcGGkk2Ymt/BoSGACidYSDY+HdDwAdApkD5tTCcp2Z5Fxm/K9wQAq6/BkFHXdKaUlezQEmG9DE7DbYWQg5A+u1AJQCmJY8kvlyI3k4/WhA4uVsdjd1VhPhDh8NDrjDL58myuNRMMCywgtj3xlgaL78dAJg0IQBCD68bZ+0MwByB7OBzqvQKBGGkBeC18kjqb+pqgLcSD4keIJR4P4sOgjYwRtBRZ4cT+GwOmDM65BYBULnQMLGlFpQa34sBVpvqd78YE24YgPwpcgvt16j/LNU1Fs7M0ZL1HgOQ3O/+UfMs0M16+1DSyXz5J7TPAgBb9vKKE+lYPwsAtKH++6AbAEBGWx8BXOoQYnzHNNgfhBsDQB+S0o+Ylj7Ur8gJfJ/AlF2/QofCGxpUL1X6IID3eFMJle8oo57vWQcs8Ft2h0wkYh6LldW6o4zdCHesA2Lc4R3lUq/ZWbW2gCwKbqZzCHhaPVEb9n7AiFGU/AcJbwf14vv/nGlnBuwP2hN8ESNfTFqbCgAAAABJRU5ErkJggg=="
        }];
        Game.element = document.getElementById(id);
        Game.element.innerHTML = '';
        Game.interval = null;
        Game.FPS = 30;
        Game.objects = [];
        Game.pika = [];
        Game.ball = null;
        Game.finish = false;
        this.health = new Health(hp);
    }

    static getImageData(name) {
        return Game.images.find(image => image.name == name).data;
    }

    static remove(obj) {
        Game.objects.splice(Game.objects.indexOf(obj), 1);
    }

    static getIndex(obj) {
        return Game.objects.indexOf(obj);
    }

    static newBall() {
        Game.ball = new Ball({
            x: Game.element.clientWidth / 2,
            y: 300,
            width: 60,
            height: 60,
        });

        new Promise(resolve => {
            document.addEventListener('keydown', e => {
                if (e.keyCode == 32)
                    resolve();
            });
        }).then(() => {
            Game.ball.enable = true;
        });
    }

    static loseBall() {
        this.health.hp--;
        this.health.update();
        if (this.health.hp <= 0) {
            return Game.over();
        }

        Game.newBall();
    }

    static createMap() {
        for (let i = 1; i <= 12; i++) {
            for (let j = 1; j <= 3; j++) {
                if (Math.floor(Math.random() * 3) == 1) {
                    new BlackBlock(168 + i * 50, j * 30 + 100);
                } else {
                    new WhiteBlock(168 + i * 50, j * 30 + 100);
                }
            }
        }
    }

    static createPlayer() {
        Game.pika.push(new Pika({}, {
            x: Game.element.clientWidth / 2 + Game.element.clientWidth / 4 - 125,
            dir: 1,
        }));
        Game.pika.push(new Pika({
            left: 65,
            top: 87,
            right: 68,
            down: 83,
            enter: 74
        }, {
            x: Game.element.clientWidth / 2 - Game.element.clientWidth / 4,
            dir: 0
        }));
    }

    static start() {
        Game.createPlayer();
        Game.newBall();
        Game.createMap();

        Game.interval = setInterval(() => {
            for (let object of Game.objects) {
                object.update();
            }
            if (Game.objects.every(x => x.name != 'block')) {
                Game.finishAction();
            }
        }, 1000 / Game.FPS);
    }

    static finishAction() {
        Game.finish = true;
    }

    static over() {
        clearInterval(Game.interval);

        for (let pika of Game.pika) {
            pika.obj.src = Game.getImageData('pikaPu3');
            pika.obj.style.transition = 'top 1s';
            pika.obj.style.top = `${Game.element.clientHeight - 125}px`;
            setTimeout(() => {
                pika.obj.style.transition = 'unset';
            }, 1000);
        }

        setTimeout(() => {
            Game.initialize('game').then(Game.start);
        }, 3000);

    }
}

class Health {
    constructor(hp) {
        this.ele = document.createElement('div');
        this.ele.style.position = 'absolute';
        this.ele.style.left = '10px';
        this.ele.style.top = '10px';
        this.ele.style.width = `${hp*35+20}px`;
        this.ele.style.height = `40px`;
        this.hp = hp;
        this.health = [];
        for (let i = 0; i < hp; i++) {
            let health = document.createElement('img');
            health.src = Game.getImageData('pikaBall');
            health.style.position = 'absolute';
            health.style.left = `${10+i*35}px`;
            health.style.top = `5px`;
            health.style.width = '30px';
            health.style.height = '30px';
            this.health.push(health);
            this.ele.appendChild(health);
        }
        Game.element.append(this.ele);
    }

    update() {
        this.health[this.hp].style.filter = 'grayscale(1)';
    }
}

Game.initialize('game').then(Game.start);