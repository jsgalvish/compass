class Tiles {
  constructor (view) {
    this.view = view

    this.dom = document.querySelector('#tiles')
    this.features = {}
  }

  initScene () {
  }

  update () {
    let pos = this.view.tileIDFromLatlon(this.view.cameraPos)
    let toHide = {}
    Object.assign(toHide, this.features)

    for (let x = pos.x - this.view.config.tilesFromCenter; x <= pos.x + this.view.config.tilesFromCenter; x++) {
      for (let y = pos.y - this.view.config.tilesFromCenter; y <= pos.y + this.view.config.tilesFromCenter; y++) {
        let id = x + '-' + y
        delete toHide[id]

        if (!(id in this.features)) {
          this.addTile(x - this.view.baseTileID.x, y - this.view.baseTileID.y, id)
        }
      }
    }

    for (var k in toHide) {
      this.removeTile(k)
    }
  }

  addTile (relX, relY, id) {
    return new Promise((resolve, reject) => {
      var tile = document.createElement('a-plane')
      this.features[id] = tile
      tile.setAttribute('class', 'tile')
      tile.setAttribute('data-reltilex', relX)
      tile.setAttribute('data-reltiley', relY)
      tile.setAttribute('rotation', { x: -90, y: 0, z: 0 })
      tile.setAttribute('position', this.view.getPositionFromTilepos({ x: relX, y: relY }, { x: 0.5, y: 0.5 }))
      tile.setAttribute('src', this.view.config.tileServer + this.view.config.tileZoom + '/' + (this.view.baseTileID.x + relX) + '/' + (this.view.baseTileID.y + relY) + '.png')
      tile.setAttribute('width', this.view.baseTileSize)
      tile.setAttribute('height', this.view.baseTileSize)
      this.dom.appendChild(tile)
      resolve()
      // reject("whatever the error");
    })
  }

  removeTile (id) {
    this.dom.removeChild(this.features[id])
    delete this.features[id]
  }

  clear () {
    while (this.dom.firstChild) {
      this.dom.removeChild(this.dom.firstChild)
    }
    this.features = {}
  }
}

module.exports = Tiles
