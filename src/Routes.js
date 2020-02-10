/* global AFRAME, THREE */
const turf = require('@turf/turf')
const md5 = require('md5')

const OverpassLayer = require('./OverpassLayer')

let routes = []

class Route {
  constructor (feature, context) {
    this.feature = feature
    this.context = context

    this.routeJsonFeature = feature.routeJsonFeature
    this.routeLength = feature.routeLength

    // settings
    this.interval = this.context.config.routeVehicleInterval || 60
    this.speed = this.context.config.routeVehicleSpeed || 0.005
    this.color = this.feature.properties.color || '#' + md5(this.feature.properties.ref).slice(0, 6)

    this.vehicles = []
  }

  addVehicle (pos) {
    let item = document.createElement('a-sphere')
    item.setAttribute('class', 'vehicle')
    item.setAttribute('radius', 1.5)
    item.setAttribute('material', { color: this.color })

    let vehicle = {
      item,
      pos,
      visible: false
    }
    this.vehicles.push(vehicle)
    this.updateVehicle(vehicle)
  }

  updateVehicle (vehicle) {
    let latlon = turf.along(this.routeJsonFeature, vehicle.pos)

    if (this.context.bbox.intersects(latlon)) {
      let coordinates = this.context.convertFromGeoJSON(latlon).geometry.coordinates
      vehicle.item.setAttribute('position', coordinates.x + ' 1 ' + coordinates.z)

      if (!vehicle.visible) {
        global.items.appendChild(vehicle.item)
        vehicle.visible = true
      }
    } else {
      if (vehicle.visible) {
        global.items.removeChild(vehicle.item)
        vehicle.visible = false
      }
    }
  }

  moveVehicles (elapsed) {
    if (this.routeLength === undefined) {
      return
    }

    let minPos = this.routeLength

    this.vehicles.forEach((vehicle, i) => {
      vehicle.pos += elapsed * this.speed

      if (vehicle.pos < minPos) {
        minPos = vehicle.pos
      }

      if (vehicle.pos > this.routeLength) {
        if (vehicle.visible) {
          global.items.removeChild(vehicle.item)
        }

        this.vehicles.splice(i, 1)
        return
      }

      this.updateVehicle(vehicle)
    })

    let distance = this.interval * this.speed
    for (let i = minPos - distance; i >= 0; i -= distance) {
      this.addVehicle(i)
    }
  }

  remove () {
    if (!this.vehicles) {
      console.log('why is vehicles undefined?')
      return
    }

    this.vehicles.forEach(vehicle => {
      if (vehicle.visible) {
        global.items.removeChild(vehicle.item)
      }
    })

    this.vehicles = []
  }
}

module.exports = class Routes extends OverpassLayer {
  constructor (view) {
    super(view)
    window.setInterval(() => this.update(), 20)
    this.query = 'relation[route=tram]'
    this.workerModifier.push('routeWays')
  }

  addFeature (feature) {
    super.addFeature(feature)
    routes[feature.id] = new Route(feature, this.view)
    return routes[feature.id]
  }

  removeFeature (feature, route) {
    super.removeFeature(feature, route)
    route.remove()
    delete routes[feature.id]
  }

  update () {
    let time = new Date().getTime()
    let elapsed = 0
    if (this.lastUpdateTime) {
      elapsed = (time - this.lastUpdateTime) / 1000
    }
    this.lastUpdateTime = time

    for (var k in routes) {
      routes[k].moveVehicles(elapsed)
    }
  }
}

AFRAME.registerGeometry('vehicle', {
  schema: {
    frontPos: { default: 0, min: 0 },
    linestring: {}
  },

  init: function (data) {
    console.log('here', data)
    this.geometry = new THREE.BoxGeometry()
  }
})
