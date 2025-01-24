// index.js
Page({
  data: {
    latitude: 23.099994,
    longitude: 113.324520,
    scale: 14,
    markers: [],
    toilets: [],
    searchRadius: 1000 // 1000 meters
  },

  onLoad: function () {
    // Initialize cloud
    if (!wx.cloud) {
      console.error('Please use WeChat version that supports cloud development');
      return;
    }
    wx.cloud.init();

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
        this.queryNearbyToilets();
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

  queryNearbyToilets: function () {
    wx.showLoading({
      title: 'Finding toilets...',
    });

    // Get nearby toilets from cloud database
    wx.cloud.database().collection('toilets')
      .where({
        location: wx.cloud.database().command.geoNear({
          geometry: wx.cloud.database().Geo.Point(this.data.longitude, this.data.latitude),
          maxDistance: this.data.searchRadius,
          minDistance: 0
        })
      })
      .get()
      .then(res => {
        const toilets = res.data.map(toilet => {
          // Calculate distance in meters
          const distance = this.calculateDistance(
            this.data.latitude,
            this.data.longitude,
            toilet.location.coordinates[1],
            toilet.location.coordinates[0]
          );

          return {
            id: toilet._id,
            name: toilet.name,
            address: toilet.address,
            latitude: toilet.location.coordinates[1],
            longitude: toilet.location.coordinates[0],
            distance: Math.round(distance)
          };
        });

        // Sort by distance
        toilets.sort((a, b) => a.distance - b.distance);

        const markers = toilets.map(toilet => ({
          id: toilet.id,
          latitude: toilet.latitude,
          longitude: toilet.longitude,
          width: 30,
          height: 30,
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

        wx.hideLoading();
      })
      .catch(err => {
        console.error('Query error:', err);
        wx.hideLoading();
        wx.showToast({
          title: 'Failed to find toilets',
          icon: 'none'
        });
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
  }
});
