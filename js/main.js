/**
 * This file is the primary javascript for the neighboarhood map app
 */


/**
 * class for our map.  It probably isn't necessary since we only have 1 map
 * but making it a class allows for more easily moving to multiple maps
 */
var TheMap = function(){

    this.Zoom = 10;
    this.mapOptions = {
        zoom: this.Zoom,
        //draggable: false,
        //scrollwheel: false,
        panControl: false,
        zoom: this.Zoom,
        disableDefaultUI: true,
        center: new google.maps.LatLng(35.67, -97.41),
        mapTypeId: google.maps.MapTypeId.ROADMAP
        };

    this.map = new google.maps.Map(document.getElementById('map'), this.mapOptions);

    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
        document.getElementById('searchui'));

};

/**
 * This is the primary knockout view model and data for the app
 * and will be instantiated when applying bindings just to keep the global
 * scope a little cleaner
 */
var viewModel = function(){
    /* scope alias */
    var self = this;
    /* how many items to show in filtered list max? */
    /* sets based on window height to always fit a clean amount (min 1) */
    self.maxListNum = ko.observable(Math.max(1,Math.ceil(($(window).height() -150)/30)));
    //is the list visible right now? 1 = on, 0 = false;
    self.listVisible = ko.observable(1);
    /* which point is the first one on our list page right now?
     * actual page is calculated from this.  Storing point instead
     * of page so that point can remain consistent when list resizes
     */
    self.listPoint = ko.observable(1);
    /* object to hold our map instance */
    self.theMap = new TheMap;
    /* counter for our zIndex so each marker is unique
     * and we know our max expected z for the markers
     */
    self.zNum = 1;
    /* refit map after search filter? */
    self.refitFilterCheck = ko.observable(true);
    /* refit map after window resize? */
    self.refitResizeCheck = ko.observable(true);
    /* search name only? */
    self.searchCategoryCheck = ko.observable(false);
    /* is the list visible? */
    self.listVisible = ko.observable(true);
    /* what is the source path of the collapse icon? */
    self.rollupIconPath = ko.observable('img/collapseIcon.png');
    /* setting max width fixes nonsense autosizing issues with
     * whitespace wrapping in the infowindow constructor
     */
    self.infoMaxWidth = 400;

    /* this is currently unused but will remove a point
     * from our list completely (until refreshed).
     */
    this.removePoint = function(point) {
        self.points.remove(point);
    };

    /**
     * sets our active point, tries to retrieve stored info
     * and fetches it if not.  Then loads up the infowindow
     * this happens when we select a point on map or list
     * @param  {point object} point [point we are selecting]
     */
    this.selectPoint = function(point) {
        /* store the current point so we can still do things to it later */
        var oldPoint = self.currentPoint();
        self.currentPoint(point);
        /*check if we already pulled this point this session, and if so
         *use the string we stored instead of hitting the API again
         */
        var storedContent = sessionStorage.getItem("infoKey" + self.currentPoint().name +
        self.currentPoint().lat() + self.currentPoint().long());

        /* if we have stored data for the point, use it to on the infowindow */
        if (storedContent !== undefined && storedContent !== null){
            self.infowindow.setContent(storedContent);
            self.checkPano(true);
            self.infowindow.open(self.theMap.map, point.marker);
        }
        else {
            /*open a loading message in the infowindow while we grab api data*/
            self.infowindow.setContent('<div id="infoContent" ' +
                'class="scrollFix">loading...</loding>')
            self.infowindow.open(self.theMap.map, point.marker);
            //this will also check pano and open the infowindow
            self.get4Sinfo(point);
        }
        /*increase z of selected point so it shows up on top of others */
        point.marker.setZIndex(point.marker.getZIndex() + 5000);
        /* make sure the new icon updates */
        if (point.hovered() === true){
            point.hovered(false);
            self.mouseHere(point);
        }
        else{
            self.mouseGone(point);
        }
        /* reduce z of old point and make sure old icon also updates */
        if (oldPoint !== null && oldPoint !== undefined) {
            if (oldPoint.hovered() === true){
                oldPoint.hovered(false);
                self.mouseHere(oldPoint);
            }
            else{
                self.mouseGone(oldPoint);
            }
        }
    };

    /**
     * this is used for dynamic CSS class assignment to list items
     * based on status of things like mouse hover and point selection
     * @param  {point object} thisPoint [the point we are checking CSS for]
     * @return {string} [string that describes which CSS class to assign for KO]
     */
    this.getStyle = function(thisPoint){
        if (thisPoint === self.currentPoint()){
            if(thisPoint.hovered() === true) {
                //hovering over selected point
                return 'hoveredCurrentListPoint';
            }
            else {
                //point is selected but not hovered over
                return 'currentListPoint';
            }
        }
        else if (thisPoint.hovered() === true){
            //hovering over non selected point
            return 'hoveredListPoint';
        }

    };

    /**
     * This will be called when the mouse enters a point either on
     * it's marker or list item
     * @param  {point object} point [this is the point now hovered over]
     */
    this.mouseHere = function(point) {
        if (point.hovered() !== true) {
            point.hovered(true);
            //console.log("moo here");
            if (point.marker.getZIndex() <= self.zNum) {
                point.marker.setZIndex(point.marker.getZIndex() + 5000);
            }
            if (self.currentPoint() === point) {
                point.marker.setIcon(point.activeHoverIcon);
            }
            else {
                point.marker.setIcon(point.hoverIcon);
            }
        }
    };

    /**
     * This will be called when the mouse leaves a point either on
     * it's marker or list item
     * @param  {point object} point [this is the point no longer hovered over]
     */
    this.mouseGone = function(point) {
        if (point.hovered() === true) {
            point.hovered(false);
        }
            //console.log("moo left");
            if (point.marker.getZIndex() > self.zNum && point !== self.currentPoint()) {
                point.marker.setZIndex(point.marker.getZIndex() - 5000);
            }
            if (self.currentPoint() === point) {
                point.marker.setIcon(point.activeIcon);
            }
            else {
                point.marker.setIcon(point.defaultIcon);
            }

    };

    /**
     * This is the class for instatiating points.  Points are locations and
     * include both map marker details, resource links, and some
     * current state information such as hoevered over
     * @param  {string} name      [name of this lcoation]
     * @param  {number} lat       [latitude]
     * @param  {number} long      [longitude]
     * @param  {boolean} draggable [should this point's marker be movable?]
     * @param  {string} category  [category such as shopping for the location]
     */
    self.point = function(name, lat, long, draggable, category) {
        /* icon urls for various marker visible states
         * normally these should not be directly in the class, but for now
         * they are to support a planned feature for a different kind of point
         * that is draggable and uses seperate visuals
         */
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
        /* name of this location */
        this.name = name;
        /* lat and long are observables for future use with drag events */
        this.lat = ko.observable(lat);
        this.long = ko.observable(long);
        /* category used for both display and filtering */
        this.category = category;
        /* boolean for if we are currently hovering
         *over this point's list or marker
         */
        this.hovered = ko.observable(false);

        /* the map marker for this point */
        this.marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, long),
            title: name,
            map: self.theMap.map,
            draggable: draggable,
            zIndex: self.zNum
        });

        /* make sure we tick up out zNum for each new point */
        self.zNum++;

        /*the drag and dragend are currently unused but left in as comments for
         *future use with a sightseeing marker that can drag around to get info
         *from any spot on the map

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
            self.selectPoint(this);
        }.bind(this));

        //mouse over event for this point's marker
        google.maps.event.addListener(this.marker, 'mouseover', function() {
            self.mouseHere(this);
        }.bind(this));

        //mouse out event for  this point's marker
        google.maps.event.addListener(this.marker, 'mouseout', function() {
            self.mouseGone(this);
        }.bind(this));
    }



    /* our point list is static.  We could pull this from somewhere fairly simply
     * but this is a map just for Edmond/OKC area and this list is more filler than
     * actual interesting points anyway
     */
    self.points = ko.observableArray([
        new self.point('Hideaway Pizza', 35.546227, -97.61032599999999, false, 'food pizza'),
        new self.point('Joey\'s Pizzeria', 35.466202, -97.52439300000003, false, 'food pizza'),
        new self.point('Hideaway Pizza', 35.476239, -97.514567, false, 'food pizza'),
        new self.point('Hideaway Pizza', 35.539729, -97.52953100000002, false, 'food pizza'),
        new self.point('Hideaway Pizza', 35.649681, -97.47960899999998, false, 'food pizza'),
        new self.point('Cheezies Pizza', 35.652598, -97.45843400000001, false, 'food pizza'),
        new self.point('Jo\'s Famous Pizza', 35.644579, -97.49548900000002, false, 'food pizza'),
        new self.point('Pizza Palace', 35.499864, -97.56591600000002, false, 'food pizza'),
        new self.point('Domino\'s Pizza', 35.610491, -97.58029699999997, false, 'food pizza'),
        new self.point('Little Caesars', 35.63843, -97.55007, false, 'food pizza'),
        new self.point('Papa John\'s Pizza', 35.55818, -97.63761, false, 'food pizza'),
        new self.point('The Wedge Pizzeria', 35.468435, -97.50780299999997, false, 'food pizza'),
        new self.point('CiCi\'s Pizza', 35.558815, -97.640715, false, 'food pizza'),
        new self.point('All American Pizza', 35.560273, -97.639024, false, 'food pizza'),
        new self.point('Hideaway Pizza', 35.608064, -97.62406499999997, false, 'food pizza'),
        new self.point('Papa John\'s Pizza', 35.494303, -97.54961500000002, false, 'food pizza'),
        new self.point('CiCi\'s Pizza', 35.494586, -97.600299, false, 'food pizza'),
        new self.point('The Wedge Pizzeria', 35.519088, -97.53003999999999, false, 'food pizza'),
        new self.point('Whole Foods Market', 35.534006, -97.53061600000001, false, 'shopping food'),
        new self.point('Lake Hefner', 35.5660404, -97.575793, false, 'fun lake'),
        new self.point('Edmond Dog Park', 35.622525, -97.47583600000002, false, 'fun dog park'),
        new self.point('Spring Hill Park', 35.620661, -97.44971399999997, false, 'fun park'),
        new self.point('Redlands Park', 35.614435, -97.54012599999999, false, 'fun park'),
        new self.point('Anderson Park', 35.629342, -97.47549700000002, false, 'fun park'),
        new self.point('Spring Creek Park', 35.624687, -97.399611, false, 'fun park'),
        new self.point('Whispering Heights Park', 35.619093, -97.473637, false, 'fun park'),
        new self.point('Arcadia Conservation Education Area', 35.625045, -97.382722, false, 'fun educational'),
        new self.point('Brasswood Neighborhood Park', 35.621083, -97.53742499999998, false, 'fun park'),
        new self.point('Mitch Park', 35.686246, -97.50091199999997, false, 'fun park'),
        new self.point('Edmond funs & Park', 35.6835, -97.50709999999998, false, 'fun park'),
        new self.point('Chitwood Park', 35.655204, -97.49393199999997, false, 'fun park'),
        new self.point('Martin Nature Park', 35.605616, -97.60735499999998, false, 'fun park/educational'),
        new self.point('Oklahoma City National Memorial & Museum', 35.472973, -97.51702999999998, false, 'fun educational'),
        new self.point('Pied Piper Park', 35.572466, -97.53453999999999, false, 'fun park'),
        new self.point('Kelly Park', 35.639366, -97.49731500000001, false, 'fun park'),
        new self.point('Penn Square Mall', 35.524961, -97.54533000000004, false, 'shopping mall'),
        new self.point('Quail Springs Mall', 35.613212, -97.558404, false, 'shopping mall'),
        new self.point('Burlington Coat Factory', 35.536413, -97.56565, false, 'shopping bigbox'),
        new self.point('JCPenney', 35.612567, -97.56006000000002, false, 'shopping bigbox'),
        new self.point('Dillard\'s', 35.613828, -97.557547, false, 'shopping bigbox'),
        new self.point('T.J.Maxx', 35.621778, -97.48278399999998, false, 'shopping bigbox'),
        new self.point('Kohl\'s', 35.561426, -97.65184799999997, false, 'shopping bigbox'),
        new self.point('Walmart Supercenter', 35.6382, -97.4246, false, 'shopping bigbox'),
        new self.point('Finish Line', 35.612908, -97.557863, false, 'shopping sports'),
        new self.point('Sam\'s Club', 35.559855, -97.65017499999999, false, 'shopping wholesale'),
        new self.point('Savory Spice Shop', 35.515738, -97.529381, false, 'shopping food'),
        new self.point('Macy\'s', 35.613726, -97.559236, false, 'shopping bigbox'),
        new self.point('Hobby Lobby', 35.61244, -97.55268799999999, false, 'shopping crafts'),
        new self.point('Zales', 35.6132, -97.55767600000001, false, 'shopping bigbox'),
        new self.point('Bed Bath & Beyond', 35.650001, -97.45790999999997, false, 'shopping bigbox'),
        new self.point('Gordmans', 35.530682, -97.567904, false, 'shopping bigbox'),
        new self.point('Target Mobile', 35.524269, -97.563876, false, 'shopping bigbox'),
        new self.point('Armstrong Auditorium', 35.729949, -97.45714199999998, false, 'fun music/culture'),
        new self.point('University of Central Oklahoma Jazz Lab', 35.649714, -97.479892, false, 'fun music'),
        new self.point('The Conservatory', 35.561115, -97.53154999999998, false, 'fun music'),
        new self.point('Hafer Park', 35.642291, -97.455715, false, 'fun park'),
        new self.point('Pelican Bay', 35.642946, -97.45958000000002, false, 'fun swimming'),
        new self.point('Edmond Historical Museum', 35.650082, -97.47843699999999, false, 'fun educational'),
        new self.point('Elevation Trampoline fun', 35.616732, -97.503334, false, 'fun active'),
        new self.point('Edmond Convention and Visitors Bureau', 35.643736, -97.459854, false, 'fun educational'),
        new self.point('Pinkitzel Cupcakes & Candy at Spring Creek', 35.638867, -97.46211, false, 'food sweets'),
        new self.point('Pinkitzel Candy & Cupcakes Bricktown', 35.464802, -97.51278500000001, false, 'food sweets'),
        new self.point('Arcadia Lake', 35.6315929, -97.386775, false, 'fun lake'),
        new self.point('AMF', 35.621156, -97.47989000000001, false, 'fun bowling'),
        new self.point('AMF', 35.492154, -97.60268100000002, false, 'fun bowling'),
        new self.point('Heritage Lanes', 35.591863, -97.55061699999999, false, 'fun bowling'),
        new self.point('Float OKC', 35.638265, -97.48769199999998, false, 'fun weird'),
        new self.point('Harkins Theatres Bricktown 16', 35.462998, -97.50917600000002, false, 'fun movies'),
        new self.point('Starplex Northpark 7', 35.591481, -97.56629599999997, false, 'fun movies'),
        new self.point('AMC Quail Springs Mall 24', 35.6121, -97.558943, false, 'fun movies'),
        new self.point('Cinemark Tinseltown', 35.531677, -97.48002400000001, false, 'fun movies'),
        new self.point('Kickingbird Cinema', 35.667995, -97.46384699999999, false, 'fun movies'),
        new self.point('B & B Theatres Windsor 10', 35.494874, -97.605369, false, 'fun movies'),
        new self.point('Carpenter Square Theatre', 35.467567, -97.526071, false, 'fun movies'),
        new self.point('Upstage Theatre & Performing', 35.667356, -97.49505299999998, false, 'fun movies'),
        new self.point('AMC Penn Square 10', 35.525145, -97.54319800000002, false, 'fun movies'),
        new self.point('Dickinson Theaters', 35.525222, -97.543451, false, 'fun movies'),
        new self.point('Starplex Cinemas Northpark 7', 35.591465, -97.56607200000002, false, 'fun movies'),
        new self.point('Movie Exchange', 35.535177, -97.56513100000001, false, 'fun movies'),
        new self.point('Artistic Theater Crafts Inc', 35.46289, -97.457469, false, 'fun movies'),
    ]);

    /* the point we currently have clicked/selected, if any */
    this.currentPoint = ko.observable();

    /* filter from our search box.
     * changing it will recalc shownPoints computed array.
     */
    self.pointFilter = ko.observable('');

    /* calculated array containing just the filtered results from points()*/
    self.shownPoints = ko.computed(function() {
        return ko.utils.arrayFilter(self.points(), function(point) {
            //check either name only or name + category depending on user options
            if (self.searchCategoryCheck() === true){
                return (self.pointFilter() === '*' || point.name.toLowerCase().indexOf(self.pointFilter().toLowerCase()) !== -1);
            }
            else{
                return (self.pointFilter() === '*' || (point.name.toLowerCase().indexOf(self.pointFilter().toLowerCase()) !== -1 ||
                    point.category.toLowerCase().indexOf(self.pointFilter().toLowerCase()) !== -1));
            }
        })
    }, self);

    /* do some stuff if we change our shownPoints computed array */
    self.shownPoints.subscribe(function(changes) {
        /* if we change which points are intended to be shown
         * also go ahead and apply that to the actual visual markers
         */
        self.toggleMarkers();
        /* close our info window if we apply a new filter */
        self.infowindow.close();
    });

    /* computed for what page of the list is the user on currently? */
    self.listPage = ko.computed(function(){
        /* we find the page based on the current point and the max page size */
        return Math.max(1,Math.ceil( self.listPoint()/self.maxListNum()));
    });

    /* just the items that should be visible on the list's
     * current visible page
     */
    self.shownList = ko.computed(function(){
        return self.shownPoints().slice(self.listPoint()-1, self.listPoint()-1 + self.maxListNum())
    });

    /* computed for how many pages we have total based on number of items
     * and the current max size of our list based on window size
     */
    this.totalPages = ko.computed(function(){
        return Math.max(1,Math.ceil( self.shownPoints().length/self.maxListNum() ));
    });

    /* computed for displayed text of current page information
     * returns a string for current page, max page, and total items
     */
    this.pageText = ko.computed(function(){
        return 'Current List Page: <strong>' + self.listPage() + '</strong> of <strong>' +
                self.totalPages() + '</strong> (' + self.shownPoints().length + ' locations)';
    });

    /* computed for the previous page text to show on our list controls
     * while in here, make sure we don't have points we can't get to
     * because of page resize and rounding by resetting listPoint to 1
     * if we are on the first page
     */
    this.prevPageText = ko.computed(function(){
        if (self.listPage() > 1){
            return 'page: ' + (self.listPage() - 1) + ' <' ;
        }
        else {
            self.listPoint(1);
            return self.listPage();
        }
    });

    /* computed for the next page text to show on our list controls */
    this.nextPageText = ko.computed(function(){
        if (self.totalPages() > self.listPage()){
            return '> page: ' + (self.listPage() + 1) ;
        }
        else {
            return self.listPage();
        }
    });


    /* this changes the page.  Input should be 1 or -1 where 1 is the next
     * page in the list and -1 is previous page.  It actually sets the
     * listPoint and not the page, since page is calculated form point.
     * It uses the current max page size to know which one to select for each
     * page change.
     */
    this.changePage = function(direction){
        if(direction === 1 && self.totalPages() > self.listPage()){
            self.listPoint(self.listPoint()+self.maxListNum());
        }
        else if(direction === -1 && self.listPage() > 1){
            self.listPoint(self.listPoint()-self.maxListNum());
        }
    };

    /**
     * shows or hides the list.  Fired by clicks on our rollup icon/div.
     * this is done by setting listVisible which is used in the knockout
     * data binds as a boolean for the visible binding
     */
    this.toggleList = function(){
        if(self.listVisible() === 0){
            self.listVisible(1);
            self.rollupText('collapse list');
            self.rollupIconPath('img/collapseIcon.png');
        }
        else{
            self.listVisible(0);
            self.rollupText('expand list');
            self.rollupIconPath('img/expandIcon.png');
        }

    };

    /**
     * run when shownPoints changes.  applies the visual intent of
     * that computed array to the actual map markers.  Markers are
     * hidden/shown and not actually removed since the list is static right now
     */
    self.toggleMarkers = function(){
        /* loop through all markers and make them hidden and unhovered
         * also ensure they have the right unhovered icon.  This is to
         * avoid hiding a hovered icon in it's hovered state
         */
        for (var i = 0, pointsLen = self.points().length; i < pointsLen; i++) {
            var thisPoint = self.points()[i]
            thisPoint.marker.setVisible(false);
            thisPoint.hovered(false);
            /* set icons */
            if (self.currentPoint() === thisPoint) {
                thisPoint.marker.setIcon(thisPoint.activeIcon);
            }
            else {
                thisPoint.marker.setIcon(thisPoint.defaultIcon);
            }
        };
        /* now show all markers that we actually want shown. */
        /*TODO: check speed comparing arrays vs hiding all + unhiding */
        for (var i = 0, pointsLen = self.shownPoints().length; i < pointsLen; i++) {
            self.shownPoints()[i].marker.setVisible(true);
        };
        /* assuming the user didn't turn it off, refit map to our new set of
         * visible markers
         */
        if(self.refitFilterCheck() === true){self.refitMap();}
    };

    /**
     * fit our map to show all of the currently visible markers at once
     * relies on google to do the actual zooming and panning here
     */
    self.refitMap = function() {
        //set bounds to a fresh viewpoints bounds so we start clean
        var bounds = new google.maps.LatLngBounds();

        //we don't want to try to zoom into a single point or no point
        //so make sure we are showing at least 2 before fitting the map
        var pointsLen = self.shownPoints().length
        if(pointsLen >= 2) {
            for (var i = 0; i < pointsLen; i++) {
                // make the bounds big enough to fit this point
                bounds.extend (self.shownPoints()[i].marker.position);
            };
            // apply the new bounds to the map
            self.theMap.map.fitBounds(bounds);
        }
    };

    /* unused for now but left in for future option to toggle between pano and
     * static streetView image
     */
    this.getStreetViewUrl = function(point){
        return 'https://maps.googleapis.com/maps/api/streetview?' +
        'size=300x300&location=' + point.lat() + ',' + point.long();
    };

    /* this will hold the foursquare specific content in our infowindow */
    self.the4Sstring = '';

    /**
     * gets foursquare JSON data via AJAX based on a point and
     * parses some of it to our the4Sstring holder object.
     * will also call get4Stips() if tips are available for the point
     * @param  {point object} point [the point we want foursquare info for]
     */
    this.get4Sinfo = function(point){
        /* the foursquare api url */
        var url =
        'https://api.foursquare.com/v2/venues/search?client_id=' +
        'NFLHHJ350PG5BFEFQB2AZY2CJ3TUCUYR3Q14QPL5L35JT4WR' +
        '&client_secret=WDNBZ4J3BISX15CF1MYOBHBP2RUSF2YSRLVPZ3F4WZUYZGWR&v=20130815' +
        '&ll=' + point.lat() + ',' + point.long() + '&query=\'' + point.name + '\'&limit=1'

        /* perform the actual jquery request and get json in return
         * then use that to build out an html string that will be used
         * for the infowindow string as a substring
         */
        $.getJSON(url)
            .done(function(response){
                /* object */
                self.the4Sstring = '<p>Foursquare info:<br>';
                var venue = response.response.venues[0]
                /* venue id */
                var venueId = venue.id;

                var venueName = venue.name;
                if (venueName != null){
                    self.the4Sstring = self.the4Sstring + 'name: ' + venueName + '<br>';
                }
                /* phone number */
                var phoneNum = venue.contact.formattedPhone;
                if (phoneNum != null){
                    self.the4Sstring = self.the4Sstring + 'phone: ' + phoneNum + '<br>';
                }
                /* twitter */
                var twitterId = venue.contact.twitter;
                if (twitterId != null){
                    self.the4Sstring = self.the4Sstring + 'twitter name: ' + twitterId + '<br>';
                }
                /* address */
                var address = venue.location.formattedAddress;
                if (address != null){
                    self.the4Sstring = self.the4Sstring + 'address: ' + address + '<br>';
                }
                /* category */
                var category = venue.categories.shortName;
                if (category != null){
                    self.the4Sstring = self.the4Sstring + 'category: ' + category + '<br>';
                }
                /* checkins */
                var checkinCount = venue.stats.checkinsCount;
                if (checkinCount != null){
                    self.the4Sstring = self.the4Sstring + '# of checkins: ' + checkinCount + '<br>';
                }
                /* tips */
                var tipCount = venue.stats.tipCount;
                if (tipCount > 0) {
                    self.get4Stips(venueId, point);
                }
                else{
                    /* only do this if we have no tips.  Otherise let the 
                     * tip function do it
                     */
                    self.the4Sstring = self.the4Sstring + '</p>';
                    /* now that we have info, open the infowindow with it */
                    self.checkPano();
                    self.infowindow.open(self.theMap.map, point.marker);
                }
            })
            .fail(function(){
                self.the4Sstring = "Fouresquare data request failed";
                console.log("Fouresquare failed");
            });

    };

    /**
     * gets foursquare tips JSON data via AJAX based on a point and
     * parses some of it into the the4Sstring holder object.
     * @param  {string} venueId [foursquare specific location id]
     * @param  {point object} point   [the point we are getting info for]
     */
    this.get4Stips = function(venueId, point){
        /* the foursquare tips api url */
        var url ='https://api.foursquare.com/v2/venues/' + venueId +
        '/tips?client_id=NFLHHJ350PG5BFEFQB2AZY2CJ3TUCUYR3Q14QPL5L35JT4WR' +
        '&client_secret=WDNBZ4J3BISX15CF1MYOBHBP2RUSF2YSRLVPZ3F4WZUYZGWR&v=20130815'
        
        /* perform the actual jquery request and get json in return
         * then use that to build out an html string that will be used
         * for the infowindow string as a substring
         */
        $.getJSON(url)
            .done(function(response){
                /* object */
                var tipCount = Math.min(5,response.response.tips.count);
                /* tips */
                self.the4Sstring = self.the4Sstring + '<br>tips: <ul>';
                for(var i=0;i<tipCount;i++){
                    self.the4Sstring = self.the4Sstring + '<li>' +
                        response.response.tips.items[i].text + '</li>';
                };

                self.the4Sstring = self.the4Sstring + '</ul></p>';
                /* now that we have info, open the infowindow with it */
                self.checkPano();
                self.infowindow.open(self.theMap.map, point.marker);
            })
            .fail(function(){
                /* close up the string we started in the get4Sinfo function */
                self.the4Sstring = self.the4Sstring + '</p>';
                console.log("Fouresquare failed");
            });
    };

    /* sets the maps original bounds in case our initial refitMap doesn't work
     * as expected or very quickly for some reason.  This mostly helps if points
     * fail to load for some reason   
     */
    self.defaultBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(35.65, -97.7),
        new google.maps.LatLng(35.5, -97.4));
    /* apply the default bounds */
    self.theMap.map.fitBounds(self.defaultBounds);

    /**
     * build and return the html for our infowindow.
     * stores it in sessionStorage to avoid repeatedly hitting the apis
     * @param  {boolean} includePano [should this include a panorama div?]
     * @return {string} [the complete html string for use in the infowindow]
     */
    self.contentString = function(includePano){
        var retStr = '<div id="infoContent" class="scrollFix">' +
            self.the4Sstring
        /* if there is a nearby panorama, include a div for it */
        if (includePano === true) {
            retStr = retStr +
                '<div id="content" style="width:100%;height:200px;"></div>'
        }
        retStr = retStr + '</div>';
        /* store the built html string for reuse later this session */
        sessionStorage.setItem("infoKey" + self.currentPoint().name +
            self.currentPoint().lat() + self.currentPoint().long(), retStr);
        /* return the built string */
        return retStr;
    };

    /* this is the object that holds our infowindow.  It starts out as a
     * loading message by default and is filled later.
     */
    self.infowindow = new google.maps.InfoWindow({
        content: '<div id="infoContent" class="scrollFix">loading...</loding>',
        /* setting max width fixes nonsense autosizing
         * issues with whitespace wrapping, when combined with some CSS
         */
        maxWidth: self.infoMaxWidth
    });

    /* variable that will hold the panorama object each time one is made */
    self.pano = null;

    /* this holds the object used to check for nearby panoramas */
    self.streetViewService = new google.maps.StreetViewService();

    /**
     * check to see if there is a nearby panorama.
     * should be called with skipContent = true if we have stored info
     * for the point we are workign with in session storage
     * @param  {boolean} skipContent [should we skip building a new string?]
     */
    self.checkPano = function(skipContent) {

        //check if we have a streetview available nearby and use it
        self.streetViewService.getPanoramaByLocation(
            self.currentPoint().marker.position,80,
            function (streetViewPanoramaData, status) {

            if (status === google.maps.StreetViewStatus.OK) {
            /* street view found in the max distance radius */
                if (skipContent !== true) {
                    self.infowindow.setContent(self.contentString(true));
                }
                if (self.pano != null) {
                    self.pano.unbind("position");
                    self.pano.setVisible(false);
                }
                self.pano = new google.maps.StreetViewPanorama(
                    document.getElementById("content"), {

                    navigationControl: true,
                    navigationControlOptions: {
                        style: google.maps.NavigationControlStyle.ANDROID},
                    enableCloseButton: false,
                    addressControl: false,
                    linksControl: false
                });
                self.pano.setPano(streetViewPanoramaData.location.pano);
                self.pano.setVisible(true);
            }
            else {
            /* no street view available in range, or we hit an error */
                if (skipContent !== true) {
                    self.infowindow.setContent(self.contentString(false));
                }
            }
        });
    };

    /**
     * this function cleans up the panorama when infowindow closes
     */
    self.infoWindowClosed = function(){
        if (self.pano !== null && self.pano !== undefined){
            self.pano.unbind("position");
            self.pano.setVisible(false);
            self.pano = null;
        }
    }

    /* event to handle when infowindow is closed via the little x icon */
    google.maps.event.addListener(self.infowindow, 'closeclick', function() {
        self.infoWindowClosed();
    });

    /* event to close infowindow when clicking on the raw map area */
    google.maps.event.addListener(self.theMap.map, "click", function(){
        self.infowindow.close();
        self.infoWindowClosed();
    });

    /* event to rsize the map and list size when the browser window resizes */
    $(window).resize(function () {
        /* change max number of list items to cleanly fit in
         * the new window height
         */
        self.maxListNum(Math.max(1,Math.ceil(($(window).height() -150)/30)));
        /* refit the map when user resizes the window unless option is off */
        if (self.refitResizeCheck()) {
            self.refitMap();
        }
    });

    /* refit map once now that all of the points should be loaded */
    self.refitMap();
};

/**
 * This fires once the dom is loaded, which means all of the javascript and
 * css should also be ready.  It applies the knockout view bindings from
 * the view model, which also puts into place all of the instantiations and
 * logic setup
 */
$(function(){
    ko.applyBindings(new viewModel());
})