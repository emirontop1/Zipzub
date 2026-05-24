// Xenon Maps - Offline Harita Yapılandırması
const XenonMapConfig = {
    // Varsayılan konum (Ankara)
    defaultCenter: [39.9334, 32.8597],
    defaultZoom: 13,
    minZoom: 2,
    maxZoom: 19,
    
    // Offline harita tile'ları
    offlineTiles: {
        enabled: false, // true yaparak offline modu aktif edebilirsiniz
        path: 'tiles/{z}/{x}/{y}.png', // Tile dosya yolu
        bounds: null // Sınırlandırma isterseniz: [[lat1, lng1], [lat2, lng2]]
    },
    
    // Online yedek katmanlar (offline çalışmazsa)
    onlineLayers: {
        standard: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        },
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
            maxZoom: 19
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: '&copy; Esri &mdash; Source: Esri',
            maxZoom: 19
        }
    },
    
    // Özel harita stilleri
    customStyles: {
        minimal: {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
            maxZoom: 19
        },
        terrain: {
            url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
            maxZoom: 17
        }
    }
};

// Offline tile desteği için özel tile layer sınıfı
class OfflineTileLayer {
    constructor(options = {}) {
        this.options = {
            basePath: 'tiles',
            fileExtension: 'png',
            maxZoom: 18,
            minZoom: 0,
            ...options
        };
        
        this.tileCache = new Map();
        this.maxCacheSize = 1000;
    }
    
    createTile(coords, done) {
        const tile = document.createElement('img');
        const zoom = coords.z;
        const x = coords.x;
        const y = coords.y;
        
        // Önce cache'e bak
        const cacheKey = `${zoom}/${x}/${y}`;
        if (this.tileCache.has(cacheKey)) {
            tile.src = this.tileCache.get(cacheKey);
            done(null, tile);
            return tile;
        }
        
        // Offline tile dene
        const offlinePath = `${this.options.basePath}/${zoom}/${x}/${y}.${this.options.fileExtension}`;
        
        tile.onload = () => {
            // Cache'e ekle
            if (this.tileCache.size < this.maxCacheSize) {
                this.tileCache.set(cacheKey, tile.src);
            }
            done(null, tile);
        };
        
        tile.onerror = () => {
            // Offline tile bulunamazsa boş göster (veya yedek katman kullan)
            tile.style.display = 'none';
            done(null, tile);
        };
        
        tile.src = offlinePath;
        return tile;
    }
}

// Harita oluşturma fonksiyonu
function createXenonMap(containerId, options = {}) {
    const config = { ...XenonMapConfig, ...options };
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error('Harita container bulunamadı:', containerId);
        return null;
    }
    
    // Harita instance'ı oluştur
    const map = L.map(containerId, {
        center: config.defaultCenter,
        zoom: config.defaultZoom,
        zoomControl: false,
        preferCanvas: true,
        attributionControl: false, // Sol alttaki yazıyı kaldır
        minZoom: config.minZoom,
        maxZoom: config.maxZoom
    });
    
    // Harita katmanlarını oluştur
    const layers = {};
    
    // Offline katman (eğer aktifse)
    if (config.offlineTiles.enabled) {
        const offlineLayer = new OfflineTileLayer({
            basePath: config.offlineTiles.path.replace('/{z}/{x}/{y}.png', ''),
            maxZoom: config.maxZoom
        });
        
        layers['Offline Harita'] = L.tileLayer('', {
            // Özel tile oluşturucu kullan
        });
    }
    
    // Online katmanlar
    Object.entries(config.onlineLayers).forEach(([key, layerConfig]) => {
        const layerName = {
            'standard': 'Standart',
            'dark': 'Koyu',
            'satellite': 'Uydu'
        }[key] || key;
        
        layers[layerName] = L.tileLayer(layerConfig.url, {
            attribution: layerConfig.attribution,
            maxZoom: layerConfig.maxZoom || 19
        });
    });
    
    // Özel stiller
    Object.entries(config.customStyles).forEach(([key, styleConfig]) => {
        const styleName = {
            'minimal': 'Minimal',
            'terrain': 'Arazi'
        }[key] || key;
        
        layers[styleName] = L.tileLayer(styleConfig.url, {
            attribution: styleConfig.attribution,
            maxZoom: styleConfig.maxZoom || 19
        });
    });
    
    // Varsayılan katmanı ekle
    const defaultLayer = layers['Standart'] || Object.values(layers)[0];
    if (defaultLayer) {
        defaultLayer.addTo(map);
    }
    
    // Katman kontrolü ekle (opsiyonel)
    if (Object.keys(layers).length > 1) {
        L.control.layers(layers, null, { 
            position: 'topright',
            collapsed: true
        }).addTo(map);
    }
    
    // Zoom kontrolü
    L.control.zoom({ 
        position: 'topright'
    }).addTo(map);
    
    // Ölçek kontrolü
    L.control.scale({ 
        position: 'bottomright', 
        imperial: false,
        metric: true,
        maxWidth: 150
    }).addTo(map);
    
    // Harita hazır olduğunda
    map.whenReady(() => {
        console.log('✅ Xenon Maps haritası hazır!');
        console.log('📍 Konum:', config.defaultCenter);
        console.log('🔍 Zoom:', config.defaultZoom);
        
        // İnternet bağlantısını kontrol et
        if (!navigator.onLine && !config.offlineTiles.enabled) {
            console.warn('⚠️ İnternet bağlantısı yok ve offline mod aktif değil!');
            console.warn('ℹ️ Offline harita için tiles klasörüne tile görselleri ekleyin.');
        }
    });
    
    // Harita referansını döndür
    return map;
}

// Offline tile indirme yardımcı fonksiyonu
async function downloadTilesForArea(bounds, minZoom, maxZoom) {
    console.log('🗺️ Offline tile indirme başladı...');
    console.log('📐 Alan:', bounds);
    console.log('🔍 Zoom aralığı:', minZoom, '-', maxZoom);
    
    // Bu fonksiyon tarayıcıda çalışır, tile'ları indirip
    // IndexedDB veya Cache API'ye kaydedebilir
    
    alert('Offline tile indirme özelliği geliştirme aşamasında.\n' +
          'Şimdilik manuel olarak tiles/{z}/{x}/{y}.png formatında ekleyebilirsiniz.');
}

// Global erişim
window.XenonMapConfig = XenonMapConfig;
window.createXenonMap = createXenonMap;
window.downloadTilesForArea = downloadTilesForArea;
