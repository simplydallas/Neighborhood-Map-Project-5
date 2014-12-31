var point = function(name, lat, long, draggable, category) {

    this.defaultIcon = 'https://mt.googleapis.com/vt/icon/name=icons/' + 
    'spotlight/spotlight-poi.png';
    this.activeHoverIcon = 'https://mt.google.com/vt/icon?psize=20&font=' +
        'fonts/Roboto-Regular.ttf&color=ff330000&name=icons/spotlight/' +
        'spotlight-waypoint-a.png&ax=44&ay=48&scale=1&text=X';
    this.activeIcon = 'http://mt.google.com/vt/icon?psize=30&font=fonts/' +
        'arialuni_t.ttf&color=ff00ff00&name=icons/spotlight/spotlight' +
        '-waypoint-a.png&ax=43&ay=48&text=%E2%80%A2';
    this.hoverIcon = 'https://mt.google.com/vt/icon?color=ff004C13&name=' +
        'icons/spotlight/spotlight-waypoint-blue.png';
    this.name = name;
    this.lat = ko.observable(lat);
    this.long = ko.observable(long);
    this.category = category;
    //boolean for if we are currently hovering over this point's list or marker
    this.hovered = ko.observable(false);
    
    //the map marker for this point
    this.marker = new google.maps.Marker({
        position: new google.maps.LatLng(lat, long),
        title: name,
        map: theMap.map,
        draggable: draggable,
        zIndex: self.zNum
    });

    //make sure we tick up out zNum for each new point
    self.zNum++;

    /*the drag and dragend are currently unused but left in as comments for
    //future use with a sightseeing marker that can drag around to get info
    //from any spot

    //thisupdates positions while dragging
    google.maps.event.addListener(this.marker, 'drag', function() {
        var pos = this.marker.getPosition();
        this.marker.setIcon(this.hoverIcon);
        this.lat(pos.lat());
        this.long(pos.lng());
    }.bind(this));

    //this updates positions only after dragging
    google.maps.event.addListener(this.marker, 'dragend', function() {
        var pos = this.marker.getPosition();
        this.marker.setIcon(this.defaultIcon);
        this.lat(pos.lat());
        this.long(pos.lng());
    }.bind(this));
    */
   
    //this allows for selecting a point by clicking it's marker directly
    google.maps.event.addListener(this.marker, 'click', function() {
        selectPoint(this);
    }.bind(this));

    //mouse over event for this point's marker
    google.maps.event.addListener(this.marker, 'mouseover', function() {
        mouseHere(this);
    }.bind(this));

    //mouse out event for  this point's marker
    google.maps.event.addListener(this.marker, 'mouseout', function() {
        mouseGone(this);
    }.bind(this));
};

