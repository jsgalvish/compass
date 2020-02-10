const BoundingBox = require('boundingbox')

class Context {
  constructor () {
    this.bbox = new BoundingBox()
    this.centerOffset = null
  }

  setCenterPos (centerPos) {
    this.centerPos = centerPos
    this.baseTileID = this.tileIDFromLatlon(this.centerPos)
    this.baseTileSize = this.tilesizeFromID(this.baseTileID)
  }

  tileIDFromLatlon (latlon) {
    /* Get tile x/y numbers from degree-based latitude/longitude values */
    var n = Math.pow(2, this.config.tileZoom)
    var latRad = latlon.latitude / 180 * Math.PI
    var xtile = Math.floor(n * ((latlon.longitude + 180) / 360))
    var ytile = Math.floor(n * (1 - (Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2)
    return { x: xtile, y: ytile }
  }

  tileposFromLatlon (latlon) {
    /* Get position x/z numbers from degree-based latitude/longitude values */
    var n = Math.pow(2, this.config.tileZoom)
    var latRad = latlon.latitude / 180 * Math.PI
    var xtilepos = n * ((latlon.longitude + 180) / 360)
    var ytilepos = n * (1 - (Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2
    return { x: xtilepos - this.baseTileID.x,
      y: ytilepos - this.baseTileID.y }
  }

  worldposFromLatlon (latlon) {
    if (!this.centerOffset) {
      this.centerOffset = this.tileposFromLatlon(this.centerPos)
    }
    /* Get position x/z numbers from degree-based latitude/longitude values */
    var n = Math.pow(2, this.config.tileZoom)
    var latRad = latlon.latitude / 180 * Math.PI
    var xtilepos = n * ((latlon.longitude + 180) / 360)
    var ytilepos = n * (1 - (Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2

    return {
      x: this.baseTileSize * (xtilepos - this.baseTileID.x - this.centerOffset.x),
      y: 0,
      z: this.baseTileSize * (ytilepos - this.baseTileID.y - this.centerOffset.y)
    }
  }

  latlonFromWorldpos (pos) {
    if (!this.centerOffset) {
      this.centerOffset = this.tileposFromLatlon(this.centerPos)
    }

    var xtilepos = pos.x / this.baseTileSize + this.baseTileID.x + this.centerOffset.x
    var ytilepos = pos.z / this.baseTileSize + this.baseTileID.y + this.centerOffset.y

    var n = Math.pow(2, this.config.tileZoom)

    var latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * ytilepos / n)))

    return {
      longitude: xtilepos / n * 360 - 180,
      latitude: latRad * 180 / Math.PI
    }
  }

  getRelativePositionFromWorldpos (worldpos, reference) {
    return {
      x: worldpos.x - reference.x,
      y: 0,
      z: worldpos.z - reference.z
    }
  }

  convertFromGeoJSON (feature) {
    let result = {}
    for (var k in feature) {
      result[k] = feature[k]
    }

    if (feature.geometry) {
      switch (feature.geometry.type) {
        case 'Point':
          result.geometry = {
            type: feature.geometry.type,
            coordinates: this.worldposFromLatlon({
              longitude: feature.geometry.coordinates[0],
              latitude: feature.geometry.coordinates[1]
            })
          }
          break
        case 'LineString':
          result.geometry = {
            type: feature.geometry.type,
            coordinates: feature.geometry.coordinates.map(
              pos => this.worldposFromLatlon({
                longitude: pos[0],
                latitude: pos[1]
              })
            )
          }
          break
        case 'Polygon':
          result.geometry = {
            type: feature.geometry.type,
            coordinates: feature.geometry.coordinates.map(
              coord => coord.map(
                pos => this.worldposFromLatlon({
                  longitude: pos[0],
                  latitude: pos[1]
                })
              )
            )
          }
          break
        case 'MultiPolygon':
          result.geometry = {
            type: feature.geometry.type,
            coordinates: feature.geometry.coordinates.map(
              poly => poly.map(
                coord => coord.map(
                  pos => this.worldposFromLatlon({
                    longitude: pos[0],
                    latitude: pos[1]
                  })
                )
              )
            )
          }
          break
        case 'GeometryCollection':
          result.geometries = {
            type: feature.geometry.type,
            geometry: feature.geometry.geometries.map(
              geom => this.convertFromGeoJSON({
                type: 'Feature',
                geometry: geom
              }).geometry
            )
          }
          break
        default:
          console.log("Can't convert " + feature.geometry.type)
      }
    }

    return result
  }

  tilesizeFromID (tileid) {
    /* Get a tile size in meters from x/y tile numbers */
    /* tileid is an object with x and y members telling the slippy map tile ID */
    var equatorSize = 40075016.686 // in meters
    var n = Math.pow(2, this.config.tileZoom)
    var latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileid.y / n)))
    var tileSize = equatorSize * Math.cos(latRad) / n
    return tileSize
  }

  getPositionFromTilepos (tilepos, offset) {
    if (!offset) {
      offset = { x: 0, y: 0 }
    }
    if (!this.centerOffset) {
      this.centerOffset = this.tileposFromLatlon(this.centerPos)
    }
    return {
      x: this.baseTileSize * (tilepos.x + offset.x - this.centerOffset.x),
      y: 0,
      z: this.baseTileSize * (tilepos.y + offset.y - this.centerOffset.y)
    }
  }
}

module.exports = Context
