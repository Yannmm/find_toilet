// index.js
const amapFile = require('../../libs/amap-wx.js');

Page({
  data: {
    latitude: 23.099994,
    longitude: 113.324520,
    scale: 14,
    markers: [],
    toilets: [],
    searchRadius: 1000, // 1000 meters
    isListCollapsed: false // Add this to track list state
  },

  onLoad: function () {
    // Initialize AMap
    this.amap = new amapFile.AMapWX({
      key: 'b93e88fa6e3fee3cf918bd14b6c4e485' // Replace with your AMap key
    });

    // Request location permission
    wx.authorize({
      scope: 'scope.userLocation',
      success: () => {
        this.getCurrentLocation();
      },
      fail: () => {
        wx.showModal({
          title: 'Permission Required',
          content: 'Please allow location access to find nearby toilets',
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
  },

  getCurrentLocation: function () {
    wx.showLoading({
      title: 'Getting location...',
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
          title: 'Unable to get location',
          icon: 'none'
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

          const markers = toilets.map(toilet => ({
            id: toilet.id,
            latitude: toilet.latitude,
            longitude: toilet.longitude,
            width: 32,
            height: 32,
            iconPath: '/images/toilet-marker.png',
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
      wx.showModal({
        title: toilet.name,
        content: `Address: ${toilet.address}\nDistance: ${toilet.distance}m`,
        showCancel: false
      });
    }
  },

  onToiletTap: function (e) {
    const toiletId = e.currentTarget.dataset.id;
    const toilet = this.data.toilets.find(t => t.id === toiletId);
    if (toilet) {
      wx.showModal({
        title: toilet.name,
        content: `Address: ${toilet.address}\nDistance: ${toilet.distance}m`,
        showCancel: false
      });
    }
  },

  // Add these new functions
  onRegionChange: function (e) {
    if (e.type === 'begin') {
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
  }
});
