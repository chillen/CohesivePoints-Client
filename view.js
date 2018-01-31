var view = (function (m) {
  m.maps = []
  m.sketch = null
  m.mapImages = {}
  m.scenes = {}
  m.mapDetails = { hex: { width: 46.5, hMargin: 35, wMargin: 23.25 }, height: 2048, width: 2048 }
  m.mapOffset = {x: 0, y: 0}
  m.graphSize = {width: 400, height: 200}
  m.loaded = false
  m.zoom = 1
  m.pointSize = 20

  // PUBLIC
  function initialize (sketch) {
    m.maps = ['biome']
    m.sketch = sketch
    m.sketch.cursor(sketch.CROSS)
    loadMaps(m.maps)
      .then(maps => (m.mapImages = maps))
      .then(setupScenes)
    return this
  }

  function drawMap (map) {
    if (!m.loaded) return
    m.sketch.image(m.mapImages[map], m.mapOffset.x, m.mapOffset.y)
  }

  function increaseOffset (x, y) {
    let easing = 0.05
    x *= easing
    y *= easing

    let maxPos = {x: m.sketch.width-m.mapDetails.width, y: m.sketch.height-m.mapDetails.height}
    let pos = {x: m.mapOffset.x + x, y: m.mapOffset.y + y}

    if (pos.x < 0 && pos.x > maxPos.x) m.mapOffset.x = pos.x
    else if (pos.x > 0) m.mapOffset.x = 0
    else if (pos.x < maxPos.x) m.mapOffset.x = maxPos.x

    if (pos.y < 0 && pos.y > maxPos.y) m.mapOffset.y = pos.y
    else if (pos.y > 0) m.mapOffset.y = 0
    else if (pos.y < maxPos.y) m.mapOffset.y = maxPos.y
  }

  function drawPoints (points) {
    if (!m.loaded) return
    m.scenes['points'].ellipseMode(m.sketch.CENTER)
    m.scenes['points'].noStroke()
    for (let point of points) {
      m.scenes['points'].fill(point.colour)
      m.scenes['points'].ellipse(point.x, point.y, m.pointSize, m.pointSize)
      
    }
    m.sketch.image(m.scenes['points'], m.mapOffset.x, m.mapOffset.y)
  }

  function drawFields (fields) {
    if (!m.loaded) return
    // Don't load the pixels if it isn't necessary
    let loaded = false
    for (let field of fields) {
      if (field.displayed) {
        continue
      }
      if (!loaded) {
        loaded = true
        m.scenes['fields'].loadPixels()
      }

      let minX = field.x - field.radius
      let maxX = field.x + field.radius
      let minY = field.y - field.radius
      let maxY = field.y + field.radius

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          let pos = x * 4 + y * 4 * m.scenes['fields'].width
          m.scenes['fields'].pixels[pos] += (field.colour[0]) * (field.at(x, y))
          m.scenes['fields'].pixels[pos + 1] += (field.colour[1]) * (field.at(x, y))
          m.scenes['fields'].pixels[pos + 2] += (field.colour[2]) * (field.at(x, y) )
          m.scenes['fields'].pixels[pos + 3] += 255 * (field.at(x, y))
          field.displayed = true
        }
      }
    }
    if (loaded === true) {
      m.scenes['fields'].updatePixels()
    }
    m.sketch.image(m.scenes['fields'], m.mapOffset.x, m.mapOffset.y)
  }

  function drawConnections (connections) {
    if (!m.loaded) return
    for (let connection of connections) {
      textX = (connection.x1 + connection.x2) / 2
      textY = (connection.y1 + connection.y2) / 2 - 10
      // m.scenes['fields'].text(connection.word, textX, textY)
      m.scenes['fields'].stroke(connection.colour)
      m.scenes['fields'].line(connection.x1, connection.y1, connection.x2, connection.y2)
    }
  }

  function drawInfoPanes (panes) {
    if (!m.loaded) return
    m.scenes['interactions'].clear()
    for (let point of panes) {
      drawInfoPane(point.pos, point.name, point.words)
    }
    
    m.sketch.image(m.scenes['interactions'], m.mapOffset.x, m.mapOffset.y)
  }

  function drawGraph (fields, endpoints = []) {
    if (!m.loaded) return

    let datapoints = []
    if (endpoints.length > 1)
      datapoints = pointsBetween(endpoints)

    let opacity = 100
    m.scenes['graph'].clear()
    m.scenes['graph'].background([0, 0, 0, opacity])
    drawGrid(m.scenes['graph'])

    if (datapoints.length > 0) {
      drawGraphData(datapoints, fields)
    }

    m.sketch.image(m.scenes['graph'], m.sketch.width - m.graphSize.width, m.sketch.height - m.graphSize.height)

    function drawGrid (scene) {
      scene.stroke([40, 40, 40, opacity])
      scene.strokeWeight(1)
      for (let i = 0; i < Math.max(scene.height, scene.width); i += 10) {
        scene.line(0, i, scene.width, i)
        scene.line(i, 0, i, scene.height)
      }
    }
  }

  function drawFieldLine (points) {
    if (!m.loaded) return
    if (points.length < 2) return;

    let length = 5
    for (let point of points) {
      m.sketch.strokeWeight(1)
      m.sketch.stroke(0)
      m.sketch.line(point.x - length, point.y, point.x + length, point.y)
      m.sketch.line(point.x, point.y - length, point.x, point.y + length)
    }

    m.sketch.stroke(200, 200, 200)
    m.sketch.line(points[0].x, points[0].y, points[1].x, points[1].y)
  }

  function drawGraphData (points, fields) {
    if (!m.loaded) return
    points = points.map(point => {
      return {
        x: point.x - Math.round(m.mapOffset.x),
        y: point.y - Math.round(m.mapOffset.y)
      }
    })

    for (let field of fields) {
      let fieldPoints = points.map((point, index) => {
        return {
          x: index,
          y: m.sketch.map(field.at(point.x, point.y), 0, 1, m.scenes['graph'].height, 0)
        }
      })

      m.scenes['graph'].stroke(field.colour)
      m.scenes['graph'].strokeWeight(2)
      m.scenes['graph'].noFill()
      m.scenes['graph'].beginShape()
      m.scenes['graph'].curveVertex(fieldPoints[0].x, fieldPoints[0].y)
      for (let point of fieldPoints) {
        m.scenes['graph'].curveVertex(point.x, point.y)
      }
      m.scenes['graph'].curveVertex(fieldPoints[fieldPoints.length - 1].x, fieldPoints[fieldPoints.length - 1].y)
      m.scenes['graph'].endShape()
    }
  }

  function getOffset () {
    return m.mapOffset
  }

  function loadImage (filepath) {
    return new Promise(function (resolve, reject) {
      resolve(m.sketch.loadImage(filepath, resolve))
    })
  }

  function loadMaps (maps) {
    let result = {}
    let prefix = 'data/'
    let suffix = 'Map.png'

    return new Promise(function (resolve, reject) {
      for (let map of maps) {
        loadImage(prefix + map + suffix)
          .then(image => (result[map] = image))
      }
      resolve(result)
    })
  }

  function setupScenes () {
    m.sketch.resizeCanvas(400, 400)
    m.sketch.image(m.mapImages[m.maps[0]], m.mapOffset.x, m.mapOffset.y)
    m.scenes['points'] = m.sketch.createGraphics(m.mapDetails.width, m.mapDetails.height)
    m.scenes['fields'] = m.sketch.createGraphics(m.mapDetails.width, m.mapDetails.height)
    m.scenes['interactions'] = m.sketch.createGraphics(m.mapDetails.width, m.mapDetails.height)
    m.scenes['graph'] = m.sketch.createGraphics(m.graphSize.width, m.graphSize.height)
    m.loaded = true
  }

  function isLoaded() {
    return m.loaded
  }

  function changeZoom(direction) {
    // Expects a positive or negative number to adjust the zoom in increments
    let step = 0.3
    direction = direction / Math.abs(direction) // Convert to + or - 1
    zoom += direction * step
  }

  function pointsBetween (points) {
    function roundPoint (p) {
      return {x: Math.round(p.x), y: Math.round(p.y)}
    }
    function diagDist (points) {
      let dx = points[0].x - points[1].x
      let dy = points[0].y - points[1].y
      return Math.max(Math.abs(dx), Math.abs(dy))
    }
    function lerp (s, e, t) {
      return s + t * (e - s)
    }
    function lerpPoints (points, t) {
      return {x: lerp(points[0].x, points[1].x, t), y: lerp(points[0].y, points[1].y, t)}
    }
    let N = diagDist(points)
    let linePoints = []

    for (var i = 0; i < N; i++) {
      let t = i / N
      linePoints.push(roundPoint(lerpPoints(points, t)))
    }

    return linePoints
  }

  function getOffsetMouseCoords() {
    return { x: Math.round(m.sketch.mouseX - m.mapOffset.x), y: Math.round(m.sketch.mouseY - m.mapOffset.y) }
  }

  function getPointSize() {
    return m.pointSize
  }

  function drawInfoPane(pos, name='', words=[], features=[]) {
    if (!m.loaded) return
    let s = m.scenes['interactions']

    let titleSize = 16
    let fontSize = 11
    s.textSize(titleSize)
    let maxWidth = s.textWidth(`${name}`)
    s.textSize(fontSize)
    for (let word of words) {
      let w = s.textWidth(`${word}`)
      if (w > maxWidth) maxWidth = w
    }
    let margins = {top: 5, left: 5} //margins
    let height = titleSize+3 + words.length*(fontSize+2)+2*margins.top
    let box = {x: pos.x+m.pointSize+margins.left, y: pos.y-m.pointSize, width: maxWidth+margins.left*6, height: height}
    let inner = {x: box.x+margins.left, y: box.y+margins.top}

    s.fill([0,0,0,40])
    s.noStroke()
    s.rect(box.x-margins.left, box.y-margins.top, box.width+margins.left*2, box.height+margins.top*2)

    s.fill([0,0,0,100])
    s.noStroke()
    s.rect(box.x, box.y, box.width, box.height)

    s.fill([0,0,0,100])
    s.noStroke()
    s.rect(box.x, box.y, box.width, box.height)

    s.fill([255,255,255,200])
    s.textStyle(s.BOLD)
    s.textSize(titleSize)
    s.text(`${name}`, inner.x, inner.y, box.width, box.height)
    let i = 0
    s.textSize(fontSize)
    s.textStyle(s.NORMAL)
    for (let word of words) {
      s.text(`${word}`, inner.x+margins.left, inner.y+(fontSize+2)*i+titleSize+4, box.width, box.height)
      i += 1
    }
  }

  return {
    initialize: initialize,
    drawMap: drawMap,
    drawPoints: drawPoints,
    drawFields: drawFields,
    drawGraph: drawGraph,
    drawGraphData: drawGraphData,
    drawFieldLine: drawFieldLine,
    increaseOffset: increaseOffset,
    getOffset: getOffset,
    drawConnections: drawConnections,
    changeZoom: changeZoom,
    getOffsetMouseCoords: getOffsetMouseCoords,
    getPointSize: getPointSize,
    drawInfoPane: drawInfoPane,
    drawInfoPanes: drawInfoPanes,
    isLoaded: isLoaded
  }
})({})
