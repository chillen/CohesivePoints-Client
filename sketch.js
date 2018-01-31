var p5js = new p5(function (sketch) {
  let preloaded = {}
  sketch.preload = function() {
    let data_url = 'https://docs.google.com/spreadsheets/d/10gkt2QggD9qYWtuyZTRJvrzCdersHK0P3LFUHDBnA-A/gviz/tq?gid=0&tqx=out:csv'
    preloaded.pointData = sketch.loadTable(data_url, 'csv', 'header')
  }

  sketch.setup = function () {
    controller.initialize(sketch, preloaded)
  }

  sketch.draw = controller.main
}, 'sketch')
