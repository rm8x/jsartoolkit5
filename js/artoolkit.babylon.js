/* Babylon.js ARToolKit integration */

(function() {
	var integrate = function() {
		/**
			Helper for setting up a Babylon.js AR scene using the device camera as input.
			Pass in the maximum dimensions of the video you want to process and onSuccess and onError callbacks.

			On a successful initialization, the onSuccess callback is called with an BabylonARScene object.
			The BabylonARScene object contains two Babylon.js scenes (one for the video image and other for the 3D scene)
			and a couple of helper functions for doing video frame processing and AR rendering.

			Here's the structure of the BabylonARScene object:
			{
				scene: Babylon.Scene, // The 3D scene. Put your AR objects here.
				camera: Babylon.Camera, // The 3D scene camera.

				arController: ARController,

				video: HTMLVideoElement, // The userMedia video element.

				videoScene: Babylon.Scene, // The userMedia video image scene. Shows the video feed.
				videoCamera: Babylon.Camera, // Camera for the userMedia video scene.

				process: function(), // Process the current video frame and update the markers in the scene.
				renderOn: function( Babylon.WebGLRenderer ) // Render the AR scene and video background on the given Babylon.js renderer.
			}

			You should use the arScene.video.videoWidth and arScene.video.videoHeight to set the width and height of your renderer.

			In your frame loop, use arScene.process() and arScene.renderOn(renderer) to do frame processing and 3D rendering, respectively.

			@param {number} width - The maximum width of the userMedia video to request.
			@param {number} height - The maximum height of the userMedia video to request.
			@param {function} onSuccess - Called on successful initialization with an BabylonARScene object.
			@param {function} onError - Called if the initialization fails with the error encountered.
		*/
		ARController.getUserMediaBabylonScene = function(configuration) {
			var obj = {};
			for (var i in configuration) {
				obj[i] = configuration[i];
			}
			var onSuccess = configuration.onSuccess;

			obj.onSuccess = function(arController, arCameraParam) {
				var scenes = arController.createBabylonScene();
				onSuccess(scenes, arController, arCameraParam);
			};

			var video = this.getUserMediaARController(obj);
			return video;
		};

		/**
			Creates a Babylon.js scene for use with this ARController.

			Returns a BabylonARScene object that contains two Babylon.js scenes (one for the video image and other for the 3D scene)
			and a couple of helper functions for doing video frame processing and AR rendering.

			Here's the structure of the BabylonARScene object:
			{
				scene: Babylon.Scene, // The 3D scene. Put your AR objects here.
				camera: Babylon.Camera, // The 3D scene camera.

				arController: ARController,

				video: HTMLVideoElement, // The userMedia video element.

				videoScene: Babylon.Scene, // The userMedia video image scene. Shows the video feed.
				videoCamera: Babylon.Camera, // Camera for the userMedia video scene.

				process: function(), // Process the current video frame and update the markers in the scene.
				renderOn: function( Babylon.WebGLRenderer ) // Render the AR scene and video background on the given Babylon.js renderer.
			}

			You should use the arScene.video.videoWidth and arScene.video.videoHeight to set the width and height of your renderer.

			In your frame loop, use arScene.process() and arScene.renderOn(renderer) to do frame processing and 3D rendering, respectively.

			@param video Video image to use as scene background. Defaults to this.image
		*/
		ARController.prototype.createBabylonScene = function(video) {
			video = video || this.image;

			this.setupBabylon();

			var engine = new BABYLON.Engine(window.canvas, true);
            engine.setSize(video.width, video.height);
			
			var scene = new BABYLON.Scene(engine);
            scene.useRightHandedSystem = true;

            camera = new BABYLON.Camera('camera1', new BABYLON.Vector3(0, 0, 0), scene);      		
			camera.freezeProjectionMatrix(BABYLON.Matrix.FromArray(this.getCameraMatrix()));
			window.camera = camera;	

			var videoScene = new BABYLON.Layer("back", null, scene);
			videoScene.texture = new BABYLON.VideoTexture("video", video, scene, false);
			videoScene.isBackground = true;
			videoScene.texture.level = 0;

			if (this.orientation === 'portrait') {
				videoScene.rotation.z = Math.PI/2;
			}
	
			var self = this;

			return {
				scene: scene,
				videoScene: videoScene,
				camera: camera,

				arController: this,

				video: video,

				process: function() {
					for (var i in self.BabylonPatternMarkers) {
						self.BabylonPatternMarkers[i].visible = false;
					}
					for (var i in self.BabylonNFTMarkers) {
						self.BabylonNFTMarkers[i].visible = false;
					}
					for (var i in self.BabylonBarcodeMarkers) {
						self.BabylonBarcodeMarkers[i].visible = false;
					}
					for (var i in self.BabylonMultiMarkers) {
						self.BabylonMultiMarkers[i].visible = false;
						for (var j=0; j<self.BabylonMultiMarkers[i].markers.length; j++) {
							if (self.BabylonMultiMarkers[i].markers[j]) {
								self.BabylonMultiMarkers[i].markers[j].visible = false;
							}
						}
					}
					self.process(video);
				}
			};
		};


		/**
			Creates a Babylon.js marker Object3D for the given marker UID.
			The marker Object3D tracks the marker pattern when it's detected in the video.

			Use this after a successful artoolkit.loadMarker call:

			arController.loadMarker('/bin/Data/patt.hiro', function(markerUID) {
				var markerRoot = arController.createBabylonMarker(markerUID);
				markerRoot.add(myFancyHiroModel);
				arScene.scene.add(markerRoot);
			});

			@param {number} markerUID The UID of the marker to track.
			@param {number} markerWidth The width of the marker, defaults to 1.
			@return {Babylon.Object3D} Babylon.Object3D that tracks the given marker.
		*/
		ARController.prototype.createBabylonMarker = function(markerUID, arScene, markerWidth) {
			this.setupBabylon();
			var obj = new BABYLON.AbstractMesh('markerRoot', arScene);
			obj.markerTracker = this.trackPatternMarkerId(markerUID, markerWidth);
			this.BabylonPatternMarkers[markerUID] = obj;
			return obj;
		};

		/**
			Creates a Babylon.js marker Object3D for the given NFT marker UID.
			The marker Object3D tracks the NFT marker when it's detected in the video.

			Use this after a successful artoolkit.loadNFTMarker call:

			arController.loadNFTMarker('DataNFT/pinball', function(markerUID) {
				var markerRoot = arController.createBabylonNFTMarker(markerUID);
				markerRoot.add(myFancyModel);
				arScene.scene.add(markerRoot);
			});

			@param {number} markerUID The UID of the marker to track.
			@param {number} markerWidth The width of the marker, defaults to 1.
			@return {Babylon.Object3D} Babylon.Object3D that tracks the given marker.
		*/
		ARController.prototype.createBabylonNFTMarker = function(markerUID, arScene, markerWidth) {
			this.setupBabylon();
			var obj = new BABYLON.AbstractMesh('markerRoot', arScene);
			obj.markerTracker = this.trackNFTMarkerId(markerUID, markerWidth);
			//obj.freezeWorldMatrix();
			this.BabylonNFTMarkers[markerUID] = obj;
			return obj;
		};

		/**
			Creates a Babylon.js marker Object3D for the given multimarker UID.
			The marker Object3D tracks the multimarker when it's detected in the video.

			Use this after a successful arController.loadMarker call:

			arController.loadMultiMarker('/bin/Data/multi-barcode-4x3.dat', function(markerUID) {
				var markerRoot = arController.createBabylonMultiMarker(markerUID);
				markerRoot.add(myFancyMultiMarkerModel);
				arScene.scene.add(markerRoot);
			});

			@param {number} markerUID The UID of the marker to track.
			@return {Babylon.Object3D} Babylon.Object3D that tracks the given marker.
		*/
		ARController.prototype.createBabylonMultiMarker = function(markerUID, arScene) {
			this.setupBabylon();
			var obj = new BABYLON.AbstractMesh('markerRoot', arScene);
			obj.markers = [];
			this.BabylonMultiMarkers[markerUID] = obj;
			return obj;
		};

		/**
			Creates a Babylon.js marker Object3D for the given barcode marker UID.
			The marker Object3D tracks the marker pattern when it's detected in the video.

			var markerRoot20 = arController.createBabylonBarcodeMarker(20);
			markerRoot20.add(myFancyNumber20Model);
			arScene.scene.add(markerRoot20);

			var markerRoot5 = arController.createBabylonBarcodeMarker(5);
			markerRoot5.add(myFancyNumber5Model);
			arScene.scene.add(markerRoot5);

			@param {number} markerUID The UID of the barcode marker to track.
			@param {number} markerWidth The width of the marker, defaults to 1.
			@return {Babylon.Object3D} Babylon.Object3D that tracks the given marker.
		*/
		ARController.prototype.createBabylonBarcodeMarker = function(markerUID, arScene, markerWidth) {
			this.setupBabylon();
			var obj = new BABYLON.AbstractMesh('markerRoot', arScene);
			obj.markerTracker = this.trackBarcodeMarkerId(markerUID, markerWidth);
			this.BabylonBarcodeMarkers[markerUID] = obj;
			return obj;
		};

		ARController.prototype.setupBabylon = function() {
			if (this.Babylon_JS_ENABLED) {
				return;
			}
			this.Babylon_JS_ENABLED = true;

			/*
				Listen to getMarker events to keep track of Babylon.js markers.
			*/
			this.addEventListener('getMarker', function(ev) {
				var marker = ev.data.marker;
				var obj;
				if (ev.data.type === artoolkit.PATTERN_MARKER) {
					obj = this.BabylonPatternMarkers[ev.data.marker.idPatt];

				} else if (ev.data.type === artoolkit.BARCODE_MARKER) {
					obj = this.BabylonBarcodeMarkers[ev.data.marker.idMatrix];

				}
				if (obj) {
					obj._worldMatrix.m = ev.data.matrix;
					obj.visible = true;
				}
			});

			/*
				Listen to getNFTMarker events to keep track of Babylon.js markers.
			*/
			this.addEventListener('getNFTMarker', function(ev) {
				var marker = ev.data.marker;
				var obj;

				obj = this.BabylonNFTMarkers[ev.data.marker.id];

				if (obj) {
					obj._worldMatrix.m = ev.data.matrix;
					obj.visible = true;
				}
			});

			/*
				Listen to getMultiMarker events to keep track of Babylon.js multimarkers.
			*/
			this.addEventListener('getMultiMarker', function(ev) {
				var obj = this.BabylonMultiMarkers[ev.data.multiMarkerId];
				if (obj) {
					obj._worldMatrix.m = ev.data.matrix;
					obj.visible = true;
				}
			});

			/*
				Listen to getMultiMarkerSub events to keep track of Babylon.js multimarker submarkers.
			*/
			this.addEventListener('getMultiMarkerSub', function(ev) {
				var marker = ev.data.multiMarkerId;
				var subMarkerID = ev.data.markerIndex;
				var subMarker = ev.data.marker;
				var obj = this.BabylonMultiMarkers[marker];
				if (obj && obj.markers && obj.markers[subMarkerID]) {
					var sub = obj.markers[subMarkerID];
					sub._worldMatrix.m = ev.data.matrix;
					sub.visible = (subMarker.visible >= 0);
				}
			});

			/**
				Index of Babylon.js pattern markers, maps markerID -> Babylon.Object3D.
			*/
			this.BabylonPatternMarkers = {};

			/**
				Index of Babylon.js NFT markers, maps markerID -> Babylon.Object3D.
			*/
			this.BabylonNFTMarkers = {};

			/**
				Index of Babylon.js barcode markers, maps markerID -> Babylon.Object3D.
			*/
			this.BabylonBarcodeMarkers = {};

			/**
				Index of Babylon.js multimarkers, maps markerID -> Babylon.Object3D.
			*/
			this.BabylonMultiMarkers = {};
		};

	};


	var tick = function() {
		if (window.ARController) {
			integrate();
			if (window.ARBabylonOnLoad) {
				window.ARBabylonOnLoad();
			}
		} else {
			setTimeout(tick, 50);
		}			
	};

	tick();

})();
