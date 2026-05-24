// Xenon Maps - Ana Uygulama
class XenonMaps {
    constructor() {
        this.map = null;
        this.markers = [];
        this.measurePoints = [];
        this.measureLine = null;
        this.isMeasuring = false;
        this.currentTheme = 'dark';
        this.contextLatLng = null;
        this.notificationTimeout = null;
        
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeMap());
        } else {
            this.initializeMap();
        }
        
        window.addEventListener('load', () => {
            setTimeout(() => {
                const loader = document.getElementById('xenon-loader');
                const app = document.getElementById('xenon-app');
                
                if (loader) loader.classList.add('hidden');
                if (app) app.classList.remove('hidden');
                
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 1500);
        });
        
        // İnternet bağlantısını dinle
        window.addEventListener('online', () => {
            this.showNotification('🌐 İnternet bağlantısı geri geldi', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('⚠️ İnternet bağlantısı kesildi - Offline mod', 'error');
        });
    }
    
    initializeMap() {
        // URL'den konum al
        const params = new URLSearchParams(window.location.search);
        const lat = parseFloat(params.get('lat')) || XenonMapConfig.defaultCenter[0];
        const lng = parseFloat(params.get('lng')) || XenonMapConfig.defaultCenter[1];
        const zoom = parseInt(params.get('zoom')) || XenonMapConfig.defaultZoom;
        
        // XenonMapConfig kullanarak harita oluştur
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Harita elementi bulunamadı!');
            return;
        }
        
        // createXenonMap fonksiyonunu kullan (map.js'den gelir)
        this.map = createXenonMap('map', {
            defaultCenter: [lat, lng],
            defaultZoom: zoom
        });
        
        if (!this.map) {
            console.error('Harita oluşturulamadı!');
            return;
        }
        
        // Harita olayları
        this.map.on('mousemove', (e) => this.updateCoordinates(e.latlng));
        this.map.on('zoomend', () => this.updateZoomLevel());
        this.map.on('contextmenu', (e) => this.showContextMenu(e));
        this.map.on('click', () => this.hideContextMenu());
        this.map.on('moveend', () => {
            const center = this.map.getCenter();
            this.updateCoordinates(center);
        });
        
        // Event listener'ları kur
        this.setupEventListeners();
        
        // İlk güncelleme
        this.updateCoordinates({ lat, lng });
        this.updateZoomLevel();
        
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
        
        console.log('✅ Xenon Maps başlatıldı!');
        console.log('🌐 Çevrimiçi:', navigator.onLine ? 'Evet' : 'Hayır');
    }
    
    setupEventListeners() {
        // Arama
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const clearSearch = document.getElementById('clearSearch');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchLocation(searchInput.value);
            });
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const input = document.getElementById('searchInput');
                if (input) this.searchLocation(input.value);
            });
        }
        
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                const input = document.getElementById('searchInput');
                if (input) input.value = '';
                clearSearch.classList.add('hidden');
                const results = document.getElementById('searchResults');
                if (results) results.classList.add('hidden');
            });
        }
        
        // Butonlar
        const locateBtn = document.getElementById('locateBtn');
        const shareBtn = document.getElementById('shareBtn');
        const themeToggle = document.getElementById('themeToggle');
        const infoBtn = document.getElementById('infoBtn');
        
        if (locateBtn) locateBtn.addEventListener('click', () => this.locateUser());
        if (shareBtn) shareBtn.addEventListener('click', () => this.shareLocation());
        if (themeToggle) themeToggle.addEventListener('click', () => this.toggleTheme());
        if (infoBtn) infoBtn.addEventListener('click', () => this.showInfo());
        
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
        const clearMeasureBtn = document.getElementById('clearMeasure');
        if (clearMeasureBtn) {
            clearMeasureBtn.addEventListener('click', () => {
                this.clearMeasurement();
            });
        }
    }
    
    updateCoordinates(latlng) {
        if (!latlng) return;
        const coordElement = document.getElementById('coordinates');
        if (coordElement) {
            const lat = latlng.lat.toFixed(4);
            const lng = latlng.lng.toFixed(4);
            coordElement.textContent = `${lat}° N, ${lng}° E`;
        }
    }
    
    updateZoomLevel() {
        if (!this.map) return;
        const zoomElement = document.getElementById('zoomLevel');
        if (zoomElement) {
            const zoom = this.map.getZoom();
            zoomElement.textContent = `Yakınlaştırma: ${zoom}`;
        }
    }
    
    async handleSearchInput(query) {
        const clearBtn = document.getElementById('clearSearch');
        const resultsDiv = document.getElementById('searchResults');
        
        if (!resultsDiv) return;
        
        if (query.length > 0) {
            if (clearBtn) clearBtn.classList.remove('hidden');
        } else {
            if (clearBtn) clearBtn.classList.add('hidden');
            resultsDiv.classList.add('hidden');
            return;
        }
        
        if (query.length < 3) return;
        
        // Offline ise arama yapma
        if (!navigator.onLine) {
            resultsDiv.innerHTML = '<div class="search-result-item">⚠️ Arama için internet bağlantısı gerekli</div>';
            resultsDiv.classList.remove('hidden');
            return;
        }
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=tr`
            );
            
            if (!response.ok) throw new Error('API hatası');
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                resultsDiv.innerHTML = data.map(place => `
                    <div class="search-result-item" data-lat="${place.lat}" data-lng="${place.lon}">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${place.display_name}</span>
                    </div>
                `).join('');
                
                resultsDiv.classList.remove('hidden');
                
                resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const lat = parseFloat(item.dataset.lat);
                        const lng = parseFloat(item.dataset.lng);
                        if (this.map) {
                            this.map.setView([lat, lng], 15);
                            this.addMarker([lat, lng], item.querySelector('span').textContent);
                        }
                        resultsDiv.classList.add('hidden');
                        const input = document.getElementById('searchInput');
                        if (input) input.value = '';
                        if (clearBtn) clearBtn.classList.add('hidden');
                    });
                });
            } else {
                resultsDiv.innerHTML = '<div class="search-result-item">Sonuç bulunamadı</div>';
                resultsDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Arama hatası:', error);
            resultsDiv.innerHTML = '<div class="search-result-item">Arama sırasında hata oluştu</div>';
            resultsDiv.classList.remove('hidden');
        }
    }
    
    async searchLocation(query) {
        if (!query || !this.map) return;
        
        if (!navigator.onLine) {
            this.showNotification('⚠️ Arama için internet bağlantısı gerekli', 'error');
            return;
        }
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=tr`
            );
            
            if (!response.ok) throw new Error('API hatası');
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                this.map.setView([lat, lng], 15);
                this.addMarker([lat, lng], data[0].display_name);
                this.showNotification('✅ Konum bulundu!', 'success');
            } else {
                this.showNotification('❌ Konum bulunamadı', 'error');
            }
        } catch (error) {
            console.error('Arama hatası:', error);
            this.showNotification('❌ Arama hatası!', 'error');
        }
        
        const resultsDiv = document.getElementById('searchResults');
        const input = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearch');
        
        if (resultsDiv) resultsDiv.classList.add('hidden');
        if (input) input.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
    }
    
    addMarker(latlng, popupText = '') {
        if (!this.map) return null;
        
        this.markers.forEach(m => {
            if (this.map) this.map.removeLayer(m);
        });
        this.markers = [];
        
        const marker = L.marker(latlng, {
            draggable: true,
            icon: L.divIcon({
                html: '<i class="fas fa-map-pin" style="font-size: 30px; color: #ef4444; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>',
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
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
        if (!navigator.onLine) return;
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&accept-language=tr`
            );
            
            if (!response.ok) throw new Error('API hatası');
            
            const data = await response.json();
            if (data.display_name && this.markers[0] && this.map) {
                this.markers[0].setPopupContent(data.display_name).openPopup();
            }
        } catch (error) {
            console.error('Ters geocoding hatası:', error);
        }
    }
    
    locateUser() {
        if (!this.map) return;
        
        if ('geolocation' in navigator) {
            this.showNotification('📍 Konum alınıyor...', 'success');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.map.setView([lat, lng], 16);
                    this.addMarker([lat, lng], '📍 Mevcut Konumunuz');
                    this.showNotification('✅ Konumunuz bulundu!', 'success');
                },
                (error) => {
                    let message = 'Konum alınamadı';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'Konum izni reddedildi';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'Konum bilgisi kullanılamıyor';
                            break;
                        case error.TIMEOUT:
                            message = 'Konum isteği zaman aşımına uğradı';
                            break;
                    }
                    this.showNotification('❌ ' + message, 'error');
                },
                { 
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            this.showNotification('❌ Tarayıcınız konum hizmetini desteklemiyor', 'error');
        }
    }
    
    shareLocation() {
        if (!this.map) return;
        
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const url = `${window.location.origin}${window.location.pathname}?lat=${center.lat.toFixed(4)}&lng=${center.lng.toFixed(4)}&zoom=${zoom}`;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                this.showNotification('🔗 Bağlantı kopyalandı!', 'success');
            }).catch(() => {
                prompt('Paylaşım bağlantısı:', url);
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
            if (icon) icon.className = 'fas fa-sun';
            this.currentTheme = 'light';
        } else {
            body.classList.remove('light-theme');
            if (icon) icon.className = 'fas fa-moon';
            this.currentTheme = 'dark';
        }
    }
    
    showInfo() {
        alert('🗺️ Xenon Maps v1.0.0\n\n' +
              'Açık kaynaklı, ücretsiz harita uygulaması\n' +
              'OpenStreetMap & Leaflet.js kullanır\n\n' +
              'Özellikler:\n' +
              '• Offline harita desteği\n' +
              '• Konum arama (online)\n' +
              '• GPS ile konum bulma\n' +
              '• Koyu/Aydınlık tema\n' +
              '• Mesafe ölçme\n' +
              '• Sağ tık menüsü\n\n' +
              'GitHub: https://github.com/xenon-maps\n' +
              'Lisans: MIT');
    }
    
    showContextMenu(e) {
        if (!this.map) return;
        
        const menu = document.getElementById('contextMenu');
        if (!menu) return;
        
        const originalEvent = e.originalEvent;
        
        menu.style.left = originalEvent.clientX + 'px';
        menu.style.top = originalEvent.clientY + 'px';
        menu.classList.remove('hidden');
        
        this.contextLatLng = e.latlng;
    }
    
    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) menu.classList.add('hidden');
    }
    
    handleContextAction(action) {
        const latlng = this.contextLatLng;
        if (!latlng || !this.map) return;
        
        switch(action) {
            case 'center':
                this.map.setView(latlng, this.map.getZoom());
                this.showNotification('🎯 Harita ortalandı', 'success');
                break;
            case 'measure':
                this.startMeasurement(latlng);
                break;
            case 'copy-coords':
                const coordText = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(coordText).then(() => {
                        this.showNotification('📋 Koordinatlar kopyalandı!', 'success');
                    });
                }
                break;
            case 'whatshere':
                this.addMarker([latlng.lat, latlng.lng]);
                this.reverseGeocode(latlng);
                this.showNotification('📍 Konum işaretlendi', 'success');
                break;
        }
    }
    
    startMeasurement(latlng) {
        if (!this.map) return;
        
        this.measurePoints.push(latlng);
        this.isMeasuring = true;
        
        if (this.measurePoints.length === 1) {
            const measureInfo = document.getElementById('measureInfo');
            if (measureInfo) measureInfo.classList.remove('hidden');
        }
        
        if (this.measurePoints.length >= 2) {
            this.drawMeasurement();
        }
        
        L.circleMarker(latlng, {
            radius: 6,
            color: '#4facfe',
            fillColor: '#ffffff',
            fillOpacity: 1,
            weight: 3
        }).addTo(this.map);
        
        if (this.measurePoints.length === 1) {
            this.showNotification('📏 İlk nokta seçildi, ikinci noktayı seçin', 'success');
        }
    }
    
    drawMeasurement() {
        if (!this.map) return;
        
        if (this.measureLine) {
            this.map.removeLayer(this.measureLine);
        }
        
        const latlngs = this.measurePoints.map(p => [p.lat, p.lng]);
        this.measureLine = L.polyline(latlngs, {
            color: '#4facfe',
            weight: 4,
            dashArray: '10, 10',
            opacity: 0.8
        }).addTo(this.map);
        
        let totalDistance = 0;
        for (let i = 1; i < this.measurePoints.length; i++) {
            totalDistance += this.measurePoints[i-1].distanceTo(this.measurePoints[i]);
        }
        
        const distanceText = totalDistance < 1000 
            ? `${Math.round(totalDistance)} m`
            : `${(totalDistance / 1000).toFixed(2)} km`;
        
        const distanceElement = document.getElementById('measureDistance');
        if (distanceElement) distanceElement.textContent = distanceText;
    }
    
    clearMeasurement() {
        if (!this.map) return;
        
        this.measurePoints = [];
        this.isMeasuring = false;
        
        if (this.measureLine) {
            this.map.removeLayer(this.measureLine);
            this.measureLine = null;
        }
        
        const measureInfo = document.getElementById('measureInfo');
        if (measureInfo) measureInfo.classList.add('hidden');
        
        const distanceElement = document.getElementById('measureDistance');
        if (distanceElement) distanceElement.textContent = '0 km';
        
        this.map.eachLayer(layer => {
            if (layer instanceof L.CircleMarker) {
                this.map.removeLayer(layer);
            }
        });
    }
    
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Uygulamayı başlat
const xenonMaps = new XenonMaps();
window.xenonMaps = xenonMaps;
