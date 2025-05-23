document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

const colorButtons = document.getElementById('color-buttons');
const customColorInput = document.getElementById('custom-color');
const colors = [
    '#FF0000', '#0000FF', '#000000', '#FFFFFF',
    '#FFD700', '#008000', '#800080',
    '#FFA500', '#A52A2A'
];

const cars = {
    'bmw_m5_e34.glb': {
        name: 'BMW M5',
        logo: 'models/bmw_logo.png',
        spoilers: {
            '': 'Stok',
            'bmw_spoiler.glb': 'Bmw Spoiler'
        },
        sideSkirts: {
            '': 'Stok',
            'bmw_sideSkirts.glb': 'Bmw Side Skirts'
        }
    },
    'toyota_gt_86.glb': {
        name: 'TOYOTA GT-86',
        logo: 'models/toyota_logo.png',
        spoilers: {
            '': 'Stok',
            'toyota_gt_86_spoiler.glb': 'Toyota Spoiler'
        },
        sideSkirts: {
            '': 'Stok',
            'toyota_gt_86_sideSkirts.glb': 'Toyota Side Skirts'
        }
    }
};

let spoiler = null;
let sideSkirts = null;
let scene, camera, renderer;
let isMouseDown = false;
let previousMouseX = 0;
let previousMouseY = 0;
let rotationSpeed = 0.005;
let isCarLoaded = false;
let selectedColor = null;
let modelsToLoad = 0;
let modelsLoaded = 0;
let car = null;
let currentCarModel = 'bmw_m5_e34.glb';

function updateProgress() { /* ilerleme durumunu güncellemek için */ 
    const progressBar = document.querySelector('.progress');
    const loadingText = document.querySelector('.loading-text');
    const progressPercent = (modelsLoaded / modelsToLoad) * 100;
    
    progressBar.style.width = `${progressPercent}%`;
    
    if (modelsLoaded === modelsToLoad) {
        loadingText.textContent = "YÜKLENDİ!";
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
                document.body.classList.add('loaded');
            }, 1500);
        }, 2000);
    }
}

function createLoadingManager() {/* yükleme işlemlerini yönetmek için*/
    const manager = new THREE.LoadingManager();
    
    manager.onStart = function(url, itemsLoaded, itemsTotal) {
        console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    };

    manager.onLoad = function() {
        modelsLoaded++;
        updateProgress();
        console.log('Loading complete!');
    };

    manager.onProgress = function(url, itemsLoaded, itemsTotal) {
        console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    };

    manager.onError = function(url) {
        console.error('There was an error loading ' + url);
        modelsLoaded++;
        updateProgress();
    };

    return manager;
}

function changeCarColor(color) { /* araba rengini değiştirmek için */
    if (!isCarLoaded) return;

    const threeColor = new THREE.Color(color);

    car.traverse(child => {
        if (child.isMesh && child.material && child.material.color) {
            let name = child.name.toLowerCase();
            const isExcludedPart = 
                name.includes('far') || name.includes('glass') ||
                name.includes('koltuk') || name.includes('seat') ||
                name.includes('jant') || name.includes('wheel') || name.includes('rim') ||
                name.includes('tire') || name.includes('lastik') ||
                name.includes('black') || name.includes('siyah');
            if (!isExcludedPart) {
                child.material.color.copy(threeColor);
            }
        }
    });

    if (sideSkirts) {
        sideSkirts.traverse(child => {
            if (child.isMesh && child.material && child.material.color) {
                child.material.color.copy(threeColor);
            }
        });
    }
}

function initColorPalette() { /* araba rengini değiştirmek için oluşturduğum renk palet kontrolü */
    colorButtons.innerHTML = "";

    colors.forEach(color => {
        const button = document.createElement('button');
        button.className = 'color-button';
        button.style.backgroundColor = color;
        
        button.addEventListener('click', () => {
            updateSelectedColor(color);
            changeCarColor(color);
        });

        colorButtons.appendChild(button);
    });

    customColorInput.addEventListener('input', (e) => {
        updateSelectedColor(e.target.value);
        changeCarColor(e.target.value);
    });
}

function updateSelectedColor(color) { /**/
    selectedColor = color;
    customColorInput.value = color;

    document.querySelectorAll('.color-button').forEach(button => {
        button.classList.toggle('selected', button.style.backgroundColor === color);
    });
}

