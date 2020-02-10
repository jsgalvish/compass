/* global AFRAME, THREE, fetch */

const yaml = require('yaml')
const async = {
  each: require('async/each')
}

const Context = require('./Context')
require('./position-limit')

const modules = require('./modules')

let context
let camera
let cameraPos
let worldPos = new THREE.Vector3()
let oldWorldPos
let rotation, oldRotation
let layers = {}
let worker
let countAdd = 0
let addQueue = []

window.onload = function () {
  context = new Context()

  worker = new Worker('dist/vrmap-worker.js')
  worker.onmessage = workerRecv

  // Close intro dialog on clicking its button.
  document.querySelector('#introDialogCloseButton').onclick = event => {
    event.target.parentElement.parentElement.classList.add('hidden')
  }
  // Close intro dialog when entering VR mode.
  document.querySelector('a-scene').addEventListener('enter-vr', event => {
    document.querySelector('#introDialogCloseButton').click()
  })

  // Load location presets and subdialog.
  fetch('config.yml')
    .then((response) => {
      if (response.ok) {
        return response.text()
      } else {
        throw new Error('HTTP Error ' + response.status)
      }
    })
    .then((config) => {
      try {
        context.config = yaml.parse(config)
      } catch (e) {
        alert("Can't load config.yml:\n" + e)
        return
      }

      worker.postMessage({
        fun: 'init',
        config: context.config
      })

      for (let id in modules) {
        if (context.config.modules.includes(id)) {
          let Module = modules[id]
          let layer = new Module(context)

          if (layer.query) {
            worker.postMessage({ fun: 'addLayer', id, query: layer.query, modifier: layer.workerModifier })
          }

          layers[id] = layer
        }
      }

      let locationPresets = context.config.presets
      let presetSel = document.querySelector('#locationPresets')
      let menu = document.querySelector('#menu')
      let locLatInput = document.querySelector('#locLatitude')
      let locLonInput = document.querySelector('#locLongitude')
      presetSel.onchange = function (event) {
        if (event.target.selectedIndex >= 0 && event.target.value >= 0) {
          let preset = locationPresets[event.target.value]
          locLatInput.value = preset.latitude
          locLonInput.value = preset.longitude
        } else {
          locLatInput.value = ''
          locLonInput.value = ''
          if (event.target.value === -2) {
            navigator.geolocation.getCurrentPosition(pos => {
              locLatInput.value = pos.coords.latitude
              locLonInput.value = pos.coords.longitude
            })
          }
        }
      }
      let mItemHeight = 0.1
      let normalBgColor = '#404040'
      let normalTextColor = '#CCCCCC'
      let hoverBgColor = '#606060'
      let hoverTextColor = 'yellow'
      let menuHeight = mItemHeight * locationPresets.length
      menu.setAttribute('height', menuHeight)
      menu.setAttribute('position', { x: 0, y: 1.6 - menuHeight / 6, z: -1 })
      for (let i = -2; i < locationPresets.length; i++) {
        var opt = document.createElement('option')
        opt.value = i
        if (i === -2) { opt.text = 'Get Your Location' } else if (i === -1) { opt.text = 'Set Custom Location' } else { opt.text = locationPresets[i].title }
        presetSel.add(opt, null)
        if (i >= 0) {
        // menu entity
          var menuitem = document.createElement('a-box')
          menuitem.setAttribute('position', { x: 0, y: menuHeight / 2 - (i + 0.5) * mItemHeight, z: 0 })
          menuitem.setAttribute('height', mItemHeight)
          menuitem.setAttribute('depth', 0.001)
          menuitem.setAttribute('text', { value: opt.text, color: normalTextColor, xOffset: 0.03 })
          menuitem.setAttribute('color', normalBgColor)
          menuitem.setAttribute('data-index', i)
          menuitem.addEventListener('mouseenter', event => {
            event.target.setAttribute('text', { color: hoverTextColor })
            event.target.setAttribute('color', hoverBgColor)
          })
          menuitem.addEventListener('mouseleave', event => {
            event.target.setAttribute('text', { color: normalTextColor })
            event.target.setAttribute('color', normalBgColor)
          })
          menuitem.addEventListener('click', event => {
            let preset = locationPresets[event.target.dataset.index]
            loadScene(preset)
          })
          menu.appendChild(menuitem)
        }
      }
      loadScene(locationPresets[0])
      presetSel.value = 0
      locLatInput.value = locationPresets[0].latitude
      locLonInput.value = locationPresets[0].longitude
      document.querySelector('#locationLoadButton').onclick = event => {
        loadScene({ latitude: locLatInput.valueAsNumber, longitude: locLonInput.valueAsNumber })
      }
    })
    .catch((reason) => {
      alert("Can't load config.yml:\n" + reason + "\nDid you copy config.yml-dist to config.yml?")
    })

  // Hook up menu button iside the VR.
  let leftHand = document.querySelector('#left-hand')
  let rightHand = document.querySelector('#right-hand')
  // Vive controllers, Windows Motion controllers
  leftHand.addEventListener('menudown', toggleMenu, false)
  rightHand.addEventListener('menudown', toggleMenu, false)
  // Oculus controllers (guessing on the button)
  leftHand.addEventListener('surfacedown', toggleMenu, false)
  rightHand.addEventListener('surfacedown', toggleMenu, false)
  // Daydream and GearVR controllers - we need to filter as Vive and Windows Motion have the same event.
  var toggleMenuOnStandalone = function (event) {
    if (event.target.components['daydream-controls'].controllerPresent ||
        event.target.components['gearvr-controls'].controllerPresent) {
      toggleMenu(event)
    }
  }
  leftHand.addEventListener('trackpaddown', toggleMenuOnStandalone, false)
  rightHand.addEventListener('trackpaddown', toggleMenuOnStandalone, false)
  // Keyboard press
  document.querySelector('body').addEventListener('keydown', event => {
    if (event.key === 'm') { toggleMenu(event) }
  })

  // Set variables for base objects.
  global.map = document.querySelector('#map')
  global.tiles = document.querySelector('#tiles')
  global.items = document.querySelector('#items')
  camera = document.querySelector('#head')
}

