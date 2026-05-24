// Xenon Maps - Ana Uygulama
class XenonMaps {
    constructor() {
        this.map = null;
        this.markers = [];
        this.measurePoints = [];
        this.measureLine = null;
        this.isMeasuring = false;
        this.currentTheme = 'dark';
        
        this.init();
    }
    
    init() {
        // Haritayı başlat
        this.initializeMap();
        
        // Event listeners
        this.setupEventListeners();
        
        // Loader'ı kaldır
        setTimeout(() => {
            document.getElementById('xenon-loader').classList.add('hidden');
            document.getElementById('xenon-app').classList.remove('hidden');
            this.map.invalidateSize();
        }, 1000);
    }
    
    initializeMap() {
        // Varsayılan konum: Ankara, Türkiye
        const defaultLat = 39.9334;
        const defaultLng = 32.8597;
        const defaultZoom = 13;
        
        // URL'den konum al
        const params = new URLSearchParams(window.location.search);
        const lat = parseFloat(params.get('lat')) || defaultLat;
        const lng = parseFloat(params.get('lng')) || defaultLng;
        const zoom = parseInt(params.get('zoom')) || defaultZoom;
        
        this.map = L.map('map', {
            center: [lat, lng],
            zoom: zoom,
            zoomControl: false
        });
        
        // Harita katmanları
        const mapLayers = {
            'Standart': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Xenon Maps',
                maxZoom: 19
            }),
            'Koyu': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                maxZoom: 19
            }),
            'Uydu': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                maxZoom: 19
            })
        };
        
        // Varsayılan katman
        mapLayers['Standart'].addTo(this.map);
        
        // Katman kontrolü
        L.control.layers(mapLayers, null, { position: 'topright' }).addTo(this.map);
        
        // Zoom kontrolü
        L.control.zoom({ position: 'topright' }).addTo(this.map);
        
        // Ölçek kontrolü
        L.control.scale({ position: 'bottomright', imperial: false }).addTo(this.map);
        
        // Harita olayları
        this.map.on('mousemove', (e) => this.updateCoordinates(e.latlng));
        this.map.on('zoomend', () => this.updateZoomLevel());
        this.map.on('contextmenu', (e) => this.showContextMenu(e));
        this.map.on('click', () => this.hideContextMenu());
        
        // İlk güncelleme
        this.updateCoordinates({ lat, lng });
        this.updateZoomLevel();
    }
    
    setupEventListeners() {
        // Arama
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const clearSearch = document.getElementById('clearSearch');
        
        searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchLocation(searchInput.value);
        });
        searchButton.addEventListener('click', () => this.searchLocation(searchInput.value));
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch.classList.add('hidden');
            document.getElementById('searchResults').classList.add('hidden');
        });
        
        // Butonlar
        document.getElementById('locateBtn').addEventListener('click', () => this.locateUser());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareLocation());
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('infoBtn').addEventListener('click', () => this.showInfo());
        
        // Context menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
            }
        });
        
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleContextAction(action);
                this.hideContextMenu();
            });
        });
        
        // Ölçüm temizleme
        document.getElementById('clearMeasure').addEventListener('click', () => {
            this.clearMeasurement();
        });
    }
    
    updateCoordinates(latlng) {
        if (!latlng) return;
        const lat = latlng.lat.toFixed(4);
        const lng = latlng.lng.toFixed(4);
        document.getElementById('coordinates').textContent = `${lat}° N, ${lng}° E`;
    }
    
    updateZoomLevel() {
        const zoom = this.map.getZoom();
        document.getElementById('zoomLevel').textContent = `Yakınlaştırma: ${zoom}`;
    }
    
    async handleSearchInput(query) {
        const clearBtn = document.getElementById('clearSearch');
        const resultsDiv = document.getElementById('searchResults');
        
        if (query.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
            resultsDiv.classList.add('hidden');
            return;
        }
        
        if (query.length < 3) return;
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
            );
            const data = await response.json();
            
            if (data.length > 0) {
                resultsDiv.innerHTML = data.map(place => `
                    <div class="search-result-item" data-lat="${place.lat}" data-lng="${place.lon}">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${place.display_name}</span>
                    </div>
                `).join('');
                
                resultsDiv.classList.remove('hidden');
                
                // Sonuçlara tıklama
                resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const lat = parseFloat(item.dataset.lat);
                        const lng = parseFloat(item.dataset.lng);
                        this.map.setView([lat, lng], 15);
                        this.addMarker([lat, lng], item.querySelector('span').textContent);
                        resultsDiv.classList.add('hidden');
                        document.getElementById('searchInput').value = '';
                        document.getElementById('clearSearch').classList.add('hidden');
                    });
                });
            } else {
                resultsDiv.innerHTML = '<div class="search-result-item">Sonuç bulunamadı</div>';
                resultsDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Arama hatası:', error);
        }
    }
    
    async searchLocation(query) {
        if (!query) return;
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
            );
            const data = await response.json();
            
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                this.map.setView([lat, lng], 15);
                this.addMarker([lat, lng], data[0].display_name);
                this.showNotification('Konum bulundu!', 'success');
            } else {
                this.showNotification('Konum bulunamadı', 'error');
            }
        } catch (error) {
            this.showNotification('Arama hatası!', 'error');
        }
        
        document.getElementById('searchResults').classList.add('hidden');
        document.getElementById('searchInput').value = '';
        document.getElementById('clearSearch').classList.add('hidden');
    }
    
    addMarker(latlng, popupText = '') {
        // Eski marker'ları temizle
        this.markers.forEach(m => m.remove());
        this.markers = [];
        
        const marker = L.marker(latlng, {
            draggable: true,
            icon: L.divIcon({
                html: '<i class="fas fa-map-pin" style="font-size: 30px; color: #ef4444;"></i>',
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        }).addTo(this.map);
        
        if (popupText) {
            marker.bindPopup(popupText).openPopup();
        }
        
        marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            this.updateCoordinates(pos);
            this.reverseGeocode(pos);
        });
        
        this.markers.push(marker);
        return marker;
    }
    
    async reverseGeocode(latlng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`
            );
            const data = await response.json();
            if (data.display_name && this.markers[0]) {
                this.markers[0].setPopupContent(data.display_name).openPopup();
            }
        } catch (error) {
            console.error('Ters geocoding hatası:', error);
        }
    }
    
    locateUser() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.map.setView([lat, lng], 16);
                    this.addMarker([lat, lng], 'Mevcut Konumunuz');
                    this.showNotification('Konumunuz bulundu!', 'success');
                },
                (error) => {
                    this.showNotification('Konum alınamadı: ' + error.message, 'error');
                },
                { enableHighAccuracy: true }
            );
        } else {
            this.showNotification('Tarayıcınız konum hizmetini desteklemiyor', 'error');
        }
    }
    
    shareLocation() {
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const url = `${window.location.origin}${window.location.pathname}?lat=${center.lat.toFixed(4)}&lng=${center.lng.toFixed(4)}&zoom=${zoom}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.showNotification('Bağlantı kopyalandı!', 'success');
            });
        } else {
            prompt('Paylaşım bağlantısı:', url);
        }
    }
    
    toggleTheme() {
        const body = document.body;
        const icon = document.querySelector('#themeToggle i');
        
        if (this.currentTheme === 'dark') {
            body.classList.add('light-theme');
            icon.className = 'fas fa-sun';
            this.currentTheme = 'light';
        } else {
            body.classList.remove('light-theme');
            icon.className = 'fas fa-moon';
            this.currentTheme = 'dark';
        }
    }
    
    showInfo() {
        alert('🗺️ Xenon Maps v1.0.0\n\n' +
              'Açık kaynaklı, ücretsiz harita uygulaması\n' +
              'OpenStreetMap & Leaflet.js kullanır\n\n' +
              'GitHub: https://github.com/xenon-maps\n' +
              'Lisans: MIT');
    }
    
    showContextMenu(e) {
        const menu = document.getElementById('contextMenu');
        menu.style.left = e.originalEvent.clientX + 'px';
        menu.style.top = e.originalEvent.clientY + 'px';
        menu.classList.remove('hidden');
        
        // Son sağ tık konumunu sakla
        this.contextLatLng = e.latlng;
    }
    
    hideContextMenu() {
        document.getElementById('contextMenu').classList.add('hidden');
    }
    
    handleContextAction(action) {
        const latlng = this.contextLatLng;
        if (!latlng) return;
        
        switch(action) {
            case 'center':
                this.map.setView(latlng, this.map.getZoom());
                break;
            case 'measure':
                this.startMeasurement(latlng);
                break;
            case 'copy-coords':
                navigator.clipboard.writeText(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`)
                    .then(() => this.showNotification('Koordinatlar kopyalandı!', 'success'));
                break;
            case 'whatshere':
                this.addMarker([latlng.lat, latlng.lng]);
                this.reverseGeocode(latlng);
                break;
        }
    }
    
    startMeasurement(latlng) {
        this.measurePoints.push(latlng);
        this.isMeasuring = true;
        
        if (this.measurePoints.length === 1) {
            document.getElementById('measureInfo').classList.remove('hidden');
        }
        
        if (this.measurePoints.length >= 2) {
            this.drawMeasurement();
        }
        
        // Marker ekle
        L.circleMarker(latlng, {
            radius: 5,
            color: '#4facfe',
            fillColor: '#4facfe',
            fillOpacity: 1
        }).addTo(this.map);
    }
    
    drawMeasurement() {
        if (this.measureLine) {
            this.map.removeLayer(this.measureLine);
        }
        
        const latlngs = this.measurePoints.map(p => [p.lat, p.lng]);
        this.measureLine = L.polyline(latlngs, {
            color: '#4facfe',
            weight: 3,
            dashArray: '10, 10'
        }).addTo(this.map);
        
        // Mesafe hesapla
        let totalDistance = 0;
        for (let i = 1; i < this.measurePoints.length; i++) {
            totalDistance += this.measurePoints[i-1].distanceTo(this.measurePoints[i]);
        }
        
        const distanceText = totalDistance < 1000 
            ? `${Math.round(totalDistance)} m`
            : `${(totalDistance / 1000).toFixed(2)} km`;
        
        document.getElementById('measureDistance').textContent = distanceText;
    }
    
    clearMeasurement() {
        this.measurePoints = [];
        this.isMeasuring = false;
        if (this.measureLine) {
            this.map.removeLayer(this.measureLine);
            this.measureLine = null;
        }
        document.getElementById('measureInfo').classList.add('hidden');
        document.getElementById('measureDistance').textContent = '0 km';
        
        // Marker'ları temizle (circle marker'ları da)
        this.map.eachLayer(layer => {
            if (layer instanceof L.CircleMarker) {
                this.map.removeLayer(layer);
            }
        });
    }
    
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.xenonMaps = new XenonMaps();
});
