class OverpassFeatures {
  constructor (view) {
    this.view = view
    this.request = undefined
    this.features = {}
    this.workerModifier = []
  }

  update () {
  }

  addFeature (feature) {
  }

  removeFeature (feature, data) {
  }

  add (featureId, feature) {
    this.features[featureId] = {
      feature,
      data: this.addFeature(feature)
    }
  }

  remove (featureId) {
    if (featureId in this.features) {
      this.removeFeature(this.features[featureId].feature, this.features[featureId].data)
      delete this.features[featureId]
    }
  }

  clear () {
    for (let k in this.features) {
      this.removeFeature(this.features[k].feature, this.features[k].data)
    }

    this.features = {}
  }
}

module.exports = OverpassFeatures