function loadSideSkirts(url) { /*side skirtsleri yüklemek için */ 
    if (sideSkirts) {
        if (car && car.children.includes(sideSkirts)) {
            car.remove(sideSkirts);
        } else if (scene.children.includes(sideSkirts)) {
            scene.remove(sideSkirts);
        }
        sideSkirts = null;
    }

    if (!url) return;

    modelsToLoad++;
    const manager = createLoadingManager();
    const loader = new THREE.GLTFLoader(manager);
    loader.setPath('models/');
    
    loader.load(url, (gltf) => {
        sideSkirts = gltf.scene;
        sideSkirts.scale.set(1, 1, 1);
        sideSkirts.position.set(0, 0, 0);
        
        if (car) {
            car.add(sideSkirts);
        } else {
            scene.add(sideSkirts);
        }
        
        console.log("Kapı altı eklentisi başarıyla yüklendi");
    }, undefined, (error) => {
        console.error("Kapı altı eklentisi yüklenirken hata:", error);
    });
}

function loadCarModel(url) { /*araba modellerini yüklemek ve güncellemek için*/
    modelsLoaded = 0;
    modelsToLoad = 0;
    document.getElementById('loading-screen').style.display = 'flex';
    document.getElementById('loading-screen').style.opacity = '1';
    document.querySelector('.progress').style.width = '0%';
    document.querySelector('.loading-text').textContent = "...ARABA YÜKLENİYOR...";

    modelsToLoad++;
    const manager = createLoadingManager();
    const loader = new THREE.GLTFLoader(manager);
    
    loader.setPath('models/');
    const textureLoader = new THREE.TextureLoader(manager);
    textureLoader.setPath('models/');

    manager.setURLModifier((url) => {
        if (url.startsWith('blob:')) {
            const textureName = url.split('/').pop();
            return `models/${textureName}`;
        }
        return url;
    });

    loader.load(
        url,
        (gltf) => {
            if (car) scene.remove(car);
            
            car = gltf.scene;
            currentCarModel = url;

            if (url === 'dodge_challenger.glb') {
                car.scale.set(35.0, 35.0, 35.0);
            } else {
                car.scale.set(0.5, 0.5, 0.5);
            }

            car.position.set(0, -1.0, 0);

            gltf.scene.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (child.material.specularIntensity !== undefined) {
                        delete child.material.specularIntensity;
                    }
                    if (child.material.specularColor !== undefined) {
                        delete child.material.specularColor;
                    }
                    
                    if (child.material.map && typeof child.material.map.source === 'string') {
                        const texture = textureLoader.load(child.material.map.source);
                        child.material.map = texture;
                    }
                }
            });

            scene.add(car);
            isCarLoaded = true;
            console.log(`${cars[url].name} modeli yüklendi ve sahneye eklendi`);
            
            updateSideSkirtsOptions();
            updateSpoilerOptions();
            
            if (selectedColor) {
                changeCarColor(selectedColor);
            }
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('Model yükleme hatası:', error);
            document.getElementById('loading-screen').innerHTML = 
                '<p class="error-text">Yükleme başarısız oldu. Lütfen sayfayı yenileyin.</p>';
        }
    );
}

function loadSpoilerModel(url) { /*spoiler modellerini yüklemek için*/
    if (spoiler) {
        if (car) {
            car.remove(spoiler);
        } else {
            scene.remove(spoiler);
        }
        spoiler = null;
    }

    if (!url) return;

    modelsToLoad++;
    const manager = createLoadingManager();
    const loader = new THREE.GLTFLoader(manager);
    loader.setPath('models/');

    loader.load(url, (gltf) => {
        spoiler = gltf.scene;
        spoiler.scale.set(1, 1, 1);
        spoiler.position.set(0, 0.9, -2);
        spoiler.rotation.y = 0;

        if (car) {
            car.add(spoiler);
        } else {
            scene.add(spoiler);
        }

        console.log("Spoiler yüklendi:", url);
    }, undefined, (error) => {
        console.error("Spoiler yükleme hatası:", error);
    });
}