//self.points = ko.observableArray(myPoints());
var Points = ko.observableArray([
    new point('Hideaway Pizza', 35.546227, -97.61032599999999, false, 'food pizza'),
    new point('Joey\'s Pizzeria', 35.466202, -97.52439300000003, false, 'food pizza'),
    new point('Hideaway Pizza', 35.476239, -97.514567, false, 'food pizza'),
    new point('Hideaway Pizza', 35.539729, -97.52953100000002, false, 'food pizza'),
    new point('Hideaway Pizza', 35.649681, -97.47960899999998, false, 'food pizza'),
    new point('Cheezies Pizza', 35.652598, -97.45843400000001, false, 'food pizza'),
    new point('Jo\'s Famous Pizza', 35.644579, -97.49548900000002, false, 'food pizza'),
    new point('Pizza Palace', 35.499864, -97.56591600000002, false, 'food pizza'),
    new point('Domino\'s Pizza', 35.610491, -97.58029699999997, false, 'food pizza'),
    new point('Little Caesars', 35.63843, -97.55007, false, 'food pizza'),
    new point('Papa John\'s Pizza', 35.55818, -97.63761, false, 'food pizza'),
    new point('The Wedge Pizzeria', 35.468435, -97.50780299999997, false, 'food pizza'),
    new point('CiCi\'s Pizza', 35.558815, -97.640715, false, 'food pizza'),
    new point('All American Pizza', 35.560273, -97.639024, false, 'food pizza'),
    new point('Hideaway Pizza', 35.608064, -97.62406499999997, false, 'food pizza'),
    new point('Papa John\'s Pizza', 35.494303, -97.54961500000002, false, 'food pizza'),
    new point('CiCi\'s Pizza', 35.494586, -97.600299, false, 'food pizza'),
    new point('The Wedge Pizzeria', 35.519088, -97.53003999999999, false, 'food pizza'),
    new point('Whole Foods Market', 35.534006, -97.53061600000001, false, 'shopping food'),
    new point('Lake Hefner', 35.5660404, -97.575793, false, 'fun lake'),
    new point('Edmond Dog Park', 35.622525, -97.47583600000002, false, 'fun dog park'),
    new point('Spring Hill Park', 35.620661, -97.44971399999997, false, 'fun park'),
    new point('Redlands Park', 35.614435, -97.54012599999999, false, 'fun park'),
    new point('Anderson Park', 35.629342, -97.47549700000002, false, 'fun park'),
    new point('Spring Creek Park', 35.624687, -97.399611, false, 'fun park'),
    new point('Whispering Heights Park', 35.619093, -97.473637, false, 'fun park'),
    new point('Arcadia Conservation Education Area', 35.625045, -97.382722, false, 'fun educational'),
    new point('Brasswood Neighborhood Park', 35.621083, -97.53742499999998, false, 'fun park'),
    new point('Mitch Park', 35.686246, -97.50091199999997, false, 'fun park'),
    new point('Edmond funs & Park', 35.6835, -97.50709999999998, false, 'fun park'),
    new point('Chitwood Park', 35.655204, -97.49393199999997, false, 'fun park'),
    new point('Martin Nature Park', 35.605616, -97.60735499999998, false, 'fun park/educational'),
    new point('Oklahoma City National Memorial & Museum', 35.472973, -97.51702999999998, false, 'fun educational'),
    new point('Pied Piper Park', 35.572466, -97.53453999999999, false, 'fun park'),
    new point('Kelly Park', 35.639366, -97.49731500000001, false, 'fun park'),
    new point('Penn Square Mall', 35.524961, -97.54533000000004, false, 'shopping mall'),
    new point('Quail Springs Mall', 35.613212, -97.558404, false, 'shopping mall'),
    new point('Burlington Coat Factory', 35.536413, -97.56565, false, 'shopping bigbox'),
    new point('JCPenney', 35.612567, -97.56006000000002, false, 'shopping bigbox'),
    new point('Dillard\'s', 35.613828, -97.557547, false, 'shopping bigbox'),
    new point('T.J.Maxx', 35.621778, -97.48278399999998, false, 'shopping bigbox'),
    new point('Kohl\'s', 35.561426, -97.65184799999997, false, 'shopping bigbox'),
    new point('Walmart Supercenter', 35.6382, -97.4246, false, 'shopping bigbox'),
    new point('Finish Line', 35.612908, -97.557863, false, 'shopping sports'),
    new point('Sam\'s Club', 35.559855, -97.65017499999999, false, 'shopping wholesale'),
    new point('Savory Spice Shop', 35.515738, -97.529381, false, 'shopping food'),
    new point('Macy\'s', 35.613726, -97.559236, false, 'shopping bigbox'),
    new point('Hobby Lobby', 35.61244, -97.55268799999999, false, 'shopping crafts'),
    new point('Zales', 35.6132, -97.55767600000001, false, 'shopping bigbox'),
    new point('Bed Bath & Beyond', 35.650001, -97.45790999999997, false, 'shopping bigbox'),
    new point('Gordmans', 35.530682, -97.567904, false, 'shopping bigbox'),
    new point('Target Mobile', 35.524269, -97.563876, false, 'shopping bigbox'),
    new point('Armstrong Auditorium', 35.729949, -97.45714199999998, false, 'fun music/culture'),
    new point('University of Central Oklahoma Jazz Lab', 35.649714, -97.479892, false, 'fun music'),
    new point('The Conservatory', 35.561115, -97.53154999999998, false, 'fun music'),
    new point('Hafer Park', 35.642291, -97.455715, false, 'fun park'),
    new point('Pelican Bay Aquatic Center', 35.642946, -97.45958000000002, false, 'fun swimming'),
    new point('Edmond Historical Museum', 35.650082, -97.47843699999999, false, 'fun educational'),
    new point('Elevation Trampoline fun', 35.616732, -97.503334, false, 'fun active'),
    new point('Edmond Convention and Visitors Bureau', 35.643736, -97.459854, false, 'fun educational'),
    new point('Pinkitzel Cupcakes & Candy at Spring Creek', 35.638867, -97.46211, false, 'food sweets'),
    new point('Pinkitzel Candy & Cupcakes Bricktown', 35.464802, -97.51278500000001, false, 'food sweets'),
    new point('Arcadia Lake', 35.6315929, -97.386775, false, 'fun lake'),
    new point('AMF', 35.621156, -97.47989000000001, false, 'fun bowling'),
    new point('AMF', 35.492154, -97.60268100000002, false, 'fun bowling'),
    new point('Heritage Lanes', 35.591863, -97.55061699999999, false, 'fun bowling'),
    new point('Float OKC', 35.638265, -97.48769199999998, false, 'fun weird'),
    new point('Harkins Theatres Bricktown 16', 35.462998, -97.50917600000002, false, 'fun movies'),
    new point('Starplex Northpark 7', 35.591481, -97.56629599999997, false, 'fun movies'),
    new point('AMC Quail Springs Mall 24', 35.6121, -97.558943, false, 'fun movies'),
    new point('Cinemark Tinseltown', 35.531677, -97.48002400000001, false, 'fun movies'),
    new point('Kickingbird Cinema', 35.667995, -97.46384699999999, false, 'fun movies'),
    new point('B & B Theatres Windsor 10', 35.494874, -97.605369, false, 'fun movies'),
    new point('Carpenter Square Theatre', 35.467567, -97.526071, false, 'fun movies'),
    new point('Upstage Theatre & Performing', 35.667356, -97.49505299999998, false, 'fun movies'),
    new point('AMC Penn Square 10', 35.525145, -97.54319800000002, false, 'fun movies'),
    new point('Dickinson Theaters', 35.525222, -97.543451, false, 'fun movies'),
    new point('Starplex Cinemas Northpark 7', 35.591465, -97.56607200000002, false, 'fun movies'),
    new point('Movie Exchange', 35.535177, -97.56513100000001, false, 'fun movies'),
    new point('Artistic Theater Crafts Inc', 35.46289, -97.457469, false, 'fun movies'),
]);

