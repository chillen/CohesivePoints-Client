var controller = (function (m) {

  var event_types = {
    'MOVE_MAP': handle_move_map,
    'UPDATE_FIELD_LINE': handle_update_field_line,
    'CLEAR_FIELD_LINE': handle_clear_field_line,
    'DISPLAY_POINT': handle_display_point,
    'CREATE_POINT': handle_create_point
  }
  // PUBLIC
  function initialize (sketch, preloaded) {
    m.model = model.initialize(preloaded.pointData)
    m.view = view.initialize(sketch)
    m.sketch = sketch
    m.dom = domHelper
    m.event_queue = new Set()
    m.activeMap = 'biome'
    m.clicks = []
    m.dragging = false
    m.updated = true
    m.fieldLine = false
    m.activeInfoPanes = []
    m.buttonsDown = {'MIDDLE': false, 'LEFT': false, 'RIGHT': false} // list of all buttons pressed
    m.movingMap = false
    setupEvents(sketch)
    window.dispatchEvent(new Event('resize'))
  }

  function update() {
    // let points = m.model.getPoints()
    // let fields = m.model.getFields()
    if (m.movingMap) {
      changeOffset()
      if (!m.dragging) m.movingMap = false
      m.updated = true
    }
  }

  function render() {
    if (m.updated && m.view.isLoaded()) {
      let points = m.model.getPoints()
      let fields = m.model.getFields()
      m.view.drawMap(m.activeMap)
      m.view.drawFields(fields)
      m.view.drawPoints(points)

      if (m.fieldLine) {
        m.view.drawGraph(fields, m.clicks)
        m.view.drawFieldLine(m.clicks)
      } else {
        m.view.drawGraph(fields)
      }

      //m.view.drawConnections(m.model.getConnections())

      let paneData = []
      for (let point of m.activeInfoPanes) {
        let p = {
          name: point.fields[0].tag,
          words: point.fields[0].words,
          pos: {x: point.fields[0].x, y: point.fields[0].y}
        }
        paneData.push(p)
      }
      m.view.drawInfoPanes(paneData)
      m.updated = false
    }
  }

  function main () {
    handleEvents()
    update()
    render()
  }

  function search () {
    let point = m.model.getPoints()[m.model.getPoints().length - 1]
    let fields = m.model.getFields()
    let actualFields = fields.filter(field => field.at(point.x, point.y) > 0.01)
    let request = actualFields.map(field => ({ words: field.get_words(), intensity: field.at(point.x, point.y) }))
    serverWordSearch(request)
      .then(function(list) {
        // m.dom.set('words', list)
        point.addWords(list)
      } )
  }

  function resetOffset () {
    let offset = m.view.getOffset()
    m.view.increaseOffset(-offset.x, -offset.y)
  }

  // PRIVATE

  function serverWordSearch (fields) {
    return window.fetch('/get_from_point',
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({fields: fields})
      })
      .then(res => res.json())
  }

  function handleEvents() {
    s = m.sketch
    event_queue = Array.from(m.event_queue)
    for (let i=0; i < event_queue.length; i++) {
      event = event_queue.pop()
      event()
      m.updated = true
    }
    m.event_queue = new Set()
  }

  function handle_drag() {
    s = m.sketch
    let x = s.mouseX
    let y = s.mouseY

    if (!m.dragging) {
      m.clicks = [{x: x, y: y}]
      m.dragging = true
    }

    m.clicks[1] = {x: x, y: y}
    m.updated=true
  }

  function handle_drag_stop() {
    m.clicks = []

    // This timeout allows us to differentiate dragging from clicks
    setTimeout(function() {m.dragging = false; m.updated=true}, 50)
  }

  function handle_move_map() {
    m.movingMap = true
  }

  function handle_update_field_line() {
    m.fieldLine = true
  }

  function handle_clear_field_line() {
    m.fieldLine = false
  }

  function handle_display_point() {
    let pos = m.view.getOffsetMouseCoords()
    let point = pointAtXY(pos)
    let index = m.activeInfoPanes.indexOf(point)
    if (index == -1) {
      m.activeInfoPanes.push(point)
    }
    else {
      m.activeInfoPanes.splice(index, 1)
    }
  }

  function handle_create_point() {
    let pos = m.view.getOffsetMouseCoords()
    console.log('Creating new point at position: ', pos)
    let url = '/get_from_point'
    let datatype = 'json'
    let fields = m.model.getFields()
    fields = fields.filter(field => field.at(pos.x, pos.y) > 0.01)
    let data = fields.map(field => ({ words: field.get_words(), intensity: field.at(pos.x, pos.y) }))

    m.sketch.httpPost(url, datatype, data, function(response) {
      let colour = [Math.floor(Math.random() * 255) + 1, Math.floor(Math.random() * 255) + 1, Math.floor(Math.random() * 255) + 1, 255]
      let p = m.model.addPoint(pos.x, pos.y, 200, 'Custom', colour, response)
      m.activeInfoPanes.push(p)
      m.updated=true
    })
  }

  function setupEvents (s) {
    s.windowResized = function () {
      clearTimeout(m.resizeTimeout)
      m.resizeTimeout = setTimeout(function () {
        let size = getTargetCanvasSize()
        m.sketch.resizeCanvas(size.width, size.height)
        m.updated = true
      }, 200)
    }

    /*
    Intended interactions:
      * [x] Move the map around
      * [ ] Zoom
      * [ ] Add a point
      * [ ] Check words at a point
      * [x] Draw a field line
    */

    s.mouseDragged = function() {
      middleMouse = s.mouseButton == s.CENTER
      leftMouse = s.mouseButton == s.LEFT
      rightMouse = s.mouseButton == s.RIGHT

      handle_drag()

      if (middleMouse || rightMouse)  {
        m.event_queue.add(event_types.MOVE_MAP)
        m.buttonsDown.MIDDLE = true
        m.buttonsDown.RIGHT = true
      }

      else if (leftMouse) {
        m.event_queue.add(event_types.UPDATE_FIELD_LINE)
        m.buttonsDown.LEFT = true
      }
    }

    s.mouseReleased = function() {
      middleMouse = s.mouseButton == s.CENTER
      leftMouse = s.mouseButton == s.LEFT
      rightMouse = s.mouseButton == s.RIGHT

      handle_drag_stop()

      if (middleMouse && m.buttonsDown.MIDDLE) {
        m.buttonsDown.MIDDLE = false
      }

      if (rightMouse && m.buttonsDown.RIGHT) {
        m.buttonsDown.RIGHT = false
      }

      if (leftMouse && m.buttonsDown.LEFT) {
        m.event_queue.add(event_types.CLEAR_FIELD_LINE)
        m.buttonsDown.LEFT = false
      }
    }

    s.mouseClicked = function () {
      middleMouse = s.mouseButton == s.CENTER
      leftMouse = s.mouseButton == s.LEFT
      rightMouse = s.mouseButton == s.RIGHT

      if (m.dragging) {
        return
      }

      let pos = m.view.getOffsetMouseCoords()
      let hovering = pointAtXY(pos)

      if (leftMouse && hovering)
        m.event_queue.add(event_types.DISPLAY_POINT)
      if (leftMouse && !hovering)
        m.event_queue.add(event_types.CREATE_POINT)
    }
  }

  function changeOffset () {
    if (m.clicks.length == 0) return
    let xchange = m.sketch.mouseX - m.clicks[0].x
    let ychange = m.sketch.mouseY - m.clicks[0].y
    m.view.increaseOffset(xchange, ychange)
  }

  function pointAtXY(pos) {
    // Returns a point if the mouse is over a point, otherwise returns null
    let loc = m.view.getOffsetMouseCoords()
    for (let p of m.model.getPoints()){
      let x = p.x - loc.x
      let y = p.y - loc.y
      let dist = Math.sqrt( x*x + y*y )
      if(dist < m.view.getPointSize()) {
        return p
      }
    }

    return false
  }

  function getTargetCanvasSize () {
    let domSize = m.dom.getSize()
    let H = domSize.height
    let W = domSize.width

    // Just in case of weird timing issues
    H = H > 0 ? H : 1
    W = W > 0 ? W : 1

    return { height: H, width: W }
  }

  return {
    main: main,
    initialize: initialize
  }
})({})