function workerRecv (e) {
  switch (e.data.fun) {
    case 'add':
      if (countAdd >= context.config.maxFeatureAddPerTick) {
        return addQueue.push(e.data)
      } else {
        countAdd++
        return layers[e.data.id].add(e.data.featureId, e.data.feature)
      }
    case 'remove':
      return layers[e.data.id].remove(e.data.featureId)
  }
}

function toggleMenu (event) {
  console.log('menu pressed!')
  let menu = document.querySelector('#menu')
  if (menu.getAttribute('visible') === false) {
    menu.setAttribute('visible', true)
    document.querySelector('#left-hand').setAttribute('mixin', 'handcursor')
    document.querySelector('#right-hand').setAttribute('mixin', 'handcursor')
  } else {
    menu.setAttribute('visible', false)
    document.querySelector('#left-hand').setAttribute('mixin', 'teleport')
    document.querySelector('#right-hand').setAttribute('mixin', 'teleport')
  }
}

function load (callback) {
  async.each(layers,
    (layer, callback) => layer.load(callback),
    callback
  )
}

function loadScene (centerPos) {
  document.querySelector('#cameraRig').object3D.position.set(0, 0, 0)
  context.setCenterPos(centerPos)

  clear()
  cameraListener(true)
}

function clear () {
  for (let k in layers) {
    layers[k].clear()
  }
}

function update () {
  context.cameraPos = cameraPos

  worker.postMessage({
    fun: 'cameraPos',
    cameraPos: context.cameraPos
  })

  for (let k in layers) {
    layers[k].update()
  }
}

AFRAME.registerComponent('camera-listener', {
  tick () {
    cameraListener()
  },

  tock () {
    if (context && context.config) {
      while (countAdd < context.config.maxFeatureAddPerTick && addQueue.length) {
        let data = addQueue.pop()
        layers[data.id].add(data.featureId, data.feature)
        countAdd++
      }

      countAdd = 0
    }
  }
})

function cameraListener (force = false) {
  if (worldPos === undefined || context === undefined || context.config === undefined) {
    return
  }

  worldPos.setFromMatrixPosition(camera.object3D.matrixWorld)

  rotation = camera.getAttribute('rotation')
  const newWorldPos = AFRAME.utils.coordinates.stringify(worldPos)
  const newRotation = AFRAME.utils.coordinates.stringify(rotation)

  if (force || oldWorldPos !== newWorldPos || oldRotation !== newRotation) {
    cameraPos = context.latlonFromWorldpos(worldPos)
    cameraPos.heading = rotation.y % 360
    if (cameraPos.angle < 0) {
      cameraPos.heading += 360
    }

    update()

    oldWorldPos = newWorldPos
    oldRotation = newRotation
  }
}
