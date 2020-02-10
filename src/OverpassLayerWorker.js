const OverpassFrontend = require('overpass-frontend')
const async = {
  each: require('async/each')
}

modifierFunctions = {
  routeWays: require('./routeWays')
}

class OverpassFeatures {
  constructor (id, query, modifier) {
    this.request = undefined
    this.features = {}
    this.id = id
    this.query = query
    this.modifier = modifier
  }

  load (bbox, callback) {
    let found = {}

    if (this.request) {
      this.request.abort()
    }

    if (!this.query) {
      return console.error('You have to set this.query to an Overpass Query')
    }

    this.request = global.overpassFrontend.BBoxQuery(
      this.query,
      bbox,
      {
        properties: OverpassFrontend.GEOM | OverpassFrontend.MEMBERS | OverpassFrontend.TAGS
      },
      (err, feature) => {
        if (err) {
          return console.error(err)
        }

        if (!(feature.id in this.features)) {
          this.features[feature.id] = {
            feature
          }

          let ob = feature.GeoJSON()
          async.each(this.modifier,
            (modifier, callback) => modifierFunctions[modifier](ob, feature, callback),
            (err) => {
              postMessage({ fun: 'add', id: this.id, featureId: feature.id, feature: ob })
            }
          )
        }

        found[feature.id] = true
      },
      (err) => {
        this.request = undefined

        for (let k in this.features) {
          if (!(k in found)) {
            postMessage({ fun: 'remove', id: this.id, featureId: k })
            delete this.features[k]
          }
        }

        callback(err)
      }
    )
  }
}

module.exports = OverpassFeatures
