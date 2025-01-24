// index.js
Page({
  data: {
    latitude: 23.099994,
    longitude: 113.324520,
    scale: 14,
    markers: [],
    toilets: []
  },

  onLoad: function () {
    // Request location permission first
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
        this.loadToilets();
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

  loadToilets: function () {
    // Here you would typically make an API call to get toilet locations
    // For demonstration, using mock data near the user's location
    const mockToilets = [
      {
        id: 1,
        name: 'Public Toilet A',
        address: '123 Street Name',
        latitude: this.data.latitude + 0.001,
        longitude: this.data.longitude + 0.001,
        distance: 100
      },
      {
        id: 2,
        name: 'Public Toilet B',
        address: '456 Avenue Name',
        latitude: this.data.latitude - 0.001,
        longitude: this.data.longitude - 0.001,
        distance: 200
      }
    ];

    const markers = mockToilets.map(toilet => ({
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
      toilets: mockToilets,
      markers: markers
    });
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