function updateSpoilerOptions() { /* spoiler modellerini güncellemek için */ 
    const spoilerOptions = document.getElementById('spoiler-options');
    spoilerOptions.innerHTML = '';
    
    const currentCar = cars[currentCarModel];
    for (const [value, name] of Object.entries(currentCar.spoilers)) {
        const option = document.createElement('div');
        option.className = 'option-button';
        option.textContent = name;
        option.setAttribute('data-value', value);
        
        option.addEventListener('click', function() {
            document.querySelectorAll('#spoiler-options .option-button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            loadSpoilerModel(this.getAttribute('data-value'));
        });
        
        spoilerOptions.appendChild(option);
    }
    
    // İlk seçeneği aktif yap
    if (spoilerOptions.firstChild) {
        spoilerOptions.firstChild.classList.add('active');
    }
}

function updateSideSkirtsOptions() { /* side skirtsleri güncellemek için */
    const sideSkirtsOptions = document.getElementById('side-skirts-options');
    sideSkirtsOptions.innerHTML = '';
    
    const currentCar = cars[currentCarModel];
    for (const [value, name] of Object.entries(currentCar.sideSkirts)) {
        const option = document.createElement('div');
        option.className = 'option-button';
        option.textContent = name;
        option.setAttribute('data-value', value);
        
        option.addEventListener('click', function() {
            document.querySelectorAll('#side-skirts-options .option-button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            loadSideSkirts(this.getAttribute('data-value'));
        });
        
        sideSkirtsOptions.appendChild(option);
    }
    
    // İlk seçeneği aktif yap
    if (sideSkirtsOptions.firstChild) {
        sideSkirtsOptions.firstChild.classList.add('active');
    }
}

function onMouseDown(event) { /* sol click basılıyken modeli çevirmek için */
    if (event.button === 0) {
        isMouseDown = true;
        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }
}

function onMouseUp(event) { /* sol click basılıyken modeli çevirmek için */
    if (event.button === 0) {
        isMouseDown = false;
    }
}

function onMouseMove(event) { /* sol click basılıyken modeli çevirmek için */
    if (isMouseDown && car) {
        const deltaX = event.clientX - previousMouseX;
        const deltaY = event.clientY - previousMouseY;
        car.rotation.y += deltaX * rotationSpeed;
        car.rotation.x += deltaY * rotationSpeed;
        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }
}

function onMouseWheel(event) { /* sol click basılıyken modeli çevirmek için */
    event.preventDefault();
    
    const zoomSpeed = 0.1;
    const delta = -event.deltaY * 0.01;
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.multiplyScalar(delta * zoomSpeed);
    
    const newPosition = camera.position.clone().add(direction);
    const distanceFromCar = newPosition.distanceTo(new THREE.Vector3(0, 0, 0));
    
    if (distanceFromCar >= 3 && distanceFromCar <= 15) {
        camera.position.add(direction);
    }
}

function init() { /*bütün dosyaları ve kodları çalıştırmaya hazır etmek için*/
    document.body.classList.remove('loaded');
    
    document.getElementById('loading-screen').style.display = 'flex';
    document.getElementById('loading-screen').style.opacity = '1';
    document.querySelector('.progress').style.width = '0%';
    document.querySelector('.loading-text').textContent = "ARABA YÜKLENİYOR...";

    setTimeout(() => {
        modelsToLoad = 0;
        modelsLoaded = 0;
        setupScene();
    }, 3000);

    modelsToLoad = 0;
    modelsLoaded = 0;
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 8);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.getElementById('scene-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    document.addEventListener('mousedown', onMouseDown, { passive: false });
    document.addEventListener('mouseup', onMouseUp, { passive: false });
    document.addEventListener('mousemove', onMouseMove, { passive: false });
    document.addEventListener('wheel', onMouseWheel, { passive: false });

    // Araba seçim butonları
    document.querySelectorAll('.brand-option').forEach(option => {
        option.addEventListener('click', function() {
            const model = this.getAttribute('data-model');
            document.querySelectorAll('.brand-option').forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
            loadCarModel(model);
        });
    });

    initColorPalette();
    
    // Varsayılan araba yükleme
    loadCarModel('bmw_m5_e34.glb');

    // Mail formu toggle
document.getElementById('mail-icon').addEventListener('click', function(e) {
    e.preventDefault();
    const form = document.getElementById('contact-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
});
    
    animate();
}

function animate() { /* animasyonları çalıştırmak için */
    requestAnimationFrame(animate);
    if (car) {
        camera.lookAt(car.position);
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => { /* kamera pozisyon ayarları*/
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init(); /* bütün kodları derleyip çalıştırmak için */