// index.js
const amapFile = require('../../libs/amap-wx.js');

Page({
  data: {
    latitude: 23.099994,
    longitude: 113.324520,
    scale: 16,
    markers: [],
    toilets: [],
    searchRadius: 1000, // 1000 meters
    isListCollapsed: false, // Changed to true for initial collapsed state
    selectedToiletId: null,  // Add this to track selected toilet
    scrollToView: '',
    isFirstLoad: true, // Add this line
  },

  onLoad: function () {
    // Initialize AMap
    this.amap = new amapFile.AMapWX({
      key: '' // Replace with your AMap key
    });

    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          // 用户未授权定位权限
          // Request location permission
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.getCurrentLocation();
            },
            fail: () => {
              wx.showModal({
                title: '申请获取当前位置权限',
                content: '用于查询附近卫生间',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting({
                      success: (res) => {
                        if (res.authSetting['scope.userLocation']) {
                          this.getCurrentLocation();
                        }
                      }
                    });
                  }
                }
              });
            }
          });
        } else {
          this.getCurrentLocation();
        }
      }
    });
  },

  getCurrentLocation: function () {
    wx.showLoading({
      title: '正在获取当前位置...',
    });

    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 3000,
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude
        });
        this.searchNearbyToilets();
        wx.hideLoading();
      },
      fail: (err) => {
        console.error('Location error:', err);
        wx.hideLoading();
        wx.showToast({
          title: '无法获取当前位置',
          icon: 'error'
        });
      }
    });
  },

  searchNearbyToilets: function () {
    wx.showLoading({
      title: 'Finding toilets...',
    });

    this.amap.getPoiAround({
      query: '公厕|洗手间|toilet',
      querytypes: '200300',
      location: `${this.data.longitude},${this.data.latitude}`,
      radius: this.data.searchRadius,
      success: (data) => {
        if (data && data.poisData) {
          const toilets = data.poisData.map((poi, index) => {
            // Calculate distance
            const distance = this.calculateDistance(
              this.data.latitude,
              this.data.longitude,
              parseFloat(poi.location.split(',')[1]),
              parseFloat(poi.location.split(',')[0])
            );

            return {
              id: index,
              name: poi.name,
              address: poi.address,
              latitude: parseFloat(poi.location.split(',')[1]),
              longitude: parseFloat(poi.location.split(',')[0]),
              distance: Math.round(distance)
            };
          });

          // Sort by distance
          toilets.sort((a, b) => a.distance - b.distance);

          const markers = toilets.map((toilet, index) => ({
            id: toilet.id,
            latitude: toilet.latitude,
            longitude: toilet.longitude,
            width: 32,
            height: 32,
            iconPath: '/images/toilet-marker-active.png',
            iconPathSelected: '/images/toilet-marker.png',
            label: {
              content: `${index + 1}`,
              color: '#1aad19', // Match the color of the list number
              fontSize: 16, // Smaller font size
              fontWeight: 'bold', // Match the font weight of the list number
              borderRadius: 10,
              bgColor: '#fff',
              padding: 5,
              textAlign: 'center'
            },
            callout: {
              content: toilet.name,
              padding: 10,
              borderRadius: 5,
              display: 'BYCLICK'
            }
          }));

          this.setData({
            toilets: toilets,
            markers: markers
          });
        }
        wx.hideLoading();
      },
      fail: (err) => {
        console.error('Search error:', err);
        wx.hideLoading();
        wx.showToast({
          title: 'Failed to find toilets',
          icon: 'none'
        });
      }
    });
  },

  calculateDistance: function (lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  onMarkerTap: function (e) {
    const markerId = e.markerId;
    const toilet = this.data.toilets.find(t => t.id === markerId);
    if (toilet) {
      // Update markers to show selected state
      const markers = this.data.markers.map(marker => ({
        ...marker,
        iconPath: marker.id === markerId ? '/images/toilet-marker.png' : '/images/toilet-marker-active.png'
      }));

      this.setData({
        markers: markers,
        selectedToiletId: markerId,
        isListCollapsed: false,  // Expand list to show selected item
        latitude: toilet.latitude,  // Center map on selected marker
        longitude: toilet.longitude  // Center map on selected marker
      }, () => {
        // Wait for list expansion animation
        setTimeout(() => {
          this.setData({
            scrollToView: `toilet-${markerId}`
          });
        }, 300);
      });
    }
  },

  onToiletTap: function (e) {
    const toiletId = e.currentTarget.dataset.id;
    const toilet = this.data.toilets.find(t => t.id === toiletId);
    if (toilet) {
      // Update markers to show selected state
      const markers = this.data.markers.map(marker => ({
        ...marker,
        iconPath: marker.id === toiletId ? '/images/toilet-marker.png' : '/images/toilet-marker-active.png'
      }));

      this.setData({
        markers: markers,
        selectedToiletId: toiletId,
        latitude: toilet.latitude,  // Center map on selected marker
        longitude: toilet.longitude  // Center map on selected marker
      });

      // 通过 `includePoints` 平滑移动到中心
      // const mapCtx = wx.createMapContext('toiletMap'); // 获取地图上下文
      // mapCtx.moveToLocation({
      //   latitude: toilet.latitude,
      //   longitude: toilet.longitude,
      //   duration: 5000  // 移动的动画时长，单位毫秒
      // });
    }
  },

  // Add these new functions
  onRegionChange: function (e) {

    if (e.type === 'begin' && e.detail?.causedBy === 'gesture') {
      // User starts panning the map
      this.setData({
        isListCollapsed: true
      });
    }
  },

  onTapExpandList: function () {
    this.setData({
      isListCollapsed: false
    });
  },

  // Add this new function
  onNavigateTap: function (e) {
    const toilet = e.currentTarget.dataset.toilet;
    wx.openLocation({
      latitude: toilet.latitude,
      longitude: toilet.longitude,
      name: toilet.name,
      address: toilet.address,
      scale: 18
    });
  }
});
