



    /////////////////
   //             //
  //   Globals   //
 //             //
/////////////////


//  Easy tweaks via DAT GUI
//  or through the console!

var 
sunRotationPerFrame     = 0.0023,
earthRotationPerFrame   = 0.001,
flightSpriteSize        = 0.05,
flightsPathLinesOpacity = 0.05


//  Three.js basics.

var
camera,
scene,
renderer,
controls,
stats


//  Main stage dressing.

var
system,
earth,
sun


//  Flight data.

var 
flightsTotal = flights.length,
flightsPathSplines = [],
flightsPointCloudGeometry,
flightsPointCloud,
flightPositions,
flightSpriteSizes,
flightsPathLines,
flightsStartTimes = [],
flightsEndTimes   = []








    //////////////
   //          //
  //   Boot   //
 //          //
//////////////


document.addEventListener( 'DOMContentLoaded', function(){

	if( !Detector.webgl ) Detector.addGetWebGLMessage( document.body )
	else {

		setupThree()
		setupSystem()
		setupSun()
		setupEarth()
		setupFlightsPathSplines()
		setupFlightsPathLines()
		setupFlightsPointCloud()
		setupGUI()

		//flights = null
		system.rotation.z += 23.4 * Math.PI / 180
		animate()
	}
})




    ///////////////
   //           //
  //   Three   //
 //           //
///////////////


function setupThree(){

	var
	container = document.getElementById( 'three' ),
	angle     = 30,
	width     = container.offsetWidth  || window.innerWidth,
	height    = container.offsetHeight || window.innerHeight,
	aspect    = width / height,
	near      = 0.01,
	far       = 100
	

	//  Fire up the WebGL renderer.

	renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setClearColor( 0x000000, 1.0 )
	renderer.setSize( width, height )
	renderer.shadowMapEnabled = true
	renderer.shadowMapType = THREE.PCFSoftShadowMap
	container.appendChild( renderer.domElement )
	window.addEventListener( 'resize', onThreeResize, false )


	//  Create and place the camera.

	camera = new THREE.PerspectiveCamera( angle, aspect, near, far )
	camera.position.z = 5


	//  Add trackball controls for panning (click/touch and drag)
	//  and zooming (mouse wheel or gestures.)

	controls = new THREE.TrackballControls( camera, renderer.domElement )
	controls.dynamicDampingFactor = 0.2
	controls.addEventListener( 'change', render )


	//  Create the scene tree to attach objects to.

	scene = new THREE.Scene()


	//  Finally, add a performance monitoring bug
	//  (“bug” in the video sense, not the programming sense!)
	//  so we can see how speedy (or sluggish) our render is.

	stats = new Stats()
	stats.breakLine = function(){

		[ 'fpsText', 'msText' ].forEach( function( id ){

			var element = stats.domElement.querySelector( '#'+ id )

			element.innerHTML = element.textContent.replace( /\(/, '<br>(' )
		})
	}
	document.body.appendChild( stats.domElement )
}
function onThreeResize() {

	var
	container = document.getElementById( 'three' ),
	width     = container.offsetWidth  || window.innerWidth,
	height    = container.offsetHeight || window.innerHeight

	camera.aspect = width / height
	camera.updateProjectionMatrix()
	renderer.setSize( width, height )
	controls.handleResize()
	render()
}




    ////////////////
   //            //
  //   System   //
 //            //
////////////////


function setupSystem(){

	system = new THREE.Object3D()
	system.name = 'system'
	scene.add( system )
}
function setupSun(){

	scene.add( new THREE.AmbientLight( 0x111111 ))

	sun = new THREE.DirectionalLight( 0xFFFFFF, 0.3 )
	sun.name = 'sun'
	sun.position.set( -4, 0, 0 )
	sun.castShadow         = true
	sun.shadowCameraNear   =  1
	sun.shadowCameraFar    =  5
	sun.shadowCameraFov    = 30
	sun.shadowCameraLeft   = -1
	sun.shadowCameraRight  =  1
	sun.shadowCameraTop    =  1
	sun.shadowCameraBottom = -1
	sun.revolutionAngle    = -Math.PI / 4
	system.add( sun )
}
function setupEarth( radius ){
	
	earth = new THREE.Mesh( 

		new THREE.SphereGeometry( radius || 1, 64, 32 ),
		new THREE.MeshPhongMaterial({

			map         : THREE.ImageUtils.loadTexture( 'media/earth.png'  ),
			bumpMap     : THREE.ImageUtils.loadTexture( 'media/earth-bump.jpg' ),
			bumpScale   : 0.02,
			specularMap : THREE.ImageUtils.loadTexture( 'media/earth-specular.png' ),
			specular    : new THREE.Color( 0xFFFFFF ),
			shininess   : 4
		})
	)
	earth.name = 'earth'
	earth.castShadow = true
	earth.receiveShadow = false
	system.add( earth )
}




    /////////////////
   //             //
  //   Flights   //
 //             //
/////////////////


function setFlightTimes( index ){
	
	if( index >= flightsTotal ) console.log('!!!!!!!!!!', index )

	var 
	flight    = flights[ index ]
	distance  = latlongDistance( flight[ 0 ], flight[ 1 ], flight[ 2 ], flight[ 3 ]),
	startTime = Date.now() + Math.floor( Math.random() * 1000 * 20 ),
	duration  = Math.floor( distance * 1000 * 80 )
	

	//  Just a little bit of variation in there.

	duration *= 0.8 + Math.random()
	flightsStartTimes[ index ] = startTime
	flightsEndTimes[   index ] = startTime + duration
}




//  Here we’re going to compute the skeletons of our flight paths.
//  We can then extrapolate more detailed flight path geometry later.

function setupFlightsPathSplines( radius ){
	
	var f,
	originLatitude,
	originLongitude,
	destinationLatitude,
	destinationLongitude,
	distance, altitudeMax,
	pointsTotal, points, pointLL, pointXYZ, p,
	arcAngle, arcRadius,
	spline

	if( radius === undefined ) radius = 1
	for( f = 0; f < flightsTotal; f ++ ){

		originLatitude       = flights[ f ][ 0 ]
		originLongitude      = flights[ f ][ 1 ]
		destinationLatitude  = flights[ f ][ 2 ]
		destinationLongitude = flights[ f ][ 3 ]


		//  Let’s make local flights fly lower altitudes
		//  and long haul flights fly higher altitudes.
		//  You dig man? You get it? You see what I mean?

		distance = Math.sqrt( 

			Math.pow( destinationLatitude  - originLatitude,  2 ) + 
			Math.pow( destinationLongitude - originLongitude, 2 )
		)
		altitudeMax = 0.02 + distance * 0.001


		//  Aight yall. 
		//  We’re about to plot the path of this flight
		//  using X number of points
		//  to generate a smooth-ish curve.

		pointsTotal = 8
		points = []
		for( p = 0; p < pointsTotal + 1; p ++ ){


			//  Is our path shooting straight up? 0 degrees.
			//  Is our path shooting straight down? 180 degrees.
			//  But likely we’re somewhere in between.

			arcAngle  = p * 180 / pointsTotal


			//  The base ‘radius‘ here is intended to be Earth’s radius.
			//  Then we build a sine curve on top of that
			//  with its max amplitude being ‘altitudeMax’.

			arcRadius = radius + ( Math.sin( arcAngle * Math.PI / 180 )) * altitudeMax


			//  So at this point in the flight (p)
			//  where are we between origin and destination?

			pointLL = latlongTween( 

				originLatitude, 
				originLongitude, 
				destinationLatitude, 
				destinationLongitude, 
				p / pointsTotal
			)


			//  Ok. Now we know where (in latitude / longitude)
			//  our flight is supposed to be at point ‘p’
			//  and we know what its altitude should be as well.
			//  Time to convert that into an actual XYZ location
			//  that will sit above our 3D globe.

			pointXYZ = ll2xyz( pointLL.latitude, pointLL.longitude, arcRadius )
			points.push( new THREE.Vector3( pointXYZ.x, pointXYZ.y, pointXYZ.z ))
		}


		//  Pack up this SplineCurve
		//  then push it into our global splines array.
		//  Also set the flight time.

		spline = new THREE.SplineCurve3( points )
		flightsPathSplines.push( spline )
		setFlightTimes( f )
	}
}




function setupFlightsPointCloud(){


	//  Ah, the locals.
	
	var
	f,
	flightsColors = new Float32Array( flightsTotal * 3 ),
	color = new THREE.Color(),
	material


	//  Globals. Yup.

	flightsPointCloudGeometry = new THREE.BufferGeometry()	
	flightPositions = new Float32Array( flightsTotal * 3 )
	flightSpriteSizes = new Float32Array( flightsTotal )


	//  For each flight we’ll need to add a Point
	//  to our global Point Cloud.
	//  Each point as an XYZ position and RGB color
	//  and an image sprite size.

	for( f = 0; f < flightsTotal; f ++ ){

		flightPositions[ 3 * f + 0 ] = 0//  X
		flightPositions[ 3 * f + 1 ] = 0//  Y
		flightPositions[ 3 * f + 2 ] = 0//  Z


		//  We’re going to based our flight’s Hue
		//  on its origin longitude.
		//  This way we can easy spot foreign flights
		//  against a background of local flights.

		color.setHSL( 

			(( flights[ f ][ 1 ] + 100 ) % 360 ) / 360,
			1.0,
			0.55
		)
		flightsColors[ 3 * f + 0 ] = color.r//  Red
		flightsColors[ 3 * f + 1 ] = color.g//  Green
		flightsColors[ 3 * f + 2 ] = color.b//  Blue

		flightSpriteSizes[ f ] = flightSpriteSize//@@  IN THE FUTURE SCALE BY NUMBER OF PASSENGERS ;)
	}
	flightsPointCloudGeometry.addAttribute( 'position',    new THREE.BufferAttribute( flightPositions, 3 ))
	flightsPointCloudGeometry.addAttribute( 'customColor', new THREE.BufferAttribute( flightsColors, 3 ))
	flightsPointCloudGeometry.addAttribute( 'size',        new THREE.BufferAttribute( flightSpriteSizes, 1 ))
	flightsPointCloudGeometry.computeBoundingBox()


	//  Now that we have the basic position and color data
	//  it’s time to finesse it with our shaders.

	material = new THREE.ShaderMaterial({

		uniforms: {
	
			color:   { type: 'c', value: new THREE.Color( 0xFFFFFF )},
			texture: { type: 't', value: THREE.ImageUtils.loadTexture( 'media/point.png' )}
		},
		attributes: {
	
			size:        { type: 'f', value: null },
			customColor: { type: 'c', value: null }
		},
		vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
		blending:       THREE.AdditiveBlending,
		depthTest:      true,
		depthWrite:     false,
		transparent:    true
	})


	//  Finally, let’s pack this into our global variable
	//  so we can play with it later,
	//  and add it to the scene.

	flightsPointCloud = new THREE.PointCloud( flightsPointCloudGeometry, material )
	earth.add( flightsPointCloud )
}




//  We’re going to draw arcs along the flight splines
//  to show entire flight paths at a glance.
//  These lines are 2D, in that they do not scale
//  according to zoom level.
//  This is kind of beautiful because as you zoom out
//  they become more visually prevalent -- like seeing 
//  the sum of the parts rather than the individual bits.
//  The opposite is true when you zoom in.

function setupFlightsPathLines() {

	var 
	geometry = new THREE.BufferGeometry(),
	material = new THREE.LineBasicMaterial({
		
		color:        0xFFFFFF,
		vertexColors: THREE.VertexColors,
		transparent:  true,
		opacity:      flightsPathLinesOpacity,
		depthTest:    true,
		depthWrite:   false,
		linewidth:    1//0.5
	}),
	segmentsTotal = 32,
	segments = new Float32Array( flightsTotal * 3 * 2 * segmentsTotal ),
	segmentBeginsAt,
	segmentEndsAt,
	colors = new Float32Array( flightsTotal * 3 * 2 * segmentsTotal ),
	color  = new THREE.Color(),
	f, s, index,
	beginsAtNormal,
	endsAtNormal


	for( f = 0; f < flightsTotal; f ++ ){

		for( s = 0; s < segmentsTotal - 1; s ++ ){

			index          = ( f * segmentsTotal + s ) * 6
			beginsAtNormal = s / ( segmentsTotal - 1 )
			endsAtNormal   = ( s + 1 ) / ( segmentsTotal - 1 )


			//  Begin this line segment.

			segmentBeginsAt = flightsPathSplines[ f ].getPoint( beginsAtNormal )
			segments[ index + 0 ] = segmentBeginsAt.x
			segments[ index + 1 ] = segmentBeginsAt.y
			segments[ index + 2 ] = segmentBeginsAt.z
			color.setHSL( 

				(( flights[ f ][ 1 ] + 100 ) % 360 ) / 360,
				1,
				0.3 + beginsAtNormal * 0.2
			)
			colors[ index + 0 ] = color.r
			colors[ index + 1 ] = color.g
			colors[ index + 2 ] = color.b


			//  End this line segment.

			segmentEndsAt = flightsPathSplines[ f ].getPoint( endsAtNormal )
			segments[ index + 3 ] = segmentEndsAt.x
			segments[ index + 4 ] = segmentEndsAt.y
			segments[ index + 5 ] = segmentEndsAt.z
			color.setHSL( 

				(( flights[ f ][ 1 ] + 100 ) % 360 ) / 360,
				1,
				0.3 + endsAtNormal * 0.2
			)
			colors[ index + 3 ] = color.r
			colors[ index + 4 ] = color.g
			colors[ index + 5 ] = color.b
		}
	}
	geometry.addAttribute( 'position', new THREE.BufferAttribute( segments, 3 ))
	geometry.addAttribute( 'color',    new THREE.BufferAttribute( colors,   3 ))
	geometry.computeBoundingSphere()
	geometry.dynamic = true//@@  NEEDED?


	//  Finally, let’s pack this into our global variable
	//  so we can play with it later,
	//  and add it to the scene.

	flightsPathLines = new THREE.Line( geometry, material, THREE.LinePieces )
	flightsPathLines.dynamic = true//@@  IS THIS STILL NEEDED?
	earth.add( flightsPathLines )
}




function updateFlights(){
	
	var f, 
	easedValue, point, 
	segmentsTotal = 32,
	s, index,
	//segments = flightsPathLines.geometry.attributes.position, 
	segmentBeginsAt, 
	segmentEndsAt


	for( f = 0; f < flightsTotal; f ++ ){

		if( Date.now() > flightsStartTimes[ f ] ){
			
			easedValue = easeOutQuadratic(

				Date.now() - flightsStartTimes[ f ],
				0, 
				1, 
				flightsEndTimes[ f ] - flightsStartTimes[ f ]
			)
			if( easedValue < 0 ){
				
				easedValue = 0
				setFlightTimes( f )
			}


			//  Update the Point Cloud.
			//  Lots of cute little airplanes...

			point = flightsPathSplines[ f ].getPoint( easedValue )
			flightPositions[ f * 3 + 0 ] = point.x
			flightPositions[ f * 3 + 1 ] = point.y
			flightPositions[ f * 3 + 2 ] = point.z


			//  Update the flight path trails.
			/*
			for( s = 0; s < segmentsTotal - 1; s ++ ){

				index = ( f * segmentsTotal + s ) * 6


				//  Begin line segment.

				segmentBeginsAt = flightsPathSplines[ f ].getPoint(
				
					( s / ( segmentsTotal - 1 )) * easedValue
				)
				flightsPathLines.geometry.attributes.position[ index + 0 ] = 0//segmentBeginsAt.x
				flightsPathLines.geometry.attributes.position[ index + 1 ] = 0//segmentBeginsAt.y
				flightsPathLines.geometry.attributes.position[ index + 2 ] = 0//segmentBeginsAt.z


				//  End line segment.

				segmentEndsAt = flightsPathSplines[ f ].getPoint(

					(( s + 1 ) / ( segmentsTotal - 1 )) * easedValue
				)
				flightsPathLines.geometry.attributes.position[ index + 3 ] = 2//segmentEndsAt.x
				flightsPathLines.geometry.attributes.position[ index + 4 ] = 2//segmentEndsAt.y
				flightsPathLines.geometry.attributes.position[ index + 5 ] = 2//segmentEndsAt.z
			}
			*/
		}
	}
	//flightsPathLines.geometry.computeBoundingSphere()
	// flightsPathLines.geometry.attributes.position.needsUpdate = true
	// flightsPathLines.geometry.verticesNeedUpdate = true
	// flightsPathLines.geometry.elementsNeedUpdate = true
	// flightsPathLines.needsUpdate = true
	flightsPointCloudGeometry.attributes.position.needsUpdate = true
}




    /////////////////
   //             //
  //   DAT GUI   //
 //             //
/////////////////


function setupGUI(){

	var gui = new dat.GUI()

	gui.add( window, 'sunRotationPerFrame', 0, 0.02 ).name( 'Sun speed' ).onFinishChange( function( value ){
	
		sunRotationPerFrame = value
		return false
	})
	gui.add( window, 'earthRotationPerFrame', 0, 0.005 ).name( 'Earth speed' ).onFinishChange( function( value ){
	
		earthRotationPerFrame = value
		return false
	})
	gui.add( window, 'flightSpriteSize', 0.01, 0.2 ).name( 'Sprite size' ).onChange( function( value ){
	
		var f

		for( f = 0; f < flightsTotal; f ++ ){
		
			flightSpriteSizes[ f ] = flightSpriteSize
		}
		flightsPointCloudGeometry.attributes.size.needsUpdate = true
	})
	gui.add( window, 'flightsPathLinesOpacity', 0, 1 ).name( 'Path opacity' ).onChange( function( value ){
	
		flightsPathLines.material.opacity = value;
	})
	gui.add( window, 'toggleAbout' ).name( 'Tell me more' )
}
function toggleAbout(){

	var 
	element = document.getElementById( 'about' ),
	showing = element.classList.contains( 'show' )

	if( !showing ) element.classList.add( 'show' )
	else element.classList.remove( 'show' )
}




    ///////////////
   //           //
  //   Tools   //
 //           //
///////////////


function ll2xyz( latitude, longitude, radius ){
	
	var
	phi   = (  90 - latitude  ) * Math.PI / 180,
	theta = ( 360 - longitude ) * Math.PI / 180

	return {

		x: radius * Math.sin( phi ) * Math.cos( theta ),
		y: radius * Math.cos( phi ),
		z: radius * Math.sin( phi ) * Math.sin( theta )
	}
}
function latlongTween( latitudeA, longitudeA, latitudeB, longitudeB, tween ){
	

	//  First, let’s convert degrees to radians.

	latitudeA  *= Math.PI / 180
	longitudeA *= Math.PI / 180
	latitudeB  *= Math.PI / 180
	longitudeB *= Math.PI / 180


	//  Now we can get seriously mathy.

	var
	d = 2 * Math.asin( Math.sqrt( 
	
		Math.pow(( Math.sin(( latitudeA - latitudeB ) / 2 )), 2 ) +
		Math.cos( latitudeA ) * 
		Math.cos( latitudeB ) * 
		Math.pow( Math.sin(( longitudeA - longitudeB ) / 2 ), 2 )
	)),
	A = Math.sin(( 1 - tween ) * d ) / Math.sin( d ),
	B = Math.sin( tween * d ) / Math.sin( d )
	

	//  Here’s our XYZ location for the tween Point. Sort of.
	//  (It doesn’t take into account the sphere’s radius.)
	//  It’s a necessary in between step that doesn’t fully
	//  resolve to usable XYZ coordinates. 

	var
	x = A * Math.cos( latitudeA ) * Math.cos( longitudeA ) + B * Math.cos( latitudeB ) * Math.cos( longitudeB ),
	y = A * Math.cos( latitudeA ) * Math.sin( longitudeA ) + B * Math.cos( latitudeB ) * Math.sin( longitudeB ),
	z = A * Math.sin( latitudeA ) + B * Math.sin( latitudeB )
	

	//  And we can convert that right back to lat / long.

	var
	latitude  = Math.atan2( z, Math.sqrt( Math.pow( x, 2 ) + Math.pow( y, 2 ))) * 180 / Math.PI,
	longitude = Math.atan2( y, x ) * 180 / Math.PI


	//  Return a nice package of useful values for our tween Point.

	return {

		latitude:  latitude,
		longitude: longitude
	}
}


//  This resource is fantastic (borrowed the algo from there):
//  http://www.movable-type.co.uk/scripts/latlong.html
//  Would be nice to integrate this with latlongTween() to reduce
//  code and bring the styles more in line with each other.

function latlongDistance( latitudeA, longitudeA, latitudeB, longitudeB ){

	var 
	earthRadiusMeters = 6371000,
	
	φ1 = latitudeA * Math.PI / 180,
	φ2 = latitudeB * Math.PI / 180,
	Δφ = ( latitudeB  - latitudeA  ) * Math.PI / 180,
	Δλ = ( longitudeB - longitudeA ) * Math.PI / 180,

	a = Math.sin( Δφ / 2 ) * Math.sin( Δφ / 2 ) +
		Math.cos( φ1 ) * Math.cos( φ2 ) *
		Math.sin( Δλ / 2 ) * Math.sin( Δλ / 2 ),
	c = 2 * Math.atan2( Math.sqrt( a ), Math.sqrt( 1 - a )),

	distanceMeters = earthRadiusMeters * c


	//  For this demo we don’t need actual distance in kilometers
	//  because we’re just using a factor to scale time by
	//  so we’ll just return the normal of earth’s circumference.

	return c
}
function easeOutQuadratic( t, b, c, d ){
	
	if(( t /= d / 2 ) < 1 ) return c / 2 * t * t + b
	return -c / 2 * (( --t ) * ( t - 2 ) - 1 ) + b
}




    //////////////
   //          //
  //   Loop   //
 //          //
//////////////


function animate(){

	stats.begin()
	earth.rotation.y    += earthRotationPerFrame
	sun.revolutionAngle += sunRotationPerFrame
	sun.position.x = 4 * Math.cos( sun.revolutionAngle )
	sun.position.z = 4 * Math.sin( sun.revolutionAngle )
	render()
	controls.update()
	updateFlights()
	stats.end()
	stats.breakLine()
	requestAnimationFrame( animate )
}
function render(){
	
	renderer.render( scene, camera )
}



